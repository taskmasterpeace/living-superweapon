import {registerHooks} from 'node:module';

// Node-only logic tests may import HUD modules whose CSS is handled by Vite
// in the browser. Keep styles inert here; visual assertions belong in browser tests.
registerHooks({load(url,context,nextLoad){
 if(new URL(url).pathname.endsWith('.css'))return {format:'module',source:'export default {};',shortCircuit:true};
 return nextLoad(url,context);
}});
