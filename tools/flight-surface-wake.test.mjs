import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Vector3} from 'three';
import {profileFromDef,saveProfile,loadProfile,applyProfile,validateProfile} from '../src/tool/studio-profile.js';
import {ROSTER} from '../src/data/characters.js';
const {FlightSurfaceWake}=await import('../src/engine/flight-surface-wake.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return{};throw e;});
function fixture(overrides={}){
 assert.equal(typeof FlightSurfaceWake,'function');
 const world={scene:new Scene(),heightAt:()=>0,surfaceAt:()=> 'sand',cover:[]};
 const f={def:{model:{}},obj:{visible:true,parent:{}},pos:new Vector3(0,8,0),vel:new Vector3(0,0,100),alive:true,_openSky:true,airborne:true,...overrides};
 const wake=new FlightSurfaceWake(world,f);return{world,f,wake};
}
function travel(x,seconds=1,hz=60){for(let i=0;i<seconds*hz;i++){x.f.pos.addScaledVector(x.f.vel,1/hz);x.wake.update(1/hz);}}
test('fast low flight leaves widening ground-attached dust behind the hero',()=>{
 const x=fixture();try{travel(x);assert.ok(x.wake.active>20);const particles=x.wake.puffs.filter(p=>p.life>0);
  assert.ok(particles.every(p=>p.z<x.f.pos.z&&p.ground===0));
  const positions=x.wake.mesh.geometry.attributes.iCenter;assert.ok(positions.getY(0)<8,'Dust stays below the flying body');
  assert.ok(x.wake.mesh.geometry.attributes.iSize.getX(0)>x.wake.mesh.geometry.attributes.iSize.getX(x.wake.cursor-1),'Older dust spreads');
 }finally{x.wake.dispose();}
});
for(const [name,change]of [['high',x=>x.f.pos.y=60],['slow',x=>x.f.vel.z=20],['grounded',x=>x.f.airborne=false],['hidden',x=>x.f.obj.visible=false],['concrete',x=>x.world.surfaceAt=()=> 'concrete'],['water',x=>x.world.surfaceAt=()=> 'water'],['disabled',x=>x.f.def.model.surfaceWake={intensity:0}]])test(`${name} does not emit desert dust`,()=>{
 const x=fixture();try{change(x);travel(x);assert.equal(x.wake.active,0);}finally{x.wake.dispose();}
});
test('surface changes stop new emission; existing dust settles and resources stay bounded',()=>{
 const x=fixture();try{travel(x);const emitted=x.wake.emitted,geometry=x.wake.mesh.geometry;x.world.surfaceAt=()=> 'asphalt';travel(x,4);assert.equal(x.wake.emitted,emitted);assert.equal(x.wake.active,0);
  x.world.surfaceAt=()=> 'sand';travel(x,8);assert.equal(x.wake.mesh.geometry,geometry);assert.ok(x.wake.active<=192);assert.equal(x.wake.puffs.length,192);
  x.f.pos.z+=5000;x.wake.update(1/60);assert.ok(x.wake.puffs.filter(p=>p.life>0).every(p=>p.z<1400||p.z>6200),'Teleport must not paint a connecting dust line');
 }finally{x.wake.dispose();}
});
test('high-speed dust is visible within the camera-near ground region',()=>{
 const x=fixture();try{x.f.vel.z=200;travel(x,1);const a=x.wake.mesh.geometry.attributes;let nearby=false;
 for(let i=0;i<x.wake.puffs.length;i++)if(a.iAlpha.getX(i)>.05&&Math.abs(a.iCenter.getZ(i)-x.f.pos.z)<14)nearby=true;
 assert.ok(nearby,'dust only became visible after passing behind the camera');}finally{x.wake.dispose();}
});
test('spatial emission has matching density at 30 and 120Hz',()=>{
 const a=fixture(),b=fixture();try{travel(a,1,30);travel(b,1,120);assert.ok(Math.abs(a.wake.emitted-b.wake.emitted)<=4);}finally{a.wake.dispose();b.wake.dispose();}
});
test('ordinary low cruise creates readable but translucent dust, fading near the height cutoff',()=>{
 const low=fixture(),high=fixture();try{low.f.vel.z=74;high.f.vel.z=74;high.f.pos.y=24;travel(low);travel(high);
  const peak=x=>Math.max(...x.wake.mesh.geometry.attributes.iAlpha.array);
  assert.ok(peak(low)>.08&&peak(low)<.3,'Low cruise dust should be readable without becoming an opaque wall');
  assert.ok(peak(high)<peak(low)*.15,'Height falloff must keep the upper boundary subtle');
 }finally{low.wake.dispose();high.wake.dispose();}
});
test('ground height and solid cover prevent dust appearing through roofs',()=>{
 const x=fixture();try{x.world.heightAt=()=>50;x.f.pos.y=58;travel(x);assert.ok(x.wake.puffs.some(p=>p.life>0&&p.ground===50));
  const count=x.wake.emitted;x.world.cover=[{x:0,z:150,hx:20,hz:100,top:70}];travel(x);assert.equal(x.wake.emitted,count);
 }finally{x.wake.dispose();}
});
test('surface-wake editor tuning survives save/load and legacy profiles gain defaults without mutation',()=>{
 const def=ROSTER.find(d=>d.id==='vega'),p=profileFromDef(def);assert.ok(p.surfaceWake);
 p.surfaceWake={intensity:.6,minSpeed:80,maxHeight:15,life:1.4};const records=new Map(),store={getItem:k=>records.get(k)??null,setItem:(k,v)=>records.set(k,v)};
 saveProfile(p,store);assert.deepEqual(applyProfile(def,loadProfile('vega',store)).model.surfaceWake,p.surfaceWake);
 const old=structuredClone(p);delete old.surfaceWake;assert.ok(validateProfile(old).surfaceWake);assert.equal(old.surfaceWake,undefined);
 assert.throws(()=>validateProfile({...p,surfaceWake:{...p.surfaceWake,maxHeight:NaN}}));
});
