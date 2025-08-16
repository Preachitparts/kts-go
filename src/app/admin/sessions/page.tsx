
import SessionsTable from "@/components/admin/sessions-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SessionsPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Manage Sessions</CardTitle>
                <CardDescription>Create, view, and manage all scheduled journeys.</CardDescription>
            </CardHeader>
            <CardContent>
                <SessionsTable />
            </CardContent>
        </Card>
    )
}
