// Reapply only edits that do not overwrite a newer change from another editor.
// Arrays are treated as atomic values (a reorder cannot be merged safely).
export const EDIT_CONFLICT = Symbol("edit-conflict");

const sameJson = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export function rebaseEdits(
  original: unknown,
  edited: unknown,
  latest: unknown,
): unknown | typeof EDIT_CONFLICT {
  if (sameJson(original, edited)) return latest;
  if (sameJson(original, latest) || sameJson(edited, latest))
    return edited;

  if (!isRecord(original) || !isRecord(edited) || !isRecord(latest))
    return EDIT_CONFLICT;

  const merged: Record<string, unknown> = { ...latest };
  for (const key of new Set([...Object.keys(original), ...Object.keys(edited)])) {
    const hadOriginal = Object.prototype.hasOwnProperty.call(original, key);
    const hasEdited = Object.prototype.hasOwnProperty.call(edited, key);
    const hasLatest = Object.prototype.hasOwnProperty.call(latest, key);

    if (!hasEdited) {
      if (hadOriginal && hasLatest && sameJson(original[key], latest[key])) {
        delete merged[key];
      } else if (hadOriginal && hasLatest) {
        return EDIT_CONFLICT;
      }
      continue;
    }

    if (!hadOriginal) {
      if (hasLatest && !sameJson(edited[key], latest[key]))
        return EDIT_CONFLICT;
      merged[key] = edited[key];
      continue;
    }

    if (!hasLatest) {
      // A concurrent deletion is only harmless if the local value was unchanged.
      if (!sameJson(original[key], edited[key])) return EDIT_CONFLICT;
      continue;
    }

    const child = rebaseEdits(original[key], edited[key], latest[key]);
    if (child === EDIT_CONFLICT) return EDIT_CONFLICT;
    merged[key] = child;
  }
  return merged;
}
