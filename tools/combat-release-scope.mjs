import {readFile,writeFile,access} from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

// Read-only source dependency inventory. This is not a bundler or an acceptance
// test: computed imports, public URLs and runtime-created assets are not covered.
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
const tracked=new Set(git('ls-files','--','src').split('\n'));
const roots=['src/boot.js','src/engine/game.js','src/engine/entity.js','src/engine/world.js','src/engine/pwTitle.js'];
const imports=text=>[...text.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"]([^'"]+)['"]/g)].map(m=>m[1]).filter(s=>s.startsWith('.'));
const resolve=(file,spec)=>path.posix.normalize(path.posix.join(path.posix.dirname(file),spec));
const edges=[],missing=[],seen=new Set();
async function visit(file){
 if(seen.has(file))return;seen.add(file);
 let source;try{source=await readFile(file,'utf8');}catch{missing.push(file);return;}
 if(!/\.(?:m?js|ts)$/.test(file))return;
 for(const spec of imports(source)){
  const target=resolve(file,spec);edges.push({from:file,to:target,tracked:tracked.has(target)});await visit(target);
 }
}
for(const root of roots)await visit(root);
const baselineUntrackedReferences=[];
for(const root of roots){
 const source=git('show','HEAD:'+root);
 for(const spec of imports(source)){
  const target=resolve(root,spec);
  if(!tracked.has(target)){let exists=true;try{await access(target);}catch{exists=false;}baselineUntrackedReferences.push({from:root,to:target,presentInWorktree:exists});}
 }
}
const result={head:git('rev-parse','HEAD'),branch:git('branch','--show-current'),roots,
 limitation:'Literal relative source imports only. No intent classification, public asset validation, computed imports or runtime acceptance.',
 filesVisited:seen.size,missing:[...new Set(missing)],baselineUntrackedReferences,
 untrackedDependencies:[...new Set(edges.filter(e=>!e.tracked).map(e=>e.to))].sort(),
 directUntrackedEdges:edges.filter(e=>!e.tracked)};
await writeFile('artifacts/issue-drafts/combat-release-dependencies.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({head:result.head,filesVisited:result.filesVisited,missing:result.missing,baselineUntrackedReferences,untrackedDependencies:result.untrackedDependencies},null,2));
