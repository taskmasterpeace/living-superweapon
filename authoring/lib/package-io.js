// Reading and writing packages on disk. A package is one directory holding manifest.json plus
// its flat outputs. Writes are atomic per package: everything is staged beside the destination
// and swapped in only after validation, so a failed build never replaces a valid package.
import {readFile,writeFile,mkdir,readdir,rm,rename,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {OUTPUT_ROOT,resolveWithin,toPosix} from './paths.js';
import {sha256,packageHashOf} from './hash.js';
import {validateManifest,validatePoseBank,validateCatalogIds} from './validate.js';

export const packageDir=(id,version,root=OUTPUT_ROOT)=>resolve(root,id,`v${version}`);
export async function readPackage(dir){
 const manifest=JSON.parse(await readFile(join(dir,'manifest.json'),'utf8'));
 return {dir,manifest};
}
// Full check of a package directory: manifest rules, output presence + hashes, pose-bank content.
export async function checkPackage(dir){
 let manifest;
 try{manifest=JSON.parse(await readFile(join(dir,'manifest.json'),'utf8'));}
 catch(e){return {ok:false,errors:[{code:'shape',path:'manifest.json',message:`unreadable manifest: ${e.message}`}],warnings:[],manifest:null};}
 const report=validateManifest(manifest);
 const errors=[...report.errors],warnings=[...report.warnings];
 if(Array.isArray(manifest.outputs))for(const [i,o] of manifest.outputs.entries()){
  if(!o||typeof o.path!=='string')continue;
  let file;try{file=resolveWithin(dir,o.path);}catch{continue;}
  let bytes;
  try{bytes=await readFile(file);}catch{errors.push({code:'outputs',path:`$.outputs[${i}]`,message:`output file missing: ${o.path}`});continue;}
  if(sha256(bytes)!==o.sha256)errors.push({code:'hash',path:`$.outputs[${i}].sha256`,message:`hash mismatch for ${o.path}`});
  if(bytes.length!==o.bytes)errors.push({code:'outputs',path:`$.outputs[${i}].bytes`,message:`size mismatch for ${o.path}`});
  if(o.role==='pose-bank'){
   try{const bank=JSON.parse(bytes.toString('utf8'));const r=validatePoseBank(bank,manifest);errors.push(...r.errors);}
   catch(e){errors.push({code:'nan-frame',path:`$.outputs[${i}]`,message:`pose bank is not valid JSON: ${e.message}`});}
  }
 }
 return {ok:errors.length===0,errors,warnings,manifest};
}
export async function listPackages(root=OUTPUT_ROOT){
 const out=[];
 let ids=[];try{ids=await readdir(root,{withFileTypes:true});}catch{return out;}
 for(const id of ids){
  if(!id.isDirectory())continue;
  for(const v of await readdir(join(root,id.name),{withFileTypes:true})){
   if(!v.isDirectory()||!/^v\d+$/.test(v.name))continue;
   out.push(join(root,id.name,v.name));
  }
 }
 return out.sort();
}
export async function checkCatalog(root=OUTPUT_ROOT){
 const dirs=await listPackages(root),packages=[];
 for(const dir of dirs)packages.push({dir:toPosix(dir),...(await checkPackage(dir))});
 const ids=validateCatalogIds(packages.filter(p=>p.manifest).map(p=>p.manifest));
 return {ok:packages.every(p=>p.ok)&&ids.ok,packages,catalogErrors:ids.errors};
}
// Stage outputs, validate the staged package, then swap. `outputs` is [{path, role, bytes}].
export async function commitPackage(manifest,outputs,root=OUTPUT_ROOT){
 const finalDir=packageDir(manifest.id,manifest.version,root),staging=finalDir+'.staging',old=finalDir+'.previous';
 await rm(staging,{recursive:true,force:true});await mkdir(staging,{recursive:true});
 const recorded=[];
 for(const o of outputs){
  const file=resolveWithin(staging,o.path);await writeFile(file,o.bytes);
  recorded.push({path:o.path,role:o.role,sha256:sha256(o.bytes),bytes:o.bytes.length});
 }
 const full={...manifest,outputs:recorded};full.packageHash=packageHashOf(full);
 await writeFile(join(staging,'manifest.json'),JSON.stringify(full,null,1)+'\n');
 const check=await checkPackage(staging);
 if(!check.ok){
  await rm(staging,{recursive:true,force:true});
  // Leave no empty <id>/ directory behind when this was the first attempt at that id.
  try{if(!(await readdir(resolve(finalDir,'..'))).length)await rm(resolve(finalDir,'..'),{recursive:true,force:true});}catch{}
  const err=new Error('package failed validation; previous package untouched');err.report=check;throw err;
 }
 let hadPrevious=false;try{await stat(finalDir);hadPrevious=true;}catch{}
 await rm(old,{recursive:true,force:true});
 if(hadPrevious)await rename(finalDir,old);
 await rename(staging,finalDir);
 await rm(old,{recursive:true,force:true});
 return {dir:finalDir,manifest:full,report:check};
}
export async function writeCatalog(root=OUTPUT_ROOT){
 const {packages,ok,catalogErrors}=await checkCatalog(root);
 const entries=packages.filter(p=>p.manifest).map(p=>{
  const m=p.manifest,clips=m.clips||[];
  // Posture is catalog-level information: which clips hold or leave the ground, and how.
  const byCategory={},postures={prone:[],supine:[],'get-up':[],fall:[],knockdown:[]};
  for(const c of clips){if(c.category)(byCategory[c.category]??=[]).push(c.id);
   if(c.posture?.start==='prone'||c.posture?.end==='prone')postures.prone.push(c.id);
   if(c.posture?.start==='supine'||c.posture?.end==='supine')postures.supine.push(c.id);
   if(c.category==='get-up')postures['get-up'].push(c.id);if(c.category==='fall')postures.fall.push(c.id);if(c.category==='knockdown')postures.knockdown.push(c.id);}
  return {id:m.id,version:m.version,kind:m.kind,displayName:m.displayName,tags:m.tags||[],
   dir:toPosix(p.dir).split('public/authored-assets/')[1],packageHash:m.packageHash,ok:p.ok,errors:p.errors.length,license:m.provenance?.license,adapter:m.source?.adapter,
   acceptance:{structural:p.ok?'pass':'fail',visual:m.acceptance?.visual??'unapproved',blockers:(m.acceptance?.blockers||[]).map(b=>b.id)},
   ...(clips.length?{clipCategories:byCategory,postures}:{})};
 });
 const catalog={format:'pw-asset-catalog',formatVersion:1,ok,packages:entries,catalogErrors};
 await mkdir(root,{recursive:true});
 await writeFile(join(root,'catalog.json'),JSON.stringify(catalog,null,1)+'\n');
 return catalog;
}
