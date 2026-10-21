import { assertMatchingShape } from "@/lib/validation";
import { unstable_noStore as noStore } from "next/cache";
import { createHash, timingSafeEqual } from "node:crypto";
import { readJsonFile, writeJsonFile, mergeObjects } from "@/lib/json-store";
import { assertSafeMedia } from "@/lib/media";
import path from "node:path";

export type FitMode = "cover" | "contain";
export type TextAlign = "left" | "center" | "right";

export type TextStyle = {
  fontFamily: string;
  fontSize: number;
  x: number;
  y: number;
  align: TextAlign;
  color?: string;
  mobile?: { fontSize: number; x: number; y: number; align: TextAlign; color?: string; fontFamily?: string };
};

export type MediaAsset = {
  url: string;
  positionX: number;
  positionY: number;
  zoom: number;
  opacity: number;
  fit: FitMode;
  mobile?: { positionX: number; positionY: number; fit: FitMode; zoom?: number; opacity?: number };
  poster?: string;
  width?: number;
  height?: number;
};

export type ArticleLayoutSection = "destaques" | "moda" | "arquivo";
export type ArticleTileLayout = { slug: string; columns: number; height: number };
export type ArticleLayout = Record<ArticleLayoutSection, ArticleTileLayout[]>;

export type SiteConfig = {
  brand: {
    utility: string;
    wordmark: string;
    signature: string;
    wordmarkStyle: TextStyle;
  };
  home: {
    articleLayout: ArticleLayout;
    hero: {
      featuredSlug: string;
      eyebrow: string;
      title: string;
      dek: string;
      buttonText: string;
      buttonStyle: TextStyle;
      overlayOpacity: number;
      media: MediaAsset;
      eyebrowStyle: TextStyle;
      titleStyle: TextStyle;
      dekStyle: TextStyle;
    };
    lookbook: {
      eyebrow: string;
      title: string;
      body: string;
      buttonText: string;
      media: MediaAsset;
      eyebrowStyle: TextStyle;
      titleStyle: TextStyle;
      bodyStyle: TextStyle;
    };
    beauty: {
      eyebrow: string;
      title: string;
      intro: string;
      media: MediaAsset;
      eyebrowStyle: TextStyle;
      titleStyle: TextStyle;
      introStyle: TextStyle;
    };
    ugc: {
      eyebrow: string;
      title: string;
      body: string;
      buttonText: string;
      mediaProduct: MediaAsset;
      mediaCreator: MediaAsset;
      eyebrowStyle: TextStyle;
      titleStyle: TextStyle;
      bodyStyle: TextStyle;
    };
    newsletter: {
      eyebrow: string;
      title: string;
      eyebrowStyle: TextStyle;
      titleStyle: TextStyle;
    };
  };
  footer: {
    description: string;
  };
  pages: {
    ugc: { title: string; intro: string; portrait: MediaAsset };
    about: {
      title: string;
      firstParagraph: string;
      secondParagraph: string;
      quote: string;
      portrait: MediaAsset;
    };
  };
};

const text = (
  fontFamily: string,
  fontSize: number,
  align: TextAlign = "left",
): TextStyle => ({
  fontFamily,
  fontSize,
  x: 0,
  y: 0,
  align,
});

const media = (url: string, fit: FitMode = "cover"): MediaAsset => ({
  url,
  positionX: 50,
  positionY: 50,
  zoom: 100,
  opacity: 100,
  fit,
});

