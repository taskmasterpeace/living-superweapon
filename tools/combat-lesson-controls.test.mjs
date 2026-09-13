import test from 'node:test';import assert from 'node:assert/strict';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';import {MeleeTrial} from '../src/engine/melee-trial.js';
import {trialPrompt} from '../src/engine/combat-lesson-controls.js';
for(const scheme of ['kbm','pad','touch'])test(`one scheme-aware native grab message with training capture (${scheme})`,()=>{
 const x=mainCombatFixture({mode:'powerworld',hero:'sol'});try{const messages=[],f=x.p,v=x.foe({z:5});x.g.hud={feed:t=>messages.push(t)};x.g.touch={enabled:scheme==='touch'};x.g.pad.active=scheme==='pad';
 const trial=new MeleeTrial(x.g,f.pos.clone());trial.target=v;x.g.ms.threatLab={meleeTrial:trial};f._openSky=true;
 x.g.melee.grab(f);for(let i=0;i<25;i++)x.g.melee.update(f,1/60);
 const grabbed=messages.filter(m=>m.includes('GRAB CONNECTED'));assert.equal(grabbed.length,1);assert.equal(messages.filter(m=>m.includes('CLINCH')).length,0);
 if(scheme!=='kbm')assert.doesNotMatch(grabbed[0],/\b[VQE]\b/);
 assert(grabbed[0].includes(scheme==='kbm'?'hold E':scheme==='touch'?'hold Throw':'hold Grab'));
 }finally{x.close();}
});
test('live drill prompts are brief; detailed lessons remain separate',()=>{for(const scheme of ['kbm','pad','touch'])for(const kind of ['stationary','retreat','guard','dodge','defend','airborne','air-defense']){const text=trialPrompt(kind,scheme);assert(text.length<100);if(scheme!=='kbm')assert.doesNotMatch(text,/\b[VQE]\b/);}});
