
// /app/api/initiate-payment/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase"; // your Firestore init
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, seatId, amount, phoneNumber } = body;

    if (!userId || !seatId || !amount || !phoneNumber) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Step 1: Write booking to Firestore as "pending"
    const bookingRef = await addDoc(collection(db, "bookings"), {
      userId,
      seatId,
      amount,
      phoneNumber,
      status: "pending",
      createdAt: serverTimestamp(),
    });

    // Step 2: Call Hubtel Payment API
    const hubtelRes = await fetch("https://payproxyapi.hubtel.com/items/initiate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Basic " +
          Buffer.from(
            process.env.HUBTEL_CLIENT_ID + ":" + process.env.HUBTEL_CLIENT_SECRET
          ).toString("base64"),
      },
      body: JSON.stringify({
        totalAmount: amount,
        description: `Seat Booking - ${seatId}`,
        callbackUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/payment-callback`,
        returnUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment-success`,
        cancellationUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment-cancelled`,
        merchantAccountNumber: process.env.HUBTEL_ACCOUNT_NUMBER,
        clientReference: bookingRef.id, // use Firestore booking ID
        customerMsisdn: phoneNumber,
        paymentMethod: "momo",
      }),
    });

    const hubtelData = await hubtelRes.json();

    if (!hubtelRes.ok) {
      return NextResponse.json(
        { error: "Hubtel payment initiation failed", details: hubtelData },
        { status: 500 }
      );
    }

    // Step 3: Return payment link to frontend
    return NextResponse.json({
      bookingId: bookingRef.id,
      paymentUrl: hubtelData.data.checkoutUrl,
    });
  } catch (err: any) {
    console.error("Payment initiation error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
}
