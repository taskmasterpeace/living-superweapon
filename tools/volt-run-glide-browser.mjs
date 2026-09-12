import {chromium} from 'playwright';
import {mkdir,writeFile,copyFile} from 'node:fs/promises';
const out='artifacts/marketing/volt-run-glide-2026-09-12';await mkdir(out,{recursive:true});
const b=await chromium.launch({headless:false}),c=await b.newContext({viewport:{width:1280,height:720},recordVideo:{dir:out,size:{width:1280,height:720}}}),p=await c.newPage(),errors=[];
p.on('pageerror',e=>errors.push(e.message));
try{
 await p.goto('http://127.0.0.1:5184/powerworld.html?hero=volt');await p.waitForTimeout(2500);await p.keyboard.press('Enter');await p.getByRole('button',{name:'Enter with squad',exact:true}).click();await p.waitForFunction(()=>window.PW?.game?.ms?.threatLab?.state==='preparing',{},{timeout:90000});
 const route=await p.evaluate(()=>{const g=window.PW.game,w=g.world,f=g.player;let route;
  for(let x=-700;x<=700&&!route;x+=50)for(let z=-700;z<=300&&!route;z+=50){const heights=Array.from({length:21},(_,i)=>w.heightAt(x,z+i*15));if(Math.max(...heights)-Math.min(...heights)>1)continue;
   if(w.cover.some(c=>Math.abs(c.x-x)<(c.hx??c.r??0)+25&&c.z+(c.hz??c.r??0)>z-10&&c.z-(c.hz??c.r??0)<z+310))continue;
   route={x,z,y:heights[0]};}
  if(!route)throw Error('No clear flat route');f.pos.set(route.x,route.y,route.z);f.vel.set(0,0,0);w._lookYaw=0;w._lookPitch=0;return route;});console.log('route',route);await p.waitForTimeout(500);
 await p.keyboard.down('w');await p.keyboard.press('Shift');await p.keyboard.down('Shift');await p.waitForTimeout(1000);
 const sample=()=>p.evaluate(()=>{const f=window.PW.game.player;return {position:f.pos.toArray(),velocity:f.vel.toArray(),ki:f.ki,flying:f.flying,gliding:f.gliding,onFoot:f.onFoot};});
 const run=await sample();console.log('run',JSON.stringify(run));
 await p.evaluate(()=>{const f=window.PW.game.player,original=f.update;window.__glideTrace=[];f.update=function(...args){const result=original.apply(this,args);if(window.__glideTrace.length<180)window.__glideTrace.push({y:f.pos.y,ground:f.groundY,speed:Math.hypot(f.vel.x,f.vel.z),vy:f.vel.y,held:f.flyHeld,glide:f.gliding,stun:f.staggerT,foot:f.onFoot});return result;};});
 await p.keyboard.down('Space');
 await p.waitForFunction(()=>window.PW.game.player.gliding,{},{timeout:5000});const glide=await sample();await p.screenshot({path:out+'/run-glide.png'});
 await p.keyboard.up('Space');await p.keyboard.up('Shift');await p.keyboard.up('w');await p.waitForTimeout(1200);const end=await sample();
 const result={setup:'Controlled grounded start on desert outskirts; native W, double Shift hold, Space jump/glide and releases. No launch velocity or airborne state supplied.',run,glide,end,errors};await writeFile(out+'/result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 if(errors.length||!glide.gliding||glide.flying||Math.hypot(...[run.velocity[0],run.velocity[2]])<150)throw Error('Run-to-glide not proven');
}catch(e){await writeFile(out+'/failure.json',JSON.stringify(await p.evaluate(()=>window.__glideTrace),null,2));await p.screenshot({path:out+'/failure.png'});throw e;}
finally{const path=await p.video().path();await c.close();await copyFile(path,out+'/volt-run-glide.webm');await b.close();}

