import UsersTable from "@/components/admin/users-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function UsersPage() {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Manage Admins</CardTitle>
                    <CardDescription>Add new admins and manage their roles.</CardDescription>
                </div>
                 <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Admin
                </Button>
            </CardHeader>
            <CardContent>
                <UsersTable />
            </CardContent>
        </Card>
    )
}