export const DEFAULT_CONFIG: SiteConfig = {
  brand: {
    utility: "moda • beleza • lifestyle • conteúdo autoral",
    wordmark: "LETÍCIA LEITE",
    signature: "editado por Letícia",
    wordmarkStyle: text("Georgia", 64, "center"),
  },
  home: {
    articleLayout: { destaques: [], moda: [], arquivo: [] },
    hero: {
      featuredSlug: "",
      eyebrow: "Em destaque · Moda",
      title: "Camadas sem excesso: um guia visual para a meia-estação",
      dek: "Proporção, textura e fórmulas simples para montar looks que parecem pensados sem perder conforto.",
      buttonText: "Ler matéria",
      buttonStyle: text("Arial", 11),
      overlayOpacity: 100,
      media: media("/images/leticia-hero.jpg"),
      eyebrowStyle: text("Arial", 11),
      titleStyle: text("Georgia", 58),
      dekStyle: text("Arial", 16),
    },
    lookbook: {
      eyebrow: "Looks & styling",
      title: "Estilo é repertório em movimento.",
      body: "Referências, combinações e pequenas decisões de proporção que fazem um look conversar com quem veste.",
      buttonText: "Explorar styling",
      media: media(""),
      eyebrowStyle: text("Arial", 11),
      titleStyle: text("Georgia", 64),
      bodyStyle: text("Arial", 16),
    },
    beauty: {
      eyebrow: "Beleza",
      title: "Testados, favoritos e acabamento",
      intro:
        "Beleza entra como extensão do estilo: textura, cor, rotina e produto vistos sem promessa exagerada.",
      media: media(""),
      eyebrowStyle: text("Arial", 11),
      titleStyle: text("Georgia", 62),
      introStyle: text("Georgia", 22),
    },
    ugc: {
      eyebrow: "UGC · Trabalhe comigo",
      title: "Conteúdo pensado para conectar marca, produto e pessoa.",
      body: "Criação para moda, beleza e lifestyle com olhar de Design de Moda, styling, comunicação natural e atenção ao briefing.",
      buttonText: "Ver portfólio UGC",
      mediaProduct: media(""),
      mediaCreator: media(""),
      eyebrowStyle: text("Arial", 11),
      titleStyle: text("Georgia", 64),
      bodyStyle: text("Arial", 16),
    },
    newsletter: {
      eyebrow: "Carta da Letícia",
      title: "Moda, beleza e achados para chegar sem ruído.",
      eyebrowStyle: text("Arial", 11),
      titleStyle: text("Georgia", 40),
    },
  },
  footer: {
    description:
      "Moda, criatividade e comunicação para transformar produtos em experiências.",
  },
  pages: {
    ugc: {
      title: "Conteúdo com repertório de moda e intenção comercial.",
      intro:
        "Minha formação em Design de Moda me permite pensar composição, styling, tendência e apresentação de produto. A entrega pode ser orgânica ou seguir o briefing com precisão.",
      portrait: media(""),
    },
    about: {
      title: "Moda sempre foi linguagem.",
      firstParagraph:
        "A criatividade sempre fez parte de quem eu sou. Desde pequena, escolhia tecidos e desenhava minhas próprias roupas. Hoje, transformo essa paixão em conteúdo, unindo meu olhar criativo ao universo da moda, beleza e lifestyle.",
      secondParagraph:
        "Amo descobrir novas marcas, experimentar produtos e compartilhar referências de forma leve, autêntica e próxima.",
      quote:
        "Criar é mais do que mostrar. É despertar interesse, identificação e desejo.",
      portrait: media(""),
    },
  },
};

const DATA_DIR = process.env.CONTENT_DATA_DIR || "/data";
const CONFIG_PATH = path.join(DATA_DIR, "site-config.json");

function num(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? Math.min(max, Math.max(min, parsed))
    : fallback;
}

