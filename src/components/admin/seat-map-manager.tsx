
"use client";

import React from "react";
import { collection, getDocs, query, where, doc, writeBatch, Timestamp } from "firebase/firestore";
import { format } from "date-fns";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
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

type SeatMapManagerProps = {
    busId: string;
    busCapacity: number;
    departureDate: Date;
    routeId: string;
}

export default function SeatMapManager({ busId, busCapacity, departureDate, routeId }: SeatMapManagerProps) {
  const { toast } = useToast();
  const [loadingSeats, setLoadingSeats] = React.useState(true);
  const [allBookings, setAllBookings] = React.useState<Booking[]>([]);
  const [selectedSeat, setSelectedSeat] = React.useState<{ number: string; booking: Booking | undefined } | null>(null);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);

  const fetchBookingsForJourney = React.useCallback(async () => {
    setLoadingSeats(true);
    try {
        const releasedCount = await releaseExpiredSeats();
        if (releasedCount > 0) {
            toast({ title: "Auto-Release", description: `${releasedCount} pending seat(s) were released due to payment timeout.` });
        }

        const targetDate = format(departureDate, "yyyy-MM-dd");

        const paidQuery = query(collection(db, "bookings"), where("busId", "==", busId), where("routeId", "==", routeId));
        const pendingQuery = query(collection(db, "pending_bookings"), where("busId", "==", busId), where("routeId", "==", routeId));
        
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
}, [busId, departureDate, routeId, toast]);


  React.useEffect(() => {
    fetchBookingsForJourney();
  }, [fetchBookingsForJourney]);

  const { paidSeats, pendingSeats } = React.useMemo(() => {
    const paid = allBookings.filter(b => b.status === 'paid').flatMap(b => b.seats);
    const pending = allBookings.filter(b => b.status === 'pending').flatMap(b => b.seats);
    return { paidSeats: paid, pendingSeats: pending };
  }, [allBookings]);
  

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
      <SeatSelection
        capacity={busCapacity}
        selectedSeats={[]} 
        occupiedSeats={paidSeats}
        pendingSeats={pendingSeats}
        isLoading={loadingSeats}
        onSeatsChange={handleSeatClick}
      />

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
