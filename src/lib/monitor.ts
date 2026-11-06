import { randomBytes } from "node:crypto";

/**
 * Error reporting that cannot leak secrets. Raw error messages are deliberately
 * never logged: Prisma and fetch errors can include database hosts, URLs and
 * customer values. Only the error class and its stable code are recorded.
 */
export function safeError(error: unknown) {
  if (!(error instanceof Error)) return { name: "Unknown" };
  const code = (error as { code?: unknown }).code;
  const digest = (error as { digest?: unknown }).digest;
  return {
    name: error.name,
    ...(typeof code === "string" ? { code } : {}),
    ...(typeof digest === "string" ? { digest } : {}),
  };
}

type Extra = Record<string, string | number | boolean | undefined>;

async function sendToSentry(scope: string, fields: Extra) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  try {
    const url = new URL(dsn);
    const project = url.pathname.replace(/\//g, "");
    const event_id = randomBytes(16).toString("hex");
    const now = new Date().toISOString();
    const event = {
      event_id,
      timestamp: now,
      platform: "node",
      level: "error",
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
      message: { formatted: `${scope}: ${fields.name}${fields.code ? ` (${fields.code})` : ""}` },
      tags: { scope },
      extra: fields,
    };
    await fetch(`${url.protocol}//${url.host}/api/${project}/envelope/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${url.username}, sentry_client=cocotribe/1.0`,
      },
      body: `${JSON.stringify({ event_id, sent_at: now })}\n${JSON.stringify({ type: "event" })}\n${JSON.stringify(event)}\n`,
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    // Monitoring must never break a customer request.
  }
}

export async function reportError(scope: string, error: unknown, extra: Extra = {}) {
  const fields = { ...safeError(error), ...extra };
  console.error(JSON.stringify({ level: "error", scope, ...fields }));
  await sendToSentry(scope, fields);
}

/** A problem without an exception, such as a payment that needs staff attention. */
export async function reportIssue(scope: string, name: string, extra: Extra = {}) {
  const fields = { name, ...extra };
  console.error(JSON.stringify({ level: "error", scope, ...fields }));
  await sendToSentry(scope, fields);
}
