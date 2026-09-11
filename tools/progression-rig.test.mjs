import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {Game} from '../src/engine/game.js';
import {Ragdoll} from '../src/engine/ragdoll.js';
import {FlightWake} from '../src/engine/flight-wake.js';
import {setInvisible,updateInvisible} from '../src/engine/systems.js';
import {animateHitReaction} from '../src/engine/hit-reaction.js';
import {bendArm} from '../src/engine/hero-rig.js';
import {ROSTER} from '../src/data/characters.js';

function fixture(model={}){
  const def=structuredClone(ROSTER.find(d=>d.id==='sol'));
  def.model={costume:'fitted',flightStyle:'hero',hairColor:'#172127',wake:{width:.5,life:.7,intensity:.8},...model};
  def.frame={scale:1,bulk:1,broad:1,head:1,neck:1,stance:1};
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(60,1,.1,1000),f=new Fighter(def,{rimK:.37});
  scene.add(f.obj);camera.position.set(0,80,-50);
  const game={scene,world:{scene,camera},isHuman:()=>false,particles:{spawn:()=>{}},vfx:{flash:()=>{}}};f._game=game;
  return {f,def,scene,camera,game,close(){if(f.ragdoll)f.ragdoll.restore();f.dispose();}};
}
function apply(f,form){assert.equal(typeof f.applyForm,'function','Fighter must expose an in-place appearance swap');return f.applyForm(form);}
function resources(root){const all=new Set();root.traverse(o=>{if(o.geometry)all.add(o.geometry);for(const m of [].concat(o.material||[]))all.add(m);});return all;}

test('live sparse form animation selection preserves body and other weapon families',()=>{
  const assets={body:'body.hero-standard@1',motion:{locomotion:'motion.hero-ual@1',reload:'motion.hero-ual@1'},equipment:{rifle:'equipment.carbine@1',pistol:'equipment.sidearm@1'}};
  const x=fixture({assets});try{
    apply(x.f,{model:{assets:{motion:{grenade:'motion.hero-ual2@1'},equipment:{pistol:'equipment.future-sidearm@2'}}}});
    assert.deepEqual(x.f.def.model.assets,{
      body:'body.hero-standard@1',motion:{locomotion:'motion.hero-ual@1',reload:'motion.hero-ual@1',grenade:'motion.hero-ual2@1'},
      equipment:{rifle:'equipment.carbine@1',pistol:'equipment.future-sidearm@2'}
    });
    assert.equal(assets.equipment.pistol,'equipment.sidearm@1','form selection must not mutate the saved base');
    apply(x.f,null);
    assert.deepEqual(x.f.def.model.assets,assets,'returning to base restores the original references');
  }finally{x.close();}
});

test('switching sparse forms resolves against the base, not the preceding form',()=>{
  const x=fixture({assets:{motion:{locomotion:'motion.hero-ual@1'},equipment:{rifle:'equipment.carbine@1'}}});try{
    apply(x.f,{model:{assets:{equipment:{rifle:'equipment.future-carbine@2'}}}});
    apply(x.f,{model:{assets:{motion:{reload:'motion.hero-ual@1'}}}});
    assert.deepEqual(x.f.def.model.assets,{
      motion:{locomotion:'motion.hero-ual@1',reload:'motion.hero-ual@1'},equipment:{rifle:'equipment.carbine@1'}
    });
  }finally{x.close();}
});

