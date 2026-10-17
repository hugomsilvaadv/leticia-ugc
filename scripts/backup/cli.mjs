#!/usr/bin/env node
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {loadBackupConfig} from './config.mjs';
import {ensureState} from './capture.mjs';
import {createBackupService} from './core.mjs';
import {runLocked} from './lock.mjs';
import {executeScheduled} from './scheduler.mjs';
import {pingMonitor} from './monitor.mjs';
const controller=new AbortController();
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>controller.abort());
function log(event,extra={}){console.log(JSON.stringify({event,...extra}));}
async function main(){
 const config=loadBackupConfig();if(!config){log('backup.disabled');return;}
 const [command,...args]=process.argv.slice(2);
 if(!['schedule','run','init','check','restore','snapshots','_scheduled','_run','_init','_check','_restore','_snapshots'].includes(command))throw new Error('Unknown backup operation');
 await ensureState(config.source,config.stateDir);
 const locked=(operation,rest=[])=>runLocked(path.join(config.stateDir,'backup.lock'),process.execPath,[fileURLToPath(import.meta.url),'_'+operation,...rest],{inherit:true,signal:controller.signal});
 if(command==='schedule'){
  log('backup.scheduler.started',{runAtUTC:config.runAt});
  while(!controller.signal.aborted){const code=await locked('scheduled');if(code!==0&&code!==75)log('backup.scheduler.attempt-failed');await delay(60000,undefined,{signal:controller.signal}).catch(()=>{});}return;
 }
 if(!command.startsWith('_')){const code=await locked(command,args);if(code===75)log('backup.already-running');process.exitCode=code;return;}
 const service=createBackupService(config),operation=command.slice(1),timeout=AbortSignal.any([controller.signal,AbortSignal.timeout(config.timeoutMs)]);
 if(operation==='scheduled'||operation==='run'){
  const result=await executeScheduled(config,{run:options=>service.backup(options),force:operation==='run',signal:controller.signal});
  if(!result.skipped)log(result.ok?'backup.completed':'backup.failed',result.ok?{snapshotId:result.snapshotId}:{});if(result.ok===false)process.exitCode=1;
 }else if(operation==='init'){await service.initialize(timeout);log('backup.repository.initialized');}
 else if(operation==='check'){await service.check(timeout);log('backup.integrity.verified');}
 else if(operation==='snapshots'){const rows=await service.snapshots(timeout);console.log(JSON.stringify(rows.map(row=>({id:row.id,time:row.time})),null,2));}
 else if(operation==='restore'){if(args.length!==2)throw new Error('Restore requires snapshot and empty target');const result=await service.restore(args[0],args[1],{signal:timeout});log('backup.restore.verified',{snapshotId:result.snapshotId});}
}
main().catch(async()=>{
 // Do not print raw config, backend stderr, URLs or JSON parse errors.
 log('backup.failed',{stage:'configuration-or-operation'});
 try{const config=loadBackupConfig();if(config)await pingMonitor(config.monitorUrl,'fail');}catch{}process.exitCode=1;
});
