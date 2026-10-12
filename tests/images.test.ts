import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { imageDimensions } from "../lib/image-validation";
test("a JPEG header alone does not make an uploaded photograph valid", async () => {
  await assert.rejects(
    imageDimensions(Buffer.from([255, 216, 255, 224])),
    /imagem inválid/i,
  );
});
test("real existing photograph is decoded without changing bytes", async () => {
  const bytes = await fs.readFile("public/images/leticia-hero.jpg");
  const before = Buffer.from(bytes);
  assert.deepEqual(await imageDimensions(bytes), { width: 960, height: 1200 });
  assert.deepEqual(bytes, before);
});
