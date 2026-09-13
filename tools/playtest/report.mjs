import {readdir,readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const json=async file=>{try{return JSON.parse(await readFile(file,'utf8'));}catch{return null;}};
export async function collectRuns(root){
 let dirs;try{dirs=await readdir(root,{withFileTypes:true});}catch(e){if(e.code==='ENOENT')return {version:1,runs:[]};throw e;}
 const runs=[];
 for(const d of dirs.filter(d=>d.isDirectory()).sort((a,b)=>b.name.localeCompare(a.name))){
  const dir=path.join(root,d.name),run=await json(path.join(dir,'run.json'));if(!run)continue;
  const result=await json(path.join(dir,'result.json')),snapshot=await json(path.join(dir,'observed-state.json')),files=await readdir(dir),actions=result?.actions??snapshot?.actions??[],warnings=[];
  if(run.status==='passed'&&result?.passed!==true)warnings.push('Passing metadata lacks an explicit passing result');
  if(result?.errors?.length)warnings.push('Result contains browser errors');
  const scheme=run.config?.scheme??(run.scheme?.includes('touch')?'touch':run.scheme?.includes('gamepad')?'pad':'kbm');
  if(actions.some(a=>a.scheme!==scheme))warnings.push('Recorded combat inputs differ from requested scheme');
  if(actions.some(a=>a.status!=='dispatched'||!a.released))warnings.push('Action failed or release was not confirmed');
  if(!actions.length)warnings.push('No shared action history; native input coverage not established by this report');
  if(!run.serverRevisionVerified)warnings.push('Server checkout was not verified');
  if(run.status==='running')warnings.push('Recorded running status is not evidence that a process is still alive');
  runs.push({directory:dir,scenario:run.scenario,scheme,recordedStatus:run.status,startedAt:run.startedAt,revision:run.runnerRevision,trackedChanges:run.trackedChanges,staged:run.staged,scope:result?.staging??run.staging??null,warnings,error:run.error?.message??null,artifacts:files.filter(f=>/\.(json|png|webm|mp4)$/.test(f)).map(f=>path.join(dir,f))});
 }
 return {version:1,scope:'Historical local evidence, not current-build acceptance or physical-device certification. Warnings qualify recorded pass labels.',runs};
}
export async function writeReport(root){await mkdir(root,{recursive:true});const report=await collectRuns(root);const target=path.join(root,'report.json');await writeFile(target,JSON.stringify(report,null,2));return {path:target,count:report.runs.length,warnings:report.runs.filter(r=>r.warnings.length).length};}
