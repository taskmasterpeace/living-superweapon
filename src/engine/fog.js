// THE FOG OF WAR — extracted from world.js (code review item 8).
//
// These are METHODS OF World, kept as a mixin and installed onto World.prototype, so `this`
// still means the world and not one call site had to change. The text is byte-identical to
// what left world.js; only its address changed.
//
// ⚠ The two laws that live here and must not drift:
//   · rasterise the INTERIOR of each cover box, never its bounding texels — growing each box
//     outward put a ~2u halo of false occlusion around every wall and blinded a fighter
//     standing flush against one.
//   · fog SHADING is approximate (96% agreement with analytic LOS at working range). Gameplay
//     LOS — game.canSee, AI vision, targeting — is EXACT and separate. Never fix one with the other.
import * as THREE from 'three';
import { clamp } from '../core/util.js';

const FOG_RES = 384, FOG_EXT = 700, FOG_STEPS = 26;

export const FogMixin = {
  _buildFogOfWar() {
    // ---- THE OCCUPANCY GRID ------------------------------------------------------------------
    // ⚠ THIS USED TO BE A FIXED ARRAY OF 24 BOXES. `uniform vec2 uBoxC[24]` is a GLSL compile-time
    // constant, so the shader — not the design — decided how dense a city could be: cityplan's
    // STRUCT_CAP existed ONLY to match it, and a Mega City threw a third of itself away as empty
    // plaza and came out feeling EMPTIER than a small town. Occlusion is a coarse GRID TEXTURE
    // now and the segment test is a short march through it, so the cost is O(1) in the number of
    // buildings. There is no ceiling any more — density is a design dial again.
    const RES = FOG_RES, EXT = FOG_EXT;                       // 256 texels across 700 world units ≈ 2.7u
    this._occData = new Uint8Array(RES * RES);
    this._occTex = new THREE.DataTexture(this._occData, RES, RES, THREE.RedFormat, THREE.UnsignedByteType);
    this._occTex.minFilter = this._occTex.magFilter = THREE.NearestFilter;
    this._occTex.wrapS = this._occTex.wrapT = THREE.ClampToEdgeWrapping;
    this._occTex.needsUpdate = true;
    this._occHeights = new Float32Array(RES * RES * 4);
    this._occHeightTex = new THREE.DataTexture(this._occHeights, RES, RES, THREE.RGBAFormat, THREE.FloatType);
    this._occHeightTex.minFilter=this._occHeightTex.magFilter=THREE.NearestFilter;
    this._occHeightTex.needsUpdate=true;
    this.fogMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: {
        uPlayer: { value: new THREE.Vector2(0, 0) }, uDir: { value: new THREE.Vector2(0, 1) },
        uP2: { value: new THREE.Vector2(0, 0) }, uHas2: { value: 0 },
        uCos: { value: Math.cos(0.96) }, uRange: { value: 96 }, uNear: { value: 26 }, uDark: { value: 0.74 },   // softened for the White City — unseen streets ghost through instead of blacking out
        uTint: { value: new THREE.Color('#ffd24a') }, uOcc: { value: this._occTex }, uOccExt: { value: EXT },
        uOccHeight:{value:this._occHeightTex}, uEyeY:{value:5}, uEye2Y:{value:5},
      },
      vertexShader: `varying vec2 vW; void main(){ vW=(modelMatrix*vec4(position,1.0)).xz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `
        precision highp float;
        varying vec2 vW; uniform vec2 uPlayer; uniform vec2 uDir; uniform vec2 uP2; uniform float uHas2, uCos, uRange, uNear, uDark;
        uniform vec3 uTint; uniform sampler2D uOcc; uniform float uOccExt;
        uniform sampler2D uOccHeight; uniform float uEyeY, uEye2Y;
        // march the sight line through the occupancy grid. Skips the first and last few percent so
        // standing against a wall doesn't blind you to your own feet — same tolerance the old
        // analytic box test used (tmin > 0.03, tmin < 0.985).
        bool blocked(vec2 p0, vec2 p1, float eye){
          vec2 d = p1 - p0;
          if (dot(d,d) < 4.0) return false;
          for (int i = 1; i < ${FOG_STEPS}; i++) {
            float t = 0.03 + (0.955 / float(${FOG_STEPS})) * float(i);
            vec2 uv = (p0 + d * t) / uOccExt + 0.5;
            vec4 bounds=texture2D(uOccHeight,uv);
            float rayY=mix(eye,0.4,t);
            if (texture2D(uOcc, uv).r > 0.5 && rayY>=bounds.r && rayY<=bounds.g) return true;
          }
          return false;
        }
        void main(){
          vec2 d = vW - uPlayer; float dist = length(d); vec2 nd = d/max(dist,0.001);
          float near = 1.0 - smoothstep(uNear*0.72, uNear, dist);
          float cone = smoothstep(uCos-0.10, uCos+0.03, dot(nd,uDir)) * (1.0 - smoothstep(uRange*0.72, uRange, dist));
          // A nearby wall still obstructs sight. Camera height never changes this ray.
          if(max(near,cone)>0.01 && blocked(uPlayer,vW,uEyeY)){cone=0.0;near=0.0;}
          float near2 = uHas2 * (1.0 - smoothstep(uNear * 0.72, uNear, length(vW - uP2)));   // 2nd player reveal bubble
          if(near2>0.01 && blocked(uP2,vW,uEye2Y))near2=0.0;
          float vis = clamp(max(max(near, cone), near2), 0.0, 1.0);
          // faint warm rim right at the vision edge
          float rim = smoothstep(0.15,0.5,vis)*(1.0-smoothstep(0.5,0.85,vis));
          vec3 col = mix(vec3(0.015,0.02,0.035), uTint*0.6, rim*0.25);
          gl_FragColor = vec4(col, (1.0 - vis) * uDark);
        }`,
    });
    const g = new THREE.PlaneGeometry(FOG_EXT, FOG_EXT);   // one geometry, SCALED to fit any plan
    this.fog = new THREE.Mesh(g, this.fogMat);
    this.fog.rotation.x = -Math.PI / 2; this.fog.position.y = 0.4; this.fog.renderOrder = 2;
    this.scene.add(this.fog);
    this._fogExt = FOG_EXT;
  },

  _fitFog(plan) {
    if (!this.fogMat) return;
    const need = Math.max(FOG_EXT, (plan ? plan.arena : this.ARENA) * 2 + 140);
    this._fogExt = need;
    this.fog.scale.set(need / FOG_EXT, need / FOG_EXT, 1);
    this.fogMat.uniforms.uOccExt.value = need;
  },

  updateFog(px, pz, dx, dz, tint, p2, eyeY=5) {
    if (!this.fogMat) return;
    const u = this.fogMat.uniforms;
    u.uPlayer.value.set(px, pz); u.uDir.value.set(dx, dz);
    u.uEyeY.value=eyeY;u.uEye2Y.value=(p2?.y||0)+5;
    if (tint) u.uTint.value.set(tint);
    if (p2) { u.uP2.value.set(p2.x, p2.z); u.uHas2.value = 1; } else u.uHas2.value = 0;
  },

  setFogEnabled(on) { if (this.fog) this.fog.visible = on; },

  refreshFogBoxes() {
    if (!this._occData) return;
    const D = this._occData, RES = FOG_RES, EXT = this._fogExt || FOG_EXT, S = EXT / RES;
    D.fill(0);
    this._occHeights?.fill(0);
    // ⚠ RASTERISE THE INTERIOR, never the bounding texels. Growing each box outward by a texel
    // put a ~2u halo of false occlusion around every wall, and a fighter standing flush against
    // one was blinded to their own feet. Ceil/floor keeps the occluder inside the real building.
    const rast = (x, z, hx, hz, bottom=0, top=1000) => {
      let c0 = Math.ceil((x - hx) / S + RES / 2), c1 = Math.floor((x + hx) / S + RES / 2);
      let r0 = Math.ceil((z - hz) / S + RES / 2), r1 = Math.floor((z + hz) / S + RES / 2);
      // a box thinner than one texel would vanish entirely — give it its centre texel
      if (c1 < c0) { c0 = c1 = Math.round(x / S + RES / 2); }
      if (r1 < r0) { r0 = r1 = Math.round(z / S + RES / 2); }
      c0 = Math.max(0, c0); c1 = Math.min(RES - 1, c1);
      r0 = Math.max(0, r0); r1 = Math.min(RES - 1, r1);
      for (let r = r0; r <= r1; r++) { const base = r * RES; for (let cc = c0; cc <= c1; cc++) {
        const index=base+cc,H=this._occHeights;if(H){H[index*4]=D[index]?Math.min(H[index*4],bottom):bottom;H[index*4+1]=Math.max(H[index*4+1],top);}D[index]=255;
      } }
    };
    for (const c of this.cover) { if (!c.destroyed) rast(c.x, c.z, c.hx ?? c.r, c.hz ?? c.r,c.bottom??0,c.top??c.h??1000); }
    // interior walls occlude the fog too — a room you haven't looked into is dark
    for (const it of this.interiors) for (const wl of it.walls) rast(wl.x, wl.z, wl.hx, wl.hz,wl.bottom??0,wl.top??it.top??1000);
    this._occTex.needsUpdate = true;
    if(this._occHeightTex)this._occHeightTex.needsUpdate=true;
  },
};



