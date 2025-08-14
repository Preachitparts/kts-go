
import SessionsTable from "@/components/admin/sessions-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SessionsPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Manage Journey Sessions</CardTitle>
                <CardDescription>Create and manage specific journeys by assigning a route, bus, and departure date.</CardDescription>
            </CardHeader>
            <CardContent>
                <SessionsTable />
            </CardContent>
        </Card>
    )
}
