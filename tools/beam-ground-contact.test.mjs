import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Projectiles} from '../src/engine/projectiles.js';
import {World} from '../src/engine/world.js';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {VFX} from '../src/engine/vfx.js';
const helper=await import('../src/engine/beam-ground-contact.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
function fixture({midair=false}={}){
 const noop=()=>{},marks=[],scene=new THREE.Scene(),world={scene,cover:[],interiors:[],_ghTriangles:true,_gseg:2,_ghArena:100,ARENA:100,_gh:new Float32Array(9),heightAt:World.prototype.heightAt,shake:noop,punch:noop,setBlockCracks:noop};
 const game={scene,world,time:0,entities:[],isFoe:(a,b)=>a.team!==b.team&&b.alive,isHuman:()=>false,onHit:noop,audio:{boom:noop,hit:noop},particles:{spawn:noop,burst:noop},
  vfx:{borrowLight:()=>new THREE.PointLight(),returnLight:noop,flash:noop,lightning:noop,explode:noop,shockwave:noop,impact:noop,beamGroundScorch:(p,r)=>marks.push({p:p.clone(),r,time:game.time})}};
 const caster={team:1,alive:true,energyInfinite:true,ki:1e6,maxKi:1e6,powerBuff:1,pos:new THREE.Vector3(0,10,0),aim3:new THREE.Vector3(0,midair?0:-.4,1).normalize(),vel:new THREE.Vector3(),spendKi:()=>true,muzzle(out){return out.copy(this.pos);}};
 const manager=new Projectiles(game),beam=manager.spawnBeam(caster,{radius:.3,tipSpeed:30,maxLen:100,dps:1});
 return {game,world,caster,manager,beam,marks,tick(dt){game.time+=dt;manager.update(dt,game);},close(){for(const b of manager.list)b._dispose(game);for(const f of game.entities)f.dispose?.();}};
}
for(const hz of [30,60,120])test(`native traveled ground contact stamps its reached surface once while stationary at ${hz}Hz`,()=>{
 const x=fixture();try{x.tick(1/hz);assert.equal(x.marks.length,0,'Aiming at ground is not a reached hose contact');for(let i=0;i<3*hz;i++)x.tick(1/hz);
 assert.equal(x.marks.length,1,'Stationary contact must leave a visible but bounded scorch');const m=x.marks[0];assert.ok(m.time>.8);assert.ok(Math.abs(m.p.z-24.625)<.04);assert.equal(m.p.y,0);
 assert.ok(Math.abs(x.beam.tip.position.z-m.p.z)<.04,'Mark must use reached endpoint before shared vectors are reused');
 x.beam.sustaining=false;for(let i=0;i<hz;i++)x.tick(1/hz);assert.equal(x.marks.length,1);assert.equal(x.beam.dead,true);
 }finally{x.close();}
});
for(const obstruction of ['midair','cover','fighter','clash'])test(`no ground residue through ${obstruction}`,()=>{
 const x=fixture({midair:obstruction==='midair'});try{
 if(obstruction==='clash')x.manager.spawnBeam({...x.caster,team:2,pos:new THREE.Vector3(0,2,20),aim3:x.caster.aim3.clone().negate()},{radius:.3,tipSpeed:30,maxLen:100,dps:1});
 if(obstruction==='cover')x.world.cover.push({x:0,z:9,hx:5,hz:1,bottom:0,top:30,projectileShape:'box',hp:1e6});
 if(obstruction==='fighter'){const f=new Fighter(structuredClone(ROSTER.find(f=>f.id==='sol')));f.team=2;f.pos.set(0,0,9);f.obj.position.copy(f.pos);f.hp=f.maxHp=1e6;f._game=x.game;x.game.entities.push(f);}
 for(let i=0;i<180;i++)x.tick(1/60);if(obstruction==='clash')assert.equal(x.beam.clashing,true,'Two real traveled hoses must meet before ground');assert.equal(x.marks.length,0);
 if(obstruction==='cover')assert.ok(x.world.cover[0].hp<1e6);if(obstruction==='fighter')assert.ok(x.game.entities[0].hp<1e6);
 }finally{x.close();}
});
test('contact sampling requires both elapsed time and distance, has a lifetime budget, and owns its captured vectors',()=>{
 assert.equal(typeof helper.BeamGroundContact,'function');const state=new helper.BeamGroundContact(),marks=[],vfx={beamGroundScorch:(p)=>marks.push(p.clone())},world={heightAt:(x,z)=>x*.25+z*.1};
 const p=new THREE.Vector3(0,2,0),tip=p.clone();state.begin(.01);state.capture(p,20);p.set(999,999,999);assert.equal(state.emit({vfx,world},tip,20,1,true,false),true);assert.equal(marks[0].x,0);
 for(let i=1;i<=2000;i++){const q=new THREE.Vector3(i*.01,2,0);state.begin(.001);state.capture(q,20);state.emit({vfx,world},q,20,1,true,false);}assert.ok(marks.length<=20);
 for(let i=0;i<200;i++){const q=new THREE.Vector3(i*3,2,0);state.begin(.2);state.capture(q,20);state.emit({vfx,world},q,20,1,true,false);}assert.equal(marks.length,helper.BEAM_GROUND_LIMITS.perBeam);
 state.reset();assert.equal(state.count,0);state.begin(0);state.capture(tip,20);assert.equal(state.emit({vfx,world},tip,20,1,true,false),false);
});
test('beam scorch vertices follow non-flat terrain and owned geometry is released on cap, expiry and reset',()=>{
 assert.equal(typeof VFX.prototype.beamGroundScorch,'function');const scene=new THREE.Scene(),world={scene,heightAt:(x,z)=>3+x*.3+z*.2+Math.abs(x)*.1},v=Object.create(VFX.prototype);Object.assign(v,{scene,world,scorches:[],fx:[]});
 const m=v.beamGroundScorch(new THREE.Vector3(0,3,0),4),a=m.geometry.attributes.position;let min=Infinity,max=-Infinity;for(let i=0;i<a.count;i++){const p=new THREE.Vector3().fromBufferAttribute(a,i).add(m.position);min=Math.min(min,p.y);max=Math.max(max,p.y);assert.ok(Math.abs((p.y-world.heightAt(p.x,p.z))-m.userData.groundLift)<1e-5);}assert.ok(max-min>2,'A flat decal would pass only at its center');
 let disposed=0;m.geometry.addEventListener('dispose',()=>disposed++);for(let i=0;i<45;i++)v.beamGroundScorch(new THREE.Vector3(i,3,0),2);assert.ok(v.scorches.length<=40);assert.equal(disposed,1);
 const last=v.scorches.at(-1);let expired=0;last.geometry.addEventListener('dispose',()=>expired++);v.update(60);assert.equal(v.scorches.length,0);assert.equal(expired,1);
 const reset=v.beamGroundScorch(new THREE.Vector3(),2);let cleared=0;reset.geometry.addEventListener('dispose',()=>cleared++);v.clearScorches();assert.equal(cleared,1);assert.equal(scene.children.length,0);
});
for(const hz of [30,60,120])test(`moving ground sweep leaves spaced marks on the native sloped surface at ${hz}Hz`,()=>{
 const x=fixture();try{
 for(let z=0;z<3;z++)for(let i=0;i<3;i++)x.world._gh[z*3+i]=4+(i-1)*3+(z-1)*6;
 for(let i=0;i<4*hz;i++){x.caster.pos.x=i/hz*6;x.tick(1/hz);}
 assert.ok(x.marks.length>=6,'A moving reached footprint must leave a trail');assert.ok(x.marks.length<=34,'Emission must respect the time budget');
 for(let i=0;i<x.marks.length;i++){const m=x.marks[i];assert.ok(Math.abs(m.p.y-x.world.heightAt(m.p.x,m.p.z))<1e-8);if(i){const prev=x.marks[i-1];assert.ok(m.time-prev.time>=.12-1e-8);assert.ok(Math.hypot(m.p.x-prev.p.x,m.p.z-prev.p.z)>=1.2-1e-8);}}
 assert.ok(x.marks.at(-1).p.x>x.marks[0].p.x+8,'Marks must follow actual traveled contact rather than one cached aim point');
 }finally{x.close();}
});
