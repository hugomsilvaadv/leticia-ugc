import { unstable_noStore as noStore } from "next/cache";
import fs from "node:fs/promises";
import path from "node:path";
import { articles as seedArticles, type Article, type Section } from "@/lib/content";
import { getDataDir, type MediaAsset } from "@/lib/site-config";

export type ArticleRecord = Article & {
  published: boolean;
  publishedAt: string;
  hero: MediaAsset;
  body: string;
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

export const DEFAULT_ARTICLES: ArticleRecord[] = seedArticles.map((article) => ({
  ...article,
  published: true,
  publishedAt: "2026-09-23",
  hero: emptyHero(),
  body: defaultBody,
}));

const ARTICLE_PATH = path.join(getDataDir(), "articles.json");
const categories: Section[] = ["Moda", "Beleza", "Lifestyle", "Achados"];

function num(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function normalizeHero(value: Partial<MediaAsset> | undefined): MediaAsset {
  return {
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

function normalizeArticle(value: Partial<ArticleRecord>, index: number): ArticleRecord {
  const title = typeof value.title === "string" && value.title.trim() ? value.title.trim() : `Artigo ${index + 1}`;
  const category = categories.includes(value.category as Section) ? value.category as Section : "Moda";
  const slug = slugify(typeof value.slug === "string" && value.slug ? value.slug : title) || `artigo-${index + 1}`;

  return {
    slug,
    title,
    dek: typeof value.dek === "string" ? value.dek : "",
    category,
    readTime: typeof value.readTime === "string" && value.readTime.trim() ? value.readTime.trim() : "5 min",
    published: value.published !== false,
    publishedAt: typeof value.publishedAt === "string" && value.publishedAt ? value.publishedAt : new Date().toISOString().slice(0, 10),
    hero: normalizeHero(value.hero),
    body: typeof value.body === "string" ? value.body : "",
  };
}

export function normalizeArticles(input: unknown): ArticleRecord[] {
  const values = Array.isArray(input) ? input : DEFAULT_ARTICLES;
  const normalized = values.map((item, index) => normalizeArticle(item as Partial<ArticleRecord>, index));
  const used = new Set<string>();

  return normalized.map((article, index) => {
    let slug = article.slug;
    if (used.has(slug)) slug = `${slug}-${index + 1}`;
    used.add(slug);
    return { ...article, slug };
  });
}

export async function readArticles(): Promise<ArticleRecord[]> {
  noStore();
  try {
    const raw = await fs.readFile(ARTICLE_PATH, "utf8");
    return normalizeArticles(JSON.parse(raw));
  } catch {
    return DEFAULT_ARTICLES;
  }
}

export async function writeArticles(input: unknown): Promise<ArticleRecord[]> {
  const normalized = normalizeArticles(input);
  await fs.mkdir(getDataDir(), { recursive: true });
  await fs.writeFile(ARTICLE_PATH, JSON.stringify(normalized, null, 2), "utf8");
  return normalized;
}
