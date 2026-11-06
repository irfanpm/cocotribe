import { createHash, timingSafeEqual } from "node:crypto";
const digest = (value: string) => createHash("sha256").update(value).digest();
/** True only for `Authorization: Bearer <CRON_SECRET>`. A missing or short secret never matches. */
export function hasCronSecret(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) return false;
  const header = request.headers.get("authorization") || "";
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`));
}
