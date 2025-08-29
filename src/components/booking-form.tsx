
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { CalendarIcon, Loader2 } from "lucide-react";
import React from "react";
import { collection, getDocs, query, where, doc, writeBatch, Timestamp, addDoc, serverTimestamp, getDoc, setDoc } from "firebase/firestore";

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
  regionId: z.string().min(1, "Please select a region."),
  routeId: z.string().min(1, "Please select a route."),
  busId: z.string().min(1, "Please select a bus."),
  selectedSeats: z.array(z.string()).min(1, "Please select at least one seat."),
  emergencyContact: z.string().regex(/^(\+233|0)[2-9]\d{8}$/, "Invalid Ghanaian phone number."),
  referralCode: z.string().optional(),
});

type Region = { id: string; name: string };
type Route = { id: string; pickup: string; destination: string; price: number; status: boolean; busIds?: string[]; regionId: string };
type Bus = { id: string; numberPlate: string; capacity: number; status: boolean; };
type Referral = { id: string; name: string; phone: string; };
type Session = { id: string; routeId: string; busId: string; departureDate: Timestamp };


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
  const [regions, setRegions] = React.useState<Region[]>([]);
  const [routes, setRoutes] = React.useState<Route[]>([]);
  const [sessions, setSessions] = React.useState<Session[]>([]);
  const [availableBuses, setAvailableBuses] = React.useState<Bus[]>([]);
  const [referrals, setReferrals] = React.useState<Referral[]>([]);
  const [occupiedSeats, setOccupiedSeats] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingSeats, setLoadingSeats] = React.useState(false);

  const form = useForm<z.infer<typeof bookingSchema>>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      name: "",
      phone: "",
      selectedSeats: [],
      emergencyContact: "",
      regionId: "",
      routeId: "",
      busId: "",
      referralCode: "",
    },
  });
  
  const selectedRegionId = form.watch("regionId");
  const selectedRouteId = form.watch("routeId");
  const selectedBusId = form.watch("busId");
  const selectedDate = form.watch("date");
  const selectedSeats = form.watch("selectedSeats");

  React.useEffect(() => {
    const fetchPrerequisites = async () => {
      setLoading(true);
      try {
        const regionsQuery = collection(db, "regions");
        const routesQuery = query(collection(db, "routes"), where("status", "==", true));
        const referralsQuery = collection(db, "referrals");
        const sessionsQuery = query(collection(db, "sessions"));
        
        const [regionsSnapshot, routesSnapshot, referralsSnapshot, sessionsSnapshot] = await Promise.all([
            getDocs(regionsQuery),
            getDocs(routesQuery),
            getDocs(referralsQuery),
            getDocs(sessionsQuery),
        ]);

        const regionsList = regionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Region));
        const routesList = routesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Route));
        const referralsList = referralsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Referral));
        const sessionsList = sessionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session));
        
        setRegions(regionsList);
        setRoutes(routesList);
        setReferrals(referralsList);
        setSessions(sessionsList);
      } catch (error) {
        console.error("Error fetching prerequisites: ", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch necessary booking data." });
      } finally {
        setLoading(false);
      }
    };
    fetchPrerequisites();
  }, [toast]);
  
  const availableRoutes = React.useMemo(() => {
    if (!selectedRegionId) return [];
    return routes.filter(route => route.regionId === selectedRegionId);
  }, [selectedRegionId, routes]);

  const availableDates = React.useMemo(() => {
      if (!selectedRouteId) return [];
      return sessions
          .filter(session => session.routeId === selectedRouteId)
          .map(session => session.departureDate.toDate());
  }, [selectedRouteId, sessions]);

  React.useEffect(() => {
    const fetchBusesForRouteAndDate = async () => {
        if (!selectedRouteId || !selectedDate) {
            setAvailableBuses([]);
            return;
        }
        
        const sessionsForRouteAndDate = sessions.filter(session => 
            session.routeId === selectedRouteId && 
            format(session.departureDate.toDate(), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
        );

        if (sessionsForRouteAndDate.length > 0) {
            const busIds = sessionsForRouteAndDate.map(s => s.busId);
            if (busIds.length === 0) {
                setAvailableBuses([]);
                return;
            }
            const busesQuery = query(collection(db, "buses"), where("__name__", "in", busIds), where("status", "==", true));
            const busesSnapshot = await getDocs(busesQuery);
            const busesList = busesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bus));
            setAvailableBuses(busesList);
        } else {
            setAvailableBuses([]);
        }
    };
    fetchBusesForRouteAndDate();
}, [selectedRouteId, selectedDate, sessions]);


  React.useEffect(() => {
    const fetchOccupiedSeats = async () => {
        if (!selectedBusId || !selectedDate || !selectedRouteId) {
            setOccupiedSeats([]);
            return;
        }
        setLoadingSeats(true);
        try {
            await releaseExpiredSeats();

            const targetDate = format(selectedDate, "yyyy-MM-dd");

            const paidQuery = query(collection(db, "bookings"), where("busId", "==", selectedBusId), where("routeId", "==", selectedRouteId));
            const pendingQuery = query(collection(db, "pending_bookings"), where("busId", "==", selectedBusId), where("routeId", "==", selectedRouteId));

            const [paidSnapshot, pendingSnapshot] = await Promise.all([
                getDocs(paidQuery),
                getDocs(pendingQuery),
            ]);
            
            const filterByDate = (doc: any) => {
                const docDate = doc.data().date?.toDate ? doc.data().date.toDate() : new Date(doc.data().date);
                const docDateStr = format(docDate, "yyyy-MM-dd");
                return docDateStr === targetDate;
            };

            const paidSeats = paidSnapshot.docs.filter(filterByDate).flatMap(doc => doc.data().seats || []);
            const pendingSeats = pendingSnapshot.docs.filter(filterByDate).flatMap(doc => doc.data().seats || []);
            
            setOccupiedSeats([...paidSeats, ...pendingSeats]);

        } catch (error) {
            console.error("Error fetching occupied seats:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not fetch seat availability." });
        } finally {
            setLoadingSeats(false);
        }
    };

    fetchOccupiedSeats();
  }, [selectedBusId, selectedDate, selectedRouteId, toast]);


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
    let pendingBookingId = "";
    try {
        const ticketNumber = `KTS${Date.now()}`;
        const referral = referrals.find(r => r.phone === values.referralCode);

        const pendingBookingData = {
            name: values.name,
            phone: values.phone,
            emergencyContact: values.emergencyContact,
            date: Timestamp.fromDate(values.date),
            seats: values.selectedSeats,
            pickup: selectedRoute.pickup,
            destination: selectedRoute.destination,
            busType: `${selectedBus.numberPlate} (${selectedBus.capacity} Seater)`,
            totalAmount: totalAmount,
            routeId: values.routeId,
            busId: values.busId,
            referralId: referral ? referral.id : null,
            ticketNumber: ticketNumber,
            status: "pending",
            createdAt: serverTimestamp(),
            clientReference: "",
        };
        
        const pendingDocRef = doc(collection(db, "pending_bookings"));
        pendingBookingId = pendingDocRef.id;

        await setDoc(pendingDocRef, { ...pendingBookingData, clientReference: pendingBookingId });
        
        const response = await fetch('/api/initiate-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                totalAmount: totalAmount,
                description: `KTS Go Ticket - ${ticketNumber}`,
                clientReference: pendingDocRef.id,
                phone: values.phone,
            })
        });
      
        const data = await response.json();

        if (response.ok && data.success && data.paymentUrl) {
            router.push(data.paymentUrl);
        } else {
            throw new Error(data.error || 'Failed to initiate payment.');
        }

    } catch (error: any) {
      console.error("Error during booking process:", error);
      // NOTE: We no longer move the booking to rejected here.
      // The `releaseExpiredSeats` function will handle timed-out pending bookings.
      toast({
        variant: "destructive",
        title: "Booking Error",
        description: error.message || "Could not generate payment link. Please try again.",
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
            name="regionId"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Select Region</FormLabel>
                    <Select 
                        onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue("routeId", "");
                            form.setValue("date", undefined as any);
                            form.setValue("busId", "");
                            form.setValue("selectedSeats", []);
                        }} 
                        defaultValue={field.value}
                        disabled={loading || regions.length === 0}
                    >
                    <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder={
                                loading ? "Loading regions..." :
                                regions.length === 0 ? "No regions available" :
                                "Select a region"
                            } />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {regions.map((region) => (
                            <SelectItem key={region.id} value={region.id}>{region.name}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )}
        />
        <FormField
            control={form.control}
            name="routeId"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Select Route</FormLabel>
                    <Select 
                        onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue("date", undefined as any);
                            form.setValue("busId", "");
                            form.setValue("selectedSeats", []);
                            setAvailableBuses([]);
                        }} 
                        defaultValue={field.value}
                        disabled={!selectedRegionId || availableRoutes.length === 0}
                    >
                    <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder={
                                !selectedRegionId ? "Select a region first" :
                                availableRoutes.length === 0 ? "No routes in this region" :
                                "Select a route"
                            } />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {availableRoutes.map((route) => (
                            <SelectItem key={route.id} value={route.id}>{`${route.pickup} - ${route.destination} (GH₵ ${route.price.toFixed(2)})`}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )}
        />
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
              <FormItem className="flex flex-col">
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
                      disabled={!selectedRouteId || availableDates.length === 0}
                      >
                      {field.value ? (
                          format(field.value, "PPP")
                      ) : (
                          <span>{!selectedRouteId ? 'Select a route first' : 'Pick a date'}</span>
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
                          if (date) {
                              field.onChange(date);
                              form.setValue("busId", "");
                              form.setValue("selectedSeats", []);
                          }
                      }}
                      disabled={(date) => 
                          date < new Date(new Date().setHours(0,0,0,0)) || 
                          !availableDates.some(ad => format(ad, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'))
                      }
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
                        disabled={!selectedDate || availableBuses.length === 0}
                    >
                    <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder={
                                !selectedDate ? "Select a date first" :
                                availableBuses.length === 0 ? "No buses for this date" :
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
        <FormField
            control={form.control}
            name="referralCode"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Referral (Optional)</FormLabel>
                 <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    disabled={loading}
                >
                    <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder={
                                loading ? "Loading..." : "Select a referral"
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
