import { unstable_noStore as noStore } from "next/cache";
import fs from "node:fs/promises";
import path from "node:path";
import { getDataDir, type MediaAsset } from "@/lib/site-config";

export type PortfolioItem = {
  id: string;
  title: string;
  description: string;
  type: "Vídeo" | "Foto";
  media: MediaAsset;
  published: boolean;
};

const FILE_PATH = path.join(getDataDir(), "portfolio.json");
const emptyMedia = (): MediaAsset => ({
  url: "", fit: "cover", positionX: 50, positionY: 50, zoom: 100, opacity: 100,
});

const number = (value: unknown, fallback: number, min: number, max: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};

export function normalizePortfolio(value: unknown): PortfolioItem[] {
  if (!Array.isArray(value)) return [];
  const used = new Set<string>();
  return value.slice(0, 60).map((raw, index) => {
    const item = raw && typeof raw === "object" ? raw as Partial<PortfolioItem> : {};
    const media = item.media && typeof item.media === "object" ? item.media : emptyMedia();
    let id = typeof item.id === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(item.id) ? item.id : `item-${index + 1}`;
    if (used.has(id)) id = `${id}-${index}`;
    used.add(id);
    const url = typeof media.url === "string" ? media.url.trim().slice(0, 2048) : "";
    const safeUrl = (/^https:\/\//i.test(url) || /^\/(?!\/)/.test(url)) ? url : "";
    return {
      id,
      title: typeof item.title === "string" ? item.title.slice(0, 160) : "",
      description: typeof item.description === "string" ? item.description.slice(0, 400) : "",
      type: item.type === "Foto" ? "Foto" : "Vídeo",
      published: item.published === true,
      media: {
        url: safeUrl,
        fit: media.fit === "contain" ? "contain" : "cover",
        positionX: number(media.positionX, 50, 0, 100),
        positionY: number(media.positionY, 50, 0, 100),
        zoom: number(media.zoom, 100, 70, 220),
        opacity: number(media.opacity, 100, 0, 100),
      },
    };
  });
}

export async function readPortfolio(): Promise<PortfolioItem[]> {
  noStore();
  try {
    return normalizePortfolio(JSON.parse(await fs.readFile(FILE_PATH, "utf8")));
  } catch {
    return [];
  }
}

export async function writePortfolio(value: unknown): Promise<PortfolioItem[]> {
  const items = normalizePortfolio(value);
  await fs.mkdir(getDataDir(), { recursive: true });
  await fs.writeFile(FILE_PATH, JSON.stringify(items, null, 2), "utf8");
  return items;
}
