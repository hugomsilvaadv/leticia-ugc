import test from "node:test";
import assert from "node:assert/strict";
import { searchPublishedArticles, normalizeSearchText } from "../lib/editorial-search";
import type { ArticleRecord } from "../lib/article-store";

const article = (overrides: Partial<ArticleRecord>): ArticleRecord =>
  ({
    slug: "artigo",
    title: "Acessórios que transformam",
    dek: "Estilo e textura",
    category: "Moda",
    body: "Uma matéria sobre composição e tendências.",
    published: true,
    publishedAt: "2026-10-01",
    readTime: "4 min",
    hero: { url: "", positionX: 50, positionY: 50, zoom: 100, opacity: 100, fit: "cover" },
    sectionMedia: {},
    ...overrides,
  }) as ArticleRecord;

test("ignores accents and case for an editorial search", () => {
  assert.equal(normalizeSearchText("  ACESSÓRIOS  de MODA  "), "acessorios de moda");
  assert.equal(searchPublishedArticles([article({})], "acessorios").length, 1);
});

test("searches across fields and requires all terms", () => {
  const records = [article({}), article({ slug: "beleza", title: "Maquiagem", category: "Beleza" })];
  assert.deepEqual(searchPublishedArticles(records, "acessorios tendências").map((a) => a.slug), ["artigo"]);
  assert.equal(searchPublishedArticles(records, "acessorios inexistente").length, 0);
});

test("never returns unpublished content, even with an exact title match", () => {
  const records = [
    article({ slug: "rascunho", title: "Segredo", published: false }),
    article({ slug: "publicado", title: "Segredo", published: true }),
  ];
  assert.deepEqual(searchPublishedArticles(records, "segredo").map((a) => a.slug), ["publicado"]);
});

test("ranks title matches above matches found only in article text", () => {
  const results = searchPublishedArticles(
    [
      article({ slug: "body", title: "Outro título", body: "Acessórios" }),
      article({ slug: "title", title: "Acessórios únicos", body: "" }),
    ],
    "acessorios",
  );
  assert.deepEqual(results.map((a) => a.slug), ["title", "body"]);
});

test("empty query does not expose the archive and query length is bounded", () => {
  assert.deepEqual(searchPublishedArticles([article({})], "   "), []);
  assert.deepEqual(searchPublishedArticles([article({})], "a".repeat(500)), []);
});
