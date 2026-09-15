import test from 'node:test';
import * as THREE from 'three';
import assert from 'node:assert/strict';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {runSlot,clearSlotFx} from '../src/engine/abilities.js';
import {POWERS} from '../src/data/creator.js';

function fixture(){
 const x=mainCombatFixture({hero:'kano',mode:'powerworld'});x.p._openSky=true;
 x.def={type:'guidedSpear',name:'Crimson Spear',gear:true,cost:8,cd:.6,damage:18,speed:100,returnSpeed:130,steer:3,range:140,throwWindup:.3,throwRecovery:.2};
 x.p.slots.q={def:x.def,cd:0};x.slot=x.p.slots.q;
 x.press=()=>runSlot(x.p,'q',{pressed:true,held:true,released:false,dt:1/60},x.g);
 x.tick=(dt=1/60,held=false)=>{x.g.time+=dt;runSlot(x.p,'q',{pressed:false,held,released:!held,dt},x.g);x.p.animT+=dt;x.p.advanceActionPose(dt);x.p._animate(dt);x.g.projectiles.update(dt,x.g);};
 x.release=()=>{x.press();for(let i=0;i<30&&x.slot.spear?.state!=='outbound';i++)x.tick();assert.equal(x.slot.spear?.state,'outbound');return x.slot.spear;};
 return x;
}
test('one paid physical spear winds up in hand and releases once through production slot',()=>{
 const x=fixture();try{x.press();assert.ok(x.slot.spear);const s=x.slot.spear,mesh=s.obj,ki=x.p.ki;assert.equal(s.state,'windup');assert.ok(mesh.parent!==x.g.scene);
 x.press();assert.equal(x.slot.spear,s);assert.equal(x.p.ki,ki);for(let i=0;i<30;i++)x.tick();assert.equal(s.state,'outbound');assert.equal(s.obj,mesh);assert.equal(mesh.parent,x.g.scene);assert.equal(x.g.projectiles.list.filter(p=>p===s).length,1);
 }finally{x.close();}
});
test('outbound guidance turns toward live aim with bounded angular speed',()=>{
 const x=fixture();try{const s=x.release(),before=s.vel.clone().normalize();x.p.aim3.set(1,0,0);x.tick(.1,true);const angle=before.angleTo(s.vel);assert.ok(angle>0&&angle<=x.def.steer*.1+.0001);}finally{x.close();}
});
test('first swept body contact embeds, follows victim, waits and does not redamage',()=>{
 const x=fixture();try{const target=x.foe({z:28});const s=x.release();for(let i=0;i<45&&s.state==='outbound';i++)x.tick();assert.equal(s.state,'embedded');const hp=target.hp,old=s.pos.clone();target.pos.x+=5;x.tick();assert.ok(Math.abs(s.pos.x-old.x-5)<.001);for(let i=0;i<60;i++)x.tick();assert.equal(target.hp,hp);assert.equal(s.state,'embedded');assert.ok(hp<target.maxHp);}finally{x.close();}
});
test('recall costs no energy and catches the same object; a new throw reuses it',()=>{
 const x=fixture();try{const s=x.release(),obj=s.obj;for(let i=0;i<10;i++)x.tick();x.p.ki=0;x.press();assert.equal(s.state,'returning');for(let i=0;i<100&&s.state!=='held';i++)x.tick();assert.equal(s.state,'held');assert.equal(s.obj,obj);assert.ok(obj.parent!==x.g.scene);x.p.ki=100;x.slot.cd=0;x.press();assert.equal(x.slot.spear,s);assert.equal(s.state,'windup');}finally{x.close();}
});
test('clearing or removing the slot disposes all spear resources and ownership',()=>{
 const x=fixture();try{const s=x.release();let disposed=0;s.obj.traverse(o=>o.geometry?.addEventListener('dispose',()=>disposed++));clearSlotFx(x.p);assert.equal(s.dead,true);assert.equal(s.obj.parent,null);assert.ok(disposed>0);assert.equal(x.slot.spear,null);}finally{x.close();}
});
test('optional creator catalog exposes a guided spear with black body and crimson tip',()=>{
 const entry=POWERS.find(p=>p.ab.type==='guidedSpear');assert.ok(entry);assert.equal(entry.ab.color,'#17191d');assert.equal(entry.ab.color2,'#bd2337');
});

