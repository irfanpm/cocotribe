import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail } from "@/lib/http";
import { indiaDate } from "@/lib/validation";
import { RECONCILE_JOB } from "@/lib/reconcile";
import { ownerAlertsConfigured } from "@/lib/notify";
import { pushPublicKey } from "@/lib/push";
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const q = new URL(request.url).searchParams;
    const search = (q.get("search") || "").slice(0, 100);
    const date = q.get("date") || undefined;
    const payment = q.get("payment");
    const status = q.get("status");
    const where = {
      ...(search
        ? {
            OR: [
              { bookingId: { contains: search, mode: "insensitive" as const } },
              { name: { contains: search, mode: "insensitive" as const } },
              { phone: { contains: search } },
            ],
          }
        : {}),
      ...(date ? { date } : {}),
      ...(["PENDING", "PAID", "REFUND_REQUIRED", "REFUNDED"].includes(
        payment || "",
      )
        ? { paymentStatus: payment as "PENDING" }
        : {}),
      ...([
        "PENDING",
        "CONFIRMED",
        "PREPARING",
        "READY",
        "COMPLETED",
        "CANCELLED",
      ].includes(status || "")
        ? { status: status as "PENDING" }
        : {}),
    };
    const page = Math.max(0, Math.min(100000, Number(q.get("page")) || 0));
    const today = indiaDate();
    const [
      orders,
      count,
      products,
      slots,
      faqs,
      settings,
      messages,
      groups,
      audit,
      admins,
      job,
    ] = await Promise.all([
      db.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: page * 50,
        take: 50,
        omit: { tokenHash: true, requestKey: true },
      }),
      db.order.count({ where }),
      db.product.findMany({ orderBy: { createdAt: "asc" } }),
      db.timeSlot.findMany({ orderBy: { startMinute: "asc" } }),
      db.faq.findMany({ orderBy: { position: "asc" } }),
      db.settings.findUniqueOrThrow({ where: { id: "main" } }),
      db.contactMessage.findMany({ take: 100, orderBy: { createdAt: "desc" } }),
      db.$queryRaw<Array<{total:number;todays:number;upcoming:number;pending:number;paid:number;delivery:number}>>`
        SELECT COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE date = ${today} AND status <> 'CANCELLED')::int AS todays,
          COUNT(*) FILTER (WHERE date > ${today} AND status NOT IN ('CANCELLED', 'COMPLETED'))::int AS upcoming,
          COUNT(*) FILTER (WHERE "paymentStatus" = 'PENDING' AND status <> 'CANCELLED')::int AS pending,
          COUNT(*) FILTER (WHERE "paymentStatus" = 'PAID')::int AS paid,
          COUNT(*) FILTER (WHERE method = 'DELIVERY')::int AS delivery
        FROM "Order"`,
      db.auditLog.findMany({ take: 100, orderBy: { createdAt: "desc" } }),
      db.admin.findMany({ select: { id: true, email: true } }),
      db.jobRun.findUnique({ where: { name: RECONCILE_JOB } }),
    ]);
    const stats = groups[0];
    const emails = new Map(admins.map((a) => [a.id, a.email]));
    return NextResponse.json(
      {
        orders,
        count,
        page,
        products,
        slots,
        faqs,
        settings,
        messages,
        stats,
        audit: audit.map((a) => ({ ...a, adminEmail: emails.get(a.adminId) || "Removed admin" })),
        ownerAlerts: ownerAlertsConfigured(),
        push: { publicKey: pushPublicKey(), devices: await db.pushSubscription.count() },
        reconcile: job && { lastSuccessAt: job.lastSuccessAt, lastError: job.lastError },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return fail(e);
  }
}
