import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/teleport-defense';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto('http://127.0.0.1:5180/studio.html');await page.waitForFunction(()=>window.STUDIO);
 await page.getByRole('button',{name:'New character',exact:true}).click();await page.locator('#oName').fill('SIDESTEP');
 await page.locator('#origin [data-p="heatray"]').click();await page.locator('#origin [data-s="rmb"]').click();await page.locator('#origin [data-p="kibolt"]').click();
 const recipes=[];
 for(const tier of ['blink-short','blink','blink-long']){
  if(recipes.length)await page.getByRole('button',{name:'Edit power kit',exact:true}).click();
  await page.locator('#origin [data-t="guardType"][data-v="deflect"]').click();
  await page.locator(`#origin [data-t="evade"][data-v="${tier}"]`).click();
  await page.locator('#origin [data-t="evade"].on').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/editor-${tier}.png`});
  await page.locator('#oSave').click();await page.waitForFunction(()=>STUDIO.preview.fighter.def.name==='SIDESTEP');
  const id=await page.evaluate(()=>STUDIO.preview.fighter.def.id);await page.reload();await page.waitForFunction(()=>window.STUDIO);
  await page.locator(`[data-hero="${id}"]`).click();
  recipes.push(await page.evaluate(()=>({evade:STUDIO.preview.fighter.def.evade,guard:STUDIO.preview.fighter.def.guardType})));
 }
 assert.deepEqual(recipes.map(r=>r.evade.range),[12,22,36]);assert.ok(recipes.every(r=>r.guard==='deflect'));
 await page.locator('#playtest').click();await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 const rows=await page.evaluate(async()=>{
  const {game:g,THREE:T}=LSW;g.update=()=>{};
  const {TELEPORT_TIERS}=await import('/src/data/teleport-tuning.js');const rows=[];
  const key=(code,down)=>dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code,bubbles:true}));
  for(const hz of [30,60,120])for(const tier of Object.keys(TELEPORT_TIERS))for(const code of ['KeyA','KeyD']){
   const a=g.player;for(const f of g.entities)f.ai=null;
   a.def={...a.def,evade:{...TELEPORT_TIERS[tier]}};a.pos.set(0,140,0);a.vel.set(0,0,0);a.flying=true;a.gait='airborne';a.evadeCd=0;a.ki=a.maxKi;a.invuln=0;
   g.world._lookYaw=.7;g.world._lookPitch=0;g.world._lookActive=true;g.world.snapChase();g.hardLock=null;g.world.chase(a,null,1);
   const look=g.world.camera.getWorldDirection(new T.Vector3()),right=new T.Vector3(-look.z,0,look.x).normalize();
   g.input.keys.clear();g.input.endFrame();g._tapT={};
   const step=()=>{g.controlPlayer(1/hz);g.input.endFrame();};
   key(code,true);step();key(code,false);step();await new Promise(r=>setTimeout(r,85));
   const start=a.pos.clone(),ki=a.ki;key(code,true);step();key(code,false);step();
   const delta=a.pos.clone().sub(start);rows.push({hz,tier,code,range:delta.length(),side:delta.dot(right),altitude:a.pos.y,cost:ki-a.ki,cooldown:a.evadeCd});
  }
  return rows;
 });
 for(const row of rows){const range={'blink-short':12,blink:22,'blink-long':36}[row.tier];assert.ok(Math.abs(row.range-range)<.001,JSON.stringify(row));assert.ok(Math.abs(row.side-(row.code==='KeyA'?-range:range))<.001);assert.equal(row.altitude,140);assert.ok(row.cost>0&&row.cooldown>0);}
 const defense=await page.evaluate(()=>{
  const {game:g,THREE:T}=LSW,rows=[];
  for(const hz of [30,60,120])for(const kind of ['block','deflect','rear']){
   g.startMode('powerworld',{p1:kind==='block'?'sol':'vanguard',p2:'recon'});const a=g.player,b=g.entities.find(e=>e!==a&&!e.isDummy);
   for(const f of g.entities){f.ai=null;if(f!==a&&f!==b)f.pos.set(1000,1000,1000);}
   for(const f of [a,b]){f.pos.set(0,140,f===a?0:kind==='rear'?-60:60);f.vel.set(0,0,0);f.invuln=0;f.hp=f.maxHp=1000;f.flying=true;f.gait='airborne';}
   a.faceDir(0,1);b.faceDir(0,-1);g.melee.guard(a,true);a._guardUpT=1;
   let returned=false,braced=false,minMeter=1;
   const pos=b.center(new T.Vector3()),shot=g.projectiles.spawnProjectile(b,{pos,vel:a.center(new T.Vector3()).sub(pos).normalize().multiplyScalar(180),damage:20,radius:.7,life:4,blast:0,color:'#ffd24a'});
   for(let i=0;i<hz;i++){g.projectiles.update(1/hz,g);returned ||= shot.caster===a;braced ||= a._blocked>0;minMeter=Math.min(minMeter,a.guardMeter);}
   rows.push({hz,kind,returned,braced,minMeter,received:1000-a.hp,shooterDamage:1000-b.hp});
  }
  return rows;
 });
 for(const row of defense){if(row.kind==='deflect'){assert.ok(row.returned&&row.braced&&row.minMeter<1&&row.shooterDamage>0,JSON.stringify(row));assert.equal(row.received,0);}else{assert.equal(row.returned,false);assert.ok(row.received>0,JSON.stringify(row));}}
 await writeFile(`${out}/results.json`,JSON.stringify({recipes,rows,defense,errors},null,2));console.log(JSON.stringify({recipes,inputCases:rows.length,defense,errors},null,2));assert.deepEqual(errors,[]);
}finally{await browser.close();}
