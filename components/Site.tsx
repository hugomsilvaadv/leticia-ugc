import Link from "next/link";
import type { CSSProperties } from "react";
import { Article } from "@/lib/content";
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
      <div className="utility" data-editor="brand.utility">{config.brand.utility}</div>
      <div className="masthead shell">
        <Link href="/" className="wordmark" style={style} data-editor="brand.wordmark">{config.brand.wordmark}</Link>
        <span className="signature" data-editor="brand.signature">{config.brand.signature}</span>
      </div>
      <nav className="nav">
        <div className="shell navInner">
          {[
            ["Moda", "/moda"], ["Beleza", "/beleza"], ["Lifestyle", "/lifestyle"],
            ["Achados", "/achados"], ["UGC", "/ugc"], ["Sobre", "/sobre"]
          ].map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
          <Link href="/achados" className="navRight">curadoria</Link>
        </div>
      </nav>
    </header>
  );
}

export async function Footer() {
  const config = await readSiteConfig();
  return (
    <footer className="footer">
      <div className="shell footerGrid">
        <div>
          <div className="footerBrand">LETÍCIA LEITE</div>
          <p data-editor="footer.description">{config.footer.description}</p>
        </div>
        <div><strong>Explorar</strong><Link href="/moda">Moda</Link><Link href="/beleza">Beleza</Link><Link href="/lifestyle">Lifestyle</Link><Link href="/achados">Achados</Link></div>
        <div><strong>Contato</strong><Link href="/ugc">UGC</Link><a href="mailto:leticialeitecontent@gmail.com">E-mail</a><a href="https://instagram.com/leticiafndg" target="_blank" rel="noreferrer">Instagram</a></div>
      </div>
      <div className="shell footerBottom">© 2026 Letícia Leite · Ribeirão Preto (SP) / Sete Lagoas (MG)</div>
    </footer>
  );
}

function MediaContent({ asset, alt }: { asset: MediaAsset; alt: string }) {
  const style: CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: asset.fit,
    objectPosition: `${asset.positionX}% ${asset.positionY}%`,
    transform: `scale(${asset.zoom / 100})`,
    opacity: asset.opacity / 100,
  };

  if (/\.(mp4|webm)(\?|$)/i.test(asset.url)) {
    return <video src={asset.url} style={style} autoPlay muted loop playsInline />;
  }
  return <img src={asset.url} alt={alt} style={style} />;
}

export function Visual({ kind = "rose", label = "editorial", asset, editorKey }: { kind?: string; label?: string; asset?: MediaAsset; editorKey?: string }) {
  if (asset?.url) {
    return <div data-editor-media={editorKey} className={(kind === "hero" ? "heroPhotoFrame" : "visual mediaVisual " + kind)}>
      <MediaContent asset={asset} alt={label} />
    </div>;
  }

  if (kind === "hero") {
    return (
      <div data-editor-media={editorKey} className="heroPhotoFrame">
        <img className="heroPhoto" src="/images/leticia-hero.jpg" alt="Letícia Leite em editorial de moda" />
      </div>
    );
  }

  return <div data-editor-media={editorKey} className={"visual " + kind}><span>{label}</span></div>;
}

export function Card({ article, compact = false }: { article: Article; compact?: boolean }) {
  return (
    <article className={compact ? "card compact" : "card"}>
      <Link href={"/artigos/" + article.slug}><Visual kind={article.category.toLowerCase()} label={article.category} /></Link>
      <div className="meta"><span>{article.category}</span><span>{article.readTime}</span></div>
      <h3><Link href={"/artigos/" + article.slug}>{article.title}</Link></h3>
      {!compact && <p>{article.dek}</p>}
      <small>conteúdo demonstrativo</small>
    </article>
  );
}

export function Newsletter({ eyebrow = "Carta da Letícia", title = "Moda, beleza e achados para chegar sem ruído.", eyebrowStyle, titleStyle, editorPrefix }: {
  eyebrow?: string; title?: string; eyebrowStyle?: CSSProperties; titleStyle?: CSSProperties; editorPrefix?: string;
}) {
  return (
    <section className="newsletter shell">
      <div>
        <p className="eyebrow" style={eyebrowStyle} data-editor={editorPrefix ? `${editorPrefix}.eyebrow` : undefined}>{eyebrow}</p>
        <h2 style={titleStyle} data-editor={editorPrefix ? `${editorPrefix}.title` : undefined}>{title}</h2>
      </div>
      <form><input aria-label="Seu e-mail" type="email" placeholder="seu@email.com" /><button type="button">Quero receber</button></form>
    </section>
  );
}

export function Latest({ articles }: { articles: Article[] }) {
  return <div className="articleGrid">{articles.slice(2).map(a => <Card key={a.slug} article={a} />)}</div>;
}
