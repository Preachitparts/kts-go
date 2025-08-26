
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
import { PlusCircle, Loader2, Trash2, Pencil, Download } from "lucide-react";
import React, { useState } from "react";
import { collection, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useDataFetching } from "@/hooks/useDataFetching";

const regionSchema = z.object({
  name: z.string().min(1, "Region name is required."),
});

type Region = z.infer<typeof regionSchema> & { id: string };

export default function RegionsTable() {
  const { data: regions, loading, error, refetch } = useDataFetching<Region>(collection(db, "regions"));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof regionSchema>>({
    resolver: zodResolver(regionSchema),
    defaultValues: {
      name: "",
    }
  });

  const handleEditClick = (region: Region) => {
    setEditingRegion(region);
    form.reset({
      name: region.name,
    });
    setIsDialogOpen(true);
  };
  
  const handleDelete = async (regionId: string) => {
    try {
        await deleteDoc(doc(db, "regions", regionId));
        toast({ title: "Success", description: "Region deleted successfully." });
        refetch();
    } catch (error) {
        console.error("Error deleting region: ", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to delete region." });
    }
  };

  const onSubmit = async (values: z.infer<typeof regionSchema>) => {
    setIsSubmitting(true);
    try {
      if (editingRegion) {
        const regionDoc = doc(db, "regions", editingRegion.id);
        await updateDoc(regionDoc, values);
        toast({ title: "Success", description: "Region updated successfully." });
      } else {
        await addDoc(collection(db, "regions"), values);
        toast({ title: "Success", description: "Region added successfully." });
      }
      refetch();
      setIsDialogOpen(false);
      setEditingRegion(null);
      form.reset({ name: "" });
    } catch (error) {
      console.error("Error saving region: ", error);
      toast({ variant: "destructive", title: "Error", description: "Could not save region." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openNewRegionDialog = () => {
    setEditingRegion(null);
    form.reset({ name: "" });
    setIsDialogOpen(true);
  };
  
  const downloadCSV = () => {
    const headers = ["Region Name"];
    const csvContent = [
      headers.join(","),
      ...regions.map(r => `"${r.name}"`)
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "regions.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };


  if (loading) {
    return <div>Loading regions...</div>;
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
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewRegionDialog}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Region
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingRegion ? "Edit Region" : "Add New Region"}</DialogTitle>
              <DialogDescription>
                {editingRegion ? "Update the name for this region." : "Add a new operational region."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Name</Label>
                    <Input id="name" {...form.register("name")} className="col-span-3" />
                    {form.formState.errors.name && <p className="col-span-4 text-red-500 text-xs text-right">{form.formState.errors.name.message}</p>}
                </div>

                <DialogFooter>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {editingRegion ? "Save Changes" : "Add Region"}
                    </Button>
                </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Region Name</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {regions.map((region) => (
            <TableRow key={region.id}>
              <TableCell>{region.name}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button variant="outline" size="icon" onClick={() => handleEditClick(region)}>
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
                                This action cannot be undone. This will permanently delete the region
                                from the database. Deleting a region may affect assigned routes.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(region.id)}>
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
