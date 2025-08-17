
"use client";

import React from "react";
import { collection, getDocs, query, where, doc, writeBatch, Timestamp, addDoc } from "firebase/firestore";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";

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
type Booking = { id: string; seats: string[]; name: string; phone: string; [key: string]: any };

export default function BookedSeatsManager() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [loadingSeats, setLoadingSeats] = React.useState(false);

  // Data stores
  const [routes, setRoutes] = React.useState<Route[]>([]);
  const [sessions, setSessions] = React.useState<Session[]>([]);
  const [buses, setBuses] = React.useState<Bus[]>([]);
  const [bookings, setBookings] = React.useState<Booking[]>([]);
  
  // Filter states
  const [selectedRouteId, setSelectedRouteId] = React.useState("");
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>();
  const [selectedBusId, setSelectedBusId] = React.useState("");

  // Seat management states
  const [selectedSeat, setSelectedSeat] = React.useState<string | null>(null);
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
    if (!selectedRouteId) return [];
    return sessions
      .filter(session => session.routeId === selectedRouteId)
      .map(session => session.departureDate.toDate());
  }, [selectedRouteId, sessions]);

  const availableBuses = React.useMemo(() => {
    if (!selectedRouteId || !selectedDate) return [];
    const sessionsForRouteAndDate = sessions.filter(session =>
      session.routeId === selectedRouteId &&
      format(session.departureDate.toDate(), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
    );
    const busIds = [...new Set(sessionsForRouteAndDate.map(s => s.busId))];
    return buses.filter(bus => busIds.includes(bus.id));
  }, [selectedRouteId, selectedDate, sessions, buses]);

  React.useEffect(() => {
    const fetchBookingsForJourney = async () => {
      if (!selectedBusId || !selectedDate) {
        setBookings([]);
        return;
      }
      setLoadingSeats(true);
      try {
        const targetDate = format(selectedDate, "yyyy-MM-dd");
        const bookingsQuery = query(
          collection(db, "bookings"),
          where("busId", "==", selectedBusId)
        );
        const snapshot = await getDocs(bookingsQuery);
        const allBookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
        
        const filteredBookings = allBookings.filter(b => {
            const bookingDate = b.date?.toDate ? b.date.toDate() : new Date(b.date);
            return format(bookingDate, "yyyy-MM-dd") === targetDate;
        });

        setBookings(filteredBookings);
      } catch (error) {
        console.error("Error fetching bookings:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to fetch bookings for this journey." });
      } finally {
        setLoadingSeats(false);
      }
    };
    fetchBookingsForJourney();
  }, [selectedBusId, selectedDate, toast]);

  const occupiedSeats = React.useMemo(() => {
    return bookings.flatMap(b => b.seats);
  }, [bookings]);
  
  const selectedBus = React.useMemo(() => {
      return buses.find(b => b.id === selectedBusId);
  }, [buses, selectedBusId]);

  const handleSeatClick = (seatNumber: string) => {
    if (occupiedSeats.includes(seatNumber)) {
      setSelectedSeat(seatNumber);
      setIsAlertOpen(true);
    }
  };

  const handleFreeUpSeat = async () => {
    if (!selectedSeat) return;

    const bookingToCancel = bookings.find(b => b.seats.includes(selectedSeat));
    if (!bookingToCancel) {
        toast({ variant: "destructive", title: "Error", description: "Could not find the booking for this seat." });
        return;
    }

    try {
        const batch = writeBatch(db);
        
        // 1. Move the booking to rejected_bookings
        const rejectedData = { ...bookingToCancel, status: 'rejected', rejectionReason: `Manually cancelled by admin on ${new Date().toLocaleDateString()}` };
        delete rejectedData.id;
        const rejectedRef = doc(collection(db, "rejected_bookings"));
        batch.set(rejectedRef, rejectedData);
        
        // 2. Delete the original booking
        const originalBookingRef = doc(db, "bookings", bookingToCancel.id);
        batch.delete(originalBookingRef);
        
        await batch.commit();

        toast({ title: "Success", description: `Seat ${selectedSeat} has been made available.` });

        // Refresh bookings for the current view
        const updatedBookings = bookings.filter(b => b.id !== bookingToCancel.id);
        setBookings(updatedBookings);

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
            setBookings([]);
          }}
          disabled={loading || routes.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder={loading ? "Loading routes..." : "1. Select Route"} />
          </SelectTrigger>
          <SelectContent>
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
              disabled={!selectedRouteId || availableDates.length === 0}
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
                setBookings([]);
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
            occupiedSeats={occupiedSeats}
            isLoading={loadingSeats}
            onSeatsChange={handleSeatClick} // Re-purposing this for clicking on any seat
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
            <AlertDialogTitle>Free Up Seat {selectedSeat}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will cancel the booking associated with this seat and make it available for others. The original booking will be moved to the rejected/cancelled list. This cannot be undone.
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
