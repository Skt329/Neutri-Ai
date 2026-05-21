import type { MetadataRoute } from "next"

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://neutri.ai"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/auth/"],
        disallow: [
          "/api/",
          "/chat/",
          "/dashboard/",
          "/meals/",
          "/pantry/",
          "/profile/",
          "/barcode/",
          "/swiggy/",
          "/onboarding/",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
