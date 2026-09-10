// =================================================================================================
// POWERWORLD — THE STAGE. See docs/POWERWORLD.md.
//
// Robert: *"wide open space… no pedestrians, maps look like Bid for Power."*
//
// ⚠ THIS IS A VENUE, NOT A CITY PLAN. `generatePlan` cannot make an empty stage — its base fill
// always builds a city — and a whole new plan KIND is a bigger commitment than this needs. The
// pattern used instead has now been proven three times in this repo (`whiteroom.js`, `baseroom.js`,
// `boxingring.js`): hide the theatre you arrived in, raise your own geometry, and put every single
// thing back on the way out. The restore contract is the hard part, not the rocks.
//
// ⚠ WHAT MAKES A BFP STAGE IS NEGATIVE SPACE. The instinct is to build more; the reference builds
// less. A DBZ arena is a floor, a horizon, and a few things big enough to be thrown through — the
// emptiness is what lets you read a fighter two hundred units away, and it is why these maps still
// look right twenty years on. Every rock here is either something to slam someone into or a scale
// reference so the sky reads as far away. There is nothing decorative.
// =================================================================================================
import * as THREE from 'three';
import {prepareFrontline} from './frontline-preparation.js';
import { GROUND_LAYER } from '../core/util.js';
import { setRim } from './figure.js';
import { SETTINGS } from '../core/settings.js';
import {FRONTLINE_GROUND_RADIUS,installFrontlineTerrain,restoreFrontlineSky} from './frontline-terrain.js';
import {installFrontlineGround,restoreFrontlineGround,authorFrontlineRelief} from './frontline-ground.js';
import {FRONTLINE_FORMATIONS,FRONTLINE_TALUS,FRONTLINE_FAR_BANDS} from './frontline-layout.js';
import {FrontlineAircraft} from './frontline-aircraft.js';
import {FrontlineConvoy} from './frontline-convoy.js';
import {VehicleHUD} from './vehicle-hud.js';
import {outpostReserved} from './frontline-outpost-layout.js';
import {installFrontlineOutpost} from './frontline-outpost.js';
import {installFrontlineLighting,restoreFrontlineLighting} from './frontline-lighting.js';

export const STAGE = {
  radius: 900,          // central combat/patrol area, independent of pursuit space
  airspaceRadius: 32000,
  outerGroundRadius: 50000, // covers every corner of the square playable extent
  spires: 15,           // slam targets, sparse on purpose
  boulders: 22,
  // ⚠ PINNED, AND THIS IS THE SINGLE BIGGEST THING IN THE LOOK. The stage used to let Earth's clock
  // keep running — "the sun still crosses, dusk still happens, it simply crosses a different sky" —
  // which sounds right and produced a fight at **9:11 PM**: a black void over a brown plane. A full
  // cycle is 240s, so a four-minute round walked the sky from noon to midnight. BFP is never night.
  // Every reference arena in that game is bright, high daylight, and the sky is most of what you see
  // the moment you leave the floor.
  dayT: 0.2,            // a high sun, just off noon so the rock still has a lit and a shadowed face
  // The distant frame. ⚠ SPEED AND VASTNESS FIGHT EACH OTHER (manual §40, learned on the Earth
  // crossing): vastness is a FAR frame that barely moves. These sit outside the
  // central combat area; their final asset bounds become cover before flight-space admission.
  // ⚠ FAR AND LOW, or they stop being a distance and become obstacles. At r 1150–1950 with heights to
  // 430 they LOOMED over the stage — a 730u-wide mesa 1,200u out fills a 74° frame, so the thing meant
  // to say "the world continues" said "you are in a bowl". Distance is the whole job: further out and
  // shorter reads as bigger country, which is the opposite of the instinct.
  mesas: 18, mesaR: [2000, 5200], mesaH: [200, 520],
  // THE CLIMB TO SPACE — see `tick()`. Starts above the highest thing on the stage (a 210u spire) so a
  // rooftop fight never tints, and completes far enough up that getting there is a real commitment.
  spaceFrom: 430, spaceTo: 1500,
  // ⚠ ABOVE THE FIGHT, NOT IN IT. A flat billboard seen from its own altitude is a smear — at 150u the
  // deck cut across the horizon like a scratch on the lens. Put it overhead and the same quad reads
  // correctly, and a full climb still punches through the top of it.
  clouds: 16, cloudY: [260, 430],
  // ⚠ A DIFFERENT DIMENSION SHOULD NOT LOOK LIKE EARTH AT DUSK. This palette is PowerWorld's own —
  // a saturated cyan-blue sky over pale sunlit rock, so the two worlds are told apart in one glance
  // while the fighters, the gold accent and every HUD token stay exactly as they are. Sameness in the
  // chrome is what keeps them one game; the SKY is where a dimension gets to be somewhere else.
  // ⚠ The old `topDay: '#0d2436'` was a near-black navy zenith — at full noon it still read as night.
  // A DBZ sky is a deep saturated blue overhead falling to almost white at the horizon. No purple.
  sky:  { topDay: '#1b6ea6', topNight: '#071627', horDay: '#a9e6f0', horNight: '#12222b',
          glow: '#dff6ff', sunDay: '#fff3d6', sunGold: '#ffc078',
          hemiDay: '#bde8f4', hemiNight: '#16222c', gndDay: '#bb8253', gndNight: '#1a1208' },
  // ⚠ ROCK LIGHTER THAN GROUND. They were both mid-brown, so fifteen spires read as flat cardboard
  // cut out of their own floor. Pale rock against a blue sky is the reference silhouette.
  // ⚠ AND `rockDark` IS THE ACCENT, NOT THE DEFAULT. At #7a5b3d and a 50/50 roll, half the spires
  // still read as black towers — simultaneous contrast against a bright sky drags a mid-brown down
  // hard. Lighter, and only a quarter of the rock uses it.
  rock: '#c1a07c', rockDark: '#9c7c5a', ground: '#9c6e49', darkOdds: 0.25,
  // LOOSE ROCK ON THE GROUND, before anybody has broken anything. Robert's ask was "destroy
  // something, pick it up, and throw it" — but a stage where the first throwable only exists after
  // you have demolished a spire teaches nobody that throwing is available at all. So the floor is
  // seeded across the whole ladder, weighted light, and the heavy end is rare enough to be an event.
  loose: [8, 6, 5, 4, 2, 1],     // one count per RUBBLE rung, lightest first
};

