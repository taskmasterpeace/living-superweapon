// =================================================================================================
// THE PRINT PASS — one full-screen shader that turns a rendered frame into a printed page.
//
// Robert's brief, verbatim: *"the comic-print stack: halftone in the shadows, ink on the silhouettes,
// a limited palette, paper grain over the whole thing... your speech balloons stop looking like a UI
// layer and start looking like they belong to the same object."* Plus tilt-shift, speed lines,
// ordered dithering, per-world grading and impact frames — all switchable from Options.
//
// ⚠ ONE PASS, NOT ELEVEN. This is the whole architectural decision and it is worth more than any of
// the individual effects. Every full-screen pass is a read of one render target and a write to
// another: at 1080p that is ~2M texels each way, and eleven of them costs more than the scene does.
// One shader that branches costs ONE. A disabled effect here is a uniform test, not a blit.
//
// ⚠ IT RUNS LAST, AFTER OutputPass, ON TONE-MAPPED sRGB. Halftone, palette snapping, grain and
// dither are PRINT operations — they act on a finished image, the way ink acts on paper. Run them in
// linear HDR before tone mapping and the quantisation lands on values nobody will ever see, and the
// halftone rides exposure instead of the picture. It therefore does NOT do a colorspace conversion:
// the buffer it reads has already had one, and doing it twice washes the whole frame out.
//
// ⚠ EDGES COME FROM LUMINANCE, NOT DEPTH — a deliberate trade, written down. Depth-based Sobel also
// catches same-tone silhouettes, but the composer ping-pongs its two targets and OutputPass writes
// over the buffer RenderPass put depth in; getting clean depth here needs either a depth pre-pass
// (a second full scene traversal) or replacing RenderPass. Neither is worth it yet, and for a PRINT
// look the luminance edge is arguably the more correct one: an inker draws where the TONE changes.
// If same-tone edges ever start to matter, the upgrade is a half-res depth pre-pass, and that is the
// only thing that would need to change.
//
// ⚠ NOTHING HERE TOUCHES LIGHTS. The light-count law is untouched: no pass in this file adds,
// removes or hides a light, so no material ever recompiles.
// =================================================================================================
import * as THREE from 'three';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// The house ink and paper. Warm-neutral dark and bone, never a pure black on pure white — a printed
// page has never been either, and the no-purple law applies here as everywhere else.
export const PRINT_DEFAULTS = {
  ink: 0.85,          // outline strength
  inkColor: '#14110c',
  halftone: 0.55,     // dot strength, shadows only
  halftoneScale: 2.4, // dot pitch in device pixels
  levels: 0,          // 0 = off; else snap each channel to N steps
  grain: 0.30,
  tilt: 0.0,          // tilt-shift strength
  tiltFocus: 0.52,    // where the sharp band sits, 0 = top of frame
  tiltWidth: 0.22,    // how tall the sharp band is
  dither: 0.35,
  speed: 0.0,         // speed lines — driven per-hit, not a setting
  grade: 1.0,         // per-world grading strength
  vibrance: 0.0,      // lifts DULL colours only — the one that makes things pop
  saturation: 0.0,    // the blunt instrument, for pulling a whole frame toward ink
};

