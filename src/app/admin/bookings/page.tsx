import BookingsTable from "@/components/admin/bookings-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function BookingsPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Manage Bookings</CardTitle>
                <CardDescription>View, approve, and manage all passenger bookings.</CardDescription>
            </CardHeader>
            <CardContent>
                <BookingsTable />
            </CardContent>
        </Card>
    )
}
