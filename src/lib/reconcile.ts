import { Prisma } from "@prisma/client";
import { db } from "./db";
import { expireReservation, markCaptured } from "./orders";
import { razorpay, type GatewayPayment } from "./razorpay";
import { reportError } from "./monitor";
export const RECONCILE_JOB = "reconcile-payments";
export type PaymentLookup = (razorpayOrderId: string) => Promise<GatewayPayment[]>;
const lookupFromRazorpay: PaymentLookup = async (id) =>
  (await razorpay<{ items: GatewayPayment[] }>(`orders/${id}/payments`)).items;
/**
 * Settles online reservations whose 30 minutes have passed: captured payments are marked
 * paid, authorised ones stay held, everything else releases its stock. One failed order
 * never stops the rest, and a gateway error leaves that order untouched for the next run.
 */
export async function reconcileExpired(lookup: PaymentLookup = lookupFromRazorpay, now = new Date()) {
  const startedAt = new Date();
  const expired = await db.order.findMany({
    where: {
      method: "RAZORPAY",
      paymentStatus: "PENDING",
      status: "PENDING",
      reservedUntil: { lt: now },
    },
    orderBy: { reservedUntil: "asc" },
    take: 100,
  });
  const result = { checked: expired.length, paid: 0, released: 0, held: 0, failed: 0, purged: 0 };
  for (const order of expired) {
    try {
      const payments = order.razorpayOrderId ? await lookup(order.razorpayOrderId) : [];
      const captured = payments.find((p) => p.status === "captured");
      if (captured) {
        await markCaptured(captured.order_id, captured.id, captured.amount, captured.currency);
        result.paid++;
      } else if (payments.some((p) => p.status === "authorized")) {
        result.held++;
      } else if (await expireReservation(order.id, now)) {
        result.released++;
      }
    } catch (error) {
      result.failed++;
      await reportError("reconcile", error, { bookingId: order.bookingId });
    }
  }
  result.purged = (await db.rateLimit.deleteMany({ where: { resetAt: { lt: now } } })).count;
  const finishedAt = new Date();
  const ok = result.failed === 0;
  await db.jobRun.upsert({
    where: { name: RECONCILE_JOB },
    create: {
      name: RECONCILE_JOB,
      lastRunAt: startedAt,
      lastSuccessAt: ok ? finishedAt : null,
      lastError: ok ? null : `${result.failed} order(s) failed`,
      lastResult: result as unknown as Prisma.InputJsonValue,
    },
    update: {
      lastRunAt: startedAt,
      ...(ok ? { lastSuccessAt: finishedAt } : {}),
      lastError: ok ? null : `${result.failed} order(s) failed`,
      lastResult: result as unknown as Prisma.InputJsonValue,
    },
  });
  return result;
}
