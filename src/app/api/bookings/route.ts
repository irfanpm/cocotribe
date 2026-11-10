import { NextResponse, after } from "next/server";
import { revalidateTag } from "next/cache";
import { isDemo } from "@/lib/db";
import { body, sameOrigin, fail, AppError, clientIp } from "@/lib/http";
import { bookingSchema } from "@/lib/validation";
import { rateLimitAll } from "@/lib/rate-limit";
import { createBooking, ensureGatewayOrder, publicOrder } from "@/lib/orders";
import { razorpay } from "@/lib/razorpay";
import { notifyOwner } from "@/lib/notify";
export async function POST(request: Request) {
  try {
    if (isDemo()) throw new AppError("DEMO_MODE", 503);
    sameOrigin(request);
    const data = bookingSchema.parse(await body(request));
    await rateLimitAll([
      { scope: "booking-ip", key: clientIp(request), limit: 20 },
      { scope: "booking", key: data.phone, limit: 8 },
      { scope: "booking-global", key: "all", limit: 300, minutes: 1 },
    ]);
    if (
      data.method === "RAZORPAY" &&
      (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)
    )
      throw new AppError("PAYMENT_UNAVAILABLE", 503);
    let { order, token, created } = await createBooking(data);
    revalidateTag("catalog", { expire: 0 });
    // Online bookings alert the owner once paid, not while the customer is still at checkout.
    if (created && order.method === "DELIVERY") {
      const placed = order;
      after(() => notifyOwner({ ...placed, event: "NEW_BOOKING" }));
    }
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
