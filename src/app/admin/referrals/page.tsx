
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ManageReferralsTab from "@/components/admin/manage-referrals-tab";
import ReferralAnalyticsTab from "@/components/admin/referral-analytics-tab";

export default function ReferralsPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Manage Referrals</CardTitle>
                <CardDescription>
                    Oversee your referral program, track performance, and manage your network of referrers.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="manage" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="manage">Manage Referrals</TabsTrigger>
                        <TabsTrigger value="analytics">Referral Analytics</TabsTrigger>
                    </TabsList>
                    <TabsContent value="manage" className="mt-4">
                        <ManageReferralsTab />
                    </TabsContent>
                    <TabsContent value="analytics" className="mt-4">
                        <ReferralAnalyticsTab />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}
