import { NextResponse } from "next/server";
import { checkSignature } from "@/lib/security";
import { fail, AppError } from "@/lib/http";
import { markCaptured } from "@/lib/orders";
export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > 100000) throw new AppError("INVALID_INPUT", 413);
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) throw new AppError("PAYMENT_UNAVAILABLE", 503);
    if (
      !checkSignature(
        raw,
        request.headers.get("x-razorpay-signature") || "",
        secret,
      )
    )
      throw new AppError("FORBIDDEN", 403);
    const event = JSON.parse(raw);
    if (event.event === "payment.captured") {
      const p = event.payload?.payment?.entity;
      if (!p?.id || !p?.order_id || p.status !== "captured")
        throw new AppError("INVALID_INPUT");
      await markCaptured(p.order_id, p.id, p.amount, p.currency);
    }
    return NextResponse.json({ received: true });
  } catch (e) {
    return fail(e);
  }
}
