import {chromium} from 'playwright';import {mkdir,writeFile,copyFile} from 'node:fs/promises';
const out='artifacts/marketing/practice-prop-exit-2026-09-12';await mkdir(out,{recursive:true});
const b=await chromium.launch({headless:false}),c=await b.newContext({viewport:{width:1280,height:720},recordVideo:{dir:out,size:{width:1280,height:720}}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
try{
 await p.goto('http://127.0.0.1:5184/powerworld.html?hero=sol');await p.waitForTimeout(2500);await p.keyboard.press('Enter');await p.getByRole('button',{name:'Enter with squad',exact:true}).click();await p.waitForFunction(()=>window.PW?.game?.ms?.threatLab?.state==='preparing',{},{timeout:90000});
 await p.evaluate(()=>{const g=window.PW.game,l=g.ms.threatLab,r=l.practiceProps.entries[0].ref;window.__practiceRock=r;window.__rockCount=g.world.rocks.length;g.player.pos.set(r.x,g.world.heightAt(r.x,r.z-3),r.z-3);g.player.vel.set(0,0,0);g.world._lookYaw=0;g.world._lookPitch=0;});await p.waitForTimeout(250);
 await p.keyboard.press('e');await p.waitForFunction(()=>!!window.PW.game.player._carry,{},{timeout:5000});await p.screenshot({path:out+'/carry-rock.png'});

 const result=await p.evaluate(()=>{const g=window.PW.game,l=g.ms.threatLab,ref=g.player._carry.sourceRef;g.player.aim3.set(0,1,0);g.throwProp(g.player);const flight=g.vfx.fx.find(e=>e.sourceRef===ref),record=g._flung.find(e=>e.sourceRef===ref);if(!flight||!record)throw Error('Native throw not registered');let explosions=0;const area=g.areaDamage;g.areaDamage=()=>{explosions++;};l.practiceProps.dispose();g.vfx.update(1/60);g.areaDamage=area;return {effectRemoved:!g.vfx.fx.includes(flight),recordRemoved:!g._flung.includes(record),carryCleared:!g.player._carry,explosions};});
 await writeFile(out+'/result.json',JSON.stringify({result,errors},null,2));console.log(result,errors);if(!result.effectRemoved||!result.recordRemoved||!result.carryCleared||result.explosions||errors.length)throw Error('Practice exit failed');
}finally{const path=await p.video().path();await c.close();await copyFile(path,out+'/practice-props.webm');await b.close();}

