import Link from "next/link";
import { notFound } from "next/navigation";
import { Visual } from "@/components/Site";
import { articles } from "@/lib/content";

export function generateStaticParams() { return articles.map(a => ({ slug: a.slug })); }

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = articles.find(a => a.slug === slug);
  if (!article) notFound();

  return <main className="article shell">
    <Link className="eyebrow" href={"/" + article.category.toLowerCase()}>{article.category}</Link>
    <h1>{article.title}</h1>
    <p className="dek">{article.dek}</p>
    <div className="byline"><span>Por Letícia Leite</span><span>23 set 2026</span><span>{article.readTime} de leitura</span></div>
    <Visual kind={article.category.toLowerCase()} label={article.category + " · editorial"} />
    <div className="articleBody">
      <p className="demo">Este texto é demonstrativo para validar o layout editorial. A versão publicada receberá o conteúdo final da Letícia.</p>
      <p>Um bom look começa menos pela quantidade de peças e mais pela leitura de proporção, textura e intenção. É isso que transforma uma combinação simples em algo que parece coerente e pessoal.</p>
      <h2>O ponto de partida</h2>
      <p>Antes de adicionar informação, vale escolher um elemento que conduza a produção. Pode ser uma modelagem, um acessório, uma cor ou uma textura. A partir dele, o restante entra para equilibrar — não para competir.</p>
      <blockquote>Estilo não precisa parecer complicado para ser interessante.</blockquote>
      <p>Essa lógica também ajuda a comprar melhor: quando uma peça conversa com o repertório que já existe no armário, ela tende a render muito mais combinações.</p>
    </div>
  </main>;
}
