import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { reportError } from "./monitor";
export class AppError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}
const noStore = { "Cache-Control": "private, no-store" };
export async function fail(error: unknown) {
  if (error instanceof AppError)
    return NextResponse.json({ error: error.code }, { status: error.status, headers: noStore });
  if (error instanceof ZodError)
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400, headers: noStore });
  const code = (error as { code?: unknown } | null)?.code;
  if (code === "P2025")
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404, headers: noStore });
  if (code === "P2002")
    return NextResponse.json({ error: "CONFLICT" }, { status: 409, headers: noStore });
  await reportError("api", error);
  return NextResponse.json({ error: "SERVICE_UNAVAILABLE" }, { status: 503, headers: noStore });
}
/**
 * The visitor's address for rate limiting. Vercel overwrites these headers at its
 * edge, so they cannot be spoofed there; behind another proxy, make sure it does the same.
 */
export function clientIp(request: Request) {
  const forwarded =
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for") ||
    "";
  return forwarded.split(",")[0].trim().slice(0, 64) || "unknown";
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  // Next may normalize the request hostname to localhost in development.
  const requestUrl = new URL(request.url);
  const loopback = ["127.0.0.1", "localhost", "[::1]"];
  if (process.env.NODE_ENV !== "production" && origin) {
    try {
      const incoming = new URL(origin);
      if (loopback.includes(requestUrl.hostname) && loopback.includes(incoming.hostname) &&
          incoming.protocol === requestUrl.protocol && incoming.port === requestUrl.port) return;
    } catch { /* Invalid origins are rejected below. */ }
  }

  let allowedOrigin = process.env.APP_URL ? new URL(process.env.APP_URL).origin : null;

  // Fallback for Vercel deployments if APP_URL is not explicitly set
  if (!allowedOrigin && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    allowedOrigin = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  } else if (!allowedOrigin && process.env.VERCEL_URL) {
    allowedOrigin = `https://${process.env.VERCEL_URL}`;
  }

  if (!allowedOrigin || origin !== allowedOrigin) {
    throw new AppError("FORBIDDEN", 403);
  }
}
export async function body(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 16000)
    throw new AppError("INVALID_INPUT", 413);
  const text = await request.text();
  if (text.length > 16000) throw new AppError("INVALID_INPUT", 413);
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError("INVALID_INPUT");
  }
}
