import { assertMatchingShape } from "@/lib/validation";
import { unstable_noStore as noStore } from "next/cache";
import { readJsonFileSync, writeJsonFile } from "@/lib/json-store";
import { assertSafeMedia } from "@/lib/media";
import path from "node:path";
import {
  articles as seedArticles,
  type Article,
  type Section,
} from "@/lib/content";
import { getDataDir, type MediaAsset } from "@/lib/site-config";

export type ArticleRecord = Article & {
  published: boolean;
  publishedAt: string;
  hero: MediaAsset;
  body: string;
  sectionMedia: Record<string, MediaAsset>;
};

const emptyHero = (): MediaAsset => ({
  url: "",
  positionX: 50,
  positionY: 50,
  zoom: 100,
  opacity: 100,
  fit: "cover",
});

const defaultBody = `Um bom conteúdo começa por uma ideia clara e por escolhas que conversem com a vida real.

## O ponto de partida

Use este espaço para desenvolver a matéria. Separe os parágrafos com uma linha em branco.

> Você também pode criar uma citação destacada começando o parágrafo com o sinal >.

Continue o texto normalmente. Depois de salvar, a matéria passa a usar este conteúdo no site.`;

export const DEFAULT_ARTICLES: ArticleRecord[] = seedArticles.map(
  (article) => ({
    ...article,
    published: true,
    publishedAt: "2026-09-23",
    hero: emptyHero(),
    body: defaultBody,
    sectionMedia: {},
  }),
);

const FALLBACK_ARTICLES =
  process.env.NODE_ENV === "production" ? [] : DEFAULT_ARTICLES;

const ARTICLE_PATH = path.join(getDataDir(), "articles.json");
const categories: Section[] = ["Moda", "Beleza", "Lifestyle", "Achados"];

function num(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? Math.min(max, Math.max(min, parsed))
    : fallback;
}

function normalizeHero(value: Partial<MediaAsset> | undefined): MediaAsset {
  return {
    ...value,
    url: typeof value?.url === "string" ? value.url : "",
    positionX: num(value?.positionX, 50, 0, 100),
    positionY: num(value?.positionY, 50, 0, 100),
    zoom: num(value?.zoom, 100, 70, 220),
    opacity: num(value?.opacity, 100, 0, 100),
    fit: value?.fit === "contain" ? "contain" : "cover",
  };
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function normalizeArticle(
  value: Partial<ArticleRecord>,
  index: number,
): ArticleRecord {
  const title =
    typeof value.title === "string" && value.title.trim()
      ? value.title
      : `Artigo ${index + 1}`;
  const category = categories.includes(value.category as Section)
    ? (value.category as Section)
    : "Moda";
  const slug =
    slugify(
      typeof value.slug === "string" && value.slug ? value.slug : title,
    ) || `artigo-${index + 1}`;

  return {
    ...value,
    slug,
    title,
    dek: typeof value.dek === "string" ? value.dek : "",
    category,
    readTime:
      typeof value.readTime === "string" && value.readTime.trim()
        ? value.readTime.trim()
        : "5 min",
    published: value.published !== false,
    publishedAt:
      typeof value.publishedAt === "string" && value.publishedAt
        ? value.publishedAt
        : new Date().toISOString().slice(0, 10),
    hero: normalizeHero(value.hero),
    body: typeof value.body === "string" ? value.body : "",
    sectionMedia:
      value.sectionMedia &&
      typeof value.sectionMedia === "object" &&
      !Array.isArray(value.sectionMedia)
        ? Object.fromEntries(
            Object.entries(value.sectionMedia)
              .filter(([key]) => /^\d{1,3}$/.test(key))
              .map(([key, asset]) => [key, normalizeHero(asset)]),
          )
        : {},
  };
}

export function normalizeArticles(input: unknown): ArticleRecord[] {
  const values = Array.isArray(input) ? input : DEFAULT_ARTICLES;
  const normalized = values.map((item, index) =>
    normalizeArticle(item as Partial<ArticleRecord>, index),
  );
  const used = new Set<string>();

  return normalized.map((article, index) => {
    let slug = article.slug;
    if (used.has(slug)) slug = `${slug}-${index + 1}`;
    used.add(slug);
    return { ...article, slug };
  });
}

export function validateArticles(
  input: unknown,
): asserts input is ArticleRecord[] {
  if (
    !Array.isArray(input) ||
    input.some(
      (item) =>
        !item ||
        typeof item !== "object" ||
        !item.title ||
        !item.slug ||
        !categories.includes(item.category),
    )
  )
    throw new Error(
      "Lista de matérias inválida. Nenhum conteúdo foi alterado.",
    );
  if (new Set(input.map((item) => item.slug)).size !== input.length)
    throw new Error("Endereços de matérias duplicados.");
  input.forEach((item) => assertMatchingShape(item, DEFAULT_ARTICLES[0]));
  assertSafeMedia(input);
}

export async function readArticles(
  includeUnpublished = false,
): Promise<ArticleRecord[]> {
  noStore();
  const raw = readJsonFileSync<ArticleRecord[]>(
    ARTICLE_PATH,
    FALLBACK_ARTICLES,
    validateArticles,
  );
  const rows = normalizeArticles(raw);
  return includeUnpublished ? rows : rows.filter((item) => item.published);
}

export async function writeArticles(
  input: unknown,
  expectedRevision?: string | null,
): Promise<ArticleRecord[]> {
  validateArticles(input);
  const normalized = normalizeArticles(input);
  await writeJsonFile(ARTICLE_PATH, normalized, {
    expectedRevision,
    fallback: FALLBACK_ARTICLES,
    normalize: normalizeArticles,
  });
  return normalized;
}
