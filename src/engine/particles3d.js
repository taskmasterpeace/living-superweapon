// WAR WORLD: ASCENDANTS — 3D additive particle system (single Points buffer, CPU sim).
import * as THREE from 'three';
import { rand, TAU } from '../core/util.js';

const VERT = `
attribute float aSize;
attribute vec3 aColor;
attribute float aAlpha;
attribute float aShape;
varying vec3 vColor;
varying float vAlpha;
varying float vShape;
uniform float uMaxPx;   // aaa-06 §7: 0 = unbounded (the city). >0 caps device-pixel size in the close frame.
void main() {
  vColor = aColor; vAlpha = aAlpha;vShape=aShape;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * (300.0 / -mv.z);
  if (uMaxPx > 0.0) gl_PointSize = min(gl_PointSize, uMaxPx);
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = `
varying vec3 vColor;
varying float vAlpha;
varying float vShape;
uniform float uTime;
uniform float uFlamePass;
void main() {
  if((vShape>.5)!=(uFlamePass>.5))discard;
  if(vShape>.5){
    // Fire tongues rise and curl; energy/snow retain their existing soft dots.
    float height=1.0-gl_PointCoord.y;
    float bend=sin(height*5.0+uTime*11.0+vAlpha*7.0)*height*.11;
    float width=mix(.36,.025,height);
    float side=abs(gl_PointCoord.x-.5-bend)/max(.01,width);
    float flame=(1.0-smoothstep(.35,1.0,side))*smoothstep(0.0,.14,height)*(1.0-smoothstep(.78,1.0,height));
    if(flame<.01)discard;
    vec3 heat=mix(vColor,vec3(1.25,.5,.04),(1.0-height)*.35);
    gl_FragColor=vec4(heat,flame*vAlpha);return;
  }
  vec2 d = gl_PointCoord - 0.5;
  float r = dot(d, d);
  if (r > 0.25) discard;
  float a = smoothstep(0.25, 0.0, r);
  gl_FragColor = vec4(vColor, a * vAlpha);
}`;

export class Particles3D {
  constructor(scene, max = 6000) {
    this.max = max; this.n = 0;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.shape = new Float32Array(max);
    // sim data
    this.vx = new Float32Array(max); this.vy = new Float32Array(max); this.vz = new Float32Array(max);
    this.life = new Float32Array(max); this.maxLife = new Float32Array(max);
    this.grav = new Float32Array(max); this.drag = new Float32Array(max);
    this.size0 = new Float32Array(max); this.shrink = new Uint8Array(max);
    this._c = new THREE.Color();

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aShape', new THREE.BufferAttribute(this.shape, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setDrawRange(0, 0);
    this.geo = geo;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      uniforms: { uMaxPx: { value: 0 },uTime:{value:0},uFlamePass:{value:0} },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    // Flames absorb background light; additive blending bleached them white
    // against the desert sky. Share all particle buffers and the same shader.
    this.flameMat=this.mat.clone();this.flameMat.blending=THREE.NormalBlending;
    this.flameMat.uniforms.uMaxPx=this.mat.uniforms.uMaxPx;this.flameMat.uniforms.uTime=this.mat.uniforms.uTime;
    this.flameMat.uniforms.uFlamePass.value=1;
    // Existing owners retire the original particle material on teardown.
    this.mat.addEventListener('dispose',()=>this.flameMat.dispose());
    this.flamePoints=new THREE.Points(geo,this.flameMat);this.flamePoints.frustumCulled=false;
    // Venue preservation already protects the particle root. Keep the second
    // pass below that root so entering a lab cannot hide it independently.
    this.flamePoints.visible=false;this.points.add(this.flamePoints);
  }

  // aaa-06 §7: bound the on-screen area of a single additive spark in the close (chase) frame. `px`
  // is a device-pixel ceiling (0 = unbounded, the city). One uniform, one clamp; the count stays
  // cheap and near sparks still cue depth up to the cap.
  setMaxPx(px) { this.mat.uniforms.uMaxPx.value = px || 0; }

  spawn(o) {
    let i;
    if (this.n < this.max) i = this.n++;
    else i = (Math.random() * this.max) | 0; // recycle
    const i3 = i * 3;
    this.pos[i3] = o.x; this.pos[i3 + 1] = o.y; this.pos[i3 + 2] = o.z;
    this._c.set(o.color || '#fff');
    this.col[i3] = this._c.r; this.col[i3 + 1] = this._c.g; this.col[i3 + 2] = this._c.b;
    this.vx[i] = o.vx || 0; this.vy[i] = o.vy || 0; this.vz[i] = o.vz || 0;
    this.life[i] = this.maxLife[i] = o.life || 0.5;
    this.grav[i] = o.grav || 0; this.drag[i] = o.drag == null ? 1.6 : o.drag;
    this.size[i] = this.size0[i] = o.size || 2.4;
    this.shrink[i] = o.shrink === false ? 0 : 1;
    this.alpha[i] = 1;
    this.shape[i]=o.shape==='flame'?1:0;
  }

  // radial / directional burst
  burst(x, y, z, opt = {}) {
    const n = opt.count || 14, spd = opt.speed || 22;
    const dir = opt.dir; // {x,z} on ground, optional
    for (let i = 0; i < n; i++) {
      let vx, vy, vz;
      if (dir) {
        const a = Math.atan2(dir.z, dir.x) + rand(-(opt.spread || 0.5), (opt.spread || 0.5));
        const s = spd * rand(0.4, 1);
        vx = Math.cos(a) * s; vz = Math.sin(a) * s; vy = (opt.up || 0) + rand(0, opt.upSpread || 6);
      } else {
        const a = rand(0, TAU), p = Math.acos(rand(-1, 1)); const s = spd * rand(0.35, 1);
        vx = Math.sin(p) * Math.cos(a) * s; vz = Math.sin(p) * Math.sin(a) * s; vy = Math.cos(p) * s * 0.7 + (opt.up || 0);
      }
      this.spawn({
        x, y, z, vx, vy, vz,
        life: (opt.life || 0.5) * rand(0.6, 1.15),
        size: (opt.size || 2.6) * rand(0.6, 1.3),
        color: Array.isArray(opt.color) ? opt.color[(Math.random() * opt.color.length) | 0] : (opt.color || '#fff'),
        grav: opt.grav || 0, drag: opt.drag == null ? 1.6 : opt.drag, shrink: opt.shrink,shape:opt.shape,
      });
    }
  }

  update(dt) {
    this.mat.uniforms.uTime.value+=dt;
    const n = this.n;
    let alive = 0, high = 0,flames=0;                       // high = last live slot + 1, so `n` can shrink back down
    for (let i = 0; i < n; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      const i3 = i * 3;
      if (this.life[i] <= 0) { this.alpha[i] = 0; this.size[i] = 0; continue; }
      alive++; high = i + 1;
      if(this.shape[i]>.5)flames++;
      const dragF = Math.exp(-this.drag[i] * dt);
      this.vx[i] *= dragF; this.vz[i] *= dragF; this.vy[i] *= dragF;
      this.vy[i] -= this.grav[i] * dt;
      this.pos[i3] += this.vx[i] * dt; this.pos[i3 + 1] += this.vy[i] * dt; this.pos[i3 + 2] += this.vz[i] * dt;
      if (this.pos[i3 + 1] < 0) { this.pos[i3 + 1] = 0; this.vy[i] *= -0.3; this.vx[i] *= 0.7; this.vz[i] *= 0.7; }
      const t = this.life[i] / this.maxLife[i];
      this.alpha[i] = t;
      this.size[i] = this.shrink[i] ? this.size0[i] * t : this.size0[i];
    }
    if (alive === 0) this.n = 0;                   // pool fully idle → next spawns start at slot 0
    else if (high < this.n * 0.5) this.n = high;   // the live tail ended early → reclaim the dead top half
    this.geo.setDrawRange(0, this.n);
    this.flamePoints.visible=flames>0;
    if (this.n === 0) return;                      // nothing to upload
    for (const key of ['position', 'aColor', 'aSize', 'aAlpha','aShape']) {
      const at = this.geo.attributes[key];
      at.clearUpdateRanges();
      at.addUpdateRange(0, this.n * at.itemSize);  // upload only the used slots, not all 48k floats
      at.needsUpdate = true;
    }
  }
}
