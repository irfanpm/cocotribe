import { getCatalog } from "@/lib/catalog";
import { ReferenceHome } from "@/components/reference-home";
export default async function Page() {
  return <ReferenceHome catalog={await getCatalog()} />;
}
