import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-config";

const LAST_MEANINGFUL_UPDATE = new Date("2026-10-23T00:00:00.000Z");

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: LAST_MEANINGFUL_UPDATE,
      changeFrequency: "weekly",
      priority: 1
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: LAST_MEANINGFUL_UPDATE,
      changeFrequency: "monthly",
      priority: 0.8
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: LAST_MEANINGFUL_UPDATE,
      changeFrequency: "monthly",
      priority: 0.7
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: LAST_MEANINGFUL_UPDATE,
      changeFrequency: "yearly",
      priority: 0.6
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: LAST_MEANINGFUL_UPDATE,
      changeFrequency: "yearly",
      priority: 0.6
    }
  ];
}

