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
import { PlusCircle, Loader2, Trash2, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const routeSchema = z.object({
  pickup: z.string().min(1, "Pickup point is required."),
  destination: z.string().min(1, "Destination is required."),
  price: z.preprocess(
    (a) => parseFloat(z.string().parse(a)),
    z.number().positive("Price must be a positive number.")
  ),
});

type Route = z.infer<typeof routeSchema> & { id: string };

export default function RoutesTable() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof routeSchema>>({
    resolver: zodResolver(routeSchema),
  });

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const routesCollection = collection(db, "routes");
      const routesSnapshot = await getDocs(routesCollection);
      const routesList = routesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Route));
      setRoutes(routesList);
    } catch (error) {
      console.error("Error fetching routes: ", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch routes." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  const handleEditClick = (route: Route) => {
    setEditingRoute(route);
    form.reset({
      pickup: route.pickup,
      destination: route.destination,
      price: route.price,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (routeId: string) => {
    try {
        await deleteDoc(doc(db, "routes", routeId));
        toast({ title: "Success", description: "Route deleted successfully." });
        fetchRoutes(); // Refresh the list
    } catch (error) {
        console.error("Error deleting route: ", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to delete route." });
    }
  };

  const onSubmit = async (values: z.infer<typeof routeSchema>) => {
    setIsSubmitting(true);
    try {
      if (editingRoute) {
        // Update existing route
        const routeDoc = doc(db, "routes", editingRoute.id);
        await updateDoc(routeDoc, values);
        toast({ title: "Success", description: "Route updated successfully." });
      } else {
        // Add new route
        await addDoc(collection(db, "routes"), values);
        toast({ title: "Success", description: "Route added successfully." });
      }
      fetchRoutes();
      setIsDialogOpen(false);
      setEditingRoute(null);
      form.reset({ pickup: "", destination: "", price: 0 });
    } catch (error) {
      console.error("Error saving route: ", error);
      toast({ variant: "destructive", title: "Error", description: "Could not save route." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openNewRouteDialog = () => {
    setEditingRoute(null);
    form.reset({ pickup: "", destination: "", price: 0 });
    setIsDialogOpen(true);
  };

  if (loading) {
    return <div>Loading routes...</div>;
  }

  return (
    <>
      <div className="flex justify-end mb-4">
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
                <Label htmlFor="pickup" className="text-right">Pickup</Label>
                <Input id="pickup" {...form.register("pickup")} className="col-span-3" />
                {form.formState.errors.pickup && <p className="col-span-4 text-red-500 text-xs">{form.formState.errors.pickup.message}</p>}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="destination" className="text-right">Destination</Label>
                <Input id="destination" {...form.register("destination")} className="col-span-3" />
                 {form.formState.errors.destination && <p className="col-span-4 text-red-500 text-xs">{form.formState.errors.destination.message}</p>}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="price" className="text-right">Price (GH₵)</Label>
                <Input id="price" type="number" step="0.01" {...form.register("price")} className="col-span-3" />
                 {form.formState.errors.price && <p className="col-span-4 text-red-500 text-xs">{form.formState.errors.price.message}</p>}
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
            <TableHead>Pickup Point</TableHead>
            <TableHead>Destination</TableHead>
            <TableHead>Price (GH₵)</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {routes.map((route) => (
            <TableRow key={route.id}>
              <TableCell>{route.pickup}</TableCell>
              <TableCell>{route.destination}</TableCell>
              <TableCell>{route.price.toFixed(2)}</TableCell>
              <TableCell className="text-right space-x-2">
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
}
