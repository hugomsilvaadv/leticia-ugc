'use client';

import { useEffect } from "react";
import type { ArticleRecord } from "@/lib/article-store";
import type { MediaAsset, SiteConfig, TextStyle } from "@/lib/site-config";
import { parseArticleBody, type TextBlock } from "@/lib/article-body";

type PreviewMessage = {
  type: "LETICIA_EDITOR_PREVIEW";
  config?: SiteConfig;
  article?: ArticleRecord;
  scrollKey?: string;
};

function applyStyle(element: HTMLElement, style?: TextStyle) {
  if (!style) return;
  element.style.fontFamily = style.fontFamily;
  element.style.fontSize = `${style.fontSize}px`;
  element.style.transform = `translate(${style.x}px, ${style.y}px)`;
  element.style.textAlign = style.align;
}

function applyText(key: string, value: string, style?: TextStyle) {
  document.querySelectorAll<HTMLElement>(`[data-editor="${key}"]`).forEach((element) => {
    const textTarget = element.firstElementChild instanceof HTMLAnchorElement ? element.firstElementChild : element;
    textTarget.textContent = value;
    applyStyle(element, style);
  });
}

function applyMedia(key: string, asset: MediaAsset) {
  document.querySelectorAll<HTMLElement>(`[data-editor-media="${key}"]`).forEach((holder) => {
    if (!asset.url) return;

    const isVideo = /\.(mp4|webm)(\?|$)/i.test(asset.url);
    let media = holder.querySelector("img, video") as HTMLImageElement | HTMLVideoElement | null;

    if (!media || (isVideo && media.tagName !== "VIDEO") || (!isVideo && media.tagName !== "IMG")) {
      media = document.createElement(isVideo ? "video" : "img") as HTMLImageElement | HTMLVideoElement;
      holder.replaceChildren(media);
    }

    media.src = asset.url;
    media.style.width = "100%";
    media.style.height = "100%";
    media.style.objectFit = asset.fit;
    media.style.objectPosition = `${asset.positionX}% ${asset.positionY}%`;
    media.style.transform = `scale(${asset.zoom / 100})`;
    media.style.opacity = String(asset.opacity / 100);
    media.style.display = "block";
    media.style.maxWidth = "none";

    if (media instanceof HTMLVideoElement) {
      media.autoplay = true;
      media.muted = true;
      media.loop = true;
      media.playsInline = true;
      void media.play().catch(() => undefined);
    }
  });
}

function applyConfig(config: SiteConfig) {
  applyText("brand.utility", config.brand.utility);
  applyText("brand.wordmark", config.brand.wordmark, config.brand.wordmarkStyle);
  applyText("brand.signature", config.brand.signature);

  applyText("home.hero.eyebrow", config.home.hero.eyebrow, config.home.hero.eyebrowStyle);
  applyText("home.hero.title", config.home.hero.title, config.home.hero.titleStyle);
  applyText("home.hero.dek", config.home.hero.dek, config.home.hero.dekStyle);
  applyText("home.hero.buttonText", config.home.hero.buttonText);
  applyMedia("home.hero.media", config.home.hero.media);

  applyText("home.lookbook.eyebrow", config.home.lookbook.eyebrow, config.home.lookbook.eyebrowStyle);
  applyText("home.lookbook.title", config.home.lookbook.title, config.home.lookbook.titleStyle);
  applyText("home.lookbook.body", config.home.lookbook.body, config.home.lookbook.bodyStyle);
  applyText("home.lookbook.buttonText", config.home.lookbook.buttonText);
  applyMedia("home.lookbook.media", config.home.lookbook.media);

  applyText("home.beauty.eyebrow", config.home.beauty.eyebrow, config.home.beauty.eyebrowStyle);
  applyText("home.beauty.title", config.home.beauty.title, config.home.beauty.titleStyle);
  applyText("home.beauty.intro", config.home.beauty.intro, config.home.beauty.introStyle);
  applyMedia("home.beauty.media", config.home.beauty.media);

  applyText("home.ugc.eyebrow", config.home.ugc.eyebrow, config.home.ugc.eyebrowStyle);
  applyText("home.ugc.title", config.home.ugc.title, config.home.ugc.titleStyle);
  applyText("home.ugc.body", config.home.ugc.body, config.home.ugc.bodyStyle);
  applyText("home.ugc.buttonText", config.home.ugc.buttonText);
  applyMedia("home.ugc.mediaProduct", config.home.ugc.mediaProduct);
  applyMedia("home.ugc.mediaCreator", config.home.ugc.mediaCreator);

  applyText("home.newsletter.eyebrow", config.home.newsletter.eyebrow, config.home.newsletter.eyebrowStyle);
  applyText("home.newsletter.title", config.home.newsletter.title, config.home.newsletter.titleStyle);
  applyText("pages.ugc.title", config.pages.ugc.title);
  applyText("pages.ugc.intro", config.pages.ugc.intro);
  applyMedia("pages.ugc.portrait", config.pages.ugc.portrait);
  applyText("pages.about.title", config.pages.about.title);
  applyText("pages.about.firstParagraph", config.pages.about.firstParagraph);
  applyText("pages.about.secondParagraph", config.pages.about.secondParagraph);
  applyText("pages.about.quote", `“${config.pages.about.quote}”`);
  applyMedia("pages.about.portrait", config.pages.about.portrait);
  applyText("footer.description", config.footer.description);
}

