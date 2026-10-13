import { assertMatchingShape } from "@/lib/validation";
import { unstable_noStore as noStore } from "next/cache";
import { readJsonFileSync, writeJsonFile } from "@/lib/json-store";
import { assertSafeMedia } from "@/lib/media";
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
  url: "",
  fit: "cover",
  positionX: 50,
  positionY: 50,
  zoom: 100,
  opacity: 100,
});

const number = (value: unknown, fallback: number, min: number, max: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? Math.min(max, Math.max(min, parsed))
    : fallback;
};

export function normalizePortfolio(value: unknown): PortfolioItem[] {
  if (!Array.isArray(value)) return [];
  const used = new Set<string>();
  return value.map((raw, index) => {
    const item =
      raw && typeof raw === "object" ? (raw as Partial<PortfolioItem>) : {};
    const media =
      item.media && typeof item.media === "object" ? item.media : emptyMedia();
    let id =
      typeof item.id === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(item.id)
        ? item.id
        : `item-${index + 1}`;
    if (used.has(id)) id = `${id}-${index}`;
    used.add(id);
    const url = typeof media.url === "string" ? media.url : "";
    const safeUrl =
      /^https:\/\//i.test(url) || /^\/(?!\/)/.test(url) ? url : "";
    return {
      ...item,
      id,
      title: typeof item.title === "string" ? item.title : "",
      description: typeof item.description === "string" ? item.description : "",
      type: item.type === "Foto" ? "Foto" : "Vídeo",
      published: item.published === true,
      media: {
        ...media,
        url: typeof media.url === "string" ? media.url : safeUrl,
        fit: media.fit === "contain" ? "contain" : "cover",
        positionX: number(media.positionX, 50, 0, 100),
        positionY: number(media.positionY, 50, 0, 100),
        zoom: number(media.zoom, 100, 70, 220),
        opacity: number(media.opacity, 100, 0, 100),
      },
    };
  });
}

export function validatePortfolio(
  value: unknown,
): asserts value is PortfolioItem[] {
  if (
    !Array.isArray(value) ||
    value.some(
      (item) =>
        !item ||
        typeof item !== "object" ||
        !item.id ||
        !item.media ||
        !["Foto", "Vídeo"].includes(item.type),
    )
  )
    throw new Error("Lista de trabalhos inválida.");
  if (new Set(value.map((item) => item.id)).size !== value.length)
    throw new Error("Trabalhos com identificadores duplicados.");
  value.forEach((item) =>
    assertMatchingShape(item, {
      id: "",
      title: "",
      description: "",
      type: "Foto",
      media: emptyMedia(),
      published: false,
    }),
  );
  assertSafeMedia(value);
}

export async function readPortfolio(
  includeUnpublished = false,
): Promise<PortfolioItem[]> {
  noStore();
  const raw = readJsonFileSync<PortfolioItem[]>(
    FILE_PATH,
    [],
    validatePortfolio,
  );
  const rows = normalizePortfolio(raw);
  return includeUnpublished ? rows : rows.filter((item) => item.published);
}

export async function writePortfolio(
  value: unknown,
  expectedRevision?: string | null,
): Promise<PortfolioItem[]> {
  validatePortfolio(value);
  const items = normalizePortfolio(value);
  await writeJsonFile(FILE_PATH, items, {
    expectedRevision,
    fallback: [],
    normalize: normalizePortfolio,
  });
  return items;
}
