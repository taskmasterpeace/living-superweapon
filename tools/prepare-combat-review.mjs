import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

// Copy an explicit review layer without staging, deleting or modifying the
// source checkout. Wider-slice dependencies are included for honest validation,
// not silently classified as #14–16 changes.
const source=process.cwd(),target=path.resolve(source,'.worktrees/combat-release-review');
const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','ignore']});
if(git(target,'branch','--show-current').trim()!=='codex/combat-release-review')throw Error('Unexpected review branch');
const list=(...args)=>git(source,...args).split('\0').filter(Boolean);
const changed=list('diff','--name-only','-z','HEAD','--','src','tools','public','authoring');
const added=list('ls-files','--others','--exclude-standard','-z','--','src','tools','public','authoring');
const chosen=[...new Set([...changed,...added])].filter(file=>
 file.startsWith('src/')||file.startsWith('public/')||file.startsWith('authoring/')||
 (file.startsWith('tools/')&&/\.(?:mjs|js|json|py)$/.test(file)&&!file.includes('__pycache__')));
const manifest={createdAt:new Date().toISOString(),sourceHead:git(source,'rev-parse','HEAD').trim(),
 reviewHead:git(target,'rev-parse','HEAD').trim(),target,limitation:'Review overlay includes wider-slice prerequisites; not staged or release-approved.',files:[]};
for(const file of chosen){
 const from=path.resolve(source,file),to=path.resolve(target,file);
 if(!from.startsWith(source+path.sep)||!to.startsWith(target+path.sep))throw Error('Path outside checkout: '+file);
 const bytes=await readFile(from);const sha256=createHash('sha256').update(bytes).digest('hex');
 let same=false;try{same=bytes.equals(await readFile(to));}catch{}
 if(!same){await mkdir(path.dirname(to),{recursive:true});await copyFile(from,to);}
 manifest.files.push({path:file,sha256,bytes:bytes.length,copied:!same});
}
await writeFile('artifacts/issue-drafts/combat-review-overlay.json',JSON.stringify(manifest,null,2));
console.log(JSON.stringify({target,sourceHead:manifest.sourceHead,reviewHead:manifest.reviewHead,files:manifest.files.length,copied:manifest.files.filter(f=>f.copied).length}));
