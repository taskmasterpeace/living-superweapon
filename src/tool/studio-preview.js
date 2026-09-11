import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Fighter, tierOf } from '../engine/entity.js';
import {formAt} from '../data/progression.js';
import { World } from '../engine/world.js';
import { applyProfile } from './studio-profile.js';
import { StudioCombat, TARGET_MOTIONS, TARGET_DEFENSES, SHOOTER_MOTIONS, CONTACT_TESTS, NANITE_SAMPLES, naniteSelection, naniteSource } from './studio-combat.js';
import {FlightWake} from '../engine/flight-wake.js';
import {FlightSurfaceWake} from '../engine/flight-surface-wake.js';
import {GAIT} from '../core/util.js';
import {clearForegroundVisibility} from '../engine/foreground-visibility.js';
import {StudioAudio} from './studio-audio.js';
import {advanceNanites} from '../engine/nanite-state.js';
import {slotUnlocked} from '../data/progression.js';
import {attackSource,attackIdentity} from '../data/attack-tuning.js';
import {ROSTER} from '../data/characters.js';

const groundSpeeds={groundWalk:7.5,groundJog:15/(11/12),groundSprint:33,groundCrouch:0,groundCrouchWalk:8};

// A neutral authoring stage, not a second animation implementation. The Fighter and chase method
// below are production code. Only the empty collision world and input sequence belong to Studio.
export class StudioPreview {
  constructor(host,onFrame=()=>{}) {
    this.host=host;this.onFrame=onFrame;this.time=0;this.playing=true;this.playbackRate=1;this.state='hover';this.view='orbit';
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#242923');
    this.renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.shadowMap.enabled=true;
    this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.1;host.prepend(this.renderer.domElement);
    this.camera=new THREE.PerspectiveCamera(38,1,.1,500);this.camera.position.set(20,18,27);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.target.set(0,12,0);
    this.controls.enableDamping=true;this.controls.minDistance=12;this.controls.maxDistance=75;
    this._meleeZoom=1;this._isolated=false;
    this.controls.addEventListener('end',()=>{
      if(this.isCombat&&this.view==='orbit'&&this._meleeFit)this._meleeZoom=THREE.MathUtils.clamp(this.camera.position.distanceTo(this.controls.target)/this._meleeFit,.4,3);
    });
    this.scene.add(new THREE.HemisphereLight('#edf4ff','#746048',.72));
    const key=new THREE.DirectionalLight('#fff0d4',3);key.position.set(-18,24,-16);key.castShadow=true;
    key.shadow.bias=-.0002;key.shadow.normalBias=.025;
    key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-30,right:30,top:30,bottom:-30});this.scene.add(key,key.target);
    const rim=new THREE.DirectionalLight('#a6d6ef',.9);rim.position.set(12,14,18);this.scene.add(rim);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(240,240),new THREE.MeshStandardMaterial({color:'#30372f',roughness:.92}));
    floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;this.scene.add(floor);
    this.floor=floor;
    const grid=new THREE.GridHelper(120,30,'#59604a','#3e453a');grid.position.y=.025;this.scene.add(grid);
    this.grid=grid;this.travelDelta=new THREE.Vector3();
    // World.chase is shared. Studio's stage has no collision obstacles or gameplay camera claims.
    this.chase=Object.assign(Object.create(World.prototype),{
      camera:this.camera,camPos:new THREE.Vector3(),camTarget:new THREE.Vector3(),camBasis:new THREE.Vector3(0,0,1),_lookActive:true,_lookYaw:0,_lookPitch:0,
      _shake:0,_shakeT:0,_chaseSnap:true,sun:key,sunOff:new THREE.Vector3(-18,24,-16),
      setCameraMode:()=>this.camera,_camNearestT:()=>1,heightAt:()=>0,surfaceAt:()=> 'sand',
      _applyProj:()=>{this.camera.aspect=host.clientWidth/Math.max(1,host.clientHeight);this.camera.fov=this.chase._chaseFov||58.72;this.camera.updateProjectionMatrix();},
    });
    Object.assign(this.chase,{scene:this.scene,cover:[],interiors:[],ARENA:240,camMode:'chase',shake:()=>{},punch:()=>{},crater:()=>{}});
    this.sound=new StudioAudio();this.sound.setPlaying(this.playing);
    this.combat=new StudioCombat(this.scene,this.chase,this.sound.audio);
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);
    this.last=performance.now();this.loop=now=>{
      const dt=Math.min(.05,(now-this.last)/1000);this.last=now;
      if(this.fighter)this.sound.audio.listen(this.fighter.pos.x,this.fighter.pos.z,this.fighter.pos.y);
      this.sound.audio.sweep();
      if(this.playing)this.advancePlayback(dt);
      else {if(this.view==='orbit')this.controls.update();this.wake?.update(0);this.renderer.render(this.scene,this.camera);}
      this.raf=requestAnimationFrame(this.loop);
    };this.raf=requestAnimationFrame(this.loop);
  }
  get duration(){
    if(this.state==='attack'&&this.combat.reloadEncounter)return Math.max(8,1.6+(this.fighter.slots[this.combat.slot].def.reloadTime??2.2));
    if(this.isJump)return 3;
    if(this.state==='attack'&&this.combat.naniteEncounter)return 8;
    if(this.state==='attack'&&this.combat.resourceEncounter)return 8;
    const constructDurations=[this.combat.slot,this.combat.secondarySlot].map(key=>this.fighter?.slots?.[key]?.def).filter(def=>def?.type==='construct').map(def=>1+(def.duration||9));
    if(this.state==='attack'&&constructDurations.length)return Math.max(8,...constructDurations);
    if(this.state!=='attack')return 8;
    const charged=[this.combat.slot,this.combat.secondarySlot].some(key=>{
      const def=this.fighter?.slots?.[key]?.def;return def&&(def.type==='charge'||(def.type==='beam'&&def.charge));
    });
    return charged?Math.max(8,.6+this.combat.chargeHold+6):8;
  }
  get playing(){return this._playing;}
  set playing(value){this._playing=!!value;this.sound?.setPlaying(this._playing);}
  get isCombat(){return ['beam','attack','melee'].includes(this.state);}
  get isJump(){return this.state==='groundJump';}
  get isolated(){return this._isolated&&this.isCombat&&this.view!=='game';}
  get isGround(){return this.isJump||Object.hasOwn(groundSpeeds,this.state);}
  setPlaybackRate(rate){if(rate!==1&&rate!==.25)return false;this.playbackRate=rate;this.accumulator=0;return true;}
  advancePlayback(elapsed){
    if(!this.playing||!Number.isFinite(elapsed)||elapsed<=0)return;
    const dt=Math.min(.05,elapsed)*(this.playbackRate??1);
    if(this.isCombat||this.isJump){
      this.accumulator=(this.accumulator||0)+dt;
      while(this.accumulator+1e-10>=1/60){this.accumulator=Math.max(0,this.accumulator-1/60);this.time+=1/60;if(this.time>=this.duration)this.seek(0);else this.step(1/60,true,false);}
      this.renderer.render(this.scene,this.camera);
    }else{this.time=(this.time+dt)%8;this.step(dt);}
  }
  setProfile(def,profile,rebuild=true) {
    // Source-aware validation must finish before touching the live actor or draft.
    const effective=applyProfile(def,profile);
    this.def=def;this.profile=profile;
    if(rebuild||!this.fighter){
      if(this.fighter){this.scene.remove(this.fighter.obj);this.fighter.dispose();}
      this.fighter=new Fighter(effective,{rimK:.14});this.scene.add(this.fighter.obj);
      this.fighter.pos.set(0,8,0);this.fighter.facing=0;this.fighter._openSky=true;
      this.fighter.flying=true;this.fighter.gait='airborne';this.fighter._flyPose=1;
      this.fighter.parts.groundRig.visible=false;this.fighter.aim3.set(0,0,1);this.fighter.animT=this.time;
    }else this.fighter.def=effective;
    this.seek(this.time);
  }
  swappedNaniteProfile(profile){
    const effective=applyProfile(this.def,profile),entries=Object.entries(effective.abilities).filter(([,def])=>naniteSource(def));
    if(entries.length!==2)throw new Error('Equip two nanite modules to swap their forearms.');
    const next=structuredClone(profile);
    for(const [slot,def] of entries){
      const source=attackSource(this.def,slot),values={...next.attacks?.[slot]?.values};
      const attachment=naniteSource(def).naniteAttachment==='left-forearm'?'right-forearm':'left-forearm';
      if(attachment===naniteSource(source).naniteAttachment)delete values.naniteAttachment;else values.naniteAttachment=attachment;
      if(Object.keys(values).length)next.attacks[slot]={source:structuredClone(source),identity:attackIdentity(source),values};else delete next.attacks[slot];
    }
    applyProfile(this.def,next);return next;
  }
  setState(state){this.state=state;if(!this.isCombat)this._isolated=false;this.combat.mode=state==='melee'?'melee':state==='attack'?'attack':'beam';this.seek(0);}
  setLevel(level){
    if(!Number.isInteger(level)||level<1||level>10)return false;
    this.level=level;
    if(this.fighter){
      // Test encounters replay at the chosen level. A lower gate must not leave
      // an old paid charge/beam alive in what is now a different test setup.
      if(this.isCombat)this.seek(this.time);
      else{this._applyLevel();this.step(0);}
    }
    return true;
  }
  _applyLevel(){
    const f=this.fighter;f.level=this.level??1;f.tier=Math.min(tierOf(f.level),f.energyInfinite?2:4);
    const selected=formAt(f.def,f.level,f.energyInfinite);
    if(selected.form||f.formLevel)f.applyForm(selected.form);
    f.formLevel=selected.level;f.formName=selected.form?.name||'';
    f.parts.groundRig.visible=false;
  }
  setCombat({slot=this.combat.slot,secondarySlot=this.combat.secondarySlot,elevation=this.combat.elevation,distance=this.combat.distance,motion=this.combat.motion,targetHero=this.combat.targetHero,targetDefense=this.combat.targetDefense,shooterMotion=this.combat.shooterMotion,targetSpeed=this.combat.targetSpeed,chargeHold=this.combat.chargeHold,pattern=this.combat.pattern,opposingPriority=this.combat.opposingPriority,startingKi=this.combat.startingKi,naniteSample=this.combat.naniteSample}){
    if(!ROSTER.some(def=>def.id===targetHero))return false;
    if(!Object.hasOwn(TARGET_DEFENSES,targetDefense))return false;
    if(!Number.isFinite(elevation)||elevation < -75||elevation > 75||!Number.isFinite(distance)||distance<12||distance>60)return false;
    if(slot!==null&&!this.combat.slots.some(([key])=>key===slot))return false;
    if(secondarySlot!==null&&!this.combat.slots.some(([key])=>key===secondarySlot))return false;
    if(secondarySlot===slot)secondarySlot=null;
    if(!Object.hasOwn(TARGET_MOTIONS,motion)||!Number.isFinite(targetSpeed)||targetSpeed<10||targetSpeed>210)return false;
    if(!Object.hasOwn(SHOOTER_MOTIONS,shooterMotion)||(shooterMotion.startsWith('ground-')&&elevation<0))return false;
    if(!Number.isFinite(chargeHold)||chargeHold<.2||chargeHold>30)return false;
    if(!Object.hasOwn(CONTACT_TESTS,pattern)||!Number.isInteger(opposingPriority)||opposingPriority<-1||opposingPriority>16)return false;
    if(!Object.hasOwn(NANITE_SAMPLES,naniteSample))return false;
    if(pattern==='nanite'&&!naniteSelection(this.fighter,slot,secondarySlot))return false;
    if(pattern==='reload'){
      const d=this.fighter?.slots[slot]?.def;if(d?.type!=='rifle'||!(d.magazine>0))return false;
      secondarySlot=null;motion='static';if(!shooterMotion.startsWith('ground-'))shooterMotion='ground-hold';elevation=Math.max(0,elevation);
    }
    if(pattern==='nanite'&&![slot,secondarySlot].some(key=>naniteSource(this.fighter.slots[key]?.def)?.naniteForm===(naniteSample==='punch'?'shield':naniteSample)))return false;
    if(startingKi!==null&&(!Number.isFinite(startingKi)||startingKi<0||startingKi>(this.fighter?.maxKi??0)))return false;
    if(motion==='advance'){
      if(this.fighter?.slots[slot]?.def.type!=='beam'||pattern!=='target')motion='static';
      else{shooterMotion='ground-hold';elevation=0;targetSpeed=Math.max(20,targetSpeed);}
    }
    Object.assign(this.combat,{slot,secondarySlot,elevation,distance,motion,targetHero,targetDefense,shooterMotion,targetSpeed,chargeHold,pattern,opposingPriority,startingKi,naniteSample});this.seek(this.time);
    return true;
  }
  seek(time){
    if(!this.fighter)return;
    this.sound.setScrubbing(true);
    try { this._seek(time); } finally { this.sound.setScrubbing(false); }
  }
  _seek(time){
    this.surfaceWake?.dispose();this.surfaceWake=null;
    this.wake?.dispose();this.wake=null;
    time=Math.max(0,Math.min(this.duration,Number.isFinite(time)?time:0));
    this.accumulator=0;
    const combatState=this.isCombat;
    if(combatState||this._wasCombat||this.isGround||this._wasGround||this.fighter._nanites){
      this.combat.clear();this.scene.remove(this.fighter.obj);this.fighter.dispose();
      this.fighter=new Fighter(applyProfile(this.def,this.profile),{rimK:.14});this.scene.add(this.fighter.obj);
      Object.assign(this.fighter,{_openSky:true,flying:true,gait:'airborne',_flyPose:1});
      this.fighter.pos.set(0,combatState?80:8,0);this.fighter.parts.groundRig.visible=false;
      this.fighter.aim3.set(0,0,1);
    }
    this._wasCombat=combatState;
    this._wasGround=this.isGround;
    this._applyLevel();
    this.combat.reset(this.fighter,this._wasCombat,this.combat.mode);
    this.chase.snapChase();this.chase._chaseFovBase=this.profile.camera.fov;
    this.chase._lookYaw=0;this.chase._lookPitch=0;
    const f=this.fighter;
    if(!combatState){
      f.pos.set(0,this.isGround?0:8,0);
      f.flying=!this.isGround;f.gait=this.isGround?GAIT.GROUNDED:GAIT.AIRBORNE;f._flyPose=this.isGround?0:1;
      if(this.view!=='game'){
        this.travelDelta.copy(this.controls.target).sub(new THREE.Vector3(0,12,0));
        this.camera.position.sub(this.travelDelta);this.controls.target.sub(this.travelDelta);
        if(this.isGround){this.camera.position.y-=8;this.controls.target.y-=8;}
      }
    }
    this.time=0;f.vel.set(0,0,0);f._flightJointPose=null;f._flightBrake=0;
    f.parts.g.rotation.set(0,0,0,'YXZ');f.parts.head.rotation.set(0,0,0);
    f.parts.legL.rotation.set(0,0,0);f.parts.legR.rotation.set(0,0,0);
    this.chase._chaseSnap=true;
    // Seek always starts from the same settled state. No history-dependent spring residue.
    // Settle the carrier at the same source phase we will show at t=0.
    // Otherwise resetting just the clock leaves a previous cycle's body lean.
    const savedHitstop=f.hitstop;if(this.isGround)f.hitstop=1;
    this.settling=true;if(this.state!=='melee')for(let i=0;i<90;i++)this.step(1/60,false,false);this.settling=false;
    if(this.isGround)f.hitstop=savedHitstop;
    if(this.isGround&&f._groundMotion)f._groundMotion.phase=0;
    for(let i=1;i<=Math.round(time*60);i++){this.time=i/60;this.step(1/60,false,false);}
    this.time=time;this.step(0);
  }
  setView(view){
    if(view!=='game')clearForegroundVisibility(this.chase);
    if(view!==this.view)this._meleeZoom=1;
    if(view==='game')this._isolated=false;
    this.view=view;this.controls.enabled=view==='orbit';this.chase._chaseSnap=true;
    if(view!=='game'){
      const positions={orbit:[20,18,27],front:[0,13,32],side:[32,13,0],rear:[0,13,-32]};
      this.camera.position.set(...positions[view]);this.controls.target.set(0,12,0);this.camera.fov=38;
      if(!this.isCombat){
        this.travelDelta.copy(this.fighter.pos).sub(new THREE.Vector3(0,8,0));
        this.camera.position.add(this.travelDelta);this.controls.target.add(this.travelDelta);
      }
      if(this.isCombat){
        const center=this.fighter.pos.clone().lerp(this.combat.target.pos,.5);center.y+=5;
        this.camera.position.sub(new THREE.Vector3(0,12,0)).normalize().multiplyScalar(75).add(center);
        this.controls.target.copy(center);this.controls.maxDistance=350;
      }else this.controls.maxDistance=75;
      this.camera.updateProjectionMatrix();this.camera.lookAt(this.controls.target);this.controls.update();
    }
    this.step(0);
  }
  setIsolated(enabled){
    this._isolated=!!enabled&&this.isCombat&&this.view!=='game';this._meleeZoom=1;
    if(this.combat.target)this.combat.target.obj.visible=!this.isolated;
    if(this.combat.incoming)this.combat.incoming.obj.visible=!this.isolated;
    if(this.isCombat&&this.view!=='game'){
      this._frameInspection();this.controls.update();
    }
    // A view choice must never re-run an input edge, advance physics or rebuild a rig.
    this.renderer.render(this.scene,this.camera);
  }
  _frameInspection(){
    if(!this.isCombat||this.view==='game')return;
    const f=this.fighter,target=this.combat.target,scale=f.def.frame?.scale??1;
    const center=this.isolated?f.pos.clone():f.pos.clone().lerp(target.pos,.5);center.y+=this.isolated?5*scale:5;
    const extent=this.isolated?10*scale:f.pos.distanceTo(target.pos)*.5+10*Math.max(scale,target.def.frame?.scale??1);
    const fit=extent/Math.tan(THREE.MathUtils.degToRad(this.camera.fov*.5))/Math.min(1,this.camera.aspect)*1.12;
    this._meleeFit=Math.max(this.isolated?12:30,fit);
    this.controls.maxDistance=Math.max(350,this._meleeFit*3);
    this.camera.position.sub(this.controls.target).setLength(this._meleeFit*(this.view==='orbit'?this._meleeZoom:1)).add(center);
    this.controls.target.copy(center);
  }
  step(dt,notify=true,render=true) {
    if(!this.fighter)return;
    const f=this.fighter;
    // Lighting follows the subject even in inspection views. Camera ownership
    // must not strand the shadow volume at the previous beam/hover altitude.
    const light=this.chase.sun,offset=this.chase.sunOff;
    light.target.position.set(f.pos.x,f.pos.y+5.4,f.pos.z);
    light.position.copy(light.target.position).add(offset);
    if(this.isCombat){
      // Scrubbing and RAF playback cross input edges on the same 60 Hz clock.
      // Repeated float addition otherwise moves charge release by a whole frame.
      this.time=Math.round(this.time*60)/60;
      // Seeking settles the pose/camera with positive presentation time, but
      // those ninety samples must not buy 1.5 seconds of resource simulation.
      this.combat.step(this.time,this.settling?0:dt,dt);
      this.floor.position.set(f.pos.x,0,f.pos.z);this.grid.position.set(Math.round(f.pos.x/4)*4,.025,Math.round(f.pos.z/4)*4);
      this.combat.target.obj.visible=!this.isolated;
      if(this.combat.incoming)this.combat.incoming.obj.visible=!this.isolated;
      if(this.view==='game')this.chase.chase(f,this.combat.target,dt);
      else {
        this._frameInspection();
        this.controls.update();
      }
      if(render)this.renderer.render(this.scene,this.camera);
      if(notify)this.onFrame({time:this.time,state:this.state,speed:0,fov:this.camera.fov,damage:this.combat.damage,
        contacts:this.combat.contacts,nominalDamage:this.combat.nominalDamage,nominalUnit:this.combat.nominalUnit,
        phase:this.combat.phase,strikeTake:f._authoredStrike?.take,strikeTime:f._authoredStrike?.time,meleeEvents:this.combat.meleeEvents,defending:this.combat.defending,guardMeter:this.fighter.guardMeter,remoteDetonations:this.combat.remoteDetonations,
        splitChildren:this.combat.splitChildren,liveSplitChildren:this.combat.liveSplitChildren,
        resource:this.combat.resourceEncounter?this.combat.resourceStats():null,
        nanite:this.combat.naniteEncounter?this.combat.naniteStats():null,
        pattern:this.state==='attack'?this.combat.pattern:'target',interception:this.combat.interceptionStats()});
      return;
    }
    const phase=this.state==='cycle'?(this.time<1?'hover':this.time<2.2?'forward':this.time<3.4?'boost':this.time<4?'brake':this.time<5.2?'backward':this.time<6.2?'strafeLeft':this.time<7.2?'strafeRight':'hover'):this.state;
    if(this.isJump){
      this.travelDelta.copy(f.pos);
      if(dt>0&&!this.settling){
        // Same rise/release input and Fighter physics as play. Never synthesize
        // an arc or apply imported root motion; seeking uses the same 60Hz steps.
        const frame=Math.round(this.time*60);
        f.flyHeld=frame>=24&&frame<28;
        f.move({x:0,y:0,z:frame<96?1:0},dt);
        f.update(dt,this.combat.game);
      }else{f._animate(0);f._sync();}
      this.travelDelta.subVectors(f.pos,this.travelDelta);
      if(this.view!=='game'){this.camera.position.add(this.travelDelta);this.controls.target.add(this.travelDelta);this.controls.update();}
      else this.chase.chase(f,null,dt);
      this.floor.position.set(f.pos.x,0,f.pos.z);this.grid.position.set(Math.round(f.pos.x/4)*4,.025,Math.round(f.pos.z/4)*4);
      light.target.position.set(f.pos.x,f.pos.y+5.4,f.pos.z);light.position.copy(light.target.position).add(offset);
      f.obj.updateMatrixWorld(true);
      if(render)this.renderer.render(this.scene,this.camera);
      if(notify)this.onFrame({time:this.time,state:this.state,speed:f.vel.length(),fov:this.camera.fov,
        groundTake:`Native physics rehearsal · ${f._jumpMotion?.take||'Ground recovery'}`,groundDuration:f._jumpMotion?.duration||0});
      return;
    }
    const forward=phase==='forward'||phase==='boost',back=phase==='backward';
    f.cruiseHeld=phase==='boost';
    f._burnT=f.cruiseHeld?(this.state==='cycle'?Math.max(0,this.time-2.2):2):0;
    f.ki=f.maxKi; // Authoring is full-energy; the play test owns resource drain and exhaustion.
    f.crouching=this.state==='groundCrouch'||this.state==='groundCrouchWalk';
    if(this.isGround)f.vel.set(0,0,groundSpeeds[this.state]*(f.parts.rig.pivotHeight/4.6));
    else f.move({x:phase==='strafeLeft'?1:phase==='strafeRight'?-1:0,y:0,z:forward?1:back?-1:this.state!=='cycle'&&phase==='brake'?1:0},dt);
    if(this.state!=='cycle'&&phase==='brake')f._flightBrake=1;
    this.travelDelta.copy(f.vel).multiplyScalar(this.settling?0:dt);
    f.pos.add(this.travelDelta);
    light.target.position.set(f.pos.x,f.pos.y+5.4,f.pos.z);light.position.copy(light.target.position).add(offset);
    if(this.view!=='game'){this.camera.position.add(this.travelDelta);this.controls.target.add(this.travelDelta);}
    if(!this.settling&&dt>0&&f.alive)advanceNanites(f._nanites,dt,new Set(Object.keys(f.slots).filter(key=>slotUnlocked(f,key))));
    f.animT=this.time;f._animate(dt);f.obj.updateMatrixWorld(true);
    // The character really travels; the neutral stage follows it. The wake stores world-space
    // history exactly as in gameplay, rather than manufacturing a stationary preview streak.
    this.floor.position.set(f.pos.x,0,f.pos.z);this.grid.position.set(Math.round(f.pos.x/4)*4,.025,Math.round(f.pos.z/4)*4);
    if(!this.isGround&&!this.settling&&f.vel.lengthSq()>900&&this.profile.wake.intensity>0&&!this.wake)this.wake=new FlightWake(this.chase,f);
    if(this.wake&&this.wake.update(dt)){this.wake.dispose();this.wake=null;}
    if(!this.isGround&&!this.settling&&!this.surfaceWake&&FlightSurfaceWake.canEmit(this.chase,f))this.surfaceWake=new FlightSurfaceWake(this.chase,f);
    if(this.surfaceWake&&this.surfaceWake.update(dt)){this.surfaceWake.dispose();this.surfaceWake=null;}
    if(this.view==='game')this.chase.chase(f,null,dt);else this.controls.update();
    if(render)this.renderer.render(this.scene,this.camera);
    if(notify)this.onFrame({time:this.time,state:phase,speed:f.vel.length(),fov:this.camera.fov,
      groundTake:this.isGround?(f._groundMotion?.take||'Procedural'):null,groundDuration:f._groundMotion?.duration});
  }
  resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();if(this.fighter){this._frameInspection();if(this.view!=='game')this.controls.update();}}
  dispose(){cancelAnimationFrame(this.raf);this.playing=false;this.sound.dispose();this.resizeObserver.disconnect();this.controls.dispose();this.combat.dispose();this.wake?.dispose();this.surfaceWake?.dispose();this.fighter?.dispose();this.renderer.dispose();}
}
