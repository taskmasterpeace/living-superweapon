// One serial browser/GPU lane, durable logs and no hidden retries.
import {spawnSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const out='artifacts/arena-defense-verification';await mkdir(out,{recursive:true});
const gates=['test:arena-defense','test:close-camera','test:camera','test:blocking','test:melee-depth','test:strike-animation','test:poses','test:impacts','test:hero-skin','test:character-packages','test:flight','test:combat','build'];
const from=process.argv.find(a=>a.startsWith('--from='))?.slice(7),index=from?gates.indexOf(from):0;
if(index<0)throw Error('Unknown verification gate');
let rows=from?JSON.parse(await readFile(`${out}/results.json`,'utf8')).slice(0,index):[];
if(from&&(rows.length!==index||rows.some((r,i)=>r.command!==gates[i]||r.exitCode!==0)))throw Error('Earlier gates must pass first; resume only for test-only corrections.');
for(const command of gates.slice(index)){
 console.log(`RUN ${command}`);const start=Date.now();
 const r=spawnSync(process.platform==='win32'?'cmd.exe':'sh',process.platform==='win32'?['/d','/s','/c',`npm run ${command}`]:['-c',`npm run ${command}`],{encoding:'utf8',maxBuffer:32*1024*1024});
 const log=`${out}/${command.replaceAll(':','-')}.log`;await writeFile(log,(r.stdout||'')+(r.stderr||''));
 const row={command,exitCode:r.status,seconds:(Date.now()-start)/1000,log};rows.push(row);await writeFile(`${out}/results.json`,JSON.stringify(rows,null,2));console.log(JSON.stringify(row));
 if(r.status!==0){console.error((r.stderr||r.stdout||String(r.error)).slice(-6000));process.exitCode=1;break;}
}
