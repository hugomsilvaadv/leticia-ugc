import { test, expect } from "@playwright/test";

const password = "qa-only-password-not-for-deploy";
const auth = { "x-admin-password": password };

test("authenticated visual layout editor reorders and resizes homepage article cards", async ({ page, request }) => {
  const before = await request.get("/api/site-config");
  expect(before.ok()).toBe(true);
  const original = await before.json();
  try {
    await page.goto("/admin");
    await page.getByLabel("Senha do painel", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Validar acesso", exact: true }).click();
    await expect(page.getByText("Senha validada. Você pode salvar alterações.", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Layout das matérias", exact: true }).click();

    const grid = page.locator('[data-layout-builder="moda"]');
    const tiles = grid.locator("[data-layout-tile]");
    await expect(tiles).toHaveCount(3);
    const originalOrder = await tiles.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-layout-tile")));
    await tiles.nth(1).dragTo(tiles.nth(0));
    await expect(grid.locator("[data-layout-tile]").first()).toHaveAttribute("data-layout-tile", originalOrder[1]!);

    const resize = grid.locator('.layoutBuilderTile[data-layout-tile="' + originalOrder[1] + '"] .layoutBuilderResize');
    await resize.focus();
    await resize.press("ArrowRight");
    await resize.press("ArrowDown");

    const preview = page.frameLocator(".adminPreviewFrame");
    const previewGrid = preview.locator('[data-layout-section="moda"]');
    await expect.poll(() => previewGrid.locator("[data-layout-slug]").first().getAttribute("data-layout-slug"))
      .toBe(originalOrder[1]);
    const first = previewGrid.locator("[data-layout-slug]").first();
    await expect(first).toHaveAttribute("data-custom-size", "1");
    await expect.poll(() => first.evaluate((node) => (node as HTMLElement).style.gridColumn)).toBe("span 2");
    await expect.poll(() => first.evaluate((node) => (node as HTMLElement).style.getPropertyValue("--tile-height"))).toBe("330px");
    await expect(page.getByText("Há alterações não salvas.", { exact: false })).toBeVisible();

    await page.getByRole("button", { name: "Salvar alterações", exact: true }).click();
    await expect(page.getByText("Alterações salvas. Páginas e aparência.", { exact: false })).toBeVisible();
    const saved = await (await request.get("/api/site-config")).json();
    expect(saved.home.articleLayout.moda[0].slug).toBe(originalOrder[1]);
    expect(saved.home.articleLayout.moda[0].columns).toBe(2);
    expect(saved.home.articleLayout.moda[0].height).toBe(330);

    await page.goto("/");
    const published = page.locator('[data-layout-section="moda"] [data-layout-slug]');
    await expect(published.first()).toHaveAttribute("data-layout-slug", originalOrder[1]!);
    await expect(published.first()).toHaveAttribute("data-custom-size", "1");
  } finally {
    const latest = await request.get("/api/site-config");
    const response = await request.put("/api/site-config", {
      headers: { ...auth, "if-match": latest.headers().etag },
      data: original,
    });
    expect(response.status()).toBe(200);
  }
});

test("layout cards can be restored without affecting published article data", async ({ page, request }) => {
  const initial = await request.get("/api/articles", { headers: auth });
  const contents = await initial.text();
  await page.goto("/admin");
  await page.getByLabel("Senha do painel", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Validar acesso", exact: true }).click();
  await expect(page.getByText("Senha validada. Você pode salvar alterações.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Layout das matérias", exact: true }).click();
  const section = page.locator('.layoutBuilderSection[aria-label="moda"]');
  // The visible section is identified by its public label, not an article's content.
  const moda = page.locator('.layoutBuilderSection[aria-label="Editoria Moda"]');
  const initialTiles = await moda.locator("[data-layout-tile]").count();
  expect(initialTiles).toBe(3);
  await expect(moda.getByRole("button", { name: "Restaurar" })).toBeDisabled();
  expect(await (await request.get("/api/articles", { headers: auth })).text()).toBe(contents);
});
