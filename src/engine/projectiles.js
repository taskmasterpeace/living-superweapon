// Living Superweapon — projectiles, beam-hoses (wave cannon), and spirit-bomb lobs.
import * as THREE from 'three';
import { clamp, rand, TAU } from '../core/util.js';

const UP = new THREE.Vector3(0, 1, 0);
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
const MAT_BEAM_PROTO = new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
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
    this.pos = new THREE.Vector3().copy(o.pos);
    this.vel = new THREE.Vector3().copy(o.vel);
    this.radius = o.radius || 1.4;
    this.damage = o.damage || 12;
    this.blast = (o.blast || this.radius * 2.4) * ((caster.sheet && caster.sheet.blastMult) || 1);   // Demolitionist widens it
    this.boomerang = !!o.boomerang; this._return = false; this._range = o.range || 55; this._flown = 0; this._rehitT = 0;
    this.power = o.power || 1;                     // scales fx / shake
    this.grav = o.grav || 0;                       // >0 for lobs
    this.homing = o.homing || 0;
    this.life = o.life || 3;
    this.color = o.color || '#8fe3ff'; this.color2 = o.color2 || '#2b7bff';
    this.ground = o.ground !== false;              // explode on ground hit
    this.pierce = o.pierce || 0;
    this.shock = o.shock || false;                 // ground shockwave on impact
    this.trailT = 0;
    this.dead = false;

    this.arrow = !!o.arrow; this.payload = o.payload || null; this.blind = o.blind;
    this.bullet = !!o.bullet;                      // real ballistics read as METAL, not energy
    this.ballistic = !!o.ballistic; this.weapon = o.weapon || null;   // drives the armour/toughness scale
    this.dtype = o.dtype || null; this.siphon = o.siphon;              // damage type rides the projectile
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
      tracer.scale.set(1, 1, st);
      tracer.position.z = -1.2 - 4.5 * st;         // wide end at the slug's tail, tapering into the streak behind
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
  _arm(game) {
    this._armed = true; this._armT = this.armDelay;
    this.vel.set(0, 0, 0);
    game.audio.zap(880); game.audio.zap(220); game.world.shake(0.3);
    game.vfx.ring(this.pos.clone(), { color: this.color, r0: this.radius, r1: this.radius * 4, life: 0.3 });
  }

  update(dt, game) {
    if (this._armed) {
      this._armT -= dt;
      const k = 1 - Math.max(0, this._armT) / (this.armDelay || 1);
      this.obj.scale.setScalar(this.radius * (1 + k * 0.55 + Math.sin(k * 30) * 0.07));   // trembling swell
      if (this._faceSpr) this._faceSpr.material.color.setRGB(1, 1 - k * 0.45, 1 - k * 0.65);   // serene → burning
      if (this.light) this.light.intensity = 4 * this.power * (1 + k * 2.5);
      if (Math.random() < 0.6) game.particles.spawn({ x: this.pos.x + rand(-1, 1) * this.radius * 2, y: this.pos.y + rand(-1, 1) * this.radius * 2, z: this.pos.z + rand(-1, 1) * this.radius * 2, vx: 0, vy: 3, vz: 0, life: 0.3, size: 2.2, color: [this.color, '#fff'], drag: 1, shrink: true });
      if (this._armT <= 0) return this._impact(game, this.pos.y < 3);
      return true;
    }
    if (this.grav) this.vel.y -= this.grav * dt;
    if (this.homing) {
      const t = game.nearestFoe(this.caster, this.pos, 120);
      if (t) { _v.copy(t.pos).setY(t.pos.y + 5).sub(this.pos).normalize().multiplyScalar(this.homing * dt * 60); this.vel.add(_v); const sp = this.vel.length(); this.vel.setLength(clamp(sp, 20, o_maxspeed(this))); }
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
    if (this.ballistic && game.peds && this.pos.y < 12 && this.pos.y > 0.2) {
      const downed = game.peds.blast(this.pos.x, this.pos.z, 2.4);
      if (downed) {
        game.cityStats.civs += downed;
        if (game.police) game.police.onCivHarm(this.caster, downed);
        if (game.hud) game.hud.feed(`⚠ CIVILIAN SHOT — ${this.caster.name}`, '#ff8a6a');
        return this._impact(game, false);
      }
    }
    this.life -= dt;
    // collisions — delayed-blast payloads ARM instead of exploding on contact; boomerangs bounce home
    if (this.pos.y <= this.radius * 0.5 && this.ground) {
      if (this.boomerang) { this._return = true; this.pos.y = this.radius * 0.5 + 0.1; this.vel.y = Math.abs(this.vel.y) * 0.4; }
      else if (this.armDelay && !this._armed) { this._arm(game); return true; }
      else return this._impact(game, true);
    }
    for (const c of game.world.cover) {
      if (Math.hypot(this.pos.x - c.x, this.pos.z - c.z) < c.r + this.radius && this.pos.y < c.h) {
        if (this.boomerang) { this._return = true; break; }
        if (this.armDelay && !this._armed) { this._arm(game); return true; }
        // RICOCHET (manual §19): reflect off the face, spend a bounce, leave a spark and a
        // visible directional KINK — straight segments, never a curve.
        if (this.bounces > 0) {
          this.bounces--;
          const nx = this.pos.x - c.x, nz = this.pos.z - c.z, nl = Math.hypot(nx, nz) || 1;
          const dot2 = (this.vel.x * nx + this.vel.z * nz) / nl;
          this.vel.x -= 2 * dot2 * (nx / nl); this.vel.z -= 2 * dot2 * (nz / nl);
          this.pos.x = c.x + (nx / nl) * (c.r + this.radius + 0.4);
          this.pos.z = c.z + (nz / nl) * (c.r + this.radius + 0.4);
          this.life = Math.max(this.life, 0.9);
          game.particles.burst(this.pos.x, this.pos.y, this.pos.z, { count: 4, speed: 16, life: 0.2, size: 1.1, color: ['#ffd97a', '#fff'], drag: 2.5 });
          game.audio.zap(700 + this.bounces * 120, this.pos);
          return true;
        }
        return this._impact(game, true);
      }
    }
    // interior walls stop shots — corner warfare means the corner actually protects you
    if (!this._return && game.world.hitInteriorWall && game.world.hitInteriorWall(this.pos.x, this.pos.y, this.pos.z, this.radius)) {
      if (this.boomerang) this._return = true;
      else if (this.armDelay && !this._armed) { this._arm(game); return true; }
      else return this._impact(game, true);
    }
    const foe = game.overlapFoe(this.caster, this.pos, this.radius + 1.5);
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
      // DEFLECT guard: bullets/bolts bounce right back at whoever fired them
      if (foe.guarding && foe.staggerT <= 0 && foe.def.guardType === 'deflect' && !this._defl) {
        const ddx = this.pos.x - foe.pos.x, ddz = this.pos.z - foe.pos.z, dd = Math.hypot(ddx, ddz) || 1;
        if ((ddx / dd) * foe.aim.x + (ddz / dd) * foe.aim.z > -0.15) {
          this._defl = true;
          const shooter = this.caster;
          this.caster = foe; this.team = foe.team; this.homing = Math.max(this.homing, 1.5);
          if (shooter && shooter.alive) _v.copy(shooter.pos).setY(shooter.pos.y + 5).sub(this.pos).normalize().multiplyScalar(this.vel.length() * 1.08);
          else _v.copy(this.vel).multiplyScalar(-1);
          this.vel.copy(_v); this.life = Math.max(this.life, 1.4);
          foe.guardMeter = Math.max(0, foe.guardMeter - 0.04);
          game.vfx.impactStar(this.pos.clone(), 6, '#ffd24a', 0.16); game.audio.zap(760);
          if (game.hud) game.hud.damageNumber(foe.pos, 'DEFLECT', '#ffd24a', true);
          return true;
        }
      }
      foe.takeDamage(this.damage * this.caster.powerBuff, { src: this.caster, ballistic: this.ballistic, weapon: this.weapon, dtype: this.dtype, siphon: this.siphon, kb: _v.copy(this.vel).setY(0).setLength(this.damage * (this.ballistic ? 0.12 : 0.5) + (this.ballistic ? 2 : 8)).setComponent(1, this.ballistic ? 1 : 6), launch: this.ballistic ? 0 : 6 + this.power * 4, hitstop: this.ballistic ? 0.02 : 0.05 });
      // ACID: corrodes the plate for 5s — the counter to the armour that stops bullets
      if (this.payload === 'acid') { foe.addDot({ dps: 6, dur: 5, color: '#c8e04a', kind: 'acid', corrode: 4, src: this.caster }); game.particles.burst(foe.pos.x, foe.pos.y + 5, foe.pos.z, { count: 9, speed: 11, life: 0.6, size: 2.8, color: ['#c8e04a', '#9ab030', '#e6f0a0'], up: 7, drag: 1.1 }); }
      else if (this.payload === 'poison') foe.addDot({ dps: 5, dur: 4, color: '#8fe08a', kind: 'poison', src: this.caster });
      else if (this.payload === 'sleep') { foe.addSleep(2.6, this.caster); game.particles.burst(foe.pos.x, foe.pos.y + 6, foe.pos.z, { count: 7, speed: 6, life: 0.7, size: 2.2, color: ['#ffe9b0', '#fff'], up: 5, drag: 1.6 }); }
      else if (this.payload === 'gas') foe.addDot({ dps: 6, dur: 3, color: '#9a4ae0', kind: 'gas', src: this.caster });
      else if (this.payload === 'flame') { foe.addDot({ dps: 7, dur: 2.5, color: '#ff7a2a', kind: 'burn', src: this.caster }); game.particles.burst(foe.pos.x, foe.pos.y + 5, foe.pos.z, { count: 8, speed: 10, life: 0.5, size: 2.6, color: ['#ff7a2a', '#ffd24a'], up: 8, drag: 1.2 }); }
      if (this.pierce-- > 0) { game.vfx.flash(this.pos.clone(), this.color, this.radius * 2, 0.12); return true; }
      return this._impact(game, false, foe);
    }
    if (this.life <= 0) { if (this.armDelay && !this._armed) { this._arm(game); return true; } return this._impact(game, false); }
    return true;
  }

  _impact(game, hitGround) {
    const p = this.pos.clone(); if (hitGround) p.y = 0.2;
    if (this.blind) game.addSmoke(p.x, p.z, this.blind.r || 12, this.blind.dur || 2.6, this.caster);   // smoke owns this street corner
    // A BULLET IS NOT A BOMB: no fireball, no crater, no area damage — just a spark, a puff and
    // a very dead civilian if it found one. This is the scale that makes guns read as guns.
    if (this.ballistic) {
      game.particles.burst(p.x, p.y, p.z, { count: 4, speed: 14, life: 0.2, size: 1.1, color: ['#ffd97a', '#8b8577'], drag: 2.5 });
      if (game.peds && p.y < 12) {
        const downed = game.peds.blast(p.x, p.z, 3.2);        // one shot, one pedestrian
        if (downed) {
          game.cityStats.civs += downed;
          if (game.police) game.police.onCivHarm(this.caster, downed);
          if (game.hud) game.hud.feed(`⚠ CIVILIAN SHOT — ${this.caster.name}`, 'var(--danger-2)');
        }
      }
      game.noise(p, 0.8, this.caster);
      return false;
    }
    game.vfx.explode(p, { color: this.color, color2: this.color2, radius: this.blast, power: this.power, scorch: hitGround });
    game.areaDamage(this.caster, p, this.blast, this.damage * 0.8, this.power);
    if (this.shock && hitGround) game.vfx.shockwave(p, { color: this.color, radius: this.blast * 2.2, power: this.power });
    if (this.face) {   // the Marletta goes off — a grief-shaped crater
      game.vfx.shockwave(p.clone().setY(0.2), { color: this.color, radius: this.blast * 2.6, power: this.power });
      game.vfx.lightning(p, { color: '#fff', count: 5, radius: this.blast, height: 14 });
      game.slowmo(0.2, 0.45); game.world.punch(0.7); if (game.hud) game.hud.flashScreen('#ffe8c0', 0.16);
    }
    game.audio.boom(clamp(this.power * 0.6, 0.2, 1.4), p);
    this._dispose(game); return false;
  }
  _dispose(game) {
    if (this.dead) return; this.dead = true; game.scene.remove(this.obj);
    // every mesh branch declares its per-projectile materials in _ownMats — shared module
    // materials (steel, brass, tracer) must NEVER be disposed here (index-guessing children[1]
    // used to dispose the SHARED tracer mat on every bullet impact, and crashed on nested groups)
    for (const m of this._ownMats || []) m.dispose();
    if (this.light) game.vfx.returnLight(this.light);   // returnLight owns it — the light STAYS in the scene (see the light-count law)
  }
}
function o_maxspeed(p) { return p._max || 90; }

