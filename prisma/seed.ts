import { PrismaClient } from "@prisma/client";
import {
  sampleProducts,
  sampleSettings,
  sampleSlots,
  sampleFaqs,
} from "../src/lib/demo";
const db = new PrismaClient();
async function main() {
  for (const p of sampleProducts)
    await db.product.upsert({ where: { id: p.id }, create: p, update: {} });
  for (const s of sampleSlots)
    await db.timeSlot.upsert({ where: { id: s.id }, create: s, update: {} });
  for (const f of sampleFaqs)
    await db.faq.upsert({ where: { id: f.id }, create: f, update: {} });
  await db.settings.upsert({
    where: { id: "main" },
    create: sampleSettings,
    update: {},
  });
  console.log(
    "Seed complete. Sample prices must be verified before launch. Existing records preserved.",
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
