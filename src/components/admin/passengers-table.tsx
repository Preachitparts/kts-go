import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const passengers = [
  { id: "PS001", name: "Alice Johnson", phone: "0244123456", emergencyContact: "0209876543", totalBookings: 5 },
  { id: "PS002", name: "Bob Williams", phone: "0266123457", emergencyContact: "0277876542", totalBookings: 3 },
  { id: "PS003", name: "Charlie Brown", phone: "0501123458", emergencyContact: "0544876541", totalBookings: 8 },
  { id: "PS004", name: "Diana Miller", phone: "0556123459", emergencyContact: "0266876540", totalBookings: 2 },
  { id: "PS005", name: "Ethan Davis", phone: "0243123450", emergencyContact: "0501876539", totalBookings: 12 },
];

export default function PassengersTable() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Emergency Contact</TableHead>
          <TableHead>Total Bookings</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {passengers.map((passenger) => (
          <TableRow key={passenger.id}>
            <TableCell>{passenger.id}</TableCell>
            <TableCell>{passenger.name}</TableCell>
            <TableCell>{passenger.phone}</TableCell>
            <TableCell>{passenger.emergencyContact}</TableCell>
            <TableCell>{passenger.totalBookings}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
