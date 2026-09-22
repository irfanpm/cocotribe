import { getCatalog } from "@/lib/catalog";
import { Contact } from "@/components/pages";
export const metadata = { title: "Contact us" };
export default async function Page() {
  return <Contact catalog={await getCatalog()} />;
}
