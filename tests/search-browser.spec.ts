import { test, expect } from "@playwright/test";
import type { ArticleRecord } from "../lib/article-store";

const auth = { "x-admin-password": "qa-only-password-not-for-deploy" };
let originals: ArticleRecord[];
const publishedSlug = "qa-search-orquidea";
const privateTokens = ["qa-search-private", "Segredovedado", "rascunhovedado"];

// Only the QA server's temporary data is changed; preserve its current records.
test.beforeAll(async ({ request }) => {
  const response = await request.get("/api/articles", { headers: auth });
  expect(response.ok()).toBe(true);
  originals = await response.json();
  expect(originals.length).toBeGreaterThan(0);
  const published = {
    ...originals[0],
    slug: publishedSlug,
    title: "Orquídea editorial",
    dek: "Brumaclara na composição",
    category: "Achados",
    body: "Uma leitura sobre tramacobre.",
    published: true,
  };
  const save = await request.put("/api/articles", {
    headers: { ...auth, "if-match": response.headers().etag },
    data: [
      ...originals,
      published,
      {
        ...published,
        slug: privateTokens[0],
        title: privateTokens[1],
        body: `brumaclara ${privateTokens[2]}`,
        published: false,
      },
    ],
  });
  expect(save.status()).toBe(200);
});

test.afterAll(async ({ request }) => {
  if (!originals) return;
  const latest = await request.get("/api/articles", { headers: auth });
  const restored = await request.put("/api/articles", {
    headers: { ...auth, "if-match": latest.headers().etag },
    data: originals,
  });
  expect(restored.status()).toBe(200);
});

for (const width of [320, 390, 1440]) {
  test(`search retains immediate menu input and supports repeated submissions at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.getByRole("button", { name: "Abrir menu de navegação" }).click();
    await page.getByRole("dialog", { name: "Menu de navegação" })
      .getByRole("link", { name: "Buscar", exact: true }).click();
    // The page stays inert while the modal finishes closing. Playwright's fill
    // can otherwise report success even though the browser rejects focus.
    await expect(page.getByRole("dialog", { name: "Menu de navegação" })).not.toBeVisible();
    // No networkidle wait: start typing as soon as navigation is usable.
    const input = page.getByRole("searchbox", { name: "Buscar nas matérias" });
    await input.fill("ACESSORIOS");
    await page.getByRole("button", { name: "Pesquisar", exact: true }).click();
    await expect(page).toHaveURL(/\/busca\?q=ACESSORIOS$/);
    await expect(input).toHaveValue("ACESSORIOS");
    await expect(page.locator('.articleGrid a[href="/artigos/acessorios-que-mudam-o-look"]').first()).toBeVisible();

    await input.fill("orquidea");
    await input.press("Enter");
    await expect(page).toHaveURL(/\/busca\?q=orquidea$/);
    await expect(input).toHaveValue("orquidea");
    await expect(page.getByRole("heading", { name: "1 matéria encontrada", exact: true })).toBeVisible();
    await expect(page.locator(`.articleGrid a[href="/artigos/${publishedSlug}"]`).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });

  test(`search matches title, dek, category and body and excludes nonmatches at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const query of ["ORQUIDEA", "brumaclara", "Achados", "tramacobre", "orquidea tramacobre"]) {
      await page.goto(`/busca?q=${encodeURIComponent(query)}`);
      await expect(page.getByRole("searchbox", { name: "Buscar nas matérias" })).toHaveValue(query);
      await expect(page.locator(`.articleGrid a[href="/artigos/${publishedSlug}"]`).first(), query).toBeVisible();
      await expect(page.locator(`.articleGrid a[href="/artigos/${privateTokens[0]}"]`)).toHaveCount(0);
    }
    await page.goto("/busca?q=orquidea+inexistente");
    await expect(page.getByText("Nenhuma matéria encontrada", { exact: false })).toBeVisible();
    await expect(page.locator(".articleGrid")).toHaveCount(0);
    await page.goto("/busca?q=%20%20%20");
    await expect(page.getByText("Comece com uma palavra-chave", { exact: false })).toBeVisible();
    await expect(page.locator(".articleGrid")).toHaveCount(0);
  });
}

test("search excludes unpublished data from both HTML and Flight payloads", async ({ request }) => {
  const requestHeaders: Record<string, string>[] = [{}, { RSC: "1" }];
  for (const headers of requestHeaders) {
    const response = await request.get("/busca?q=brumaclara", { headers });
    expect(response.status()).toBe(200);
    if ("RSC" in headers) expect(response.headers()["content-type"]).toContain("text/x-component");
    const body = await response.text();
    expect(body).toContain(publishedSlug);
    for (const token of privateTokens) expect(body).not.toContain(token);
  }
});
