import type { CSSProperties } from "react";
import type { PortfolioItem } from "@/lib/portfolio-store";

export function getEmbedUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be"].includes(host)) {
      let id = host.endsWith("youtu.be") ? url.pathname.split("/")[1] : url.searchParams.get("v");
      if (!id) id = url.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/)?.[1] ?? null;
      return id && /^[\w-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(host)) {
      const id = url.pathname.match(/\/(?:video\/)?(\d+)(?:\/|$)/)?.[1];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    if (["instagram.com", "www.instagram.com"].includes(host)) {
      const match = url.pathname.match(/^\/(?:reel|p|tv)\/([\w-]+)/);
      return match ? `https://www.instagram.com/p/${match[1]}/embed` : null;
    }
  } catch {
    return null;
  }
  return null;
}

function PortfolioMedia({ item }: { item: PortfolioItem }) {
  const { media } = item;
  const style: CSSProperties = {
    width: "100%", height: "100%", objectFit: media.fit,
    objectPosition: `${media.positionX}% ${media.positionY}%`,
    transform: `scale(${media.zoom / 100})`,
    opacity: media.opacity / 100,
  };
  if (item.type === "Vídeo") {
    const embed = getEmbedUrl(media.url);
    if (embed) return <iframe src={embed} title={item.title || "Vídeo de portfólio"} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />;
    if (/\.((mp4)|(webm))(\?|$)/i.test(media.url)) {
      return <video controls playsInline preload="metadata" style={style} src={media.url} />;
    }
    return <a href={media.url} target="_blank" rel="noopener noreferrer" className="portfolioExternal">Assistir ao vídeo ↗</a>;
  }
  return <img src={media.url} alt={item.title || "Fotografia do portfólio"} loading="lazy" style={style} />;
}

export default function PortfolioGallery({ items }: { items: PortfolioItem[] }) {
  const visible = items.filter(item => item.published && item.media.url);
  if (!visible.length) return null;
  return <section className="portfolioSection shell" id="portfolio">
    <div className="sectionHead"><div><p className="eyebrow">Trabalhos selecionados</p><h2>Portfólio em imagens e movimento</h2></div></div>
    <div className="portfolioGallery">
      {visible.map(item => <article className="portfolioEntry" key={item.id}>
        <div className="portfolioMedia"><PortfolioMedia item={item} /></div>
        <div className="portfolioCaption"><span>{item.type}</span><h3>{item.title}</h3>{item.description && <p>{item.description}</p>}</div>
      </article>)}
    </div>
  </section>;
}
