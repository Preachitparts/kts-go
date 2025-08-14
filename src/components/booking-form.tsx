
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { CalendarIcon, Loader2 } from "lucide-react";
import React from "react";
import { collection, addDoc, doc, setDoc, getDocs, query, where, Timestamp } from "firebase/firestore";

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
  sessionId: z.string().min(1, "Please select an available journey."),
  seats: z.array(z.string()).min(1, "Please select at least one seat."),
  emergencyContact: z.string().regex(/^(\+233|0)[2-9]\d{8}$/, "Invalid Ghanaian phone number."),
});

type Session = { 
  id: string; 
  routeId: string; 
  busId: string; 
  departureDate: Timestamp; 
};
type Route = { id: string; pickup: string; destination: string; price: number };
type Bus = { id: string; numberPlate: string; capacity: number; status: string; };

type EnrichedSession = Session & {
    routeName: string;
    busName: string;
    price: number;
    capacity: number;
};

export function BookingForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [totalAmount, setTotalAmount] = React.useState(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [sessions, setSessions] = React.useState<EnrichedSession[]>([]);
  const [routes, setRoutes] = React.useState<Route[]>([]);
  const [buses, setBuses] = React.useState<Bus[]>([]);
  const [loadingSessions, setLoadingSessions] = React.useState(false);

  const form = useForm<z.infer<typeof bookingSchema>>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      name: "",
      phone: "",
      seats: [],
      emergencyContact: "",
      sessionId: "",
    },
  });
  
  const selectedDate = form.watch("date");
  const selectedSessionId = form.watch("sessionId");
  const selectedSeats = form.watch("seats");

  // Fetch routes and buses once on component mount
  React.useEffect(() => {
    const fetchPrerequisites = async () => {
      try {
        const routesCollection = collection(db, "routes");
        const busesCollection = collection(db, "buses");
        
        const [routesSnapshot, busesSnapshot] = await Promise.all([
            getDocs(routesCollection),
            getDocs(busesCollection)
        ]);
        
        const routesList = routesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Route));
        const busesList = busesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bus));
        
        setRoutes(routesList);
        setBuses(busesList);
      } catch (error) {
        console.error("Error fetching prerequisites: ", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch routes or buses." });
      }
    };
    fetchPrerequisites();
  }, [toast]);

  // Fetch sessions when a date is selected
  React.useEffect(() => {
    if (!selectedDate || routes.length === 0 || buses.length === 0) {
      setSessions([]);
      return;
    };

    const fetchSessions = async () => {
      setLoadingSessions(true);
      form.setValue("sessionId", ""); // Reset session when date changes
      try {
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        const sessionsQuery = query(
          collection(db, "sessions"),
          where("departureDate", ">=", Timestamp.fromDate(startOfDay)),
          where("departureDate", "<=", Timestamp.fromDate(endOfDay))
        );
        
        const sessionsSnapshot = await getDocs(sessionsQuery);
        const sessionsList = sessionsSnapshot.docs.map(doc => {
          const data = doc.data() as Omit<Session, 'id'>;
          const route = routes.find(r => r.id === data.routeId);
          const bus = buses.find(b => b.id === data.busId);
          return {
            id: doc.id,
            ...data,
            routeName: route ? `${route.pickup} - ${route.destination}` : 'Unknown Route',
            busName: bus ? `${bus.numberPlate}` : 'Unknown Bus',
            price: route ? route.price : 0,
            capacity: bus ? bus.capacity : 0,
          };
        }).filter(s => s.price > 0 && s.capacity > 0); // Filter out invalid sessions

        setSessions(sessionsList);

      } catch (error) {
        console.error("Error fetching sessions: ", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch available journeys." });
      } finally {
          setLoadingSessions(false);
      }
    };

    fetchSessions();
  }, [selectedDate, routes, buses, toast, form]);

  const selectedSession = React.useMemo(() => {
    return sessions.find(s => s.id === selectedSessionId);
  }, [sessions, selectedSessionId]);

  React.useEffect(() => {
    const price = selectedSession ? selectedSession.price : 0;
    setTotalAmount(selectedSeats.length * price);
  }, [selectedSeats, selectedSession]);

  async function onSubmit(values: z.infer<typeof bookingSchema>) {
    if (!selectedSession) {
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
        pickup: selectedSession.routeName.split(' - ')[0],
        destination: selectedSession.routeName.split(' - ')[1],
        busType: `${selectedSession.busName} - ${selectedSession.capacity} Seater`,
        totalAmount,
        ticketNumber,
        sessionId: values.sessionId,
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
                name="sessionId"
                render={({ field }) => (
                    <FormItem className="flex flex-col pt-2">
                        <FormLabel>Available Journey</FormLabel>
                        <Select 
                            onValueChange={(value) => {
                                field.onChange(value);
                                form.setValue("seats", []); // Reset seats when session changes
                            }} 
                            defaultValue={field.value}
                            disabled={!selectedDate || loadingSessions || sessions.length === 0}
                        >
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={
                                    !selectedDate ? "Select a date first" :
                                    loadingSessions ? "Loading journeys..." :
                                    sessions.length === 0 ? "No journeys available" :
                                    "Select an available journey"
                                } />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {sessions.map((session) => (
                                <SelectItem key={session.id} value={session.id}>{`${session.routeName} (GH₵ ${session.price.toFixed(2)})`}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        
        {selectedSession && (
          <FormField
            control={form.control}
            name="seats"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Select Your Seat(s)</FormLabel>
                <FormControl>
                  <SeatSelection
                    capacity={selectedSession.capacity}
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
