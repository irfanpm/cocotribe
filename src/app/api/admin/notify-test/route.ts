import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail, sameOrigin, clientIp } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { notifyOwner } from "@/lib/notify";
/** Sends one sample alert so the owner can check the WhatsApp setup without a real booking. */
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const admin = await requireAdmin();
    await rateLimit("notify-test", clientIp(request), 5);
    const result = await notifyOwner({
      event: "TEST",
      bookingId: "KT-TEST",
      name: "Test customer",
      phone: "910000000000",
      productNameEn: "Pooja Coconut · Mini Pack (2 pcs)",
      quantity: 1,
      date: new Date().toISOString().slice(0, 10),
      slotLabel: "06:00 – 09:00",
      method: "DELIVERY",
      paymentStatus: "PENDING",
      total: 5000,
    });
    await db.auditLog.create({
      data: { adminId: admin.id, action: "test:whatsapp-alert", entityId: admin.id, details: { sent: result.sent } },
    });
    return NextResponse.json(result, {
      status: result.sent ? 200 : result.reason === "NOT_CONFIGURED" ? 400 : 502,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return fail(e);
  }
}
