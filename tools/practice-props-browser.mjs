import {chromium} from 'playwright';import {mkdir,writeFile,copyFile} from 'node:fs/promises';
const out='artifacts/marketing/practice-props-2026-09-12';await mkdir(out,{recursive:true});
const b=await chromium.launch({headless:false}),c=await b.newContext({viewport:{width:1280,height:720},recordVideo:{dir:out,size:{width:1280,height:720}}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
try{
 await p.goto('http://127.0.0.1:5184/powerworld.html?hero=sol');await p.waitForTimeout(2500);await p.keyboard.press('Enter');await p.getByRole('button',{name:'Enter with squad',exact:true}).click();await p.waitForFunction(()=>window.PW?.game?.ms?.threatLab?.state==='preparing',{},{timeout:90000});
 await p.evaluate(()=>{const g=window.PW.game,l=g.ms.threatLab,r=l.practiceProps.entries[0].ref;window.__practiceRock=r;window.__rockCount=g.world.rocks.length;g.player.pos.set(r.x,g.world.heightAt(r.x,r.z-3),r.z-3);g.player.vel.set(0,0,0);g.world._lookYaw=0;g.world._lookPitch=0;});await p.waitForTimeout(250);
 await p.keyboard.press('e');await p.waitForFunction(()=>!!window.PW.game.player._carry,{},{timeout:5000});await p.screenshot({path:out+'/carry-rock.png'});
 const denied=await p.evaluate(()=>window.PW.game.ms.threatLab.meleeTrial.resetPractice());if(denied)throw Error('Reset duplicated carried rock');
 await p.keyboard.down('e');await p.waitForTimeout(500);await p.keyboard.up('e');await p.waitForFunction(()=>!window.PW.game.player._carry&&!window.PW.game._flung?.length,{},{timeout:10000});
 await p.evaluate(()=>{const g=window.PW.game,l=g.ms.threatLab,pos=l.trialRepeatHandle.pos;g.player.pos.set(pos.x,g.world.heightAt(pos.x,pos.z-3),pos.z-3);g.player.vel.set(0,0,0);g.world._lookYaw=0;g.world._lookPitch=0;});await p.waitForTimeout(250);await p.keyboard.press('e');
 await p.waitForFunction(()=>!window.__practiceRock.carried&&window.__practiceRock.mesh.visible,{},{timeout:5000});await p.screenshot({path:out+'/reset-rocks.png'});
 const result=await p.evaluate(()=>({sameRecord:window.PW.game.world.rocks.includes(window.__practiceRock),countStable:window.PW.game.world.rocks.length===window.__rockCount,visible:window.__practiceRock.mesh.visible,carried:window.__practiceRock.carried}));
 await writeFile(out+'/result.json',JSON.stringify({setup:'Controlled placement beside rock and reset station; native E pickup, held/released E aimed throw and E reset; reset denial checked through owner while carrying',...result,errors},null,2));console.log(result,errors);if(!result.sameRecord||!result.countStable||errors.length)throw Error('Practice props failed');
}finally{const path=await p.video().path();await c.close();await copyFile(path,out+'/practice-props.webm');await b.close();}

