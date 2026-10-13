export class BodyLimitError extends Error {
  constructor() {
    super("O arquivo excede o limite permitido.");
  }
}
export async function readLimitedBody(
  request: Request,
  limit: number,
): Promise<Buffer> {
  if (Number(request.headers.get("content-length") || 0) > limit)
    throw new BodyLimitError();
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new BodyLimitError();
      }
      chunks.push(chunk.value);
    }
    return Buffer.concat(chunks);
  } finally {
    reader.releaseLock();
  }
}
