
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, PlusCircle, Loader2, Trash2, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, Timestamp, query, where, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "../ui/label";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ScrollArea } from "../ui/scroll-area";
import { Checkbox } from "../ui/checkbox";


const sessionSchema = z.object({
  routeIds: z.array(z.string()).min(1, "Please select at least one route."),
  busIds: z.array(z.string()).min(1, "Please select at least one bus."),
  departureDates: z.array(z.date()).min(1, "Please select at least one departure date.").max(10, "You can select up to 10 dates at a time."),
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
    defaultValues: {
      routeIds: [],
      busIds: [],
      departureDates: [],
    }
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
    // Editing a single session remains a singular action.
    // We can't use the bulk form for editing one item.
    // For now, let's disable editing from this new UI to avoid complexity.
    // A proper implementation would need a separate, single-edit form.
    toast({ title: "Info", description: "Editing sessions is disabled in this view. Please delete and recreate if needed." });
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
        const batch = writeBatch(db);
        let sessionCount = 0;

        values.routeIds.forEach(routeId => {
            values.busIds.forEach(busId => {
                values.departureDates.forEach(date => {
                    const newSessionRef = doc(collection(db, "sessions"));
                    batch.set(newSessionRef, {
                        routeId,
                        busId,
                        departureDate: Timestamp.fromDate(date),
                    });
                    sessionCount++;
                });
            });
        });
        
        await batch.commit();

        toast({ 
            title: "Success", 
            description: `${sessionCount} session(s) created successfully.` 
        });
      
        fetchAllData();
        setIsDialogOpen(false);
        form.reset();
    } catch (error) {
      console.error("Error saving sessions: ", error);
      toast({ variant: "destructive", title: "Error", description: "Could not save sessions." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openNewSessionDialog = () => {
    setEditingSession(null);
    form.reset({ routeIds: [], busIds: [], departureDates: [] });
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
              <PlusCircle className="mr-2 h-4 w-4" /> Create Session(s)
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Session(s)</DialogTitle>
              <DialogDescription>
                Select routes, buses, and dates to create sessions in bulk.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
                
                {/* Route Selection */}
                <div className="space-y-2">
                    <Label>Routes</Label>
                    <Controller
                        name="routeIds"
                        control={form.control}
                        render={({ field }) => (
                            <ScrollArea className="h-32 w-full rounded-md border p-2">
                                <div className="flex items-center space-x-2 pb-2 border-b mb-2">
                                    <Checkbox
                                        id="selectAllRoutes"
                                        checked={field.value.length === routes.length}
                                        onCheckedChange={(checked) => {
                                            field.onChange(checked ? routes.map(r => r.id) : []);
                                        }}
                                    />
                                    <Label htmlFor="selectAllRoutes" className="font-bold">Select All Routes</Label>
                                </div>
                                {routes.map(route => (
                                    <div key={route.id} className="flex items-center space-x-2 p-1">
                                        <Checkbox
                                            id={`route-${route.id}`}
                                            checked={field.value.includes(route.id)}
                                            onCheckedChange={(checked) => {
                                                const newValue = checked 
                                                    ? [...field.value, route.id] 
                                                    : field.value.filter(id => id !== route.id);
                                                field.onChange(newValue);
                                            }}
                                        />
                                        <Label htmlFor={`route-${route.id}`}>{`${route.pickup} - ${route.destination}`}</Label>
                                    </div>
                                ))}
                            </ScrollArea>
                        )}
                    />
                    {form.formState.errors.routeIds && <p className="text-red-500 text-xs">{form.formState.errors.routeIds.message}</p>}
                </div>

                {/* Bus Selection */}
                <div className="space-y-2">
                    <Label>Buses</Label>
                    <Controller
                        name="busIds"
                        control={form.control}
                        render={({ field }) => (
                            <ScrollArea className="h-32 w-full rounded-md border p-2">
                                <div className="flex items-center space-x-2 pb-2 border-b mb-2">
                                    <Checkbox
                                        id="selectAllBuses"
                                        checked={field.value.length === buses.length}
                                        onCheckedChange={(checked) => {
                                            field.onChange(checked ? buses.map(b => b.id) : []);
                                        }}
                                    />
                                    <Label htmlFor="selectAllBuses" className="font-bold">Select All Buses</Label>
                                </div>
                                {buses.map(bus => (
                                    <div key={bus.id} className="flex items-center space-x-2 p-1">
                                        <Checkbox
                                            id={`bus-${bus.id}`}
                                            checked={field.value.includes(bus.id)}
                                            onCheckedChange={(checked) => {
                                                const newValue = checked 
                                                    ? [...field.value, bus.id] 
                                                    : field.value.filter(id => id !== bus.id);
                                                field.onChange(newValue);
                                            }}
                                        />
                                        <Label htmlFor={`bus-${bus.id}`}>{`${bus.numberPlate} (${bus.capacity} seats)`}</Label>
                                    </div>
                                ))}
                            </ScrollArea>
                        )}
                    />
                    {form.formState.errors.busIds && <p className="text-red-500 text-xs">{form.formState.errors.busIds.message}</p>}
                </div>

                {/* Date Selection */}
                 <div className="space-y-2">
                    <Label>Departure Dates (up to 10)</Label>
                    <Controller
                      name="departureDates"
                      control={form.control}
                      render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal h-auto",
                                !field.value?.length && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value?.length ? (
                                <div className="flex flex-wrap gap-1">
                                  {field.value.map(date => (
                                    <Badge key={date.toString()} variant="secondary">{format(date, "MMM d")}</Badge>
                                  ))}
                                </div>
                              ) : (
                                <span>Pick date(s)</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="multiple"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                              initialFocus
                              max={10}
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                    {form.formState.errors.departureDates && <p className="text-red-500 text-xs">{form.formState.errors.departureDates.message}</p>}
                </div>


                <DialogFooter>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Session(s)
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
                <Button variant="outline" size="icon" onClick={() => handleEditClick(session)} disabled>
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
           {sessions.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  No sessions found.
                </TableCell>
              </TableRow>
            )}
        </TableBody>
      </Table>
    </>
  );
}
