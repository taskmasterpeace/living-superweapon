import {registerHooks} from 'node:module';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=process.cwd().replaceAll('\\','/')+'/';
registerHooks({load(url,context,next){
 if(url.startsWith('file:')){const file=fileURLToPath(url).replaceAll('\\','/');if(file.startsWith(root+'src/')&&file.endsWith('.js')){try{return {format:'module',source:execFileSync('git',['show','HEAD:'+file.slice(root.length)],{encoding:'utf8',stdio:['ignore','pipe','ignore']}),shortCircuit:true};}catch{}}}
 return next(url,context);
}});
