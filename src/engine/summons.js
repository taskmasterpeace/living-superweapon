// Living Superweapon — summoned minions & controllable constructs.
import * as THREE from 'three';
import { clamp, rand, TAU, damp } from '../core/util.js';

const _v = new THREE.Vector3();

// Allied drone that seeks foes and fires small blasts.
export class Minion {
  constructor(game, owner, def, i) {
    this.game = game; this.owner = owner; this.team = owner.team; this.powerBuff = 1; this.isDummy = false;
    this.alive = true; this.dead = false;
    this.life = def.duration || 12; this.fireCd = rand(0, 0.5); this.def = def;
    const a = (i / (def.count || 3)) * TAU;
    this.pos = new THREE.Vector3(owner.pos.x + Math.cos(a) * 10, 8 + rand(0, 4), owner.pos.z + Math.sin(a) * 10);
    this.aim = owner.aim.clone();
    // AN ATTACK DRONE IS A MACHINE, not a will-o'-wisp: a machined fuselage, four rotor booms
    // with spinning props, a sensor lens and one blinking status LED. Bloom stays with ki.
    const shell = new THREE.MeshStandardMaterial({ color: '#3a4048', roughness: 0.45, metalness: 0.85 });
    const trim = new THREE.MeshStandardMaterial({ color: '#22262c', roughness: 0.6, metalness: 0.7 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.1, 3.4), shell);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.5, 6), trim);
    nose.rotation.x = -Math.PI / 2; nose.position.z = 2.2;
    const lens = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6), new THREE.MeshStandardMaterial({ color: def.color, emissive: def.color, emissiveIntensity: 1.5, roughness: 0.25 }));
    lens.position.set(0, -0.1, 2.5);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 5), new THREE.MeshStandardMaterial({ color: '#ff3b3b', emissive: '#ff3b3b', emissiveIntensity: 1.2, roughness: 0.3 }));
    led.position.set(0, 0.75, -1.2);
    this.obj = new THREE.Group(); this.obj.add(body, nose, lens, led);
    this.rotors = [];
    for (let r = 0; r < 4; r++) {                       // four booms, four props
      const sx = r < 2 ? -1 : 1, sz = r % 2 ? -1 : 1;
      const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 2.2, 5), trim);
      boom.rotation.z = Math.PI / 2; boom.rotation.y = sx * sz * 0.7;
      boom.position.set(sx * 1.5, 0, sz * 1.3); this.obj.add(boom);
      const prop = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 0.28), trim);
      prop.position.set(sx * 2.3, 0.35, sz * 2.0); this.obj.add(prop); this.rotors.push(prop);
    }
    this.obj.position.copy(this.pos); game.scene.add(this.obj);
    this.body = body; this.led = led;
    this.hp = def.hp || 18;                            // drones can be shot down — they are targets too
    this._bob = rand(0, TAU);
  }
  // shot down by splash / area damage (game.areaDamage looks for takeDamage on anything hostile)
  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0 && !this.dead) {
      const g = this.game;
      g.vfx.explode(this.pos.clone(), { color: '#ffb03a', color2: '#8b8577', radius: 5, power: 0.8, scorch: false });
      g.particles.burst(this.pos.x, this.pos.y, this.pos.z, { count: 12, speed: 20, life: 0.6, size: 1.6, color: ['#3a4048', '#ffb03a'], grav: 22, drag: 1.4 });
      g.audio.impact(0.8, this.pos);
      this.life = 0;
    }
    return amount;
  }
  update(dt, game) {
    this.life -= dt; if (this.life <= 0) { this._dispose(game); return false; }
    // Prefer whatever the OWNER is fighting — a drone screen should focus fire, not wander off
    // onto three different targets. Falls back to the nearest hostile in sensor range.
    let foe = (this.owner.isPlayer && game.hardLock && game.hardLock.alive) ? game.hardLock : null;
    if (!foe || Math.hypot(foe.pos.x - this.pos.x, foe.pos.z - this.pos.z) > 110) foe = game.nearestFoe(this.owner, this.pos, 90);
    const home = _v.copy(this.owner.pos).setY(9);
    if (foe) {
      const desired = _v.copy(foe.pos).setY(foe.pos.y + 6).sub(this.pos);
      const dist = desired.length(); this.aim.copy(desired).normalize();
      // hold a firing ring around the target and JINK across it, so drones are hard to swat
      const ring = this.def.standoff || 22;
      if (dist > ring + 5) this.pos.addScaledVector(this.aim, 34 * dt);
      else if (dist < ring - 5) this.pos.addScaledVector(this.aim, -26 * dt);
      else { this.pos.x += -this.aim.z * 18 * dt; this.pos.z += this.aim.x * 18 * dt; }
      this._bob += dt * 3.4;
      this.pos.y = clamp(this.pos.y + Math.sin(this._bob) * 9 * dt, foe.pos.y + 4, foe.pos.y + 16);
      this.fireCd -= dt;
      if (this.fireCd <= 0) {
        this.fireCd = this.def.interval || 0.7;
        // lead the shot like the fair-play AI does, then spread it — drones are not aimbots
        const spd = this.def.speed || 80;
        const lead = _v.copy(foe.pos).setY(foe.pos.y + 6);
        if (foe.vel) lead.addScaledVector(foe.vel, Math.min(0.5, dist / spd));
        const dir = lead.sub(this.pos).normalize();
        dir.x += rand(-0.05, 0.05); dir.z += rand(-0.05, 0.05); dir.normalize();
        game.projectiles.spawnProjectile(this, { pos: this.pos.clone(), vel: dir.setLength(spd), radius: 0.8, damage: this.def.damage || 7, blast: 3, color: this.def.color, color2: this.def.color2 || '#fff' });
        game.audio.blast(620, 0.06);
        this.obj.position.addScaledVector(this.aim, -0.4);       // visible recoil kick
      }
    } else {
      // hover around owner
      const t = game.time + this.obj.id; this.pos.x = damp(this.pos.x, home.x + Math.cos(t) * 12, 3, dt); this.pos.z = damp(this.pos.z, home.z + Math.sin(t) * 12, 3, dt); this.pos.y = damp(this.pos.y, 9, 3, dt);
    }
    // fly like an aircraft: nose toward the aim, bank into the turn, rotors spinning, LED blinking
    this.obj.position.copy(this.pos);
    this.obj.rotation.y = Math.atan2(this.aim.x, this.aim.z);
    this.obj.rotation.z = damp(this.obj.rotation.z || 0, foe ? -0.32 : 0, 4, dt);
    this.obj.rotation.x = damp(this.obj.rotation.x || 0, foe ? 0.16 : 0, 4, dt);
    for (let i = 0; i < this.rotors.length; i++) this.rotors[i].rotation.y += dt * (46 + i);
    if (this.led) this.led.material.emissiveIntensity = (game.time * 3 % 1 < 0.5) ? 2.4 : 0.3;
    return true;
  }
  _dispose(game) { if (this.dead) return; this.dead = true; game.scene.remove(this.obj); this.obj.children.forEach(c => { c.geometry.dispose(); c.material.dispose(); }); }
}

