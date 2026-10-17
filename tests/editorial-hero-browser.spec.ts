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
    await page.getByRole("button", { name: "Destaque da capa", exact: true }).click();
    await expect(page.getByLabel("Foto ou vídeo de abertura (MP4/WebM, até 30 MB) — enviar arquivo")).toBeVisible();
    await expect(page.getByText("A abertura editorial usa automaticamente um MP4/WebM", { exact: false })).toBeVisible();
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
      };
    });
    expect(positions.headerBg).toBe("rgba(0, 0, 0, 0)");
    expect(positions.brandPosition).toBe("absolute");
    expect(positions.brandColor).toBe("rgb(255, 253, 248)");
    expect(positions.brandTop).toBeGreaterThan(positions.coverTop);
    expect(positions.brandBottom).toBeLessThan(positions.coverBottom);
    expect(Math.abs(positions.brandCenter - width / 2)).toBeLessThan(28);
    const menu = page.getByRole("button", { name: "Abrir menu de navegação" });
    await menu.click();
    await expect(page.getByRole("dialog", { name: "Menu de navegação" })).toBeVisible();
    await page.getByRole("button", { name: "Fechar menu" }).click();
  }
});
