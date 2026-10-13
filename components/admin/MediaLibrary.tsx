"use client";
import { useState } from "react";
export default function MediaLibrary({
  password,
  onSelect,
}: {
  password: string;
  onSelect?: (url: string) => void;
}) {
  const [items, setItems] = useState<
    { name: string; url: string; size: number }[]
  >([]);
  const [status, setStatus] = useState("");
  async function load() {
    setStatus("Carregando biblioteca…");
    try {
      const r = await fetch("/api/media", {
        headers: { "x-admin-password": password },
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setItems(data);
      setStatus(data.length ? "" : "Nenhuma mídia enviada neste volume.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Falha de conexão.");
    }
  }
  return (
    <div className="adminCard">
      <strong>Biblioteca de mídia</strong>
      <p className="adminHint">
        Reutilize arquivos já enviados. Selecionar altera apenas a associação;
        os originais permanecem no volume.
      </p>
      <button type="button" onClick={load}>
        Carregar biblioteca
      </button>
      <p role="status">{status}</p>
      <div className="mediaLibraryGrid">
        {items.map((item) => (
          <button
            key={item.url}
            type="button"
            onClick={() =>
              onSelect
                ? onSelect(item.url)
                : navigator.clipboard
                    .writeText(item.url)
                    .then(() => setStatus("URL copiada."))
                    .catch(() => setStatus(item.url))
            }
          >
            {/\.(mp4|webm)$/i.test(item.name) ? (
              <span>Vídeo</span>
            ) : (
              <img src={item.url} alt="" loading="lazy" />
            )}
            <span>{item.name}</span>
            <small>{Math.ceil(item.size / 1024)} KB</small>
          </button>
        ))}
      </div>
    </div>
  );
}
