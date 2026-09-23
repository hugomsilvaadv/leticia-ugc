'use client';

import { useEffect } from "react";
import type { MediaAsset, SiteConfig, TextStyle } from "@/lib/site-config";

type PreviewMessage = {
  type: "LETICIA_EDITOR_PREVIEW";
  config: SiteConfig;
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

  applyText("footer.description", config.footer.description);
}

export default function PreviewBridge() {
  useEffect(() => {
    const handler = (event: MessageEvent<PreviewMessage>) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "LETICIA_EDITOR_PREVIEW" || !event.data.config) return;
      applyConfig(event.data.config);
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
