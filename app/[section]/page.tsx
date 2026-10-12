import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Visual } from "@/components/Site";
import PortfolioGallery from "@/components/PortfolioGallery";
import { readPortfolio } from "@/lib/portfolio-store";
import { readSiteConfig } from "@/lib/site-config";
import { readArticles } from "@/lib/article-store";
import { sectionCopy, sectionFromSlug } from "@/lib/content";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  const { section } = await params;
  const config = await readSiteConfig();
  const title =
    section === "ugc"
      ? config.pages.ugc.title
      : section === "sobre"
        ? config.pages.about.title
        : sectionFromSlug(section);
  return {
    title: title || "Página não encontrada",
    alternates: { canonical: "/" + section },
    openGraph: { title: title || "Letícia Leite", url: "/" + section },
  };
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const config = await readSiteConfig();

  if (section === "ugc") {
    const portfolio = await readPortfolio();
    const content = config.pages.ugc;
    return (
      <main id="conteudo">
        <section className="ugcHero shell">
          <div>
            <p className="eyebrow">UGC Creator · moda, beleza & lifestyle</p>
            <h1 data-editor="pages.ugc.title">{content.title}</h1>
            <p data-editor="pages.ugc.intro">{content.intro}</p>
            <a className="button" href="mailto:leticialeitecontent@gmail.com">
              Solicitar proposta
            </a>
          </div>
          <Visual
            kind="portrait"
            label="Letícia Leite"
            asset={content.portrait}
            editorKey="pages.ugc.portrait"
          />
        </section>
        <section className="services shell">
          <p className="eyebrow">Serviços</p>
          <h2>Formatos que posso criar</h2>
          <div className="servicesGrid">
            <article>
              <h3>Provadores</h3>
              <p>
                Looks completos, apresentação de peças, combinações, styling,
                GRWM e lançamentos.
              </p>
            </article>
            <article>
              <h3>Vídeos editados</h3>
              <p>
                Reels, TikTok, unboxing, review, demonstração, narração e
                lifestyle.
              </p>
            </article>
            <article>
              <h3>UGC</h3>
              <p>
                Depoimentos, reviews, rotina, antes/depois, tutorial,
                storytelling e espontâneo.
              </p>
            </article>
            <article>
              <h3>Fotos</h3>
              <p>Produto, uso real, feed, campanha e lifestyle.</p>
            </article>
          </div>
        </section>
        <PortfolioGallery items={portfolio} />
        <section className="why shell">
          <p className="eyebrow">Por que comigo</p>
          <div>
            <h2>Um olhar que entende o produto antes de apertar o rec.</h2>
            <ul>
              <li>Formação em Design de Moda</li>
              <li>Styling, composição e apresentação</li>
              <li>Comunicação natural diante das câmeras</li>
              <li>Olhar comercial sem perder autenticidade</li>
              <li>Flexibilidade entre criação orgânica e briefing</li>
            </ul>
          </div>
        </section>
      </main>
    );
  }

  if (section === "sobre") {
    const content = config.pages.about;
    return (
      <main id="conteudo" className="shell about">
        <section>
          <div>
            <p className="eyebrow">Sobre mim</p>
            <h1 data-editor="pages.about.title">{content.title}</h1>
            <p data-editor="pages.about.firstParagraph">
              {content.firstParagraph}
            </p>
            <p data-editor="pages.about.secondParagraph">
              {content.secondParagraph}
            </p>
          </div>
          <Visual
            kind="portrait"
            label="Letícia Leite"
            asset={content.portrait}
            editorKey="pages.about.portrait"
          />
        </section>
        <blockquote data-editor="pages.about.quote">
          “{content.quote}”
        </blockquote>
      </main>
    );
  }

  const category = sectionFromSlug(section);
  if (!category) notFound();
  const list = (await readArticles()).filter(
    (a) => a.published && a.category === category,
  );

  return (
    <main id="conteudo">
      <section className="categoryHero shell">
        <p className="eyebrow">Arquivo editorial</p>
        <h1>{category}</h1>
        <p>{sectionCopy[category]}</p>
      </section>
      <section className="articleGrid shell categoryGrid">
        {list.map((a) => (
          <Card key={a.slug} article={a} />
        ))}
      </section>
      {list.length === 0 && (
        <p className="shell">
          Os primeiros conteúdos desta editoria entram na próxima atualização.
        </p>
      )}
      <div className="shell back">
        <Link className="textLink" href="/">
          Voltar à capa
        </Link>
      </div>
    </main>
  );
}
