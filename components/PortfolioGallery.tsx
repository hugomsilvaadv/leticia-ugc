import SharedMedia from "@/components/Media";
export { getEmbedUrl } from "@/lib/media";
import type { PortfolioItem } from "@/lib/portfolio-store";

export default function PortfolioGallery({
  items,
}: {
  items: PortfolioItem[];
}) {
  const visible = items.filter((item) => item.published && item.media.url);
  if (!visible.length) return null;
  return (
    <section className="portfolioSection shell" id="portfolio">
      <div className="sectionHead">
        <div>
          <p className="eyebrow">Trabalhos selecionados</p>
          <h2>Portfólio em imagens e movimento</h2>
        </div>
      </div>
      <div className="portfolioGallery">
        {visible.map((item) => (
          <article className="portfolioEntry" key={item.id}>
            <div className="portfolioMedia">
              <SharedMedia
                asset={item.media}
                alt={item.title || "Portfólio"}
                video={item.type === "Vídeo"}
              />
            </div>
            <div className="portfolioCaption">
              <span>{item.type}</span>
              <h3>{item.title}</h3>
              {item.description && <p>{item.description}</p>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
