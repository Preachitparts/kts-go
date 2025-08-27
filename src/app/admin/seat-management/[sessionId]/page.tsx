
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import SeatMapManager from "@/components/admin/seat-map-manager";
import { adminDb } from "@/lib/firebase-admin";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Suspense } from "react";

async function getSessionDetails(sessionId: string) {
    const sessionRef = adminDb.collection("sessions").doc(sessionId);
    const sessionSnap = await sessionRef.get();

    if (!sessionSnap.exists) {
        return null;
    }

    const sessionData = sessionSnap.data();
    if (!sessionData) return null;
    
    const [routeSnap, busSnap] = await Promise.all([
        adminDb.collection("routes").doc(sessionData.routeId).get(),
        adminDb.collection("buses").doc(sessionData.busId).get()
    ]);

    return {
        id: sessionSnap.id,
        ...sessionData,
        route: routeSnap.exists ? routeSnap.data() : { pickup: 'Unknown', destination: 'Route' },
        bus: busSnap.exists ? busSnap.data() : { numberPlate: 'Unknown Bus', capacity: 0 }
    }
}


export default async function SeatMapPage({ params }: { params: { sessionId: string } }) {
    
    const sessionDetails = await getSessionDetails(params.sessionId);
    
    if (!sessionDetails) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Session Not Found</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>The requested session could not be found. It may have been deleted.</p>
                     <Button asChild variant="outline" className="mt-4">
                        <Link href="/admin/seat-management">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Seat Management
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        )
    }

    const departureDate = sessionDetails.departureDate.toDate();
    const formattedDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }).format(departureDate);

    return (
        <div className="space-y-4">
             <Button asChild variant="outline" size="sm">
                <Link href="/admin/seat-management">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to All Sessions
                </Link>
            </Button>
            <Card>
                <CardHeader>
                    <CardTitle>Seat Map: {sessionDetails.route.pickup} to {sessionDetails.route.destination}</CardTitle>
                    <CardDescription>
                       Managing seats for bus <span className="font-semibold">{sessionDetails.bus.numberPlate}</span> departing on <span className="font-semibold">{formattedDate}</span>.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Suspense fallback={<div>Loading seat map...</div>}>
                        <SeatMapManager 
                            busId={sessionDetails.busId} 
                            busCapacity={sessionDetails.bus.capacity}
                            departureDate={departureDate} 
                        />
                    </Suspense>
                </CardContent>
            </Card>
        </div>
    )
}
