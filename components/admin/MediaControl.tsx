"use client";
import { UploadActivity } from "./UploadActivity";
import { useContext, useState } from "react";
import type { MediaAsset } from "@/lib/site-config";
import SharedMedia from "@/components/Media";
import MediaLibrary from "./MediaLibrary";
export default function MediaControl({
  label,
  asset,
  password,
  onChange,
  imageOnly = false,
  responsive = false,
  mode = "desktop",
}: {
  label: string;
  asset: MediaAsset;
  password: string;
  onChange: (asset: MediaAsset) => void;
  imageOnly?: boolean;
  responsive?: boolean;
  mode?: "desktop" | "mobile";
}) {
  const activity = useContext(UploadActivity);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploading, setUploading] = useState(false);
  const set = <K extends keyof MediaAsset>(key: K, value: MediaAsset[K]) =>
    onChange({
      ...asset,
      [key]: value,
      ...(key === "url" ? { width: undefined, height: undefined } : {}),
    });

  const mobile = asset.mobile ?? {
    positionX: asset.positionX,
    positionY: asset.positionY,
    fit: "contain" as const,
    zoom: 100,
    opacity: asset.opacity,
  };
  const setMobile = <K extends keyof NonNullable<MediaAsset["mobile"]>>(
    key: K, value: NonNullable<MediaAsset["mobile"]>[K],
  ) => onChange({ ...asset, mobile: { ...mobile, [key]: value } });

  async function upload(file?: File) {
    if (!file) return;
    if (!password)
      return alert("Digite a senha do painel antes de enviar a mídia.");

    if (file.size > 30 * 1024 * 1024) {
      setUploadStatus(
        "Arquivo acima de 30 MB. Para vídeos maiores, use YouTube ou Vimeo.",
      );
      return;
    }
    activity(1);
    setUploading(true);
    setUploadStatus("Enviando…");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "x-admin-password": password },
        body,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha no upload.");
      onChange({
        ...asset,
        url: data.url,
        width: data.width,
        height: data.height,
      });
      setUploadStatus(
        "Arquivo enviado. Salve a seção para associá-lo ao site.",
      );
    } catch (error) {
      setUploadStatus(
        error instanceof Error
          ? error.message
          : "Falha de conexão. Tente novamente.",
      );
    } finally {
      setUploading(false);
      activity(-1);
    }
  }

  return (
    <div className="adminCard">
      <strong>{label}</strong>
      <input
        aria-label={label + " — enviar arquivo"}
        disabled={uploading}
        type="file"
        accept={
          imageOnly
            ? "image/jpeg,image/png,image/webp,image/gif"
            : "image/*,video/mp4,video/webm"
        }
        onChange={(e) => upload(e.target.files?.[0])}
      />
      <label>
        URL da mídia
        <input
          value={asset.url}
          placeholder="/api/media/foto.jpg ou URL pública"
          onChange={(e) => set("url", e.target.value)}
        />
      </label>
      <p role="status">{uploadStatus}</p>
      <MediaLibrary password={password} onSelect={(url) => set("url", url)} />
      {asset.url && (
        <div className="adminMediaPreview">
          <SharedMedia asset={asset} alt={label} />
        </div>
      )}
      <p className="adminUploadHint">
        Após enviar ou alterar o link, clique em Salvar alterações. Arquivos até
        30 MB.
      </p>
      <div className="adminRangeRow">
        <label>
          Ponto focal horizontal <b>{asset.positionX}%</b>
          <input
            type="range"
            min="0"
            max="100"
            value={asset.positionX}
            onChange={(e) => set("positionX", Number(e.target.value))}
          />
        </label>
        <label>
          Ponto focal vertical <b>{asset.positionY}%</b>
          <input
            type="range"
            min="0"
            max="100"
            value={asset.positionY}
            onChange={(e) => set("positionY", Number(e.target.value))}
          />
        </label>
      </div>
      <label>
        Zoom <b>{asset.zoom}%</b>
        <input
          type="range"
          min="70"
          max="220"
          value={asset.zoom}
          onChange={(e) => set("zoom", Number(e.target.value))}
        />
      </label>
      <label>
        Opacidade <b>{asset.opacity}%</b>
        <input
          type="range"
          min="0"
          max="100"
          value={asset.opacity}
          onChange={(e) => set("opacity", Number(e.target.value))}
        />
      </label>
      <label>
        Enquadramento
        <select
          value={asset.fit}
          onChange={(e) => set("fit", e.target.value as MediaAsset["fit"])}
        >
          <option value="cover">Cobrir o espaço</option>
          <option value="contain">Mostrar inteira</option>
        </select>
      </label>
      <label>
        Miniatura do vídeo (opcional)
        <input
          value={asset.poster || ""}
          onChange={(e) => set("poster", e.target.value)}
          placeholder="URL da fotografia existente"
        />
      </label>
      {responsive && (
        <div className="adminCard">
          <strong>Enquadramento exclusivo do celular</strong>
          <p className="adminHint">
            Você está vendo a prévia {mode === "mobile" ? "CELULAR" : "DESKTOP"}.
            Defina o enquadramento vertical separadamente. A configuração antiga
            permanece igual até você alterar estes controles.
          </p>
          <div className="adminRangeRow">
            <label>
              Horizontal no celular <b>{mobile.positionX}%</b>
              <input type="range" aria-label="Horizontal no celular" min="0" max="100" value={mobile.positionX}
                onChange={(e) => setMobile("positionX", Number(e.target.value))} />
            </label>
            <label>
              Vertical no celular <b>{mobile.positionY}%</b>
              <input type="range" aria-label="Vertical no celular" min="0" max="100" value={mobile.positionY}
                onChange={(e) => setMobile("positionY", Number(e.target.value))} />
            </label>
          </div>
          <label>
            Zoom no celular <b>{mobile.zoom ?? 100}%</b>
            <input type="range" aria-label="Zoom no celular" min="70" max="220" value={mobile.zoom ?? 100}
              onChange={(e) => setMobile("zoom", Number(e.target.value))} />
          </label>
          <label>
            Opacidade no celular <b>{mobile.opacity ?? asset.opacity}%</b>
            <input type="range" aria-label="Opacidade no celular" min="0" max="100"
              value={mobile.opacity ?? asset.opacity}
              onChange={(e) => setMobile("opacity", Number(e.target.value))} />
          </label>
          <label>
            Enquadramento no celular
            <select aria-label="Enquadramento no celular" value={mobile.fit}
              onChange={(e) => setMobile("fit", e.target.value as MediaAsset["fit"])}>
              <option value="contain">Exibir fotografia inteira</option>
              <option value="cover">Preencher a capa (recortar)</option>
            </select>
          </label>
          {asset.mobile && (
            <button type="button" onClick={() => onChange({ ...asset, mobile: undefined })}>
              Restaurar enquadramento automático do celular
            </button>
          )}
        </div>
      )}
      {!responsive && <p className="adminHint">
        No celular, a fotografia inteira é preservada. O zoom é aplicado no desktop.
      </p>}
    </div>
  );
}
