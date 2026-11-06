import { preload } from "react-dom";
import { getCatalog } from "@/lib/catalog";
import { ReferenceHome } from "@/components/reference-home";
export default async function Page() {
  // The hero is a CSS background, so the browser would otherwise find it late.
  preload("/images/reference-hero.webp", { as: "image", fetchPriority: "high" });
  return <ReferenceHome catalog={await getCatalog()} />;
}
