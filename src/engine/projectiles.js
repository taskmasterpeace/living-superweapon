// Living Superweapon — projectiles, beam-hoses (kamehameha), and spirit-bomb lobs.
import * as THREE from 'three';
import { clamp, rand, TAU } from '../core/util.js';

const UP = new THREE.Vector3(0, 1, 0);
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion();

// ---- Ki-blast / big-bang orb ----
class Projectile {
  constructor(game, caster, o) {
    this.game = game; this.caster = caster; this.team = caster.team;
    this.pos = new THREE.Vector3().copy(o.pos);
    this.vel = new THREE.Vector3().copy(o.vel);
    this.radius = o.radius || 1.4;
    this.damage = o.damage || 12;
    this.blast = o.blast || this.radius * 2.4;    // explosion AoE
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

    const core = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    const glow = new THREE.Mesh(new THREE.SphereGeometry(1.7, 16, 12), new THREE.MeshBasicMaterial({ color: this.color, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.obj = new THREE.Group(); this.obj.add(core, glow); this.obj.scale.setScalar(this.radius);
    this.obj.position.copy(this.pos); game.scene.add(this.obj);
    this.light = game.vfx.borrowLight(this.color, 3 * this.power, this.radius * 10);
  }

  update(dt, game) {
    if (this.grav) this.vel.y -= this.grav * dt;
    if (this.homing) {
      const t = game.nearestFoe(this.caster, this.pos, 120);
      if (t) { _v.copy(t.pos).setY(t.pos.y + 5).sub(this.pos).normalize().multiplyScalar(this.homing * dt * 60); this.vel.add(_v); const sp = this.vel.length(); this.vel.setLength(clamp(sp, 20, o_maxspeed(this))); }
    }
    this.pos.addScaledVector(this.vel, dt);
    this.obj.position.copy(this.pos);
    this.light.position.copy(this.pos);
    this.obj.rotation.y += dt * 6;
    // trail
    this.trailT += dt;
    if (this.trailT > 0.016) {
      this.trailT = 0;
      game.particles.spawn({ x: this.pos.x, y: this.pos.y, z: this.pos.z, vx: rand(-2, 2), vy: rand(-2, 2), vz: rand(-2, 2), life: 0.35, size: this.radius * 2.2, color: [this.color, this.color2, '#ffffff'], drag: 3, shrink: true });
    }
    this.life -= dt;
    // collisions
    if (this.pos.y <= this.radius * 0.5 && this.ground) return this._impact(game, true);
    for (const c of game.world.cover) { if (Math.hypot(this.pos.x - c.x, this.pos.z - c.z) < c.r + this.radius && this.pos.y < c.h) return this._impact(game, true); }
    const foe = game.overlapFoe(this.caster, this.pos, this.radius + 1.5);
    if (foe) {
      foe.takeDamage(this.damage * this.caster.powerBuff, { kb: _v.copy(this.vel).setY(0).setLength(this.damage * 0.5 + 8).setComponent(1, 6), launch: 6 + this.power * 4, hitstop: 0.05 });
      if (this.pierce-- > 0) { game.vfx.flash(this.pos.clone(), this.color, this.radius * 2, 0.12); return true; }
      return this._impact(game, false, foe);
    }
    if (this.life <= 0) return this._impact(game, false);
    return true;
  }

  _impact(game, hitGround) {
    const p = this.pos.clone(); if (hitGround) p.y = 0.2;
    game.vfx.explode(p, { color: this.color, color2: this.color2, radius: this.blast, power: this.power, scorch: hitGround });
    game.areaDamage(this.caster, p, this.blast, this.damage * 0.8, this.power);
    if (this.shock && hitGround) game.vfx.shockwave(p, { color: this.color, radius: this.blast * 2.2, power: this.power });
    game.audio.boom(clamp(this.power * 0.6, 0.2, 1.4));
    this._dispose(game); return false;
  }
  _dispose(game) { if (this.dead) return; this.dead = true; game.scene.remove(this.obj); this.obj.children.forEach(c => { c.geometry.dispose(); c.material.dispose(); }); game.scene.remove(this.light); game.vfx.returnLight(this.light); }
}
function o_maxspeed(p) { return p._max || 90; }

// ---- Beam-hose: traveling tip drags a thick beam (kamehameha, heat-beam, galick) ----
class BeamHose {
  constructor(game, caster, o) {
    this.game = game; this.caster = caster; this.team = caster.team;
    this.radius = o.radius || 1.6;             // beam thickness
    this.tipSpeed = o.tipSpeed || 150;         // how fast the tip races out (waterhose, not instant)
    this.maxLen = o.maxLen || 120;
    this.dps = o.dps || 60;
    this.kiPerSec = o.kiPerSec || 22;
    this.color = o.color || '#8fe3ff'; this.color2 = o.color2 || '#eaffff';
    this.power = o.power || 1;
    this.steer = o.steer == null ? 10 : o.steer; // how fast beam rotates to aim
    this.might = o.might || ((o.dps || 60) / 50);  // beam-battle strength (from dps, charge, character)
    this.clashLen = null; this.clashing = false; this._clashOther = null; this._clashT = 0.5;
    this.tipDist = 0;
    this.dir = caster.aim3.clone().normalize();   // 3D — angles up/down toward the target's height
    this.muzzle = new THREE.Vector3();
    this.sustaining = true;                    // held
    this.endT = 0; this.dead = false;
    this.blocked = false;

    // meshes: outer glow + bright core + tip
    const cyl = new THREE.CylinderGeometry(1, 1, 1, 16, 1, true);
    this.glow = new THREE.Mesh(cyl, new THREE.MeshBasicMaterial({ color: this.color, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    this.core = new THREE.Mesh(cyl, new THREE.MeshBasicMaterial({ color: this.color2, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    this.tip = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: this.color2, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.grp = new THREE.Group(); this.grp.add(this.glow, this.core, this.tip); game.scene.add(this.grp);
    this.light = game.vfx.borrowLight(this.color, 5 * this.power, 60);
    caster.muzzle(this.muzzle);
  }

  end() { this.sustaining = false; }

  // beam-battle power: character might × buff × how much of the ki budget is left ("energy put in")
  clashPower() { return this.might * this.caster.powerBuff * (0.35 + 0.65 * (this.caster.ki / this.caster.maxKi)); }

  update(dt, game) {
    const c = this.caster;
    if (this.sustaining && c.alive && c.spendKi(this.kiPerSec * dt)) {
      c.state = 'cast'; c.stateT = 0;
      c.muzzle(this.muzzle);
      // steer beam toward the caster's 3D aim (eases up/down toward flyers or grounded targets)
      this.dir.lerp(c.aim3, clamp(this.steer * dt, 0, 1)).normalize();
      // slight vertical toward aim height not modeled; keep flat + muzzle height
      this.tipDist = Math.min(this.maxLen, this.tipDist + this.tipSpeed * dt);
      // slow the caster while firing
      c.vel.x *= 0.5; c.vel.z *= 0.5;
    } else {
      this.sustaining = false;
      this.endT += dt;
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
          // src+dot so GUARD can block beams (drains guard over time); strong physical shove along the beam
          f.takeDamage(this.dps * c.powerBuff * dt, { src: c, dot: true, kb: _v.copy(this.dir).setLength(this.dps * 0.04 + 16), hitstop: 0 });
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
  _dispose(game) { if (this.dead) return; this.dead = true; game.scene.remove(this.grp); [this.glow, this.core, this.tip].forEach(m => { m.geometry.dispose(); m.material.dispose(); }); game.scene.remove(this.light); game.vfx.returnLight(this.light); }
}

// ---- Spirit Bomb: grow a giant orb overhead, then hurl it ----
class SpiritBomb {
  constructor(game, caster, o) {
    this.game = game; this.caster = caster; this.team = caster.team;
    this.color = o.color || '#8fffcf'; this.color2 = o.color2 || '#eaffff';
    this.minR = o.minR || 3; this.maxR = o.maxR || 16; this.radius = this.minR;
    this.growRate = o.growRate || 7; this.kiPerSec = o.kiPerSec || 16;
    this.charging = true; this.launched = false; this.dead = false;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.life = 4;
    const core = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 16), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    const glow = new THREE.Mesh(new THREE.SphereGeometry(1.5, 20, 16), new THREE.MeshBasicMaterial({ color: this.color, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.obj = new THREE.Group(); this.obj.add(core, glow); game.scene.add(this.obj);
    this.light = game.vfx.borrowLight(this.color, 4, 80);
  }
  get charge01() { return (this.radius - this.minR) / (this.maxR - this.minR); }
  launch() { if (this.launched) return; this.charging = false; this.launched = true; this.vel.copy(this.caster.aim).setY(-0.15).setLength(60); this.pos.y += 0; }
  update(dt, game) {
    const c = this.caster;
    if (this.charging) {
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
  _dispose(game) { if (this.dead) return; this.dead = true; game.scene.remove(this.obj); this.obj.children.forEach(c => { c.geometry.dispose(); c.material.dispose(); }); game.scene.remove(this.light); game.vfx.returnLight(this.light); }
}

export class Projectiles {
  constructor(game) { this.game = game; this.list = []; }
  spawnProjectile(caster, o) { const p = new Projectile(this.game, caster, o); this.list.push(p); return p; }
  spawnBeam(caster, o) { const b = new BeamHose(this.game, caster, o); this.list.push(b); return b; }
  spawnSpiritBomb(caster, o) { const s = new SpiritBomb(this.game, caster, o); this.list.push(s); return s; }
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
      game.world.punch(0.62); game.world.shake(2.3); game.slowmo(0.16, 0.4); game.audio.boom(1.3);
    }
    loser.end(); loser.clashLen = null; loser._clashOther = null; winner._clashOther = null;
  }
}
