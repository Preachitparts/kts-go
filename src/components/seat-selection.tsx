
"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

interface SeatSelectionProps {
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
    // Using a 2-2 layout with an aisle
    const seatsPerRow = 4;
    const numRows = Math.ceil(capacity / seatsPerRow);

    for (let row = 0; row < numRows; row++) {
      const rowSeats = [];
      for (let seat = 0; seat < seatsPerRow + 1; seat++) { // +1 for aisle
        if (seat === 2) { // Aisle position
          rowSeats.push(<div key={`aisle-${row}`} className="w-8"></div>);
          continue;
        }

        const seatIndex = row * seatsPerRow + (seat > 2 ? seat - 1 : seat);
        if (seatIndex >= capacity) continue;

        const seatNumber = `${seatIndex + 1}`;
        rowSeats.push(
          <Seat
            key={seatNumber}
            seatNumber={seatNumber}
            isSelected={selectedSeats.includes(seatNumber)}
            onSelect={toggleSeat}
            isOccupied={false} // Add logic for occupied seats if available
          />
        );
      }
      seats.push(
        <div key={`row-${row}`} className="flex justify-center gap-2">
          {rowSeats}
        </div>
      );
    }
    return seats;
  };
  
  return (
    <div className="border rounded-lg p-4 bg-muted/20">
      <div className="flex flex-col items-center gap-4">
        {/* Driver's seat */}
        <div className="w-full flex justify-start pl-4 mb-4">
           <div className="flex flex-col items-center p-2 rounded-lg bg-gray-200 w-fit">
                <SteeringWheelIcon />
                <span className="text-xs font-medium text-gray-700 mt-1">Driver</span>
           </div>
        </div>
        
        {/* Seats layout */}
        <div className="flex flex-col gap-2 w-full">
            {renderSeats()}
        </div>
      </div>
    </div>
  );
}
