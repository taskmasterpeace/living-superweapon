import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const cwd=fileURLToPath(new URL('../',import.meta.url));
const jobs=[['--import','./tools/helpers/css-test-hook.mjs','--test',...["tools/melee-depth.test.mjs","tools/energy-guard.test.mjs","tools/person-carry.test.mjs","tools/beam-charge-range.test.mjs","tools/beam-cover-contact.test.mjs","tools/beam-contact-feedback.test.mjs","tools/camera-settings.test.mjs","tools/ground-camera.test.mjs","tools/ground-camera-cover.test.mjs","tools/free-look-input.test.mjs","tools/flight-language.test.mjs","tools/flight-readability.test.mjs","tools/flight-wake.test.mjs","tools/flight-surface-wake.test.mjs","tools/movement-gears.test.mjs","tools/power-up-state.test.mjs"]],['node_modules/vite/bin/vite.js','build']];
for(const args of jobs){const r=spawnSync(process.execPath,args,{cwd,stdio:'inherit'});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status??1);}
