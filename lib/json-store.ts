import { readFileSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";

export class StoreConflict extends Error {
  constructor() {
    super(
      "Conflito: este conteúdo foi atualizado em outra sessão. Recarregue antes de salvar.",
    );
  }
}
export function revisionFor(value: unknown): string {
  return (
    '"' + createHash("sha256").update(JSON.stringify(value)).digest("hex") + '"'
  );
}
// Public RSC loaders filter records before crossing an async boundary. Next dev
// otherwise serializes awaited I/O values in its diagnostic Flight stream.
export function readJsonFileSync<T>(
  file: string,
  fallback: T,
  validate?: (value: T) => void,
): T {
  try {
    const value = JSON.parse(readFileSync(file, "utf8")) as T;
    validate?.(value);
    return value;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw new Error(
      `Não foi possível ler ${path.basename(file)}. Preserve o arquivo e restaure um backup verificado.`,
      { cause: error },
    );
  }
}
export async function readJsonFile<T>(
  file: string,
  fallback: T,
  validate?: (value: T) => void,
): Promise<T> {
  return readJsonFileSync(file, fallback, validate);
}
const queues = new Map<string, Promise<unknown>>();
export async function writeJsonFile<T>(
  file: string,
  value: T,
  options: {
    expectedRevision?: string | null;
    fallback?: T;
    normalize?: (v: T) => T;
  } = {},
): Promise<void> {
  const previous = queues.get(file) ?? Promise.resolve();
  const next = previous
    .catch(() => {})
    .then(async () => {
      await fs.mkdir(path.dirname(file), { recursive: true });
      let original: string | undefined;
      try {
        original = await fs.readFile(file, "utf8");
        JSON.parse(original);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
      if (options.expectedRevision) {
        const raw =
          original === undefined ? options.fallback : JSON.parse(original);
        const current =
          options.normalize && raw !== undefined ? options.normalize(raw) : raw;
        if (options.expectedRevision !== revisionFor(current))
          throw new StoreConflict();
      }
      if (original !== undefined) {
        const dir = path.join(path.dirname(file), "backups");
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(
          path.join(
            dir,
            `${path.basename(file)}.${Date.now()}.${randomUUID()}.bak`,
          ),
          original,
          { flag: "wx", mode: 0o600 },
        );
      }
      const temporary = path.join(
        path.dirname(file),
        `.${path.basename(file)}.${randomUUID()}.tmp`,
      );
      try {
        const handle = await fs.open(temporary, "wx", 0o600);
        try {
          await handle.writeFile(JSON.stringify(value, null, 2) + "\n");
          await handle.sync();
        } finally {
          await handle.close();
        }
        await fs.rename(temporary, file);
      } finally {
        await fs.rm(temporary, { force: true });
      }
    });
  queues.set(file, next);
  try {
    await next;
  } finally {
    if (queues.get(file) === next) queues.delete(file);
  }
}

// Preserve extension fields from older/newer editors instead of dropping them.
export function mergeObjects<T>(base: T, patch: unknown): T {
  if (
    !base ||
    typeof base !== "object" ||
    Array.isArray(base) ||
    !patch ||
    typeof patch !== "object" ||
    Array.isArray(patch)
  )
    return patch as T;
  const result = { ...base } as Record<string, unknown>;
  for (const [key, value] of Object.entries(patch)) {
    if (["__proto__", "prototype", "constructor"].includes(key)) continue;
    result[key] = key in result ? mergeObjects(result[key], value) : value;
  }
  return result as T;
}
