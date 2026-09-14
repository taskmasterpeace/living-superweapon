import {canReceiveShot} from './shot-contact-eligibility.js';
import {fieldMotion,updateFieldProjectile,advanceFieldPacket} from './field-motion.js';
import {BeamGroundContact} from './beam-ground-contact.js';
// WAR WORLD: ASCENDANTS — projectiles, beam-hoses (wave cannon), and spirit-bomb lobs.
import { domeBlocks } from './systems2.js';
import {hasCivilians} from '../data/modes.js';
import {resolveThrowRelease} from './throwable-action.js';
import { BUILD_LOOK, TEMPER_LOOK } from '../data/visual.js';
import {createBeamMaterials,createBeamSourceMaterial} from './beam-surface.js';
import { BeamCurve } from './beam-curve.js';
import { beamPathsTouch, pinBeamContact } from './beam-contact.js';
import {beamBodyContact} from './beam-body-contact.js';
import { queueHitReaction } from './hit-reaction.js';
import {handEmissionPosition,palmCastSide} from './hand-emission.js';
import {firearmEmitter} from './weapon-emission.js';
import {bowEmitter} from './bow-pose.js';
import {powerEmissionPosition} from './power-emission.js';
import {naniteEmitter,hasNaniteCells,validNaniteContact} from './nanite-forearms.js';
import {withNaniteDamageAdmission} from './damage-admission.js';
import {naniteUseReason} from './nanite-pose.js';
import { remoteInterrupted } from './remote-control.js';
import {AXIAL_COFIRE_CONE} from './aim-limits.js';
import { sweepSplitObstacle, coverBoxEntry, terrainEntry } from './projectile-contact.js';
import { earliestOrdinaryContact, sweptPairTime, sweptBeamTime, priorityEnabled } from './attack-interception.js';
import * as THREE from 'three';
import {registerShieldContact} from './shield-surface.js';
import { clamp, lerp, rand, TAU, PW_KB } from '../core/util.js';
import {applyWebControl,canApplyWebControl} from './web-control.js';

const UP = new THREE.Vector3(0, 1, 0);
const _wind = new THREE.Vector3();
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion();

// Shared geometry + white-core material — spawning a projectile/beam must not allocate GPU buffers
// (per-spawn churn caused GC/upload hitches). Instances scale the shared unit geometry; per-instance
// materials are cloned from these prototypes only where opacity/color animates.
// ---- ballistics: a brass slug + a hot tracer streak (shared geo/mats — guns fire a LOT) ----
// The slug is bigger and the tracer longer/brighter than v1 — a matte-metal round against a dark
// city read as a near-invisible black speck (Robert's note). Now it's a pale slug pulling a
// visible warm streak, so you can actually track the shot.
const GEO_BULLET = new THREE.CylinderGeometry(0.34, 0.24, 2.0, 6); GEO_BULLET.rotateX(Math.PI / 2);
const GEO_CARD = new THREE.BoxGeometry(1.5, 2.1, 0.05);                       // a PLAYING CARD stays a playing card
const GEO_DISC = new THREE.CylinderGeometry(1.6, 1.6, 0.16, 18);              // the shield's rim
const GEO_DISC_RING = new THREE.TorusGeometry(1.02, 0.13, 6, 18);
const GEO_DISC_BOSS = new THREE.CylinderGeometry(0.5, 0.5, 0.2, 12);
const GEO_TRACER = new THREE.CylinderGeometry(0.42, 0.02, 9.0, 6); GEO_TRACER.rotateX(Math.PI / 2);
// ⚠ NOT ENERGY: a bullet is machined brass, not a spell. No emissive, no additive blending —
// bloom is reserved for ki. The slug reads as PALE metal catching the light (lighter + less
// mirror-metal than v1, so it isn't a black dot reflecting the dark sky); the tracer is a warm
// alpha streak on NORMAL blending, kept below the 0.8 bloom threshold so it never glows.
const MAT_BULLET = new THREE.MeshStandardMaterial({ color: '#e9dcbb', roughness: 0.5, metalness: 0.4 });
const MAT_TRACER = new THREE.MeshBasicMaterial({ color: '#f4d79a', transparent: true, opacity: 0.6, depthWrite: false });
// THROWN STEEL (batarangs, hurled axes): matte metal cross that SPINS — never a ball of light
const GEO_BLADE = new THREE.BoxGeometry(2.6, 0.14, 0.5);
// ⚠ high metalness with no envmap renders near-BLACK — follow MAT_BULLET's recipe (low metal, bright base)
const MAT_BLADE = new THREE.MeshStandardMaterial({ color: '#d4dde8', roughness: 0.42, metalness: 0.35 });
// CANISTERS (frag grenades, gas bombs): a drab tumbling shell with a blinking fuse, no halo
const GEO_CAN = new THREE.CylinderGeometry(0.52, 0.52, 1.35, 8);
const GEO_CAN_FUSE = new THREE.SphereGeometry(0.22, 6, 5);
const MAT_CAN = new THREE.MeshStandardMaterial({ color: '#6e7360', roughness: 0.72, metalness: 0.28 });
// arrows earn the tracer treatment too — a pale air-wake, far fainter than a hot round
const GEO_TRACER_Y = new THREE.CylinderGeometry(0.34, 0.02, 9.0, 6);
const GEO_ORB = new THREE.SphereGeometry(1, 16, 12);
const GEO_ORB_HI = new THREE.SphereGeometry(1, 20, 16);
const GEO_CYL = new THREE.CylinderGeometry(1, 1, 1, 16, 1, true);
const MAT_CORE = new THREE.MeshBasicMaterial({ color: '#ffffff' });
const MAT_GLOW_PROTO = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
function glowMat(color, opacity = 0.5) { const m = MAT_GLOW_PROTO.clone(); m.color.set(color); m.opacity = opacity; return m; }
// THE MARLETTA — a serene glowing face, painted once (canvas), billboarded on the projectile.
let _faceTex = null;
function faceTexture() {
  if (_faceTex) return _faceTex;
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 10, 128, 128, 126);
  g.addColorStop(0, 'rgba(255,240,214,0.95)'); g.addColorStop(0.55, 'rgba(255,220,170,0.35)'); g.addColorStop(1, 'rgba(255,200,140,0)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  // face — pale oval, slightly tilted
  x.save(); x.translate(128, 132); x.rotate(-0.06);
  x.fillStyle = 'rgba(255,246,232,0.92)';
  x.beginPath(); x.ellipse(0, 0, 44, 58, 0, 0, Math.PI * 2); x.fill();
  // hair sweep — soft strokes framing the face
  x.strokeStyle = 'rgba(255,224,170,0.55)'; x.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    x.lineWidth = 7 - i * 0.6; x.beginPath();
    x.moveTo(-40 + i * 3, -52 + i * 2);
    x.quadraticCurveTo(-74 - i * 5, 6 + i * 8, -34 - i * 6, 78 + i * 6); x.stroke();
    x.beginPath(); x.moveTo(38 - i * 3, -54 + i * 2);
    x.quadraticCurveTo(72 + i * 5, 4 + i * 8, 30 + i * 6, 80 + i * 6); x.stroke();
  }
  // closed eyes — two gentle downward arcs + lash hints
  x.strokeStyle = 'rgba(120,84,54,0.85)'; x.lineWidth = 3;
  x.beginPath(); x.arc(-17, -8, 10, 0.25, Math.PI - 0.25); x.stroke();
  x.beginPath(); x.arc(17, -8, 10, 0.25, Math.PI - 0.25); x.stroke();
  x.lineWidth = 2;
  x.beginPath(); x.arc(-17, -13, 13, 0.5, Math.PI - 0.5); x.stroke();   // brows
  x.beginPath(); x.arc(17, -13, 13, 0.5, Math.PI - 0.5); x.stroke();
  // nose hint + soft lips
  x.strokeStyle = 'rgba(150,104,70,0.5)'; x.beginPath(); x.moveTo(0, -2); x.lineTo(-2, 14); x.stroke();
  x.fillStyle = 'rgba(196,110,96,0.8)';
  x.beginPath(); x.ellipse(0, 28, 11, 4.5, 0, 0, Math.PI * 2); x.fill();
  x.restore();
  _faceTex = new THREE.CanvasTexture(c); return _faceTex;
}

const GEO_ARROW_SHAFT = new THREE.CylinderGeometry(0.09, 0.09, 3.0, 6);
const GEO_ARROW_HEAD = new THREE.ConeGeometry(0.24, 0.7, 6);
const GEO_ARROW_FLET = new THREE.ConeGeometry(0.3, 0.8, 4);
const MAT_ARROW_SHAFT = new THREE.MeshStandardMaterial({ color: '#8a6a3a', roughness: 0.8 });
const MAT_ARROW_FLET = new THREE.MeshStandardMaterial({ color: '#d8d2c4', roughness: 0.9 });
const _AY = new THREE.Vector3(0, 1, 0);
const _AZ = new THREE.Vector3(0, 0, 1);   // bullets are built along +Z (see GEO_BULLET)

