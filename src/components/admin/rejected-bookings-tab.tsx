
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
import { Button } from "@/components/ui/button";
import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, doc, deleteDoc, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Trash2 } from "lucide-react";
import { Calendar } from "../ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Route = { id: string; pickup: string; destination: string; };

export default function RejectedBookingsTab() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const { toast } = useToast();

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "rejected_bookings"));
      const querySnapshot = await getDocs(q);
      const bookingsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBookings(bookingsList);
    } catch (error) {
      console.error("Error fetching rejected bookings: ", error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    const fetchPrerequisites = async () => {
      try {
          const routesSnapshot = await getDocs(collection(db, "routes"));
          const routesList = routesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Route));
          setRoutes(routesList);
      } catch (error) {
          console.error("Error fetching routes:", error);
      }
    };
    
    fetchPrerequisites();
    fetchBookings();
  }, []);

  const handleDelete = async (bookingId: string) => {
    if (!bookingId) return;
    try {
        await deleteDoc(doc(db, "rejected_bookings", bookingId));
        toast({ title: "Success", description: "Rejected booking permanently deleted." });
        fetchBookings();
    } catch (error) {
        console.error("Error deleting booking: ", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to delete booking." });
    }
  };

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
    return <div>Loading rejected bookings...</div>;
  }

  return (
    <>
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
        {(selectedRoute !== 'all' || selectedDate) &&
          <Button variant="ghost" onClick={() => { setSelectedRoute("all"); setSelectedDate(undefined) }}>Clear Filters</Button>
        }
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Passenger</TableHead>
            <TableHead>Route</TableHead>
            <TableHead>Departure Date</TableHead>
            <TableHead>Booked On</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredBookings.map((booking) => (
            <TableRow key={booking.id}>
              <TableCell>{booking.name}</TableCell>
              <TableCell>{`${booking.pickup} - ${booking.destination}`}</TableCell>
              <TableCell>{formatDate(booking.date)}</TableCell>
              <TableCell>{formatDate(booking.createdAt)}</TableCell>
              <TableCell>
                <Badge variant="destructive">{booking.rejectionReason || 'Rejected'}</Badge>
              </TableCell>
              <TableCell className="text-right space-x-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="icon">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete this booking record.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(booking.id)}>
                        Delete Permanently
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))}
           {filteredBookings.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No rejected bookings found.
                    </TableCell>
                </TableRow>
            )}
        </TableBody>
      </Table>
    </>
  );
}
