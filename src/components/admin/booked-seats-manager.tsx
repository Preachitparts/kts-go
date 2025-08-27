
"use client";

import React from "react";
import { collection, getDocs, query, where, doc, writeBatch, Timestamp, collectionGroup } from "firebase/firestore";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import SeatSelection from "../seat-selection";

type Route = { id: string; pickup: string; destination: string; regionId: string };
type Session = { id: string; routeId: string; busId: string; departureDate: Timestamp };
type Bus = { id: string; numberPlate: string; capacity: number };
type Booking = { id: string; seats: string[]; status: 'paid' | 'pending'; [key: string]: any };

async function releaseExpiredSeats() {
    const fiveMinutesAgo = Timestamp.fromMillis(Date.now() - 5 * 60 * 1000);
    const expiredBookingsQuery = query(
        collection(db, "pending_bookings"),
        where("createdAt", "<=", fiveMinutesAgo)
    );

    const snapshot = await getDocs(expiredBookingsQuery);
    if (snapshot.empty) {
        return 0;
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
    return snapshot.size;
}

export default function BookedSeatsManager() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [loadingSeats, setLoadingSeats] = React.useState(false);

  // Data stores
  const [routes, setRoutes] = React.useState<Route[]>([]);
  const [sessions, setSessions] = React.useState<Session[]>([]);
  const [buses, setBuses] = React.useState<Bus[]>([]);
  const [allBookings, setAllBookings] = React.useState<Booking[]>([]);
  
  // Filter states
  const [selectedRouteId, setSelectedRouteId] = React.useState("all");
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>();
  const [selectedBusId, setSelectedBusId] = React.useState("");

  // Seat management states
  const [selectedSeat, setSelectedSeat] = React.useState<{ number: string; booking: Booking | undefined } | null>(null);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);

  React.useEffect(() => {
    const fetchPrerequisites = async () => {
      setLoading(true);
      try {
        const routesQuery = query(collection(db, "routes"), where("status", "==", true));
        const sessionsQuery = query(collection(db, "sessions"));
        const busesQuery = query(collection(db, "buses"), where("status", "==", true));

        const [routesSnapshot, sessionsSnapshot, busesSnapshot] = await Promise.all([
          getDocs(routesQuery),
          getDocs(sessionsQuery),
          getDocs(busesQuery),
        ]);

        const routesList = routesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Route));
        const sessionsList = sessionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session));
        const busesList = busesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bus));

        setRoutes(routesList);
        setSessions(sessionsList);
        setBuses(busesList);
      } catch (error) {
        console.error("Error fetching prerequisites:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch initial data." });
      } finally {
        setLoading(false);
      }
    };
    fetchPrerequisites();
  }, [toast]);

  const availableDates = React.useMemo(() => {
    const relevantSessions = selectedRouteId === 'all' 
      ? sessions 
      : sessions.filter(session => session.routeId === selectedRouteId);
    
    return relevantSessions.map(session => session.departureDate.toDate());
  }, [selectedRouteId, sessions]);

  const availableBuses = React.useMemo(() => {
    if (!selectedDate) return [];
    
    let sessionsForDate = sessions.filter(session =>
      format(session.departureDate.toDate(), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
    );

    if (selectedRouteId !== 'all') {
      sessionsForDate = sessionsForDate.filter(session => session.routeId === selectedRouteId);
    }
    
    const busIds = [...new Set(sessionsForDate.map(s => s.busId))];
    return buses.filter(bus => busIds.includes(bus.id));
  }, [selectedRouteId, selectedDate, sessions, buses]);

  const fetchBookingsForJourney = React.useCallback(async () => {
    if (!selectedBusId || !selectedDate) {
      setAllBookings([]);
      return;
    }
    setLoadingSeats(true);
    try {
        const releasedCount = await releaseExpiredSeats();
        if (releasedCount > 0) {
            toast({ title: "Auto-Release", description: `${releasedCount} pending seat(s) were released due to payment timeout.` });
        }

        const targetDate = format(selectedDate, "yyyy-MM-dd");

        const paidQuery = query(collection(db, "bookings"), where("busId", "==", selectedBusId));
        const pendingQuery = query(collection(db, "pending_bookings"), where("busId", "==", selectedBusId));
        
        const [paidSnapshot, pendingSnapshot] = await Promise.all([getDocs(paidQuery), getDocs(pendingQuery)]);
        
        const filterByDate = (doc: any) => {
            const bookingDate = doc.data().date?.toDate ? doc.data().date.toDate() : new Date(doc.data().date);
            return format(bookingDate, "yyyy-MM-dd") === targetDate;
        };
        
        const paidBookings = paidSnapshot.docs.filter(filterByDate).map(doc => ({ id: doc.id, ...doc.data(), status: 'paid' } as Booking));
        const pendingBookings = pendingSnapshot.docs.filter(filterByDate).map(doc => ({ id: doc.id, ...doc.data(), status: 'pending' } as Booking));

        setAllBookings([...paidBookings, ...pendingBookings]);
    } catch (error) {
        console.error("Error fetching bookings:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to fetch bookings for this journey." });
    } finally {
        setLoadingSeats(false);
    }
}, [selectedBusId, selectedDate, toast]);


  React.useEffect(() => {
    fetchBookingsForJourney();
  }, [fetchBookingsForJourney]);

  const { paidSeats, pendingSeats } = React.useMemo(() => {
    const paid = allBookings.filter(b => b.status === 'paid').flatMap(b => b.seats);
    const pending = allBookings.filter(b => b.status === 'pending').flatMap(b => b.seats);
    return { paidSeats: paid, pendingSeats: pending };
  }, [allBookings]);
  
  const selectedBus = React.useMemo(() => {
      return buses.find(b => b.id === selectedBusId);
  }, [buses, selectedBusId]);

  const handleSeatClick = (seatNumber: string) => {
    const booking = allBookings.find(b => b.seats.includes(seatNumber));
    if (booking) {
      setSelectedSeat({ number: seatNumber, booking });
      setIsAlertOpen(true);
    }
  };

  const handleFreeUpSeat = async () => {
    if (!selectedSeat || !selectedSeat.booking) return;

    const bookingToCancel = selectedSeat.booking;
    const originalCollection = bookingToCancel.status === 'paid' ? 'bookings' : 'pending_bookings';

    try {
        const batch = writeBatch(db);
        
        const rejectedData = { ...bookingToCancel, status: 'rejected', rejectionReason: `Manually cancelled by admin on ${new Date().toLocaleDateString()}` };
        delete rejectedData.id;
        const rejectedRef = doc(collection(db, "rejected_bookings"));
        batch.set(rejectedRef, rejectedData);
        
        const originalBookingRef = doc(db, originalCollection, bookingToCancel.id);
        batch.delete(originalBookingRef);
        
        await batch.commit();

        toast({ title: "Success", description: `Seat ${selectedSeat.number} has been made available.` });
        
        fetchBookingsForJourney();

    } catch (error) {
        console.error("Error cancelling booking:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to cancel the booking." });
    } finally {
        setIsAlertOpen(false);
        setSelectedSeat(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select
          value={selectedRouteId}
          onValueChange={(value) => {
            setSelectedRouteId(value);
            setSelectedDate(undefined);
            setSelectedBusId("");
            setAllBookings([]);
          }}
          disabled={loading || routes.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder={loading ? "Loading routes..." : "1. Select Route"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Routes</SelectItem>
            {routes.map(route => (
              <SelectItem key={route.id} value={route.id}>{`${route.pickup} - ${route.destination}`}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}
              disabled={loading || availableDates.length === 0}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "PPP") : (<span>2. Select Date</span>)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                setSelectedBusId("");
                setAllBookings([]);
              }}
              disabled={(date) => 
                date < new Date(new Date().setHours(0,0,0,0)) || 
                !availableDates.some(ad => format(ad, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'))
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Select
          value={selectedBusId}
          onValueChange={setSelectedBusId}
          disabled={!selectedDate || availableBuses.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder={!selectedDate ? "Select date first" : "3. Select Bus"} />
          </SelectTrigger>
          <SelectContent>
            {availableBuses.map(bus => (
              <SelectItem key={bus.id} value={bus.id}>{`${bus.numberPlate} (${bus.capacity} Seater)`}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        {selectedBus ? (
          <SeatSelection
            capacity={selectedBus.capacity}
            selectedSeats={[]} 
            occupiedSeats={paidSeats}
            pendingSeats={pendingSeats}
            isLoading={loadingSeats}
            onSeatsChange={handleSeatClick}
          />
        ) : (
          <Alert>
            <AlertTitle>No Journey Selected</AlertTitle>
            <AlertDescription>
              Please select a route, date, and bus to view the seat map and manage bookings.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Free Up Seat {selectedSeat?.number}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will cancel the booking associated with this seat (Status: {selectedSeat?.booking?.status}) and make it available for others. The original booking will be moved to the rejected/cancelled list. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedSeat(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleFreeUpSeat}>Yes, Free Up Seat</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
