import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { DEFAULT_CONFIG } from "../lib/site-config";
import { DEFAULT_ARTICLES } from "../lib/article-store";
import original from "../content/linktree-original.json";
import { fromLegacyLinktree } from "../lib/linktree-model";
(async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "leticia-qa-"));
  const config = structuredClone(DEFAULT_CONFIG);
  const asset = {
    url: "/images/leticia-hero.jpg",
    positionX: 50,
    positionY: 50,
    zoom: 140,
    opacity: 100,
    fit: "cover" as const,
  };
  config.home.lookbook.media = asset;
  config.home.beauty.media = asset;
  config.home.ugc.mediaProduct = asset;
  config.home.ugc.mediaCreator = asset;
  config.pages.about.portrait = asset;
  config.pages.ugc.portrait = asset;
  const articles = structuredClone(DEFAULT_ARTICLES).map((a) => ({
    ...a,
    hero: asset,
  }));
  const linktree = fromLegacyLinktree(original);
  for (const key of Object.keys(linktree.media))
    linktree.media[key] = { ...asset };
  linktree.videos = linktree.videos.map((v) => ({
    ...v,
    type: "Foto",
    media: { ...asset },
  }));
  await fs.mkdir(path.join(dataDir, "uploads"));
  await fs.writeFile(
    path.join(dataDir, "site-config.json"),
    JSON.stringify(config),
  );
  await fs.writeFile(
    path.join(dataDir, "articles.json"),
    JSON.stringify(articles),
  );
  await fs.writeFile(
    path.join(dataDir, "portfolio.json"),
    JSON.stringify([
      {
        id: "qa-photo",
        title: "Fotografia de teste",
        description: "Somente fixture de testes",
        type: "Foto",
        published: true,
        media: asset,
      },
    ]),
  );
  await fs.writeFile(
    path.join(dataDir, "linktree.json"),
    JSON.stringify(linktree),
  );
  const child = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3001",
    ],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        CONTENT_DATA_DIR: dataDir,
        ADMIN_PASSWORD: "qa-only-password-not-for-deploy",
        NEXT_TELEMETRY_DISABLED: "1",
        BUILD_OUTPUT_DIR: ".next-qa",
      },
    },
  );
  const stop = () => child.kill("SIGTERM");
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
  child.on("exit", async (code) => {
    await fs.rm(dataDir, { recursive: true, force: true });
    process.exit(code ?? 0);
  });
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
