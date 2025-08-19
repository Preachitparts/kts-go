
// /app/api/initiate-payment/route.ts
import { doc, getDoc } from "firebase/firestore";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";

async function getHubtelKeys() {
    const settingsDoc = await getDoc(doc(db, "settings", "hubtel"));
    if (!settingsDoc.exists()) {
        throw new Error("Hubtel settings not found.");
    }
    const settings = settingsDoc.data();

    if (settings.liveMode) {
        return {
            clientId: settings.clientId,
            secretKey: settings.secretKey,
            accountId: settings.accountId,
        };
    } else {
         return {
            clientId: settings.testClientId,
            secretKey: settings.testSecretKey,
            accountId: settings.testAccountId,
        };
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

    const hubtelKeys = await getHubtelKeys();
    if (!hubtelKeys.clientId || !hubtelKeys.secretKey || !hubtelKeys.accountId) {
        return NextResponse.json(
            { success: false, error: "Hubtel API keys are not configured in settings." },
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
            hubtelKeys.clientId + ":" + hubtelKeys.secretKey
          ).toString("base64"),
      },
      body: JSON.stringify({
        totalAmount: totalAmount,
        description: description,
        callbackUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/payment-callback`,
        returnUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/payment-callback`,
        cancellationUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/`,
        merchantAccountNumber: hubtelKeys.accountId,
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

