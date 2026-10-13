import { imageDimensions } from "./image-validation";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { fromLegacyLinktree, validateLinktree } from "./linktree-model";
import { detectMediaType, safeMediaUrl } from "./media";
export async function importLinktree({
  exportFile,
  assetRoot,
  dataDir,
  dryRun = false,
}: {
  exportFile: string;
  assetRoot: string;
  dataDir: string;
  dryRun?: boolean;
}) {
  const raw = await fs.readFile(exportFile, "utf8");
  const config = fromLegacyLinktree(JSON.parse(raw));
  validateLinktree(config);
  const target = path.join(dataDir, "linktree.json");
  try {
    await fs.access(target);
    throw new Error(
      "linktree.json já existe. Compare os dados e use uma migração revisada, sem sobrescrever.",
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const refs = [
    config.background,
    ...Object.values(config.media),
    ...config.videos.map((v) => v.media),
  ];
  const urls = [
    ...new Set(
      refs
        .flatMap((a) => [a.url, ("poster" in a && a.poster) || ""])
        .filter(Boolean),
    ),
  ];
  const staged: {
    original: string;
    filename: string;
    sha256: string;
    bytes: Buffer;
    width?: number;
    height?: number;
  }[] = [];
  for (const url of urls) {
    if (!safeMediaUrl(url)) throw new Error("URL de mídia inválida.");
    let bytes: Buffer;
    if (url.startsWith("/")) {
      const root = await fs.realpath(assetRoot);
      const file = path.resolve(root, "." + decodeURIComponent(url));
      if (!file.startsWith(root + path.sep))
        throw new Error("Arquivo de mídia fora da origem.");
      let resolved: string;
      try {
        resolved = await fs.realpath(file);
      } catch {
        throw new Error(`Arquivo de mídia não disponível: ${url}`);
      }
      if (!resolved.startsWith(root + path.sep))
        throw new Error("Arquivo de mídia fora da origem.");
      bytes = await fs.readFile(resolved);
    } else {
      const host = new URL(url).hostname;
      if (
        host === "localhost" ||
        host.endsWith(".local") ||
        /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(
          host,
        ) ||
        host.includes(":")
      )
        throw new Error("URL de mídia privada não permitida.");
      const response = await fetch(url, {
        signal: AbortSignal.timeout(60000),
        redirect: "error",
      });
      if (!response.ok)
        throw new Error(`Mídia não disponível: HTTP ${response.status}.`);
      const length = Number(response.headers.get("content-length") || 0);
      if (length > 250 * 1024 * 1024)
        throw new Error("Mídia acima do limite de importação de 250 MB.");
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Mídia sem corpo.");
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.length;
        if (size > 250 * 1024 * 1024) {
          await reader.cancel();
          throw new Error("Mídia acima do limite de importação de 250 MB.");
        }
        chunks.push(chunk.value);
      }
      bytes = Buffer.concat(chunks);
    }
    const type = detectMediaType(bytes);
    const ext: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "image/gif": ".gif",
      "video/mp4": ".mp4",
      "video/webm": ".webm",
    };
    if (!type) throw new Error(`Formato de mídia não reconhecido: ${url}`);
    const dimensions = type.startsWith("image/")
      ? await imageDimensions(bytes)
      : undefined;
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    staged.push({
      original: url,
      filename: `import-${sha256}${ext[type]}`,
      sha256,
      bytes,
      ...dimensions,
    });
  }
  const mapped = new Map(
    staged.map((item) => [item.original, "/api/media/" + item.filename]),
  );
  for (const asset of refs) {
    const dimensions = staged.find((item) => item.original === asset.url);
    if (dimensions?.width && dimensions.height) {
      asset.width = dimensions.width;
      asset.height = dimensions.height;
    }
    asset.url = mapped.get(asset.url) ?? asset.url;
    if ("poster" in asset && asset.poster)
      asset.poster = mapped.get(asset.poster) ?? asset.poster;
  }
  config.provenance = {
    kind: "imported",
    source: "export do Linktree original",
    importedAt: new Date().toISOString(),
  };
  const manifest = staged.map(({ bytes, ...item }) => ({
    ...item,
    size: bytes.length,
  }));
  if (dryRun) return { config, manifest, dryRun: true };
  const backup = path.join(dataDir, "migration-backups", randomUUID());
  await fs.mkdir(backup, { recursive: true });
  await fs.writeFile(path.join(backup, "source-config.json"), raw, {
    flag: "wx",
    mode: 0o600,
  });
  await fs.writeFile(
    path.join(backup, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    { flag: "wx", mode: 0o600 },
  );
  const uploads = path.join(dataDir, "uploads");
  await fs.mkdir(uploads, { recursive: true });
  for (const item of staged) {
    const filename = path.join(uploads, item.filename);
    try {
      await fs.writeFile(filename, item.bytes, { flag: "wx", mode: 0o600 });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const existing = await fs.readFile(filename);
      if (createHash("sha256").update(existing).digest("hex") !== item.sha256)
        throw new Error("Arquivo de destino divergente.");
    }
  }
  // Exclusive creation prevents an import from replacing an editor's concurrent save.
  const temp = path.join(dataDir, `.linktree-${randomUUID()}.tmp`);
  try {
    const handle = await fs.open(temp, "wx", 0o600);
    try {
      await handle.writeFile(JSON.stringify(config, null, 2) + "\n");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await fs.link(temp, target);
  } finally {
    await fs.rm(temp, { force: true });
  }
  return { config, manifest, dryRun: false };
}
