
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
import { PlusCircle, Loader2, Trash2, Pencil, CheckCircle, Download } from "lucide-react";
import React, { useState } from "react";
import { collection, addDoc, doc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "../ui/switch";
import { useDataFetching } from "@/hooks/useDataFetching";

const busSchema = z.object({
  numberPlate: z.string().min(1, "Number plate is required."),
  capacity: z.preprocess(
    (a) => parseInt(z.string().parse(a), 10),
    z.number().positive("Capacity must be a positive number.")
  ),
  status: z.boolean().default(true),
});

type Bus = z.infer<typeof busSchema> & { id: string };

export default function BusesTable() {
  const { data: buses, loading, error, refetch } = useDataFetching<Bus>(collection(db, "buses"));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof busSchema>>({
    resolver: zodResolver(busSchema),
    defaultValues: {
      numberPlate: "",
      capacity: 32,
      status: true,
    }
  });

  const handleEditClick = (bus: Bus) => {
    setEditingBus(bus);
    form.reset({
      numberPlate: bus.numberPlate,
      capacity: bus.capacity,
      status: bus.status,
    });
    setIsDialogOpen(true);
  };
  
  const handleDelete = async (busId: string) => {
    try {
        await deleteDoc(doc(db, "buses", busId));
        toast({ title: "Success", description: "Bus deleted successfully." });
        refetch();
    } catch (error) {
        console.error("Error deleting bus: ", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to delete bus." });
    }
  };

  const handleStatusChange = async (bus: Bus, newStatus: boolean) => {
    try {
        const busDoc = doc(db, "buses", bus.id);
        await updateDoc(busDoc, { status: newStatus });
        toast({ title: "Success", description: `Bus ${newStatus ? 'activated' : 'deactivated'}.` });
        refetch();
    } catch (error) {
        console.error("Error updating bus status: ", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to update bus status." });
    }
  };

  const handleActivateAll = async () => {
    const batch = writeBatch(db);
    buses.forEach(bus => {
        if (!bus.status) {
            const busRef = doc(db, "buses", bus.id);
            batch.update(busRef, { status: true });
        }
    });
    try {
        await batch.commit();
        toast({ title: "Success", description: "All buses have been activated." });
        refetch();
    } catch (error) {
        console.error("Error activating all buses: ", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to activate all buses." });
    }
  };

  const onSubmit = async (values: z.infer<typeof busSchema>) => {
    setIsSubmitting(true);
    try {
      if (editingBus) {
        const busDoc = doc(db, "buses", editingBus.id);
        await updateDoc(busDoc, values);
        toast({ title: "Success", description: "Bus updated successfully." });
      } else {
        await addDoc(collection(db, "buses"), values);
        toast({ title: "Success", description: "Bus added successfully." });
      }
      refetch();
      setIsDialogOpen(false);
      setEditingBus(null);
      form.reset({ numberPlate: "", capacity: 32, status: true });
    } catch (error) {
      console.error("Error saving bus: ", error);
      toast({ variant: "destructive", title: "Error", description: "Could not save bus." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openNewBusDialog = () => {
    setEditingBus(null);
    form.reset({ numberPlate: "", capacity: 32, status: true });
    setIsDialogOpen(true);
  };

  const downloadCSV = () => {
    const headers = ["Number Plate", "Capacity", "Status"];
    const csvContent = [
      headers.join(","),
      ...buses.map(bus => 
        [
          `"${bus.numberPlate}"`,
          bus.capacity,
          bus.status ? "Active" : "Inactive"
        ].join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "buses.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (loading) {
    return <div>Loading buses...</div>;
  }
  
  if (error) {
    return <div className="text-destructive">Error: {error}</div>;
  }

  return (
    <>
      <div className="flex justify-end gap-2 mb-4">
        <Button variant="outline" onClick={downloadCSV}>
            <Download className="mr-2 h-4 w-4" /> Download CSV
        </Button>
        <Button variant="outline" onClick={handleActivateAll}>
            <CheckCircle className="mr-2 h-4 w-4" /> Activate All
        </Button>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewBusDialog}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Bus
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingBus ? "Edit Bus" : "Add New Bus"}</DialogTitle>
              <DialogDescription>
                {editingBus ? "Update the details for this bus." : "Add a new bus to your fleet."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="numberPlate" className="text-right">Number Plate</Label>
                    <Input id="numberPlate" {...form.register("numberPlate")} className="col-span-3" />
                    {form.formState.errors.numberPlate && <p className="col-span-4 text-red-500 text-xs text-right">{form.formState.errors.numberPlate.message}</p>}
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="capacity" className="text-right">Capacity</Label>
                    <Input id="capacity" type="number" {...form.register("capacity")} className="col-span-3" />
                    {form.formState.errors.capacity && <p className="col-span-4 text-red-500 text-xs text-right">{form.formState.errors.capacity.message}</p>}
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="status" className="text-right">Active</Label>
                    <Switch
                        id="status"
                        checked={form.watch("status")}
                        onCheckedChange={(checked) => form.setValue("status", checked)}
                    />
                </div>

                <DialogFooter>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {editingBus ? "Save Changes" : "Add Bus"}
                    </Button>
                </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Number Plate</TableHead>
            <TableHead>Capacity</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {buses.map((bus) => (
            <TableRow key={bus.id}>
              <TableCell>{bus.numberPlate}</TableCell>
              <TableCell>{bus.capacity}</TableCell>
              <TableCell>
                  <Switch
                    checked={bus.status}
                    onCheckedChange={(newStatus) => handleStatusChange(bus, newStatus)}
                    aria-readonly
                  />
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button variant="outline" size="icon" onClick={() => handleEditClick(bus)}>
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
                                This action cannot be undone. This will permanently delete the bus
                                from the database.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(bus.id)}>
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
