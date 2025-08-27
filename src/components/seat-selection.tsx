
"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

interface SeatSelectionProps {
  capacity: number;
  selectedSeats: string[];
  occupiedSeats: string[];
  pendingSeats?: string[];
  isLoading: boolean;
  onSeatsChange: (seats: string | string[]) => void;
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


const Seat = ({ seatNumber, status, onSelect }: { seatNumber: string; status: 'available' | 'selected' | 'occupied' | 'pending'; onSelect: (seatNumber: string) => void; }) => {
  const isClickable = status !== 'occupied';
  
  const getVariant = () => {
    switch(status) {
        case 'selected': return 'default';
        case 'occupied': return 'destructive';
        case 'pending': return 'secondary';
        default: return 'outline';
    }
  };

  return (
    <Button
      type="button"
      variant={getVariant()}
      size="icon"
      className={cn(
        "h-8 w-8 text-xs font-semibold",
        status === 'occupied' && "cursor-pointer bg-red-300 text-white hover:bg-red-400",
        status === 'pending' && "cursor-pointer bg-yellow-400 text-black hover:bg-yellow-500",
        status === 'selected' && "bg-primary text-primary-foreground"
      )}
      onClick={() => onSelect(seatNumber)}
    >
      {seatNumber}
    </Button>
  );
};

export default function SeatSelection({
  capacity,
  selectedSeats,
  occupiedSeats,
  pendingSeats = [],
  isLoading,
  onSeatsChange,
}: SeatSelectionProps) {
  const handleSeatClick = (seatNumber: string) => {
    if (occupiedSeats.includes(seatNumber) || pendingSeats.includes(seatNumber)) {
        (onSeatsChange as (seat: string) => void)(seatNumber);
        return;
    }

    if (Array.isArray(selectedSeats)) {
        const newSelectedSeats = selectedSeats.includes(seatNumber)
          ? selectedSeats.filter((s) => s !== seatNumber)
          : [...selectedSeats, seatNumber];
        (onSeatsChange as (seats: string[]) => void)(newSelectedSeats);
    }
  };

  const renderSeats = () => {
    if (isLoading) {
      return Array.from({ length: Math.ceil(capacity / 4) }).map((_, rowIndex) => (
        <div key={`skeleton-row-${rowIndex}`} className="flex justify-center gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <div className="w-8"></div>
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
        </div>
      ));
    }

    const seats = [];
    const seatsPerRow = 4;
    const numRows = Math.ceil(capacity / seatsPerRow);

    for (let row = 0; row < numRows; row++) {
      const rowSeats = [];
      for (let seat = 0; seat < seatsPerRow + 1; seat++) {
        if (seat === 2) {
          rowSeats.push(<div key={`aisle-${row}`} className="w-8"></div>);
          continue;
        }

        const seatIndex = row * seatsPerRow + (seat > 2 ? seat - 1 : seat);
        if (seatIndex >= capacity) continue;

        const seatNumber = `${seatIndex + 1}`;
        let seatStatus: 'available' | 'selected' | 'occupied' | 'pending' = 'available';
        if (occupiedSeats.includes(seatNumber)) {
            seatStatus = 'occupied';
        } else if (pendingSeats.includes(seatNumber)) {
            seatStatus = 'pending';
        } else if (Array.isArray(selectedSeats) && selectedSeats.includes(seatNumber)) {
            seatStatus = 'selected';
        }
        
        rowSeats.push(
          <Seat
            key={seatNumber}
            seatNumber={seatNumber}
            status={seatStatus}
            onSelect={handleSeatClick}
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
        <div className="w-full flex justify-start pl-4 mb-4">
           <div className="flex flex-col items-center p-2 rounded-lg bg-gray-200 w-fit">
                <SteeringWheelIcon />
                <span className="text-xs font-medium text-gray-700 mt-1">Driver</span>
           </div>
        </div>
        
        <div className="flex flex-col gap-2 w-full">
            {renderSeats()}
        </div>
        <div className="flex justify-center items-center gap-4 mt-4 text-xs">
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-destructive border"></div> Booked</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-yellow-400 border"></div> Pending</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-primary border"></div> Selected</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-background border"></div> Available</div>
        </div>
      </div>
    </div>
  );
}
