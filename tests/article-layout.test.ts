import assert from "node:assert/strict";
import test from "node:test";
import { normalizeArticleLayout } from "../lib/site-config";
import { arrangeArticleTiles, moveArticleTile } from "../lib/article-layout";

test("missing older homepage layout normalizes to empty sections without data migration", () => {
  assert.deepEqual(normalizeArticleLayout(undefined), {
    destaques: [], moda: [], arquivo: [],
  });
});

test("tile layout rejects untrusted slugs, duplicate entries and extreme dimensions", () => {
  const result = normalizeArticleLayout({
    destaques: [{ slug: "capa-1", columns: 9, height: -100 }],
    moda: [
      { slug: "artigo-a", columns: 4, height: 10000 },
      { slug: "artigo-a", columns: 1, height: 200 },
      { slug: "../../invalid", columns: 1, height: 300 },
      { slug: "artigo-b", columns: 2, height: 367 },
    ],
    arquivo: "invalid section",
  });
  assert.deepEqual(result, {
    destaques: [{ slug: "capa-1", columns: 2, height: 180 }],
    moda: [
      { slug: "artigo-a", columns: 3, height: 640 },
      { slug: "artigo-b", columns: 2, height: 370 },
    ],
    arquivo: [],
  });
});

test("editor rearranges only visible article cards, never rewrites article records", () => {
  const articles = [{ slug: "a", title: "Um" }, { slug: "b", title: "Dois" }, { slug: "c", title: "Três" }];
  const layout = [{ slug: "b", columns: 2, height: 400 }, { slug: "a", columns: 1, height: 220 }];
  const ordered = arrangeArticleTiles(articles, layout);
  assert.deepEqual(ordered.map((x) => x.article.slug), ["b", "a", "c"]);
  assert.equal(ordered[0].columns, 2);
  assert.deepEqual(articles.map((x) => x.title), ["Um", "Dois", "Três"]);
  assert.deepEqual(moveArticleTile(layout, "a", "b").map((x) => x.slug), ["a", "b"]);
});