// ---- Ki-blast / big-bang orb ----
class Projectile {
  constructor(game, caster, o) {
    this.game = game; this.caster = caster; this.team = caster.team;
    this.launchCover=o.ballistic&&o.launchCover?.frontlineVehicle?o.launchCover:null;
    this.launchCaster=this.launchCover?caster:null;
    this.pos = new THREE.Vector3().copy(o.pos);
    this.handOrigin=o.handOrigin===-1||o.handOrigin===1?o.handOrigin:null;
    this.emitterSocket=o.emitterSocket||null;
    this._emitterDef=o.emitterDef||null;
    this._powerOrigin=o.powerOrigin||null;
    this.charged=!!o.powerOrigin;
    this._launchFlash=o.launchFlash;
    this._naniteRelease=o.naniteRelease||null;
    this._launchResolved=false;
    this._launchTarget=(this.handOrigin!==null||this._powerOrigin)&&o.launchTarget?o.launchTarget.clone():null;
    this._launchSpread=Number.isFinite(o.launchSpread)?o.launchSpread:0;
    this._launchPitch=Number.isFinite(o.launchPitch)?o.launchPitch:0;
    this.vel = new THREE.Vector3().copy(o.vel);
    this.radius = o.radius || 1.4;
    this.damage = o.damage || 12;
    this.collisionPriority = Number.isInteger(o.collisionPriority) && o.collisionPriority >= 0 && o.collisionPriority <= 16 ? o.collisionPriority : -1;
    this.blast = (o.blast ?? this.radius * 2.4) * (o.blastScaled ? 1 : ((caster.sheet && caster.sheet.blastMult) || 1));   // children inherit the already-scaled parent
    this.splitCount = Number.isInteger(o.splitCount) && o.splitCount>=2 && o.splitCount<=8 ? o.splitCount : 0;
    this.splitSpread = clamp(Number.isFinite(o.splitSpread)?o.splitSpread:.55,0,1.4);
    this.splitSpeed = clamp(Number.isFinite(o.splitSpeed)?o.splitSpeed:90,20,2000);
    this.splitHoming = clamp(Number.isFinite(o.splitHoming)?o.splitHoming:3,0,100);
    this._max = o.maxSpeed;                       // explicitly capped homing children; legacy shots unchanged
    this._guidedSplit = o.guidedSplit===true;
    if(this._guidedSplit){
      this._homeDir=new THREE.Vector3();this._homeTarget=new THREE.Vector3();
      this._homeRotation=new THREE.Quaternion();this._homeStep=new THREE.Quaternion();
      this._homeEnd=new THREE.Vector3();this._obstacleContact={t:0,ground:false};
    }
    this.boomerang = !!o.boomerang; this._return = false; this._range = o.range || 55; this._flown = 0; this._rehitT = 0;
    this.power = o.power || 1;                     // scales fx / shake
    this.vis = o.vis || null;                      // the visual contract profile (Phase Zero)
    this.stick = o.stick || null;                  // {fuse} — clamps on, then goes off (brief T2.4)
    this.chain = o.chain || null;                  // {targets, range, falloff} — lightning (brief T2.5)
    this.singularity = o.singularity || null;      // {pull, r, dur} — a black hole round (brief T2.6)
    this._stuckTo = null; this._fuse = 0;
    this.grav = o.grav || 0;                       // >0 for lobs
    this.homing = o.homing || 0;
    this.life = o.life || 3;
    this.color = o.color || '#8fe3ff'; this.color2 = o.color2 || '#2b7bff';
    this.ground = o.ground !== false;              // explode on ground hit
    this.pierce = o.pierce || 0;
    this.shock = o.shock || false;                 // ground shockwave on impact
    this.trailT = 0;
    this.dead = false;

    this.arrow = !!o.arrow; this.payload = o.payload || null; this.webControl=o.webControl||null; this.blind = o.blind;
    this._webControlSourceEpoch=this.webControl?(caster._webControlEpoch||0):0;this._webControlInterrupted=false;
    this.bullet = !!o.bullet;                      // real ballistics read as METAL, not energy
    this.ballistic = !!o.ballistic; this.weapon = o.weapon || null;   // drives the armour/toughness scale
    this.dtype = o.dtype || null; this.siphon = o.siphon; this.shockDuration=o.shockDuration||0;
    this.blade = !!o.blade; this.canister = !!o.canister; this.card = !!o.card; this.disc = !!o.disc; this.pumpkin = !!o.pumpkin;
    this.bounces = o.bounces || 0;   // RICOCHET ROUNDS (manual §19): reflections left before this shot is spent
    this.face = !!o.face; this.armDelay = o.armDelay || 0; this._armed = false; this._armT = 0;
    if (this.face) {
      // THE MARLETTA: a billboarded serene face wrapped in glow — she drifts, arrives, lingers, detonates
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: faceTexture(), transparent: true, depthWrite: false }));
      spr.scale.setScalar(3.2);
      const halo = new THREE.Mesh(GEO_ORB, glowMat(this.color, 0.35)); halo.scale.setScalar(1.35);
      this.obj = new THREE.Group(); this.obj.add(halo, spr); this._faceSpr = spr;
      this._ownMats = [halo.material, spr.material];   // (face texture itself is shared)
      this.obj.scale.setScalar(this.radius);
      this.obj.position.copy(this.pos); game.scene.add(this.obj);
      this.light = game.vfx.borrowLight(this.color, 4 * this.power, this.radius * 14);
    } else if(this.webControl){
      // A web shot is a traveling knot of filament, never an energy orb or explosive shell.
      const knot=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshBasicMaterial({color:this.color,wireframe:true,transparent:true,opacity:.9}));
      const ring=new THREE.Mesh(new THREE.TorusGeometry(1.25,.09,5,14),new THREE.MeshBasicMaterial({color:this.color2,transparent:true,opacity:.72,depthWrite:false}));
      ring.rotation.x=Math.PI/2;this.obj=new THREE.Group();this.obj.add(knot,ring);this.obj.scale.setScalar(this.radius);this.obj.position.copy(this.pos);game.scene.add(this.obj);
      this._spin=this.obj;this._ownMats=[knot.material,ring.material];this._ownGeos=[knot.geometry,ring.geometry];this._throwGeometry=null;this.light=null;
    } else if (this.bullet) {
      // A BULLET, not a ball of light: a tiny brass slug with a hot tracer streak drawn BEHIND it.
      // Stretched along travel, no bloom halo — it must not read like a ki blast.
      const slug = new THREE.Mesh(GEO_BULLET, MAT_BULLET);
      const tracer = new THREE.Mesh(GEO_TRACER, MAT_TRACER);
      // THE STREAK SCALES WITH SPEED. A shotgun fires 8 short-lived pellets that spawn inside the
      // muzzle-flash bloom — a fixed 9u streak got swallowed by it. Scaling the tracer to the
      // round's speed makes every pellet leave a long motion-streak that reads as a fan clearing
      // the flash (and gives rifles a proper tracer too). Base geo is 9u long, centred on z.
      const spd = this.vel ? this.vel.length() : 150;
      const st = Math.max(0.9, Math.min(2.6, spd / 90));    // ~1.7× for a 150u pellet, ~1.9× for a 170u rifle round
      // The overhead city needs exaggerated rounds. At a third-person shoulder
      // those same meshes become forearm-thick rods. Keep the readable streak
      // length, but give open-sky heroes and clone rifles a compact cross-section.
      // Collision radius, speed, damage and shared resource ownership are untouched.
      const closeView=!!(caster._openSky||caster._frontlineClone||caster._frontlineVehicle);
      if(closeView)slug.scale.set(.18,.18,.24);
      tracer.scale.set(closeView?.16:1,closeView?.16:1,st);
      tracer.position.z = -(closeView?.25:1.2) - 4.5 * st;
      this.obj = new THREE.Group(); this.obj.add(slug, tracer);
      this.obj.position.copy(this.pos); game.scene.add(this.obj);
      this._tracer = tracer; this._ownMats = [];       // slug + tracer mats are SHARED — never dispose
      this.light = null;                           // no pooled light — tracers are cheap and many
    } else if (this.blade) {
      // THROWN STEEL — the bullet treatment for blades: a matte metal cross spinning end-over-end.
      // No bloom halo, no pooled light, and NO straight tracer (a boomerang's path curves — a
      // 9u streak behind it would lie about where it has been; the whisper trail tells the truth).
      const w1 = new THREE.Mesh(GEO_BLADE, MAT_BLADE);
      const w2 = new THREE.Mesh(GEO_BLADE, MAT_BLADE); w2.rotation.y = Math.PI / 2;
      const spin = new THREE.Group(); spin.add(w1, w2);
      this.obj = new THREE.Group(); this.obj.add(spin); this._spin = spin;
      this._ownMats = [];                              // steel is one shared material
      this.obj.scale.setScalar(Math.max(0.5, this.radius * 0.8));
      this.obj.position.copy(this.pos); game.scene.add(this.obj);
      this.light = null;
    } else if (this.card) {
      // CARD BARRAGE (brief Tier1 #3): thin white face, rose back, TUMBLING with sharp corners
      // catching the light. No halo, no pooled light — the ribbon trail does the talking.
      const face = new THREE.Mesh(GEO_CARD, new THREE.MeshStandardMaterial({ color: '#f2ede2', roughness: 0.5, metalness: 0.05 }));
      const back = new THREE.Mesh(GEO_CARD, new THREE.MeshStandardMaterial({ color: this.color, roughness: 0.5, metalness: 0.05 }));
      back.position.z = -0.028;
      const spin = new THREE.Group(); spin.add(face, back);
      this.obj = new THREE.Group(); this.obj.add(spin); this._spin = spin;
      this._ownMats = [face.material, back.material];
      this.obj.position.copy(this.pos); game.scene.add(this.obj);
      this.light = null;
    } else if (this.disc) {
      // RETURNING SHIELD (brief Tier1 #8): painted face readable while it spins — the front/back
      // alternation IS the flashing rhythm; metallic crescent trail; the catch ends the return.
      const rim = new THREE.Mesh(GEO_DISC, new THREE.MeshStandardMaterial({ color: '#c9cfd9', roughness: 0.35, metalness: 0.8 }));
      const ring = new THREE.Mesh(GEO_DISC_RING, new THREE.MeshStandardMaterial({ color: this.color2 || '#ff5a4a', roughness: 0.5, metalness: 0.3 }));
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.09;
      const boss = new THREE.Mesh(GEO_DISC_BOSS, new THREE.MeshStandardMaterial({ color: this.color2 || '#ff5a4a', roughness: 0.45, metalness: 0.4 }));
      boss.position.y = 0.1;
      const spin = new THREE.Group(); spin.add(rim, ring, boss);
      this.obj = new THREE.Group(); this.obj.add(spin); this._spin = spin;
      this._ownMats = [rim.material, ring.material, boss.material];
      this.obj.scale.setScalar(Math.max(0.6, this.radius * 0.9));
      this.obj.position.copy(this.pos); game.scene.add(this.obj);
      this.light = null;
    } else if (this.canister && o.throwMesh) {
      // Transfer the exact shell from the final hand socket. No size/model pop
      // at release; ordnance now owns its resources through impact or cleanup.
      this.obj=o.throwMesh;game.scene.attach(this.obj);this.obj.position.copy(this.pos);
      this._ownMats=[this.obj.material];this._throwGeometry=this.obj.geometry;this.light=null;
    } else if (this.canister) {
      // A GRENADE IS A SHELL, not a ki orb: drab body tumbling through the lob, blinking fuse LED
      // in the payload's colour — the one honest tell of what it will do when it lands.
      // THE PUMPKIN (brief Tier1 #4): same shell physics, but the body is a carved orange gourd —
      // a READABLE FACE whose eyes blink with the fuse, tumbling heavily, never a missile.
      const body = new THREE.Mesh(GEO_CAN, this.pumpkin ? new THREE.MeshStandardMaterial({ color: '#ff8a3d', roughness: 0.7, metalness: 0.05 }) : MAT_CAN);
      const fuse = new THREE.Mesh(GEO_CAN_FUSE, glowMat(this.pumpkin ? '#8fe08a' : this.color, 0.9)); fuse.position.y = 0.75;
      this.obj = new THREE.Group(); this.obj.add(body, fuse); this._fuse = fuse;
      this._ownMats = [fuse.material];                 // the payload-coloured fuse is per-shell
      if (this.pumpkin) {
        const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d');
        x.fillStyle = '#1a0d04';
        x.beginPath(); x.moveTo(14, 26); x.lineTo(28, 20); x.lineTo(28, 30); x.closePath(); x.fill();   // carved eye
        x.beginPath(); x.moveTo(50, 26); x.lineTo(36, 20); x.lineTo(36, 30); x.closePath(); x.fill();   // carved eye
        x.beginPath(); x.moveTo(12, 42); for (let i = 0; i <= 8; i++) x.lineTo(12 + i * 5, 42 + (i % 2 ? 8 : 0)); x.lineTo(52, 50); x.lineTo(12, 50); x.closePath(); x.fill();   // jagged grin
        const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }));
        spr.scale.setScalar(1.7); spr.position.y = 0.1;
        this.obj.add(spr); this._pface = spr;
        this._ownMats.push(body.material, spr.material);
      }
      this.obj.scale.setScalar(Math.max(0.6, this.radius * 0.7));
      this.obj.position.copy(this.pos); game.scene.add(this.obj);
      this.light = null;
    } else if (this.arrow) {
      // a REAL arrow — shaft + head + fletching, no energy glow (payload color on the head)
      const shaft = new THREE.Mesh(GEO_ARROW_SHAFT, MAT_ARROW_SHAFT);
      const head = new THREE.Mesh(GEO_ARROW_HEAD, glowMat(this.color, 0.95)); head.position.y = 1.6;
      const flet = new THREE.Mesh(GEO_ARROW_FLET, MAT_ARROW_FLET); flet.position.y = -1.3;
      // the air-wake: pale, speed-scaled, tapering off the fletching (wide end kisses the tail)
      const spd = this.vel ? this.vel.length() : 90;
      const st = Math.max(0.7, Math.min(2.2, spd / 95));
      const wake = new THREE.Mesh(GEO_TRACER_Y, new THREE.MeshBasicMaterial({ color: '#e8e2d2', transparent: true, opacity: 0.22, depthWrite: false }));
      wake.scale.set(0.6, st, 0.6); wake.position.y = -1.3 - 4.5 * st;
      this.obj = new THREE.Group(); this.obj.add(shaft, head, flet, wake);
      this._ownMats = [head.material, wake.material];  // payload head + air-wake are per-arrow
      this.obj.position.copy(this.pos); game.scene.add(this.obj);
      this.light = null;
    } else {
      const core = new THREE.Mesh(GEO_ORB, MAT_CORE);
      const glow = new THREE.Mesh(GEO_ORB, glowMat(this.color)); glow.scale.setScalar(1.7);
      this.obj = new THREE.Group(); this.obj.add(core, glow); this.obj.scale.setScalar(this.radius);
      this._ownMats = [glow.material];
      this.obj.position.copy(this.pos); game.scene.add(this.obj);
      this.light = game.vfx.borrowLight(this.color, 3 * this.power, this.radius * 10);
    }
  }

  // The Marletta has ARRIVED: she stops, hangs in the air, trembles... then goes off.
  _arm(game,hitGround=false) {
    this._armed = true; this._armedGround=hitGround; this._armT = this.armDelay;
    this.vel.set(0, 0, 0);
    game.audio.zap(880); game.audio.zap(220); game.world.shake(0.3);
    game.vfx.ring(this.pos.clone(), { color: this.color, r0: this.radius, r1: this.radius * 4, life: 0.3 });
  }

  update(dt, game, substep=false) {
    if(this.webControl&&!this._webControlInterrupted){
      const source=this.caster;
      if(!source?.alive||source._formDisposed||source._webControlEpoch!==this._webControlSourceEpoch||source.staggerT>0||source.stunT>0||source.frozenT>0||source.grabbedBy)this._webControlInterrupted=true;
    }
    if(this._guidedSplit && !substep){
      // A fast child must not jump over a body or thin wall between rendered
      // frames. The normal collision path runs at each short traveled interval.
      const steps=Math.max(1,Math.ceil(dt*120),Math.ceil(this.vel.length()*dt/2));
      for(let i=0;i<steps;i++)if(!this.update(dt/steps,game,true))return false;
      return true;
    }
    // A STUCK BOMB rides its host (brief T2.4): it conforms to the body instead of floating
    // beside it, and the fuse ACCELERATES so the blink rate is the warning.
    if (this._stuckTo) {
      const h = this._stuckTo;
      if (!h.alive) { this._stuckTo = null; return this._impact(game, false); }
      this.pos.set(h.pos.x + this._stickOff.x, h.pos.y + this._stickOff.y, h.pos.z + this._stickOff.z);
      if (this.mesh) this.mesh.position.copy(this.pos);
      this._fuse -= dt;
      const k = Math.max(0.05, this._fuse / ((this.stick && this.stick.fuse) || 1.6));
      if (this.mesh && this.mesh.children) {
        const blink = ((game.time || 0) * (3 + (1 - k) * 22)) % 1 < 0.5;
        for (const ch of this.mesh.children) if (ch.material && ch.material.emissiveIntensity !== undefined) ch.material.emissiveIntensity = blink ? 3 : 0.4;
      }
      if (this._fuse <= 0) return this._impact(game, false, h);
      return true;
    }

    if (this._armed) {
      this._armT -= dt;
      const k = 1 - Math.max(0, this._armT) / (this.armDelay || 1);
      this.obj.scale.setScalar(this.radius * (1 + k * 0.55 + Math.sin(k * 30) * 0.07));   // trembling swell
      if (this._faceSpr) this._faceSpr.material.color.setRGB(1, 1 - k * 0.45, 1 - k * 0.65);   // serene → burning
      if (this.light) this.light.intensity = 4 * this.power * (1 + k * 2.5);
      if (Math.random() < 0.6) game.particles.spawn({ x: this.pos.x + rand(-1, 1) * this.radius * 2, y: this.pos.y + rand(-1, 1) * this.radius * 2, z: this.pos.z + rand(-1, 1) * this.radius * 2, vx: 0, vy: 3, vz: 0, life: 0.3, size: 2.2, color: [this.color, '#fff'], drag: 1, shrink: true });
      if (this._armT <= 0) return this._impact(game, this._armedGround || (!game.world._ghTriangles && this.pos.y < 3));
      return true;
    }
    if (!this.prepareMotion(dt, game)) return false;
    if(this._guidedSplit){
      this._homeEnd.copy(this.pos).addScaledVector(this.vel,dt);
      if(sweepSplitObstacle(game.world,this.pos,this._homeEnd,this.radius,this._obstacleContact,this.ground)){
        this.pos.lerp(this._homeEnd,this._obstacleContact.t);
        if(this.ballistic&&this._obstacleContact.kind==='cover')this._obstacleContact.target.onConstructHit?.(this.damage*this.caster.powerBuff,{src:this.caster,pos:this.pos.clone(),lane:'projectile'});
        return this._impact(game,this._obstacleContact.ground);
      }
      // Simple guided children retain the obstacle-first native route above.
      // Only a live hostile module enrolls their remaining short interval in
      // local contacts. Special payload/return families keep their old policy.
      if(!this.stick&&!this.armDelay&&!this.boomerang&&!this.pierce&&(game.entities||[]).some(f=>game.isFoe(this.caster,f)&&hasNaniteCells(f))){
        let left=dt;const ignored=new Set();
        while(left>1e-12){
          this._homeEnd.copy(this.pos).addScaledVector(this.vel,left);
          const contact=earliestOrdinaryContact(this,this._homeEnd,left,game,ignored),elapsed=left*(contact?.t??1);
          if(elapsed>0&&!this.advancePrepared(elapsed,game))return false;
          left-=elapsed;
          // Explicit none is important: a deferred generous body cylinder must
          // not reappear through the old endpoint overlap fallback. Expiry was
          // already considered on the same finite interval by the query.
          if(!this.commitContact(game,contact||{kind:'none'}))return false;
          if(!contact)break;
          ignored.add(contact.target||contact.kind);
        }
        return true;
      }
    }
    if (!this.advancePrepared(dt, game)) return false;
    return this.commitContact(game);
  }

  resolveLaunch(game) {
    if(this.dead)return;
    // Input precedes Fighter._animate. Resolve once AFTER that final pose, before
    // any swept collision/travel. Never drag already-emitted energy with the hand.
    if((this.handOrigin!==null||this._powerOrigin)&&!this._launchResolved){
      if(this._powerOrigin?.naniteForm==='cannon'){
        const source=this._powerOrigin,emitter=naniteEmitter(this.caster,source.slot,source.epoch);
        const reason=naniteUseReason(this.caster,source.slot,this._launchTarget),at=emitter?.socket.getWorldPosition(new THREE.Vector3());
        const desired=at?(this._launchTarget?this._launchTarget.clone().sub(at):this.vel.clone()):null;
        const tooClose=this._launchTarget&&desired&&desired.length()<=this.radius;
        desired?.normalize();
        if(reason||!emitter||!desired||tooClose||emitter.axis.angleTo(desired)>Math.PI/60){
          if(this.caster.slots[source.slot])this.caster.slots[source.slot]._naniteDenied=reason||'obstructed';
          if(game.isHuman?.(this.caster))game.hud?.feed(reason==='occupied'?'Forearm occupied':reason&&reason!=='obstructed'?`Cannon ${reason}`:'Muzzle obstructed','#d9b86b');
          this._dispose(game);return;
        }
      }
      this._launchResolved=true;
      // Forms can replace a native weapon between input and the final pose.
      // Reacquire its semantic attachment rather than sampling a retired rig.
      const socket=this._emitterDef?.type==='bow'?bowEmitter(this.caster)?.socket:this._emitterDef?firearmEmitter(this.caster,this._emitterDef).socket:this.emitterSocket;
      if(this._powerOrigin){
        powerEmissionPosition(this.caster,this._powerOrigin,this.pos,this._launchTarget);
        const aperture=new THREE.Vector3(),contact={};
        powerEmissionPosition(this.caster,{...this._powerOrigin,radius:0},aperture,this._launchTarget);
        if(this._launchTarget){
          const speed=this.vel.length(),aim=this._launchTarget.clone().sub(aperture);
          if(aim.lengthSq()>1e-8)this.vel.copy(aim).setLength(speed);
          this._launchTarget=null;
        }
        // Growing radius is not permission to relocate energy through a wall.
        // The normal swept-contact step consumes a blocked launch immediately.
        if(sweepSplitObstacle(game.world,aperture,this.pos,this.radius,contact,true,this.radius))this.pos.lerpVectors(aperture,this.pos,Math.max(0,contact.t-1e-5));
      }
      else if(socket)socket.getWorldPosition(this.pos);
      else handEmissionPosition(this.caster,this.handOrigin,this.pos);
      if(this._emitterDef?.type==='bow'){
        // A held bow may extend into close cover. Resolve its launch on the
        // near side so visual reach cannot become shooting through a wall.
        const origin=this.caster.center(new THREE.Vector3()),contact={};
        if(sweepSplitObstacle(game.world,origin,this.pos,this.radius,contact,true,this.radius))
          this.pos.lerpVectors(origin,this.pos,Math.max(0,contact.t-1e-5));
      }
      if(this._launchTarget){
        const speed=this.vel.length();this._launchTarget.sub(this.pos);
        if(this._launchTarget.lengthSq()>1e-8){
          this.vel.copy(this._launchTarget).normalize().applyAxisAngle(UP,-this._launchSpread);
          this.vel.y+=this._launchPitch;this.vel.setLength(speed);
        }
        this._launchTarget=null;
      }
      this.launchOrigin=this.pos.clone();this.obj.position.copy(this.pos);
      if(this._naniteRelease){const cue=this._naniteRelease;game.audio.kiRelease(cue.sound,this.caster.pos);game.world.punch(cue.punch);game.world.shake(cue.shake);this._naniteRelease=null;}
      if(this.light)this.light.position.copy(this.pos);
      if(this._powerOrigin&&this._launchFlash)game.vfx.flash(this.pos,this._launchFlash.color,this._launchFlash.size,this._launchFlash.life);
      else if(this._launchFlash!==false)game.muzzleFlash?.(this.caster,this._launchFlash?.color||this.color,this._launchFlash?.scale??.6,undefined,this.pos);
      this.emitterSocket=null;this._emitterDef=null;this._powerOrigin=null;
    }
  }

  // A steering interval is prepared once. The manager may commit several
  // fractional advances without applying gravity, wind or homing again.
  prepareMotion(dt, game) {
    this.resolveLaunch(game);
    if(this.dead)return false;
    if(this._stuckTo){
      const h=this._stuckTo;
      this.pos.set(h.pos.x+this._stickOff.x,h.pos.y+this._stickOff.y,h.pos.z+this._stickOff.z);
      return true;
    }
    if(this._armed)return true;
    if (this.grav) this.vel.y -= this.grav * dt;
    // ⚠ WIND ACTS ON MATTER, AND THERE IS NO `if (energy)` HERE. `windKind` is a LOOKUP into
    // WIND_DRAG (data/weather.js); a projectile whose kind is not in that table — every ki blast,
    // beam and orb in the game — gets a drag of zero and is untouched. Energy is exempt BY
    // CONSTRUCTION rather than by exception, which is the difference between a rule and a list
    // somebody has to maintain. A bullet visibly curves in a crosswind; a ki blast does not.
    if (game.weather && (game.weather.windSpeed > 0.01 || game.weather.layers?.size)) {
      const k = this.windKind || (this.ballistic ? 'ballistic' : this.arrow ? 'arrow'
        : this.canister ? 'canister' : this.blade ? 'blade' : null);
      if (k) { game.weather.force(k, _wind, this.pos); this.vel.addScaledVector(_wind, dt); }
    }
    if (this.homing) {
      const t = game.nearestFoe(this.caster, this.pos, 120);
      if(t && this._guidedSplit){
        this._homeTarget.copy(t.pos).y+=5;this._homeTarget.sub(this.pos);
        const distance=this._homeTarget.length(),speed=this.vel.length();
        if(distance>1e-8 && speed>1e-8){
          this._homeTarget.multiplyScalar(1/distance);this._homeDir.copy(this.vel).multiplyScalar(1/speed);
          this._homeRotation.setFromUnitVectors(this._homeDir,this._homeTarget);
          // Terminal guidance sheds the cone's sideways momentum. A fixed
          // central force (or fixed turn radius) can orbit a stationary target.
          const response=this.homing*Math.max(1,speed/Math.max(distance,8));
          this._homeStep.identity().slerp(this._homeRotation,1-Math.exp(-response*dt));
          this.vel.copy(this._homeDir.applyQuaternion(this._homeStep)).multiplyScalar(speed);
        }
      }else if (t) { _v.copy(t.pos).setY(t.pos.y + 5).sub(this.pos).normalize().multiplyScalar(this.homing * dt * 60); this.vel.add(_v); const sp = this.vel.length(); this.vel.setLength(clamp(sp, 20, o_maxspeed(this))); }
    }
    // boomerang flight: out to range, then WHIP back to the thrower's hand (hits on both passes)
    if (this.boomerang) {
      this._flown += this.vel.length() * dt; this._rehitT -= dt;
      if (!this._return && this._flown >= this._range) this._return = true;
      if (this._return) {
        const cst = this.caster;
        if (!cst || !cst.alive) return this._impact(game, this.pos.y < 2);
        _v.set(cst.pos.x - this.pos.x, (cst.pos.y + 5.5) - this.pos.y, cst.pos.z - this.pos.z);
        const d = _v.length();
        if (d < 4) { game.vfx.flash(this.pos.clone(), this.color, 3, 0.12); game.audio.zap(700, this.pos); this._dispose(game); return false; }   // caught it
        this.vel.lerp(_v.normalize().multiplyScalar(this.vel.length() * 1.02), Math.min(1, 8 * dt));
      }
    }
    return true;
  }

  advancePrepared(dt, game) {
    if(this._armed||this._stuckTo)return this.update(dt,game,true);
    this.pos.addScaledVector(this.vel, dt);
    this.obj.position.copy(this.pos);
    if (this.light) this.light.position.copy(this.pos);
    if (this.arrow) { _v.copy(this.vel).normalize(); this.obj.quaternion.setFromUnitVectors(_AY, _v); }   // nose into the flight path
    else if (this.bullet) { _v.copy(this.vel).normalize(); this.obj.quaternion.setFromUnitVectors(_AZ, _v); }   // slug + tracer align to travel
    else if (this.blade) { _v.copy(this.vel).normalize(); this.obj.quaternion.setFromUnitVectors(_AZ, _v); this._spin.rotation.x += dt * 24; }   // steel tumbles end-over-end along its path
    else if (this.card) { _v.copy(this.vel).normalize(); this.obj.quaternion.setFromUnitVectors(_AZ, _v); this._spin.rotation.x += dt * 20; this._spin.rotation.z += dt * 8; }   // cards TUMBLE, corners catching the light
    else if (this.disc) { this._spin.rotation.y += dt * 15; }   // the shield spins FLAT — painted face flashing front/back
    else if (this.canister) { this.obj.rotation.x += dt * 7.5; this.obj.rotation.z += dt * 2.1; if (this._fuse) this._fuse.material.opacity = (Math.sin(this.life * 22) > 0) ? 0.9 : 0.25; if (this._pface) this._pface.material.opacity = (Math.sin(this.life * 22) > 0) ? 1 : 0.55; }   // shell tumbles, fuse blinks — pumpkin eyes blink WITH it
    else this.obj.rotation.y += dt * 6;
    // trail (arrows leave only a whisper; bullets leave a thin wisp of smoke, never a plasma tail)
    this.trailT += dt;
    if (this.trailT > (this.arrow || this.bullet || this.blade || this.canister || this.card || this.disc ? 0.05 : 0.016)) {
      this.trailT = 0;
      if (this.bullet || this.canister) game.particles.spawn({ x: this.pos.x, y: this.pos.y, z: this.pos.z, vx: rand(-1, 1), vy: rand(0, 2), vz: rand(-1, 1), life: 0.22, size: 0.8, color: ['#c9c2b4', '#8b8577'], drag: 4, shrink: true });
      else if (this.blade) game.particles.spawn({ x: this.pos.x, y: this.pos.y, z: this.pos.z, vx: rand(-1.5, 1.5), vy: rand(-1, 1), vz: rand(-1.5, 1.5), life: 0.16, size: 0.9, color: ['#dfe6ee', '#9aa4b0'], drag: 4, shrink: true });
      else if (this.card) game.particles.spawn({ x: this.pos.x, y: this.pos.y, z: this.pos.z, vx: rand(-1, 1), vy: rand(-1, 1), vz: rand(-1, 1), life: 0.2, size: 0.8, color: [this.color, '#ffdcdc'], drag: 4, shrink: true });   // narrow rose ribbon
      else if (this.disc) game.particles.spawn({ x: this.pos.x, y: this.pos.y, z: this.pos.z, vx: rand(-1.2, 1.2), vy: rand(-0.6, 0.6), vz: rand(-1.2, 1.2), life: 0.18, size: 0.9, color: ['#c9cfd9', '#eaf2ff'], drag: 4, shrink: true });   // metallic crescent
      else game.particles.spawn({ x: this.pos.x, y: this.pos.y, z: this.pos.z, vx: rand(-2, 2), vy: rand(-2, 2), vz: rand(-2, 2), life: this.arrow ? 0.2 : 0.35, size: this.arrow ? 1 : this.radius * 2.2, color: this.arrow ? this.color : [this.color, this.color2, '#ffffff'], drag: 3, shrink: true });
    }
    // Pedestrians aren't entities (they're one instanced mesh), so nothing ever collided with
    // them. A bullet has to: that's the whole point of the ballistic scale — lethal to people.
    if (this.ballistic && hasCivilians(game.modeId) && game.peds && this.pos.y < 12 && this.pos.y > 0.2) {
      const downed = game.peds.blast(this.pos.x, this.pos.z, 2.4);
      if (downed) {
        game.cityStats.civs += downed;
        if (game.police) game.police.onCivHarm(this.caster, downed);
        if (game.hud) game.hud.feed(`⚠ CIVILIAN SHOT — ${this.caster.name}`, '#ff8a6a');
        return this._impact(game, false);
      }
    }
    this.life -= dt;
    return true;
  }

  commitContact(game, contact = null) {
    if(contact?.kind==='fuse')return this._impact(game,this._armedGround || (!game.world._ghTriangles && this.pos.y<3));
    // collisions — delayed-blast payloads ARM instead of exploding on contact; boomerangs bounce home
    if (contact ? contact.kind === 'ground' : this.pos.y <= this.radius * 0.5 && this.ground) {
      if (this.boomerang) { this._return = true; this.pos.y = (game.world._ghTriangles?game.world.heightAt(this.pos.x,this.pos.z):0)+this.radius * 0.5 + 0.1; this.vel.y = Math.abs(this.vel.y) * 0.4; }
      else if (this.armDelay && !this._armed) { this._arm(game,true); return true; }
      else return this.webControl?this._webImpact(game):this._impact(game, true);
    }
    for (const c of (contact ? contact.kind === 'cover' ? [contact.target] : [] : game.world.cover)) {
      if(c===this.launchCover&&this.caster===this.launchCaster)continue;
      if (contact || (c.projectileShape === 'box'
        ? Number.isFinite(coverBoxEntry(this.pos, this.pos, c, this.radius, this.charged ? this.radius : 0))
        : Math.hypot(this.pos.x - c.x, this.pos.z - c.z) < c.r + this.radius && this.pos.y < c.h)) {
        if(this.ballistic)c.onConstructHit?.(this.damage*this.caster.powerBuff,{src:this.caster,pos:this.pos.clone(),lane:'projectile'});
        if (this.boomerang) { this._return = true; break; }
        if (this.armDelay && !this._armed) { this._arm(game); return true; }
        // RICOCHET (manual §19): reflect off the face, spend a bounce, leave a spark and a
        // visible directional KINK — straight segments, never a curve.
        if (this.bounces > 0) {
          this.bounces--;
          if (c.projectileShape === 'box') {
            // Contact/separation must use the same shape. A radial bounce from
            // an AABB face can eject INTO its corner and spend every bounce.
            const hx = c.hx + this.radius, hz = c.hz + this.radius;
            const top = (c.top ?? c.h) + (this.charged ? this.radius : 0);
            const bottom=Number.isFinite(c.bottom)?c.bottom-(this.charged?this.radius:0):-Infinity;
            const dx = Math.abs(Math.abs(this.pos.x - c.x) - hx);
            const dz = Math.abs(Math.abs(this.pos.z - c.z) - hz);
            const underside=Math.abs(this.pos.y-bottom)<Math.abs(this.pos.y-top);
            const dy = Math.abs(this.pos.y - (underside?bottom:top));
            const axis = dy < dx && dy < dz ? 'y' : dx <= dz ? 'x' : 'z';
            const side = axis === 'y' ? (underside?-1:1) : Math.sign(this.pos[axis] - c[axis]) || 1;
            this.vel[axis] = Math.abs(this.vel[axis]) * side;
            this.pos[axis] = axis === 'y' ? (underside?bottom-.4:top+.4) : c[axis] + side * ((axis === 'x' ? hx : hz) + 0.4);
          } else {
            const nx = this.pos.x - c.x, nz = this.pos.z - c.z, nl = Math.hypot(nx, nz) || 1;
            const dot2 = (this.vel.x * nx + this.vel.z * nz) / nl;
            this.vel.x -= 2 * dot2 * (nx / nl); this.vel.z -= 2 * dot2 * (nz / nl);
            this.pos.x = c.x + (nx / nl) * (c.r + this.radius + 0.4);
            this.pos.z = c.z + (nz / nl) * (c.r + this.radius + 0.4);
          }
          this.life = Math.max(this.life, 0.9);
          game.particles.burst(this.pos.x, this.pos.y, this.pos.z, { count: 4, speed: 16, life: 0.2, size: 1.1, color: ['#ffd97a', '#fff'], drag: 2.5 });
          game.audio.zap(700 + this.bounces * 120, this.pos);
          return true;
        }
        return this.webControl?this._webImpact(game):this._impact(game, !contact);
      }
    }
    // interior walls stop shots — corner warfare means the corner actually protects you
    if (contact ? contact.kind === 'interior' : !this._return && game.world.hitInteriorWall && game.world.hitInteriorWall(this.pos.x, this.pos.y, this.pos.z, this.radius)) {
      if (this.boomerang) this._return = true;
      else if (this.armDelay && !this._armed) { this._arm(game); return true; }
      else return this.webControl?this._webImpact(game):this._impact(game, !contact);
    }
    // ENERGY SHIELD BUBBLE (brief T3.15): hostile fire flattens on the dome; allied fire leaves.
    if (contact ? contact.kind === 'dome' : game._domes && game._domes.length) {
      // The sweep lands exactly on the surface; sample infinitesimally inside
      // for the existing inclusive point-query, without moving the visual hit.
      const sample = contact ? {caster:this.caster,damage:this.damage,pos:this.pos.clone().lerp(new THREE.Vector3(contact.target.x,contact.target.y,contact.target.z),1e-10)} : this;
      // Preserve the real game clock/audio owner for per-dome hit throttling.
      if (domeBlocks(game, sample, contact?.target)) return this.webControl?this._webImpact(game):this._impact(game, false);
    }
    // ⚠ A THROWN CAR IS A TARGET (manual §47). Tested BEFORE the foe check on purpose: the interesting
    // case is the prop arriving at your face, so the shot has to meet the car before it meets you.
    // ⚠ `_flung` is only ever populated under an open sky, so in the city this is one length check on
    // an empty array — the whole feature is unreachable there rather than merely switched off.
    if ((contact ? contact.kind === 'prop' : game._flung && game._flung.length) && game.hitFlung(this.caster,
      contact ? this.pos.clone().lerp(new THREE.Vector3(contact.target.x,contact.target.y,contact.target.z),1e-10) : this.pos,
      this.radius + 1.5, this.damage * this.caster.powerBuff)) {
      return this.webControl?this._webImpact(game):this._impact(game, false);
    }
    const foe = contact ? (contact.kind === 'foe' ? contact.target : null) : (game.overlapShot||game.overlapFoe).call(game,this.caster, this.pos, this.radius + 1.5);
    if (foe) {
      if (this.boomerang) {   // clip them and keep flying — both passes hurt
        if (this._rehitT <= 0) {
          this._rehitT = 0.35;
          foe.takeDamage(this.damage * this.caster.powerBuff, { src: this.caster, strike: true, dmgClass: 'slash', kb: _v.copy(this.vel).setY(0).setLength(this.damage * 0.4 + 8), launch: 5, hitstop: 0.06 });
          game.vfx.impactStar(this.pos.clone(), 6, this.color, 0.15); game.audio.hit(300, this.pos);
          this._return = true;
        }
        return true;
      }
      if (this.armDelay && !this._armed) { this._arm(game); return true; }   // she reaches you... and waits
      // STICKY BOMB (brief T2.4): clamps to the victim and RIDES them. The fuse accelerates,
      // so the tell is a blink rate, and the victim's own movement carries the threat.
      if (this.stick && !this._stuckTo) {
        this._stuckTo = foe;
        this._fuse = this.stick.fuse || 1.6;
        this._stickOff = new THREE.Vector3(this.pos.x - foe.pos.x, Math.max(1.5, this.pos.y - foe.pos.y), this.pos.z - foe.pos.z);
        game.audio.hit(220, this.pos); game.vfx.ring(this.pos.clone(), { color: this.color, r0: 0.5, r1: 3, life: 0.2 });
        if (game.hud && game.isHuman(foe)) game.hud.damageNumber(foe.pos, 'STUCK', '#ff8a3a', true);
        return true;
      }
      const webAccepted=this.webControl&&!this._webControlInterrupted&&canApplyWebControl(foe,this.caster);
      const hitOptions={src:this.caster,zone:contact?.zone,naniteContact:contact?.naniteContact,contactPoint:this.pos,ballistic:this.ballistic,weapon:this.weapon,dtype:this.dtype,siphon:this.siphon,
        kb:_v.copy(this.vel).setY(0).setLength(this.damage*(this.ballistic?.12:.5)+(this.ballistic?2:8)).setComponent(1,this.ballistic?1:6),launch:this.ballistic?0:6+this.power*4,hitstop:this.ballistic?.02:.05};
      return withNaniteDamageAdmission(foe,this.damage*this.caster.powerBuff,hitOptions,absorbs=>{
      // DEFLECT guard: bullets/bolts bounce right back at whoever fired them.
      // Only a positive, canonically admitted panel absorption preempts it.
      if (!absorbs && foe.guarding && foe.staggerT <= 0 && foe.guardMeter+1e-9 >= 0.04 && foe.def.guardType === 'deflect' && !this._defl) {
        // Use arrival direction: a fast shot can cross the body's center within
        // one step, so its endpoint is not reliable evidence of FRONT or BACK.
        const ddx = -this.vel.x, ddz = -this.vel.z, dd = Math.hypot(ddx, ddz) || 1;
        if ((ddx / dd) * foe.aim.x + (ddz / dd) * foe.aim.z > -0.15) {
          this._defl = true;
          const shooter = this.caster;
          this.caster = foe; this.team = foe.team; this.homing = Math.max(this.homing, 1.5);
          if(this.webControl)this._webControlSourceEpoch=foe._webControlEpoch||0;
          if (shooter && shooter.alive) _v.copy(shooter.pos).setY(shooter.pos.y + 5).sub(this.pos).normalize().multiplyScalar(this.vel.length() * 1.08);
          else _v.copy(this.vel).multiplyScalar(-1);
          this.vel.copy(_v); this.life = Math.max(this.life, 1.4);
          foe.guardMeter = Math.max(0, foe.guardMeter - 0.04);
          foe._blocked=0.18;
          registerShieldContact(foe,{contactPoint:this.pos});
          if(foe.guardMeter<=1e-9){foe.guardMeter=0;foe.guarding=false;foe.staggerT=Math.max(foe.staggerT||0,0.7);foe.state='hit';foe.stateT=0;}
          const guard=foe.guardMeter<=1e-9?'broken':'blocked';
          game.presentHitOutcome?.(foe,hitOptions,Object.freeze({dtype:this.dtype||(this.ballistic?'ballistic':'energy'),
            attackClass:this.ballistic?'bullet':'projectile',healthLost:0,absorbed:Object.freeze({plate:0,armor:0,shield:0,nanite:0}),
            guard,deflected:true,knockedOut:false,statusesAdded:Object.freeze([]),
            contact:Object.freeze({x:this.pos.x,y:this.pos.y,z:this.pos.z})}));
          game.vfx.impactStar(this.pos.clone(), 6, '#ffd24a', 0.16); game.audio.zap(760,this.pos);
          return true;
        }
      }
      const dealt=foe.takeDamage(this.damage * this.caster.powerBuff,hitOptions);
      if(dealt>0&&this.shockDuration>0)foe.addShock(this.shockDuration,this.caster);
      if(webAccepted&&foe.alive)applyWebControl(foe,this.caster,this.webControl);
      // ACID: corrodes the plate for 5s — the counter to the armour that stops bullets
      if(dealt>0){
      if (this.payload === 'acid') { foe.addDot({ dps: 6, dur: 5, color: '#c8e04a', kind: 'acid', corrode: 4, src: this.caster }); game.particles.burst(foe.pos.x, foe.pos.y + 5, foe.pos.z, { count: 9, speed: 11, life: 0.6, size: 2.8, color: ['#c8e04a', '#9ab030', '#e6f0a0'], up: 7, drag: 1.1 }); }
      else if (this.payload === 'poison') foe.addDot({ dps: 5, dur: 4, color: '#8fe08a', kind: 'poison', src: this.caster });
      else if (this.payload === 'sleep') { foe.addSleep(2.6, this.caster); game.particles.burst(foe.pos.x, foe.pos.y + 6, foe.pos.z, { count: 7, speed: 6, life: 0.7, size: 2.2, color: ['#ffe9b0', '#fff'], up: 5, drag: 1.6 }); }
      else if (this.payload === 'gas') foe.addDot({ dps: 6, dur: 3, color: '#9a4ae0', kind: 'gas', src: this.caster });
      // ⚠ TWO GASES, TWO DIFFERENT WEAPONS. Tear gas is a CONTROL tool — it blinds and it doubles
      // you over, and it barely scratches you; that is what makes it police equipment. Mustard is a
      // BLISTER AGENT — slow, no blinding, and it CORRODES, which makes it the one thing an
      // armoured chassis actually fears. Both ride the DoT + corrode lanes that already exist.
      else if (this.payload === 'teargas') {
        foe.addDot({ dps: 1.6, dur: 6, color: '#dfe8c0', kind: 'gas', dtype: 'toxic', src: this.caster });
        foe.staggerT = Math.max(foe.staggerT || 0, 0.45);
        foe.blindT = Math.max(foe.blindT || 0, 1.2);
      }
      else if (this.payload === 'mustard') {
        foe.addDot({ dps: 7, dur: 10, color: '#c8b84a', kind: 'acid', dtype: 'acid', corrode: 6, src: this.caster });
      }
      else if (this.payload === 'flame') { foe.addDot({ dps: 7, dur: 2.5, color: '#ff7a2a', kind: 'burn', src: this.caster }); game.particles.burst(foe.pos.x, foe.pos.y + 5, foe.pos.z, { count: 8, speed: 10, life: 0.5, size: 2.6, color: ['#ff7a2a', '#ffd24a'], up: 8, drag: 1.2 }); }
      }
      if(this.webControl)return this._webImpact(game);
      if (this.chain) this._arc(game, foe);
      if (this.pierce-- > 0) { game.vfx.flash(this.pos.clone(), this.color, this.radius * 2, 0.12); return true; }
      return this._impact(game, false, foe);
      });
    }
    if (contact ? contact.kind === 'expiry' : this.life <= 0) { if (this.armDelay && !this._armed) { this._arm(game); return true; } return this.webControl?this._webImpact(game):this._impact(game, false); }
    return true;
  }

  // CHAIN LIGHTNING (brief T2.5): the first arc is the thickest, each jump thinner and less
  // stable, and targets flash IN SEQUENCE so the player can read the path it took. Never
  // arcs back to someone it already hit, and never to the caster.
  _arc(game, first) {
    const hit = new Set([first]);
    let from = first, dmg = this.damage * 0.65, n = this.chain.targets || 3;
    const range = this.chain.range || 26;
    for (let i = 0; i < n; i++) {
      let best = null, bd = range * range;
      for (const e of game.entities) {
        if (!e.alive || hit.has(e) || e === this.caster || !game.isFoe(this.caster, e)) continue;
        const dx = e.pos.x - from.pos.x, dy = e.pos.y - from.pos.y, dz = e.pos.z - from.pos.z;
        const d = dx * dx + dy * dy + dz * dz;
        if (d < bd) { bd = d; best = e; }
      }
      if (!best) break;
      hit.add(best);
      const a = from, b = best, delay = 0.06 * (i + 1);          // SEQUENTIAL, not simultaneous
      const width = Math.max(0.25, 1 - i * 0.28);                 // each jump is thinner
      // game.later, not setTimeout: a reset between arcs must retire the rest of the chain rather
      // than land damage on a fighter belonging to the previous match (the deferred-callback law).
      game.later(() => {
        if (!b.alive || !a) return;
        game.vfx.lightning(a.pos.clone().setY(a.pos.y + 4), { color: this.color || '#bfe9ff', count: 2 + (width > 0.6 ? 2 : 0), radius: Math.hypot(b.pos.x - a.pos.x, b.pos.z - a.pos.z) * 0.5, height: 6, to: b.pos });
        b.takeDamage(dmg * this.caster.powerBuff, { src: this.caster, dtype: this.dtype || 'energy', shock: true, hitstop: 0.03, kb: { x: 0, y: 2, z: 0 } });
        game.audio.zap(820 - i * 90, b.pos);
      }, delay * 1000);
      from = best; dmg *= this.chain.falloff || 0.7;
    }
  }

  // BLACK HOLE ROUND (brief T2.6): dust and debris curve inward BEFORE anyone moves, then it
  // implodes rather than exploding outward.
  _singularity(game) {
    const S = this.singularity, p = this.pos.clone();
    const r = S.r || 26, dur = S.dur || 1.1, pull = S.pull || 44;
    game.addSingularity(p, r, dur, pull, this.caster, this.color);
  }
  _impact(game, hitGround) {
    if (this.dead) return false;
    const p = this.pos.clone(); if (hitGround) p.y = (game.world._ghTriangles?game.world.heightAt(p.x,p.z):0)+0.2;
    if (this.singularity) this._singularity(game);   // it collapses INWARD (brief T2.6)
    if (this.blind) game.addSmoke(p.x, p.z, this.blind.r || 12, this.blind.dur || 2.6, this.caster);   // smoke owns this street corner
    // A BULLET IS NOT A BOMB: no fireball, no crater, no area damage — just a spark, a puff and
    // a very dead civilian if it found one. This is the scale that makes guns read as guns.
    if (this.ballistic) {
      game.particles.burst(p.x, p.y, p.z, { count: 4, speed: 14, life: 0.2, size: 1.1, color: ['#ffd97a', '#8b8577'], drag: 2.5 });
      if (hasCivilians(game.modeId) && game.peds && p.y < 12) {
        const downed = game.peds.blast(p.x, p.z, 3.2);        // one shot, one pedestrian
        if (downed) {
          game.cityStats.civs += downed;
          if (game.police) game.police.onCivHarm(this.caster, downed);
          if (game.hud) game.hud.feed(`⚠ CIVILIAN SHOT — ${this.caster.name}`, 'var(--danger-2)');
        }
      }
      game.noise(p, 0.8, this.caster);
      // ⚠ AND THE SLUG HAS TO GO. This branch exists so a bullet does not explode — it was written
      // as an early `return false`, which skips the `_dispose(game)` at the bottom of the function
      // that every other impact path reaches. The projectile was spliced out of the list (it
      // returned false) while its mesh stayed in the scene FOREVER, frozen at head height where it
      // died. Robert: "the bullets look like they never disappear, they just get shot and they
      // just lay on the ground." Measured before this line: 177 orphaned slug+tracer pairs after
      // 105 seconds of one gunfight, growing about 1.7 a second and never coming back.
      this._dispose(game);
      return false;
    }
    game.vfx.explode(p, { color: this.color, color2: this.color2, radius: this.blast, power: this.power, energyShell:!!(this._remoteBurst || this._guidedSplit), scorch: hitGround && !(this.vis && this.vis.residue !== 'scorch') });
    // the profile decides what the ground KEEPS — frost, sludge, debris, nothing
    if (hitGround && this.vis && this.vis.residue !== 'scorch') game.vfx.residue(p, this.vis.residue, this.blast * 0.6);
    game.areaDamage(this.caster, p, this.blast, this.damage * 0.8, this.power, {dtype:this.dtype});
    if (this.shock && hitGround) game.vfx.shockwave(p, { color: this.color, radius: this.blast * 2.2, power: this.power });
    if (this.face) {   // the Marletta goes off — a grief-shaped crater
      game.vfx.shockwave(p.clone().setY((game.world._ghTriangles?game.world.heightAt(p.x,p.z):0)+0.2), { color: this.color, radius: this.blast * 2.6, power: this.power });
      game.vfx.lightning(p, { color: '#fff', count: 5, radius: this.blast, height: 14 });
      game.slowmo(0.2, 0.45); game.world.punch(0.7); if (game.hud) game.hud.flashScreen('#ffe8c0', 0.16);
    }
    game.audio.boom(clamp(this.power * 0.6, 0.2, 1.4), p);
    this._dispose(game); return false;
  }
  _webImpact(game){
    game.vfx.ring(this.pos.clone(),{color:this.color,r0:.35,r1:2.6,life:.18});
    game.particles.burst(this.pos.x,this.pos.y,this.pos.z,{count:7,speed:7,life:.28,size:.7,color:[this.color,this.color2],drag:2.4});
    game.audio.hit(180,this.pos);this._dispose(game);return false;
  }
  // The ability layer owns who may activate this; the projectile owns its actual
  // payload and current caster (including a deflection's transferred ownership).
  detonate(game = this.game) {
    if(this.dead)return false;
    if(!this.splitCount){this._remoteBurst=true;return this._impact(game,false);}
    const count=this.splitCount,forward=this.vel.clone();
    if(forward.lengthSq()<1e-8)forward.copy(this.caster.aim3);
    if(forward.lengthSq()<1e-8)forward.set(0,0,1);
    forward.normalize();
    const side=new THREE.Vector3().crossVectors(forward,Math.abs(forward.y)>.9?_AZ:UP).normalize();
    const up=new THREE.Vector3().crossVectors(side,forward).normalize();
    // Retire before emitting: repeat activation cannot duplicate children, and
    // the parent's light is available to the ordinary projectile pool immediately.
    this._dispose(game);
    for(let i=0;i<count;i++){
      const angle=TAU*i/count;
      const vel=forward.clone().multiplyScalar(Math.cos(this.splitSpread))
        .addScaledVector(side,Math.cos(angle)*Math.sin(this.splitSpread))
        .addScaledVector(up,Math.sin(angle)*Math.sin(this.splitSpread)).multiplyScalar(this.splitSpeed);
      game.projectiles.spawnProjectile(this.caster,{
        pos:this.pos,vel,radius:this.radius/Math.cbrt(count),damage:this.damage/count,
        blast:this.blast/Math.sqrt(count),blastScaled:true,power:this.power/Math.sqrt(count),
        homing:this.splitHoming,maxSpeed:this.splitSpeed,guidedSplit:true,life:4,color:this.color,color2:this.color2,
        collisionPriority:-1,
        dtype:this.dtype,siphon:this.siphon,vis:this.vis,
      });
    }
    game.vfx.ring(this.pos,{color:this.color,r0:this.radius*.5,r1:this.radius*2,life:.2});
    game.particles.burst(this.pos.x,this.pos.y,this.pos.z,{count:count*2,speed:16,life:.2,size:this.radius*.6,color:[this.color,'#fff'],drag:3});
    return false;
  }
  _dispose(game) {
    if (this.dead) return; this.dead = true; game.scene.remove(this.obj);
    // every mesh branch declares its per-projectile materials in _ownMats — shared module
    // materials (steel, brass, tracer) must NEVER be disposed here (index-guessing children[1]
    // used to dispose the SHARED tracer mat on every bullet impact, and crashed on nested groups)
    for (const m of this._ownMats || []) m.dispose();
    for (const geometry of this._ownGeos || []) geometry.dispose();
    this._throwGeometry?.dispose();
    if (this.light) game.vfx.returnLight(this.light);   // returnLight owns it — the light STAYS in the scene (see the light-count law)
  }
}
function o_maxspeed(p) { return p._max || 90; }

