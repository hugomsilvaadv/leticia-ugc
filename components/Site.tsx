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
