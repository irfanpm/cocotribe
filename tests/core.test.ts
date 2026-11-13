import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  bookingSchema,
  phoneSchema,
  validBookingTime,
  indiaDate,
} from "../src/lib/validation";
import { checkSignature } from "../src/lib/security";
import { productSchema } from "../src/lib/validation";
import { orderChangeError, nextOrderStatuses, nextPaymentStatuses } from "../src/lib/order-rules";
import { hasCronSecret } from "../src/lib/cron-auth";
import { safeError } from "../src/lib/monitor";
import { clientIp } from "../src/lib/http";
import { currentProducts } from "../src/lib/product-catalog";
import { orderUpdateLink, orderUpdateMessage } from "../src/lib/order-messages";
import { alertRequest, alertValues, sendWhatsAppAlert, templateValue } from "../src/lib/notify";
import { allowedPushEndpoint, pushMessage } from "../src/lib/push";
test("Every catalogue image path passes the admin product form", () => {
  for (const p of currentProducts)
    assert.equal(productSchema.safeParse(p).success, true, p.slug);
  for (const image of ["/images/../secret.png", "/images/x.svg", "https://evil.test/a.png", "/images/a/../../b.jpg"])
    assert.equal(productSchema.safeParse({ ...currentProducts[0], image }).success, false, image);
});
test("Owner's catalogue prices are preserved", () => {
  const rupees = Object.fromEntries(currentProducts.map((p) => [p.slug, p.price / 100]));
  assert.deepEqual(rupees, {
    "pooja-coconut-2": 50, "pooja-coconut-5": 125, "pooja-coconut-10": 250,
    "normal-coconut-2": 70, "normal-coconut-5": 175, "normal-coconut-10": 350,
    "coconut-oil-1-litre": 320, "coconut-oil-1-kg": 350,
    "desiccated-coconut-100g": 65, "roasted-coconut-100g": 60,
  });
});
test("Order status moves one step forward or cancels; finished orders cannot reopen", () => {
  const delivery = { method: "DELIVERY", paymentStatus: "PENDING" };
  const check = (status: string, to: string, paymentStatus = "PENDING") =>
    orderChangeError({ ...delivery, status }, { status: to, paymentStatus });
  assert.equal(check("PENDING", "CONFIRMED"), null);
  assert.equal(check("PENDING", "READY"), "INVALID_STATUS");
  assert.equal(check("READY", "COMPLETED"), "PAYMENT_PENDING");
  assert.equal(check("READY", "COMPLETED", "PAID"), null);
  assert.equal(check("COMPLETED", "PENDING"), "INVALID_STATUS");
  assert.equal(check("CANCELLED", "CONFIRMED"), "INVALID_STATUS");
  assert.deepEqual(nextOrderStatuses("COMPLETED"), ["COMPLETED"]);
});
test("Staff cannot mark online orders paid, and refunds close in order", () => {
  const online = (status: string, paymentStatus: string) => ({ method: "RAZORPAY", status, paymentStatus });
  assert.equal(
    orderChangeError(online("PENDING", "PENDING"), { status: "PENDING", paymentStatus: "PAID" }),
    "PAYMENT_MANAGED_BY_GATEWAY",
  );
  assert.equal(
    orderChangeError(online("PENDING", "PENDING"), { status: "CONFIRMED", paymentStatus: "PENDING" }),
    "PAYMENT_PENDING",
  );
  assert.equal(
    orderChangeError(online("CANCELLED", "REFUND_REQUIRED"), { status: "CANCELLED", paymentStatus: "REFUNDED" }),
    null,
  );
  assert.equal(
    orderChangeError({ method: "DELIVERY", status: "CANCELLED", paymentStatus: "PENDING" }, { status: "CANCELLED", paymentStatus: "PAID" }),
    "INVALID_STATUS",
  );
  assert.equal(
    orderChangeError({ method: "DELIVERY", status: "COMPLETED", paymentStatus: "REFUNDED" }, { status: "COMPLETED", paymentStatus: "PAID" }),
    "INVALID_STATUS",
  );
  assert.deepEqual(nextPaymentStatuses("RAZORPAY", "PENDING"), ["PENDING"]);
});
test("Cron access needs the exact secret, and a weak or missing secret never matches", () => {
  const withAuth = (value?: string) =>
    new Request("https://x.test/", value ? { headers: { authorization: value } } : {});
  const saved = process.env.CRON_SECRET;
  try {
    delete process.env.CRON_SECRET;
    assert.equal(hasCronSecret(withAuth("Bearer ")), false);
    process.env.CRON_SECRET = "short";
    assert.equal(hasCronSecret(withAuth("Bearer short")), false);
    process.env.CRON_SECRET = "c".repeat(40);
    assert.equal(hasCronSecret(withAuth(`Bearer ${"c".repeat(40)}`)), true);
    assert.equal(hasCronSecret(withAuth(`Bearer ${"d".repeat(40)}`)), false);
    assert.equal(hasCronSecret(withAuth()), false);
  } finally {
    process.env.CRON_SECRET = saved;
  }
});
test("Logged errors never include the raw message, which can hold connection details", () => {
  const error = Object.assign(new Error("Can't reach postgresql://user:pass@host:5432/db"), { code: "P1001" });
  const logged = JSON.stringify(safeError(error));
  assert.equal(logged.includes("pass"), false);
  assert.equal(logged.includes("host"), false);
  assert.match(logged, /P1001/);
});
test("Customer update message uses their language and links to their number", () => {
  const order = {
    bookingId: "KT-TEST1", name: "Asha", phone: "919000090000",
    productNameEn: "Pooja Coconut · Mini Pack (2 pcs)", productNameMl: "പൂജാ തേങ്ങ · മിനി പാക്ക് (2 എണ്ണം)",
    quantity: 2, date: "2026-11-20", slotLabel: "06:00 – 09:00", status: "CONFIRMED", paymentStatus: "PAID",
  };
  const expected: Record<string, RegExp[]> = {
    en: [/Hello Asha/, /Order status: Confirmed/, /Payment status: Paid/, /Mini Pack/],
    ml: [/നമസ്കാരം Asha/, /സ്ഥിരീകരിച്ചു/, /പണമടച്ചു/, /മിനി പാക്ക്/],
    ta: [/வணக்கம் Asha/, /கட்டண நிலை/],
    hi: [/नमस्ते Asha/, /भुगतान की स्थिति/],
  };
  for (const [language, patterns] of Object.entries(expected)) {
    const message = orderUpdateMessage({ ...order, language });
    assert.match(message, /KT-TEST1/);
    for (const pattern of patterns) assert.match(message, pattern);
    if (language === "ta" || language === "hi")
      assert.doesNotMatch(message, /Confirmed|Paid|Mini Pack/, "no English left in the message");
  }
  assert.match(orderUpdateMessage(order), /Hello Asha/, "older orders default to English");
  const link = new URL(orderUpdateLink({ ...order, name: "A & B?" }));
  assert.equal(link.pathname, "/919000090000");
  assert.match(link.searchParams.get("text") || "", /A & B\?/, "special characters stay inside the message");
  // The customer gets a status link (which asks for their phone number) and a link to book again.
  const withLinks = orderUpdateMessage(order, "https://shop.example/");
  assert.match(withLinks, /Check your order status any time: https:\/\/shop\.example\/booking\/KT-TEST1\n/);
  assert.match(withLinks, /Book again: https:\/\/shop\.example\/book\n/);
  assert.match(orderUpdateMessage({ ...order, language: "ml" }, "https://shop.example"), /വീണ്ടും ബുക്ക് ചെയ്യാം: https:\/\/shop\.example\/book/);
  assert.doesNotMatch(withLinks, /#|token/i, "no private link token in a message");
});
test("Owner WhatsApp alerts stay off until fully configured, then send an approved template", async () => {
  const alert = {
    event: "NEW_BOOKING" as const, bookingId: "KT-A1", name: "Asha\nK", phone: "919000090000",
    productNameEn: "Pooja Coconut · Temple Pack (10 pcs)", quantity: 2, date: "2026-11-20",
    slotLabel: "06:00 – 09:00", method: "DELIVERY", paymentStatus: "PENDING", total: 50000,
  };
  const saved = { ...process.env };
  try {
    delete process.env.WHATSAPP_TOKEN;
    process.env.WHATSAPP_PHONE_NUMBER_ID = "123";
    process.env.OWNER_WHATSAPP = "+91 81119 35267";
    assert.equal(alertRequest(alert), null, "no token, no request");
    assert.deepEqual(await sendWhatsAppAlert(alert), { sent: false, reason: "NOT_CONFIGURED" });
    process.env.WHATSAPP_TOKEN = "test-token";
    const request = alertRequest(alert)!;
    assert.equal(request.url, "https://graph.facebook.com/v23.0/123/messages");
    const sent = JSON.parse(request.init.body);
    assert.equal(sent.to, "918111935267", "owner number normalised");
    assert.equal(sent.type, "template");
    assert.equal(sent.template.name, "booking_alert");
    const values = sent.template.components[0].parameters.map((p: { text: string }) => p.text);
    assert.equal(values.length, 7);
    assert.deepEqual(values, alertValues(alert));
    assert.equal(values[0], "New booking");
    assert.equal(values[2], "Asha K (+919000090000)", "line breaks removed, as Meta requires");
    assert.equal(values[6], "Rs 500");
    assert.ok(values.every((v: string) => !/[\n\t]| {2,}/.test(v)));
    assert.equal(templateValue("   "), "-");
    assert.equal(templateValue("x".repeat(500)).length, 200);
  } finally {
    process.env = saved;
  }
});
test("Admin phone notifications: readable message, opens the order, only real push services", () => {
  const m = pushMessage({
    event: "NEW_BOOKING", bookingId: "KT-AB12", name: "Asha", phone: "919000090000",
    productNameEn: "Pooja Coconut · Temple Pack (10 pcs)", quantity: 2, date: "2026-11-20",
    slotLabel: "06:00 – 09:00", method: "DELIVERY", paymentStatus: "PENDING", total: 50000,
  });
  assert.equal(m.title, "New booking · ₹500");
  assert.match(m.body, /Asha · 2 × Pooja Coconut Temple Pack \(10 pcs\) · 2026-11-20, 06:00 – 09:00 · KT-AB12/);
  assert.equal(m.url, "/admin?booking=KT-AB12");
  const saved = process.env.PUSH_ALLOW_ANY_ENDPOINT;
  delete process.env.PUSH_ALLOW_ANY_ENDPOINT;
  try {
    for (const ok of ["https://fcm.googleapis.com/fcm/send/abc", "https://web.push.apple.com/QK", "https://updates.push.services.mozilla.com/wpush/v2/x", "https://wns2-par02p.notify.windows.com/w/?token=x"])
      assert.equal(allowedPushEndpoint(ok), true, ok);
    for (const bad of ["http://fcm.googleapis.com/x", "https://evil.test/push", "https://fcm.googleapis.com.evil.test/x", "https://127.0.0.1/x", "not a url"])
      assert.equal(allowedPushEndpoint(bad), false, bad);
  } finally {
    if (saved !== undefined) process.env.PUSH_ALLOW_ANY_ENDPOINT = saved;
  }
});
test("Rate limiting uses the first forwarded address", () => {
  const request = new Request("https://x.test/", { headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1" } });
  assert.equal(clientIp(request), "203.0.113.9");
  assert.equal(clientIp(new Request("https://x.test/")), "unknown");
});
test("Indian phone numbers normalise safely", () => {
  assert.equal(phoneSchema.parse("+91 94966 69360"), "919496669360");
  assert.equal(phoneSchema.parse("9496669360"), "919496669360");
  assert.equal(phoneSchema.safeParse("123").success, false);
});
test("IST calendar rolls over independently of server time zone", () => {
  assert.equal(indiaDate(new Date("2026-09-20T20:00:00Z")), "2026-09-21");
});
test("Booking dates reject impossible days and enforce notice and horizon", () => {
  const now = new Date("2026-09-20T00:00:00Z");
  assert.equal(validBookingTime("2026-09-20", 360, 2, 90, now), false);
  assert.equal(validBookingTime("2026-09-20", 540, 2, 90, now), true);
  assert.equal(validBookingTime("2026-02-30", 540, 2, 90, now), false);
  assert.equal(validBookingTime("2027-09-20", 540, 2, 90, now), false);
});
test("Client price is stripped, quantity is bounded and method is validated", () => {
  const base = {
    name: "Test Person",
    phone: "9496669360",
    productId: "fresh",
    quantity: 2,
    expectedUnitPrice: 4000,
    date: "2026-09-22",
    slotId: "morning",
    method: "DELIVERY",
    language: "en",
    requestKey: "879ba1a2-bbdd-4a52-977a-217e0ff2a69f",
  };
  assert.equal("total" in bookingSchema.parse({ ...base, total: 1 }), false);
  assert.equal(
    bookingSchema.safeParse({ ...base, quantity: -2 }).success,
    false,
  );
  assert.equal(
    bookingSchema.safeParse({ ...base, quantity: 1.5 }).success,
    false,
  );
  assert.equal(
    bookingSchema.safeParse({ ...base, quantity: 1001 }).success,
    false,
  );
  assert.equal(
    bookingSchema.safeParse({ ...base, method: "FREE" }).success,
    false,
  );
});
test("Razorpay HMAC rejects altered data and malformed signatures", () => {
  const secret = "testing-secret";
  const payload = "order_123|pay_456";
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  assert.equal(checkSignature(payload, sig, secret), true);
  assert.equal(checkSignature(payload + "x", sig, secret), false);
  assert.equal(checkSignature(payload, "short", secret), false);
  assert.equal(checkSignature(payload, "z".repeat(64), secret), false);
});
