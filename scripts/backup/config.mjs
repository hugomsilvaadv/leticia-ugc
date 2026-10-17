import path from 'node:path';
function integer(env,name,fallback,min=0,max=3650){
 const raw=env[name]??String(fallback);if(!/^\d+$/.test(raw))throw new Error(`Invalid ${name}`);
 const number=Number(raw);if(number<min||number>max)throw new Error(`Invalid ${name}`);return number;
}
function required(env,name){if(typeof env[name]!=='string'||!env[name].trim())throw new Error(`Missing ${name}`);return env[name];}
export function loadBackupConfig(env=process.env){
 if(!env.BACKUP_ENABLED||env.BACKUP_ENABLED==='0')return null;
 if(env.BACKUP_ENABLED!=='1')throw new Error('Invalid BACKUP_ENABLED');
 const account=required(env,'BACKUP_R2_ACCOUNT_ID'),bucket=required(env,'BACKUP_R2_BUCKET'),prefix=env.BACKUP_R2_PREFIX||'byleticia';
 if(!/^[a-f0-9]{32}$/.test(account)||!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket)||!prefix.split('/').every(x=>/^[a-zA-Z0-9_-]+$/.test(x)))throw new Error('Invalid R2 configuration');
 const jurisdiction=env.BACKUP_R2_JURISDICTION||'';if(!['','eu','fedramp'].includes(jurisdiction))throw new Error('Invalid R2 jurisdiction');
 const monitorUrl=required(env,'BACKUP_MONITOR_URL');let monitor;try{monitor=new URL(monitorUrl);}catch{throw new Error('Invalid monitor URL');}
 if(monitor.protocol!=='https:'||monitor.username||monitor.password||monitor.hash)throw new Error('Monitor must use HTTPS');
 const runAt=env.BACKUP_RUN_AT_UTC||'03:00';if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(runAt))throw new Error('Invalid BACKUP_RUN_AT_UTC');
 const host=env.BACKUP_HOST||'byleticia-production';if(!/^[a-zA-Z0-9_-]{1,80}$/.test(host))throw new Error('Invalid backup host');
 const source=path.resolve(env.CONTENT_DATA_DIR||'/data');if(source==='/')throw new Error('Invalid source');
 return {source,stateDir:path.join(source,'.external-backup'),repository:`s3:https://${account}${jurisdiction?'.'+jurisdiction:''}.r2.cloudflarestorage.com/${bucket}/${prefix}`,accessKey:required(env,'AWS_ACCESS_KEY_ID'),secretKey:required(env,'AWS_SECRET_ACCESS_KEY'),password:required(env,'RESTIC_PASSWORD'),monitorUrl,binary:env.RESTIC_BINARY||'restic',runAt,host,tag:'byleticia-v1',keepDaily:integer(env,'BACKUP_KEEP_DAILY',7),keepWeekly:integer(env,'BACKUP_KEEP_WEEKLY',4),keepMonthly:integer(env,'BACKUP_KEEP_MONTHLY',0),pruneDay:integer(env,'BACKUP_PRUNE_DAY_UTC',0,0,6),timeoutMs:integer(env,'BACKUP_TIMEOUT_SECONDS',3600,60,21600)*1000,uploadLimit:integer(env,'BACKUP_UPLOAD_KIB',4096,1,1048576),downloadLimit:integer(env,'BACKUP_DOWNLOAD_KIB',8192,1,1048576)};
}
