import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./db";
import { AppError } from "./http";
export const cookieName = "koko_admin";
function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 48) throw new AppError("AUTH_NOT_CONFIGURED", 503);
  return new TextEncoder().encode(s);
}
export async function createSession(id: string, version: number) {
  return new SignJWT({ version })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(id)
    .setIssuer("koko-tribe")
    .setAudience("koko-admin")
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret());
}
export async function requireAdmin() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) throw new AppError("UNAUTHORIZED", 401);
  try {
    const { payload } = await jwtVerify(token, secret(), {
      algorithms: ["HS256"],
      issuer: "koko-tribe",
      audience: "koko-admin",
    });
    const admin = await db.admin.findUnique({ where: { id: payload.sub } });
    if (!admin || admin.sessionVersion !== payload.version) throw new Error();
    return admin;
  } catch {
    throw new AppError("UNAUTHORIZED", 401);
  }
}