// ---- Beam-hose: traveling tip drags a thick beam (wave cannon, heat-beam, violet) ----
class BeamHose {
  constructor(game, caster, o) {
    this.game = game; this.caster = caster; this.team = caster.team;
    this.radius = o.radius || 1.6;             // beam thickness
    this.tipSpeed = o.tipSpeed || 150;         // how fast the tip races out (waterhose, not instant)
    this.spiralOn = !!o.spiral;                // VEGA's signature: a helix riding the hose
    this.maxLen = o.maxLen || 120;
    this.dps = o.dps || 60; this.dtype = o.dtype || null; this.siphon = o.siphon;   // an arcane beam SIPHONS
    this.kiPerSec = o.kiPerSec || 22;
    this.color = o.color || '#8fe3ff'; this.color2 = o.color2 || '#eaffff';
    this.power = o.power || 1;
    this.steer = o.steer == null ? 10 : o.steer; // how fast beam rotates to aim
    this.might = o.might || ((o.dps || 60) / 50);  // beam-battle strength (from dps, charge, character)
    this.clashLen = null; this.clashing = false; this._clashOther = null; this._clashT = 0.5;
    // THE BEAM VOICE — a sustained inharmonic/ring-mod stack that STRAINS when the beam is
    // losing a clash. Held for the beam's life and stopped in _dispose.
    this._voice = this.game.audio.beamVoice ? this.game.audio.beamVoice(caster.pos) : null;
    this.tipDist = 0;
    this.dir = caster.aim3.clone().normalize();   // 3D — angles up/down toward the target's height
    this.muzzle = new THREE.Vector3();
    this.sustaining = true;                    // held
    this.endT = 0; this.dead = false;
    this.blocked = false;

    // meshes: outer glow + bright core + tip (shared unit geometry, per-instance cloned materials)
    const beamMat = (color, opacity) => { const m = MAT_BEAM_PROTO.clone(); m.color.set(color); m.opacity = opacity; return m; };
    this.glow = new THREE.Mesh(GEO_CYL, beamMat(this.color, 0.42));
    this.core = new THREE.Mesh(GEO_CYL, beamMat(this.color2, 0.8));
    this.tip = new THREE.Mesh(GEO_ORB, glowMat(this.color2, 0.85));
    this.grp = new THREE.Group(); this.grp.add(this.glow, this.core, this.tip); game.scene.add(this.grp);
    if (this.spiralOn) {
      // 26 tiny orbs laid on a helix around the core — cheap (one InstancedMesh), and it reads
      // as a DRILL rather than a hose, which is the whole point of the signature
      this.spiral = new THREE.InstancedMesh(GEO_ORB, glowMat(this.color2, 0.9), 26);
      this.spiral.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.grp.add(this.spiral);
      this._sm = new THREE.Matrix4(); this._sv = new THREE.Vector3();
    }
    this.light = game.vfx.borrowLight(this.color, 5 * this.power, 60);
    this.faceOrigin = !!o.faceOrigin;   // OPTIC BLAST (brief Tier1 #2): eyes, not hands
    caster.muzzle(this.muzzle, this.faceOrigin ? 1.1 : undefined, this.faceOrigin ? 8.3 : undefined);
  }

