import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match";
import config from "../next.config";
import { createImageDerivative, derivativeWidth, DerivativeBusyError, MAX_SOURCE_BYTES } from "../lib/image-derivatives";
import { uploadedImageSrcSet } from "../components/Media";

test("API no-store excludes only individual media files", async () => {
  const rules = await config.headers!();
  const noStore = rules.filter(rule => rule.headers.some(header => header.key === "Cache-Control" && header.value === "no-store"));
  const matches = (url: string) => noStore.some(rule => getPathMatch(rule.source)(url));
  for (const url of ["/api/media", "/api/media/", "/api/site-config", "/api/media/nested/file.jpg", "/api/mediax/file.jpg"]) assert.equal(matches(url), true, url);
  assert.equal(matches("/api/media/photo.jpg"), false);
});

test("derivative widths have a finite, strict allowlist", () => {
  assert.equal(derivativeWidth(new URLSearchParams()), null);
  for (const width of [320, 640, 960, 1440]) assert.equal(derivativeWidth(new URLSearchParams(`width=${width}`)), width);
  for (const query of ["width=", "width=321", "width=-320", "width=0320", "width=640.0", "width=Infinity", "width=320&width=640"]) assert.throws(() => derivativeWidth(new URLSearchParams(query)), /width/i);
});

test("responsive sources cover only uploaded static image paths", () => {
  assert.equal(uploadedImageSrcSet("/api/media/photo.JPG"), [320, 640, 960, 1440].map(width => `/api/media/photo.JPG?width=${width} ${width}w`).join(", "));
  for (const url of ["https://example.com/photo.jpg", "/images/photo.jpg", "/api/media/photo.gif", "/api/media/video.mp4", "/api/media/nested/photo.jpg", "/api/media/photo.jpg?width=1", "/api/media/%2e%2e.jpg"]) assert.equal(uploadedImageSrcSet(url), undefined, url);
});

test("WebP derivatives preserve oriented aspect ratio and source bytes", async () => {
  const source = await sharp({ create: { width: 800, height: 400, channels: 3, background: "red" } }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const original = Buffer.from(source);
  const result = await createImageDerivative(source, 320);
  assert.ok(result);
  const metadata = await sharp(result).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 320);
  assert.equal(metadata.height, 640);
  assert.deepEqual(source, original);
});

test("PNG and WebP inputs produce bounded WebP output", async () => {
  for (const format of ["png", "webp"] as const) {
    const source = await sharp({ create: { width: 1920, height: 1080, channels: 4, background: "transparent" } })[format]().toBuffer();
    const result = await createImageDerivative(source, 640);
    assert.ok(result);
    const metadata = await sharp(result).metadata();
    assert.equal(metadata.width, 640);
    assert.equal(metadata.height, 360);
    assert.equal(metadata.hasAlpha, true);
  }
});

test("GIF and animated WebP retain original animation", async () => {
  const gif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAAAAAAALAAAAAABAAEAAAIBRAA7", "base64");
  assert.equal(await createImageDerivative(gif, 320), null);
  const frames = Buffer.concat([Buffer.alloc(4 * 4 * 3, 0), Buffer.alloc(4 * 4 * 3, 255)]);
  const animated = await sharp(frames, { raw: { width: 4, height: 8, channels: 3, pageHeight: 4 } }).webp({ delay: [100, 100], loop: 0 }).toBuffer();
  assert.equal((await sharp(animated).metadata()).pages, 2);
  assert.equal(await createImageDerivative(animated, 320), null);
});

test("portrait derivatives retain the requested width and ratio", async () => {
  const source = await sharp({ create: { width: 960, height: 1200, channels: 3, background: "red" } }).jpeg().toBuffer();
  const result = await createImageDerivative(source, 1440);
  assert.ok(result);
  const metadata = await sharp(result).metadata();
  assert.equal(metadata.width, 1440);
  assert.equal(metadata.height, 1800);
});

test("oversized, malformed, and invalid-width transformations are rejected", async () => {
  await assert.rejects(createImageDerivative(Buffer.alloc(MAX_SOURCE_BYTES + 1), 320), /large/i);
  await assert.rejects(createImageDerivative(Buffer.from("invalid"), 320));
  await assert.rejects(createImageDerivative(Buffer.alloc(0), 321), /width/i);
});

test("extreme ratios cannot allocate unbounded derivative outputs", async () => {
  const source = await sharp({ create: { width: 1, height: 100, channels: 3, background: "red" } }).png().toBuffer();
  await assert.rejects(createImageDerivative(source, 1440), /large/i);
});

test("only two image transformations can hold sources concurrently", async () => {
  const source = await sharp({ create: { width: 1920, height: 1080, channels: 3, background: "red" } }).jpeg().toBuffer();
  const first = createImageDerivative(source, 640);
  const second = createImageDerivative(source, 960);
  await assert.rejects(createImageDerivative(source, 320), DerivativeBusyError);
  await Promise.all([first, second]);
  assert.ok(await createImageDerivative(source, 320));
});


test("concurrent media requests fall back to intact originals instead of broken images", async () => {
  const fs = await import("node:fs/promises"), os = await import("node:os"), path = await import("node:path");
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "media-route-"));
  const previous = process.env.CONTENT_DATA_DIR;
  process.env.CONTENT_DATA_DIR = dir;
  try {
    await fs.mkdir(path.join(dir, "uploads"));
    const source = await sharp({create:{width:3000,height:2000,channels:3,background:"red"}}).jpeg().toBuffer();
    await fs.writeFile(path.join(dir,"uploads","concurrent.jpg"),source);
    const { GET } = await import("../app/api/media/[name]/route");
    const responses = await Promise.all(Array.from({length:8}, () => GET(new Request("http://localhost/api/media/concurrent.jpg?width=1440"), {params:Promise.resolve({name:"concurrent.jpg"})})));
    const bodies = await Promise.all(responses.map(response => response.arrayBuffer()));
    assert.ok(responses.some(response => response.headers.get("content-type")==="image/jpeg"));
    for (let i=0;i<responses.length;i++) {
      assert.equal(responses[i].status,200);
      assert.equal(responses[i].headers.get("cache-control"),"public, max-age=31536000, immutable");
      if (responses[i].headers.get("content-type")==="image/jpeg") assert.deepEqual(Buffer.from(bodies[i]),source);
      else assert.equal((await sharp(Buffer.from(bodies[i])).metadata()).width,1440);
    }
  } finally {
    if (previous===undefined) delete process.env.CONTENT_DATA_DIR; else process.env.CONTENT_DATA_DIR=previous;
    await fs.rm(dir,{recursive:true,force:true});
  }
});
