import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import BookedSeatsManager from "@/components/admin/booked-seats-manager";

export default function BookedSeatsPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Seat Management</CardTitle>
                <CardDescription>View a real-time seat map for any journey, check seat status, and manually free up seats if needed.</CardDescription>
            </CardHeader>
            <CardContent>
                <BookedSeatsManager />
            </CardContent>
        </Card>
    )
}
