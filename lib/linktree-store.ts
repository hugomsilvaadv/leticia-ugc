import path from "node:path";
import { unstable_noStore as noStore } from "next/cache";
import liveSnapshot from "@/content/linktree-live-snapshot-2026-10-12.json";
import { getDataDir } from "./site-config";
import {
  publicLinktree,
  fromLegacyLinktree,
  validateLinktree,
  type LinktreeConfig,
} from "./linktree-model";
import { readJsonFileSync, writeJsonFile } from "./json-store";
// Bootstrap from a verified public snapshot when /data/linktree.json is absent.
// Media remain on the original Vercel Blob until separately copied and verified.
// A real persisted /data/linktree.json always takes precedence over this fallback.
export const DEFAULT_LINKTREE = fromLegacyLinktree(liveSnapshot);
const file = path.join(getDataDir(), "linktree.json");
export async function readLinktree(includeEditorData = false) {
  noStore();
  const data = readJsonFileSync(file, DEFAULT_LINKTREE, validateLinktree);
  validateLinktree(data);
  return includeEditorData ? data : publicLinktree(data);
}
export async function writeLinktree(
  data: unknown,
  expectedRevision?: string | null,
): Promise<LinktreeConfig> {
  validateLinktree(data);
  await writeJsonFile(file, data, {
    expectedRevision,
    fallback: DEFAULT_LINKTREE,
  });
  return data;
}
