import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
async function hashFile(file,signal){
 const hash=createHash('sha256'),stream=createReadStream(file,{signal});
 for await(const bytes of stream)hash.update(bytes);
 return hash.digest('hex');
}
export async function ensureState(source,stateDir){
 source=path.resolve(source);stateDir=path.resolve(stateDir);
 if(stateDir!==path.join(source,'.external-backup'))throw new Error('Invalid backup state directory');
 const src=await fs.lstat(source);if(!src.isDirectory()||src.isSymbolicLink())throw new Error('Invalid source directory');
 await fs.mkdir(stateDir,{mode:0o700}).catch(e=>{if(e.code!=='EEXIST')throw e;});
 const info=await fs.lstat(stateDir);if(!info.isDirectory()||info.isSymbolicLink())throw new Error('Invalid state directory');
 const marker=path.join(stateDir,'.byleticia-backup-v1');
 try{if(await fs.readFile(marker,'utf8')!=='byleticia-v1\n')throw new Error('Invalid state marker');}
 catch(e){if(e.code!=='ENOENT')throw e;if((await fs.readdir(stateDir)).length)throw new Error('State directory is not owned by backup');await fs.writeFile(marker,'byleticia-v1\n',{flag:'wx',mode:0o600});}
 await fs.chmod(stateDir,0o700);return stateDir;
}
async function filesUnder(root,relative='',signal){
 signal?.throwIfAborted();const result=[];
 for(const item of await fs.readdir(path.join(root,relative),{withFileTypes:true})){
  const name=path.join(relative,item.name),stat=await fs.lstat(path.join(root,name));
  if(stat.isSymbolicLink())throw new Error('Backup rejects symbolic links');
  if(stat.isDirectory())result.push(...await filesUnder(root,name,signal));
  else if(stat.isFile())result.push(name);
  else throw new Error('Backup rejects special files');
 }
 return result.sort();
}
async function jsonFiles(source,signal){
 const names=(await fs.readdir(source)).filter(name=>name.endsWith('.json')).sort();
 for(const name of ['articles.json','site-config.json'])if(!names.includes(name))throw new Error('Backup source missing required JSON files');
 const result=[];
 for(const name of names){
  const file=path.join(source,name),stat=await fs.lstat(file);
  if(!stat.isFile()||stat.isSymbolicLink())throw new Error('Backup rejects symbolic or special JSON files');
  const bytes=await fs.readFile(file,{signal});JSON.parse(bytes.toString('utf8'));result.push({name,bytes,sha256:digest(bytes)});
 }
 return result;
}
export async function captureData(source,stateDir,{signal,now=new Date()}={}){
 source=path.resolve(source);await ensureState(source,stateDir);const capture=path.join(stateDir,'capture');
 for(let attempt=0;attempt<3;attempt++){
  signal?.throwIfAborted();
  // Only the owned staging directory is removed. JSON originals are read-only;
  // completed uploads are immutable in the app and can be hardlinked privately.
  await fs.rm(capture,{recursive:true,force:true});await fs.mkdir(capture,{mode:0o700});await fs.mkdir(path.join(capture,'data','uploads'),{recursive:true,mode:0o700});
  const before=await jsonFiles(source,signal);
  for(const row of before)await fs.writeFile(path.join(capture,'data',row.name),row.bytes,{mode:0o600,signal});
  let media=[];
  try{const info=await fs.lstat(path.join(source,'uploads'));if(!info.isDirectory()||info.isSymbolicLink())throw new Error('Backup rejects symbolic uploads directory');media=await filesUnder(path.join(source,'uploads'),'',signal);}
  catch(e){if(e.code!=='ENOENT')throw e;}
  const manifest=[];
  for(const name of media){
   signal?.throwIfAborted();const src=path.join(source,'uploads',name),dst=path.join(capture,'data','uploads',name);
   const stat=await fs.lstat(src);if(!stat.isFile()||stat.isSymbolicLink())throw new Error('Backup rejects symbolic or special media');
   await fs.mkdir(path.dirname(dst),{recursive:true,mode:0o700});
   try{await fs.link(src,dst);}catch(e){if(!['EXDEV','EPERM','EOPNOTSUPP'].includes(e.code))throw e;await fs.copyFile(src,dst);}
   const sha256=await hashFile(dst,signal),after=await fs.lstat(src);
   if(after.isSymbolicLink()||stat.size!==after.size||stat.mtimeMs!==after.mtimeMs||stat.ino!==after.ino)throw new Error('Media changed during capture');
   manifest.push({path:'uploads/'+name.split(path.sep).join('/'),bytes:stat.size,sha256});
  }
  const after=await jsonFiles(source,signal);
  if(JSON.stringify(before.map(x=>[x.name,x.sha256]))!==JSON.stringify(after.map(x=>[x.name,x.sha256])))continue;
  for(const row of before)manifest.push({path:row.name,bytes:row.bytes.length,sha256:row.sha256});
  const result={version:1,createdAt:now.toISOString(),files:manifest.sort((a,b)=>a.path.localeCompare(b.path))};
  await fs.writeFile(path.join(capture,'manifest.json'),JSON.stringify(result,null,2)+'\n',{mode:0o600,signal});return capture;
 }
 throw new Error('JSON files changed repeatedly during capture');
}
export async function verifyCapture(capture,{signal}={}){
 const manifest=JSON.parse(await fs.readFile(path.join(capture,'manifest.json'),{encoding:'utf8',signal}));
 if(manifest.version!==1||!Array.isArray(manifest.files)||!manifest.files.length)throw new Error('Invalid integrity manifest');
 const expected=[];
 for(const entry of manifest.files){
  if(typeof entry.path!=='string'||entry.path.includes('\\')||path.posix.isAbsolute(entry.path)||entry.path.split('/').some(x=>!x||x==='.'||x==='..')||!/^[a-f0-9]{64}$/.test(entry.sha256)||!Number.isSafeInteger(entry.bytes)||entry.bytes<0)throw new Error('Invalid integrity manifest entry');
  expected.push(entry.path);
 }
 if(new Set(expected).size!==expected.length)throw new Error('Duplicate integrity paths');
 const actual=await filesUnder(path.join(capture,'data'),'',signal);
 if(JSON.stringify([...expected].sort())!==JSON.stringify(actual.map(x=>x.split(path.sep).join('/')).sort()))throw new Error('File inventory integrity mismatch');
 for(const entry of manifest.files){const file=path.join(capture,'data',entry.path),stat=await fs.lstat(file);if(stat.size!==entry.bytes||await hashFile(file,signal)!==entry.sha256)throw new Error('File integrity mismatch');}
 return manifest;
}
