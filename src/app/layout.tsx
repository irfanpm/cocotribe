import type { Metadata } from "next";
import "./globals.css";
import "./reference.css";
import "./custom.css";
import "./inner-pages.css";
import { LanguageProvider } from "@/components/language";
import { Shell } from "@/components/reference-shell";
import { getCatalog } from "@/lib/catalog";
export const metadata: Metadata = {
  title: {
    default: "COCOTRIBE | Coconut pre-booking in Guruvayur",
    template: "%s | COCOTRIBE",
  },
  description:
    "Pre-book coconuts for your Guruvayur visit. Fresh coconuts, copra and bulk supply. English and Malayalam support.",
  robots: {
    index: process.env.DEMO_MODE === "false",
    follow: process.env.DEMO_MODE === "false",
  },
};
export const dynamic = "force-dynamic";
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const catalog = await getCatalog();
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <LanguageProvider>
          <Shell settings={catalog.settings} demo={catalog.demo}>
            {children}
          </Shell>
        </LanguageProvider>
      </body>
    </html>
  );
}
