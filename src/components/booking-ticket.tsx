
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bus, User, Phone, MapPin, Calendar, Users, Shield, Download, Armchair } from "lucide-react";
import { format } from 'date-fns';
import type { BookingDetails } from "@/lib/types";

export default function BookingTicket({ bookingDetails }: { bookingDetails: BookingDetails }) {

    const handlePrint = () => {
        window.print();
    };
    
    const seatsArray = Array.isArray(bookingDetails.seats) ? bookingDetails.seats : (bookingDetails.seats || "").split(',');
    const numberOfSeats = seatsArray.length;
    const seatNumbers = seatsArray.join(', ');

    return (
        <Card className="w-full max-w-2xl mx-auto shadow-lg printable-area">
            <CardHeader className="bg-primary text-primary-foreground p-6 rounded-t-lg">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-3xl">KTS Go Ticket</CardTitle>
                        <CardDescription className="text-primary-foreground/80">Your journey is confirmed</CardDescription>
                    </div>
                    <Bus className="size-10" />
                </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                <div className="text-center">
                    <p className="text-sm text-muted-foreground">Ticket Number</p>
                    <p className="text-2xl font-mono font-bold">{bookingDetails.ticketNumber}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <User className="size-5 mt-1 text-primary" />
                            <div>
                                <p className="font-semibold">Passenger</p>
                                <p className="text-muted-foreground">{bookingDetails.name}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Phone className="size-5 mt-1 text-primary" />
                            <div>
                                <p className="font-semibold">Phone</p>
                                <p className="text-muted-foreground">{bookingDetails.phone}</p>
                            </div>
                        </div>
                         <div className="flex items-start gap-3">
                            <Shield className="size-5 mt-1 text-primary" />
                            <div>
                                <p className="font-semibold">Emergency Contact</p>
                                <p className="text-muted-foreground">{bookingDetails.emergencyContact}</p>
                            </div>
                        </div>
                         <div className="flex items-start gap-3">
                            <Bus className="size-5 mt-1 text-primary" />
                            <div>
                                <p className="font-semibold">Bus Type</p>
                                <p className="text-muted-foreground">{bookingDetails.busType}</p>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <Calendar className="size-5 mt-1 text-primary" />
                            <div>
                                <p className="font-semibold">Departure Date</p>
                                <p className="text-muted-foreground">{format(new Date(bookingDetails.date), 'PPP')}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Users className="size-5 mt-1 text-primary" />
                            <div>
                                <p className="font-semibold">Number of Seats</p>
                                <p className="text-muted-foreground">{numberOfSeats}</p>
                            </div>
                        </div>
                         <div className="flex items-start gap-3">
                            <Armchair className="size-5 mt-1 text-primary" />
                            <div>
                                <p className="font-semibold">Seat Numbers</p>
                                <p className="text-muted-foreground">{seatNumbers}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4 text-center">
                    <div className="w-full">
                        <p className="font-semibold text-primary">From</p>
                        <p className="text-lg">{bookingDetails.pickup}</p>
                    </div>
                    <MapPin className="size-6 text-muted-foreground shrink-0" />
                    <div className="w-full">
                        <p className="font-semibold text-primary">To</p>
                        <p className="text-lg">{bookingDetails.destination}</p>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="bg-secondary p-6 rounded-b-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                    <p className="text-sm text-muted-foreground">Total Paid</p>
                    <p className="text-2xl font-bold">GH₵ {bookingDetails.totalAmount.toFixed(2)}</p>
                </div>
                <Button onClick={handlePrint} className="w-full sm:w-auto">
                    <Download className="mr-2 size-4" />
                    Download Ticket
                </Button>
            </CardFooter>
            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .printable-area, .printable-area * {
                        visibility: visible;
                    }
                    .printable-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    button {
                        display: none !important;
                    }
                }
            `}</style>
        </Card>
    );
}
