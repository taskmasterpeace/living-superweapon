// Diagnose real close-range contact across body sizes and aim conventions.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch(),page=await browser.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);
 const rows=await page.evaluate(()=>{
  const {game:g,THREE:T}=LSW,tick=g.update.bind(g);g.update=()=>{};g.world.render=()=>{};const rows=[];
  for(const mode of ['authored','procedural'])for(const accurate of [false,'heading','target',true]){
   g.startMode('powerworld',{p1:'rage',p2:'gale',enemy:'gale'});g.running=true;
   const f=g.player,t=g.entities.find(e=>e.def.id==='gale');t.ai=null;f.def.model={...f.def.model,heavyStrikes:mode};
   let frame=0,released=false;const poses=[];
   g.controlPlayer=dt=>{
    f.aim.set(1,0,0);f.aim3.set(1,0,0);f.facing=accurate===true||accurate==='heading'?Math.PI/2:0;
    if(accurate===true||accurate==='target'){f.hasAimWorld=true;t.center(f.aimWorld);f.aim3.copy(f.aimWorld).sub(f.center(new T.Vector3())).normalize();}
    if(frame===2)g.melee.chargeStart(f);if(!released)f.meleeCharge=Math.min(1.3,(f.meleeCharge||0)+dt*3);
    if(frame===45){released=true;f.meleeCharge=1.3;g.melee.chargeRelease(f);}
   };
   for(frame=0;frame<180;frame++){
    if(!released){f.pos.set(0,0,0);f.vel.set(0,0,0);t.pos.set(6,0,0);t.vel.set(0,0,0);}
    tick(1/60);
    if(frame>=45&&frame<=80)poses.push({frame,phase:f.mstate,point:f._meleeMotion?.point.toArray(),root:f.pos.toArray(),hand:f.parts.armR.children[2].getWorldPosition(new T.Vector3()).toArray(),target:t.pos.toArray(),torso:t.parts.torso.getWorldPosition(new T.Vector3()).toArray(),hasAimWorld:f.hasAimWorld,take:f._authoredStrike?.take});
   }
   rows.push({mode,accurate,damage:t.maxHp-t.hp,poses});
  }return rows;
 });
 await mkdir('artifacts/heavy-strikes',{recursive:true});await writeFile('artifacts/heavy-strikes/target-diagnostic.json',JSON.stringify({rows,errors},null,2));console.log(rows.map(({poses,...row})=>row),errors);
 assert.deepEqual(errors,[]);
 for(const row of rows.filter(r=>r.accurate===true||r.accurate==='heading'))assert.ok(row.damage>10,`${row.mode}: correctly facing RAGE must land on point-blank GALE`);
}finally{await browser.close();}
