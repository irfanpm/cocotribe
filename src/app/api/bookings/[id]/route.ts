import { NextResponse } from "next/server";
import { getPrivateOrder, publicOrder } from "@/lib/orders";
import { fail } from "@/lib/http";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const token =
      request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
    return NextResponse.json(publicOrder(await getPrivateOrder(id, token)), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return fail(e);
  }
}
