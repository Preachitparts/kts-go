
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// Function to get Hubtel settings from Firestore
async function getHubtelSettings() {
    console.log("Attempting to load Hubtel settings from Firestore...");
    try {
        const settingsDoc = await adminDb.collection("settings").doc("hubtel").get();
        if (!settingsDoc.exists) {
            console.error("CRITICAL: Hubtel settings document not found in Firestore.");
            throw new Error("Hubtel settings not found. Please configure them in the admin panel.");
        }
        const settings = settingsDoc.data();
        console.log("Hubtel settings loaded successfully.");
        return settings;
    } catch (error) {
        console.error("CRITICAL: Error loading Hubtel settings from Firestore:", error);
        // Re-throw to be caught by the main handler
        throw new Error("Could not load payment provider settings from the server.");
    }
}

export async function POST(req: NextRequest) {
  try {
    const requestBody = await req.json();
    console.log("Payment initiation request received for clientReference:", requestBody.clientReference);

    const { totalAmount, description, clientReference, phone } = requestBody;

    if (!totalAmount || !description || !clientReference || !phone) {
      console.error("Missing required payment fields.", { received: requestBody });
      return NextResponse.json({ success: false, error: "Missing required payment fields." }, { status: 400 });
    }

    // Check for NEXT_PUBLIC_BASE_URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!baseUrl) {
        console.error("CRITICAL: NEXT_PUBLIC_BASE_URL environment variable is not set.");
        return NextResponse.json({ success: false, error: "Server configuration error: Base URL is not set." }, { status: 500 });
    }
    console.log("Using Base URL for callbacks:", baseUrl);

    // Fetch Hubtel settings
    const settings = await getHubtelSettings();
    const clientId = settings?.liveMode ? settings?.clientId : settings?.testClientId;
    const secretKey = settings?.liveMode ? settings?.secretKey : settings?.testSecretKey;
    const accountNumber = settings?.liveMode ? settings?.accountId : settings?.testAccountId;

    if (!clientId || !secretKey || !accountNumber) {
        console.error("Hubtel API keys are not configured correctly in admin settings.", { liveMode: settings?.liveMode });
        return NextResponse.json({ success: false, error: "Payment gateway is not configured correctly. Please contact support." }, { status: 500 });
    }

    const hubtelPayload = {
        totalAmount: totalAmount,
        description: description,
        callbackUrl: `${baseUrl}/api/payment-callback`,
        returnUrl: `${baseUrl}/booking-confirmation?ref=${clientReference}`,
        cancellationUrl: `${baseUrl}/?error=payment_failed`,
        merchantAccountNumber: accountNumber,
        clientReference: clientReference,
        customerMsisdn: phone,
    };

    console.log("Sending request to Hubtel API...");
    const hubtelRes = await fetch("https://payproxyapi.hubtel.com/items/initiate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(clientId + ":" + secretKey).toString("base64"),
      },
      body: JSON.stringify(hubtelPayload),
    });

    const hubtelData = await hubtelRes.json();
    
    if (!hubtelRes.ok || hubtelData.status !== "Success") {
      const errorMsg = `Payment provider error: ${hubtelData.message || hubtelData.responseText || 'Unknown error'}`;
      console.error("Hubtel Error Response:", { status: hubtelRes.status, response: hubtelData });
      return NextResponse.json({ success: false, error: errorMsg, details: hubtelData }, { status: 500 });
    }

    console.log("Payment initiation successful for clientReference:", clientReference);
    return NextResponse.json({
      success: true,
      paymentUrl: hubtelData.data.checkoutUrl,
    });

  } catch (err: any) {
    console.error("CRITICAL: Unhandled exception in initiate-payment API:", {
        error: err.message,
        stack: err.stack,
    });
    // This is the crucial part: always return a JSON error, never crash.
    return NextResponse.json(
      { success: false, error: "An internal server error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
