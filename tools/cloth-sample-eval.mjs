// Read-only loader: native fixtures, candidate cloth module only.
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('./prototypes/ragdoll-cape-sample.mjs',import.meta.url),'utf8');
registerHooks({load(url,context,next){
 if(url.endsWith('/src/engine/ragdoll-cape.js'))return {format:'module',source,shortCircuit:true};
 return next(url,context);
}});
