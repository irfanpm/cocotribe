import { getCatalog } from "@/lib/catalog";
import { Products } from "@/components/pages";
export const metadata = { title: "Coconut products" };
export default async function Page() {
  return <Products catalog={await getCatalog()} />;
}