test('live form swap preserves actor, root, transform, combat state and active references',()=>{
  const x=fixture();try{const {f,scene}=x,root=f.obj,pos=f.pos,parts=f.parts;
    f.hp=37;f.ki=0;f.drainedT=1.2;f.flying=true;f.gait='airborne';f.state='hit';f.hitstop=.1;f.hitFlash=.4;f.staggerT=.3;
    f.pos.set(12,140,-20);f.vel.set(40,5,-60);f.aim3.set(.3,.4,.5);root.rotation.set(.5,.9,-.3,'YXZ');root.scale.setScalar(1.2);root.visible=false;root.userData.external={keep:true};
    const ai=f.ai={owner:f},gear=f._gearHeld={name:'rifle'},items=f.items,slots=f.slots,sheet=f.sheet;
    const slot=Object.values(slots)[0];slot.cd=1.4;slot.active={caster:f};slot.remoteShot={caster:f};
    const active=slot.active,remote=slot.remoteShot,aim=f.aim3,velocity=f.vel;const snapshot={pos:pos.toArray(),vel:f.vel.toArray(),aim:aim.toArray(),rotation:root.quaternion.toArray(),scale:root.scale.toArray()};
    assert.equal(apply(f,{name:'Ascended Sol',model:{costume:'plated'},frame:{bulk:1.4},colors:{primary:'#ffbb33'}}),true);
    assert.notEqual(f.parts,parts);assert.equal(f.obj,root);assert.equal(f.parts.g,root);assert.equal(f.pos,pos);assert.equal(root.parent,scene);assert.equal(root.visible,false);
    assert.deepEqual(root.userData.external,{keep:true});assert.equal(root.userData.rig,true);assert.equal(root.userData.frame.bulk,1.4);
    assert.deepEqual({pos:pos.toArray(),vel:f.vel.toArray(),aim:aim.toArray(),rotation:root.quaternion.toArray(),scale:root.scale.toArray()},snapshot);
    assert.equal(f.ai,ai);assert.equal(f._gearHeld,gear);assert.equal(f.items,items);assert.equal(f.slots,slots);assert.equal(f.sheet,sheet);
    assert.equal(slot.active,active);assert.equal(slot.remoteShot,remote);assert.equal(slot.cd,1.4);assert.equal(f.aim3,aim);assert.equal(f.vel,velocity);
    assert.deepEqual([f.hp,f.ki,f.drainedT,f.flying,f.state,f.hitstop,f.staggerT],[37,0,1.2,true,'hit',.1,.3]);
    assert.equal(f.parts.mats.suit.color.getHexString(),'ffbb33');assert.equal(f.parts.mats.suit._rimU.uRimK.value,.37);
  }finally{x.close();}
});

test('sparse forms merge against immutable constructor appearance, never a prior form',()=>{
  const x=fixture();try{const {f,def}=x,base=structuredClone(def),abilities=def.abilities;
    apply(f,{name:'Form A',model:{costume:'plated',hairColor:'#ffdd77',wake:{width:.8}},frame:{bulk:1.4},colors:{primary:'#ff9933'}});
    assert.equal(f.def.model.wake.life,.7);assert.equal(f.def.model.wake.width,.8);
    apply(f,{name:'Form B',model:{flightStyle:'martial'},colors:{accent:'#40cfff'}});
    assert.equal(f.name,base.name);assert.equal(f.def.name,base.name);assert.equal(f.formName,'Form B');assert.equal(f.def.model.costume,'fitted');assert.equal(f.def.model.hairColor,'#172127');assert.equal(f.def.model.wake.width,.5);
    assert.equal(f.obj.userData.frame.bulk,1);assert.equal(f.def.colors.primary,base.colors.primary);assert.equal(f.def.colors.accent,'#40cfff');assert.equal(f.def.abilities,abilities);
    apply(f,null);assert.equal(f.name,base.name);assert.equal(f.formName,'');assert.equal(f.def.colors.accent,base.colors.accent);assert.equal(f.parts.rig.flightStyle,'hero');
    assert.deepEqual(def,base,'shared source definition cannot be rewritten');
  }finally{x.close();}
});

test('new flight language drops inherited pose targets, while same-language forms preserve authored poses',()=>{
  const poses={forward:{armRx:-.8,armLx:.4}},x=fixture({poses});try{const {f}=x;
    apply(f,{model:{costume:'plated'}});assert.deepEqual(f.def.model.poses,poses);
    apply(f,{model:{flightStyle:'martial'}});assert.equal(f.parts.rig.flightStyle,'martial');assert.equal(f.def.model.poses,undefined);
    apply(f,null);assert.deepEqual(f.def.model.poses,poses);assert.equal(f.parts.rig.flightStyle,'hero');
  }finally{x.close();}
});

test('semantically identical form is idempotent, including reordered sparse keys',()=>{
  const x=fixture();try{const {f}=x;
    apply(f,{model:{costume:'plated',hairColor:'#ffdd77'},colors:{accent:'#40cfff',primary:'#ff9933'}});const parts=f.parts;
    assert.equal(apply(f,{colors:{primary:'#ff9933',accent:'#40cfff'},model:{hairColor:'#ffdd77',costume:'plated'}}),true);
    assert.equal(f.parts,parts,'identical forms must not rebuild GPU resources');
  }finally{x.close();}
});

