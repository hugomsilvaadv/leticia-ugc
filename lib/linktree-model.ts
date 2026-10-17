import { assertMatchingShape } from "./validation";
import { assertSafeMedia, safeLinkUrl } from "./media";
import type { MediaAsset } from "./site-config";
export type LinktreeText = {
  text: string;
  font: string;
  size: number;
  x: number;
  y: number;
  color: string;
  weight: number;
  italic: boolean;
  align: "left" | "center" | "right";
};
export type LinktreeLink = {
  id: string;
  label: string;
  href: string;
  enabled: boolean;
  labelKey?: string;
};
export type LinktreeVideo = {
  id: string;
  title: string;
  description: string;
  media: MediaAsset;
  enabled: boolean;
  type: "Foto" | "Vídeo";
  labelKey?: string;
  typeKey?: string;
};
export type LinktreeService = {
  id: string;
  nameKey: string;
  highlightKey: string;
  descriptionKey: string;
  priceKey: string;
  href: string;
  enabled: boolean;
};
export type LinktreeConfig = {
  background: Omit<MediaAsset, "opacity"> & { opacity: number };
  media: Record<string, MediaAsset>;
  texts: Record<string, LinktreeText>;
  links: LinktreeLink[];
  socials: LinktreeLink[];
  videos: LinktreeVideo[];
  services: LinktreeService[];
  blocks: ("profile" | "links" | "portfolio" | "services" | "contact")[];
  provenance: {
    kind: "git-reference" | "imported" | "published-snapshot";
    source?: string;
    importedAt?: string;
  };
};
export function fromLegacyLinktree(
  source: Record<string, any>,
): LinktreeConfig {
  source = structuredClone(source);
  if (!source?.texts || !source?.media || !source?.background)
    throw new Error("Configuração Linktree inválida.");
  const t = source.texts;
  const wa = "https://wa.me/5531995309352";
  const media = Object.fromEntries(
    Object.entries(source.media).map(([key, v]) => [
      key,
      { ...(v as MediaAsset), opacity: (v as any).opacity ?? 100 },
    ]),
  );
  return {
    ...source,
    media,
    texts: t,
    background: source.background,
    links:
      source.links ??
      [
        ["portfolio", "heroButtonPortfolio", "#portfolio"],
        ["services", "heroButtonPackages", "#pacotes"],
        ["contact", "heroButtonContact", wa],
      ].map(([id, labelKey, href]) => ({
        id,
        labelKey,
        href,
        label: t[labelKey]?.text ?? "",
        enabled: true,
      })),
    socials: source.socials ?? [
      {
        id: "instagram",
        labelKey: "footerInstagram",
        label: t.footerInstagram?.text ?? "",
        href: "https://instagram.com/leticiafnda",
        enabled: true,
      },
      {
        id: "whatsapp",
        labelKey: "footerWhatsapp",
        label: t.footerWhatsapp?.text ?? "",
        href: wa,
        enabled: true,
      },
    ],
    videos:
      source.videos ??
      [
        ["product", "productLabel", "productType", "Foto"],
        ["unboxing", "unboxingLabel", "unboxingType", "Vídeo"],
        ["fitting", "fittingLabel", "fittingType", "Foto"],
      ].map(([id, labelKey, typeKey, type]) => ({
        id,
        title: t[labelKey]?.text ?? "",
        labelKey,
        typeKey,
        description: "",
        media: media[id],
        enabled: true,
        type,
      })),
    services:
      source.services ??
      [
        [
          "basic",
          "Olá, Letícia! Tenho interesse no Plano Básico de provador avulso.",
        ],
        [
          "monthly",
          "Olá, Letícia! Tenho interesse no Plano Mensal de conteúdo.",
        ],
        [
          "ugc",
          "Olá, Letícia! Gostaria de solicitar uma proposta para conteúdo UGC.",
        ],
      ].map(([id, msg]) => ({
        id,
        nameKey: id + "Name",
        highlightKey: id + "Highlight",
        descriptionKey: id + "Description",
        priceKey: id + "Price",
        href: wa + "?text=" + encodeURIComponent(msg),
        enabled: true,
      })),
    blocks: source.blocks ?? [
      "profile",
      "links",
      "portfolio",
      "services",
      "contact",
    ],
    provenance: source.provenance ?? {
      kind: "git-reference",
      source:
        "hugomsilvaadv/portfolio-leticia-linkbio@b957ec45119a5b4bd27199238d7d0e91299acc0f",
    },
  };
}
export function validateLinktree(
  value: unknown,
): asserts value is LinktreeConfig {
  if (!value || typeof value !== "object")
    throw new Error("Linktree inválido.");
  const v = value as LinktreeConfig;
  if (
    !v.texts ||
    !v.media ||
    !v.background ||
    !Array.isArray(v.links) ||
    !Array.isArray(v.socials) ||
    !Array.isArray(v.videos) ||
    !Array.isArray(v.services) ||
    !Array.isArray(v.blocks)
  )
    throw new Error("Linktree inválido: formato incompleto.");
  if (
    !v.provenance ||
    !["git-reference", "imported", "published-snapshot"].includes(v.provenance.kind)
  )
    throw new Error("Origem do Linktree inválida.");
  if (
    !v.media.profile ||
    typeof v.media.profile.url !== "string" ||
    typeof v.background.url !== "string"
  )
    throw new Error("Perfil ou fundo Linktree inválido.");
  const sample = {
    url: "",
    positionX: 50,
    positionY: 50,
    zoom: 100,
    fit: "cover",
  };
  const asset = (m: unknown) => {
    assertMatchingShape(m, sample);
    const a = m as MediaAsset;
    if (
      typeof a.url !== "string" ||
      !["cover", "contain"].includes(a.fit) ||
      ![a.positionX, a.positionY, a.zoom].every(Number.isFinite)
    )
      throw new Error("Mídia Linktree inválida.");
  };
  asset(v.background);
  Object.values(v.media).forEach(asset);
  if (!Number.isFinite(v.background.opacity))
    throw new Error("Opacidade de fundo inválida.");
  for (const key of ["heroTitle", "heroDescription", "footerEmail"])
    if (typeof v.texts[key]?.text !== "string")
      throw new Error("Linktree inválido: perfil incompleto.");
  for (const list of [v.links, v.socials]) {
    if (new Set(list.map((l) => l.id)).size !== list.length)
      throw new Error("Identificadores de links duplicados.");
    for (const l of list)
      if (
        !l.id ||
        typeof l.label !== "string" ||
        typeof l.enabled !== "boolean" ||
        (!safeLinkUrl(l.href) && (l.enabled || l.href !== ""))
      )
        throw new Error("URL ou link inválido.");
  }
  for (const service of v.services)
    if (
      !safeLinkUrl(service.href) ||
      typeof service.enabled !== "boolean" ||
      ![
        service.nameKey,
        service.highlightKey,
        service.descriptionKey,
        service.priceKey,
      ].every((key) => typeof v.texts[key]?.text === "string")
    )
      throw new Error("URL ou serviço inválido.");
  for (const video of v.videos) {
    if (
      !video?.media ||
      !["Foto", "Vídeo"].includes(video.type) ||
      typeof video.enabled !== "boolean" ||
      typeof video.title !== "string" ||
      typeof video.description !== "string"
    )
      throw new Error("Mídia Linktree inválida.");
    asset(video.media);
  }
  if (
    new Set(v.blocks).size !== v.blocks.length ||
    v.blocks.some(
      (b) =>
        !["profile", "links", "portfolio", "services", "contact"].includes(b),
    )
  )
    throw new Error("Ordem de blocos inválida.");
  for (const block of Object.values(v.texts))
    if (
      !block ||
      typeof block.text !== "string" ||
      typeof block.font !== "string" ||
      ![block.size, block.x, block.y, block.weight].every(Number.isFinite) ||
      typeof block.italic !== "boolean" ||
      !["left", "center", "right"].includes(block.align) ||
      !/^(#[a-f\d]{3,8}|[a-z]+)$/i.test(block.color)
    )
      throw new Error("Texto ou estilo Linktree inválido.");
  assertSafeMedia(v);
}

// Public responses contain exactly the content used by visible blocks, not the editor snapshot.
export function publicLinktree(config: LinktreeConfig) {
  const links = config.links.filter((l) => l.enabled);
  const socials = config.socials.filter((l) => l.enabled);
  const videos = config.videos.filter((v) => v.enabled);
  const services = config.services.filter((s) => s.enabled);
  const keys = new Set<string>();
  const include = (values: (string | undefined)[]) =>
    values.forEach((v) => {
      if (v) keys.add(v);
    });
  if (config.blocks.includes("profile"))
    include(["heroKicker", "heroTitle", "heroDescription"]);
  if (config.blocks.includes("links")) include(links.map((l) => l.labelKey));
  if (config.blocks.includes("portfolio")) {
    include(["portfolioEyebrow", "portfolioTitle", "portfolioSubtitle"]);
    include(videos.flatMap((v) => [v.labelKey, v.typeKey]));
  }
  if (config.blocks.includes("services")) {
    include([
      "servicesEyebrow",
      "servicesTitle",
      "servicesSubtitle",
      "proposalButton",
    ]);
    include(
      services.flatMap((s) => [
        s.nameKey,
        s.highlightKey,
        s.descriptionKey,
        s.priceKey,
      ]),
    );
  }
  if (config.blocks.includes("contact")) {
    include([
      "footerTitle",
      "footerDescription",
      "footerEmail",
      "footerLocation",
    ]);
    include(socials.map((l) => l.labelKey));
  }
  const asset = (m: MediaAsset) => ({
    url: m.url,
    positionX: m.positionX,
    positionY: m.positionY,
    zoom: m.zoom,
    opacity: m.opacity,
    fit: m.fit,
    ...(m.poster ? { poster: m.poster } : {}),
    ...(m.width && m.height ? { width: m.width, height: m.height } : {}),
    ...(m.mobile ? { mobile: m.mobile } : {}),
  });
  const link = (l: LinktreeLink) => ({
    id: l.id,
    label: l.label,
    href: l.href,
    enabled: l.enabled,
    ...(l.labelKey ? { labelKey: l.labelKey } : {}),
  });
  return {
    background: asset(config.background),
    media: { profile: asset(config.media.profile) },
    texts: Object.fromEntries(
      [...keys].filter((k) => config.texts[k]).map((k) => [k, config.texts[k]]),
    ),
    links: config.blocks.includes("links") ? links.map(link) : [],
    socials: config.blocks.includes("contact") ? socials.map(link) : [],
    videos: config.blocks.includes("portfolio")
      ? videos.map((v) => ({
          id: v.id,
          title: v.title,
          description: v.description,
          type: v.type,
          enabled: v.enabled,
          media: asset(v.media),
          labelKey: v.labelKey,
          typeKey: v.typeKey,
        }))
      : [],
    services: config.blocks.includes("services")
      ? services.map((s) => ({
          id: s.id,
          nameKey: s.nameKey,
          highlightKey: s.highlightKey,
          descriptionKey: s.descriptionKey,
          priceKey: s.priceKey,
          href: s.href,
          enabled: s.enabled,
        }))
      : [],
    blocks: config.blocks,
    provenance: { kind: config.provenance.kind },
  };
}

// The public page and sitemap must agree on published bootstraps.
export function isPublishedLinktree(kind: string): boolean {
  return kind === "imported" || kind === "published-snapshot";
}
