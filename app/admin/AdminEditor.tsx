'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import type { MediaAsset, SiteConfig, TextStyle } from "@/lib/site-config";
import type { ArticleRecord } from "@/lib/article-store";
import type { PortfolioItem } from "@/lib/portfolio-store";
import { getNumberedSections } from "@/lib/article-body";

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
  label, asset, password, onChange, imageOnly = false,
}: {
  label: string;
  asset: MediaAsset;
  password: string;
  onChange: (asset: MediaAsset) => void;
  imageOnly?: boolean;
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
    <input type="file" accept={imageOnly ? "image/jpeg,image/png,image/webp,image/gif" : "image/*,video/mp4,video/webm"} onChange={e => upload(e.target.files?.[0])} />
    <label>URL da mídia
      <input value={asset.url} placeholder="/api/media/foto.jpg ou URL pública" onChange={e => set("url", e.target.value)} />
    </label>
    {asset.url && <div className="adminMediaPreview">
      {/\.(mp4|webm)(\?|$)/i.test(asset.url)
        ? <video src={asset.url} controls playsInline preload="metadata" />
        : /^https:\/\/(?:www\.)?(?:youtube\.com|youtu\.be|vimeo\.com|instagram\.com)/i.test(asset.url)
          ? <a href={asset.url} target="_blank" rel="noreferrer">Abrir vídeo em outra aba ↗</a>
          : <img src={asset.url} alt="Prévia da mídia enviada" />}
    </div>}
    <p className="adminUploadHint">Após enviar ou alterar o link, clique em Salvar e publicar. Arquivos até 30 MB.</p>
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

export default function AdminEditor() {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState("hero");
  const [status, setStatus] = useState("Carregando...");
  const [saving, setSaving] = useState(false);
  const [articles, setArticles] = useState<ArticleRecord[]>([]);
  const [articlesLoaded, setArticlesLoaded] = useState(false);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [portfolioLoaded, setPortfolioLoaded] = useState(false);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState("");
  const [selectedSlug, setSelectedSlug] = useState("");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [previewScale, setPreviewScale] = useState(1);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewHostRef = useRef<HTMLDivElement>(null);
  const selectedArticle = articles.find(article => article.slug === selectedSlug) ?? null;
  const selectedPortfolio = portfolio.find(item => item.id === selectedPortfolioId) ?? null;

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
    fetch("/api/portfolio", { cache: "no-store" })
      .then(r => r.json())
      .then((data: PortfolioItem[]) => {
        setPortfolio(data);
        setSelectedPortfolioId(data[0]?.id || "");
        setPortfolioLoaded(true);
      })
      .catch(() => setStatus("Erro ao carregar o portfólio."));
  }, []);

  useEffect(() => {
    const host = previewHostRef.current;
    if (!host) return;

    const observer = new ResizeObserver(() => {
      const targetWidth = previewMode === "desktop" ? 1440 : 390;
      const targetHeight = previewMode === "desktop" ? 900 : 844;
      const availableWidth = Math.max(260, host.clientWidth - 24);
      const availableHeight = Math.max(320, host.clientHeight - 24);
      setPreviewScale(Math.min(1, availableWidth / targetWidth, availableHeight / targetHeight));
    });

    observer.observe(host);
    return () => observer.disconnect();
  }, [previewMode]);

  useEffect(() => {
    if (!config) return;
    const scrollKeyByTab: Record<string, string> = {
      artigos: "article.title",
      "pagina-ugc": "pages.ugc.title",
      "pagina-sobre": "pages.about.title",
      marca: "brand.wordmark",
      hero: "home.hero.title",
      lookbook: "home.lookbook.title",
      beauty: "home.beauty.title",
      ugc: "home.ugc.title",
      newsletter: "home.newsletter.title",
      footer: "footer.description",
    };

    const frame = window.requestAnimationFrame(() => {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: "LETICIA_EDITOR_PREVIEW",
          config,
          article: tab === "artigos" ? selectedArticle ?? undefined : undefined,
          scrollKey: scrollKeyByTab[tab],
        },
        window.location.origin
      );
    });

    return () => window.cancelAnimationFrame(frame);
  }, [config, selectedArticle, tab]);

  const tabGroups = useMemo(() => [
    { label: "Conteúdo e publicações", tabs: [["artigos", "Matérias e capas"], ["portfolio", "Fotos e vídeos UGC"]] },
    { label: "Página inicial", tabs: [["hero", "Destaque da capa"], ["lookbook", "Looks"], ["beauty", "Beleza"], ["ugc", "Faixa UGC"], ["newsletter", "Newsletter"]] },
    { label: "Páginas internas", tabs: [["pagina-ugc", "Página UGC"], ["pagina-sobre", "Página Sobre"]] },
    { label: "Identidade", tabs: [["marca", "Marca e cabeçalho"], ["footer", "Rodapé"]] },
  ], []);

  const tabInfo: Record<string, { title: string; description: string; href: string }> = {
    artigos: { title: "Matérias do blog", description: "A capa da matéria aparece em seus cards na página inicial e nas editorias.", href: "/moda" },
    portfolio: { title: "Portfólio — fotos e vídeos", description: "Adicione fotos, vídeos MP4/WebM ou links públicos do YouTube, Vimeo ou Instagram. Publique e salve para aparecer na página UGC.", href: "/ugc#portfolio" },
    hero: { title: "Destaque principal da capa", description: "Foto e texto do topo do site, com escolha da matéria vinculada ao botão.", href: "/" },
    lookbook: { title: "Looks da semana", description: "Bloco de imagem e texto da página inicial, abaixo da editoria Moda.", href: "/" },
    beauty: { title: "Beleza na capa", description: "Bloco de beleza da página inicial, não a página inteira da editoria.", href: "/" },
    ugc: { title: "Faixa UGC da página inicial", description: "Edite o convite para o portfólio na capa. A página UGC e a galeria têm seções próprias.", href: "/" },
    newsletter: { title: "Chamada da newsletter", description: "Edite o texto da capa. O cadastro de e-mails requer uma integração de envio.", href: "/" },
    "pagina-ugc": { title: "Página UGC", description: "Título, apresentação e foto em /ugc; o portfólio é editado separadamente.", href: "/ugc" },
    "pagina-sobre": { title: "Página Sobre", description: "Biografia, foto e citação da Letícia em /sobre.", href: "/sobre" },
    marca: { title: "Identidade do site", description: "Nome e cabeçalho exibidos em todas as páginas.", href: "/" },
    footer: { title: "Rodapé", description: "Descrição exibida em todas as páginas.", href: "/" },
  };

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

    if (portfolioLoaded) {
      const response = await fetch("/api/portfolio", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify(portfolio),
      });
      const data = await response.json();
      if (!response.ok) {
        setSaving(false);
        setStatus(data.error || "Site salvo, mas houve erro ao salvar o portfólio.");
        return;
      }
      setPortfolio(data);
    }
    setSaving(false);
    setStatus("Alterações publicadas.");
    iframeRef.current?.contentWindow?.location.reload();
  }

  if (!config) return <div className="adminOverlay"><div className="adminLoading">{status}</div></div>;

  const setBrand = (patch: Partial<SiteConfig["brand"]>) => setConfig({ ...config, brand: { ...config.brand, ...patch } });
  const setHome = <K extends keyof SiteConfig["home"]>(key: K, patch: Partial<SiteConfig["home"][K]>) =>
    setConfig({ ...config, home: { ...config.home, [key]: { ...config.home[key], ...patch } } });
  const setFooter = (patch: Partial<SiteConfig["footer"]>) => setConfig({ ...config, footer: { ...config.footer, ...patch } });
  const setPage = <K extends keyof SiteConfig["pages"]>(key: K, patch: Partial<SiteConfig["pages"][K]>) =>
    setConfig({ ...config, pages: { ...config.pages, [key]: { ...config.pages[key], ...patch } } });
  const updatePortfolio = (patch: Partial<PortfolioItem>) =>
    setPortfolio(items => items.map(item => item.id === selectedPortfolioId ? { ...item, ...patch } : item));
  const addPortfolio = () => {
    const id = crypto.randomUUID();
    const item: PortfolioItem = { id, title: "Novo trabalho", description: "", type: "Vídeo", published: false,
      media: { url: "", positionX: 50, positionY: 50, zoom: 100, opacity: 100, fit: "cover" } };
    setPortfolio(items => [...items, item]);
    setSelectedPortfolioId(id);
  };
  const removePortfolio = () => {
    if (!selectedPortfolio || !window.confirm("Excluir este trabalho ao salvar?")) return;
    const next = portfolio.filter(item => item.id !== selectedPortfolio.id);
    setPortfolio(next);
    setSelectedPortfolioId(next[0]?.id || "");
  };
  const movePortfolio = (shift: number) => {
    const index = portfolio.findIndex(item => item.id === selectedPortfolioId);
    const target = index + shift;
    if (index < 0 || target < 0 || target >= portfolio.length) return;
    const next = [...portfolio];
    [next[index], next[target]] = [next[target], next[index]];
    setPortfolio(next);
  };

  const h = config.home;
  const previewWidth = previewMode === "desktop" ? 1440 : 390;
  const previewHeight = previewMode === "desktop" ? 900 : 844;
  const previewSrc = tab === "artigos"
    ? "/editor-preview/article?editorPreview=1"
    : tab === "portfolio" || tab === "pagina-ugc"
      ? "/ugc?editorPreview=1"
      : tab === "pagina-sobre"
        ? "/sobre?editorPreview=1"
        : "/?editorPreview=1";

  const postPreview = (scrollKey?: string) => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: "LETICIA_EDITOR_PREVIEW",
        config,
        article: tab === "artigos" ? selectedArticle ?? undefined : undefined,
        scrollKey,
      },
      window.location.origin
    );
  };

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
      sectionMedia: {},
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

      <nav className="adminTabs" aria-label="Seções do editor">
        {tabGroups.map(group => <div className="adminTabGroup" key={group.label}>
          <strong>{group.label}</strong>
          <div className="adminTabItems">{group.tabs.map(([id, label]) =>
            <button type="button" key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>
          )}</div>
        </div>)}
      </nav>

      <div className="adminSectionInfo">
        <strong>{tabInfo[tab]?.title}</strong>
        <p>{tabInfo[tab]?.description}</p>
        <a href={tabInfo[tab]?.href} target="_blank" rel="noreferrer">Abrir página correspondente ↗</a>
      </div>
      <div className="adminControls">
        {tab === "artigos" && <div className="articleAdmin">
          <p className="adminHint">A capa da matéria é a mesma usada nos cards da página inicial e das editorias.</p>
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
              <label>Título<input value={selectedArticle.title} onFocus={() => postPreview("article.title")} onChange={e => updateArticle({ title: e.target.value })} /></label>
              <label>Slug / endereço<input value={selectedArticle.slug} onChange={e => updateArticle({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-") })} /></label>
              <label>Resumo<textarea rows={4} value={selectedArticle.dek} onFocus={() => postPreview("article.dek")} onChange={e => updateArticle({ dek: e.target.value })} /></label>
            </div>

            <MediaControl label="Imagem de capa" asset={selectedArticle.hero} password={password} onChange={hero => updateArticle({ hero })} />

            <div className="adminCard">
              <strong>Corpo da matéria</strong>
              <p className="adminHint">Parágrafos: deixe uma linha em branco. Título interno: comece com ##. Citação: comece com &gt;. Para criar um bloco de acessório com foto própria, use um título numerado, como 1. Bolsa, seguido pelo texto.</p>
              <textarea className="articleBodyEditor" rows={18} value={selectedArticle.body} onFocus={() => postPreview("article.body")} onChange={e => updateArticle({ body: e.target.value })} />
              {selectedArticle.slug && <a className="adminArticleLink" href={`/artigos/${selectedArticle.slug}`} target="_blank" rel="noreferrer">Abrir esta matéria ↗</a>}
            </div>

            <div className="adminCard adminArticleSections">
              <strong>Imagens dentro da matéria</strong>
              <p className="adminHint">Cada tópico numerado tem sua própria imagem, independente da capa. Abra um item para fazer o upload. A foto aparecerá abaixo do texto recuado assim que você clicar em Salvar e publicar.</p>
              {getNumberedSections(selectedArticle.body).length === 0
                ? <p className="adminHint">Nenhum tópico numerado encontrado. No corpo da matéria, crie um parágrafo “1. Nome do item” e, no parágrafo seguinte, sua descrição.</p>
                : getNumberedSections(selectedArticle.body).map(section => {
                    const asset = selectedArticle.sectionMedia?.[section.key] ?? { url: "", positionX: 50, positionY: 50, zoom: 100, opacity: 100, fit: "cover" as const };
                    return <details className="adminArticleSectionItem" key={section.key}>
                      <summary><span>{section.number}. {section.title}</span><small>{asset.url ? "Imagem adicionada" : "Adicionar imagem"}</small></summary>
                      <MediaControl
                        label={`Imagem de ${section.title}`}
                        asset={asset}
                        password={password}
                        imageOnly
                        onChange={media => updateArticle({ sectionMedia: { ...selectedArticle.sectionMedia, [section.key]: media } })}
                      />
                      {asset.url && <button className="adminRemoveSectionImage" type="button" onClick={() => updateArticle({ sectionMedia: { ...selectedArticle.sectionMedia, [section.key]: { ...asset, url: "" } } })}>Retirar esta imagem da matéria</button>}
                    </details>;
                  })}
            </div>

            <button type="button" className="adminDanger" onClick={deleteArticle}>Excluir matéria</button>
          </>}
        </div>}

        {tab === "portfolio" && <div className="articleAdmin">
          <div className="articleAdminHeader"><button type="button" className="adminPrimarySmall" onClick={addPortfolio}>+ Adicionar trabalho</button><span>{portfolio.length} trabalho(s)</span></div>
          <div className="adminCard">
            <strong>Escolha o trabalho</strong>
            <select value={selectedPortfolioId} onChange={e => setSelectedPortfolioId(e.target.value)}>
              {portfolio.map((item, index) => <option key={item.id} value={item.id}>{index + 1}. {item.published ? "●" : "○"} {item.title}</option>)}
            </select>
            {portfolio.length === 0 && <p className="adminHint">Clique em Adicionar trabalho para começar.</p>}
          </div>
          {selectedPortfolio && <>
            <div className="adminCard">
              <strong>Informações do trabalho</strong>
              <label className="adminCheck"><input type="checkbox" checked={selectedPortfolio.published} onChange={e => updatePortfolio({ published: e.target.checked })} /> Publicar no site</label>
              <label>Tipo<select value={selectedPortfolio.type} onChange={e => updatePortfolio({ type: e.target.value as PortfolioItem["type"] })}><option value="Vídeo">Vídeo</option><option value="Foto">Foto</option></select></label>
              <label>Título<input value={selectedPortfolio.title} onChange={e => updatePortfolio({ title: e.target.value })} /></label>
              <label>Descrição<textarea rows={3} value={selectedPortfolio.description} onChange={e => updatePortfolio({ description: e.target.value })} /></label>
            </div>
            <MediaControl label="Arquivo ou link do vídeo/foto" asset={selectedPortfolio.media} password={password} onChange={media => updatePortfolio({ media })} />
            <p className="adminHint">Vídeos: MP4 ou WebM até 30 MB, ou URL pública do YouTube, Vimeo ou Instagram. Clique em Salvar e publicar para atualizar a galeria.</p>
            <div className="portfolioEditorActions">
              <button type="button" onClick={() => movePortfolio(-1)}>↑ Subir</button>
              <button type="button" onClick={() => movePortfolio(1)}>↓ Descer</button>
              <button type="button" className="adminDanger" onClick={removePortfolio}>Excluir trabalho</button>
            </div>
          </>}
        </div>}

        {tab === "pagina-ugc" && <>
          <div className="adminCard"><strong>Apresentação da página UGC</strong>
            <label>Título<textarea rows={3} value={config.pages.ugc.title} onChange={e => setPage("ugc", { title: e.target.value })} /></label>
            <label>Texto de apresentação<textarea rows={6} value={config.pages.ugc.intro} onChange={e => setPage("ugc", { intro: e.target.value })} /></label>
          </div>
          <MediaControl label="Foto principal da página UGC" asset={config.pages.ugc.portrait} password={password} onChange={portrait => setPage("ugc", { portrait })} />
          <p className="adminHint">Edite os vídeos e fotos em Conteúdo e publicações → Fotos e vídeos UGC.</p>
        </>}

        {tab === "pagina-sobre" && <>
          <div className="adminCard"><strong>Sobre a Letícia</strong>
            <label>Título<input value={config.pages.about.title} onChange={e => setPage("about", { title: e.target.value })} /></label>
            <label>Primeiro parágrafo<textarea rows={6} value={config.pages.about.firstParagraph} onChange={e => setPage("about", { firstParagraph: e.target.value })} /></label>
            <label>Segundo parágrafo<textarea rows={5} value={config.pages.about.secondParagraph} onChange={e => setPage("about", { secondParagraph: e.target.value })} /></label>
            <label>Citação<textarea rows={3} value={config.pages.about.quote} onChange={e => setPage("about", { quote: e.target.value })} /></label>
          </div>
          <MediaControl label="Foto da página Sobre" asset={config.pages.about.portrait} password={password} onChange={portrait => setPage("about", { portrait })} />
        </>}

        {tab === "marca" && <>
          <div className="adminCard"><strong>Linha superior</strong><input value={config.brand.utility} onChange={e => setBrand({ utility: e.target.value })} /></div>
          <TextControl label="Nome / marca" value={config.brand.wordmark} style={config.brand.wordmarkStyle}
            onValue={value => setBrand({ wordmark: value })} onStyle={wordmarkStyle => setBrand({ wordmarkStyle })} />
          <div className="adminCard"><strong>Assinatura</strong><input value={config.brand.signature} onChange={e => setBrand({ signature: e.target.value })} /></div>
        </>}

        {tab === "hero" && <>
          <div className="adminCard">
            <strong>Matéria vinculada ao destaque</strong>
            <p className="adminHint">Define o destino do botão Ler matéria. O título e resumo abaixo são independentes. Para usar a capa da matéria, deixe vazia a URL da foto principal.</p>
            <select value={h.hero.featuredSlug} onChange={e => setHome("hero", { featuredSlug: e.target.value })}>
              <option value="">Automático: primeira matéria publicada</option>
              {articles.filter(a => a.published).map(a => <option key={a.slug} value={a.slug}>{a.title}</option>)}
            </select>
          </div>
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
          <strong>{tab === "artigos" ? "Prévia da matéria" : "Prévia da página correspondente"}</strong>
          <span>{tab === "artigos" ? "A matéria muda aqui enquanto você edita." : "Textos e fotos atualizam na prévia. A galeria atualiza após salvar."}</span>
        </div>
        <div className="previewModeButtons">
          <button className={previewMode === "desktop" ? "active" : ""} onClick={() => setPreviewMode("desktop")}>Desktop</button>
          <button className={previewMode === "mobile" ? "active" : ""} onClick={() => setPreviewMode("mobile")}>Celular</button>
        </div>
      </div>

      <div className="previewBrowser">
        <div className="previewBar">
          <i /><i /><i />
          <span>{tab === "artigos" && selectedArticle ? `/artigos/${selectedArticle.slug}` : tabInfo[tab]?.href}</span>
        </div>
        <div className="previewViewport" ref={previewHostRef}>
          <iframe
            ref={iframeRef}
            title="Prévia real do blog"
            className="adminPreviewFrame"
            src={previewSrc}
            style={{
              width: `${previewWidth}px`,
              height: `${previewHeight}px`,
              transform: `translate(-50%, -50%) scale(${previewScale})`,
            }}
            onLoad={() => {
              const scrollKeyByTab: Record<string, string> = {
                artigos: "article.title",
                marca: "brand.wordmark",
                hero: "home.hero.title",
                lookbook: "home.lookbook.title",
                beauty: "home.beauty.title",
                ugc: "home.ugc.title",
                newsletter: "home.newsletter.title",
                footer: "footer.description",
              };
              postPreview(scrollKeyByTab[tab]);
            }}
          />
        </div>
      </div>
    </main>
  </div>;
}