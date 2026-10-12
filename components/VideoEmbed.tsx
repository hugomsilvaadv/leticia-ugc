"use client";
import { useState } from "react";
export default function VideoEmbed({
  src,
  title,
  poster,
}: {
  src: string;
  title: string;
  poster?: string;
}) {
  const [loaded, setLoaded] = useState(!poster);
  if (!loaded && poster)
    return (
      <div className="videoEmbed">
        <button
          type="button"
          className="videoPoster"
          aria-label={"Abrir player: " + title}
          onClick={() => setLoaded(true)}
        >
          <img src={poster} alt="" loading="lazy" decoding="async" />
          <span>
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
              <path d="M8 5v14l11-7z" fill="currentColor" />
            </svg>
            Abrir player
          </span>
        </button>
      </div>
    );
  return (
    <div className="videoEmbed">
      <iframe
        className="sharedMedia"
        src={src}
        title={title || "Vídeo"}
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
      />
    </div>
  );
}
