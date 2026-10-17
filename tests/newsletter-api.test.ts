import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
test('newsletter APIs deny public listing, enforce consent/origin/body limits and support private erasure',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'newsletter-api-')),oldData=process.env.CONTENT_DATA_DIR,oldPassword=process.env.ADMIN_PASSWORD;
 process.env.CONTENT_DATA_DIR=dir;process.env.ADMIN_PASSWORD='test-only-password';
 try{
  const signup=await import('../app/api/newsletter/route'),manage=await import('../app/api/newsletter/manage/route'),admin=await import('../app/api/admin/newsletter/route');
  const base='https://www.byleticia.com.br';
  const post=(body:unknown,origin=base)=>new Request(base+'/api/newsletter',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await signup.POST(post({email:'a@example.com',consent:true},'https://evil.example'))).status,403);
  assert.equal((await signup.POST(post({email:'a@example.com',consent:false}))).status,400);
  assert.equal((await signup.POST(post({email:'a@example.com',consent:true,website:'bot'}))).status,400);
  assert.equal((await signup.POST(post({email:'x'.repeat(5000),consent:true}))).status,413);
  const publicList=await admin.GET(new Request(base+'/api/admin/newsletter'));assert.equal(publicList.status,401);assert.equal(publicList.headers.get('cache-control'),'no-store');
  assert.equal((await admin.DELETE(new Request(base+'/api/admin/newsletter',{method:'DELETE',body:'{}'}))).status,401);
  const registered=await(await signup.POST(post({email:'a@example.com',consent:true}))).json();assert.ok(registered.token);assert.equal(registered.email,undefined);
  const duplicate=await(await signup.POST(post({email:'A@example.com',consent:true}))).json();assert.equal(typeof duplicate.token,'string');assert.equal(duplicate.token.length,registered.token.length);assert.notEqual(duplicate.token,registered.token);assert.deepEqual(Object.keys(duplicate).sort(),Object.keys(registered).sort());assert.equal(duplicate.message,registered.message);
  const headers={'x-admin-password':'test-only-password'};
  const listed=await(await admin.GET(new Request(base+'/api/admin/newsletter',{headers}))).json();assert.equal(listed.total,1);assert.ok(!JSON.stringify(listed).includes('tokenHash'));assert.equal(listed.campaignsEnabled,false);
  const csv=await admin.GET(new Request(base+'/api/admin/newsletter?format=csv',{headers}));assert.ok((await csv.text()).includes('a@example.com'));
  const remove=new Request(base+'/api/newsletter/manage',{method:'POST',headers:{origin:base},body:JSON.stringify({token:registered.token})});assert.equal((await manage.POST(remove)).status,200);
  assert.equal((await(await admin.GET(new Request(base+'/api/admin/newsletter',{headers}))).json()).total,0);
  await fs.writeFile(path.join(dir,'newsletter.json'),'corrupt');assert.equal((await signup.POST(post({email:'b@example.com',consent:true}))).status,500);assert.equal(await fs.readFile(path.join(dir,'newsletter.json'),'utf8'),'corrupt');
 }finally{if(oldData===undefined)delete process.env.CONTENT_DATA_DIR;else process.env.CONTENT_DATA_DIR=oldData;if(oldPassword===undefined)delete process.env.ADMIN_PASSWORD;else process.env.ADMIN_PASSWORD=oldPassword;await fs.rm(dir,{recursive:true,force:true});}
});
