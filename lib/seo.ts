export function jsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, String.raw`\u003c`);
}
