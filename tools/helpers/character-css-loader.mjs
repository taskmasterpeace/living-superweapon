import{registerHooks}from'node:module';registerHooks({load(url,ctx,next){if(url.endsWith('.css'))return{format:'module',source:'export default {};',shortCircuit:true};return next(url,ctx);}});
