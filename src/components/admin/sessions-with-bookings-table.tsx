
"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Loader2 } from "lucide-react";
import { collection, getDocs, query, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import Link from "next/link";

type Session = { 
  id: string; 
  routeId: string; 
  busId: string; 
  departureDate: Timestamp; 
  routeName?: string;
  busName?: string;
  bookedSeatsCount?: number;
};

type Route = { id: string; pickup: string; destination: string; };
type Bus = { id: string; numberPlate: string; capacity: number };


export function SessionsWithBookingsTable() {
  const [sessions, setSessions] = React.useState<Session[]>([]);
  const [loading, setLoading] = React.useState(true);
  const { toast } = useToast();

  React.useEffect(() => {
    const fetchSessionsWithBookings = async () => {
      setLoading(true);
      try {
        const routesSnapshot = await getDocs(collection(db, "routes"));
        const busesSnapshot = await getDocs(collection(db, "buses"));
        const routesMap = new Map(routesSnapshot.docs.map(doc => [doc.id, doc.data() as Route]));
        const busesMap = new Map(busesSnapshot.docs.map(doc => [doc.id, doc.data() as Bus]));

        const paidBookingsQuery = collection(db, "bookings");
        const pendingBookingsQuery = collection(db, "pending_bookings");

        const [paidBookingsSnapshot, pendingBookingsSnapshot] = await Promise.all([
          getDocs(paidBookingsQuery),
          getDocs(pendingBookingsQuery)
        ]);
        
        const allBookings = [
            ...paidBookingsSnapshot.docs.map(d => d.data()),
            ...pendingBookingsSnapshot.docs.map(d => d.data())
        ];

        const sessionBookingCounts = new Map<string, number>();

        for (const booking of allBookings) {
            const bookingDate = booking.date?.toDate ? booking.date.toDate() : new Date(booking.date);
            const departureDateStr = format(bookingDate, "yyyy-MM-dd");
            const sessionKey = `${booking.routeId}-${booking.busId}-${departureDateStr}`;
            
            const currentCount = sessionBookingCounts.get(sessionKey) || 0;
            sessionBookingCounts.set(sessionKey, currentCount + (booking.seats?.length || 0));
        }

        const sessionsQuery = query(collection(db, "sessions"));
        const sessionsSnapshot = await getDocs(sessionsQuery);
        
        const relevantSessions = sessionsSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Session))
            .filter(session => {
                const departureDateStr = format(session.departureDate.toDate(), "yyyy-MM-dd");
                const sessionKey = `${session.routeId}-${session.busId}-${departureDateStr}`;
                return sessionBookingCounts.has(sessionKey);
            })
            .map(session => {
                const route = routesMap.get(session.routeId);
                const bus = busesMap.get(session.busId);
                const departureDateStr = format(session.departureDate.toDate(), "yyyy-MM-dd");
                const sessionKey = `${session.routeId}-${session.busId}-${departureDateStr}`;

                return {
                    ...session,
                    routeName: route ? `${route.pickup} - ${route.destination}` : 'Unknown Route',
                    busName: bus ? `${bus.numberPlate} (${bus.capacity} seats)` : 'Unknown Bus',
                    bookedSeatsCount: sessionBookingCounts.get(sessionKey) || 0,
                };
            })
            .sort((a, b) => b.departureDate.toDate().getTime() - a.departureDate.toDate().getTime());
        
        setSessions(relevantSessions);

      } catch (error) {
        console.error("Error fetching sessions with bookings: ", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch session data." });
      } finally {
        setLoading(false);
      }
    };

    fetchSessionsWithBookings();
  }, [toast]);


  if (loading) {
    return (
        <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-4 text-lg">Loading Sessions...</span>
        </div>
    );
  }

  return (
    <div className="border rounded-md">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Departure Date</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Bus</TableHead>
                    <TableHead>Booked Seats</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {sessions.length > 0 ? (
                    sessions.map((session) => (
                        <TableRow key={session.id}>
                            <TableCell>{format(session.departureDate.toDate(), "PPP")}</TableCell>
                            <TableCell>{session.routeName}</TableCell>
                            <TableCell>{session.busName}</TableCell>
                            <TableCell>
                                <Badge variant="secondary">{session.bookedSeatsCount}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button asChild variant="outline" size="sm">
                                    <Link href={`/admin/seat-management/${session.id}`}>
                                        <Eye className="mr-2 h-4 w-4" />
                                        View Map
                                    </Link>
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                            No journeys with booked seats found.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    </div>
  );
}
