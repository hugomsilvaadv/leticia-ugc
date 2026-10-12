import type { CSSProperties } from "react";
import type { LinktreeConfig, LinktreeText } from "@/lib/linktree-model";
import SharedMedia from "./Media";
import { safeLinkUrl } from "@/lib/media";
const textStyle = (t?: LinktreeText): CSSProperties =>
  t
    ? ({
        fontFamily:
          t.font +
          (/Georgia|Times|Garamond|Bodoni|Cormorant/i.test(t.font)
            ? ", serif"
            : ", Arial, system-ui, sans-serif"),
        fontSize: `clamp(14px, ${t.size / 12}vw, ${t.size}px)`,
        color: t.color,
        fontWeight: t.weight,
        fontStyle: t.italic ? "italic" : "normal",
        textAlign: t.align,
        "--text-x": `${t.x}px`,
        "--text-y": `${t.y}px`,
      } as CSSProperties)
    : {};
export default function LinktreeView({
  config,
  missingMedia = [],
}: {
  config: LinktreeConfig;
  missingMedia?: string[];
}) {
  const text = (key: string) => config.texts[key]?.text ?? "";
  const mediaExists = (url?: string) => !!url && !missingMedia.includes(url);
  const label = (link: { label: string; labelKey?: string }) =>
    link.labelKey ? text(link.labelKey) : link.label;
  return (
    <div className="linktreePage">
      {mediaExists(config.background.url) && (
        <div className="linktreeBackdrop" aria-hidden="true">
          <SharedMedia asset={config.background} alt="" />
        </div>
      )}
      <main className="linktreeContent" id="conteudo">
        {config.blocks.map((block) => {
          if (block === "profile")
            return (
              <header key={block} className="linktreeProfile">
                {mediaExists(config.media.profile?.url) && (
                  <div className="linktreeAvatar">
                    <SharedMedia
                      asset={config.media.profile}
                      alt={text("heroTitle")}
                      priority
                    />
                  </div>
                )}
                <p
                  className="eyebrow"
                  style={textStyle(config.texts.heroKicker)}
                >
                  {text("heroKicker")}
                </p>
                <h1 style={textStyle(config.texts.heroTitle)}>
                  {text("heroTitle")}
                </h1>
                <p style={textStyle(config.texts.heroDescription)}>
                  {text("heroDescription")}
                </p>
              </header>
            );
          if (block === "links")
            return (
              <nav
                className="linktreeLinks"
                key={block}
                aria-label="Atalhos do portfólio"
              >
                {config.links
                  .filter((l) => l.enabled && safeLinkUrl(l.href))
                  .map((l) => (
                    <a
                      href={l.href}
                      key={l.id}
                      target={
                        l.href.startsWith("https:") ? "_blank" : undefined
                      }
                      rel="noopener noreferrer"
                    >
                      <span>{label(l)}</span>
                      <span aria-hidden="true">↗</span>
                    </a>
                  ))}
              </nav>
            );
          if (block === "portfolio")
            return (
              <section id="portfolio" key={block} className="linktreeSection">
                <p
                  className="eyebrow"
                  style={textStyle(config.texts.portfolioEyebrow)}
                >
                  {text("portfolioEyebrow")}
                </p>
                <h2 style={textStyle(config.texts.portfolioTitle)}>
                  {text("portfolioTitle")}
                </h2>
                <p style={textStyle(config.texts.portfolioSubtitle)}>
                  {text("portfolioSubtitle")}
                </p>
                <div className="linktreeGallery">
                  {config.videos
                    .filter((v) => v.enabled && mediaExists(v.media.url))
                    .map((v) => (
                      <article key={v.id}>
                        <div className="portfolioMedia">
                          <SharedMedia
                            asset={v.media}
                            alt={v.title}
                            video={v.type === "Vídeo"}
                          />
                        </div>
                        <span className="eyebrow">
                          {v.typeKey ? text(v.typeKey) : v.type}
                        </span>
                        <h3
                          style={
                            v.labelKey
                              ? textStyle(config.texts[v.labelKey])
                              : undefined
                          }
                        >
                          {v.labelKey ? text(v.labelKey) : v.title}
                        </h3>
                        {v.description && <p>{v.description}</p>}
                      </article>
                    ))}
                </div>
              </section>
            );
          if (block === "services")
            return (
              <section id="pacotes" key={block} className="linktreeSection">
                <p
                  className="eyebrow"
                  style={textStyle(config.texts.servicesEyebrow)}
                >
                  {text("servicesEyebrow")}
                </p>
                <h2 style={textStyle(config.texts.servicesTitle)}>
                  {text("servicesTitle")}
                </h2>
                <p style={textStyle(config.texts.servicesSubtitle)}>
                  {text("servicesSubtitle")}
                </p>
                <div className="linktreePackages">
                  {config.services
                    .filter((s) => s.enabled)
                    .map((s) => (
                      <article key={s.id}>
                        <p
                          className="eyebrow"
                          style={textStyle(config.texts[s.nameKey])}
                        >
                          {text(s.nameKey)}
                        </p>
                        <h3 style={textStyle(config.texts[s.highlightKey])}>
                          {text(s.highlightKey)}
                        </h3>
                        <p style={textStyle(config.texts[s.descriptionKey])}>
                          {text(s.descriptionKey)}
                        </p>
                        <p style={textStyle(config.texts[s.priceKey])}>
                          {text(s.priceKey)}
                        </p>
                        <a
                          className="button"
                          href={s.href}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {text("proposalButton")}
                        </a>
                      </article>
                    ))}
                </div>
              </section>
            );
          return (
            <footer id="contato" key={block} className="linktreeContact">
              <h2 style={textStyle(config.texts.footerTitle)}>
                {text("footerTitle")}
              </h2>
              <p style={textStyle(config.texts.footerDescription)}>
                {text("footerDescription")}
              </p>
              <a
                className="linktreeEmail"
                href={"mailto:" + text("footerEmail")}
              >
                {text("footerEmail")}
              </a>
              <p style={textStyle(config.texts.footerLocation)}>
                {text("footerLocation")}
              </p>
              <nav aria-label="Redes sociais">
                {config.socials
                  .filter((l) => l.enabled && safeLinkUrl(l.href))
                  .map((l) => (
                    <a
                      href={l.href}
                      key={l.id}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {label(l)}
                    </a>
                  ))}
              </nav>
            </footer>
          );
        })}
      </main>
    </div>
  );
}
