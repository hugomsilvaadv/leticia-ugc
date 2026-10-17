import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {NewsletterStore} from '../lib/newsletter-store';
import {normalizeEmail,newsletterCsv} from '../lib/newsletter-model';
import {NewsletterLimiter,isAllowedOrigin} from '../lib/newsletter-security';
async function fixture(run:(store:NewsletterStore,dir:string)=>Promise<void>){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'newsletter-'));try{await run(new NewsletterStore(path.join(dir,'newsletter.json')),dir);}finally{await fs.rm(dir,{recursive:true,force:true});}}
test('newsletter validates email and explicit consent',async()=>fixture(async(store,dir)=>{
 assert.equal(normalizeEmail('  Leitor@EXAMPLE.COM '),'leitor@example.com');
 for(const value of ['',null,'a@b','a b@example.com','=sum@example.com','a..b@example.com','a@-example.com'])assert.throws(()=>normalizeEmail(value));
 await assert.rejects(store.subscribe('a@example.com',false));assert.deepEqual(await fs.readdir(dir),[]);
}));
test('newsletter deduplicates concurrent writes, keeps tokens private and removes all active PII',async()=>fixture(async(store,dir)=>{
 await fs.writeFile(path.join(dir,'articles.json'),'preserved');
 const results=await Promise.all(Array.from({length:8},()=>new NewsletterStore(path.join(dir,'newsletter.json')).subscribe('Reader@example.com',true)));
 const tokens=results.flatMap(r=>r.token?[r.token]:[]);assert.equal(tokens.length,8);assert.equal(new Set(tokens).size,8);const rows=await store.list();assert.equal(rows.length,1);assert.equal(rows[0].email,'reader@example.com');
 const raw=await fs.readFile(path.join(dir,'newsletter.json'),'utf8');assert.ok(!raw.includes(tokens[0]));assert.ok(!JSON.stringify(rows).includes('tokenHash'));
 assert.equal((await fs.stat(path.join(dir,'newsletter.json'))).mode&0o777,0o600);
 for(const token of tokens.slice(1))assert.equal(await store.removeByToken(token),false);assert.equal(await store.removeByToken('bad'),false);assert.equal(await store.removeByToken(tokens[0]),true);assert.equal(await store.removeByToken(tokens[0]),false);
 assert.deepEqual(await store.list(),[]);assert.ok(!(await fs.readFile(path.join(dir,'newsletter.json'),'utf8')).includes('reader@example.com'));assert.ok(!(await fs.readdir(dir)).includes('backups'));
 assert.equal(await fs.readFile(path.join(dir,'articles.json'),'utf8'),'preserved');
}));
test('newsletter preserves malformed data and admin deletion is exact',async()=>fixture(async(store,dir)=>{
 for(const content of ['broken','null','{"version":2,"subscribers":[]}','{"version":1,"subscribers":[{}]}']){
  await fs.writeFile(path.join(dir,'newsletter.json'),content);await assert.rejects(store.list());await assert.rejects(store.subscribe('a@example.com',true));assert.equal(await fs.readFile(path.join(dir,'newsletter.json'),'utf8'),content);
 }
 await fs.rm(path.join(dir,'newsletter.json'));await store.subscribe('a@example.com',true);await store.subscribe('b@example.com',true);const rows=await store.list();assert.equal(await store.removeById(rows[0].id),true);assert.equal((await store.list())[0].id,rows[1].id);
}));
test('CSV escapes formulas and limiter expires without persisting IP',()=>{
 const csv=newsletterCsv([{id:'1',email:'=formula@example.com',consentedAt:'2026-10-17T00:00:00Z',consentVersion:'v1',verified:false}]);assert.ok(csv.includes('"\'=formula@example.com"'));assert.ok(!csv.includes('token'));
 const limiter=new NewsletterLimiter(2,3,1000,3);assert.ok(limiter.consume('a',0));assert.ok(limiter.consume('a',1));assert.equal(limiter.consume('a',2),false);assert.ok(limiter.consume('b',3));assert.equal(limiter.consume('c',4),false);assert.ok(limiter.consume('a',1001));
});
test('newsletter origin accepts production domain and rejects missing/foreign origins',()=>{
 const request=(origin:string)=>new Request('http://localhost:3001/api/newsletter',{headers:{origin,host:'localhost:3001'}});
 assert.equal(isAllowedOrigin(request('https://www.byleticia.com.br')),true);for(const origin of ['','null','https://evil.example'])assert.equal(isAllowedOrigin(request(origin)),false);
 if(process.env.NODE_ENV!=='production')assert.equal(isAllowedOrigin(new Request('http://localhost:3001/api/newsletter',{headers:{origin:'http://127.0.0.1:3001',host:'127.0.0.1:3001'}})),true);
});
