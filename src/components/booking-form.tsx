
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { CalendarIcon, Loader2 } from "lucide-react";
import React from "react";
import { collection, getDocs, query, where, doc, writeBatch, Timestamp } from "firebase/firestore";
import axios from "axios";

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
import { db } from "@/lib/firebase";
import SeatSelection from "./seat-selection";

const bookingSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  phone: z.string().regex(/^(\+233|0)[2-9]\d{8}$/, "Invalid Ghanaian phone number."),
  date: z.date({ required_error: "Departure date is required." }),
  routeId: z.string().min(1, "Please select a route."),
  busId: z.string().min(1, "Please select a bus."),
  selectedSeats: z.array(z.string()).min(1, "Please select at least one seat."),
  emergencyContact: z.string().regex(/^(\+233|0)[2-9]\d{8}$/, "Invalid Ghanaian phone number."),
  referralCode: z.string().optional(),
});

type Route = { id: string; pickup: string; destination: string; price: number; status: boolean; busIds?: string[] };
type Bus = { id: string; numberPlate: string; capacity: number; status: boolean; };
type Referral = { id: string; name: string; phone: string; };

async function releaseExpiredSeats() {
    const fiveMinutesAgo = Timestamp.fromMillis(Date.now() - 5 * 60 * 1000);
    const expiredBookingsQuery = query(
        collection(db, "pending_bookings"),
        where("createdAt", "<=", fiveMinutesAgo)
    );

    const snapshot = await getDocs(expiredBookingsQuery);
    if (snapshot.empty) {
        return;
    }

    const batch = writeBatch(db);
    snapshot.forEach(docSnap => {
        const bookingData = docSnap.data();
        const rejectedBookingData = {
            ...bookingData,
            status: 'rejected',
            rejectionReason: 'Payment timed out',
        };
        const rejectedDocRef = doc(collection(db, "rejected_bookings"));
        batch.set(rejectedDocRef, rejectedBookingData);
        batch.delete(docSnap.ref);
    });

    await batch.commit();
    console.log(`Released seats for ${snapshot.size} expired bookings.`);
}

