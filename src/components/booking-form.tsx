
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { CalendarIcon, Loader2 } from "lucide-react";
import React from "react";
import { collection, addDoc, doc, setDoc, getDocs, query, where } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import SeatSelection from "./seat-selection";
import { db } from "@/lib/firebase";

const bookingSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  phone: z.string().regex(/^(\+233|0)[2-9]\d{8}$/, "Invalid Ghanaian phone number."),
  date: z.date({ required_error: "Departure date is required." }),
  journeyId: z.string().min(1, "Please select an available journey."),
  seats: z.array(z.string()).min(1, "Please select at least one seat."),
  emergencyContact: z.string().regex(/^(\+233|0)[2-9]\d{8}$/, "Invalid Ghanaian phone number."),
});

type Route = { id: string; pickup: string; destination: string; price: number; status: boolean; };
type Bus = { id: string; numberPlate: string; capacity: number; status: boolean; };

type Journey = {
    id: string; // combination of routeId and busId
    routeName: string;
    busName: string;
    price: number;
    capacity: number;
    routeId: string;
    busId: string;
};

export function BookingForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [totalAmount, setTotalAmount] = React.useState(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [journeys, setJourneys] = React.useState<Journey[]>([]);
  const [loadingJourneys, setLoadingJourneys] = React.useState(true);

  const form = useForm<z.infer<typeof bookingSchema>>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      name: "",
      phone: "",
      seats: [],
      emergencyContact: "",
      journeyId: "",
    },
  });
  
  const selectedDate = form.watch("date");
  const selectedJourneyId = form.watch("journeyId");
  const selectedSeats = form.watch("seats");

  React.useEffect(() => {
    const fetchPrerequisites = async () => {
      setLoadingJourneys(true);
      try {
        const routesQuery = query(collection(db, "routes"), where("status", "==", true));
        const busesQuery = query(collection(db, "buses"), where("status", "==", true));
        
        const [routesSnapshot, busesSnapshot] = await Promise.all([
            getDocs(routesQuery),
            getDocs(busesQuery)
        ]);
        
        const routesList = routesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Route));
        const busesList = busesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bus));
        
        const availableJourneys: Journey[] = [];
        routesList.forEach(route => {
            busesList.forEach(bus => {
                availableJourneys.push({
                    id: `${route.id}_${bus.id}`,
                    routeName: `${route.pickup} - ${route.destination}`,
                    busName: bus.numberPlate,
                    price: route.price,
                    capacity: bus.capacity,
                    routeId: route.id,
                    busId: bus.id,
                });
            });
        });

        setJourneys(availableJourneys);

      } catch (error) {
        console.error("Error fetching prerequisites: ", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch available journeys." });
      } finally {
        setLoadingJourneys(false);
      }
    };
    fetchPrerequisites();
  }, [toast]);

  const selectedJourney = React.useMemo(() => {
    return journeys.find(s => s.id === selectedJourneyId);
  }, [journeys, selectedJourneyId]);

  React.useEffect(() => {
    const price = selectedJourney ? selectedJourney.price : 0;
    setTotalAmount(selectedSeats.length * price);
  }, [selectedSeats, selectedJourney]);

  async function onSubmit(values: z.infer<typeof bookingSchema>) {
    if (!selectedJourney) {
        toast({ variant: "destructive", title: "Error", description: "Selected journey is not valid." });
        return;
    }
    setIsSubmitting(true);
    try {
      const ticketNumber = `KTS${Date.now().toString().slice(-6)}`;
      
      const bookingDetails = {
        name: values.name,
        phone: values.phone,
        emergencyContact: values.emergencyContact,
        date: values.date.toISOString(),
        seats: values.seats.join(','),
        pickup: selectedJourney.routeName.split(' - ')[0],
        destination: selectedJourney.routeName.split(' - ')[1],
        busType: `${selectedJourney.busName} - ${selectedJourney.capacity} Seater`,
        totalAmount,
        ticketNumber,
        journeyId: values.journeyId,
        routeId: selectedJourney.routeId,
        busId: selectedJourney.busId,
      };

      // Save passenger info
      const passengerRef = doc(db, "passengers", values.phone);
      await setDoc(passengerRef, {
        name: values.name,
        phone: values.phone,
        emergencyContact: values.emergencyContact,
      }, { merge: true });

      // Save booking
      await addDoc(collection(db, "bookings"), bookingDetails);
      
      const query = new URLSearchParams(bookingDetails as any).toString();

      toast({
        title: "Payment Successful!",
        description: "Your booking has been confirmed.",
      });

      router.push(`/booking-confirmation?${query}`);
    } catch (error) {
      console.error("Error creating booking:", error);
      toast({
        variant: "destructive",
        title: "Booking Failed",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input placeholder="e.g. 0243762748" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
                <FormItem className="flex flex-col pt-2">
                <FormLabel>Departure Date</FormLabel>
                <Popover>
                    <PopoverTrigger asChild>
                    <FormControl>
                        <Button
                        variant={"outline"}
                        className={cn(
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                        )}
                        >
                        {field.value ? (
                            format(field.value, "PPP")
                        ) : (
                            <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) || date > new Date(new Date().setMonth(new Date().getMonth() + 3))}
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
                control={form.control}
                name="journeyId"
                render={({ field }) => (
                    <FormItem className="flex flex-col pt-2">
                        <FormLabel>Available Journey</FormLabel>
                        <Select 
                            onValueChange={(value) => {
                                field.onChange(value);
                                form.setValue("seats", []); // Reset seats when session changes
                            }} 
                            defaultValue={field.value}
                            disabled={loadingJourneys || journeys.length === 0}
                        >
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={
                                    loadingJourneys ? "Loading journeys..." :
                                    journeys.length === 0 ? "No journeys available" :
                                    "Select an available journey"
                                } />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {journeys.map((journey) => (
                                <SelectItem key={journey.id} value={journey.id}>{`${journey.routeName} (GH₵ ${journey.price.toFixed(2)})`}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        
        {selectedJourney && (
          <FormField
            control={form.control}
            name="seats"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Select Your Seat(s)</FormLabel>
                <FormControl>
                  <SeatSelection
                    capacity={selectedJourney.capacity}
                    selectedSeats={field.value}
                    onSeatsChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="emergencyContact"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Emergency Contact</FormLabel>
              <FormControl>
                <Input placeholder="e.g. 0201234567" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="bg-secondary p-4 rounded-lg text-center mt-4">
          <p className="text-muted-foreground">Total Amount</p>
          <p className="text-3xl font-bold">GH₵ {totalAmount.toFixed(2)}</p>
        </div>

        <Button type="submit" className="w-full !mt-6" size="lg" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing Payment...
            </>
          ) : (
            'Pay with Hubtel & Book Now'
          )}
        </Button>
      </form>
    </Form>
  );
}
