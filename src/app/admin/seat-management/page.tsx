
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SessionsWithBookingsTable } from "@/components/admin/sessions-with-bookings-table";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default function SeatManagementPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Seat Management</CardTitle>
                <CardDescription>
                    View all upcoming or recent journeys that have bookings. Select a journey to view its seat map and manage individual seats.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <Suspense fallback={
                    <div className="flex items-center justify-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="ml-4 text-lg">Loading Sessions...</span>
                    </div>
                }>
                    <SessionsWithBookingsTable />
                </Suspense>
            </CardContent>
        </Card>
    )
}
