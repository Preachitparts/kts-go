
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { CalendarIcon, Loader2 } from "lucide-react";
import React from "react";
import { collection, addDoc, doc, setDoc, getDocs } from "firebase/firestore";

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
  pickup: z.string().min(1, "Please select a pickup point."),
  destination: z.string().min(1, "Please select a destination."),
  date: z.date({ required_error: "Departure date is required." }),
  busType: z.string().min(1, "Please select a bus type."),
  seats: z.array(z.string()).min(1, "Please select at least one seat."),
  emergencyContact: z.string().regex(/^(\+233|0)[2-9]\d{8}$/, "Invalid Ghanaian phone number."),
});

type Route = { id: string; pickup: string; destination: string; price: number };
type Bus = { id: string; numberPlate: string; capacity: number; status: string; };

export function BookingForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [totalAmount, setTotalAmount] = React.useState(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [routes, setRoutes] = React.useState<Route[]>([]);
  const [buses, setBuses] = React.useState<Bus[]>([]);
  const [seatPrice, setSeatPrice] = React.useState(0);

  React.useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const routesCollection = collection(db, "routes");
        const routesSnapshot = await getDocs(routesCollection);
        const routesList = routesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Route));
        setRoutes(routesList);
      } catch (error) => {
        console.error("Error fetching routes: ", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch routes." });
      }
    };
    const fetchBuses = async () => {
        try {
            const busesCollection = collection(db, "buses");
            const busesSnapshot = await getDocs(busesCollection);
            const busesList = busesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bus));
            setBuses(busesList);
        } catch (error) {
            console.error("Error fetching buses: ", error);
            toast({ variant: "destructive", title: "Error", description: "Could not fetch buses." });
        }
    };
    fetchRoutes();
    fetchBuses();
  }, [toast]);

  const form = useForm<z.infer<typeof bookingSchema>>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      name: "",
      phone: "",
      seats: [],
      emergencyContact: "",
      busType: "",
      pickup: "",
      destination: "",
    },
  });

  const selectedBusType = form.watch("busType");
  const selectedSeats = form.watch("seats");
  const selectedPickup = form.watch("pickup");
  const selectedDestination = form.watch("destination");

  const pickupPoints = React.useMemo(() => [...new Set(routes.map(r => r.pickup))], [routes]);
  const destinations = React.useMemo(() => {
      if (!selectedPickup) return [...new Set(routes.map(r => r.destination))];
      return [...new Set(routes.filter(r => r.pickup === selectedPickup).map(r => r.destination))];
  }, [routes, selectedPickup]);


  React.useEffect(() => {
    const route = routes.find(r => r.pickup === selectedPickup && r.destination === selectedDestination);
    const newPrice = route ? route.price : 0;
    setSeatPrice(newPrice);
  }, [selectedPickup, selectedDestination, routes]);


  React.useEffect(() => {
    setTotalAmount(selectedSeats.length * seatPrice);
  }, [selectedSeats, seatPrice]);
  
  const selectedBus = React.useMemo(() => {
    return buses.find(b => b.id === selectedBusType);
  }, [buses, selectedBusType]);


  async function onSubmit(values: z.infer<typeof bookingSchema>) {
    if (seatPrice <= 0) {
        toast({
            variant: "destructive",
            title: "Invalid Route",
            description: "The selected route is not valid. Please select another route.",
        });
        return;
    }
    setIsSubmitting(true);
    try {
      const ticketNumber = `KTS${Date.now().toString().slice(-6)}`;
      
      const busInfo = buses.find(b => b.id === values.busType);
      const bookingDetails = {
        ...values,
        totalAmount,
        ticketNumber,
        date: values.date.toISOString(),
        seats: values.seats.join(','),
        busType: busInfo ? `${busInfo.numberPlate} - ${busInfo.capacity} Seater` : 'N/A',
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
            name="pickup"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pickup Point</FormLabel>
                <Select 
                    onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue("destination", "");
                    }} 
                    defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a pickup point" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {pickupPoints.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="destination"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Destination</FormLabel>
                <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    disabled={!selectedPickup}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a destination" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                     {destinations.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
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
            name="busType"
            render={({ field }) => (
                <FormItem className="flex flex-col pt-2">
                    <FormLabel>Select Bus Type</FormLabel>
                    <Select onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue("seats", []); // Reset seats when bus type changes
                    }} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Select a bus type" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {buses.filter(b => b.status === 'Active').map((bus) => (
                            <SelectItem key={bus.id} value={bus.id}>{`${bus.numberPlate} - ${bus.capacity} Seater`}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )}
            />
        </div>
        
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