// ---- Beam-hose: traveling tip drags a thick beam (wave cannon, heat-beam, violet) ----
class BeamHose {
  constructor(game, caster, o) {
    this.game = game; this.caster = caster; this.team = caster.team;
    this._combatReadability = !!caster._openSky;
    this._sparkClock = 0;
    this._contactNext = new WeakMap();
    this.pierceFighters=o.pierceFighters===true;
    this._bodyContact={fighter:null,point:new THREE.Vector3(),surface:new THREE.Vector3(),direction:new THREE.Vector3()};
    this._constructPreclip={target:null,point:new THREE.Vector3(),arc:0};
    this._constructBlockedPoint=new THREE.Vector3();
    this._groundResidue=new BeamGroundContact();
    this.radius = o.radius || 1.6;             // beam thickness
    this.tipSpeed = o.tipSpeed || 150;         // how fast the tip races out (waterhose, not instant)
    // THE BEAM ANATOMY (data/visual.js). Two axes, and the engine holds no opinion about any
    // individual weapon: BUILD decides the silhouette (sheath opacity, core thickness, tip, flare)
    // and TEMPER decides what the instanced DETAIL layer is doing. Twenty-five beams used to be
    // one beam in twenty-five colours; VEGA's helix was the only form in the game.
    this.build = BUILD_LOOK[o.build] || BUILD_LOOK.hose;
    this.temper = TEMPER_LOOK[o.temper] || TEMPER_LOOK.steady;
    this.temperName = o.temper || 'steady';
    this.maxLen = o.maxLen || 120;
    this.dps = o.dps || 60; this.dtype = o.dtype || null; this.siphon = o.siphon;   // an arcane beam SIPHONS
    this.pushForce=o.pushForce??(o.faceOrigin?0:368);
    this.guardChip=o.guardChip??.22;this.guardDrain=o.guardDrain??.28;
    this.detonateRadius = o.detonateRadius ?? Math.max(8, this.radius * 8);
    this.detonateDamage = o.detonateDamage ?? this.dps * .8;
    this.remoteDetonate = o.remoteDetonate===true;
    this.interceptBullets=o.interceptBullets===true;
    this.interceptKi=Number.isFinite(o.interceptKi)&&o.interceptKi>=0?o.interceptKi:30;
    this.investedKi=Number.isFinite(o.investedKi)&&o.investedKi>=0?o.investedKi:0;
    this.kiPerSec = o.kiPerSec || 22;
    this.color = o.color || '#8fe3ff'; this.color2 = o.color2 || '#eaffff';
    this.power = o.power || 1;
    this.steer = o.steer == null ? 10 : o.steer; // how fast beam rotates to aim
    this.might = o.might || ((o.dps || 60) / 50);  // beam-battle strength (from dps, charge, character)
    this.clashLen = null; this.clashing = false; this._clashOther = null; this._clashT = 0.5;
    // THE BEAM VOICE — a sustained inharmonic/ring-mod stack that STRAINS when the beam is
    // losing a clash. Held for the beam's life and stopped in _dispose.
    this._poseLaunch=!!(caster._openSky&&caster.parts?.rig&&(o.poseLaunch||o.faceOrigin||o.chest));
    this._chargedRelease=!!o.chargedRelease;
    this._launchReady=false;
    this._voice = !this._poseLaunch&&this.game.audio.beamVoice ? this.game.audio.beamVoice(caster.pos) : null;
    this.tipDist = 0;
    this.dir = caster.aim3.clone().normalize();   // 3D — angles up/down toward the target's height
    this._steerRotation = new THREE.Quaternion();
    this._steerStep = new THREE.Quaternion();
    this._stepDirection = new THREE.Vector3();
    this._directionBatch = -1;
    this._stepChest = null;
    this._axialOrigin = new THREE.Vector3();
    this._axialDirection = new THREE.Vector3();
    this._axialRotation = new THREE.Quaternion();
    this._axialStep = new THREE.Quaternion();
    this.muzzle = new THREE.Vector3();
    this._clashContact = new THREE.Vector3();
    this._clashOffset = new THREE.Vector3();
    this.sustaining = true;                    // held
    this.emissionAge = 0;                      // actual emission lifetime, independent of pose ownership
    this.endT = 0; this.dead = false;
    this.blocked = false;

    // ==========================================================================================
    // THE STREAM. Robert, with two frames of Trunks firing and then turning: *"our beams are all
    // like laser beams. their beams are better — when they turn, the wave turns with it. it
    // shouldn't be like that. a Dragon Ball Z beam is different. in ours all beams would have been
    // straight even after he shot it and turned."*
    //
    // He is describing the single most important thing about a ki beam and we had it wrong. The
    // beam WAS one cylinder, rebuilt every frame from the caster's current aim — so it could only
    // ever be a rigid straight line pivoting about the hand. A turret laser.
    //
    // ⚠ ENERGY THAT HAS ALREADY LEFT THE HAND DOES NOT KNOW YOU TURNED. Each frame emits a packet
    // at the muzzle carrying the direction it was fired with, and from then on that packet just
    // travels. The beam is the TRAIL of those packets. Turn while firing and the root swings with
    // your hand while the far end keeps going where it was sent — the beam BENDS, exactly as in his
    // reference, and it does so as a consequence of how it is simulated rather than as an effect.
    //
    // The path is a fixed-size buffer allocated once and only ever written in place; no beam
    // allocates during a fight.
    this.NODES = 44;
    this.path = new Float32Array(this.NODES * 3);      // node 0 = at the muzzle, rising index = older
    this.pvel = new Float32Array(this.NODES * 3);
    this._absorbed = new Array(this.NODES).fill(null);
    this._curve=this._combatReadability?new BeamCurve(this.NODES):null;
    this.pn = 0;
    this._tmp = new THREE.Vector3(); this._tan = new THREE.Vector3();
    this._pa = new THREE.Vector3(); this._pb = new THREE.Vector3();
    this._obstacleContact={};
    this._bodySweep={path:new Float32Array(6),pn:2,caster,radius:this.radius};
    this._sweepContact={point:new THREE.Vector3(),surface:new THREE.Vector3(),direction:new THREE.Vector3(),fighter:null};
    this._packetContact={point:new THREE.Vector3(),surface:new THREE.Vector3(),direction:new THREE.Vector3(),fighter:null};

    // meshes: outer glow + bright core + tip. The two bodies are TUBES swept along the path now,
    // not cylinders — a cylinder cannot be bent.
    const materials=createBeamMaterials(this.color,this.color2,this._combatReadability,this.temper.n>0);
    this.RADIAL = 8;
    this._glowGeo = this._tubeGeo((this._curve?.capacity||this.NODES)+1, this.RADIAL);
    this._coreGeo = this._tubeGeo((this._curve?.capacity||this.NODES)+1, this.RADIAL, true);
    this.glow = new THREE.Mesh(this._glowGeo, materials.glow);
    this.core = new THREE.Mesh(this._coreGeo, materials.core);
    this.glow.frustumCulled = false; this.core.frustumCulled = false;
    this.tip = new THREE.Mesh(GEO_ORB, materials.tip);
    this.grp = new THREE.Group(); this.grp.add(this.glow, this.core, this.tip); game.scene.add(this.grp);
    this.sourceGlow=o.sourceGlow??1;this.sourceScale=o.sourceScale??1;this.sourceLight=null;
    this.impactGlow=o.impactGlow??1;
    this.source=new THREE.Mesh(GEO_ORB,createBeamSourceMaterial(this.color));
    this.source.visible=false;this.grp.add(this.source);
    // ⚠ ONE INSTANCED DETAIL LAYER, SHARED BY EVERY TEMPER. This started life as VEGA's
    // hard-coded 26-orb helix; generalising it was almost free and it is what lets seven tempers
    // exist for the cost of one draw call. A temper that says `n: 0` builds nothing at all.
    if (this.temper.n > 0) {
      this.detail = new THREE.InstancedMesh(GEO_ORB, materials.detail, this.temper.n);
      this.detail.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.grp.add(this.detail);
      this._sm = new THREE.Matrix4(); this._sv = new THREE.Vector3();
    }
    if(this._combatReadability) {
      // In a rear combat view, double-sided additive tubes stack along the sight line and
      // bleach the entire opponent. Keep a bright core inside a colored, single-sided shell.
      // This changes presentation only: radius, streaming path, hit tests and clash power stay put.
      this._surfaceTime=materials.time;
      const eye=new THREE.Vector3();
      for(const [mesh,reduction] of [[this.core,.64],[this.glow,.65],[this.tip,.55],[this.detail,.65]])if(mesh){
        mesh.userData.beamOpacity=mesh.material.opacity;
        mesh.onBeforeRender=(_renderer,_scene,camera)=>{
          camera.getWorldPosition(eye);eye.sub(this.muzzle).normalize();
          const k=clamp((Math.abs(eye.dot(this.dir))-.55)/.4,0,1),aligned=k*k*(3-2*k);
          // Only an occupied axial sightline needs extra read-through. The
          // surface shader boosts axial core density, so the free-flight fade
          // alone still masked the defender's guard/reaction at contact.
          const contactReduction=(this._bodyContact.fighter&&mesh===this.core) ? .84 : reduction;
          mesh.material.opacity=(mesh.userData.beamOpacity??mesh.material.opacity)*(1-contactReduction*aligned);
        };
      }
    }
    this.light = game.vfx.borrowLight(this.color, 5 * this.power, 60);
    this.faceOrigin = !!o.faceOrigin;   // OPTIC BLAST (brief Tier1 #2): eyes, not hands
    this.chest = !this.faceOrigin && o.chest===true;
    this.combinedHands=!this.faceOrigin&&!this.chest&&o.combinedHands===true;
    this.castHand=o.castHand;this.castSide=palmCastSide(o);
    this._otherPalm=new THREE.Vector3();
    this.sampleMuzzle(this.muzzle);
    this._launchResolved=false;
    this._launchTarget=caster.hasAimWorld?caster.aimWorld.clone():null;
    this._launchAim=caster.aim3.clone().normalize();
    if(this._launchTarget)this.dir.copy(this._launchTarget).sub(this.muzzle).normalize();
    // The fixed buffer represents TIME in flight, not the last N display frames.
    // Leave room for the live hand anchor and a complete authored reach.
    this._streamStep=this.maxLen/(this.tipSpeed*(this.NODES-3));
    this._streamClock=0;
    this._streamOrigin=this.muzzle.clone();this._streamDir=this.dir.clone();
    this.pn=this._poseLaunch?0:2;
    if(this._poseLaunch){this.grp.visible=false;this.light.intensity=0;}
    for(let i=0;i<this.pn;i++){
      this.muzzle.toArray(this.path,i*3);
      this.pvel[i*3]=this.dir.x*this.tipSpeed;this.pvel[i*3+1]=this.dir.y*this.tipSpeed;this.pvel[i*3+2]=this.dir.z*this.tipSpeed;
    }
  }

