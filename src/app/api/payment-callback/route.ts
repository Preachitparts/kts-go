
import { NextRequest, NextResponse } from "next/server";
import { doc, collection, addDoc, setDoc, deleteDoc, query, where, getDocs, updateDoc, getDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(req: NextRequest) {
    try {
        const callbackData = await req.json();

        // Log the entire callback for debugging
        console.log("Received Hubtel Callback:", JSON.stringify(callbackData, null, 2));

        // CORRECTED: Use capitalized keys and correct nesting to match Hubtel's response
        const { ResponseCode, Status, Data } = callbackData;
        const clientReference = Data?.ClientReference;

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

        // Check for successful payment status
        if (Status === "Success" && (ResponseCode === "0000" || ResponseCode === "000")) {
            const batch = writeBatch(db);

            // 1. Save passenger info to the passengers collection
            const passengerRef = doc(db, "passengers", bookingDetails.phone);
            batch.set(passengerRef, {
                name: bookingDetails.name,
                phone: bookingDetails.phone,
                emergencyContact: bookingDetails.emergencyContact,
            }, { merge: true });

            // 2. Create the final booking in the 'bookings' collection
            const finalBookingData: any = { 
                ...bookingDetails, 
                status: 'paid',
                hubtelTransactionId: Data.TransactionId, // Save Hubtel's ID
                paymentStatus: Status,
                amountPaid: Data.Amount,
                createdAt: bookingDetails.createdAt || new Date(),
            };
            delete finalBookingData.id; 
            
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
                rejectionReason: `Payment failed or was cancelled. Status: ${Status}, Message: ${Data.Message}`,
            };
            
            const batch = writeBatch(db);

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

    if (clientReference) {
        const confirmationUrl = new URL('/booking-confirmation', req.url);
        confirmationUrl.searchParams.append('ref', clientReference);
        console.log(`Redirecting user to confirmation page: ${confirmationUrl.toString()}`);
        return NextResponse.redirect(confirmationUrl);
    }

    const error = searchParams.get('error');
    const redirectUrl = new URL('/', req.url);
    if (error) {
        redirectUrl.searchParams.append('error', error);
    } else {
        redirectUrl.searchParams.append('error', 'payment_failed');
    }
    console.log(`Redirecting user to home page with error: ${redirectUrl.toString()}`);
    return NextResponse.redirect(redirectUrl);
}
