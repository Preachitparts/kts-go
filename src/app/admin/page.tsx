
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, Users, Bus, Ticket, Loader2, Map, Globe, PlusCircle, CalendarClock, History } from "lucide-react";
import OverviewChart from "@/components/admin/overview-chart";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

type ChartData = {
  name: string;
  total: number;
}[];

type RecentActivity = {
  id: string;
  name: string;
  action: string;
  details: string;
  timestamp: Date;
};

type DashboardData = {
  totalRevenue: number;
  totalPassengers: number;
  totalBookings: number;
  activeBuses: number;
  totalRoutes: number;
  totalRegions: number;
  chartData: ChartData;
  recentActivities: RecentActivity[];
};

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function getDashboardData() {
      try {
        const bookingsCollection = collection(db, "bookings");
        const pendingBookingsCollection = collection(db, "pending_bookings");
        const passengersCollection = collection(db, "passengers");
        const busesCollection = collection(db, "buses");
        const routesCollection = collection(db, "routes");
        const regionsCollection = collection(db, "regions");

        const [bookingsSnapshot, pendingBookingsSnapshot, passengersSnapshot, busesSnapshot, routesSnapshot, regionsSnapshot] = await Promise.all([
          getDocs(bookingsCollection),
          getDocs(pendingBookingsCollection),
          getDocs(passengersCollection),
          getDocs(busesCollection),
          getDocs(routesCollection),
          getDocs(regionsCollection)
        ]);

        const paidBookings = bookingsSnapshot.docs.map(doc => doc.data());
        const totalRevenue = paidBookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);
        const totalPassengers = passengersSnapshot.size;
        const totalBookings = bookingsSnapshot.size + pendingBookingsSnapshot.size;
        const totalRoutes = routesSnapshot.size;
        const totalRegions = regionsSnapshot.size;

        const activeBusesQuery = query(busesCollection, where("status", "==", true));
        const activeBusesSnapshot = await getDocs(activeBusesQuery);
        const activeBuses = activeBusesSnapshot.size;

        const monthlyRevenue: { [key: string]: number } = {};
        paidBookings.forEach(booking => {
            if (booking.date) {
                const bookingDate = typeof booking.date === 'string' ? new Date(booking.date) : booking.date.toDate();
                const month = format(bookingDate, "MMM");
                monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (booking.totalAmount || 0);
            }
        });

        const chartData = [
          "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ].map(monthName => ({
            name: monthName,
            total: monthlyRevenue[monthName] || 0
        }));

        const recentBookingsQuery = query(collection(db, "bookings"), orderBy("createdAt", "desc"), limit(5));
        const recentBookingsSnapshot = await getDocs(recentBookingsQuery);
        const recentActivities = recentBookingsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
                action: "New Booking",
                details: `${data.pickup} to ${data.destination}`,
                timestamp: data.createdAt.toDate(),
            };
        });

        setData({
          totalRevenue,
          totalPassengers,
          totalBookings,
          activeBuses,
          totalRoutes,
          totalRegions,
          chartData,
          recentActivities
        });
      } catch (error: any) {
        console.error("Error fetching dashboard data:", error);
        setError("Failed to load dashboard data. Please check your Firestore security rules and ensure you are logged in.");
      } finally {
        setLoading(false);
      }
    }

    getDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-4 text-lg">Loading Dashboard...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-destructive">Error</CardTitle>
            </CardHeader>
            <CardContent>
                <p>{error || "An unknown error occurred."}</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">GH₵ {data.totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Passengers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{data.totalPassengers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bookings</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{data.totalBookings}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Buses</CardTitle>
            <Bus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activeBuses}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Routes</CardTitle>
            <Map className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalRoutes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Regions</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalRegions}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Financial Analytics</CardTitle>
            <CardDescription>Monthly revenue from paid bookings.</CardDescription>
          </CardHeader>
          <CardContent>
            <OverviewChart data={data.chartData} />
          </CardContent>
        </Card>
        
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <Button asChild variant="outline">
                        <Link href="/admin/buses"><PlusCircle /> Add Bus</Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link href="/admin/routes"><PlusCircle /> Add Route</Link>
                    </Button>
                     <Button asChild variant="outline" className="col-span-2">
                        <Link href="/admin/sessions"><CalendarClock /> Create Session</Link>
                    </Button>
                    <Button asChild className="col-span-2">
                        <Link href="/admin/bookings"><Ticket /> Manage Bookings</Link>
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>The last 5 paid bookings.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {data.recentActivities.length > 0 ? data.recentActivities.map(activity => (
                            <div key={activity.id} className="flex items-center gap-4">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={`https://api.dicebear.com/8.x/lorelei/svg?seed=${activity.name}`} alt="Avatar" />
                                    <AvatarFallback>{activity.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="grid gap-1">
                                    <p className="text-sm font-medium leading-none">{activity.name}</p>
                                    <p className="text-sm text-muted-foreground">{activity.details}</p>
                                </div>
                                <div className="ml-auto text-sm text-muted-foreground">
                                    {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                                </div>
                            </div>
                        )) : (
                          <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-4">
                            <History className="h-8 w-8 mb-2" />
                            <p>No recent bookings found.</p>
                          </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
