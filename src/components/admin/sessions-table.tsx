
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, PlusCircle, Loader2, Trash2, Pencil, MoreHorizontal, Eye } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Input } from "../ui/input";


const sessionSchema = z.object({
  name: z.string().min(3, "Session name must be at least 3 characters."),
  routeIds: z.array(z.string()).min(1, "Please select at least one route."),
  busIds: z.array(z.string()).min(1, "Please select at least one bus."),
  departureDates: z.array(z.date()).min(1, "Please select at least one departure date.").max(10, "You can select up to 10 dates at a time."),
});

type Route = { id: string; pickup: string; destination: string; price: number };
type Bus = { id: string; numberPlate: string; capacity: number; status: boolean; };
type Session = { 
  id: string; 
  name: string;
  routeId: string; 
  busId: string; 
  departureDate: Timestamp; 
  createdAt: Timestamp;
  routeName?: string;
  busName?: string;
};

type GroupedSessions = { [date: string]: Session[] };


export default function SessionsTable() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewingSession, setViewingSession] = useState<Session | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);

  const { toast } = useToast();

  const form = useForm<z.infer<typeof sessionSchema>>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      name: "",
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
      }).sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

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

  const groupedSessions = useMemo(() => {
    return sessions.reduce((acc, session) => {
        const dateKey = session.createdAt ? format(session.createdAt.toDate(), "PPP") : 'No Date';
        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }
        acc[dateKey].push(session);
        return acc;
    }, {} as GroupedSessions);
  }, [sessions]);

  const handleEditClick = (session: Session) => {
    toast({ title: "Info", description: "Editing sessions is disabled in this view. Please delete and recreate if needed." });
  };
  
  const handleDelete = async (sessionId: string) => {
    try {
        await deleteDoc(doc(db, "sessions", sessionId));
        toast({ title: "Success", description: "Session deleted successfully." });
        setSelectedSessions([]);
        fetchAllData();
    } catch (error) {
        console.error("Error deleting session: ", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to delete session." });
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedSessions.length === 0) return;
    try {
      const batch = writeBatch(db);
      selectedSessions.forEach(id => {
        const docRef = doc(db, "sessions", id);
        batch.delete(docRef);
      });
      await batch.commit();
      toast({ title: "Success", description: `${selectedSessions.length} sessions deleted.` });
      setSelectedSessions([]);
      fetchAllData();
    } catch (error) {
      console.error("Error deleting selected sessions:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to delete selected sessions." });
    }
  };


  const handleViewClick = (session: Session) => {
    setViewingSession(session);
    setIsViewDialogOpen(true);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSessions(sessions.map(s => s.id));
    } else {
      setSelectedSessions([]);
    }
  };

  const handleSelectSingle = (sessionId: string, checked: boolean) => {
    if (checked) {
      setSelectedSessions(prev => [...prev, sessionId]);
    } else {
      setSelectedSessions(prev => prev.filter(id => id !== sessionId));
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
                        name: values.name,
                        routeId,
                        busId,
                        departureDate: Timestamp.fromDate(date),
                        createdAt: Timestamp.now(), // Add creation timestamp
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
    form.reset({ name: "", routeIds: [], busIds: [], departureDates: [] });
    setIsDialogOpen(true);
  };

  if (loading) {
    return <div>Loading sessions...</div>;
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div>
          {selectedSessions.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete ({selectedSessions.length})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete {selectedSessions.length} session(s). This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteSelected}>
                    Yes, delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
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
                
                 {/* Session Name */}
                 <div className="space-y-2">
                    <Label htmlFor="name">Session Name</Label>
                    <Input id="name" {...form.register("name")} placeholder="e.g. Easter Promo" />
                    {form.formState.errors.name && <p className="text-red-500 text-xs">{form.formState.errors.name.message}</p>}
                </div>

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
                                        checked={field.value.length === routes.length && routes.length > 0}
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
                                        checked={field.value.length === buses.length && buses.length > 0}
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
            <TableHead className="w-[50px]">
              <Checkbox
                  checked={selectedSessions.length === sessions.length && sessions.length > 0}
                  onCheckedChange={(checked) => handleSelectAll(!!checked)}
              />
            </TableHead>
            <TableHead>Session Name</TableHead>
            <TableHead>Departure Date</TableHead>
            <TableHead>Route</TableHead>
            <TableHead>Bus</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.keys(groupedSessions).length > 0 ? (
            Object.entries(groupedSessions).map(([date, sessionsInGroup]) => (
                <React.Fragment key={date}>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableCell colSpan={7} className="font-semibold text-muted-foreground">
                            Created on: {date}
                        </TableCell>
                    </TableRow>
                    {sessionsInGroup.map((session) => (
                        <TableRow key={session.id}>
                            <TableCell>
                                <Checkbox
                                    checked={selectedSessions.includes(session.id)}
                                    onCheckedChange={(checked) => handleSelectSingle(session.id, !!checked)}
                                />
                            </TableCell>
                            <TableCell>{session.name}</TableCell>
                            <TableCell>{format(session.departureDate.toDate(), "PPP")}</TableCell>
                            <TableCell>{session.routeName}</TableCell>
                            <TableCell>{session.busName}</TableCell>
                            <TableCell>
                                <Badge variant={
                                    session.departureDate.toDate() > new Date() ? 'default' : 'secondary'
                                } className={
                                    session.departureDate.toDate() > new Date() ? 'bg-blue-500' : 'bg-gray-500'
                                }>
                                    {session.departureDate.toDate() > new Date() ? 'Upcoming' : 'Completed'}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <AlertDialog>
                                    <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">Open menu</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => handleViewClick(session)}>
                                        <Eye className="mr-2 h-4 w-4" />
                                        <span>View Details</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleEditClick(session)} disabled>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        <span>Edit</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <AlertDialogTrigger asChild>
                                        <DropdownMenuItem className="text-red-600">
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            <span>Delete</span>
                                        </DropdownMenuItem>
                                        </AlertDialogTrigger>
                                    </DropdownMenuContent>
                                    </DropdownMenu>
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
                </React.Fragment>
            ))
           ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  No sessions found.
                </TableCell>
              </TableRow>
            )}
        </TableBody>
      </Table>
      
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Session Details</DialogTitle>
                <DialogDescription>
                    Reviewing details for the selected session.
                </DialogDescription>
            </DialogHeader>
            {viewingSession && (
                <div className="grid gap-4 py-4 text-sm">
                    <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                        <Label className="text-right text-muted-foreground">Session Name</Label>
                        <span>{viewingSession.name}</span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                        <Label className="text-right text-muted-foreground">Route</Label>
                        <span>{viewingSession.routeName}</span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                        <Label className="text-right text-muted-foreground">Bus</Label>
                        <span>{viewingSession.busName}</span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                        <Label className="text-right text-muted-foreground">Departure Date</Label>
                        <span>{format(viewingSession.departureDate.toDate(), "PPPP")}</span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                        <Label className="text-right text-muted-foreground">Created On</Label>
                        <span>{viewingSession.createdAt ? format(viewingSession.createdAt.toDate(), "PPpp") : 'N/A'}</span>
                    </div>
                     <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                        <Label className="text-right text-muted-foreground">Status</Label>
                        <Badge variant={
                            viewingSession.departureDate.toDate() > new Date() ? 'default' : 'secondary'
                        } className={cn(
                            'w-fit',
                            viewingSession.departureDate.toDate() > new Date() ? 'bg-blue-500' : 'bg-gray-500'
                        )}>
                            {viewingSession.departureDate.toDate() > new Date() ? 'Upcoming' : 'Completed'}
                        </Badge>
                    </div>
                </div>
            )}
            <DialogFooter>
                <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
