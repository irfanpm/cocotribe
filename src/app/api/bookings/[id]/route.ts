import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { gatewayDetails, getPrivateOrder, publicOrder } from "@/lib/orders";
import { AppError, body, clientIp, fail, sameOrigin } from "@/lib/http";
import { rateLimitAll } from "@/lib/rate-limit";
import { phoneSchema } from "@/lib/validation";
const headers = { "Cache-Control": "private, no-store" };
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const token =
      request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
    const order = await getPrivateOrder(id, token);
    return NextResponse.json(
      { ...publicOrder(order), gateway: gatewayDetails(order) },
      { headers },
    );
  } catch (e) {
    return fail(e);
  }
}
/**
 * Order status for a customer who has the booking ID (e.g. from a WhatsApp update) but not the
 * private link: they confirm the phone number used for the booking. Status only; paying still
 * needs the private link.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(request);
    const { id } = await params;
    if (!/^KT-[A-Z0-9]{6,20}$/.test(id)) throw new AppError("STATUS_NOT_FOUND", 404);
    await rateLimitAll([
      { scope: "status-ip", key: clientIp(request), limit: 30 },
      { scope: "status-booking", key: id, limit: 10 },
    ]);
    const { phone } = z.object({ phone: phoneSchema }).parse(await body(request));
    const order = await db.order.findFirst({ where: { bookingId: id, phone } });
    if (!order) throw new AppError("STATUS_NOT_FOUND", 404);
    return NextResponse.json({ ...publicOrder(order), gateway: null }, { headers });
  } catch (e) {
    return fail(e);
  }
}
