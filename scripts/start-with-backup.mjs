#!/usr/bin/env node
import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
export function startService({app,worker,enabled=false,restartMs=60000,logger=event=>console.error(JSON.stringify({event})),stdio='inherit'}){
 let shuttingDown=false,appChild,workerChild,restartTimer,killTimer;
 let resolveDone;const done=new Promise(resolve=>{resolveDone=resolve;});
 const launch=spec=>spawn(spec.command,spec.args,{stdio,detached:true,env:spec.env||process.env});
 const kill=(child,signal)=>{if(!child?.pid)return;try{process.kill(-child.pid,signal);}catch{}};
 function stop(code=0){
  if(shuttingDown)return;shuttingDown=true;clearTimeout(restartTimer);kill(appChild,'SIGTERM');kill(workerChild,'SIGTERM');
  killTimer=setTimeout(()=>{kill(appChild,'SIGKILL');kill(workerChild,'SIGKILL');},8000);killTimer.unref();
  const wait=child=>!child||child.exitCode!==null||child.signalCode!==null?Promise.resolve():new Promise(r=>child.once('close',r));
  Promise.all([wait(appChild),wait(workerChild)]).then(()=>{clearTimeout(killTimer);resolveDone(code);});
 }
 function launchWorker(){
  if(shuttingDown||!enabled)return;workerChild=launch(worker);
  const failed=()=>{if(shuttingDown)return;logger('backup.worker.stopped');restartTimer=setTimeout(launchWorker,restartMs);};
  workerChild.once('error',()=>logger('backup.worker.spawn-failed'));workerChild.once('close',failed);
 }
 appChild=launch(app);appChild.once('error',()=>{logger('application.spawn-failed');stop(1);});appChild.once('exit',code=>stop(code??1));launchWorker();
 return {stop,done};
}
async function main(){
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 const service=startService({app:{command:process.execPath,args:[path.join(root,'node_modules/next/dist/bin/next'),'start','--hostname','0.0.0.0','--port',process.env.PORT||'3000']},worker:{command:process.execPath,args:[path.join(root,'scripts/backup/cli.mjs'),'schedule']},enabled:process.env.BACKUP_ENABLED==='1'});
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>service.stop(0));process.exitCode=await service.done;
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)main().catch(()=>{console.error('Application supervisor could not start');process.exitCode=1;});
