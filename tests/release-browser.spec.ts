import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
const auth={'x-admin-password':'qa-only-password-not-for-deploy'};
async function unlock(page:import('@playwright/test').Page){await page.getByLabel('Senha do painel',{exact:true}).fill(auth['x-admin-password']);await page.getByRole('button',{name:'Validar acesso',exact:true}).click();await expect(page.getByText('Senha validada. Você pode salvar alterações.',{exact:false})).toBeVisible();}
test('newsletter full consent, private admin CSV and self-service cancellation',async({page,request})=>{
 await page.goto('/');const form=page.locator('.newsletter form');await form.getByLabel('Seu e-mail',{exact:true}).fill('integration-reader@example.com');
 await expect(form.getByRole('button',{name:'Quero receber'})).toBeDisabled();await form.getByRole('checkbox').check();await form.getByRole('button',{name:'Quero receber'}).click();
 await expect(form.getByRole('status')).toContainText('Cadastro registrado');await expect(form.getByRole('status')).toContainText('Nenhum e-mail foi enviado');
 const manage=await form.getByRole('link',{name:'Cancelar inscrição e excluir meus dados'}).getAttribute('href');expect(manage).toMatch(/^\/newsletter#token=/);
 expect((await request.get('/api/admin/newsletter')).status()).toBe(401);
 await page.goto('/admin');await unlock(page);await page.getByRole('combobox',{name:'Selecionar seção do site'}).selectOption('inscritos');await expect(page.getByText('integration-reader@example.com',{exact:true})).toBeVisible();
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Exportar CSV'}).click();const download=await downloadPromise;const file=await download.path();expect(await fs.readFile(file!,'utf8')).toContain('integration-reader@example.com');
 await page.goto(manage!);await page.getByRole('button',{name:'Cancelar inscrição e excluir meus dados'}).click();await expect(page.getByRole('status')).toContainText('Solicitação concluída');
 const list=await(await request.get('/api/admin/newsletter',{headers:auth})).json();expect(list.subscribers.some((s:{email:string})=>s.email==='integration-reader@example.com')).toBe(false);
 await request.post('/api/newsletter',{headers:{origin:'http://127.0.0.1:3001'},data:{email:'integration-delete@example.com',consent:true}});
 await page.goto('/admin');await unlock(page);await page.getByRole('button',{name:'Inscritos',exact:true}).click();page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Excluir inscrição de integration-delete@example.com'}).click();await expect(page.getByText('integration-delete@example.com',{exact:true})).toHaveCount(0);
});
test('newsletter management and privacy remain responsive and accessible',async({page})=>{
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:900});for(const route of ['/newsletter','/privacidade']){
  expect((await page.goto(route))?.status()).toBe(200);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze();expect(results.violations).toEqual([]);
 }}
});
test('published Linktree snapshot stays visible in the sitemap and media listing stays private',async({request})=>{
 const original=await(await request.get('/api/linktree',{headers:auth})).json();
 try{const updated={...original,provenance:{...original.provenance,kind:'published-snapshot'}};expect((await request.put('/api/linktree',{headers:auth,data:updated})).ok()).toBe(true);expect(await(await request.get('/sitemap.xml')).text()).toContain('/linktree');expect((await request.get('/linktree')).status()).toBe(200);}finally{await request.put('/api/linktree',{headers:auth,data:original});}
 expect((await request.get('/api/media')).status()).toBe(401);
});
