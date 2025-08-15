
import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, updateDoc, collection, addDoc, setDoc, deleteDoc, query, where, getDocs } from "firebase/firestore";
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
        const pendingBookingsQuery = query(collection(db, "pending_bookings"), where("clientReference", "==", clientReference));
        const pendingBookingsSnapshot = await getDocs(pendingBookingsQuery);

        if (pendingBookingsSnapshot.empty) {
            console.error(`Callback Error: Pending booking not found for ClientReference: ${clientReference}`);
            // It's possible the booking was already processed, so we return a success to Hubtel
            return NextResponse.json({ message: "Booking not found or already processed" });
        }
        
        const pendingBookingDoc = pendingBookingsSnapshot.docs[0];
        const pendingBookingRef = pendingBookingDoc.ref;
        
        if (Status === "Success" && ResponseCode === "0000" && Data.Status === "Success") {
            const bookingDetails = pendingBookingDoc.data();
            
            // 1. Save passenger info
            const passengerRef = doc(db, "passengers", bookingDetails.phone);
            await setDoc(passengerRef, {
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
            await addDoc(collection(db, "bookings"), finalBookingData);

            // 3. Delete the pending booking
            await deleteDoc(pendingBookingRef);
            
            console.log(`Successfully processed booking for ClientReference: ${clientReference}`);
            return NextResponse.json({ message: "Callback received and processed successfully." });
        } else {
            // Payment failed or was cancelled
            await deleteDoc(pendingBookingRef);
            console.warn(`Payment failed or was cancelled for ClientReference: ${clientReference}. Status: ${Status}, ResponseCode: ${ResponseCode}`);
            return NextResponse.json({ message: "Payment was not successful. Booking cancelled." });
        }

    } catch (error: any) {
        console.error("Callback Processing Error:", error);
        return NextResponse.json({ error: "Internal server error processing callback" }, { status: 500 });
    }
}

// Hubtel might still use GET for redirects, though POST is for server-to-server callbacks.
// This handles the user's browser redirection.
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const clientReference = searchParams.get('clientreference'); // Hubtel uses lowercase in returnUrl

    if (clientReference) {
        const confirmationUrl = new URL('/booking-confirmation', req.url);
        confirmationUrl.searchParams.append('ref', clientReference);
        return NextResponse.redirect(confirmationUrl);
    }

    // Handle cancellation or error
    const error = searchParams.get('error');
    const redirectUrl = new URL('/', req.url);
    if (error) {
        redirectUrl.searchParams.append('error', error);
    }
    return NextResponse.redirect(redirectUrl);
}
