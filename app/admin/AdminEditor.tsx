"use client";
import { UploadActivity } from "@/components/admin/UploadActivity";
import NewsletterAdmin from "@/components/admin/NewsletterAdmin";
import LinktreeEditor from "@/components/admin/LinktreeEditor";
import LinktreeView from "@/components/LinktreeView";
import type { LinktreeConfig } from "@/lib/linktree-model";
import MediaControl from "@/components/admin/MediaControl";
import ArticleLayoutEditor from "@/components/admin/ArticleLayoutEditor";
import MediaLibrary from "@/components/admin/MediaLibrary";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MediaAsset, SiteConfig, TextStyle } from "@/lib/site-config";
import type { ArticleRecord } from "@/lib/article-store";
import type { PortfolioItem } from "@/lib/portfolio-store";
import { getNumberedSections } from "@/lib/article-body";

const resourceLabels: Record<string, string> = {
  "site-config": "Páginas e aparência",
  articles: "Matérias",
  portfolio: "Portfólio",
  linktree: "Linktree",
};
const fonts = [
  "Georgia",
  "Times New Roman",
  "Arial",
  "Verdana",
  "Trebuchet MS",
  "Garamond",
  "Courier New",
];

function TextControl({
  label,
  value,
  style,
  onValue,
  onStyle,
  multiline = false,
}: {
  label: string;
  value: string;
  style: TextStyle;
  onValue: (value: string) => void;
  onStyle: (style: TextStyle) => void;
  multiline?: boolean;
}) {
  const set = <K extends keyof TextStyle>(key: K, value: TextStyle[K]) =>
    onStyle({ ...style, [key]: value });

  return (
    <div className="adminCard">
      <strong>{label}</strong>
      {multiline ? (
        <textarea
          aria-label={label}
          value={value}
          rows={4}
          onChange={(e) => onValue(e.target.value)}
        />
      ) : (
        <input
          aria-label={label}
          value={value}
          onChange={(e) => onValue(e.target.value)}
        />
      )}
      <label>
        Fonte
        <select
          value={style.fontFamily}
          onChange={(e) => set("fontFamily", e.target.value)}
        >
          {fonts.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>
      </label>
      <label>
        Tamanho no desktop <b>{style.fontSize}px</b>
        <input
          type="range"
          min="9"
          max="120"
          value={style.fontSize}
          onChange={(e) => set("fontSize", Number(e.target.value))}
        />
      </label>
      <div className="adminRangeRow">
        <label>
          Horizontal <b>{style.x}</b>
          <input
            type="range"
            min="-120"
            max="120"
            value={style.x}
            onChange={(e) => set("x", Number(e.target.value))}
          />
        </label>
        <label>
          Vertical <b>{style.y}</b>
          <input
            type="range"
            min="-120"
            max="120"
            value={style.y}
            onChange={(e) => set("y", Number(e.target.value))}
          />
        </label>
      </div>
      <label>
        Alinhamento
        <select
          value={style.align}
          onChange={(e) => set("align", e.target.value as TextStyle["align"])}
        >
          <option value="left">Esquerda</option>
          <option value="center">Centro</option>
          <option value="right">Direita</option>
        </select>
      </label>
    </div>
  );
}

export default function AdminEditor() {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState("dashboard");
  const [linktree, setLinktree] = useState<LinktreeConfig | null>(null);
  const [activeUploads, setActiveUploads] = useState(0);
  const [authenticated, setAuthenticated] = useState(false);
  const [loadingFull, setLoadingFull] = useState(false);
  const loadEpoch = useRef(0);
  const baseline = useRef<
    Record<string, { json: string; etag: string; full: boolean }>
  >({});
  const [status, setStatus] = useState("Carregando...");
  const [saving, setSaving] = useState(false);
  const [articles, setArticles] = useState<ArticleRecord[]>([]);
  const [articlesLoaded, setArticlesLoaded] = useState(false);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [portfolioLoaded, setPortfolioLoaded] = useState(false);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState("");
  const [selectedSlug, setSelectedSlug] = useState("");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">(
    "desktop",
  );
  const [previewScale, setPreviewScale] = useState(1);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewHostRef = useRef<HTMLDivElement>(null);
  const selectedArticle =
    articles.find((article) => article.slug === selectedSlug) ?? null;
  const selectedPortfolio =
    portfolio.find((item) => item.id === selectedPortfolioId) ?? null;

  async function loadContent(
    adminPassword?: string,
  ): Promise<{ epoch: number; errors: string[] }> {
    const epoch = ++loadEpoch.current;
    const errors: string[] = [];
    const load = async (key: string, set: (data: any) => void) => {
      try {
        const response = await fetch(`/api/${key}`, {
          cache: "no-store",
          headers: adminPassword ? { "x-admin-password": adminPassword } : {},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (epoch !== loadEpoch.current) return;
        baseline.current[key] = {
          json: JSON.stringify(data),
          etag: response.headers.get("etag") || "",
          full: !!adminPassword,
        };
        set(data);
      } catch (error) {
        errors.push(
          `${resourceLabels[key]}: ${error instanceof Error ? error.message : "Falha de conexão."}`,
        );
      }
    };
    await Promise.all([
      load("site-config", setConfig),
      load("articles", (data) => {
        setArticles(data);
        setSelectedSlug(data[0]?.slug || "");
        setArticlesLoaded(true);
      }),
      load("portfolio", (data) => {
        setPortfolio(data);
        setSelectedPortfolioId(data[0]?.id || "");
        setPortfolioLoaded(true);
      }),
      load("linktree", setLinktree),
    ]);
    return { epoch, errors };
  }
  useEffect(() => {
    void loadContent().then(({ epoch, errors }) => {
      if (epoch !== loadEpoch.current) return;
      // Antes da autenticação, endpoints privados podem negar ou limitar
      // dados propositalmente. Não mostrar isso como falha do Linktree/portfólio.
      setStatus(
        errors.some((message) => message.startsWith("Páginas e aparência:"))
          ? "Não foi possível carregar o painel. Atualize a página."
          : "Informe a senha para editar.",
      );
    });
  }, []);

  const currentValues: Record<string, unknown> = {
    "site-config": config,
    articles: articlesLoaded ? articles : null,
    portfolio: portfolioLoaded ? portfolio : null,
    linktree,
  };
  const dirtyKeys = Object.keys(currentValues).filter(
    (key) =>
      baseline.current[key] &&
      currentValues[key] !== null &&
      JSON.stringify(currentValues[key]) !== baseline.current[key].json,
  );
  const dirty = dirtyKeys.length > 0;
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  async function verifyPassword() {
    setLoadingFull(true);
    try {
      const response = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "x-admin-password": password },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setAuthenticated(true);
      if (!dirty) {
        const { epoch, errors } = await loadContent(password);
        if (epoch !== loadEpoch.current) return;
        if (errors.length) {
          setStatus(
            "Senha validada. Áreas indisponíveis: " + errors.join("; "),
          );
          return;
        }
      }
      setStatus("Senha validada. Você pode salvar alterações.");
    } catch (error) {
      setAuthenticated(false);
      setStatus(error instanceof Error ? error.message : "Falha de conexão.");
    } finally {
      setLoadingFull(false);
    }
  }

  useEffect(() => {
    const host = previewHostRef.current;
    if (!host) return;

    const observer = new ResizeObserver(() => {
      const targetWidth = previewMode === "desktop" ? 1440 : 390;
      const targetHeight = previewMode === "desktop" ? 900 : 844;
      const availableWidth = Math.max(260, host.clientWidth - 24);
      const availableHeight = Math.max(320, host.clientHeight - 24);
      setPreviewScale(
        Math.min(
          1,
          availableWidth / targetWidth,
          availableHeight / targetHeight,
        ),
      );
    });

    observer.observe(host);
    return () => observer.disconnect();
  }, [previewMode, Boolean(config), tab === "linktree"]);

  useEffect(() => {
    if (!config || tab === "linktree") return;
    const scrollKeyByTab: Record<string, string> = {
      artigos: "article.title",
      "pagina-ugc": "pages.ugc.title",
      "pagina-sobre": "pages.about.title",
      marca: "brand.wordmark",
      hero: "home.hero.title",
      "layout-materias": "home.articleLayout",
      lookbook: "home.lookbook.title",
      beauty: "home.beauty.title",
      ugc: "home.ugc.title",
      newsletter: "home.newsletter.title",
      footer: "footer.description",
    };

    const send = () =>
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: "LETICIA_EDITOR_PREVIEW",
          config,
          article:
            tab === "artigos" && authenticated
              ? (selectedArticle ?? undefined)
              : undefined,
          scrollKey: scrollKeyByTab[tab],
        },
        window.location.origin,
      );
    const ready = (event: MessageEvent) => {
      if (
        event.origin === window.location.origin &&
        event.source === iframeRef.current?.contentWindow &&
        event.data?.type === "LETICIA_EDITOR_READY"
      )
        send();
    };
    window.addEventListener("message", ready);
    const frame = window.requestAnimationFrame(send);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("message", ready);
    };
  }, [config, selectedArticle, tab, authenticated]);

  const tabGroups = useMemo(
    () => [
      { label: "Visão geral", tabs: [["dashboard", "Dashboard"]] },
      { label: "Linktree", tabs: [["linktree", "Perfil, links e vídeos"]] },
      { label: "Newsletter", tabs: [["inscritos", "Inscritos"]] },
      { label: "Mídia", tabs: [["biblioteca", "Biblioteca de arquivos"]] },
      {
        label: "Conteúdo e publicações",
        tabs: [
          ["artigos", "Matérias e capas"],
          ["portfolio", "Fotos e vídeos UGC"],
        ],
      },
      {
        label: "Página inicial",
        tabs: [
          ["hero", "Destaque da capa"],
          ["layout-materias", "Layout das matérias"],
          ["lookbook", "Looks"],
          ["beauty", "Beleza"],
          ["ugc", "Faixa UGC"],
          ["newsletter", "Newsletter"],
        ],
      },
      {
        label: "Páginas internas",
        tabs: [
          ["pagina-ugc", "Página UGC"],
          ["pagina-sobre", "Página Sobre"],
        ],
      },
      {
        label: "Identidade",
        tabs: [
          ["marca", "Marca e cabeçalho"],
          ["footer", "Rodapé"],
        ],
      },
    ],
    [],
  );

  const tabInfo: Record<
    string,
    { title: string; description: string; href: string }
  > = {
    dashboard: {
      title: "Visão geral",
      description:
        "Escolha a página e a seção que deseja editar. Apenas conteúdos alterados serão salvos.",
      href: "/",
    },
    linktree: {
      title: "Linktree → Perfil, links e vídeos",
      description:
        "Gerencie /linktree no mesmo painel. Ordene links, redes sociais, mídias e blocos; a prévia acompanha a edição.",
      href: "/linktree",
    },
    biblioteca: {
      title: "Mídia → Biblioteca",
      description:
        "Reutilize arquivos existentes; nenhuma mídia é excluída pela biblioteca.",
      href: "/ugc",
    },
    artigos: {
      title: "Matérias do blog",
      description:
        "A capa da matéria aparece em seus cards na página inicial e nas editorias.",
      href: "/moda",
    },
    portfolio: {
      title: "Portfólio — fotos e vídeos",
      description:
        "Adicione fotos, vídeos MP4/WebM ou links públicos do YouTube, Vimeo ou Instagram. Publique e salve para aparecer na página UGC.",
      href: "/ugc#portfolio",
    },
    hero: {
      title: "Destaque principal da capa",
      description:
        "Foto e texto do topo do site, com escolha da matéria vinculada ao botão.",
      href: "/",
    },
    "layout-materias": {
      title: "Layout das matérias da página inicial",
      description: "Arraste e redimensione os quadros dos destaques, Moda e Do arquivo. Salve só depois de conferir a prévia.",
      href: "/",
    },
    lookbook: {
      title: "Looks da semana",
      description:
        "Bloco de imagem e texto da página inicial, abaixo da editoria Moda.",
      href: "/",
    },
    beauty: {
      title: "Beleza na capa",
      description:
        "Bloco de beleza da página inicial, não a página inteira da editoria.",
      href: "/",
    },
    ugc: {
      title: "Faixa UGC da página inicial",
      description:
        "Edite o convite para o portfólio na capa. A página UGC e a galeria têm seções próprias.",
      href: "/",
    },
    inscritos: {
      title: "Newsletter → Inscritos",
      description: "Lista privada, exportação CSV e exclusão de inscrições. Campanhas ainda desativadas.",
      href: "/newsletter",
    },
    newsletter: {
      title: "Chamada da newsletter",
      description:
        "Edite o texto da capa. Consulte os cadastros em Inscritos; campanhas ainda desativadas.",
      href: "/",
    },
    "pagina-ugc": {
      title: "Página UGC",
      description:
        "Título, apresentação e foto em /ugc; o portfólio é editado separadamente.",
      href: "/ugc",
    },
    "pagina-sobre": {
      title: "Página Sobre",
      description: "Biografia, foto e citação da Letícia em /sobre.",
      href: "/sobre",
    },
    marca: {
      title: "Identidade do site",
      description: "Nome e cabeçalho exibidos em todas as páginas.",
      href: "/",
    },
    footer: {
      title: "Rodapé",
      description: "Descrição exibida em todas as páginas.",
      href: "/",
    },
  };

  async function save() {
    if (!config || saving || activeUploads > 0 || !authenticated || loadingFull)
      return;
    if (!password) {
      setStatus("Digite a senha do painel.");
      return;
    }
    if (!dirty) {
      setStatus("Nenhuma alteração para salvar.");
      return;
    }
    setSaving(true);
    const saved: string[] = [];
    const failed: string[] = [];
    try {
      const setters: Record<string, (data: any) => void> = {
        "site-config": setConfig,
        articles: setArticles,
        portfolio: setPortfolio,
        linktree: setLinktree,
      };
      for (const key of dirtyKeys.filter(
        (key) => baseline.current[key]?.full,
      )) {
        setStatus(`Salvando ${resourceLabels[key]}…`);
        try {
          const response = await fetch(`/api/${key}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "x-admin-password": password,
              "If-Match": baseline.current[key].etag,
            },
            body: JSON.stringify(currentValues[key]),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Falha ao salvar.");
          baseline.current[key] = {
            json: JSON.stringify(data),
            etag: response.headers.get("etag") || "",
            full: true,
          };
          setters[key](data);
          saved.push(resourceLabels[key]);
        } catch (error) {
          failed.push(
            `${resourceLabels[key]}: ${error instanceof Error ? error.message : "Falha de conexão."}`,
          );
        }
      }
      setStatus(
        failed.length
          ? `${saved.length ? "Salvo: " + saved.join(", ") + ". " : ""}Pendente: ${failed.join("; ")}. As alterações pendentes foram mantidas.`
          : "Alterações salvas. " + saved.join(", ") + ".",
      );
      if (saved.length) iframeRef.current?.contentWindow?.location.reload();
    } finally {
      setSaving(false);
    }
  }

  if (!config)
    return (
      <div className="adminOverlay">
        <div className="adminLoading" role="status">
          {status}
        </div>
      </div>
    );

  const setBrand = (patch: Partial<SiteConfig["brand"]>) =>
    setConfig((current) =>
      current ? { ...current, brand: { ...current.brand, ...patch } } : current,
    );
  const setHome = <K extends keyof SiteConfig["home"]>(
    key: K,
    patch: Partial<SiteConfig["home"][K]>,
  ) =>
    setConfig((current) =>
      current
        ? {
            ...current,
            home: {
              ...current.home,
              [key]: { ...current.home[key], ...patch },
            },
          }
        : current,
    );
  const setFooter = (patch: Partial<SiteConfig["footer"]>) =>
    setConfig((current) =>
      current
        ? { ...current, footer: { ...current.footer, ...patch } }
        : current,
    );
  const setPage = <K extends keyof SiteConfig["pages"]>(
    key: K,
    patch: Partial<SiteConfig["pages"][K]>,
  ) =>
    setConfig((current) =>
      current
        ? {
            ...current,
            pages: {
              ...current.pages,
              [key]: { ...current.pages[key], ...patch },
            },
          }
        : current,
    );
  const updatePortfolio = (patch: Partial<PortfolioItem>) =>
    setPortfolio((items) =>
      items.map((item) =>
        item.id === selectedPortfolioId ? { ...item, ...patch } : item,
      ),
    );
  const addPortfolio = () => {
    const id = crypto.randomUUID();
    const item: PortfolioItem = {
      id,
      title: "Novo trabalho",
      description: "",
      type: "Vídeo",
      published: false,
      media: {
        url: "",
        positionX: 50,
        positionY: 50,
        zoom: 100,
        opacity: 100,
        fit: "cover",
      },
    };
    setPortfolio((items) => [...items, item]);
    setSelectedPortfolioId(id);
  };
  const removePortfolio = () => {
    if (
      !selectedPortfolio ||
      !window.confirm("Excluir este trabalho ao salvar?")
    )
      return;
    const next = portfolio.filter((item) => item.id !== selectedPortfolio.id);
    setPortfolio(next);
    setSelectedPortfolioId(next[0]?.id || "");
  };
  const movePortfolio = (shift: number) => {
    const index = portfolio.findIndex(
      (item) => item.id === selectedPortfolioId,
    );
    const target = index + shift;
    if (index < 0 || target < 0 || target >= portfolio.length) return;
    const next = [...portfolio];
    [next[index], next[target]] = [next[target], next[index]];
    setPortfolio(next);
  };

  const activeResource =
    tab === "artigos"
      ? "articles"
      : tab === "portfolio"
        ? "portfolio"
        : tab === "linktree"
          ? "linktree"
          : tab === "dashboard" || tab === "biblioteca" || tab === "inscritos"
            ? null
            : "site-config";
  const fullContentReady =
    tab === "dashboard"
      ? ["site-config", "articles", "portfolio", "linktree"].every(
          (key) => baseline.current[key]?.full,
        )
      : !activeResource || baseline.current[activeResource]?.full;
  const h = config.home;
  const previewWidth = previewMode === "desktop" ? 1440 : 390;
  const previewHeight = previewMode === "desktop" ? 900 : 844;
  const previewSrc =
    tab === "linktree" ? "/linktree?editorPreview=1"
    : tab === "artigos"
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
        article: tab === "artigos" ? (selectedArticle ?? undefined) : undefined,
        scrollKey,
      },
      window.location.origin,
    );
  };

  const updateArticle = (patch: Partial<ArticleRecord>) => {
    if (!selectedArticle) return;
    const oldSlug = selectedArticle.slug;
    setArticles((items) =>
      items.map((article) =>
        article.slug === oldSlug ? { ...article, ...patch } : article,
      ),
    );
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
      hero: {
        url: "",
        positionX: 50,
        positionY: 50,
        zoom: 100,
        opacity: 100,
        fit: "cover",
      },
      body: "",
      sectionMedia: {},
    };
    setArticles((items) => [article, ...items]);
    setSelectedSlug(slug);
    setTab("artigos");
  };

  const deleteArticle = () => {
    if (!selectedArticle) return;
    if (
      !window.confirm(
        `Excluir “${selectedArticle.title}”? Essa exclusão só será efetivada ao clicar em Salvar alterações.`,
      )
    )
      return;
    const next = articles.filter(
      (article) => article.slug !== selectedArticle.slug,
    );
    setArticles(next);
    setSelectedSlug(next[0]?.slug || "");
  };

  return (
    <UploadActivity.Provider
      value={(delta) => setActiveUploads((n) => Math.max(0, n + delta))}
    >
      <div className="adminOverlay adminWorkspace">
        <main className="adminPanel" id="conteudo">
          <div className="adminTop">
            <div>
              <span>EDITOR VISUAL</span>
              <h1>Blog da Letícia</h1>
            </div>
            <a href="/" target="_blank" rel="noreferrer">
              Abrir site ↗
            </a>
          </div>

          <label className="adminPassword">
            Senha do painel
            <input
              disabled={loadingFull || activeUploads > 0}
              aria-label="Senha do painel"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setAuthenticated(false);
              }}
              placeholder="Senha administrativa existente"
            />
            <button
              type="button"
              disabled={loadingFull || activeUploads > 0}
              onClick={verifyPassword}
            >
              {authenticated ? "Senha validada" : "Validar acesso"}
            </button>
          </label>

          <div className="adminSectionPicker">
            <label htmlFor="admin-section-select">Escolha a parte do site para editar</label>
            <select
              id="admin-section-select"
              aria-label="Selecionar seção do site"
              disabled={!authenticated || loadingFull}
              value={tab}
              onChange={(event) => setTab(event.target.value)}
            >
              {tabGroups.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.tabs.map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="adminSectionInfo">
            <span className="adminBreadcrumb">
              Administração →{" "}
              {
                tabGroups.find((group) => group.tabs.some(([id]) => id === tab))
                  ?.label
              }
            </span>
            <strong>{tabInfo[tab]?.title}</strong>
            <p>{tabInfo[tab]?.description}</p>
            <a href={tabInfo[tab]?.href} target="_blank" rel="noreferrer">
              Abrir página correspondente ↗
            </a>
          </div>
          <div
            className="adminControls"
            role="region"
            aria-label="Campos de edição"
            tabIndex={0}
          >
            <fieldset
              className="adminFields"
              disabled={
                saving ||
                activeUploads > 0 ||
                !authenticated ||
                loadingFull ||
                !fullContentReady
              }
            >
              {!authenticated && (
                <div className="adminAccessGate" role="status">
                  <strong>Entre para visualizar e editar esta seção</strong>
                  <p>
                    Digite a senha administrativa e clique em <b>Validar acesso</b>.
                    Somente depois serão carregados os trabalhos, links, matérias
                    e demais conteúdos reais do painel.
                  </p>
                  <p>
                    Nenhum registro foi apagado. Os controles de edição e a
                    seleção de seções serão liberados após a autenticação.
                  </p>
                </div>
              )}
              {authenticated && loadingFull && (
                <p className="adminNotice" role="status">
                  Carregando os conteúdos do painel. Aguarde a validação completa.
                </p>
              )}
              {authenticated && !loadingFull && !fullContentReady && (
                <p className="adminNotice" role="alert">
                  Não foi possível confirmar o carregamento completo desta seção.
                  Nenhum conteúdo será substituído. Confira a mensagem na barra
                  inferior e recarregue o painel antes de editar.
                </p>
              )}
              {authenticated && !loadingFull && fullContentReady && (
                <>
              {tab === "dashboard" && (
                <div className="adminDashboard">
                  <div className="adminCard">
                    <strong>Seu conteúdo</strong>
                    <p>
                      {articles.filter((a) => a.published).length} matérias
                      publicadas · {articles.filter((a) => !a.published).length}{" "}
                      rascunhos
                    </p>
                    <p>
                      {portfolio.length} trabalhos UGC ·{" "}
                      {linktree?.links.length ?? 0} links no Linktree
                    </p>
                    <p role="status">
                      {dirty
                        ? "Há alterações pendentes em " +
                          dirtyKeys.map((key) => resourceLabels[key]).join(", ")
                        : "Nenhuma alteração pendente."}
                    </p>
                  </div>
                  {[
                    ["hero", "Editar página inicial"],
                    ["artigos", "Editar matérias e capas"],
                    ["portfolio", "Gerenciar fotos e vídeos"],
                    ["linktree", "Editar Linktree"],
                  ].map(([id, label]) => (
                    <button key={id} type="button" onClick={() => setTab(id)}>
                      {label} →
                    </button>
                  ))}
                </div>
              )}
              {tab === "inscritos" && authenticated && <NewsletterAdmin password={password} />}
              {tab === "biblioteca" && <MediaLibrary password={password} />}
              {tab === "linktree" &&
                (linktree && authenticated && fullContentReady ? (
                  <LinktreeEditor
                    config={linktree}
                    onChange={setLinktree}
                    password={password}
                  />
                ) : (
                  <p role="alert">
                    Não foi possível carregar o Linktree. Recarregue o painel;
                    os dados não serão substituídos.
                  </p>
                ))}
              {tab === "artigos" && (
                <div className="articleAdmin">
                  <p className="adminHint">
                    A capa da matéria é a mesma usada nos cards da página
                    inicial e das editorias.
                  </p>
                  <div className="articleAdminHeader">
                    <button
                      type="button"
                      className="adminPrimarySmall"
                      onClick={createArticle}
                    >
                      + Novo artigo
                    </button>
                    <span>{articles.length} artigo(s)</span>
                  </div>

                  <div className="adminCard">
                    <strong>Selecionar matéria</strong>
                    <select
                      aria-label="Selecionar matéria"
                      value={selectedSlug}
                      onChange={(e) => setSelectedSlug(e.target.value)}
                    >
                      {articles.map((article) => (
                        <option key={article.slug} value={article.slug}>
                          {article.published ? "●" : "○"} {article.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedArticle && (
                    <>
                      <div className="adminCard">
                        <strong>Publicação</strong>
                        <label className="adminCheck">
                          <input
                            type="checkbox"
                            checked={selectedArticle.published}
                            onChange={(e) =>
                              updateArticle({ published: e.target.checked })
                            }
                          />{" "}
                          Publicado no site
                        </label>
                        <label>
                          Data de publicação
                          <input
                            type="date"
                            value={selectedArticle.publishedAt}
                            onChange={(e) =>
                              updateArticle({ publishedAt: e.target.value })
                            }
                          />
                        </label>
                        <label>
                          Categoria
                          <select
                            value={selectedArticle.category}
                            onChange={(e) =>
                              updateArticle({
                                category: e.target
                                  .value as ArticleRecord["category"],
                              })
                            }
                          >
                            <option value="Moda">Moda</option>
                            <option value="Beleza">Beleza</option>
                            <option value="Lifestyle">Lifestyle</option>
                            <option value="Achados">Achados</option>
                          </select>
                        </label>
                        <label>
                          Tempo de leitura
                          <input
                            value={selectedArticle.readTime}
                            onChange={(e) =>
                              updateArticle({ readTime: e.target.value })
                            }
                            placeholder="5 min"
                          />
                        </label>
                      </div>

                      <div className="adminCard">
                        <strong>Título e endereço</strong>
                        <label>
                          Título
                          <input
                            value={selectedArticle.title}
                            onFocus={() => postPreview("article.title")}
                            onChange={(e) =>
                              updateArticle({ title: e.target.value })
                            }
                          />
                        </label>
                        <label>
                          Slug / endereço
                          <input
                            value={selectedArticle.slug}
                            onChange={(e) =>
                              updateArticle({
                                slug: e.target.value
                                  .toLowerCase()
                                  .replace(/[^a-z0-9-]+/g, "-"),
                              })
                            }
                          />
                        </label>
                        <label>
                          Resumo
                          <textarea
                            rows={4}
                            value={selectedArticle.dek}
                            onFocus={() => postPreview("article.dek")}
                            onChange={(e) =>
                              updateArticle({ dek: e.target.value })
                            }
                          />
                        </label>
                      </div>

                      <MediaControl
                        label="Imagem de capa"
                        asset={selectedArticle.hero}
                        password={password}
                        onChange={(hero) => updateArticle({ hero })}
                      />

                      <div className="adminCard">
                        <strong>Corpo da matéria</strong>
                        <p className="adminHint">
                          Parágrafos: deixe uma linha em branco. Título interno:
                          comece com ##. Citação: comece com &gt;. Para criar um
                          bloco de acessório com foto própria, use um título
                          numerado, como 1. Bolsa, seguido pelo texto.
                        </p>
                        <textarea
                          aria-label="Corpo da matéria"
                          className="articleBodyEditor"
                          rows={18}
                          value={selectedArticle.body}
                          onFocus={() => postPreview("article.body")}
                          onChange={(e) =>
                            updateArticle({ body: e.target.value })
                          }
                        />
                        {selectedArticle.slug && (
                          <a
                            className="adminArticleLink"
                            href={`/artigos/${selectedArticle.slug}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Abrir esta matéria ↗
                          </a>
                        )}
                      </div>

                      <div className="adminCard adminArticleSections">
                        <strong>Imagens dentro da matéria</strong>
                        <p className="adminHint">
                          Cada tópico numerado tem sua própria imagem,
                          independente da capa. Abra um item para fazer o
                          upload. A foto aparecerá abaixo do texto recuado assim
                          que você clicar em Salvar alterações.
                        </p>
                        {getNumberedSections(selectedArticle.body).length ===
                        0 ? (
                          <p className="adminHint">
                            Nenhum tópico numerado encontrado. No corpo da
                            matéria, crie um parágrafo “1. Nome do item” e, no
                            parágrafo seguinte, sua descrição.
                          </p>
                        ) : (
                          getNumberedSections(selectedArticle.body).map(
                            (section) => {
                              const asset = selectedArticle.sectionMedia?.[
                                section.key
                              ] ?? {
                                url: "",
                                positionX: 50,
                                positionY: 50,
                                zoom: 100,
                                opacity: 100,
                                fit: "cover" as const,
                              };
                              return (
                                <details
                                  className="adminArticleSectionItem"
                                  key={section.key}
                                >
                                  <summary>
                                    <span>
                                      {section.number}. {section.title}
                                    </span>
                                    <small>
                                      {asset.url
                                        ? "Imagem adicionada"
                                        : "Adicionar imagem"}
                                    </small>
                                  </summary>
                                  <MediaControl
                                    label={`Imagem de ${section.title}`}
                                    asset={asset}
                                    password={password}
                                    imageOnly
                                    onChange={(media) =>
                                      updateArticle({
                                        sectionMedia: {
                                          ...selectedArticle.sectionMedia,
                                          [section.key]: media,
                                        },
                                      })
                                    }
                                  />
                                  {asset.url && (
                                    <button
                                      className="adminRemoveSectionImage"
                                      type="button"
                                      onClick={() =>
                                        updateArticle({
                                          sectionMedia: {
                                            ...selectedArticle.sectionMedia,
                                            [section.key]: {
                                              ...asset,
                                              url: "",
                                            },
                                          },
                                        })
                                      }
                                    >
                                      Retirar esta imagem da matéria
                                    </button>
                                  )}
                                </details>
                              );
                            },
                          )
                        )}
                      </div>

                      <button
                        type="button"
                        className="adminDanger"
                        onClick={deleteArticle}
                      >
                        Excluir matéria
                      </button>
                    </>
                  )}
                </div>
              )}

              {tab === "portfolio" && (
                <div className="articleAdmin">
                  <div className="articleAdminHeader">
                    <button
                      type="button"
                      className="adminPrimarySmall"
                      onClick={addPortfolio}
                    >
                      + Adicionar trabalho
                    </button>
                    <span>{portfolio.length} trabalho(s)</span>
                  </div>
                  <div className="adminCard">
                    <strong>Escolha o trabalho</strong>
                    <select
                      aria-label="Escolha o trabalho"
                      value={selectedPortfolioId}
                      onChange={(e) => setSelectedPortfolioId(e.target.value)}
                    >
                      {portfolio.map((item, index) => (
                        <option key={item.id} value={item.id}>
                          {index + 1}. {item.published ? "●" : "○"} {item.title}
                        </option>
                      ))}
                    </select>
                    {portfolio.length === 0 && (
                      <p className="adminHint">
                        Clique em Adicionar trabalho para começar.
                      </p>
                    )}
                  </div>
                  {selectedPortfolio && (
                    <>
                      <div className="adminCard">
                        <strong>Informações do trabalho</strong>
                        <label className="adminCheck">
                          <input
                            type="checkbox"
                            checked={selectedPortfolio.published}
                            onChange={(e) =>
                              updatePortfolio({ published: e.target.checked })
                            }
                          />{" "}
                          Publicar no site
                        </label>
                        <label>
                          Tipo
                          <select
                            value={selectedPortfolio.type}
                            onChange={(e) =>
                              updatePortfolio({
                                type: e.target.value as PortfolioItem["type"],
                              })
                            }
                          >
                            <option value="Vídeo">Vídeo</option>
                            <option value="Foto">Foto</option>
                          </select>
                        </label>
                        <label>
                          Título
                          <input
                            value={selectedPortfolio.title}
                            onChange={(e) =>
                              updatePortfolio({ title: e.target.value })
                            }
                          />
                        </label>
                        <label>
                          Descrição
                          <textarea
                            rows={3}
                            value={selectedPortfolio.description}
                            onChange={(e) =>
                              updatePortfolio({ description: e.target.value })
                            }
                          />
                        </label>
                      </div>
                      <MediaControl
                        label="Arquivo ou link do vídeo/foto"
                        asset={selectedPortfolio.media}
                        password={password}
                        onChange={(media) => updatePortfolio({ media })}
                      />
                      <p className="adminHint">
                        Vídeos: MP4 ou WebM até 30 MB, ou URL pública do
                        YouTube, Vimeo ou Instagram. Clique em Salvar alterações
                        para atualizar a galeria.
                      </p>
                      <div className="portfolioEditorActions">
                        <button type="button" onClick={() => movePortfolio(-1)}>
                          ↑ Subir
                        </button>
                        <button type="button" onClick={() => movePortfolio(1)}>
                          ↓ Descer
                        </button>
                        <button
                          type="button"
                          className="adminDanger"
                          onClick={removePortfolio}
                        >
                          Excluir trabalho
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {tab === "pagina-ugc" && (
                <>
                  <div className="adminCard">
                    <strong>Apresentação da página UGC</strong>
                    <label>
                      Título
                      <textarea
                        rows={3}
                        value={config.pages.ugc.title}
                        onChange={(e) =>
                          setPage("ugc", { title: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Texto de apresentação
                      <textarea
                        rows={6}
                        value={config.pages.ugc.intro}
                        onChange={(e) =>
                          setPage("ugc", { intro: e.target.value })
                        }
                      />
                    </label>
                  </div>
                  <MediaControl
                    label="Foto principal da página UGC"
                    asset={config.pages.ugc.portrait}
                    password={password}
                    onChange={(portrait) => setPage("ugc", { portrait })}
                  />
                  <p className="adminHint">
                    Edite os vídeos e fotos em Conteúdo e publicações → Fotos e
                    vídeos UGC.
                  </p>
                </>
              )}

              {tab === "pagina-sobre" && (
                <>
                  <div className="adminCard">
                    <strong>Sobre a Letícia</strong>
                    <label>
                      Título
                      <input
                        value={config.pages.about.title}
                        onChange={(e) =>
                          setPage("about", { title: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Primeiro parágrafo
                      <textarea
                        rows={6}
                        value={config.pages.about.firstParagraph}
                        onChange={(e) =>
                          setPage("about", { firstParagraph: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Segundo parágrafo
                      <textarea
                        rows={5}
                        value={config.pages.about.secondParagraph}
                        onChange={(e) =>
                          setPage("about", { secondParagraph: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Citação
                      <textarea
                        rows={3}
                        value={config.pages.about.quote}
                        onChange={(e) =>
                          setPage("about", { quote: e.target.value })
                        }
                      />
                    </label>
                  </div>
                  <MediaControl
                    label="Foto da página Sobre"
                    asset={config.pages.about.portrait}
                    password={password}
                    onChange={(portrait) => setPage("about", { portrait })}
                  />
                </>
              )}

              {tab === "marca" && (
                <>
                  <div className="adminCard">
                    <strong>Linha superior</strong>
                    <input
                      aria-label="Chamada do cabeçalho"
                      value={config.brand.utility}
                      onChange={(e) => setBrand({ utility: e.target.value })}
                    />
                  </div>
                  <TextControl
                    label="Nome / marca"
                    value={config.brand.wordmark}
                    style={config.brand.wordmarkStyle}
                    onValue={(value) => setBrand({ wordmark: value })}
                    onStyle={(wordmarkStyle) => setBrand({ wordmarkStyle })}
                  />
                  <div className="adminCard">
                    <strong>Assinatura</strong>
                    <input
                      aria-label="Assinatura preservada no rodapé"
                      value={config.brand.signature}
                      onChange={(e) => setBrand({ signature: e.target.value })}
                    />
                  </div>
                </>
              )}

              {tab === "hero" && (
                <>
                  <div className="adminCard">
                    <strong>Matéria vinculada ao destaque</strong>
                    <p className="adminHint">
                      Define o destino do botão Ler matéria. O título e resumo
                      abaixo são independentes. Para usar a capa da matéria,
                      deixe vazia a URL da foto principal.
                    </p>
                    <select
                      aria-label="Matéria vinculada ao destaque"
                      value={h.hero.featuredSlug}
                      onChange={(e) =>
                        setHome("hero", { featuredSlug: e.target.value })
                      }
                    >
                      <option value="">
                        Automático: primeira matéria publicada
                      </option>
                      {articles
                        .filter((a) => a.published)
                        .map((a) => (
                          <option key={a.slug} value={a.slug}>
                            {a.title}
                          </option>
                        ))}
                    </select>
                  </div>
                  <TextControl
                    label="Chamada pequena"
                    value={h.hero.eyebrow}
                    style={h.hero.eyebrowStyle}
                    onValue={(eyebrow) => setHome("hero", { eyebrow })}
                    onStyle={(eyebrowStyle) =>
                      setHome("hero", { eyebrowStyle })
                    }
                  />
                  <TextControl
                    label="Título principal"
                    value={h.hero.title}
                    style={h.hero.titleStyle}
                    multiline
                    onValue={(title) => setHome("hero", { title })}
                    onStyle={(titleStyle) => setHome("hero", { titleStyle })}
                  />
                  <TextControl
                    label="Resumo"
                    value={h.hero.dek}
                    style={h.hero.dekStyle}
                    multiline
                    onValue={(dek) => setHome("hero", { dek })}
                    onStyle={(dekStyle) => setHome("hero", { dekStyle })}
                  />
                  <div className="adminCard">
                    <strong>Texto do link</strong>
                    <input
                      aria-label="Texto do link principal"
                      value={h.hero.buttonText}
                      onChange={(e) =>
                        setHome("hero", { buttonText: e.target.value })
                      }
                    />
                  </div>
                  <p className="adminHint">
                    <strong>Fundo da página inicial — independente da matéria:</strong>{" "}
                    escolha aqui qualquer fotografia ou vídeo (MP4/WebM) para
                    aparecer atrás de LETÍCIA LEITE. Essa mídia é exclusiva da
                    abertura do site e não altera a foto da matéria vinculada,
                    que continua sendo editada na seção de artigos.
                  </p>
                  <MediaControl
                    label="Foto ou vídeo de abertura (MP4/WebM, até 30 MB)"
                    asset={h.hero.media}
                    password={password}
                    onChange={(media) => setHome("hero", { media })}
                  />
                  <p className="adminHint">
                    A foto ou vídeo selecionado aqui ocupa apenas a capa do site.
                    Para mudar a imagem exibida ao clicar em “Ler matéria”,
                    edite a própria matéria no painel. Vídeos de abertura
                    reproduzem sem som e em loop; a miniatura serve como imagem
                    de carregamento e para quem prefere movimento reduzido.
                    O título e o botão da matéria ficam no canto inferior esquerdo.
                    Salve e confira a prévia.
                  </p>
                </>
              )}

              {tab === "layout-materias" && (
                <ArticleLayoutEditor
                  layout={h.articleLayout}
                  articles={articles}
                  featuredSlug={h.hero.featuredSlug}
                  onChange={(articleLayout) =>
                    setConfig((current) => current
                      ? { ...current, home: { ...current.home, articleLayout } }
                      : current)
                  }
                />
              )}

              {tab === "lookbook" && (
                <>
                  <TextControl
                    label="Chamada"
                    value={h.lookbook.eyebrow}
                    style={h.lookbook.eyebrowStyle}
                    onValue={(eyebrow) => setHome("lookbook", { eyebrow })}
                    onStyle={(eyebrowStyle) =>
                      setHome("lookbook", { eyebrowStyle })
                    }
                  />
                  <TextControl
                    label="Título"
                    value={h.lookbook.title}
                    style={h.lookbook.titleStyle}
                    multiline
                    onValue={(title) => setHome("lookbook", { title })}
                    onStyle={(titleStyle) =>
                      setHome("lookbook", { titleStyle })
                    }
                  />
                  <TextControl
                    label="Texto"
                    value={h.lookbook.body}
                    style={h.lookbook.bodyStyle}
                    multiline
                    onValue={(body) => setHome("lookbook", { body })}
                    onStyle={(bodyStyle) => setHome("lookbook", { bodyStyle })}
                  />
                  <div className="adminCard">
                    <strong>Texto do link</strong>
                    <input
                      aria-label="Texto do link Looks"
                      value={h.lookbook.buttonText}
                      onChange={(e) =>
                        setHome("lookbook", { buttonText: e.target.value })
                      }
                    />
                  </div>
                  <MediaControl
                    label="Foto / vídeo"
                    asset={h.lookbook.media}
                    password={password}
                    onChange={(media) => setHome("lookbook", { media })}
                  />
                </>
              )}

              {tab === "beauty" && (
                <>
                  <TextControl
                    label="Chamada"
                    value={h.beauty.eyebrow}
                    style={h.beauty.eyebrowStyle}
                    onValue={(eyebrow) => setHome("beauty", { eyebrow })}
                    onStyle={(eyebrowStyle) =>
                      setHome("beauty", { eyebrowStyle })
                    }
                  />
                  <TextControl
                    label="Título"
                    value={h.beauty.title}
                    style={h.beauty.titleStyle}
                    multiline
                    onValue={(title) => setHome("beauty", { title })}
                    onStyle={(titleStyle) => setHome("beauty", { titleStyle })}
                  />
                  <TextControl
                    label="Introdução"
                    value={h.beauty.intro}
                    style={h.beauty.introStyle}
                    multiline
                    onValue={(intro) => setHome("beauty", { intro })}
                    onStyle={(introStyle) => setHome("beauty", { introStyle })}
                  />
                  <MediaControl
                    label="Foto / vídeo"
                    asset={h.beauty.media}
                    password={password}
                    onChange={(media) => setHome("beauty", { media })}
                  />
                </>
              )}

              {tab === "ugc" && (
                <>
                  <TextControl
                    label="Chamada"
                    value={h.ugc.eyebrow}
                    style={h.ugc.eyebrowStyle}
                    onValue={(eyebrow) => setHome("ugc", { eyebrow })}
                    onStyle={(eyebrowStyle) => setHome("ugc", { eyebrowStyle })}
                  />
                  <TextControl
                    label="Título"
                    value={h.ugc.title}
                    style={h.ugc.titleStyle}
                    multiline
                    onValue={(title) => setHome("ugc", { title })}
                    onStyle={(titleStyle) => setHome("ugc", { titleStyle })}
                  />
                  <TextControl
                    label="Texto"
                    value={h.ugc.body}
                    style={h.ugc.bodyStyle}
                    multiline
                    onValue={(body) => setHome("ugc", { body })}
                    onStyle={(bodyStyle) => setHome("ugc", { bodyStyle })}
                  />
                  <div className="adminCard">
                    <strong>Texto do botão</strong>
                    <input
                      aria-label="Texto do link UGC"
                      value={h.ugc.buttonText}
                      onChange={(e) =>
                        setHome("ugc", { buttonText: e.target.value })
                      }
                    />
                  </div>
                  <MediaControl
                    label="Mídia de produto"
                    asset={h.ugc.mediaProduct}
                    password={password}
                    onChange={(mediaProduct) =>
                      setHome("ugc", { mediaProduct })
                    }
                  />
                  <MediaControl
                    label="Mídia da Letícia"
                    asset={h.ugc.mediaCreator}
                    password={password}
                    onChange={(mediaCreator) =>
                      setHome("ugc", { mediaCreator })
                    }
                  />
                </>
              )}

              {tab === "newsletter" && (
                <>
                  <TextControl
                    label="Chamada"
                    value={h.newsletter.eyebrow}
                    style={h.newsletter.eyebrowStyle}
                    onValue={(eyebrow) => setHome("newsletter", { eyebrow })}
                    onStyle={(eyebrowStyle) =>
                      setHome("newsletter", { eyebrowStyle })
                    }
                  />
                  <TextControl
                    label="Título"
                    value={h.newsletter.title}
                    style={h.newsletter.titleStyle}
                    multiline
                    onValue={(title) => setHome("newsletter", { title })}
                    onStyle={(titleStyle) =>
                      setHome("newsletter", { titleStyle })
                    }
                  />
                </>
              )}

              {tab === "footer" && (
                <div className="adminCard">
                  <strong>Descrição do rodapé</strong>
                  <textarea
                    aria-label="Descrição do rodapé"
                    rows={4}
                    value={config.footer.description}
                    onChange={(e) => setFooter({ description: e.target.value })}
                  />
                </div>
              )}
                </>
              )}
            </fieldset>
          </div>

          <div className="adminSaveBar">
            <span role="status" aria-live="polite">
              {activeUploads > 0
                ? "Envio de mídia em andamento. Aguarde para editar ou salvar."
                : status}
              {dirty && !saving ? " Há alterações não salvas." : ""}
            </span>
            <button
              onClick={save}
              disabled={
                saving ||
                activeUploads > 0 ||
                !dirty ||
                !authenticated ||
                loadingFull
              }
            >
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </main>

        <aside className="adminPreview" aria-label="Prévia do site">
          <div className="adminPreviewToolbar">
            <div>
              <strong>Site em tempo real</strong>
              <span>
                {tabInfo[tab]?.title} · {tab === "artigos"
                  ? "A matéria muda enquanto você edita."
                  : "Confira o resultado antes de salvar."}
              </span>
            </div>
            <div className="previewModeButtons">
              <button
                className={previewMode === "desktop" ? "active" : ""}
                onClick={() => setPreviewMode("desktop")}
              >
                Desktop
              </button>
              <button
                className={previewMode === "mobile" ? "active" : ""}
                onClick={() => setPreviewMode("mobile")}
              >
                Celular
              </button>
            </div>
          </div>

          {tab === "linktree" && linktree && authenticated && fullContentReady ? (
            <div className="adminLinktreePreview">
              <LinktreeView
                config={linktree}
                missingMedia={
                  linktree.provenance.kind === "git-reference"
                    ? [
                        "/hero-fundo-leticia.jpg",
                        "/foto-perfil.jpg",
                        "/portfolio-produto.jpg",
                        "/portfolio-unboxing.mp4",
                        "/portfolio-provador.jpg",
                      ]
                    : []
                }
              />
            </div>
          ) : (
            <div className="previewBrowser">
              <div className="previewBar">
                <i />
                <i />
                <i />
                <span>
                  {tab === "artigos" && selectedArticle
                    ? `/artigos/${selectedArticle.slug}`
                    : tabInfo[tab]?.href}
                </span>
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
                      "layout-materias": "home.articleLayout",
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
          )}
        </aside>
      </div>
    </UploadActivity.Provider>
  );
}
