export function safeMediaUrl(value: string): boolean {
  if (!value) return true;
  if (/[\u0000-\u0020\\]/.test(value)) return false;
  if (/^\/(?!\/)/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}
export function safeLinkUrl(value: string): boolean {
  if (/^#[\w-]+$/.test(value)) return true;
  if (/^mailto:[^\s<>]+@[^\s<>]+$/.test(value)) return true;
  if (/^tel:\+?[\d()-]+$/.test(value)) return true;
  return !!value && safeMediaUrl(value);
}
export function getEmbedUrl(raw: string): string | null {
  if (!safeMediaUrl(raw)) return null;
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    if (
      [
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "youtu.be",
        "www.youtu.be",
        "www.youtube-nocookie.com",
      ].includes(host)
    ) {
      const id = host.endsWith("youtu.be")
        ? url.pathname.split("/")[1]
        : (url.searchParams.get("v") ??
          url.pathname.match(
            /^\/(?:shorts|embed|live)\/([\w-]{11})(?:\/|$)/,
          )?.[1]);
      return id && /^[\w-]{11}$/.test(id)
        ? `https://www.youtube-nocookie.com/embed/${id}`
        : null;
    }
    if (["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(host)) {
      const id = url.pathname.match(
        /^\/(?:video\/)?(\d+)(?:\/([a-f\d]+))?\/?$/,
      );
      if (!id) return null;
      const hash = url.searchParams.get("h") ?? id[2];
      return (
        `https://player.vimeo.com/video/${id[1]}` +
        (hash && /^[a-z\d]+$/i.test(hash) ? `?h=${hash}` : "")
      );
    }
    if (["instagram.com", "www.instagram.com"].includes(host)) {
      const id = url.pathname.match(/^\/(?:reel|p|tv)\/([\w-]+)(?:\/|$)/)?.[1];
      return id ? `https://www.instagram.com/p/${id}/embed` : null;
    }
  } catch {}
  return null;
}
export const isVideoFile = (url: string) => /\.(mp4|webm)(\?|$)/i.test(url);
export function detectMediaType(bytes: Uint8Array): string | null {
  const b = Buffer.from(bytes);
  if (b[0] === 255 && b[1] === 216 && b[2] === 255) return "image/jpeg";
  if (b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return "image/png";
  if (["GIF87a", "GIF89a"].includes(b.subarray(0, 6).toString()))
    return "image/gif";
  if (
    b.subarray(0, 4).toString() === "RIFF" &&
    b.subarray(8, 12).toString() === "WEBP"
  )
    return "image/webp";
  if (b.subarray(4, 8).toString() === "ftyp" && b.length >= 12)
    return "video/mp4";
  if (b.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])))
    return "video/webm";
  return null;
}
export function assertSafeMedia(value: unknown): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach(assertSafeMedia);
    return;
  }
  for (const [key, v] of Object.entries(value)) {
    if (
      (key === "url" || key === "poster") &&
      (typeof v !== "string" || !safeMediaUrl(v))
    )
      throw new Error(
        "URL de mídia inválida. Use HTTPS ou um arquivo deste site.",
      );
    assertSafeMedia(v);
  }
}
