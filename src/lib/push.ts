import webpush from "web-push";
import { db } from "./db";
import { reportError } from "./monitor";
import type { BookingAlert } from "./notify";

/**
 * Phone notifications for admins through the browser's own push service (Web Push).
 * Payloads are encrypted for each device, so only the admin's phone can read them.
 * Off until VAPID keys are set.
 */
function config() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return null;
  const appUrl = process.env.APP_URL || "";
  const subject =
    process.env.VAPID_SUBJECT || (appUrl.startsWith("https://") ? new URL(appUrl).origin : "mailto:alerts@localhost");
  return { publicKey, privateKey, subject };
}
export function pushPublicKey() {
  return config()?.publicKey ?? null;
}
// Browsers' push services. Subscriptions pointing anywhere else are refused, so the server
// can never be made to send requests to an arbitrary address.
const pushHosts = [
  "fcm.googleapis.com",
  "android.googleapis.com",
  "updates.push.services.mozilla.com",
  "push.services.mozilla.com",
  "web.push.apple.com",
  "notify.windows.com",
];
export function allowedPushEndpoint(endpoint: string) {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  // Tests point at a local stand-in push service; never set this in production.
  if (process.env.PUSH_ALLOW_ANY_ENDPOINT === "1") return true;
  return pushHosts.some((h) => url.hostname === h || url.hostname.endsWith("." + h));
}
const titles: Record<BookingAlert["event"], string> = {
  NEW_BOOKING: "New booking",
  PAID: "New booking, paid online",
  CONFIRMED: "Order confirmed",
  TEST: "Test notification",
};
export function pushMessage(a: BookingAlert) {
  const rupees = `₹${(a.total / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  const product = a.productNameEn.replace(" · ", " ");
  return {
    title: `${titles[a.event]} · ${rupees}`,
    body: `${a.name} · ${a.quantity} × ${product} · ${a.date}, ${a.slotLabel} · ${a.bookingId}`,
    url: a.event === "TEST" ? "/admin" : `/admin?booking=${encodeURIComponent(a.bookingId)}`,
    tag: `${a.bookingId}:${a.event}`,
  };
}
export async function sendPushToAdmins(a: BookingAlert, onlyEndpoint?: string) {
  const c = config();
  // statuses: what the push service answered for failed sends (e.g. 403), to explain a failure.
  const result = { sent: 0, removed: 0, failed: 0, devices: 0, statuses: [] as number[] };
  if (!c) return { ...result, reason: "NOT_CONFIGURED" as const };
  const subscriptions = await db.pushSubscription.findMany(
    onlyEndpoint ? { where: { endpoint: onlyEndpoint } } : undefined,
  );
  result.devices = subscriptions.length;
  const payload = JSON.stringify(pushMessage(a));
  await Promise.all(
    subscriptions.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
          vapidDetails: { subject: c.subject, publicKey: c.publicKey, privateKey: c.privateKey },
          TTL: 12 * 3600,
          urgency: "high",
          timeout: 10000,
        });
        result.sent++;
        await db.pushSubscription.update({ where: { id: s.id }, data: { lastSentAt: new Date() } });
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        // 404 and 410 mean the phone turned notifications off or the app was removed.
        if (status === 404 || status === 410) {
          result.removed++;
          await db.pushSubscription.deleteMany({ where: { id: s.id } });
        } else {
          result.failed++;
          result.statuses.push(status ?? 0);
          await reportError("admin-push", error, { status, bookingId: a.bookingId });
        }
      }
    }),
  );
  return result;
}
