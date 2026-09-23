'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import type { MediaAsset, SiteConfig, TextStyle } from "@/lib/site-config";
import type { ArticleRecord } from "@/lib/article-store";

const fonts = ["Georgia", "Times New Roman", "Arial", "Verdana", "Trebuchet MS", "Garamond", "Courier New"];

function TextControl({
  label, value, style, onValue, onStyle, multiline = false,
}: {
  label: string;
  value: string;
  style: TextStyle;
  onValue: (value: string) => void;
  onStyle: (style: TextStyle) => void;
  multiline?: boolean;
}) {
  const set = <K extends keyof TextStyle>(key: K, value: TextStyle[K]) => onStyle({ ...style, [key]: value });

  return <div className="adminCard">
    <strong>{label}</strong>
    {multiline
      ? <textarea value={value} rows={4} onChange={e => onValue(e.target.value)} />
      : <input value={value} onChange={e => onValue(e.target.value)} />}
    <label>Fonte
      <select value={style.fontFamily} onChange={e => set("fontFamily", e.target.value)}>
        {fonts.map(font => <option key={font} value={font}>{font}</option>)}
      </select>
    </label>
    <label>Tamanho <b>{style.fontSize}px</b>
      <input type="range" min="9" max="120" value={style.fontSize} onChange={e => set("fontSize", Number(e.target.value))} />
    </label>
    <div className="adminRangeRow">
      <label>Horizontal <b>{style.x}</b>
        <input type="range" min="-120" max="120" value={style.x} onChange={e => set("x", Number(e.target.value))} />
      </label>
      <label>Vertical <b>{style.y}</b>
        <input type="range" min="-120" max="120" value={style.y} onChange={e => set("y", Number(e.target.value))} />
      </label>
    </div>
    <label>Alinhamento
      <select value={style.align} onChange={e => set("align", e.target.value as TextStyle["align"])}>
        <option value="left">Esquerda</option>
        <option value="center">Centro</option>
        <option value="right">Direita</option>
      </select>
    </label>
  </div>;
}

function MediaControl({
  label, asset, password, onChange,
}: {
  label: string;
  asset: MediaAsset;
  password: string;
  onChange: (asset: MediaAsset) => void;
}) {
  const set = <K extends keyof MediaAsset>(key: K, value: MediaAsset[K]) => onChange({ ...asset, [key]: value });

  async function upload(file?: File) {
    if (!file) return;
    if (!password) return alert("Digite a senha do painel antes de enviar a mídia.");

    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/upload", { method: "POST", headers: { "x-admin-password": password }, body });
    const data = await response.json();
    if (!response.ok) return alert(data.error || "Falha no upload.");
    set("url", data.url);
  }

  return <div className="adminCard">
    <strong>{label}</strong>
    <input type="file" accept="image/*,video/mp4,video/webm" onChange={e => upload(e.target.files?.[0])} />
    <label>URL da mídia
      <input value={asset.url} placeholder="/images/foto.jpg" onChange={e => set("url", e.target.value)} />
    </label>
    <div className="adminRangeRow">
      <label>Posição X <b>{asset.positionX}%</b>
        <input type="range" min="0" max="100" value={asset.positionX} onChange={e => set("positionX", Number(e.target.value))} />
      </label>
      <label>Posição Y <b>{asset.positionY}%</b>
        <input type="range" min="0" max="100" value={asset.positionY} onChange={e => set("positionY", Number(e.target.value))} />
      </label>
    </div>
    <label>Zoom <b>{asset.zoom}%</b>
      <input type="range" min="70" max="220" value={asset.zoom} onChange={e => set("zoom", Number(e.target.value))} />
    </label>
    <label>Opacidade <b>{asset.opacity}%</b>
      <input type="range" min="0" max="100" value={asset.opacity} onChange={e => set("opacity", Number(e.target.value))} />
    </label>
    <label>Enquadramento
      <select value={asset.fit} onChange={e => set("fit", e.target.value as MediaAsset["fit"])}>
        <option value="cover">Cobrir o espaço</option>
        <option value="contain">Mostrar inteira</option>
      </select>
    </label>
  </div>;
}

