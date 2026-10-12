import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import original from "../content/linktree-original.json";
import { importLinktree } from "../lib/linktree-import";
test("incomplete migration leaves active content untouched", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "leticia-import-"));
  try {
    const source = path.join(dir, "export.json");
    await fs.writeFile(source, JSON.stringify(original));
    await assert.rejects(
      importLinktree({
        exportFile: source,
        assetRoot: dir,
        dataDir: path.join(dir, "data"),
      }),
      /mídia|arquivo/i,
    );
    await assert.rejects(fs.access(path.join(dir, "data", "linktree.json")));
  } finally {
    await fs.rm(dir, { recursive: true });
  }
});
test("complete import copies media bytes, retains texts and refuses overwrites", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "leticia-import-"));
  try {
    const source = path.join(dir, "export.json");
    const jpg = await fs.readFile("public/images/leticia-hero.jpg");
    const video = Buffer.from([
      0, 0, 0, 16, 102, 116, 121, 112, 105, 115, 111, 109,
    ]);
    await fs.writeFile(source, JSON.stringify(original));
    for (const name of [
      "hero-fundo-leticia.jpg",
      "foto-perfil.jpg",
      "portfolio-produto.jpg",
      "portfolio-provador.jpg",
    ])
      await fs.writeFile(path.join(dir, name), jpg);
    await fs.writeFile(path.join(dir, "portfolio-unboxing.mp4"), video);
    const dataDir = path.join(dir, "data");
    const result = await importLinktree({
      exportFile: source,
      assetRoot: dir,
      dataDir,
    });
    assert.deepEqual(result.config.texts, original.texts);
    assert.equal(result.manifest.length, 5);
    for (const item of result.manifest) {
      const bytes = await fs.readFile(
        path.join(dataDir, "uploads", item.filename),
      );
      assert.deepEqual(bytes, item.original.endsWith(".mp4") ? video : jpg);
    }
    assert.equal(result.config.provenance.kind, "imported");
    await assert.rejects(
      importLinktree({ exportFile: source, assetRoot: dir, dataDir }),
      /já existe/,
    );
  } finally {
    await fs.rm(dir, { recursive: true });
  }
});
