import RoutesTable from "@/components/admin/routes-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RoutesPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Manage Routes & Fares</CardTitle>
                <CardDescription>Add, edit, and manage bus routes and their prices.</CardDescription>
            </CardHeader>
            <CardContent>
                <RoutesTable />
            </CardContent>
        </Card>
    )
}