// =================================================================================================
// THE RUBBLE LADDER — the weight ladder made visible.
//
// ⚠ THE RUNGS ARE DERIVED FROM THE ROSTER, NOT PICKED. `liftCapacityOf` over all 52 fighters is
// sharply bimodal — measured p10 0.14t · p25 0.21 · p50 1.26 · p75 17.9 · p90 50 · max 87.9 (RAGE) —
// so evenly spaced tonnages would have put four rungs inside one cluster and made the ladder
// decorative. Each rung below is placed so it SPLITS the roster somewhere different. Measured, in
// fighters out of 52 who can lift it:
//        SHARD 49  ·  STONE 31  ·  CHUNK 25  ·  SLAB 20  ·  BOULDER 13  ·  MONOLITH 3
// That is the fourth time this law has had to be applied here (university standing, the rank
// ladder's top end, the base site survey): a rung nobody can reach is a rung that does not exist.
//
// ⚠ SIZE IS DERIVED FROM WEIGHT (`s ∝ w^⅓`), never authored beside it. The silhouette is the only
// way a player reads tonnage before trying to lift it, and two independent numbers would drift the
// day someone nudges one — a 60-tonne rock that looks like a 1-tonne rock is a control that lies.
// =================================================================================================
export const RUBBLE = [
  { n: 'SHARD',    w: 0.12 },
  { n: 'STONE',    w: 0.45 },
  { n: 'CHUNK',    w: 1.3 },
  { n: 'SLAB',     w: 4.8 },
  { n: 'BOULDER',  w: 20 },
  { n: 'MONOLITH', w: 60 },
];
for (const r of RUBBLE) r.s = +(3.48 * Math.cbrt(r.w)).toFixed(2);   // 1.3t ≈ 3.8u — a stone you hug
/** The heaviest rung a mass of rock this big honestly breaks into. */
export function rungFor(volume) {
  const t = Math.max(0.05, volume * 0.00055);      // stage rock, calibrated so a mid spire drops SLABs
  let i = 0; while (i < RUBBLE.length - 1 && RUBBLE[i + 1].w <= t) i++;
  return i;
}

export class PowerWorldStage {
  constructor(game) {
    this.g = game; this.group = null;
    this._mats = []; this._hidden = []; this._cover = [];
    this._geos = []; this._texs = [];              // shared geometry + the cloud canvas, disposed on close
    this._props = null; this._cover0 = null; this._coverAll0 = null; this._int0 = null;
    this._rockGeo = null; this._rockMat = null;      // shared by every loose rock; rebuilt per crossing
    this._arena0 = null; this._fog0 = null;
    this._day0 = null; this._dayT0 = null; this._skyScale0 = null; this._sun0 = null;
  }

