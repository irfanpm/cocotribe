import { getCatalog } from "@/lib/catalog";
import { Confirmation } from "@/components/booking";
export const metadata = {
  title: "Your booking",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Confirmation id={id} catalog={await getCatalog()} />;
}
