import PassengersTable from "@/components/admin/passengers-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PassengersPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Manage Passengers</CardTitle>
                <CardDescription>View and manage all registered passengers.</CardDescription>
            </CardHeader>
            <CardContent>
                <PassengersTable />
            </CardContent>
        </Card>
    )
}
