
import { NextRequest, NextResponse } from "next/server";
import { doc, collection, addDoc, setDoc, deleteDoc, query, where, getDocs, updateDoc, getDoc, writeBatch } from "firebase/firestore";
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

        // CORRECTED: Query for the booking using the clientReference field
        const pendingBookingsQuery = query(
            collection(db, "pending_bookings"),
            where("clientReference", "==", clientReference)
        );
        const pendingBookingsSnapshot = await getDocs(pendingBookingsQuery);

        if (pendingBookingsSnapshot.empty) {
            console.warn(`Callback Warning: Pending booking not found for ClientReference: ${clientReference}. It might have already been processed.`);
            // Acknowledge receipt to Hubtel even if we can't find the booking
            return NextResponse.json({ message: "Acknowledged: Booking not found or already processed." });
        }

        const pendingBookingDoc = pendingBookingsSnapshot.docs[0];
        
        if (Status === "Success" && (ResponseCode === "0000" || ResponseCode === "000")) {
            const bookingDetails = pendingBookingDoc.data();
            
            const batch = writeBatch(db);

            // 1. Save passenger info
            const passengerRef = doc(db, "passengers", bookingDetails.phone);
            batch.set(passengerRef, {
                name: bookingDetails.name,
                phone: bookingDetails.phone,
                emergencyContact: bookingDetails.emergencyContact,
            }, { merge: true });

            // 2. Create the final booking
            const finalBookingData: any = { 
                ...bookingDetails, 
                status: 'paid',
                hubtelTransactionId: Data.CheckoutId, // Save Hubtel's ID
                paymentStatus: Data.Status,
                amountPaid: Data.Amount,
                createdAt: bookingDetails.createdAt || new Date(), // Ensure createdAt is present
            };
            delete finalBookingData.id; 
            
            const newBookingRef = doc(collection(db, "bookings"));
            batch.set(newBookingRef, finalBookingData);

            // 3. Delete the pending booking
            batch.delete(pendingBookingDoc.ref);
            
            await batch.commit();
            
            console.log(`Successfully processed booking for ClientReference: ${clientReference}`);
            return NextResponse.json({ message: "Callback received and processed successfully." });
        } else {
            // Payment failed or was cancelled
            const bookingDetails = pendingBookingDoc.data();
            const rejectedBookingData = {
                ...bookingDetails,
                status: 'rejected',
                rejectionReason: `Payment failed with Hubtel status: ${Status}`,
            };
            
            const batch = writeBatch(db);

            const rejectedRef = doc(collection(db, "rejected_bookings"));
            batch.set(rejectedRef, rejectedBookingData);

            batch.delete(pendingBookingDoc.ref);
            
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
    // CORRECTED: Hubtel returns the client reference in a parameter named `ref`.
    const clientReference = searchParams.get('ref');

    if (clientReference) {
        // CRITICAL FIX: Use an absolute URL for redirection.
        // req.url gives the full URL of the current request, e.g., "https://<host>/api/payment-callback?ref=..."
        // We use this to construct the base for our final redirect URL.
        const confirmationUrl = new URL('/booking-confirmation', req.url);
        confirmationUrl.searchParams.append('ref', clientReference);
        console.log(`Redirecting user to confirmation page: ${confirmationUrl.toString()}`);
        return NextResponse.redirect(confirmationUrl);
    }

    // Handle cases where the user returns without a reference (e.g., payment cancelled)
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
