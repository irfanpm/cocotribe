import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { body, fail, sameOrigin, clientIp } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { sendPushToAdmins } from "@/lib/push";
/** Sends a sample notification to this device, so the admin can check it arrives. */
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await requireAdmin();
    await rateLimit("push-test", clientIp(request), 10);
    const { endpoint } = z.object({ endpoint: z.string().max(1000) }).parse(await body(request));
    const result = await sendPushToAdmins(
      {
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
      },
      endpoint,
    );
    const reason = result.sent
      ? undefined
      : "reason" in result
        ? result.reason
        : !result.devices
          ? "NOT_REGISTERED"
          : result.removed
            ? "EXPIRED"
            : "PUSH_REJECTED";
    return NextResponse.json({ ...result, reason }, {
      status: result.sent ? 200 : 502,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return fail(e);
  }
}
