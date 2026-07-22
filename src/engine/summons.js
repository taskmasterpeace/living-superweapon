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
    const body = new THREE.Mesh(new THREE.OctahedronGeometry(1.4), new THREE.MeshStandardMaterial({ color: def.color, emissive: def.color, emissiveIntensity: 1.2, roughness: 0.4 }));
    const glow = new THREE.Mesh(new THREE.SphereGeometry(2.1, 12, 10), new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.obj = new THREE.Group(); this.obj.add(body, glow); this.obj.position.copy(this.pos); game.scene.add(this.obj);
    this.body = body;
  }
  update(dt, game) {
    this.life -= dt; if (this.life <= 0) { this._dispose(game); return false; }
    const foe = game.nearestFoe(this.owner, this.pos, 90);
    const home = _v.copy(this.owner.pos).setY(9);
    if (foe) {
      // strafe near owner, aim at foe
      const desired = _v.copy(foe.pos).setY(foe.pos.y + 6).sub(this.pos);
      const dist = desired.length(); this.aim.copy(desired).normalize();
      if (dist > 26) this.pos.addScaledVector(this.aim, 30 * dt);
      else if (dist < 16) this.pos.addScaledVector(this.aim, -20 * dt);
      this.fireCd -= dt;
      if (this.fireCd <= 0) {
        this.fireCd = this.def.interval || 0.7;
        game.projectiles.spawnProjectile(this, { pos: this.pos.clone(), vel: this.aim.clone().setLength(this.def.speed || 80), radius: 0.8, damage: this.def.damage || 7, blast: 3, color: this.def.color, color2: this.def.color2 || '#fff' });
        game.audio.blast(620, 0.06);
      }
    } else {
      // hover around owner
      const t = game.time + this.obj.id; this.pos.x = damp(this.pos.x, home.x + Math.cos(t) * 12, 3, dt); this.pos.z = damp(this.pos.z, home.z + Math.sin(t) * 12, 3, dt); this.pos.y = damp(this.pos.y, 9, 3, dt);
    }
    this.obj.position.copy(this.pos); this.obj.rotation.y += dt * 3; this.body.rotation.x += dt * 2;
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
    if (this.kind === 'fist') { this.state = 'punch'; this.stateT = 0; this.punchFrom = this.pos.clone(); this.punchDir = this.owner.aim.clone(); g.audio.zap(520); }
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
        if (foe && !this._hit) { this._hit = true; foe.takeDamage(34 * o.powerBuff, { kb: this.punchDir.clone().setLength(70).setY(0), launch: 16, hitstop: 0.1 }); game.vfx.explode(foe.pos.clone().setY(5), { color: this.color, radius: 10, power: 1.1, scorch: false }); game.world.shake(1.2); game.world.punch(0.8); }
        if (k >= 1) { this.state = 'idle'; this._hit = false; }
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
    if (this._cover) { const i = game.world.cover.indexOf(this._cover); if (i >= 0) game.world.cover.splice(i, 1); }
    game.vfx.flash(this.pos.clone(), this.color, 6, 0.2);
    game.scene.remove(this.obj); this.obj.children.forEach(c => { c.geometry.dispose(); c.material.dispose(); });
  }
}
