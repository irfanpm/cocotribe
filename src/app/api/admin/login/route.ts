import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { z } from "zod";
import { db, isDemo } from "@/lib/db";
import { body, sameOrigin, fail, AppError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { createSession, cookieName } from "@/lib/auth";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    if (isDemo()) throw new AppError("DEMO_MODE", 503);
    const data = z
      .object({
        email: z.email().transform((v) => v.toLowerCase()),
        password: z.string().min(1).max(200),
      })
      .parse(await body(request));
    await rateLimit("login-account", data.email, 8);
    await rateLimit("login-global", "all", 80);
    const admin = await db.admin.findUnique({ where: { email: data.email } });
    const valid = await compare(
      data.password,
      admin?.passwordHash ||
        "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxRRHxGAOoCiXO6Yw.H2LDIWHAa",
    );
    if (!admin || !valid) throw new AppError("INVALID_CREDENTIALS", 401);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(
      cookieName,
      await createSession(admin.id, admin.sessionVersion),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 28800,
      },
    );
    return res;
  } catch (e) {
    return fail(e);
  }
}
