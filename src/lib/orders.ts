import { Prisma, type Product, type Settings, type TimeSlot } from "@prisma/client";
import { createHmac, randomBytes } from "node:crypto";
import { db } from "./db";
import { AppError } from "./http";
import { reportIssue } from "./monitor";
import { hash } from "./security";
import { bookingSchema, validBookingTime } from "./validation";
import type { z } from "zod";
// P2034 serialization conflict or deadlock, and P2028 transaction start timeout under load.
const RETRYABLE = new Set(["P2034", "P2028"]);
const ATTEMPTS = 6;
async function withRetries<T>(run: () => Promise<T>, retryable: Set<string>): Promise<T> {
  for (let n = 0; ; n++) {
    try {
      return await run();
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        retryable.has(e.code) &&
        n < ATTEMPTS - 1
      ) {
        await new Promise((r) => setTimeout(r, Math.random() * 40 * 2 ** n));
        continue;
      }
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034")
        throw new AppError("TRY_AGAIN", 409);
      throw e;
    }
  }
}
export async function serial<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  // P2002 here means a concurrent request won a unique key; the next attempt sees its row.
  return withRetries(
    () =>
      db.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      }),
    new Set([...RETRYABLE, "P2002"]),
  );
}
/**
 * Reserves stock and a slot place without retry storms. Serializable transactions made
 * simultaneous bookings abort and start again, so waits grew quickly with database distance.
 * Here bookings for one slot and date queue briefly on a lock, the capacity count runs
 * inside that lock, and stock changes in one conditional update that can never go below
 * zero. Bookings for other slots and dates do not wait for each other.
 * Lock order is always slot, then product, and nothing takes them the other way round.
 */
