import { getCatalog } from "@/lib/catalog";
import { Services } from "@/components/pages";
export const metadata = { title: "Our services" };
export default async function Page() {
  return <Services catalog={await getCatalog()} />;
}
