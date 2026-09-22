import { NextResponse } from "next/server";
import { cookieName, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { sameOrigin, fail } from "@/lib/http";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const admin = await requireAdmin();
    await db.admin.update({
      where: { id: admin.id },
      data: { sessionVersion: { increment: 1 } },
    });
    const res = NextResponse.json({ ok: true });
    res.cookies.delete(cookieName);
    return res;
  } catch (e) {
    return fail(e);
  }
}
