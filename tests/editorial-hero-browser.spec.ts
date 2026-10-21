import { test, expect } from "@playwright/test";

const password = "qa-only-password-not-for-deploy";
const auth = { "x-admin-password": password };

test("editorial homepage keeps saved copy, article CTA and sections at all sizes", async ({ page, request }) => {
  const original = await (await request.get("/api/site-config")).json();
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect((await page.goto("/"))?.status()).toBe(200);
    const hero = page.locator("main.homeEditorial .leadMain");
    await expect(hero).toBeVisible();
    await expect(hero.locator(".heroPhotoFrame")).toBeVisible();
    await expect(hero.locator("[data-editor='home.hero.title']")).toContainText(original.home.hero.title);
    await expect(hero.locator("[data-editor='home.hero.dek']")).toContainText(original.home.hero.dek);
    await expect(hero.locator("[data-editor='home.hero.buttonText']")).toContainText(original.home.hero.buttonText);
    await expect(page.locator(".leadSide .card")).toHaveCount(2);
    await expect(page.locator(".newsletterSignup")).toBeVisible();
    const widthAudit = await page.evaluate(() => ({
      viewport: innerWidth,
      scroll: document.documentElement.scrollWidth,
      offenders: [...document.querySelectorAll<HTMLElement>("body *")]
        .filter(node => node.getBoundingClientRect().right > innerWidth + 1)
        .slice(0, 15)
        .map(node => ({
          tag: node.tagName,
          className: typeof node.className === "string" ? node.className.slice(0, 110) : "",
          parent: node.parentElement?.className,
          text: node.textContent?.trim().slice(0, 80),
          left: Math.round(node.getBoundingClientRect().left),
          right: Math.round(node.getBoundingClientRect().right),
        })),
    }));
    if (widthAudit.scroll > widthAudit.viewport + 1) console.log("editorial-mobile-overflow", JSON.stringify(widthAudit));
    expect(widthAudit.scroll <= widthAudit.viewport + 1).toBe(true);
    if (width === 390 || width === 1440) {
      await page.screenshot({ path: test.info().outputPath(`byleticia-refero-${width}px.png`), fullPage: true });
    }
  }
});

test("admin-selected MP4 activates background video; reduced-motion keeps the poster", async ({ page, request }) => {
  const initial = await request.get("/api/site-config");
  expect(initial.ok()).toBe(true);
  const original = await initial.json();
  const modified = {
    ...original,
    home: {
      ...original.home,
      hero: {
        ...original.home.hero,
        media: { ...original.home.hero.media, url: "/api/media/qa-cinematic.mp4", poster: "/images/leticia-hero.jpg" },
      },
    },
  };
  try {
    const saved = await request.put("/api/site-config", {
      headers: { ...auth, "if-match": initial.headers().etag },
      data: modified,
    });
    expect(saved.status()).toBe(200);
    await page.route("**/api/media/qa-cinematic.mp4", route =>
      route.fulfill({ status: 200, contentType: "video/mp4", body: Buffer.alloc(0) }),
    );
    await page.goto("/");
    const holder = page.locator('[data-editor-media="home.hero.media"]');
    await expect(holder.locator("img.cinematicStill")).toBeVisible();
    await expect(holder.locator("video.cinematicVideo")).toHaveCount(1);
    expect(await holder.locator("video").evaluate(e => {
      const video = e as HTMLVideoElement;
      return video.autoplay && video.muted && video.loop && video.playsInline && !video.controls;
    })).toBe(true);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(holder.locator("video.cinematicVideo")).toHaveCount(0);
    await expect(holder.locator("img.cinematicStill")).toBeVisible();
    await page.goto("/admin");
    await page.getByLabel("Senha do painel", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Validar acesso", exact: true }).click();
    await expect(page.getByText("Senha validada. Você pode salvar alterações.", { exact: false })).toBeVisible();
    await page.getByRole("combobox", { name: "Selecionar seção do site" }).selectOption("hero");
    await expect(page.getByLabel("Foto ou vídeo de abertura (MP4/WebM, até 30 MB) — enviar arquivo")).toBeVisible();
    await expect(page.getByText("Fundo da página inicial — independente da matéria:", { exact: false })).toBeVisible();
  } finally {
    const latest = await request.get("/api/site-config");
    const restored = await request.put("/api/site-config", {
      headers: { ...auth, "if-match": latest.headers().etag },
      data: original,
    });
    expect(restored.status()).toBe(200);
  }
});

test("approved luxury option B places the editable brand on the cover without a white band", async ({ page, request }) => {
  const config = await (await request.get("/api/site-config")).json();
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const wordmark = page.locator("header .wordmark");
    await expect(wordmark).toHaveText(config.brand.wordmark);
    await expect(wordmark).toBeVisible();
    const positions = await page.evaluate(() => {
      const header = document.querySelector("body > header") as HTMLElement;
      const brand = document.querySelector("header .wordmark") as HTMLElement;
      const hero = document.querySelector("main.homeEditorial .leadMain") as HTMLElement;
      const name = brand.getBoundingClientRect();
      const cover = hero.getBoundingClientRect();
      return {
        brandTop: name.top,
        brandBottom: name.bottom,
        brandCenter: (name.left + name.right) / 2,
        coverTop: cover.top,
        coverBottom: cover.bottom,
        headerBg: getComputedStyle(header).backgroundColor,
        brandColor: getComputedStyle(brand).color,
        brandPosition: getComputedStyle(brand).position,
        storyTop: (document.querySelector(".homeEditorial .leadCopy") as HTMLElement).getBoundingClientRect().top,
        storyLeft: (document.querySelector(".homeEditorial .leadCopy") as HTMLElement).getBoundingClientRect().left,
      };
    });
    expect(positions.headerBg).toBe("rgba(0, 0, 0, 0)");
    expect(positions.brandPosition).toBe("absolute");
    expect(positions.brandColor).toBe("rgb(255, 253, 248)");
    expect(positions.brandTop).toBeGreaterThan(positions.coverTop);
    expect(positions.brandBottom).toBeLessThan(positions.coverBottom);
    expect(Math.abs(positions.brandCenter - width / 2)).toBeLessThan(28);
    expect(positions.brandBottom + 20).toBeLessThan(positions.storyTop);
    expect(positions.storyLeft).toBeLessThan(width * .14);
    const menu = page.getByRole("button", { name: "Abrir menu de navegação" });
    await menu.click();
    await expect(page.getByRole("dialog", { name: "Menu de navegação" })).toBeVisible();
    await page.getByRole("button", { name: "Fechar menu" }).click();
  }
});

