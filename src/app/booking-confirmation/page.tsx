import BookingTicket from "@/components/booking-ticket";
import { Suspense } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { BookingDetails } from "@/lib/types";

async function getBookingDetails(ref: string): Promise<BookingDetails | null> {
    try {
        const q = query(collection(db, "bookings"), where("clientReference", "==", ref));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.warn(`Booking confirmation: No booking found for ref ${ref}`);
            return null;
        }

        const bookingDoc = querySnapshot.docs[0].data();
        
        // Convert Firestore Timestamp to Date if necessary
        const date = bookingDoc.date?.toDate ? bookingDoc.date.toDate() : new Date(bookingDoc.date);

        return {
            name: bookingDoc.name || 'N/A',
            phone: bookingDoc.phone || 'N/A',
            pickup: bookingDoc.pickup || 'N/A',
            destination: bookingDoc.destination || 'N/A',
            date: date,
            seats: bookingDoc.seats || 'N/A',
            busType: bookingDoc.busType || 'N/A',
            emergencyContact: bookingDoc.emergencyContact || 'N/A',
            totalAmount: Number(bookingDoc.totalAmount) || 0,
            ticketNumber: bookingDoc.ticketNumber || 'N/A',
            clientReference: bookingDoc.clientReference || 'N/A',
        };
    } catch (error) {
        console.error("Error fetching booking details:", error);
        return null;
    }
}

function BookingConfirmationContent({ bookingDetails }: { bookingDetails: BookingDetails | null }) {
    if (!bookingDetails) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl w-full space-y-8 text-center">
                    <h1 className="text-4xl font-extrabold text-destructive">
                        Booking Not Found
                    </h1>
                    <p className="mt-2 text-lg text-muted-foreground">
                        We couldn't find your booking details. It might still be processing. Please check again shortly or contact support.
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl w-full space-y-8">
                <div>
                    <h1 className="text-center text-4xl font-extrabold text-primary">
                        Booking Confirmed!
                    </h1>
                    <p className="mt-2 text-center text-lg text-muted-foreground">
                        Thank you for choosing KTS Go. Your ticket is ready.
                    </p>
                </div>
                <BookingTicket bookingDetails={bookingDetails} />
            </div>
        </main>
    );
}


export default async function BookingConfirmationPage({ searchParams }: { searchParams: { ref: string } }) {
    const bookingDetails = await getBookingDetails(searchParams.ref);

    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading confirmation...</div>}>
            <BookingConfirmationContent bookingDetails={bookingDetails} />
        </Suspense>
    );
}
