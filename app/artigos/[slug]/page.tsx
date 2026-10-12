import { jsonLd } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Visual } from "@/components/Site";
import ArticleBody from "@/components/ArticleBody";
import { readArticles } from "@/lib/article-store";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  const date = new Date(value + "T12:00:00");
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = (await readArticles()).find(
    (a) => a.slug === slug && a.published,
  );
  if (!article)
    return { title: "Matéria não encontrada", robots: { index: false } };
  return {
    title: article.title,
    description: article.dek,
    alternates: { canonical: "/artigos/" + article.slug },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.dek,
      url: "/artigos/" + article.slug,
      publishedTime: article.publishedAt,
      ...(article.hero.url
        ? { images: [{ url: article.hero.url, alt: article.title }] }
        : {}),
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = (await readArticles()).find(
    (a) => a.slug === slug && a.published,
  );
  if (!article) notFound();

  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.dek,
    datePublished: article.publishedAt,
    author: { "@type": "Person", name: "Letícia Leite" },
    mainEntityOfPage: "https://byleticia.com.br/artigos/" + article.slug,
    ...(article.hero.url
      ? { image: new URL(article.hero.url, "https://byleticia.com.br").href }
      : {}),
  };
  return (
    <main id="conteudo" className="article shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(schema) }}
      />
      <Link className="eyebrow" href={"/" + article.category.toLowerCase()}>
        {article.category}
      </Link>
      <h1>{article.title}</h1>
      <p className="dek">{article.dek}</p>
      <div className="byline">
        <span>Por Letícia Leite</span>
        <span>{formatDate(article.publishedAt)}</span>
        <span>{article.readTime} de leitura</span>
      </div>
      <Visual
        kind={article.category.toLowerCase()}
        label={article.category + " · editorial"}
        asset={article.hero}
      />
      <ArticleBody article={article} />
    </main>
  );
}
