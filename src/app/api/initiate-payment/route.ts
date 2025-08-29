
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

async function getHubtelSettings() {
    console.log("Attempting to load Hubtel settings from Firestore...");
    try {
        const settingsDoc = await adminDb.collection("settings").doc("hubtel").get();
        if (!settingsDoc.exists) {
            console.error("CRITICAL: Hubtel settings document not found in Firestore.");
            throw new Error("Hubtel settings not found in Firestore. Please configure payment settings in the admin panel.");
        }
        const settings = settingsDoc.data();
        console.log("Hubtel settings loaded successfully.");
        return settings;
    } catch (error) {
        console.error("CRITICAL: Error loading Hubtel settings from Firestore:", error);
        throw error; // Re-throw the error to be caught by the main handler
    }
}

export async function POST(req: NextRequest) {
  let requestBody;
  try {
    requestBody = await req.json();
    console.log("Payment initiation request received for clientReference:", requestBody.clientReference);

    const { totalAmount, description, clientReference, phone } = requestBody;

    if (!totalAmount || !description || !clientReference || !phone) {
      const errorMsg = "Missing required payment fields.";
      console.error(errorMsg, { received: requestBody });
      return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
    }

    const settings = await getHubtelSettings();
    if (!settings) {
        const errorMsg = "Hubtel settings could not be loaded from the server.";
        console.error(errorMsg);
        return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
    }

    const clientId = settings.liveMode ? settings.clientId : settings.testClientId;
    const secretKey = settings.liveMode ? settings.secretKey : settings.testSecretKey;
    const accountNumber = settings.liveMode ? settings.accountId : settings.testAccountId;

    if (!clientId || !secretKey || !accountNumber) {
        const errorMsg = "Hubtel API keys are not configured correctly in admin settings.";
        console.error(errorMsg, { liveMode: settings.liveMode });
        return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!baseUrl) {
        const errorMsg = "NEXT_PUBLIC_BASE_URL environment variable is not set.";
        console.error(errorMsg);
        return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
    }
     console.log("Using Base URL for callbacks:", baseUrl);

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
      const errorMsg = `Hubtel payment initiation failed: ${hubtelData.message || hubtelData.responseText || 'Unknown error'}`;
      console.error("Hubtel Error Response:", {
          status: hubtelRes.status,
          response: hubtelData
      });
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
        requestBody: requestBody || 'Could not parse request body'
    });
    return NextResponse.json(
      { success: false, error: "Internal Server Error. Check server logs for details.", details: err.message },
      { status: 500 }
    );
  }
}