  end() { this.sustaining = false; }

  // beam-battle power: character might × buff × how much of the ki budget is left ("energy put in")
  clashPower() { return this.might * this.caster.powerBuff * (0.35 + 0.65 * (this.caster.ki / this.caster.maxKi)); }

  update(dt, game) {
    const c = this.caster;
    // ran out of ki mid-beam → the beam dies, but LOUDLY (fizzle cue), never silently
    if (this.sustaining && c.alive && this.kiPerSec * dt > c.ki) { if (game.onDrained) game.onDrained(c); this.sustaining = false; }
    if (this.sustaining && c.alive && c.spendKi(this.kiPerSec * dt)) {
      c.state = 'cast'; c.stateT = 0;
      c.muzzle(this.muzzle, this.faceOrigin ? 1.1 : undefined, this.faceOrigin ? 8.3 : undefined);
      // steer beam toward the caster's 3D aim (eases up/down toward flyers or grounded targets)
      this.dir.lerp(c.aim3, clamp(this.steer * dt, 0, 1)).normalize();
      // slight vertical toward aim height not modeled; keep flat + muzzle height
      this.tipDist = Math.min(this.maxLen, this.tipDist + this.tipSpeed * dt);
      // slow the caster while firing
      c.vel.x *= 0.5; c.vel.z *= 0.5;
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

    // resolve blocked length against cover/ground
    let len = this.tipDist;
    this.blocked = false; let blockedCov = null;
    const tipPos = _v.copy(this.muzzle).addScaledVector(this.dir, len);
    for (const cov of game.world.cover) {
      if (this.muzzle.y >= cov.h) continue;              // beam passes over low cover
      const t = clamp((cov.x - this.muzzle.x) * this.dir.x + (cov.z - this.muzzle.z) * this.dir.z, 0, len);
      const px = this.muzzle.x + this.dir.x * t, pz = this.muzzle.z + this.dir.z * t;
      if (Math.hypot(px - cov.x, pz - cov.z) < cov.r + this.radius && t < len) { len = t; this.blocked = true; blockedCov = cov; }
    }
    if (this.clashLen != null) len = this.clashLen;   // beam-clash pins the tip at the struggle point
    len = Math.max(0.1, len);
    tipPos.copy(this.muzzle).addScaledVector(this.dir, len);
    // sustained beams carve through cover
    if (this.sustaining && blockedCov && blockedCov.hp > 0) {
      blockedCov.hp -= this.dps * 2 * dt;
      game.world.setBlockCracks(blockedCov);
      if (Math.random() < 0.4) game.particles.burst(tipPos.x, tipPos.y, tipPos.z, { count: 2, speed: 14, life: 0.3, size: 2.4, color: ['#3a3a44', this.color, '#fff'], drag: 2 });
      if (blockedCov.hp <= 0) game.shatterBlock(blockedCov);
    }

    // orient beam mesh (cylinder along Y -> align to dir)
    _q.setFromUnitVectors(UP, this.dir);
    const mid = _v2.copy(this.muzzle).addScaledVector(this.dir, len * 0.5);
    const fade = this.sustaining ? 1 : Math.max(0, 1 - this.endT / 0.18);
    for (const m of [this.glow, this.core]) { m.position.copy(mid); m.quaternion.copy(_q); }
    this.core.scale.set(this.radius * 0.55, len, this.radius * 0.55);
    this.glow.scale.set(this.radius * 1.5 * (0.9 + Math.sin(game.time * 40) * 0.1), len, this.radius * 1.5);
    this.core.material.opacity = 0.95 * fade; this.glow.material.opacity = 0.42 * fade;
    this.tip.position.copy(tipPos); this.tip.scale.setScalar(this.radius * 1.8 * fade);
    if (this.spiral) {
      // helix in world space: two perpendiculars off the beam dir, orbs wound 3.5 turns down the length
      const d = this.dir, ax = Math.abs(d.y) > 0.9 ? _v2.set(1, 0, 0) : _v2.set(0, 1, 0);
      const p1 = this._sv.copy(d).cross(ax).normalize();
      const p2x = d.y * p1.z - d.z * p1.y, p2y = d.z * p1.x - d.x * p1.z, p2z = d.x * p1.y - d.y * p1.x;
      const R = this.radius * 2.1, len2 = this.tipDist, spin = game.time * 9;
      for (let i = 0; i < 26; i++) {
        const t2 = i / 25, a2 = t2 * Math.PI * 7 + spin;
        const ca = Math.cos(a2) * R, sa = Math.sin(a2) * R;
        this._sm.makeScale(0.42, 0.42, 0.42);
        this._sm.setPosition(
          this.muzzle.x + d.x * t2 * len2 + p1.x * ca + p2x * sa,
          this.muzzle.y + d.y * t2 * len2 + p1.y * ca + p2y * sa,
          this.muzzle.z + d.z * t2 * len2 + p1.z * ca + p2z * sa);
        this.spiral.setMatrixAt(i, this._sm);
      }
      this.spiral.instanceMatrix.needsUpdate = true;
    }
    this.tip.material.opacity = 0.82 * fade;
    this.light.position.copy(tipPos); this.light.intensity = 5 * this.power * fade;

    if (this.sustaining) {
      // damage along the beam
      for (const f of game.entities) {
        if (!game.isFoe(c, f)) continue;
        // closest point on the 3D beam segment to the target's body centre (handles up/down)
        const cx = f.pos.x - this.muzzle.x, cy = (f.pos.y + 5.2) - this.muzzle.y, cz = f.pos.z - this.muzzle.z;
        const t = clamp(cx * this.dir.x + cy * this.dir.y + cz * this.dir.z, 0, len);
        const px = this.muzzle.x + this.dir.x * t, py = this.muzzle.y + this.dir.y * t, pz = this.muzzle.z + this.dir.z * t;
        const dd = Math.hypot(f.pos.x - px, (f.pos.y + 5.2) - py, f.pos.z - pz);
        if (dd < this.radius + f.radius + 1) {
          // src+dot so GUARD can block beams (drains guard over time)
          f.takeDamage(this.dps * c.powerBuff * dt, { src: c, dot: true, dtype: this.dtype, siphon: this.siphon, hitstop: 0 });
          // ---- THE PRESSURE LADDER (manual §9): what a beam DOES to you depends on who you are.
          // press = the beam's authority · hold = strength + a raised guard. The outcomes, weakest
          // to strongest: LAUNCHED off your feet → PUSHED sliding back → HOLD your ground →
          // WALK FORWARD INTO IT, eating the damage. The old constant shove died against move()'s
          // walk-speed clamp every frame — burstT lifts the clamp, which is what makes the slide real.
          if (f.alive && f.state !== 'ko') {
            const blocked = f.guarding && f.staggerT <= 0;
            const press = Math.min((this.dps * c.powerBuff) / 24, 1.25);       // capped so the TOP of the roster can wade through anything
            const hold = (f.strength ?? 5) / 10 + (blocked ? 0.4 : 0) + (f.def.metal ? 0.15 : 0);
            if (hold < press * 0.85) {
              const shove = (press * 0.85 - hold) * 46;
              f.vel.x += this.dir.x * shove * dt * 8; f.vel.z += this.dir.z * shove * dt * 8;
              f.burstT = Math.max(f.burstT || 0, 0.09);                        // the clamp-lift — same mechanism as the dash
              f._beamPressT = (f._beamPressT || 0) + dt;
              if (!blocked && press > hold * 1.8 && f._beamPressT > 0.45) {    // the weak get BLASTED off their feet
                f._beamPressT = 0;
                f.vel.x += this.dir.x * 34; f.vel.z += this.dir.z * 34; f.vel.y += 11;
                f.launchT = 1.1;                                               // walls become weapons (slam physics)
              }
            } else f._beamPressT = 0;
          }
          game.particles.burst(px, py, pz, { count: 2, speed: 12, life: 0.3, size: 2, color: ['#fff', this.color], dir: { x: this.dir.x, z: this.dir.z }, spread: 1.4 });
        }
      }
      // tip fx + muzzle fx  (read tip from mesh — the damage loop reused the _v temp)
      const tp = this.tip.position;
      if (Math.random() < 0.8) game.particles.burst(tp.x, tp.y, tp.z, { count: 3, speed: 16, life: 0.3, size: this.radius * 1.6, color: ['#fff', this.color, this.color2], drag: 3 });
      game.particles.burst(this.muzzle.x, this.muzzle.y, this.muzzle.z, { count: 2, speed: 10, life: 0.25, size: this.radius, color: [this.color2, '#fff'], drag: 4 });
      if (this.blocked) game.particles.burst(tp.x, tp.y, tp.z, { count: 4, speed: 20, life: 0.3, size: 2.4, color: ['#fff', this.color], dir: { x: -this.dir.x, z: -this.dir.z }, spread: 1.2 });
      if (Math.random() < 0.15) game.world.shake(0.1 * this.power);
    }

    if (!this.sustaining && this.endT >= 0.18) { this._dispose(game); return false; }
    return true;
  }
  _dispose(game) { if (this.dead) return; this.dead = true; if (this._voice) { this._voice.stop(); this._voice = null; } game.scene.remove(this.grp); [this.glow, this.core, this.tip].forEach(m => m.material.dispose()); if (this.spiral) this.spiral.material.dispose(); game.vfx.returnLight(this.light); }   // geometry is shared; the light STAYS in the scene (light-count law)
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
      this.pos.addScaledVector(this.vel, dt); this.life -= dt;
      game.particles.burst(this.pos.x, this.pos.y, this.pos.z, { count: 5, speed: 14, life: 0.4, size: this.radius * 0.8, color: [this.color, this.color2, '#fff'], drag: 3 });
      if (this.pos.y <= this.radius || this.life <= 0 || game.overlapFoe(c, this.pos, this.radius + 2)) {
        const p = this.pos.clone(); p.y = Math.max(0.3, p.y);
        const power = 1 + this.charge01 * 2.4;
        game.vfx.explode(p, { color: this.color, color2: this.color2, radius: this.radius * 1.8, power, scorch: true });
        game.vfx.shockwave(p.clone().setY(0.2), { color: this.color, radius: this.radius * 4 + 20, power });
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
  constructor(game) { this.game = game; this.list = []; }
  spawnProjectile(caster, o) { const p = new Projectile(this.game, caster, o); this.list.push(p); return p; }
  spawnBeam(caster, o) { const b = new BeamHose(this.game, caster, o); this.list.push(b); return b; }
  spawnGrowingOrb(caster, o) { const s = new GrowingOrb(this.game, caster, o); this.list.push(s); return s; }
  update(dt, game) {
    this._beamClash(dt, game);
    for (let i = this.list.length - 1; i >= 0; i--) { if (!this.list[i].update(dt, game)) this.list.splice(i, 1); }
  }

  // DBZ-style beam struggle: opposing beams meet; the struggle point moves toward the weaker
  // (weakness = character might × power buff × remaining ki budget). Loser gets overpowered.
  _beamClash(dt, game) {
    const beams = [];
    for (const o of this.list) if (o instanceof BeamHose && o.sustaining && !o.dead) beams.push(o);
    for (const b of beams) { b.clashLen = null; b.clashing = false; }
    for (let i = 0; i < beams.length; i++) for (let j = i + 1; j < beams.length; j++) {
      const a = beams[i], b = beams[j];
      if (a.team === b.team) continue;
      const D = a.muzzle.distanceTo(b.muzzle);
      if (D > (a.maxLen + b.maxLen) * 0.95 || D < 10) continue;
      const abx = (b.muzzle.x - a.muzzle.x) / D, abz = (b.muzzle.z - a.muzzle.z) / D;
      if (a.dir.x * abx + a.dir.z * abz < 0.4) continue;          // a must aim at b
      if (b.dir.x * -abx + b.dir.z * -abz < 0.4) continue;        // b must aim at a
      if (a._clashOther !== b) { a._clashT = 0.5; a._clashOther = b; b._clashOther = a; }
      const pa = a.clashPower(), pb = b.clashPower(), tot = pa + pb || 1;
      a._clashT = clamp(a._clashT + ((pa - pb) / tot) * 0.85 * dt, 0, 1);
      const t = a._clashT;
      const cx = a.muzzle.x + (b.muzzle.x - a.muzzle.x) * t, cy = (a.muzzle.y + b.muzzle.y) * 0.5, cz = a.muzzle.z + (b.muzzle.z - a.muzzle.z) * t;
      a.clashLen = D * t; b.clashLen = D * (1 - t); a.clashing = b.clashing = true;
      a.dir.set(abx, 0, abz); b.dir.set(-abx, 0, -abz);
      a.caster.ki = Math.max(0, a.caster.ki - 8 * dt); b.caster.ki = Math.max(0, b.caster.ki - 8 * dt);
      const rad = 2.5 + Math.min(pa, pb) * 0.5;
      game.particles.burst(cx, cy, cz, { count: 5, speed: 26, life: 0.32, size: 3.2, color: ['#fff', a.color, b.color], drag: 2, up: 3 });
      if (Math.random() < 0.4) game.vfx.flash(_v.set(cx, cy, cz), '#fff', rad, 0.08);
      if (Math.random() < 0.22) game.vfx.lightning(_v.set(cx, cy, cz), { color: '#fff', count: 3, radius: rad + 5, height: 4 });
      game.world.shake(0.22);
      if (t >= 0.94) this._overpower(b, a, game);
      else if (t <= 0.06) this._overpower(a, b, game);
    }
  }

  _overpower(loser, winner, game) {
    const c = loser.caster;
    if (c && c.alive) {
      const p = c.pos.clone().setY(6);
      game.vfx.explode(p, { color: winner.color, color2: '#fff', radius: 18, power: 2.2 });
      game.vfx.shockwave(c.pos.clone().setY(0.2), { color: winner.color, radius: 44, power: 1.9 });
      game.vfx.impact(p, { x: winner.dir.x, z: winner.dir.z }, { color: winner.color, power: 2 });
      game.worldImpact(c.pos.clone().setY(0.4), 44, 2.2);
      c.takeDamage(55 * winner.caster.powerBuff, { src: winner.caster, kb: { x: winner.dir.x * 80, y: 24, z: winner.dir.z * 80 }, hitstop: 0.16 });
      game.world.punch(0.62); game.world.shake(2.3); game.slowmo(0.16, 0.4); game.audio.boom(1.3, c.pos);
    }
    loser.end(); loser.clashLen = null; loser._clashOther = null; winner._clashOther = null;
  }
}
