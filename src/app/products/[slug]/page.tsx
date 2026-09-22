import { getCatalog } from "@/lib/catalog";
import { ProductDetail } from "@/components/pages";
import { notFound } from "next/navigation";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = (await getCatalog()).products.find((p) => p.slug === slug);
  return { title: p?.nameEn || "Product", description: p?.descriptionEn };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const catalog = await getCatalog();
  const p = catalog.products.find((p) => p.slug === slug);
  if (!p) notFound();
  return <ProductDetail product={p} catalog={catalog} />;
}
