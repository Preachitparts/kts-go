
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { z } from "zod";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

const paymentSchema = z.object({
  name: z.string(),
  phone: z.string(),
  emergencyContact: z.string(),
  date: z.string().datetime(),
  seats: z.string(),
  pickup: z.string(),
  destination: z.string(),
  busType: z.string(),
  totalAmount: z.number(),
  routeId: z.string(),
  busId: z.string(),
  referralCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
    try {
        const rawBody = await req.json();
        const body = paymentSchema.parse(rawBody);

        let referralId = null;
        if (body.referralCode) {
            const referralsQuery = query(collection(db, "referrals"), where("phone", "==", body.referralCode));
            const referralsSnapshot = await getDocs(referralsQuery);
            if (!referralsSnapshot.empty) {
                referralId = referralsSnapshot.docs[0].id;
            }
        }

        const ticketNumber = `KTS${Date.now().toString().slice(-6)}`;
        const appUrl = process.env.APP_URL;

        if (!appUrl) {
            throw new Error("APP_URL is not set in environment variables.");
        }
        
        const pendingBookingData = {
            ...body,
            referralId: referralId || null,
            ticketNumber,
            status: 'pending' // Add a pending status
        };

        // Save a pending booking document
        const pendingBookingRef = await addDoc(collection(db, "pending_bookings"), pendingBookingData);

        const hubtelPayload = {
            receiveName: "KTS Go",
            description: `Bus ticket from ${body.pickup} to ${body.destination}`,
            customerName: body.name,
            customerMsisdn: body.phone.replace('+233', '233'),
            customerEmail: "",
            amount: body.totalAmount,
            primaryCallbackUrl: `${appUrl}/api/payment-callback?bookingId=${pendingBookingRef.id}`,
            secondaryCallbackUrl: `${appUrl}/api/payment-callback?bookingId=${pendingBookingRef.id}`,
            clientReference: pendingBookingRef.id,
            merchantAccountNumber: process.env.HUBTEL_ACCOUNT_ID
        };

        const hubtelResponse = await axios.post(
            "https://pay.hubtel.com/api/v2/invoice/create",
            hubtelPayload,
            {
                auth: {
                    username: process.env.HUBTEL_CLIENT_ID!,
                    password: process.env.HUBTEL_SECRET_KEY!
                }
            }
        );

        const { status, data } = hubtelResponse.data;

        if (status === 'Success') {
            return NextResponse.json({ success: true, paymentUrl: data.paylinkUrl });
        } else {
            console.error("Hubtel Error:", hubtelResponse.data);
            return NextResponse.json({ success: false, error: 'Failed to create Hubtel invoice.' }, { status: 500 });
        }

    } catch (error: any) {
        console.error("Error initiating payment:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: "Invalid request data.", details: error.errors }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: error.message || 'An internal server error occurred.' }, { status: 500 });
    }
}
