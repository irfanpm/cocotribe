import { Prisma } from "@prisma/client";
import { createHmac, randomBytes } from "node:crypto";
import { db } from "./db";
import { AppError } from "./http";
import { hash } from "./security";
import { bookingSchema, validBookingTime } from "./validation";
import type { z } from "zod";
export async function serial<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let n = 0; n < 4; n++) {
    try {
      return await db.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2034" &&
        n < 3
      )
        continue;
      throw e;
    }
  }
  throw new AppError("TRY_AGAIN", 409);
}
export async function createBooking(data: z.infer<typeof bookingSchema>) {
  const paymentSettings = await db.settings.findUniqueOrThrow({ where: { id: "main" } });
  if ((data.method === "RAZORPAY" && !paymentSettings.onlineEnabled) ||
      (data.method === "DELIVERY" && !paymentSettings.deliveryEnabled))
    throw new AppError("PAYMENT_UNAVAILABLE", 409);
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 48)
    throw new AppError("SERVICE_UNAVAILABLE", 503);
  const { expectedUnitPrice, ...orderData } = data;
  const token = createHmac("sha256", secret)
    .update(`booking:${data.requestKey}`)
    .digest("hex");
  const order = await serial(async (tx) => {
    const existing = await tx.order.findUnique({
      where: { requestKey: data.requestKey },
    });
    if (existing) return existing;
    const [product, slot, settings] = await Promise.all([
      tx.product.findUnique({ where: { id: data.productId } }),
      tx.timeSlot.findUnique({ where: { id: data.slotId } }),
      tx.settings.findUniqueOrThrow({ where: { id: "main" } }),
    ]);
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
    if (data.method === "DELIVERY" && !settings.deliveryEnabled)
      throw new AppError("PAYMENT_UNAVAILABLE", 409);
    const count = await tx.order.count({
      where: {
        date: data.date,
        slotId: data.slotId,
        status: { not: "CANCELLED" },
      },
    });
    if (count >= slot.capacity) throw new AppError("SLOT_FULL", 409);
    await tx.product.update({
      where: { id: product.id },
      data: { stock: { decrement: data.quantity } },
    });
    return tx.order.create({
      data: {
        ...orderData,
        tokenHash: hash(token),
        bookingId: `KT-${randomBytes(5).toString("hex").toUpperCase()}`,
        productNameEn: product.nameEn,
        productNameMl: product.nameMl,
        unitPrice: product.price,
        total: product.price * data.quantity,
        slotLabel: slot.label,
        reservedUntil:
          data.method === "RAZORPAY" ? new Date(Date.now() + 30 * 60000) : null,
      },
    });
  });
  return { order, token };
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
    if (["PAID", "REFUND_REQUIRED", "REFUNDED"].includes(o.paymentStatus))
      return o;
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