  open() {
    const g = this.g, W = g.world;
    if (this.group) this.close();
    this._hideTheatre();
    const grp = new THREE.Group(); this.group = grp;
    const add = (m) => { grp.add(m); return m; };

    const groundM = new THREE.MeshStandardMaterial({ color: STAGE.ground, roughness: 0.97 });
    const rockM = new THREE.MeshStandardMaterial({ color: STAGE.rock, roughness: 0.9, flatShading: true });
    const darkM = new THREE.MeshStandardMaterial({ color: STAGE.rockDark, roughness: 0.95, flatShading: true });
    this._mats.push(groundM, rockM, darkM);

    // Native craters and standing heights share the visible sand. The distant
    // circular filler has a hole under this lattice, so depressions stay visible.
    const floor = installFrontlineGround(this,groundM,STAGE.radius,FRONTLINE_GROUND_RADIUS,STAGE.outerGroundRadius);

    // ---- CANYON FORMATIONS. Broad connected shoulders flank an unobstructed
    // forward battle corridor; every mass remains native destructible cover.
    let seed = 1337;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
    for (const [i,formation] of FRONTLINE_FORMATIONS.entries()) {
      const {x,z,width,depth,height:h,yaw}=formation;
      const geometry=new THREE.CylinderGeometry(.40,.5,h,8,1);geometry.scale(width,1,depth);
      const m=add(new THREE.Mesh(geometry,i%4===0?darkM:rockM));
      m.position.set(x,h/2,z);m.rotation.y=yaw;m.castShadow=true;m.userData.frontlineFormation=true;
      m.userData.frontlineProfile=formation.profile;
      // An explicit destructible interior budget keeps the established native
      // HP/loot formulas while collision is measured from the full visible mass.
      const core=14+(i%5)*2;this._reg(x,z,core,core,h,m);
    }
    // ---- BOULDERS. Low cover and, more importantly, scale: without something human-sized near the
    // camera a 900u disc reads as a small room.
    for (let i = 0; i < STAGE.boulders; i++) {
      const talus=FRONTLINE_TALUS[i];
      if(talus){
        const {x,z,width,depth,height,yaw,variant}=talus;
        const m=add(new THREE.Mesh(new THREE.BoxGeometry(width,height,depth),i%3?rockM:darkM));
        m.position.set(x,height*.5,z);m.rotation.y=yaw;m.castShadow=true;
        m.userData.frontlineBoulder=true;m.userData.frontlineTalus=variant;
        this._reg(x,z,width*.5,depth*.5,height,m);continue;
      }
      const s=6+rnd()*13;let x,z;
      for(let attempt=0;attempt<200;attempt++){
        const a=rnd()*Math.PI*2,r=165+rnd()*550;x=Math.cos(a)*r;z=Math.sin(a)*r;
        if(outpostReserved(x,z,s+16))continue;
        if(this._cover.some(c=>Math.abs(x-c.x)<c.hx+s+15&&Math.abs(z-c.z)<c.hz+s+15))continue;
        if(x>-310&&x<-150&&z>160&&z<520)continue;
        if(Math.hypot(Math.max(0,Math.abs(x)-s*1.5),Math.max(0,Math.abs(z)-s*1.5))<130)continue;
        break;
      }
      const m = add(new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), rnd() > STAGE.darkOdds ? rockM : darkM));
      m.position.set(x, s * 0.55, z); m.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
      m.userData.frontlineBoulder=true;
      this._reg(x, z, s * 1.3, s * 1.3, s * 1.1, m);
    }
    this._scatterRubble(rnd);
    this._buildHorizon(add, rnd);
    authorFrontlineRelief(this);
    this._buildClouds(add, rnd);
    W.scene.add(grp);
    if(W.print){this._print0={...W.print.settings};W.print.apply({ink:0,halftone:0,levels:0,grain:0,tilt:0,grade:0,vibrance:0,saturation:0});}
    this.frontlineReady=false;this.frontlineAssetsReady=false;this._airspaceOpen=false;this.frontlineRockCount=0;this.frontlineError=null;
    if(W.renderer)this.frontlineLoading=installFrontlineTerrain(this,floor).then(()=>{
      if(this.group===grp&&!this._enableAirspace())throw new Error('Flight-space ground is not ready');
    }).catch(error=>{
      // Retain the playable fallback geometry and expose the load failure.
      if(this.group===grp)this.frontlineError=error.message;
      console.error('Frontline terrain assets',error);
    });
    this._skin();
    this._skinFighters();
    // Commit structure collision before looking for vehicle parking. Asset
    // timing must not decide whether a truck spawns inside a command post.
    this.outpostError=null;
    if(W.renderer)this.outpostLoading=installFrontlineOutpost(this).then(async()=>{
      if(this.group!==grp)return;
      this.convoy=new FrontlineConvoy(this);await this.convoy.loading;
      if(this.group!==grp)return;
      this.aircraft=new FrontlineAircraft(g);await this.aircraft.loading;
    }).catch(error=>{if(this.group===grp)this.outpostError=error.message;});
    if(W.renderer)this.vehicleHUD=new VehicleHUD(this);
    g._pwStage = this;
    prepareFrontline(this);
    return this;
  }

  /**
   * THE DISTANT FRAME — flat-topped mesas ringing the central battlefield.
   * Final collision is registered by _enableAirspace after the visible assets
   * are adopted, before the old central boundary is opened for pursuit.
   *
   * ⚠ AERIAL PERSPECTIVE IS AUTHORED HERE, NOT LEFT TO FOG. The stage runs fog at 0.35× and at 1,500u
   * that is under 1% — the mesas would have come back as hard-edged solid rock, which reads as *near*
   * however far away it actually is. The material is the rock colour lerped toward the sky's own
   * horizon value, so distance is a colour fact derived from the palette rather than a second number
   * to keep in sync (manual §43 — the same reasoning as the Earth limb).
   */
  _buildHorizon(add, rnd) {
    const S = STAGE;
    const far = new THREE.MeshStandardMaterial({
      // ⚠ 0.55 toward the sky was too far — they came back pale blue-grey and read as PAPER, not land.
      // Enough haze to sit behind the air, not so much that they stop being rock.
      color: new THREE.Color(S.rock).lerp(new THREE.Color(S.sky.horDay), 0.28),
      roughness: 1, flatShading: true,
    });
    this._mats.push(far);
    // one geometry, scaled per mesa — a unit cylinder with a narrower top is a mesa
    const geo = new THREE.CylinderGeometry(0.72, 1, 1, 7, 1);
    this._geos.push(geo);
    for (const formation of FRONTLINE_FAR_BANDS) {
      const {x,z,width,depth,height:h,yaw,profile}=formation;
      const m = add(new THREE.Mesh(geo, far));
      m.userData.frontlineDistant=true;m.userData.frontlineProfile=profile;
      m.position.set(x,h*.5,z);
      m.scale.set(width*.5,h,depth*.5);
      m.rotation.y=yaw;
    }
  }

  /**
   * THE CLOUD DECK — the altitude cue. A 456u climb through empty air reads as no climb at all; the
   * moment you punch through a cloud layer the height is a fact you felt rather than a number.
   *
   * ⚠ ONE DRAW CALL. Sixteen separate planes would be sixteen; the quads are written into a single
   * hand-built BufferGeometry instead. This is also why they cannot be individually animated, which
   * is fine — a cloud that drifts at fighting speed is a distraction.
   * ⚠ THE FLICKER LAW, ROUTE 3 (`core/util.js`): coplanar transparent quads would z-fight, so these
   * opt OUT of the depth test entirely with `depthWrite: false` rather than picking a lift, and each
   * deck sits at its own altitude anyway.
   */
  _buildClouds(add, rnd) {
    const S = STAGE, N = S.clouds;
    const pos = new Float32Array(N * 12), uv = new Float32Array(N * 8), idx = [];
    for (let i = 0; i < N; i++) {
      const a = rnd() * Math.PI * 2, r = rnd() * (S.radius * 1.5);
      const cx = Math.cos(a) * r, cz = Math.sin(a) * r;
      const y = S.cloudY[0] + rnd() * (S.cloudY[1] - S.cloudY[0]);
      const hw = 150 + rnd() * 190, hd = 110 + rnd() * 170;
      const q = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]];
      for (let v = 0; v < 4; v++) {
        pos[i * 12 + v * 3] = cx + q[v][0]; pos[i * 12 + v * 3 + 1] = y; pos[i * 12 + v * 3 + 2] = cz + q[v][1];
        uv[i * 8 + v * 2] = v === 1 || v === 2 ? 1 : 0;
        uv[i * 8 + v * 2 + 1] = v >= 2 ? 1 : 0;
      }
      idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(idx);
    this._geos.push(geo);
    const mat = new THREE.MeshBasicMaterial({
      map: this._cloudTex(), transparent: true, depthWrite: false, opacity: 0.62,
      side: THREE.DoubleSide, fog: false, color: '#f4fbff',
    });
    this._mats.push(mat);
    const m = add(new THREE.Mesh(geo, mat));
    this._cloudMesh=m;
    m.renderOrder = 1;
  }

  /**
   * ⚠ SEVEN OVERLAPPING BLOBS, NOT ONE. A single radial gradient is a soft BALL — it reads as a
   * smoke puff or a lens artefact, never as cloud. A cumulus silhouette is lumpy, and the lumps are
   * the whole tell. Drawn once, shared by every quad.
   */
  _cloudTex() {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d');
    for (let i = 0; i < 7; i++) {
      const px = 60 + Math.random() * 136, py = 96 + Math.random() * 64;
      const rr = 34 + Math.random() * 46;
      const gr = x.createRadialGradient(px, py, 0, px, py, rr);
      gr.addColorStop(0, 'rgba(255,255,255,0.85)');
      gr.addColorStop(0.55, 'rgba(255,255,255,0.42)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = gr; x.beginPath(); x.arc(px, py, rr, 0, 6.284); x.fill();
    }
    const t = new THREE.CanvasTexture(c);
    this._texs.push(t);
    return t;
  }

  /**
   * THE CLIMB TO SPACE. Robert: *"leaving earth should feel like No Man's Sky."*
   *
   * ⚠ WHAT MAKES THAT FEELING IS THAT NOTHING CUTS. There is already a departure in this game and it
   * is a CINEMATIC — it takes the camera, plays its acts and hands you back (manual §17, §35), which
   * is the opposite of the thing being asked for. The No Man's Sky beat is that you point up, you hold
   * it, and the world changes around you the whole way with the controls still in your hands. So this
   * is not a sequence, a trigger or a state: it is one fraction of altitude, read every frame.
   *
   * ⚠ AND IT BELONGS TO THIS DIMENSION ALONE, because PowerWorld is the only world with no ceiling to
   * stop the climb at. On Earth the atmosphere is a lid and leaving it is supposed to be a ceremony.
   */
  tick(p) {
    this.aircraft?.update();
    this.convoy?.update();
    this.vehicleHUD?.update();
    this._skinFighters();      // late arrivals (a rival ordered with B, a respawn) get the treatment too
    const print=this.g.world.print;
    // Entry settings may be applied after stage.open. Keep this venue's clean
    // render treatment local; close restores the caller's print settings.
    if(print&&(print.settings.ink||print.settings.halftone||print.settings.levels||print.settings.grain||print.settings.grade))print.apply({ink:0,halftone:0,levels:0,grain:0,tilt:0,grade:0,vibrance:0,saturation:0});
    if (!p) return;
    const S = STAGE, y = p.pos.y;
    const t = (y - S.spaceFrom) / (S.spaceTo - S.spaceFrom);
    // smoothstep, so there is no edge where the sky "switches" — the ends have to be soft or the
    // whole illusion collapses into a threshold you can see yourself crossing.
    const k = Math.max(0, Math.min(1, t));
    this.g.world.setSpace(k * k * (3 - 2 * k));
  }

  /**
   * THE MANNEQUIN TREATMENT — the same fighters, a different material language.
   *
   * Robert: *"I want the visuals to look different… same characters… what if they look like
   * mannequins and we just give them my logos and capes and helmets and weapons."* That is a good
   * instinct and it is nearly free, because the identity in this roster is NOT carried by the body —
   * it is carried by the flourishes `figure()` already mounts (helmet, crest, cape, pauldrons, visor,
   * weapon) and by the aura. So the body can go to a matte display finish and nothing is lost.
   *
   * ⚠ IT IS A MATERIAL PASS, NOT A REMODEL. `figure()` builds its materials PER FIGHTER and hands
   * them out on `parts.mats`, so this cannot leak into the city: there is no shared cache to corrupt,
   * and every value is stashed and put back on the way out.
   * ⚠ THE MANNEQUIN READ COMES FROM THE FINISH, NOT THE COLOUR — and getting that backwards nearly
   * shipped. At 72% toward bone, SOL (a hot orange) and MAJESTY (a warm red) came out **#dfbcac and
   * #dcb5ab**: three values apart out of 255, which at two hundred units in an empty sky is the same
   * figure twice. What makes something look like a display mannequin is that it is MATTE and UNIFORM —
   * roughness up, metalness down — and that costs no identity at all. So the finish does the work and
   * the colour only moves 30%. Armour, visor, glow and cape are untouched: they are the identity.
   * ⚠ A tint toward a common colour COMPRESSES THE WHOLE ROSTER TOWARD EACH OTHER, and the pairs that
   * suffer are the ones already close (SOL and MAJESTY sit 46 apart on Earth before anything is done
   * to them). Any future treatment here has to be measured on the CLOSEST pair, never a vivid one.
   * ⚠ The rim goes up because it is the one thing that separates a figure from a bright sky, and it
   * is a uniform — the cheapest visual in the engine (see the look ladder: rim is 0 texture fetches).
   */
  _skinFighters() {
    for (const e of this.g.entities) {
      const P = e.parts; if (!P || !P.mats || e._pwSkin) continue;
      const keep = {};
      for (const k of ['suit', 'suit2', 'skin']) {
        const m = P.mats[k]; if (!m) continue;
        keep[k] = { c: m.color.clone(), r: m.roughness, mt: m.metalness,
                    e: m.emissive ? m.emissive.clone() : null, ei: m.emissiveIntensity };
        // Preserve authored cloth/skin/metal distinctions and saturated costume colours.
        // The old common bone tint flattened every character into the same mannequin finish.
      }
      e._pwSkin = keep;
      setRim(P, SETTINGS.fxRim ?? 0.25);
    }
  }

  _unskinFighters() {
    for (const e of this.g.entities) {
      const keep = e._pwSkin, P = e.parts; if (!keep || !P || !P.mats) continue;
      for (const k of Object.keys(keep)) {
        const m = P.mats[k], s = keep[k]; if (!m) continue;
        m.color.copy(s.c); m.roughness = s.r; m.metalness = s.mt;
        if (m.emissive && s.e) { m.emissive.copy(s.e); m.emissiveIntensity = s.ei; }
      }
      e._pwSkin = null;
      setRim(P, SETTINGS.fxRim == null ? 0.35 : SETTINGS.fxRim);
    }
  }

  /**
   * A cover record, so physics, LOS and the slam rules all know the rock is there.
   *
   * ⚠ IT WAS MISSING `r` AND `h`, AND THAT WAS A HOLE YOU COULD SHOOT THROUGH. Every other cover
   * record in the engine carries a radius and a height; `projectiles.js` tests `hypot(...) < c.r +
   * radius && pos.y < c.h` and the beam blocker tests `cov.h` / `cov.r` — both of which evaluate
   * against `undefined`, and `x < NaN` is false. So the stage's fifteen spires stopped BODIES and
   * were transparent to every bullet, blast and beam in the game. Fixed here rather than in the
   * shooters: the defect was a half-filled record, not a missing guard.
   *
   * ⚠ AND IT WAS `hp: 1e9`, WHICH IS THE WHOLE FIRST HALF OF THE ASK. Robert: *"imagine if Bid For
   * Power, you could destroy something, pick it up, and throw it."* The engine has had destructible
   * cover since the city shipped; the stage simply declared itself indestructible. Same hp formula
   * the city uses (`70 + volume × 0.0075`) so a spire costs about what a building of its size costs
   * — a number already balanced against every weapon rather than a second one invented here.
   */
  _reg(x, z, hx, hz, top, mesh) {
    const W = this.g.world;
    // The constructor arguments are authored spans, but CylinderGeometry and
    // IcosahedronGeometry take RADII. Those guesses left visible rock outside
    // both body/camera boxes and projectile cylinders. Measure transformed
    // vertices once at registration; no mesh queries enter the simulation loop.
    // Keep the authored centre so resetTerrain restores the same mesh position.
    const rubbleVolume = hx * hz * top;
    let w = hx, d = hz, h = top, r = Math.max(w, d) * 0.6;
    if (mesh) {
      mesh.updateWorldMatrix(true, true);
      const bounds = new THREE.Box3().setFromObject(mesh, true);
      if (!bounds.isEmpty()) {
        w = 2 * Math.max(Math.abs(bounds.min.x - x), Math.abs(bounds.max.x - x));
        d = 2 * Math.max(Math.abs(bounds.min.z - z), Math.abs(bounds.max.z - z));
        h = Math.max(0, bounds.max.y);
        const point = new THREE.Vector3();
        let radiusSq = 0;
        mesh.traverse(o => {
          const positions = o.geometry?.attributes.position;
          if (!positions) return;
          for (let i = 0; i < positions.count; i++) {
            point.fromBufferAttribute(positions, i).applyMatrix4(o.matrixWorld);
            radiusSq = Math.max(radiusSq, (point.x - x) ** 2 + (point.z - z) ** 2);
          }
        });
        r = Math.sqrt(radiusSq);
      }
    }
    const hp = Math.round(70 + rubbleVolume * 0.0075);
    const co = {
      x, z, hx: w * 0.5, hz: d * 0.5, top: h, h, r, w, d, projectileShape: 'box',
      rubbleVolume, // collision correction must not silently rebalance durability/loot
      hp, maxHp: hp, mesh, y0: mesh ? mesh.position.y : h / 2, destroyed: false,
      onShatter: (game, c) => this._shatter(game, c),
    };
    W.cover.push(co); W.coverAll.push(co); this._cover.push(co);
    return co;
  }

  /**
   * A SPIRE COMES DOWN AND LEAVES SOMETHING YOU CAN THROW.
   *
   * This is the loop Robert described, closed: break the rock → the rubble is real → pick a piece up
   * → hurl it → they shoot it out of the air. It routes through `game.shatterBlock`'s one choke
   * point via the `onShatter` hook, so a stage rock dies by the same call every building does.
   *
   * ⚠ THE RUBBLE IS SIZED FROM WHAT BROKE. A monolith out of a boulder is free tonnage, and a
   * hillside that always drops shards makes destruction pointless — so the rung comes off the
   * volume, and the pieces are that rung and the one below it.
   */
  _shatter(game, c) {
    const W = game.world, i = W.cover.indexOf(c);
    if (i >= 0) W.cover.splice(i, 1);
    c.destroyed = true;
    W.refreshFogBoxes && W.refreshFogBoxes();
    const vol = c.rubbleVolume ?? (c.w || 8) * (c.d || 8) * (c.h || 20);
    const top = rungFor(vol);
    // 2–4 pieces, the heaviest rung this mass earns plus lighter ones under it
    const n = 2 + (Math.random() * 3 | 0);
    for (let k = 0; k < n; k++) {
      const rung = Math.max(0, top - (k === 0 ? 0 : 1 + (Math.random() * 2 | 0)));
      const a = Math.random() * Math.PI * 2, rr = (c.r || 6) * (0.7 + Math.random() * 1.1);
      this._rock(c.x + Math.cos(a) * rr, c.z + Math.sin(a) * rr, rung);
    }
    // the collapse itself — the mesh sinks and hides, exactly as a shattered building does
    const mesh = c.mesh, y0 = c.y0, h = c.h || 20;
    if (mesh) {
      let t = 0;
      game.vfx._add({
        update: (dt) => { t += dt; const k = Math.min(1, t / 0.55); mesh.position.y = y0 - k * (h * 0.94); mesh.scale.y = Math.max(0.04, 1 - k); return k >= 1; },
        dispose: () => { mesh.visible = false; },
      });
    }
    game.particles.burst(c.x, (c.h || 20) * 0.5, c.z, { count: 26, speed: 17, life: 1.0, size: 6, color: [STAGE.rock, STAGE.rockDark, '#e6dcc8'], up: 8, grav: 4, drag: 1.2 });
    game.world.crater(c.x, c.z, (c.r || 6) * 0.7, 1.8);
    game.world.shake(1.5); game.world.punch(0.9); game.audio.boom(0.6, { x: c.x, z: c.z });
    game.noise({ x: c.x, y: 6, z: c.z }, 1.4, null);
    if (game.hud) game.hud.feed('ROCK SHATTERED — there is rubble on the ground', '#c1a07c');
  }

  /**
   * ONE LOOSE ROCK, on the weight ladder, registered where `propInReach` actually looks.
   *
   * ⚠ `world.rocks` IS THE LIST, NOT `world.cover`. The stage was registering every rock as cover and
   * nothing as a prop, so the dimension had scenery you could hide behind and nothing you could pick
   * up — while `grabProp`, `throwProp`, `updateCarry`, the throw-arc preview and the whole weight
   * ladder sat finished and unreachable one array away. Loose stone follows the forest tiles'
   * convention: a prop is NOT cover (you would be hiding behind something you are about to be
   * holding), which is also why these are not `_reg`'d.
   */
  _rock(x, z, rung) {
    const W = this.g.world, R = RUBBLE[Math.max(0, Math.min(RUBBLE.length - 1, rung | 0))];
    if (!this._rockGeo) { this._rockGeo = new THREE.IcosahedronGeometry(1, 0); this._geos.push(this._rockGeo); }
    // ⚠ PALE ROCK, AND I MADE THE MISTAKE THIS FILE ALREADY WARNS ABOUT. `rockDark` is the ACCENT —
    // the header says so, having been paid for once on the spires — and a screenshot of a shattered
    // spire came back with its rubble reading as BLACK HOLES in a pale sunlit floor. Simultaneous
    // contrast against a bright sky drags a mid-brown down hard; six green assertions about tonnage
    // could not see it. Loose rock is the same stone as the thing it broke off, so it is `rock`.
    if (!this._rockMat) { this._rockMat = new THREE.MeshStandardMaterial({ color: STAGE.rock, roughness: 0.92, flatShading: true }); this._mats.push(this._rockMat); }
    const m = new THREE.Mesh(this._rockGeo, this._rockMat);
    m.position.set(x, R.s * 0.55, z);
    m.scale.setScalar(R.s);
    m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    m.castShadow = R.s > 5;
    this.group.add(m);
    // `color` is read by `game.grabProp` for the mesh you actually hold — the rock in your hands has
    // to be the rock that was on the ground, or picking one up recolours it.
    const rec = { x, z, mesh: m, carried: false, dead: false, w: R.w, s: R.s, rung: R.n, color: STAGE.rock };
    W.rocks.push(rec);
    return rec;
  }

  /** Seed the floor across the whole ladder so there is always something in reach to throw. */
  _scatterRubble(rnd) {
    for (let rung = 0; rung < STAGE.loose.length; rung++) {
      for (let k = 0; k < STAGE.loose[rung]; k++) {
        let x,z;
        for(let attempt=0;attempt<100;attempt++){
          const a=rnd()*Math.PI*2,r=26+rnd()*300;x=Math.cos(a)*r;z=Math.sin(a)*r;
          if(!outpostReserved(x,z,RUBBLE[rung].s+3))break;
        }
        this._rock(x,z,rung);
      }
    }
  }

  /**
   * ⚠ THE THEATRE YOU ARRIVED IN IS HIDDEN, NEVER REMOVED — it has to be exactly as you left it when
   * you cross back. This is `boxingring.js`'s pass, including its hard-won second half: the props are
   * ARRAYS (`propInReach` walks `world.cars/planes/rocks/treeSpots`, not the scene) and `interiors`
   * is a THIRD list that physics consults separately from `cover`. Missing either one is an invisible
   * wall or a hoistable car that is not there.
   */
  _hideTheatre() {
    const g = this.g, W = g.world;
    this._arena0 = W.ARENA;
    this._combatRadius0=Object.getOwnPropertyDescriptor(W,'combatRadius');
    W.combatRadius=STAGE.radius;
    W.ARENA = STAGE.radius;                       // the sky is open and so is the ground
    this._hidden = [];
    const hide = (m) => { if (m && m.visible) { this._hidden.push(m); m.visible = false; } };
    const keep = new Set([this.group]);
    // ⚠ THE SKY IS NOT SCENERY. "Hide every child that isn't a light" took the sky dome with the city,
    // so a dimension whose defining feature is an open sky rendered as a BLACK VOID — and `_skin()`
    // below has been carefully painting a dome nobody could see. Found by taking a screenshot; six
    // green assertions about the palette could never have caught it.
    if (W.skyMesh) keep.add(W.skyMesh);
    for (const e of g.entities) if (e && e.obj) keep.add(e.obj);
    if (g.particles && g.particles.points) keep.add(g.particles.points);
    for (const child of W.scene.children) {
      if (keep.has(child) || child.isLight || child.isCamera) continue;
      hide(child);
    }
    for (const m of (W._cityBits || [])) hide(m);
    for (const m of (W._roadMeshes || [])) hide(m);
    this._props = { cars: W.cars, planes: W.planes, rocks: W.rocks, trees: W.treeSpots };
    W.cars = []; W.planes = []; W.rocks = []; W.treeSpots = [];
    this._cover0 = W.cover; this._coverAll0 = W.coverAll; this._int0 = W.interiors;
    W.cover = []; W.coverAll = []; W.interiors = [];
    W.refreshFogBoxes && W.refreshFogBoxes();
    if (W.scene.fog) { this._fog0 = W.scene.fog.density; W.scene.fog.density = this._fog0 * 0.35; }
  }

  _enableAirspace() {
    const W=this.g.world;
    if(!this.group||!this.frontlineAssetsReady||!W._outerTerrain)return false;
    if(this._airspaceOpen)return true;
    const radius=STAGE.airspaceRadius;
    for(const x of [-radius,radius])for(const z of [-radius,radius]){
      if(!Number.isFinite(W._outerTerrain.heightAt(x,z)))return false;
    }
    // Measure adopted geometry, never the earlier cylindrical placeholders.
    // Register after relief authoring so scenic colliders cannot reshape the valley.
    this.group.traverse(mesh=>{
      if(!mesh.isMesh||!mesh.userData.frontlineDistant||this._cover.some(c=>c.mesh===mesh))return;
      mesh.updateWorldMatrix(true,true);
      const box=new THREE.Box3().setFromObject(mesh,true),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
      this._reg(center.x,center.z,size.x*.5,size.z*.5,size.y,mesh);
      this._cover[this._cover.length-1].frontlineDistant=true;
    });
    W.ARENA=radius;this._airspaceOpen=true;
    W.refreshFogBoxes?.();return true;
  }

  /** PowerWorld's own sky, written into the palette the day/night cycle already drives. */
  _skin() {
    const W = this.g.world, P = W._dnc, S = STAGE.sky;
    if (!P) return;
    // ⚠ WRITTEN INTO `_dnc`, NOT ALONGSIDE IT. The clock keeps running here — the sun still crosses,
    // dusk still happens — it simply crosses a different sky. And `setSkyWorld(null)` already knows
    // how to restore every one of these keys from `_dncEarth`, so the exit path costs nothing new.
    // ⚠ STASH WHICH SKY WE CAME FROM. `setSkyWorld(null)` restores EARTH, and the theatre you
    // travelled from may well not be Earth — measured: crossing back into Tranquility Reach handed
    // the Moon an Earth sky. Restore the id, not the default.
    this._sky0 = W.skyWorld || null;
    const set = (k, v) => { if (P[k]) P[k].set(v); };
    set('topDay', S.topDay); set('topNight', S.topNight);
    set('horDay', S.horDay); set('horNight', S.horNight);
    set('glowTint', S.glow); set('sunDay', S.sunDay); set('sunGold', S.sunGold);
    set('hemiDay', S.hemiDay); set('hemiNight', S.hemiNight);
    set('gndDay', S.gndDay); set('gndNight', S.gndNight);
    W.skyWorld = 'powerworld';
    // PIN THE LIGHT. See STAGE.dayT — the clock is a planet's rotation and there is no planet here.
    this._day0 = W.dayFixed ?? null; this._dayT0 = W.dayT;
    W.dayFixed = STAGE.dayT;
    // ⚠ AND THE DOME HAS TO CONTAIN THE STAGE. Its radius is 900 and so is the play radius, so a
    // fighter out at the rim and 400u up is OUTSIDE their own sky and it vanishes. depthWrite is off
    // and fog is off on that material, so scaling it is free.
    if (W.skyMesh) { this._skyScale0 = W.skyMesh.scale.x; W.skyMesh.scale.setScalar(3.4); }
    // ⚠ AIM THE SUN LOWER — a high sun gives a VERTICAL surface almost nothing, and this stage is
    // fifteen vertical spires. At the rig's own (120, 200, 80) the sun sits 54° up, so the spires came
    // out as near-black cardboard against a bright sky while a boulder ten feet away read as pale
    // sunlit rock. At 33° the sides take 0.83 of the light and the floor 0.55 — the floor loses a
    // little and the silhouettes gain everything, which is the trade the reference makes.
    // ⚠ MOVING a light is free. ADDING one is not (THE LIGHT-COUNT LAW — three.js bakes the visible
    // light count into every material's program key, so a new light recompiles the whole scene).
    installFrontlineLighting(this);
  }

  close() {
    if (!this.group) return;
    this.preparation?.cancel();this.preparation=null;
    this.combatWarmup?.dispose();this.combatWarmup=null;
    this.aircraft?.dispose();this.aircraft=null;
    this.convoy?.dispose();this.convoy=null;
    this.vehicleHUD?.dispose();this.vehicleHUD=null;
    const W = this.g.world;
    restoreFrontlineGround(this);
    restoreFrontlineSky(this);
    restoreFrontlineLighting(this);
    this._unskinFighters();      // hand every fighter their own colours back before anything else
    if(this._print0&&W.print){W.print.apply(this._print0);this._print0=null;}
    if (this._arena0 != null) { W.ARENA = this._arena0; this._arena0 = null; }
    if(this._combatRadius0)Object.defineProperty(W,'combatRadius',this._combatRadius0);else delete W.combatRadius;
    this._combatRadius0=null;this._airspaceOpen=false;this.frontlineAssetsReady=false;
    if (this._props) { W.cars = this._props.cars; W.planes = this._props.planes; W.rocks = this._props.rocks; W.treeSpots = this._props.trees; this._props = null; }
    // ⚠ our own cover records leave BOTH arrays before the originals come back, or the next match
    // inherits invisible rocks — the exact bug the venue paid for.
    if (this._cover0) { W.cover = this._cover0; W.coverAll = this._coverAll0; this._cover0 = this._coverAll0 = null; }
    if (this._int0) { W.interiors = this._int0; this._int0 = null; }
    // ⚠ THE TOWER CUTAWAY NOW APPLIES TO SPIRES, AND ITS BOOKKEEPING HAS TO COME HOME WITH THEM.
    // Registering `mesh` on the cover record (so a spire can be shattered) also made it eligible for
    // `updateOcclusion`, which is right — behind a chase camera a rock between the lens and your
    // fighter must fade — but the fade holds a CLONED material keyed on the cover record, and a stage
    // that closes mid-fade would leave that clone in `world._fades` pointing at geometry we are about
    // to dispose. Same family as the news crew's revoked frames: the state outlives the thing.
    if (W._fades) for (const co of this._cover) {
      const f = W._fades.get(co);
      if (!f) continue;
      for (const [m, orig] of f.mats) { try { for(const material of Array.isArray(m.material)?m.material:[m.material])material.dispose(); m.material = orig; } catch (e) {} }
      W._fades.delete(co);
    }
    this._cover = [];
    W.refreshFogBoxes && W.refreshFogBoxes();
    for (const m of this._hidden) m.visible = true;
    this._hidden = [];
    if (this._fog0 != null && W.scene.fog) { W.scene.fog.density = this._fog0; this._fog0 = null; }
    W.setSkyWorld(this._sky0 || null);       // the one restore path — and back to the sky we CAME from
    this._sky0 = null;
    // the pinned light, and the clock we froze. ⚠ dayT goes back to the value it had on ENTRY: time in
    // another dimension does not advance the clock at home, which is a ruling rather than an accident —
    // the alternative silently jumps the theatre you return to to PowerWorld's fixed noon.
    W.dayFixed = this._day0; if (this._dayT0 != null) W.dayT = this._dayT0;
    this._day0 = this._dayT0 = null;
    if (this._skyScale0 != null && W.skyMesh) { W.skyMesh.scale.setScalar(this._skyScale0); this._skyScale0 = null; }
    W.setSpace(0);      // ⚠ leaving at altitude must not hand the next theatre a black sky full of stars
    const geometries=new Set(this._geos);
    this.group.traverse(o => { if (o.isInstancedMesh) o.dispose(); if (o.geometry) geometries.add(o.geometry); });
    for (const geo of geometries) geo.dispose();
    for (const t of new Set(this._texs)) t.dispose();
    for (const m of new Set(this._mats)) m.dispose();
    W.scene.remove(this.group);
    this.group = null; this._mats = []; this._geos = []; this._texs = [];
    // ⚠ the shared rubble geometry/material were just disposed with the rest — hold a dead handle and
    // the next crossing builds every rock out of a disposed buffer. Cleared, so `_rock` rebuilds them.
    this._rockGeo = null; this._rockMat = null;
    if (this.g._pwStage === this) this.g._pwStage = null;
  }
}
