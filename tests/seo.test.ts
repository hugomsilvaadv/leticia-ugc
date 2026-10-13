import test from "node:test";
import assert from "node:assert/strict";
import { jsonLd } from "../lib/seo";
test("JSON-LD keeps editorial text while escaping script-closing sequences", () => {
  const text = "</script><script>globalThis.pwned=true</script>";
  const result = jsonLd({ headline: text });
  assert.equal(result.includes("<"), false);
  assert.deepEqual(JSON.parse(result), { headline: text });
});
