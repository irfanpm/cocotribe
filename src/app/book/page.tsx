import { Suspense } from "react";
import { getCatalog } from "@/lib/catalog";
import { Booking } from "@/components/booking";
export const metadata = { title: "Book coconuts" };
export default async function Page() {
  return (
    <Suspense>
      <Booking catalog={await getCatalog()} />
    </Suspense>
  );
}