test('old figure resources dispose exactly once while held gear and world effects survive',()=>{
  const x=fixture();try{const {f,scene}=x,old=resources(f.obj),counts=new Map([...old].map(r=>[r,0]));
    for(const r of old)r.addEventListener('dispose',()=>counts.set(r,counts.get(r)+1));
    const mesh=f._gearMesh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());f.obj.add(mesh);mesh.position.set(2,3,4);
    let disposedGear=0;for(const r of resources(mesh))r.addEventListener('dispose',()=>disposedGear++);
    const carry=f._carry={mesh:new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial())};scene.add(carry.mesh);
    const line=f._grapLine=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial());scene.add(line);
    let worldDisposal=0;for(const r of [...resources(line),...resources(carry.mesh)])r.addEventListener('dispose',()=>worldDisposal++);
    apply(f,{model:{costume:'martial'}});
    for(const [r,n] of counts)assert.equal(n,1,`old ${r.type||'resource'} must dispose once`);
    assert.equal(disposedGear,0);assert.equal(f._gearMesh,mesh);assert.equal(mesh.parent,f.obj);assert.deepEqual(mesh.position.toArray(),[2,3,4]);
    assert.equal(f._carry,carry);assert.equal(carry.mesh.parent,scene);assert.equal(f._grapLine,line);assert.equal(line.parent,scene);assert.equal(worldDisposal,0);
  }finally{x.close();}
});

test('form requests queue through real ragdoll restoration and latest request wins',()=>{
  const x=fixture();try{const {f,game}=x,parts=f.parts;
    f.state='ko';f.hp=0;f.ragdoll=new Ragdoll(f);const rag=f.ragdoll,restore=rag.restore.bind(rag);let restored=false;
    rag.restore=()=>{assert.equal(f.parts,parts);restore();restored=true;};
    for(const r of resources(f.obj))r.addEventListener('dispose',()=>assert.equal(restored,true,'old ragdoll rig disposed before exact restore'));
    assert.equal(apply(f,{name:'First',model:{costume:'plated'}}),false);assert.equal(apply(f,{name:'Latest',model:{costume:'martial'}}),false);
    assert.equal(f.parts,parts);assert.equal(f.ragdoll,rag);assert.equal(f.state,'ko');
    f.koT=3.5;f._updateKO(0,game);assert.equal(restored,true);assert.equal(f.ragdoll,null);assert.equal(f.state,'idle');assert.equal(f.formName,'Latest');assert.notEqual(f.parts,parts);
  }finally{x.close();}
});

test('queued null restores base after KO and no-respawn actors keep their exact rig',()=>{
  const x=fixture();try{const {f,game,def}=x;apply(f,{name:'Ascended',model:{costume:'plated'}});f.state='ko';f.hp=0;f.ragdoll=new Ragdoll(f);
    assert.equal(apply(f,null),false);f.koT=3.5;f.noRespawn=true;const parts=f.parts;f._updateKO(0,game);
    assert.equal(f._remove,true);assert.equal(f.parts,parts);assert.equal(f.formName,'Ascended');
    f.noRespawn=false;f._updateKO(0,game);assert.equal(f.name,def.name);assert.equal(f.def.model.costume,'fitted');
  }finally{x.close();}
});

test('world-space wake retains ownership and samples the transformed rig sockets',()=>{
  const x=fixture();try{const {f,game}=x;Object.assign(f,{_openSky:true,flying:true,gait:'airborne',cruiseHeld:true});f.pos.set(0,140,0);f.vel.set(0,0,100);
    const wake=f._flightWake=new FlightWake(game.world,f);wake.update(1/120);const oldFoot=f.parts.legL.userData.boot;
    apply(f,{frame:{scale:1.2,broad:1.2}});f.obj.updateMatrixWorld(true);wake.update(1/120);
    assert.equal(f._flightWake,wake);assert.equal(wake.disposed,false);assert.notEqual(f.parts.legL.userData.boot,oldFoot);
    const foot=f.parts.legL.userData.boot.getWorldPosition(new THREE.Vector3());assert.ok(wake.footL.distanceTo(foot)<1e-9);
    assert.ok(Array.from(wake.mesh.geometry.attributes.position.array).every(Number.isFinite));
  }finally{x.close();}
});

test('rig baseline caches are invalidated without discarding actual hurt reaction or melee',()=>{
  const x=fixture();try{const {f}=x;
    const hit=f._hitReaction={offset:new THREE.Vector3(.1,.2,.3),velocity:new THREE.Vector3(1,2,3)},melee=f._meleeMotion={point:new THREE.Vector3(10,140,10),side:1};
    // Form handoff now restores the reaction before moving the rig. Produce an
    // actual baseline through animation instead of an impossible {old:true}
    // placeholder that cannot be restored or occur in the running game.
    f._animate(0);assert.ok(f._hitReactionBase?.torso);
    f._combatPoseBase={old:true};f._combatRendered={old:true};f._handPrev=new THREE.Vector3(99,99,99);f._handSpd=100;
    f._suitHex=f.parts.mats.suit.color.getHex();f._bleed=2;
    apply(f,{frame:{scale:1.2},colors:{primary:'#ffaa22'}});
    assert.equal(f._hitReaction,hit);assert.equal(f._meleeMotion,melee);assert.equal(f._bleed,2);
    assert.ok(!f._hitReactionBase&&!f._combatPoseBase&&!f._combatRendered);assert.equal(f._handPrev,null);assert.equal(f._handSpd,0);assert.equal(f._suitHex,0xffaa22);
  }finally{x.close();}
});

