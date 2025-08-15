
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { collection, addDoc, query, where, getDocs, doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const paymentSchema = z.object({
  name: z.string(),
  phone: z.string(),
  emergencyContact: z.string(),
  date: z.string().datetime(),
  seats: z.array(z.string()),
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

        const useLiveKeys = hubtelConfig.liveMode;
        const clientId = useLiveKeys ? hubtelConfig.clientId : hubtelConfig.testClientId;
        const secretKey = useLiveKeys ? hubtelConfig.secretKey : hubtelConfig.testSecretKey;
        const accountId = useLiveKeys ? hubtelConfig.accountId : hubtelConfig.testAccountId;

        if (!clientId || !secretKey || !accountId) {
            return NextResponse.json({ success: false, error: `Hubtel API credentials for ${useLiveKeys ? 'live' : 'test'} mode are not fully configured.` }, { status: 500 });
        }

        const appUrl = process.env.APP_URL || `https://${req.headers.get('host')}`;
        if (!appUrl) {
            console.error("APP_URL is not set in environment variables and could not be inferred.");
             return NextResponse.json({ success: false, error: "Application URL is not configured." }, { status: 500 });
        }

        const rawBody = await req.json();
        const body = paymentSchema.parse(rawBody);

        let referralId = null;
        if (body.referralCode && body.referralCode !== "none") {
            const referralsQuery = query(collection(db, "referrals"), where("phone", "==", body.referralCode));
            const referralsSnapshot = await getDocs(referralsQuery);
            if (!referralsSnapshot.empty) {
                referralId = referralsSnapshot.docs[0].id;
            }
        }

        const ticketNumber = `KTS${Date.now().toString().slice(-6)}`;
        
        const clientReference = `KTSGO-${Date.now()}`;

        const pendingBookingData = {
            ...body,
            referralId: referralId || null,
            ticketNumber,
            status: 'pending',
            clientReference,
            createdAt: Timestamp.now(),
        };

        await addDoc(collection(db, "pending_bookings"), pendingBookingData);

        const hubtelPayload = {
            totalAmount: body.totalAmount,
            description: `KTS Go Bus Ticket: ${body.pickup} to ${body.destination}`,
            callbackUrl: `${appUrl}/api/payment-callback`,
            returnUrl: `${appUrl}/booking-confirmation`,
            cancellationUrl: `${appUrl}/?error=payment_cancelled`,
            merchantAccountNumber: accountId,
            clientReference: clientReference,
        };

        const authString = Buffer.from(`${clientId}:${secretKey}`).toString('base64');
        
        const hubtelResponse = await fetch("https://payproxyapi.hubtel.com/items/initiate", {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authString}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(hubtelPayload),
        });
        
        const responseData = await hubtelResponse.json();

        if (hubtelResponse.ok && responseData.status === 'Success' && responseData.data?.checkoutUrl) {
            return NextResponse.json({ success: true, paymentUrl: responseData.data.checkoutUrl, clientReference });
        } else {
            console.error("Hubtel Error:", responseData);
            const errorMessage = responseData.data?.message || responseData.message || 'Failed to create Hubtel invoice.';
            return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
        }

    } catch (error: any) {
        console.error("Error initiating payment:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: "Invalid request data.", details: error.errors }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: error.message || 'An internal server error occurred.' }, { status: 500 });
    }
}
