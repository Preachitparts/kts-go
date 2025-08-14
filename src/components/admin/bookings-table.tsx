import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const bookings = [
  { id: "BK001", passenger: "Alice Johnson", route: "Accra - Kumasi", date: "2024-08-15", seats: 2, amount: 150, status: "Paid" },
  { id: "BK002", passenger: "Bob Williams", route: "Takoradi - Accra", date: "2024-08-16", seats: 1, amount: 75, status: "Paid" },
  { id: "BK003", passenger: "Charlie Brown", route: "Kumasi - Cape Coast", date: "2024-08-17", seats: 3, amount: 225, status: "Pending" },
  { id: "BK004", passenger: "Diana Miller", route: "Sunyani - Accra", date: "2024-08-18", seats: 1, amount: 75, status: "Paid" },
  { id: "BK005", passenger: "Ethan Davis", route: "Accra - Takoradi", date: "2024-08-19", seats: 4, amount: 300, status: "Paid" },
];

export default function BookingsTable() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Passenger</TableHead>
          <TableHead>Route</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Seats</TableHead>
          <TableHead>Amount (GH₵)</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bookings.map((booking) => (
          <TableRow key={booking.id}>
            <TableCell>{booking.id}</TableCell>
            <TableCell>{booking.passenger}</TableCell>
            <TableCell>{booking.route}</TableCell>
            <TableCell>{booking.date}</TableCell>
            <TableCell>{booking.seats}</TableCell>
            <TableCell>{booking.amount.toFixed(2)}</TableCell>
            <TableCell>
                <Badge variant={booking.status === 'Paid' ? 'default' : 'secondary'} className={booking.status === 'Paid' ? 'bg-green-500' : 'bg-yellow-500'}>
                    {booking.status}
                </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
