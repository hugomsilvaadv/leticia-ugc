import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
import path from "node:path";
const password = "qa-only-password-not-for-deploy";
const auth = { "x-admin-password": password };
const evidence = path.resolve(
  process.env.EVIDENCE_DIR || "test-results/evidence",
);
async function unlockAdmin(page: Page) {
  await page.getByLabel("Senha do painel", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Validar acesso", exact: true })
    .click();
  await expect(
    page.getByText("Senha validada. Você pode salvar alterações.", {
      exact: false,
    }),
  ).toBeVisible();
}
test.describe.configure({ mode: "default" });

for (const width of [320, 375, 390, 430, 768, 1024, 1440])
  test(`responsive pages and complete photographs at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/",
      "/moda",
      "/ugc",
      "/sobre",
      "/artigos/camadas-sem-excesso",
      "/linktree",
      "/admin",
    ]) {
      const r = await page.goto(route);
      expect(r?.status(), route).toBe(200);
      await page.waitForLoadState("networkidle");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        route + " " + width,
      ).toBe(true);
      if (width <= 768 && route != "/admin") {
        const imgs = page.locator(
          ".mediaVisual>img,.heroPhotoFrame>img,.articleAccessoryImage>img,.portfolioMedia>img",
        );
        for (const image of await imgs.all()) {
          const metrics = await image.evaluate((img: HTMLImageElement) => ({
            transform: getComputedStyle(img).transform,
            ratio:
              img.getBoundingClientRect().width /
              img.getBoundingClientRect().height,
            natural: img.naturalWidth / img.naturalHeight,
            loaded: img.complete && img.naturalWidth > 0,
          }));
          // Lazy images are checked after scrolling them into view.
          if (!metrics.loaded) {
            await image.scrollIntoViewIfNeeded();
            await expect
              .poll(() =>
                image.evaluate(
                  (i: HTMLImageElement) => i.complete && i.naturalWidth > 0,
                ),
              )
              .toBe(true);
          }
          const ratio = await image.evaluate((i: HTMLImageElement) => ({
            rendered:
              i.getBoundingClientRect().width /
              i.getBoundingClientRect().height,
            native: i.naturalWidth / i.naturalHeight,
          }));
          expect(ratio.rendered).toBeCloseTo(ratio.native, 1);
          expect(metrics.transform).toBe("none");
        }
      }
    }
  });
test("menu animates open/close, traps focus, closes with Escape and restores focus", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".masthead > .signature")).toHaveCount(0);
  const toggle = page.getByRole("button", { name: "Abrir menu de navegação" });
  await toggle.click();
  const dialog = page.getByRole("dialog", { name: "Menu de navegação" });
  await expect(dialog).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  expect(
    await dialog.evaluate((d) => getComputedStyle(d).transitionDuration),
  ).not.toBe("0s");
  await dialog.getByRole("link", { name: "Linktree", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("button", { name: "Fechar menu" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await expect(dialog).not.toBeVisible();
  await toggle.click();
  await dialog.getByRole("button", { name: "Fechar menu" }).click();
  await expect(toggle).toBeFocused();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await toggle.click();
  expect(
    await dialog.evaluate((d) => getComputedStyle(d).transitionDuration),
  ).toBe("0s");
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
});
test("unauthenticated mutations and media library are denied; invalid payloads do not replace records", async ({
  request,
}) => {
  for (const name of ["site-config", "articles", "portfolio", "linktree"]) {
    const before = await request.get("/api/" + name);
    const bytes = await before.text();
    expect((await request.put("/api/" + name, { data: {} })).status()).toBe(
      401,
    );
    expect(
      (
        await request.put("/api/" + name, { headers: auth, data: null })
      ).status(),
    ).toBe(400);
    expect(await (await request.get("/api/" + name)).text()).toBe(bytes);
  }
  expect((await request.get("/api/media")).status()).toBe(401);
  expect((await request.post("/api/upload")).status()).toBe(401);
  expect(
    (
      await request.put("/api/site-config", {
        headers: auth,
        data: { home: null },
      })
    ).status(),
  ).toBe(400);
});
test("upload, article save, API and public card use the same real photograph without altering bytes", async ({
  request,
  page,
}) => {
  const bytes = await fs.readFile("public/images/leticia-hero.jpg");
  const upload = await request.post("/api/upload", {
    headers: auth,
    multipart: {
      file: { name: "original.jpg", mimeType: "image/jpeg", buffer: bytes },
    },
  });
  expect(upload.status()).toBe(200);
  const { url } = await upload.json();
  expect(Buffer.from(await (await request.get(url)).body())).toEqual(bytes);
  const before = await request.get("/api/articles", { headers: auth });
  const articles = await before.json();
  articles[0].hero.url = url;
  const save = await request.put("/api/articles", {
    headers: { ...auth, "if-match": before.headers().etag },
    data: articles,
  });
  expect(save.status()).toBe(200);
  expect(
    (
      await request.put("/api/articles", {
        headers: { ...auth, "if-match": before.headers().etag },
        data: articles,
      })
    ).status(),
  ).toBe(409);
  await page.goto("/moda");
  await expect(page.locator(`.card img[src="${url}"]`)).toBeVisible();
  const range = await request.get(url, { headers: { Range: "bytes=0-3" } });
  expect(range.status()).toBe(206);
  expect(Buffer.from(await range.body())).toEqual(bytes.subarray(0, 4));
  expect(
    (
      await request.get(url, { headers: { Range: "bytes=999999999-" } })
    ).status(),
  ).toBe(416);
  expect(
    (
      await request.post("/api/upload", {
        headers: auth,
        multipart: {
          file: {
            name: "fake.jpg",
            mimeType: "image/jpeg",
            buffer: Buffer.from("<script>alert(1)</script>"),
          },
        },
      })
    ).status(),
  ).toBe(415);
});
test("admin saves only changed collection and retains unsaved changes when save fails", async ({
  page,
  request,
}) => {
  await page.goto("/admin");
  await expect(
    page.getByText("Informe a senha para editar.", { exact: false }),
  ).toBeVisible();
  await unlockAdmin(page);
  await expect(
    page.getByText("Senha validada. Você pode salvar alterações."),
  ).toBeVisible();
  const puts: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "PUT") puts.push(new URL(r.url()).pathname);
  });
  await page
    .getByRole("button", { name: "Destaque da capa", exact: true })
    .click();
  const title = page.getByRole("textbox", {
    name: "Título principal",
    exact: true,
  });
  const original = await title.inputValue();
  await title.fill(original + " — teste de edição");
  await page.route("**/api/site-config", async (route) => {
    if (route.request().method() === "PUT") await route.abort("failed");
    else await route.continue();
  });
  await page
    .getByRole("button", { name: "Salvar alterações", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Salvar alterações", exact: true }),
  ).toBeEnabled();
  await expect(title).toHaveValue(original + " — teste de edição");
  await expect(
    page.getByText("Há alterações não salvas.", { exact: false }),
  ).toBeVisible();
  await page.unroute("**/api/site-config");
  await page
    .getByRole("button", { name: "Salvar alterações", exact: true })
    .click();
  await expect(
    page.getByText("Alterações salvas. Páginas e aparência.", { exact: false }),
  ).toBeVisible();
  expect(puts.every((p) => p === "/api/site-config")).toBe(true);
  expect(
    (await (await request.get("/api/site-config")).json()).home.hero.title,
  ).toBe(original + " — teste de edição");
  await title.fill(original);
  await page
    .getByRole("button", { name: "Salvar alterações", exact: true })
    .click();
});
test("Linktree native editor updates, reorders, disables and persists links independently", async ({
  page,
  request,
}) => {
  const originalResponse = await request.get("/api/linktree", {
    headers: auth,
  });
  const originalConfig = await originalResponse.json();
  await page.goto("/admin");
  await expect(
    page.getByRole("button", { name: "Perfil, links e vídeos" }),
  ).toBeVisible();
  await unlockAdmin(page);
  await page.getByRole("button", { name: "Perfil, links e vídeos" }).click();
  const section = page
    .locator(".linktreeEditor section")
    .filter({ has: page.getByText("Linktree → Links", { exact: true }) });
  await section.locator("summary").first().click();
  await section
    .getByLabel("Texto do link", { exact: true })
    .first()
    .fill("Portfólio editado em teste");
  await section.getByRole("button", { name: "↓ Descer" }).first().click();
  await page
    .getByRole("button", { name: "Salvar alterações", exact: true })
    .click();
  await expect(
    page.getByText("Alterações salvas. Linktree.", { exact: false }),
  ).toBeVisible();
  const config = await (
    await request.get("/api/linktree", { headers: auth })
  ).json();
  expect(config.links[1].id).toBe("portfolio");
  expect(config.texts.heroButtonPortfolio.text).toBe(
    "Portfólio editado em teste",
  );
  await page.goto("/linktree");
  await expect(page.locator(".linktreeLinks a").nth(1)).toHaveText(
    "Portfólio editado em teste↗",
  );
  expect(await page.locator("iframe").count()).toBe(0);
  config.links[1].enabled = false;
  const r = await request.get("/api/linktree", { headers: auth });
  expect(
    (
      await request.put("/api/linktree", {
        headers: { ...auth, "if-match": r.headers().etag },
        data: config,
      })
    ).status(),
  ).toBe(200);
  await page.reload();
  await expect(
    page.getByText("Portfólio editado em teste", { exact: true }),
  ).toHaveCount(0);
  const latest = await request.get("/api/linktree", { headers: auth });
  await request.put("/api/linktree", {
    headers: { ...auth, "if-match": latest.headers().etag },
    data: originalConfig,
  });
});
test("YouTube and Vimeo registration renders responsive lazy embeds and video poster", async ({
  request,
  page,
}) => {
  const response = await request.get("/api/portfolio", { headers: auth });
  const items = await response.json();
  items.push({
    id: "qa-youtube",
    title: "Vídeo de teste",
    description: "",
    type: "Vídeo",
    published: true,
    media: {
      url: "https://youtube.com/shorts/abcdefghijk",
      fit: "contain",
      positionX: 50,
      positionY: 0,
      zoom: 100,
      opacity: 100,
      poster: "/images/leticia-hero.jpg",
    },
  });
  items.push({
    id: "qa-vimeo",
    title: "Vídeo Vimeo de teste",
    description: "",
    type: "Vídeo",
    published: true,
    media: {
      url: "https://vimeo.com/12345",
      fit: "contain",
      positionX: 50,
      positionY: 0,
      zoom: 100,
      opacity: 100,
      poster: "/images/leticia-hero.jpg",
    },
  });
  expect(
    (
      await request.put("/api/portfolio", {
        headers: { ...auth, "if-match": response.headers().etag },
        data: items,
      })
    ).status(),
  ).toBe(200);
  await page.route("https://player.vimeo.com/**", (route) =>
    route.fulfill({
      body: "<html><body>Provider fixture</body></html>",
      contentType: "text/html",
    }),
  );
  await page.route("https://www.youtube-nocookie.com/**", (route) =>
    route.fulfill({
      body: "<html><body>Provider fixture</body></html>",
      contentType: "text/html",
    }),
  );
  await page.goto("/ugc");
  await expect(
    page.getByRole("button", { name: "Abrir player: Vídeo de teste" }),
  ).toBeVisible();
  await expect(
    page.locator(
      'iframe[src="https://www.youtube-nocookie.com/embed/abcdefghijk"]',
    ),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Abrir player: Vídeo de teste" })
    .click();
  await expect(
    page.locator(
      'iframe[src="https://www.youtube-nocookie.com/embed/abcdefghijk"]',
    ),
  ).toHaveAttribute("loading", "lazy");
  await page
    .getByRole("button", { name: "Abrir player: Vídeo Vimeo de teste" })
    .click();
  await expect(
    page.locator('iframe[src="https://player.vimeo.com/video/12345"]'),
  ).toHaveAttribute("loading", "lazy");
});
test("metadata, sitemap, robots and structured data preserve editorial titles", async ({
  request,
  page,
}) => {
  await page.goto("/artigos/camadas-sem-excesso");
  expect(await page.title()).toContain("Camadas sem excesso");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://byleticia.com.br/artigos/camadas-sem-excesso",
  );
  const schema = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ||
      "{}",
  );
  expect(schema.headline).toBe(
    "Camadas sem excesso: um guia visual para a meia-estação",
  );
  expect(await (await request.get("/sitemap.xml")).text()).toContain(
    "/artigos/camadas-sem-excesso",
  );
  expect(await (await request.get("/robots.txt")).text()).toContain(
    "Disallow: /admin",
  );
});
test("public pages and admin pass WCAG 2 A/AA automated checks; capture desktop/mobile evidence", async ({
  page,
}) => {
  await fs.mkdir(evidence, { recursive: true });
  const failures: unknown[] = [];
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [route, name] of [
      ["/", "home"],
      ["/linktree", "linktree"],
      ["/admin", "admin"],
    ]) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      for (const image of await page.locator("img").all()) {
        if (await image.isVisible()) {
          await image.scrollIntoViewIfNeeded();
          await expect
            .poll(() =>
              image.evaluate(
                (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
              ),
            )
            .toBe(true);
        }
      }
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({
        path: path.join(evidence, `after-${name}-${width}.png`),
        fullPage: true,
      });
      await page.screenshot({
        path: path.join(evidence, `after-${name}-${width}-viewport.png`),
      });
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      await fs.writeFile(
        path.join(evidence, `axe-${name}-${width}.json`),
        JSON.stringify(results.violations, null, 2),
      );
      failures.push(
        ...results.violations.map((v) => ({
          route,
          width,
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
      );
    }
  }
  expect(failures).toEqual([]);
});

test("upload in progress locks editing to protect newer content and unlocks afterward", async ({
  page,
}) => {
  await page.goto("/admin");
  await unlockAdmin(page);
  await page
    .getByRole("button", { name: "Matérias e capas", exact: true })
    .click();
  const title = page.getByLabel("Título", { exact: true });
  await title.fill("Título antes do upload");
  let release!: () => void;
  const deferred = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/upload", async (route) => {
    await deferred;
    await route.fulfill({ json: { url: "/images/leticia-hero.jpg" } });
  });
  await page
    .getByLabel("Imagem de capa — enviar arquivo", { exact: true })
    .setInputFiles("public/images/leticia-hero.jpg");
  await expect(title).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Salvar alterações", exact: true }),
  ).toBeDisabled();
  release();
  await expect(title).toBeEnabled();
  await expect(title).toHaveValue("Título antes do upload");
});
test("a conflicted collection does not block saving other valid edits", async ({
  page,
  request,
}) => {
  await page.goto("/admin");
  await unlockAdmin(page);
  await page
    .getByRole("button", { name: "Destaque da capa", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Título principal", exact: true })
    .fill("Home editada em teste");
  await page
    .getByRole("button", { name: "Matérias e capas", exact: true })
    .click();
  await page
    .getByLabel("Título", { exact: true })
    .fill("Matéria editada em teste");
  await page.route("**/api/site-config", async (route) => {
    if (route.request().method() === "PUT")
      await route.fulfill({
        status: 409,
        json: { error: "Conflito de teste" },
      });
    else await route.continue();
  });
  await page
    .getByRole("button", { name: "Salvar alterações", exact: true })
    .click();
  await expect(
    page.getByText("Salvo: Matérias.", { exact: false }),
  ).toBeVisible();
  expect(
    (await (await request.get("/api/articles", { headers: auth })).json())[0]
      .title,
  ).toBe("Matéria editada em teste");
  await expect(
    page.getByRole("button", { name: "Salvar alterações", exact: true }),
  ).toBeEnabled();
});
test("script-closing text in an article remains text and cannot execute through JSON-LD", async ({
  request,
  page,
}) => {
  const response = await request.get("/api/articles", { headers: auth });
  const original = await response.json();
  const records = structuredClone(original);
  records[0].title = "</script><script>globalThis.__qa_xss=1</script>";
  records[0].dek = records[0].title;
  expect(
    (
      await request.put("/api/articles", {
        headers: { ...auth, "if-match": response.headers().etag },
        data: records,
      })
    ).status(),
  ).toBe(200);
  await page.goto("/artigos/" + records[0].slug);
  expect(
    await page.evaluate(() => (globalThis as any).__qa_xss),
  ).toBeUndefined();
  expect(
    JSON.parse(
      (await page
        .locator('script[type="application/ld+json"]')
        .textContent()) || "{}",
    ).headline,
  ).toBe(records[0].title);
  const latest = await request.get("/api/articles", { headers: auth });
  await request.put("/api/articles", {
    headers: { ...auth, "if-match": latest.headers().etag },
    data: original,
  });
});

test("admin preview fits its container on first load without requiring a mode toggle", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/admin");
  const iframe = page.locator(".adminPreviewFrame");
  await expect(iframe).toBeVisible();
  await expect
    .poll(async () => {
      const frame = await iframe.boundingBox();
      const host = await page.locator(".previewViewport").boundingBox();
      return (
        !!frame &&
        !!host &&
        frame.width <= host.width + 1 &&
        frame.height <= host.height + 1
      );
    })
    .toBe(true);
});

test("own WebM video uploads and decodes through the persistent media endpoint", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const bytes = Buffer.from(
    await page.evaluate(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 160;
      canvas.height = 284;
      const ctx = canvas.getContext("2d")!;
      const stream = canvas.captureStream(10);
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      const chunks: Blob[] = [];
      return await new Promise<number[]>((resolve) => {
        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          resolve(
            Array.from(
              new Uint8Array(
                await new Blob(chunks, { type: "video/webm" }).arrayBuffer(),
              ),
            ),
          );
        };
        recorder.start();
        const timer = setInterval(() => {
          ctx.fillStyle = "#dbc3ab";
          ctx.fillRect(0, 0, 160, 284);
        }, 50);
        setTimeout(() => {
          clearInterval(timer);
          recorder.stop();
        }, 600);
      });
    }),
  );
  const upload = await request.post("/api/upload", {
    headers: auth,
    multipart: {
      file: { name: "qa-only.webm", mimeType: "video/webm", buffer: bytes },
    },
  });
  expect(upload.status()).toBe(200);
  const { url } = await upload.json();
  expect(Buffer.from(await (await request.get(url)).body())).toEqual(bytes);
  const response = await request.get("/api/portfolio", { headers: auth });
  const records = await response.json();
  records.push({
    id: "qa-webm",
    title: "Vídeo próprio de teste",
    description: "Fixture temporária de validação",
    type: "Vídeo",
    published: true,
    media: {
      url,
      fit: "contain",
      positionX: 50,
      positionY: 50,
      zoom: 100,
      opacity: 100,
    },
  });
  expect(
    (
      await request.put("/api/portfolio", {
        headers: { ...auth, "if-match": response.headers().etag },
        data: records,
      })
    ).status(),
  ).toBe(200);
  await page.goto("/ugc");
  const video = page.locator(`video[src="${url}"]`);
  await video.scrollIntoViewIfNeeded();
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState))
    .toBeGreaterThanOrEqual(2);
  expect(
    await video.evaluate((v: HTMLVideoElement) => ({
      width: v.videoWidth,
      height: v.videoHeight,
    })),
  ).toEqual({ width: 160, height: 284 });
  await video.evaluate((v: HTMLVideoElement) => v.play());
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime))
    .toBeGreaterThan(0);
});

test("appearance controls change desktop headline size in the live preview", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/admin");
  await unlockAdmin(page);
  await page
    .getByRole("button", { name: "Destaque da capa", exact: true })
    .click();
  const card = page
    .locator(".adminFields > .adminCard")
    .filter({ has: page.getByText("Título principal", { exact: true }) });
  const slider = card.getByRole("slider", { name: /Tamanho/ });
  const before = Number(await slider.inputValue());
  await slider.focus();
  await slider.press("ArrowRight");
  const heading = page
    .frameLocator(".adminPreviewFrame")
    .locator('[data-editor="home.hero.title"]');
  await expect
    .poll(() => heading.evaluate((e) => getComputedStyle(e).fontSize))
    .toBe(`${before + 1}px`);
});

test("unpublished articles and portfolio entries are private, including the preview route", async ({
  request,
}) => {
  const response = await request.get("/api/articles", { headers: auth });
  const originals = await response.json();
  const draft = {
    ...originals[0],
    slug: "qa-private-draft",
    title: "Rascunho privado de teste",
    body: "Conteúdo reservado para rascunho",
    published: false,
  };
  const save = await request.put("/api/articles", {
    headers: { ...auth, "if-match": response.headers().etag },
    data: [draft, ...originals],
  });
  expect(save.status()).toBe(200);
  try {
    const publicArticles = await (await request.get("/api/articles")).json();
    expect(publicArticles.some((a: any) => a.slug === draft.slug)).toBe(false);
    expect(
      (await (await request.get("/api/articles", { headers: auth })).json())[0]
        .body,
    ).toBe(draft.body);
    expect(
      await (
        await request.get("/editor-preview/article?editorPreview=1")
      ).text(),
    ).not.toContain(draft.body);
    expect((await request.get("/artigos/" + draft.slug)).status()).toBe(404);
  } finally {
    const latest = await request.get("/api/articles", { headers: auth });
    await request.put("/api/articles", {
      headers: { ...auth, "if-match": latest.headers().etag },
      data: originals,
    });
  }
  const portfolioResponse = await request.get("/api/portfolio", {
    headers: auth,
  });
  const portfolio = await portfolioResponse.json();
  await request.put("/api/portfolio", {
    headers: { ...auth, "if-match": portfolioResponse.headers().etag },
    data: [
      ...portfolio,
      {
        ...portfolio[0],
        id: "qa-private-work",
        title: "Trabalho privado de teste",
        published: false,
      },
    ],
  });
  expect(
    (await (await request.get("/api/portfolio")).json()).some(
      (p: any) => p.id === "qa-private-work",
    ),
  ).toBe(false);
});