function formatDate(value: string) {
  const date = new Date(value + "T12:00:00");
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function createBodyParagraph(block: TextBlock) {
  const element = document.createElement(block.type === "heading" ? "h2" : block.type === "quote" ? "blockquote" : "p");
  element.textContent = block.text;
  return element;
}

function applyArticleBody(article: ArticleRecord) {
  document.querySelectorAll<HTMLElement>('[data-editor-body="article.body"]').forEach(holder => {
    holder.replaceChildren();
    parseArticleBody(article.body).forEach(block => {
      if (block.type !== "numbered") {
        holder.appendChild(createBodyParagraph(block));
        return;
      }

      const section = document.createElement("section");
      section.className = "articleAccessory";
      const heading = document.createElement("h2");
      heading.className = "articleAccessoryTitle";
      const number = document.createElement("span");
      number.className = "articleAccessoryNumber";
      number.textContent = block.number.padStart(2, "0");
      const title = document.createElement("span");
      title.textContent = block.title;
      heading.append(number, title);
      const indented = document.createElement("div");
      indented.className = "articleAccessoryIndented";
      for (const paragraph of block.content) indented.appendChild(createBodyParagraph(paragraph));

      const media = article.sectionMedia?.[block.key];
      if (media?.url) {
        const figure = document.createElement("figure");
        figure.className = "articleAccessoryImage";
        const img = document.createElement("img");
        img.src = media.url;
        img.alt = `Imagem de ${block.title}`;
        img.loading = "lazy";
        img.style.objectFit = media.fit;
        img.style.objectPosition = `${media.positionX}% ${media.positionY}%`;
        img.style.transform = `scale(${media.zoom / 100})`;
        img.style.opacity = String(media.opacity / 100);
        figure.appendChild(img);
        indented.appendChild(figure);
      }
      section.append(heading, indented);
      holder.appendChild(section);
    });
  });
}

function applyArticle(article: ArticleRecord) {
  applyText("article.category", article.category);
  applyText("article.title", article.title);
  applyText("article.dek", article.dek);
  applyText("article.publishedAt", formatDate(article.publishedAt));
  applyText("article.readTime", `${article.readTime} de leitura`);
  applyMedia("article.hero", article.hero);
  applyArticleBody(article);
}

function scrollToEditorKey(key?: string) {
  if (!key) return;
  window.setTimeout(() => {
    const element = document.querySelector<HTMLElement>(
      `[data-editor="${key}"], [data-editor-media="${key}"], [data-editor-body="${key}"]`
    );
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 80);
}

export default function PreviewBridge() {
  useEffect(() => {
    const handler = (event: MessageEvent<PreviewMessage>) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "LETICIA_EDITOR_PREVIEW") return;
      if (event.data.config) applyConfig(event.data.config);
      if (event.data.article) applyArticle(event.data.article);
      scrollToEditorKey(event.data.scrollKey);
    };

    const isEditorPreview = new URLSearchParams(window.location.search).get("editorPreview") === "1";
    const preventNavigation = (event: MouseEvent) => {
      if (!isEditorPreview) return;
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (anchor) event.preventDefault();
    };

    window.addEventListener("message", handler);
    document.addEventListener("click", preventNavigation);
    return () => {
      window.removeEventListener("message", handler);
      document.removeEventListener("click", preventNavigation);
    };
  }, []);

  return null;
}