function normalizeStyle(
  value: Partial<TextStyle> | undefined,
  fallback: TextStyle,
): TextStyle {
  const color = (raw: unknown) => typeof raw === "string" && /^#[a-fA-F0-9]{6}$/.test(raw) ? raw : undefined;
  const mobile = value?.mobile;
  return {
    ...(color(value?.color) ? { color: color(value?.color) } : {}),
    ...(mobile ? { mobile: {
      fontFamily: typeof mobile.fontFamily === "string" && mobile.fontFamily ? mobile.fontFamily : (value?.fontFamily || fallback.fontFamily),
      fontSize: num(mobile.fontSize, Math.min(40, fallback.fontSize), 9, 120),
      x: num(mobile.x, 0, -120, 120),
      y: num(mobile.y, 0, -120, 120),
      align: mobile.align === "center" || mobile.align === "right" ? mobile.align : "left",
      ...(color(mobile.color) ? { color: color(mobile.color) } : {}),
    } } : {}),
    fontFamily:
      typeof value?.fontFamily === "string" && value.fontFamily
        ? value.fontFamily
        : fallback.fontFamily,
    fontSize: num(value?.fontSize, fallback.fontSize, 9, 120),
    x: num(value?.x, fallback.x, -120, 120),
    y: num(value?.y, fallback.y, -120, 120),
    align:
      value?.align === "center" || value?.align === "right"
        ? value.align
        : "left",
  };
}

function normalizeMedia(
  value: Partial<MediaAsset> | undefined,
  fallback: MediaAsset,
): MediaAsset {
  return {
    ...fallback,
    ...value,
    url: typeof value?.url === "string" ? value.url : fallback.url,
    positionX: num(value?.positionX, fallback.positionX, 0, 100),
    positionY: num(value?.positionY, fallback.positionY, 0, 100),
    zoom: num(value?.zoom, fallback.zoom, 70, 220),
    opacity: num(value?.opacity, fallback.opacity, 0, 100),
    fit: value?.fit === "contain" ? "contain" : "cover",
    ...(value?.mobile ? {
      mobile: {
        positionX: num(value.mobile.positionX, value.positionX ?? fallback.positionX, 0, 100),
        positionY: num(value.mobile.positionY, value.positionY ?? fallback.positionY, 0, 100),
        fit: value.mobile.fit === "cover" ? "cover" as const : "contain" as const,
        zoom: num(value.mobile.zoom, 100, 70, 220),
        opacity: num(value.mobile.opacity, value.opacity ?? fallback.opacity, 0, 100),
      },
    } : {}),
  };
}

export function normalizeArticleLayout(value: unknown): ArticleLayout {
  const sections: ArticleLayoutSection[] = ["destaques", "moda", "arquivo"];
  const raw = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
  const result = { destaques: [], moda: [], arquivo: [] } as ArticleLayout;
  for (const section of sections) {
    const rows = Array.isArray(raw[section]) ? raw[section] : [];
    const seen = new Set<string>();
    for (const row of rows.slice(0, 60)) {
      if (!row || typeof row !== "object" || Array.isArray(row)) continue;
      const item = row as Record<string, unknown>;
      if (typeof item.slug !== "string" || !/^[a-zA-Z0-9_-]{1,120}$/.test(item.slug) || seen.has(item.slug)) continue;
      seen.add(item.slug);
      result[section].push({
        slug: item.slug,
        columns: Math.round(num(item.columns, 1, 1, section === "destaques" ? 2 : 3)),
        height: Math.round(num(item.height, 300, 180, 640) / 10) * 10,
      });
    }
  }
  return result;
}

const str = (value: unknown, fallback: string) =>
  typeof value === "string" ? value : fallback;

