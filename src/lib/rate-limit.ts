import { Prisma } from "@prisma/client";
import { db } from "./db";
import { hash } from "./security";
import { AppError } from "./http";
type Rule = { scope: string; key: string; limit: number; minutes?: number };
/**
 * Counts every rule in one database round trip. Ids are sorted so that simultaneous
 * requests lock shared counters in the same order and cannot deadlock.
 */
export async function rateLimitAll(rules: Rule[]) {
  const now = Date.now();
  const rows = rules
    .map(({ scope, key, limit, minutes = 15 }) => {
      const bucket = Math.floor(now / (minutes * 60000));
      return {
        id: hash(`${scope}:${key}:${bucket}`),
        limit,
        resetAt: new Date((bucket + 1) * minutes * 60000).toISOString(),
      };
    })
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  const values = Prisma.join(
    rows.map((r) => Prisma.sql`(${r.id}, 1, ${r.resetAt}::timestamp)`),
  );
  const counted = await db.$queryRaw<{ key: string; count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt") VALUES ${values}
    ON CONFLICT ("key") DO UPDATE SET "count" = "RateLimit"."count" + 1
    RETURNING "key", "count"`;
  const limits = new Map(rows.map((r) => [r.id, r.limit]));
  if (counted.some((c) => c.count > (limits.get(c.key) ?? Infinity)))
    throw new AppError("RATE_LIMIT", 429);
}
export function rateLimit(scope: string, key: string, limit: number, minutes = 15) {
  return rateLimitAll([{ scope, key, limit, minutes }]);
}
