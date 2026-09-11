import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ROSTER} from '../src/data/characters.js';
import {Fighter} from '../src/engine/entity.js';
import {runSlot,clearSlotFx} from '../src/engine/abilities.js';
import {StudioCombat} from '../src/tool/studio-combat.js';

test('WEBLINE Web Darts is a finite direct web-control shot rather than an explosive energy volley',()=>{
 const shot=ROSTER.find(def=>def.id==='webline').abilities.q;
 assert.deepEqual(shot,{type:'projectile',name:'Web Darts',cost:7,cd:.55,damage:4,speed:130,radius:.55,blast:0,ground:false,color:'#eaffff',color2:'#fff',webControl:{duration:1.2,moveMult:.45,immunity:1}});
});

const source=id=>structuredClone(ROSTER.find(def=>def.id===id));
function fixture({strength=5,ccRecover=1,cover=[],phase=false,guard=false}={}){
 const world={scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(),cover,interiors:[],ARENA:900,heightAt:()=>0,shake(){},punch(){}};
 const combat=new StudioCombat(world.scene,world),g=combat.game;
 const targetDef=source('sarge');targetDef.strength=strength;
 const a=new Fighter(source('webline'),{team:0}),b=new Fighter(targetDef,{team:1});b.sheet.ccRecover=ccRecover;
 g.entities=[a,b];g.player=a;g.isHuman=f=>f===a;let denied=0;g.onNoKi=()=>denied++;
 for(const f of [a,b]){f._game=g;f.invuln=0;f.animT=0;f.pos.set(0,0,f===a?0:24);f.faceDir(0,f===a?1:-1);world.scene.add(f.obj);f._animate(0);f._sync();}
 a.aim3.set(0,0,1);a.hasAimWorld=true;b.center(a.aimWorld);b.phase=phase;b.guarding=guard;
 const dt=1/60;
 return {a,b,g,world,combat,get denied(){return denied;},cast(){runSlot(a,'q',{pressed:true,held:true,released:false,dt},g);},step(n=1){for(let i=0;i<n;i++){a.update(dt,g);b.update(dt,g);g.projectiles.update(dt,g);g.time+=dt;}},close(){a.dispose();b.dispose();combat.dispose();}};
}

test('a real traveled hit wraps the target, deals only direct damage, and scales movement without disabling attacks',()=>{
 const x=fixture();try{
  const hp=x.b.hp;x.cast();assert.equal(x.g.projectiles.list.length,1);assert.equal(x.g.projectiles.list[0].homing,0);
  x.step(18);assert.ok(x.b._webControl,'Traveling shot did not apply web control');assert.equal(x.b.hp,hp-4);assert.ok(x.b._webControl.wrap.parent,'Contacted target has no visible web wrapping');
  assert.equal(x.b.grabbedBy,null);assert.equal(x.b.stunT,0);assert.equal(x.b.frozenT,0);
  x.b.hitstop=0;x.b.staggerT=0;x.b.vel.set(0,0,0);x.b.move(new THREE.Vector3(0,0,1),.1);const slowed=x.b.vel.z;
  clearSlotFx(x.a);x.b.hitstop=0;x.b.staggerT=0;x.b.vel.set(0,0,0);x.b.move(new THREE.Vector3(0,0,1),.1);assert.ok(Math.abs(slowed/x.b.vel.z-.45)<.001,`movement ratio ${slowed/x.b.vel.z}`);
 }finally{x.close();}
});

test('strong and Resolve-trained targets recover sooner than the 1.2 second baseline',()=>{
 const normal=fixture({strength:5}),strong=fixture({strength:10}),resistant=fixture({strength:5,ccRecover:1.45});
 try{
  for(const x of [normal,strong,resistant]){x.cast();x.step(18);assert.ok(x.b._webControl);}
  assert.ok(normal.b._webControl.t<=1.2&&normal.b._webControl.t>1);
  assert.ok(strong.b._webControl.t<normal.b._webControl.t);
  assert.ok(resistant.b._webControl.t<normal.b._webControl.t);
 }finally{normal.close();strong.close();resistant.close();}
});

test('frontal guard, phase, status immunity, and solid cover reject web control',()=>{
 const wall={x:0,z:12,hx:5,hz:1,bottom:0,top:18,h:18,r:5,projectileShape:'box',hp:100,maxHp:100};
 for(const [name,options] of [['guard',{guard:true}],['phase',{phase:true}],['cover',{cover:[wall]}]]){
  const x=fixture(options);try{const hp=x.b.hp;x.cast();x.step(24);assert.ok(!x.b._webControl,name);assert.equal(x.g.projectiles.list.length,0,name);if(name==='cover')assert.equal(x.b.hp,hp,'solid cover admitted direct web damage');}finally{x.close();}
 }
 const immune=fixture();try{immune.b._webControlImmune=.8;immune.cast();immune.step(24);assert.ok(!immune.b._webControl);}finally{immune.close();}
});

