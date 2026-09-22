import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { body, sameOrigin, fail, AppError } from "@/lib/http";
import {
  productSchema,
  slotSchema,
  faqSchema,
  settingsSchema,
} from "@/lib/validation";
import { serial } from "@/lib/orders";
const transitions: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const admin = await requireAdmin();
    const input = z
      .object({
        kind: z.enum(["product", "slot", "faq", "settings", "order"]),
        id: z.string().max(100).optional(),
        data: z.unknown(),
      })
      .parse(await body(request));
    const { kind, id } = input;
    await serial(async (tx) => {
      if (kind === "product") {
        const data = productSchema.parse(input.data);
        if (id) await tx.product.update({ where: { id }, data });
        else await tx.product.create({ data });
      }
      if (kind === "slot") {
        const data = slotSchema.parse(input.data);
        if (id) await tx.timeSlot.update({ where: { id }, data });
        else await tx.timeSlot.create({ data });
      }
      if (kind === "faq") {
        const data = faqSchema.parse(input.data);
        if (id) await tx.faq.update({ where: { id }, data });
        else await tx.faq.create({ data });
      }
      if (kind === "settings")
        await tx.settings.update({
          where: { id: "main" },
          data: settingsSchema.parse(input.data),
        });
      if (kind === "order") {
        if (!id) throw new AppError("INVALID_INPUT");
        const data = z
          .object({
            status: z.enum([
              "PENDING",
              "CONFIRMED",
              "PREPARING",
              "READY",
              "COMPLETED",
              "CANCELLED",
            ]),
            paymentStatus: z.enum([
              "PENDING",
              "PAID",
              "REFUND_REQUIRED",
              "REFUNDED",
            ]),
          })
          .parse(input.data);
        const o = await tx.order.findUniqueOrThrow({ where: { id } });
        if (
          data.status !== o.status &&
          !transitions[o.status].includes(data.status)
        )
          throw new AppError("INVALID_STATUS", 409);
        if (
          o.method === "RAZORPAY" &&
          data.paymentStatus !== o.paymentStatus &&
          !(
            o.paymentStatus === "REFUND_REQUIRED" &&
            data.paymentStatus === "REFUNDED"
          )
        )
          throw new AppError("PAYMENT_MANAGED_BY_GATEWAY", 409);
        if (o.paymentStatus === "PAID" && data.paymentStatus === "PENDING")
          throw new AppError("INVALID_STATUS", 409);
        if (data.status === "COMPLETED" && data.paymentStatus !== "PAID")
          throw new AppError("PAYMENT_PENDING", 409);
        if (
          o.method === "RAZORPAY" &&
          data.status !== "PENDING" &&
          data.status !== "CANCELLED" &&
          data.paymentStatus !== "PAID"
        )
          throw new AppError("PAYMENT_PENDING", 409);
        if (data.status === "CANCELLED" && !o.stockReleased) {
          await tx.product.update({
            where: { id: o.productId },
            data: { stock: { increment: o.quantity } },
          });
          if (data.paymentStatus === "PAID")
            data.paymentStatus = "REFUND_REQUIRED";
        }
        await tx.order.update({
          where: { id },
          data: {
            ...data,
            stockReleased: data.status === "CANCELLED" || o.stockReleased,
          },
        });
      }
      await tx.auditLog.create({
        data: {
          adminId: admin.id,
          action: `update:${kind}`,
          entityId: id || "new",
        },
      });
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