  // A tube of (nodes x radial) vertices, indexed once. Positions are rewritten every frame; the
  // index buffer never changes, so a bending beam costs one buffer upload.
  _tubeGeo(nodes, radial, surface = false) {
    const pos = new Float32Array(nodes * radial * 3);
    const idx = new Uint16Array((nodes - 1) * radial * 6);
    let k = 0;
    for (let sg = 0; sg < nodes - 1; sg++) {
      for (let r = 0; r < radial; r++) {
        const r2 = (r + 1) % radial;
        const a = sg * radial + r, b = sg * radial + r2;
        const c = (sg + 1) * radial + r, d = (sg + 1) * radial + r2;
        // _sweep builds its ring in the (e, tangent × e) basis. This order
        // faces outward; the reversed order drew an inside-out single-sided hose.
        idx[k++] = a; idx[k++] = b; idx[k++] = c;
        idx[k++] = b; idx[k++] = d; idx[k++] = c;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    if(this._combatReadability){
      g.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(nodes*radial*3),3));
      if(surface)g.setAttribute('beamTangent',new THREE.BufferAttribute(new Float32Array(nodes*radial*3),3));
      g.setAttribute('beamArc',new THREE.BufferAttribute(new Float32Array(nodes*radial),1));
    }
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    return g;
  }

