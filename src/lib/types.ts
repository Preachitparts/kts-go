
export type BookingDetails = {
  name: string;
  phone: string;
  email?: string | null;
  pickup: string;
  destination: string;
  date: Date;
  seats: string[] | string;
  busType: string;
  emergencyContact: string;
  totalAmount: number;
  ticketNumber: string;
  clientReference: string;
};

    