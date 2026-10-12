import Link from "next/link";
import { notFound } from "next/navigation";
import { Visual } from "@/components/Site";
import ArticleBody from "@/components/ArticleBody";
import { readArticles } from "@/lib/article-store";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  const date = new Date(value + "T12:00:00");
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = (await readArticles()).find(a => a.slug === slug && a.published);
  if (!article) notFound();

  return <main className="article shell">
    <Link className="eyebrow" href={"/" + article.category.toLowerCase()}>{article.category}</Link>
    <h1>{article.title}</h1>
    <p className="dek">{article.dek}</p>
    <div className="byline"><span>Por Letícia Leite</span><span>{formatDate(article.publishedAt)}</span><span>{article.readTime} de leitura</span></div>
    <Visual kind={article.category.toLowerCase()} label={article.category + " · editorial"} asset={article.hero} />
    <ArticleBody article={article} />
  </main>;
}
