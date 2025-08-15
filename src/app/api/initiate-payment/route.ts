
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { z } from "zod";
import { collection, addDoc, query, where, getDocs, doc, getDoc } from "firebase/firestore";
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

async function getHubtelConfig() {
    const configDoc = await getDoc(doc(db, "settings", "hubtel"));
    if (!configDoc.exists()) {
        throw new Error("Hubtel settings are not configured in the admin panel.");
    }
    return configDoc.data();
}

export async function POST(req: NextRequest) {
    try {
        const hubtelConfig = await getHubtelConfig();
        const { clientId, secretKey, accountId } = hubtelConfig;

        if (!clientId || !secretKey || !accountId) {
            throw new Error("Hubtel API credentials are not fully configured.");
        }

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
            console.error("APP_URL is not set in environment variables.");
            throw new Error("Application URL is not configured.");
        }
        
        const pendingBookingData = {
            ...body,
            referralId: referralId || null,
            ticketNumber,
            status: 'pending'
        };

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
            merchantAccountNumber: accountId
        };

        const hubtelResponse = await axios.post(
            "https://pay.hubtel.com/api/v2/invoice/create",
            hubtelPayload,
            {
                auth: {
                    username: clientId,
                    password: secretKey
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
        console.error("Error initiating payment:", error.message);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: "Invalid request data.", details: error.errors }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: error.message || 'An internal server error occurred.' }, { status: 500 });
    }
}
