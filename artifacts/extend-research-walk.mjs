import {readFile,writeFile} from 'node:fs/promises';
const path='tools/field-research-walk-browser.mjs';let s=await readFile(path,'utf8');
s=s.replace(' const result=',`
 await p.evaluate(()=>{const g=PW.game,s=g.pwStage.researchLab.site,t=g.spawnEnemy('merc',{team:g.player.team===0?1:0,x:s.x-9,z:s.z+45,noRespawn:true});t.hp=1;t.ai=null;t._encounterNPC=true;t.vel.set(0,0,0);g.world._lookYaw=0;g.world._lookPitch=0;});
 await p.keyboard.down('w');try{await p.waitForFunction(()=>PW.game.player.pos.z>PW.game.pwStage.researchLab.site.z+36,null,{timeout:15000});}finally{await p.keyboard.up('w');}
 await p.waitForTimeout(200);await p.keyboard.press('v');await p.waitForFunction(()=>PW.game.ms.fieldResearch.events.filter(e=>e.kind==='sample-dropped').length===2,null,{timeout:10000});await p.screenshot({path:out+'/fight-again.png'});
 const result=`);
s=s.replace('W entrance and E analysis.','W entrance, E analysis, W exit and second V KO. Camera facing set toward exit; second one-HP opponent staged.');
await writeFile(path,s);