export function BookingForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [totalAmount, setTotalAmount] = React.useState(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [routes, setRoutes] = React.useState<Route[]>([]);
  const [availableBuses, setAvailableBuses] = React.useState<Bus[]>([]);
  const [referrals, setReferrals] = React.useState<Referral[]>([]);
  const [occupiedSeats, setOccupiedSeats] = React.useState<string[]>([]);
  const [loadingRoutes, setLoadingRoutes] = React.useState(true);
  const [loadingBuses, setLoadingBuses] = React.useState(false);
  const [loadingReferrals, setLoadingReferrals] = React.useState(true);
  const [loadingSeats, setLoadingSeats] = React.useState(false);

  const form = useForm<z.infer<typeof bookingSchema>>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      name: "",
      phone: "",
      selectedSeats: [],
      emergencyContact: "",
      routeId: "",
      busId: "",
      referralCode: "",
    },
  });
  
  const selectedRouteId = form.watch("routeId");
  const selectedBusId = form.watch("busId");
  const selectedDate = form.watch("date");
  const selectedSeats = form.watch("selectedSeats");

  React.useEffect(() => {
    const fetchPrerequisites = async () => {
      setLoadingRoutes(true);
      setLoadingReferrals(true);
      try {
        const routesQuery = query(collection(db, "routes"), where("status", "==", true));
        const referralsQuery = collection(db, "referrals");
        
        const [routesSnapshot, referralsSnapshot] = await Promise.all([
            getDocs(routesQuery),
            getDocs(referralsQuery)
        ]);

        const routesList = routesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Route));
        const referralsList = referralsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Referral));
        
        setRoutes(routesList);
        setReferrals(referralsList);
      } catch (error) {
        console.error("Error fetching prerequisites: ", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch available routes or referrals." });
      } finally {
        setLoadingRoutes(false);
        setLoadingReferrals(false);
      }
    };
    fetchPrerequisites();
  }, [toast]);
  
  React.useEffect(() => {
    const fetchBusesForRoute = async () => {
      if (!selectedRouteId) {
        setAvailableBuses([]);
        return;
      }
      setLoadingBuses(true);
      form.setValue("busId", "");
      try {
        const route = routes.find(r => r.id === selectedRouteId);
        if (route && route.busIds && route.busIds.length > 0) {
            const busesQuery = query(collection(db, "buses"), where("__name__", "in", route.busIds), where("status", "==", true));
            const busesSnapshot = await getDocs(busesQuery);
            const busesList = busesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bus));
            setAvailableBuses(busesList);
        } else {
             setAvailableBuses([]);
        }
      } catch (error) {
        console.error("Error fetching buses for route: ", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch buses for the selected route." });
        setAvailableBuses([]);
      } finally {
        setLoadingBuses(false);
      }
    };
    fetchBusesForRoute();
  }, [selectedRouteId, routes, toast, form]);

  React.useEffect(() => {
    const fetchOccupiedSeats = async () => {
        if (!selectedBusId || !selectedDate) {
            setOccupiedSeats([]);
            return;
        }
        setLoadingSeats(true);
        try {
            await releaseExpiredSeats(); // Clean up expired seats before fetching

            const bookingDate = format(selectedDate, 'yyyy-MM-dd');
            
            const paidQuery = query(collection(db, "bookings"),
                where("busId", "==", selectedBusId),
                where("date", ">=", `${bookingDate}T00:00:00.000Z`),
                where("date", "<=", `${bookingDate}T23:59:59.999Z`)
            );
            const pendingQuery = query(collection(db, "pending_bookings"),
                where("busId", "==", selectedBusId),
                where("date", ">=", `${bookingDate}T00:00:00.000Z`),
                where("date", "<=", `${bookingDate}T23:59:59.999Z`)
            );

            const [paidSnapshot, pendingSnapshot] = await Promise.all([
                getDocs(paidQuery),
                getDocs(pendingQuery),
            ]);
            
            const paidSeats = paidSnapshot.docs.flatMap(doc => doc.data().seats || []);
            const pendingSeats = pendingSnapshot.docs.flatMap(doc => doc.data().seats || []);
            
            setOccupiedSeats([...paidSeats, ...pendingSeats]);

        } catch (error) {
            console.error("Error fetching occupied seats:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not fetch seat availability." });
        } finally {
            setLoadingSeats(false);
        }
    };

    fetchOccupiedSeats();
  }, [selectedBusId, selectedDate, toast]);


  const selectedRoute = React.useMemo(() => {
    return routes.find(r => r.id === selectedRouteId);
  }, [routes, selectedRouteId]);

  const selectedBus = React.useMemo(() => {
    return availableBuses.find(b => b.id === form.watch("busId"));
  }, [availableBuses, form.watch("busId")]);

  React.useEffect(() => {
    const price = selectedRoute ? selectedRoute.price : 0;
    const numSeats = selectedSeats.length;
    setTotalAmount(numSeats * price);
  }, [selectedSeats, selectedRoute]);

  async function onSubmit(values: z.infer<typeof bookingSchema>) {
    if (!selectedRoute || !selectedBus) {
        toast({ variant: "destructive", title: "Error", description: "Selected route or bus is not valid." });
        return;
    }
    setIsSubmitting(true);
    try {
      const bookingDetails = {
        name: values.name,
        phone: values.phone,
        emergencyContact: values.emergencyContact,
        date: values.date.toISOString(),
        seats: values.selectedSeats,
        pickup: selectedRoute.pickup,
        destination: selectedRoute.destination,
        busType: `${selectedBus.numberPlate} - ${selectedBus.capacity} Seater`,
        totalAmount,
        routeId: values.routeId,
        busId: values.busId,
        referralCode: values.referralCode === "none" ? undefined : values.referralCode,
      };

      const response = await axios.post('/api/initiate-payment', bookingDetails);
      const { success, paymentUrl, error } = response.data;

      if (success && paymentUrl) {
          router.push(paymentUrl);
      } else {
          throw new Error(error || 'Failed to initiate payment.');
      }

    } catch (error: any) {
      console.error("Error initiating payment:", error);
      toast({
        variant: "destructive",
        title: "Payment Failed",
        description: error.response?.data?.error || error.message || "Something went wrong. Please try again.",
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        onSelect={(date) => {
                            field.onChange(date);
                            form.setValue("selectedSeats", []);
                        }}
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
                                form.setValue("busId", "");
                                form.setValue("selectedSeats", []);
                                setAvailableBuses([]);
                            }} 
                            defaultValue={field.value}
                            disabled={loadingRoutes || routes.length === 0}
                        >
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={
                                    loadingRoutes ? "Loading routes..." :
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
                          form.setValue("selectedSeats", []);
                        }}
                        defaultValue={field.value}
                        disabled={!selectedRouteId || loadingBuses || availableBuses.length === 0}
                    >
                    <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder={
                                loadingBuses ? "Loading buses..." :
                                !selectedRouteId ? "Select a route first" :
                                availableBuses.length === 0 ? "No buses for this route" :
                                "Select a bus"
                            } />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {availableBuses.map((bus) => (
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
                name="selectedSeats"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Select Seat(s)</FormLabel>
                        <FormControl>
                            <SeatSelection
                                capacity={selectedBus.capacity}
                                selectedSeats={field.value}
                                occupiedSeats={occupiedSeats}
                                isLoading={loadingSeats}
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
            name="referralCode"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Referral (Optional)</FormLabel>
                 <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    disabled={loadingReferrals}
                >
                    <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder={
                                loadingReferrals ? "Loading referrals..." : "Select a referral"
                            } />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {referrals.map((referral) => (
                            <SelectItem key={referral.id} value={referral.phone}>{referral.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
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
              Connecting to Payment Gateway...
            </>
          ) : (
            'Pay with Hubtel & Book Now'
          )}
        </Button>
      </form>
    </Form>
  );
}
