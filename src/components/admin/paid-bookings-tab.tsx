
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
import { collection, getDocs, query, where, Timestamp, doc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Download, Trash2 } from "lucide-react";
import { Calendar } from "../ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../ui/alert-dialog";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";

type Route = { id: string; pickup: string; destination: string; };

export default function PaidBookingsTab() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const { toast } = useToast();
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
            setUser(user);
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                setUserRole(userDoc.data().role);
            } else {
                setUserRole('Admin'); // Default role if not found
            }
        } else {
            setUser(null);
            setUserRole(null);
        }
    });
    return () => unsubscribe();
  }, [auth]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "bookings"), where("status", "==", "paid"));
      const querySnapshot = await getDocs(q);
      const bookingsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBookings(bookingsList);
    } catch (error) {
      console.error("Error fetching paid bookings: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch paid bookings.'})
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
    if(user) { // Only fetch bookings if user is authenticated
        fetchBookings();
    } else {
        setLoading(false); // If no user, stop loading
    }
  }, [user]);

  const handleDelete = async (bookingId: string) => {
    if (userRole !== 'Super-Admin') {
        toast({ variant: "destructive", title: "Unauthorized", description: "You do not have permission to delete bookings." });
        return;
    }
    try {
        await deleteDoc(doc(db, "bookings", bookingId));
        toast({ title: "Success", description: "Booking permanently deleted." });
        fetchBookings();
    } catch (error) {
        console.error("Error deleting booking:", error);
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

  const downloadCSV = () => {
    const headers = ["Ticket Number", "Passenger", "Route", "Date", "Seats", "Amount", "Status"];
    const csvContent = [
      headers.join(","),
      ...filteredBookings.map(b => 
        [
          b.ticketNumber,
          `"${b.name}"`,
          `"${b.pickup} - ${b.destination}"`,
          formatDate(b.date),
          `"${Array.isArray(b.seats) ? b.seats.join(';') : b.seats}"`,
          b.totalAmount.toFixed(2),
          "Paid"
        ].join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "paid-bookings.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (loading) {
    return <div>Loading bookings...</div>;
  }
  
  if (!user) {
    return <div>Please log in to view paid bookings.</div>;
  }

  return (
    <div>
        <div className="flex justify-between items-center mb-4">
            <div className="flex gap-4">
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
            <Button variant="outline" onClick={downloadCSV}>
                <Download className="mr-2 h-4 w-4" /> Download CSV
            </Button>
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
            {userRole === 'Super-Admin' && <TableHead className="text-right">Actions</TableHead>}
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
                {userRole === 'Super-Admin' && (
                    <TableCell className="text-right">
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
                                        This action cannot be undone. This will permanently delete this booking.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(booking.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </TableCell>
                )}
            </TableRow>
            ))}
        </TableBody>
        </Table>
    </div>
  );
}
