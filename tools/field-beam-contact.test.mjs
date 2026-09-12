import {TimeFields} from '../src/engine/systems.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Projectiles} from '../src/engine/projectiles.js';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {Game} from '../src/engine/game.js';
import {setAttackOverride,applyAttackOverrides,attackFields} from '../src/data/attack-tuning.js';

// Exercise the traveled hose and real damage/rig paths. Only audio output and
// renderer effects are recorded; neither can run without browser devices.
function fixture({guard=false,behind=false,radius=1,temper='steady',options={}}={}) {
  const noop=()=>{},contacts=[],sounds=[],sparks=[];
  const game={scene:new THREE.Scene(),time:0,entities:[],world:{cover:[],interiors:[],shake:noop,punch:noop},
    particles:{spawn:noop,burst:(x,y,z,o)=>sparks.push({x,y,z,...o})},
    vfx:{borrowLight:()=>new THREE.PointLight(),returnLight:noop,flash:noop,
      contact:(pos,dir,o)=>contacts.push({time:game.time,pos:pos.clone(),dir:dir.clone(),...o})},
    audio:{hit:(...args)=>sounds.push({kind:'hit',args}),impact:(...args)=>sounds.push({kind:'impact',args}),
      zap:(...args)=>sounds.push({kind:'zap',args})},
    isFoe:(a,b)=>a.team!==b.team&&b.alive,isHuman:()=>false,onHit:noop};
  const target=new Fighter(structuredClone(ROSTER.find(d=>d.id==='sol')));
  target.team=2;target._game=game;target._openSky=true;target.invuln=0;
  target.pos.set(0,0,30);target.obj.position.copy(target.pos);target.vel.set(0,0,0);
  target.strength=10;target.armor=0;target.resist={};target.hp=target.maxHp=10000;
  target.faceDir(0,behind?1:-1);target.guarding=guard;
  const caster={team:1,alive:true,_openSky:true,energyInfinite:true,ki:100,maxKi:100,powerBuff:1,def:{},
    pos:new THREE.Vector3(),vel:new THREE.Vector3(),aim3:new THREE.Vector3(0,0,1),
    spendKi:()=>true,muzzle(out){return out.set(0,5.2,0);}};
  game.entities=[target];game.scene.add(target.obj);
  const manager=new Projectiles(game),beam=manager.spawnBeam(caster,{dps:24,radius,maxLen:90,temper,...options});
  const animate=dt=>{target._animate(dt);target.obj.updateMatrixWorld(true);};
  for(let i=0;i<120;i++)animate(1/120);
  const step=dt=>{game.time+=dt;beam.update(dt,game);animate(dt);};
  const recoil=()=>target._hitReactionBase?target.parts.torso.quaternion.angleTo(target._hitReactionBase.torso.quaternion):0;
  return {game,target,caster,beam,contacts,sounds,sparks,step,animate,recoil,
    close(){beam._dispose(game);target.dispose();}};
}

for(const hz of [30,60,120])for(const guard of [false,true])test('local beam damage and guard pressure '+hz+'Hz guard '+guard,()=>{const normal=fixture({guard}),slow=fixture({guard});try{const fields=slow.game.timeFields=new TimeFields(slow.game);fields.add(new THREE.Vector3(0,5,30),100,10,.4,{alive:true,pos:new THREE.Vector3(0,5,30)});for(const x of [normal,slow]){x.target.ki=x.target.maxKi=10000;for(let i=0;i<hz*2;i++)x.step(1/hz);x.target.guardMeter=1;}const before=[normal,slow].map(x=>({hp:x.target.hp,ki:x.target.ki,meter:x.target.guardMeter}));for(const x of [normal,slow])for(let i=0;i<hz;i++)x.step(1/hz);const delta=[normal,slow].map((x,i)=>({hp:before[i].hp-x.target.hp,ki:before[i].ki-x.target.ki,meter:before[i].meter-x.target.guardMeter}));if(guard){assert.equal(delta[0].hp,0);assert.equal(delta[1].hp,0);assert.ok(Math.abs(delta[1].ki/delta[0].ki-.4)<.001);assert.ok(Math.abs(delta[1].meter/delta[0].meter-.4)<.001);}else{assert.ok(Math.abs(delta[1].hp/delta[0].hp-.4)<.001);}fields.clear();}finally{normal.close();slow.close();}});