for(const hz of [30,60,120])test(`thin cover catches the spear at ${hz}Hz and does not auto-return`,()=>{
 const x=fixture();try{let hits=0;const cover={x:0,z:24,hx:20,hz:.02,top:100,h:100,projectileShape:'box',hp:100,onConstructHit(damage,opts){hits++;this.hp-=damage;assert.equal(opts.src,x.p);}};x.w.cover.push(cover);const s=x.release();for(let i=0;i<hz&&s.state==='outbound';i++)x.tick(1/hz);assert.equal(s.state,'embedded');assert.ok(s.pos.z<24);for(let i=0;i<hz;i++)x.tick(1/hz);assert.equal(s.state,'embedded');assert.equal(hits,1);assert.equal(cover.hp,100-x.def.damage);}finally{x.close();}
});
test('return cannot teleport through a newly intervening wall and can retry from a clear route',()=>{
 const x=fixture();try{const s=x.release();for(let i=0;i<25;i++)x.tick();const far=s.pos.z;
 const wall={x:0,z:far/2,hx:20,hz:.05,top:100,h:100,projectileShape:'box'};x.w.cover.push(wall);x.press();for(let i=0;i<100&&s.state==='returning';i++)x.tick();assert.equal(s.state,'blocked');assert.ok(s.pos.z>wall.z);x.w.cover.length=0;x.press();for(let i=0;i<100&&s.state!=='held';i++)x.tick();assert.equal(s.state,'held');}finally{x.close();}
});
test('busy hands leave a safe waiting spear and freeing a hand catches the original mesh',()=>{
 const x=fixture();try{const s=x.release(),obj=s.obj;for(let i=0;i<12;i++)x.tick();const hands=[x.p.parts.armL.children[2],x.p.parts.armR.children[2]];for(const h of hands)h.userData.gripOccupied=true;
 x.press();for(let i=0;i<100&&s.state!=='waiting';i++)x.tick();assert.equal(s.state,'waiting');assert.equal(obj.parent,x.g.scene);for(const h of hands)h.userData.gripOccupied=false;
 for(let i=0;i<30&&s.state!=='held';i++)x.tick();assert.equal(s.state,'held');assert.equal(s.obj,obj);}finally{x.close();}
});
test('freeze cancels an unreleased throw and zero-time preview cannot advance windup',()=>{
 const x=fixture();try{x.press();const s=x.slot.spear,p=x.p._guidedSpearPose;x.tick(0);assert.equal(p.elapsed,0);x.p.frozenT=1;x.tick();assert.equal(s.state,'held');assert.equal(x.p._guidedSpearPose,null);x.p.frozenT=0;for(let i=0;i<40;i++)x.tick();assert.equal(s.state,'held');}finally{x.close();}
});
for(const kind of ['slot','death','reset'])test(`${kind} retirement disposes the owned spear exactly once`,()=>{
 const x=fixture();try{const s=x.release();let disposed=0;s.obj.children[0].geometry.addEventListener('dispose',()=>disposed++);
 if(kind==='slot')delete x.p.slots.q;else if(kind==='death')x.p.state='ko';else s._dispose();x.g.projectiles.update(1/60,x.g);s._dispose();assert.equal(s.dead,true);assert.equal(disposed,1);assert.ok(!x.g.projectiles.list.includes(s));assert.equal(s.obj.parent,null);}finally{x.close();}
});
test('phase and allied bodies cannot acquire a hostile spear embed or damage',()=>{
 const x=fixture();try{const phase=x.foe({z:20}),ally=x.foe({z:32,team:x.p.team});phase.phase=true;const s=x.release();for(let i=0;i<45;i++)x.tick();assert.equal(phase.hp,phase.maxHp);assert.equal(ally.hp,ally.maxHp);assert.equal(s.state,'outbound');}finally{x.close();}
});
test('studio supports the optional type and validates real steering bounds',async()=>{
 const {supportsAttackRehearsal}=await import('../src/tool/studio-combat.js');const {setAttackOverride}=await import('../src/data/attack-tuning.js');
 const x=fixture();try{assert.ok(supportsAttackRehearsal(x.def));const def={...x.p.def,abilities:{q:x.def}};assert.throws(()=>setAttackOverride({},def,'q',{steer:100}));assert.doesNotThrow(()=>setAttackOverride({},def,'q',{steer:4}));}finally{x.close();}
});

