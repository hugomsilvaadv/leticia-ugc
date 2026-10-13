import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Prévia editorial",
  robots: { index: false, follow: false },
};
import Link from "next/link";
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

export default async function ArticleEditorPreviewPage() {
  const stored = await readArticles();
  const article = stored.find((record) => record.published) ?? null;

  return (
    <main id="conteudo" className="article shell">
      <Link
        className="eyebrow"
        href={"/" + (article?.category ?? "moda").toLowerCase()}
        data-editor="article.category"
      >
        {article?.category ?? ""}
      </Link>
      <h1 data-editor="article.title">{article?.title ?? ""}</h1>
      <p className="dek" data-editor="article.dek">
        {article?.dek ?? ""}
      </p>
      <div className="byline">
        <span>Por Letícia Leite</span>
        <span data-editor="article.publishedAt">
          {article ? formatDate(article.publishedAt) : ""}
        </span>
        <span data-editor="article.readTime">
          {article ? article.readTime + " de leitura" : ""}
        </span>
      </div>
      <Visual
        kind={(article?.category ?? "moda").toLowerCase()}
        label={
          article ? article.category + " · editorial" : "Prévia de fotografia"
        }
        asset={article?.hero}
        editorKey="article.hero"
      />
      {article ? (
        <ArticleBody article={article} preview />
      ) : (
        <div className="articleBody" data-editor-body="article.body" />
      )}
    </main>
  );
}
