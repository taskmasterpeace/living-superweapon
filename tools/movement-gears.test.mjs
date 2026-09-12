import test from 'node:test';
import assert from 'node:assert/strict';
import {ROSTER} from '../src/data/characters.js';
const api=await import('../src/core/movement-gears.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
const data=await import('../src/data/movement-gears.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
function actor(id='sol'){
 assert.equal(typeof api.updateMovementGears,'function','Missing movement gear semantic controller');
 const def=ROSTER.find(d=>d.id===id);return {def,alive:true,flightTier:def.flightTier??3,ki:100,vel:{x:0,y:0,z:0},state:'idle'};
}
const step=(f,held,dt=1/60,extra={})=>api.updateMovementGears(f,{held,...extra},dt);

test('authored movement capability is independent of combat level and cannot grant flight',()=>{
 assert.equal(typeof data.movementProfile,'function','Missing authored movement capability profiles');
 for(const [id,max]of [['sol',3],['vega',3],['sarge',2],['rime',2],['hive',1],['volt',3]]){
  const f=actor(id),before=f.flightTier;assert.equal(data.movementProfile(f).maxGear,max,id);
  f.level=10;f.powerBuff=4;assert.equal(data.movementProfile(f).maxGear,max,id);assert.equal(f.flightTier,before);
 }
 const f=actor();f.def={...f.def,movement:{profile:'grounded',maxGear:2,ground:[1.3,1.7],air:[1.4,1.8]}};
 assert.equal(data.movementProfile(f).maxGear,2);assert.deepEqual(data.movementProfile(f).ground,[1.3,1.7]);
});

for(const hz of [30,60,120])test(`quick holds select I, II and III with one stationary power-up-ready event at ${hz}Hz`,()=>{
 const f=actor(),dt=1/hz;step(f,true,dt);assert.equal(f.movementGear.gear,1);
 for(let i=0;i<hz;i++)assert.equal(step(f,true,dt).powerupReady,false,'Holding I never creates another press');
 step(f,false,dt);step(f,true,dt);assert.equal(f.movementGear.gear,2);
 let ready=0;for(let i=1;i<Math.ceil(.45*hz);i++)ready+=Number(step(f,true,dt).powerupReady);
 assert.equal(ready,1,'Second held press becomes ready once at .45 seconds');
 for(let i=0;i<hz;i++)assert.equal(step(f,true,dt).powerupReady,false);
 step(f,false,dt);step(f,true,dt);assert.equal(f.movementGear.gear,3);
 for(let i=1;i<=hz;i++)assert.equal(step(f,true,dt).powerupReady,false,'Tier III must not retry the second-hold power-up');
 assert.equal(f.flying,undefined);assert.equal(f.level,undefined);assert.equal(f.powerBuff,undefined);assert.equal(f.ki,100);
 step(f,false,dt);assert.equal(f.movementGear.gear,0);assert.equal(f.cruiseHeld,false);
});

test('timeout starts at I, key repeat cannot advance and unsupported III reports the real cap',()=>{
 const f=actor('sarge');step(f,true);step(f,true,1/60,{pressed:true,repeat:true});assert.equal(f.movementGear.gear,1);
 step(f,false,.01);step(f,false,.31);step(f,true);assert.equal(f.movementGear.gear,1);
 step(f,false);step(f,true);assert.equal(f.movementGear.gear,2);
 step(f,false);step(f,true);assert.equal(f.movementGear.gear,2);assert.equal(f.movementGear.limited,true);
});

test('explicit controller or touch selection uses the same capability and hold-time admission',()=>{
 const f=actor('rime');step(f,true,.1,{selectGear:3});assert.equal(f.movementGear.gear,2);assert.equal(f.movementGear.limited,true);
 assert.equal(step(f,true,.35,{selectGear:3}).powerupReady,false,'Selecting III is travel, not power-up');
 assert.equal(step(f,true,.1,{selectGear:2}).powerupReady,false);
 assert.equal(step(f,true,.35,{selectGear:2}).powerupReady,true,'Selecting II retains its deliberate hold admission');
 step(f,false);assert.equal(f.movementGear.gear,0);
});

test('blur, blocked controls and KO clear the sequence and require a physical release',()=>{
 const f=actor();step(f,true,1/60,{cancelVersion:0});step(f,false,1/60,{cancelVersion:0});step(f,true,1/60,{cancelVersion:0});
 step(f,true,1/60,{cancelVersion:1});assert.equal(f.movementGear.gear,0);
 step(f,true,1/60,{cancelVersion:1});assert.equal(f.movementGear.gear,0);
 step(f,false,1/60,{cancelVersion:1});step(f,true,1/60,{cancelVersion:1});assert.equal(f.movementGear.gear,1);
 step(f,true,1/60,{active:false,cancelVersion:1});assert.equal(f.movementGear.gear,0);
 step(f,false,1/60,{cancelVersion:1});f.alive=false;step(f,true);assert.equal(f.movementGear.gear,0);
 f.alive=true;step(f,true);assert.equal(f.movementGear.gear,0);step(f,false);step(f,true);assert.equal(f.movementGear.gear,1);
});

test('authoring extra soldier stage always yields finite travel multipliers',()=>{
 const f=actor('sarge');f.def={...f.def,movement:{profile:'soldier',maxGear:3}};
 const p=data.movementProfile(f);assert.equal(p.ground.length,3);assert.ok(p.ground.every(Number.isFinite));
});
test('explicit semantic stage selection can change while held without replaying key edges',()=>{
 const f=actor();step(f,true,.1,{selectGear:1});step(f,true,.1,{selectGear:3});assert.equal(f.movementGear.gear,3);
 assert.equal(step(f,true,.35,{selectGear:3}).powerupReady,false);assert.equal(step(f,true,.5,{selectGear:3}).powerupReady,false);
});

test('capability resolution reuses stable definitions and refreshes replaced settings or sprint tuning',()=>{
 const f=actor('sarge'),p=data.movementProfile(f);assert.equal(data.movementProfile(f),p);
 f.def={...f.def,movement:{profile:'soldier',ground:[1.2,1.4]}};const changed=data.movementProfile(f);assert.notEqual(changed,p);assert.equal(data.movementProfile(f),changed);
 f.def.movement={profile:'soldier',ground:[1.3,1.5]};assert.equal(data.movementProfile(f).ground[1],1.5);
});
