
"use client";

import { BookingForm } from "@/components/booking-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Bus, Star } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function ErrorDisplay() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const error = searchParams.get('error');

  useEffect(() => {
    if (error) {
      let errorMessage = "An unknown error occurred.";
      if (error === "payment_failed") {
        errorMessage = "Your payment could not be completed. Please try again.";
      } else if (error === "booking_not_found") {
        errorMessage = "We could not find the booking you were trying to pay for. Please start over.";
      } else if (error === "invalid_callback") {
        errorMessage = "The payment provider returned an invalid response. Please contact support.";
      }

      toast({
        variant: "destructive",
        title: "Payment Error",
        description: errorMessage,
      });

      // Remove error from URL without reloading the page
      router.replace('/', undefined);
    }
  }, [error, toast, router]);

  if (!error) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>
        There was an issue with your payment. Please try again.
      </AlertDescription>
    </Alert>
  );
}

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <ErrorDisplay />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground py-1 px-3 rounded-full text-sm">
            <Bus className="size-4" />
            <span>Khompatek Transport Service</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tight text-primary">
            Your Journey, Our Priority.
          </h1>
          <p className="text-lg text-muted-foreground">
            Travel across the country with KTS Go. Safe, reliable, and comfortable bus services at your fingertips. Book your ticket in just a few clicks.
          </p>
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              <img src="https://i.pravatar.cc/40?img=1" alt="User 1" className="rounded-full border-2 border-background" width={40} height={40} />
              <img src="https://i.pravatar.cc/40?img=2" alt="User 2" className="rounded-full border-2 border-background" width={40} height={40} />
              <img src="https://i.pravatar.cc/40?img=3" alt="User 3" className="rounded-full border-2 border-background" width={40} height={40} />
            </div>
            <div>
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="size-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">Loved by 10,000+ passengers</p>
            </div>
          </div>
        </div>

        <div>
          <Card className="shadow-2xl">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center">Book Your Seat</CardTitle>
            </CardHeader>
            <CardContent>
              <BookingForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
