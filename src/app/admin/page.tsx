
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, Bus, Ticket, Loader2 } from "lucide-react";
import OverviewChart from "@/components/admin/overview-chart";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format } from "date-fns";

type ChartData = {
  name: string;
  total: number;
}[];

type DashboardData = {
  totalRevenue: number;
  totalPassengers: number;
  totalBookings: number;
  activeBuses: number;
  chartData: ChartData;
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

        const [bookingsSnapshot, pendingBookingsSnapshot, passengersSnapshot, busesSnapshot] = await Promise.all([
          getDocs(bookingsCollection),
          getDocs(pendingBookingsCollection),
          getDocs(passengersCollection),
          getDocs(busesCollection)
        ]);

        const paidBookings = bookingsSnapshot.docs.map(doc => doc.data());

        const totalRevenue = paidBookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);
        const totalPassengers = passengersSnapshot.size;
        const totalBookings = bookingsSnapshot.size + pendingBookingsSnapshot.size;

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
          { name: "Jan", total: 0 },
          { name: "Feb", total: 0 },
          { name: "Mar", total: 0 },
          { name: "Apr", total: 0 },
          { name: "May", total: 0 },
          { name: "Jun", total: 0 },
          { name: "Jul", total: 0 },
          { name: "Aug", total: 0 },
          { name: "Sep", total: 0 },
          { name: "Oct", total: 0 },
          { name: "Nov", total: 0 },
          { name: "Dec", total: 0 },
        ].map(item => ({
            ...item,
            total: monthlyRevenue[item.name] || 0
        }));

        setData({
          totalRevenue,
          totalPassengers,
          totalBookings,
          activeBuses,
          chartData
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">GH₵ {data.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              From completed bookings
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Passengers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{data.totalPassengers}</div>
            <p className="text-xs text-muted-foreground">
              Total registered passengers
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bookings</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{data.totalBookings}</div>
            <p className="text-xs text-muted-foreground">
              Including pending and paid
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Buses</CardTitle>
            <Bus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activeBuses}</div>
            <p className="text-xs text-muted-foreground">Currently in service</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Financial Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <OverviewChart data={data.chartData} />
        </CardContent>
      </Card>
    </div>
  );
}
