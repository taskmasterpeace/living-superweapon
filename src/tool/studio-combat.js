import * as THREE from 'three';
import {usesThrowAction} from '../engine/throwable-action.js';
import {Fighter} from '../engine/entity.js';
import {Game} from '../engine/game.js';
import {runSlot,clearSlotFx,remoteAttack} from '../engine/abilities.js';
import {firearmAmmo,updateFirearmReload,requestReload} from '../engine/firearm-ammo.js';
import {Projectiles} from '../engine/projectiles.js';
import {Particles3D} from '../engine/particles3d.js';
import {VFX} from '../engine/vfx.js';
import {ROSTER} from '../data/characters.js';
import {slotUnlocked,unlockLevel} from '../data/progression.js';
import {mulberry,GAIT} from '../core/util.js';
import {resetMelee,stepMelee,defensiveSequence} from './studio-melee.js';
import {resolveConstructPolicy,settleConstructUpkeep} from '../engine/construct-policy.js';
import {naniteConfig} from '../data/nanite-tuning.js';
import {advanceNanites} from '../engine/nanite-state.js';
import {presentNanites,snapshotNaniteCells,naniteEmitter} from '../engine/nanite-forearms.js';
import {MeleeSystem} from '../engine/melee.js';

export const TARGET_MOTIONS={static:'Stationary',advance:'Advance · real pressure', 'pass-left':'Pass left', 'pass-right':'Pass right', 'orbit-left':'Circle left', 'orbit-right':'Circle right'};
export const TARGET_DEFENSES={open:'Open target',guard:'Frontal guard'};
export const SHOOTER_MOTIONS={hover:'Airborne · still','ground-hold':'Ground · still','air-left':'Airborne · left and return','air-right':'Airborne · right and return','air-forward':'Airborne · forward and return','ground-left':'Ground · left and return','ground-right':'Ground · right and return','ground-forward':'Ground · forward and return','ground-crouch-forward':'Crouch · forward and return','ground-prone-hold':'Prone · supported rifle','ground-prone-forward':'Prone · crawl and return'};
export const CONTACT_TESTS={target:'Damage target',priority:'Opposing energy shot',bullets:'Ballistic crossfire',nanite:'Nanite assembly / impact / reform',reload:'Reload · magazine sequence'};
export const NANITE_SAMPLES={shield:'Shield · incoming ballistic',cannon:'Cannon · incoming ballistic',punch:'Shield · incoming native punch'};
const ATTACK_TYPES=new Set(['beam','projectile','volley','charge','rifle','construct','melee']);
export function naniteSource(def){try{return naniteConfig(def);}catch{return null;}}
export const supportsAttackRehearsal=def=>ATTACK_TYPES.has(def.type)||!!naniteSource(def);
export function naniteSelection(f,slot,secondarySlot){
  return !!slot&&[slot,secondarySlot].filter(Boolean).every(key=>!!naniteSource(f?.slots[key]?.def));
}
const silent=()=>{};
function resourcePolicy(def){
  if(def?.type!=='construct'||!['wall','tank'].includes(def.construct))return null;
  try{const policy=resolveConstructPolicy(def);return policy.mode==='timed'?null:policy;}catch{return null;}
}
const silentAudio=Object.freeze({
  charge:()=>null,beamVoice:()=>null,sustain:()=>null,
  blast:silent,boom:silent,hit:silent,impact:silent,kiRelease:silent,power:silent,zap:silent,gunshot:silent,
  swing:silent,meleeHit:silent,grunt:silent,teleport:silent,land:silent,
});

