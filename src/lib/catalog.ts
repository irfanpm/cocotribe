import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { db, isDemo } from "./db";
import {
  sampleProducts,
  sampleSlots,
  sampleSettings,
  sampleFaqs,
  type Catalog,
} from "./demo";
const liveCatalog = unstable_cache(async (): Promise<Catalog> => {
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
    faqs,
    demo: false,
    online: settings.onlineEnabled && !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
  };
}, ["cocotribe-public-catalog"], {revalidate: 30, tags: ["catalog"]});

export const getCatalog = cache(async (): Promise<Catalog> => {
  if (isDemo()) return {products: sampleProducts, slots: sampleSlots, settings: sampleSettings, faqs: sampleFaqs, demo: true, online: false};
  const catalog = await liveCatalog();
  return {...catalog, online: catalog.settings.onlineEnabled && !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)};
});
