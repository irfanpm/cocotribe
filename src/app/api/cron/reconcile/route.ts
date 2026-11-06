import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { isDemo } from "@/lib/db";
import { AppError, fail } from "@/lib/http";
import { hasCronSecret } from "@/lib/cron-auth";
import { reconcileExpired } from "@/lib/reconcile";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
// Vercel Cron calls GET; the GitHub Actions schedule uses POST. Both need CRON_SECRET.
async function run(request: Request) {
  try {
    if (!hasCronSecret(request)) throw new AppError("UNAUTHORIZED", 401);
    if (isDemo()) throw new AppError("DEMO_MODE", 503);
    const result = await reconcileExpired();
    if (result.released || result.paid) revalidateTag("catalog", { expire: 0 });
    return NextResponse.json(result, {
      status: result.failed ? 500 : 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return fail(e);
  }
}
export const GET = run;
export const POST = run;
