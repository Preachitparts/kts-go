
import RegionsTable from "@/components/admin/regions-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegionsPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Manage Regions</CardTitle>
                <CardDescription>Add, edit, and manage your operational regions.</CardDescription>
            </CardHeader>
            <CardContent>
                <RegionsTable />
            </CardContent>
        </Card>
    )
}
