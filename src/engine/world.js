// Living Superweapon — 3D world: renderer, scene, iso camera, lights, arena, bloom.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { clamp, damp } from '../core/util.js';

export const ARENA = 240; // half-extent of playfield — big enough to fly across

export class World {
  constructor(canvas) {
    this.canvas = canvas;
    this.ARENA = ARENA;   // instance mirror — the radar reads g.world.ARENA
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
    this._maxPR = Math.min(devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(this._maxPR);
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.28;
    // adaptive quality (keeps frame-rate smooth by scaling resolution)
    this._ema = 16.7; this._qTier = 2; this._qCool = 2; this._lastRender = 0;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0e1119');
    this.scene.fog = new THREE.FogExp2('#0e1119', 0.00055);

    // --- Isometric orthographic camera ---
    this.camTarget = new THREE.Vector3(0, 6, 0);
    this.camPos = new THREE.Vector3();
    this.frustum = 78;          // world units of vertical view (zoom)
    this.frustumTarget = 78;
    this.camDir = new THREE.Vector3(0.86, 0.92, 0.86).normalize(); // iso-ish angle
    this.camDist = 260;
    const asp = innerWidth / innerHeight;
    this.camera = new THREE.OrthographicCamera(
      -this.frustum * asp, this.frustum * asp, this.frustum, -this.frustum, 1, 1400
    );
    this._shake = 0; this.shakeV = new THREE.Vector3();

    this._buildLights();
    this._buildSky();
    this._buildArena();
    this._buildGrass();
    this._buildFogOfWar();
    this._buildComposer();

    addEventListener('resize', () => this.resize());
    this.resize();
  }

  _buildLights() {
    const hemi = new THREE.HemisphereLight('#bcd4ff', '#43352a', 1.28);
    this.scene.add(hemi);
    this.scene.add(new THREE.AmbientLight('#6a7890', 0.5));
    const sun = new THREE.DirectionalLight('#fff2dc', 1.8);
    sun.position.set(120, 200, 80);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    // tight frustum that FOLLOWS the camera target (see follow()) — the visible area is ~160 units,
    // so a 110-unit half-extent doubles effective shadow texel density vs. covering the whole arena
    const d = 110;
    sun.shadow.camera.left = -d; sun.shadow.camera.right = d;
    sun.shadow.camera.top = d; sun.shadow.camera.bottom = -d;
    sun.shadow.camera.near = 40; sun.shadow.camera.far = 520;
    sun.shadow.bias = -0.0004;
    this.scene.add(sun); this.scene.add(sun.target);
    this.sun = sun;
    // cool back-rim (opposite the sun) — edge-lights heroes so they pop off the dark arena
    const rim = new THREE.DirectionalLight('#8fb8ff', 0.75);
    rim.position.set(-130, 90, -150);
    this.scene.add(rim);
    // subtle warm kicker from below-front for drama
    const kick = new THREE.DirectionalLight('#ff8a3a', 0.22);
    kick.position.set(70, 24, 120);
    this.scene.add(kick);
  }

  _buildSky() {
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vP; void main(){
        vec3 n = normalize(vP); float h = n.y*0.5+0.5;
        vec3 top = vec3(0.03,0.04,0.075), hor = vec3(0.075,0.07,0.10);
        vec3 c = mix(hor, top, smoothstep(0.30,0.9,h));
        c += vec3(0.10,0.05,0.01) * pow(max(0.0, dot(n, normalize(vec3(0.7,0.12,0.7)))), 5.0);   // warm horizon glow
        gl_FragColor = vec4(c, 1.0);
      }`,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 16), mat);
    sky.renderOrder = -1; this.scene.add(sky);
  }

  _buildArena() {
    const g = new THREE.Group();
    // ground texture: dark warm grid
    const tex = this._gridTexture();
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0.0, color: '#454f63' });
    const SEG = 112;
    const groundGeo = new THREE.PlaneGeometry(ARENA * 2, ARENA * 2, SEG, SEG);
    const ground = new THREE.Mesh(groundGeo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    g.add(ground);
    this.ground = ground; this.groundGeo = groundGeo;
    // per-vertex world XZ + accumulated height (for GeoMod-style craters); local +z maps to world +y
    const pa = groundGeo.attributes.position.array; const nV = pa.length / 3;
    this._gvx = new Float32Array(nV); this._gvz = new Float32Array(nV); this._gh = new Float32Array(nV);
    for (let i = 0; i < nV; i++) { this._gvx[i] = pa[i * 3]; this._gvz[i] = -pa[i * 3 + 1]; }

    // subtle center emblem ring
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(30, 33, 64),
      new THREE.MeshBasicMaterial({ color: '#f5b21a', transparent: true, opacity: 0.12 })
    );
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05;
    g.add(ring);
    // soft center glow (draws the eye to the arena centre)
    const glow = new THREE.Mesh(new THREE.CircleGeometry(70, 48), new THREE.MeshBasicMaterial({ map: this._radialTex(), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = 0.06; g.add(glow);

    // border walls (emissive strips)
    const wallMat = new THREE.MeshStandardMaterial({ color: '#0c0e14', emissive: '#f5b21a', emissiveIntensity: 0.35, roughness: 0.6 });
    const wh = 6, t = 3;
    const mk = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, wh, d), wallMat); m.position.set(x, wh / 2, z); m.castShadow = true; m.receiveShadow = true; g.add(m); };
    mk(ARENA * 2 + t, t, 0, -ARENA); mk(ARENA * 2 + t, t, 0, ARENA);
    mk(t, ARENA * 2 + t, -ARENA, 0); mk(t, ARENA * 2 + t, ARENA, 0);

    // Soldat-style cover: scattered blocks & pillars
    this.cover = []; this.coverAll = [];
    // lighter cool slate + faint self-glow so shadowed faces read as volume instead of crushing to black
    const coverMat = new THREE.MeshStandardMaterial({ color: '#252d42', emissive: '#0f1a2e', emissiveIntensity: 0.4, roughness: 0.82, metalness: 0.12 });
    const spots = [
      [-52, -30, 10, 22, 10], [46, 40, 12, 16, 12], [10, -64, 26, 12, 8],
      [-70, 58, 9, 30, 9], [72, -58, 9, 26, 9], [-14, 70, 20, 10, 12],
      [60, 4, 8, 20, 8], [-44, 8, 8, 18, 8],
      [-110, -20, 12, 26, 12], [108, 30, 10, 20, 10], [30, 110, 22, 14, 10],
      [-96, 96, 9, 24, 9], [96, -104, 10, 22, 10], [-30, -112, 18, 12, 12],
      [120, -30, 8, 28, 8], [-120, 40, 8, 18, 14],
      [-180, -150, 14, 20, 12], [175, 160, 12, 24, 12], [180, -160, 10, 18, 14], [-165, 170, 16, 14, 10],   // far-field cover for the big map
    ];
    const crackTex = this._crackTexture();
    for (const [x, z, w, h, d] of spots) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), coverMat);
      m.position.set(x, h / 2, z); m.castShadow = true; m.receiveShadow = true;
      g.add(m);
      // crack overlay — fades in as the block takes damage
      const crack = new THREE.Mesh(new THREE.BoxGeometry(w * 1.015, h * 1.006, d * 1.015), new THREE.MeshBasicMaterial({ map: crackTex, transparent: true, opacity: 0, depthWrite: false }));
      crack.position.copy(m.position); crack.visible = false; g.add(crack);   // hidden until damaged — 16 fewer transparent draws

      const hp = Math.round(70 + w * h * d * 0.017);   // destructible, but tough — bigger = tougher
      const co = { mesh: m, crack, x, z, r: Math.max(w, d) * 0.6, h, hx: w / 2, hz: d / 2, top: h, hp, maxHp: hp, y0: h / 2, w, d, destroyed: false };
      this.cover.push(co); this.coverAll.push(co);
    }
    this.scene.add(g);
    this.arena = g;
  }

  // --- grass: ONE InstancedMesh (single draw call), wind sway in the vertex shader,
  // and every crater/scorch FLATTENS the blades inside it — cheap mileage from destruction.
  _buildGrass() {
    const COUNT = 2400;
    const geo = new THREE.PlaneGeometry(1.5, 2.1, 1, 2); geo.translate(0, 1.05, 0);   // pivot at the roots
    const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.92, metalness: 0, side: THREE.DoubleSide });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = this._grassTime = { value: 0 };
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vec4 gw = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
         transformed.x += sin(uTime * 1.7 + gw.x * 0.33 + gw.z * 0.29) * 0.26 * position.y;`
      );
    };
    const grass = new THREE.InstancedMesh(geo, mat, COUNT);
    grass.frustumCulled = false; grass.receiveShadow = true; grass.renderOrder = 1;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sv = new THREE.Vector3(), pv = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
    this._gPos = new Float32Array(COUNT * 2); this._gRot = new Float32Array(COUNT); this._gScale = new Float32Array(COUNT); this._gOn = new Uint8Array(COUNT).fill(1);
    let placed = 0, tries = 0;
    while (placed < COUNT && tries++ < COUNT * 30) {
      const x = (Math.random() * 2 - 1) * (ARENA - 10), z = (Math.random() * 2 - 1) * (ARENA - 10);
      if (Math.hypot(x, z) < 44) continue;                                    // keep the gold centre stage clean
      let blocked = false;
      for (const c of this.coverAll) if (Math.abs(x - c.x) < c.hx + 2 && Math.abs(z - c.z) < c.hz + 2) { blocked = true; break; }
      if (blocked) continue;
      const i = placed++;
      this._gPos[i * 2] = x; this._gPos[i * 2 + 1] = z;
      this._gRot[i] = Math.random() * Math.PI; this._gScale[i] = 0.7 + Math.random() * 0.85;
      m4.compose(pv.set(x, 0, z), q.setFromAxisAngle(Y, this._gRot[i]), sv.setScalar(this._gScale[i]));
      grass.setMatrixAt(i, m4);
      grass.setColorAt(i, col.setHSL(0.26 + Math.random() * 0.06, 0.42, 0.24 + Math.random() * 0.14));
    }
    grass.count = placed;
    grass.instanceMatrix.needsUpdate = true; if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
    this.grass = grass; this.scene.add(grass);
  }
  // scorch it, crater it, burn it — the blades in the radius go down and stay down until reset
  flattenGrass(cx, cz, r) {
    if (!this.grass) return;
    const r2 = r * r; let touched = false;
    for (let i = 0; i < this.grass.count; i++) {
      if (!this._gOn[i]) continue;
      const dx = this._gPos[i * 2] - cx, dz = this._gPos[i * 2 + 1] - cz;
      if (dx * dx + dz * dz > r2) continue;
      this._gOn[i] = 0; touched = true;
      _gm4.makeScale(0.001, 0.001, 0.001); _gm4.setPosition(this._gPos[i * 2], -2, this._gPos[i * 2 + 1]);
      this.grass.setMatrixAt(i, _gm4);
    }
    if (touched) this.grass.instanceMatrix.needsUpdate = true;
  }
  _restoreGrass() {
    if (!this.grass) return;
    const q = new THREE.Quaternion(), sv = new THREE.Vector3(), pv = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < this.grass.count; i++) {
      if (this._gOn[i]) continue;
      this._gOn[i] = 1;
      _gm4.compose(pv.set(this._gPos[i * 2], 0, this._gPos[i * 2 + 1]), q.setFromAxisAngle(Y, this._gRot[i]), sv.setScalar(this._gScale[i]));
      this.grass.setMatrixAt(i, _gm4);
    }
    this.grass.instanceMatrix.needsUpdate = true;
  }

  _gridTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const x = c.getContext('2d');
    x.fillStyle = '#242a37'; x.fillRect(0, 0, 512, 512);
    x.fillStyle = 'rgba(255,255,255,0.014)'; x.fillRect(0, 0, 256, 256); x.fillRect(256, 256, 256, 256); // checker shade
    x.strokeStyle = 'rgba(150,175,215,0.15)'; x.lineWidth = 1.5;
    for (let i = 0; i <= 512; i += 32) { x.beginPath(); x.moveTo(i + .5, 0); x.lineTo(i + .5, 512); x.stroke(); x.beginPath(); x.moveTo(0, i + .5); x.lineTo(512, i + .5); x.stroke(); }
    x.strokeStyle = 'rgba(245,178,26,0.11)'; x.lineWidth = 2.5;
    for (let i = 0; i <= 512; i += 128) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 512); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(512, i); x.stroke(); }
    x.strokeStyle = 'rgba(160,185,225,0.30)'; x.lineWidth = 2;   // tech corner ticks
    for (let gx = 0; gx <= 512; gx += 128) for (let gy = 0; gy <= 512; gy += 128) { x.beginPath(); x.moveTo(gx - 6, gy); x.lineTo(gx + 6, gy); x.moveTo(gx, gy - 6); x.lineTo(gx, gy + 6); x.stroke(); }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(20, 20);
    t.anisotropy = 8;
    return t;
  }
  _radialTex() {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(245,178,26,0.5)'); gr.addColorStop(0.5, 'rgba(245,178,26,0.11)'); gr.addColorStop(1, 'rgba(245,178,26,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }

  _buildComposer() {
    const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 2 });  // HDR + light MSAA (crisp edges)
    this.composer = new EffectComposer(this.renderer, rt);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth * 0.5, innerHeight * 0.5), 0.66, 0.6, 0.8);      // half-res bloom (~4× cheaper)
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
  }

  resize() {
    const w = innerWidth, h = innerHeight, asp = w / h;
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.bloom.setSize(w * 0.5, h * 0.5);
    this.camera.left = -this.frustum * asp; this.camera.right = this.frustum * asp;
    this.camera.top = this.frustum; this.camera.bottom = -this.frustum;
    this.camera.updateProjectionMatrix();
  }

  setBaseZoom(f) { this._baseFrustum = f; }
  shake(a) { this._shake = Math.min(this._shake + a * (this.shakeMult ?? 1), 8); }
  punch(z) { this.frustumTarget = Math.min(this.frustumTarget, this.frustum * z); } // zoom IN briefly

  follow(target, dt) {
    // target: Vector3 (player world pos). Ease camera focus toward it.
    this.camTarget.x = damp(this.camTarget.x, target.x, 8, dt);
    this.camTarget.y = damp(this.camTarget.y, 6 + target.y * 0.4, 6, dt);
    this.camTarget.z = damp(this.camTarget.z, target.z, 8, dt);

    // zoom easing (punch back to base)
    this._shake *= Math.exp(-7 * dt);
    this.frustumTarget = damp(this.frustumTarget, this._baseFrustum || 78, 3.5, dt);
    this.frustum = damp(this.frustum, this.frustumTarget, 10, dt);
    const asp = innerWidth / innerHeight;
    this.camera.left = -this.frustum * asp; this.camera.right = this.frustum * asp;
    this.camera.top = this.frustum; this.camera.bottom = -this.frustum;
    this.camera.updateProjectionMatrix();

    this.shakeV.set((Math.random() * 2 - 1), (Math.random() * 2 - 1), (Math.random() * 2 - 1)).multiplyScalar(this._shake);
    this.camPos.copy(this.camDir).multiplyScalar(this.camDist).add(this.camTarget);
    this.camera.position.copy(this.camPos).add(this.shakeV);
    this.camera.lookAt(this.camTarget.x + this.shakeV.x, this.camTarget.y + this.shakeV.y, this.camTarget.z + this.shakeV.z);
    // drag the sun's tight shadow frustum along with the view (snapped to whole units so texels don't swim)
    const sx = Math.round(this.camTarget.x), sz = Math.round(this.camTarget.z);
    this.sun.position.set(sx + 120, 200, sz + 80);
    this.sun.target.position.set(sx, 0, sz);
  }

  // Screen (client px) -> ground world point (y=0 plane). Reuses one raycaster/plane (called every frame).
  screenToGround(mx, my, out = new THREE.Vector3()) {
    _ndc.set((mx / innerWidth) * 2 - 1, -(my / innerHeight) * 2 + 1);
    _ray.setFromCamera(_ndc, this.camera);
    _ray.ray.intersectPlane(_groundPlane, out);
    return out;
  }

  // --- Fog of war: darken the ground outside a vision cone + near radius, with wall shadows ---
  _buildFogOfWar() {
    const MAX = 20;
    const bc = [], bh = [];
    for (let i = 0; i < MAX; i++) { bc.push(new THREE.Vector2()); bh.push(new THREE.Vector2()); }
    let n = 0;
    for (const c of this.cover) { if (n >= MAX) break; bc[n].set(c.x, c.z); bh[n].set((c.hx ?? c.r) + 1, (c.hz ?? c.r) + 1); n++; }
    this.fogMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: {
        uPlayer: { value: new THREE.Vector2(0, 0) }, uDir: { value: new THREE.Vector2(0, 1) },
        uP2: { value: new THREE.Vector2(0, 0) }, uHas2: { value: 0 },
        uCos: { value: Math.cos(0.96) }, uRange: { value: 96 }, uNear: { value: 26 }, uDark: { value: 0.9 },
        uTint: { value: new THREE.Color('#ffd24a') }, uBoxC: { value: bc }, uBoxH: { value: bh }, uBoxN: { value: n },
      },
      vertexShader: `varying vec2 vW; void main(){ vW=(modelMatrix*vec4(position,1.0)).xz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `
        precision highp float;
        varying vec2 vW; uniform vec2 uPlayer; uniform vec2 uDir; uniform vec2 uP2; uniform float uHas2, uCos, uRange, uNear, uDark;
        uniform vec3 uTint; uniform vec2 uBoxC[${MAX}]; uniform vec2 uBoxH[${MAX}]; uniform int uBoxN;
        bool segBox(vec2 p0, vec2 p1, vec2 c, vec2 h){
          vec2 d=p1-p0, mn=c-h, mx=c+h; float tmin=0.0, tmax=1.0;
          for(int a=0;a<2;a++){
            float dd=(a==0)?d.x:d.y, pa=(a==0)?p0.x:p0.y, na=(a==0)?mn.x:mn.y, xa=(a==0)?mx.x:mx.y;
            if(abs(dd)<1e-4){ if(pa<na||pa>xa) return false; }
            else { float t1=(na-pa)/dd, t2=(xa-pa)/dd; if(t1>t2){float t=t1;t1=t2;t2=t;} tmin=max(tmin,t1); tmax=min(tmax,t2); if(tmin>tmax) return false; }
          }
          return tmin>0.03 && tmin<0.985;
        }
        void main(){
          vec2 d = vW - uPlayer; float dist = length(d); vec2 nd = d/max(dist,0.001);
          float near = 1.0 - smoothstep(uNear*0.72, uNear, dist);
          float cone = smoothstep(uCos-0.10, uCos+0.03, dot(nd,uDir)) * (1.0 - smoothstep(uRange*0.72, uRange, dist));
          // walls cast vision shadows over the cone (not the near bubble)
          if(cone > 0.01){ for(int i=0;i<${MAX};i++){ if(i>=uBoxN) break; if(segBox(uPlayer, vW, uBoxC[i], uBoxH[i])){ cone=0.0; break; } } }
          float near2 = uHas2 * (1.0 - smoothstep(uNear * 0.72, uNear, length(vW - uP2)));   // 2nd player reveal bubble
          float vis = clamp(max(max(near, cone), near2), 0.0, 1.0);
          // faint warm rim right at the vision edge
          float rim = smoothstep(0.15,0.5,vis)*(1.0-smoothstep(0.5,0.85,vis));
          vec3 col = mix(vec3(0.015,0.02,0.035), uTint*0.6, rim*0.25);
          gl_FragColor = vec4(col, (1.0 - vis) * uDark);
        }`,
    });
    const g = new THREE.PlaneGeometry(ARENA * 2 + 40, ARENA * 2 + 40);
    this.fog = new THREE.Mesh(g, this.fogMat);
    this.fog.rotation.x = -Math.PI / 2; this.fog.position.y = 0.4; this.fog.renderOrder = 2;
    this.scene.add(this.fog);
  }

  updateFog(px, pz, dx, dz, tint, p2) {
    if (!this.fogMat) return;
    const u = this.fogMat.uniforms;
    u.uPlayer.value.set(px, pz); u.uDir.value.set(dx, dz);
    if (tint) u.uTint.value.set(tint);
    if (p2) { u.uP2.value.set(p2.x, p2.z); u.uHas2.value = 1; } else u.uHas2.value = 0;
  }
  setFogEnabled(on) { if (this.fog) this.fog.visible = on; }
  refreshFogBoxes() {
    if (!this.fogMat) return;
    const u = this.fogMat.uniforms, bc = u.uBoxC.value, bh = u.uBoxH.value; let n = 0;
    for (const c of this.cover) { if (n >= bc.length) break; bc[n].set(c.x, c.z); bh[n].set((c.hx ?? c.r) + 1, (c.hz ?? c.r) + 1); n++; }
    u.uBoxN.value = n;
  }

  // --- destructible terrain (GeoMod-lite): crater the ground ---
  crater(cx, cz, radius, depth) {
    if (!this.groundGeo) return;
    const pa = this.groundGeo.attributes.position.array, r132 = (radius * 1.3) * (radius * 1.3);
    let touched = false;
    for (let i = 0; i < this._gh.length; i++) {
      const dx = this._gvx[i] - cx, dz = this._gvz[i] - cz, d2 = dx * dx + dz * dz;
      if (d2 > r132) continue;
      const d = Math.sqrt(d2); let dh;
      if (d < radius) { const t = d / radius; dh = -depth * Math.pow(1 - t * t, 1.5); }   // bowl
      else { const t = (d - radius) / (radius * 0.3); dh = depth * 0.22 * Math.max(0, 1 - t); } // raised rim
      this._gh[i] = clamp(this._gh[i] + dh, -6.5, 1.4);                                        // accumulate, clamped (the limit)
      pa[i * 3 + 2] = this._gh[i]; touched = true;
    }
    if (touched) { this.groundGeo.attributes.position.needsUpdate = true; this.groundGeo.computeVertexNormals(); }
    this.flattenGrass(cx, cz, radius * 1.2);
  }

  setBlockCracks(c) {
    if (!c.crack) return;
    const dmg = 1 - Math.max(0, c.hp) / c.maxHp;
    c.crack.visible = dmg > 0.001;
    c.crack.material.opacity = Math.min(0.92, dmg * 1.15);
    const s = 1 - dmg * 0.05; c.mesh.scale.set(s, 1 - dmg * 0.12, s); c.crack.scale.set(s, 1 - dmg * 0.12, s);
  }
  removeBlockFromCover(c) {
    const i = this.cover.indexOf(c); if (i >= 0) this.cover.splice(i, 1);
    this.refreshFogBoxes();
  }

  // Restore all cover + flatten the ground (called on match start).
  resetTerrain() {
    for (const c of this.coverAll) {
      c.hp = c.maxHp; c.destroyed = false;
      c.mesh.visible = true; c.mesh.position.set(c.x, c.y0, c.z); c.mesh.scale.set(1, 1, 1);
      if (c.crack) { c.crack.visible = false; c.crack.material.opacity = 0; c.crack.position.copy(c.mesh.position); c.crack.scale.set(1, 1, 1); }
    }
    this.cover = this.coverAll.slice();
    this.refreshFogBoxes();
    this._restoreGrass();
    if (this.groundGeo) {
      const pa = this.groundGeo.attributes.position.array;
      for (let i = 0; i < this._gh.length; i++) { this._gh[i] = 0; pa[i * 3 + 2] = 0; }
      this.groundGeo.attributes.position.needsUpdate = true; this.groundGeo.computeVertexNormals();
    }
  }

  _crackTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    x.strokeStyle = 'rgba(214,222,236,0.92)'; x.lineCap = 'round';
    const rnd = ((s) => () => (s = (s * 16807) % 2147483647) / 2147483647)(99991);
    const branch = (x0, y0, ang, len, w) => {
      if (len < 6 || w < 0.4) return;
      x.lineWidth = w; const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
      const mx = (x0 + x1) / 2 + Math.cos(ang + 1.5) * len * 0.18, my = (y0 + y1) / 2 + Math.sin(ang + 1.5) * len * 0.18;
      x.beginPath(); x.moveTo(x0, y0); x.quadraticCurveTo(mx, my, x1, y1); x.stroke();
      branch(x1, y1, ang + (rnd() - 0.5) * 0.9, len * 0.7, w * 0.7);
      if (rnd() < 0.6) branch(x1, y1, ang + (rnd() - 0.5) * 1.7, len * 0.55, w * 0.6);
    };
    for (let i = 0; i < 7; i++) branch(128, 128, i / 7 * 6.283 + rnd(), 55 + rnd() * 45, 3);
    return new THREE.CanvasTexture(c);
  }

  // World point -> client (CSS) pixel position, for cursor-space targeting/HUD.
  screenPosOf(x, y, z, out = { x: 0, y: 0, behind: false }) {
    _proj.set(x, y, z).project(this.camera);
    out.x = (_proj.x * 0.5 + 0.5) * innerWidth;
    out.y = (-_proj.y * 0.5 + 0.5) * innerHeight;
    out.behind = _proj.z > 1;
    return out;
  }

  render() {
    const now = performance.now();
    if (this._grassTime) this._grassTime.value = now / 1000;   // wind
    if (this._lastRender) { const d = Math.min(now - this._lastRender, 100); this._ema = this._ema * 0.9 + d * 0.1; }
    this._lastRender = now;
    this.composer.render();
    this._qCool -= 0.016;
    if (this._qCool <= 0 && this.qualityOverride == null) {   // settings can lock the tier
      if (this._ema > 24 && this._qTier > 0) { this._qTier--; this._applyQuality(); this._qCool = 1.4; }
      else if (this._ema < 13.5 && this._qTier < 2) { this._qTier++; this._applyQuality(); this._qCool = 2.5; }
    }
  }
  _applyQuality() {
    const t = this._qTier;
    this.renderer.setPixelRatio(t === 2 ? this._maxPR : t === 1 ? Math.min(this._maxPR, 1) : 0.72);
    this.composer.setSize(innerWidth, innerHeight); this.bloom.setSize(innerWidth * 0.5, innerHeight * 0.5);
    this.bloom.strength = t === 2 ? 0.66 : t === 1 ? 0.55 : 0.42;
  }
  get fps() { return this._ema ? Math.round(1000 / this._ema) : 60; }

  // Compile the material variants that transient FX create lazily (beams, orbs, lightning, sprites)
  // so their first use mid-fight doesn't hitch on shader compilation.
  prewarm() {
    const g = new THREE.Group(); g.position.set(0, -400, 0);
    const geo = new THREE.SphereGeometry(1, 8, 6);
    g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
    g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })));
    g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial()));
    g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false })));
    g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.2, emissive: '#111' })));
    const lgeo = new THREE.BufferGeometry(); lgeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    g.add(new THREE.LineSegments(lgeo, new THREE.LineBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
    g.add(new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false })));
    this.scene.add(g);
    this.renderer.compile(this.scene, this.camera);
    this.scene.remove(g);
    geo.dispose(); lgeo.dispose(); g.traverse(o => { if (o.material) o.material.dispose(); });
  }
}

const _proj = new THREE.Vector3();
const _gm4 = new THREE.Matrix4();
const _ndc = new THREE.Vector2();
const _ray = new THREE.Raycaster();
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
