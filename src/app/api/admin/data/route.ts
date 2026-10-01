import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail } from "@/lib/http";
import { indiaDate } from "@/lib/validation";
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
    ]);
    const stats = groups[0];
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
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return fail(e);
  }
}
