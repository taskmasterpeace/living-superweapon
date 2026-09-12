import {chromium} from 'playwright';
import {mkdir,writeFile,copyFile} from 'node:fs/promises';
const out='artifacts/marketing/mixed-movement-ai-2026-09-12';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:out,size:{width:1280,height:720}}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('http://127.0.0.1:5184/powerworld.html?hero=volt');await page.waitForTimeout(2500);await page.keyboard.press('Enter');await page.getByRole('button',{name:'Enter with squad',exact:true}).click();await page.waitForFunction(()=>window.PW?.game?.ms?.threatLab?.state==='preparing',{},{timeout:90000});
 await page.evaluate(async()=>{
  const {AI}=await import('/src/engine/ai.js'),g=window.PW.game;
  const actors=[g.player,...['rage','webline','tempest'].map(id=>g.spawnRival(id))];
  actors.forEach((f,i)=>{const a=i*Math.PI/2,x=-50+Math.cos(a)*36,z=-650+Math.sin(a)*36;f.pos.set(x,g.world.heightAt(x,z),z);f.vel.set(0,0,0);f.team=i;f.ai=new AI(f,1);f._openSky=true;f._chaseKb=true;f.noRespawn=true;f.faceDir(-Math.cos(a),-Math.sin(a));});
  g.controlPlayer=function(dt){this.controlBot(this.player,dt);};
  window.__mixed={actors,trace:[]};
 });
 for(let i=0;i<100;i++){
  await page.waitForTimeout(250);
  await page.evaluate(()=>{const g=window.PW.game,s=window.__mixed;s.trace.push({time:g.time,fields:g.timeFields.list.length,actors:s.actors.map(f=>({id:f.def.id,alive:f.alive,hp:f.hp,ki:f.ki,pos:f.pos.toArray(),speed:f.vel.length(),scale:f._localTimeScale,leap:!!f._traversalLeap?.active,flying:f.flying,state:f.mstate?.kind??null}))});});
  if(i===20||i===60)await page.screenshot({path:out+`/fight-${i}.png`});
 }
 const trace=await page.evaluate(()=>window.__mixed.trace),summary={setup:'Controlled four-character free-for-all placement. Player input delegates to native controlBot; all AI decisions, attacks, movement, physics and resources remain native. No forced ability activation.',samples:trace.length,fieldSeen:trace.some(s=>s.fields>0),actors:trace[0].actors.map(a=>({id:a.id,minHp:Math.min(...trace.map(s=>s.actors.find(f=>f.id===a.id).hp)),maxSpeed:Math.max(...trace.map(s=>s.actors.find(f=>f.id===a.id).speed)),leapSeen:trace.some(s=>s.actors.find(f=>f.id===a.id).leap),flightSeen:trace.some(s=>s.actors.find(f=>f.id===a.id).flying)})),errors};
 await writeFile(out+'/result.json',JSON.stringify({summary,trace},null,2));console.log(JSON.stringify(summary,null,2));
 if(errors.length||trace.some(s=>s.actors.some(f=>![f.hp,f.ki,...f.pos,f.speed].every(Number.isFinite))))throw Error('Mixed AI errors or nonfinite state');
}finally{const video=await page.video().path();await context.close();await copyFile(video,out+'/mixed-movement-ai.webm');await browser.close();}

