import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
const db = new PrismaClient();
async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase(),
    password = process.env.ADMIN_PASSWORD;
  if (!email || !email.includes("@") || !password || password.length < 14)
    throw new Error(
      "Set ADMIN_EMAIL and ADMIN_PASSWORD (minimum 14 characters).",
    );
  const passwordHash = await hash(password, 12);
  await db.admin.upsert({
    where: { email },
    create: { email, passwordHash },
    update: { passwordHash, sessionVersion: { increment: 1 } },
  });
  console.log(
    "Admin saved. Existing sessions for this account have been revoked. Remove ADMIN_PASSWORD from your environment.",
  );
}
main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
