// Self-contained: passed directly to Playwright evaluate; never invokes gameplay methods.
export function snapshotBrowser(){
 const g=globalThis.PW?.game;if(!g)return {version:1,available:false};
 const num=v=>Number.isFinite(v)?v:null,text=v=>typeof v==='string'?v.slice(0,180):null;
 const vec=v=>v?[num(v.x),num(v.y),num(v.z)]:null;
 const player=g.player,origin=player?.pos;
 const near=p=>origin&&p?Math.hypot(p.x-origin.x,(p.y||0)-origin.y,p.z-origin.z):Infinity;
 const actor=a=>a?{id:a.id??null,hero:text(a.def?.id),class:text(a.def?.archetype),pos:vec(a.pos),velocity:vec(a.vel),hp:num(a.hp),energy:num(a.ki),alive:!!a.alive,flying:!!a.flying,meleeState:text(a.mstate),guarding:!!a.guarding,grabbing:a.grabbing?.id??null,grabbedBy:a.grabbedBy?.id??null,grabState:text(a.grabState),launchTime:num(a.launchT),selectedPower:text(a._selSlot),approach:a._meleeMotion?{family:text(a._meleeMotion.family),point:vec(a._meleeMotion.point)}:null}:null;
 const colliders=(g.world?.cover||[]).map((c,index)=>({c,index,d:origin?Math.hypot(Math.max(0,Math.abs(c.x-origin.x)-(c.hx||0)),Math.max(0,Math.abs(c.z-origin.z)-(c.hz||0))):Infinity})).filter(x=>x.d<=120).sort((a,b)=>a.d-b.d);
 const trial=g.ms?.threatLab?.meleeTrial;
 const heldPerson=player?.grabbing,heldProp=player?._carry;
 const suspended=!g.running||g.combatOverlayOpen||!player?.alive;
 const inputContext={
  observedOnly:true,suspended:!!suspended,
  reason:!g.running?'not running':g.combatOverlayOpen?'overlay':!player?.alive?'no living player':null,
  interaction:heldPerson?{mode:'manage-person',target:heldPerson.id??null,tap:'set down when possible, otherwise release',holdRelease:'arm throw then throw',carrying:!!player._personCarry}:
   heldProp?{mode:'manage-prop',kind:text(heldProp.kind),tap:'drop',holdRelease:'throw'}:
   g._focus?{mode:'focused-interaction',id:text(g._focus.id),prompt:text(g._focus.verb),eligibility:'focus last observed; handler rechecks at input'}:
   {mode:'acquire',priority:['interact','pickup gear','lift prop','grab person'],eligibility:'unresolved; proximity, facing and combat state still apply'},
  powers:Object.entries(player?.slots||{}).slice(0,16).map(([key,s])=>({slotId:text(key),name:text(s.def?.name),type:text(s.def?.type),cooldown:num(s.cd),charging:!!s.charging,active:!!s.active,sustainTime:num(s.sustainT),entryCost:num(s.def?.cost),energyPerSecond:num(s.def?.kiPerSec)})),
  gadgets:(player?.items||[]).slice(0,16).map(i=>({kind:text(i.kind),name:text(i.name),charges:num(i.charges),cooldown:num(i.cd),state:text(i.state)}))
 };
 return {version:1,available:true,time:num(g.time),units:'position: world units; velocity: world units/second',running:!!g.running,overlay:!!g.combatOverlayOpen,inputContext,player:actor(player),target:actor(trial?.target),
  actors:(g.entities||[]).filter(a=>a!==player&&near(a.pos)<=120).sort((a,b)=>near(a.pos)-near(b.pos)).slice(0,24).map(actor),
  focus:g._focus?{id:text(g._focus.id),label:text(g._focus.label),verb:text(g._focus.verb),pos:vec(g._focus.pos),radius:num(g._focus.r)}:null,
  colliders:colliders.slice(0,32).map(({c,index,d})=>({id:text(c.id),snapshotIndex:index,x:num(c.x),z:num(c.z),hx:num(c.hx),hz:num(c.hz),bottom:num(c.bottom),top:num(c.top),distanceXZ:d,threatRoom:!!c.threatRoom})),collidersNearby:colliders.length,
  drill:trial?{kind:text(trial.kind),records:(trial.records||[]).slice(-20).map(r=>Object.fromEntries(['time','trial','result','amount','blocked','healthLost','guardEnergySpent','move'].map(k=>[k,typeof r[k]==='string'?text(r[k]):typeof r[k]==='boolean'?r[k]:num(r[k])])))}:null};
}
