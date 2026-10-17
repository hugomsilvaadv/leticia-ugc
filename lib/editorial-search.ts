import type { ArticleRecord } from "./article-store";

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Search only published articles. All query terms must match, even when
 * spread across different fields. No third-party index or data exposure.
 */
export function searchPublishedArticles(
  articles: ArticleRecord[],
  rawQuery: string,
): ArticleRecord[] {
  const query = normalizeSearchText(rawQuery.slice(0, 120));
  if (!query) return [];
  const terms = query.split(" ").filter(Boolean);
  return articles
    .filter((article) => article.published)
    .map((article) => {
      const title = normalizeSearchText(article.title);
      const description = normalizeSearchText(article.dek);
      const category = normalizeSearchText(article.category);
      const body = normalizeSearchText(article.body ?? "");
      const text = [title, description, category, body].join(" ");
      if (!terms.every((term) => text.includes(term))) return null;
      const score = terms.reduce(
        (points, term) =>
          points +
          (title.includes(term) ? 8 : 0) +
          (description.includes(term) ? 4 : 0) +
          (category.includes(term) ? 2 : 0) +
          (body.includes(term) ? 1 : 0),
        0,
      );
      return { article, score };
    })
    .filter((entry): entry is { article: ArticleRecord; score: number } => entry !== null)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.article.publishedAt.localeCompare(a.article.publishedAt) ||
        a.article.slug.localeCompare(b.article.slug),
    )
    .map(({ article }) => article);
}
