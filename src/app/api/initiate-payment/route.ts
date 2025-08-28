
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

async function getHubtelSettings() {
    try {
        const settingsDoc = await adminDb.collection("settings").doc("hubtel").get();
        if (!settingsDoc.exists) {
            console.error("Hubtel settings not found in Firestore.");
            return null;
        }
        return settingsDoc.data();
    } catch (error) {
        console.error("Error fetching Hubtel settings from Firestore:", error);
        return null;
    }
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
    const baseUrl = process.env.BASE_URL;

    if (!clientId || !secretKey || !accountNumber) {
        console.error("Missing Hubtel API credentials in settings.");
        return NextResponse.json(
            { success: false, error: "Hubtel API keys are not configured correctly in the admin settings." },
            { status: 500 }
        );
    }
    
    if (!baseUrl) {
        console.error("BASE_URL is not defined in environment variables.");
        return NextResponse.json(
            { success: false, error: "Server configuration error: Base URL is not set." },
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
        callbackUrl: `${baseUrl}/api/payment-callback`,
        returnUrl: `${baseUrl}/booking-confirmation?ref=${clientReference}`,
        cancellationUrl: `${baseUrl}/?error=payment_failed`,
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
