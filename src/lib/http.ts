import { NextResponse } from "next/server";
import { ZodError } from "zod";
export class AppError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}
export function fail(error: unknown) {
  if (error instanceof AppError)
    return NextResponse.json({ error: error.code }, { status: error.status });
  if (error instanceof ZodError)
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  console.error(
    "Request failed",
    error instanceof Error ? error.message : "Unknown",
  );
  return NextResponse.json({ error: "SERVICE_UNAVAILABLE" }, { status: 503 });
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!process.env.APP_URL || origin !== new URL(process.env.APP_URL).origin)
    throw new AppError("FORBIDDEN", 403);
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
