import {scenarios,selectScenario,validateResult} from './scenarios.mjs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
const args=process.argv.slice(2);
if(args.length===1&&args[0]==='--list'){
 console.log(JSON.stringify({version:1,scheme:'keyboard/mouse',server:'http://127.0.0.1:5184',staged:true,scenarios},null,2));
}else{
 if(args.length!==2||args[0]!=='--scenario')throw new Error('Usage: node tools/playtest/run.mjs --list | --scenario <id>');
 const id=args[1],scenario=selectScenario(id),root=fileURLToPath(new URL('../../',import.meta.url));
 process.chdir(root);
 const out=path.join(root,'artifacts/playtest',new Date().toISOString().replaceAll(':','-')+'-'+id);await mkdir(out,{recursive:true});
 const git=(...a)=>execFileSync('git',a,{cwd:root,encoding:'utf8'}).trim();
 const metadata={version:1,scenario:id,startedAt:new Date().toISOString(),runnerRevision:git('rev-parse','HEAD'),runnerWorktree:root,trackedChanges:git('diff','--name-only'),server:'http://127.0.0.1:5184',serverRevisionVerified:false,scheme:'keyboard/mouse',staged:true,capture:scenario.capture};
 process.env.PW_PLAYTEST_OUT=out;
 await writeFile(path.join(out,'run.json'),JSON.stringify({...metadata,status:'running'},null,2));
 console.log('Evidence: '+out);
 try{
  await import(pathToFileURL(path.join(root,'tools',scenario.script)));
  const result=validateResult(JSON.parse(await readFile(path.join(out,'result.json'),'utf8')));
  await writeFile(path.join(out,'run.json'),JSON.stringify({...metadata,status:'passed',finishedAt:new Date().toISOString(),staging:result.staging},null,2));
  console.log('PASS '+id);
 }catch(error){
  await writeFile(path.join(out,'run.json'),JSON.stringify({...metadata,status:'failed',finishedAt:new Date().toISOString(),error:{message:error.message,stack:error.stack}},null,2));
  console.error('FAIL '+id+': '+error.message);process.exitCode=1;
 }
}
