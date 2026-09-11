import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
const api=await import('../src/engine/scout-gunner.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
const visible={visible:true,aligned:true,range:100,elevation:0,alive:true,enabled:true};
test('occupied scout targets an enemy instead of its own driver',()=>{
 const mesh=new THREE.Group(),turret=new THREE.Group(),barrel=new THREE.Group();turret.name='turret';barrel.name='barrel';mesh.add(turret);turret.add(barrel);barrel.position.y=10;
 const p={alive:true,team:0,pos:new THREE.Vector3(0,3,0)},foe={alive:true,team:1,pos:new THREE.Vector3(0,10,110)};
 const v={mesh,cover:{frontlineVehicle:true},occupant:p},shots=[];
 const game={player:p,entities:[p,foe],world:{cover:[]},projectiles:{spawnProjectile:(c,o)=>shots.push({team:c.team,o})}};
 const gun=new api.ScoutGunner(game,v);for(let i=0;i<240;i++)gun.update(1/60,true);
 assert.ok(shots.length>0);assert.ok(shots.every(s=>s.team===0&&s.o.vel.z>0));
});
test('gunner earns acquisition time before one bounded burst and must reload',()=>{
 assert.equal(typeof api.ScoutFireControl,'function');const c=new api.ScoutFireControl();let shots=[];
 for(let i=0;i<240;i++)if(c.update(1/60,visible))shots.push(i/60);
 assert.ok(shots[0]>=1,'No immediate fire on discovery');assert.equal(shots.length,3,'Three-shot burst followed by breathing room');
 assert.ok(shots[1]-shots[0]>=.15&&shots[2]-shots[1]>=.15);
});
test('occlusion, elevation, close range, disabled and wrecked state forbid firing',()=>{
 assert.equal(typeof api.ScoutFireControl,'function');
 for(const override of [{visible:false},{aligned:false},{range:10},{range:500},{elevation:1.3},{alive:false},{enabled:false}]){
  const c=new api.ScoutFireControl();for(let i=0;i<500;i++)assert.equal(c.update(1/60,{...visible,...override}),false,JSON.stringify(override));
 }
});
test('lost sight resets acquisition; pauses cannot create catch-up burst',()=>{
 assert.equal(typeof api.ScoutFireControl,'function');const c=new api.ScoutFireControl();
 for(let i=0;i<55;i++)c.update(1/60,visible);c.update(1/60,{...visible,visible:false});
 assert.equal(c.update(1/60,visible),false);assert.equal(c.update(0,visible),false);assert.equal(c.update(8,visible),false);
});
test('native mount turns before firing finite rounds from its muzzle, stops on cover and destruction',()=>{
 assert.equal(typeof api.ScoutGunner,'function');
 const mesh=new THREE.Group(),turret=new THREE.Group(),barrel=new THREE.Group();turret.name='turret';barrel.name='barrel';mesh.add(turret);turret.add(barrel);barrel.position.y=10;
 const cover={x:0,z:0,hx:5,hz:8,top:15,bottom:0,frontlineVehicle:true,projectileShape:'box'},vehicle={mesh,cover,destroyed:false};
 const shots=[],player={alive:true,team:0,pos:new THREE.Vector3(40,10,110)},game={time:0,running:true,ms:{frontline:{}},player,entities:[player],world:{cover:[cover]},projectiles:{spawnProjectile:(caster,opts)=>{shots.push({caster,opts});}},audio:{soundLibrary:{play(){}}},particles:{burst(){}}};
 const gunner=new api.ScoutGunner(game,vehicle);let initialYaw=turret.rotation.y;
 gunner.update(1/60,true);assert.ok(Math.abs(turret.rotation.y-initialYaw)<=.021);assert.equal(shots.length,0);
 for(let i=0;i<180;i++){game.time+=1/60;gunner.update(1/60,true);}
 assert.equal(shots.length,3);assert.ok(shots[0].opts.vel.length()>100);assert.equal(shots[0].opts.homing,0);assert.equal(shots[0].opts.launchCover,cover);
 assert.ok(shots[0].opts.pos.y>10,'The barrel mount, not hull center, emits');
 game.world.cover.push({x:20,z:55,hx:30,hz:3,top:50,projectileShape:'box'});
 for(let i=0;i<400;i++)gunner.update(1/60,true);assert.equal(shots.length,3);
 game.world.cover.pop();game.entities.push({alive:true,team:1,pos:new THREE.Vector3(20,7,55)});
 for(let i=0;i<400;i++)gunner.update(1/60,true);assert.equal(shots.length,3,'Friendly clone in lane holds fire');
 game.entities.pop();game.paused=true;for(let i=0;i<400;i++)gunner.update(1/60,true);assert.equal(shots.length,3);
 game.paused=false;vehicle.destroyed=true;for(let i=0;i<400;i++)gunner.update(1/60,true);assert.equal(shots.length,3);
});
