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

test('grounded field targets retain readable materials during sustained contact',()=>{
 const x=fixture();try{
  x.target._openSky=false;x.game.modeId='powerworld';
  for(let i=0;i<45;i++)x.step(1/60);
  assert.ok(x.target.hp<10000);
  assert.ok(x.target.hitFlash<=.22,'No per-frame full-body whiteout on training targets or clones');
  assert.equal(x.target._openSky,false);
 }finally{x.close();}
});

test('an axial receiver remains visible through the stream without dimming side views or free travel',()=>{
 const x=fixture({radius:2}),camera=new THREE.PerspectiveCamera();
 const opacity=()=>{camera.updateMatrixWorld(true);x.beam.core.onBeforeRender(null,null,camera);return x.beam.core.material.opacity;};
 try{
  camera.position.set(0,5.2,-25);x.target.pos.x=80;
  for(let i=0;i<40;i++)x.step(1/60);const free=opacity();
  x.target.pos.x=0;for(let i=0;i<40;i++)x.step(1/60);
  assert.equal(x.beam._bodyContact.fighter,x.target);assert.ok(x.target.hp<10000);
  assert.ok(opacity()<free*.7,'Contact still masks the receiving body with the free-flight axial density');
  camera.position.set(40,5.2,0);assert.ok(opacity()>.9,'Side-view power was lost along with axial obstruction');
  camera.position.set(0,5.2,-25);x.target.pos.x=80;
  for(let i=0;i<20;i++)x.step(1/60);assert.ok(Math.abs(opacity()-free)<1e-6,'Receiver fade leaked into the departing stream');
 }finally{x.close();}
});

test('surface impact illumination stays on the receiver and clears when it leaves the stream',()=>{
 const x=fixture({radius:2}),lamp=x.beam.light;
 try{
  for(let i=0;i<60;i++)x.step(1/60);
  const hit=x.beam._bodyContact;
  assert.equal(hit.fighter,x.target);
  assert.ok(lamp.intensity>25,'Contact is still lit like a dim free-travel tip');
  assert.ok(lamp.position.distanceTo(hit.surface)<1,'Impact light is not at the physical receiver');
  assert.ok(lamp.position.clone().sub(hit.surface).dot(hit.direction)<0,'Lamp buried behind the struck surface');
  assert.ok(lamp.distance<=60,'Impact light spills over the whole arena');
  x.target.pos.x=50;
  for(let i=0;i<10;i++)x.step(1/60);
  assert.equal(x.beam._bodyContact.fighter,null);
  assert.ok(lamp.intensity<=5*x.beam.power,'Old receiver retained a contact flare');
  assert.equal(x.beam.light,lamp,'Contact must reuse the beam lamp');
 }finally{x.close();}
});

test('authored impact light off does not stop actual beam damage',()=>{
 const x=fixture({options:{impactGlow:0}});
 try{for(let i=0;i<60;i++)x.step(1/60);assert.ok(x.target.hp<10000);assert.equal(x.beam.light.intensity,0);}
 finally{x.close();}
});

test('grounded field targets express actual beam pressure without gaining flight or free guard',()=>{
 const x=fixture();try{
  x.target._openSky=false;x.game.modeId='powerworld';
  const arm=x.target.parts.armL,hand=arm.children[2],point=new THREE.Vector3();
  const height=()=>hand.getWorldPosition(point).y;const start=height();let peak=start;
  for(let i=0;i<90;i++){x.step(1/60);peak=Math.max(peak,height());}
  assert.ok(x.target.hp<10000,'test needs reached damage');
  assert.ok(peak>start+1,'accepted beam pressure never raised the grounded target’s arm');
  assert.equal(x.target._openSky,false);assert.equal(x.target.flying,false);assert.equal(x.target.guarding,false);
  assert.equal(x.target.hitstop,0);assert.equal(x.target.stunT,0);
 }finally{x.close();}
});

test('the field reaction fix does not change legacy isometric target presentation',()=>{
 const x=fixture();try{x.target._openSky=false;x.game.modeId='duel';for(let i=0;i<45;i++)x.step(1/60);assert.ok(x.target.hp<10000);assert.equal(x.target._hitReaction,undefined);}finally{x.close();}
});