export async function createBooking(data: z.infer<typeof bookingSchema>) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 48)
    throw new AppError("SERVICE_UNAVAILABLE", 503);
  const { expectedUnitPrice, ...orderData } = data;
  const token = createHmac("sha256", secret)
    .update(`booking:${data.requestKey}`)
    .digest("hex");
  // One round trip for everything the checks below need.
  const [state] = await db.$queryRaw<
    {
      existingId: string | null;
      product: Product | null;
      slot: TimeSlot | null;
      settings: Settings | null;
    }[]
  >`SELECT
      (SELECT o."id" FROM "Order" o WHERE o."requestKey" = ${data.requestKey}) AS "existingId",
      (SELECT row_to_json(p) FROM "Product" p WHERE p."id" = ${data.productId}) AS "product",
      (SELECT row_to_json(t) FROM "TimeSlot" t WHERE t."id" = ${data.slotId}) AS "slot",
      (SELECT row_to_json(s) FROM "Settings" s WHERE s."id" = 'main') AS "settings"`;
  if (state.existingId)
    return {
      order: await db.order.findUniqueOrThrow({ where: { id: state.existingId } }),
      token,
    };
  const { product, slot, settings } = state;
  if (!settings) throw new AppError("SERVICE_UNAVAILABLE", 503);
  if (!product?.active || product.stock < data.quantity)
    throw new AppError("OUT_OF_STOCK", 409);
  if (product.price !== expectedUnitPrice)
    throw new AppError("PRICE_CHANGED", 409);
  if (
    !slot?.active ||
    !validBookingTime(
      data.date,
      slot.startMinute,
      settings.leadHours,
      settings.maxDays,
    )
  )
    throw new AppError("INVALID_SLOT", 409);
  if ((data.method === "RAZORPAY" && !settings.onlineEnabled) ||
      (data.method === "DELIVERY" && !settings.deliveryEnabled))
    throw new AppError("PAYMENT_UNAVAILABLE", 409);
  const lockKey = `booking:${data.slotId}:${data.date}`;
  try {
    const order = await withRetries(
      () =>
        db.$transaction(
          async (tx) => {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}::text, 0))`;
            const count = await tx.order.count({
              where: {
                date: data.date,
                slotId: data.slotId,
                status: { not: "CANCELLED" },
              },
            });
            if (count >= slot.capacity) throw new AppError("SLOT_FULL", 409);
            const reserved = await tx.product.updateMany({
              where: {
                id: product.id,
                active: true,
                price: expectedUnitPrice,
                stock: { gte: data.quantity },
              },
              data: { stock: { decrement: data.quantity } },
            });
            if (reserved.count !== 1) {
              const current = await tx.product.findUnique({ where: { id: product.id } });
              throw new AppError(
                current?.active && current.price !== expectedUnitPrice
                  ? "PRICE_CHANGED"
                  : "OUT_OF_STOCK",
                409,
              );
            }
            return tx.order.create({
              data: {
                ...orderData,
                tokenHash: hash(token),
                bookingId: `KT-${randomBytes(5).toString("hex").toUpperCase()}`,
                productNameEn: product.nameEn,
                productNameMl: product.nameMl,
                unitPrice: expectedUnitPrice,
                total: expectedUnitPrice * data.quantity,
                slotLabel: slot.label,
                reservedUntil:
                  data.method === "RAZORPAY" ? new Date(Date.now() + 30 * 60000) : null,
              },
            });
          },
          // PostgreSQL's default Read Committed, left implicit to save a round trip.
          { maxWait: 15000, timeout: 20000 },
        ),
      RETRYABLE,
    );
    return { order, token };
  } catch (e) {
    // The same request arriving twice at once: the insert rolled back, so return the winner.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const winner = await db.order.findUnique({
        where: { requestKey: data.requestKey },
      });
      if (winner) return { order: winner, token };
    }
    throw e;
  }
}
/**
 * Attaches the Razorpay order after the reservation is committed, so a slow gateway never
 * holds a database connection. If two retries race, the conditional update picks one
 * winner; the loser's unused gateway order can never be paid because nobody receives it.
 */
export async function ensureGatewayOrder(
  order: Awaited<ReturnType<typeof createBooking>>["order"],
  createGatewayOrder: (o: { total: number; bookingId: string }) => Promise<string>,
) {
  if (order.razorpayOrderId) return order;
  const gatewayId = await createGatewayOrder(order);
  await db.order.updateMany({
    where: { id: order.id, razorpayOrderId: null },
    data: { razorpayOrderId: gatewayId },
  });
  return db.order.findUniqueOrThrow({ where: { id: order.id } });
}
/** Releases an unpaid online reservation, re-checking inside the transaction in case it was just paid. */
export async function expireReservation(id: string, now = new Date()) {
  return serial(async (tx) => {
    const o = await tx.order.findUniqueOrThrow({ where: { id } });
    if (
      o.method !== "RAZORPAY" ||
      o.status !== "PENDING" ||
      o.paymentStatus !== "PENDING" ||
      !o.reservedUntil ||
      o.reservedUntil >= now
    )
      return false;
    if (!o.stockReleased)
      await tx.product.update({
        where: { id: o.productId },
        data: { stock: { increment: o.quantity } },
      });
    await tx.order.update({
      where: { id },
      data: { status: "CANCELLED", stockReleased: true },
    });
    return true;
  });
}
export async function cancelOrder(id: string) {
  return serial(async (tx) => {
    const o = await tx.order.findUniqueOrThrow({ where: { id } });
    if (o.status === "COMPLETED") throw new AppError("INVALID_STATUS", 409);
    if (!o.stockReleased)
      await tx.product.update({
        where: { id: o.productId },
        data: { stock: { increment: o.quantity } },
      });
    return tx.order.update({
      where: { id },
      data: {
        status: "CANCELLED",
        stockReleased: true,
        paymentStatus:
          o.paymentStatus === "PAID" ? "REFUND_REQUIRED" : o.paymentStatus,
      },
    });
  });
}
export async function markCaptured(
  razorpayOrderId: string,
  paymentId: string,
  amount: number,
  currency: string,
) {
  return serial(async (tx) => {
    const o = await tx.order.findUnique({ where: { razorpayOrderId } });
    if (!o) throw new AppError("NOT_FOUND", 404);
    if (o.total !== amount || currency !== "INR")
      throw new AppError("PAYMENT_MISMATCH", 409);
    if (["PAID", "REFUND_REQUIRED", "REFUNDED"].includes(o.paymentStatus)) {
      // A second captured payment on one order means the customer was charged twice.
      if (o.razorpayPaymentId && o.razorpayPaymentId !== paymentId)
        await reportIssue("payments", "SECOND_CAPTURE_NEEDS_REFUND", { bookingId: o.bookingId });
      return o;
    }
    return tx.order.update({
      where: { id: o.id },
      data: {
        razorpayPaymentId: paymentId,
        paymentStatus: o.status === "CANCELLED" ? "REFUND_REQUIRED" : "PAID",
        status: o.status === "PENDING" ? "CONFIRMED" : o.status,
        reservedUntil: null,
      },
    });
  });
}
export async function getPrivateOrder(id: string, token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new AppError("NOT_FOUND", 404);
  const o = await db.order.findFirst({
    where: { bookingId: id, tokenHash: hash(token) },
  });
  if (!o) throw new AppError("NOT_FOUND", 404);
  return o;
}
export function gatewayDetails(o: Awaited<ReturnType<typeof getPrivateOrder>>) {
  if (
    o.method !== "RAZORPAY" ||
    o.status !== "PENDING" ||
    o.paymentStatus !== "PENDING" ||
    !o.razorpayOrderId ||
    !o.reservedUntil ||
    o.reservedUntil <= new Date() ||
    !process.env.RAZORPAY_KEY_ID
  )
    return null;
  return { key: process.env.RAZORPAY_KEY_ID, orderId: o.razorpayOrderId, amount: o.total };
}
export function publicOrder(o: Awaited<ReturnType<typeof getPrivateOrder>>) {
  return {
    bookingId: o.bookingId,
    name: o.name,
    phone: o.phone,
    productNameEn: o.productNameEn,
    productNameMl: o.productNameMl,
    quantity: o.quantity,
    unitPrice: o.unitPrice,
    total: o.total,
    date: o.date,
    slotLabel: o.slotLabel,
    method: o.method,
    paymentStatus: o.paymentStatus,
    status: o.status,
    notes: o.notes,
  };
}
