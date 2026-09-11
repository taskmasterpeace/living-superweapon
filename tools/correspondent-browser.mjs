import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const output='artifacts/correspondent';await mkdir(output,{recursive:true});
const base=process.env.LSW_TEST_URL||'http://127.0.0.1:5180';
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:output,size:{width:1280,height:800}}}),page=await context.newPage(),errors=[];
page.setDefaultTimeout(40000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto(base+'/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 await page.evaluate(()=>{
  const {game:g,hud}=LSW;g.startMode('powerworld',{p1:'sol',p2:'kano'});hud.setPlayer(g.player.def);hud.hintFull(false);
  const a=g.player,b=g.entities.find(e=>e!==a&&!e.isDummy);window.subjects={a,b};
  for(const e of g.entities){e.ai=null;if(e!==a&&e!==b)e.pos.set(800,300,800);}
  a.pos.set(-25,0,-45);b.pos.set(25,0,-20);a.vel.set(0,0,0);b.vel.set(0,0,0);
  for(const f of [a,b]){f.flying=false;f.gait='grounded';f.hp=f.maxHp=3000;f.invuln=0;f.level=10;}
  a.energyInfinite=true;g.controlPlayer=()=>{};g.controlBot=()=>{};g.hardLock=b;
  g._realUpdate=g.update.bind(g);g.update=()=>{};
  window.tick=async(n)=>{for(let i=0;i<n;i++){
   // Deterministic capture harness: bypass background-tab EMA, not a performance benchmark.
   g.world._ema=16;g.world._qTier=1;g._realUpdate(1/30);LSW.input.endFrame();await new Promise(r=>setTimeout(r,25));
  }};
 });
 await page.evaluate(()=>tick(48));
 const initial=await page.evaluate(()=>({enabled:LSW.game.news.enabled,visible:LSW.game.news.grp.visible,shot:LSW.game.news._shot,frames:LSW.game.news.rec?.frames.length,clips:LSW.game.news.clips.length}));
 assert.equal(initial.enabled,true);assert.equal(initial.visible,true);
 // Capture real operator image without changing any gameplay camera.
 const capture=async name=>{const data=await page.evaluate(()=>LSW.game.news.canvas.toDataURL('image/png'));await writeFile(`${output}/${name}.png`,Buffer.from(data.split(',')[1],'base64'));};
 await capture('reporter-opening');
 // Observe the actual crew in-world, including the operator hidden only in its own POV.
 // This custom inspection lens is separate from (and never replaces) the gameplay camera.
 await page.evaluate(()=>{
  const {game:g,THREE:T}=LSW,n=g.news,center=n.op.position.clone().add(n.rp.position).multiplyScalar(.5);center.y+=4;
  const camera=g.world.camera.clone();camera.fov=40;camera.position.copy(center).add(new T.Vector3(24,13,27));camera.lookAt(center);camera.updateProjectionMatrix();
  g.world.renderer.render(g.scene,camera);
 });
 await page.screenshot({path:output+'/crew-in-world-inspection.png'});
 await page.evaluate(()=>{
  const {a,b}=subjects,g=LSW.game;a.faceDir(b.pos.x-a.pos.x,b.pos.z-a.pos.z);a.aim3.copy(b.pos).sub(a.pos).normalize();
  g.news.highlight('bighit','SOL — ENERGY CONTACT',{focus:b.pos,actor:a,target:b,priority:1,dur:3.5});
  g.controlPlayer=dt=>LSW.runSlot(a,'lmb',{pressed:!a.slots.lmb.active,held:true,released:false,dt},g);
 });
 await page.evaluate(()=>tick(6));await capture('impact-crash');await page.evaluate(()=>tick(16));await capture('attacker-hold');await page.evaluate(()=>tick(75));await capture('combat-two-shot');
 await page.evaluate(()=>{const {a,b}=subjects,g=LSW.game;LSW.runSlot(a,'lmb',{pressed:false,held:false,released:true,dt:1/30},g);g.controlPlayer=()=>{};b.takeDamage(4000,{src:a,dir:a.aim3,knock:75,launch:22});});
 await page.evaluate(()=>tick(10));
 const knockedOut=await page.evaluate(()=>!!subjects.b.ragdoll&&!subjects.b.alive);assert.equal(knockedOut,true);
 await capture('knockout');
 await page.evaluate(()=>LSW.game.endMatch({win:true,title:'VICTORY',lines:['Correspondent capture verification']}));
 await page.evaluate(()=>tick(45));await capture('winner');await page.evaluate(()=>tick(55));await capture('reporter-signoff');await page.evaluate(()=>tick(80));
 await page.evaluate(()=>LSW.game.news.flush());
 const result=await page.evaluate(()=>({clips:LSW.game.news.clips.map(c=>({tag:c.tag,frames:c.frames.length,ready:c.frames.filter(u=>u&&u[0]!=='#').length,shots:c.shots,width:c.width,height:c.height})),finished:LSW.game.news._finished,errors:LSW.game._errors}));result.ragdollOnKO=knockedOut;
 assert.ok(result.clips.some(c=>c.ready>10));assert.ok(result.clips.some(c=>c.shots.some(s=>s.kind==='attacker')));assert.ok(result.clips.some(c=>c.shots.some(s=>s.kind==='winner')));assert.ok(result.clips.some(c=>c.shots.some(s=>s.kind==='reporter')));assert.equal(result.finished,true);
 await page.locator('#nScript').click();await page.waitForTimeout(1800);
 const report=await page.evaluate(()=>({headline:document.querySelector('#nHead').textContent,copy:LSW.hud.el.end.innerText,witness:getComputedStyle(document.querySelector('#nWit')).display,arena:LSW.game.matchReport.arena}));
 assert.equal(report.arena,true);assert.match(report.headline,/SOL.*POWERWORLD/);
 assert.doesNotMatch(report.copy,/MIDTOWN PLAZA|FOUR-WAY|City desk|Civilians treated|Early estimate/);
 assert.equal(report.witness,'none');result.report=report;
 await page.screenshot({path:output+'/post-match-broadcast.png'});
 // Fetch every owned frame: catches invalid URLs left by pre-roll/replay ownership.
 const resources=await page.evaluate(async()=>{const u=LSW.game.news.clips.flatMap(c=>c.frames).filter(u=>u&&u[0]!=='#');return Promise.all(u.map(async url=>(await fetch(url)).ok));});assert.ok(resources.every(Boolean));
 assert.deepEqual(errors,[]);await writeFile(output+'/results.json',JSON.stringify({initial,result,resources:resources.length,errors},null,2));console.log(JSON.stringify({initial,result,resources:resources.length,errors},null,2));
}catch(e){await page.screenshot({path:output+'/failure.png'});console.error(await page.evaluate(()=>({errors:window.LSW?.game._errors,news:window.LSW?{enabled:LSW.game.news.enabled,rec:LSW.game.news.rec?.frames.length,clips:LSW.game.news.clips.length,t:LSW.game.news.t,shot:LSW.game.news._shot}:null})));throw e;}
finally{await context.close();await browser.close();}
