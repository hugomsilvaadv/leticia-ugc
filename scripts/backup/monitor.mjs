import {setTimeout as delay} from 'node:timers/promises';
export async function pingMonitor(url,status,{fetcher=fetch,attempts=3,retryMs=1000,signal}={}){
 if(!['start','success','fail'].includes(status))throw new Error('Invalid monitor status');
 const endpoint=new URL(url);if(status!=='success')endpoint.pathname=endpoint.pathname.replace(/\/$/,'')+'/'+status;
 for(let attempt=0;attempt<attempts;attempt++){
  try{
   const timeout=AbortSignal.timeout(5000),combined=signal?AbortSignal.any([signal,timeout]):timeout;
   const response=await fetcher(endpoint.href,{method:'POST',headers:{'Content-Type':'text/plain'},body:`byleticia-backup ${status}`,redirect:'error',signal:combined});
   if(response.ok)return;
  }catch{}
  if(attempt+1<attempts)await delay(retryMs,undefined,{signal});
 }
 throw new Error('Backup monitor delivery failed');
}