export function normalizeConfig(
  input?: Partial<SiteConfig> | null,
): SiteConfig {
  const b = input?.brand;
  const h = input?.home;
  const hero = h?.hero;
  const lookbook = h?.lookbook;
  const beauty = h?.beauty;
  const ugc = h?.ugc;
  const newsletter = h?.newsletter;

  return {
    brand: {
      utility: str(b?.utility, DEFAULT_CONFIG.brand.utility),
      wordmark: str(b?.wordmark, DEFAULT_CONFIG.brand.wordmark),
      signature: str(b?.signature, DEFAULT_CONFIG.brand.signature),
      wordmarkStyle: normalizeStyle(
        b?.wordmarkStyle,
        DEFAULT_CONFIG.brand.wordmarkStyle,
      ),
    },
    home: {
      articleLayout: normalizeArticleLayout(h?.articleLayout),
      hero: {
        featuredSlug: str(hero?.featuredSlug, ""),
        eyebrow: str(hero?.eyebrow, DEFAULT_CONFIG.home.hero.eyebrow),
        title: str(hero?.title, DEFAULT_CONFIG.home.hero.title),
        dek: str(hero?.dek, DEFAULT_CONFIG.home.hero.dek),
        buttonText: str(hero?.buttonText, DEFAULT_CONFIG.home.hero.buttonText),
        buttonStyle: normalizeStyle(hero?.buttonStyle, DEFAULT_CONFIG.home.hero.buttonStyle),
        overlayOpacity: num(hero?.overlayOpacity, DEFAULT_CONFIG.home.hero.overlayOpacity, 0, 100),
        media: normalizeMedia(hero?.media, DEFAULT_CONFIG.home.hero.media),
        eyebrowStyle: normalizeStyle(
          hero?.eyebrowStyle,
          DEFAULT_CONFIG.home.hero.eyebrowStyle,
        ),
        titleStyle: normalizeStyle(
          hero?.titleStyle,
          DEFAULT_CONFIG.home.hero.titleStyle,
        ),
        dekStyle: normalizeStyle(
          hero?.dekStyle,
          DEFAULT_CONFIG.home.hero.dekStyle,
        ),
      },
      lookbook: {
        eyebrow: str(lookbook?.eyebrow, DEFAULT_CONFIG.home.lookbook.eyebrow),
        title: str(lookbook?.title, DEFAULT_CONFIG.home.lookbook.title),
        body: str(lookbook?.body, DEFAULT_CONFIG.home.lookbook.body),
        buttonText: str(
          lookbook?.buttonText,
          DEFAULT_CONFIG.home.lookbook.buttonText,
        ),
        media: normalizeMedia(
          lookbook?.media,
          DEFAULT_CONFIG.home.lookbook.media,
        ),
        eyebrowStyle: normalizeStyle(
          lookbook?.eyebrowStyle,
          DEFAULT_CONFIG.home.lookbook.eyebrowStyle,
        ),
        titleStyle: normalizeStyle(
          lookbook?.titleStyle,
          DEFAULT_CONFIG.home.lookbook.titleStyle,
        ),
        bodyStyle: normalizeStyle(
          lookbook?.bodyStyle,
          DEFAULT_CONFIG.home.lookbook.bodyStyle,
        ),
      },
      beauty: {
        eyebrow: str(beauty?.eyebrow, DEFAULT_CONFIG.home.beauty.eyebrow),
        title: str(beauty?.title, DEFAULT_CONFIG.home.beauty.title),
        intro: str(beauty?.intro, DEFAULT_CONFIG.home.beauty.intro),
        media: normalizeMedia(beauty?.media, DEFAULT_CONFIG.home.beauty.media),
        eyebrowStyle: normalizeStyle(
          beauty?.eyebrowStyle,
          DEFAULT_CONFIG.home.beauty.eyebrowStyle,
        ),
        titleStyle: normalizeStyle(
          beauty?.titleStyle,
          DEFAULT_CONFIG.home.beauty.titleStyle,
        ),
        introStyle: normalizeStyle(
          beauty?.introStyle,
          DEFAULT_CONFIG.home.beauty.introStyle,
        ),
      },
      ugc: {
        eyebrow: str(ugc?.eyebrow, DEFAULT_CONFIG.home.ugc.eyebrow),
        title: str(ugc?.title, DEFAULT_CONFIG.home.ugc.title),
        body: str(ugc?.body, DEFAULT_CONFIG.home.ugc.body),
        buttonText: str(ugc?.buttonText, DEFAULT_CONFIG.home.ugc.buttonText),
        mediaProduct: normalizeMedia(
          ugc?.mediaProduct,
          DEFAULT_CONFIG.home.ugc.mediaProduct,
        ),
        mediaCreator: normalizeMedia(
          ugc?.mediaCreator,
          DEFAULT_CONFIG.home.ugc.mediaCreator,
        ),
        eyebrowStyle: normalizeStyle(
          ugc?.eyebrowStyle,
          DEFAULT_CONFIG.home.ugc.eyebrowStyle,
        ),
        titleStyle: normalizeStyle(
          ugc?.titleStyle,
          DEFAULT_CONFIG.home.ugc.titleStyle,
        ),
        bodyStyle: normalizeStyle(
          ugc?.bodyStyle,
          DEFAULT_CONFIG.home.ugc.bodyStyle,
        ),
      },
      newsletter: {
        eyebrow: str(
          newsletter?.eyebrow,
          DEFAULT_CONFIG.home.newsletter.eyebrow,
        ),
        title: str(newsletter?.title, DEFAULT_CONFIG.home.newsletter.title),
        eyebrowStyle: normalizeStyle(
          newsletter?.eyebrowStyle,
          DEFAULT_CONFIG.home.newsletter.eyebrowStyle,
        ),
        titleStyle: normalizeStyle(
          newsletter?.titleStyle,
          DEFAULT_CONFIG.home.newsletter.titleStyle,
        ),
      },
    },
    footer: {
      description: str(
        input?.footer?.description,
        DEFAULT_CONFIG.footer.description,
      ),
    },
    pages: {
      ugc: {
        title: str(input?.pages?.ugc?.title, DEFAULT_CONFIG.pages.ugc.title),
        intro: str(input?.pages?.ugc?.intro, DEFAULT_CONFIG.pages.ugc.intro),
        portrait: normalizeMedia(
          input?.pages?.ugc?.portrait,
          DEFAULT_CONFIG.pages.ugc.portrait,
        ),
      },
      about: {
        title: str(
          input?.pages?.about?.title,
          DEFAULT_CONFIG.pages.about.title,
        ),
        firstParagraph: str(
          input?.pages?.about?.firstParagraph,
          DEFAULT_CONFIG.pages.about.firstParagraph,
        ),
        secondParagraph: str(
          input?.pages?.about?.secondParagraph,
          DEFAULT_CONFIG.pages.about.secondParagraph,
        ),
        quote: str(
          input?.pages?.about?.quote,
          DEFAULT_CONFIG.pages.about.quote,
        ),
        portrait: normalizeMedia(
          input?.pages?.about?.portrait,
          DEFAULT_CONFIG.pages.about.portrait,
        ),
      },
    },
  };
}

