import {chromium} from 'playwright';import {mkdir,writeFile,copyFile} from 'node:fs/promises';
const out='artifacts/marketing/threat-live-encounter-2026-09-12';await mkdir(out,{recursive:true});const b=await chromium.launch({headless:false}),c=await b.newContext({viewport:{width:1280,height:720},recordVideo:{dir:out,size:{width:1280,height:720}}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
try{
 await p.goto('http://127.0.0.1:5184/powerworld.html?hero=vega');await p.waitForTimeout(2500);await p.keyboard.press('Enter');await p.getByRole('button',{name:'Enter with squad',exact:true}).click();await p.waitForFunction(()=>window.PW?.game?.ms?.threatLab?.threatFightHandle,{},{timeout:90000});
 const approach=async key=>{await p.evaluate(key=>{const g=window.PW.game,h=g.ms.threatLab[key],f=g.player;f.pos.copy(h.pos);f.pos.y=g.world.heightAt(f.pos.x,f.pos.z);f.vel.set(0,0,0);g.world._lookYaw=0;g.world._lookPitch=.15;},key);await p.waitForTimeout(250);};
 await approach('threatPickHandle');await p.keyboard.press('e');await p.getByRole('button',{name:'Preview in room',exact:true}).click();await p.waitForFunction(()=>window.PW.game.ms.threatLab.meleeTrial.previewActor);
 await approach('threatFightHandle');await p.keyboard.press('e');await p.waitForFunction(()=>window.PW.game.ms.threatLab.meleeTrial.kind==='encounter');
 await p.evaluate(()=>{const g=window.PW.game;window.testThreat=g.ms.threatLab.meleeTrial.target;window.testSamples=[];window.testTimer=setInterval(()=>{window.testSamples.push({hp:g.player.hp,targetHp:window.testThreat.hp,shots:g.projectiles.list.filter(s=>s.caster===window.testThreat&&!s.dead).length,state:g.player.state,ki:window.testThreat.ki});},100);});
 await p.waitForTimeout(2600);await p.screenshot({path:out+'/fight.png'});
 const fight=await p.evaluate(()=>{const t=window.testThreat;return {id:t.def.id,ai:!!t.ai,dummy:!!t.isDummy,slots:Object.keys(t.slots).length,samples:window.testSamples};});
 await approach('trialRepeatHandle');await p.keyboard.press('e');await p.waitForTimeout(200);
 const reset=await p.evaluate(()=>{clearInterval(window.testTimer);const g=window.PW.game,t=g.ms.threatLab.meleeTrial;return {replaced:t.target!==window.testThreat,oldActor:g.entities.includes(window.testThreat),oldShots:g.projectiles.list.filter(s=>s.caster===window.testThreat).length,kind:t.kind,alive:g.player.alive};});
 await p.screenshot({path:out+'/reset.png'});
 if(!fight.ai||fight.dummy||!fight.slots||!fight.samples.some(s=>s.shots>0)||!reset.replaced||reset.oldActor||reset.oldShots||errors.length)throw Error(JSON.stringify({fight,reset,errors}));
 await writeFile(out+'/result.json',JSON.stringify({setup:'Normal game entry and native E preview/start/reset; controlled player positioning at each station. Enemy uses native AI and powers without forced attacks.',fight,reset,errors},null,2));console.log(JSON.stringify({fight:{...fight,samples:fight.samples.length,shotSeen:fight.samples.some(s=>s.shots>0)},reset,errors}));
}finally{const v=await p.video().path();await c.close();await copyFile(v,out+'/threat-live-encounter.webm');await b.close();}
