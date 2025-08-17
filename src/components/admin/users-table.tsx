
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
import { useEffect, useState } from "react";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "../ui/button";
import { Eye, EyeOff, Loader2, Pencil, PlusCircle, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "../ui/dialog";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../ui/alert-dialog";


const adminSchema = z.object({
  name: z.string().min(2, "Name is required."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  role: z.enum(["Admin", "Super-Admin"]),
});

type AdminFormValues = z.infer<typeof adminSchema>;


export default function UsersTable() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { toast } = useToast();

    const form = useForm<AdminFormValues>({
        resolver: zodResolver(adminSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            role: "Admin",
        },
    });

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const usersCollection = collection(db, "users");
            const usersSnapshot = await getDocs(usersCollection);
            const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsers(usersList);
        } catch (error) {
            console.error("Error fetching users: ", error);
            toast({ variant: "destructive", title: "Error", description: "Could not fetch users." });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const onSubmit = async (values: AdminFormValues) => {
        setIsSubmitting(true);
        try {
            const response = await fetch('/api/create-admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "An unknown error occurred.");
            }

            toast({ title: "Success", description: "Admin created successfully." });
            fetchUsers();
            setIsDialogOpen(false);
            form.reset();
        } catch (error: any) {
            console.error("Error creating admin: ", error);
            toast({ variant: "destructive", title: "Error", description: error.message || "An unknown error occurred. check the server logs for details." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = (userId: string) => {
        // TODO: Implement delete functionality
        console.log("Delete user:", userId);
        toast({ title: "Info", description: "Delete functionality not yet implemented." });
    };

    const handleEdit = (user: any) => {
        // TODO: Implement edit functionality
        console.log("Edit user:", user);
        toast({ title: "Info", description: "Edit functionality not yet implemented." });
    };


    if (loading) {
        return <div>Loading users...</div>;
    }

  return (
    <>
        <div className="flex justify-end mb-4">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Admin
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add New Admin</DialogTitle>
                  <DialogDescription>
                    Create a new admin user and assign them a role.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input id="name" {...form.register("name")} className="col-span-3" />
                        {form.formState.errors.name && <p className="col-span-4 text-red-500 text-xs text-right">{form.formState.errors.name.message}</p>}
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">Email</Label>
                        <Input id="email" type="email" {...form.register("email")} className="col-span-3" />
                        {form.formState.errors.email && <p className="col-span-4 text-red-500 text-xs text-right">{form.formState.errors.email.message}</p>}
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="password" className="text-right">Password</Label>
                         <div className="relative col-span-3">
                            <Input 
                                id="password" 
                                type={showPassword ? "text" : "password"} 
                                {...form.register("password")} 
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground"
                                >
                                {showPassword ? (
                                    <EyeOff className="h-5 w-5" />
                                ) : (
                                    <Eye className="h-5 w-5" />
                                )}
                            </button>
                        </div>
                        {form.formState.errors.password && <p className="col-span-4 text-red-500 text-xs text-right">{form.formState.errors.password.message}</p>}
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="role" className="text-right">Role</Label>
                        <Select onValueChange={(value) => form.setValue('role', value as "Admin" | "Super-Admin")} defaultValue={form.getValues("role")}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Admin">Admin</SelectItem>
                                <SelectItem value="Super-Admin">Super-Admin</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Admin
                        </Button>
                    </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length > 0 ? (
                users.map((user, index) => (
                  <TableRow key={user.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'Super-Admin' ? 'destructive' : user.role === 'Admin' ? 'default' : 'secondary'}>
                          {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="icon" onClick={() => handleEdit(user)}>
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
                                        This action cannot be undone. This will permanently delete the admin
                                        from the database.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(user.id)}>
                                        Delete
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
            ) : (
                <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No admin users found. Use the button above to add one.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
    </>
  );
}
