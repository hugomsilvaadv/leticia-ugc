import path from "node:path";
import { unstable_noStore as noStore } from "next/cache";
import uploadReady from "@/content/linktree-upload-ready-2026-10-12.json";
import { getDataDir } from "./site-config";
import {
  publicLinktree,
  fromLegacyLinktree,
  validateLinktree,
  type LinktreeConfig,
} from "./linktree-model";
import { readJsonFileSync, writeJsonFile } from "./json-store";
// Bootstrap from the original public texts, typography and styles while leaving
// images and video slots empty so the editor can upload replacement media.
// Any existing /data/linktree.json takes precedence; never overwrite it.
export const DEFAULT_LINKTREE = fromLegacyLinktree(uploadReady);
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