  // Sweep a tube along the live path. ⚠ PARALLEL TRANSPORT, not a fresh perpendicular per node:
  // recomputing the frame independently makes the tube TWIST visibly wherever the path bends, which
  // on a beam reads as the thing rotating about its own axis. Carrying the previous perpendicular
  // forward and re-orthogonalising it keeps the surface calm through a curve.
  _sweep(geo, baseR, flare, curve=this._curve?.update(this.path,Math.max(2,this.pn),this.sustaining?this.dir:null,this.radius)) {
    const pos = geo.attributes.position.array;
    const normal=geo.attributes.normal?.array,along=geo.attributes.beamArc?.array,tangent=geo.attributes.beamTangent?.array;
    let arc=0;
    const path=curve?.points||this.path;
    const R = this.RADIAL, N=pos.length/(R*3), pn = curve?.count||Math.max(2, this.pn);
    const length=curve?curve.length:this._arcLen(),receiver=this._bodyContact.fighter;
    let ex = 0, ey = 0, ez = 0, ptx=0,pty=0,ptz=1, first = true;
    for (let i = 0; i < pn; i++) {
      const li = i;
      const o = li * 3;
      const px = path[o], py = path[o + 1], pz = path[o + 2];
      if(i>0&&i<pn){const prev=(li-1)*3;arc+=Math.hypot(px-path[prev],py-path[prev+1],pz-path[prev+2]);}
      // tangent from the neighbouring live nodes
      const ia = Math.max(0, li - 1) * 3, ib = Math.min(pn - 1, li + 1) * 3;
      let tx = path[ib] - path[ia], ty = path[ib + 1] - path[ia + 1], tz = path[ib + 2] - path[ia + 2];
      if(curve){tx=curve.tangents[o];ty=curve.tangents[o+1];tz=curve.tangents[o+2];}
      if(Math.hypot(tx,ty,tz)<1e-8){tx=this.dir.x;ty=this.dir.y;tz=this.dir.z;}
      // A newborn packet can have neither travel nor aim yet. Repair only the
      // render basis; never invent velocity or rewrite the physical stream.
      if(Math.hypot(tx,ty,tz)<1e-8){tx=0;ty=0;tz=1;}
      let tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
      if (first) {
        // any perpendicular will do for the first ring
        let ax = 0, ay = 1, az = 0;
        if (Math.abs(ty) > 0.9) { ax = 1; ay = 0; }
        ex = ay * tz - az * ty; ey = az * tx - ax * tz; ez = ax * ty - ay * tx;
        const el = Math.hypot(ex, ey, ez) || 1; ex /= el; ey /= el; ez /= el;
        first = false;
      } else {
        // Shortest-arc parallel transport. Projection alone collapses a frame
        // when its old perpendicular becomes the next tangent at a hard turn.
        const dot=clamp(ptx*tx+pty*ty+ptz*tz,-1,1);
        if(dot>-.999999){
          const kx=pty*tz-ptz*ty,ky=ptz*tx-ptx*tz,kz=ptx*ty-pty*tx;
          const vx=ky*ez-kz*ey,vy=kz*ex-kx*ez,vz=kx*ey-ky*ex;
          ex+=vx+(ky*vz-kz*vy)/(1+dot);ey+=vy+(kz*vx-kx*vz)/(1+dot);ez+=vz+(kx*vy-ky*vx)/(1+dot);
        }
        const d = ex * tx + ey * ty + ez * tz;ex-=tx*d;ey-=ty*d;ez-=tz*d;
        const el = Math.hypot(ex, ey, ez) || 1; ex /= el; ey /= el; ez /= el;
      }
      ptx=tx;pty=ty;ptz=tz;
      const fx = ty * ez - tz * ey, fy = tz * ex - tx * ez, fz = tx * ey - ty * ex;
      // ⚠ THE HEAD IS AT THE FAR END. Node 0 is at the hand and the oldest node is the tip, so the
      // bulge belongs at HIGH index — a DBZ beam is a spearhead with a thin shaft behind it.
      const t = curve ? clamp(arc/Math.max(1e-8,length),0,1) : pn > 1 ? li / (pn - 1) : 0;
      // Keep charged width downstream, but gather it into the actual emitter.
      // A full-width first ring was a body-sized open collar in a rear view.
      const opening=clamp(arc/Math.max(1,receiver?Math.min(3,baseR*3):baseR*3),0,1);
      const nozzle=this._combatReadability ? .12+.88*opening*opening*(3-2*opening) : 1;
      let rad = baseR * (0.78 + 0.55 * t * t) * flare * nozzle;
      if(receiver){
        // Pressure gathers onto the receiving surface; it must not flare wider
        // than the body or show an open, torn aperture behind the impact.
        const contactRadius=Math.min(baseR*.85,receiver.radius*(geo===this._coreGeo?.65:.9));
        rad=contactRadius*nozzle;
      }
      if(curve)rad=Math.min(rad,curve.radii[i]);
      for (let r = 0; r < R; r++) {
        const a = (r / R) * Math.PI * 2, ca = Math.cos(a) * rad, sa = Math.sin(a) * rad;
        const w = (i * R + r) * 3;
        pos[w] = px + ex * ca + fx * sa;
        pos[w + 1] = py + ey * ca + fy * sa;
        pos[w + 2] = pz + ez * ca + fz * sa;
        if(normal){
          normal[w]=ex*Math.cos(a)+fx*Math.sin(a);normal[w+1]=ey*Math.cos(a)+fy*Math.sin(a);normal[w+2]=ez*Math.cos(a)+fz*Math.sin(a);
          if(tangent){tangent[w]=tx;tangent[w+1]=ty;tangent[w+2]=tz;}
          along[i*R+r]=arc;
        }
      }
    }
    // Keep unused reserve finite/collapsed for inspection, but neither draw nor
    // upload it. Subdivision count follows curvature, not maximum allocation.
    let drawn=pn;
    if(receiver){
      const end=(pn-1)*3;
      for(let r=0;r<R;r++){
        const w=(pn*R+r)*3;
        pos[w]=path[end];pos[w+1]=path[end+1];pos[w+2]=path[end+2];
        if(normal){normal[w]=ptx;normal[w+1]=pty;normal[w+2]=ptz;}
        if(tangent){tangent[w]=ptx;tangent[w+1]=pty;tangent[w+2]=ptz;}
        if(along)along[pn*R+r]=arc;
      }
      drawn++;
    }
    const last=(drawn-1)*R*3;
    for(let i=drawn;i<N;i++){
      pos.copyWithin(i*R*3,last,last+R*3);
      if(normal)normal.copyWithin(i*R*3,last,last+R*3);
      if(tangent)tangent.copyWithin(i*R*3,last,last+R*3);
    }
    if(along)along.fill(arc,drawn*R);
    geo.setDrawRange(0,Math.max(0,drawn-1)*R*6);
    for(const attribute of Object.values(geo.attributes)){
      // The renderer clears updateRanges after upload. Reuse the range object
      // rather than allocating one for each attribute of each beam each frame.
      const range=attribute._beamUploadRange ||= {start:0,count:0};range.count=drawn*R*attribute.itemSize;
      attribute.clearUpdateRanges();attribute.updateRanges.push(range);attribute.needsUpdate=true;
    }
  }

  /** Total arc length of the live path, and the point at a given arc distance. */
  _arcLen() {
    let L = 0;
    for (let i = 1; i < this.pn; i++) {
      const a = (i - 1) * 3, b = i * 3;
      L += Math.hypot(this.path[b] - this.path[a], this.path[b + 1] - this.path[a + 1], this.path[b + 2] - this.path[a + 2]);
    }
    return L;
  }

  end() { this.sustaining = false; }

  detonate(game = this.game) {
    if (this.dead || this.pendingLaunch) return false;
    // Oldest live packet is the traveling tip, even after the caster turns.
    // Unfired preparations are excluded above; live paths begin at the real muzzle.
    const i=Math.max(0,this.pn-1)*3;
    const pos=this.pn>0?new THREE.Vector3().fromArray(this.path,i):this.muzzle.clone();
    this.sustaining=false;
    this._dispose(game);
    game.vfx.explode(pos,{color:this.color,color2:this.color2,radius:this.detonateRadius,power:this.power,energyShell:true,scorch:false});
    game.areaDamage(this.caster,pos,this.detonateRadius,this.detonateDamage,this.power,{dtype:this.dtype});
    game.audio.boom(clamp(this.power*.6,.2,1.4),pos);
    return false;
  }

  // beam-battle power: character might × buff × how much of the ki budget is left ("energy put in")
  clashPower() { return this.might * this.caster.powerBuff * (0.35 + 0.65 * (this.caster.ki / this.caster.maxKi)); }

  // Shared by the cast pose and simulation: predict new emission without advancing
  // the stream. The pose runs first, then update samples its final hand socket.
  sampleMuzzle(out){
    const c=this.caster;
    if(this.combinedHands&&c.parts?.rig){
      c.parts.armL.children[2].getWorldPosition(out);c.parts.armR.children[2].getWorldPosition(this._otherPalm);
      return out.add(this._otherPalm).multiplyScalar(.5);
    }
    if(!this.faceOrigin&&!this.chest&&this.castSide<0)return handEmissionPosition(c,-1,out);
    return c.muzzle(out,this.faceOrigin?1.1:this.chest?1.2:undefined,this.faceOrigin?8.3:this.chest?5.4:undefined);
  }

  get pendingLaunch(){return this._poseLaunch&&!this._launchResolved;}

  _handsBraced(ray){
    const c=this.caster,p=c.parts;
    // Read the final animated anatomy, not a timer. The wrist can already face
    // the target while its shoulder is still hanging down or gathering energy.
    if(c._combatAim?.source!=='hand')return false;
    for(let i=0;i<2;i++){
      if(!this.combinedHands&&i!==(this.castSide<0?0:1))continue;
      // A disjoint stream can already be firing while this palm is still
      // releasing its charge. Read this arm's history, not the body carrier.
      if((c._combatAim.armChannels?.[i]?.gather??c._combatAim.gather)>.2)return false;
      const arm=i?p.armR:p.armL,hand=arm.children[2];
      // Paired palms converge on the captured point from different sockets.
      // A nearby point cannot be parallel to both hands and the midpoint ray.
      this._otherPalm.copy(ray);
      if(this._launchTarget){
        hand.getWorldPosition(this._axialDirection);
        this._otherPalm.copy(this._launchTarget).sub(this._axialDirection).normalize();
      }
      arm.getWorldPosition(this._axialOrigin);
      hand.getWorldPosition(this._axialDirection).sub(this._axialOrigin).normalize();
      if(this._axialDirection.dot(this._otherPalm)<.75)return false;
      hand.getWorldQuaternion(this._axialRotation);
      this._axialDirection.set(0,-1,0).applyQuaternion(this._axialRotation);
      if(this._axialDirection.dot(this._otherPalm)<.99)return false;
      // Carried weapons retain their grip. Both procedural palms and weighted
      // skin fingers use this openness driver and must open before emission.
      if(!hand.userData.gripOccupied&&(hand.morphTargetInfluences?.[0]??1)<.7)return false;
    }
    return true;
  }

  resolveLaunch(game=this.game,dt=0){
    if(this._launchResolved)return;
    this.sampleMuzzle(this.muzzle);
    if(this.pendingLaunch){
      const c=this.caster;
      this._launchReady=false;
      if(!this.sustaining||!c.alive||remoteInterrupted(c)||c.guarding)return;
      this.predictDirection(this._tmp,0,this.muzzle);
      // A short, visible turn-to-fire preparation. No packet, voice, damage or
      // sustain payment exists until the final animated emitter can face it.
      if(this.faceOrigin||this.chest){
        const source=this.faceOrigin?c.parts.head:c.parts.torso;
        source.getWorldQuaternion(this._axialRotation);
        this._axialDirection.set(0,0,1).applyQuaternion(this._axialRotation);
        if(this._axialDirection.dot(this._tmp)<.995)return;
      }else if(!this._handsBraced(this._tmp))return;
      this._launchReady=true;
      // The manager can sample readiness before contacts/portals, but only the
      // beam's own payment turn may commit new energy. Another channel can
      // spend the shared ki pool earlier in the reverse update order.
      if(dt<=0)return;
      if(!c.energyInfinite&&this.kiPerSec*dt>c.ki){game.onDrained?.(c,this);this._dispose(game);return;}
      this.dir.copy(this._tmp);this.pn=2;this.grp.visible=true;
      this._voice=this.game.audio.beamVoice?this.game.audio.beamVoice(c.pos):null;
    }else{
      if(this._launchTarget)this.dir.copy(this._launchTarget).sub(this.muzzle).normalize();
      this._constrainAxial(this.dir,0);
    }
    this._launchResolved=true;this._launchTarget=null;
    if(this._chargedRelease){game.world.punch(.9);game.world.shake(.8);}
    // The first packets are born only after articulation. Constructor-time
    // sockets describe the preceding pose, not this command's actual emitter.
    this._streamOrigin.copy(this.muzzle);this._streamDir.copy(this.dir);
    for(let i=0;i<this.pn;i++){
      this.muzzle.toArray(this.path,i*3);
      this.pvel[i*3]=this.dir.x*this.tipSpeed;this.pvel[i*3+1]=this.dir.y*this.tipSpeed;this.pvel[i*3+2]=this.dir.z*this.tipSpeed;
    }
  }

  predictDirection(out, dt, emissionOrigin=this.muzzle) {
    this._predictSteering(out,dt,emissionOrigin);
    return this._constrainAxial(out,dt);
  }

  _predictSteering(out,dt,emissionOrigin=this.muzzle){
    const c=this.caster;
    if(!this._launchResolved)return this._launchTarget?out.copy(this._launchTarget).sub(emissionOrigin).normalize():out.copy(this._launchAim);
    const aimed=c.hasAimWorld ? _v2.copy(c.aimWorld).sub(emissionOrigin).normalize() : _v2.copy(c.aim3).normalize();
    const manager=this.game.projectiles;
    out.copy(manager?._predictingBatch&&this._directionBatch===manager._directionBatch?this._stepDirection:this.dir);
    if(aimed.lengthSq()>1e-8){
      if(out.lengthSq()<=1e-8)out.copy(aimed);
      else {
        this._steerRotation.setFromUnitVectors(out,aimed);
        this._steerStep.identity().slerp(this._steerRotation,clamp(1-Math.exp(-this.steer*dt),0,1));
        out.applyQuaternion(this._steerStep).normalize();
      }
    }
    return out;
  }

  _constrainAxial(out,dt){
    const c=this.caster;
    if(!this.faceOrigin||!c._openSky||!c.parts?.rig)return out;
    // Only a live chest emission owns this support. A charging chest, hand
    // power or released tail must not hold an independently firing head back.
    const manager=this.game.projectiles;
    const chest=manager?._predictingBatch&&this._directionBatch===manager._directionBatch?this._stepChest:this._findAxialSupport();
    if(!chest)return out;
    if(chest.pendingLaunch){
      // A preparing chest is turning the carrier, not emitting its requested
      // ray yet. Eyes can already fire within that carrier's actual neck cone.
      chest.caster.parts.torso.getWorldQuaternion(this._axialRotation);
      this._axialDirection.set(0,0,1).applyQuaternion(this._axialRotation);
    }else{
      chest.sampleMuzzle(this._axialOrigin);
      chest._predictSteering(this._axialDirection,dt,this._axialOrigin);
    }
    const angle=this._axialDirection.angleTo(out);
    if(angle>AXIAL_COFIRE_CONE){
      this._axialRotation.setFromUnitVectors(this._axialDirection,out);
      this._axialStep.identity().slerp(this._axialRotation,AXIAL_COFIRE_CONE/angle);
      out.copy(this._axialDirection).applyQuaternion(this._axialStep).normalize();
    }
    return out;
  }

  _findAxialSupport(){
    if(!this.faceOrigin||!this.caster._openSky||!this.caster.parts?.rig)return null;
    for(const key in this.caster.slots){const s=this.caster.slots[key],b=s.active;if(s.def.chest&&!s.def.faceOrigin&&b instanceof BeamHose&&b.sustaining&&!b.dead)return b;}
    return null;
  }

  clipReceivers(game=this.game){
    this._bodyContact.fighter=null;this._bodyContact.naniteContact=null;
    if(this.pierceFighters||this.pendingLaunch||this.pn<2||!beamBodyContact(this,game,this._bodyContact,1,true))return false;
    const hit=this._bodyContact;
    this.pn=hit.index+1;hit.point.toArray(this.path,hit.index*3);
    this._absorbed[hit.index]=hit.fighter;
    // Preserve every original pvel entry. An absorbed endpoint may resume
    // traveling if the receiver leaves; it never learns a new direction.
    return true;
  }

  _clipPacketReceiver(game,a,b){
    if(this.pierceFighters)return null;
    a.toArray(this._bodySweep.path,0);b.toArray(this._bodySweep.path,3);
    if(!beamBodyContact(this._bodySweep,game,this._sweepContact,1,true))return null;
    const hit=this._sweepContact,held=this._packetContact;
    b.copy(hit.point);held.fighter=hit.fighter;held.naniteContact=hit.naniteContact;
    held.point.copy(hit.point);held.surface.copy(hit.surface);held.direction.copy(hit.direction);
    return hit.fighter;
  }

