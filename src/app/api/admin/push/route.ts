import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { body, fail, sameOrigin, AppError } from "@/lib/http";
import { allowedPushEndpoint } from "@/lib/push";
const headers = { "Cache-Control": "no-store" };
const base64url = z.string().regex(/^[A-Za-z0-9_-]+={0,2}$/);
const subscription = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: base64url.min(80).max(100), auth: base64url.min(16).max(30) }),
  label: z.string().trim().max(80).default(""),
});
/** Registers this phone or computer for new-order notifications. */
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const admin = await requireAdmin();
    const data = subscription.parse(await body(request));
    if (!allowedPushEndpoint(data.endpoint)) throw new AppError("PUSH_SERVICE_NOT_ALLOWED");
    // The admin page re-saves its device on every visit; only a new device is logged.
    const known = await db.pushSubscription.findUnique({ where: { endpoint: data.endpoint }, select: { id: true } });
    await db.pushSubscription.upsert({
      where: { endpoint: data.endpoint },
      create: { endpoint: data.endpoint, p256dh: data.keys.p256dh, auth: data.keys.auth, adminId: admin.id, label: data.label },
      update: { p256dh: data.keys.p256dh, auth: data.keys.auth, adminId: admin.id, label: data.label },
    });
    if (!known)
      await db.auditLog.create({
        data: { adminId: admin.id, action: "push:turned-on", entityId: admin.id, details: { device: data.label } },
      });
    return NextResponse.json({ ok: true, devices: await db.pushSubscription.count() }, { headers });
  } catch (e) {
    return fail(e);
  }
}
/** Stops notifications to one device. */
export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    const admin = await requireAdmin();
    const { endpoint } = z.object({ endpoint: z.string().max(1000) }).parse(await body(request));
    const removed = await db.pushSubscription.deleteMany({ where: { endpoint } });
    if (removed.count)
      await db.auditLog.create({ data: { adminId: admin.id, action: "push:turned-off", entityId: admin.id } });
    return NextResponse.json({ ok: true, devices: await db.pushSubscription.count() }, { headers });
  } catch (e) {
    return fail(e);
  }
}