test('zero-pressure beam damages without pushing or launching even a weak guarded target',()=>{
 const x=fixture({guard:true,options:{pushForce:0}});try{x.target.strength=1;for(let i=0;i<45;i++)x.step(1/60);assert.ok(x.target.hp<10000);assert.equal(x.target.vel.length(),0);assert.equal(x.target.launchT,0);}finally{x.close();}
});
test('turning the emitter cannot redirect pressure from already traveled straight energy',()=>{
 const x=fixture({options:{dps:60,steer:100}});try{x.target.strength=1;for(let i=0;i<20;i++)x.step(1/60);x.target.vel.set(0,0,0);x.caster.aim3.set(1,0,0);x.step(1/60);assert.ok(x.target.vel.z>0);assert.ok(Math.abs(x.target.vel.x)<.001,`old forward packet shoved sideways ${x.target.vel.x}`);}finally{x.close();}
});
for(const temper of ['helix','churn','sinuous'])test(`${temper} close-view details stay in the hose instead of floating like detached orbs`,()=>{
 const f=fixture({radius:3,temper});try{
  for(let i=0;i<50;i++)f.step(1/60);
  const m=new THREE.Matrix4(),point=new THREE.Vector3(),scale=new THREE.Vector3(),q=new THREE.Quaternion();
  for(let i=0;i<f.beam.detail.count;i++){
   f.beam.detail.getMatrixAt(i,m);m.decompose(point,q,scale);
   assert.ok(Math.hypot(point.x,point.y-5.2)<f.beam.radius*1.3,'Detail must sit within the energy sheath');
   assert.ok(scale.z>scale.x*3,'Energy detail streams along the hose, not as round balls');
  }
 }finally{f.close();}
});

// Removing the beam's damage-to-spring pulse must leave this real torso rigid.
for(const hz of [30,60,120])test(`sustained actual contact recoils at ${hz}Hz without new control locks`,()=>{
  const f=fixture();try{
    const pos=f.target.pos.toArray(),vel=f.target.vel.toArray();let peak=0,firstContact=0;
    for(let i=0;i<hz;i++){
      f.step(1/hz);peak=Math.max(peak,f.recoil());
      if(f.target.hp<10000)firstContact ||= f.game.time;
      assert.equal(f.target.hitstop,0);assert.equal(f.target.stunT,0);assert.equal(f.target.staggerT,0);
    }
    assert.ok(firstContact>.1,'The hose must travel to the target before contact');
    assert.ok(peak>.025,`Sustained damage must recoil the actual torso, got ${peak}`);
    assert.ok(peak<.2,'Sustained recoil must remain smaller than a discrete heavy hit');
    assert.ok(f.contacts.length>=3&&f.contacts.length<=6,'Contact pulses are bounded independently of display rate');
    assert.ok(f.contacts.every((p,i)=>!i||p.time-f.contacts[i-1].time>=.16));
    assert.equal(f.sounds.length,f.contacts.length);
    assert.deepEqual(f.target.pos.toArray(),pos);assert.deepEqual(f.target.vel.toArray(),vel);
    assert.equal(f.target.ragdoll,undefined);
    f.beam.end();for(let i=0;i<hz;i++)f.animate(1/hz);
    assert.ok(f.recoil()<.0001,'The spring recovers completely when contact ends');
  }finally{f.close();}
});

test('guard contact preserves its authored shield brace, while a rear hit is a body impact',()=>{
  const cases=[fixture(),fixture({guard:true}),fixture({guard:true,behind:true})];
  try{
    const peaks=[];
    for(const f of cases){let peak=0;for(let i=0;i<42;i++){f.step(1/60);peak=Math.max(peak,f.recoil());}peaks.push(peak);}
    const [body,shield,rear]=cases;
    assert.ok(body.contacts.length>0&&shield.contacts.length>0&&rear.contacts.length>0);
    assert.notEqual(shield.contacts[0].color,body.contacts[0].color);
    assert.equal(rear.contacts[0].color,body.contacts[0].color,'A raised guard facing away did not block');
    assert.equal(shield.sounds[0].kind,'zap');assert.notEqual(body.sounds[0].kind,'zap');
    assert.equal(peaks[1],0,'An actual guard already owns its brace; automatic defense must not add another flinch');
    assert.ok(Math.abs((10000-shield.target.hp)/.22-(10000-body.target.hp))<1e-6,'Frontal beam guard admits 22% chip');
    assert.equal(shield.target.hitstop,0);assert.equal(shield.target.staggerT,0);
  }finally{for(const f of cases)f.close();}
});

for(const kind of ['miss','invulnerable','immune','phase','zero damage','remote'])test(`${kind} produces no false body-contact pulse`,()=>{
  const f=fixture();try{
    if(kind==='miss')f.target.pos.x=20;
    if(kind==='invulnerable')f.target.invuln=1;
    if(kind==='immune')f.target.resist.energy=0;
    if(kind==='phase')f.target.phase=true;
    if(kind==='zero damage')f.caster.powerBuff=0;
    if(kind==='remote')f.target.remote=true;
    for(let i=0;i<60;i++)f.step(1/60);
    assert.equal(f.target.hp,10000);assert.equal(f.recoil(),0);
    assert.equal(f.contacts.length,0);assert.equal(f.sounds.length,0);
    assert.equal(f.sparks.filter(p=>p.count===2&&p.speed===12).length,0,'No contact sparks on rejected damage');
  }finally{f.close();}
});

