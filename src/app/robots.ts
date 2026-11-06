import type { MetadataRoute } from "next";
export const dynamic = "force-dynamic";
export default function robots(): MetadataRoute.Robots {
  const live = process.env.DEMO_MODE === "false";
  return {
    rules: live
      ? { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/booking/"] }
      : { userAgent: "*", disallow: "/" },
    ...(live && process.env.APP_URL ? { sitemap: `${new URL(process.env.APP_URL).origin}/sitemap.xml` } : {}),
  };
}
