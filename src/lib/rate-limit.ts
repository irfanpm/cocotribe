import { db } from "./db";
import { hash } from "./security";
import { AppError } from "./http";
export async function rateLimit(
  scope: string,
  key: string,
  limit: number,
  minutes = 15,
) {
  const bucket = Math.floor(Date.now() / (minutes * 60000));
  const id = hash(`${scope}:${key}:${bucket}`);
  const row = await db.rateLimit.upsert({
    where: { key: id },
    create: { key: id, resetAt: new Date((bucket + 1) * minutes * 60000) },
    update: { count: { increment: 1 } },
  });
  if (row.count > limit) throw new AppError("RATE_LIMIT", 429);
}
