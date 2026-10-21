import VideoEmbed from "./VideoEmbed";
import type { CSSProperties } from "react";
import type { MediaAsset } from "@/lib/site-config";
import { getEmbedUrl, isVideoFile, safeMediaUrl } from "@/lib/media";

export function uploadedImageSrcSet(url: string): string | undefined {
  if (!/^\/api\/media\/[a-zA-Z0-9_-]+\.(?:jpe?g|png|webp)$/i.test(url))
    return undefined;
  return [320, 640, 960, 1440]
    .map((width) => `${url}?width=${width} ${width}w`)
    .join(", ");
}

export function mediaStyle(asset: MediaAsset): CSSProperties {
  return {
    "--media-x": `${asset.positionX}%`,
    "--media-y": `${asset.positionY}%`,
    "--media-zoom": asset.zoom / 100,
    "--media-opacity": asset.opacity / 100,
    "--media-fit": asset.fit,
    "--mobile-x": `${asset.mobile?.positionX ?? asset.positionX}%`,
    "--mobile-y": `${asset.mobile?.positionY ?? asset.positionY}%`,
    "--mobile-fit": asset.mobile?.fit ?? "contain",
    "--mobile-zoom": (asset.mobile?.zoom ?? 100) / 100,
    "--mobile-opacity": (asset.mobile?.opacity ?? asset.opacity) / 100,
  } as CSSProperties;
}
export default function SharedMedia({
  asset,
  alt,
  priority = false,
  video = false,
}: {
  asset: MediaAsset;
  alt: string;
  priority?: boolean;
  video?: boolean;
}) {
  if (!asset.url || !safeMediaUrl(asset.url)) return null;
  const embed = getEmbedUrl(asset.url);
  const style = mediaStyle(asset);
  const knownSource = asset.url === "/images/leticia-hero.jpg";
  const width = asset.width ?? (knownSource ? 960 : undefined);
  const height = asset.height ?? (knownSource ? 1200 : undefined);
  if (embed)
    return (
      <VideoEmbed
        src={embed}
        title={alt}
        poster={
          asset.poster && safeMediaUrl(asset.poster) ? asset.poster : undefined
        }
      />
    );
  if (video || isVideoFile(asset.url))
    return (
      <video
        className="sharedMedia"
        src={asset.url}
        poster={
          asset.poster && safeMediaUrl(asset.poster) ? asset.poster : undefined
        }
        style={style}
        controls
        playsInline
        preload="metadata"
      />
    );
  const srcSet = uploadedImageSrcSet(asset.url);
  return (
    <img
      className="sharedMedia"
      src={asset.url}
      srcSet={srcSet}
      sizes={srcSet ? "(max-width: 760px) 100vw, (max-width: 1200px) 75vw, 960px" : undefined}
      width={width}
      height={height}
      alt={alt}
      style={style}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
    />
  );
}
