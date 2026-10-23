import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/about", "/contact", "/privacy", "/terms", "/llms.txt"],
      disallow: [
        "/api/",
        "/auth/",
        "/calls/",
        "/chats/",
        "/files/",
        "/profile/",
        "/settings/"
      ]
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL
  };
}