test('the released spear tip points at aim before it leaves the articulated hand',()=>{
 const x=fixture();try{x.press();const s=x.slot.spear;x.p.advanceActionPose(x.def.throwWindup);x.p._animate(0);s.obj.updateWorldMatrix(true,false);
 const direction=s.pos.clone().set(0,0,1).transformDirection(s.obj.matrixWorld);assert.ok(direction.dot(x.p.aim3)>.99);
 }finally{x.close();}
});

test('two-hand casting blocks spear payment, while the opposite free hand can throw',()=>{
 const x=fixture();try{x.p.slots.r={def:{type:'beam',charge:true,castStyle:'two-hand'},charging:true,cd:0};const ki=x.p.ki;x.press();assert.equal(!!x.slot.spear,false);assert.equal(x.p.ki,ki);
 x.p.slots.r.def={type:'beam',charge:true,castStyle:'palm',castHand:'left'};x.press();assert.equal(x.slot.spear?.state,'windup');assert.equal(x.slot.spear.side,-1);
 }finally{x.close();}
});
test('a later cast claiming the reserved hand cancels spear windup',()=>{
 const x=fixture();try{x.press();x.p.slots.r={def:{type:'beam',charge:true,castStyle:'two-hand'},charging:true,cd:0};x.tick();assert.equal(x.slot.spear.state,'held');assert.equal(x.p._guidedSpearPose,null);}finally{x.close();}
});
test('recall waits outside two-hand casting and catches only after those claims end',()=>{
 const x=fixture();try{const s=x.release();for(let i=0;i<12;i++)x.tick();x.p.slots.r={def:{type:'beam',charge:true,castStyle:'two-hand'},charging:true,cd:0};x.press();for(let i=0;i<100&&s.state!=='waiting';i++)x.tick();assert.equal(s.state,'waiting');x.p.slots.r.charging=false;for(let i=0;i<30&&s.state!=='held';i++)x.tick();assert.equal(s.state,'held');}finally{x.close();}
});

test('embedded spear follows a moving and turning hull mesh without another debit',()=>{
 const x=fixture();try{const mesh=new THREE.Group();mesh.position.set(0,0,24);x.g.scene.add(mesh);let hits=0;const cover={x:0,z:24,hx:20,hz:.02,top:100,h:100,projectileShape:'box',hp:100,mesh,onConstructHit(){hits++;}};x.w.cover.push(cover);const s=x.release();while(s.state==='outbound')x.tick();const local=mesh.worldToLocal(s.pos.clone()),before=s.obj.quaternion.clone();mesh.position.x+=7;mesh.rotation.y=Math.PI/2;mesh.updateWorldMatrix(true,true);x.tick();assert.ok(s.pos.distanceTo(mesh.localToWorld(local))<1e-6);assert.ok(s.obj.quaternion.angleTo(before)>1);assert.equal(hits,1);assert.equal(s.state,'embedded');}finally{x.close();}
});
