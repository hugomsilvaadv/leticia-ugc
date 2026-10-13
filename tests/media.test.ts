import test from "node:test";
import assert from "node:assert/strict";
import {
  safeMediaUrl,
  safeLinkUrl,
  getEmbedUrl,
  detectMediaType,
} from "../lib/media";
test("media URLs reject scripts, protocol relative URLs and credentials", () => {
  for (const url of [
    "javascript:alert(1)",
    "//evil.test/a",
    "/\\evil.test",
    "https://user:pass@example.com/a",
    "data:image/svg+xml,a",
  ])
    assert.equal(safeMediaUrl(url), false, url);
  for (const url of ["/api/media/photo.jpg", "https://example.com/photo.jpg"])
    assert.equal(safeMediaUrl(url), true, url);
  assert.equal(safeLinkUrl("mailto:leticialeitecontent@gmail.com"), true);
  assert.equal(safeLinkUrl("#portfolio"), true);
});
test("embeds only allow exact hosts and validated provider IDs", () => {
  assert.equal(
    getEmbedUrl("https://youtube.com.evil.test/watch?v=abcdefghijk"),
    null,
  );
  assert.equal(
    getEmbedUrl("https://youtube.com/shorts/abcdefghijk"),
    "https://www.youtube-nocookie.com/embed/abcdefghijk",
  );
  assert.equal(
    getEmbedUrl("https://vimeo.com/12345"),
    "https://player.vimeo.com/video/12345",
  );
  assert.equal(
    getEmbedUrl("https://player.vimeo.com/video/12345?h=abc123"),
    "https://player.vimeo.com/video/12345?h=abc123",
  );
});
test("MIME uses real bytes, not filename or client declaration", () => {
  assert.equal(detectMediaType(Buffer.from("<script>alert(1)</script>")), null);
  assert.equal(
    detectMediaType(Buffer.from([0xff, 0xd8, 0xff, 0xe0])),
    "image/jpeg",
  );
  assert.equal(detectMediaType(Buffer.from("GIF89a")), "image/gif");
});
