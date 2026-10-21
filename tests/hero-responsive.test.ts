import test from "node:test";
import assert from "node:assert/strict";
import { normalizeConfig, DEFAULT_CONFIG } from "../lib/site-config";

test("old hero content loads without forcing mobile edits", () => {
  const old = { ...DEFAULT_CONFIG, home: {
    ...DEFAULT_CONFIG.home,
    hero: { ...DEFAULT_CONFIG.home.hero, titleStyle: {
      fontFamily: "Georgia", fontSize: 58, x: 0, y: 0, align: "left" as const,
    } },
  } };
  const config = normalizeConfig(old);
  assert.equal(config.home.hero.titleStyle.mobile, undefined);
  assert.equal(config.home.hero.media.mobile, undefined);
  assert.equal(config.home.hero.overlayOpacity, 100);
});

test("mobile copy and media normalize separately without touching desktop values", () => {
  const config = normalizeConfig({ ...DEFAULT_CONFIG, home: {
    ...DEFAULT_CONFIG.home,
    hero: {
      ...DEFAULT_CONFIG.home.hero,
      titleStyle: { ...DEFAULT_CONFIG.home.hero.titleStyle, mobile: {
        fontSize: 32, x: 18, y: -12, align: "center", color: "#aabbcc",
      } },
      media: { ...DEFAULT_CONFIG.home.hero.media, mobile: {
        positionX: 87, positionY: 5, fit: "cover", zoom: 145, opacity: 68,
      } },
    },
  } });
  assert.equal(config.home.hero.titleStyle.fontSize, DEFAULT_CONFIG.home.hero.titleStyle.fontSize);
  assert.deepEqual(config.home.hero.titleStyle.mobile, {
    fontSize: 32, x: 18, y: -12, align: "center", color: "#aabbcc",
  });
  assert.deepEqual(config.home.hero.media.mobile, {
    positionX: 87, positionY: 5, fit: "cover", zoom: 145, opacity: 68,
  });
  assert.equal(config.home.hero.media.zoom, DEFAULT_CONFIG.home.hero.media.zoom);
});

test("mobile media limits clamp malformed sizes and colors are sanitized", () => {
  const incoming = structuredClone(DEFAULT_CONFIG);
  incoming.home.hero.titleStyle = { ...incoming.home.hero.titleStyle, color: "red", mobile: {
    fontSize: 900, x: 900, y: -900, align: "left", color: "expression(foo)",
  } };
  incoming.home.hero.media.mobile = { positionX: -23, positionY: 1000, zoom: 500, opacity: -8, fit: "cover" };
  const config = normalizeConfig(incoming);
  assert.equal(config.home.hero.titleStyle.color, undefined);
  assert.equal(config.home.hero.titleStyle.mobile?.color, undefined);
  assert.equal(config.home.hero.titleStyle.mobile?.fontSize, 120);
  assert.equal(config.home.hero.media.mobile?.zoom, 220);
  assert.equal(config.home.hero.media.mobile?.opacity, 0);
});
