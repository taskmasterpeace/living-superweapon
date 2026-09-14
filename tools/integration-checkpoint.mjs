import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
const root=process.cwd(),out=resolve(process.argv[2]||'artifacts/integration-checkpoint');
mkdirSync(out,{recursive:true});
const git=(cwd,args)=>execFileSync('git',args,{cwd,maxBuffer:256*1024*1024});
const worktrees=git(root,['worktree','list','--porcelain']).toString().trim().split(/\r?\n\r?\n/).map(block=>Object.fromEntries(block.split(/\r?\n/).map(line=>{const i=line.indexOf(' ');return i<0?[line,true]:[line.slice(0,i),line.slice(i+1)];})));
const manifest={createdAt:new Date().toISOString(),integrationHead:git(root,['rev-parse','HEAD']).toString().trim(),note:'Tracked changes are saved as binary patches. Untracked files are inventoried, not copied; source worktrees remain untouched. Bundle preserves committed refs.',worktrees:[]};
for(let i=0;i<worktrees.length;i++){
 const w=worktrees[i],dir=join(out,String(i).padStart(2,'0'));mkdirSync(dir,{recursive:true});
 writeFileSync(join(dir,'working.patch'),git(w.worktree,['diff','--binary']));
 writeFileSync(join(dir,'index.patch'),git(w.worktree,['diff','--cached','--binary']));
 const untracked=git(w.worktree,['ls-files','--others','--exclude-standard','-z']).toString().split('\0').filter(Boolean);
 writeFileSync(join(dir,'untracked.json'),JSON.stringify(untracked,null,2));
 manifest.worktrees.push({...w,checkpoint:dir,untrackedCount:untracked.length,trackedStatus:git(w.worktree,['status','--short','--untracked-files=no']).toString()});
}
writeFileSync(join(out,'manifest.json'),JSON.stringify(manifest,null,2));
const refs=process.argv.slice(3);
try { git(root,['bundle','create',join(out,'committed-refs.bundle'),...(refs.length?refs:['--all'])]); manifest.bundle={ok:true,refs:refs.length?refs:['--all']}; }
catch(error) { manifest.bundle={ok:false,error:String(error.stderr||error)}; process.exitCode=1; }
writeFileSync(join(out,'manifest.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify({out,worktrees:manifest.worktrees.length,dirty:manifest.worktrees.filter(w=>w.trackedStatus).map(w=>w.worktree)},null,2));
