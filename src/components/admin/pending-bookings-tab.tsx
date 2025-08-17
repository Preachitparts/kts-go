
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
import { collection, getDocs, doc, writeBatch, query, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Eye, User, Phone, Bus, Calendar as CalendarIconAlt, Armchair, Shield, Ticket, Hash } from "lucide-react";
import { Calendar } from "../ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";

type Route = { id: string; pickup: string; destination: string; };

export default function PendingBookingsTab() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "pending_bookings"));
      const querySnapshot = await getDocs(q);
      const bookingsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBookings(bookingsList);
    } catch (error) {
      console.error("Error fetching pending bookings: ", error);
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

  const handleApprove = async (booking: any) => {
    if (!booking) return;
    try {
      const approvedBookingData = { ...booking, status: 'approved' };
      delete approvedBookingData.id;
      
      const batch = writeBatch(db);
      
      const approvedDocRef = doc(collection(db, "approved_bookings"));
      batch.set(approvedDocRef, approvedBookingData);

      const pendingDocRef = doc(db, "pending_bookings", booking.id);
      batch.delete(pendingDocRef);

      await batch.commit();

      toast({ title: "Success", description: "Booking approved." });
      fetchBookings();
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error approving booking: ", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to approve booking." });
    }
  };

  const handleMarkAsPaid = async (booking: any) => {
    if (!booking) return;
    try {
        const batch = writeBatch(db);

        // 1. Save passenger info
        const passengerRef = doc(db, "passengers", booking.phone);
        batch.set(passengerRef, {
            name: booking.name,
            phone: booking.phone,
            emergencyContact: booking.emergencyContact,
        }, { merge: true });

        // 2. Create the final booking
        const finalBookingData = { 
            ...booking, 
            status: 'paid',
            paymentMethod: 'Manual', // Add a note about manual payment
        };
        delete finalBookingData.id; // Remove the old doc id
        const newBookingRef = doc(collection(db, "bookings"));
        batch.set(newBookingRef, finalBookingData);

        // 3. Delete the pending booking
        const pendingDocRef = doc(db, "pending_bookings", booking.id);
        batch.delete(pendingDocRef);
        
        await batch.commit();

        toast({ title: "Success", description: "Booking marked as paid." });
        fetchBookings();
        setIsDialogOpen(false);
    } catch (error) {
        console.error("Error marking booking as paid: ", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to mark booking as paid." });
    }
  };

  const handleReject = async (booking: any) => {
     if (!booking) return;
     try {
      const rejectedBookingData = { ...booking, status: 'rejected', rejectionReason: 'Manually rejected by admin' };
      delete rejectedBookingData.id;
      
      const batch = writeBatch(db);

      const rejectedDocRef = doc(collection(db, "rejected_bookings"));
      batch.set(rejectedDocRef, rejectedBookingData);

      const pendingDocRef = doc(db, "pending_bookings", booking.id);
      batch.delete(pendingDocRef);

      await batch.commit();

      toast({ title: "Success", description: "Booking rejected and moved." });
      fetchBookings();
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error rejecting booking: ", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to reject booking." });
    }
  };
  
  const handleViewDetails = (booking: any) => {
    setSelectedBooking(booking);
    setIsDialogOpen(true);
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter(booking => {
        const routeMatch = selectedRoute === 'all' || booking.routeId === selectedRoute;
        
        // Handle both string and Firestore Timestamp dates
        const bookingDateObj = booking.date?.toDate ? booking.date.toDate() : new Date(booking.date);
        const dateMatch = !selectedDate || format(bookingDateObj, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
        
        return routeMatch && dateMatch;
    });
  }, [bookings, selectedRoute, selectedDate]);

  if (loading) {
    return <div>Loading bookings...</div>;
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
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredBookings.map((booking) => (
            <TableRow key={booking.id}>
              <TableCell>{booking.name}</TableCell>
              <TableCell>{`${booking.pickup} - ${booking.destination}`}</TableCell>
              <TableCell>{format(booking.date?.toDate ? booking.date.toDate() : new Date(booking.date), "PPP")}</TableCell>
              <TableCell>
                <Badge variant="secondary" className="bg-yellow-500">Pending</Badge>
              </TableCell>
              <TableCell className="text-right space-x-2">
                 <Button variant="outline" size="icon" onClick={() => handleViewDetails(booking)}>
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>Review the booking details and take action.</DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedBooking.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedBooking.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedBooking.emergencyContact}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarIconAlt className="h-4 w-4 text-muted-foreground" />
                  <span>{format(selectedBooking.date?.toDate ? selectedBooking.date.toDate() : new Date(selectedBooking.date), "PPP")}</span>
                </div>
                 <div className="flex items-center gap-2 col-span-2">
                  <Ticket className="h-4 w-4 text-muted-foreground" />
                  <span>{`${selectedBooking.pickup} - ${selectedBooking.destination}`}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Bus className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedBooking.busType}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Armchair className="h-4 w-4 text-muted-foreground" />
                  <span>Seats: {Array.isArray(selectedBooking.seats) ? selectedBooking.seats.join(', ') : selectedBooking.seats}</span>
                </div>
                 <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span>Ref: {selectedBooking.clientReference}</span>
                </div>
              </div>
              <div className="text-right text-lg font-bold">
                Total Amount: GH₵ {selectedBooking.totalAmount.toFixed(2)}
              </div>
            </div>
          )}
          <DialogFooter className="sm:justify-between">
            <Button variant="destructive" onClick={() => handleReject(selectedBooking)}>Reject</Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleApprove(selectedBooking)}>Approve</Button>
              <Button onClick={() => handleMarkAsPaid(selectedBooking)}>Mark as Paid</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
