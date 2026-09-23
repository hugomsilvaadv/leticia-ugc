import Link from "next/link";
import { notFound } from "next/navigation";
import { Visual } from "@/components/Site";
import { readArticles } from "@/lib/article-store";

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
    <div className="articleBody">{renderBody(article.body)}</div>
  </main>;
}
