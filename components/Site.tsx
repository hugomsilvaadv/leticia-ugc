import Link from "next/link";
import { Article, articles } from "@/lib/content";

export function Header() {
  return (
    <header>
      <div className="utility">moda • beleza • lifestyle • conteúdo autoral</div>
      <div className="masthead shell">
        <Link href="/" className="wordmark">LETÍCIA LEITE</Link>
        <span className="signature">editado por Letícia</span>
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

export function Footer() {
  return (
    <footer className="footer">
      <div className="shell footerGrid">
        <div>
          <div className="footerBrand">LETÍCIA LEITE</div>
          <p>Moda, criatividade e comunicação para transformar produtos em experiências.</p>
        </div>
        <div><strong>Explorar</strong><Link href="/moda">Moda</Link><Link href="/beleza">Beleza</Link><Link href="/lifestyle">Lifestyle</Link><Link href="/achados">Achados</Link></div>
        <div><strong>Contato</strong><Link href="/ugc">UGC</Link><a href="mailto:leticialeitecontent@gmail.com">E-mail</a><a href="https://instagram.com/leticiafndg" target="_blank" rel="noreferrer">Instagram</a></div>
      </div>
      <div className="shell footerBottom">© 2026 Letícia Leite · Ribeirão Preto (SP) / Sete Lagoas (MG)</div>
    </footer>
  );
}

export function Visual({ kind = "rose", label = "editorial" }: { kind?: string; label?: string }) {
  if (kind === "hero") {
    return (
      <img
        className="heroPhoto"
        src={"data:image/jpeg;base64,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"}
        alt="Letícia Leite em editorial de moda"
      />
    );
  }

  return <div className={"visual " + kind}><span>{label}</span></div>;
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

export function Newsletter() {
  return (
    <section className="newsletter shell">
      <div><p className="eyebrow">Carta da Letícia</p><h2>Moda, beleza e achados para chegar sem ruído.</h2></div>
      <form><input aria-label="Seu e-mail" type="email" placeholder="seu@email.com" /><button type="button">Quero receber</button></form>
    </section>
  );
}

export function Latest() {
  return <div className="articleGrid">{articles.slice(2).map(a => <Card key={a.slug} article={a} />)}</div>;
}
