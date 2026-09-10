import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/resource-construct-lifetime';await mkdir(out,{recursive:true});
const base=process.env.LSW_TEST_URL||'http://127.0.0.1:5180';
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto(base+'/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 await page.evaluate(async()=>{
  const {game:g,hud}=LSW,{runSlot}=await import('/src/engine/abilities.js');
  g.startMode('powerworld',{p1:'aurum',p2:'kano'});const f=g.player;hud.setPlayer(f.def);
  for(const e of g.entities){e.ai=null;if(e!==f)e.pos.set(500,100,500);}
  g.controlPlayer=()=>{};g.controlBot=()=>{};g.news.enabled=false;
  f.pos.set(0,0,-100);f.vel.set(0,0,0);f.flying=false;f.gait='grounded';f.invuln=30;
  f.level=10;f.sheet.kiRegenMult=0;f.ki=72;g.aimPoint.set(0,0,-72);
  const st=f.slots.q;st.def={...st.def,constructLifetime:'upkeep',constructKiPerSec:5};st.cd=0;
  const update=g.update.bind(g),render=g.world.render.bind(g.world);g.update=()=>{};g.world.render=()=>{};
  const cast=(pressed=false,released=false)=>runSlot(f,'q',{pressed,released,held:pressed,dt:1/60},g);
  const tick=n=>{for(let i=0;i<n;i++){update(1/60);LSW.input.endFrame();}};
  const note=document.createElement('div');note.style.cssText='position:fixed;left:20px;top:85px;background:#1c211ddd;color:white;padding:8px;z-index:10000;font:13px system-ui';
  note.textContent='Native runtime policy fixture · 5 ki/s upkeep · regeneration off for exact measurement · editor integration pending';document.body.append(note);
  let denied=0;const noKi=g.onNoKi.bind(g);g.onNoKi=(...a)=>{denied++;return noKi(...a);};
  const state=()=>({ki:f.ki,active:!!st.active&&!st.active.dead,live:g.constructs.filter(c=>!c.dead).length,
   cover:g.world.cover.filter(c=>c.construct?.owner===f||c===st.active?._cover).length,
   parent:!!st.active?.obj.parent,mode:st.active?.policy?.mode,denied});
  window.proof={g,f,st,cast,tick,render,state};cast(true);window.construct=st.active;cast(false,true);
 });
 const initial=await page.evaluate(()=>proof.state());assert.equal(initial.ki,60);assert.equal(initial.active,true);
 await page.evaluate(()=>{proof.tick(60);proof.render();});await page.screenshot({path:out+'/formed.png'});
 await page.evaluate(()=>{proof.tick(570);proof.render();});const beyondDuration=await page.evaluate(()=>proof.state());
 assert.equal(beyondDuration.active,true);assert.ok(Math.abs(beyondDuration.ki-7.5)<1e-7);await page.screenshot({path:out+'/beyond-original-duration.png'});
 await page.evaluate(()=>{proof.tick(90);proof.render();});const exhausted=await page.evaluate(()=>({...proof.state(),disposed:construct.dead,detached:construct.obj.parent===null,coverGone:!proof.g.world.cover.includes(construct._cover)}));
 assert.equal(exhausted.ki,0);assert.equal(exhausted.live,0);assert.ok(exhausted.disposed&&exhausted.detached&&exhausted.coverGone);await page.screenshot({path:out+'/exhausted.png'});
 const dismissed=await page.evaluate(()=>{
  const {f,st,cast,g}=proof;f.ki=80;st.cd=0;cast(true);const c=st.active;cast(false,true);
  f.ki=1;st.cd=0;cast(true);return {...proof.state(),disposed:c.dead,detached:c.obj.parent===null,coverGone:!g.world.cover.includes(c._cover)};
 });
 assert.equal(dismissed.ki,1);assert.equal(dismissed.active,false);assert.equal(dismissed.denied,0);assert.ok(dismissed.disposed&&dismissed.detached&&dismissed.coverGone);
 assert.deepEqual(errors,[]);await writeFile(out+'/results.json',JSON.stringify({initial,beyondDuration,exhausted,dismissed,errors},null,2));
 console.log(JSON.stringify({initial,beyondDuration,exhausted,dismissed,errors}));
}finally{await browser.close();}
