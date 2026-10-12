import test from "node:test";
import assert from "node:assert/strict";
import original from "../content/linktree-original.json";
import { fromLegacyLinktree, validateLinktree } from "../lib/linktree-model";
test("legacy migration preserves every original text, media URL and service link", () => {
  const data = fromLegacyLinktree(original);
  assert.deepEqual(data.texts, original.texts);
  assert.deepEqual(data.background, original.background);
  for (const key of ["profile", "product", "unboxing", "fitting"])
    assert.equal(
      data.media[key].url,
      original.media[key as keyof typeof original.media].url,
    );
  assert.deepEqual(
    data.links.map((l) => l.href),
    ["#portfolio", "#pacotes", "https://wa.me/5531995309352"],
  );
  assert.equal(data.socials[0].href, "https://instagram.com/leticiafnda");
  assert.equal(data.services.length, 3);
  assert.equal(
    data.services[0].href,
    "https://wa.me/5531995309352?text=" +
      encodeURIComponent(
        "Olá, Letícia! Tenho interesse no Plano Básico de provador avulso.",
      ),
  );
  assert.deepEqual(data.blocks, [
    "profile",
    "links",
    "portfolio",
    "services",
    "contact",
  ]);
});
test("reject unsafe link updates without stripping or replacing content", () => {
  const data = fromLegacyLinktree(original);
  data.links[0].href = "javascript:alert(1)";
  assert.throws(() => validateLinktree(data), /URL/);
});
test("keeps unknown legacy fields rather than silently dropping them", () => {
  const source = {
    ...original,
    texts: {
      ...original.texts,
      extra: { ...original.texts.heroTitle, text: "Texto real adicional" },
    },
    extension: { preserve: true },
  };
  const data = fromLegacyLinktree(source);
  assert.equal(data.texts.extra.text, "Texto real adicional");
  assert.deepEqual((data as any).extension, { preserve: true });
});
test("rejects persisted configs that would crash the editor or public page", () => {
  for (const change of [
    (c: any) => delete c.provenance,
    (c: any) => (c.media.profile = {}),
    (c: any) => (c.background = {}),
    (c: any) => (c.videos[0].enabled = "yes"),
  ]) {
    const data = structuredClone(fromLegacyLinktree(original));
    change(data);
    assert.throws(() => validateLinktree(data), /inválid/);
  }
});

test('public Linktree projection excludes inactive records and unused editor-only text',async()=>{
 const {publicLinktree}=await import('../lib/linktree-model');const data=fromLegacyLinktree(original);data.links.push({id:'draft',label:'Reserva privada',href:'https://example.com/private-deal',enabled:false});data.texts.privateNote={...data.texts.heroTitle,text:'Nota reservada ao editor'};data.videos.push({...data.videos[0],id:'private-video',title:'Vídeo reservado',enabled:false,media:{...data.videos[0].media,url:'https://example.com/private-video.mp4'}});
 const result=JSON.stringify(publicLinktree(data));assert.equal(result.includes('private-deal'),false);assert.equal(result.includes('private-video.mp4'),false);assert.equal(result.includes('Nota reservada'),false);assert.equal(result.includes(data.texts.heroTitle.text),true);
});
