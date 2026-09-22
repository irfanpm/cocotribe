import { AdminLogin } from "@/components/admin";
import { isDemo } from "@/lib/db";
export const metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <AdminLogin demo={isDemo()} />;
}
