import { NextResponse } from "next/server";
import { db, isDemo } from "@/lib/db";
import { contactSchema } from "@/lib/validation";
import { body, sameOrigin, fail, AppError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
export async function POST(request: Request) {
  try {
    if (isDemo()) throw new AppError("DEMO_MODE", 503);
    sameOrigin(request);
    const { website, ...data } = contactSchema.parse(await body(request));
    await rateLimit("contact", data.phone, 4, 60);
    await rateLimit("contact-global", "all", 30, 1);
    await db.contactMessage.create({ data });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
