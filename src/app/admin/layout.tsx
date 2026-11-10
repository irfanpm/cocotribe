import type { Metadata, Viewport } from "next";
/** Makes the admin panel installable as its own app, so it can receive new-order notifications. */
export const metadata: Metadata = {
  manifest: "/admin.webmanifest",
  appleWebApp: { capable: true, title: "COCOTRIBE Admin", statusBarStyle: "default" },
  icons: { apple: "/admin-icon-192.png" },
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: "#173d2b" };
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
