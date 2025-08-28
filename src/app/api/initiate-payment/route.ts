
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

async function getHubtelSettings() {
    try {
        const settingsDoc = await adminDb.collection("settings").doc("hubtel").get();
        if (!settingsDoc.exists) {
            console.error("Hubtel settings document not found in Firestore");
            throw new Error("Hubtel settings not found in Firestore. Please configure payment settings in the admin panel.");
        }
        const settings = settingsDoc.data();
        console.log("Hubtel settings loaded:", { 
            hasClientId: !!settings?.clientId,
            hasSecretKey: !!settings?.secretKey,
            hasAccountId: !!settings?.accountId,
            liveMode: settings?.liveMode,
            hasTestClientId: !!settings?.testClientId,
            hasTestSecretKey: !!settings?.testSecretKey,
            hasTestAccountId: !!settings?.testAccountId
        });
        return settings;
    } catch (error) {
        console.error("Error loading Hubtel settings:", error);
        throw error;
    }
}

export async function POST(req: Request) {
  let requestBody;
  try {
    requestBody = await req.json();
    console.log("Payment initiation request received:", { 
        totalAmount: requestBody.totalAmount,
        description: requestBody.description,
        clientReference: requestBody.clientReference,
        phone: requestBody.phone,
        hasCallbackUrl: !!process.env.NEXT_PUBLIC_BASE_URL
    });

    const { totalAmount, description, clientReference, phone } = requestBody;

    if (!totalAmount || !description || !clientReference || !phone) {
      const errorMsg = "Missing required payment fields. Required: totalAmount, description, clientReference, phone";
      console.error(errorMsg, { received: requestBody });
      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: 400 }
      );
    }

    const settings = await getHubtelSettings();
    if (!settings) {
        const errorMsg = "Hubtel settings could not be loaded from the server. Please check admin configuration.";
        console.error(errorMsg);
        return NextResponse.json(
            { success: false, error: errorMsg },
            { status: 500 }
        );
    }

    const clientId = settings.liveMode ? settings.clientId : settings.testClientId;
    const secretKey = settings.liveMode ? settings.secretKey : settings.testSecretKey;
    const accountNumber = settings.liveMode ? settings.accountId : settings.testAccountId;

    if (!clientId || !secretKey || !accountNumber) {
        const errorDetails = {
            liveMode: settings.liveMode,
            clientId: !!clientId,
            secretKey: !!secretKey,
            accountNumber: !!accountNumber
        };
        const errorMsg = "Hubtel API keys are not configured correctly in the admin settings.";
        console.error(errorMsg, errorDetails);
        return NextResponse.json(
            { success: false, error: errorMsg, details: errorDetails },
            { status: 500 }
        );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!baseUrl) {
        const errorMsg = "NEXT_PUBLIC_BASE_URL environment variable is not set. This is required for payment callbacks.";
        console.error(errorMsg);
        return NextResponse.json(
            { success: false, error: errorMsg },
            { status: 500 }
        );
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

    console.log("Sending request to Hubtel API with payload:", {
        url: "https://payproxyapi.hubtel.com/items/initiate",
        payload: { ...hubtelPayload, Authorization: "Basic [REDACTED]" }
    });

    const hubtelRes = await fetch("https://payproxyapi.hubtel.com/items/initiate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(clientId + ":" + secretKey).toString("base64"),
      },
      body: JSON.stringify(hubtelPayload),
    });

    const hubtelData = await hubtelRes.json();
    console.log("Hubtel API response:", {
        status: hubtelRes.status,
        statusText: hubtelRes.statusText,
        response: hubtelData
    });

    if (!hubtelRes.ok || hubtelData.status !== "Success") {
      const errorMsg = `Hubtel payment initiation failed: ${hubtelData.message || hubtelData.responseText || 'Unknown error'}`;
      console.error("Hubtel Error:", {
          status: hubtelRes.status,
          response: hubtelData,
          requestPayload: hubtelPayload
      });
      return NextResponse.json(
        { success: false, error: errorMsg, details: hubtelData },
        { status: 500 }
      );
    }

    console.log("Payment initiation successful, redirecting to:", hubtelData.data.checkoutUrl);
    return NextResponse.json({
      success: true,
      paymentUrl: hubtelData.data.checkoutUrl,
    });
  } catch (err: any) {
    console.error("Payment initiation error:", {
        error: err.message,
        stack: err.stack,
        requestBody: requestBody || 'Could not parse request body'
    });
    return NextResponse.json(
      { success: false, error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
}
