import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/Site";
import { readArticles } from "@/lib/article-store";
import { searchPublishedArticles } from "@/lib/editorial-search";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Buscar matérias | Letícia Leite",
  description: "Encontre artigos de moda, beleza, achados e lifestyle.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/busca" },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = (raw ?? "").trim().slice(0, 120);
  const results = query
    ? searchPublishedArticles(await readArticles(), query)
    : [];

  return (
    <main id="conteudo">
      <section className="categoryHero shell">
        <p className="eyebrow">Arquivo editorial</p>
        <h1>Encontre sua próxima leitura</h1>
        <p>Pesquise por moda, beleza, estilo, achados ou algum tema que te inspire.</p>
        <form action="/busca" method="get" role="search" style={{ marginTop: "2rem" }}>
          <label htmlFor="editorial-query" style={{ display: "block", marginBottom: ".65rem" }}>
            Buscar nas matérias
          </label>
          <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
            <input
              id="editorial-query"
              name="q"
              type="search"
              defaultValue={query}
              maxLength={120}
              placeholder="Ex.: acessórios, tendências, maquiagem"
              autoComplete="off"
              style={{
                flex: "1 1 250px",
                minWidth: 0,
                padding: "1rem",
                border: "1px solid #918271",
                borderRadius: 0,
                background: "#FDF9F2",
                color: "#3B2B22",
                font: "inherit",
              }}
            />
            <button type="submit" className="button">Pesquisar</button>
          </div>
        </form>
      </section>
      {query ? (
        <section className="shell section" aria-live="polite">
          <div className="sectionHead">
            <div>
              <p className="eyebrow">Resultados da busca</p>
              <h2>{results.length === 1 ? "1 matéria encontrada" : `${results.length} matérias encontradas`}</h2>
            </div>
          </div>
          {results.length ? (
            <div className="articleGrid">
              {results.map((article) => (
                <Card key={article.slug} article={article} />
              ))}
            </div>
          ) : (
            <p>Nenhuma matéria encontrada para “{query}”. Experimente buscar uma palavra diferente.</p>
          )}
        </section>
      ) : (
        <section className="shell section">
          <p>Comece com uma palavra-chave ou explore as editorias:</p>
          <p><Link className="textLink" href="/moda">Moda</Link> · <Link className="textLink" href="/beleza">Beleza</Link> · <Link className="textLink" href="/lifestyle">Lifestyle</Link> · <Link className="textLink" href="/achados">Achados</Link></p>
        </section>
      )}
    </main>
  );
}
