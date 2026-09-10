import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Game} from '../src/engine/game.js';
const mod=await import('../src/engine/frontline-convoy.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
const noop=()=>{};
function fixture(){
 const scene=new THREE.Scene(),hits=[],world={cover:[],coverAll:[],heightAt:()=>4,refreshFogBoxes:noop,shake:noop,punch:noop,setBlockCracks:noop,crater:noop};
 const game={scene,world,particles:{burst:noop},vfx:{flash:noop,scorch:noop},audio:{boom:noop},cityStats:{craters:0},noise:noop,areaDamage:(...args)=>hits.push(args),player:{id:'vega'}};
 world.removeBlockFromCover=c=>{const i=world.cover.indexOf(c);if(i>=0)world.cover.splice(i,1);};
 const stage={g:game,_cover:[]},asset={scene:new THREE.Group(),animations:[]};
 const hull=new THREE.Mesh(new THREE.BoxGeometry(2.4,2.2,5.3),new THREE.MeshStandardMaterial());hull.position.y=1.1;asset.scene.add(hull);
 return {game,world,stage,asset,hits};
}
test('convoy registers measured native damage/cover volumes and follows crater ground',async()=>{
 assert.equal(typeof mod.FrontlineConvoy,'function');const f=fixture(),convoy=new mod.FrontlineConvoy(f.stage,{loader:{loadAsync:async()=>f.asset}});await convoy.loading;
 assert.equal(convoy.vehicles.length,3);assert.equal(f.world.cover.length,3);
 assert.ok(convoy.vehicles.every(v=>v.cover.x<-170&&v.cover.z>180),'the convoy belongs on the right-hand battlefield approach, outside the entry pad');
 for(const v of convoy.vehicles){assert.equal(v.cover.hp,120);assert.ok(v.cover.blastBounds?.isBox3);assert.ok(v.cover.top>v.cover.bottom);assert.equal(v.mesh.position.y,4);}
 f.world.heightAt=()=>-1;convoy.update();assert.equal(convoy.vehicles[0].mesh.position.y,-1);assert.ok(Math.abs(convoy.vehicles[0].cover.bottom+1)<1e-5);
 convoy.dispose();assert.equal(f.world.cover.length,0);assert.equal(f.world.coverAll.length,0);assert.equal(f.game.scene.children.length,0);
});

test('impact dust exists before graphics preparation but stays invisible until actual destruction',async()=>{
 const f=fixture(),convoy=new mod.FrontlineConvoy(f.stage,{loader:{loadAsync:async()=>f.asset}});await convoy.loading;
 try{assert.ok(convoy.dust?.mesh,'First-use dust shader must be present during preparation');assert.equal(convoy.dust.mesh.visible,false);assert.equal(convoy.dust.active,0);}
 finally{convoy.dispose();}
});

test('only nearest optional encounter gunner fires; sparring, pause and disposal stay unarmed',async()=>{
 const f=fixture(),turret=new THREE.Group(),barrel=new THREE.Group();turret.name='turret';barrel.name='barrel';barrel.position.y=2;turret.add(barrel);f.asset.scene.add(turret);
 const shots=[];Object.assign(f.game,{time:0,running:true,entities:[],ms:{},projectiles:{spawnProjectile:(source,options)=>shots.push({source,options})}});
 f.game.player={alive:true,team:0,pos:new THREE.Vector3(-190,12,250)};f.game.entities.push(f.game.player);
 const convoy=new mod.FrontlineConvoy(f.stage,{loader:{loadAsync:async()=>f.asset}});await convoy.loading;
 const step=n=>{for(let i=0;i<n;i++){f.game.time+=1/60;convoy.update();}};
 step(200);assert.equal(shots.length,0,'Sparring remains unarmed');
 f.game.ms.frontline={};step(240);assert.equal(shots.length,3);assert.ok(shots.every(s=>s.source===convoy.vehicles[0].gunner.source));
 f.game.paused=true;step(200);assert.equal(shots.length,3);f.game.paused=false;
 const sources=convoy.vehicles.map(v=>v.gunner.source);convoy.dispose();step(200);assert.equal(shots.length,3);assert.ok(sources.every(s=>!s.alive));
});
test('native destruction credits one blast and keeps other convoy records live',async()=>{
 const f=fixture(),convoy=new mod.FrontlineConvoy(f.stage,{loader:{loadAsync:async()=>f.asset}});await convoy.loading;
 const v=convoy.vehicles[0],src={id:'kano'};v.cover._breaker={id:'old-attacker'};v.cover.hp=0;Game.prototype.shatterBlock.call(f.game,v.cover,src);Game.prototype.shatterBlock.call(f.game,v.cover,src);
 assert.equal(f.hits.length,1);assert.equal(f.hits[0][0],src);assert.equal(f.world.cover.length,2);assert.equal(v.destroyed,true);assert.equal(v.mesh.visible,true);
 convoy.dispose();
});
test('a high aerial blast cannot damage a ground vehicle through its XZ footprint',async()=>{
 const f=fixture(),convoy=new mod.FrontlineConvoy(f.stage,{loader:{loadAsync:async()=>f.asset}});await convoy.loading;
 const v=convoy.vehicles[0],damaged=[];f.game.damageBlock=(...args)=>damaged.push(args);
 Game.prototype.worldImpact.call(f.game,new THREE.Vector3(v.cover.x,180,v.cover.z),15,1);assert.equal(damaged.length,0);
 Game.prototype.worldImpact.call(f.game,new THREE.Vector3(v.cover.x,8,v.cover.z),15,1);assert.ok(damaged.length>0);convoy.dispose();
});
test('late asset loading after exit is retired without registering ghost vehicles',async()=>{
 const f=fixture();let resolve,disposed=0;f.asset.scene.children[0].geometry.addEventListener('dispose',()=>disposed++);
 const convoy=new mod.FrontlineConvoy(f.stage,{loader:{loadAsync:()=>new Promise(r=>resolve=r)}});convoy.dispose();resolve(f.asset);await convoy.loading;
 assert.equal(disposed,1);assert.equal(f.world.cover.length,0);assert.equal(f.game.scene.children.length,0);assert.equal(convoy.ready,false);
});

test('native chained explosions may remove earlier cover without invalidating the outer blast',async()=>{
 const f=fixture(),convoy=new mod.FrontlineConvoy(f.stage,{loader:{loadAsync:async()=>f.asset}});await convoy.loading;
 Object.assign(f.game,{entities:[],_ventHazard:noop,reportError:e=>{throw e;}});f.game.player.powerBuff=1;
 for(const method of ['areaDamage','worldImpact','damageBlock','shatterBlock'])f.game[method]=Game.prototype[method];
 const v=convoy.vehicles[2],rock={x:v.cover.x+23,z:v.cover.z,hx:2,hz:2,r:3,h:12,top:12,hp:1,maxHp:20,onShatter:(g,c)=>f.world.cover.splice(f.world.cover.indexOf(c),1)};
 f.world.cover.unshift(rock);
 try{assert.doesNotThrow(()=>f.game.worldImpact(new THREE.Vector3(v.cover.x,8,v.cover.z),30,7,f.game.player));assert.ok(v.destroyed);assert.ok(!f.world.cover.includes(rock));}
 finally{convoy.dispose();}
});

test('parked scout chassis follows a sloped ground plane instead of floating level across it',async()=>{
 const f=fixture();f.world.heightAt=(x,z)=>.12*x+.16*z;
 const convoy=new mod.FrontlineConvoy(f.stage,{loader:{loadAsync:async()=>f.asset}});await convoy.loading;
 try{for(const v of convoy.vehicles){
  assert.ok(Math.hypot(v.mesh.quaternion.x,v.mesh.quaternion.z)>.05,'Vehicle must lean with native ground');
  v.mesh.updateMatrixWorld(true);
  for(const [x,z]of [[-.8,-1.8],[.8,-1.8],[-.8,1.8],[.8,1.8]]){
   const p=v.mesh.localToWorld(new THREE.Vector3(x,0,z));assert.ok(Math.abs(p.y-f.world.heightAt(p.x,p.z))<1e-4,'Contact plane must rest on rendered ground');
  }
  const b=new THREE.Box3().setFromObject(v.mesh,true);assert.ok(v.cover.blastBounds.containsBox(b),'Damage bounds must move with pitched vehicle');
 }}finally{convoy.dispose();}
});

test('convoy parking rejects a sharp bank with no plausible four-wheel contact',async()=>{
 const f=fixture();f.world.heightAt=x=>12*Math.exp(-(((x+190)/12)**2));
 const convoy=new mod.FrontlineConvoy(f.stage,{loader:{loadAsync:async()=>f.asset}});await convoy.loading;
 try{
  assert.equal(convoy.ready,true);
  const first=convoy.vehicles[0];
  assert.ok(Math.hypot(first.cover.x+190,first.cover.z-205)>1,'Do not park on the sharp original bank');
  assert.ok(Math.hypot(first.mesh.quaternion.x,first.mesh.quaternion.z)<.14,'Find a gentle support surface instead');
 }finally{convoy.dispose();}
});
