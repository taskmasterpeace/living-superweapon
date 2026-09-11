// Serial browser/GPU lane; keep complete command output beside the compact ledger.
import {spawnSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const sculpt=process.argv.includes('--sculpt'),hover=process.argv.includes('--hover'),skin=process.argv.includes('--skin'),heavy=process.argv.includes('--heavy');
const out=`artifacts/${heavy?'heavy-strikes':skin?'hero-skin':hover?'hero-hover':sculpt?'hero-sculpt':'strikes'}/verification`;await mkdir(out,{recursive:true});
let rows=[];
const gates=skin?['test:hero-skin','test:hero-hover','test:studio-inspection','test:studio','test:studio-layout','test:progression','test:blocking','test:strike-animation','test:poses','test:impacts','test:melee-depth','test:locomotion','test:flight','test:flight-languages','test:camera','test:character-packages','test:combat','build']:hover?['test:hero-hover','test:studio-inspection','test:studio','test:studio-layout','test:progression','test:blocking','test:strike-animation','test:poses','test:flight','test:flight-languages','test:camera','test:character-packages','test:combat','build']:sculpt?['test:hero-sculpt','test:strike-animation','test:poses','test:impacts','test:blocking','test:melee-depth','test:locomotion','test:character-packages','test:flight','test:flight-languages','test:camera','test:combat','build']:['test:strike-animation','test:poses','test:impacts','test:blocking','test:melee-depth','test:locomotion','test:character-packages','test:combat','build'];
// Use --from only after a test-only correction; production changes require a fresh run.
const from=process.argv.find(arg=>arg.startsWith('--from='))?.slice(7),index=from?gates.indexOf(from):0;
if(index<0)throw new Error(`Unknown gate: ${from}`);
if(from){
 rows=JSON.parse(await readFile(`${out}/results.json`,'utf8')).slice(0,index);
 if(rows.length!==index||rows.some((r,i)=>r.command!==`npm run ${gates[i]}`||r.exitCode!==0))throw new Error('Earlier gates must all have passed before resuming.');
}
for(const name of gates.slice(index)){
 console.log(`RUN ${name}`);const start=Date.now();
 const result=spawnSync(process.platform==='win32'?'cmd.exe':'sh',process.platform==='win32'?['/d','/s','/c',`npm run ${name}`]:['-c',`npm run ${name}`],{encoding:'utf8',maxBuffer:32*1024*1024});
 const log=`${out}/${name.replaceAll(':','-')}.log`;await writeFile(log,(result.stdout||'')+(result.stderr||''));
 const row={command:`npm run ${name}`,exitCode:result.status,seconds:(Date.now()-start)/1000,log};rows.push(row);
 await writeFile(`${out}/results.json`,JSON.stringify(rows,null,2));console.log(JSON.stringify(row));
 if(result.status!==0){console.error(result.error||(result.stderr||result.stdout).slice(-6000));process.exitCode=1;break;}
}
