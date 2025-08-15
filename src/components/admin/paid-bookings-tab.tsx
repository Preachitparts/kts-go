
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
import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "../ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

type Route = { id: string; pickup: string; destination: string; };

export default function PaidBookingsTab() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  const fetchPrerequisites = async () => {
    try {
        const routesSnapshot = await getDocs(collection(db, "routes"));
        const routesList = routesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Route));
        setRoutes(routesList);
    } catch (error) {
        console.error("Error fetching routes:", error);
    }
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "bookings"), where("status", "==", "paid"));
      const querySnapshot = await getDocs(q);
      const bookingsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBookings(bookingsList);
    } catch (error) {
      console.error("Error fetching paid bookings: ", error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchPrerequisites();
    fetchBookings();
  }, []);

  const filteredBookings = useMemo(() => {
    return bookings.filter(booking => {
        const routeMatch = selectedRoute === 'all' || booking.routeId === selectedRoute;
        const bookingDate = booking.date?.toDate ? booking.date.toDate() : new Date(booking.date);
        const dateMatch = !selectedDate || format(bookingDate, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
        return routeMatch && dateMatch;
    });
  }, [bookings, selectedRoute, selectedDate]);

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return format(dateObj, "PPP");
  };

  if (loading) {
    return <div>Loading bookings...</div>;
  }

  return (
    <div>
        <div className="flex gap-4 mb-4">
            <Select value={selectedRoute} onValueChange={setSelectedRoute}>
                <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Filter by route..." />
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
                        className={cn("w-[280px] justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : <span>Filter by departure date...</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
                </PopoverContent>
            </Popover>
             { (selectedRoute !== 'all' || selectedDate) &&
                <Button variant="ghost" onClick={() => {setSelectedRoute("all"); setSelectedDate(undefined)}}>Clear Filters</Button>
             }
        </div>
        <Table>
        <TableHeader>
            <TableRow>
            <TableHead>Ticket Number</TableHead>
            <TableHead>Passenger</TableHead>
            <TableHead>Route</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Amount (GH₵)</TableHead>
            <TableHead>Status</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {filteredBookings.map((booking) => (
            <TableRow key={booking.id}>
                <TableCell>{booking.ticketNumber}</TableCell>
                <TableCell>{booking.name}</TableCell>
                <TableCell>{`${booking.pickup} - ${booking.destination}`}</TableCell>
                <TableCell>{formatDate(booking.date)}</TableCell>
                <TableCell>{booking.totalAmount.toFixed(2)}</TableCell>
                <TableCell>
                    <Badge className="bg-green-500">Paid</Badge>
                </TableCell>
            </TableRow>
            ))}
        </TableBody>
        </Table>
    </div>
  );
}
