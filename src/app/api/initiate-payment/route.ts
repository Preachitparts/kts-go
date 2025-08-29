
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const requestBody = await req.json();
    console.log("Payment initiation request received for clientReference:", requestBody.clientReference);

    const { totalAmount, description, clientReference, phone } = requestBody;

    if (!totalAmount || !description || !clientReference || !phone) {
      console.error("Missing required payment fields.", { received: requestBody });
      return NextResponse.json({ success: false, error: "Missing required payment fields." }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!baseUrl) {
        console.error("CRITICAL: NEXT_PUBLIC_BASE_URL environment variable is not set.");
        return NextResponse.json({ success: false, error: "Server configuration error: Base URL is not set." }, { status: 500 });
    }
    console.log("Using Base URL for callbacks:", baseUrl);

    // Get Hubtel settings from environment variables
    const isLiveMode = process.env.HUBTEL_LIVE_MODE === 'true';
    const clientId = isLiveMode ? process.env.HUBTEL_CLIENT_ID : process.env.HUBTEL_TEST_CLIENT_ID;
    const secretKey = isLiveMode ? process.env.HUBTEL_SECRET_KEY : process.env.HUBTEL_TEST_SECRET_KEY;
    const accountNumber = isLiveMode ? process.env.HUBTEL_ACCOUNT_ID : process.env.HUBTEL_TEST_ACCOUNT_ID;

    if (!clientId || !secretKey || !accountNumber) {
        console.error("Hubtel API keys are not configured correctly in environment variables.");
        return NextResponse.json({ success: false, error: "Payment gateway is not configured correctly. Please contact support." }, { status: 500 });
    }

    const returnUrl = `${baseUrl}/booking-confirmation?ref=${clientReference}`;
    console.log(`Constructed returnUrl for Hubtel: ${returnUrl}`); // Added for debugging

    const hubtelPayload = {
        totalAmount: totalAmount,
        description: description,
        callbackUrl: `${baseUrl}/api/payment-callback`,
        returnUrl: returnUrl,
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
    return NextResponse.json(
      { success: false, error: "An internal server error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
