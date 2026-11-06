import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { isDemo } from "@/lib/db";
import { body, sameOrigin, fail, AppError, clientIp } from "@/lib/http";
import { bookingSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { createBooking, ensureGatewayOrder, publicOrder } from "@/lib/orders";
import { razorpay } from "@/lib/razorpay";
export async function POST(request: Request) {
  try {
    if (isDemo()) throw new AppError("DEMO_MODE", 503);
    sameOrigin(request);
    await rateLimit("booking-ip", clientIp(request), 20);
    const data = bookingSchema.parse(await body(request));
    await rateLimit("booking", data.phone, 8);
    await rateLimit("booking-global", "all", 300, 1);
    if (
      data.method === "RAZORPAY" &&
      (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)
    )
      throw new AppError("PAYMENT_UNAVAILABLE", 503);
    let { order, token } = await createBooking(data);
    revalidateTag("catalog", { expire: 0 });
    if (order.status === "CANCELLED")
      throw new AppError("BOOKING_EXPIRED", 409);
    if (order.method === "RAZORPAY")
      order = await ensureGatewayOrder(order, async (o) =>
        (
          await razorpay<{ id: string }>("orders", "POST", {
            amount: o.total,
            currency: "INR",
            receipt: o.bookingId,
            notes: { bookingId: o.bookingId },
          })
        ).id,
      );
    return NextResponse.json(
      {
        order: publicOrder(order),
        token,
        gateway:
          order.method === "RAZORPAY"
            ? {
                key: process.env.RAZORPAY_KEY_ID,
                orderId: order.razorpayOrderId,
                amount: order.total,
              }
            : null,
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return fail(e);
  }
}
