import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {randomBytes} from 'node:crypto';
const {captureData,verifyCapture}=require('../scripts/backup/capture.mjs');
const {createBackupService}=require('../scripts/backup/core.mjs');
const binary=process.env.RESTIC_TEST_BINARY||'restic';
async function fixture(run:(f:any)=>Promise<void>){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'byleticia-backup-')),source=path.join(root,'volume');
 await fs.mkdir(path.join(source,'uploads'),{recursive:true});
 await fs.writeFile(path.join(source,'articles.json'),'[{"title":"Teste"}]');await fs.writeFile(path.join(source,'site-config.json'),'{}');
 await fs.writeFile(path.join(source,'newsletter.json'),'[{"email":"isolated@example.com"}]');await fs.writeFile(path.join(source,'uploads','photo.jpg'),randomBytes(1024*1024));
 const config={source,stateDir:path.join(source,'.external-backup'),repository:path.join(root,'repository'),password:'isolated-test-password',binary,host:'byleticia-test',tag:'byleticia-v1',keepDaily:1,keepWeekly:0,keepMonthly:0,pruneDay:0,timeoutMs:60000};
 try{await run({root,source,config,service:createBackupService(config)});}finally{await fs.rm(root,{recursive:true,force:true});}
}
test('capture preserves originals, includes all active JSON/uploads, excludes historical directories and detects tampering',()=>fixture(async({source,config}:any)=>{
 const photo=path.join(source,'uploads','photo.jpg'),original=await fs.readFile(photo),mode=(await fs.stat(photo)).mode;
 await fs.mkdir(path.join(source,'backups'));await fs.writeFile(path.join(source,'backups','old.json'),'private history');
 const capture=await captureData(source,config.stateDir);const manifest=await verifyCapture(capture);
 assert.ok(manifest.files.some((f:any)=>f.path==='newsletter.json'));assert.deepEqual(await fs.readFile(photo),original);assert.equal((await fs.stat(photo)).mode,mode);
 assert.equal((await fs.stat(config.stateDir)).mode&0o777,0o700);assert.ok(!(await fs.readdir(path.join(capture,'data'))).includes('backups'));
 await fs.writeFile(path.join(capture,'data','articles.json'),'tampered');await assert.rejects(verifyCapture(capture),/integrity/);
}));
test('capture rejects empty, malformed and symbolic sources',()=>fixture(async({root,source,config}:any)=>{
 await fs.writeFile(path.join(source,'articles.json'),'BROKEN');await assert.rejects(captureData(source,config.stateDir));
 assert.equal(await fs.readFile(path.join(source,'articles.json'),'utf8'),'BROKEN');await fs.writeFile(path.join(source,'articles.json'),'[]');
 await fs.symlink(path.join(root,'outside'),path.join(source,'uploads','unsafe'));await assert.rejects(captureData(source,config.stateDir),/symbolic/);
 const empty=path.join(root,'empty');await fs.mkdir(empty);await assert.rejects(captureData(empty,path.join(empty,'.external-backup')),/required/);
}));
test('real restic encrypted deduplicated backups survive total source loss, retain history correctly and restore safely',()=>fixture(async({root,source,config,service}:any)=>{
 await service.initialize();const first=await service.backup({now:new Date('2026-10-10T03:00:00Z')});
 const media=await fs.readFile(path.join(source,'uploads','photo.jpg'));await fs.writeFile(path.join(source,'articles.json'),'[{"title":"Nova"}]');
 const second=await service.backup({now:new Date('2026-10-11T03:00:00Z')});assert.ok(second.summary.data_added<media.length/2);
 const snapshots=await service.snapshots();assert.equal(snapshots.length,1);assert.notEqual(first.snapshotId,second.snapshotId);
 await assert.rejects(fs.access(path.join(config.stateDir,'capture')));
 for(const name of await fs.readdir(path.join(config.repository,'snapshots')))assert.ok(!(await fs.readFile(path.join(config.repository,'snapshots',name))).includes(Buffer.from('isolated@example.com')));
 await fs.rm(source,{recursive:true});await fs.mkdir(source);const target=path.join(root,'recovered');await service.restore(second.snapshotId,target);
 assert.equal(await fs.readFile(path.join(target,'data','articles.json'),'utf8'),'[{"title":"Nova"}]');assert.deepEqual(await fs.readFile(path.join(target,'data','uploads','photo.jpg')),media);
 assert.equal(await fs.readFile(path.join(target,'data','newsletter.json'),'utf8'),'[{"email":"isolated@example.com"}]');
 await assert.rejects(service.restore(second.snapshotId,target),/empty/);await assert.rejects(service.restore(second.snapshotId,source),/source/);
 await fs.symlink(source,path.join(root,'alias'));await assert.rejects(service.restore(second.snapshotId,path.join(root,'alias','new')),/symbolic|source/);
}));
test('failed capture and corrupt repository preserve snapshots and refuse invalid restore',()=>fixture(async({root,source,service,config}:any)=>{
 await service.initialize();await service.backup({now:new Date('2026-10-10T03:00:00Z')});const snapshots=await service.snapshots();
 await fs.writeFile(path.join(source,'articles.json'),'BROKEN');await assert.rejects(service.backup());assert.deepEqual(await service.snapshots(),snapshots);await assert.rejects(fs.access(path.join(config.stateDir,'capture')));
 let pack='',largest=0;for(const dir of await fs.readdir(path.join(config.repository,'data')))for(const file of await fs.readdir(path.join(config.repository,'data',dir))){const candidate=path.join(config.repository,'data',dir,file),size=(await fs.stat(candidate)).size;if(size>largest){pack=candidate;largest=size;}}
 assert.ok(largest>512*1024);await fs.chmod(pack,0o600);const bytes=await fs.readFile(pack);bytes[Math.floor(bytes.length/2)]^=1;await fs.writeFile(pack,bytes);
 await assert.rejects(service.check(),/check/);await assert.rejects(service.restore(snapshots[0].id,path.join(root,'bad-restore')));assert.equal(await fs.readFile(path.join(source,'articles.json'),'utf8'),'BROKEN');
}));
test('mutation after pre-upload verification fails closed before retention and removes staging',()=>fixture(async({root,source,config,service}:any)=>{
 await service.initialize();const first=await service.backup({now:new Date('2026-10-10T03:00:00Z')});
 const wrapper=path.join(root,'restic-wrapper.mjs'),photo=path.join(source,'uploads','photo.jpg');
 await fs.writeFile(wrapper,`#!/usr/bin/env node\nimport fs from 'node:fs';import {spawnSync} from 'node:child_process';const args=process.argv.slice(2);if(args.includes('backup'))fs.appendFileSync(${JSON.stringify(photo)},'mutation');const result=spawnSync(${JSON.stringify(binary)},args,{env:process.env,stdio:'inherit'});process.exit(result.status??1);\n`,{mode:0o700});
 const changed=createBackupService({...config,binary:wrapper});await assert.rejects(changed.backup({now:new Date('2026-10-11T03:00:00Z')}),/integrity/);
 assert.ok((await service.snapshots()).some((s:any)=>s.id.startsWith(first.snapshotId)));await assert.rejects(fs.access(path.join(config.stateDir,'capture')));
}));
