/** Run only against a migrated isolated koko_test database.
 * RUN_DATABASE_TESTS=1 DATABASE_URL=... npx tsx tests/http-smoke.ts
 * Starts its own local production server on 127.0.0.1:3001.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createECDH } from "node:crypto";
import webpush from "web-push";
// @ts-expect-error http_ece ships without types; it is web-push's own encryption library.
import ece from "http_ece";
import { randomUUID, randomBytes, createHmac } from "node:crypto";
import { hash as passwordHash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { indiaDate } from "../src/lib/validation";
const db = new PrismaClient();
const origin = "http://127.0.0.1:3001";
async function main() {
  assert.equal(process.env.RUN_DATABASE_TESTS, "1");
  assert.match(process.env.DATABASE_URL || "", /koko_test/);
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
  const webhookSecret = randomBytes(32).toString("hex");
  const cronSecret = randomBytes(32).toString("hex");
  // A stand-in for Meta's WhatsApp API that records what would have been sent.
  const alerts: { path: string; auth?: string; body: { to: string; template: { name: string; components: { parameters: { text: string }[] }[] } } }[] = [];
  const whatsapp = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      alerts.push({ path: req.url || "", auth: req.headers.authorization, body: JSON.parse(raw) });
      res.writeHead(200, { "Content-Type": "application/json" }).end('{"messages":[{"id":"wamid.test"}]}');
    });
  }).listen(3999, "127.0.0.1");
  // A stand-in for a browser push service over HTTPS, as web-push only sends to https.
  const certDir = mkdtempSync(join(tmpdir(), "koko-push-"));
  execFileSync("openssl", ["req", "-x509", "-newkey", "ec", "-pkeyopt", "ec_paramgen_curve:prime256v1", "-nodes", "-keyout", join(certDir, "key.pem"), "-out", join(certDir, "cert.pem"), "-days", "1", "-subj", "/CN=127.0.0.1"], { stdio: "ignore" });
  const pushes: { path: string; headers: Record<string, string | string[] | undefined>; body: Buffer }[] = [];
  const pushService = createHttpsServer({ key: readFileSync(join(certDir, "key.pem")), cert: readFileSync(join(certDir, "cert.pem")) }, (req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      pushes.push({ path: req.url || "", headers: req.headers, body: Buffer.concat(chunks) });
      res.writeHead(req.url === "/push/gone" ? 410 : 201).end();
    });
  }).listen(3998, "127.0.0.1");
  const vapid = webpush.generateVAPIDKeys();
  const phone = createECDH("prime256v1");
  phone.generateKeys();
  const phoneAuth = randomBytes(16);
  const b64url = (b: Buffer) => b.toString("base64url");
  const readPush = (body: Buffer) =>
    JSON.parse(ece.decrypt(body, { version: "aes128gcm", privateKey: phone, authSecret: phoneAuth }).toString("utf8"));
  const waitForPushes = async (n: number) => {
    for (let i = 0; i < 40 && pushes.length < n; i++) await new Promise((r) => setTimeout(r, 100));
    return pushes.length;
  };
  const alertTexts = () => alerts.map((a) => a.body.template.components[0].parameters.map((p) => p.text));
  const waitForAlerts = async (n: number) => {
    for (let i = 0; i < 40 && alerts.length < n; i++) await new Promise((r) => setTimeout(r, 100));
    return alerts.length;
  };
  const server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3001",
    ],
    {
      env: {
        ...process.env,
        DEMO_MODE: "false",
        APP_URL: origin,
        SESSION_SECRET: randomBytes(48).toString("hex"),
        RAZORPAY_WEBHOOK_SECRET: webhookSecret,
        CRON_SECRET: cronSecret,
        WHATSAPP_TOKEN: "test-whatsapp-token",
        WHATSAPP_PHONE_NUMBER_ID: "555",
        OWNER_WHATSAPP: "918111935267",
        WHATSAPP_API_BASE: "http://127.0.0.1:3999",
        VAPID_PUBLIC_KEY: vapid.publicKey,
        VAPID_PRIVATE_KEY: vapid.privateKey,
        VAPID_SUBJECT: "mailto:test@example.invalid",
        // Test-only: the stand-in push service is local with a self-signed certificate.
        PUSH_ALLOW_ANY_ENDPOINT: "1",
        NODE_TLS_REJECT_UNAUTHORIZED: "0",
        // Never reach the real gateway from these tests.
        RAZORPAY_KEY_ID: "",
        RAZORPAY_KEY_SECRET: "",
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
  let logs = "";
  server.stdout.on("data", (b) => {
    logs += b.toString();
  });
  server.stderr.on("data", (b) => {
    logs += b.toString();
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
    assert(ready, logs);
    for (const path of [
      "/",
      "/products",
      `/products/http-${tag}`,
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
    assert.match(setCookie, /Secure/i);
    const cookie = setCookie.split(";")[0];

    // Phone notifications: only a signed-in admin can register a device.
    const device = { endpoint: "https://127.0.0.1:3998/push/phone", keys: { p256dh: b64url(phone.getPublicKey()), auth: b64url(phoneAuth) }, label: "Android · Chrome" };
    assert.equal((await post("/api/admin/push", device)).status, 401);
    assert.equal((await post("/api/admin/push", device, cookie)).status, 200);
    assert.equal(
      (await post("/api/admin/push", { ...device, endpoint: "https://127.0.0.1:3998/push/gone" }, cookie)).status,
      200,
    );
    assert.equal(await db.pushSubscription.count(), 2);
    const pushTest = await post("/api/admin/push/test", { endpoint: device.endpoint }, cookie);
    assert.equal(pushTest.status, 200);
    assert.equal((await pushTest.json()).sent, 1, "the test goes only to this device");
    assert.equal(pushes.length, 1);
    assert.equal(readPush(pushes[0].body).title, "Test notification · ₹50");
    assert.equal(pushes[0].headers["content-encoding"], "aes128gcm", "payload is encrypted for the phone");
    assert.match(String(pushes[0].headers.authorization), /^vapid t=.+, k=/);
    assert.equal(pushes[0].headers.urgency, "high");
    const base = {
      name: `Smoke ${tag}`,
      phone: "9999999999",
      productId: product.id,
      quantity: 3,
      expectedUnitPrice: 4000,
      date: indiaDate(new Date(Date.now() + 5 * 86400000)),
      slotId: slot.id,
      notes: "Automated isolated test",
      method: "DELIVERY",
      language: "ml",
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
    // Status from a WhatsApp link: needs the booking's phone number, in any common format.
    const statusPath = `/api/bookings/${booking.order.bookingId}`;
    const byPhone = await post(statusPath, { phone: "+91 99999 99999" });
    assert.equal(byPhone.status, 200);
    const seen = await byPhone.json();
    assert.equal(seen.status, "PENDING");
    assert.equal(seen.gateway, null, "paying still needs the private link");
    const wrongPhone = await post(statusPath, { phone: "9888888888" });
    assert.equal(wrongPhone.status, 404);
    assert.equal((await wrongPhone.json()).error, "STATUS_NOT_FOUND");
    assert.equal((await post(statusPath, { phone: "9999999999" }, "", "https://evil.example")).status, 403);
    for (let i = 0; i < 8; i++) await post(statusPath, { phone: "9888888888" });
    assert.equal((await post(statusPath, { phone: "9999999999" })).status, 429, "guessing is rate limited per booking");
    assert.equal(await waitForAlerts(1), 1, "one alert for a new booking, none for the retry");
    await new Promise((r) => setTimeout(r, 500));
    assert.equal(alerts.length, 1, "the retried request sends no second alert");
    assert.equal(alerts[0].path, "/555/messages");
    assert.equal(alerts[0].auth, "Bearer test-whatsapp-token");
    assert.equal(alerts[0].body.to, "918111935267");
    assert.equal(alertTexts()[0][0], "New booking");
    assert.equal(alertTexts()[0][1], booking.order.bookingId);
    // The new booking reached both registered devices; the one that left is removed.
    assert.equal(await waitForPushes(3), 3);
    const sent = pushes.slice(1);
    const toPhone = sent.find((p) => p.path === "/push/phone")!;
    const message = readPush(toPhone.body);
    assert.match(message.title, /^New booking · ₹120$/);
    assert.match(message.body, new RegExp(booking.order.bookingId));
    assert.equal(message.url, "/admin?booking=" + booking.order.bookingId, "tapping opens this order");
    for (let i = 0; i < 20 && (await db.pushSubscription.count()) !== 1; i++) await new Promise((r) => setTimeout(r, 100));
    assert.equal(await db.pushSubscription.count(), 1, "a device that turned notifications off is forgotten");
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
    const alertsBeforeConfirm = alerts.length;
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
    assert.equal(await waitForAlerts(alertsBeforeConfirm + 1), alertsBeforeConfirm + 1);
    await new Promise((r) => setTimeout(r, 300));
    assert.deepEqual(
      alertTexts().slice(alertsBeforeConfirm).map((t) => t[0]),
      ["Order confirmed"],
      "only confirming sends an alert, not preparing, ready or completed",
    );
    const testAlert = await post("/api/admin/notify-test", {}, cookie);
    assert.equal(testAlert.status, 200);
    assert.deepEqual(await testAlert.json(), { sent: true });
    assert.equal(alertTexts().at(-1)![0], "Test alert from the admin panel");
    assert.equal((await post("/api/admin/notify-test", {})).status, 401, "test alert needs admin sign-in");
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
    const paymentBooking = await db.order.create({
      data: {
        bookingId: `TEST-${tag}`,
        tokenHash: randomBytes(32).toString("hex"),
        requestKey: randomUUID(),
        name: base.name,
        phone: "919999999999",
        productId: product.id,
        productNameEn: product.nameEn,
        productNameMl: product.nameMl,
        quantity: 1,
        unitPrice: 4000,
        total: 4000,
        date: base.date,
        slotId: slot.id,
        slotLabel: slot.label,
        method: "RAZORPAY",
        razorpayOrderId: `order_${tag}`,
      },
    });
    const payload = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: `pay_${tag}`,
            order_id: `order_${tag}`,
            amount: 4000,
            currency: "INR",
            status: "captured",
          },
        },
      },
    });
    const webhook = (sig: string) =>
      fetch(origin + "/api/payments/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-razorpay-signature": sig,
        },
        body: payload,
      });
    assert.equal((await webhook("0".repeat(64))).status, 403);
    const sig = createHmac("sha256", webhookSecret)
      .update(payload)
      .digest("hex");
    const alertsBeforePayment = alerts.length;
    assert.equal((await webhook(sig)).status, 200);
    assert.equal((await webhook(sig)).status, 200);
    await waitForAlerts(alertsBeforePayment + 1);
    await new Promise((r) => setTimeout(r, 500));
    assert.deepEqual(
      alertTexts().slice(alertsBeforePayment).map((t) => t[0]),
      ["New booking, paid online"],
      "a paid online booking alerts once, even when Razorpay repeats the webhook",
    );
    assert.equal(
      (await db.order.findUniqueOrThrow({ where: { id: paymentBooking.id } }))
        .paymentStatus,
      "PAID",
    );
    // A correctly signed event for an unknown order is accepted so Razorpay does not disable the webhook.
    const unknown = payload.replaceAll(`order_${tag}`, "order_unknown");
    const unknownResponse = await fetch(origin + "/api/payments/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": createHmac("sha256", webhookSecret).update(unknown).digest("hex"),
      },
      body: unknown,
    });
    assert.equal(unknownResponse.status, 200);

    // Scheduled job and health check.
    assert.equal((await fetch(origin + "/api/cron/reconcile")).status, 401);
    assert.equal(
      (await fetch(origin + "/api/cron/reconcile", { headers: { Authorization: "Bearer wrong" } })).status,
      401,
    );
    const cron = await fetch(origin + "/api/cron/reconcile", {
      headers: { Authorization: `Bearer ${cronSecret}` },
    });
    assert.equal(cron.status, 200);
    assert.equal((await cron.json()).failed, 0);
    const health = await fetch(origin + "/api/health");
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: "ok" }, "Public health shows no details");
    const detailed = await fetch(origin + "/api/health", {
      headers: { Authorization: `Bearer ${cronSecret}` },
    });
    assert.ok((await detailed.json()).reconcile.lastSuccessAt);

    // Privacy: no public caching, no secrets in pages, crawlers kept out.
    for (const path of ["/api/admin/data", "/api/health", "/admin/login", "/book", "/booking/KT-TEST"]) {
      const response = await fetch(origin + path);
      assert.match(response.headers.get("cache-control") || "", /no-store/, `${path} must not be cached`);
      assert.doesNotMatch(response.headers.get("cache-control") || "", /public/, path);
    }
    const home = await fetch(origin + "/");
    assert.match(home.headers.get("content-security-policy") || "", /frame-ancestors 'none'/);
    assert.match(home.headers.get("strict-transport-security") || "", /max-age=/);
    const html = await home.text();
    for (const secret of [webhookSecret, cronSecret, process.env.DATABASE_URL || "unset"])
      assert.equal(html.includes(secret), false);
    assert.match(await (await fetch(origin + "/robots.txt")).text(), /Disallow: \/admin/);

    // Stock safety: a stale screen cannot overwrite a newer reservation, and price edits keep stock.
    const adminProduct = dash.products.find((p: { id: string }) => p.id === product.id);
    const stockNow = (await db.product.findUniqueOrThrow({ where: { id: product.id } })).stock;
    assert.equal(
      (await post("/api/admin/manage", { kind: "stock", id: product.id, data: { stock: 99, expected: stockNow + 1 } }, cookie)).status,
      409,
    );
    const { id: _id, createdAt: _createdAt, ...productFields } = adminProduct;
    const edit = await post(
      "/api/admin/manage",
      { kind: "product", id: product.id, data: { ...productFields, image: "/images/products/pooja-coconut.webp", price: 4500, stock: 999 } },
      cookie,
    );
    assert.equal(edit.status, 200, "Products with images in sub-folders can be edited");
    const edited = await db.product.findUniqueOrThrow({ where: { id: product.id } });
    assert.equal(edited.price, 4500);
    assert.equal(edited.stock, stockNow, "Editing a product never changes stock");
    const audit = await db.auditLog.findFirst({
      where: { adminId: admin.id, action: "update:product" },
      orderBy: { createdAt: "desc" },
    });
    assert.deepEqual((audit?.details as Record<string, unknown>).price, { from: 4000, to: 4500 });
    assert.equal(await db.auditLog.count({ where: { adminId: admin.id, action: "login" } }), 1);

    const del = await fetch(origin + "/api/admin/push", { method: "DELETE", headers: { Origin: origin, "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify({ endpoint: device.endpoint }) });
    assert.equal(del.status, 200);
    assert.equal(await db.pushSubscription.count(), 0, "turning off removes the device");
    // A device the server does not know is reported so the page can save it again.
    const unregistered = await post("/api/admin/push/test", { endpoint: device.endpoint }, cookie);
    assert.equal(unregistered.status, 502);
    assert.equal((await unregistered.json()).reason, "NOT_REGISTERED");
    // The page re-saves its device on every visit; that is logged once, not every time.
    const turnedOn = () => db.auditLog.count({ where: { action: "push:turned-on" } });
    const before = await turnedOn();
    assert.equal((await post("/api/admin/push", device, cookie)).status, 200);
    assert.equal((await post("/api/admin/push", device, cookie)).status, 200);
    assert.equal(await turnedOn(), before + 1);
    assert.equal((await post("/api/admin/logout", {}, cookie)).status, 200);
    assert.equal(
      (await fetch(origin + "/api/admin/data", { headers: { Cookie: cookie } }))
        .status,
      401,
      "Logout revokes token",
    );
    console.log(
      "HTTP checks passed: 11 pages, origin protection, auth/cookies, price protection, booking/idempotency, private access, admin filters/transitions, contact validation, signed webhook/replay and logout revocation.",
    );
  } finally {
    whatsapp.close();
    pushService.close();
    await db.pushSubscription.deleteMany({ where: { endpoint: { startsWith: "https://127.0.0.1:3998/" } } });
    server.kill();
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
  console.error(e);
  process.exitCode = 1;
});