test('a live invisibility effect continues controlling new costume materials',()=>{
  const x=fixture();try{const {f,game}=x;game.vfx.ring=()=>{};game.audio={teleport:()=>{}};
    setInvisible(f,5,game);updateInvisible(f,.1,game);const state=f._invis;
    apply(f,{model:{costume:'plated'},colors:{primary:'#ffaa22'}});updateInvisible(f,.1,game);
    assert.equal(f._invis,state);assert.equal(f.parts.mats.suit.transparent,true);assert.ok(f.parts.mats.suit.opacity<.1);
    f._invis.t=.01;updateInvisible(f,.02,game);assert.equal(f.parts.mats.suit.opacity,1);
  }finally{x.close();}
});

test('copied recoil never becomes a permanent positional offset on the new frame',()=>{
  const x=fixture();try{const {f}=x;f._openSky=true;f._hitReaction={offset:new THREE.Vector3(.1,.2,.3),velocity:new THREE.Vector3(1,2,3)};
    animateHitReaction(f,1/60);assert.notEqual(f.parts.torso.position.x,0);
    apply(f,{frame:{scale:1.2}});assert.ok(Math.abs(f.parts.torso.position.x)<1e-9);assert.ok(Math.abs(f.parts.torso.position.z)<1e-9);
  }finally{x.close();}
});

test('transformed bent arms keep the hand socket on the new forearm length',()=>{
  const x=fixture();try{const {f}=x;bendArm(f.parts.armR,1);apply(f,{frame:{scale:1.2}});
    const arm=f.parts.armR,hand=arm.children[2],elbow=new THREE.Vector3(0,-arm.userData.upperLength,0);
    assert.ok(Math.abs(hand.position.distanceTo(elbow)-arm.userData.foreLength)<1e-9);
    assert.ok(hand.position.z>1,'the bent hand must not remain on the straight rest axis');
  }finally{x.close();}
});

for(const teardown of [false,true])test(`real hologram retains borrowed geometry across ${teardown?'fighter disposal':'form replacement'} until expiry`,()=>{
  const x=fixture();try{const {f,game}=x;Object.assign(game,{time:0,audio:{teleport(){}},vfx:{ring(){},flash(){}}});
    const borrowed=f.parts.head.geometry;let retired=0;borrowed.addEventListener('dispose',()=>retired++);
    const hologram=Game.prototype.spawnDecoy.call(game,f,.5);let found=false;hologram.grp.traverse(o=>{if(o.geometry===borrowed)found=true;});assert.equal(found,true);
    if(teardown)f.dispose();else apply(f,{model:{costume:'plated'}});
    assert.equal(retired,0,'a surviving hologram still owns a live reference to this geometry');
    Game.prototype.updateDecoys.call(game,1);assert.equal(retired,1,'last borrower expiry must retire the old buffer exactly once');
  }finally{x.close();}
});

for(const variant of [0,1])for(const teardown of [false,true])test(`hand shape ${variant}: hologram keeps both morph resources until last borrower leaves after ${teardown?'disposal':'replacement'}`,()=>{
 const x=fixture();try{
  const {f,game}=x;Object.assign(game,{time:0,audio:{teleport(){}},vfx:{ring(){},flash(){}}});
  const hand=f.parts.armR.children[2],pair=hand.geometry.palmVariants,retired=[0,0];hand.geometry=pair[variant];
  pair.forEach((g,i)=>g.addEventListener('dispose',()=>retired[i]++));
  const hologram=Game.prototype.spawnDecoy.call(game,f,.5);let borrowed=false;
  hologram.grp.traverse(o=>{if(o.geometry===pair[variant])borrowed=true;});assert.ok(borrowed);
  if(teardown)f.dispose();else apply(f,{model:{costume:'plated'}});
  assert.deepEqual(retired,[0,0],'either visible variant keeps its resource family alive');
  Game.prototype.updateDecoys.call(game,1);assert.deepEqual(retired,[1,1],'active and inactive buffers retire exactly once');
 }finally{x.close();}
});