// Scripted authoring fixture (silent unless a gated Studio mixer is supplied). Slots, muzzle solve, traveling beam, damage and
// contact particles and unlock gates are production code. No AI, XP gain, world physics or screen shake.
// Damage is measured at Fighter.takeDamage's callback, never inferred from kit DPS.
export class StudioCombat {
  constructor(scene,world,audio=silentAudio) {
    this.scene=scene;this.elevation=0;this.distance=32;this.slot=null;this.secondarySlot=null;this.secondaryPrevious=0;this.damage=0;
    this.contacts=0;this.nominalDamage=0;this.nominalUnit='hp/hit';this.mode='beam';this.chargeHold=1.8;this.phase='ready';this.remoteDetonations=0;
    this.burstPayload=null;this.denied=false;this.drained=false;
    this.startingKi=null;this.resourceObjects=new Map();this.tankHold=null;this.tankDestination=null;
    this.splitChildren=0;this.liveSplitChildren=0;this.splitPayload=null;this.splitShots=new Set();
    this.motion='static';this.shooterMotion='hover';this.targetSpeed=70;this.pathVelocity=new THREE.Vector3();
    this.targetDefense='open';this.targetHero='vanguard';this.blockedContacts=0;this.guardBreaks=0;
    this.pattern='target';this.opposingPriority=1;this.interceptions=[];this.testShots=[];this.testEmitted=0;
    this.naniteSample='shield';this.naniteEvents=[];this.naniteTotals=new Map();this.naniteLaunches=[];
    const particles=new Particles3D(scene,1200),vfx=new VFX(world,particles);
    this.game={scene,world,particles,vfx,time:0,dt:1/60,entities:[],constructs:[],aimPoint:new THREE.Vector3(),hud:null,audio,
      friendlyFire:false,_decoys:[],_domes:[],_flung:[],isHuman:()=>false,
      isFoe:(a,b)=>a!==b&&b.alive&&a.team!==b.team,
      spawnBeamFor:Game.prototype.spawnBeamFor,
      beginBodyContactFrame:Game.prototype.beginBodyContactFrame,resolveBodies:Game.prototype.resolveBodies,
      coneFoe:Game.prototype.coneFoe,trail:Game.prototype.trail,
      spawnConstruct:Game.prototype.spawnConstruct,
      nearestFoe:Game.prototype.nearestFoe,overlapFoe:Game.prototype.overlapFoe,
      areaDamage:Game.prototype.areaDamage,damageBlock:Game.prototype.damageBlock,muzzleFlash:Game.prototype.muzzleFlash,
      chargeGather:Game.prototype.chargeGather,
      // The Studio stage is intentionally empty. Production impact/contact remains
      // real, but there is no terrain, city, score or camera shake to claim.
      worldImpact:silent,slowmo:silent,noise:silent,
      onDrained:(fighter,emitter)=>{
        if(fighter!==this.fighter)return;
        this.warningSound('drained');
        const key=emitter?Object.entries(fighter.slots).find(([,s])=>s.active===emitter)?.[0]:this._steppingSlot||this.slot;
        if(key===this.secondarySlot)this.secondaryFeedback='resource-drained';else this.drained=true;
      },
      onNoKi:(fighter,key)=>{if(fighter===this.fighter){this.warningSound('denied');if(key===this.secondarySlot)this.secondaryFeedback='resource-denied';else if(key===this.slot)this.denied=true;}},
      onAttackIntercept:event=>this.interceptions.push({kind:event.kind,time:this.game.time,retired:event.retired,at:event.pos.toArray()}),
      onHit:(target,amount,opts,blocked)=>{
        if(this.naniteEncounter){this.naniteHit(target,amount,opts,blocked);return;}
        if(target!==(this.defending?this.fighter:this.target))return;
        if(this.mode==='melee' && (opts?.dot||opts?.bleed)){target.hp=target.maxHp;return;}
        if(this.mode==='melee')this.meleeEvents.push({move:blocked?'block':opts?.meleeMove||(opts?.slam?'surface':'other'),time:this.game.time,amount});
        this.contacts++;this.damage+=amount;
        if(this.mode!=='melee'&&opts?.beamBlocked){this.blockedContacts++;if(target.guardMeter<=.001)this.guardBreaks++;}
        // This is a production Fighter with defenses and hit reactions, but a
        // measurement target must never cross into KO/ragdoll lifecycle state.
        target.hp=target.maxHp;
      },
    };
    this.game.projectiles=new Projectiles(this.game);
    particles.setMaxPx(8);
  }
  get defending(){return this.mode==='melee'&&defensiveSequence(this.meleeSequence);}
  get reloadEncounter(){return this.mode==='attack'&&this.pattern==='reload'&&!!firearmAmmo(this.fighter?.slots[this.slot]);}
  get naniteEncounter(){return this.mode==='attack'&&this.pattern==='nanite'&&naniteSelection(this.fighter,this.slot,this.secondarySlot);}
  get resourceSlots(){return this.mode==='attack'?[this.slot,this.secondarySlot].filter(key=>key&&resourcePolicy(this.fighter?.slots[key]?.def)):[];}
  get resourceEncounter(){return this.resourceSlots.length>0;}
  get pressureEncounter(){return this.motion==='advance'&&this.pattern==='target'&&['beam','attack'].includes(this.mode)&&this.fighter?.slots[this.slot]?.def.type==='beam';}
  resourceStats(){
    const f=this.fighter;
    return {ki:f?.ki??0,maxKi:f?.maxKi??0,infinite:!!f?.energyInfinite,constructs:this.resourceSlots.map(slot=>{
      const def=f.slots[slot].def,policy=resourcePolicy(def),c=this.resourceObjects.get(slot);
      return {slot,kind:def.construct,mode:policy.mode,rate:policy.mode==='upkeep'?policy.kiPerSec:policy.kiPerDamage,
        live:!!c&&!c.dead,state:c?(c.dead?c.reason||'dissolved':c.state):'ready',hits:c?.hitCount??0,damage:c?.damageReceived??0,kiSpent:c?.kiSpent??0};
    })};
  }
  warningSound(kind){
    this.warningTimes??={denied:-Infinity,drained:-Infinity};
    const time=this.game.time,interval=kind==='drained'?1.5:.25;
    if(time-this.warningTimes[kind]<interval)return;
    this.warningTimes[kind]=time;
    // Match the native Game energy-warning cues. The stage owns its playback
    // clock, so warning debounce also rewinds deterministically on seek.
    if(kind==='drained'){this.game.audio.zap(140);this.game.audio.zap(90);}
    else this.game.audio.zap(120);
  }
  get slots(){return Object.entries(this.fighter?.slots||{}).filter(([,s])=>this.mode==='beam'?s.def.type==='beam':supportsAttackRehearsal(s.def));}
  reset(fighter,enabled,mode=this.mode) {
    this.clear();this.mode=mode;this.fighter=fighter;fighter._game=enabled?this.game:null;
    for(const slot of Object.values(fighter.slots)){slot.ammo=null;firearmAmmo(slot);}
    this.game.attackRandom=mulberry(0x425046); // Repeatable volley spread; no global RNG replacement.
    if(!this.slots.some(([key])=>key===this.slot))this.slot=this.slots[0]?.[0]||null;
    if(this.secondarySlot===this.slot||!this.slots.some(([key])=>key===this.secondarySlot))this.secondarySlot=null;
    if(this.pattern==='nanite'&&!naniteSelection(fighter,this.slot,this.secondarySlot))this.pattern='target';
    if(this.pattern==='reload'&&!this.reloadEncounter)this.pattern='target';
    this.secondaryPrevious=0;
    this.secondaryFeedback=null;
    if(!this.target){
      this.target=new Fighter(ROSTER.find(d=>d.id===(mode==='melee'?(this.meleeSequence==='break'?'sol':'kano'):this.targetHero))||ROSTER.find(d=>d.id==='vanguard'),{team:2,rimK:.14});
      this.target._openSky=true;this.target.flying=true;this.target.gait='airborne';
      this.target._flyPose=1;this.target.isDummy=true;this.target.invuln=0;
      this.target.maxHp=1_000_000_000;this.target.hp=this.target.maxHp;
      this.target._game=this.game;this.target.parts.groundRig.visible=false;
      this.scene.add(this.target.obj);
    }
    this.target.obj.visible=enabled;this.game.entities=enabled?[fighter,this.target]:[];
    fighter.team=1;fighter.ki=this.resourceEncounter&&!fighter.energyInfinite&&Number.isFinite(this.startingKi)?Math.max(0,Math.min(fighter.maxKi,this.startingKi)):fighter.maxKi;
    this.target.team=2;this.target.hp=this.target.maxHp;
    this.damage=0;this.contacts=0;this.blockedContacts=0;this.guardBreaks=0;this.nominalDamage=0;this.nominalUnit='hp/hit';this.previous=0;this.phase='ready';this.remoteDetonations=0;
    this.warningTimes={denied:-Infinity,drained:-Infinity};
    this.meleeEvents=[];
    this.burstPayload=null;this.denied=false;this.drained=false;
    this.splitChildren=0;this.liveSplitChildren=0;this.splitPayload=null;this.splitShots.clear();
    this.interceptions=[];this.testShots=[];this.testEmitted=0;
    if(mode==='melee')resetMelee(this);else if(this.naniteEncounter)this.resetNanite();else this.place();
  }
  resetNanite(){
    const {game:g,fighter:f,target:t}=this;
    g.melee??=new MeleeSystem(g);
    Object.assign(g,{coneFoe:Game.prototype.coneFoe,onBlockedStrike:Game.prototype.onBlockedStrike,
      trail:silent,heroYell:silent,afterimage:silent,onSlam:Game.prototype.onSlam});
    this.incoming=new Fighter(ROSTER.find(d=>d.id==='kano'),{team:2,rimK:.14});
    this.scene.add(this.incoming.obj);this.incoming._game=g;
    const ground=this.shooterMotion.startsWith('ground-'),height=ground?0:80;
    for(const actor of [f,t,this.incoming]){
      Object.assign(actor,{_openSky:true,flying:!ground,gait:ground?GAIT.GROUNDED:GAIT.AIRBORNE,_flyPose:ground?0:1,
        _chaseKb:true,invuln:0,noRespawn:true,ai:null,hasAimWorld:true});
      actor.vel.set(0,0,0);actor.animT=0;actor.parts.groundRig.visible=false;
    }
    f.pos.set(0,height,0);t.pos.set(0,height+Math.sin(this.elevation*Math.PI/180)*this.distance,this.distance);
    this.incoming.pos.set(this.naniteSample==='punch'?0:12,height,this.naniteSample==='punch'?4.8:4);
    g.entities=[f,t,this.incoming];g.player=f;
    // The outgoing autohealed measurement dummy is never an incoming source.
    // Preserve Game's genuine-hostile predicate for this native contact pattern.
    g.isFoe=(a,b)=>this.naniteEncounter?Game.prototype.isFoe.call(g,a,b):a!==b&&b.alive&&a.team!==b.team;
    const forms=[this.slot,this.secondarySlot].map(key=>naniteSource(f.slots[key]?.def)?.naniteForm);
    if(!forms.includes(this.naniteSample==='punch'?'shield':this.naniteSample))this.naniteSample=forms.includes('shield')?'shield':'cannon';
    this.naniteEvents=[];this.naniteTotals.clear();this.naniteLaunches=[];this.outgoingDamage=0;this.outgoingContacts=0;this.naniteEnded=false;
    this.aimNanite();
  }
  aimNanite(){
    const {fighter:f,target:t,incoming:a}=this;
    t.center(f.aimWorld);f.aim3.copy(f.aimWorld).sub(f.center(new THREE.Vector3())).normalize();f.faceDir(t.pos.x-f.pos.x,t.pos.z-f.pos.z);
    for(const actor of [t,a]){f.center(actor.aimWorld);actor.aim3.copy(actor.aimWorld).sub(actor.center(new THREE.Vector3())).normalize();actor.faceDir(f.pos.x-actor.pos.x,f.pos.z-actor.pos.z);}
  }
  naniteHit(target,amount,opts,blocked){
    if(target!==this.fighter&&target!==this.target)return;
    const incoming=target===this.fighter,contact=incoming?opts.naniteContact:null,result=incoming?opts.naniteResult:null;
    if(incoming){this.contacts++;this.damage+=amount;}else{this.outgoingContacts++;this.outgoingDamage+=amount;target.hp=target.maxHp;}
    if(contact&&result){const totals=this.naniteTotals.get(contact.slot)||{absorbed:0,bodyDamage:0};totals.absorbed+=result.absorbed;totals.bodyDamage+=amount;this.naniteTotals.set(contact.slot,totals);}
    this.naniteEvents.push({time:this.game.time,attacker:opts.src===this.fighter?'owner':'incoming',target:incoming?'owner':'measurement',
      ...(contact&&result?{slot:contact.slot,cell:contact.cell}:{}),kind:opts.meleeMove?'punch':opts.dot?'sustained':opts.splash?'splash':'projectile',absorbed:result?.absorbed||0,bodyDamage:amount,blocked:!!blocked});
    if(this.naniteEvents.length>64)this.naniteEvents.shift();
  }
  naniteStats(){
    const f=this.fighter;
    return {hp:f?.hp??0,maxHp:f?.maxHp??0,ki:f?.ki??0,maxKi:f?.maxKi??0,alive:!!f?.alive,contacts:this.contacts,bodyDamage:this.damage,
      outgoingDamage:this.outgoingDamage||0,outgoingContacts:this.outgoingContacts||0,emitted:this.testEmitted,launches:this.naniteLaunches.length,
      incomingStatus:this.incoming?.alive?'ready':'unavailable-ko',
      events:this.naniteEvents.map(e=>({...e})),modules:[...(f?._nanites?.modules.values()||[])].map(m=>{
        const st=f.slots[m.slot],totals=this.naniteTotals.get(m.slot),view=f.parts.nanites.get(m.slot),damaged=m.cells.filter(c=>c.hp<m.config.naniteCellHp);
        const repairing=damaged.some(c=>c.reformT>0),quiet=damaged.some(c=>c.quietT<m.config.naniteRepairDelay);
        const phase=!f.alive?'ko':m.retired?'retired':!slotUnlocked(f,m.slot)?'locked':!m.deployed?'retracted':
          m.assemblyT<m.config.naniteAssemblyTime?'assembling':st?._naniteDenied||
          (quiet?'quiet':repairing?'reforming':st?.charging?'charging':st?.active?.pendingLaunch?'aligning':damaged.length?'damaged':'ready');
        return {slot:m.slot,form:m.config.naniteForm,attachment:m.config.naniteAttachment,phase,intactCells:m.cells.filter(c=>!c.broken).length,totalCells:m.cells.length,
          absorbed:totals?.absorbed||0,bodyDamage:totals?.bodyDamage||0,muzzleError:this.naniteLaunches.findLast(s=>s.slot===m.slot)?.error??null,
          liveFragments:view?.fragments.count||0,deployed:m.deployed,guarding:!!f.guarding,assemblyT:m.assemblyT,
          cells:m.cells.map(c=>({hp:c.hp,quietT:c.quietT,reformT:c.reformT,broken:c.broken}))};})};
  }
  emitNaniteIncoming(){
    // The precision fixture may be killed by genuine authored splash. It cannot
    // create a new attack after KO; already committed projectiles keep flying.
    if(!this.incoming?.alive)return;
    const f=this.fighter,form=this.naniteSample,slot=[this.slot,this.secondarySlot].find(key=>naniteSource(f.slots[key]?.def)?.naniteForm===form);
    const cells=snapshotNaniteCells(f).filter(c=>c.slot===slot);if(!cells.length)return;
    const cell=cells.find(c=>c.cell===(form==='shield'?4:0))||cells[0];
    const point=new THREE.Vector3(0,0,.5).applyMatrix4(cell.matrix),normal=new THREE.Vector3(0,0,1).transformDirection(cell.matrix);
    // Precision inspection fixture: finite travel from the current final cell,
    // never a reducer call or a past-pose target. Motion/recoil can cause a miss.
    const pos=point.clone().addScaledVector(normal,2);
    this.incoming.pos.copy(pos).y-=5.2;this.incoming._sync();
    const shot=this.game.projectiles.spawnProjectile(this.incoming,{pos,vel:normal.multiplyScalar(-30),damage:30,radius:.035,life:2,
      ballistic:true,bullet:true,ground:false,color:'#ffd97a',weapon:'rifle'});
    this.testShots.push(shot);this.testEmitted++;
  }
  stepNanite(time,dt,poseDt){
    const {fighter:f,target:t,incoming:a,game:g}=this;g.time=time;g.dt=dt;
    const actors=[f,t,a],positive=Number.isFinite(dt)&&dt>0&&!this.naniteEnded&&time<=8;
    if(positive){
      const crossed=at=>this.previous<at&&time>=at;
      this.aimNanite();g.melee.guard(f,f.alive&&time>=2&&time<3.9);
      if(f.alive){
        const busy=f.guarding||f.strikeActive>0||f.grabState||f.grabbing||f.meleeCharge>0||f.staggerT>0;
        for(const slot of [this.slot,this.secondarySlot].filter(Boolean)){
          const cannon=naniteSource(f.slots[slot].def).naniteForm==='cannon';
          const pressed=cannon?crossed(.8)||crossed(4.2):crossed(6)||crossed(6.3);
          const held=cannon&&(time>=.8&&time<1.5||time>=4.2&&time<5),released=cannon&&(crossed(1.5)||crossed(5));
          runSlot(f,slot,{pressed:!busy&&pressed,held:!busy&&held,released,dt},g);
        }
        if(this.naniteSample==='punch'&&a.alive){
          if(crossed(2.35))g.melee.chargeStart(a);
          if(crossed(2.4)){g.melee.chargeRelease(a);this.testEmitted++;}
        }
      }
      // The existing movement choices supply intent; native physics owns roots.
      // There is no analytic place() plus second integration in this branch.
      const travel=this.naniteSample!=='punch'&&this.shooterMotion!=='hover',forward=this.shooterMotion.endsWith('forward'),side=this.shooterMotion.endsWith('left')?-1:1;
      const direction=Math.cos(time*Math.PI/4);
      f.move({x:travel&&!forward?side*direction:0,y:0,z:travel&&forward?direction:0},dt);
      const moving=this.naniteSample!=='punch'&&time>=2&&time<6,s=this.motion.endsWith('left')?-1:1,angle=Math.max(0,time-2)*this.targetSpeed/this.distance;
      const speed=this.targetSpeed/Math.max(1,t.def.speed||20);
      t.move({x:moving&&this.motion.startsWith('orbit-')?s*Math.cos(angle)*speed:0,y:0,z:moving?(this.motion.startsWith('pass-')?-speed:this.motion.startsWith('orbit-')?-Math.sin(angle)*speed:0):0},dt);
      a.move({x:0,y:0,z:0},dt);
      g.melee.beginContactFrame();g.beginBodyContactFrame();for(const actor of actors)actor.update(dt,g);g.resolveBodies();g.melee.endContactFrame();
      if(f.alive&&this.naniteSample!=='punch'&&crossed(2.4))this.emitNaniteIncoming();
      // Observe the actual native launch commitment without replacing its solve.
      const pending=g.projectiles.list.filter(p=>p.caster===f&&p._powerOrigin?.naniteForm==='cannon').map(p=>{
        const source=p._powerOrigin,emitter=naniteEmitter(f,source.slot,source.epoch),aperture=emitter?.socket.getWorldPosition(new THREE.Vector3());
        const direction=aperture&&p._launchTarget?p._launchTarget.clone().sub(aperture).normalize():p.vel.clone().normalize();
        return {p,slot:source.slot,expected:aperture?.addScaledVector(direction,p.radius)};});
      g.projectiles.update(dt,g);
      for(const shot of pending)if(shot.expected&&shot.p._launchResolved&&shot.p.launchOrigin){
        this.naniteLaunches.push({slot:shot.slot,time,error:shot.p.launchOrigin.distanceTo(shot.expected)});
      }
      g.particles.update(dt);g.vfx.update(dt);
      for(const actor of actors)presentNanites(actor);
      this.previous=time;
    }else for(const actor of actors){
      // Match native KO presentation without advancing its physics or clocks.
      // Living animation would restore pivots owned by the ragdoll instead.
      if(actor.state==='ko'&&actor.ragdoll)actor.ragdoll.apply(actor);
      else actor._animate(poseDt);
      actor._sync();
    }
    if(time>=8&&!this.naniteEnded){this.naniteEnded=true;this.clearTransientEffects('inspection-ended');g.melee.guard(f,false);for(const actor of actors)g.melee.clearInput(actor);}
    this.phase=!f.alive?'ko':this.naniteEnded?'inspection-ended':this.naniteStats().modules.map(m=>`${m.slot}-${m.phase}`).join(' / ');
  }
  interceptionStats(){
    const live=this.game.projectiles.list.filter(p=>!p.dead),beam=live.find(p=>p.caster===this.fighter&&'investedKi' in p);
    return {events:this.interceptions.length,retired:this.interceptions.reduce((sum,e)=>sum+e.retired,0),
      own:live.filter(p=>p.caster===this.fighter).length,opposing:live.filter(p=>p.caster===this.target).length,
      beamActive:!!beam,investedKi:beam?.investedKi??0,threshold:beam?.interceptKi??0};
  }
  opposingFire(time,launchAt){
    if(this.mode!=='attack'||this.pattern==='target'||this.resourceEncounter)return;
    const bullets=this.pattern==='bullets',start=bullets?launchAt+.12:launchAt;
    const count=bullets?Math.min(8,Math.max(0,Math.floor((time-start+1e-8)/.22)+1)):time+1e-8>=start?1:0;
    while(this.testEmitted<count){
      const t=this.target,f=this.fighter;t.state='cast';t.stateT=0;t.punchPose=1;t._castPoseRanged=true;
      // Real production shots aimed at the emitting hand. This is a labeled
      // test pattern, not an AI opponent or a second damage implementation.
      const pos=t.muzzle(new THREE.Vector3()),destination=f.muzzle(new THREE.Vector3());
      const vel=destination.sub(pos).normalize().multiplyScalar(bullets?150:90);
      const shot=this.game.projectiles.spawnProjectile(t,{pos,vel,damage:8,blast:bullets?0:3,radius:bullets?.35:1.4,
        color:bullets?'#ffd97a':'#ff783b',bullet:bullets,ballistic:bullets,weapon:bullets?'rifle':undefined,
        collisionPriority:bullets?-1:this.opposingPriority,life:3});
      this.testShots.push(shot);this.testEmitted++;
    }
  }
  resourceDesignation(time){
    const c=this.resourceSlots.map(key=>this.resourceObjects.get(key)).find(c=>c?.kind==='tank'&&!c.dead);
    if(!c)return;
    // A shared primary-player cursor designation, just like native play. The
    // empty-stage inspection sends it laterally, then holds its actual safe pose.
    if(time<1)this.game.aimPoint.copy(c.pos);
    else if(time<3){this.tankDestination??=c.pos.clone().add(new THREE.Vector3(-24,0,0));this.game.aimPoint.copy(this.tankDestination);}
    else{this.tankHold??=c.pos.clone();this.game.aimPoint.copy(this.tankHold);}
  }
  resourceIncoming(){
    // One real ballistic attempt per selected live receiver. It starts outside
    // the recorded proxy and enters its side; moving tanks are not fixed props.
    for(const key of this.resourceSlots){
      const c=this.resourceObjects.get(key),b=c?._cover;if(!b||c.dead)continue;
      const pos=new THREE.Vector3(b.x-b.hx-6,(b.bottom+b.top)*.5,b.z);
      const shot=this.game.projectiles.spawnProjectile(this.target,{pos,vel:new THREE.Vector3(90,0,0),damage:10,radius:.2,
        ballistic:true,bullet:true,weapon:'rifle',ground:false,color:'#ffd97a',life:2});
      this.testShots.push(shot);this.testEmitted++;
    }
  }
  place(time=0) {
    if(!this.target||!this.fighter)return;
    const f=this.fighter,t=this.target;
    const constructStage=[this.slot,this.secondarySlot].some(slot=>f.slots[slot]?.def.type==='construct');
    const a=constructStage?0:this.elevation*Math.PI/180;
    if(constructStage){f.pos.y=0;f.flying=false;f.gait=GAIT.GROUNDED;f._flyPose=0;f.isPlayer=true;}
    const shooterMotion=this.reloadEncounter&&!this.shooterMotion.startsWith('ground-')?'ground-hold':this.shooterMotion;
    const ground=shooterMotion.startsWith('ground-'),travel=ground||shooterMotion.startsWith('air-');
    f.crouching=shooterMotion==='ground-crouch-forward';
    f.prone=shooterMotion.startsWith('ground-prone-');
    if(travel){
      // A bounded inspection path feeds the actual Fighter gait and aim solve.
      // This fixture owns position; live gameplay physics is never overridden.
      const forward=shooterMotion.endsWith('forward'),side=shooterMotion.endsWith('left')?-1:1;
      const amplitude=shooterMotion.endsWith('hold')?0:f.prone?4:forward?Math.min(18,this.distance*.35):18,rate=Math.PI/4;
      const offset=Math.sin(time*rate)*amplitude,speed=Math.cos(time*rate)*amplitude*rate;
      f.pos.set(forward?0:side*offset,ground?0:80,forward?offset:0);
      f.vel.set(forward?0:side*speed,0,forward?speed:0);
      f.flying=!ground;f.gait=ground?GAIT.GROUNDED:GAIT.AIRBORNE;f._flyPose=ground?0:1;
    }
    const side=this.motion.endsWith('left')?-1:1;
    const elapsed=Math.max(0,Math.min(4,time-2)),moving=time>=2&&time<6;
    let x=0,z=this.distance,vx=0,vz=0;
    if(this.motion.startsWith('pass-')) {
      x=3*side;z=Math.max(-this.distance,this.distance-this.targetSpeed*elapsed);
      if(moving&&z>-this.distance)vz=-this.targetSpeed;
    } else if(this.motion.startsWith('orbit-')) {
      const angle=elapsed*this.targetSpeed/this.distance;
      x=side*Math.sin(angle)*this.distance;z=Math.cos(angle)*this.distance;
      if(moving){vx=side*Math.cos(angle)*this.targetSpeed;vz=-Math.sin(angle)*this.targetSpeed;}
    }
    // Moving-shooter review anchors the encounter and target height. Hover keeps
    // its original relative, tilted target path. This is an inspection fixture,
    // not permission for a flight-tier-zero character to fly in gameplay.
    if(!this.pressureEncounter||time===0)t.pos.set((travel?0:f.pos.x)+x,travel?(ground?0:80)+Math.sin(a)*this.distance:f.pos.y+Math.sin(a)*z,(travel?0:f.pos.z)+Math.cos(a)*z);
    if(this.pressureEncounter){
      f.pos.set(0,0,0);f.vel.set(0,0,0);f.flying=false;f.gait=GAIT.GROUNDED;f._flyPose=0;
      if(time===0){t.pos.set(0,0,this.distance);t.vel.set(0,0,0);}
      t.flying=false;t.gait=t.pos.y>.1?GAIT.AIRBORNE:GAIT.GROUNDED;t._flyPose=0;
    }
    if(constructStage){
      // Constructs are currently ground-anchored production abilities, not aerial props.
      f.pos.y=0;f.flying=false;f.gait=GAIT.GROUNDED;f._flyPose=0;
      t.pos.y=0;t.flying=false;t.gait=GAIT.GROUNDED;t._flyPose=0;
      this.game.aimPoint.copy(t.pos);this.game.player=f;
    }
    this.pathVelocity.set(vx,travel||constructStage?0:Math.sin(a)*vz,Math.cos(a)*vz);
    f.hasAimWorld=true;f.aimWorld.copy(t.pos).y+=5.2;
    f.aim3.copy(t.pos).sub(f.pos).normalize();
    f.aim.set(t.pos.x-f.pos.x,0,t.pos.z-f.pos.z).normalize();f.facing=Math.atan2(f.aim.x,f.aim.z);
    t.facing=f.facing+Math.PI;t.aim.copy(f.aim).negate();t.aim3.copy(f.aim3).negate();
  }
  stepSecondary(time,dt){
    const key=this.secondarySlot,st=this.fighter?.slots[key];
    if(!st||key===this.slot||dt<=0)return;
    const def=st.def,crossed=at=>this.secondaryPrevious<at&&time>=at;
    let held=false,released=false;
    if(def.type==='beam'){
      const release=this.mode==='beam'?Math.min(this.chargeHold,Math.max(.2,def.maxCharge||this.chargeHold)):
        .6+Math.min(this.chargeHold,Math.max(.2,def.maxCharge||this.chargeHold));
      released=crossed(4.6)||(st.charging&&crossed(release));held=time>=.6&&time<4.6&&!released;
    }else if(def.type==='charge'){
      released=crossed(.6+this.chargeHold);held=time>=.6&&time<.6+this.chargeHold;
    }else if(def.type==='volley'||def.type==='rifle'){held=time>=.6&&time<2.2;released=crossed(2.2);}
    // Co-fire is one ordinary trigger hold/release, not a second remote-
    // detonation script. Costs, cooldowns, unlocks and damage stay production.
    this._steppingSlot=key;
    const dismiss=!!resourcePolicy(def)&&!!st.active&&!st.active.dead&&crossed(6);
    try{runSlot(this.fighter,key,{pressed:crossed(.6)||dismiss,held,released,dt},this.game);}
    finally{this._steppingSlot=null;}
    this.secondaryPrevious=time;
  }
  step(time,dt,poseDt=dt) {
    if(this.mode==='melee'){stepMelee(this,time,dt);return;}
    if(this.naniteEncounter){this.stepNanite(time,dt,poseDt);return;}
    const f=this.fighter,t=this.target,g=this.game;
    const resource=this.resourceEncounter,incoming=resource&&dt>0&&this.previous<2.5&&time>=2.5;
    g.time=time;g.dt=dt;this.place(time);
    const guardTest=this.targetDefense==='guard'&&this.pattern==='target'&&!resource;
    if(this.pressureEncounter&&dt>0){
      // A commanded advance, not an authored trajectory: production acceleration,
      // friction, gravity and beam impulses own the defender's actual position.
      (g.melee??=new MeleeSystem(g)).guard(t,guardTest);
      const dx=f.pos.x-t.pos.x,dz=f.pos.z-t.pos.z,range=Math.hypot(dx,dz),moving=time>=2&&time<6&&range>12;
      // Native ground stop-friction defeats sub-walk wishes; this fixture uses
      // a 20u/s minimum request, bounded by the selected defender's own speed.
      t.move({x:moving?dx/range:0,z:moving?dz/range:0},dt,Math.min(1,Math.max(20,this.targetSpeed)/(t.speed*1.08)));
      t.update(dt,g);
      t.center(f.aimWorld);f.aim3.copy(f.aimWorld).sub(f.center(new THREE.Vector3())).normalize();
    }else if(guardTest&&dt>0){
      // Actual guard admission, break recovery and regeneration. Position is
      // still owned by the selected rehearsal path, not a knockback benchmark.
      (g.melee??=new MeleeSystem(g)).guard(t,true);
      t.vel.copy(this.pathVelocity);t.update(dt,g);
    }
    updateFirearmReload(f,dt,g);
    if(this.reloadEncounter&&dt>0){
      if(this.previous<.6&&time>=.6){
        // Explicit inspection setup: half-used magazine, native reload clock.
        const a=firearmAmmo(f.slots[this.slot]);a.loaded=Math.floor(a.capacity/2);requestReload(f,this.slot,g);
      }
      const r=f._firearmReload;
      this.phase=time<.6?'ready':r?['reload-reach','reload-eject','reload-insert','reload-chamber'][r.phase]:'reload-complete';
      this.previous=time;
    }
    if(this.slot&&dt>0&&!this.reloadEncounter){
      for(const state of Object.values(f.slots))if(state.cd>0)state.cd=Math.max(0,state.cd-dt);
      const crossed=at=>this.previous<at&&time>=at;
      const st=f.slots[this.slot],def=st.def;
      // A charge projectile is launched by the scripted release edge. Charged
      // beams, by contrast, also self-release at their authored maximum.
      const launchDelay=usesThrowAction(f,def)?def.throwWindup??.38:def.type==='charge'?this.chargeHold:
        def.type==='beam'&&def.charge?Math.min(this.chargeHold,def.maxCharge||1.6):0;
      const launchAt=.6+launchDelay;
      const detonateAt=launchAt+.18,remoteInput=this.mode==='attack'&&this.pattern==='target'&&def.remoteDetonate;
      const splitInput=remoteInput&&Number.isInteger(def.splitCount)&&def.splitCount>=2;
      let pressed=crossed(.6),held=false,released=false;
      if(this.mode==='beam'){
        // Backwards-compatible Beam sequence: `chargeHold` historically named
        // the absolute release point (1.8s by default), not a duration from .6s.
        const chargeRelease=Math.min(this.chargeHold,Math.max(.2,def.maxCharge||this.chargeHold));
        released=crossed(4.6)||(st.charging&&crossed(chargeRelease));
        held=time>=.6&&time<4.6&&!released;
      }else if(def.type==='beam'){
        const chargeRelease=.6+Math.min(this.chargeHold,Math.max(.2,def.maxCharge||this.chargeHold));
        released=crossed(4.6)||(st.charging&&crossed(chargeRelease));
        held=time>=.6&&time<4.6&&!released;
      }else if(def.type==='volley'||def.type==='rifle'){
        held=time>=.6&&time<2.2;released=crossed(2.2);
      }else if(def.type==='charge'){
        const releaseAt=.6+this.chargeHold;
        held=time>=.6&&time<releaseAt;released=crossed(releaseAt);
      }else if(def.type==='construct'){
        if(resourcePolicy(def))pressed=pressed||(!!st.active&&!st.active.dead&&crossed(6));
        else{pressed=pressed||(!def.holdTrigger&&crossed(.7+(def.cd||0)));released=!!def.holdTrigger&&crossed(2.4);}
      }
      const secondPress=remoteInput&&crossed(detonateAt);
      pressed=pressed||secondPress;
      const armed=secondPress?remoteAttack(f,st):null;
      const armedPayload=armed?(armed.detonateDamage??((armed.damage??0)*.8)):null;
      const beforeActivation=secondPress?new Set(g.projectiles.list):null;
      runSlot(f,this.slot,{pressed,held,released,dt},g);
      this.opposingFire(time,launchAt);
      if(armed&&armed.dead&&!remoteAttack(f,st)){
        this.remoteDetonations++;
        const children=splitInput?g.projectiles.list.filter(shot=>!beforeActivation.has(shot)&&!shot.dead):[];
        if(children.length){
          this.splitChildren=children.length;this.liveSplitChildren=children.length;
          this.splitPayload=children[0].damage??0;this.splitShots=new Set(children);
        }else this.burstPayload=armedPayload;
      }
      if(def.type==='beam'){this.nominalDamage=def.dps||60;this.nominalUnit='hp/s';}
      else if(def.type==='projectile'){this.nominalDamage=def.damage||14;this.nominalUnit='hp/hit';}
      else if(def.type==='volley'){this.nominalDamage=def.damage||6;this.nominalUnit='hp/hit';}
      else if(def.type==='rifle'){this.nominalDamage=def.damage||5;this.nominalUnit='hp/hit';}
      else if(def.type==='melee'){this.nominalDamage=def.damage||20;this.nominalUnit='hp/hit';}
      else if(def.type==='charge'){
        const ratio=Math.max(0,Math.min(1,this.chargeHold/(def.maxCharge||2.2)));
        this.nominalDamage=(def.dmgMin||20)+ratio*((def.dmgMax||70)-(def.dmgMin||20));
        this.nominalUnit='hp/hit';
      }
      this.liveSplitChildren=[...this.splitShots].filter(shot=>!shot.dead).length;
      if(this.splitChildren){this.nominalDamage=this.splitPayload??0;this.nominalUnit='hp/child';}
      else if(remoteInput&&this.remoteDetonations){this.nominalDamage=this.burstPayload??0;this.nominalUnit='hp/burst';}
      this.phase=this.denied?'resource-denied':this.drained?'resource-drained':this.splitChildren?
        (this.contacts?'split-contact':this.liveSplitChildren?'split-children':'split-expired'):
        time<.6?'ready':remoteInput?(time<launchAt?(st.charging?'charging':'launching'):time<detonateAt?'armed':this.remoteDetonations?'detonated':'expired'):
        def.type==='charge'?(st.charging?'charging':time<6?'in flight':'recovered'):(def.type==='volley'||def.type==='rifle')?(time<2.2?'repeating':'recovered'):def.type==='beam'?(st.active?'firing':'recovered'):time<6?'in flight':'recovered';
      if(def.type==='construct'&&!this.denied&&!this.drained)this.phase=time<.6?'ready':!st.active||st.active.dead?'dissolved':time<.6+(f.def.effects?.construct?.assemblyTime??.65)?'assembling':st.active.state==='idle'?'construct-active':st.active.state;
      if(def.type==='beam'&&st.charging&&!this.denied&&!this.drained)this.phase='charging';
      if(def.type==='melee'&&!this.denied&&!this.drained)this.phase=time<.6?'ready':st.t>0?'striking':f._abilityMeleePose?'recovering':'recovered';
      this.previous=time;
    }
    if(!this.reloadEncounter)this.stepSecondary(time,dt);
    if(resource){
      for(const key of this.resourceSlots){const c=f.slots[key].active;if(c&&!c.dead)this.resourceObjects.set(key,c);}
      if(dt>0&&f.alive&&f.frozenT<=0)f.regenerateKi(dt);
      this.resourceDesignation(time);
      if(incoming)this.resourceIncoming();
    }
    if(dt>0&&f.alive)advanceNanites(f._nanites,dt,new Set(Object.keys(f.slots).filter(key=>slotUnlocked(f,key))));
    f.advanceActionPose(dt);if(!guardTest&&!this.pressureEncounter)t.advanceActionPose(dt);
    f.animT=time;f._animate(poseDt);f.obj.updateMatrixWorld(true);
    if(dt>0){
      // Resource rehearsals follow the native budget/contact boundary. Legacy
      // timed/other previews keep their original construct-first order.
      if(resource){settleConstructUpkeep(g,dt);g.projectiles.update(dt,g);}
      for(let i=g.constructs.length-1;i>=0;i--)if(!g.constructs[i].update(dt,g))g.constructs.splice(i,1);
      if(!resource)g.projectiles.update(dt,g);g.particles.update(dt);g.vfx.update(dt);
      t.hitFlash=Math.max(0,t.hitFlash-dt*4);
    }
    if(this.mode==='attack'&&this.pattern!=='target'&&!this.reloadEncounter&&!resource&&!this.denied&&!this.drained){
      const s=this.interceptionStats();
      this.phase=!this.testEmitted?'awaiting-fire':s.own||s.opposing?'opposing-fire':s.events?'intercepted':'resolved';
    }
    const preparing=f.slots[this.slot]?.active;
    if(f._throwAction)this.phase=f._throwAction.released?'throw-recovery':'throw-windup';
    if(!this.denied&&!this.drained&&preparing?.pendingLaunch)this.phase=preparing.dead?'recovered':'aligning';
    if(f.slots[this.slot]?._handsBusy)this.phase='hands-occupied';
    else if(f.slots[this.slot]?._handsRetry)this.phase='release-to-retry';
    if(this.slot&&!slotUnlocked(f,this.slot)&&!remoteAttack(f,f.slots[this.slot]))this.phase=`locked-level-${unlockLevel(f.def,this.slot)}`;
    if(this.secondarySlot&&f.slots[this.secondarySlot]?._handsBusy)this.phase+=` / ${this.secondarySlot}-hands-occupied`;
    else if(this.secondarySlot&&f.slots[this.secondarySlot]?._handsRetry)this.phase+=` / ${this.secondarySlot}-release-to-retry`;
    else if(this.secondarySlot&&this.secondaryFeedback)this.phase+=` / ${this.secondarySlot}-${this.secondaryFeedback}`;
    else if(this.secondarySlot&&f.slots[this.secondarySlot]?.active?.pendingLaunch&&!f.slots[this.secondarySlot].active.dead)this.phase+=` / ${this.secondarySlot}-aligning`;
    // The target follows the chosen path, not hit knockback; its actual flight/impact
    // poses remain visible. Seek recreates both actors so no spring state leaks backward.
    if(!this.pressureEncounter)t.vel.copy(this.pathVelocity);
    t.animT=time;t._animate(guardTest||this.pressureEncounter?0:poseDt);t.obj.updateMatrixWorld(true);
    // Anchored power rehearsals still use the production physical fist after
    // both driven bodies are posed. They do not substitute a range-cone hit.
    if(dt>0&&f._abilityMeleePose?.physicalContact)(g.melee??=new MeleeSystem(g)).resolveContact(f);
    // Eight seconds ends this inspection transport, not native construct life
    // or cannon ordnance. A paused endpoint must be as empty as autoplay reset,
    // while the retained resource objects keep the measured contact totals.
    if(resource&&time>=8)this.clearTransientEffects('inspection-ended');
  }
  clearTransientEffects(reason) {
    if(this.fighter)clearSlotFx(this.fighter);
    const g=this.game;
    for(const construct of g.constructs)construct._dispose(g,reason);g.constructs.length=0;
    for(const p of g.projectiles.list)p._dispose(g);
    g.projectiles.list.length=0;
    for(const fx of g.vfx.fx)fx.dispose();g.vfx.fx.length=0;
    g.particles.n=0;g.particles.geo.setDrawRange(0,0);
  }
  clear() {
    this.clearTransientEffects();
    if(this.incoming){clearSlotFx(this.incoming);this.scene.remove(this.incoming.obj);this.incoming.dispose();this.incoming=null;}
    if(this.target){this.scene.remove(this.target.obj);this.target.dispose();this.target=null;}
    this.game.entities=[];this.fighter=null;
    this.resourceObjects.clear();this.tankHold=null;this.tankDestination=null;
  }
  dispose() {
    this.clear();const {particles:p,vfx:v}=this.game;
    this.scene.remove(p.points,...v._lights);p.geo.dispose();p.mat.dispose();
    v._sphere.dispose();v._ring.dispose();v._decalGeo.dispose();
  }
}
