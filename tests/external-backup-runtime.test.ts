import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const {loadBackupConfig}=require('../scripts/backup/config.mjs');
const {isDue,executeScheduled}=require('../scripts/backup/scheduler.mjs');
const {pingMonitor}=require('../scripts/backup/monitor.mjs');
const {runLocked}=require('../scripts/backup/lock.mjs');
const {startService}=require('../scripts/start-with-backup.mjs');
const env={BACKUP_ENABLED:'1',BACKUP_R2_ACCOUNT_ID:'a'.repeat(32),BACKUP_R2_BUCKET:'byleticia-private-backups',AWS_ACCESS_KEY_ID:'test-key',AWS_SECRET_ACCESS_KEY:'test-secret',RESTIC_PASSWORD:'test-password',BACKUP_MONITOR_URL:'https://monitor.example/ping/private-token'};
test('disabled mode requires no credentials; enabled config validates secrets, HTTPS, R2, retention and UTC schedule',()=>{
 assert.equal(loadBackupConfig({}),null);assert.equal(loadBackupConfig({BACKUP_ENABLED:'0'}),null);
 const config=loadBackupConfig(env);assert.equal(config.keepDaily,7);assert.equal(config.keepWeekly,4);assert.equal(config.runAt,'03:00');
 for(const patch of [{AWS_SECRET_ACCESS_KEY:''},{RESTIC_PASSWORD:''},{BACKUP_MONITOR_URL:'http://unsafe.test'},{BACKUP_KEEP_DAILY:'-1'},{BACKUP_R2_PREFIX:'../unsafe'},{BACKUP_RUN_AT_UTC:'25:00'},{BACKUP_R2_ACCOUNT_ID:'wrong'}])assert.throws(()=>loadBackupConfig({...env,...patch}));
});
test('UTC scheduler catches missed runs after restart and respects last success and retry',()=>{
 const now=new Date('2026-10-15T04:00:00Z');assert.equal(isDue(now,{},'03:00'),true);
 assert.equal(isDue(now,{lastSuccess:'2026-10-15T03:10:00Z'},'03:00'),false);
 assert.equal(isDue(new Date('2026-10-15T02:00:00Z'),{lastSuccess:'2026-10-14T04:00:00Z'},'03:00'),false);
 assert.equal(isDue(now,{nextRetryAt:'2026-10-15T04:30:00Z'},'03:00'),false);
});
test('monitor preserves query on status paths, sends fixed metadata, retries and rejects failed delivery',async()=>{
 const calls:any[]=[];await pingMonitor(env.BACKUP_MONITOR_URL+'?rid=example','fail',{fetcher:async(url:any,options:any)=>{calls.push({url,options});return {ok:true};},attempts:1});
 assert.equal(calls[0].url,env.BACKUP_MONITOR_URL+'/fail?rid=example');assert.equal(calls[0].options.redirect,'error');assert.equal(calls[0].options.body,'byleticia-backup fail');
 let attempts=0;await assert.rejects(pingMonitor(env.BACKUP_MONITOR_URL,'success',{fetcher:async()=>{attempts++;return {ok:false};},attempts:2,retryMs:0}),/monitor/);assert.equal(attempts,2);
});
test('failure preserves last success and retries hourly; success ping delivery is mandatory',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'byleticia-schedule-')),config={stateDir:dir,runAt:'03:00',monitorUrl:env.BACKUP_MONITOR_URL},statuses:string[]=[];
 try{
  await fs.writeFile(path.join(dir,'status.json'),JSON.stringify({lastSuccess:'2026-10-14T03:05:00Z'}));
  const failed=await executeScheduled(config,{now:new Date('2026-10-15T04:00:00Z'),run:async()=>{throw new Error('private');},notify:async(_u:any,status:string)=>{statuses.push(status);}});
  assert.equal(failed.ok,false);assert.deepEqual(statuses,['start','fail']);let state=JSON.parse(await fs.readFile(path.join(dir,'status.json'),'utf8'));assert.equal(state.lastSuccess,'2026-10-14T03:05:00Z');assert.ok(state.nextRetryAt);assert.ok(!JSON.stringify(state).includes('private'));
  const unreported=await executeScheduled(config,{force:true,run:async()=>({snapshotId:'abcdef12'}),notify:async(_u:any,status:string)=>{if(status==='success')throw new Error('outage');}});assert.equal(unreported.ok,false);
  const success=await executeScheduled(config,{force:true,now:new Date('2026-10-15T05:01:00Z'),run:async()=>({snapshotId:'abcdef12'}),notify:async()=>{}});assert.equal(success.ok,true);state=JSON.parse(await fs.readFile(path.join(dir,'status.json'),'utf8'));assert.equal(state.snapshotId,'abcdef12');assert.equal(state.nextRetryAt,undefined);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('OS lock prevents overlapping jobs and releases after child termination',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'byleticia-lock-')),lock=path.join(dir,'backup.lock');
 try{let ready!:()=>void;const started=new Promise<void>(r=>ready=r);const first=runLocked(lock,process.execPath,['-e','console.log("ready");setTimeout(()=>{},300)'],{onOutput:()=>ready()});await started;assert.equal(await runLocked(lock,process.execPath,['-e','process.exit(0)']),75);assert.equal(await first,0);assert.equal(await runLocked(lock,process.execPath,['-e','process.exit(0)']),0);}
 finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('supervisor keeps app alive when worker exits and never launches worker in disabled mode',async()=>{
 const events:string[]=[],app={command:process.execPath,args:['-e','setInterval(()=>{},1000)']};
 const service=startService({app,worker:{command:process.execPath,args:['-e','process.exit(1)']},enabled:true,restartMs:30,stdio:'ignore',logger:(e:string)=>events.push(e)});
 try{await new Promise<void>((resolve,reject)=>{const deadline=setTimeout(()=>reject(new Error('worker never exited')),5000);const check=()=>{if(events.length){clearTimeout(deadline);resolve();}else setTimeout(check,10);};check();});assert.ok(events.includes('backup.worker.stopped'));}finally{service.stop();await service.done;}
 const disabled=startService({app,worker:{command:'must-not-start',args:[]},enabled:false,stdio:'ignore',logger:(e:string)=>events.push(e)});disabled.stop();assert.equal(await disabled.done,0);assert.ok(!events.includes('backup.worker.spawn-failed'));
});
