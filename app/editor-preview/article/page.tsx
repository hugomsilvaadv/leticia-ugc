import Link from "next/link";
import { Visual } from "@/components/Site";
import { DEFAULT_ARTICLES, readArticles } from "@/lib/article-store";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  const date = new Date(value + "T12:00:00");
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function renderBody(body: string) {
  return body.split(/\n\s*\n/).filter(Boolean).map((block, index) => {
    const clean = block.trim();
    if (clean.startsWith("## ")) return <h2 key={index}>{clean.slice(3)}</h2>;
    if (clean.startsWith("> ")) return <blockquote key={index}>{clean.slice(2)}</blockquote>;
    return <p key={index}>{clean}</p>;
  });
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
    <div className="articleBody" data-editor-body="article.body">{renderBody(article.body)}</div>
  </main>;
}
