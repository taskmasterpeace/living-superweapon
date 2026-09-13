import {chromium} from 'playwright';import {mkdir,writeFile,copyFile} from 'node:fs/promises';
const out='artifacts/marketing/long-melee-2026-09-12';await mkdir(out,{recursive:true});
const b=await chromium.launch({headless:false}),c=await b.newContext({viewport:{width:1280,height:720},recordVideo:{dir:out}}),p=await c.newPage(),errors=[],results=[];p.on('pageerror',e=>errors.push(e.message));
try{
await p.goto('http://127.0.0.1:5184/powerworld.html?hero=sol');await p.waitForTimeout(2500);await p.keyboard.press('Enter');await p.getByRole('button',{name:'Enter with squad',exact:true}).click();await p.waitForFunction(()=>PW.game._threatRoom?.active,null,{timeout:90000});
for(const air of [false,true]){
 await p.evaluate(()=>{const g=PW.game,h=g.ms.threatLab.threatPickHandle;g.player.pos.copy(h.pos);g.player.pos.y=0;g.player.pos.x+=3;g.player.vel.set(0,0,0);g.player.flying=false;g.world._lookYaw=-Math.PI/2;g.world._lookPitch=0;g.world._chaseSnap=true;});await p.waitForTimeout(400);await p.keyboard.press('e');await p.getByRole('dialog',{name:'Choose a Threat Room opponent'}).waitFor();
 await p.getByRole('button',{name:air?'SOL':'MERC',exact:true}).click();await p.locator('[data-drill]').selectOption(air?'airborne':'stationary');
 if(!air){await p.getByText('How blocking works',{exact:true}).click();await p.locator('details p').scrollIntoViewIfNeeded();await p.screenshot({path:out+'/guard-help.png'});}
 await p.getByRole('button',{name:'Start teaching drill',exact:true}).click();
 await p.evaluate(air=>{const g=PW.game,f=g.player,t=g.ms.threatLab.meleeTrial.target;f.pos.set(80,air?24:0,-120);t.pos.set(80,air?24:0,air?-50:-85);for(const a of[f,t]){a.vel.set(0,0,0);a.flying=air;}g.world._lookYaw=0;g.world._lookPitch=0;g.world._chaseSnap=true;},air);
 await p.waitForTimeout(500);await p.screenshot({path:out+(air?'/air-before.png':'/ground-before.png')});await p.keyboard.press('v');
 await p.waitForFunction(air=>PW.game.ms.threatLab.meleeTrial.records.some(r=>r.entryReason&&r.result==='contact'&&r.trial===(air?'airborne':'stationary')),air,{timeout:7000});
 const r=await p.evaluate(()=>({records:PW.game.ms.threatLab.meleeTrial.records.filter(r=>r.entryReason&&r.trial===PW.game.ms.threatLab.meleeTrial.kind),hp:PW.game.ms.threatLab.meleeTrial.target.hp}));results.push({air,...r});await p.screenshot({path:out+(air?'/air-after.png':'/ground-after.png')});
}
await writeFile(out+'/result.json',JSON.stringify({results,errors},null,2));console.log({results,errors});if(errors.length)throw Error('Page errors');
}finally{const path=await p.video().path();await c.close();await copyFile(path,out+'/long-approaches.webm');await b.close();}


