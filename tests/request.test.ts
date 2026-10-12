import test from "node:test";
import assert from "node:assert/strict";
import { readLimitedBody } from "../lib/request-body";
test("chunked uploads cannot bypass body size limit", async () => {
  const stream = new ReadableStream({
    start(c) {
      c.enqueue(new Uint8Array(4));
      c.enqueue(new Uint8Array(4));
      c.close();
    },
  });
  const request = new Request("http://localhost", {
    method: "POST",
    body: stream,
    duplex: "half",
  } as RequestInit);
  await assert.rejects(readLimitedBody(request, 5), /limite/);
});
test("normal upload keeps exact input bytes", async () => {
  const bytes = new Uint8Array([1, 2, 3]);
  const request = new Request("http://localhost", {
    method: "POST",
    body: bytes,
  });
  assert.deepEqual(await readLimitedBody(request, 5), Buffer.from(bytes));
});
