"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { MediaAsset } from "@/lib/site-config";
import { safeMediaUrl } from "@/lib/media";

// The original hero image is retained until a video/poster is uploaded in /admin.
// No autoplay or video transfer is initiated for reduced-motion/data-saver visitors.
export default function CinematicHeroMedia({ asset }: { asset: MediaAsset }) {
  const [allowMotion, setAllowMotion] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean };
    }).connection;
    const update = () => setAllowMotion(!preference.matches && !connection?.saveData);
    update();
    preference.addEventListener?.("change", update);
    return () => preference.removeEventListener?.("change", update);
  }, []);

  const poster = asset.poster && safeMediaUrl(asset.poster)
    ? asset.poster
    : "/images/leticia-hero.jpg";
  const mediaStyle: CSSProperties = {
    objectFit: asset.fit,
    objectPosition: `${asset.positionX}% ${asset.positionY}%`,
    transform: `scale(${asset.zoom / 100})`,
    opacity: asset.opacity / 100,
  };

  return (
    <div className="cinematicMedia">
      <img className="cinematicStill" src={poster} alt="" aria-hidden="true" style={mediaStyle} />
      {allowMotion && (
        <video
          className="cinematicVideo"
          src={asset.url}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          tabIndex={-1}
          style={mediaStyle}
        />
      )}
    </div>
  );
}
