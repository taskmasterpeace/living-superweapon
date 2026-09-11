import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch(),page=await browser.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 const rows=await page.evaluate(()=>{
  const {game:g,THREE:T}=LSW;g.update=()=>{};const rows=[];
  for(const hz of [30,60,120])for(const reverse of [false,true]){
   g.startMode('powerworld',{p1:'sol',p2:'kano'});const a=g.player,b=g.entities.find(e=>e!==a&&!e.isDummy);
   for(const f of [a,b]){f.pos.set(0,140,f===a?0:5);f.vel.set(0,0,0);f.flying=true;f.gait='airborne';f.invuln=0;f.hp=f.maxHp=1000;f.ai=null;}
   a.faceDir(0,1);b.faceDir(0,-1);a.aim3.set(0,0,1);a.hasAimWorld=true;a.aimWorld.set(0,147,5);
   a._animate(1);b._animate(1);g.melee.strike(a);a.mstate='active';a.mT=.03;a.vel.set(0,0,0);a._meleeMotion.step.set(0,0,0);a._animate(.1);
   const arm=a._meleeMotion.side===1?a.parts.armR:a.parts.armL,fist=arm.children[2].getWorldPosition(new T.Vector3()),center=b.parts.torso.getWorldPosition(new T.Vector3());
   b.pos.add(fist.clone().sub(center));b.pos.x-=210/hz*.5;b.vel.set(210,0,0);
   const start=b.pos.toArray(),entities=reverse?[b,a]:[a,b];g.entities=entities;
   g.melee.beginContactFrame();for(const f of entities)f.update(1/hz,g);g.resolveBodies();g.melee.endContactFrame();
   rows.push({hz,reverse,start,end:b.pos.toArray(),damage:1000-b.hp,contacts:a.strikeHit.size});
  }
  return rows;
 });
 await mkdir('artifacts/strikes',{recursive:true});await writeFile('artifacts/strikes/moving-contact-results.json',JSON.stringify({rows,errors},null,2));console.log(JSON.stringify({rows,errors},null,2));
 assert.deepEqual(errors,[]);assert.ok(rows.every(r=>r.damage>0&&r.contacts===1),'legal-speed moving targets must receive one actual contact hit');
}finally{await browser.close();}