const VERT = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const FRAG = /* glsl */`
uniform sampler2D tDiffuse;
uniform vec2  uTexel;        // 1 / render size, in device pixels
uniform vec2  uRes;
uniform float uInk, uHalf, uHalfScale, uLevels, uGrain, uTilt, uTiltFocus, uTiltWidth;
uniform float uDither, uSpeed, uTime, uInvert, uGrade, uVib, uSat;
uniform vec3  uInkCol, uLift, uGain;
uniform vec2  uSpeedC;
varying vec2 vUv;

float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float abs1(float x){ return x < 0.0 ? -x : x; }

// ⚠ THE BAYER MATRIX IS THE POINT OF ORDERED DITHER. Random noise in a gradient reads as film
// grain; an ORDERED threshold reads as print, because it is what a press actually does.
float bayer4(vec2 p){
  vec2 q = floor(mod(p, 4.0));
  float i = q.y * 4.0 + q.x;
  float b =
    i < 1.0 ? 0.0  : i < 2.0 ? 8.0  : i < 3.0 ? 2.0  : i < 4.0 ? 10.0 :
    i < 5.0 ? 12.0 : i < 6.0 ? 4.0  : i < 7.0 ? 14.0 : i < 8.0 ? 6.0  :
    i < 9.0 ? 3.0  : i < 10.0? 11.0 : i < 11.0? 1.0  : i < 12.0? 9.0  :
    i < 13.0? 15.0 : i < 14.0? 7.0  : i < 15.0? 13.0 : 5.0;
  return b / 16.0;
}

// cheap value noise for paper fibre — no texture, so nothing to load and nothing to ship
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
             mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
}

void main(){
  vec2 px = vUv * uRes;                       // device pixels — every screen-space pattern uses this
  vec3 c;

  // ---- 1. TILT-SHIFT, first, because everything after it should treat the blur as the picture.
  // ⚠ A SCREEN BAND, NOT A DEPTH RANGE — and for this camera that is the correct implementation, not
  // a shortcut. A tilt-shift lens rotates the focal PLANE; on a fixed isometric view that plane maps
  // to a horizontal band, which is exactly why the effect makes real cities look like models.
  float blur = 0.0;
  if (uTilt > 0.001) {
    blur = smoothstep(uTiltWidth, uTiltWidth + 0.30, abs(vUv.y - uTiltFocus)) * uTilt;
  }
  if (blur > 0.002) {
    vec2 r = uTexel * (1.0 + blur * 5.0);
    c  = texture2D(tDiffuse, vUv).rgb * 0.2270270270;
    c += texture2D(tDiffuse, vUv + vec2( r.x, 0.0) * 1.3846).rgb * 0.3162162162 * 0.5;
    c += texture2D(tDiffuse, vUv - vec2( r.x, 0.0) * 1.3846).rgb * 0.3162162162 * 0.5;
    c += texture2D(tDiffuse, vUv + vec2(0.0,  r.y) * 1.3846).rgb * 0.3162162162 * 0.5;
    c += texture2D(tDiffuse, vUv - vec2(0.0,  r.y) * 1.3846).rgb * 0.3162162162 * 0.5;
    c += texture2D(tDiffuse, vUv + vec2( r.x, 0.0) * 3.2307).rgb * 0.0702702703 * 0.5;
    c += texture2D(tDiffuse, vUv - vec2( r.x, 0.0) * 3.2307).rgb * 0.0702702703 * 0.5;
    c += texture2D(tDiffuse, vUv + vec2(0.0,  r.y) * 3.2307).rgb * 0.0702702703 * 0.5;
    c += texture2D(tDiffuse, vUv - vec2(0.0,  r.y) * 3.2307).rgb * 0.0702702703 * 0.5;
  } else {
    c = texture2D(tDiffuse, vUv).rgb;
  }

  // ---- 2. INK. Sobel over luminance. Eight taps, and only when it is switched on.
  if (uInk > 0.001) {
    float l00 = luma(texture2D(tDiffuse, vUv + uTexel * vec2(-1,-1)).rgb);
    float l10 = luma(texture2D(tDiffuse, vUv + uTexel * vec2( 0,-1)).rgb);
    float l20 = luma(texture2D(tDiffuse, vUv + uTexel * vec2( 1,-1)).rgb);
    float l01 = luma(texture2D(tDiffuse, vUv + uTexel * vec2(-1, 0)).rgb);
    float l21 = luma(texture2D(tDiffuse, vUv + uTexel * vec2( 1, 0)).rgb);
    float l02 = luma(texture2D(tDiffuse, vUv + uTexel * vec2(-1, 1)).rgb);
    float l12 = luma(texture2D(tDiffuse, vUv + uTexel * vec2( 0, 1)).rgb);
    float l22 = luma(texture2D(tDiffuse, vUv + uTexel * vec2( 1, 1)).rgb);
    float gx = (l00 + 2.0 * l01 + l02) - (l20 + 2.0 * l21 + l22);
    float gy = (l00 + 2.0 * l10 + l20) - (l02 + 2.0 * l12 + l22);
    float e = sqrt(gx * gx + gy * gy);
    // ⚠ A LINE HAS TO HAVE A WEIGHT, NOT A GRADIENT. Ramping opacity with the gradient gives a soft
    // charcoal smudge; an inker puts down a line or does not. smoothstep is the nib.
    e = smoothstep(0.10, 0.34, e) * uInk;
    // blurred regions are out of focus, and an inker does not outline what the lens threw away
    e *= (1.0 - blur * 0.85);
    c = mix(c, uInkCol, clamp(e, 0.0, 1.0));
  }

  // ---- 3. PALETTE. Snap to N steps per channel, in a way that keeps the hue.
  if (uLevels > 1.5) {
    float lum = luma(c);
    float q = floor(lum * uLevels + 0.5) / uLevels;         // quantise the TONE
    c = c * (q / max(0.0001, lum));                          // ...and carry the hue with it
    c = clamp(c, 0.0, 1.6);
  }

  // ---- 4. HALFTONE, IN THE SHADOWS ONLY. This is the whole idea: dots where a printer would need
  // them, which is the dark end. Rotated 15° because an unrotated dot grid reads as a screen door.
  if (uHalf > 0.001) {
    float lum = luma(c);
    float mask = 1.0 - smoothstep(0.05, 0.62, lum);          // shadows only
    if (mask > 0.002) {
      float a = 0.2618;                                      // 15 degrees
      mat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));
      vec2 g = (rot * px) / max(0.6, uHalfScale);
      vec2 cell = fract(g) - 0.5;
      // dot RADIUS carries the tone — that is what a halftone is
      float r = (1.0 - lum) * 0.62;
      float d = smoothstep(r, r - 0.16, length(cell));
      c = mix(c, c * 0.42, (1.0 - d) * mask * uHalf);
    }
  }

  // ---- 5. SPEED LINES — radial streaks from the impact, driven per-hit and normally zero.
  if (uSpeed > 0.001) {
    vec2 d = vUv - uSpeedC;
    float ang = atan(d.y, d.x);
    float rad = length(d);
    float streak = pow(abs(sin(ang * 34.0 + hash(vec2(floor(ang * 34.0), 3.0)) * 6.28)), 8.0);
    float reach = smoothstep(0.16, 0.62, rad);               // never over the middle of the action
    c = mix(c, vec3(1.0), streak * reach * uSpeed * 0.55);
  }

  // ---- 6. ORDERED DITHER, weighted to the dark end where banding actually shows
  if (uDither > 0.001) {
    float t = (bayer4(px) - 0.5) * (1.0 / 48.0) * uDither * 8.0;
    c += t * (1.0 - smoothstep(0.0, 0.55, luma(c)));
  }

  // ---- 7. PAPER. Fibre plus a slow blotch, multiplied not added — paper absorbs, it does not glow.
  if (uGrain > 0.001) {
    float fib = vnoise(px * 0.85) * 0.6 + vnoise(px * 2.7) * 0.4;
    float blotch = vnoise(px * 0.045);
    float g = mix(fib, blotch, 0.35);
    c *= 1.0 - (g - 0.5) * 0.20 * uGrain;
  }

  // ---- 8a. VIBRANCE, and it is NOT saturation. Robert asked to "turn the saturation down a tad so
  // the colours pop" — those pull opposite ways, and the thing that does what he described is
  // VIBRANCE: raise the chroma of the DULL colours and leave the already-saturated ones alone.
  // Plain saturation multiplies everything equally, so it drives the reds and the hero accents
  // straight into clipping — which reads as LESS pop, because a clipped colour has no shape left.
  // The weight is (1 - existing saturation): grey concrete gains a lot, a gold aura gains nothing.
  if (abs1(uVib) > 0.001) {
    float mx = max(c.r, max(c.g, c.b));
    float mn = min(c.r, min(c.g, c.b));
    float sat = mx - mn;                          // cheap chroma proxy, and the right one here
    float g = luma(c);
    c = mix(vec3(g), c, 1.0 + uVib * (1.0 - sat) * 1.4);
  }
  // plain saturation stays available as its own dial — for pulling the whole frame back toward ink
  if (abs1(uSat) > 0.001) c = mix(vec3(luma(c)), c, 1.0 + uSat);

  // ---- 8. THE WORLD'S GRADE. Lift and gain per world, derived from the planet's own look.
  // ⚠ Not a 3D LUT texture: two vec3s of arithmetic do the same job for a fraction of the cost, and
  // they can be DERIVED from PLANET_LOOK rather than authored as an asset nobody can audit.
  if (uGrade > 0.001) {
    vec3 graded = clamp(uLift + c * uGain, 0.0, 2.0);
    c = mix(c, graded, uGrade);
  }

  // ---- 9. THE IMPACT FRAME. One inverted frame on connect. Costs nothing and is thirty years old.
  if (uInvert > 0.001) c = mix(c, vec3(1.0) - c, uInvert);

  gl_FragColor = vec4(c, 1.0);
}`;

