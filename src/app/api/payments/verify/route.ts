import { NextResponse } from "next/server";
import { z } from "zod";
import { body, sameOrigin, fail, AppError } from "@/lib/http";
import { checkSignature } from "@/lib/security";
import { getPrivateOrder, markCaptured } from "@/lib/orders";
import { razorpay, type GatewayPayment } from "@/lib/razorpay";
const schema = z.object({
  bookingId: z.string(),
  token: z.string(),
  razorpay_payment_id: z.string().regex(/^pay_[a-zA-Z0-9]+$/),
  razorpay_signature: z.string(),
});
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const data = schema.parse(await body(request));
    const order = await getPrivateOrder(data.bookingId, data.token);
    if (
      !order.razorpayOrderId ||
      !process.env.RAZORPAY_KEY_SECRET ||
      !checkSignature(
        `${order.razorpayOrderId}|${data.razorpay_payment_id}`,
        data.razorpay_signature,
        process.env.RAZORPAY_KEY_SECRET,
      )
    )
      throw new AppError("PAYMENT_INVALID", 400);
    const p = await razorpay<GatewayPayment>(
      `payments/${data.razorpay_payment_id}`,
    );
    if (
      p.order_id !== order.razorpayOrderId ||
      p.amount !== order.total ||
      p.currency !== "INR"
    )
      throw new AppError("PAYMENT_MISMATCH", 409);
    if (p.status === "captured")
      await markCaptured(p.order_id, p.id, p.amount, p.currency);
    return NextResponse.json({ paid: p.status === "captured" });
  } catch (e) {
    return fail(e);
  }
}
