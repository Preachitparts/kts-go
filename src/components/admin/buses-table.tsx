"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function BusesTable() {
    const [buses, setBuses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBuses = async () => {
            try {
                const busesCollection = collection(db, "buses");
                const busesSnapshot = await getDocs(busesCollection);
                const busesList = busesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setBuses(busesList);
            } catch (error) {
                console.error("Error fetching buses: ", error);
            } finally {
                setLoading(false);
            }
        };

        fetchBuses();
    }, []);

    if (loading) {
        return <div>Loading buses...</div>;
    }

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
