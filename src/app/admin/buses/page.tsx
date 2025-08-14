import BusesTable from "@/components/admin/buses-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function BusesPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Manage Buses</CardTitle>
                <CardDescription>Add, edit, and manage your fleet of buses.</CardDescription>
            </CardHeader>
            <CardContent>
                <BusesTable />
            </CardContent>
        </Card>
    )
}