// Player-steered construct: fist / hammer / wall / turret.
export class Construct {
  constructor(game, owner, def) {
    this.game = game; this.owner = owner; this.kind = def.construct || 'fist';
    this.def = def; this.dead = false; this.life = def.duration || 9;
    this.pos = new THREE.Vector3(); this.state = 'idle'; this.stateT = 0; this.fireCd = 0;
    this.color = def.color || '#5fd66a';
    const mat = new THREE.MeshStandardMaterial({ color: this.color, emissive: this.color, emissiveIntensity: 0.9, transparent: true, opacity: 0.72, roughness: 0.3 });
    const glowMat = new THREE.MeshBasicMaterial({ color: this.color, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
    let geo, gr = new THREE.Group();
    if (this.kind === 'fist') { geo = new THREE.BoxGeometry(6, 5, 7); }
    else if (this.kind === 'hammer') { geo = new THREE.BoxGeometry(8, 6, 6); }
    else if (this.kind === 'wall') { geo = new THREE.BoxGeometry(22, 14, 3); }
    else { geo = new THREE.ConeGeometry(3.5, 8, 6); } // turret
    const body = new THREE.Mesh(geo, mat); body.castShadow = true; gr.add(body);
    const glow = new THREE.Mesh(geo.clone(), glowMat); glow.scale.setScalar(1.15); gr.add(glow);
    this.obj = gr; this.body = body; game.scene.add(gr);
    game.vfx.flash(owner.pos.clone().setY(6), this.color, 8, 0.25);
    // wall registers as cover for its lifetime
    if (this.kind === 'wall') { this._cover = { x: 0, z: 0, r: 11, h: 14, mesh: body }; }
    this._place(game, true);
  }
  target(game) {
    const o = this.owner;
    return o.isPlayer ? game.aimPoint : _v.copy(o.pos).addScaledVector(o.aim, 26).setY(0);
  }
  _place(game, snap) {
    const t = this.target(game);
    if (this.kind === 'turret') { if (snap) this.pos.set(t.x, 0, t.z); }
    else if (this.kind === 'wall') { if (snap) { this.pos.set(t.x, 7, t.z); this._cover.x = t.x; this._cover.z = t.z; game.world.cover.push(this._cover); this.obj.lookAt(this.owner.pos.x, 7, this.owner.pos.z); } }
    else { // fist/hammer hover toward target, steered live
      const h = this.kind === 'hammer' ? 16 : 8;
      if (snap) this.pos.set(t.x, h, t.z);
    }
  }
  trigger() {
    if (this.state !== 'idle') return;
    const g = this.game;
    if (this.kind === 'fist') {
      // a foe under the fist → SEIZE it, hoist it up, and pile-drive it into the ground
      const prey = g.overlapFoe(this.owner, this.pos, 8);
      if (prey && !prey.phase && prey.invuln <= 0 && !prey.grabbedBy) {
        this.state = 'grabrise'; this.stateT = 0; this._victim = prey;
        prey.grabbedBy = this.owner; prey.state = 'hit'; prey.vel.set(0, 0, 0);
        g.audio.hit(150); g.world.shake(0.6);
        g.vfx.ring(prey.pos.clone().setY(5), { color: this.color, r0: 1, r1: 9, life: 0.3 });
      } else { this.state = 'punch'; this.stateT = 0; this.punchFrom = this.pos.clone(); this.punchDir = this.owner.aim.clone(); g.audio.zap(520); }
    }
    else if (this.kind === 'hammer') { this.state = 'slam'; this.stateT = 0; g.audio.zap(360); }
    else if (this.kind === 'wall') { this._detonate(g); }
    else { this.life = 0; } // turret dismiss
  }
  _detonate(g) {
    g.vfx.explode(this.pos.clone(), { color: this.color, radius: 16, power: 1.2 });
    g.vfx.shockwave(this.pos.clone().setY(0.2), { color: this.color, radius: 30, power: 1 });
    g.areaDamage(this.owner, this.pos, 22, 30, 1.2); this.life = 0;
  }
  update(dt, game) {
    this.life -= dt; this.stateT += dt;
    if (this.life <= 0) { this._dispose(game); return false; }
    const o = this.owner;
    if (this.kind === 'fist') {
      if (this.state === 'idle') { const t = this.target(game); this.pos.x = damp(this.pos.x, t.x, 8, dt); this.pos.z = damp(this.pos.z, t.z, 8, dt); this.pos.y = damp(this.pos.y, 8, 8, dt); this.obj.lookAt(o.pos.x, this.pos.y, o.pos.z); }
      else if (this.state === 'punch') {
        const k = this.stateT / 0.18; this.pos.copy(this.punchFrom).addScaledVector(this.punchDir, k * 34);
        const foe = game.overlapFoe(o, this.pos, 6);
        if (foe && !this._hit) { this._hit = true; foe.takeDamage(34 * o.powerBuff, { src: o, kb: this.punchDir.clone().setLength(70).setY(0), launch: 16, hitstop: 0.1 }); game.vfx.explode(foe.pos.clone().setY(5), { color: this.color, radius: 10, power: 1.1, scorch: false }); game.world.shake(1.2); game.world.punch(0.8); }
        if (k >= 1) { this.state = 'idle'; this._hit = false; }
      }
      else if (this.state === 'grabrise') {
        const v = this._victim;
        if (!v || !v.alive || v.grabbedBy !== o) { if (v && v.grabbedBy === o) v.grabbedBy = null; this._victim = null; this.state = 'idle'; }
        else {
          this.pos.y = damp(this.pos.y, 21, 6, dt);                       // hoist
          v.pos.set(this.pos.x, this.pos.y - 4, this.pos.z); v.vel.set(0, 0, 0); v.state = 'hit'; v.stateT = 0;
          if (this.stateT > 0.5) { this.state = 'grabslam'; this.stateT = 0; game.audio.zap(300); }
        }
      }
      else if (this.state === 'grabslam') {
        const v = this._victim;
        this.pos.y -= 140 * dt;                                           // pile-drive
        if (v && v.alive && v.grabbedBy === o) { v.pos.set(this.pos.x, Math.max(0, this.pos.y - 4), this.pos.z); }
        if (this.pos.y <= 5) {
          this.pos.y = 8;
          if (v && v.alive && v.grabbedBy === o) {
            v.grabbedBy = null; v.state = 'idle'; v.pos.y = 0;
            v.takeDamage(26 * o.powerBuff, { src: o, unblockable: true, hitstop: 0.14, kb: { x: 0, y: -10, z: 0 } });
            v.launchT = 1.0; v.vel.y = -58; v.pos.y = 3;                  // guaranteed ground-slam crunch
            if (v.grabHeal) {} // (no lifesteal on constructs)
          }
          game.vfx.explode(this.pos.clone().setY(1), { color: this.color, radius: 14, power: 1.5 });
          game.vfx.shockwave(this.pos.clone().setY(0.2), { color: this.color, radius: 30, power: 1.4 });
          game.world.shake(1.8); game.world.punch(0.7); game.audio.impact(1.4); game.audio.boom(0.6);
          this._victim = null; this.state = 'idle';
        }
      }
    } else if (this.kind === 'hammer') {
      if (this.state === 'idle') { const t = this.target(game); this.pos.x = damp(this.pos.x, t.x, 7, dt); this.pos.z = damp(this.pos.z, t.z, 7, dt); this.pos.y = damp(this.pos.y, 16, 6, dt); this.obj.rotation.y += dt; }
      else if (this.state === 'slam') {
        const k = this.stateT / 0.16; this.pos.y = damp(this.pos.y, 1, 18, dt);
        if (k >= 1 && !this._hit) { this._hit = true; game.vfx.explode(this.pos.clone().setY(0.4), { color: this.color, radius: 18, power: 1.4 }); game.vfx.shockwave(this.pos.clone().setY(0.2), { color: this.color, radius: 34, power: 1.3 }); game.areaDamage(o, this.pos, 24, 40, 1.4); game.world.shake(1.6); game.world.punch(0.72); }
        if (k >= 1.6) { this.state = 'idle'; this._hit = false; }
      }
    } else if (this.kind === 'turret') {
      this.obj.rotation.y += dt * 1.5; this.fireCd -= dt;
      const foe = game.nearestFoe(o, this.pos, 100);
      if (foe && this.fireCd <= 0) { this.fireCd = 0.4; const dir = _v.copy(foe.pos).setY(foe.pos.y + 5).sub(this.pos.clone().setY(6)).normalize(); game.projectiles.spawnProjectile(o, { pos: this.pos.clone().setY(6), vel: dir.multiplyScalar(90), radius: 0.9, damage: 10, blast: 4, color: this.color, color2: '#fff' }); game.audio.blast(600, 0.07); }
    } else if (this.kind === 'wall') {
      // static; gentle pulse
      this.body.material.emissiveIntensity = 0.7 + Math.sin(game.time * 6) * 0.2;
    }
    this.obj.position.copy(this.pos);
    return true;
  }
  _dispose(game) {
    if (this.dead) return; this.dead = true;
    if (this._victim && this._victim.grabbedBy === this.owner) { this._victim.grabbedBy = null; if (this._victim.state === 'hit') this._victim.state = 'idle'; }
    if (this._cover) { const i = game.world.cover.indexOf(this._cover); if (i >= 0) game.world.cover.splice(i, 1); }
    game.vfx.flash(this.pos.clone(), this.color, 6, 0.2);
    game.scene.remove(this.obj); this.obj.children.forEach(c => { c.geometry.dispose(); c.material.dispose(); });
  }
}
