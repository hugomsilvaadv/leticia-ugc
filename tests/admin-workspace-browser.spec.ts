import { test, expect } from "@playwright/test";

const password = "qa-only-password-not-for-deploy";

async function unlock(page: import("@playwright/test").Page) {
  await page.getByLabel("Senha do painel", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Validar acesso", exact: true }).click();
  await expect(page.getByText("Senha validada. Você pode salvar alterações.", { exact: false })).toBeVisible();
}

test("admin uses one dropdown and keeps the editor above the save bar on a notebook", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 720 });
  await page.goto("/admin");
  const picker = page.getByRole("combobox", { name: "Selecionar seção do site" });
  await expect(picker).toBeVisible();
  await expect(picker.locator('optgroup[label="Página inicial"] option')).toHaveCount(6);
  await expect(page.locator("nav.adminTabs")).toHaveCount(0);

  await unlock(page);
  await picker.selectOption("hero");
  await expect(page.getByRole("textbox", { name: "Título principal" })).toBeVisible();
  await expect(page.locator(".adminPreviewFrame")).toBeVisible();

  const boundaries = await page.evaluate(() => {
    const rect = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
    const chooser = rect(".adminSectionPicker");
    const info = rect(".adminSectionInfo");
    const controls = rect(".adminControls");
    const save = rect(".adminSaveBar");
    const preview = rect(".adminPreview");
    return { chooserBottom: chooser.bottom, infoBottom: info.bottom,
      controlsTop: controls.top, controlsBottom: controls.bottom,
      controlsHeight: controls.height, saveTop: save.top,
      previewLeft: preview.left, panelRight: rect(".adminPanel").right,
      width: document.documentElement.scrollWidth };
  });
  expect(boundaries.infoBottom).toBeGreaterThan(boundaries.chooserBottom);
  expect(boundaries.controlsTop).toBeGreaterThanOrEqual(boundaries.infoBottom - 1);
  expect(boundaries.controlsHeight).toBeGreaterThan(240);
  expect(boundaries.controlsBottom).toBeLessThanOrEqual(boundaries.saveTop + 2);
  expect(boundaries.previewLeft).toBeGreaterThanOrEqual(boundaries.panelRight - 2);
  expect(boundaries.width).toBeLessThanOrEqual(1367);
  await page.screenshot({ path: test.info().outputPath("admin-new-dropdown-desktop.png") });
});

test("switching sections changes the actual editable fields and iframe preview", async ({ page, request }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/admin");
  await unlock(page);
  const picker = page.getByRole("combobox", { name: "Selecionar seção do site" });
  await picker.selectOption("artigos");
  await expect(page.getByRole("button", { name: "+ Novo artigo" })).toBeVisible();
  await expect(page.locator(".adminPreviewFrame")).toHaveAttribute("src", /editor-preview\/article/);
  await picker.selectOption("layout-materias");
  await expect(page.getByText("Organizar os quadros com o mouse")).toBeVisible();
  await expect(page.locator(".adminPreviewFrame")).toHaveAttribute("src", /editorPreview=1/);
  await picker.selectOption("marca");
  await expect(page.getByRole("textbox", { name: "Nome / marca" })).toBeVisible();
  await picker.selectOption("hero");
  const input = page.getByRole("textbox", { name: "Título principal" });
  const original = await input.inputValue();
  await input.fill(original + " — prévia");
  await expect.poll(async () =>
    await page.frameLocator(".adminPreviewFrame").locator('[data-editor="home.hero.title"]').textContent(),
  ).toContain("— prévia");
  await picker.selectOption("marca");
  await picker.selectOption("hero");
  await expect(input).toHaveValue(original + " — prévia");
  const config = await (await request.get("/api/site-config")).json();
  expect(config.home.hero.title).toBe(original);
  await expect(page.getByText("Há alterações não salvas.", { exact: false })).toBeVisible();
});

test("mobile admin retains reachable editor and real preview below it", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin");
  await unlock(page);
  const picker = page.getByRole("combobox", { name: "Selecionar seção do site" });
  await picker.selectOption("layout-materias");
  const controls = page.locator(".adminControls");
  await expect(controls).toBeVisible();
  expect(await controls.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThan(250);
  await expect(page.getByText("Organizar os quadros com o mouse")).toBeVisible();
  await expect(page.getByRole("button", { name: "Salvar alterações" })).toBeVisible();
  const preview = page.getByRole("complementary", { name: "Prévia do site" });
  await expect(preview).toBeVisible();
  await expect(preview.locator("iframe.adminPreviewFrame")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
  await page.screenshot({ path: test.info().outputPath("admin-new-dropdown-mobile.png"), fullPage: true });
});


test("mobile anonymous visitor cannot confuse empty private data with deleted Linktree or UGC", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin");
  const picker = page.getByRole("combobox", { name: "Selecionar seção do site" });
  await expect(picker).toBeDisabled();
  await expect(page.getByText("Entre para visualizar e editar esta seção")).toBeVisible();
  await expect(page.getByText("Não foi possível carregar o Linktree.", { exact: false })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "+ Adicionar trabalho" })).toHaveCount(0);
  await expect(page.getByText("0 trabalho(s)")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Salvar alterações" })).toBeDisabled();

  await page.getByLabel("Senha do painel", { exact: true }).fill("senha-invalida");
  await page.getByRole("button", { name: "Validar acesso", exact: true }).click();
  await expect(picker).toBeDisabled();
  await expect(page.getByRole("button", { name: "+ Adicionar trabalho" })).toHaveCount(0);

  await unlock(page);
  await expect(picker).toBeEnabled();
  await picker.selectOption("linktree");
  await expect(page.locator(".linktreeEditor")).toBeVisible();
  await expect(page.getByText("Não foi possível carregar o Linktree.", { exact: false })).toHaveCount(0);
  await picker.selectOption("portfolio");
  await expect(page.getByRole("button", { name: "+ Adicionar trabalho" })).toBeVisible();
  const count = await page.locator(".articleAdminHeader span").first().textContent();
  expect(count).toContain("trabalho(s)");

  // Changing or clearing the validated credential locks the private editor again.
  await page.getByLabel("Senha do painel", { exact: true }).fill("");
  await expect(picker).toBeDisabled();
  await expect(page.getByRole("button", { name: "+ Adicionar trabalho" })).toHaveCount(0);
  await expect(page.getByText("Entre para visualizar e editar esta seção")).toBeVisible();
  await expect(page.getByRole("button", { name: "Salvar alterações" })).toBeDisabled();
});

test("mobile in-app sized header remains accessible without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 650 });
  await page.goto("/admin");
  await expect(page.locator(".adminTop h1")).toHaveText("Blog da Letícia");
  const top = await page.locator(".adminTop").evaluate((el) => getComputedStyle(el).position);
  expect(top).toBe("sticky");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
});
