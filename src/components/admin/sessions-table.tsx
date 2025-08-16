
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, PlusCircle, Loader2, Trash2, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, Timestamp, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "../ui/label";
import { format } from "date-fns";
import { cn } from "@/lib/utils";


const sessionSchema = z.object({
  routeId: z.string().min(1, "Please select a route."),
  busId: z.string().min(1, "Please select a bus."),
  departureDate: z.date({ required_error: "Departure date is required." }),
});

type Route = { id: string; pickup: string; destination: string; price: number };
type Bus = { id: string; numberPlate: string; capacity: number; status: boolean; };
type Session = { 
  id: string; 
  routeId: string; 
  busId: string; 
  departureDate: Timestamp; 
  routeName?: string;
  busName?: string;
};

export default function SessionsTable() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof sessionSchema>>({
    resolver: zodResolver(sessionSchema),
  });

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const routesQuery = query(collection(db, "routes"), where("status", "==", true));
      const busesQuery = query(collection(db, "buses"), where("status", "==", true));
      const sessionsCollection = collection(db, "sessions");
      
      const [routesSnapshot, busesSnapshot, sessionsSnapshot] = await Promise.all([
          getDocs(routesQuery),
          getDocs(busesQuery),
          getDocs(sessionsCollection)
      ]);
      
      const routesList = routesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Route));
      const busesList = busesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bus));
      
      const sessionsList = sessionsSnapshot.docs.map(doc => {
        const data = doc.data() as Omit<Session, 'id'>;
        const route = routesList.find(r => r.id === data.routeId);
        const bus = busesList.find(b => b.id === data.busId);
        return { 
          id: doc.id,
          ...data,
          routeName: route ? `${route.pickup} - ${route.destination}` : 'Unknown Route',
          busName: bus ? `${bus.numberPlate} (${bus.capacity} seats)` : 'Unknown Bus',
        };
      }).sort((a, b) => b.departureDate.toMillis() - a.departureDate.toMillis());

      setRoutes(routesList);
      setBuses(busesList);
      setSessions(sessionsList);

    } catch (error) {
      console.error("Error fetching data: ", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch data." });
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchAllData();
  }, []);

  const handleEditClick = (session: Session) => {
    setEditingSession(session);
    form.reset({
      routeId: session.routeId,
      busId: session.busId,
      departureDate: session.departureDate.toDate(),
    });
    setIsDialogOpen(true);
  };
  
  const handleDelete = async (sessionId: string) => {
    try {
        await deleteDoc(doc(db, "sessions", sessionId));
        toast({ title: "Success", description: "Session deleted successfully." });
        fetchAllData();
    } catch (error) {
        console.error("Error deleting session: ", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to delete session." });
    }
  };

  const onSubmit = async (values: z.infer<typeof sessionSchema>) => {
    setIsSubmitting(true);
    try {
      const sessionData = {
          ...values,
          departureDate: Timestamp.fromDate(values.departureDate),
      };
      if (editingSession) {
        const sessionDoc = doc(db, "sessions", editingSession.id);
        await updateDoc(sessionDoc, sessionData);
        toast({ title: "Success", description: "Session updated successfully." });
      } else {
        await addDoc(collection(db, "sessions"), sessionData);
        toast({ title: "Success", description: "Session created successfully." });
      }
      fetchAllData();
      setIsDialogOpen(false);
      setEditingSession(null);
      form.reset();
    } catch (error) {
      console.error("Error saving session: ", error);
      toast({ variant: "destructive", title: "Error", description: "Could not save session." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openNewSessionDialog = () => {
    setEditingSession(null);
    form.reset();
    setIsDialogOpen(true);
  };

  if (loading) {
    return <div>Loading sessions...</div>;
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewSessionDialog}>
              <PlusCircle className="mr-2 h-4 w-4" /> Create Session
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingSession ? "Edit Session" : "Create New Session"}</DialogTitle>
              <DialogDescription>
                {editingSession ? "Update the details for this session." : "Create a new journey session for booking."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="routeId" className="text-right">Route</Label>
                    <Select onValueChange={(value) => form.setValue('routeId', value)} defaultValue={form.getValues("routeId")}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select a route" />
                        </SelectTrigger>
                        <SelectContent>
                            {routes.map(route => (
                                <SelectItem key={route.id} value={route.id}>{`${route.pickup} - ${route.destination}`}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                     {form.formState.errors.routeId && <p className="col-span-4 text-red-500 text-xs text-right">{form.formState.errors.routeId.message}</p>}
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="busId" className="text-right">Bus</Label>
                    <Select onValueChange={(value) => form.setValue('busId', value)} defaultValue={form.getValues("busId")}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select a bus" />
                        </SelectTrigger>
                        <SelectContent>
                            {buses.map(bus => (
                                 <SelectItem key={bus.id} value={bus.id}>{`${bus.numberPlate} (${bus.capacity} seats)`}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {form.formState.errors.busId && <p className="col-span-4 text-red-500 text-xs text-right">{form.formState.errors.busId.message}</p>}
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Date</Label>
                     <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            variant={"outline"}
                            className={cn(
                                "col-span-3 justify-start text-left font-normal",
                                !form.watch("departureDate") && "text-muted-foreground"
                            )}
                            >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {form.watch("departureDate") ? format(form.watch("departureDate"), "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={form.watch("departureDate")}
                                onSelect={(date) => form.setValue('departureDate', date as Date)}
                                disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                    {form.formState.errors.departureDate && <p className="col-span-4 text-red-500 text-xs text-right">{form.formState.errors.departureDate.message}</p>}
                </div>
                <DialogFooter>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {editingSession ? "Save Changes" : "Create Session"}
                    </Button>
                </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Route</TableHead>
            <TableHead>Bus</TableHead>
            <TableHead>Departure Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((session) => (
            <TableRow key={session.id}>
              <TableCell>{session.routeName}</TableCell>
              <TableCell>{session.busName}</TableCell>
              <TableCell>{format(session.departureDate.toDate(), "PPP")}</TableCell>
              <TableCell>
                  <Badge variant={
                      session.departureDate.toDate() > new Date() ? 'default' : 'secondary'
                  } className={
                      session.departureDate.toDate() > new Date() ? 'bg-blue-500' : 'bg-gray-500'
                  }>
                      {session.departureDate.toDate() > new Date() ? 'Upcoming' : 'Completed'}
                  </Badge>
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button variant="outline" size="icon" onClick={() => handleEditClick(session)}>
                  <Pencil className="h-4 w-4" />
                </Button>
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
                                This action cannot be undone. This will permanently delete the session.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(session.id)}>
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