test('Studio measurement health restoration cannot suppress real beam contact recoil',()=>{
  const scene=new THREE.Scene(),world={scene,cover:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
  const combat=new StudioCombat(scene,world),fighter=new Fighter(structuredClone(ROSTER.find(d=>d.id==='sol')));
  // Keep the contact geometry/particles real; only the canvas-generated raster
  // texture is supplied directly because Node has no 2D drawing device.
  const texture=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);
  combat.game.vfx._itex=texture;
  fighter._openSky=true;fighter.flying=true;fighter.gait='airborne';fighter._flyPose=1;
  fighter.pos.set(0,80,0);scene.add(fighter.obj);combat.reset(fighter,true,'beam');
  try{
    let peak=0;
    for(let frame=1;frame<=180;frame++){
      combat.step(frame/60,1/60);
      const target=combat.target;
      if(target._hitReactionBase)peak=Math.max(peak,target.parts.torso.quaternion.angleTo(target._hitReactionBase.torso.quaternion));
      assert.equal(target.hp,target.maxHp,'The measurement target keeps its restored health');
      assert.equal(target.hitstop,0);assert.equal(target.stunT,0);
    }
    assert.ok(combat.damage>0&&combat.contacts>0,'The real Studio slot must make damaging hose contact');
    assert.ok(peak>.025,`The real Studio target must recoil despite immediate healing, got ${peak}`);
  }finally{combat.dispose();fighter.dispose();texture.dispose();}
});

// An ordinary beam is absorbed at the first body. Without runtime termination
// it draws/damages through the defender and the fighter behind them.
for(const hz of [30,60,120])test(`a strong defender walks the actual beam endpoint back at ${hz}Hz`,()=>{
 const f=fixture(),behind=new Fighter(structuredClone(ROSTER.find(d=>d.id==='sol')));
 try{
  Object.assign(behind,{team:2,_game:f.game,_openSky:true,invuln:0,armor:0,resist:{},hp:10000,maxHp:10000});
  behind.pos.set(0,0,50);f.game.entities.unshift(behind);
  for(let i=0;i<hz;i++)f.step(1/hz);
  assert.ok(f.target.hp<10000,'The front body must receive real damage');
  assert.equal(behind.hp,10000,'An ordinary beam must not damage a fighter behind its receiver');
  assert.ok(f.beam.tip.position.z<30&&f.beam.tip.position.z>22,'The displayed endpoint must meet the near side, not pass through the torso');
  const first=f.beam.tip.position.z;
  for(let i=0;i<hz;i++){f.target.pos.z-=8/hz;f.step(1/hz);}
  assert.ok(Math.abs((first-f.beam.tip.position.z)-8)<.1,'Advancing toward the attacker must carry the contact point back with the defender');
  assert.ok(f.contacts.at(-1).pos.z<f.target.pos.z,'Contact sparks must be on the visible incoming side');
  f.beam.end();
  for(let i=0;i<Math.ceil(.17*hz);i++){f.game.time+=1/hz;f.beam.update(1/hz,f.game);}
  assert.equal(behind.hp,10000,'The released tail cannot leak through the previously absorbing body');
 }finally{f.close();behind.dispose();}
});

test('walking out of the stream frees a traveling tip, not an instant line to the next enemy',()=>{
 const f=fixture();try{
  for(let i=0;i<60;i++)f.step(1/60);
  const stopped=f.beam.tip.position.z;assert.ok(stopped<30,'Fixture must actually intercept');
  f.target.pos.x=25;f.step(1/60);
  assert.ok(f.beam.tip.position.z>stopped&&f.beam.tip.position.z<stopped+4,'Absorbed energy cannot instantly reappear beyond the defender');
 }finally{f.close();}
});

test('a shortened free endpoint cannot regrow its old full-range bulb around the caster',()=>{
 const x=fixture({radius:4,options:{build:'torrent'}});try{
  const b=x.beam;x.target.pos.z=100;b.resolveLaunch();
  // Previously emitted energy has reached far away, then an intervening body
  // cuts it near the source and leaves. The surviving field is only 2u long.
  b.tipDist=90;b.path.set([0,5.2,0,0,5.2,2]);b.pn=2;b.pvel.fill(0);b.update(0,x.game);
  assert.equal(b._bodyContact.fighter,null);
  assert.ok(b.tip.scale.x<=1.001,`2u field retained ${b.tip.scale.x}u tip sphere`);
  assert.equal(b.radius,4,'Visual endpoint fit must not shrink physical attack width');
 }finally{x.close();}
});

