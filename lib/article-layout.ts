import type { ArticleTileLayout } from "@/lib/site-config";

export function arrangeArticleTiles<T extends { slug: string }>(
  articles: readonly T[],
  layout: readonly ArticleTileLayout[] = [],
): { article: T; columns: number; height: number }[] {
  const index = new Map(articles.map((article) => [article.slug, article]));
  const rows = layout.filter((tile) => index.has(tile.slug));
  const seen = new Set(rows.map((tile) => tile.slug));
  return [
    ...rows.map((tile) => ({
      article: index.get(tile.slug)!,
      columns: tile.columns,
      height: tile.height,
    })),
    ...articles.filter((article) => !seen.has(article.slug)).map((article) => ({
      article,
      columns: 1,
      height: 300,
    })),
  ];
}

export function moveArticleTile(
  rows: readonly ArticleTileLayout[],
  from: string,
  to: string,
): ArticleTileLayout[] {
  if (from === to) return [...rows];
  const result = [...rows];
  const current = result.findIndex((item) => item.slug === from);
  const target = result.findIndex((item) => item.slug === to);
  if (current < 0 || target < 0) return result;
  const [tile] = result.splice(current, 1);
  result.splice(target, 0, tile);
  return result;
}
