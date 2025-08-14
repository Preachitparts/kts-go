
"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

interface SeatSelectionProps {
  busType: string;
  capacity: number;
  selectedSeats: string[];
  onSeatsChange: (seats: string[]) => void;
}

const SteeringWheelIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 15.5V22" />
        <path d="M12 2L12 8.5" />
        <path d="M5.49994 18.5L9.49994 14.5" />
        <path d="M18.5 5.5L14.5 9.5" />
        <path d="M18.5 18.5L14.5 14.5" />
        <path d="M5.49994 5.5L9.49994 9.5" />
    </svg>
);


const Seat = ({ seatNumber, isSelected, onSelect, isOccupied }: { seatNumber: string; isSelected: boolean; onSelect: (seatNumber: string) => void; isOccupied?: boolean }) => {
  return (
    <Button
      variant={isSelected ? "default" : isOccupied ? "destructive" : "outline"}
      size="icon"
      className={cn(
        "h-8 w-8 text-xs font-semibold",
        isOccupied && "cursor-not-allowed bg-red-300 text-white",
        isSelected && "bg-primary text-primary-foreground"
      )}
      onClick={() => !isOccupied && onSelect(seatNumber)}
      disabled={isOccupied}
    >
      {seatNumber}
    </Button>
  );
};

export default function SeatSelection({
  capacity,
  selectedSeats,
  onSeatsChange,
}: SeatSelectionProps) {
  const toggleSeat = (seatNumber: string) => {
    const newSelectedSeats = selectedSeats.includes(seatNumber)
      ? selectedSeats.filter((s) => s !== seatNumber)
      : [...selectedSeats, seatNumber];
    onSeatsChange(newSelectedSeats);
  };

  const renderSeats = () => {
    const seats = [];
    const rows = Math.ceil(capacity / 4);
    for (let i = 1; i <= capacity; i++) {
        const seatNumber = `${i}`;
        seats.push(
            <Seat
                key={seatNumber}
                seatNumber={seatNumber}
                isSelected={selectedSeats.includes(seatNumber)}
                onSelect={toggleSeat}
                isOccupied={false} // Add logic for occupied seats if available
            />
        );
    }
    return seats;
  };
  
  return (
    <div className="border rounded-lg p-4 bg-muted/20">
      <div className="flex flex-col items-center gap-4">
        {/* Driver's seat */}
        <div className="w-full flex justify-start pl-4 mb-4">
           <div className="flex flex-col items-center p-2 rounded-lg bg-gray-200">
                <SteeringWheelIcon />
                <span className="text-xs font-medium text-gray-700 mt-1">Driver</span>
           </div>
        </div>
        
        {/* Seats layout */}
        <div className="grid grid-cols-5 gap-2 w-full justify-items-center">
            {Array.from({ length: capacity }, (_, i) => {
                const seatNumber = `${i + 1}`;
                const rowItem = i % 4;
                const isAisle = rowItem === 2;
                if (isAisle) {
                    return <div key={`aisle-${i}`} className="col-span-1"></div>
                }

                return (
                    <Seat
                        key={seatNumber}
                        seatNumber={seatNumber}
                        isSelected={selectedSeats.includes(seatNumber)}
                        onSelect={toggleSeat}
                        isOccupied={false} // Add logic for occupied seats
                    />
                );
            })}
        </div>
      </div>
    </div>
  );
}
