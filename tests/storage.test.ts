import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { readJsonFile, writeJsonFile, revisionFor } from "../lib/json-store";

test("missing file uses fallback; corrupt file never silently uses default", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "leticia-store-"));
  const file = path.join(dir, "articles.json");
  try {
    assert.deepEqual(await readJsonFile(file, []), []);
    await fs.writeFile(file, "broken");
    await assert.rejects(readJsonFile(file, []));
    assert.equal(await fs.readFile(file, "utf8"), "broken");
  } finally {
    await fs.rm(dir, { recursive: true });
  }
});
test("atomic update retains previous bytes and rejects stale revision", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "leticia-store-"));
  const file = path.join(dir, "data.json");
  try {
    const old = { title: "Título original", unknown: { keep: true } };
    await writeJsonFile(file, old);
    const before = await fs.readFile(file, "utf8");
    await writeJsonFile(
      file,
      { ...old, new: true },
      { expectedRevision: revisionFor(old) },
    );
    const backups = await fs.readdir(path.join(dir, "backups"));
    assert.equal(backups.length, 1);
    assert.equal(
      await fs.readFile(path.join(dir, "backups", backups[0]), "utf8"),
      before,
    );
    await assert.rejects(
      writeJsonFile(
        file,
        { title: "stale" },
        { expectedRevision: revisionFor(old) },
      ),
      /conflito/i,
    );
    assert.equal((await readJsonFile<any>(file, {})).new, true);
  } finally {
    await fs.rm(dir, { recursive: true });
  }
});
test("concurrent writers with the same revision cannot both succeed", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "leticia-store-"));
  const file = path.join(dir, "data.json");
  try {
    await writeJsonFile(file, { n: 0 });
    const results = await Promise.allSettled(
      [1, 2].map((n) =>
        writeJsonFile(file, { n }, { expectedRevision: revisionFor({ n: 0 }) }),
      ),
    );
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  } finally {
    await fs.rm(dir, { recursive: true });
  }
});

test("syntactically valid but malformed stored JSON is rejected without substituting defaults", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "leticia-schema-"));
  const file = path.join(dir, "site-config.json");
  try {
    const { assertMatchingShape } = await import("../lib/validation");
    for (const raw of ["null", "[]", '{"brand":null}']) {
      await fs.writeFile(file, raw);
      await assert.rejects(
        readJsonFile(file, { brand: { wordmark: "Original" } }, (value) =>
          assertMatchingShape(value, { brand: { wordmark: "Original" } }),
        ),
      );
      assert.equal(await fs.readFile(file, "utf8"), raw);
    }
  } finally {
    await fs.rm(dir, { recursive: true });
  }
});
