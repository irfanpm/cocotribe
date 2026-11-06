import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { body, sameOrigin, fail, AppError } from "@/lib/http";
import {
  productSchema,
  slotSchema,
  faqSchema,
  settingsSchema,
} from "@/lib/validation";
import { serial } from "@/lib/orders";
import { orderChangeError } from "@/lib/order-rules";
/** Field-level before/after values for the audit trail. Only submitted fields are compared. */
function changes(before: object | null, after: object) {
  const old = (before || {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(after))
    if (old[key] !== value) out[key] = { from: old[key] ?? null, to: value };
  return out;
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const admin = await requireAdmin();
    const input = z
      .object({
        kind: z.enum(["product", "stock", "slot", "faq", "settings", "order"]),
        id: z.string().max(100).optional(),
        data: z.unknown(),
      })
      .parse(await body(request));
    const { kind, id } = input;
    const entity = await serial(async (tx) => {
      let saved: unknown = null;
      let details: Record<string, unknown> = {};
      if (kind === "stock") {
        if (!id) throw new AppError("INVALID_INPUT");
        const { stock, expected } = z
          .object({
            stock: z.number().int().min(0).max(1000000),
            expected: z.number().int().optional(),
          })
          .parse(input.data);
        const before = await tx.product.findUniqueOrThrow({ where: { id } });
        // A booking may have reserved stock since the screen loaded. Never overwrite it silently.
        if (expected !== undefined && before.stock !== expected)
          throw new AppError("STOCK_CHANGED", 409);
        saved = await tx.product.update({ where: { id }, data: { stock } });
        details = changes(before, { stock });
      }
      if (kind === "product") {
        if (id) {
          // Stock has its own guarded form. A price edit must not reset reserved stock.
          const data = productSchema.omit({ stock: true }).parse(input.data);
          const before = await tx.product.findUniqueOrThrow({ where: { id } });
          saved = await tx.product.update({ where: { id }, data });
          details = changes(before, data);
        } else {
          const data = productSchema.parse(input.data);
          saved = await tx.product.create({ data });
          details = changes(null, data);
        }
      }
      if (kind === "slot") {
        const data = slotSchema.parse(input.data);
        const before = id ? await tx.timeSlot.findUniqueOrThrow({ where: { id } }) : null;
        saved = id
          ? await tx.timeSlot.update({ where: { id }, data })
          : await tx.timeSlot.create({ data });
        details = changes(before, data);
      }
      if (kind === "faq") {
        const data = faqSchema.parse(input.data);
        const before = id ? await tx.faq.findUniqueOrThrow({ where: { id } }) : null;
        saved = id
          ? await tx.faq.update({ where: { id }, data })
          : await tx.faq.create({ data });
        details = changes(before, data);
      }
      if (kind === "settings") {
        const data = settingsSchema.parse(input.data);
        const before = await tx.settings.findUniqueOrThrow({ where: { id: "main" } });
        saved = await tx.settings.update({ where: { id: "main" }, data });
        details = changes(before, data);
      }
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
        const problem = orderChangeError(o, data);
        if (problem) throw new AppError(problem, 409);
        const cancelling = data.status === "CANCELLED" && !o.stockReleased;
        if (cancelling) {
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
        details = changes(o, data);
      }
      await tx.auditLog.create({
        data: {
          adminId: admin.id,
          action: `update:${kind}`,
          entityId: id || (saved as { id?: string } | null)?.id || "new",
          details: details as Prisma.InputJsonValue,
        },
      });
      return saved;
    });
    revalidateTag("catalog", { expire: 0 });
    revalidatePath("/", "layout");
    return NextResponse.json(
      { ok: true, entity },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return fail(e);
  }
}
