import { getCatalog } from "@/lib/catalog";
import { About } from "@/components/pages";
export const metadata = { title: "About us" };
export default async function Page() {
  return <About catalog={await getCatalog()} />;
}
