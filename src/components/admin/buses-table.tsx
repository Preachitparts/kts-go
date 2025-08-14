import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const buses = [
  { id: "BS001", numberPlate: "GT 1234-23", capacity: 45, status: "Active" },
  { id: "BS002", numberPlate: "AS 5678-22", capacity: 45, status: "Active" },
  { id: "BS003", numberPlate: "WR 9101-21", capacity: 45, status: "Maintenance" },
  { id: "BS004", numberPlate: "CR 1121-24", capacity: 45, status: "Active" },
  { id: "BS005", numberPlate: "BA 3141-20", capacity: 45, status: "Inactive" },
];

export default function BusesTable() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Number Plate</TableHead>
          <TableHead>Capacity</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {buses.map((bus) => (
          <TableRow key={bus.id}>
            <TableCell>{bus.id}</TableCell>
            <TableCell>{bus.numberPlate}</TableCell>
            <TableCell>{bus.capacity}</TableCell>
             <TableCell>
                <Badge variant={
                    bus.status === 'Active' ? 'default' : bus.status === 'Maintenance' ? 'destructive' : 'secondary'
                } className={
                    bus.status === 'Active' ? 'bg-green-500' : bus.status === 'Maintenance' ? 'bg-orange-500' : ''
                }>
                    {bus.status}
                </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
