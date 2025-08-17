import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import BookedSeatsManager from "@/components/admin/booked-seats-manager";

export default function BookedSeatsPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Manage Booked Seats</CardTitle>
                <CardDescription>View booked seats for a specific journey and free them up if needed.</CardDescription>
            </CardHeader>
            <CardContent>
                <BookedSeatsManager />
            </CardContent>
        </Card>
    )
}
