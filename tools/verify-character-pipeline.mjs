import {spawnSync} from 'node:child_process';
const run=(command,args)=>{const r=spawnSync(command,args,{stdio:'inherit',env:{...process.env,LSW_TEST_URL:process.env.LSW_TEST_URL||'http://127.0.0.1:5184'}});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status||1);};
if(process.argv.includes('--rebuild')){
 run(process.env.BLENDER_PATH||'C:/Program Files/Blender Foundation/Blender 4.5/blender.exe',['--background','--python-exit-code','1','--python','tools/build-modular-character.py']);
 run(process.execPath,['tools/build-modular-motion-bank.mjs']);
}
run(process.execPath,['--import','./artifacts/test-css-loader.mjs','--test','tools/modular-pipeline.test.mjs','tools/modular-weapon-preview.test.mjs','tools/modular-character.test.mjs','tools/flight-language.test.mjs','tools/studio-profile.test.mjs']);
run(process.execPath,['tools/shared-pipeline-review.mjs']);
console.log('Shared character pipeline checks and browser evidence complete. Gameplay assignment and artistic approval remain separate.');