test('blocked and expired web shots retire their owned geometry without area damage',()=>{
 const wall={x:0,z:12,hx:5,hz:1,bottom:0,top:18,h:18,r:5,projectileShape:'box',hp:100,maxHp:100};
 const blocked=fixture({cover:[wall]});try{
  let areas=0,disposed=0;blocked.g.areaDamage=()=>areas++;blocked.cast();
  for(const child of blocked.g.projectiles.list[0].obj.children)child.geometry.addEventListener('dispose',()=>disposed++);
  blocked.step(24);assert.equal(areas,0);assert.equal(disposed,2);assert.equal(blocked.g.projectiles.list.length,0);
 }finally{blocked.close();}
 const expired=fixture();try{
  let areas=0;expired.g.areaDamage=()=>areas++;expired.b.pos.z=800;expired.cast();expired.step(240);
  assert.equal(areas,0);assert.equal(expired.g.projectiles.list.length,0);assert.equal(expired.b._webControl,null);
 }finally{expired.close();}
});

test('repeated shots do not stack and expiry grants one second of post-effect immunity',()=>{
 const x=fixture();try{
  x.cast();x.step(18);const first=x.b._webControl,remaining=first.t,wrap=first.wrap;
  x.a.slots.q.cd=0;x.cast();x.step(18);assert.equal(x.b._webControl,first);assert.equal(first.wrap,wrap);assert.ok(first.t<remaining,'Repeated hit refreshed or stacked the timer');
  x.step(90);assert.equal(x.b._webControl,null);assert.ok(x.b._webControlImmune>0&&x.b._webControlImmune<=1);
  x.a.slots.q.cd=0;x.cast();x.step(18);assert.equal(x.b._webControl,null,'Post-effect immunity accepted an immediate re-web');
  x.step(70);x.a.slots.q.cd=0;x.cast();x.step(18);assert.ok(x.b._webControl,'Control did not become available after immunity');
 }finally{x.close();}
});

for(const reason of ['interrupt','ko','kit-cleanup'])test(`source ${reason} clears its active web without orphaning the wrap`,()=>{
 const x=fixture();try{x.cast();x.step(18);const wrap=x.b._webControl.wrap;assert.ok(wrap.parent);
  if(reason==='interrupt'){x.a.staggerT=1;x.step();}
  else if(reason==='ko')x.a._ko();
  else clearSlotFx(x.a);
  assert.ok(!x.b._webControl);assert.equal(wrap.parent,null);
 }finally{x.close();}
});

for(const reason of ['stagger','ko','form','dispose'])test(`source ${reason} before contact cancels only the control payload`,()=>{
 const x=fixture();try{const hp=x.b.hp;x.cast();
  if(reason==='stagger')x.a.staggerT=1;
  else if(reason==='ko')x.a._ko();
  else if(reason==='form')x.a.applyForm({name:'Changed',colors:{primary:'#d8e1e7'}});
  else x.a.dispose();
  x.step(24);assert.equal(x.b.hp,hp-4,'committed shot lost its direct contact');assert.equal(x.b._webControl,null,'interrupted source applied late control');
 }finally{x.close();}
});

test('active source form/disposal and target KO clear the wrap',()=>{
 for(const [owner,reason] of [['source','form'],['source','dispose'],['target','ko']]){const x=fixture();try{x.cast();x.step(18);const wrap=x.b._webControl.wrap;
  if(owner==='target')x.b._ko();else if(reason==='form')x.a.applyForm({name:'Changed',colors:{primary:'#d8e1e7'}});else x.a.dispose();
  assert.equal(x.b._webControl,null);assert.equal(wrap.parent,null);
 }finally{x.close();}}
});

test('target form replacement and disposal release web geometry exactly once',()=>{
 for(const reason of ['form','dispose']){const x=fixture();try{x.cast();x.step(18);const wrap=x.b._webControl.wrap;let disposed=0;
  wrap.traverse(node=>node.geometry?.addEventListener('dispose',()=>disposed++));
  if(reason==='form')x.b.applyForm({name:'Armored',colors:{primary:'#415a64'}});else x.b.dispose();
  assert.equal(wrap.parent,null);assert.ok(disposed>0,`${reason} did not dispose web geometry`);assert.ok(!x.b._webControl);
 }finally{x.close();}}
});

test('an unaffordable web-control press launches nothing and uses native denial feedback',()=>{
 const x=fixture();try{x.a.ki=0;x.cast();assert.equal(x.g.projectiles.list.length,0);assert.equal(x.denied,1);assert.equal(x.a.slots.q.cd,0);}finally{x.close();}
});
