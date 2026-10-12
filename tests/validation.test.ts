import test from "node:test";
import assert from "node:assert/strict";
import { assertMatchingShape } from "../lib/validation";
test("partial config updates reject null sections and wrong types instead of resetting content", () => {
  const template = {
    brand: { wordmark: "Original" },
    home: { hero: { title: "Original", media: { url: "", zoom: 100 } } },
  };
  for (const input of [
    { home: null },
    { brand: { wordmark: 123 } },
    { home: { hero: { media: { url: 1 } } } },
  ])
    assert.throws(() => assertMatchingShape(input, template), /inválid/);
  assert.doesNotThrow(() =>
    assertMatchingShape({ brand: { wordmark: "Preservado" } }, template),
  );
});
