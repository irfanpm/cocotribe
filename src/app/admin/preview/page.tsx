import { AdminDashboard } from "@/components/admin";
import { isDemo } from "@/lib/db";
import { notFound } from "next/navigation";
export const metadata = {title: "Admin preview", robots: {index: false, follow: false}};
export default function Page() {
  if (!isDemo()) notFound();
  return <AdminDashboard preview />;
}
