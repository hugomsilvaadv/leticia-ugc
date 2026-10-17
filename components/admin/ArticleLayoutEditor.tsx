"use client";

import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import type { ArticleRecord } from "@/lib/article-store";
import type { ArticleLayout, ArticleLayoutSection, ArticleTileLayout } from "@/lib/site-config";
import { arrangeArticleTiles, moveArticleTile } from "@/lib/article-layout";

type Props = {
  layout: ArticleLayout;
  articles: ArticleRecord[];
  featuredSlug: string;
  onChange: (layout: ArticleLayout) => void;
};

const SECTION: { key: ArticleLayoutSection; label: string; description: string; cols: number }[] = [
  { key: "destaques", label: "Destaques secundários", description: "Dois cartões logo abaixo da capa", cols: 2 },
  { key: "moda", label: "Editoria Moda", description: "Três matérias da grade de Moda", cols: 3 },
  { key: "arquivo", label: "Do arquivo", description: "Matérias do arquivo na página inicial", cols: 3 },
];

function currentSections(articles: ArticleRecord[], featuredSlug: string) {
  const all = articles.filter((a) => a.published);
  const main = all.find((a) => a.slug === featuredSlug) ?? all[0];
  const remaining = all.filter((a) => a.slug !== main?.slug);
  return {
    destaques: remaining.slice(0, 2),
    moda: all.filter((a) => a.category === "Moda").slice(0, 3),
    arquivo: all.slice(2),
  };
}