  clipForContacts(game=this.game){
    // Receivers can enter an already-long stream between updates. Bound that
    // stored field BEFORE clash payment or projectile interception can use its
    // now-occluded tail. Normal update still owns emission, damage and VFX.
    this._constructPreclip.target=null;
    if(this.pendingLaunch||this.dead)return;
    for(let i=1;i<this.pn;i++){
      this._pa.fromArray(this.path,(i-1)*3);this._pb.fromArray(this.path,i*3);
      if(this._clipStreamSegment(game.world,this._pa,this._pb,true)){
        this._pb.toArray(this.path,i*3);this.pn=i+1;
        if(this._obstacleContact.target?.onConstructHit){
          this._constructPreclip.target=this._obstacleContact.target;
          this._constructPreclip.point.copy(this._pb);this._constructPreclip.arc=this._arcLen();
        }
        break;
      }
    }
    this.clipReceivers(game);
  }

  update(dt, game) {
    const c = this.caster;
    const sourceScale=game.timeFields?.scaleFor(c)??1,sourceDt=dt*sourceScale;
    const constructPreclip=this._constructPreclip,constructTarget=constructPreclip.target;constructPreclip.target=null;
    // A spatial clock can hold energy up to 1/.15 times longer. Keep the same
    // emission cadence and authored reach instead of dropping the slow tip.
    if(game.timeFields?.list.length&&this.NODES===44){
      const capacity=Math.ceil(44/.15),path=new Float32Array(capacity*3),velocity=new Float32Array(capacity*3);
      path.set(this.path);velocity.set(this.pvel);this.path=path;this.pvel=velocity;
      this._absorbed.length=capacity;this._absorbed.fill(null,44);this.NODES=capacity;
      this._curve=this._combatReadability?new BeamCurve(capacity):null;
      this._glowGeo.dispose();this._coreGeo.dispose();
      this._glowGeo=this._tubeGeo((this._curve?.capacity||capacity)+1,this.RADIAL);
      this._coreGeo=this._tubeGeo((this._curve?.capacity||capacity)+1,this.RADIAL,true);
      this.glow.geometry=this._glowGeo;this.core.geometry=this._coreGeo;
    }
    if(this.pendingLaunch&&(!this.sustaining||!c.alive||remoteInterrupted(c)||c.guarding)){this._dispose(game);return false;}
    const firstEmission=this.pendingLaunch;
    this.resolveLaunch(game,sourceDt);
    if(this.dead)return false;
    if(this.pendingLaunch){c.state='cast';c.stateT=0;c._castPoseRanged=true;return true;}
    // Remote sustain cannot outlive a broken casting stance. Previously frozen
    // input skipped controlPlayer while this emitter kept paying/firing forever.
    // Existing packets retain their path and finish through the ordinary fade.
    if(this.remoteDetonate && remoteInterrupted(c))this.end();
    // ran out of ki mid-beam → the beam dies, but LOUDLY (fizzle cue), never silently
    if (this.sustaining && c.alive && !c.energyInfinite && this.kiPerSec * sourceDt > c.ki) { if (game.onDrained) game.onDrained(c,this); this.sustaining = false; }
    if (this.sustaining && c.alive && c.spendKi(this.kiPerSec * sourceDt)) {
      this.emissionAge+=sourceDt;
      this.investedKi+=this.kiPerSec*sourceDt;
      c.state = 'cast'; c.stateT = 0;c._castPoseRanged=true;
      this.sampleMuzzle(this.muzzle);
      // Spherical steering also turns through an exact reversal. Normalized
      // vector lerp stays stuck on the old axis when the inputs are antipodal.
      // Only new emission turns; packets already in flight retain their velocity.
      if(!firstEmission){
        this.predictDirection(this.dir,sourceDt);
        // Planning still pursues the command through the hose's steering rate.
        // Commit new axial energy only after the final anatomical pose exists.
        // Never rotate the velocities of packets already in flight.
        if(this._poseLaunch&&(this.faceOrigin||this.chest)&&c._combatPoseVersion!==this._emittedPoseVersion){
          const source=this.faceOrigin?c.parts.head:c.parts.torso;
          source.getWorldQuaternion(this._axialRotation);
          this.dir.set(0,0,1).applyQuaternion(this._axialRotation).normalize();
        }
      }
      // Simulation-only manager steps have no newly articulated source. Keep
      // their ordinary steering semantics instead of replaying a stale pose.
      this._emittedPoseVersion=c._combatPoseVersion;
      this.tipDist = Math.min(this.maxLen, this.tipDist + this.tipSpeed * sourceDt);
      // Casting mobility belongs to Fighter.move's authored wish-speed scale,
      // never per-beam velocity multiplication (which stacked and varied by Hz).
      // DRIVE THE VOICE. A beam that is LOSING a clash strains upward — the ring mod climbs and
      // the hiss opens, so you can hear which way a beam struggle is going without looking.
      if (this._voice) {
        let I = 0.75 + Math.min(0.5, this.power * 0.25);
        if (this.clashing) I += (this._clashT < 0.5 ? (0.5 - this._clashT) : 0) * 1.6;
        this._voice.set(I, c.pos);
      }
    } else {
      this.sustaining = false;
      this.endT += dt;
      if (this._voice) this._voice.set(0.08, c.pos);
    }

    // ---- ADVANCE THE STREAM. Every emitted packet keeps travelling along the direction it was
    // born with; nothing already in flight is re-aimed. This loop is the whole feature.
    this._packetContact.fighter=null;this._packetContact.naniteContact=null;
    for (let i = 0; i < this.pn; i++) {
      const o = i * 3;
      this._pa.fromArray(this.path,o);
      advanceFieldPacket(this._pb,this._pa,this._tmp.fromArray(this.pvel,o),dt,game.timeFields,c);
      // Spatial segment checks alone miss a released tail that moves completely
      // across a thin wall between frames. Every packet must sweep its own trip.
      this._clipStreamSegment(game.world,this._pa,this._pb);
      this._absorbed[i]=this._clipPacketReceiver(game,this._pa,this._pb);
      this._pb.toArray(this.path,o);
    }
    // ---- EMIT on a fixed time cadence. Node 0 is the live hand; nodes 1+ are
    // independent packets. Per-frame insertion made a 150u beam only 43u at 120Hz.
    // Interpolate births within this step, then advance each newborn by its age.
    this._streamClock+=this.sustaining?sourceDt:dt;
    if (this.sustaining) {
      const N = this.NODES;
      while(this._streamClock+1e-10>=this._streamStep){
        this._streamClock=Math.max(0,this._streamClock-this._streamStep);
        if(this.pn<N)this.pn++;
        for(let i=this.pn-1;i>1;i--){
          const d0=i*3,s0=(i-1)*3;
          this.path[d0]=this.path[s0];this.path[d0+1]=this.path[s0+1];this.path[d0+2]=this.path[s0+2];
          this.pvel[d0]=this.pvel[s0];this.pvel[d0+1]=this.pvel[s0+1];this.pvel[d0+2]=this.pvel[s0+2];
          this._absorbed[i]=this._absorbed[i-1];
        }
        const age=this._streamClock/sourceScale,t=clamp(1-age/(dt||1),0,1);
        this._tmp.copy(this._streamDir).lerp(this.dir,t).normalize().multiplyScalar(this.tipSpeed);
        this.pvel[3]=this._tmp.x;this.pvel[4]=this._tmp.y;this.pvel[5]=this._tmp.z;
        this._pa.copy(this._streamOrigin).lerp(this.muzzle,t);
        advanceFieldPacket(this._pb,this._pa,this._tmp,age,game.timeFields,c);
        this._clipStreamSegment(game.world,this._pa,this._pb);
        this._absorbed[1]=this._clipPacketReceiver(game,this._pa,this._pb);
        this._pb.toArray(this.path,3);
      }
      this.path[0] = this.muzzle.x; this.path[1] = this.muzzle.y; this.path[2] = this.muzzle.z;
      this._absorbed[0]=null;
      this.pvel[0] = this.dir.x * this.tipSpeed;
      this.pvel[1] = this.dir.y * this.tipSpeed;
      this.pvel[2] = this.dir.z * this.tipSpeed;
      this._streamOrigin.copy(this.muzzle);this._streamDir.copy(this.dir);
    } else if (this.pn > 2) {
      // released: the stream keeps flying and eats itself from the hand end, so a beam you stop
      // firing travels away instead of vanishing
      while(this._streamClock>=this._streamStep&&this.pn>2){
       this._streamClock-=this._streamStep;
       for (let i = 0; i < this.pn - 1; i++) {
        const d0 = i * 3, s0 = (i + 1) * 3;
        this.path[d0] = this.path[s0]; this.path[d0 + 1] = this.path[s0 + 1]; this.path[d0 + 2] = this.path[s0 + 2];
        this.pvel[d0] = this.pvel[s0]; this.pvel[d0 + 1] = this.pvel[s0 + 1]; this.pvel[d0 + 2] = this.pvel[s0 + 2];
        this._absorbed[i]=this._absorbed[i+1];
       }
       this.pn--;
      }
    }
    if (this.pn === 0) {                                  // first frame: seed a two-node stub
      this.path[0] = this.muzzle.x; this.path[1] = this.muzzle.y; this.path[2] = this.muzzle.z;
      this.pvel[0] = this.dir.x * this.tipSpeed; this.pvel[1] = this.dir.y * this.tipSpeed; this.pvel[2] = this.dir.z * this.tipSpeed;
      this.pn = 1;
    }

    // ---- trim to the weapon's reach, measured along the ACTUAL path. A curved beam that has been
    // swung around covers more ground than a straight one and must not out-range itself.
    let arc = 0, keep = this.pn;
    for (let i = 1; i < this.pn; i++) {
      const a0 = (i - 1) * 3, b0 = i * 3;
      arc += Math.hypot(this.path[b0] - this.path[a0], this.path[b0 + 1] - this.path[a0 + 1], this.path[b0 + 2] - this.path[a0 + 2]);
      if (arc > this.maxLen) { keep = i; break; }
    }
    this.pn = Math.max(2, keep);

    // ---- resolve blocking PER SEGMENT along the path. ⚠ This replaces a single ray from the
    // muzzle: a bent beam can pass a wall its own root is behind, and testing only the emission
    // direction would let it clip through geometry it visibly curves around.
    this._groundResidue.begin(dt);
    const groundClash=this.clashing||this.clashLen!=null;
    this.blocked = false; let blockedCov = null,blockedPoint=null,blockedArc=0;
    for (let i = 1; i < this.pn && !this.blocked; i++) {
      const a0 = (i - 1) * 3, b0 = i * 3;
      this._pa.fromArray(this.path,a0);this._pb.fromArray(this.path,b0);
      if(this._clipStreamSegment(game.world,this._pa,this._pb,true)){
        this._pb.toArray(this.path,b0);this.pn=i+1;this.blocked=true;
        // One nearest query across cover AND interiors: array order must never
        // let the stream damage an object hidden behind an earlier wall.
        if(this._obstacleContact.kind==='ground')this._groundResidue.capture(this._pb,this._arcLen());
        if(this._obstacleContact.kind==='cover'){
          blockedCov=this._obstacleContact.target;
          if(blockedCov.onConstructHit){blockedPoint=this._constructBlockedPoint.copy(this._pb);blockedArc=this._arcLen();}
        }
      }
    }
    this.pn = Math.max(2, this.pn);
    // The prepass can have used a larger Float32 skin on the untrimmed segment.
    // Retain its proven surface only if this update still ends at the SAME arc
    // and point. This never pulls a discarded far receiver to a new near tip.
    if(!this.blocked&&constructTarget&&!constructTarget.construct.dead&&
      this._tmp.fromArray(this.path,(this.pn-1)*3).distanceToSquared(constructPreclip.point)<1e-6&&
      Math.abs(this._arcLen()-constructPreclip.arc)<1e-4){
      this.blocked=true;blockedCov=constructTarget;blockedPoint=constructPreclip.point;blockedArc=constructPreclip.arc;
    }
    // Ordinary output is absorbed by the first physical receiver, not drawn
    // through every body on the path. Only already-traveled energy can touch;
    // leaving the lane frees a tip that must travel onward again.
    let bodyHit=this.clipReceivers(game);
    // The last released packets can collapse onto the same absorbing surface.
    // That zero-length field has no segment to query, but this frame's swept
    // contact is still real. Keep its compressed cap through the ordinary fade.
    const held=this._packetContact;
    if(!bodyHit&&held.fighter&&(!held.naniteContact||validNaniteContact(held.fighter,held.naniteContact))&&this._tmp.fromArray(this.path,(this.pn-1)*3).distanceToSquared(held.point)<1e-6){
      const hit=this._bodyContact;hit.fighter=held.fighter;hit.naniteContact=held.naniteContact;
      hit.point.copy(held.point);hit.surface.copy(held.surface);hit.direction.copy(held.direction);bodyHit=true;
    }
    if(bodyHit){
      this.blocked=false;blockedCov=null;
    }
    const tipI = (this.pn - 1) * 3;
    const tipPos = _v.set(this.path[tipI], this.path[tipI + 1], this.path[tipI + 2]);
    const tipDt=dt*(game.timeFields?.scaleAt(tipPos,c)??1);
    let len = this._arcLen();
    // Once every released packet has been absorbed there is no moving energy
    // left to render. Retaining a degenerate cap lets an advancing body swallow
    // yesterday's contact point for the rest of the fade.
    if(!this.sustaining&&bodyHit&&len<1e-5){this._dispose(game);return false;}
    // Collision clipping wins over a previously established contact knot. A new
    // wall (or a moving caster behind cover) must not turn the pin into tunneling.
    if((this.blocked||bodyHit) && this.clashing){
      this.clashing=false;this.clashLen=null;
      const other=this._clashOther;this._clashOther=null;
      if(other){other.clashing=false;other.clashLen=null;other._clashOther=null;}
    }
    // beam-clash pins the struggle point: trim the path to that arc length rather than to a ray
    if(this.clashing){
      pinBeamContact(this,this._clashContact);
      tipPos.copy(this._clashContact);len=this._arcLen();
    } else if (this.clashLen != null) {
      let a2 = 0, cut = this.pn;
      for (let i = 1; i < this.pn; i++) {
        const p0 = (i - 1) * 3, p1 = i * 3;
        a2 += Math.hypot(this.path[p1] - this.path[p0], this.path[p1 + 1] - this.path[p0 + 1], this.path[p1 + 2] - this.path[p0 + 2]);
        if (a2 >= this.clashLen) { cut = i + 1; break; }
      }
      this.pn = Math.max(2, Math.min(this.pn, cut));
      const ti = (this.pn - 1) * 3;
      tipPos.set(this.path[ti], this.path[ti + 1], this.path[ti + 2]);
      len = this.clashLen;
    }
    this._groundResidue.emit(game,tipPos,this._arcLen(),this.radius,this.sustaining,groundClash||bodyHit);
    len = Math.max(0.1, len);
    // sustained beams carve through cover
    if(this.sustaining&&dt>0&&blockedCov?.onConstructHit){
      // A candidate farther along the hose can be discarded by a body or clash
      // cutoff. Bill only the unchanged reached endpoint, never the aim ray.
      if(blockedPoint.distanceToSquared(tipPos)<1e-6&&Math.abs(this._arcLen()-blockedArc)<1e-4)
        blockedCov.onConstructHit(this.dps*c.powerBuff*tipDt,{src:c,pos:blockedPoint,lane:'beam'});
    } else if (this.sustaining && blockedCov && blockedCov.hp > 0) {
      blockedCov.hp -= this.dps * 2 * tipDt;
      game.world.setBlockCracks(blockedCov);
      if (Math.random() < 0.4) game.particles.burst(tipPos.x, tipPos.y, tipPos.z, { count: 2, speed: 14, life: 0.3, size: 2.4, color: ['#3a3a44', this.color, '#fff'], drag: 2 });
      if (blockedCov.hp <= 0) game.shatterBlock(blockedCov, this.caster);   // a beam that cuts a fuel tank owns what comes out of it
    }

    // SWEEP the two tubes along the path. No orientation, no scale — the shape IS the path, which
    // is the point: a beam that has been swung has a bend in it and both layers carry it.
    const fade = this.sustaining ? 1 : Math.max(0, 1 - this.endT / 0.18);
    if(this._surfaceTime)this._surfaceTime.value=game.time;
    const B = this.build;
    const renderCurve=this._curve?.update(this.path,Math.max(2,this.pn),this.sustaining?this.dir:null,this.radius);
    this._sweep(this._coreGeo, this.radius * B.coreR, 1,renderCurve);
    this._sweep(this._glowGeo, this.radius * 1.5 * (0.9 + Math.sin(game.time * 40) * 0.1), B.flare,renderCurve);
    this.core.material.opacity = 0.95 * fade; this.glow.material.opacity = (this._combatReadability ? Math.max(.34,B.sheath) : B.sheath) * fade;
    const tipRadius=this._combatReadability
      ? Math.min(this.radius*Math.min(1.4,1.1*B.tip),this.radius*.3+Math.min(this.tipDist,len)*.3,len*.5)
      : this.radius*1.8*B.tip;
    // A launch bulb wider than its traveled distance swallowed the caster in rear view.
    // Fit the CURRENT field, not accumulated tipDist: absorption can shorten a
    // mature beam to a few units, then a departing/grazing body exposes its free
    // tip again. Historical travel must not inflate a sphere around the caster.
    // Retain charge-scaled width and the full hit volume.
    this.tip.position.copy(tipPos); this.tip.scale.setScalar(tipRadius*fade);
    this.tip.quaternion.identity();
    if(bodyHit){
      const hit=this._bodyContact,gap=hit.point.distanceTo(hit.surface);
      // A compressed impact cap bridges the existing collision envelope to the
      // near body surface. Its narrow depth/radial extent cannot bloom through
      // the victim like the old far-end sphere. This is contact VFX, not new
      // energy packets secretly extended beyond their traveled path.
      this.tip.position.copy(hit.point).lerp(hit.surface,.5);
      this._tmp.copy(hit.surface).sub(hit.point).normalize();
      if(this._tmp.lengthSq()<1e-8)this._tmp.copy(hit.direction);
      this.tip.quaternion.setFromUnitVectors(_AZ,this._tmp);
      const spread=Math.min(this.radius*.75,hit.fighter.radius*.8);
      this.tip.scale.set(spread,spread,gap*.5+Math.min(.25,this.radius*.15)).multiplyScalar(fade);
    }
    if (this.detail) {
      // THE DETAIL LAYER, in WORLD space: two perpendiculars off the beam direction, then each
      // temper decides where along and around the beam its elements sit and how big they are.
      // Everything below is (t along the beam, ca/sa across it, scale) — seven behaviours, one loop.
      // ⚠ THE DETAIL RIDES THE PATH, NOT THE AIM. It used to be placed as (muzzle + dir * t * L),
      // which is a straight line — so a bent beam had its helix, its kinks and its pressure rings
      // hanging in the air beside it. `along` is now an index into the live path.
      const T = this.temper, N = T.n, R = this.radius * (this._combatReadability ? .72 : 2.1) * T.amp;
      const clock = game.time * T.rate, kind = T.detail;
      const pathAt = (u) => {
        const f = Math.max(0, Math.min(1, u)) * (this.pn - 1);
        const i0 = Math.floor(f), i1 = Math.min(this.pn - 1, i0 + 1), k = f - i0;
        const a0 = i0 * 3, b0 = i1 * 3;
        this._pb.set(
          this.path[a0] + (this.path[b0] - this.path[a0]) * k,
          this.path[a0 + 1] + (this.path[b0 + 1] - this.path[a0 + 1]) * k,
          this.path[a0 + 2] + (this.path[b0 + 2] - this.path[a0 + 2]) * k);
        // local tangent, for the cross-section offsets
        this._tan.set(this.path[b0] - this.path[a0], this.path[b0 + 1] - this.path[a0 + 1], this.path[b0 + 2] - this.path[a0 + 2]);
        if (this._tan.lengthSq() < 1e-8) this._tan.copy(this.dir);
        this._tan.normalize();
        return this._pb;
      };
      for (let i = 0; i < N; i++) {
        const t2 = N > 1 ? i / (N - 1) : 0;
        let ca = 0, sa = 0, sc = 0.42, along = t2;
        if (kind === 'helix') {                       // wound 3.5 turns down the length — it BORES
          const a2 = t2 * Math.PI * 7 + clock; ca = Math.cos(a2) * R; sa = Math.sin(a2) * R;
        } else if (kind === 'kink') {                 // electricity: a jagged path re-cut every frame
          const j = Math.sin(i * 12.9898 + Math.floor(clock)) * 43758.5453;
          const a2 = (j - Math.floor(j)) * 6.2831;
          const w = R * (0.35 + (i % 3) * 0.33);
          ca = Math.cos(a2) * w; sa = Math.sin(a2) * w; sc = 0.5;
        } else if (kind === 'wave') {                 // sorcery: one travelling lateral wave
          const ph = t2 * 5.4 - clock; ca = Math.sin(ph) * R; sa = Math.cos(ph * 0.5) * R * 0.28; sc = 0.46;
        } else if (kind === 'roil') {                 // fire: licks outward, widest at the far end
          const a2 = i * 2.399 + clock; const w = R * (0.25 + t2 * 0.95);
          ca = Math.cos(a2) * w; sa = Math.sin(a2) * w; sc = 0.36 + t2 * 0.5;
        } else if (kind === 'crystal') {              // ice: facets SNAP between positions
          const step = Math.floor(clock) * 0.7;
          const a2 = i * 1.7 + step; ca = Math.cos(a2) * R * 0.8; sa = Math.sin(a2) * R * 0.8; sc = 0.62;
        } else if (kind === 'surge') {                // light: bright pulses running out
          along = (t2 + clock * 0.22) % 1;
          const pulse = 0.5 + 0.5 * Math.cos((along * 3 - clock * 0.5) * 6.2831);
          sc = 0.3 + pulse * 0.85;
        } else if (kind === 'ring') {                 // pressure: compressed rings rolling down it
          along = (t2 + clock * 0.16) % 1;
          const a2 = i * 2.0944; ca = Math.cos(a2) * R * 0.9; sa = Math.sin(a2) * R * 0.9;
          sc = 0.5 + Math.sin(along * 6.2831) * 0.22;
        }
        const P = pathAt(along);
        const d = this._tan;
        const axx = Math.abs(d.y) > 0.9 ? 1 : 0, axy = Math.abs(d.y) > 0.9 ? 0 : 1;
        let e1x = axy * d.z - 0 * d.y, e1y = 0 * d.x - axx * d.z, e1z = axx * d.y - axy * d.x;
        const e1l = Math.hypot(e1x, e1y, e1z) || 1; e1x /= e1l; e1y /= e1l; e1z /= e1l;
        const e2x = d.y * e1z - d.z * e1y, e2y = d.z * e1x - d.x * e1z, e2z = d.x * e1y - d.y * e1x;
        const detailScale=sc*(this._combatReadability ? Math.min(1,this.radius) : 1);
        if(this._combatReadability){
          // Close-view detail is flow inside the sheath, not detached orbiting balls.
          this._sm.makeRotationFromQuaternion(_q.setFromUnitVectors(_AZ,d));
          this._sm.scale(this._sv.set(detailScale*.16,detailScale*.16,detailScale*.95));
        }else this._sm.makeScale(detailScale, detailScale, detailScale);
        this._sm.setPosition(
          P.x + e1x * ca + e2x * sa,
          P.y + e1y * ca + e2y * sa,
          P.z + e1z * ca + e2z * sa);
        this.detail.setMatrixAt(i, this._sm);
      }
      this.detail.instanceMatrix.needsUpdate = true;
      this.detail.material.opacity = (this._combatReadability ? .55 : .9) * fade;
    }
    this.tip.material.opacity = (this._combatReadability ? .5 : .82) * fade;
    for(const mesh of [this.core,this.glow,this.tip,this.detail])if(mesh)mesh.userData.beamOpacity=mesh.material.opacity;
    this.light.position.copy(tipPos); this.light.intensity = 5 * this.power * fade;
    this.light.distance=60;
    if((bodyHit||this.blocked)&&this._combatReadability){
      // Reuse the tip lamp at the physical surface. Placing it inside the
      // collision envelope illuminates the far side and loses the impact.
      // A short reach reveals the receiver without washing the whole field.
      const inset=Math.min(.8,.3+this.radius*.12);
      if(bodyHit){
        const hit=this._bodyContact;this.light.position.copy(hit.surface).addScaledVector(hit.direction,-inset);
      }else{
        this._pa.fromArray(this.path,Math.max(0,this.pn-2)*3);
        this._tan.copy(tipPos).sub(this._pa).normalize();
        this.light.position.addScaledVector(this._tan,-inset);
      }
      this.light.intensity=Math.min(120,30*Math.sqrt(this.radius)*Math.min(2,this.power)*this.impactGlow)*fade;
      this.light.distance=clamp(14+this.radius*6,16,42);
    }
    const sourceOn=this.sustaining&&c.alive&&this.emissionAge>0&&this.sourceGlow>0;
    this.source.visible=sourceOn;
    if(sourceOn){
      const pulse=.95+.05*Math.sin(this.emissionAge*22);
      // Optics stay a small aperture; charge-scaled hand/chest beams can have a
      // larger bulb without swallowing the whole silhouette from behind.
      const size=(this.faceOrigin?Math.min(.22,this.radius*.35):Math.min(1.6,this.radius*.65))*this.sourceScale;
      this.source.position.copy(this.muzzle);this.source.scale.setScalar(size*pulse);
      this.source.material.opacity=Math.min(.95,.75*this.sourceGlow);
      // Optional source illumination may use an idle lamp, never steal a busy
      // contact lamp or increase the scene's fixed shader light count.
      if(this.sourceLight&&this.sourceLight.userData.vfxLease!==this._sourceLightLease)this.sourceLight=null;
      if(!this.sourceLight&&(!game.vfx.lightPool||game.vfx.lightPool.length)){
        this.sourceLight=game.vfx.borrowLight(this.color,0,26);this._sourceLightLease=this.sourceLight.userData.vfxLease;
      }
      if(this.sourceLight){this.sourceLight.position.copy(this.muzzle);this.sourceLight.intensity=40*this.sourceGlow*Math.min(2,this.power)*pulse;}
    }else if(this.sourceLight){if(this.sourceLight.userData.vfxLease===this._sourceLightLease)game.vfx.returnLight(this.sourceLight);this.sourceLight=null;}

    this._sparkClock+=dt;
    const emitSparks=!this._combatReadability||this._sparkClock>=1/24;
    if(emitSparks)this._sparkClock%=1/24;

    if (this.sustaining) {
      // damage along the beam
      for (const f of game.entities) {
        if (!canReceiveShot(game,c,f)) continue;
        if(!this.pierceFighters&&(!bodyHit||f!==this._bodyContact.fighter))continue;
        // ⚠ CLOSEST POINT ON THE WHOLE POLYLINE, not on one ray from the hand. The beam bends, so
        // the hitbox has to bend with it or the damage and the picture disagree — and the picture
        // is what the player is reading.
        const fy = f.pos.y + 5.2-(f._crouchPose?.drop||0);
        let dd = 1e9, hx = 0, hy = 0, hz = 0, hdx = 0, hdy = 0, hdz = 0;
        for (let i = 1; i < this.pn; i++) {
          const a0 = (i - 1) * 3, b0 = i * 3;
          const ax = this.path[a0], ay = this.path[a0 + 1], az = this.path[a0 + 2];
          const sx = this.path[b0] - ax, sy = this.path[b0 + 1] - ay, sz = this.path[b0 + 2] - az;
          const sl2 = sx * sx + sy * sy + sz * sz || 1;
          let t = ((f.pos.x - ax) * sx + (fy - ay) * sy + (f.pos.z - az) * sz) / sl2;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const px = ax + sx * t, py = ay + sy * t, pz = az + sz * t;
          const d2 = Math.hypot(f.pos.x - px, fy - py, f.pos.z - pz);
          if(d2<dd&&d2<this.radius+f.radius+1){
            // Contact padding cannot reach through a nearby wall. Consider each
            // candidate: a hidden nearest segment must not veto an exposed part
            // of the same curved hose that legitimately wraps around cover.
            this._pa.set(px,py,pz);this._pb.set(f.pos.x,fy,f.pos.z);
            if(sweepSplitObstacle(game.world,this._pa,this._pb,0,this._obstacleContact,false))continue;
            dd=d2;hx=px;hy=py;hz=pz;hdx=sx;hdy=sy;hdz=sz;
          }
        }
        if(bodyHit&&f===this._bodyContact.fighter){
          const hit=this._bodyContact;
          // Analytic entry is exactly on the envelope. A Float32 round-trip
          // must not turn this accepted contact into an every-other-frame miss.
          dd=0;hx=hit.surface.x;hy=hit.surface.y;hz=hit.surface.z;
          hdx=hit.direction.x;hdy=hit.direction.y;hdz=hit.direction.z;
        }
        if (dd < this.radius + f.radius + 1) {
          // src+dot so GUARD can block beams (drains guard over time)
          // The hose already emits contact sparks below. Claim that feedback
          // so PowerWorld's generic onHit flash does not stack a glowing sphere
          // and point light on the opponent on every damage tick.
          this._tmp.set(hx,hy,hz);
          const contactDt=dt*(game.timeFields?.scaleAt(this._tmp,c)??1);
          const damageOpts={src:c,dot:true,contactFx:true,contactPoint:this._tmp,dtype:this.dtype,siphon:this.siphon,hitstop:0,
            beamDelta:contactDt,beamGuardChip:this.guardChip,beamGuardDrain:this.guardDrain,
            naniteContact:bodyHit&&f===this._bodyContact.fighter?this._bodyContact.naniteContact:null};
          const dealt=f.takeDamage(this.dps*c.powerBuff*contactDt,damageOpts);
          // The damage result owns acceptance: Studio's onHit restores target
          // health before this call returns. Remote authority and rejected
          // immunity/phase hits cannot claim a local body-contact response.
          const contactClock=(this._contactClock??=new Map()),contactAge=(contactClock.get(f)??0)+contactDt;contactClock.set(f,contactAge);
          const damaged=!f.remote&&Number.isFinite(dealt)&&dealt>0;
          const metal=damageOpts.naniteResult?.integrity>0;
          const guardContact=damageOpts.beamBlocked===true;
          if((damaged||metal||guardContact)&&contactAge+1e-8>=(this._contactNext.get(f)??0)){
            const interval=.18;
            this._contactNext.set(f,contactAge+interval);
            this._tmp.set(hx,hy,hz);this._tan.set(hdx,hdy,hdz).normalize();
            if(metal)this._tan.copy(damageOpts.naniteContact.normal);
            const color=metal?'#bdc2b8':guardContact?(f.def.guardType==='deflect'?'#ffd24a':'#bfe0ff'):this.color;
            const power=clamp(dealt/Math.max(contactDt,1e-6)/80,.35,.8)*(guardContact?.65:1);
            game.vfx.contact?.(this._tmp,this._tan,{color,power,pressure:true,radius:this.radius});
            if(guardContact)game.audio.zap?.(620,this._tmp);
            else game.audio.impact?.(.24+power*.25,this._tmp);
            // Scale by a fixed contact window, not this display frame's tiny
            // damage tick. Generic DoTs remain suppressed by the reaction seam.
            if(damaged)queueHitReaction(f,dealt/Math.max(contactDt,1e-6)*interval,
              {src:c,dot:true,beamContact:true,blocked:guardContact,kb:this._tan});
          }
          // ---- THE PRESSURE LADDER (manual §9): what a beam DOES to you depends on who you are.
          // press = the beam's authority · hold = strength + a raised guard. The outcomes, weakest
          // to strongest: LAUNCHED off your feet → PUSHED sliding back → HOLD your ground →
          // WALK FORWARD INTO IT, eating the damage. The old constant shove died against move()'s
          // walk-speed clamp every frame — burstT lifts the clamp, which is what makes the slide real.
          if ((damaged||guardContact) && f.alive && f.state !== 'ko' && this.pushForce>0) {
            const blocked = guardContact;
            const press = Math.min((this.dps * c.powerBuff) / 24, 1.25);       // capped so the TOP of the roster can wade through anything
            const hold = (f.strength ?? 5) / 10 + (blocked ? 0.4 : 0) + (f.def.metal ? 0.15 : 0);
            if (hold < press * 0.85) {
              const shove = (press * 0.85 - hold) * this.pushForce * (blocked?.2:1);
              this._tan.set(hdx,hdy,hdz).normalize();
              f.vel.addScaledVector(this._tan,shove*contactDt);
              f.burstT = Math.max(f.burstT || 0, 0.09);                        // the clamp-lift — same mechanism as the dash
              f._beamPressT = (f._beamPressT || 0) + contactDt;
              if (!blocked && press > hold * 1.8 && f._beamPressT > 0.45) {    // the weak get BLASTED off their feet
                f._beamPressT = 0;
                const launchScale=Math.min(1,this.pushForce/368);
                f.vel.addScaledVector(this._tan,34*launchScale); f.vel.y += 11*launchScale;
                // ⚠ this writes launchT directly instead of going through takeDamage, so it has to
                // know about the dimension's longer window itself or a beam-launch would brake three
                // times sooner than a punch-launch in the same fight (manual §47).
                f.launchT = f._chaseKb ? PW_KB.window : 1.1;                   // walls become weapons (slam physics)
              }
            } else f._beamPressT = 0;
          }
          // the contact spark belongs at the CLOSEST POINT ON THE CURVE (hx/hy/hz), which is what
          // the per-segment search above returns — `px` was the old single-ray local and is gone.
          if(damaged&&emitSparks)game.particles.burst(hx, hy, hz, { count: 2, speed: 12, life: this._combatReadability ? .16 : .3, size: this._combatReadability ? .7 : 2, color: guardContact?['#bfe0ff']:this._combatReadability?[this.color]:['#fff', this.color], dir: { x: -hdx, z: -hdz }, spread: 1.4 });
        }
      }
      // ⚠ A BEAM CUTS A THROWN CAR TOO (manual §47). The same one door as the projectile path, so a
      // flung prop cannot be shootable by one weapon class and not another — but tested against the
      // TIP ONLY, not the whole polyline: a sustained beam sweeping across the sky would otherwise
      // shear anything that drifted near any part of its length, and the shot you want to reward is
      // the one you PUT on the object. Empty array in the city; one length check.
      if (game._flung && game._flung.length) game.hitFlung(c, this.tip.position, this.radius + 2.5, this.dps * c.powerBuff * tipDt);
      // tip fx + muzzle fx  (read tip from mesh — the damage loop reused the _v temp)
      const tp = this.tip.position;
      if (emitSparks&&Math.random() < 0.8) game.particles.burst(tp.x, tp.y, tp.z, { count: 3, speed: 16, life: 0.3, size: this._combatReadability?Math.min(1.1,this.radius*.4):this.radius*1.6, color: this._combatReadability?[this.color,this.color2]:['#fff',this.color,this.color2], drag: 3 });
      if(emitSparks)game.particles.burst(this.muzzle.x, this.muzzle.y, this.muzzle.z, { count: 2, speed: 10, life: 0.25, size: this._combatReadability?Math.min(1,this.radius*.4):this.radius, color: this._combatReadability?[this.color,this.color2]:[this.color2,'#fff'], drag: 4 });
      if (emitSparks&&this.blocked) game.particles.burst(tp.x, tp.y, tp.z, { count: 4, speed: 20, life: 0.3, size: this._combatReadability?1:2.4, color: ['#fff', this.color], dir: { x: -this.dir.x, z: -this.dir.z }, spread: 1.2 });
      if (Math.random() < 0.15) game.world.shake(0.1 * this.power);
    }

    if (!this.sustaining && this.endT >= 0.18) { this._dispose(game); return false; }
    return true;
  }
  _clipStreamSegment(world,a,b,storedPath=false){
    // Packet endpoints are stored in Float32Array. A correctly stopped packet
    // can round just outside its contact plane; include two ULPs in the spatial
    // re-query on EVERY axis so rounding cannot flicker wall sparks or cover
    // damage. Expanding XZ alone loses rounded roof/underside contacts.
    // Temporal motion keeps the exact radius; the skin only retreats the path.
    const skin=storedPath?Math.max(1e-5,Math.abs(a.x),Math.abs(a.y),Math.abs(a.z),Math.abs(b.x),Math.abs(b.y),Math.abs(b.z))*2**-22:0;
    if(!sweepSplitObstacle(world,a,b,this.radius+skin,this._obstacleContact,!!world._ghTriangles,skin))return false;
    b.lerpVectors(a,b,this._obstacleContact.t);return true;
  }
  _dispose(game) { if (this.dead) return; this.dead = true; this._groundResidue.reset(); if (this._voice) { this._voice.stop(); this._voice = null; } game.scene.remove(this.grp); [this.glow, this.core, this.tip,this.source].forEach(m => m.material.dispose()); if (this.detail) this.detail.material.dispose(); if (this._glowGeo) this._glowGeo.dispose(); if (this._coreGeo) this._coreGeo.dispose(); game.vfx.returnLight(this.light);if(this.sourceLight){if(this.sourceLight.userData.vfxLease===this._sourceLightLease)game.vfx.returnLight(this.sourceLight);this.sourceLight=null;} }   // Tube geometry is per beam; sphere geometry and the fixed scene light pool stay shared.
}

