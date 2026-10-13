import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/editor-preview/"],
    },
    sitemap: "https://byleticia.com.br/sitemap.xml",
  };
}
