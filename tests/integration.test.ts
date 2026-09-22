import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../src/lib/db";
import {
  createBooking,
  cancelOrder,
  markCaptured,
  getPrivateOrder,
} from "../src/lib/orders";
import { sampleSettings } from "../src/lib/demo";
import { indiaDate } from "../src/lib/validation";
const enabled = process.env.RUN_DATABASE_TESTS === "1";
test(
  "PostgreSQL: concurrency, idempotency, capacity, private access and payment safety",
  { skip: !enabled },
  async () => {
    assert.match(
      process.env.DATABASE_URL || "",
      /koko_test/,
      "Use an isolated database named koko_test.",
    );
    process.env.SESSION_SECRET = "integration-test-secret-only-".repeat(3);
    await db.settings.upsert({
      where: { id: "main" },
      create: sampleSettings,
      update: { leadHours: 2, maxDays: 90, deliveryEnabled: true },
    });
    const tag = randomUUID();
    const p = await db.product.create({
      data: {
        slug: `test-${tag}`,
        nameEn: "Test Coconut",
        nameMl: "പരീക്ഷണ തേങ്ങ",
        descriptionEn: "Test",
        descriptionMl: "പരീക്ഷണം",
        price: 4000,
        image: "/images/fresh.jpg",
        stock: 5,
      },
    });
    const s = await db.timeSlot.create({
      data: { label: "Test 09:00", startMinute: 540, capacity: 20 },
    });
    const base = {
      name: "Integration test",
      phone: "919999999999",
      productId: p.id,
      quantity: 4,
      expectedUnitPrice: 4000,
      date: indiaDate(new Date(Date.now() + 3 * 86400000)),
      slotId: s.id,
      notes: "Test only",
      method: "DELIVERY" as const,
      language: "en" as const,
    };
    try {
      const results = await Promise.allSettled([
        createBooking({ ...base, requestKey: randomUUID() }),
        createBooking({ ...base, requestKey: randomUUID() }),
      ]);
      assert.equal(
        results.filter((r) => r.status === "fulfilled").length,
        1,
        "Only one competing reservation succeeds",
      );
      assert.equal(
        (await db.product.findUniqueOrThrow({ where: { id: p.id } })).stock,
        1,
      );
      const winner = results.find(
        (r) => r.status === "fulfilled",
      ) as PromiseFulfilledResult<Awaited<ReturnType<typeof createBooking>>>;
      const { order, token } = winner.value;
      const retry = await createBooking({
        ...base,
        requestKey: order.requestKey,
      });
      assert.equal(retry.order.id, order.id);
      assert.equal(retry.token, token);
      assert.equal(
        (await db.product.findUniqueOrThrow({ where: { id: p.id } })).stock,
        1,
      );
      assert.equal(
        (await getPrivateOrder(order.bookingId, token)).id,
        order.id,
      );
      await assert.rejects(getPrivateOrder(order.bookingId, "0".repeat(64)));
      await Promise.all([cancelOrder(order.id), cancelOrder(order.id)]);
      assert.equal(
        (await db.product.findUniqueOrThrow({ where: { id: p.id } })).stock,
        5,
        "Cancellation restores stock exactly once",
      );
      await db.timeSlot.update({ where: { id: s.id }, data: { capacity: 1 } });
      const limited = await Promise.allSettled([
        createBooking({ ...base, quantity: 1, requestKey: randomUUID() }),
        createBooking({ ...base, quantity: 1, requestKey: randomUUID() }),
      ]);
      assert.equal(
        limited.filter((r) => r.status === "fulfilled").length,
        1,
        "Slot capacity is atomic",
      );
      const pending = (
        limited.find((r) => r.status === "fulfilled") as PromiseFulfilledResult<
          Awaited<ReturnType<typeof createBooking>>
        >
      ).value.order;
      await db.order.update({
        where: { id: pending.id },
        data: {
          method: "RAZORPAY",
          razorpayOrderId: `order_test${tag.replaceAll("-", "")}`,
        },
      });
      const gatewayId = `order_test${tag.replaceAll("-", "")}`;
      await assert.rejects(
        markCaptured(gatewayId, "pay_test", 1, "INR"),
        "Amount mismatch must not mark paid",
      );
      await markCaptured(gatewayId, "pay_test", 4000, "INR");
      await markCaptured(gatewayId, "pay_test", 4000, "INR");
      assert.equal(
        (await db.order.findUniqueOrThrow({ where: { id: pending.id } }))
          .status,
        "CONFIRMED",
      );
      await cancelOrder(pending.id);
      assert.equal(
        (await db.order.findUniqueOrThrow({ where: { id: pending.id } }))
          .paymentStatus,
        "REFUND_REQUIRED",
      );
      await markCaptured(gatewayId, "pay_test", 4000, "INR");
      assert.equal(
        (await db.product.findUniqueOrThrow({ where: { id: p.id } })).stock,
        5,
      );
      const late = await createBooking({
        ...base,
        quantity: 1,
        method: "RAZORPAY",
        requestKey: randomUUID(),
      });
      await db.order.update({
        where: { id: late.order.id },
        data: { razorpayOrderId: `order_late${tag}` },
      });
      await cancelOrder(late.order.id);
      await markCaptured(`order_late${tag}`, "pay_late", 4000, "INR");
      assert.equal(
        (await db.order.findUniqueOrThrow({ where: { id: late.order.id } }))
          .paymentStatus,
        "REFUND_REQUIRED",
        "Late payments are flagged for refund, never fulfilled without stock",
      );
    } finally {
      await db.order.deleteMany({ where: { productId: p.id } });
      await db.product.delete({ where: { id: p.id } });
      await db.timeSlot.delete({ where: { id: s.id } });
      await db.$disconnect();
    }
  },
);
