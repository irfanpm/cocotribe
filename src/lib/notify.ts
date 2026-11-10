import { reportError, reportIssue } from "./monitor";
import { sendPushToAdmins } from "./push";

/**
 * WhatsApp alerts to the business owner through Meta's WhatsApp Cloud API.
 *
 * Messages the business starts must use a template Meta has approved, so the alert fills a
 * template with seven values. It does nothing until all settings are present, and a failure
 * never affects a customer's booking: callers run it after the response with next/server after().
 */
export type BookingAlert = {
  event: "NEW_BOOKING" | "PAID" | "CONFIRMED" | "TEST";
  bookingId: string;
  name: string;
  phone: string;
  productNameEn: string;
  quantity: number;
  date: string;
  slotLabel: string;
  method: string;
  paymentStatus: string;
  total: number;
};
const labels: Record<BookingAlert["event"], string> = {
  NEW_BOOKING: "New booking",
  PAID: "New booking, paid online",
  CONFIRMED: "Order confirmed",
  TEST: "Test alert from the admin panel",
};
function settings() {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const to = (process.env.OWNER_WHATSAPP || "").replace(/\D/g, "");
  if (!token || !phoneNumberId || to.length < 10) return null;
  return {
    token,
    phoneNumberId,
    to,
    template: process.env.WHATSAPP_TEMPLATE || "booking_alert",
    language: process.env.WHATSAPP_TEMPLATE_LANG || "en",
    // Override only for tests; production always uses Meta's Graph API.
    base: process.env.WHATSAPP_API_BASE || "https://graph.facebook.com/v23.0",
  };
}
export function ownerAlertsConfigured() {
  const s = settings();
  return s ? { to: `+${s.to.slice(0, 2)} ••••• ${s.to.slice(-3)}` } : null;
}
/** Meta refuses template values with line breaks, tabs or long runs of spaces. */
export function templateValue(value: string) {
  return value.replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim().slice(0, 200) || "-";
}
const rupees = (paise: number) =>
  `Rs ${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
/** The seven template values, in the order {{1}} to {{7}} appear in the approved template. */
export function alertValues(a: BookingAlert) {
  return [
    labels[a.event],
    a.bookingId,
    `${a.name} (+${a.phone})`,
    `${a.quantity} x ${a.productNameEn}`,
    `${a.date}, ${a.slotLabel} IST`,
    `${a.method === "RAZORPAY" ? "Online" : "Pay at Delivery"}, ${a.paymentStatus.toLowerCase().replace("_", " ")}`,
    rupees(a.total),
  ].map(templateValue);
}
export function alertRequest(a: BookingAlert) {
  const s = settings();
  if (!s) return null;
  return {
    url: `${s.base}/${s.phoneNumberId}/messages`,
    init: {
      method: "POST",
      headers: { Authorization: `Bearer ${s.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: s.to,
        type: "template",
        template: {
          name: s.template,
          language: { code: s.language },
          components: [
            {
              type: "body",
              parameters: alertValues(a).map((text) => ({ type: "text", text })),
            },
          ],
        },
      }),
      signal: AbortSignal.timeout(10000),
    } satisfies RequestInit,
  };
}
export type AlertResult = { sent: boolean; reason?: string };
export async function sendWhatsAppAlert(a: BookingAlert): Promise<AlertResult> {
  const request = alertRequest(a);
  if (!request) return { sent: false, reason: "NOT_CONFIGURED" };
  try {
    const response = await fetch(request.url, request.init);
    if (response.ok) return { sent: true };
    // Meta's error text explains setup problems (template name, token) and holds no secrets.
    const detail = await response.json().catch(() => null);
    const reason = String(detail?.error?.message || `HTTP ${response.status}`).slice(0, 200);
    await reportIssue("owner-alert", "WHATSAPP_REJECTED", { bookingId: a.bookingId, status: response.status, reason });
    return { sent: false, reason };
  } catch (error) {
    await reportError("owner-alert", error, { bookingId: a.bookingId });
    return { sent: false, reason: "UNREACHABLE" };
  }
}
/** Every alert channel that is set up: admin phone notifications and WhatsApp. One failing never stops the other. */
export async function notifyOwner(a: BookingAlert) {
  const [whatsapp] = await Promise.allSettled([sendWhatsAppAlert(a), sendPushToAdmins(a)]);
  return whatsapp.status === "fulfilled" ? whatsapp.value : { sent: false, reason: "UNREACHABLE" };
}
