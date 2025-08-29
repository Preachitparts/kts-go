
import { NextRequest, NextResponse } from "next/server";
import { doc, collection, writeBatch, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(req: NextRequest) {
    try {
        const callbackData = await req.json();

        console.log("Received Hubtel Callback:", JSON.stringify(callbackData, null, 2));

        const { ResponseCode, Status, Data } = callbackData;
        const clientReference = Data?.ClientReference;
        const transactionId = Data?.TransactionId;

        if (!clientReference) {
            console.error("Callback Error: ClientReference not found in Hubtel callback.", { callbackData });
            return NextResponse.json({ error: "Invalid callback data: ClientReference missing." }, { status: 400 });
        }

        const pendingBookingsQuery = query(
            collection(db, "pending_bookings"),
            where("clientReference", "==", clientReference)
        );
        const pendingBookingsSnapshot = await getDocs(pendingBookingsQuery);

        if (pendingBookingsSnapshot.empty) {
            console.warn(`Callback Warning: Pending booking not found for ClientReference: ${clientReference}. It might have already been processed or cancelled.`);
            return NextResponse.json({ message: "Acknowledged: Booking not found or already processed." });
        }

        const pendingBookingDoc = pendingBookingsSnapshot.docs[0];
        const bookingDetails = pendingBookingDoc.data();
        
        const batch = writeBatch(db);

        // Check for successful payment status
        if (Status === "Success" && (ResponseCode === "0000" || ResponseCode === "000")) {
            // 1. Save passenger info to the passengers collection if they don't exist
            const passengerRef = doc(db, "passengers", bookingDetails.phone);
            batch.set(passengerRef, {
                name: bookingDetails.name,
                phone: bookingDetails.phone,
                emergencyContact: bookingDetails.emergencyContact,
            }, { merge: true });

            // 2. Create the final booking in the 'bookings' collection
            const finalBookingData = { 
                ...bookingDetails, 
                status: 'paid',
                hubtelTransactionId: transactionId,
                paymentStatus: Status,
                amountPaid: Data.Amount,
                paidAt: Timestamp.now(),
            };
            
            const newBookingRef = doc(collection(db, "bookings"));
            batch.set(newBookingRef, finalBookingData);

            // 3. Delete the original pending booking
            batch.delete(pendingBookingDoc.ref);
            
            await batch.commit();
            
            console.log(`Successfully processed booking for ClientReference: ${clientReference}`);
            return NextResponse.json({ message: "Callback received and processed successfully." });

        } else {
            // Payment failed or was cancelled
            const rejectedBookingData = {
                ...bookingDetails,
                status: 'rejected',
                rejectionReason: `Payment failed or was cancelled by user. Status: ${Status}, Message: ${Data.Message || 'N/A'}`,
                rejectedAt: Timestamp.now(),
            };
            
            const rejectedRef = doc(collection(db, "rejected_bookings"));
            batch.set(rejectedRef, rejectedBookingData);

            batch.delete(pendingBookingDoc.ref);
            
            await batch.commit();

            console.warn(`Payment failed for ClientReference: ${clientReference}. Status: ${Status}, ResponseCode: ${ResponseCode}`);
            return NextResponse.json({ message: "Payment was not successful. Booking has been moved to rejected." });
        }

    } catch (error: any) {
        console.error("CRITICAL Callback Processing Error:", {
            message: error.message,
            stack: error.stack,
        });
        return NextResponse.json({ error: "Internal server error processing callback" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const clientReference = searchParams.get('ref');

    if (!clientReference) {
         console.warn("GET request to callback URL missing 'ref' parameter.");
         const errorRedirect = new URL('/', req.url);
         errorRedirect.searchParams.append('error', 'invalid_return_url');
         return NextResponse.redirect(errorRedirect);
    }
    
    // Construct the absolute URL for redirection
    const confirmationUrl = new URL('/booking-confirmation', req.nextUrl.origin);
    confirmationUrl.searchParams.append('ref', clientReference);
    
    console.log(`Redirecting user to confirmation page: ${confirmationUrl.toString()}`);
    return NextResponse.redirect(confirmationUrl);
}
