import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../src/lib/db";
import {
  createBooking,
  cancelOrder,
  markCaptured,
  getPrivateOrder,
  ensureGatewayOrder,
  expireReservation,
} from "../src/lib/orders";
import { reconcileExpired, RECONCILE_JOB } from "../src/lib/reconcile";
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
      create: { ...sampleSettings, onlineEnabled: true },
      update: { leadHours: 2, maxDays: 90, deliveryEnabled: true, onlineEnabled: true },
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

      // Many simultaneous customers: stock can never oversell, nothing is lost to conflicts.
      await db.timeSlot.update({ where: { id: s.id }, data: { capacity: 1000 } });
      await db.product.update({ where: { id: p.id }, data: { stock: 6 } });
      const rush = await Promise.allSettled(
        Array.from({ length: 12 }, () =>
          createBooking({ ...base, quantity: 1, requestKey: randomUUID() }),
        ),
      );
      assert.equal(rush.filter((r) => r.status === "fulfilled").length, 6, "Exactly the available stock sells");
      assert.equal(
        (await db.product.findUniqueOrThrow({ where: { id: p.id } })).stock,
        0,
      );

      // The same request retried at once creates one booking.
      await db.product.update({ where: { id: p.id }, data: { stock: 10 } });
      const sameKey = randomUUID();
      const retries = await Promise.all(
        Array.from({ length: 5 }, () =>
          createBooking({ ...base, quantity: 1, requestKey: sameKey }),
        ),
      );
      assert.equal(new Set(retries.map((r) => r.order.id)).size, 1, "Idempotent under concurrency");
      assert.equal((await db.product.findUniqueOrThrow({ where: { id: p.id } })).stock, 9);

      // Gateway order attaches once even when retries race.
      const online = await createBooking({ ...base, quantity: 1, method: "RAZORPAY", requestKey: randomUUID() });
      let created = 0;
      const attached = await Promise.all(
        [1, 2, 3].map(() =>
          ensureGatewayOrder(online.order, async () => `order_race${tag}${++created}`),
        ),
      );
      assert.equal(new Set(attached.map((o) => o.razorpayOrderId)).size, 1);

      // Reconciliation: expired reservations settle according to what Razorpay reports.
      const expired = async (id: string, suffix: string) =>
        db.order.update({
          where: { id },
          data: { reservedUntil: new Date(Date.now() - 60000), razorpayOrderId: `order_${suffix}${tag}` },
        });
      await db.product.update({ where: { id: p.id }, data: { stock: 10 } });
      const reservation = (q = 1) =>
        createBooking({ ...base, quantity: q, method: "RAZORPAY", requestKey: randomUUID() });
      const [unpaid, captured, authorized, broken] = [await reservation(2), await reservation(), await reservation(), await reservation()];
      await expired(unpaid.order.id, "unpaid");
      await expired(captured.order.id, "captured");
      await expired(authorized.order.id, "authorized");
      await expired(broken.order.id, "broken");
      const stockBefore = (await db.product.findUniqueOrThrow({ where: { id: p.id } })).stock;
      const payment = (orderId: string, status: string) => ({ id: `pay_${status}${tag}`, order_id: orderId, amount: 4000, currency: "INR", status });
      const lookup = async (orderId: string) => {
        if (orderId.startsWith("order_broken")) throw new Error("gateway down");
        if (orderId.startsWith("order_captured")) return [payment(orderId, "captured")];
        if (orderId.startsWith("order_authorized")) return [payment(orderId, "authorized")];
        return [payment(orderId, "failed")];
      };
      const result = await reconcileExpired(lookup);
      assert.ok(result.released >= 1);
      assert.equal(result.paid, 1);
      assert.equal(result.held, 1);
      assert.equal(result.failed, 1, "One failed lookup must not stop the others");
      const after = async (id: string) => db.order.findUniqueOrThrow({ where: { id } });
      assert.equal((await after(unpaid.order.id)).status, "CANCELLED");
      assert.equal((await after(captured.order.id)).paymentStatus, "PAID");
      assert.equal((await after(authorized.order.id)).status, "PENDING", "Authorised money keeps its stock");
      assert.equal((await after(broken.order.id)).status, "PENDING", "A gateway error never releases stock");
      assert.equal((await db.product.findUniqueOrThrow({ where: { id: p.id } })).stock, stockBefore + 2);
      const rerun = await reconcileExpired(lookup);
      assert.equal(rerun.released, 0, "A second run releases nothing twice");
      assert.equal((await db.product.findUniqueOrThrow({ where: { id: p.id } })).stock, stockBefore + 2);
      assert.equal((await db.jobRun.findUniqueOrThrow({ where: { name: RECONCILE_JOB } })).lastError, "1 order(s) failed");
      assert.equal(await expireReservation((await after(captured.order.id)).id), false, "A paid order never expires");
    } finally {
      await db.order.deleteMany({ where: { productId: p.id } });
      await db.product.delete({ where: { id: p.id } });
      await db.timeSlot.delete({ where: { id: s.id } });
      await db.$disconnect();
    }
  },
);
