import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Visual } from "@/components/Site";
import { readArticles } from "@/lib/article-store";
import { sectionCopy, sectionFromSlug } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;

  if (section === "ugc") {
    return <main>
      <section className="ugcHero shell"><div><p className="eyebrow">UGC Creator · moda, beleza & lifestyle</p><h1>Conteúdo com repertório de moda e intenção comercial.</h1><p>Minha formação em Design de Moda me permite pensar composição, styling, tendência e apresentação de produto. A entrega pode ser orgânica ou seguir o briefing com precisão.</p><a className="button" href="mailto:leticialeitecontent@gmail.com">Solicitar proposta</a></div><Visual kind="portrait" label="Letícia Leite" /></section>
      <section className="services shell"><p className="eyebrow">Serviços</p><h2>Formatos que posso criar</h2><div className="servicesGrid">
        <article><h3>Provadores</h3><p>Looks completos, apresentação de peças, combinações, styling, GRWM e lançamentos.</p></article>
        <article><h3>Vídeos editados</h3><p>Reels, TikTok, unboxing, review, demonstração, narração e lifestyle.</p></article>
        <article><h3>UGC</h3><p>Depoimentos, reviews, rotina, antes/depois, tutorial, storytelling e espontâneo.</p></article>
        <article><h3>Fotos</h3><p>Produto, uso real, feed, campanha e lifestyle.</p></article>
      </div></section>
      <section className="portfolio shell"><Visual kind="jewelry" label="semijoias" /><Visual kind="beauty" label="maquiagem" /><Visual kind="look" label="looks" /></section>
      <section className="why shell"><p className="eyebrow">Por que comigo</p><div><h2>Um olhar que entende o produto antes de apertar o rec.</h2><ul><li>Formação em Design de Moda</li><li>Styling, composição e apresentação</li><li>Comunicação natural diante das câmeras</li><li>Olhar comercial sem perder autenticidade</li><li>Flexibilidade entre criação orgânica e briefing</li></ul></div></section>
    </main>;
  }

  if (section === "sobre") {
    return <main className="shell about"><section><div><p className="eyebrow">Sobre mim</p><h1>Moda sempre foi linguagem.</h1><p>A criatividade sempre fez parte de quem eu sou. Desde pequena, escolhia tecidos e desenhava minhas próprias roupas. Hoje, transformo essa paixão em conteúdo, unindo meu olhar criativo ao universo da moda, beleza e lifestyle.</p><p>Amo descobrir novas marcas, experimentar produtos e compartilhar referências de forma leve, autêntica e próxima.</p></div><Visual kind="portrait" label="Letícia Leite" /></section><blockquote>“Criar é mais do que mostrar. É despertar interesse, identificação e desejo.”</blockquote></main>;
  }

  const category = sectionFromSlug(section);
  if (!category) notFound();
  const list = (await readArticles()).filter(a => a.published && a.category === category);

  return <main>
    <section className="categoryHero shell"><p className="eyebrow">Arquivo editorial</p><h1>{category}</h1><p>{sectionCopy[category]}</p></section>
    <section className="articleGrid shell categoryGrid">{list.map(a => <Card key={a.slug} article={a} />)}</section>
    {list.length === 0 && <p className="shell">Os primeiros conteúdos desta editoria entram na próxima atualização.</p>}
    <div className="shell back"><Link className="textLink" href="/">Voltar à capa</Link></div>
  </main>;
}
