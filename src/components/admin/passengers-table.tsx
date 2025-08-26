
"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "../ui/button";
import { Download } from "lucide-react";
import { useDataFetching } from "@/hooks/useDataFetching";

type Passenger = {
    id: string;
    name: string;
    phone: string;
    emergencyContact: string;
};

export default function PassengersTable() {
  const { data: passengers, loading, error } = useDataFetching<Passenger>(collection(db, "passengers"));

  const downloadCSV = () => {
    const headers = ["Name", "Phone", "Emergency Contact"];
    const csvContent = [
      headers.join(","),
      ...passengers.map(p => 
        [
          `"${p.name}"`,
          `"${p.phone}"`,
          `"${p.emergencyContact}"`
        ].join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "passengers.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };


  if (loading) {
    return <div>Loading passengers...</div>;
  }
  
  if (error) {
    return <div className="text-destructive">Error: {error}</div>;
  }

  return (
    <>
        <div className="flex justify-end mb-4">
            <Button variant="outline" onClick={downloadCSV}>
                <Download className="mr-2 h-4 w-4" /> Download CSV
            </Button>
        </div>
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
    </>
  );
}
