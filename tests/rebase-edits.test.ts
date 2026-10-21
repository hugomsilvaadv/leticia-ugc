import test from "node:test";
import assert from "node:assert/strict";
import { EDIT_CONFLICT, rebaseEdits } from "../lib/rebase-edits";

test("rebase keeps local edits while retaining newer unrelated fields", () => {
  const original = { home: { hero: { title: "A", zoom: 100 }, footer: "Old" } };
  const edited = { home: { hero: { title: "A", zoom: 120 }, footer: "Old" } };
  const latest = { home: { hero: { title: "A", zoom: 100 }, footer: "New" } };
  assert.deepEqual(rebaseEdits(original, edited, latest), {
    home: { hero: { title: "A", zoom: 120 }, footer: "New" },
  });
});

test("rebase retries safely when a conflict response has identical content", () => {
  const original = { home: { title: "A" } };
  const edited = { home: { title: "B" } };
  assert.deepEqual(rebaseEdits(original, edited, original), edited);
});

test("rebase rejects simultaneous changes to the same setting", () => {
  const original = { home: { hero: { zoom: 100 } } };
  const edited = { home: { hero: { zoom: 110 } } };
  const latest = { home: { hero: { zoom: 90 } } };
  assert.equal(rebaseEdits(original, edited, latest), EDIT_CONFLICT);
});

test("rebase treats changed arrays as indivisible", () => {
  const original = { tiles: ["a", "b"] };
  const edited = { tiles: ["b", "a"] };
  const latest = { tiles: ["a", "c"] };
  assert.equal(rebaseEdits(original, edited, latest), EDIT_CONFLICT);
});

test("rebase preserves newer unknown settings", () => {
  const original = { title: "A" };
  const edited = { title: "B" };
  const latest = { title: "A", extra: { active: true } };
  assert.deepEqual(rebaseEdits(original, edited, latest), {
    title: "B", extra: { active: true },
  });
});
