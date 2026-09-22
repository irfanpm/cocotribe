import { AdminDashboard } from "@/components/admin";
import { requireAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
export const metadata = {
  title: "Admin dashboard",
  robots: { index: false, follow: false },
};
export default async function Page() {
  try {
    await requireAdmin();
  } catch {
    redirect("/admin/login");
  }
  return <AdminDashboard />;
}
