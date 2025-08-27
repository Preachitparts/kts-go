
import { NextRequest, NextResponse } from "next/server";
import { doc, collection, addDoc, setDoc, deleteDoc, getDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(req: NextRequest) {
    try {
        const callbackData = await req.json();

        // Log the entire callback for debugging
        console.log("Received Hubtel Callback:", JSON.stringify(callbackData, null, 2));

        const { ResponseCode, Status, Data } = callbackData;
        const clientReference = Data?.ClientReference;

        if (!clientReference) {
            console.error("Callback Error: ClientReference not found in Hubtel callback.");
            return NextResponse.json({ error: "Invalid callback data" }, { status: 400 });
        }

        // Find the pending booking using the clientReference
        const pendingBookingRef = doc(db, "pending_bookings", clientReference);
        const pendingBookingDoc = await getDoc(pendingBookingRef);


        if (!pendingBookingDoc.exists()) {
            console.warn(`Callback Warning: Pending booking not found for ClientReference: ${clientReference}. It might have already been processed.`);
            // Acknowledge receipt to Hubtel even if we can't find the booking
            return NextResponse.json({ message: "Acknowledged: Booking not found or already processed." });
        }
        
        const bookingDetails = pendingBookingDoc.data();
        const batch = writeBatch(db);

        if (Status === "Success" && ResponseCode === "0000") {
            // 1. Save passenger info
            const passengerRef = doc(db, "passengers", bookingDetails.phone);
            batch.set(passengerRef, {
                name: bookingDetails.name,
                phone: bookingDetails.phone,
                emergencyContact: bookingDetails.emergencyContact,
            }, { merge: true });

            // 2. Create the final booking
            const finalBookingData = { 
                ...bookingDetails, 
                status: 'paid',
                hubtelTransactionId: Data.CheckoutId, // Save Hubtel's ID
                paymentStatus: Data.Status,
                amountPaid: Data.Amount,
            };
            // Remove fields that are not needed in the final booking
            delete finalBookingData.createdAt; 
            
            const newBookingRef = doc(collection(db, "bookings"));
            batch.set(newBookingRef, finalBookingData);

            // 3. Delete the pending booking
            batch.delete(pendingBookingRef);
            
            await batch.commit();

            console.log(`Successfully processed booking for ClientReference: ${clientReference}`);
            return NextResponse.json({ message: "Callback received and processed successfully." });
        } else {
            // Payment failed or was cancelled
            const rejectedBookingData = {
                ...bookingDetails,
                status: 'rejected',
                rejectionReason: `Payment failed with Hubtel status: ${Status}`,
            };
            const rejectedDocRef = doc(collection(db, "rejected_bookings"));
            batch.set(rejectedDocRef, rejectedBookingData);
            
            batch.delete(pendingBookingRef);
            await batch.commit();

            console.warn(`Payment failed or was cancelled for ClientReference: ${clientReference}. Status: ${Status}, ResponseCode: ${ResponseCode}`);
            return NextResponse.json({ message: "Payment was not successful. Booking cancelled." });
        }

    } catch (error: any) {
        console.error("Callback Processing Error:", error);
        return NextResponse.json({ error: "Internal server error processing callback" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const clientReference = searchParams.get('ref');

    if (clientReference) {
        const confirmationUrl = new URL('/booking-confirmation', req.url);
        confirmationUrl.searchParams.append('ref', clientReference);
        return NextResponse.redirect(confirmationUrl);
    }

    const error = searchParams.get('error');
    const redirectUrl = new URL('/', req.url);
    if (error) {
        redirectUrl.searchParams.append('error', error);
    }
    return NextResponse.redirect(redirectUrl);
}
