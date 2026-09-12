import {readdir,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

// A commit alone is insufficient while testing a shared dirty worktree.
// Record each runtime source file as well as HEAD, without staging anything.
export async function captureProvenance(){
 const files=[];
 async function walk(dir){
  for(const entry of await readdir(dir,{withFileTypes:true})){
   const path=dir+'/'+entry.name;
   if(entry.isDirectory())await walk(path);
   else if(entry.isFile())files.push({path,sha256:createHash('sha256').update(await readFile(path)).digest('hex')});
  }
 }
 await walk('src');files.sort((a,b)=>a.path.localeCompare(b.path));
 return {capturedAt:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  scope:'src files only; assets, dependencies and browser settings are not included',
  sourceDigest:createHash('sha256').update(JSON.stringify(files)).digest('hex'),files};
}
