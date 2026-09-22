import { getCatalog } from "@/lib/catalog";
import { FAQs } from "@/components/pages";
export const metadata = { title: "Frequently asked questions" };
export default async function Page() {
  return <FAQs catalog={await getCatalog()} />;
}
