import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { config } from 'dotenv';

// Load environment variables from .env file
config();

async function getHubtelSettings() {
    const settingsDoc = await adminDb.collection("settings").doc("hubtel").get();
    if (!settingsDoc.exists) {
        throw new Error("Hubtel settings not found in Firestore.");
    }
    return settingsDoc.data();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { totalAmount, description, clientReference, phone } = body;

    if (!totalAmount || !description || !clientReference || !phone) {
      return NextResponse.json(
        { success: false, error: "Missing required payment fields" },
        { status: 400 }
      );
    }

    const settings = await getHubtelSettings();
    if (!settings) {
         return NextResponse.json(
            { success: false, error: "Hubtel settings could not be loaded from the server." },
            { status: 500 }
        );
    }

    const clientId = settings.liveMode ? settings.clientId : settings.testClientId;
    const secretKey = settings.liveMode ? settings.secretKey : settings.testSecretKey;
    const accountNumber = settings.liveMode ? settings.accountId : settings.testAccountId;

    if (!clientId || !secretKey || !accountNumber) {
        return NextResponse.json(
            { success: false, error: "Hubtel API keys are not configured correctly in the admin settings." },
            { status: 500 }
        );
    }

    // Call Hubtel Payment API
    const hubtelRes = await fetch("https://payproxyapi.hubtel.com/items/initiate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(clientId + ":" + secretKey).toString("base64"),
      },
      body: JSON.stringify({
        totalAmount: totalAmount,
        description: description,
        callbackUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/payment-callback`,
        returnUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/booking-confirmation?ref=${clientReference}`,
        cancellationUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/?error=payment_failed`,
        merchantAccountNumber: accountNumber,
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
