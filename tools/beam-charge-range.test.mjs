import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ROSTER} from '../src/data/characters.js';
import {Fighter} from '../src/engine/entity.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {TYPES} from '../src/engine/abilities.js';

function measure(chargeSeconds,distance=110,detonation=false,{offsetX=0,elevation=0,wall=false}={}){
 const scene=new THREE.Scene(),world={scene,camera:new THREE.PerspectiveCamera(),cover:[],interiors:[],ARENA:900,heightAt:()=>0,shake(){},punch(){},setBlockCracks(){}};
 const combat=new StudioCombat(scene,world),g=combat.game,dt=1/120;
 const f=new Fighter(structuredClone(ROSTER.find(d=>d.id==='vega'))),v=new Fighter(structuredClone(ROSTER.find(d=>d.id==='kano')));
 g.vfx._itex=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);
 f._game=v._game=g;f._openSky=true;f.flying=true;f.gait='airborne';f.pos.set(0,80,0);f.aim.set(0,0,1);f.aim3.copy(f.aim);f.team=1;f.ki=130;
 v.pos.set(offsetX,80+elevation,distance);v.team=2;v.invuln=0;v.hp=v.maxHp=1000;scene.add(f.obj,v.obj);g.entities=[f,v];
 f.aim3.copy(v.pos).sub(f.pos).normalize();f.faceDir(f.aim3.x,f.aim3.z);
 if(wall)world.cover.push({x:offsetX*.5,z:distance*.5,hx:30,hz:2,bottom:0,top:180,h:180,r:30,hp:1e6,maxHp:1e6,projectileShape:'box'});
 try{
  for(let i=0;i<60;i++){f.advanceActionPose(dt);f._animate(dt);}v._animate(dt);
  const st=f.slots.rmb,def=st.def;
  for(let i=0;i<Math.round(chargeSeconds/dt);i++)TYPES.beam(f,def,st,g,{pressed:i===0,held:true,released:false,dt});
  const paid=130-f.ki,charge=st.chargeT;TYPES.beam(f,def,st,g,{pressed:false,held:false,released:true,dt});
  const beam=st.active;assert.ok(beam,'Paid charge did not create a beam');let firstContact=null,damage=0;
  for(let i=0;i<120;i++){
   f.advanceActionPose(dt);f._animate(dt);g.projectiles.update(dt,g);
   if(v.hp<1000&&firstContact===null)firstContact=(i+1)*dt;
   if(firstContact!==null&&(i+1)*dt>=firstContact+.2){damage=1000-v.hp;break;}
  }
  let resolvedBlast=0,repeatBlast=0;
  if(detonation){
   // Controlled placement at the real live tip isolates radial damage from
   // stream contact. No replacement damage handler or synthetic hit event.
   const tip=new THREE.Vector3().fromArray(beam.path,Math.max(0,beam.pn-1)*3);
   v.pos.copy(tip).add(new THREE.Vector3(2,-5.5,0));v.invuln=0;
   const before=v.hp;beam.detonate(g);resolvedBlast=before-v.hp;
   const after=v.hp;beam.detonate(g);repeatBlast=after-v.hp;
  }
  return {distance,charge,paid,radius:beam.radius,dps:beam.dps,maxLen:beam.maxLen,firstContact,damage,blast:beam.detonateRadius,blastDamage:beam.detonateDamage,resolvedBlast,repeatBlast,coverDamage:wall?1e6-world.cover[0].hp:0};
 }finally{combat.dispose();f.dispose();v.dispose();g.vfx._itex?.dispose();}
}
test('VEGAS longer paid charge increases width, damage and blast at the same110u receiver',()=>{
 const short=measure(.3),long=measure(1);console.log(JSON.stringify({short,long}));
 assert.ok(short.firstContact>0&&long.firstContact>0);assert.ok(short.damage>0);
 assert.ok(long.paid>short.paid);assert.ok(long.radius>short.radius);assert.ok(long.damage>short.damage*1.3);
 assert.ok(long.blast>short.blast);assert.ok(long.blastDamage>short.blastDamage);
 assert.equal(long.maxLen,short.maxLen,'Charge must not silently alter configured range');
});
test('VEGAS native stream contacts an in-range receiver and cannot damage a body beyond range',()=>{
 const inside=measure(.3,140),outside=measure(.3,185);console.log(JSON.stringify({inside,outside}));
 assert.ok(inside.firstContact>0&&inside.damage>0);assert.equal(outside.firstContact,null);assert.equal(outside.damage,0);
});

test('longer charge deals greater actual tip-blast damage, once only',()=>{
 const short=measure(.3,110,true),long=measure(1,110,true);
 console.log(JSON.stringify({shortBlast:short.resolvedBlast,longBlast:long.resolvedBlast}));
 assert.ok(short.resolvedBlast>0);assert.ok(long.resolvedBlast>short.resolvedBlast);
 assert.equal(short.repeatBlast,0);assert.equal(long.repeatBlast,0);
});

test('oblique elevated native beam hits a visible body but damages intervening cover instead when blocked',()=>{
 const clear=measure(.3,100,false,{offsetX:40,elevation:30});
 const blocked=measure(.3,100,false,{offsetX:40,elevation:30,wall:true});
 assert.ok(clear.firstContact>0&&clear.damage>0);
 assert.equal(blocked.damage,0);assert.equal(blocked.firstContact,null);assert.ok(blocked.coverDamage>0);
});
