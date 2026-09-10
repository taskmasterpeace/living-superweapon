#!/usr/bin/env node
// pw-author — the one command an author runs. Every subcommand is repeatable and reads only
// committed recipes plus pinned, hashed sources.
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {resolve,join,relative} from 'node:path';
import {REPO_ROOT,AUTHORING_ROOT,OUTPUT_ROOT,toPosix} from '../lib/paths.js';
import {checkPackage,checkCatalog,writeCatalog} from '../lib/package-io.js';
import {measureBaseline} from '../lib/baseline.js';

const [command,...rest]=process.argv.slice(2);
const flags=new Set(rest.filter(a=>a.startsWith('--')));
const args=rest.filter(a=>!a.startsWith('--'));
const log=line=>console.log(line);
const usage=`pw-author <command>
  baseline              measure production assets → authoring/baseline/production-baseline.json
  build [recipe...]     build recipes (default: every authoring/recipes/**/recipe.json) [--force] [--mobile]
  validate [dir...]     validate package directories (default: every package under public/authored-assets)
  catalog               rewrite public/authored-assets/catalog.json from the packages on disk
  report                write authoring/artifacts/report.json and print a summary
  fixtures              regenerate authoring/fixtures from authoring/fixtures/make-fixtures.mjs`;

async function findRecipes(dir=join(AUTHORING_ROOT,'recipes')){
 const out=[];
 let entries=[];try{entries=await readdir(dir,{withFileTypes:true});}catch{return out;}
 for(const e of entries){
  const p=join(dir,e.name);
  if(e.isDirectory())out.push(...await findRecipes(p));
  else if(e.name==='recipe.json')out.push(toPosix(relative(REPO_ROOT,p)));
 }
 return out.sort();
}
function printReport(name,report){
 log(`${report.ok?'PASS':'FAIL'} ${name}`);
 for(const e of report.errors)log(`  [${e.code}] ${e.path}: ${e.message}`);
 for(const w of report.warnings||[])log(`  warn ${w.path}: ${w.message}`);
}
switch(command){
 case 'baseline':{
  const baseline=await measureBaseline();
  await mkdir(join(AUTHORING_ROOT,'baseline'),{recursive:true});
  await writeFile(join(AUTHORING_ROOT,'baseline','production-baseline.json'),JSON.stringify(baseline,null,1)+'\n');
  for(const [cls,c] of Object.entries(baseline.classes))log(`${cls}: ${c.count} samples, max triangles ${c.max.triangles}, max bytes ${c.max.bytes}, max draw calls ${c.max.drawCalls}`);
  break;
 }
 case 'build':{
  const {buildAll}=await import('../lib/build.js');
  const recipes=args.length?args:await findRecipes();
  if(!recipes.length){log('no recipes found under authoring/recipes');break;}
  const results=await buildAll(recipes,{log,force:flags.has('--force'),profile:flags.has('--mobile')?'mobile':'desktop'});
  const failed=results.filter(r=>r.failed);
  log(`${results.length-failed.length} built/unchanged, ${failed.length} failed`);
  if(failed.length)process.exitCode=1;
  break;
 }
 case 'validate':{
  let ok=true;
  if(args.length){for(const dir of args){const r=await checkPackage(resolve(REPO_ROOT,dir));printReport(dir,r);ok&&=r.ok;}}
  else{const c=await checkCatalog();for(const p of c.packages)printReport(toPosix(relative(REPO_ROOT,p.dir)),p);for(const e of c.catalogErrors)log(`  [${e.code}] ${e.path}: ${e.message}`);ok=c.ok;log(`${c.packages.length} packages, ${c.ok?'all valid':'FAILURES'}`);}
  if(!ok)process.exitCode=1;
  break;
 }
 case 'catalog':{
  const catalog=await writeCatalog();
  log(`catalog: ${catalog.packages.length} packages, ok=${catalog.ok}`);
  break;
 }
 case 'report':{
  const c=await checkCatalog();
  // The fixture board: every deliberately broken package and the single code it fails with.
  const fixtures=[];
  for(const group of ['valid','invalid']){
   let names=[];try{names=await readdir(join(AUTHORING_ROOT,'fixtures',group),{withFileTypes:true});}catch{}
   for(const e of names){
    if(!e.isDirectory())continue;
    const dir=group==='valid'?join(AUTHORING_ROOT,'fixtures',group,e.name,'v1'):join(AUTHORING_ROOT,'fixtures',group,e.name);
    const r=await checkPackage(dir);
    fixtures.push({group,name:e.name,ok:r.ok,codes:[...new Set(r.errors.map(x=>x.code))],errors:r.errors});
   }
  }
  const report={generated:'repeatable',catalog:c.ok,packages:c.packages.map(p=>({dir:toPosix(relative(REPO_ROOT,p.dir)),ok:p.ok,errors:p.errors,warnings:p.warnings,id:p.manifest?.id,version:p.manifest?.version,kind:p.manifest?.kind,budgets:p.manifest?.budgets,packageHash:p.manifest?.packageHash})),fixtures};
  await mkdir(join(AUTHORING_ROOT,'artifacts'),{recursive:true});
  await writeFile(join(AUTHORING_ROOT,'artifacts','report.json'),JSON.stringify(report,null,1)+'\n');
  for(const p of report.packages)log(`${p.ok?'PASS':'FAIL'} ${p.id}@${p.version} ${p.kind} tris=${p.budgets?.measured.triangles} bytes=${p.budgets?.measured.bytes}`);
  log(`report → authoring/artifacts/report.json`);
  if(!c.ok)process.exitCode=1;
  break;
 }
 case 'fixtures':{
  await import('../fixtures/make-fixtures.mjs');
  break;
 }
 default:
  log(usage);if(command)process.exitCode=2;
}
