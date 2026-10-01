import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { db, isDemo } from "@/lib/db";
import { body, sameOrigin, fail, AppError } from "@/lib/http";
import { bookingSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { createBooking, publicOrder } from "@/lib/orders";
import { razorpay } from "@/lib/razorpay";
export async function POST(request: Request) {
  try {
    if (isDemo()) throw new AppError("DEMO_MODE", 503);
    sameOrigin(request);
    const data = bookingSchema.parse(await body(request));
    await rateLimit("booking", data.phone, 8);
    await rateLimit("booking-global", "all", 300, 1);
    if (
      data.method === "RAZORPAY" &&
      (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)
    )
      throw new AppError("PAYMENT_UNAVAILABLE", 503);
    let { order, token } = await createBooking(data);
    revalidateTag("catalog", {expire: 0});
    if (order.status === "CANCELLED")
      throw new AppError("BOOKING_EXPIRED", 409);
    if (order.method === "RAZORPAY" && !order.razorpayOrderId) {
      // Serialised lock prevents duplicate gateway orders when an idempotent request is retried concurrently.
      order = await db.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${order.id} FOR UPDATE`;
          const current = await tx.order.findUniqueOrThrow({
            where: { id: order.id },
          });
          if (current.razorpayOrderId) return current;
          const gateway = await razorpay<{ id: string }>("orders", "POST", {
            amount: current.total,
            currency: "INR",
            receipt: current.bookingId,
            notes: { bookingId: current.bookingId },
          });
          return tx.order.update({
            where: { id: current.id },
            data: { razorpayOrderId: gateway.id },
          });
        },
        { timeout: 20000 },
      );
    }
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