export class PrintPass extends ShaderPass {
  constructor(opts = {}) {
    super({
      uniforms: {
        tDiffuse: { value: null },
        uTexel: { value: new THREE.Vector2(1 / 1920, 1 / 1080) },
        uRes: { value: new THREE.Vector2(1920, 1080) },
        uInk: { value: 0 }, uInkCol: { value: new THREE.Color(PRINT_DEFAULTS.inkColor) },
        uHalf: { value: 0 }, uHalfScale: { value: PRINT_DEFAULTS.halftoneScale },
        uLevels: { value: 0 }, uGrain: { value: 0 },
        uTilt: { value: 0 }, uTiltFocus: { value: PRINT_DEFAULTS.tiltFocus },
        uTiltWidth: { value: PRINT_DEFAULTS.tiltWidth },
        uDither: { value: 0 }, uSpeed: { value: 0 }, uSpeedC: { value: new THREE.Vector2(0.5, 0.5) },
        uTime: { value: 0 }, uInvert: { value: 0 },
        uGrade: { value: 0 }, uVib: { value: 0 }, uSat: { value: 0 },
        uLift: { value: new THREE.Vector3(0, 0, 0) },
        uGain: { value: new THREE.Vector3(1, 1, 1) },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
    });
    // ⚠ never write depth from a full-screen quad — the composer's targets carry a depth buffer that
    // other things may still want, and a quad at z=0 would flatten it.
    this.material.depthTest = false;
    this.material.depthWrite = false;
    this._speedT = 0;
    this._invT = 0;
    this.settings = { ...PRINT_DEFAULTS, ...opts };
    this.apply(this.settings);
  }

  /** Push a settings object in. Anything absent keeps its current value. */
  apply(s = {}) {
    const u = this.uniforms, S = Object.assign(this.settings, s);
    u.uInk.value = S.ink; u.uHalf.value = S.halftone; u.uHalfScale.value = S.halftoneScale;
    u.uLevels.value = S.levels; u.uGrain.value = S.grain;
    u.uTilt.value = S.tilt; u.uTiltFocus.value = S.tiltFocus; u.uTiltWidth.value = S.tiltWidth;
    u.uDither.value = S.dither; u.uGrade.value = S.grade;
    u.uVib.value = S.vibrance; u.uSat.value = S.saturation;
    if (S.inkColor) u.uInkCol.value.set(S.inkColor);
    // the pass is only worth running at all if SOMETHING is on
    this.enabled = !!(S.ink || S.halftone || S.levels > 1 || S.grain || S.tilt || S.dither ||
      S.grade || S.vibrance || S.saturation || this._speedT > 0 || this._invT > 0);
    return S;
  }

  setSize(w, h) {
    this.uniforms.uRes.value.set(w, h);
    this.uniforms.uTexel.value.set(1 / Math.max(1, w), 1 / Math.max(1, h));
  }

  /**
   * ⚠ THE IMPACT FRAME IS ONE FRAME, and that is not a figure of speech. Held for two it reads as a
   * flash effect; held for one it reads as the drawing itself changing, which is the trick anime and
   * fighting games have run on for thirty years. `_invT` is a FRAME COUNT, never a duration in
   * seconds — at 30fps a 1/60s timer would be skipped entirely and the punch would land silently.
   */
  impactFrame(frames = 1, strength = 1) {
    this._invT = Math.max(this._invT, frames);
    this.uniforms.uInvert.value = strength;
    this.enabled = true;
  }

  /** Radial streaks from a screen point (0..1), decaying over `dur` seconds. */
  speedLines(cx, cy, strength = 1, dur = 0.22) {
    this.uniforms.uSpeedC.value.set(cx, cy);
    this._speedPeak = strength; this._speedDur = dur; this._speedT = dur;
    this.enabled = true;
  }

  /** Per-world grade, derived rather than authored. `tint` is the world's own sky/atmosphere colour. */
  setWorldGrade(tint, strength = 1) {
    const c = new THREE.Color(tint || '#ffffff');
    // lift the shadows toward the world's light, pull the gain the other way so mid-tones hold
    this.uniforms.uLift.value.set(c.r * 0.055, c.g * 0.055, c.b * 0.055);
    this.uniforms.uGain.value.set(0.92 + c.r * 0.14, 0.92 + c.g * 0.14, 0.92 + c.b * 0.14);
    this.settings.grade = strength;
    this.uniforms.uGrade.value = strength;
  }

  /** Called once per frame by the world, before render. */
  tick(dt) {
    this.uniforms.uTime.value += dt;
    if (this._speedT > 0) {
      this._speedT -= dt;
      const k = Math.max(0, this._speedT / Math.max(0.001, this._speedDur));
      this.uniforms.uSpeed.value = this._speedPeak * k * k;
      if (this._speedT <= 0) this.uniforms.uSpeed.value = 0;
    }
    if (this._invT > 0) { this._invT--; if (this._invT <= 0) this.uniforms.uInvert.value = 0; }
    this.apply({});    // re-derive `enabled` now the transient effects may have expired
  }
}
