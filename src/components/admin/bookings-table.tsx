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
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function BookingsTable() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const bookingsCollection = collection(db, "bookings");
        const bookingsSnapshot = await getDocs(bookingsCollection);
        const bookingsList = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setBookings(bookingsList);
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
            <TableCell>{booking.ticketNumber}</TableCell>
            <TableCell>{booking.name}</TableCell>
            <TableCell>{`${booking.pickup} - ${booking.destination}`}</TableCell>
            <TableCell>{new Date(booking.date).toLocaleDateString()}</TableCell>
            <TableCell>{booking.seats}</TableCell>
            <TableCell>{booking.totalAmount?.toFixed(2)}</TableCell>
            <TableCell>
                <Badge variant={'default'} className={'bg-green-500'}>
                    Paid
                </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
