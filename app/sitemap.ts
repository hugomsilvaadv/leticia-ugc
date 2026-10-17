import { isPublishedLinktree } from "@/lib/linktree-model";
import { readLinktree } from "@/lib/linktree-store";
import type { MetadataRoute } from "next";
import { readArticles } from "@/lib/article-store";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = "https://byleticia.com.br";
  const linktree = await readLinktree();
  const pages = ["", "moda", "beleza", "lifestyle", "achados", "ugc", "sobre"];
  if (
    isPublishedLinktree(linktree.provenance.kind) ||
    process.env.NODE_ENV !== "production"
  )
    pages.push("linktree");
  return [
    ...pages.map((p) => ({ url: origin + "/" + p })),
    ...(await readArticles())
      .filter((a) => a.published)
      .map((a) => ({
        url: origin + "/artigos/" + a.slug,
        ...(!Number.isNaN(new Date(a.publishedAt).getTime())
          ? { lastModified: new Date(a.publishedAt) }
          : {}),
      })),
  ];
}
