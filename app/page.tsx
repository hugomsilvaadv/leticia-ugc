import Link from "next/link";
import type { CSSProperties } from "react";
import { Card, Latest, Newsletter, Visual } from "@/components/Site";
import { readArticles } from "@/lib/article-store";
import { readSiteConfig, type TextStyle } from "@/lib/site-config";

export const dynamic = "force-dynamic";

function textStyle(style: TextStyle): CSSProperties {
  return {
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    transform: `translate(${style.x}px, ${style.y}px)`,
    textAlign: style.align,
  };
}

export default async function Home() {
  const allArticles = (await readArticles()).filter((article) => article.published);
  const lead = allArticles[0];
  const second = allArticles[1] ?? lead;
  const third = allArticles[2] ?? lead;
  const config = await readSiteConfig();
  const { hero, lookbook, beauty, ugc, newsletter } = config.home;

  return (
    <main>
      {lead && <section className="lead shell">
        <div className="leadMain">
          <Visual kind="hero" label="Letícia Leite · moda & estilo" asset={hero.media} editorKey="home.hero.media" />
          <div className="leadCopy">
            <p className="eyebrow" style={textStyle(hero.eyebrowStyle)} data-editor="home.hero.eyebrow">{hero.eyebrow}</p>
            <h1 style={textStyle(hero.titleStyle)} data-editor="home.hero.title"><Link href={"/artigos/" + lead.slug}>{hero.title}</Link></h1>
            <p style={textStyle(hero.dekStyle)} data-editor="home.hero.dek">{hero.dek}</p>
            <Link className="textLink" href={"/artigos/" + lead.slug} data-editor="home.hero.buttonText">{hero.buttonText}</Link>
          </div>
        </div>
        <aside className="leadSide">
          {second && <Card article={second} compact />}
          {third && <Card article={third} compact />}
        </aside>
      </section>}

      <section className="ticker shell"><b>AGORA</b><Link href="/moda">styling</Link><Link href="/beleza">beleza real</Link><Link href="/achados">achados</Link><Link href="/lifestyle">lifestyle</Link></section>

      <section className="section shell">
        <div className="sectionHead"><div><p className="eyebrow">Editoria</p><h2>Moda</h2></div><Link className="textLink" href="/moda">Ver tudo</Link></div>
        <div className="articleGrid">{allArticles.filter(a => a.category === "Moda").slice(0,3).map(a => <Card key={a.slug} article={a} />)}</div>
      </section>

      <section className="lookbook shell">
        <div>
          <p className="eyebrow" style={textStyle(lookbook.eyebrowStyle)} data-editor="home.lookbook.eyebrow">{lookbook.eyebrow}</p>
          <h2 style={textStyle(lookbook.titleStyle)} data-editor="home.lookbook.title">{lookbook.title}</h2>
          <p style={textStyle(lookbook.bodyStyle)} data-editor="home.lookbook.body">{lookbook.body}</p>
          <Link className="textLink" href="/moda" data-editor="home.lookbook.buttonText">{lookbook.buttonText}</Link>
        </div>
        <Visual kind="look" label="lookbook · foto da Letícia" asset={lookbook.media} editorKey="home.lookbook.media" />
      </section>

      <section className="section shell">
        <div className="sectionHead"><div>
          <p className="eyebrow" style={textStyle(beauty.eyebrowStyle)} data-editor="home.beauty.eyebrow">{beauty.eyebrow}</p>
          <h2 style={textStyle(beauty.titleStyle)} data-editor="home.beauty.title">{beauty.title}</h2>
        </div><Link className="textLink" href="/beleza">Ver beleza</Link></div>
        <div className="split">
          <Visual kind="beauty" label="beleza · review" asset={beauty.media} editorKey="home.beauty.media" />
          <div><p className="intro" style={textStyle(beauty.introStyle)} data-editor="home.beauty.intro">{beauty.intro}</p>{third && <Card article={third} compact />}</div>
        </div>
      </section>

      <section className="ugcBand">
        <div className="shell ugcGrid">
          <div>
            <p className="eyebrow" style={textStyle(ugc.eyebrowStyle)} data-editor="home.ugc.eyebrow">{ugc.eyebrow}</p>
            <h2 style={textStyle(ugc.titleStyle)} data-editor="home.ugc.title">{ugc.title}</h2>
            <p style={textStyle(ugc.bodyStyle)} data-editor="home.ugc.body">{ugc.body}</p>
            <div className="actions"><Link className="button" href="/ugc" data-editor="home.ugc.buttonText">{ugc.buttonText}</Link><a className="textLink" href="mailto:leticialeitecontent@gmail.com">Falar sobre um projeto</a></div>
          </div>
          <div className="ugcVisuals">
            <Visual kind="jewelry" label="produto" asset={ugc.mediaProduct} editorKey="home.ugc.mediaProduct" />
            <Visual kind="portrait" label="creator" asset={ugc.mediaCreator} editorKey="home.ugc.mediaCreator" />
          </div>
        </div>
      </section>

      <section className="section shell"><div className="sectionHead"><div><p className="eyebrow">Últimas leituras</p><h2>Do arquivo</h2></div></div><Latest articles={allArticles} /></section>
      <Newsletter
        eyebrow={newsletter.eyebrow}
        title={newsletter.title}
        eyebrowStyle={textStyle(newsletter.eyebrowStyle)}
        titleStyle={textStyle(newsletter.titleStyle)}
        editorPrefix="home.newsletter"
      />
    </main>
  );
}
