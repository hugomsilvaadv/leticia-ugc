import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {captureData,verifyCapture} from './capture.mjs';
export class BackupCommandError extends Error {
 constructor(stage,code){super(`Backup ${stage} failed (exit ${Number.isInteger(code)?code:'interrupted'})`);this.stage=stage;this.exitCode=code;}
}
async function rejectSymlinkAncestors(target){
 const parsed=path.parse(target);let current=parsed.root;
 for(const segment of target.slice(parsed.root.length).split(path.sep).filter(Boolean)){
  current=path.join(current,segment);const stat=await fs.lstat(current).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
  if(!stat)break;if(stat.isSymbolicLink())throw new Error('Restore rejects symbolic path components');
 }
}
export function createBackupService(config){
 const source=path.resolve(config.source),stateDir=path.resolve(config.stateDir),capture=path.join(stateDir,'capture');
 const env={};
 for(const name of ['PATH','HTTPS_PROXY','HTTP_PROXY','ALL_PROXY','NO_PROXY','https_proxy','http_proxy','no_proxy','SSL_CERT_FILE','SSL_CERT_DIR'])if(process.env[name])env[name]=process.env[name];
 Object.assign(env,{RESTIC_REPOSITORY:config.repository,RESTIC_PASSWORD:config.password,RESTIC_CACHE_DIR:path.join(stateDir,'cache'),AWS_ACCESS_KEY_ID:config.accessKey||'',AWS_SECRET_ACCESS_KEY:config.secretKey||'',AWS_DEFAULT_REGION:'auto',AWS_EC2_METADATA_DISABLED:'true',TZ:'UTC',GOMAXPROCS:'1',GOMEMLIMIT:'128MiB'});
 const options=['--json','--limit-upload',String(config.uploadLimit||4096),'--limit-download',String(config.downloadLimit||8192)];
 if(config.repository.startsWith('s3:'))options.push('-o','s3.region=auto','-o','s3.bucket-lookup=path','-o','s3.connections=2');
 const filter=['--host',config.host,'--tag',config.tag,'--path',capture];
 async function command(stage,args,signal){
  signal?.throwIfAborted();
  return new Promise((resolve,reject)=>{
   const child=spawn(config.binary||'restic',[...options,...args],{env,stdio:['ignore','pipe','pipe']});
   try{os.setPriority(child.pid,10);}catch{}
   let out='',size=0,done=false,killTimer;
   const abort=()=>{child.kill('SIGTERM');clearTimeout(killTimer);killTimer=setTimeout(()=>child.kill('SIGKILL'),3000);killTimer.unref();};
   signal?.addEventListener('abort',abort,{once:true});
   child.stdout.on('data',bytes=>{size+=bytes.length;if(size>16*1024*1024)abort();else out+=bytes;});
   // Backend stderr can contain credentials or URLs. Never forward it.
   child.stderr.on('data',()=>{});
   const finish=error=>{if(done)return;done=true;clearTimeout(killTimer);signal?.removeEventListener('abort',abort);if(error)reject(error);else resolve(out);};
   child.on('error',()=>finish(new BackupCommandError(stage,null)));
   child.on('close',code=>{if(code!==0||signal?.aborted||size>16*1024*1024)finish(new BackupCommandError(stage,code));else finish();});
  });
 }
 async function snapshots(signal){return JSON.parse(await command('snapshots',['snapshots',...filter],signal));}
 async function check(signal){await command('check',['check','--read-data'],signal);}
 async function backup({now=new Date(),signal}={}){
  const timed=AbortSignal.timeout(config.timeoutMs||3600000),combined=signal?AbortSignal.any([signal,timed]):timed;
  let owned=false;
  try{
   // Establish ownership before cleanup, including failure while capturing.
   const {ensureState}=await import('./capture.mjs');await ensureState(source,stateDir);owned=true;
   await captureData(source,stateDir,{signal:combined,now});await verifyCapture(capture,{signal:combined});
   const output=await command('upload',['backup',capture,'--host',config.host,'--tag',config.tag,'--time',now.toISOString().slice(0,19).replace('T',' ')],combined);
   const summary=output.trim().split('\n').map(line=>{try{return JSON.parse(line);}catch{return {};}}).find(row=>row.message_type==='summary');
   if(!summary?.snapshot_id)throw new BackupCommandError('summary',null);
   // Hardlinks must remain consistent throughout upload, before any retention.
   await verifyCapture(capture,{signal:combined});await check(combined);
   await command('retention',['forget',...filter,'--keep-last','1','--keep-daily',String(config.keepDaily),'--keep-weekly',String(config.keepWeekly),'--keep-monthly',String(config.keepMonthly)],combined);
   if(now.getUTCDay()===config.pruneDay)await command('prune',['prune'],combined);
   return {snapshotId:summary.snapshot_id,summary,verifiedAt:now.toISOString()};
  }finally{if(owned)await fs.rm(capture,{recursive:true,force:true});}
 }
 async function restore(id,target,{signal}={}){
  if(id!=='latest'&&!/^[a-f0-9]{8,64}$/.test(id))throw new Error('Invalid snapshot ID');
  target=path.resolve(target);await rejectSymlinkAncestors(target);
  const overlaps=(a,b)=>a===b||a.startsWith(b+path.sep);
  const physicalSource=await fs.realpath(source),physicalTarget=await fs.realpath(target).catch(e=>{if(e.code==='ENOENT')return target;throw e;});
  if(overlaps(target,source)||overlaps(source,target)||overlaps(physicalTarget,physicalSource)||overlaps(physicalSource,physicalTarget))throw new Error('Restore target overlaps source');
  const entries=await fs.readdir(target).catch(e=>{if(e.code==='ENOENT')return [];throw e;}),existing=await fs.lstat(target).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
  if(entries.length||existing?.isSymbolicLink()||(existing&&!existing.isDirectory()))throw new Error('Restore target must be a new empty directory');
  const rows=await snapshots(signal),matching=rows.filter(row=>id==='latest'||row.id.startsWith(id)).sort((a,b)=>b.time.localeCompare(a.time));
  if(!matching.length)throw new Error('Snapshot not found');if(id!=='latest'&&matching.length!==1)throw new Error('Ambiguous snapshot ID');
  const selected=matching[0];if(selected.paths?.length!==1||selected.paths[0]!==capture)throw new Error('Unexpected snapshot source');
  await fs.mkdir(target,{recursive:true,mode:0o700});await fs.chmod(target,0o700);
  const temporary=path.join(target,'.restore-staging');await fs.mkdir(temporary,{mode:0o700});
  const timed=AbortSignal.timeout(config.timeoutMs||3600000),combined=signal?AbortSignal.any([signal,timed]):timed;
  try{
   await command('restore',['restore',selected.id+':'+capture,'--target',temporary,'--verify'],combined);await verifyCapture(temporary,{signal:combined});
   await fs.rename(path.join(temporary,'data'),path.join(target,'data'));await fs.copyFile(path.join(temporary,'manifest.json'),path.join(target,'manifest.json'));await fs.chmod(path.join(target,'manifest.json'),0o600);
   return {snapshotId:selected.id,target};
  }finally{await fs.rm(temporary,{recursive:true,force:true});}
 }
 return {initialize:signal=>command('init',['init'],signal),backup,snapshots,check,restore};
}
