import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 const result=await page.evaluate(()=>{
  const {game:g,THREE:T}=LSW;g.update=()=>{};const rows=[],failures=[];
  const originalHit=g.onHit,originalInteract=g.doInteract;
  for(const hz of [30,60,120])for(const kind of ['body','throw','slam','ground-slam','interrupted','escape','frozen','sleep','fatal-slam']){
   g.startMode('powerworld',{p1:'sol',p2:'kano'});const a=g.player,b=g.entities.find(e=>e!==a&&!e.isDummy),events=[];
   for(const f of [a,b]){f.pos.set(0,kind==='ground-slam'?0:140,f===a?0:4.8);f.vel.set(0,0,0);f.flying=kind!=='ground-slam';f.gait=f.flying?'airborne':'grounded';f.invuln=0;f.hp=f.maxHp=10000;}
   a.faceDir(0,1);b.faceDir(0,-1);g.hardLock=b;
   // Comparable rank gives the defender a midpoint escape during the hoist;
   // a vastly stronger attacker can legitimately finish before that midpoint.
   if(kind==='escape'){b.teleEscape=true;b.def={...b.def,rank:66};}
   a._animate(1);b._animate(1);g.input.keys.clear();g.input.endFrame();
   g.onHit=function(v,n,o,blocked){if(v===b&&!o.dot&&!o.bleed)events.push({move:o.meleeMove|| (o.slam?'surface':'other'),y:v.pos.y});return originalHit.call(this,v,n,o,blocked);};
   let interactCalls=0,koDownward=null;g.doInteract=()=>{interactCalls++;return false;};
   const key=(code,on)=>dispatchEvent(new KeyboardEvent(on?'keydown':'keyup',{code,bubbles:true}));
   const edge=(t,at)=>t>=at&&t-1/hz<at-1e-7;
   for(let i=1;i<=hz*4;i++) {
    const t=i/hz;
    if(edge(t,.1))key('KeyG',true);if(edge(t,.15))key('KeyG',false);
    if(kind==='body'){if(edge(t,.4))key('KeyV',true);if(edge(t,.45))key('KeyV',false);if(edge(t,1.1))key('KeyG',true);if(edge(t,1.15))key('KeyG',false);}
    else if(kind==='throw'){if(edge(t,.55))key('KeyG',true);if(edge(t,.6))key('KeyG',false);}
    else {if(edge(t,.4))key('KeyV',true);if(edge(t,1.05))key('KeyV',false);}
    if(kind==='interrupted'&&edge(t,.7))a.takeDamage(1,{src:b,strike:true,hitstop:.05});
    if(kind==='frozen'&&edge(t,1.15))a.addFrost(10,b);
    if(kind==='sleep'&&edge(t,1.15))a.addSleep(2,b);
    if(kind==='fatal-slam'&&edge(t,1.15))b.hp=1;
    g.controlPlayer(1/hz);a.update(1/hz,g);b.move(new T.Vector3(),1/hz);b.update(1/hz,g);g.resolveBodies();g.input.endFrame();
    if(kind==='fatal-slam'&&b.ragdoll&&koDownward===null){const p=b.ragdoll.P.pelvis;koDownward=p.pos.y<p.prev.y;}
   }
   const row={hz,kind,events,held:!!a.grabbing,charge:a.meleeCharge,interactCalls,koDownward};rows.push(row);
   const expected={body:'body',throw:'throw',slam:'slam-release','ground-slam':'slam-release','fatal-slam':'slam-release'}[kind];
   if(expected&&!events.some(e=>e.move===expected))failures.push(`${kind}@${hz}: missing ${expected}`);
   if(['slam','ground-slam'].includes(kind)&&!events.some(e=>e.move==='surface'))failures.push(`${kind}@${hz}: missing actual surface impact`);
   if(['interrupted','escape','frozen','sleep'].includes(kind)&&events.some(e=>e.move==='slam-release'))failures.push(`${kind}@${hz}: finisher ignored escape/interrupt`);
   if(kind==='fatal-slam'&&koDownward!==true)failures.push(`${kind}@${hz}: ragdoll did not launch downward`);
   if(a.grabbing||b.grabbedBy||a.meleeCharge>0)failures.push(`${kind}@${hz}: stale hold/input`);
   if(['body','throw'].includes(kind)&&interactCalls!==1)failures.push(`${kind}@${hz}: held victim lost G priority`);
  }
  g.onHit=originalHit;g.doInteract=originalInteract;return {rows,failures};
 });
 await mkdir('artifacts/melee-depth',{recursive:true});await writeFile('artifacts/melee-depth/live-results.json',JSON.stringify({...result,errors},null,2));
 console.log(JSON.stringify({...result,errors},null,2));assert.deepEqual(result.failures,[]);assert.deepEqual(errors,[]);
}finally{await browser.close();}
