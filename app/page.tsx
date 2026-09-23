import Link from "next/link";
import { Card, Latest, Newsletter, Visual } from "@/components/Site";
import { articles } from "@/lib/content";

export default function Home() {
  const lead = articles[0];
  return (
    <main>
      <section className="lead shell">
        <div className="leadMain">
          <Visual kind="hero" label="Letícia Leite · moda & estilo" />
          <div className="leadCopy">
            <p className="eyebrow">Em destaque · Moda</p>
            <h1><Link href={"/artigos/" + lead.slug}>{lead.title}</Link></h1>
            <p>{lead.dek}</p>
            <Link className="textLink" href={"/artigos/" + lead.slug}>Ler matéria</Link>
          </div>
        </div>
        <aside className="leadSide">
          <Card article={articles[1]} compact />
          <Card article={articles[2]} compact />
        </aside>
      </section>

      <section className="ticker shell"><b>AGORA</b><Link href="/moda">styling</Link><Link href="/beleza">beleza real</Link><Link href="/achados">achados</Link><Link href="/lifestyle">lifestyle</Link></section>

      <section className="section shell">
        <div className="sectionHead"><div><p className="eyebrow">Editoria</p><h2>Moda</h2></div><Link className="textLink" href="/moda">Ver tudo</Link></div>
        <div className="articleGrid">{articles.filter(a => a.category === "Moda").slice(0,3).map(a => <Card key={a.slug} article={a} />)}</div>
      </section>

      <section className="lookbook shell">
        <div><p className="eyebrow">Looks & styling</p><h2>Estilo é repertório em movimento.</h2><p>Referências, combinações e pequenas decisões de proporção que fazem um look conversar com quem veste.</p><Link className="textLink" href="/moda">Explorar styling</Link></div>
        <Visual kind="look" label="lookbook · foto da Letícia" />
      </section>

      <section className="section shell">
        <div className="sectionHead"><div><p className="eyebrow">Beleza</p><h2>Testados, favoritos e acabamento</h2></div><Link className="textLink" href="/beleza">Ver beleza</Link></div>
        <div className="split"><Visual kind="beauty" label="beleza · review" /><div><p className="intro">Beleza entra como extensão do estilo: textura, cor, rotina e produto vistos sem promessa exagerada.</p><Card article={articles[2]} compact /></div></div>
      </section>

      <section className="ugcBand">
        <div className="shell ugcGrid">
          <div><p className="eyebrow">UGC · Trabalhe comigo</p><h2>Conteúdo pensado para conectar marca, produto e pessoa.</h2><p>Criação para moda, beleza e lifestyle com olhar de Design de Moda, styling, comunicação natural e atenção ao briefing.</p><div className="actions"><Link className="button" href="/ugc">Ver portfólio UGC</Link><a className="textLink" href="mailto:leticialeitecontent@gmail.com">Falar sobre um projeto</a></div></div>
          <div className="ugcVisuals"><Visual kind="jewelry" label="produto" /><Visual kind="portrait" label="creator" /></div>
        </div>
      </section>

      <section className="section shell"><div className="sectionHead"><div><p className="eyebrow">Últimas leituras</p><h2>Do arquivo</h2></div></div><Latest /></section>
      <Newsletter />
    </main>
  );
}
