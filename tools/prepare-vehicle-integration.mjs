import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const dir='artifacts/integration-20260915';mkdirSync(dir,{recursive:true});
for(const file of ['src/engine/game.js','src/boot.js']){
 const stem=file.replaceAll('/','_');
 const current=readFileSync(file);writeFileSync(`${dir}/${stem}.ours`,current.toString().replaceAll("\r\n","\n"));
 writeFileSync(`${dir}/${stem}.base`,execFileSync('git',['show',`6161ec1:${file}`]).toString().replaceAll("\r\n","\n"));
 writeFileSync(`${dir}/${stem}.theirs`,execFileSync('git',['show',`codex/pw-vehicle-sim:${file}`]).toString().replaceAll("\r\n","\n"));
 let output;try{output=execFileSync('git',['merge-file','-p',`${dir}/${stem}.ours`,`${dir}/${stem}.base`,`${dir}/${stem}.theirs`]);}catch(e){output=e.stdout;}
 writeFileSync(`${dir}/${stem}.merged`,output);console.log(file+' conflicts: '+(output.toString().match(/^<<<<<<< /gm)||[]).length);
}

