
"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";


export default function PassengersTable() {
  const [passengers, setPassengers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPassengers = async () => {
      setLoading(true);
      try {
        const passengersCollection = collection(db, "passengers");
        const passengersSnapshot = await getDocs(passengersCollection);
        const passengersList = passengersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPassengers(passengersList);
      } catch (error) {
        console.error("Error fetching passengers: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPassengers();
  }, []);

  if (loading) {
    return <div>Loading passengers...</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Emergency Contact</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {passengers.map((passenger) => (
          <TableRow key={passenger.id}>
            <TableCell>{passenger.name}</TableCell>
            <TableCell>{passenger.phone}</TableCell>
            <TableCell>{passenger.emergencyContact}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
