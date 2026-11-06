import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/catalog";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL ? new URL(process.env.APP_URL).origin : "";
  const pages = ["", "/book", "/products", "/services", "/about", "/faq", "/contact", "/privacy", "/terms"];
  const { products } = await getCatalog();
  return [...pages, ...products.map((p) => `/products/${p.slug}`)].map((path) => ({ url: `${base}${path}` }));
}
