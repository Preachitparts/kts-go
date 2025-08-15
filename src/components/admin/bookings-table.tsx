
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function BookingsTable() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const paidBookingsCollection = collection(db, "bookings");
        const pendingBookingsCollection = collection(db, "pending_bookings");
        
        const [paidSnapshot, pendingSnapshot] = await Promise.all([
            getDocs(paidBookingsCollection),
            getDocs(pendingBookingsCollection)
        ]);

        const paidList = paidSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), status: 'Paid' }));
        const pendingList = pendingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), status: 'Pending' }));
        
        const combinedList = [...paidList, ...pendingList];

        // Sort by date, descending
        combinedList.sort((a, b) => {
            const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
            const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
            return dateB.getTime() - dateA.getTime();
        });


        setBookings(combinedList);
      } catch (error) {
        console.error("Error fetching bookings: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  if (loading) {
    return <div>Loading bookings...</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Ticket Number</TableHead>
          <TableHead>Passenger</TableHead>
          <TableHead>Route</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Seats</TableHead>
          <TableHead>Amount (GH₵)</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bookings.map((booking) => (
          <TableRow key={booking.id}>
            <TableCell>{booking.ticketNumber || 'N/A'}</TableCell>
            <TableCell>{booking.name}</TableCell>
            <TableCell>{`${booking.pickup} - ${booking.destination}`}</TableCell>
            <TableCell>{new Date(booking.date).toLocaleDateString()}</TableCell>
            <TableCell>{booking.seats}</TableCell>
            <TableCell>{booking.totalAmount?.toFixed(2)}</TableCell>
            <TableCell>
                <Badge variant={booking.status === 'Paid' ? 'default' : 'secondary'} 
                       className={booking.status === 'Paid' ? 'bg-green-500' : 'bg-yellow-500'}>
                    {booking.status}
                </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
