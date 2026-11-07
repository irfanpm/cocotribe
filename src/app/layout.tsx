import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { CoconutLoader } from "@/components/coconut-loader";
import "./globals.css";
import "./reference.css";
import "./custom.css";
import "./inner-pages.css";
import "./design-refresh.css";
import { LanguageProvider, type Locale } from "@/components/language";
import { Shell } from "@/components/reference-shell";
import { getCatalog } from "@/lib/catalog";
const description =
  "Pre-book coconuts and coconut products for your Guruvayur visit. Choose a date and time, then pay online or at delivery. Independent business, not affiliated with Guruvayur Temple. Available in English, Malayalam, Tamil and Hindi.";
export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "http://127.0.0.1:3000"),
  title: {
    default: "COCOTRIBE | Coconut pre-booking in Guruvayur",
    template: "%s | COCOTRIBE",
  },
  description,
  openGraph: {
    title: "COCOTRIBE | Coconut pre-booking in Guruvayur",
    description,
    siteName: "COCOTRIBE",
    type: "website",
    images: [{ url: "/images/reference-hero.jpg" }],
  },
  robots: {
    index: process.env.DEMO_MODE === "false",
    follow: process.env.DEMO_MODE === "false",
  },
};
export const viewport: Viewport = { themeColor: "#173f32" };
export const dynamic = "force-dynamic";
const locales: Locale[] = ["en", "ml", "ta", "hi"];
async function SiteFrame({ children }: { children: React.ReactNode }) {
  const catalog = await getCatalog();
  return <Shell settings={catalog.settings} demo={catalog.demo}>{children}</Shell>;
}
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const saved = (await cookies()).get("koko-language")?.value as Locale | undefined;
  const lang = saved && locales.includes(saved) ? saved : "en";
  return (
    <html lang={lang} data-scroll-behavior="smooth">
      <body>
        <LanguageProvider initial={lang}>
          <Suspense fallback={<CoconutLoader />}>
            <SiteFrame>{children}</SiteFrame>
          </Suspense>
        </LanguageProvider>
      </body>
    </html>
  );
}