test('absorption of a curved stream preserves each cut packet\'s emitted velocity',()=>{
 const x=fixture();try{
  const b=x.beam;b.resolveLaunch();b.path.set([0,5.2,0,0,5.2,15,5,5.2,35]);b.pn=3;
  b.pvel.set([0,0,150,0,0,150,1,0,149]);b.update(0,x.game);
  assert.deepEqual(Array.from(b.pvel.slice(6,9)),[1,0,149],'Segment tangent must not re-aim energy already emitted');
 }finally{x.close();}
});

for(const hz of [30,60,120])test(`released beam energy remains absorbed at the near body surface at ${hz}Hz`,()=>{
 const x=fixture();try{
  x.target.pos.z=10;for(let i=0;i<hz/2;i++)x.step(1/hz);
  x.beam.end();
  for(let frame=0;frame<Math.ceil(.17*hz);frame++){
   x.game.time+=1/hz;x.beam.update(1/hz,x.game);
   for(let i=0;i<x.beam.pn;i++)assert.ok(x.beam.path[i*3+2]<=7.801,`release frame ${frame}: packet ${i} crossed the body to ${x.beam.path[i*3+2]}`);
  }
 }finally{x.close();}
});

test('broad startup cannot damage either body before reaching the first physical surface',()=>{
 const x=fixture({radius:4}),behind=new Fighter(structuredClone(ROSTER.find(d=>d.id==='sol')));
 try{
  x.target.pos.z=20;Object.assign(behind,{team:2,_game:x.game,_openSky:true,invuln:0,armor:0,resist:{},hp:10000,maxHp:10000});
  behind.pos.set(0,0,24.5);x.game.entities.unshift(behind);
  x.beam.resolveLaunch();x.beam.path.set([0,5.2,0,0,5.2,17.5]);x.beam.pn=2;x.beam.pvel.fill(0);x.beam.update(.001,x.game);
  assert.equal(x.target.hp,10000,'The padded hull is not an excuse for premature contact');
  assert.equal(behind.hp,10000,'A receiver behind the first body must never take phantom startup damage');
 }finally{x.close();behind.dispose();}
});

for(const hz of [30,60,120])test(`fully absorbed released energy retires before its stale cap can enter an advancing body at ${hz}Hz`,()=>{
 const x=fixture();try{
  x.target.pos.z=10;for(let i=0;i<hz/2;i++)x.step(1/hz);
  x.beam.end();for(let frame=0;frame<Math.ceil(.12*hz)&&!x.beam.dead;frame++)x.step(1/hz);
  assert.equal(x.beam.dead,true,'Spent zero-length energy must retire, not leave a cap at yesterday\'s contact');
 }finally{x.close();}
});

test('piercing bodies is an explicit portable editor option that reaches native beam creation',()=>{
 const def=structuredClone(ROSTER.find(d=>d.id==='sol'));
 const key=Object.keys(def.abilities).find(k=>def.abilities[k].type==='beam');
 assert.ok(attackFields(def,key,{}).some(field=>field.key==='pierceFighters'),'The beam contact behavior must be authorable, not a hardcoded roster exception');
 const overrides=setAttackOverride({},def,key,{pierceFighters:true}),custom=applyAttackOverrides(def,overrides),x=fixture();
 try{
  x.beam._dispose(x.game);x.game.projectiles=new Projectiles(x.game);
  const shot=Game.prototype.spawnBeamFor.call(x.game,x.caster,custom.abilities[key]);
  for(let i=0;i<60;i++){x.game.time+=1/60;shot.update(1/60,x.game);}
  assert.ok(shot.tip.position.z>40,'Explicit piercing must preserve a traveling path through the fighter');
  assert.ok(x.target.hp<10000,'Piercing still deals damage to the contacted fighter');
  shot._dispose(x.game);
 }finally{x.close();}
});

test('absorbed core and sheath close at the traveled contact instead of leaving an open flared tube',()=>{
 const x=fixture({radius:4});try{
  for(let i=0;i<60;i++)x.step(1/60);
  const b=x.beam,end=b._bodyContact.point;
  for(const geo of [b._coreGeo,b._glowGeo]){
   const indices=geo.index.array,positions=geo.attributes.position.array;
   const lastTriangle=Array.from(indices.slice(geo.drawRange.count-3,geo.drawRange.count));
   assert.ok(lastTriangle.some(i=>new THREE.Vector3().fromArray(positions,i*3).distanceTo(end)<1e-5),'The final drawn face must close onto the actual contact center');
   assert.ok(Array.from(positions).every(Number.isFinite));
  }
 }finally{x.close();}
});
