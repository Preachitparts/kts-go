
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
  routeId: z.string().min(1, "Please select a route."),
  busId: z.string().min(1, "Please select a bus."),
  seats: z.array(z.string()).min(1, "Please select at least one seat."),
  emergencyContact: z.string().regex(/^(\+233|0)[2-9]\d{8}$/, "Invalid Ghanaian phone number."),
});

type Route = { id: string; pickup: string; destination: string; price: number; status: boolean; };
type Bus = { id: string; numberPlate: string; capacity: number; status: boolean; };

export function BookingForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [totalAmount, setTotalAmount] = React.useState(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [routes, setRoutes] = React.useState<Route[]>([]);
  const [buses, setBuses] = React.useState<Bus[]>([]);
  const [loading, setLoading] = React.useState(true);

  const form = useForm<z.infer<typeof bookingSchema>>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      name: "",
      phone: "",
      seats: [],
      emergencyContact: "",
      routeId: "",
      busId: "",
    },
  });
  
  const selectedRouteId = form.watch("routeId");
  const selectedBusId = form.watch("busId");
  const selectedSeats = form.watch("seats");

  React.useEffect(() => {
    const fetchPrerequisites = async () => {
      setLoading(true);
      try {
        const routesQuery = query(collection(db, "routes"), where("status", "==", true));
        const busesQuery = query(collection(db, "buses"), where("status", "==", true));
        
        const [routesSnapshot, busesSnapshot] = await Promise.all([
            getDocs(routesQuery),
            getDocs(busesQuery)
        ]);
        
        const routesList = routesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Route));
        const busesList = busesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bus));
        
        setRoutes(routesList);
        setBuses(busesList);

      } catch (error) {
        console.error("Error fetching prerequisites: ", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch available journeys." });
      } finally {
        setLoading(false);
      }
    };
    fetchPrerequisites();
  }, [toast]);

  const selectedRoute = React.useMemo(() => {
    return routes.find(r => r.id === selectedRouteId);
  }, [routes, selectedRouteId]);
  
  const selectedBus = React.useMemo(() => {
    return buses.find(b => b.id === selectedBusId);
  }, [buses, selectedBusId]);

  React.useEffect(() => {
    const price = selectedRoute ? selectedRoute.price : 0;
    setTotalAmount(selectedSeats.length * price);
  }, [selectedSeats, selectedRoute]);

  async function onSubmit(values: z.infer<typeof bookingSchema>) {
    if (!selectedRoute || !selectedBus) {
        toast({ variant: "destructive", title: "Error", description: "Selected route or bus is not valid." });
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
        pickup: selectedRoute.pickup,
        destination: selectedRoute.destination,
        busType: `${selectedBus.numberPlate} - ${selectedBus.capacity} Seater`,
        totalAmount,
        ticketNumber,
        routeId: values.routeId,
        busId: values.busId,
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
                name="routeId"
                render={({ field }) => (
                    <FormItem className="flex flex-col pt-2">
                        <FormLabel>Select Route</FormLabel>
                        <Select 
                            onValueChange={(value) => {
                                field.onChange(value);
                                form.setValue("seats", []);
                            }} 
                            defaultValue={field.value}
                            disabled={loading || routes.length === 0}
                        >
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={
                                    loading ? "Loading routes..." :
                                    routes.length === 0 ? "No routes available" :
                                    "Select a route"
                                } />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {routes.map((route) => (
                                <SelectItem key={route.id} value={route.id}>{`${route.pickup} - ${route.destination} (GH₵ ${route.price.toFixed(2)})`}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        <FormField
            control={form.control}
            name="busId"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Select Bus</FormLabel>
                    <Select 
                        onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue("seats", []); // Reset seats when bus changes
                        }} 
                        defaultValue={field.value}
                        disabled={loading || buses.length === 0}
                    >
                    <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder={
                                loading ? "Loading buses..." :
                                buses.length === 0 ? "No buses available" :
                                "Select a bus"
                            } />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {buses.map((bus) => (
                            <SelectItem key={bus.id} value={bus.id}>{`${bus.numberPlate} (${bus.capacity} Seater)`}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )}
        />
        
        {selectedBus && (
          <FormField
            control={form.control}
            name="seats"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Select Your Seat(s)</FormLabel>
                <FormControl>
                  <SeatSelection
                    capacity={selectedBus.capacity}
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
