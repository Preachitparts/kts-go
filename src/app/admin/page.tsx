
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, Bus, Ticket } from "lucide-react";
import OverviewChart from "@/components/admin/overview-chart";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format } from "date-fns";

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
            // Ensure date is a string before creating a Date object from it
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

    return {
      totalRevenue,
      totalPassengers,
      totalBookings,
      activeBuses,
      chartData
    };
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    // Return default values in case of an error
    return {
      totalRevenue: 0,
      totalPassengers: 0,
      totalBookings: 0,
      activeBuses: 0,
      chartData: Array(12).fill({ name: '', total: 0 })
    };
  }
}


export default async function AdminDashboard() {
  const { totalRevenue, totalPassengers, totalBookings, activeBuses, chartData } = await getDashboardData();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">GH₵ {totalRevenue.toFixed(2)}</div>
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
            <div className="text-2xl font-bold">+{totalPassengers}</div>
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
            <div className="text-2xl font-bold">+{totalBookings}</div>
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
            <div className="text-2xl font-bold">{activeBuses}</div>
            <p className="text-xs text-muted-foreground">Currently in service</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Financial Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <OverviewChart data={chartData} />
        </CardContent>
      </Card>
    </div>
  );
}
