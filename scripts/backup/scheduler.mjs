import fs from 'node:fs/promises';
import path from 'node:path';
import {pingMonitor} from './monitor.mjs';
export function isDue(now,state,runAt){
 if(state.nextRetryAt&&Date.parse(state.nextRetryAt)>now.getTime())return false;
 const [hour,minute]=runAt.split(':').map(Number);let window=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate(),hour,minute);
 if(now.getTime()<window)window-=86400000;
 return !state.lastSuccess||!Number.isFinite(Date.parse(state.lastSuccess))||Date.parse(state.lastSuccess)<window;
}
export async function readStatus(stateDir){
 try{const state=JSON.parse(await fs.readFile(path.join(stateDir,'status.json'),'utf8'));return state&&typeof state==='object'&&!Array.isArray(state)?state:{};}
 catch(e){if(e.code==='ENOENT'||e instanceof SyntaxError)return {};throw e;}
}
async function writeStatus(stateDir,state){
 await fs.mkdir(stateDir,{recursive:true,mode:0o700});const file=path.join(stateDir,'status.json'),temporary=file+'.tmp';
 await fs.writeFile(temporary,JSON.stringify(state)+'\n',{mode:0o600});await fs.rename(temporary,file);
}
export async function executeScheduled(config,{now=new Date(),run,notify=pingMonitor,force=false,signal}={}){
 const state=await readStatus(config.stateDir);if(!force&&!isDue(now,state,config.runAt))return {skipped:true};
 try{
  // Preserve data even when start-ping delivery fails; success delivery is mandatory.
  await notify(config.monitorUrl,'start',{signal}).catch(()=>{});const result=await run({now,signal});
  await notify(config.monitorUrl,'success',{signal});await writeStatus(config.stateDir,{lastSuccess:now.toISOString(),snapshotId:result.snapshotId});
  return {ok:true,snapshotId:result.snapshotId};
 }catch{
  await writeStatus(config.stateDir,{...state,lastFailure:now.toISOString(),nextRetryAt:new Date(now.getTime()+3600000).toISOString()});
  await notify(config.monitorUrl,'fail').catch(()=>{});return {ok:false};
 }
}
