
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Referral = { id: string; name: string; phone: string; };
type Booking = { id: string; name: string; referralId: string; };
type ReferralStat = {
  referralId: string;
  name: string;
  phone: string;
  count: number;
};

export default function ReferralAnalyticsTab() {
  const [referralStats, setReferralStats] = useState<ReferralStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReferral, setSelectedReferral] = useState<ReferralStat | null>(null);
  const [referredPassengers, setReferredPassengers] = useState<string[]>([]);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const referralsSnapshot = await getDocs(collection(db, "referrals"));
        const referrals = referralsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Referral));
        
        const bookingsSnapshot = await getDocs(query(collection(db, "bookings"), where("referralId", "!=", null)));
        const bookings = bookingsSnapshot.docs.map(doc => doc.data());

        const stats: Record<string, ReferralStat> = {};

        referrals.forEach(ref => {
            stats[ref.id] = { referralId: ref.id, name: ref.name, phone: ref.phone, count: 0 };
        });

        bookings.forEach(booking => {
          if (booking.referralId && stats[booking.referralId]) {
            stats[booking.referralId].count++;
          }
        });
        
        setReferralStats(Object.values(stats));
      } catch (error) {
        console.error("Error fetching referral analytics: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const filteredStats = useMemo(() => {
    return referralStats.filter(stat =>
      stat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stat.phone.includes(searchTerm)
    ).sort((a, b) => b.count - a.count); // Sort by count descending
  }, [referralStats, searchTerm]);

  const handleRowClick = async (referral: ReferralStat) => {
      if (referral.count === 0) return;
      setSelectedReferral(referral);
      try {
          const q = query(collection(db, "bookings"), where("referralId", "==", referral.referralId));
          const querySnapshot = await getDocs(q);
          const passengers = querySnapshot.docs.map(doc => doc.data().name);
          setReferredPassengers(passengers);
          setIsDetailsOpen(true);
      } catch (error) {
          console.error("Error fetching referred passengers:", error);
      }
  };

  const downloadCSV = () => {
    if (!selectedReferral || referredPassengers.length === 0) return;
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Passenger Name\n" 
      + referredPassengers.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `referred_passengers_for_${selectedReferral.name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <div>Loading analytics...</div>;
  }

  return (
    <>
      <div className="flex justify-start mb-4">
        <div className="relative w-full max-w-sm">
          <Input 
            placeholder="Filter by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Referral Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Passengers Referred</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredStats.map((stat) => (
            <TableRow key={stat.referralId} onClick={() => handleRowClick(stat)} className={stat.count > 0 ? "cursor-pointer hover:bg-muted/50" : ""}>
              <TableCell>{stat.name}</TableCell>
              <TableCell>{stat.phone}</TableCell>
              <TableCell>{stat.count}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Referred Passengers by {selectedReferral?.name}</DialogTitle>
            <DialogDescription>
              List of all passengers brought on board by this referral partner.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto">
            <ul className="space-y-2">
              {referredPassengers.map((name, index) => (
                <li key={index} className="border-b pb-1">{name}</li>
              ))}
            </ul>
          </div>
          <Button onClick={downloadCSV}>
            <Download className="mr-2 h-4 w-4" /> Download as CSV
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
