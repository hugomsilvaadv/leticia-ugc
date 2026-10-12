import Link from "next/link";
import { Visual } from "@/components/Site";
import ArticleBody from "@/components/ArticleBody";
import { DEFAULT_ARTICLES, readArticles } from "@/lib/article-store";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  const date = new Date(value + "T12:00:00");
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export default async function ArticleEditorPreviewPage() {
  const stored = await readArticles();
  const article = stored[0] ?? DEFAULT_ARTICLES[0];

  return <main className="article shell">
    <Link className="eyebrow" href={"/" + article.category.toLowerCase()} data-editor="article.category">{article.category}</Link>
    <h1 data-editor="article.title">{article.title}</h1>
    <p className="dek" data-editor="article.dek">{article.dek}</p>
    <div className="byline">
      <span>Por Letícia Leite</span>
      <span data-editor="article.publishedAt">{formatDate(article.publishedAt)}</span>
      <span data-editor="article.readTime">{article.readTime} de leitura</span>
    </div>
    <Visual kind={article.category.toLowerCase()} label={article.category + " · editorial"} asset={article.hero} editorKey="article.hero" />
    <ArticleBody article={article} preview />
  </main>;
}
