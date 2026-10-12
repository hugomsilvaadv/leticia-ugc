import { imageDimensions } from "@/lib/image-validation";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import fs from "node:fs/promises";
import path from "node:path";
import { readLinktree } from "@/lib/linktree-store";
import LinktreeView from "@/components/LinktreeView";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Portfólio UGC | Letícia Leite",
  description: "Portfólio UGC de Letícia Leite — moda, beleza e lifestyle.",
  alternates: { canonical: "/linktree" },
  openGraph: { url: "/linktree", title: "Portfólio UGC | Letícia Leite" },
  robots: { index: true, follow: true },
};
export default async function LinktreePage() {
  const config = await readLinktree();
  if (
    process.env.NODE_ENV === "production" &&
    config.provenance.kind !== "imported"
  )
    notFound();
  const urls = [
    ...new Set([
      config.background.url,
      ...Object.values(config.media).map((m) => m.url),
      ...config.videos.map((v) => v.media.url),
    ]),
  ];
  const missingMedia = (
    await Promise.all(
      urls.map(async (url) => {
        if (!url.startsWith("/") || url.startsWith("/api/")) return null;
        try {
          const root = await fs.realpath(path.join(process.cwd(), "public"));
          const pathname = decodeURIComponent(
            new URL(url, "https://byleticia.com.br").pathname,
          );
          const file = await fs.realpath(path.resolve(root, "." + pathname));
          if (!file.startsWith(root + path.sep)) return url;
          await imageDimensions(await fs.readFile(file));
          return null;
        } catch {
          return url;
        }
      }),
    )
  ).filter((url): url is string => !!url);
  return <LinktreeView config={config} missingMedia={missingMedia} />;
}
