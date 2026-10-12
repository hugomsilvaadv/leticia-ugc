import path from "node:path";
import { unstable_noStore as noStore } from "next/cache";
import original from "@/content/linktree-original.json";
import { getDataDir } from "./site-config";
import {
  publicLinktree,
  fromLegacyLinktree,
  validateLinktree,
  type LinktreeConfig,
} from "./linktree-model";
import { readJsonFileSync, writeJsonFile } from "./json-store";
export const DEFAULT_LINKTREE = fromLegacyLinktree(original);
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
