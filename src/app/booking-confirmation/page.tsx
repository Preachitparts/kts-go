import BookingTicket from "@/components/booking-ticket";
import { Suspense } from "react";

function BookingConfirmationContent() {
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
                <Suspense fallback={<div>Loading ticket...</div>}>
                    <BookingTicket />
                </Suspense>
            </div>
        </main>
    );
}

export default function BookingConfirmationPage() {
    return (
        <Suspense fallback={<div>Loading confirmation...</div>}>
            <BookingConfirmationContent />
        </Suspense>
    );
}
