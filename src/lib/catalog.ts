import "server-only";
import { db, isDemo } from "./db";
import {
  sampleProducts,
  sampleSlots,
  sampleSettings,
  sampleFaqs,
  type Catalog,
} from "./demo";
export async function getCatalog(): Promise<Catalog> {
  if (isDemo())
    return {
      products: sampleProducts,
      slots: sampleSlots,
      settings: sampleSettings,
      faqs: sampleFaqs.filter((faq) => faq.questionEn !== "Can I pay online?"),
      demo: true,
      online: false,
    };
  const [products, slots, settings, faqs] = await Promise.all([
    db.product.findMany({
      where: { active: true },
      orderBy: { createdAt: "asc" },
    }),
    db.timeSlot.findMany({
      where: { active: true },
      orderBy: { startMinute: "asc" },
    }),
    db.settings.findUniqueOrThrow({ where: { id: "main" } }),
    db.faq.findMany({ where: { active: true }, orderBy: { position: "asc" } }),
  ]);
  return {
    products,
    slots,
    settings,
    faqs: faqs.filter((faq) => faq.questionEn !== "Can I pay online?"),
    demo: false,
    online: false,
  };
}
