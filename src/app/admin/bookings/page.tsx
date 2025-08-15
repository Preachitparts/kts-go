import ApprovedBookingsTab from "@/components/admin/approved-bookings-tab";
import PaidBookingsTab from "@/components/admin/paid-bookings-tab";
import PendingBookingsTab from "@/components/admin/pending-bookings-tab";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function BookingsPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Manage Bookings</CardTitle>
                <CardDescription>View, approve, and manage all passenger bookings.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="pending">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="pending">Pending</TabsTrigger>
                        <TabsTrigger value="approved">Approved</TabsTrigger>
                        <TabsTrigger value="paid">Paid</TabsTrigger>
                    </TabsList>
                    <TabsContent value="pending" className="mt-4">
                        <PendingBookingsTab />
                    </TabsContent>
                    <TabsContent value="approved" className="mt-4">
                        <ApprovedBookingsTab />
                    </TabsContent>
                    <TabsContent value="paid" className="mt-4">
                        <PaidBookingsTab />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}