function textPreview(style: TextStyle) {
  return {
    fontFamily: style.fontFamily,
    fontSize: `${Math.max(9, style.fontSize * .72)}px`,
    transform: `translate(${style.x * .55}px, ${style.y * .55}px)`,
    textAlign: style.align,
  } as React.CSSProperties;
}

function MediaPreview({ asset, fallback }: { asset: MediaAsset; fallback: string }) {
  const src = asset.url || fallback;
  const common = {
    width: "100%", height: "100%", objectFit: asset.fit,
    objectPosition: `${asset.positionX}% ${asset.positionY}%`,
    transform: `scale(${asset.zoom / 100})`,
    opacity: asset.opacity / 100,
  } as React.CSSProperties;

  return /\.(mp4|webm)(\?|$)/i.test(src)
    ? <video src={src} style={common} autoPlay muted loop playsInline />
    : <img src={src} alt="" style={common} />;
}

export default function AdminEditor() {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState("hero");
  const [status, setStatus] = useState("Carregando...");
  const [saving, setSaving] = useState(false);
  const [articles, setArticles] = useState<ArticleRecord[]>([]);
  const [articlesLoaded, setArticlesLoaded] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [previewScale, setPreviewScale] = useState(1);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewHostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/site-config", { cache: "no-store" })
      .then(r => r.json())
      .then(data => { setConfig(data); setStatus("Pronto para editar."); })
      .catch(() => setStatus("Não foi possível carregar a configuração."));

    fetch("/api/articles", { cache: "no-store" })
      .then(r => r.json())
      .then((data: ArticleRecord[]) => {
        setArticles(data);
        setSelectedSlug(data[0]?.slug || "");
        setArticlesLoaded(true);
      })
      .catch(() => setStatus("Site carregado, mas houve erro ao carregar os artigos."));
  }, []);

  useEffect(() => {
    const host = previewHostRef.current;
    if (!host) return;

    const observer = new ResizeObserver(() => {
      const targetWidth = previewMode === "desktop" ? 1440 : 390;
      const available = Math.max(280, host.clientWidth - 20);
      setPreviewScale(Math.min(1, available / targetWidth));
    });

    observer.observe(host);
    return () => observer.disconnect();
  }, [previewMode]);

  useEffect(() => {
    if (!config) return;
    iframeRef.current?.contentWindow?.postMessage(
      { type: "LETICIA_EDITOR_PREVIEW", config },
      window.location.origin
    );
  }, [config]);

  const tabs = useMemo(() => [
    ["artigos", "Artigos"], ["marca", "Marca"], ["hero", "Destaque"], ["lookbook", "Looks"], ["beauty", "Beleza"],
    ["ugc", "UGC"], ["newsletter", "Newsletter"], ["footer", "Rodapé"],
  ], []);

  async function save() {
    if (!config) return;
    if (!password) return alert("Digite a senha do painel.");
    setSaving(true);
    setStatus("Salvando...");
    const response = await fetch("/api/site-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify(config),
    });
    const data = await response.json();
    if (!response.ok) {
      setSaving(false);
      setStatus(data.error || "Falha ao salvar.");
      return;
    }
    setConfig(data);

    if (articlesLoaded) {
      const articleResponse = await fetch("/api/articles", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify(articles),
      });
      const articleData = await articleResponse.json();
      if (!articleResponse.ok) {
        setSaving(false);
        setStatus(articleData.error || "O site foi salvo, mas houve erro nos artigos.");
        return;
      }
      setArticles(articleData);
      if (selectedSlug && !articleData.some((article: ArticleRecord) => article.slug === selectedSlug)) {
        setSelectedSlug(articleData[0]?.slug || "");
      }
    }

    setSaving(false);
    setStatus("Alterações publicadas.");
  }

  if (!config) return <div className="adminOverlay"><div className="adminLoading">{status}</div></div>;

  const setBrand = (patch: Partial<SiteConfig["brand"]>) => setConfig({ ...config, brand: { ...config.brand, ...patch } });
  const setHome = <K extends keyof SiteConfig["home"]>(key: K, patch: Partial<SiteConfig["home"][K]>) =>
    setConfig({ ...config, home: { ...config.home, [key]: { ...config.home[key], ...patch } } });
  const setFooter = (patch: Partial<SiteConfig["footer"]>) => setConfig({ ...config, footer: { ...config.footer, ...patch } });

  const h = config.home;
  const selectedArticle = articles.find(article => article.slug === selectedSlug) ?? null;

  const updateArticle = (patch: Partial<ArticleRecord>) => {
    if (!selectedArticle) return;
    const oldSlug = selectedArticle.slug;
    const next = { ...selectedArticle, ...patch };
    setArticles(items => items.map(article => article.slug === oldSlug ? next : article));
    if (patch.slug !== undefined) setSelectedSlug(patch.slug);
  };

  const createArticle = () => {
    const slug = `novo-artigo-${Date.now().toString().slice(-6)}`;
    const article: ArticleRecord = {
      slug,
      title: "Novo artigo",
      dek: "",
      category: "Moda",
      readTime: "5 min",
      published: false,
      publishedAt: new Date().toISOString().slice(0, 10),
      hero: { url: "", positionX: 50, positionY: 50, zoom: 100, opacity: 100, fit: "cover" },
      body: "",
    };
    setArticles(items => [article, ...items]);
    setSelectedSlug(slug);
    setTab("artigos");
  };

  const deleteArticle = () => {
    if (!selectedArticle) return;
    if (!window.confirm(`Excluir “${selectedArticle.title}”? Essa exclusão só será efetivada ao clicar em Salvar e publicar.`)) return;
    const next = articles.filter(article => article.slug !== selectedArticle.slug);
    setArticles(next);
    setSelectedSlug(next[0]?.slug || "");
  };

  return <div className="adminOverlay">
    <aside className="adminPanel">
      <div className="adminTop">
        <div><span>EDITOR VISUAL</span><h1>Blog da Letícia</h1></div>
        <a href="/" target="_blank" rel="noreferrer">Abrir site ↗</a>
      </div>

      <label className="adminPassword">Senha do painel
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="A mesma senha do Linktree" />
      </label>

      <nav className="adminTabs">
        {tabs.map(([id, label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>)}
      </nav>

      <div className="adminControls">
        {tab === "artigos" && <div className="articleAdmin">
          <div className="articleAdminHeader">
            <button type="button" className="adminPrimarySmall" onClick={createArticle}>+ Novo artigo</button>
            <span>{articles.length} artigo(s)</span>
          </div>

          <div className="adminCard">
            <strong>Selecionar matéria</strong>
            <select value={selectedSlug} onChange={e => setSelectedSlug(e.target.value)}>
              {articles.map(article => <option key={article.slug} value={article.slug}>{article.published ? "●" : "○"} {article.title}</option>)}
            </select>
          </div>

          {selectedArticle && <>
            <div className="adminCard">
              <strong>Publicação</strong>
              <label className="adminCheck"><input type="checkbox" checked={selectedArticle.published} onChange={e => updateArticle({ published: e.target.checked })} /> Publicado no site</label>
              <label>Data de publicação<input type="date" value={selectedArticle.publishedAt} onChange={e => updateArticle({ publishedAt: e.target.value })} /></label>
              <label>Categoria
                <select value={selectedArticle.category} onChange={e => updateArticle({ category: e.target.value as ArticleRecord["category"] })}>
                  <option value="Moda">Moda</option>
                  <option value="Beleza">Beleza</option>
                  <option value="Lifestyle">Lifestyle</option>
                  <option value="Achados">Achados</option>
                </select>
              </label>
              <label>Tempo de leitura<input value={selectedArticle.readTime} onChange={e => updateArticle({ readTime: e.target.value })} placeholder="5 min" /></label>
            </div>

            <div className="adminCard">
              <strong>Título e endereço</strong>
              <label>Título<input value={selectedArticle.title} onChange={e => updateArticle({ title: e.target.value })} /></label>
              <label>Slug / endereço<input value={selectedArticle.slug} onChange={e => updateArticle({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-") })} /></label>
              <label>Resumo<textarea rows={4} value={selectedArticle.dek} onChange={e => updateArticle({ dek: e.target.value })} /></label>
            </div>

            <MediaControl label="Imagem de capa" asset={selectedArticle.hero} password={password} onChange={hero => updateArticle({ hero })} />

            <div className="adminCard">
              <strong>Corpo da matéria</strong>
              <p className="adminHint">Parágrafos: deixe uma linha em branco. Título interno: comece com ##. Citação: comece com &gt;.</p>
              <textarea className="articleBodyEditor" rows={18} value={selectedArticle.body} onChange={e => updateArticle({ body: e.target.value })} />
              {selectedArticle.slug && <a className="adminArticleLink" href={`/artigos/${selectedArticle.slug}`} target="_blank" rel="noreferrer">Abrir esta matéria ↗</a>}
            </div>

            <button type="button" className="adminDanger" onClick={deleteArticle}>Excluir matéria</button>
          </>}
        </div>}

        {tab === "marca" && <>
          <div className="adminCard"><strong>Linha superior</strong><input value={config.brand.utility} onChange={e => setBrand({ utility: e.target.value })} /></div>
          <TextControl label="Nome / marca" value={config.brand.wordmark} style={config.brand.wordmarkStyle}
            onValue={value => setBrand({ wordmark: value })} onStyle={wordmarkStyle => setBrand({ wordmarkStyle })} />
          <div className="adminCard"><strong>Assinatura</strong><input value={config.brand.signature} onChange={e => setBrand({ signature: e.target.value })} /></div>
        </>}

        {tab === "hero" && <>
          <TextControl label="Chamada pequena" value={h.hero.eyebrow} style={h.hero.eyebrowStyle}
            onValue={eyebrow => setHome("hero", { eyebrow })} onStyle={eyebrowStyle => setHome("hero", { eyebrowStyle })} />
          <TextControl label="Título principal" value={h.hero.title} style={h.hero.titleStyle} multiline
            onValue={title => setHome("hero", { title })} onStyle={titleStyle => setHome("hero", { titleStyle })} />
          <TextControl label="Resumo" value={h.hero.dek} style={h.hero.dekStyle} multiline
            onValue={dek => setHome("hero", { dek })} onStyle={dekStyle => setHome("hero", { dekStyle })} />
          <div className="adminCard"><strong>Texto do link</strong><input value={h.hero.buttonText} onChange={e => setHome("hero", { buttonText: e.target.value })} /></div>
          <MediaControl label="Foto principal" asset={h.hero.media} password={password} onChange={media => setHome("hero", { media })} />
        </>}

        {tab === "lookbook" && <>
          <TextControl label="Chamada" value={h.lookbook.eyebrow} style={h.lookbook.eyebrowStyle}
            onValue={eyebrow => setHome("lookbook", { eyebrow })} onStyle={eyebrowStyle => setHome("lookbook", { eyebrowStyle })} />
          <TextControl label="Título" value={h.lookbook.title} style={h.lookbook.titleStyle} multiline
            onValue={title => setHome("lookbook", { title })} onStyle={titleStyle => setHome("lookbook", { titleStyle })} />
          <TextControl label="Texto" value={h.lookbook.body} style={h.lookbook.bodyStyle} multiline
            onValue={body => setHome("lookbook", { body })} onStyle={bodyStyle => setHome("lookbook", { bodyStyle })} />
          <div className="adminCard"><strong>Texto do link</strong><input value={h.lookbook.buttonText} onChange={e => setHome("lookbook", { buttonText: e.target.value })} /></div>
          <MediaControl label="Foto / vídeo" asset={h.lookbook.media} password={password} onChange={media => setHome("lookbook", { media })} />
        </>}

        {tab === "beauty" && <>
          <TextControl label="Chamada" value={h.beauty.eyebrow} style={h.beauty.eyebrowStyle}
            onValue={eyebrow => setHome("beauty", { eyebrow })} onStyle={eyebrowStyle => setHome("beauty", { eyebrowStyle })} />
          <TextControl label="Título" value={h.beauty.title} style={h.beauty.titleStyle} multiline
            onValue={title => setHome("beauty", { title })} onStyle={titleStyle => setHome("beauty", { titleStyle })} />
          <TextControl label="Introdução" value={h.beauty.intro} style={h.beauty.introStyle} multiline
            onValue={intro => setHome("beauty", { intro })} onStyle={introStyle => setHome("beauty", { introStyle })} />
          <MediaControl label="Foto / vídeo" asset={h.beauty.media} password={password} onChange={media => setHome("beauty", { media })} />
        </>}

        {tab === "ugc" && <>
          <TextControl label="Chamada" value={h.ugc.eyebrow} style={h.ugc.eyebrowStyle}
            onValue={eyebrow => setHome("ugc", { eyebrow })} onStyle={eyebrowStyle => setHome("ugc", { eyebrowStyle })} />
          <TextControl label="Título" value={h.ugc.title} style={h.ugc.titleStyle} multiline
            onValue={title => setHome("ugc", { title })} onStyle={titleStyle => setHome("ugc", { titleStyle })} />
          <TextControl label="Texto" value={h.ugc.body} style={h.ugc.bodyStyle} multiline
            onValue={body => setHome("ugc", { body })} onStyle={bodyStyle => setHome("ugc", { bodyStyle })} />
          <div className="adminCard"><strong>Texto do botão</strong><input value={h.ugc.buttonText} onChange={e => setHome("ugc", { buttonText: e.target.value })} /></div>
          <MediaControl label="Mídia de produto" asset={h.ugc.mediaProduct} password={password} onChange={mediaProduct => setHome("ugc", { mediaProduct })} />
          <MediaControl label="Mídia da Letícia" asset={h.ugc.mediaCreator} password={password} onChange={mediaCreator => setHome("ugc", { mediaCreator })} />
        </>}

        {tab === "newsletter" && <>
          <TextControl label="Chamada" value={h.newsletter.eyebrow} style={h.newsletter.eyebrowStyle}
            onValue={eyebrow => setHome("newsletter", { eyebrow })} onStyle={eyebrowStyle => setHome("newsletter", { eyebrowStyle })} />
          <TextControl label="Título" value={h.newsletter.title} style={h.newsletter.titleStyle} multiline
            onValue={title => setHome("newsletter", { title })} onStyle={titleStyle => setHome("newsletter", { titleStyle })} />
        </>}

        {tab === "footer" && <div className="adminCard"><strong>Descrição do rodapé</strong>
          <textarea rows={4} value={config.footer.description} onChange={e => setFooter({ description: e.target.value })} />
        </div>}
      </div>

      <div className="adminSaveBar">
        <span>{status}</span>
        <button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar e publicar"}</button>
      </div>
    </aside>

    <main className="adminPreview">
      <div className="adminPreviewToolbar">
        <div>
          <strong>Prévia real do site</strong>
          <span>Mesma página, mesmos componentes e mesmo CSS do público.</span>
        </div>
        <div className="previewModeButtons">
          <button className={previewMode === "desktop" ? "active" : ""} onClick={() => setPreviewMode("desktop")}>Desktop</button>
          <button className={previewMode === "mobile" ? "active" : ""} onClick={() => setPreviewMode("mobile")}>Celular</button>
        </div>
      </div>
      <div className="previewBrowser">
        <div className="previewBar"><i /><i /><i /><span>leticia-ugc-production.up.railway.app</span></div>
        <div className="previewViewport" ref={previewHostRef} style={{ height: `${(previewMode === "desktop" ? 4300 : 6500) * previewScale}px` }}>
          <iframe
            ref={iframeRef}
            title="Prévia real do blog"
            className="adminPreviewFrame"
            src="/?editorPreview=1"
            style={{
              width: previewMode === "desktop" ? "1440px" : "390px",
              height: previewMode === "desktop" ? "4300px" : "6500px",
              transform: `scale(${previewScale})`,
            }}
            onLoad={() => {
              if (!config) return;
              iframeRef.current?.contentWindow?.postMessage(
                { type: "LETICIA_EDITOR_PREVIEW", config },
                window.location.origin
              );
            }}
          />
        </div>
      </div>
    </main>
  </div>;
}
