import {spawn} from 'node:child_process';
export function runLocked(file,command,args,{signal,onOutput,inherit=false}={}){
 signal?.throwIfAborted();
 return new Promise((resolve,reject)=>{
  const child=spawn('flock',['--no-fork','--nonblock','--conflict-exit-code','75',file,command,...args],{stdio:inherit?'inherit':['ignore','pipe','pipe']});
  if(onOutput)child.stdout.on('data',onOutput);else child.stdout?.resume();child.stderr?.resume();
  const abort=()=>child.kill('SIGTERM');signal?.addEventListener('abort',abort,{once:true});
  child.once('error',()=>{signal?.removeEventListener('abort',abort);reject(new Error('Backup lock could not start'));});
  child.once('exit',code=>{signal?.removeEventListener('abort',abort);resolve(code??1);});
 });
}
