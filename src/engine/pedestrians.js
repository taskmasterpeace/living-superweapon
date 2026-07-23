// THRESHOLD — the crowd. Instanced civilians (ONE draw call) who walk the street grid,
// stop to FILM nearby superweapons (phone camera flashes — the ruled reaction), scatter
// from violence, and get knocked flat by blasts (collateral — the hero-mode conscience).
// v1 of the Witness Layer: no police escalation yet, but the city is no longer empty.
import * as THREE from 'three';

const COUNT = 30;   // a present crowd, not a swarm (creator note: "don't make too many")
const WALK = 0, FLEE = 1, DOWN = 2, FILM = 3;
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
const _Y = new THREE.Vector3(0, 1, 0), _Z = new THREE.Vector3(0, 0, 1);

export class Pedestrians {
  constructor(scene, arena, waterX) {
    this.arena = arena; this.waterX = waterX;   // stay off the harbor
    const geo = new THREE.CapsuleGeometry(0.88, 4.6, 3, 8); geo.translate(0, 3.15, 0);   // ~7.2u — true human scale against the buildings (heroes at 9.6u stay larger than life)
    const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, metalness: 0 });
    this.mesh = new THREE.InstancedMesh(geo, mat, COUNT);
    this.mesh.frustumCulled = false; this.mesh.castShadow = false; this.mesh.receiveShadow = true;
    const col = new THREE.Color();
    const CIV = ['#8a8577', '#5a6a7a', '#7a5a4a', '#4a5a4a', '#9a8a6a', '#6a4a5a', '#7a7a8a'];
    for (let i = 0; i < COUNT; i++) this.mesh.setColorAt(i, col.set(CIV[i % CIV.length]).offsetHSL(0, 0, (Math.random() - 0.5) * 0.08));
    this.px = new Float32Array(COUNT); this.pz = new Float32Array(COUNT);
    this.dir = new Float32Array(COUNT); this.spd = new Float32Array(COUNT);
    this.state = new Uint8Array(COUNT); this.t = new Float32Array(COUNT);
    this.reset();
    scene.add(this.mesh);
  }

  _lane() {                                   // a random street line on the 96u block grid
    const k = ((Math.random() * ((this.arena * 2) / 96 - 1)) | 0) + 1;
    return -this.arena + k * 96;
  }
  _respawn(i) {
    const alongX = Math.random() < 0.5;
    const lane = this._lane(), along = (Math.random() * 2 - 1) * (this.arena - 20);
    let x = alongX ? along : lane, z = alongX ? lane : along;
    if (x > this.waterX - 8) x = this.waterX - 8 - Math.random() * 40;
    this.px[i] = x; this.pz[i] = z;
    this.dir[i] = alongX ? (Math.random() < 0.5 ? 0 : Math.PI) : (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
    this.spd[i] = 7 + Math.random() * 4;
    this.state[i] = WALK; this.t[i] = 1 + Math.random() * 4;
  }
  reset() { for (let i = 0; i < COUNT; i++) this._respawn(i); this._writeAll(); }
  _writeAll() { for (let i = 0; i < COUNT; i++) this._write(i); this.mesh.instanceMatrix.needsUpdate = true; if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true; }
  _write(i) {
    if (this.state[i] === DOWN) {                                    // flat on the pavement
      _q.setFromAxisAngle(_Z, Math.PI / 2).premultiply(new THREE.Quaternion().setFromAxisAngle(_Y, this.dir[i]));
      _m4.compose(_p.set(this.px[i], 0.9, this.pz[i]), _q, _s.set(1, 1, 1));
    } else {
      _q.setFromAxisAngle(_Y, -this.dir[i] + Math.PI / 2);
      _m4.compose(_p.set(this.px[i], 0, this.pz[i]), _q, _s.set(1, 1, 1));
    }
    this.mesh.setMatrixAt(i, _m4);
  }

  // violence nearby → run from it
  scare(x, z, r) {
    const r2 = r * r;
    for (let i = 0; i < COUNT; i++) {
      if (this.state[i] === DOWN) continue;
      const dx = this.px[i] - x, dz = this.pz[i] - z;
      if (dx * dx + dz * dz > r2) continue;
      this.state[i] = FLEE; this.t[i] = 2.2 + Math.random() * 1.6;
      this.dir[i] = Math.atan2(dx, dz) + (Math.random() - 0.5) * 0.6;   // away, with panic scatter
    }
  }
  // a blast knocks them flat; returns how many went down (collateral)
  blast(x, z, r) {
    const r2 = r * r; let downed = 0;
    for (let i = 0; i < COUNT; i++) {
      if (this.state[i] === DOWN) continue;
      const dx = this.px[i] - x, dz = this.pz[i] - z;
      if (dx * dx + dz * dz > r2) continue;
      this.state[i] = DOWN; this.t[i] = 4.5; this._write(i); downed++;
    }
    if (downed) this.mesh.instanceMatrix.needsUpdate = true;
    this.scare(x, z, r * 3.2);
    return downed;
  }

  update(dt, game) {
    const A = this.arena - 8;
    let moved = false;
    const P = game.player;
    for (let i = 0; i < COUNT; i++) {
      const st = this.state[i];
      this.t[i] -= dt;
      if (st === DOWN) { if (this.t[i] <= 0) { this._respawn(i); moved = true; } continue; }
      if (st === FILM) {
        if (P && Math.random() < dt * 2.2) {                          // paparazzi flash
          game.particles.spawn({ x: this.px[i], y: 5.6, z: this.pz[i], vx: 0, vy: 1, vz: 0, life: 0.12, size: 3.6, color: ['#ffffff', '#cfe8ff'], drag: 0, shrink: true });
        }
        if (this.t[i] <= 0) { this.state[i] = WALK; this.t[i] = 2 + Math.random() * 4; }
        continue;
      }
      const speed = st === FLEE ? this.spd[i] * 2.7 : this.spd[i];
      this.px[i] += Math.sin(this.dir[i]) * speed * dt;
      this.pz[i] += Math.cos(this.dir[i]) * speed * dt;
      moved = true;
      // bounds + harbor: turn around
      if (Math.abs(this.px[i]) > A || Math.abs(this.pz[i]) > A || this.px[i] > this.waterX - 6) {
        this.px[i] = Math.max(-A, Math.min(Math.min(A, this.waterX - 6), this.px[i]));
        this.pz[i] = Math.max(-A, Math.min(A, this.pz[i]));
        this.dir[i] += Math.PI;
      }
      if (st === FLEE) { if (this.t[i] <= 0) { this.state[i] = WALK; this.t[i] = 2 + Math.random() * 4; } this._write(i); continue; }
      // walking: sometimes turn at the block grid, sometimes stop and film a nearby superweapon
      if (this.t[i] <= 0) {
        this.t[i] = 2 + Math.random() * 4;
        if (Math.random() < 0.35) this.dir[i] += (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2;
      }
      if (P) {
        const dx = P.pos.x - this.px[i], dz = P.pos.z - this.pz[i], d2 = dx * dx + dz * dz;
        if (d2 < 100) { this.state[i] = FLEE; this.t[i] = 1.6; this.dir[i] = Math.atan2(-dx, -dz); }   // too close — personal space
        else if (d2 < 900 && Math.random() < dt * 0.5) { this.state[i] = FILM; this.t[i] = 2 + Math.random() * 2.5; this.dir[i] = Math.atan2(dx, dz); }
      }
      this._write(i);
    }
    if (moved) this.mesh.instanceMatrix.needsUpdate = true;
  }
}
