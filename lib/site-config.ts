import { unstable_noStore as noStore } from "next/cache";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export type FitMode = "cover" | "contain";
export type TextAlign = "left" | "center" | "right";

export type TextStyle = {
  fontFamily: string;
  fontSize: number;
  x: number;
  y: number;
  align: TextAlign;
};

export type MediaAsset = {
  url: string;
  positionX: number;
  positionY: number;
  zoom: number;
  opacity: number;
  fit: FitMode;
};

export type SiteConfig = {
  brand: {
    utility: string;
    wordmark: string;
    signature: string;
    wordmarkStyle: TextStyle;
  };
  home: {
    hero: {
      eyebrow: string;
      title: string;
      dek: string;
      buttonText: string;
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
};

const text = (fontFamily: string, fontSize: number, align: TextAlign = "left"): TextStyle => ({
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
    hero: {
      eyebrow: "Em destaque · Moda",
      title: "Camadas sem excesso: um guia visual para a meia-estação",
      dek: "Proporção, textura e fórmulas simples para montar looks que parecem pensados sem perder conforto.",
      buttonText: "Ler matéria",
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
      intro: "Beleza entra como extensão do estilo: textura, cor, rotina e produto vistos sem promessa exagerada.",
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
    description: "Moda, criatividade e comunicação para transformar produtos em experiências.",
  },
};

const DATA_DIR = process.env.CONTENT_DATA_DIR || "/data";
const CONFIG_PATH = path.join(DATA_DIR, "site-config.json");

function num(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function normalizeStyle(value: Partial<TextStyle> | undefined, fallback: TextStyle): TextStyle {
  return {
    fontFamily: typeof value?.fontFamily === "string" && value.fontFamily ? value.fontFamily : fallback.fontFamily,
    fontSize: num(value?.fontSize, fallback.fontSize, 9, 120),
    x: num(value?.x, fallback.x, -120, 120),
    y: num(value?.y, fallback.y, -120, 120),
    align: value?.align === "center" || value?.align === "right" ? value.align : "left",
  };
}

function normalizeMedia(value: Partial<MediaAsset> | undefined, fallback: MediaAsset): MediaAsset {
  return {
    url: typeof value?.url === "string" ? value.url : fallback.url,
    positionX: num(value?.positionX, fallback.positionX, 0, 100),
    positionY: num(value?.positionY, fallback.positionY, 0, 100),
    zoom: num(value?.zoom, fallback.zoom, 70, 220),
    opacity: num(value?.opacity, fallback.opacity, 0, 100),
    fit: value?.fit === "contain" ? "contain" : "cover",
  };
}

const str = (value: unknown, fallback: string) => typeof value === "string" ? value : fallback;

export function normalizeConfig(input?: Partial<SiteConfig> | null): SiteConfig {
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
      wordmarkStyle: normalizeStyle(b?.wordmarkStyle, DEFAULT_CONFIG.brand.wordmarkStyle),
    },
    home: {
      hero: {
        eyebrow: str(hero?.eyebrow, DEFAULT_CONFIG.home.hero.eyebrow),
        title: str(hero?.title, DEFAULT_CONFIG.home.hero.title),
        dek: str(hero?.dek, DEFAULT_CONFIG.home.hero.dek),
        buttonText: str(hero?.buttonText, DEFAULT_CONFIG.home.hero.buttonText),
        media: normalizeMedia(hero?.media, DEFAULT_CONFIG.home.hero.media),
        eyebrowStyle: normalizeStyle(hero?.eyebrowStyle, DEFAULT_CONFIG.home.hero.eyebrowStyle),
        titleStyle: normalizeStyle(hero?.titleStyle, DEFAULT_CONFIG.home.hero.titleStyle),
        dekStyle: normalizeStyle(hero?.dekStyle, DEFAULT_CONFIG.home.hero.dekStyle),
      },
      lookbook: {
        eyebrow: str(lookbook?.eyebrow, DEFAULT_CONFIG.home.lookbook.eyebrow),
        title: str(lookbook?.title, DEFAULT_CONFIG.home.lookbook.title),
        body: str(lookbook?.body, DEFAULT_CONFIG.home.lookbook.body),
        buttonText: str(lookbook?.buttonText, DEFAULT_CONFIG.home.lookbook.buttonText),
        media: normalizeMedia(lookbook?.media, DEFAULT_CONFIG.home.lookbook.media),
        eyebrowStyle: normalizeStyle(lookbook?.eyebrowStyle, DEFAULT_CONFIG.home.lookbook.eyebrowStyle),
        titleStyle: normalizeStyle(lookbook?.titleStyle, DEFAULT_CONFIG.home.lookbook.titleStyle),
        bodyStyle: normalizeStyle(lookbook?.bodyStyle, DEFAULT_CONFIG.home.lookbook.bodyStyle),
      },
      beauty: {
        eyebrow: str(beauty?.eyebrow, DEFAULT_CONFIG.home.beauty.eyebrow),
        title: str(beauty?.title, DEFAULT_CONFIG.home.beauty.title),
        intro: str(beauty?.intro, DEFAULT_CONFIG.home.beauty.intro),
        media: normalizeMedia(beauty?.media, DEFAULT_CONFIG.home.beauty.media),
        eyebrowStyle: normalizeStyle(beauty?.eyebrowStyle, DEFAULT_CONFIG.home.beauty.eyebrowStyle),
        titleStyle: normalizeStyle(beauty?.titleStyle, DEFAULT_CONFIG.home.beauty.titleStyle),
        introStyle: normalizeStyle(beauty?.introStyle, DEFAULT_CONFIG.home.beauty.introStyle),
      },
      ugc: {
        eyebrow: str(ugc?.eyebrow, DEFAULT_CONFIG.home.ugc.eyebrow),
        title: str(ugc?.title, DEFAULT_CONFIG.home.ugc.title),
        body: str(ugc?.body, DEFAULT_CONFIG.home.ugc.body),
        buttonText: str(ugc?.buttonText, DEFAULT_CONFIG.home.ugc.buttonText),
        mediaProduct: normalizeMedia(ugc?.mediaProduct, DEFAULT_CONFIG.home.ugc.mediaProduct),
        mediaCreator: normalizeMedia(ugc?.mediaCreator, DEFAULT_CONFIG.home.ugc.mediaCreator),
        eyebrowStyle: normalizeStyle(ugc?.eyebrowStyle, DEFAULT_CONFIG.home.ugc.eyebrowStyle),
        titleStyle: normalizeStyle(ugc?.titleStyle, DEFAULT_CONFIG.home.ugc.titleStyle),
        bodyStyle: normalizeStyle(ugc?.bodyStyle, DEFAULT_CONFIG.home.ugc.bodyStyle),
      },
      newsletter: {
        eyebrow: str(newsletter?.eyebrow, DEFAULT_CONFIG.home.newsletter.eyebrow),
        title: str(newsletter?.title, DEFAULT_CONFIG.home.newsletter.title),
        eyebrowStyle: normalizeStyle(newsletter?.eyebrowStyle, DEFAULT_CONFIG.home.newsletter.eyebrowStyle),
        titleStyle: normalizeStyle(newsletter?.titleStyle, DEFAULT_CONFIG.home.newsletter.titleStyle),
      },
    },
    footer: {
      description: str(input?.footer?.description, DEFAULT_CONFIG.footer.description),
    },
  };
}

export async function readSiteConfig(): Promise<SiteConfig> {
  noStore();
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf8");
    return normalizeConfig(JSON.parse(raw));
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function writeSiteConfig(input: Partial<SiteConfig>): Promise<SiteConfig> {
  const config = normalizeConfig(input);
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
  return config;
}

export function getDataDir() {
  return DATA_DIR;
}

export function validateAdminPassword(password: string | null | undefined) {
  const configured = process.env.ADMIN_PASSWORD;
  if (configured) return Boolean(password && password === configured);

  if (!password) return false;
  return createHash("sha256").update(password).digest("hex") ===
    "3a560af98d3b3f1cded74f62e8735a28cc0088f6fccab0455fda30f0e4de4c5f";
}