// ---- Star Sphere: grow a giant orb overhead, then hurl it ----
class GrowingOrb {
  constructor(game, caster, o) {
    this.game = game; this.caster = caster; this.team = caster.team;
    this.color = o.color || '#8fffcf'; this.color2 = o.color2 || '#eaffff';
    this.minR = o.minR || 3; this.maxR = o.maxR || 16; this.radius = this.minR;
    this.growRate = o.growRate || 7; this.kiPerSec = o.kiPerSec || 16;
    this.charging = true; this.launched = false; this.dead = false;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.life = 4;
    const core = new THREE.Mesh(GEO_ORB_HI, MAT_CORE);
    const glow = new THREE.Mesh(GEO_ORB_HI, glowMat(this.color)); glow.scale.setScalar(1.5);
    this.obj = new THREE.Group(); this.obj.add(core, glow); game.scene.add(this.obj);
    this.light = game.vfx.borrowLight(this.color, 4, 80);
  }
  get charge01() { return (this.radius - this.minR) / (this.maxR - this.minR); }
  launch() { if (this.launched) return; this.charging = false; this.launched = true; this.vel.copy(this.caster.aim).setY(-0.15).setLength(60); this.pos.y += 0; }
  update(dt, game) {
    const c = this.caster;
    if (this.charging) {
      if (c.alive && this.radius < this.maxR && this.kiPerSec * dt > c.ki && !this._dryFx) { this._dryFx = true; if (game.onDrained) game.onDrained(c); }
      if (c.alive && this.radius < this.maxR && c.spendKi(this.kiPerSec * dt)) this.radius += this.growRate * dt;
      c.state = 'charge'; c.stateT = 0;
      this.pos.set(c.pos.x, c.pos.y + 16 + this.radius, c.pos.z);
      // suck-in particles from around (energy gathering)
      for (let i = 0; i < 3; i++) { const a = rand(0, TAU), r = rand(20, 40); game.particles.spawn({ x: this.pos.x + Math.cos(a) * r, y: this.pos.y + rand(-10, 10), z: this.pos.z + Math.sin(a) * r, vx: -Math.cos(a) * 40, vz: -Math.sin(a) * 40, vy: 0, life: r / 40, size: 2.4, color: [this.color, this.color2], drag: 0.2 }); }
      if (!c.alive) this.launch();
    } else if (this.launched) {
      _v.copy(this.pos).addScaledVector(this.vel,dt);
      const terrainTime=game.world._ghTriangles?terrainEntry(game.world,this.pos,_v,this.radius):Infinity;
      this.pos.lerp(_v,Number.isFinite(terrainTime)?terrainTime:1); this.life -= dt;
      game.particles.burst(this.pos.x, this.pos.y, this.pos.z, { count: 5, speed: 14, life: 0.4, size: this.radius * 0.8, color: [this.color, this.color2, '#fff'], drag: 3 });
      if (Number.isFinite(terrainTime) || (!game.world._ghTriangles && this.pos.y <= this.radius) || this.life <= 0 || game.overlapFoe(c, this.pos, this.radius + 2)) {
        const p = this.pos.clone(); if(!game.world._ghTriangles)p.y = Math.max(0.3, p.y);
        const power = 1 + this.charge01 * 2.4;
        game.vfx.explode(p, { color: this.color, color2: this.color2, radius: this.radius * 1.8, power, scorch: true });
        game.vfx.shockwave(p.clone().setY((game.world._ghTriangles?game.world.heightAt(p.x,p.z):0)+0.2), { color: this.color, radius: this.radius * 4 + 20, power });
        game.areaDamage(c, p, this.radius * 3.2, 40 + this.charge01 * 90, power);
        game.audio.boom(1.2); game.world.punch(0.78);
        this._dispose(game); return false;
      }
    }
    this.obj.position.copy(this.pos); this.obj.scale.setScalar(this.radius);
    this.obj.rotation.y += dt * 2; this.light.position.copy(this.pos); this.light.intensity = 4 + this.charge01 * 6;
    return true;
  }
  _dispose(game) { if (this.dead) return; this.dead = true; game.scene.remove(this.obj); this.obj.children[1].material.dispose(); game.vfx.returnLight(this.light); }   // shared geo/core; the light STAYS in the scene (light-count law)
}