export default function ArticleLayoutEditor({ layout, articles, featuredSlug, onChange }: Props) {
  const [dragging, setDragging] = useState("");
  const [dropTarget, setDropTarget] = useState("");
  const stage = useRef<HTMLDivElement>(null);
  const moving = useRef<{
    section: ArticleLayoutSection; source: string; over: string | null;
  } | null>(null);
  const resize = useRef<{
    section: ArticleLayoutSection; slug: string; x: number; y: number;
    columns: number; height: number; width: number; lastColumns: number; lastHeight: number;
  } | null>(null);
  const sections = currentSections(articles, featuredSlug);

  function rowsFor(section: ArticleLayoutSection) {
    return arrangeArticleTiles(sections[section], layout[section] || []).map(({ article, columns, height }) => ({
      slug: article.slug, columns, height,
    }));
  }

  function update(section: ArticleLayoutSection, rows: ArticleTileLayout[]) {
    onChange({ ...layout, [section]: rows });
  }

  function updateTile(section: ArticleLayoutSection, slug: string, patch: Partial<ArticleTileLayout>) {
    update(section, rowsFor(section).map((row) => row.slug === slug ? { ...row, ...patch } : row));
  }

  function move(section: ArticleLayoutSection, from: string, to: string) {
    update(section, moveArticleTile(rowsFor(section), from, to));
  }

  function startOrderDrag(event: PointerEvent<HTMLButtonElement>, section: ArticleLayoutSection, slug: string) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    moving.current = { section, source: slug, over: null };
    setDragging(slug);
    setDropTarget("");
  }

  function moveOrderPointer(event: PointerEvent<HTMLButtonElement>) {
    const active = moving.current;
    if (!active) return;
    const tile = document.elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-layout-tile]");
    const found = tile?.closest(`[data-layout-builder="${active.section}"]`) && tile.dataset.layoutTile !== active.source
      ? tile.dataset.layoutTile ?? null : null;
    active.over = found;
    setDropTarget(found || "");
  }

  function finishOrderDrag(event: PointerEvent<HTMLButtonElement>) {
    const active = moving.current;
    if (!active) return;
    const tile = document.elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-layout-tile]");
    const target = tile?.closest(`[data-layout-builder="${active.section}"]`) && tile.dataset.layoutTile !== active.source
      ? tile.dataset.layoutTile : active.over;
    moving.current = null;
    setDragging("");
    setDropTarget("");
    if (target) move(active.section, active.source, target);
  }

  function cancelOrderDrag() {
    moving.current = null;
    setDragging("");
    setDropTarget("");
  }

  function pointerDown(event: PointerEvent<HTMLButtonElement>, section: ArticleLayoutSection, row: ArticleTileLayout, columns: number) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const grid = event.currentTarget.closest(".layoutBuilderGrid") as HTMLElement | null;
    resize.current = {
      section, slug: row.slug, x: event.clientX, y: event.clientY,
      columns: row.columns, height: row.height,
      width: grid?.getBoundingClientRect().width ?? 320,
      lastColumns: row.columns, lastHeight: row.height,
    };
    // Width is snapped to the grid's 2 or 3 real columns.
    if (!grid) resize.current.width = stage.current?.getBoundingClientRect().width ?? 320;
  }

  function pointerMove(event: PointerEvent<HTMLButtonElement>, columns: number) {
    const active = resize.current;
    if (!active) return;
    const unit = Math.max(40, (active.width - (columns - 1) * 8) / columns);
    const nextColumns = Math.max(1, Math.min(columns, active.columns + Math.round((event.clientX - active.x) / unit)));
    const nextHeight = Math.max(180, Math.min(640, Math.round((active.height + (event.clientY - active.y) * 2.8) / 10) * 10));
    if (nextColumns === active.lastColumns && nextHeight === active.lastHeight) return;
    active.lastColumns = nextColumns;
    active.lastHeight = nextHeight;
    updateTile(active.section, active.slug, { columns: nextColumns, height: nextHeight });
  }

  const available = SECTION.some((section) => sections[section.key].length > 0);
  return (
    <div className="layoutBuilder" ref={stage}>
      <div className="adminCard">
        <strong>Organizar os quadros com o mouse</strong>
        <p className="adminHint">
          Segure “⋮⋮ Arraste” e leve o cursor até outro cartão para trocar a posição. Puxe o canto inferior direito ↘ para aumentar ou diminuir largura e altura. Clique em <b>Salvar alterações</b> ao terminar. A prévia ao lado acompanha a organização antes da publicação.
        </p>
        <p className="adminHint">
          As alterações afetam somente o tamanho e a ordem na página inicial, nunca o texto ou a foto de cada matéria. No celular, os cartões seguem em uma coluna para preservar a leitura e as fotografias.
        </p>
      </div>
      {!available && <p role="status">Publique uma matéria para organizar os quadros.</p>}
      {SECTION.map((section) => {
        const rows = rowsFor(section.key);
        const ordered = arrangeArticleTiles(sections[section.key], rows);
        return (
          <section className="adminCard layoutBuilderSection" key={section.key} aria-label={section.label}>
            <div className="layoutBuilderTitle">
              <strong>{section.label}</strong>
              <button type="button" onClick={() => update(section.key, [])} disabled={layout[section.key].length === 0}>
                Restaurar
              </button>
            </div>
            <p className="adminHint">{section.description}</p>
            {ordered.length ? (
              <div
                className="layoutBuilderGrid"
                data-layout-builder={section.key}
                style={{ "--builder-columns": section.cols } as CSSProperties}
              >
                {ordered.map(({ article, columns, height }, index) => {
                  const row = { slug: article.slug, columns: Math.min(section.cols, columns), height };
                  const previewStyle = {
                    gridColumn: `span ${row.columns}`,
                    "--tile-editor-height": `${Math.round(height / 2.9)}px`,
                  } as CSSProperties;
                  return (
                    <article
                      key={article.slug}
                      className={"layoutBuilderTile" + (dragging === article.slug ? " isDragging" : "") + (dropTarget === article.slug ? " isDropTarget" : "")}
                      data-layout-tile={article.slug}
                      style={previewStyle}
                    >
                      <div className="layoutBuilderThumb">
                        {article.hero.url && /\.(png|jpe?g|webp|gif)(?:\?.*)?$/i.test(article.hero.url)
                          ? <img src={article.hero.url} alt="" loading="lazy" draggable={false} />
                          : <span aria-hidden="true">FOTO</span>}
                        <button
                          type="button"
                          className="layoutBuilderDragLabel"
                          aria-label={`Arrastar ${article.title}`}
                          title="Segure e arraste até outro quadro para trocar a ordem"
                          onPointerDown={(event) => startOrderDrag(event, section.key, article.slug)}
                          onPointerMove={moveOrderPointer}
                          onPointerUp={finishOrderDrag}
                          onPointerCancel={cancelOrderDrag}
                        >⋮⋮ Arraste</button>
                      </div>
                      <div className="layoutBuilderCardInfo">
                        <span title={article.title}>{article.title}</span>
                        <div className="layoutBuilderActions">
                          <button type="button" disabled={index === 0} onClick={() => move(section.key, article.slug, ordered[index - 1].article.slug)} aria-label={`Mover ${article.title} para cima`}>↑</button>
                          <button type="button" disabled={index === ordered.length - 1} onClick={() => move(section.key, article.slug, ordered[index + 1].article.slug)} aria-label={`Mover ${article.title} para baixo`}>↓</button>
                          <span>{row.columns}/{section.cols} · {row.height}px</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="layoutBuilderResize"
                        draggable={false}
                        aria-label={`Redimensionar quadro ${article.title}`}
                        title="Arraste para mudar a largura e a altura; setas do teclado também funcionam"
                        onDragStart={(e) => e.preventDefault()}
                        onPointerDown={(e) => pointerDown(e, section.key, row, section.cols)}
                        onPointerMove={(e) => pointerMove(e, section.cols)}
                        onPointerUp={() => { resize.current = null; }}
                        onPointerCancel={() => { resize.current = null; }}
                        onKeyDown={(e) => {
                          const steps: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -30], ArrowDown: [0, 30] };
                          const delta = steps[e.key];
                          if (!delta) return;
                          e.preventDefault();
                          updateTile(section.key, row.slug, {
                            columns: Math.max(1, Math.min(section.cols, row.columns + delta[0])),
                            height: Math.max(180, Math.min(640, row.height + delta[1])),
                          });
                        }}
                      >↘</button>
                    </article>
                  );
                })}
              </div>
            ) : <p className="adminHint">Não há matérias publicadas nessa seção.</p>}
          </section>
        );
      })}
    </div>
  );
}
