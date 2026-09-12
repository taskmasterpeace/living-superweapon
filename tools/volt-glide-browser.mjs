import {chromium} from 'playwright';
import {mkdir,writeFile,copyFile} from 'node:fs/promises';
const out='artifacts/marketing/volt-glide-2026-09-12';await mkdir(out,{recursive:true});
const b=await chromium.launch({headless:false}),c=await b.newContext({viewport:{width:1280,height:720},recordVideo:{dir:out,size:{width:1280,height:720}}}),p=await c.newPage(),errors=[];
p.on('pageerror',e=>errors.push(e.message));
try{
 await p.goto('http://127.0.0.1:5184/powerworld.html?hero=volt');await p.waitForTimeout(2500);await p.keyboard.press('Enter');await p.getByRole('button',{name:'Enter with squad',exact:true}).click();await p.waitForFunction(()=>window.PW?.game?.ms?.threatLab?.state==='preparing',{},{timeout:90000});
 await p.evaluate(()=>{const g=window.PW.game,f=g.player;f.pos.set(-600,g.world.heightAt(-600,-400)+300,-400);f.vel.set(0,-5,180);f.onFoot=false;f.airT=1;f.flying=false;f.ki=f.maxKi;});
 await p.keyboard.down('Space');await p.waitForFunction(()=>window.PW.game.player.gliding,{},{timeout:5000});
 const sample=()=>p.evaluate(()=>{const f=window.PW.game.player;return {position:f.pos.toArray(),velocity:f.vel.toArray(),ki:f.ki,flying:f.flying,gliding:f.gliding};});
 const start=await sample();await p.waitForTimeout(800);await p.screenshot({path:out+'/volt-glide.png'});const glide=await sample();await p.keyboard.up('Space');await p.waitForTimeout(250);const released=await sample();
 const result={setup:'Controlled elevated placement and initial momentum; native held/released Space. This does not prove the sprint-to-hill entry.',start,glide,released,errors};await writeFile(out+'/result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 if(errors.length||!glide.gliding||glide.flying||released.gliding||glide.position[1]>=start.position[1])throw Error('Glide not proven');
}finally{const path=await p.video().path();await c.close();await copyFile(path,out+'/volt-glide.webm');await b.close();}

