import VideoEmbed from "./VideoEmbed";
import type { CSSProperties } from "react";
import type { MediaAsset } from "@/lib/site-config";
import { getEmbedUrl, isVideoFile, safeMediaUrl } from "@/lib/media";

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
  return (
    <img
      className="sharedMedia"
      src={asset.url}
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
