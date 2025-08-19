
// /app/api/initiate-payment/route.ts
import { NextResponse } from "next/server";

// Using temporary hardcoded credentials on the server-side as a placeholder.
// In a real production app, these should come from secure environment variables
// and the settings should be fetched securely on the server using the Admin SDK.
const HUBTEL_CLIENT_ID = "vDz5mM0";
const HUBTEL_SECRET_KEY = "d911cb1a8d7c46a1bae83f3ba803c787";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { totalAmount, description, clientReference, phone, accountId } = body;

    if (!totalAmount || !description || !clientReference || !phone || !accountId) {
      return NextResponse.json(
        { success: false, error: "Missing required payment fields" },
        { status: 400 }
      );
    }

    if (!HUBTEL_CLIENT_ID || !HUBTEL_SECRET_KEY) {
        return NextResponse.json(
            { success: false, error: "Hubtel API keys are not configured on the server." },
            { status: 500 }
        );
    }

    // Call Hubtel Payment API
    const hubtelRes = await fetch("https://payproxyapi.hubtel.com/items/initiate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Basic " +
          Buffer.from(
            HUBTEL_CLIENT_ID + ":" + HUBTEL_SECRET_KEY
          ).toString("base64"),
      },
      body: JSON.stringify({
        totalAmount: totalAmount,
        description: description,
        callbackUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/payment-callback`,
        returnUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/booking-confirmation?ref=${clientReference}`,
        cancellationUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/?error=payment_failed`,
        merchantAccountNumber: accountId,
        clientReference: clientReference,
        customerMsisdn: phone,
      }),
    });

    const hubtelData = await hubtelRes.json();

    if (!hubtelRes.ok || hubtelData.status !== "Success") {
      console.error("Hubtel Error:", hubtelData);
      return NextResponse.json(
        { success: false, error: "Hubtel payment initiation failed", details: hubtelData.message || hubtelData },
        { status: 500 }
      );
    }

    // Return payment link to frontend
    return NextResponse.json({
      success: true,
      paymentUrl: hubtelData.data.checkoutUrl,
    });
  } catch (err: any) {
    console.error("Payment initiation error:", err);
    return NextResponse.json(
      { success: false, error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
}
