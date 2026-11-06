import { NextResponse } from "next/server";
import { gatewayDetails, getPrivateOrder, publicOrder } from "@/lib/orders";
import { fail } from "@/lib/http";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const token =
      request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
    const order = await getPrivateOrder(id, token);
    return NextResponse.json(
      { ...publicOrder(order), gateway: gatewayDetails(order) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return fail(e);
  }
}
