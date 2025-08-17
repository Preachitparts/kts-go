
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
import { PlusCircle, Loader2, Trash2, Pencil, Search, Download } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const referralSchema = z.object({
  name: z.string().min(2, "Name is required."),
  phone: z.string().regex(/^(\+233|0)[2-9]\d{8}$/, "Invalid Ghanaian phone number."),
});

type Referral = z.infer<typeof referralSchema> & { id: string };

export default function ManageReferralsTab() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReferral, setEditingReferral] = useState<Referral | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const form = useForm<z.infer<typeof referralSchema>>({
    resolver: zodResolver(referralSchema),
    defaultValues: {
      name: "",
      phone: "",
    }
  });

  const fetchReferrals = async () => {
    setLoading(true);
    try {
      const referralsCollection = collection(db, "referrals");
      const referralsSnapshot = await getDocs(referralsCollection);
      const referralsList = referralsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Referral));
      setReferrals(referralsList);
    } catch (error) {
      console.error("Error fetching referrals: ", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch referrals." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, []);

  const filteredReferrals = useMemo(() => {
    return referrals.filter(referral =>
      referral.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referral.phone.includes(searchTerm)
    );
  }, [referrals, searchTerm]);

  const handleEditClick = (referral: Referral) => {
    setEditingReferral(referral);
    form.reset({
      name: referral.name,
      phone: referral.phone,
    });
    setIsDialogOpen(true);
  };
  
  const handleDelete = async (referralId: string) => {
    try {
        await deleteDoc(doc(db, "referrals", referralId));
        toast({ title: "Success", description: "Referral deleted successfully." });
        fetchReferrals();
    } catch (error) {
        console.error("Error deleting referral: ", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to delete referral." });
    }
  };

  const onSubmit = async (values: z.infer<typeof referralSchema>) => {
    setIsSubmitting(true);
    try {
      if (editingReferral) {
        const referralDoc = doc(db, "referrals", editingReferral.id);
        await updateDoc(referralDoc, values);
        toast({ title: "Success", description: "Referral updated successfully." });
      } else {
        await addDoc(collection(db, "referrals"), values);
        toast({ title: "Success", description: "Referral added successfully." });
      }
      fetchReferrals();
      setIsDialogOpen(false);
      setEditingReferral(null);
      form.reset({ name: "", phone: "" });
    } catch (error) {
      console.error("Error saving referral: ", error);
      toast({ variant: "destructive", title: "Error", description: "Could not save referral." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openNewReferralDialog = () => {
    setEditingReferral(null);
    form.reset({ name: "", phone: "" });
    setIsDialogOpen(true);
  };
  
  const downloadCSV = () => {
    const headers = ["Name", "Phone"];
    const csvContent = [
      headers.join(","),
      ...filteredReferrals.map(r => 
        [
          `"${r.name}"`,
          `"${r.phone}"`
        ].join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "referrals.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (loading) {
    return <div>Loading referrals...</div>;
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4 gap-4">
        <div className="relative w-full max-w-sm">
          <Input 
            placeholder="Search by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={downloadCSV}>
                <Download className="mr-2 h-4 w-4" /> Download CSV
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button onClick={openNewReferralDialog}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Referral
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                <DialogTitle>{editingReferral ? "Edit Referral" : "Add New Referral"}</DialogTitle>
                <DialogDescription>
                    {editingReferral ? "Update the details for this referral partner." : "Add a new referral partner to the system."}
                </DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input id="name" {...form.register("name")} className="col-span-3" />
                        {form.formState.errors.name && <p className="col-span-4 text-red-500 text-xs text-right">{form.formState.errors.name.message}</p>}
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="phone" className="text-right">Phone</Label>
                        <Input id="phone" {...form.register("phone")} className="col-span-3" />
                        {form.formState.errors.phone && <p className="col-span-4 text-red-500 text-xs text-right">{form.formState.errors.phone.message}</p>}
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingReferral ? "Save Changes" : "Add Referral"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
            </Dialog>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Phone (Referral Code)</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredReferrals.map((referral) => (
            <TableRow key={referral.id}>
              <TableCell>{referral.name}</TableCell>
              <TableCell>{referral.phone}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button variant="outline" size="icon" onClick={() => handleEditClick(referral)}>
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
                                This action cannot be undone. This will permanently delete the referral.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(referral.id)}>
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

    