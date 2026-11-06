import { NextResponse } from "next/server";
import { db, isDemo } from "@/lib/db";
import { hasCronSecret } from "@/lib/cron-auth";
import { RECONCILE_JOB } from "@/lib/reconcile";
import { reportError } from "@/lib/monitor";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
// How old a successful reconciliation may be before monitoring should alert.
const STALE_MINUTES = 30;
/** Public: a bare up/down for uptime monitors. With CRON_SECRET: scheduler and reservation details. */
export async function GET(request: Request) {
  if (isDemo()) return NextResponse.json({ status: "demo" }, { headers });
  try {
    const now = Date.now();
    const [job, overdue] = await Promise.all([
      db.jobRun.findUnique({ where: { name: RECONCILE_JOB } }),
      db.order.count({
        where: {
          method: "RAZORPAY",
          status: "PENDING",
          paymentStatus: "PENDING",
          reservedUntil: { lt: new Date(now - STALE_MINUTES * 60000) },
        },
      }),
    ]);
    const lastSuccessAt = job?.lastSuccessAt ?? null;
    const reconcileFresh = !!lastSuccessAt && now - lastSuccessAt.getTime() < STALE_MINUTES * 60000;
    const status = reconcileFresh && !overdue ? "ok" : "degraded";
    if (!hasCronSecret(request)) return NextResponse.json({ status: "ok" }, { headers });
    return NextResponse.json(
      {
        status,
        reconcile: { lastSuccessAt, lastRunAt: job?.lastRunAt ?? null, lastError: job?.lastError ?? null, lastResult: job?.lastResult ?? null },
        overdueReservations: overdue,
      },
      { headers, status: status === "ok" ? 200 : 503 },
    );
  } catch (e) {
    await reportError("health", e);
    return NextResponse.json({ status: "down" }, { status: 503, headers });
  }
}
