import SharedMedia from "@/components/Media";
import type { ArticleRecord } from "@/lib/article-store";
import { parseArticleBody, type TextBlock } from "@/lib/article-body";
import type { MediaAsset } from "@/lib/site-config";

function TextContent({ block }: { block: TextBlock }) {
  if (block.type === "heading") return <h2>{block.text}</h2>;
  if (block.type === "quote") return <blockquote>{block.text}</blockquote>;
  return <p>{block.text}</p>;
}

function AccessoryImage({
  asset,
  title,
}: {
  asset: MediaAsset;
  title: string;
}) {
  return (
    <figure className="articleAccessoryImage">
      <SharedMedia asset={asset} alt={`Imagem de ${title}`} />
    </figure>
  );
}

export default function ArticleBody({
  article,
  preview = false,
}: {
  article: ArticleRecord;
  preview?: boolean;
}) {
  return (
    <div
      className="articleBody"
      data-editor-body={preview ? "article.body" : undefined}
    >
      {parseArticleBody(article.body).map((block, index) => {
        if (block.type !== "numbered")
          return <TextContent block={block} key={index} />;
        const media = article.sectionMedia?.[block.key];
        return (
          <section className="articleAccessory" key={index}>
            <h2 className="articleAccessoryTitle">
              <span className="articleAccessoryNumber">
                {block.number.padStart(2, "0")}
              </span>
              <span>{block.title}</span>
            </h2>
            <div className="articleAccessoryIndented">
              {block.content.map((paragraph, i) => (
                <TextContent key={i} block={paragraph} />
              ))}
              {media?.url && (
                <AccessoryImage asset={media} title={block.title} />
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