test("hero background is independent of linked article photography and editorial link opens article", async ({ page, request }) => {
  const initial = await request.get("/api/site-config");
  const original = await initial.json();
  const articles = await (await request.get("/api/articles", { headers: auth })).json();
  const lead = articles.find((a: any) => a.published && a.slug === original.home.hero.featuredSlug)
    ?? articles.find((a: any) => a.published);
  expect(lead).toBeTruthy();
  const withoutCover = {
    ...original,
    home: {
      ...original.home,
      hero: {
        ...original.home.hero,
        media: { ...original.home.hero.media, url: "" },
      },
    },
  };
  try {
    const changed = await request.put("/api/site-config", {
      headers: { ...auth, "if-match": initial.headers().etag },
      data: withoutCover,
    });
    expect(changed.status()).toBe(200);
    await page.goto("/");
    const banner = page.locator('main.homeEditorial [data-editor-media="home.hero.media"] img');
    await expect(banner).toHaveAttribute("src", "/images/leticia-hero.jpg");
    const link = page.locator("main.homeEditorial .leadCopy h1 a");
    await expect(link).toHaveText(original.home.hero.title);
    await expect(link).toHaveAttribute("href", "/artigos/" + lead.slug);
    await link.click();
    await expect(page.locator("main.article h1")).toHaveText(lead.title);
    if (lead.hero.url && /\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(lead.hero.url)) {
      await expect(page.locator("main.article .mediaVisual img")).toHaveAttribute("src", lead.hero.url);
    }
    // The administrator can independently select another campaign background,
    // while the linked article retains its own image and text.
  } finally {
    const now = await request.get("/api/site-config");
    const saved = await request.put("/api/site-config", {
      headers: { ...auth, "if-match": now.headers().etag },
      data: original,
    });
    expect(saved.status()).toBe(200);
  }
});


test("responsive hero editor previews independent mobile copy, cropping and gradient", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/admin");
  await page.getByLabel("Senha do painel", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Validar acesso", exact: true }).click();
  await expect(page.getByText("Senha validada. Você pode salvar alterações.", { exact: false })).toBeVisible();
  await page.getByRole("combobox", { name: "Selecionar seção do site" }).selectOption("hero");
  await page.getByRole("button", { name: "Celular", exact: true }).click();

  await page.getByLabel("Título principal — cor do texto").fill("#ffcc00");
  const mobileTitle = page.frameLocator("iframe.adminPreviewFrame").locator('[data-editor="home.hero.title"]');
  await expect.poll(async () => mobileTitle.evaluate(el => getComputedStyle(el).color)).toBe("rgb(255, 204, 0)");

  await page.getByLabel("Enquadramento no celular").selectOption("cover");
  await expect.poll(async () => page.frameLocator("iframe.adminPreviewFrame")
    .locator('[data-editor-media="home.hero.media"]').getAttribute("data-mobile-crop")).toBe("1");
  const mobileCover = page.frameLocator("iframe.adminPreviewFrame").locator('.heroPhotoFrame > img.sharedMedia');
  await expect.poll(async () => mobileCover.evaluate(el => getComputedStyle(el).objectFit)).toBe("cover");

  await page.getByLabel("Intensidade do degradê").fill("60");
  await expect.poll(async () => page.frameLocator("iframe.adminPreviewFrame").locator(".leadMain")
    .evaluate(el => getComputedStyle(el, "::after").opacity)).toBe("0.6");

  await page.getByRole("button", { name: "Desktop", exact: true }).click();
  const desktopTitle = page.frameLocator("iframe.adminPreviewFrame").locator('[data-editor="home.hero.title"]');
  await expect.poll(async () => desktopTitle.evaluate(el => getComputedStyle(el).color))
    .not.toBe("rgb(255, 204, 0)");
  await expect(page.getByText("Há alterações não salvas.", { exact: false })).toBeVisible();
});

test("mobile hero media crop does not overwrite desktop zoom", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/admin");
  await page.getByLabel("Senha do painel", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Validar acesso", exact: true }).click();
  await expect(page.getByText("Senha validada. Você pode salvar alterações.", { exact: false })).toBeVisible();
  await page.getByRole("combobox", { name: "Selecionar seção do site" }).selectOption("hero");
  await page.getByLabel("Enquadramento no celular").selectOption("cover");
  const editor = page.frameLocator("iframe.adminPreviewFrame").locator('[data-editor-media="home.hero.media"]');
  await expect.poll(async () => editor.getAttribute("data-mobile-crop")).toBe("1");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByText("Alterações salvas.", { exact: false })).toBeVisible();
});