export async function readSiteConfig(): Promise<SiteConfig> {
  noStore();
  const raw = await readJsonFile(CONFIG_PATH, DEFAULT_CONFIG, (raw) =>
    assertMatchingShape(raw, DEFAULT_CONFIG),
  );
  return mergeObjects(raw, normalizeConfig(raw));
}

export async function writeSiteConfig(
  input: Partial<SiteConfig>,
  expectedRevision?: string | null,
): Promise<SiteConfig> {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Configuração inválida.");
  assertMatchingShape(input, DEFAULT_CONFIG);
  assertSafeMedia(input);
  const current = await readSiteConfig();
  const merged = mergeObjects(current, input);
  const config = mergeObjects(merged, normalizeConfig(merged));
  await writeJsonFile(CONFIG_PATH, config, {
    expectedRevision,
    fallback: DEFAULT_CONFIG,
    normalize: (raw) => mergeObjects(raw, normalizeConfig(raw)),
  });
  return config;
}

export function getDataDir() {
  return DATA_DIR;
}

export function validateAdminPassword(password: string | null | undefined) {
  const configured = process.env.ADMIN_PASSWORD;
  if (configured)
    return Boolean(
      password &&
        timingSafeEqual(
          createHash("sha256").update(password).digest(),
          createHash("sha256").update(configured).digest(),
        ),
    );

  if (!password) return false;
  return (
    createHash("sha256").update(password).digest("hex") ===
    "3a560af98d3b3f1cded74f62e8735a28cc0088f6fccab0455fda30f0e4de4c5f"
  );
}
