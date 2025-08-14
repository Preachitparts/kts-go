
import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, updateDoc, collection, addDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get('bookingId');
    const paymentStatus = searchParams.get('status'); // Hubtel might append a status

    if (!bookingId) {
        return NextResponse.redirect(new URL('/?error=invalid_callback', req.url));
    }

    try {
        const pendingBookingRef = doc(db, "pending_bookings", bookingId);
        const pendingBookingSnap = await getDoc(pendingBookingRef);

        if (!pendingBookingSnap.exists()) {
             return NextResponse.redirect(new URL('/?error=booking_not_found', req.url));
        }

        // Here you would typically verify the transaction status with Hubtel's API
        // For this example, we'll assume if the callback is hit, it's successful.
        // In a real app, you MUST call Hubtel's transaction status endpoint.
        const isPaymentSuccessful = true; 

        if (isPaymentSuccessful) {
            const bookingDetails = pendingBookingSnap.data();
            
            // 1. Save passenger info
            const passengerRef = doc(db, "passengers", bookingDetails.phone);
            await setDoc(passengerRef, {
                name: bookingDetails.name,
                phone: bookingDetails.phone,
                emergencyContact: bookingDetails.emergencyContact,
            }, { merge: true });

            // 2. Create the final booking
            const finalBookingData = { ...bookingDetails, status: 'paid' };
            await addDoc(collection(db, "bookings"), finalBookingData);

            // 3. Delete the pending booking
            await deleteDoc(pendingBookingRef);
            
            const confirmationUrl = new URL('/booking-confirmation', req.url);
            Object.keys(finalBookingData).forEach(key => {
                confirmationUrl.searchParams.append(key, finalBookingData[key]);
            });

            return NextResponse.redirect(confirmationUrl);
        } else {
            // Payment failed or was cancelled
            await deleteDoc(pendingBookingRef);
            return NextResponse.redirect(new URL('/?error=payment_failed', req.url));
        }

    } catch (error: any) {
        console.error("Callback Error:", error);
        return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(error.message)}`, req.url));
    }
}
