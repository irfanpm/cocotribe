/** Opt-in live Supabase check using temporary fixtures; cleans up only its own records. */
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { hash as passwordHash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { indiaDate } from "../src/lib/validation";
const db = new PrismaClient();
const origin = "http://127.0.0.1:3000";
async function main() {
  assert.equal(process.env.RUN_DATABASE_TESTS, "1");
  assert.match(process.env.DATABASE_URL || "", /postgres\.lyypjkfumbackxarkgna/);
  const tag = randomUUID(),
    email = `test-${tag}@example.invalid`,
    password = randomBytes(24).toString("hex");
  const admin = await db.admin.create({
    data: { email, passwordHash: await passwordHash(password, 12) },
  });
  const product = await db.product.create({
    data: {
      slug: `http-${tag}`,
      nameEn: "HTTP Test Coconut",
      nameMl: "പരീക്ഷണ തേങ്ങ",
      descriptionEn: "Test",
      descriptionMl: "പരീക്ഷണം",
      price: 4000,
      image: "/images/fresh.jpg",
      stock: 20,
    },
  });
  const slot = await db.timeSlot.create({
    data: { label: "Test 09:00", startMinute: 540, capacity: 10 },
  });
  const post = (
    path: string,
    data: unknown,
    cookie = "",
    requestOrigin = origin,
  ) =>
    fetch(origin + path, {
      method: "POST",
      headers: {
        Origin: requestOrigin,
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify(data),
    });
  try {
    let ready = false;
    for (let i = 0; i < 50; i++) {
      try {
        const r = await fetch(origin);
        if (r.ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 200));
    }
    assert(ready, "Local website not responding");
    for (const path of [
      "/",
      "/products",
      "/products/fresh-coconut",
      "/book",
      "/services",
      "/about",
      "/faq",
      "/contact",
      "/terms",
      "/privacy",
      "/admin/login",
    ])
      assert.equal((await fetch(origin + path)).status, 200, path);
    assert.equal((await fetch(origin + "/api/admin/data")).status, 401);
    assert.equal(
      (await post("/api/admin/manage", { kind: "settings", data: {} })).status,
      401,
    );
    assert.equal(
      (
        await post(
          "/api/admin/login",
          { email, password },
          "",
          "https://attacker.invalid",
        )
      ).status,
      403,
    );
    assert.equal(
      (await post("/api/admin/login", { email, password: "incorrect" })).status,
      401,
    );
    const login = await post("/api/admin/login", { email, password });
    assert.equal(login.status, 200);
    const setCookie = login.headers.get("set-cookie") || "";
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=strict/i);
    // Local development uses HTTP; production enables Secure cookies.
    const cookie = setCookie.split(";")[0];
    const base = {
      name: `Smoke ${tag}`,
      phone: "9999999988",
      productId: product.id,
      quantity: 3,
      expectedUnitPrice: 4000,
      date: indiaDate(new Date(Date.now() + 5 * 86400000)),
      slotId: slot.id,
      notes: "Automated isolated test",
      method: "DELIVERY",
      language: "ta",
      requestKey: randomUUID(),
    };
    assert.equal(
      (await post("/api/bookings", { ...base, expectedUnitPrice: 1 })).status,
      409,
      "Stale price rejected",
    );
    const response = await post("/api/bookings", { ...base, total: 1 });
    assert.equal(response.status, 201);
    const booking = await response.json();
    assert.equal(booking.order.total, 12000, "Server controls pricing");
    assert.equal(booking.order.status, "PENDING");
    const duplicate = await (await post("/api/bookings", base)).json();
    assert.equal(duplicate.order.bookingId, booking.order.bookingId);
    assert.equal(
      (await fetch(origin + "/api/bookings/" + booking.order.bookingId)).status,
      404,
    );
    const privateRes = await fetch(
      origin + "/api/bookings/" + booking.order.bookingId,
      { headers: { Authorization: `Bearer ${booking.token}` } },
    );
    assert.equal(privateRes.status, 200);
    const privateOrder = await privateRes.json();
    assert(!("tokenHash" in privateOrder));
    assert(!("requestKey" in privateOrder));
    const dashboard = await fetch(
      origin + "/api/admin/data?search=" + encodeURIComponent(base.name),
      { headers: { Cookie: cookie } },
    );
    assert.equal(dashboard.status, 200);
    const dash = await dashboard.json();
    assert.equal(dash.count, 1);
    assert.equal(dash.orders[0].bookingId, booking.order.bookingId);
    assert(!("tokenHash" in dash.orders[0]));
    const orderId = dash.orders[0].id;
    assert.equal(
      (
        await post(
          "/api/admin/manage",
          {
            kind: "order",
            id: orderId,
            data: { status: "COMPLETED", paymentStatus: "PENDING" },
          },
          cookie,
        )
      ).status,
      409,
    );
    for (const status of ["CONFIRMED", "PREPARING", "READY"])
      assert.equal(
        (
          await post(
            "/api/admin/manage",
            {
              kind: "order",
              id: orderId,
              data: { status, paymentStatus: "PENDING" },
            },
            cookie,
          )
        ).status,
        200,
      );
    assert.equal(
      (
        await post(
          "/api/admin/manage",
          {
            kind: "order",
            id: orderId,
            data: { status: "COMPLETED", paymentStatus: "PAID" },
          },
          cookie,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await post("/api/contact", {
          name: base.name,
          phone: base.phone,
          message: "Isolated contact form test message.",
          website: "",
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await post("/api/contact", {
          name: base.name,
          phone: base.phone,
          message: "Spam test",
          website: "https://spam.invalid",
        })
      ).status,
      400,
    );
    const stored = await db.order.findUniqueOrThrow({where:{id:orderId}});
    assert.equal(stored.status,"COMPLETED"); assert.equal(stored.paymentStatus,"PAID");
    assert.equal(await db.contactMessage.count({where:{name:base.name}}),1);
    console.log("PASS: booking and contact persisted in Supabase; completed order and payment status persisted.");
    assert.equal((await post("/api/admin/logout", {}, cookie)).status, 200);
    assert.equal(
      (await fetch(origin + "/api/admin/data", { headers: { Cookie: cookie } }))
        .status,
      401,
      "Logout revokes token",
    );
    console.log(
      "HTTP checks passed: 11 pages, origin protection, auth/cookies, price protection, booking/idempotency, private access, admin filters/transitions, contact persistence and logout revocation.",
    );
  } finally {

    await db.auditLog.deleteMany({ where: { adminId: admin.id } });
    await db.contactMessage.deleteMany({ where: { name: `Smoke ${tag}` } });
    await db.order.deleteMany({ where: { productId: product.id } });
    await db.product.delete({ where: { id: product.id } });
    await db.timeSlot.delete({ where: { id: slot.id } });
    await db.admin.delete({ where: { id: admin.id } });
    await db.$disconnect();
  }
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : "CHECK_FAILED");
  process.exitCode = 1;
});
