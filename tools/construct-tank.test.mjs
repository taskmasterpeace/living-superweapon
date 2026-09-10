import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Construct} from '../src/engine/summons.js';
import {Fighter} from '../src/engine/entity.js';
import {runSlot} from '../src/engine/abilities.js';
import {settleConstructUpkeep} from '../src/engine/construct-policy.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {ROSTER} from '../src/data/characters.js';
import {coverBoxEntry,sweepSplitObstacle} from '../src/engine/projectile-contact.js';

function fixture(t,extra={}){
 const scene=new THREE.Scene(),world={scene,camera:new THREE.PerspectiveCamera(),cover:[],coverAll:[],interiors:[],ARENA:240,heightAt:()=>0,shake(){},punch(){},refreshFogBoxes(){this.fogUpdates=(this.fogUpdates||0)+1;}};
 const stage=new StudioCombat(scene,world),g=stage.game,f=new Fighter(structuredClone(ROSTER.find(d=>d.id==='aurum')));
 f._game=g;f.team=1;f.isPlayer=true;f.ki=100;f.level=10;f.invuln=0;f.pos.set(0,0,0);f.aim.set(0,0,1);f.sheet.kiRegenMult=0;g.entities=[f];g.player=f;scene.add(f.obj);g.aimPoint.set(0,0,60);
 const def={type:'construct',construct:'tank',cost:24,cd:8,duration:12,moveSpeed:12,turnRate:1.8,damage:18,interval:1.2,speed:90,range:90,blast:6,color:'#7dff9e',...extra};
 const st=f.slots.q={def,cd:0,active:null};
 const cast=()=>runSlot(f,'q',{pressed:true,held:true,released:false,dt:1/60},g);
 const spawn=()=>g.spawnConstruct(f,def,st);
 const foe=(x=0,y=0,z=65)=>{
  const e=new Fighter(structuredClone(ROSTER.find(d=>d.id==='sol')));e._game=g;e.team=2;e.invuln=0;e.armor=0;e.resist={};e.hp=e.maxHp=1000;e.pos.set(x,y,z);e.obj.position.copy(e.pos);e._animate(0);e._sync();g.entities.push(e);scene.add(e.obj);return e;
 };
 t.after(()=>{stage.dispose();for(const e of g.entities)e.dispose();});
 return {g,f,world,def,st,cast,spawn,foe,step:(c,dt)=>{g.time+=dt;c.update(dt,g);}};
}
const angle=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
test('native tank has tracked hull, independently pivoted turret/barrel and one finite cover proxy',t=>{
 const {g,f,world,cast,st}=fixture(t);cast();const c=st.active;assert.ok(c instanceof Construct);
 for(const name of ['construct-tank-hull','construct-tank-track-left','construct-tank-track-right','construct-tank-turret','construct-tank-barrel'])assert.ok(c.obj.getObjectByName(name),name);
 assert.notEqual(c.body.geometry.type,'ConeGeometry');assert.equal(world.cover.length,1);assert.equal(world.coverAll.length,0);
 assert.deepEqual(c.pos.toArray(),[0,0,16]);assert.equal(c._cover.hx,5);assert.equal(c._cover.hz,7);assert.equal(c._cover.bottom,0);assert.equal(c._cover.top,8);
 assert.equal(c._cover.hp,undefined);assert.ok(c._cover.construct===c);assert.equal(f.ki,76);
 assert.ok(g.spawnConstruct(f,st.def,st)===c);assert.equal(g.constructs.length,1);
});
for(const blocker of ['cover','interior','fighter','arena'])test(`native ${blocker} rejects tank placement before payment, FX, cover or geometry allocation`,t=>{
 const {g,f,world,cast,st,foe}=fixture(t);
 if(blocker==='cover')world.cover.push({x:0,z:16,hx:1,hz:1,h:10});
 if(blocker==='interior')world.interiors.push({x:0,z:16,hx:30,hz:30,top:15,walls:[{x:0,z:16,hx:10,hz:1}]});
 if(blocker==='fighter')foe(0,0,16);
 if(blocker==='arena')world.ARENA=20;
 const children=g.scene.children.length,cover=world.cover.length,fx=g.vfx.fx.length;cast();
 assert.ok(st.active==null);assert.equal(st.placementDenied,true);assert.equal(f.ki,100);assert.equal(st.cd,0);assert.equal(g.scene.children.length,children);assert.equal(world.cover.length,cover);assert.equal(g.vfx.fx.length,fx);
});
test('successful retry clears placement denial and uses horizontal normalized aim plus terrain height',t=>{
 const {f,world,cast,st}=fixture(t);world.ARENA=20;cast();world.ARENA=240;world.heightAt=()=>3;f.aim.set(0,9,4);cast();
 assert.equal(st.placementDenied,false);assert.deepEqual(st.active.pos.toArray(),[0,3,16]);assert.equal(st.active._cover.bottom,3);assert.equal(st.active._cover.top,11);
});
for(const hz of [30,60,120])test(`native tank drives at bounded speed and refreshes moving fog at most 10 Hz (${hz}Hz)`,t=>{
 const {world,spawn,step}=fixture(t),c=spawn();const z=c.pos.z,fog=world.fogUpdates;
 for(let i=0;i<hz;i++)step(c,1/hz);
 assert.ok(c.pos.z>z+11.9&&c.pos.z<=z+12+1e-8);assert.equal(c.state,'moving');assert.ok((world.fogUpdates-fog)<=10);
 assert.equal(c._cover.z,c.pos.z);assert.deepEqual(c.obj.position.toArray(),c.pos.toArray());
});
test('native tank turns at configured rate and cannot translate before heading aligns',t=>{
 const {g,spawn,step}=fixture(t),c=spawn(),p=c.pos.clone();g.aimPoint.set(80,0,16);const yaw=c.obj.rotation.y;step(c,.2);
 assert.ok(angle(c.obj.rotation.y,yaw)<=.36+1e-9);assert.ok(angle(c.obj.rotation.y,yaw)>.3);assert.ok(c.pos.distanceTo(p)<1e-9);
});
test('native 0.2-second tank step cannot tunnel through a thin wall',t=>{
 const {world,spawn,step}=fixture(t,{moveSpeed:40}),c=spawn();world.cover.push({x:0,z:35,hx:15,hz:.1,h:15,projectileShape:'box'});step(c,.2);
 assert.ok(c.pos.z<24);assert.equal(c.state,'blocked');assert.ok(c._cover.z+c._cover.hz<=34.9+1e-9);
});
test('native in-place rotation into cover leaves last safe yaw and box',t=>{
 const {g,world,spawn,step}=fixture(t),c=spawn();world.cover.push({x:5.2,z:16,hx:.1,hz:20,h:15});g.aimPoint.set(80,0,16);const yaw=c.obj.rotation.y;step(c,.2);
 assert.equal(c.obj.rotation.y,yaw);assert.equal(c.state,'blocked');assert.equal(c._cover.hx,5);assert.equal(c.pos.z,16);
});
for(const blocker of ['fighter','interior','arena','height'])test(`native tank stops safely at ${blocker} and never rams a Fighter`,t=>{
 const {g,world,spawn,step,foe}=fixture(t,{moveSpeed:40}),c=spawn();let e;
 if(blocker==='fighter')e=foe(0,0,27);
 if(blocker==='interior')world.interiors.push({x:0,z:25,hx:30,hz:30,top:16,walls:[{x:0,z:25,hx:20,hz:.1}]});
 if(blocker==='arena')world.ARENA=25;
 if(blocker==='height')world.heightAt=(x,z)=>z>18?3:0;
 step(c,.2);assert.equal(c.state,'blocked');assert.ok(c.pos.z<24);assert.equal(c._cover.z,c.pos.z);if(e)assert.equal(e.hp,1000);
 g.aimPoint.copy(c.pos);step(c,.1);assert.equal(c.state,'holding');
});
test('non-primary tank follows owner direction, not another human cursor',t=>{
 const {g,f,spawn,step}=fixture(t),c=spawn();g.player={};g.aimPoint.set(100,0,16);f.aim.set(0,0,1);step(c,.2);
 assert.equal(c.obj.rotation.y,0);assert.ok(c.pos.z>16);assert.equal(c.pos.x,0);
});
test('native tank holds at destination and final stop refreshes fog',t=>{
 const {g,world,spawn,step}=fixture(t),c=spawn();g.aimPoint.set(0,0,20);step(c,.1);const fog=world.fogUpdates;
 for(let i=0;i<20;i++)step(c,1/60);
 assert.equal(c.state,'holding');assert.ok(c.pos.distanceTo(g.aimPoint)<=2+1e-8);assert.ok(world.fogUpdates>fog);
});
test('native tank acquires from its hull, fires from visible muzzle and hits a real Fighter',t=>{
 const {g,f,spawn,step,foe}=fixture(t,{range:60}),c=spawn(),e=foe(0,0,70);g.aimPoint.copy(c.pos);step(c,1/60);
 assert.equal(g.projectiles.list.length,1);const p=g.projectiles.list[0];assert.ok(p.caster===f);assert.equal(p.damage,18);assert.equal(p.radius,1);assert.ok(Math.abs(p.vel.length()-90)<1e-9);
 const tip=c.obj.getObjectByName('construct-tank-muzzle');assert.ok(tip);assert.ok(p.pos.distanceTo(tip.getWorldPosition(new THREE.Vector3()))<1e-8);
 assert.equal(coverBoxEntry(p.pos,p.pos,c._cover,1.2,1.2),Infinity,'projectile begins beyond its expanded hull');
 assert.equal(e.hp,1000,'no direct target damage at spawn');for(let i=0;i<60;i++)g.projectiles.update(1/60,g);assert.ok(e.hp<1000,'native outgoing projectile must actually contact');
});
test('native independent turret slews at bounded rate and cannot fire before alignment',t=>{
 const {g,spawn,step,foe}=fixture(t),c=spawn();g.aimPoint.copy(c.pos);foe(60,0,16);step(c,.2);
 assert.equal(c.obj.rotation.y,0);assert.equal(g.projectiles.list.length,0);assert.ok(c.turret);assert.ok(angle(c.turret.rotation.y,0)<=.6+1e-9);assert.ok(c.turret.rotation.y>.5);
 for(let i=0;i<30;i++)step(c,1/60);assert.ok(g.projectiles.list.length>0);
});
for(const block of ['cover','interior','moving','above-pitch'])test(`native tank does not fire when ${block} makes its shot ineligible`,t=>{
 const {g,world,spawn,step,foe}=fixture(t),c=spawn();foe(0,block==='above-pitch'?100:0,70);if(block!=='moving')g.aimPoint.copy(c.pos);
 if(block==='cover')world.cover.push({x:0,z:26,hx:20,hz:.1,h:20,projectileShape:'box'});
 if(block==='interior')world.interiors.push({x:0,z:26,hx:20,hz:20,top:20,walls:[{x:0,z:26,hx:20,hz:.1}]});
 for(let i=0;i<20;i++)step(c,1/60);assert.equal(g.projectiles.list.length,0);assert.ok(c.fireCd<=0,'an obstructed opportunity cannot reset shot cooldown');
});
test('native cannon obeys interval without per-shot ki fees and stops instantly on exhaustion',t=>{
 const {g,f,spawn,step,foe}=fixture(t,{constructLifetime:'upkeep',constructKiPerSec:5}),c=spawn();g.aimPoint.copy(c.pos);foe();
 step(c,1/60);assert.equal(g.projectiles.list.length,1);const ki=f.ki;
 for(let i=0;i<60;i++)step(c,1/60);assert.equal(g.projectiles.list.length,1);assert.equal(f.ki,ki);
 for(let i=0;i<15;i++)step(c,1/60);assert.equal(g.projectiles.list.length,2);
 f.ki=.1;settleConstructUpkeep(g,1/60);settleConstructUpkeep(g,1/60);const count=g.projectiles.list.length;step(c,1);
 assert.equal(c.dead,true);assert.equal(g.projectiles.list.length,count);assert.ok(g.projectiles.list.every(p=>p.caster===f));
});
test('native timed tank survives KO, rebinds its slot and dismisses without a second entry payment',t=>{
 const {g,f,cast,st}=fixture(t);cast();const c=st.active;f._ko();assert.equal(c.dead,false);assert.ok(st.active==null);
 f.state='idle';f.ki=1;st.cd=5;cast();assert.equal(c.dead,true);assert.equal(c.reason,'dismissed');assert.equal(f.ki,1);assert.equal(g.constructs.length,1);
});
test('native tank disposal removes all unique geometry/materials, collider and fog exactly once',t=>{
 const {g,world,spawn}=fixture(t),c=spawn(),resources=new Map();c.obj.traverse(o=>{for(const r of [o.geometry,...(Array.isArray(o.material)?o.material:[o.material])].filter(Boolean))if(!resources.has(r)){resources.set(r,0);r.addEventListener('dispose',()=>resources.set(r,resources.get(r)+1));}});
 const fog=world.fogUpdates;c._dispose(g,'dismissed');c._dispose(g);assert.equal(world.cover.length,0);assert.equal(c.obj.parent,null);assert.equal(world.fogUpdates,fog+1);assert.ok([...resources.values()].every(n=>n===1));
});
test('rendered tank hull, tracks, wheels and turret fit its declared protection envelope',t=>{
 const {spawn}=fixture(t),c=spawn();c.obj.updateMatrixWorld(true);const box=new THREE.Box3();
 c.obj.traverse(o=>{if(o.isMesh&&o!==c.barrel&&o.name!=='construct-surface-edges'){o.geometry.computeBoundingBox();box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));}});
 assert.ok(box.min.x>=-5-1e-6&&box.max.x<=5+1e-6,`rendered width ${box.min.x}..${box.max.x}`);
 assert.ok(box.min.z>=9-1e-6&&box.max.z<=23+1e-6);assert.ok(box.min.y>=-1e-6&&box.max.y<=8+1e-6);
});
test('tank surfaces follow native turret yaw and barrel pitch with independent materials and bounded particles',t=>{
 const {g,spawn,step,foe}=fixture(t,{constructFx:{density:2,assemblyTime:.15}}),c=spawn();g.aimPoint.copy(c.pos);const e=foe(60,15,16);
 assert.equal(c.articulatedSurfaceFx?.length,2);const skins=[c.surfaceFx,...c.articulatedSurfaceFx];
 assert.ok(skins.reduce((sum,s)=>sum+s.geometry.attributes.position.count,0)<=2048);
 const materials=skins.map(s=>s._solidMaterials.map(x=>x.material));assert.equal(new Set(materials.flat()).size,materials.flat().length,'solid opacity cannot be written by two skins');
 const barrelSkin=c.articulatedSurfaceFx.find(s=>s.root===c.barrel);assert.ok(barrelSkin);
 const oldMatrix=c.barrel.matrixWorld.clone();step(c,.2);step(c,.2);
 assert.ok(c.turret.rotation.y>1);assert.ok(c.barrelPitchPivot.rotation.x<-.1);
 const points=barrelSkin.points,attr=points.geometry.attributes.position,worldPoint=new THREE.Vector3().fromBufferAttribute(attr,0).applyMatrix4(points.matrixWorld);
 const barrelLocal=worldPoint.clone().applyMatrix4(c.barrel.matrixWorld.clone().invert());
 assert.ok(Math.hypot(barrelLocal.x,barrelLocal.z)<.85&&Math.abs(barrelLocal.y)<=7.6);
 assert.ok(worldPoint.distanceTo(new THREE.Vector3().fromBufferAttribute(attr,0).applyMatrix4(oldMatrix))>2,'live particle follows articulation, not an old world outline');
 const arrays=skins.map(s=>s._targets);e.pos.set(-60,8,16);step(c,.3);skins.forEach((s,i)=>assert.ok(s._targets===arrays[i],'no resampling/reallocation each frame'));
});
test('tank rejects non-finite, explicit-null and out-of-range motion/cannon settings without allocation',t=>{
 const {g,f,def,st}=fixture(t);for(const [key,value] of [['moveSpeed',NaN],['moveSpeed',null],['turnRate',7],['damage',0],['blast',0],['interval',Infinity]]){
  st.def={...def,[key]:value};const count=g.scene.children.length;assert.throws(()=>g.spawnConstruct(f,st.def,st),/tank/);assert.equal(g.scene.children.length,count);
 }
});
test('native cannon clearance follows the actual tolerated barrel angle, not only the desired target ray',t=>{
 const {g,world,spawn,step,foe}=fixture(t),c=spawn();g.aimPoint.copy(c.pos);foe(Math.tan(.07)*54,0,70);
 world.cover.push({x:0,z:42,hx:.1,hz:.1,h:20,projectileShape:'box'});step(c,.001);
 assert.equal(g.projectiles.list.length,0,'current barrel lane is obstructed although the ideal target ray clears');
 world.cover.pop();step(c,.001);assert.equal(g.projectiles.list.length,1,'the same aligned opportunity can fire once clear');
});
test('native cannon cannot emit beyond a close target and leaves its shot cooldown ready',t=>{
 const {g,spawn,step,foe}=fixture(t),c=spawn(),e=foe(0,0,26);g.aimPoint.copy(c.pos);step(c,1/60);
 assert.equal(g.projectiles.list.length,0,'10u target lies behind the fixed14.5u muzzle');assert.ok(c.fireCd<=0);
 for(let i=0;i<60;i++)g.projectiles.update(1/60,g);assert.equal(e.hp,1000,'no invented close-range damage');
 e.pos.z=65;step(c,1/60);assert.equal(g.projectiles.list.length,1,'ordinary safe-distance fire remains ready');
});
for(const hz of [30,60,120])test(`native turret acquisition and loss preserve bounded world yaw through hull turns (${hz}Hz)`,t=>{
 const {g,spawn,step,foe}=fixture(t),c=spawn(),yaw=()=>{c.obj.updateMatrixWorld(true);const d=c.turret.getWorldDirection(new THREE.Vector3());return Math.atan2(d.x,d.z);};
 g.aimPoint.set(80,0,16);for(let i=0;i<Math.round(1.2*hz);i++)step(c,1/hz);g.aimPoint.copy(c.pos);const before=yaw(),e=foe(c.pos.x+60,0,c.pos.z);
 step(c,1/hz);assert.ok(angle(yaw(),before)<=3/hz+1e-8,`acquisition delta ${angle(yaw(),before)}`);
 e.team=1;g.aimPoint.set(c.pos.x-80,0,c.pos.z);
 for(let i=0;i<20;i++){const old=yaw();step(c,1/hz);assert.ok(angle(yaw(),old)<=3/hz+1e-8);}
 e.team=2;const old=yaw();step(c,1/hz);assert.ok(angle(yaw(),old)<=3/hz+1e-8,'reacquisition during motion cannot snap');
});
function barrelClear(c,world){
 c.obj.updateMatrixWorld(true);const a=c.turret.getWorldPosition(new THREE.Vector3()),b=c.muzzle.getWorldPosition(new THREE.Vector3());
 return !sweepSplitObstacle({cover:world.cover.filter(x=>x!==c._cover),interiors:world.interiors},a,b,.62,{},false,.62);
}
test('native placement rejects a barrel obstacle outside the protected hull without billing',t=>{
 const {f,world,cast,st}=fixture(t);world.cover.push({x:0,z:28,hx:3,hz:.1,h:14,projectileShape:'box'});cast();
 assert.ok(st.active==null);assert.equal(st.placementDenied,true);assert.equal(f.ki,100);assert.equal(world.cover.length,1);
});
for(const lane of ['cover','interior'])test(`native translation stops before its real barrel enters ${lane}, protection box unchanged`,t=>{
 const {world,spawn,step}=fixture(t,{moveSpeed:40}),c=spawn();
 const wall={x:0,z:35,hx:20,hz:.1,h:14,top:14,projectileShape:'box'};
 if(lane==='cover')world.cover.push(wall);else world.interiors.push({x:0,z:35,hx:20,hz:20,top:14,walls:[wall]});
 assert.equal(barrelClear(c,world),true,'fixture begins outside the actual barrel');step(c,.2);
 assert.equal(c.state,'blocked');assert.equal(barrelClear(c,world),true);assert.equal(c._cover.hx,5);assert.equal(c._cover.hz,7);
 assert.ok(c.pos.z>16&&c.pos.z<20,'stop at the last safe barrel pose, not an expanded armor box');
});
test('native turret angular substeps cannot swing a barrel through a thin obstacle',t=>{
 const {g,world,spawn,step,foe}=fixture(t),c=spawn();g.aimPoint.copy(c.pos);foe(60,0,16);
 world.cover.push({x:7,z:25,hx:.1,hz:.1,h:14,projectileShape:'box'});assert.equal(barrelClear(c,world),true);
 step(c,1);assert.equal(barrelClear(c,world),true);assert.ok(c.turret.rotation.y<.66);assert.equal(g.projectiles.list.length,0);
});
test('native barrel pitch slews at3rad/s and preserves the last clear articulated pose',t=>{
 const {g,world,spawn,step,foe}=fixture(t),c=spawn();g.aimPoint.copy(c.pos);foe(0,37,70);
 const before=c.barrelPitchPivot.rotation.x;step(c,1/60);assert.ok(Math.abs(c.barrelPitchPivot.rotation.x-before)<=.05+1e-9);assert.equal(g.projectiles.list.length,0);
 // Existing native box contacts have no lower plane until Task3; a low obstacle
 // begins clear, then prevents the real barrel from pitching downward through it.
 const e=g.entities[1];e.pos.y=-5;
 world.cover.push({x:0,z:26,hx:2,hz:2,top:5,h:5,projectileShape:'box'});assert.equal(barrelClear(c,world),true);
 for(let i=0;i<30;i++)step(c,1/60);assert.equal(barrelClear(c,world),true);
});
