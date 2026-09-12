import {chromium} from 'playwright';import {mkdir,writeFile,copyFile} from 'node:fs/promises';
const out='artifacts/marketing/rage-ai-leap-2026-09-12';await mkdir(out,{recursive:true});
const b=await chromium.launch({headless:false}),c=await b.newContext({viewport:{width:1280,height:720},recordVideo:{dir:out,size:{width:1280,height:720}}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
try{
 await p.goto('http://127.0.0.1:5184/powerworld.html?hero=sol');await p.waitForTimeout(2500);await p.keyboard.press('Enter');await p.getByRole('button',{name:'Enter with squad',exact:true}).click();await p.waitForFunction(()=>window.PW?.game?.ms?.threatLab?.state==='preparing',{},{timeout:90000});
 const setup=await p.evaluate(async()=>{
  const {planTraversalLeap}=await import('/src/engine/traversal-leap.js');const g=window.PW.game,f=g.spawnRival('rage');f._openSky=true;f._chaseKb=true;f.ki=90;window._leapBot=f;
  for(const x of [0,300,600,-300,-600])for(const z of [-650,-400,400]){
   f.pos.set(x,g.world.heightAt(x,z),z);g.player.pos.set(x,g.world.heightAt(x,z+90),z+90);f.faceDir(0,1);f.aim.set(0,0,1);f.aim3.set(0,0,1);
   const plan=planTraversalLeap(f,g.player,g.world);if(plan&&g.canSee(f,g.player)){f.vel.set(0,0,0);g.player.vel.set(0,0,0);g.world._lookYaw=Math.PI;g.world._lookPitch=.1;return {bot:f.pos.toArray(),player:g.player.pos.toArray(),plan};}
  }throw Error('No open candidate route');
 });
 await p.waitForFunction(()=>window._leapBot?._traversalLeap?.active,{},{timeout:15000});
 const launch=await p.evaluate(()=>{const f=window._leapBot;return {velocity:f.vel.toArray(),ki:f.ki,flying:f.flying,charge:f._traversalLeap.charge};});
 await p.waitForTimeout(300);await p.screenshot({path:out+'/ai-leap.png'});await p.waitForTimeout(2500);
 const report={setup:'Controlled visible opponent placement on a forecast-admitted native map route; unmodified AI intent and bot control',placement:setup,launch,errors};await writeFile(out+'/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(errors.length||launch.flying)throw Error('AI leap failed');
}finally{const path=await p.video().path();await c.close();await copyFile(path,out+'/rage-ai-leap.webm');await b.close();}
