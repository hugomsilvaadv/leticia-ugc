import NewsletterForm from "@/components/NewsletterForm";
import SharedMedia from "@/components/Media";
import Link from "next/link";
import MobileNavigation from "@/components/MobileNavigation";
import type { CSSProperties } from "react";
import type { ArticleRecord } from "@/lib/article-store";
import { readSiteConfig, type MediaAsset } from "@/lib/site-config";

export async function Header() {
  const config = await readSiteConfig();
  const style: CSSProperties = {
    fontFamily: config.brand.wordmarkStyle.fontFamily,
    fontSize: config.brand.wordmarkStyle.fontSize,
    transform: `translate(${config.brand.wordmarkStyle.x}px, ${config.brand.wordmarkStyle.y}px)`,
    textAlign: config.brand.wordmarkStyle.align,
  };

  return (
    <header>
      <div className="utility" data-editor="brand.utility">
        {config.brand.utility}
      </div>
      <div className="masthead shell">
        <MobileNavigation
          wordmark={config.brand.wordmark}
          signature={config.brand.signature}
        />
        <Link
          href="/"
          className="wordmark"
          style={style}
          data-editor="brand.wordmark"
        >
          {config.brand.wordmark}
        </Link>
      </div>
    </header>
  );
}

export async function Footer() {
  const config = await readSiteConfig();
  return (
    <footer className="footer">
      <div className="shell footerGrid">
        <div>
          <div className="footerBrand">{config.brand.wordmark}</div>
          <span className="signature" data-editor="brand.signature">
            {config.brand.signature}
          </span>
          <p data-editor="footer.description">{config.footer.description}</p>
        </div>
        <div>
          <strong>Explorar</strong>
          <Link href="/moda">Moda</Link>
          <Link href="/beleza">Beleza</Link>
          <Link href="/lifestyle">Lifestyle</Link>
          <Link href="/achados">Achados</Link>
          <Link href="/linktree">Linktree</Link>
          <Link href="/busca">Buscar</Link>
          <Link href="/privacidade">Privacidade</Link>
        </div>
        <div>
          <strong>Contato</strong>
          <Link href="/ugc">UGC</Link>
          <a href="mailto:leticialeitecontent@gmail.com">E-mail</a>
          <a
            href="https://instagram.com/leticiafndg"
            target="_blank"
            rel="noreferrer"
          >
            Instagram
          </a>
        </div>
      </div>
      <div className="shell footerBottom">
        © 2026 Letícia Leite · Ribeirão Preto (SP) / Sete Lagoas (MG)
      </div>
    </footer>
  );
}

export function Visual({
  kind = "rose",
  label = "editorial",
  asset,
  editorKey,
}: {
  kind?: string;
  label?: string;
  asset?: MediaAsset;
  editorKey?: string;
}) {
  if (asset?.url) {
    return (
      <div
        data-editor-media={editorKey}
        className={
          kind === "hero" ? "heroPhotoFrame" : "visual mediaVisual " + kind
        }
      >
        <SharedMedia asset={asset} alt={label} priority={kind === "hero"} />
      </div>
    );
  }

  if (kind === "hero") {
    return (
      <div data-editor-media={editorKey} className="heroPhotoFrame">
        <SharedMedia
          asset={{
            url: "/images/leticia-hero.jpg",
            fit: "cover",
            positionX: 50,
            positionY: 50,
            zoom: 100,
            opacity: 100,
          }}
          alt="Letícia Leite em editorial de moda"
          priority
        />
      </div>
    );
  }

  return (
    <div data-editor-media={editorKey} className={"visual " + kind}>
      <span>{label}</span>
    </div>
  );
}

export function Card({
  article,
  compact = false,
}: {
  article: ArticleRecord;
  compact?: boolean;
}) {
  return (
    <article className={compact ? "card compact" : "card"}>
      <Link href={"/artigos/" + article.slug}>
        <Visual
          kind={article.category.toLowerCase()}
          label={article.category}
          asset={article.hero}
        />
      </Link>
      <div className="meta">
        <span>{article.category}</span>
        <span>{article.readTime}</span>
      </div>
      <h3>
        <Link href={"/artigos/" + article.slug}>{article.title}</Link>
      </h3>
      {!compact && <p>{article.dek}</p>}
    </article>
  );
}

export function Newsletter({
  eyebrow = "Carta da Letícia",
  title = "Moda, beleza e achados para chegar sem ruído.",
  eyebrowStyle,
  titleStyle,
  editorPrefix,
}: {
  eyebrow?: string;
  title?: string;
  eyebrowStyle?: CSSProperties;
  titleStyle?: CSSProperties;
  editorPrefix?: string;
}) {
  return (
    <section className="newsletter shell">
      <div>
        <p
          className="eyebrow"
          style={eyebrowStyle}
          data-editor={editorPrefix ? `${editorPrefix}.eyebrow` : undefined}
        >
          {eyebrow}
        </p>
        <h2
          style={titleStyle}
          data-editor={editorPrefix ? `${editorPrefix}.title` : undefined}
        >
          {title}
        </h2>
      </div>
      <NewsletterForm />
    </section>
  );
}

export function Latest({ articles }: { articles: ArticleRecord[] }) {
  return (
    <div className="articleGrid">
      {articles.slice(2).map((a) => (
        <Card key={a.slug} article={a} />
      ))}
    </div>
  );
}