export class Projectiles {
  constructor(game) { this.game = game; this.list = []; this._nextShotId = 1; this._directionBatch=0;this._predictingBatch=false; }
  spawnProjectile(caster, o) { const p = new Projectile(this.game, caster, o); p._contactId = this._nextShotId++; this.list.push(p); return p; }
  spawnBeam(caster, o) { const b = new BeamHose(this.game, caster, o); b._contactId=this._nextShotId++; this.list.push(b); return b; }
  spawnGrowingOrb(caster, o) { const s = new GrowingOrb(this.game, caster, o); this.list.push(s); return s; }
  resolveLaunches(game=this.game){
    for(const f of game.entities||[])if(f._throwAction)resolveThrowRelease(f);
    for(const shot of this.list)if(!shot.dead)shot.resolveLaunch?.(game);
  }
  retirePendingNaniteShots(caster,slot=null){
    for(const shot of this.list)if(shot instanceof Projectile&&!shot.dead&&!shot._launchResolved&&shot.caster===caster&&shot._powerOrigin?.naniteForm==='cannon'&&(slot===null||shot._powerOrigin.slot===slot))shot._dispose(this.game);
  }
  update(dt, game) {
    this.resolveLaunches(game);
    for(const p of this.list)if(p instanceof BeamHose)p.clipForContacts(game);
    // Freeze support membership before costs or clashes can end a beam. The
    // rendered pose already used that support this frame; it unwinds next frame.
    this._directionBatch++;
    for(const p of this.list)if(p instanceof BeamHose){p._stepChest=p._findAxialSupport();p._directionBatch=this._directionBatch;}
    this._beamClash(dt, game);
    // Preserve authoritative clash-axis adjustments, then make every steering
    // prediction read the same unadvanced direction, independent of list order.
    for(const p of this.list)if(p instanceof BeamHose)p._stepDirection.copy(p.dir);
    this._predictingBatch=true;
    try{
    const beams=this.list.filter(p=>p instanceof BeamHose&&this._canIntercept(p,dt));
    const localReceivers=(game.entities||[]).filter(hasNaniteCells);
    const participating=this.list.filter(p=>p instanceof Projectile&&!p.dead&&(game.world._ghTriangles||priorityEnabled(p)||p.ballistic||p.arrow||p.charged||
      (!p._guidedSplit&&!p.boomerang&&!p.stick&&!p.armDelay&&localReceivers.some(f=>game.isFoe(p.caster,f)))));
    if(participating.length)this._projectileContacts(dt,game,participating,beams);
    const prepared=new Set(participating);
    for (let i = this.list.length - 1; i >= 0; i--) { const p=this.list[i]; if (p.dead || (!prepared.has(p) && !(p instanceof Projectile?updateFieldProjectile(p,dt,game):p.update(dt,game)))) this.list.splice(i, 1); }
    }finally{this._predictingBatch=false;}
  }

  _canIntercept(b,dt){
    return b.interceptBullets&&!b.pendingLaunch&&!b.dead&&b.sustaining&&b.caster.alive&&!remoteInterrupted(b.caster)&&
      b.investedKi>=b.interceptKi&&this._sustainAffordable(b,dt);
  }

  _sustainAffordable(beam,dt){
    if(beam.caster.energyInfinite)return true;
    let remaining=beam.caster.ki;
    // Mirror the existing reverse update/payment order without spending or
    // crediting energy speculatively. Growing orbs share this same ki pool.
    for(let i=this.list.length-1;i>=0;i--){
      const p=this.list[i];if(p.dead||p.caster!==beam.caster||!p.caster.alive)continue;
      const pays=p instanceof BeamHose?p.sustaining&&(!p.pendingLaunch||p._launchReady)&&!(p.remoteDetonate&&remoteInterrupted(p.caster)):
        p instanceof GrowingOrb&&p.charging&&p.radius<p.maxR;
      if(!pays)continue;
      const cost=p.kiPerSec*dt*(p instanceof BeamHose?(this.game.timeFields?.scaleFor(p.caster)??1):1),affordable=remaining>=cost;
      if(p===beam)return affordable;
      if(affordable)remaining-=cost;
    }
    return false;
  }

  _projectileContacts(dt, game, shots, beams=[]) {
    // Stable spawn order also fixes simultaneous multi-shot tie outcomes when
    // list compaction or callers reorder the manager's public list.
    shots.sort((a,b)=>a._contactId-b._contactId);
    const ignored=new Map(shots.map(p=>[p,new Set()]));
    const steps=Math.max(1,Math.ceil(dt*120)),step=dt/steps;
    for(let slice=0;slice<steps;slice++){
      let active=[];
      for(const p of shots){
        if(p.dead)continue;
        if(p.prepareMotion(step*(game.timeFields?.scaleAt(p.pos,p.caster)??1),game))active.push(p);
      }
      let left=step;
      while(active.length&&left>1e-12){
        const clocks=new Map(active.map(p=>[p,fieldMotion(game.timeFields,p.pos,p.vel,p.caster,left)]));
        const interval=Math.min(left,...Array.from(clocks.values(),c=>c.time));
        const ends=new Map(active.map(p=>[p,p._armed||p._stuckTo?p.pos.clone():p.pos.clone().addScaledVector(p.vel,interval*clocks.get(p).scale)]));
        let event=null;
        const offer=e=>{
          if(!event||e.t<event.t-1e-10||(Math.abs(e.t-event.t)<=1e-10&&
            (e.order<event.order||(e.order===event.order&&(e.a._contactId<event.a._contactId||
              (e.a._contactId===event.a._contactId&&(e.b?e.b._contactId:0)<(event.b?event.b._contactId:0)))))))event=e;
        };
        for(const p of active){const c=earliestOrdinaryContact(p,ends.get(p),interval*clocks.get(p).scale,game,ignored.get(p));if(c)offer({...c,a:p,order:0});}
        for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++){
          const a=active[i],b=active[j];
          if(a.caster.team===b.caster.team||!priorityEnabled(a)||!priorityEnabled(b))continue;
          const t=sweptPairTime(a,ends.get(a),b,ends.get(b));
          if(Number.isFinite(t))offer({t,a,b,order:1});
        }
        for(const p of active)if(p.ballistic)for(const beam of beams){
          if(p.caster.team===beam.caster.team||!this._canIntercept(beam,dt))continue;
          const t=sweptBeamTime(p,ends.get(p),beam,game.world);
          if(Number.isFinite(t))offer({t,a:p,b:beam,kind:'beam',order:2});
        }
        const elapsed=interval*(event?event.t:1);
        for(const p of active)if(elapsed>0)p.advancePrepared(elapsed*clocks.get(p).scale,game);
        left-=elapsed;
        if(!event)continue;
        const a=event.a,b=event.b;
        if(!a.dead&&(!b||!b.dead)){
          if(event.kind==='beam'){
            a._dispose(game);
            game.vfx.ring(a.pos.clone(),{color:b.color,r0:.2,r1:Math.min(3,b.radius+a.radius),life:.12});
            game.onAttackIntercept?.({kind:'beam',a,b,pos:a.pos.clone(),retired:1});
          }else if(b){
            const at=a.pos.clone().add(b.pos).multiplyScalar(.5);
            if(a.collisionPriority<=b.collisionPriority)a._dispose(game);
            if(b.collisionPriority<=a.collisionPriority)b._dispose(game);
            game.vfx.ring(at,{color:'#ffd24a',r0:.3,r1:Math.min(4,a.radius+b.radius),life:.14});
            game.onAttackIntercept?.({kind:'priority',a,b,pos:at,retired:Number(a.dead)+Number(b.dead)});
          }else{
            a.commitContact(game,event);
            // Piercing/bouncing/returning shots may continue, but one contact
            // surface cannot repeatedly charge damage at t=0 in this frame.
            ignored.get(a).add(event.target||event.kind);
          }
        }
        active=active.filter(p=>!p.dead);
      }
    }
  }

  // DBZ-style beam struggle: opposing beams meet; the struggle point moves toward the weaker
  // (weakness = character might × power buff × remaining ki budget). Loser gets overpowered.
  _beamClash(dt, game) {
    const beams = [];
    for (const o of this.list) if (o instanceof BeamHose) {
      o.clashLen = null; o.clashing = false;
      if(o.sustaining && !o.pendingLaunch && !o.dead && o.caster.alive && !(o.remoteDetonate && remoteInterrupted(o.caster)))beams.push(o);
      else o._clashOther=null;
    }
    for (let i = 0; i < beams.length; i++) for (let j = i + 1; j < beams.length; j++) {
      const a = beams[i], b = beams[j];
      if (a.team === b.team || !a.sustaining || !b.sustaining || a.clashing || b.clashing) continue;
      const D = a.muzzle.distanceTo(b.muzzle);
      if (D > (a.maxLen + b.maxLen) * 0.95 || D < 10) continue;
      // ⚠ THE CLASH WAS 2D AND `D` WAS 3D, WHICH SILENTLY KILLED IT IN THE AIR. The horizontal
      // deltas were divided by the THREE-dimensional distance, so `(abx, abz)` was not a unit
      // vector — it was foreshortened by cos(elevation) — and the facing dot then threw `dir.y`
      // away as well. The tested value was therefore ≈cos²(elev) against a 0.4 gate: **two beams
      // more than ~51° of elevation apart could not clash at all, and nothing said so.** A flier
      // duelling someone on the ground is the ordinary case, not an exotic one.
      const aby = (b.muzzle.y - a.muzzle.y) / D;
      const abx = (b.muzzle.x - a.muzzle.x) / D, abz = (b.muzzle.z - a.muzzle.z) / D;
      if (a.dir.x * abx + a.dir.y * aby + a.dir.z * abz < 0.4) continue;      // a must aim at b
      if (b.dir.x * -abx + b.dir.y * -aby + b.dir.z * -abz < 0.4) continue;   // b must aim at a
      if (!beamPathsTouch(a,b,_v)) continue;
      if (a._clashOther !== b) {
        a._clashT = clamp(((_v.x-a.muzzle.x)*abx+(_v.y-a.muzzle.y)*aby+(_v.z-a.muzzle.z)*abz)/D,0,1);
        a._clashOffset.copy(_v).sub(a._tmp.copy(a.muzzle).lerp(b.muzzle,a._clashT));
        a._clashOther = b; b._clashOther = a;
      }
      const pa = a.clashPower(), pb = b.clashPower(), tot = pa + pb || 1;
      const sa=game.timeFields?.scaleAt(_v,a.caster)??1,sb=game.timeFields?.scaleAt(_v,b.caster)??1;
      a._clashT = clamp(a._clashT + ((pa*sa - pb*sb) / tot) * 0.85 * dt, 0, 1);
      const t = a._clashT;
      b._clashT = 1-t;
      // ⚠ AND THE STRUGGLE POINT HAS TO RIDE THE SAME AXIS. `cy` was the MIDPOINT of the two
      // muzzles regardless of where the struggle actually sat, so a clash that a stronger fighter
      // was pushing uphill drew its collision flare at the wrong height. It interpolates by `t`
      // now, exactly like x and z.
      const cx = a.muzzle.x + (b.muzzle.x - a.muzzle.x) * t + a._clashOffset.x,
            cy = a.muzzle.y + (b.muzzle.y - a.muzzle.y) * t + a._clashOffset.y,
            cz = a.muzzle.z + (b.muzzle.z - a.muzzle.z) * t + a._clashOffset.z;
      a._clashContact.set(cx,cy,cz);b._clashContact.copy(a._clashContact);
      a.clashLen = D * t; b.clashLen = D * (1 - t); a.clashing = b.clashing = true;
      // ⚠ FLATTENING BOTH BEAMS TO y=0 was the other half of the same bug: even when a clash did
      // form between fighters at different heights, both beams snapped horizontal and no longer
      // pointed at each other or at their own struggle point. Aim them along the real 3D axis.
      a.dir.set(abx, aby, abz).normalize(); b.dir.set(-abx, -aby, -abz).normalize();
      a.caster.ki = Math.max(0, a.caster.ki - 8 * dt*(game.timeFields?.scaleFor(a.caster)??1)); b.caster.ki = Math.max(0, b.caster.ki - 8 * dt*(game.timeFields?.scaleFor(b.caster)??1));
      const rad = 2.5 + Math.min(pa, pb) * 0.5;
      game.particles.burst(cx, cy, cz, { count: 5, speed: 26, life: 0.32, size: 3.2, color: ['#fff', a.color, b.color], drag: 2, up: 3 });
      if (Math.random() < 0.4) game.vfx.flash(_v.set(cx, cy, cz), '#fff', rad, 0.08);
      if (Math.random() < 0.22) game.vfx.lightning(_v.set(cx, cy, cz), { color: '#fff', count: 3, radius: rad + 5, height: 4 });
      game.world.shake(0.22);
      if (t >= 0.94) this._overpower(b, a, game);
      else if (t <= 0.06) this._overpower(a, b, game);
    }
    for(const b of beams)if(!b.clashing)b._clashOther=null;
  }

  _overpower(loser, winner, game) {
    const c = loser.caster;
    if (c && c.alive) {
      const p = c.pos.clone(); p.y += 5;
      game.vfx.explode(p, { color: winner.color, color2: '#fff', radius: 18, power: 2.2 });
      if(p.y<6.5)game.vfx.shockwave(c.pos.clone().setY(0.2), { color: winner.color, radius: 44, power: 1.9 });
      game.vfx.impact(p, { x: winner.dir.x, z: winner.dir.z }, { color: winner.color, power: 2 });
      game.worldImpact(p, 44, 2.2, winner.caster);
      c.takeDamage(55 * winner.caster.powerBuff, { src: winner.caster, kb: { x: winner.dir.x * 80, y: 24, z: winner.dir.z * 80 }, hitstop: 0.16 });
      game.world.punch(0.62); game.world.shake(2.3); game.slowmo(0.16, 0.4); game.audio.boom(1.3, c.pos);
    }
    loser.end(); loser.clashLen = null; loser._clashOther = null; winner._clashOther = null;
  }
}
