import UsersTable from "@/components/admin/users-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";


export default function UsersPage() {
    return (
        <Card>
            <CardHeader>
                <div>
                    <CardTitle>Manage Admins</CardTitle>
                    <CardDescription>Add new admins and manage their roles.</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <UsersTable />
            </CardContent>
        </Card>
    )
}
