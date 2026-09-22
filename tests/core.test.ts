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
