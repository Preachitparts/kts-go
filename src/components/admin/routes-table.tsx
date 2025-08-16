

"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Loader2, Trash2, Pencil, ArrowRightLeft, CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, writeBatch, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "../ui/switch";
import { Checkbox } from "../ui/checkbox";
import { ScrollArea } from "../ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

const routeSchema = z.object({
  pickup: z.string().min(1, "Pickup point is required."),
  destination: z.string().min(1, "Destination is required."),
  price: z.preprocess(
    (a) => parseFloat(z.string().parse(a)),
    z.number().positive("Price must be a positive number.")
  ),
  status: z.boolean().default(true),
  busIds: z.array(z.string()).optional(),
  regionId: z.string().min(1, "Please select a region."),
});

type Route = z.infer<typeof routeSchema> & { id: string, regionName?: string };
type Bus = { id: string; numberPlate: string; capacity: number; status: boolean; };
type Region = { id: string; name: string; };

export default function RoutesTable() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof routeSchema>>({
    resolver: zodResolver(routeSchema),
    defaultValues: {
        pickup: "",
        destination: "",
        price: 0,
        status: true,
        busIds: [],
        regionId: "",
    }
  });

  const fetchPrerequisites = async () => {
    setLoading(true);
    try {
      const routesCollection = collection(db, "routes");
      const busesQuery = query(collection(db, "buses"), where("status", "==", true));
      const regionsCollection = collection(db, "regions");

      const [routesSnapshot, busesSnapshot, regionsSnapshot] = await Promise.all([
        getDocs(routesCollection),
        getDocs(busesQuery),
        getDocs(regionsCollection)
      ]);
      
      const regionsList = regionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Region));
      const regionMap = new Map(regionsList.map(r => [r.id, r.name]));

      const routesList = routesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
              id: doc.id,
              ...data,
              busIds: data.busIds || [],
              regionName: regionMap.get(data.regionId) || "Unassigned"
          } as Route;
      });
      const busesList = busesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bus));

      setRoutes(routesList);
      setBuses(busesList);
      setRegions(regionsList);

    } catch (error) {
      console.error("Error fetching prerequisites: ", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch data." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrerequisites();
  }, []);

  const handleEditClick = (route: Route) => {
    setEditingRoute(route);
    form.reset({
      pickup: route.pickup,
      destination: route.destination,
      price: route.price,
      status: route.status,
      busIds: route.busIds || [],
      regionId: route.regionId,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (routeId: string) => {
    try {
        await deleteDoc(doc(db, "routes", routeId));
        toast({ title: "Success", description: "Route deleted successfully." });
        fetchPrerequisites(); // Refresh the list
    } catch (error) {
        console.error("Error deleting route: ", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to delete route." });
    }
  };

  const handleSwap = async (route: Route) => {
    try {
      const routeDoc = doc(db, "routes", route.id);
      await updateDoc(routeDoc, {
        pickup: route.destination,
        destination: route.pickup,
      });
      toast({ title: "Success", description: "Route swapped successfully." });
      fetchPrerequisites(); // Refresh the list
    } catch (error) {
      console.error("Error swapping route: ", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to swap route." });
    }
  };

  const handleStatusChange = async (route: Route, newStatus: boolean) => {
    try {
        const routeDoc = doc(db, "routes", route.id);
        await updateDoc(routeDoc, { status: newStatus });
        toast({ title: "Success", description: `Route ${newStatus ? 'activated' : 'deactivated'}.` });
        fetchPrerequisites();
    } catch (error) {
        console.error("Error updating route status: ", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to update route status." });
    }
  };

  const handleActivateAll = async () => {
    const batch = writeBatch(db);
    routes.forEach(route => {
        if (!route.status) {
            const routeRef = doc(db, "routes", route.id);
            batch.update(routeRef, { status: true });
        }
    });
    try {
        await batch.commit();
        toast({ title: "Success", description: "All routes have been activated." });
        fetchPrerequisites();
    } catch (error) {
        console.error("Error activating all routes: ", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to activate all routes." });
    }
  };


  const onSubmit = async (values: z.infer<typeof routeSchema>) => {
    setIsSubmitting(true);
    try {
      const submissionValues = {
        pickup: values.pickup,
        destination: values.destination,
        price: values.price,
        status: values.status,
        busIds: values.busIds || [],
        regionId: values.regionId,
      };

      if (editingRoute) {
        const routeDoc = doc(db, "routes", editingRoute.id);
        await updateDoc(routeDoc, submissionValues);
        toast({ title: "Success", description: "Route updated successfully." });
      } else {
        await addDoc(collection(db, "routes"), submissionValues);
        toast({ title: "Success", description: "Route added successfully." });
      }
      fetchPrerequisites();
      setIsDialogOpen(false);
      setEditingRoute(null);
      form.reset({ pickup: "", destination: "", price: 0, status: true, busIds: [], regionId: "" });
    } catch (error) {
      console.error("Error saving route: ", error);
      toast({ variant: "destructive", title: "Error", description: "Could not save route." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openNewRouteDialog = () => {
    setEditingRoute(null);
    form.reset({ pickup: "", destination: "", price: 0, status: true, busIds: [], regionId: "" });
    setIsDialogOpen(true);
  };

  if (loading) {
    return <div>Loading routes...</div>;
  }

  return (
    <>
      <div className="flex justify-end gap-2 mb-4">
        <Button variant="outline" onClick={handleActivateAll}>
            <CheckCircle className="mr-2 h-4 w-4" /> Activate All
        </Button>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewRouteDialog}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Route
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingRoute ? "Edit Route" : "Add New Route"}</DialogTitle>
              <DialogDescription>
                {editingRoute ? "Update the details for this route." : "Add a new route and fare to the system."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="regionId" className="text-right">Region</Label>
                    <Controller
                        name="regionId"
                        control={form.control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select a region" />
                                </SelectTrigger>
                                <SelectContent>
                                    {regions.map(region => (
                                        <SelectItem key={region.id} value={region.id}>{region.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {form.formState.errors.regionId && <p className="col-span-4 text-red-500 text-xs text-right">{form.formState.errors.regionId.message}</p>}
                </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="pickup" className="text-right">Pickup</Label>
                <Input id="pickup" {...form.register("pickup")} className="col-span-3" />
                {form.formState.errors.pickup && <p className="col-span-4 text-red-500 text-xs text-right">{form.formState.errors.pickup.message}</p>}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="destination" className="text-right">Destination</Label>
                <Input id="destination" {...form.register("destination")} className="col-span-3" />
                 {form.formState.errors.destination && <p className="col-span-4 text-red-500 text-xs text-right">{form.formState.errors.destination.message}</p>}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="price" className="text-right">Price (GH₵)</Label>
                <Input id="price" type="number" step="0.01" {...form.register("price")} className="col-span-3" />
                 {form.formState.errors.price && <p className="col-span-4 text-red-500 text-xs text-right">{form.formState.errors.price.message}</p>}
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="status" className="text-right">Active</Label>
                    <Switch
                        id="status"
                        checked={form.watch("status")}
                        onCheckedChange={(checked) => form.setValue("status", checked)}
                    />
                </div>

                <div>
                  <Label>Assign Buses (Optional)</Label>
                  <ScrollArea className="h-40 w-full rounded-md border p-4 mt-2">
                    <Controller
                        name="busIds"
                        control={form.control}
                        render={({ field }) => (
                            <div className="space-y-2">
                                {buses.map((bus) => (
                                    <div key={bus.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={bus.id}
                                            checked={field.value?.includes(bus.id)}
                                            onCheckedChange={(checked) => {
                                                const currentBusIds = field.value || [];
                                                if (checked) {
                                                    field.onChange([...currentBusIds, bus.id]);
                                                } else {
                                                    field.onChange(currentBusIds.filter((id) => id !== bus.id));
                                                }
                                            }}
                                        />
                                        <label htmlFor={bus.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            {bus.numberPlate} ({bus.capacity} Seater)
                                        </label>
                                    </div>
                                ))}
                            </div>
                        )}
                    />
                  </ScrollArea>
                   {form.formState.errors.busIds && <p className="text-red-500 text-xs mt-1">{form.formState.errors.busIds.message}</p>}
                </div>

              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingRoute ? "Save Changes" : "Add Route"}
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
            <TableHead>Region</TableHead>
            <TableHead>Price (GH₵)</TableHead>
            <TableHead>Assigned Buses</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {routes.map((route) => (
            <TableRow key={route.id}>
              <TableCell>{route.pickup} - {route.destination}</TableCell>
              <TableCell>{route.regionName}</TableCell>
              <TableCell>{route.price.toFixed(2)}</TableCell>
              <TableCell>{route.busIds?.length || 0}</TableCell>
              <TableCell>
                  <Switch
                    checked={route.status}
                    onCheckedChange={(newStatus) => handleStatusChange(route, newStatus)}
                    aria-readonly
                  />
              </TableCell>
              <TableCell className="text-right space-x-2">
                 <Button variant="outline" size="icon" onClick={() => handleSwap(route)}>
                  <ArrowRightLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => handleEditClick(route)}>
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
                                This action cannot be undone. This will permanently delete the route
                                from the database.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(route.id)}>
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

    