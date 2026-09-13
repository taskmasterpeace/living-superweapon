import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {realpath} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const exec=promisify(execFile);
export async function checkoutIdentity(root){
 const worktree=await realpath(root),git=async(...args)=>(await exec('git',args,{cwd:worktree,maxBuffer:32*1024*1024})).stdout;
 const [revision,diff]=await Promise.all([git('rev-parse','HEAD'),git('diff','HEAD','--binary')]);
 return {version:1,worktree,revision:revision.trim(),trackedDiffHash:createHash('sha256').update(diff).digest('hex')};
}
export function assertSameCheckout(expected,actual){
 const normalize=p=>process.platform==='win32'?p.replaceAll('\\','/').toLowerCase():p;
 if(actual?.version!==1||typeof actual.worktree!=='string'||normalize(expected.worktree)!==normalize(actual.worktree)||expected.revision!==actual.revision||expected.trackedDiffHash!==actual.trackedDiffHash)
  throw new Error('Playtest server checkout mismatch. Start the dev server from this worktree; no scenario was accepted.');
 return actual;
}
export function playtestIdentityPlugin(readIdentity=checkoutIdentity){
 return {name:'powerworld-local-playtest-identity',apply:'serve',configureServer(server){
  server.middlewares.use(async(req,res,next)=>{
   if(req.url!=='/__pw_playtest_identity')return next();
   const peer=req.socket.remoteAddress;
   if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(peer)){res.statusCode=403;res.end();return;}
   if(req.method!=='GET'){res.statusCode=405;res.end();return;}
   res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');
   try{res.end(JSON.stringify(await readIdentity(server.config.root)));}
   catch{res.statusCode=503;res.end(JSON.stringify({error:'Checkout identity unavailable'}));}
  });
 }};
}
