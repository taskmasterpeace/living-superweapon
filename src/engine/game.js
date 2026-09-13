import {activatePowerUp} from './power-up.js';
import {thrownPropContact,thrownPropShape,previewPropThrow} from './thrown-prop-contact.js';
import {previewTraversalLeap,driveTraversalLeapAI} from './traversal-leap.js';
import {refreshCombatPower} from '../core/power-up-state.js';
import {ThreatDeployment} from './threat-deployment.js';
import {ConvoyOperation} from './convoy-operation.js';
import {startThreatScan,updateThreatScan,clearScannerPanel} from './threat-scanner.js';
import {replaceHeldEquipment,disposeHeldEquipment} from './authored-equipment.js';
// WAR WORLD: ASCENDANTS — game orchestrator: entities, control, combat helpers, main update.
import { updateDomes, updateReshaped, domeBlocks, releasePossession } from './systems2.js';
import { traumatise, inflict } from '../data/medical.js';
import { setVisionMode } from './systems2.js';
import { Weather, TimeFields, GravityZones, setSize, banish } from './systems.js';
import * as THREE from 'three';
import {meleeApproach} from '../data/melee-approaches.js';
import {snapshotHeroSkins} from './hero-skin.js';
import {updateFlightSense} from './flight-sense.js';
import {clearForegroundVisibility} from './foreground-visibility.js';
import {combatView,combatLookActive} from './combat-view.js';
import {followDeathBody} from './death-camera.js';
import {meleeKeymap} from '../core/melee-mode.js';
import {POWERWORLD_CONTROLS,contextualGrab} from '../core/powerworld-controls.js';
import {presentMaterialHit} from './impact-material.js';
import { World } from './world.js';
import { Particles3D } from './particles3d.js';
import { VFX } from './vfx.js';
import { Projectiles } from './projectiles.js';
import {beamThreatTime} from './beam-threat.js';
import { buildWeapon, weaponProficiency, PROP_WEIGHT, liftCapacityOf, bodyWeight, Fighter } from './entity.js';
import {mountHeldWeapon} from './weapon-emission.js';
import { AI } from './ai.js';
import { BaseRoom } from './baseroom.js';
import { Minion, Construct } from './summons.js';
import {constructForSlot,settleConstructUpkeep} from './construct-policy.js';
import {tankPlacement,tankSettings} from './construct-tank.js';
import { MeleeSystem } from './melee.js';
import {isTransportingPerson} from './person-carry.js';
import {previewPersonThrow} from './person-throw-trajectory.js';
import {beginBodyContactFrame,resolveBodyContacts} from './fighter-body-contact.js';
import { Pedestrians } from './pedestrians.js';
import { NewsCrew } from './newscrew.js';
import {loadBroadcastProfile} from '../data/broadcast-profile.js';
import {usesCombinedHands} from './cast-channels.js';
import {syncChargePresentation} from './power-emission.js';
import { PoliceSystem } from './police.js';
import { psycheOf, applyInstant, pickByPersonality } from './psyche.js';
import { WhiteRoom } from './whiteroom.js';
import { buildReport } from '../data/news.js';
import { districtRow } from '../data/districts.js';
import { hasCity, hasCivilians } from '../data/modes.js';
import { bookInjury, injuryOf, healBout, koElo, matchElo } from '../data/rankings.js';
import { SETTINGS, keymap } from '../core/settings.js';
import {canChangeMouseTool,sampleMouseCombat,selectedAttacks} from '../core/combat-selection.js';
import {soldierControlsActive,selectSoldierAttack,soldierSprint} from '../core/soldier-controls.js';
import {cancelHeldSlot,cancelHeldAttacks,cancelHeldAttacksIfIncapacitated} from './abilities.js';
import { BoxingRing, BOXING } from './boxingring.js';
import { PowerWorldStage } from './powerworld.js';
import { FrontlineEncounter } from './frontline-encounter.js';
import {equipmentPolicy,selectedGadget} from './equipment-policy.js';
import {ZombieEncounter} from './zombie-encounter.js';
import {DesertSecurity} from './desert-security.js';
import { STRIKES } from '../data/martial.js';
import { beamBuildOf, beamTemperOf } from '../data/visual.js';
import { Gamepad } from '../core/gamepad.js';
import {updateMovementGears,resetMovementGears} from '../core/movement-gears.js';
import { runSlot, performEvade } from './abilities.js';
import {requestReload,firearmAmmo,cancelFirearmReload} from './firearm-ammo.js';
import { ROSTER } from '../data/characters.js';
import { BANDS, clamp, rand, TAU, damp, GROUND_LAYER, PW_KB, PW_FX, pwCatchSpeed, AIM_MAX_D, GAIT, GAIT_OWNER } from '../core/util.js';
import {firearmAimRange,firearmSightZoom} from './firearm-aim.js';
import { tierOf, TIER_COLORS } from './entity.js';
import {formAt,slotUnlocked} from '../data/progression.js';
import {selectHitFeedback} from './hit-feedback.js';
import {confirmCombatOutcome} from './combat-confirmation.js';
import {zombieSound} from './zombie-audio.js';

const _v = new THREE.Vector3();
// ⚠ THE RETICLE NEVER LIES (docs/powerworld/aaa-05-reticle.md). `_muz` is the muzzle point for the
// aim two-pass and `_camDir` the camera's own ray direction — NEITHER may be `_v`, which is live
// inside `controlPlayer` today (the shared-temp aliasing rule is a hard rule). `_aimOut` is the
// reused write target for `world.aimTrace` (its `.point` is created once and reused).
const _muz = new THREE.Vector3();
const _camDir = new THREE.Vector3();
const _camOrigin = new THREE.Vector3();
const _aimOut = { point: new THREE.Vector3(), dist: 0, hit: null, ent: null };
function lockAvailable(g,p,e){
  return e!==p&&e!==p._personCarry?.victim&&e.alive&&!e.phase&&!e._banished&&!e._inert&&!(p.blindT>0)&&
    (e._vis??1)>.4&&g.isFoe(p,e)&&p.pos.distanceToSquared(e.pos)<=AIM_MAX_D*AIM_MAX_D&&g.canSee(p,e);
}
const SLOT_KEYS = ['lmb', 'rmb', 'q', 'e', 'r', 'f', 'shift'];
// what a bot may fire at a thrown car (manual §47) — a TAPPED, aimed, travelling shot. Charges,
// rushes and ultimates are all the wrong answer to a rock arriving in a second and a half, and the
// ult is deliberately excluded: nobody spends a Supernova on a boulder.
const SHOOTDOWN_TYPES = new Set(['projectile', 'volley', 'rifle', 'bow']);
const TAP_DIRS = [['KeyW', 'ArrowUp', 0, 1], ['KeyS', 'ArrowDown', 0, -1], ['KeyA', 'ArrowLeft', -1, 0], ['KeyD', 'ArrowRight', 1, 0]];
const NULL_PAD = { active: false, aiming: false, moving: false, lx: 0, ly: 0, rx: 0, ry: 0, down: () => false, pressed: () => false, released: () => false };
const _inp = { pressed: false, held: false, released: false, dt: 0 };   // scratch intent — runSlot reads it synchronously
function feedSlot(g, f, k, it, busy, dt) {
  const blocked = busy && k !== 'shift';
  _inp.pressed = blocked ? false : it.pressed; _inp.held = blocked ? false : it.held; _inp.released = it.released; _inp.dt = dt;
  runSlot(f, k, _inp, g);
}

// Game modes: setup spawns, tick drives it, onKO scores, isOver returns a result, hud describes the top bar.
const MODE_IMPL = {
  duel: {
    setup(g, o) {
      g.ms = { p1KO: 0, enemyKO: 0, target: 3 };
      g.ms.p1 = g.humans[0].fighter;
      g.ms.enemy = o.twoPlayer ? g.humans[1].fighter : (o.net ? null : g.spawnEnemy(o.enemy, { x: 0, z: -42, aiLevel: o.aiLevel || 1.25 }));   // career bouts scale the bot with the Elo gap
    },
    tick() {},
    onKO(g, v) { if (v === g.ms.p1) g.ms.enemyKO++; else if (v === g.ms.enemy) g.ms.p1KO++; },
    isOver(g) { if (g.ms.p1KO >= g.ms.target) return { win: true, title: 'VICTORY', lines: ['You bested ' + g.ms.enemy.name] }; if (g.ms.enemyKO >= g.ms.target) return { win: false, title: 'DEFEAT', lines: [g.ms.enemy.name + ' won the duel'] }; return null; },
    hud(g) { return { type: 'duel', a: g.ms.p1KO, b: g.ms.enemyKO, target: g.ms.target, aName: 'YOU', bName: g.ms.enemy ? g.ms.enemy.name : 'RIVAL' }; },
  },
  survival: {
    setup(g, o) { g.ms = { wave: 0, score: 0, lives: 3, betweenT: 1.5, target: (o && o.waves) || 0 }; },
    tick(g, dt) {
      const bots = g.entities.filter(e => e.ai && e.alive).length;
      if (bots === 0) { g.ms.betweenT -= dt; if (g.ms.betweenT <= 0) { g.ms.wave++; g._spawnWave(g.ms.wave); g.ms.betweenT = 3.6; if (g.hud) g.hud.announce('WAVE ' + g.ms.wave, g._waveCount(g.ms.wave) + ' rivals incoming', '#ffb03a'); } }
    },
    onKO(g, v) { if (v.ai) g.ms.score += 120 + g.ms.wave * 20; else if (g.isHuman(v)) { g.ms.lives--; if (g.hud) g.hud.announce(g.ms.lives > 0 ? 'DOWN!' : 'LAST BREATH', g.ms.lives + ' lives left', '#ff5a4a'); } },
    isOver(g) {
      if (g.ms.lives <= 0 && g.humans.every(h => !h.fighter.alive)) return { win: false, title: 'OVERWHELMED', lines: ['Reached Wave ' + g.ms.wave, 'Score ' + g.ms.score], wave: g.ms.wave };
      // THE DEFENSE CONTRACT (career): clear the contracted wave count and the district holds
      if (g.ms.target && g.ms.wave >= g.ms.target && !g.entities.some(e => e.ai && e.alive)) return { win: true, title: 'DISTRICT HELD', lines: [g.ms.target + ' waves repelled', 'Score ' + g.ms.score], wave: g.ms.wave };
      return null;
    },
    hud(g) { return { type: 'survival', wave: g.ms.wave, score: g.ms.score, lives: Math.max(0, g.ms.lives) }; },
  },
  rumble: {
    setup(g) { g.ms = { target: 12, timer: 99 }; const chars = ROSTER.map(r => r.id).sort(() => Math.random() - 0.5); for (let i = 0; i < 3; i++) g.spawnEnemy(chars[i], { aiLevel: 1, r: 82 }); },
    tick(g, dt) { g.ms.timer -= dt; },
    onKO() {},
    isOver(g) {
      const hi = g.humans.reduce((m, h) => Math.max(m, h.fighter.kills), 0);
      const bot = g.entities.filter(e => e.ai).reduce((m, b) => Math.max(m, b.kills), 0);
      if (hi >= g.ms.target) return { win: true, title: 'VICTORY', lines: [hi + ' KOs — arena cleared'] };
      if (bot >= g.ms.target) return { win: false, title: 'DEFEAT', lines: ['A rival hit ' + g.ms.target + ' first'] };
      if (g.ms.timer <= 0) return hi >= bot ? { win: true, title: 'TIME — YOU WIN', lines: [hi + ' KOs'] } : { win: false, title: 'TIME — YOU LOSE', lines: [hi + ' KOs'] };
      return null;
    },
    hud(g) { const hi = g.humans.reduce((m, h) => Math.max(m, h.fighter.kills), 0); return { type: 'rumble', frags: hi, target: g.ms.target, timer: Math.max(0, Math.ceil(g.ms.timer)) }; },
  },
  training: {
    setup() {},   // THE ROOM STARTS EMPTY (Robert's ruling): N orders a bot, B orders a rival
    tick() {}, onKO() {}, isOver() { return null; },
    hud() { return { type: 'training' }; },
  },
  // FREE ROAM — the living city with nothing asked of you. This is the DEFAULT way to be in the
  // world: everything the theatre already simulates (traffic, pedestrians, wildlife, weather, the
  // day/night clock, the police ladder, the news crew) runs exactly as it does in a match, and
  // nothing spawns to fight you. ⚠ It is deliberately NOT `training`: that id puts the world into
  // SIM mode (world.setSim), which fabricates a Danger Room instead of building the real city, and
  // it also switches OFF the police and the news crew. Free roam wants all three on — the whole
  // point is that the city behaves.
  freeroam: {
    setup(g) {
      g.ms = { roam: true };
      // the departure gate is ceiling-based and needs no wiring; a burner-class flier can just go.
    },
    tick() {}, onKO() {}, isOver() { return null; },
    hud() { return { type: 'freeroam' }; },
  },
  // THE WHITE ROOM — the laboratory half of the Danger Room. No city, no crowd, no police: a white
  // box, an instrumented dummy, and a wall board reporting what your attacks actually did. Every
  // number is captured at onHit (the damage choke point), never re-derived from ability data.
  // THE RING — a WORLD rule set, not a prop. See engine/boxingring.js.
  boxing: {
    setup(g, o = {}) {
      g.ms = { boxing: true, noRespawn: true };
      g.ring = new BoxingRing(g);
      g.ring.open();
      const hs = g.humans.map(h => h.fighter).filter(Boolean);
      // ⚠ A BOXING MATCH NEEDS TWO BOXERS, and the first version shipped with one. `setup` built the
      // ring and never spawned the opponent — every rule downstream (the card, the ten-count, the
      // decision) had nothing to score, and the headless suite said so in one line: `no foe`.
      // A mode's setup owns its spawns; `duel` does exactly this and I did not copy it.
      // ⚠ `o.p2` IS WHAT EVERY OTHER MODE AND THE CHARACTER SELECT CALL THE OPPONENT, and this read
      // only `o.enemy` — so asking for a specific fighter silently got you a random one off the
      // roster. A title fight against whoever turned up is not a title fight.
      g.ms.enemy = o && o.twoPlayer ? hs[1]
        : g.spawnEnemy((o && (o.enemy || o.p2)) || null, { x: 13, z: 13, aiLevel: (o && o.aiLevel) || 1.2 });
      // red corner and blue corner, facing each other, exactly as they start a real fight
      if (hs[0]) { hs[0].pos.set(-13, 0, -13); hs[0].aim.set(1, 0, 0); if (hs[0].aim3) hs[0].aim3.set(1, 0, 0); }
      // ---- PURE BOXING. Robert: *"no powers, no guns, no gadgets and allow pure boxing matches."*
      // ⚠ ONE FLAG ON THE FIGHTER, read at the choke points that already exist — `runSlot` (every
      // ability in the game goes through that one door), `useItem`, `ai.pick` and `handsOf`. The
      // melee trifecta is untouched because it never went through any of them, which is exactly why
      // "fists only" is a subtraction rather than a new combat mode.
      if (BOXING.pure && !(o && o.powers)) {
        for (const e of g.entities) if (e.def && !e.isDummy) {
          e.noPowers = true;
          if (e._gearHeld) g.dropGear(e, false);          // whatever was in the hands is out of them
          e._hand = 1;
          // ⚠ AND THE BOT HAS TO WANT TO BOX. `ai.range` is the distance it HOLDS, and it actively
          // backs off inside `pref - 8` — a bruiser sits at 18 while a jab reaches 11, so it could
          // never land and retreated whenever you closed. That is "the other person can't get to
          // me", and it is doctrine, not pathing. A boxer wants to be in punching range.
          if (e.ai) { e.ai.range = 7; e.ai.aggro = Math.max(e.ai.aggro || 0, 1.0); e.ai.flyTend = 0; }
        }
      }
      for (const e of g.entities) if (e.def) g.ring.card(e);
    },
    tick(g, dt) { if (g.ring) g.ring.update(dt, g); },
    onKO(g, f) { if (g.ring) g.ring.down(f); },
    isOver(g) {
      const o = g.ring && g.ring.over;
      return o ? { win: !!(o.winner && g.humans.some(h => h.fighter === o.winner)), text: o.why } : null;
    },
    // ⚠ THIS WAS THE STRING `'boxing'` AND IT THREW EVERY SINGLE FRAME. `updateModeBar` calls
    // `g.mode.hud(g)`; every other mode returns a live state object from a function. The backlog
    // recorded this as "the bar is blank", which is what it looked like — the frame try/catch and
    // the repeated-error ledger between them turned a 60Hz TypeError into a quiet menu item. It was
    // measured at 1,200 throws in one short match. A mode's `hud` is a function, always.
    hud: (g) => {
      const r = g.ring, cards = r ? Object.values(r.cards) : [];
      const [a, b] = cards;
      return {
        type: 'boxing',
        round: r ? r.round : 1, rounds: BOXING.rounds,
        clock: r ? Math.max(0, r.roundT) : 0,
        count: r && r.count ? r.count.n : 0,
        countWho: r && r.count && r.count.who && r.count.who.def ? r.count.who.def.name : '',
        aName: a ? a.name : '—', bName: b ? b.name : '—',
        aPts: a ? a.points : 0, bPts: b ? b.points : 0,
        aLanded: a ? a.landed : 0, bLanded: b ? b.landed : 0,
        aDowns: a ? a.downs : 0, bDowns: b ? b.downs : 0,
      };
    },
  },
  // POWERWORLD — the second dimension. See docs/POWERWORLD.md. This is the rule set only: the
  // third-person camera, the stages and the door are later slices, and shipping the RULES first is
  // deliberate — the chase loop has to be fun in the camera we already have or the camera is a
  // very expensive way to find out it isn't.
  powerworld: {
    setup(g, o = {}) {
      g.ms = { powerworld: true, chaseCam: true };   // the third-person lock-on view (world.chase)
      g.pwStage = new PowerWorldStage(g); g.pwStage.open();   // the stage — see engine/powerworld.js
      g.pwStage.setDaylight(o.daylight);
      g.weather.set(['rain','storm','tornado','hurricane'].includes(o.weatherPreset)?o.weatherPreset:'clear');
      // ⚠ THE CITY HUD LIES IN ANOTHER DIMENSION. The nameplate read "TRANQUILITY REACH · THE MOON ·
      // POP 8K · CRIME 8" while standing on a rock spire in PowerWorld — a surface stating a fact
      // that is not true of where you are. One body class, and the stylesheet does the rest; the
      // player panel, the hands row and the radar all stay, because those are still true.
      document.body.classList.add('powerworld');
      // ⚠ NOBODY LIVES HERE. `police.active` is a GETTER and `news.enabled` is set from the mode id,
      // so neither can be switched off from out here — the honest fix was to give "does this theatre
      // have a civil society" one definition (`hasCivilians` in data/modes.js) that both already read.
      // POWERWORLD is in that set, so the law and the press stand down by construction.
      if (g.peds && g.peds.mesh) g.peds.mesh.visible = false;
      // ⚠ NO FOG OF WAR, AND THIS IS NOT AN OPTIMISATION — IT IS A CORRECTNESS FIX. The vision layer
      // culls an entity's mesh below `_vis 0.35`, and the fog plane is a flat ground quad that cannot
      // conceal a fight happening in the sky anyway. The first screenshot of the chase camera showed
      // exactly ONE fighter while the projection maths insisted both were in frame: the camera was
      // framing an opponent the vision layer had made invisible. There is nothing to hide behind in an
      // open sky, so `fov` goes off and every fighter is drawn.
      // ⚠ The AI honesty law is untouched — `canSee`/`_vis` are what the BOTS read, and they are still
      // computed. This turns off the PLAYER's concealment rendering, not anyone's knowledge.
      // ⚠ STASHED, because `fov` is a GAME field and would otherwise leak into the next match —
      // measured: after one visit the city had no fog of war at all and its fog plane stayed hidden.
      // Restored in `clearTransients`, the one place that empties the board.
      g._fov0 = g.fov;
      g.fov = false;
      g.world.setFogEnabled && g.world.setFogEnabled(false);
      // THE OPEN SKY. `fitBands` sizes the ceiling from the tallest thing built, and the deck servo
      // eases a flier onto a band's deck the moment they stop climbing — both correct for a city
      // fight over rooftops, both wrong for a dimension whose premise is that altitude is yours.
      // ⚠ `BANDS` IS A MODULE OBJECT IN core/util.js, NOT A WORLD PROPERTY. Reaching for
      // `world.BANDS` reads undefined, and the `if` guard I first wrote around it meant the open sky
      // silently did nothing — a guard turning a wrong reference into a no-op instead of an error.
      // ⚠ Stashed on the GAME, because `clearTransients` is the one place that puts it back and a
      // mode object is not something a reset path can see.
      g._bands0 = { ...BANDS };
      BANDS.ceiling = Math.max(BANDS.ceiling, 900);
      BANDS.sky = Math.max(BANDS.sky, 420);
      const hs = g.humans.map(h => h.fighter).filter(Boolean);
      if (hs[0]) hs[0].pos.set(-40, 0, -40);
      if(!o.twoPlayer&&hs[0]&&o.cameraPreset==='frontline')hs[0]._cameraPreset='frontline';
      if (o.encounter === 'threatLab' && !o.twoPlayer) {
        g.ms.threatLab=new ThreatDeployment(g);
      } else if (o.encounter === 'frontline' && !o.twoPlayer) {
        g.ms.frontline = new FrontlineEncounter(g);
      } else if(o.encounter==='zombies'&&!o.twoPlayer){
        g.ms.zombies=new ZombieEncounter(g);
      } else if(o.encounter==='security'&&!o.twoPlayer){
        g.ms.desertLaw=new DesertSecurity(g);
      } else if(o.encounter === 'practice' && !o.twoPlayer){
        // An explicit menu choice, not an invulnerability/debug override.
        // Normal resources, physics and controls; B can add a rival on demand.
        g.ms.practice=true;
      } else g.ms.enemy = o && o.twoPlayer ? hs[1]
        : g.spawnEnemy((o && (o.enemy || o.p2)) || null, { x: 40, z: 40, aiLevel: (o && o.aiLevel) || 1.25 });
      if(o.squad&&!o.twoPlayer){
        const squad=validateSquad({...o.squad,p1:hs[0].def.id},ROSTER);
        g.ms.squad={...squad,members:[]};
        [...squad.companions,...Array(squad.soldiers).fill('sarge')].forEach((id,i)=>{
          const member=g.spawnEnemy(id,{team:hs[0].team,x:-55+(i%3)*15,z:-57-Math.floor(i/3)*15,aiLevel:1.15});
          member._squadLeader=hs[0];g.ms.squad.members.push(member);
          if(o.encounter==='threatLab')member.noRespawn=true;
        });
      }
      for (const e of g.entities) if (e.def && !e.isDummy && !e._frontlineClone) {
        e._chaseKb = true;   // a knockback CARRIES here — see entity._physics
        // Free altitude and presentation rules; flight permission remains per character.
        e._openSky = true;
        if (e.ai) e.ai.flyTend = e.flightTier>0?Math.max(e.ai.flyTend || 0, 0.8):0;
      }
    },
    tick(g, dt) {
      // late arrivals (a rival ordered with B, a respawn) inherit the dimension's rules
      for (const e of g.entities) if (e.def && !e.isDummy && !e._frontlineClone && !e._chaseKb) { e._chaseKb = true; e._openSky = true; }
      // ⚠ RE-ASSERTED, because `world.fitBands()` runs AFTER the mode's setup and rewrites the band
      // table from the tallest thing it just built — measured: the ceiling I raised in setup was back
      // to 320 by the first frame. Re-asserting here is idempotent and cannot be out-ordered.
      // (The structurally better fix is a `plan.bandsLocked` early return inside fitBands, which
      // belongs with the stage work — noted in docs/POWERWORLD.md.)
      if (BANDS.ceiling < 900) { BANDS.ceiling = 900; BANDS.sky = Math.max(BANDS.sky, 420); }
      if(g._threatRoom?.active){g.ms.threatLab?.update(dt);return;}
      if (g._pwStage) g._pwStage.tick(g.player);      // the climb to space — one fraction of altitude
      g.ms.frontline?.update(dt);
      g.ms.zombies?.update(dt);
      g.ms.desertLaw?.update(dt);
      g.ms.threatLab?.update(dt);
      if(g.ms.threatLab?.state==='field'&&!g.ms.convoyOperation)g.ms.convoyOperation=new ConvoyOperation(g);
      g.ms.convoyOperation?.update(dt);
      g.pwStage?.transport?.update(dt);
      for(const f of g.entities)if(f._threatScan)updateThreatScan(g,f,dt);
      if(!g.player?._threatScan)clearScannerPanel(g);
    },
    onKO() {},
    isOver() { return null; },          // a proving ground, like free roam — you leave when you like
    hud: (g) => ({ type: 'powerworld' }),
  },
  lab: {
    setup(g) {
      g.ms = { lab: true };
      g.lab = new WhiteRoom(g);
      g.lab._AI = { AI };                       // the room spawns a sparring AI when toggled on
      g.lab.open();
      const p = g.humans[0] && g.humans[0].fighter;
      // stand them side-on and forward of the board so the readout is in frame from the first moment
      if (p) { p.pos.set(-12, 0, 18); p.aim.set(1, 0, 0); p.aim3.set(1, 0, 0); }
    },
    tick(g, dt) { if (g.lab) g.lab.update(dt); },
    onKO() {}, isOver() { return null; },
    hud() { return { type: 'lab' }; },
  },
  // THE BASE — your own HQ, walkable. Indoor, non-destructible, and every wall is a consequence
  // of the facility grid in data/base.js: a room exists because a slot is dug, a doorway exists
  // because two dug rooms touch. Nobody in here is hostile — it is a place, not an arena.
  base: {
    setup(g) {
      g.ms = { base: true };
      g.baseRoom = new BaseRoom(g);
    },
    tick(g, dt) { if (g.baseRoom) g.baseRoom.update(dt); },
    onKO() {}, isOver() { return null; },
    hud() { return { type: 'base' }; },
  },
  // THE INVITATIONAL — one bracket match: best-of-3 ELIMINATION rounds (last side standing takes
  // the round, nobody respawns mid-round), team damage LIVE. The Tournament object rides in o.tourney.
  tournament: {
    setup(g, o) {
      const T = o.tourney, m = T && T.currentMatch();
      g.ms = { T, m, aWins: 0, bWins: 0, target: 2, round: 1, betweenT: 0, roundLive: false, roundName: T ? T.roundName() : 'EXHIBITION' };
      g.friendlyFire = true;   // the ruling: your splash is EVERYONE'S problem
      g._tourneyRound();
    },
    tick(g, dt) {
      const ms = g.ms; if (!ms.m) return;
      if (ms.betweenT > 0) { ms.betweenT -= dt; if (ms.betweenT <= 0 && !g.matchOver) g._tourneyRound(); return; }
      if (!ms.roundLive || g.matchOver) return;
      // a DOMINATED fighter counts for their ORIGINAL side — mind control may turn a round, never END one
      const side = (e) => (e._controlled && e._oldTeam !== undefined) ? e._oldTeam : e.team;
      const aAlive = g.entities.some(e => e.alive && e.def && !e.isDummy && side(e) === 0);
      const bAlive = g.entities.some(e => e.alive && e.def && !e.isDummy && side(e) === 1);
      if (aAlive && bAlive) return;
      ms.roundLive = false;
      const aWon = aAlive;                                  // double-KO edges to the challengers
      if (aWon) ms.aWins++; else ms.bWins++;
      g.slowmo(0.5, 0.35);
      if (ms.aWins < ms.target && ms.bWins < ms.target) {
        ms.round++; ms.betweenT = 3.0;
        if (g.hud) g.hud.announce(aWon ? 'ROUND YOURS' : 'ROUND LOST', `${ms.aWins}–${ms.bWins} · first to ${ms.target}`, aWon ? '#8fe08a' : '#ff6a5a');
      }
    },
    onKO() {},
    isOver(g) {
      const ms = g.ms; if (!ms.m) return { win: false, title: 'NO BRACKET', lines: ['Tournament state lost'] };
      if (ms.aWins < ms.target && ms.bWins < ms.target) return null;
      const win = ms.aWins >= ms.target, final = ms.T.isFinal(ms.m);
      return {
        win, tournament: true,
        title: win ? (final ? 'CHAMPION' : 'ADVANCE') : 'ELIMINATED',
        lines: [win
          ? (final ? `The ${ms.T.label} is yours — ${ms.aWins}–${ms.bWins} in the final` : `${ms.roundName} taken ${ms.aWins}–${ms.bWins} — the bracket advances`)
          : `Out in the ${ms.roundName.toLowerCase()} — ${ms.aWins}–${ms.bWins} against ${ms.T.sideName(ms.T.playerFoeSide(ms.m))}`],
      };
    },
    hud(g) {
      const ms = g.ms;
      return { type: 'tournament', a: ms.aWins, b: ms.bWins, target: ms.target, round: ms.round, roundName: ms.roundName, bName: ms.m ? ms.T.sideName(ms.T.playerFoeSide(ms.m)) : 'RIVALS' };
    },
  },
};

export class Game {
  constructor(canvas, input, audio) {
    this.input = input; this.audio = audio; this.pad = new Gamepad();
    this.world = new World(canvas);
    this.world.game = this;   // the world needs a way back for teardown hooks (interactables)
    this.scene = this.world.scene;
    this.particles = new Particles3D(this.scene);
    this.vfx = new VFX(this.world, this.particles);
    this.projectiles = new Projectiles(this);
    this.melee = new MeleeSystem(this);
    this.peds = new Pedestrians(this.world.scene, this.world.ARENA || 240, this.world.waterX || 188);
    this.news = new NewsCrew(this);  // the KMK 9 field crew — films the fight, records the clips
    this.news.setCameraProfile(loadBroadcastProfile());
    this.police = new PoliceSystem(this);   // the city's answer to whoever hurts humans
    // EVERY city rebuild re-grids what was keyed to the old map — whether it came from a match,
    // the atlas, or the map maker's live preview. There is exactly one of these for a reason.
    this.world.onRebuilt = (plan) => {
      // ⚠ THE PLAN GOES THROUGH. Without it the crowd has no idea what kind of place it is standing
      // in — the district table and the population tier both hang off it.
      this.peds.setCity(this.world.ARENA, this.world.waterX, !(this.world.plan && this.world.plan.atmosphere === false), this.world.plan);
      this.vfx.clearScorches();
      if (this.news && this.news.reset) this.news.reset();
    };
    // the match record the news desk reports from (reset in startMode)
    this.matchT = 0; this.matchLog = [];
    this.cityStats = { civs: 0, cars: 0, blocks: 0, craters: 0 };
    this.bigHit = { amount: 0, by: null, kind: 'blast' };
    this._p1MaxCombo = 0; this.matchReport = null;
    this.hud = null;                 // set by main.js — for damage numbers / combo
    this.combo = 0; this.comboT = 0;
    this.humans = [];                // local players: [{ fighter, scheme:'kbm'|'pad' }]
    this.mode = null; this.modeId = null; this.ms = {}; this.matchOver = false; this.matchResult = null;
    this.entities = []; this.minions = []; this.constructs = [];
    this._gen = 0; this._timers = new Set();   // the deferred-callback law — see later()
    this._errSeen = new Map();                 // the repeated-error law — see reportError()
    // TIER THREE SYSTEMS (docs/POWERS_BRIEF.md Part Five) — engine layers, not abilities
    this.weather = new Weather(this);
    this.timeFields = new TimeFields(this);
    this.gravityZones = new GravityZones(this);
    this.portals = []; this._openPair = null;   // dimensional door pairs (RIFT)
    this.aimPoint = new THREE.Vector3(20, 0, 0);
    this.time = 0; this.running = false; this.player = null;
    this.lockTarget = null; this._lastLock = null; this._sp = { x: 0, y: 0, behind: false };
    this.hardLock = null; this._aim3pt = new THREE.Vector3();
    // field of vision — enemies only shown where the player can see them
    this.fov = true; this.visNear = 26; this.visRange = 96; this.visCos = Math.cos(0.96); this.visReveal = 130;
    this._ghostGeo = new THREE.CapsuleGeometry(1.5, 3.2, 4, 8);
    this._buildReticle();
    this._buildLockMark();
    this._buildPlayerMark();
    this._buildSpacingRings();
    this._buildThrowArc();

    // camera-aligned movement basis
    const cd = this.world.camDir;
    this.fwd = new THREE.Vector3(-cd.x, 0, -cd.z).normalize();
    this.right = new THREE.Vector3().crossVectors(this.fwd, new THREE.Vector3(0, 1, 0)).normalize();

    this.onKill = null; // hud hook
  }

  _buildReticle() {
    this.reticle = new THREE.Group();
    const mk = (o) => new THREE.MeshBasicMaterial({ color: '#ffd24a', transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.1, 3.7, 40), mk(0.85));
    ring.rotation.x = -Math.PI / 2; this.reticle.add(ring);
    const ring2 = new THREE.Mesh(new THREE.RingGeometry(4.6, 4.9, 4), mk(0.6)); // square-ish bracket
    ring2.rotation.x = -Math.PI / 2; ring2.rotation.z = Math.PI / 4; this.reticle.add(ring2);
    const chev = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.8, 3), mk(0.95));
    chev.rotation.x = Math.PI; chev.position.y = 13; this.reticle.add(chev);
    this.reticle.visible = false; this.scene.add(this.reticle);
    this._retRing = ring; this._retRing2 = ring2; this._retChev = chev;
  }

  // "YOU ARE HERE" — at 1:1 city scale a 9.6u hero is a speck between towers. A soft gold ring
  // under the player (pulsing, ground-pinned) makes you findable at a glance without clutter.
  _buildPlayerMark() {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.RingGeometry(4.2, 5.4, 44), new THREE.MeshBasicMaterial({ color: '#ffd24a', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; g.add(ring);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(5.2, 32), new THREE.MeshBasicMaterial({ color: '#ffd24a', transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.rotation.x = -Math.PI / 2; g.add(glow);
    // ⚠ A TRIANGLE ON THE RING, NOT ANOTHER ONE UNDER IT. There is already a `faceWedge` — a wide
    // arc on the figure's own ground rig showing where the BODY is turned. This is a different
    // question: which way is the PLAYER pointed, on the you-are-here mark, readable from the far
    // camera where a 1.4u-wide arc is a smudge. A small solid triangle riding the ring's edge is
    // the smallest shape that answers it, and it sits on the mark rather than beside it.
    const tri = new THREE.Mesh(new THREE.CircleGeometry(1.5, 3), new THREE.MeshBasicMaterial({
      color: '#ffd24a', transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    tri.rotation.x = -Math.PI / 2;
    // CircleGeometry(r, 3) has its first vertex at +X, so the shape already points along +X;
    // spinning the whole group by the heading is then all that is needed.
    tri.position.set(4.8, 0.02, 0);
    g.add(tri);
    g.visible = false; this.scene.add(g);
    this.playerMark = g; this._pmRing = ring; this._pmGlow = glow; this._pmTri = tri;
  }
  // TELEPORT TARGETING — the blink always went to your aim point, but with nothing drawn there
  // you were guessing. This puts a ring exactly where you WILL land (range-clamped, so it stops
  // at the edge of what the ability can actually reach) whenever a blink is ready to fire.
  updateBlinkMark(dt) {
    if (!this._blinkMark) {
      const g = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.RingGeometry(3.4, 4.2, 32), new THREE.MeshBasicMaterial({ color: '#eaffff', transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2;
      const pip = new THREE.Mesh(new THREE.ConeGeometry(1, 2.4, 4), new THREE.MeshBasicMaterial({ color: '#eaffff', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
      pip.rotation.x = Math.PI; pip.position.y = 7;
      g.add(ring, pip); g.visible = false; this.scene.add(g);
      this._blinkMark = g; this._bmRing = ring; this._bmPip = pip;
    }
    const p = this.player, m = this._blinkMark;
    let slot = null;
    if (p && p.alive && this.running && !this.matchOver) {
      for (const k in p.slots) { const s = p.slots[k]; if (s.def.type === 'teleport' && s.cd <= 0 && p.ki >= (s.def.cost || 0)) { slot = s; break; } }
    }
    if (!slot) { if (m.visible) m.visible = false; return; }
    const range = slot.def.range || 42;
    const dx = this.aimPoint.x - p.pos.x, dz = this.aimPoint.z - p.pos.z, d = Math.hypot(dx, dz) || 1;
    const dd = Math.min(range, d);
    m.visible = true;
    m.position.set(p.pos.x + (dx / d) * dd, 0.2, p.pos.z + (dz / d) * dd);
    this._bmRing.rotation.z += dt * 2.2;
    this._bmPip.position.y = 7 + Math.sin(this.time * 6) * 0.7;
    const capped = d > range;                       // out of reach = amber, in reach = clean white
    const col = capped ? '#ffb03a' : '#eaffff';
    if (this._bmCol !== col) { this._bmCol = col; this._bmRing.material.color.set(col); this._bmPip.material.color.set(col); }
  }

  // THE SPACING RINGS — the whole reason the reach inversion is legible (manual §38).
  // Three ground rings at jab / cross / power reach in the strike colours. You live on the OUTER
  // ring; the inner one is where the damage is and where their power reaches you too. Seeing the
  // bands teaches spacing faster than any tutorial can, which is why this is an accessibility
  // option rather than a debug flag — it is off by default and it is not a wallhack: it shows YOUR
  // reach, information you already have, never anything about the opponent.
  _buildSpacingRings() {
    const g = new THREE.Group();
    this._srRings = ['jab', 'cross', 'power'].map((id) => {
      const S = STRIKES[id];
      // ⚠ THE RING IS DRAWN AT THE REACH THE ENGINE USES, read from the same table melee.js reads.
      // A spacing overlay that draws its own idea of reach is worse than none at all.
      const m = new THREE.Mesh(new THREE.RingGeometry(S.reach - 0.35, S.reach + 0.35, 72),
        new THREE.MeshBasicMaterial({ color: S.color, transparent: true, opacity: 0.3,
          blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      m.rotation.x = -Math.PI / 2; g.add(m); return m;
    });
    // the pocket: a faint fill inside power reach — the ground you have to stand on to hurt anyone
    const pk = new THREE.Mesh(new THREE.CircleGeometry(STRIKES.power.reach, 48),
      new THREE.MeshBasicMaterial({ color: STRIKES.power.color, transparent: true, opacity: 0.055,
        blending: THREE.AdditiveBlending, depthWrite: false }));
    pk.rotation.x = -Math.PI / 2; g.add(pk); this._srPocket = pk;
    g.visible = false; this.scene.add(g); this.spacingRings = g;
  }

  updateSpacingRings() {
    const g = this.spacingRings, p = this.player;
    if (!g) return;
    // ⚠ READER #6 (aaa-03 §1): the spacing overlay is a GROUND-fight tool. `GAIT_OWNER === 'ground'`
    // not `!flying`, so it appears when a fighter stands on the PowerWorld floor (where `flying` was
    // stuck true and the overlay never showed) and hides in the air/transitions. City: ground ⟺ !flying.
    const show = !!(SETTINGS.spacingRings && p && p.alive && this.mode && this.running && GAIT_OWNER[p.gait] === 'ground');
    if (g.visible !== show) g.visible = show;
    if (!show) return;
    g.position.set(p.pos.x, (p.groundY || 0) + GROUND_LAYER.spacing, p.pos.z);
    // the ring for the strike you could throw RIGHT NOW brightens — the rings read as a state, not
    // as furniture, and a fighter on cooldown can see that they are the one who has to give ground.
    const ready = p.strikeCd <= 0 || p.comboWin > 0;
    const k = ready ? 1 : 0.45;
    for (const m of this._srRings) m.material.opacity = 0.3 * k;
    this._srPocket.material.opacity = 0.055 * k;
  }

  updatePlayerMark(dt) {
    const m = this.playerMark, p = this.player;
    if (!m) return;
    const show = !!(p && p.alive && this.mode && this.running && !p._openSky);
    if (m.visible !== show) m.visible = show;
    if (!show) return;
    // ⚠ 0.16 was an invented number that landed 11cm above the contact shadow (0.05) and tied with
    // the city's ground decals — the "you are here" ring was itself part of the crawl underfoot.
    // GROUND_LAYER declares the rungs so two systems can never pick the same one (core/util.js).
    m.position.set(p.pos.x, (p.groundY || 0) + GROUND_LAYER.mark, p.pos.z);
    const pulse = 0.42 + Math.sin(this.time * 3.1) * 0.12;
    this._pmRing.material.opacity = pulse;
    this._pmGlow.material.opacity = 0.07 + Math.sin(this.time * 3.1) * 0.03;
    // ⚠ THE MARK IS IN WORLD SPACE, so the heading goes straight on without the counter-rotation
    // the faceWedge needs (that one is parented to the figure group, which already carries the
    // damped body yaw — subtracting it there is why it does not lag). Here there is nothing to
    // subtract. `facing` is the damped heading, so the triangle follows the turn rather than
    // snapping, and it reads the AIM the moment the player starts turning.
    if (this._pmTri) {
      m.rotation.y = -p.facing;
      // brighter while actually moving — at rest it is a hint, in motion it is a direction
      const spd = Math.hypot(p.vel.x, p.vel.z);
      this._pmTri.material.opacity = 0.55 + Math.min(0.4, spd / 60) + Math.sin(this.time * 3.1) * 0.06;
    }
    const s = 1 + Math.sin(this.time * 3.1) * 0.04;
    m.scale.set(s, 1, s);
    if (this._pmColor !== p.def.colors.accent) {   // wears your hero's colour
      this._pmColor = p.def.colors.accent;
      this._pmRing.material.color.set(this._pmColor); this._pmGlow.material.color.set(this._pmColor);
    }
  }

  // ---------- THE THROW ARC: aim before you lob ----------
  // Any gravity-bound projectile (grenades) gets a dotted parabola from the muzzle to where it
  // will actually land, plus a landing ring. Same maths the projectile uses, so it never lies.
  _buildThrowArc() {
    const g = new THREE.Group(); g.visible = false;
    const dotGeo = new THREE.SphereGeometry(0.34, 6, 5);
    this._arcDots = [];
    for (let i = 0; i < 26; i++) {
      const m = new THREE.Mesh(dotGeo, new THREE.MeshBasicMaterial({ color: '#ffd24a', transparent: true, opacity: 0.6, depthWrite: false }));
      g.add(m); this._arcDots.push(m);
    }
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.2, 3.0, 22), new THREE.MeshBasicMaterial({ color: '#ffd24a', transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; g.add(ring); this._arcRing = ring;
    this.scene.add(g); this.throwArc = g;
  }
  updateThrowArc() {
    const arc = this.throwArc, p = this.player;
    if (!arc) return;
    if(p?.alive&&this.running&&p._traversalLeap&&!p._traversalLeap.active){
      if(!this._leapCue||this.time-(this._leapCueAt||0)>.08){this._leapCue=previewTraversalLeap(p,this.world);this._leapCueAt=this.time;}
      const cue=this._leapCue;if(cue){arc.visible=true;this._arcRing.visible=cue.contact;this._arcRing.position.copy(cue.points.at(-1));this._arcRing.position.y+=.15;
        this._arcDots.forEach((dot,i)=>{dot.visible=true;dot.position.copy(cue.points[Math.round(i*(cue.points.length-1)/(this._arcDots.length-1))]);dot.position.y+=.3;dot.material.color.set('#ffd24a');dot.material.opacity=.75;});
        this.hud?.throwReach?.(`LEAP ${Math.round(cue.fraction*100)}% · ${Math.round(cue.cost)} ENERGY · RELEASE SPACE`);return;
      }
    }
    if(this._leapCue){this._leapCue=null;this.hud?.throwReach?.('');}
    if(p?._personCarry?.friendly){arc.visible=false;this.hud?.throwReach?.('TEAMMATE · E RELEASE');this._carryCueShown=true;return;}
    if(p?.alive&&this.running&&!this.matchOver&&isTransportingPerson(p)){
      if(!this._personCue||this._personCueOwner!==p.grabbing||this.time-this._personCueAt>.05){this._personCue=previewPersonThrow(p,this);this._personCueOwner=p.grabbing;this._personCueAt=this.time;}
      const cue=this._personCue;arc.visible=!!cue;this._arcRing.visible=!!cue?.contact;
      if(cue){
        const last=cue.points.at(-1);this._arcRing.position.copy(last);this._arcRing.position.y+=.15;
        this._arcRing.material.color.set('#ffd24a');
        for(let i=0;i<this._arcDots.length;i++){
          const d=this._arcDots[i];d.visible=cue.points.length>1;d.position.copy(cue.points[Math.round(i*(cue.points.length-1)/(this._arcDots.length-1))]);
          d.position.y+=.25;d.material.opacity=.75*(1-i/this._arcDots.length*.5);d.material.color.set('#ffd24a');
        }
        this.hud?.throwReach?.(cue.reason);
      }
      this._carryCueShown=true;return;
    }
    this._personCue=null;this._personCueOwner=null;
    if(this._carryCueShown){this._carryCueShown=false;this.hud?.throwReach?.('');}
    if(p?.alive&&p._carry&&this.running&&!this.matchOver){
      if(!this._propCue||this._propCueOwner!==p._carry||this.time-this._propCueAt>.08){this._propCue=previewPropThrow(p,this);this._propCueOwner=p._carry;this._propCueAt=this.time;}
      const cue=this._propCue;arc.visible=true;this._arcRing.visible=!!cue.contact;this._arcRing.position.copy(cue.points.at(-1));
      this._arcDots.forEach((dot,i)=>{dot.visible=true;dot.position.copy(cue.points[Math.round(i*(cue.points.length-1)/(this._arcDots.length-1))]);dot.material.opacity=.7*(1-.6*i/this._arcDots.length);dot.material.color.set('#ffd24a');});return;
    }
    this._propCue=null;this._propCueOwner=null;
    // A grenade in the inventory is not an aiming gesture. Hide this legacy
    // predictive aid in third person; thrown props/clinch retain deliberate aim.
    if(p?._openSky&&!p._carry&&!(p.grabState==='clinch'&&p.grabbing)){
      arc.visible=false;
      if(this._arcOut){this._arcOut=false;this.hud?.throwReach?.('');}
      return;
    }
    let def = null;
    if (p && p.alive && this.mode && this.running && !this.matchOver) {
      for (const k of SLOT_KEYS) {                       // the first READY lobbed weapon they carry
        const s = p.slots[k]; if (!s) continue;
        const d = s.def;
        if ((d.type === 'projectile' && d.grav > 0) && s.cd <= 0 && p.ki >= (d.cost || 0)) { def = d; break; }
      }
      if (!def && p._carry) def = { _prop: true };       // carrying a car/tree = also a throw
      if (!def && p.grabState === 'clinch' && p.grabbing) def = { _body: true };   // clinch = aiming a PERSON (manual §11)
    }
    if (!def) { if (arc.visible) arc.visible = false; return; }
    arc.visible = true;
    // launch state: muzzle + the same velocity the ability would use
    const spd = def._body ? (((p.grabMode === 'back' ? 60 : 48) + (p.def.strength ?? 5) * 4.6)
        * (p.grabbing ? Math.max(0.45, Math.min(1.2, 0.75 + 0.15 * Math.log2(liftCapacityOf(p.def) / Math.max(0.05, bodyWeight(p.grabbing.def))))) : 1))
      : def._prop ? ((p._carry && p._carry.spd) || 74) : (def.speed || 58);   // the preview promises what the throw delivers (manual §21)
    const grav = (def._prop || def._body) ? 62 : (def.grav || 11) * 6;   // bodies and props fall at world gravity
    const m = def._body ? _v.set(p.pos.x + p.aim.x * 4.4, p.pos.y + 5.2, p.pos.z + p.aim.z * 4.4).clone()
      : p.muzzle(_v.clone(), 4, 6.4);
    const dir = p.aim3;
    const loft = def._body ? 0.22 : 0.34;   // bodies fly flatter than lobbed props — preview matches _throw exactly
    let vx = dir.x * spd, vy = (dir.y + loft) * spd, vz = dir.z * spd;   // thrown things get lofted
    let x = m.x, y = m.y, z = m.z, land = null;
    const step = 0.055;
    for (let i = 0; i < this._arcDots.length; i++) {
      const d = this._arcDots[i];
      x += vx * step; y += vy * step; z += vz * step; vy -= grav * step;
      if (y <= 0.4 && !land) { land = { x, z }; y = 0.4; }
      d.position.set(x, y, z);
      d.visible = !land || i < 2;
      d.material.opacity = 0.62 * (1 - i / this._arcDots.length);
      if (land) d.visible = false;
    }
    if (land) { this._arcRing.visible = true; this._arcRing.position.set(land.x, 0.3, land.z); }
    else this._arcRing.visible = false;
    // ---- THE HONEST LIMIT (altitude plan 2) ------------------------------------------------
    // A gravity throw CANNOT reach the BUILDING deck: a grenade peaks near 25u, a thrown car
    // near 44u, and the deck is at 96. The plan is explicit — do NOT inflate gravity to "fix"
    // this. Make it the rule, and SAY it: if the target you are aiming at is above the arc's
    // apex, the preview turns red and the ring reads OUT OF REACH. The answer to a cloud
    // camper is a beam, a homing shot, or climbing to meet them.
    const apex = m.y + ((dir.y + loft) * spd) ** 2 / (2 * grav);
    const lock = this.hardLock || this._lastLock;
    const outOfReach = !!(lock && lock.alive && lock.pos.y > apex + 4);
    if (this._arcOut !== outOfReach) {
      this._arcOut = outOfReach;
      if (this.hud) this.hud.throwReach(outOfReach ? 'OUT OF REACH' : '');
    }
    const col = outOfReach ? '#ff5a4a' : (p._carry || p.grabState === 'clinch') ? '#ff8a3a' : '#ffd24a';
    if (this._arcCol !== col) { this._arcCol = col; for (const d of this._arcDots) d.material.color.set(col); this._arcRing.material.color.set(col); }
  }

  // ⚠ REVIEW ITEM 6 — SIM → UI ROUTING. The Fighter used to call `_game.hud.feed(...)`,
  // `_game.hud.damageNumber(...)` and friends directly at seventeen sites, which meant the
  // SIMULATION knew the HUD's exact method surface: rename a HUD method and the sim breaks,
  // and a headless run needs a fake HUD shaped like the real one. One channel instead. If
  // nothing is listening, the sim simply carries on.
  ui(event, ...args) {
    const h = this.hud;
    if (!h || typeof h[event] !== 'function') return;
    try { return h[event](...args); } catch (e) { console.error('ui:' + event, e); }
  }

  // ROADMAP 18 · CAMERA DRAMA — THE KO CAM. A knockout used to be a banner and a slow-mo.
  // Now the camera swings a short orbit around the body while the ragdoll settles, then hands
  // control back. Purely presentational, and it never fights the map tool or a cinematic.
  startKoCam(victim, dur = 1.2) {
    if (!victim || this._koCam) return;
    // A living third-person player still owns aiming and sustained attacks.
    // Enemy KOs belong in the news/replay view, not a map-camera takeover that
    // releases pointer lock and retires the player's held input mid-fight.
    if (combatView(this)==='bfp') return;
    if (this.mapCam && !this._koCam) return;                 // a cinematic or the map tool owns the camera
    if (!this.isHuman(victim) && !this.isHuman(victim.lastHitBy)) return;   // only OUR knockouts
    this._koCam = { t: dur, dur, at: victim.pos.clone(), a0: this.world.orbitAngle || 0 };
  }
  updateKoCam(dt) {
    const K = this._koCam; if (!K) return;
    K.t -= dt;
    const k = 1 - K.t / K.dur;
    this.mapCam = { x: K.at.x, z: K.at.z, yaw: K.a0 + k * 1.1, pitch: 0.86, zoom: 62 + k * 16 };
    if (K.t <= 0) { this._koCam = null; this.mapCam = null; }
  }

  // ROADMAP 12 · FIRES THAT SPREAD. A burning thing lights what is next to it — grass, trees,
  // cars — so one explosion in the wrong street becomes a problem that grows. Capped, and it
  // burns out on its own; this is drama, not a simulation of combustion.
  ignite(x, z, r = 8, src = null) {
    (this._fires = this._fires || []).push({ x, z, r, t: 6 + Math.random() * 4, spread: 2.2, src });
    this.vfx.scorch && this.vfx.scorch({ x, y: 0.2, z }, r * 0.5, '#1a0d06');
  }
  updateFires(dt) {
    const F = this._fires; if (!F || !F.length) return;
    for (let i = F.length - 1; i >= 0; i--) {
      const f = F[i]; f.t -= dt;
      if (Math.random() < dt * 30) this.particles.spawn({ x: f.x + (Math.random() * 2 - 1) * f.r, y: 0.5, z: f.z + (Math.random() * 2 - 1) * f.r,
        vx: 0, vy: 6 + Math.random() * 6, vz: 0, life: 0.55, size: 2.6, color: ['#ff7a2a', '#ffd24a', '#8a3d05'], drag: 0.9 });
      // it burns what stands in it
      for (const e of this.entities) {
        if (!e.alive || e.isDummy) continue;
        const dx = e.pos.x - f.x, dz = e.pos.z - f.z;
        if (dx * dx + dz * dz > f.r * f.r || e.pos.y > 8) continue;
        if (Math.random() < dt * 1.6) e.addDot({ dps: 5, dur: 2, color: '#ff7a2a', kind: 'burn', src: f.src });
      }
      // and it SPREADS to nearby fuel, once, with a hard cap so a city never fully ignites
      f.spread -= dt;
      if (f.spread <= 0 && F.length < 14) {
        f.spread = 2.6;
        for (const car of this.world.cars || []) {
          if (car.dead || car._burning) continue;
          const dx = car.x - f.x, dz = car.z - f.z;
          if (dx * dx + dz * dz > (f.r + 14) ** 2) continue;
          car._burning = true;
          this.ignite(car.x, car.z, 7, f.src);
          break;
        }
      }
      if (f.t <= 0) F.splice(i, 1);
    }
  }

  // BACKLOG · RING-OUT RULES (DBZ rules): leaving the arena is a loss, not a slap on the wrist.
  // A mode opts in with `o.ringOut`, so nothing changes for the modes that do not.
  checkRingOut(dt) {
    if (!this.ms || !this.ms.ringOut) return;
    const A = this.world.ARENA - 2, floor = this.ms.ringOutFloor ?? -40;
    for (const e of this.entities) {
      if (!e.alive || e.isDummy) continue;
      const out = Math.abs(e.pos.x) > A || Math.abs(e.pos.z) > A || e.pos.y < floor;
      if (!out) { e._ringT = 0; continue; }
      e._ringT = (e._ringT || 0) + dt;
      if (e._ringT > 0.35) {
        e._ringT = 0;
        if (this.hud) this.hud.announce('RING OUT', e.name + ' left the arena', '#ff5a4a');
        e.lastHitBy = e.lastHitBy || null;
        e.hp = 0; e._ko && e._ko(this);
      }
    }
  }

  // BACKLOG · SPECTATE — watch a fight you are not in. The camera follows a chosen fighter and
  // the player's own input is ignored; TAB cycles who you are watching.
  spectate(on, who = null) {
    this._spectate = on ? { target: who || this.entities.find(e => e.alive && e !== this.player) } : null;
    if (this.hud) this.hud.feed(on ? 'SPECTATING — TAB cycles, ESC exits' : 'Spectator off', '#7fe6ff');
    return !!this._spectate;
  }
  cycleSpectate() {
    if (!this._spectate) return;
    const live = this.entities.filter(e => e.alive);
    if (!live.length) return;
    const i = live.indexOf(this._spectate.target);
    this._spectate.target = live[(i + 1) % live.length];
    if (this.hud) this.hud.feed('Watching ' + this._spectate.target.name, '#7fe6ff');
  }
  updateSpectate() {
    const S = this._spectate; if (!S || !S.target || !S.target.alive) return;
    this.mapCam = { x: S.target.pos.x, z: S.target.pos.z, yaw: this.world.orbitAngle || 0, pitch: 0.9, zoom: 78 };
  }

  // ---------- 3a · THE INTERACTABLE CONTRACT (altitude plan 3) ----------
  // Nothing in this engine could be TALKED TO or USED — no prompt, no focus target, no
  // registration list. This is that list. Anything can register: a city tile, a quest giver,
  // a door, a piece of hardware. Focus is scored by distance AND FACING, because you interact
  // with what you are looking at.
  registerInteractable(o) {
    const h = {
      id: o.id || ('i' + (this._iSeq = (this._iSeq || 0) + 1)),
      pos: o.pos, r: o.r ?? 9, band: o.band ?? 0, label: o.label || 'USE',
      verb: o.verb || 'INTERACT', priority: o.priority || 0,
      enabled: o.enabled || (() => true), onFocus: o.onFocus || null, onUse: o.onUse || null,
      cityOwned: !!o.cityOwned, dead: false, requiresFacing: o.requiresFacing !== false,
    };
    (this.interactables = this.interactables || []).push(h);
    return h;
  }
  unregisterInteractable(h) {
    const L = this.interactables; if (!L || !h) return;
    const i = L.indexOf(h); if (i >= 0) L.splice(i, 1);
  }
  // ⚠ THE TEARDOWN TRAP: anything a city tile registered must go when the city does, or a
  // rebuilt map inherits ghost prompts pointing at deleted geometry.
  clearCityInteractables() {
    if (!this.interactables) return;
    this.interactables = this.interactables.filter(h => !h.cityOwned);
  }
  updateInteractFocus(dt) {
    this._ifT = (this._ifT || 0) - dt;
    if (this._ifT > 0) return;
    this._ifT = 0.1;                                   // ~10 Hz is plenty for a prompt
    const p = this.player;
    const L = this.interactables;
    if (!p || !p.alive || !L || !L.length || !this.running) { this._focus = null; return; }
    let best = null, bs = -1e9;
    for (const h of L) {
      if (h.dead || !h.enabled(p)) continue;
      const dx = h.pos.x - p.pos.x, dz = h.pos.z - p.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > h.r) continue;
      // In the shoulder view, interact with what the camera faces. A nearby
      // wall can put the weapon's convergence point behind the actor.
      const viewFacing=combatLookActive(this)&&this.world._lookActive;
      const ax=viewFacing?Math.sin(this.world._lookYaw):p.aim.x,az=viewFacing?Math.cos(this.world._lookYaw):p.aim.z;
      const facing = d < 0.001 ? 1 : (dx / d) * ax + (dz / d) * az;
      if (h.requiresFacing !== false && facing < 0.1) continue;
      const score = h.priority * 10 + facing * 6 - d * 0.25;
      if (score > bs) { bs = score; best = h; }
    }
    if (best !== this._focus) {
      this._focus = best;
      if (best && best.onFocus) best.onFocus(p);
    }
    if (this.hud && this.hud.interactPrompt) this.hud.interactPrompt(best ? best : null, p);
  }
  // THE G-CHAIN, in priority order. Four behaviours on one key is only acceptable because the
  // prompt says which one is armed — so the prompt is not optional, it is part of the feature.
  interactVerb(f) {
    if (f.grabState === 'clinch' && f.grabbing) return 'hurl';
    if (this._focus && this._focus.enabled(f)) return 'interact';
    if (f._carry) return 'throw';
    if (this.propInReach(f)) return 'hoist';
    return 'grab';
  }
  doInteract(f) {
    const h = this._focus;
    if (!h || !h.enabled(f)) return false;
    if (h.onUse) h.onUse(f, this);
    return true;
  }

  // ---------- CARRY & THROW: the city is ammunition ----------
  // Cars, street trees and lightpoles can be torn up and hurled. Strength gates what you can
  // lift (a car needs real muscle), and the thrown prop hurts whatever it lands on.
  propInReach(f) {
    // THE WEIGHT LADDER (manual §21): capacity — not a hard-coded STR gate — decides what your
    // hands can take. The nearest thing you CAN'T lift is remembered so the feed can say why.
    const R = 22, cap = liftCapacityOf(f.def);
    let best = null, bd = R * R;
    f._tooHeavyProp = null;
    const consider = (d, rec) => {
      if (d >= bd) return;
      if (cap >= rec.w) { bd = d; best = rec; }
      else if (!f._tooHeavyProp || d < f._tooHeavyProp._d) f._tooHeavyProp = { kind: rec.kind, w: rec.w, _d: d };
    };
    for (const car of this.world.cars || []) {
      if (car.dead || car.carried) continue;
      const dx = car.x - f.pos.x, dz = car.z - f.pos.z;
      consider(dx * dx + dz * dz, { kind: 'car', ref: car, x: car.x, z: car.z, w: PROP_WEIGHT.car });
    }
    for (const pl of this.world.planes || []) {                     // 24 tons of airliner
      if (pl.dead || pl.carried) continue;
      const dx = pl.x - f.pos.x, dz = pl.z - f.pos.z;
      consider(dx * dx + dz * dz, { kind: 'plane', ref: pl, x: pl.x, z: pl.z, w: PROP_WEIGHT.plane });
    }
    // Loose stone. ⚠ A ROCK IS THE ONE PROP WITH NO FIXED SIZE, so it is the one that carries its
    // OWN tonnage — `rk.w` if the builder authored one, else the city's 0.5t constant. A car is a
    // car and a plane is a plane; a rock is a shard or a monolith, and the whole reason the weight
    // ladder exists is so that difference is a decision about who can pick it up. Every city rock
    // has no `w`, so this line is provably the old behaviour there. (The taxonomy's `object-mass`
    // node called PROP_WEIGHT "a constant per prop kind, not a per-object field" — for rocks now it is.)
    for (const rk of this.world.rocks || []) {
      if (rk.dead || rk.carried) continue;
      const dx = rk.x - f.pos.x, dz = rk.z - f.pos.z;
      consider(dx * dx + dz * dz, { kind: 'rock', ref: rk, x: rk.x, z: rk.z, w: rk.w || PROP_WEIGHT.rock });
    }
    for(const tree of this.world.treeSpots||[]){if(!tree.createCarry||tree.dead||tree.carried)continue;const dx=tree.x-f.pos.x,dz=tree.z-f.pos.z;consider(dx*dx+dz*dz,{kind:'tree',ref:tree,x:tree.x,z:tree.z,w:PROP_WEIGHT.tree});}
    const G = this.world.grass;                                     // street trees (instanced)
    if (G?.visible && this.world._gPos) for (let i = 0; i < G.count; i++) {
      if (!this.world._gOn[i]) continue;
      const gx = this.world._gPos[i * 2], gz = this.world._gPos[i * 2 + 1];
      const dx = gx - f.pos.x, dz = gz - f.pos.z;
      consider(dx * dx + dz * dz, { kind: 'tree', idx: i, x: gx, z: gz, w: PROP_WEIGHT.tree });
    }
    return best;
  }
  grabProp(f) {
    if (f._carry || f.grabbing || f.grabbedBy) return false;
    const t = this.propInReach(f);
    if (!t) {
      const th = f._tooHeavyProp;
      if (th && this.isHuman(f) && this.hud) this.hud.feed(`TOO HEAVY — the ${th.kind} is ~${th.w}t; you lift ~${liftCapacityOf(f.def).toFixed(1)}t`, '#8b8577');
      return false;
    }
    const cap = liftCapacityOf(f.def), ratio = cap / t.w;
    let mesh = null;
    if (t.kind === 'car') {
      t.ref.carried = true; t.ref.mesh.visible = false;
      mesh = new THREE.Mesh(this.world._carGeo, t.ref.paint);
    } else if (t.kind === 'rock') {
      t.ref.carried = true; t.ref.mesh.visible = false;
      // the silhouette is the tonnage: a shard you palm and a monolith that hides your whole body
      // have to look different or the weight ladder is invisible. 2.8 = the city stone, unchanged.
      const rs = t.ref.s || 2.8;
      mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(rs, 0), new THREE.MeshStandardMaterial({ color: t.ref.color || '#8d8577', roughness: 0.95, flatShading: true }));
    } else if (t.kind === 'plane') {
      t.ref.carried = true; for (const m of t.ref.meshes) m.visible = false;
      const fus = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 2.5, 38, 8), new THREE.MeshStandardMaterial({ color: '#dfe3e6', roughness: 0.4, metalness: 0.35 }));
      fus.rotation.z = Math.PI / 2;
      const wing = new THREE.Mesh(new THREE.BoxGeometry(4, 0.9, 36), new THREE.MeshStandardMaterial({ color: '#c9ced4', roughness: 0.5, metalness: 0.3 }));
      mesh = new THREE.Group(); mesh.add(fus, wing);
    } else if(t.kind==='tree'&&t.ref?.createCarry){mesh=t.ref.createCarry();
    } else {
      this.world.flattenGrass(t.x, t.z, 0.5);                        // pull it out of the ground
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.5, 14, 6), new THREE.MeshStandardMaterial({ color: '#5a4630', roughness: 0.9, flatShading: true }));
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(9.5, 0), new THREE.MeshStandardMaterial({ color: '#4a6a3a', roughness: 0.9, flatShading: true }));
      crown.position.y = 12; mesh = new THREE.Group(); mesh.add(trunk, crown);
    }
    mesh.castShadow = true; this.scene.add(mesh);
    // the hurl the arc will preview — computed ONCE here so the preview can never lie
    const spd = 74 * Math.max(0.5, Math.min(1.25, 0.5 + 0.16 * Math.log2(Math.max(0.6, ratio))));
    f._carry = { kind: t.kind, mesh, sourceRef:t.ref, t: 0, w: t.w, spd, ratio, size: t.ref && t.ref.s };
    f.speed = (f.def.speed || 30) * Math.max(0.42, Math.min(0.93, 1 - 0.45 / Math.max(0.9, ratio)));   // weight on your back is speed off your feet
    this.audio.impact(t.kind === 'plane' ? 1.1 : 0.7, f.pos); this.world.shake(t.kind === 'plane' ? 1.1 : 0.5);
    if (this.isHuman(f) && this.hud) this.hud.feed(`Hoisted a ${t.kind} (~${t.w}t) — hold E, aim, then release to THROW`, '#ff8a3a');
    return true;
  }
  throwProp(f,drop=false) {
    const c = f._carry; if (!c) return;
    f._carry = null; f.speed = f.def.speed || 30;
    const spd = drop?0:(c.spd || 74), dir = f.aim3;
    const vel = new THREE.Vector3(dir.x * spd, (dir.y + 0.34) * spd, dir.z * spd);
    const pos = f.muzzle(new THREE.Vector3(), 5, 6.4);
    const mesh = c.mesh; mesh.position.copy(pos);
    const str = f.strength ?? 5;
    // A ROCK'S BITE IS ITS TONNAGE. Every other prop has one size, so one number is honest for it;
    // a rock spans a hand shard to a monolith only three fighters can lift, and a flat 14 would make
    // the whole ladder cosmetic. Anchored on the city stone (0.5t → 14) and capped, so no boulder
    // one-shots. The `ratio` multiplier below still rewards throwing something light for you.
    const rockBase = Math.min(90, 14 * Math.pow(Math.max(0.05, c.w || 0.5) / 0.5, 0.45));
    const dmg = drop?0:((c.kind === 'plane' ? 60 : c.kind === 'car' ? 34 : c.kind === 'rock' ? rockBase : 22) + str * 3) * Math.min(1.6, 0.75 + 0.25 * Math.min(3, c.ratio || 1));
    let spin = rand(-5, 5), t = 0;
    // a car is 24u long and a tree is 20u tall — they need a hitbox to match, and a tall one:
    // `overlapFoe`'s ±9u vertical window let a lobbed car sail clean over someone's head.
    const R = c.kind === 'plane' ? 22 : c.kind === 'car' ? 13 : c.kind === 'rock' ? Math.max(7, (c.size || 2.8) * 2.1) : 10;
    const collisionShape=thrownPropShape(c);
    const previous=new THREE.Vector3();
    // ⚠ THE FLUNG RECORD IS WHAT MAKES IT SHOOTABLE. Robert: *"the other person could be throwing
    // little energy blasts at whatever you're throwing at them before it hit them."* Until now a
    // thrown prop was a CLOSURE inside a vfx entry — a mesh nothing else in the engine could see, so
    // there was nothing for a blast to hit. It is a record on `game._flung` now, with real hp off
    // the same weight ladder, and `hitFlung` is the one door into it.
    // ⚠ REGISTERED ONLY UNDER AN OPEN SKY. `_openSky` is the powerworld flag; in the city the array
    // stays empty, every reader early-outs on `.length`, and a thrown car behaves exactly as it did.
    const flung = f._openSky ? {
      x: pos.x, y: pos.y, z: pos.z, r: R * 0.62, kind: c.kind, w: c.w || 0.5,
      hp: 16 + (c.w || 0.5) * 20, by: f, team: f.team, sourceRef:c.sourceRef, dead: false, shot: false,
    } : null;
    if (flung) { if (!this._flung) this._flung = []; this._flung.push(flung); }
    this.audio.boom(0.4, f.pos); this.heroYell(f, 1.1);
    this.vfx._add({
      sourceRef:c.sourceRef, // authoring owner supports silent practice-session retirement

      update: (dt) => {
        t += dt; vel.y -= 62 * dt;
        previous.copy(mesh.position);
        mesh.position.addScaledVector(vel, dt);
        mesh.rotation.z += spin * dt; mesh.rotation.x += spin * 0.5 * dt;
        if (flung) { flung.x = mesh.position.x; flung.y = mesh.position.y; flung.z = mesh.position.z; }
        const contact=thrownPropContact(this,f,previous,mesh.position,collisionShape);
        if(contact)mesh.position.lerpVectors(previous,mesh.position,contact.t);
        const foe=contact?.kind==='fighter'?contact.target:null;
        const shot = !!(flung && flung.dead);
        if (contact || shot || t > 4) {
          const p = mesh.position.clone(); p.y = Math.max(0.4, p.y);
          // SHOT OUT OF THE AIR: it never reaches anybody. The blast still happens where it broke —
          // an intercept a body-length from your face is meant to be a bad intercept.
          if (foe && !shot) foe.takeDamage(dmg, { src: f, kb: vel.clone().setY(0).setLength(dmg * 0.7), launch: 14, hitstop: 0.12 });
          this.areaDamage(f, p, c.kind === 'plane' ? 22 : c.kind === 'car' ? 13 : 9, dmg * (shot ? 0.22 : 0.5), c.kind === 'plane' ? 2 : 1.5);
          if (c.kind === 'plane') { this.vfx.explode(p, { color: '#ff8a3d', color2: '#ffffff', radius: 22, power: 2.4 }); this.audio.boom(1.2, p); this.world.crater(p.x, p.z, 9, 1.6); this.world.punch(0.8); this.slowmo(0.15, 0.45); }
          else if (c.kind === 'car') { this.vfx.explode(p, { color: '#ff8a3d', color2: '#ffd24a', radius: 12, power: 1.6 }); this.audio.boom(0.6, p); }
          else { this.particles.burst(p.x, p.y, p.z, { count: 14, speed: 16, life: 0.6, size: 3, color: ['#5a4630', '#4a6a3a'], up: 6, grav: 12, drag: 1.4 }); this.audio.impact(1.1, p); }
          this.world.shake(1.3);
          if (flung) { flung.dead = true; const i = this._flung.indexOf(flung); if (i >= 0) this._flung.splice(i, 1); }
          return true;
        }
        return false;
      },
      dispose: () => { this.scene.remove(mesh); if (flung) { flung.dead = true; const i = (this._flung || []).indexOf(flung); if (i >= 0) this._flung.splice(i, 1); } },
    });
  }

  /**
   * SHOOT IT OUT OF THE AIR — the other half of "you could pick it up and throw it at them".
   *
   * ⚠ ONE DOOR, so a projectile, a beam and anything added later all break a flung car by the same
   * rule and the number can only be tuned in one place. It answers `null` for the thrower's own side:
   * blowing up your own throw is not a play, and letting splash from the thrower's second shot
   * detonate their first one would make throwing self-defeating.
   * ⚠ HP IS THE WEIGHT LADDER AGAIN — a shard is two blasts, a car is four, an airliner is not
   * getting shot down by anything hand-held. That is why it must not be a flat constant.
   *
   * @returns {object|null} the record that was hit (already marked dead if it broke).
   */
  // Optional segment support from PowerWorld: callers with a previous position
  // can sweep through a prop. Native projectile contacts already sweep before
  // reaching this helper; they and beam tips retain the point-query contract.
  hitFlung(src, pos, radius, amount, prev) {
    const list = this._flung;
    if (!list || !list.length || !src) return null;
    for (const fl of list) {
      if (fl.dead || fl.by === src) continue;
      if (fl.by && !this.isFoe(fl.by, src)) continue;         // only the side it was thrown AT may break it
      let px = pos.x, py = pos.y, pz = pos.z;
      if (prev) {                                             // closest point of the swept segment to the rock
        const sx = pos.x - prev.x, sy = pos.y - prev.y, sz = pos.z - prev.z;
        const ll = sx * sx + sy * sy + sz * sz;
        if (ll > 1e-8) {
          const t = Math.max(0, Math.min(1, ((fl.x - prev.x) * sx + (fl.y - prev.y) * sy + (fl.z - prev.z) * sz) / ll));
          px = prev.x + sx * t; py = prev.y + sy * t; pz = prev.z + sz * t;
        }
      }
      const dx = fl.x - px, dy = fl.y - py, dz = fl.z - pz;
      if (dx * dx + dy * dy + dz * dz > (fl.r + radius) * (fl.r + radius)) continue;
      fl.hp -= amount || 0;
      const at = new THREE.Vector3(fl.x, fl.y, fl.z);
      if (fl.hp <= 0) {
        fl.dead = true; fl.shot = true;
        this.vfx.impactStar(at, 12, '#ffd24a', 0.22);
        if (this.hud) this.hud.damageNumber(at, 'INTERCEPTED', '#ffd24a', true);
        if (this.isHuman(src) && this.hud) this.hud.feed(`INTERCEPTED — the ${fl.kind} broke up in the air`, '#ffd24a');
        // aaa-06 §8.2: shooting a thrown mass out of the air is a HEAVY beat and routes through no
        // fighter hit, so it fires the impact frame at the site that knows it is heavy.
        { const S = this._look || (this._look = SETTINGS); if (this.world.print && S.fxImpact !== false) this.world.print.impactFrame(1, 1); }
      } else {
        this.vfx.impactStar(at, 6, '#ffd24a', 0.14);
        this.particles.burst(fl.x, fl.y, fl.z, { count: 6, speed: 13, life: 0.35, size: 2, color: ['#cfc8b8', '#8b8577'], drag: 2 });
      }
      return fl;
    }
    return null;
  }
  /** The nearest flung prop inbound at `f` — what the AI reacts to, and what the HUD could warn on. */
  incomingFlung(f) {
    const list = this._flung;
    if (!list || !list.length) return null;
    for (const fl of list) {
      if (fl.dead || fl.by === f || (fl.by && !this.isFoe(fl.by, f))) continue;
      const dx = f.pos.x - fl.x, dy = (f.pos.y + 5) - fl.y, dz = f.pos.z - fl.z;
      const D = Math.hypot(dx, dy, dz);
      if (D > 140 || D < 4) continue;
      return fl;
    }
    return null;
  }
  // THE AIMED THROW's highest expression (manual §11): a hurled BODY that passes through another
  // fighter hits them too — both take damage, both are launched, both credited to the thrower.
  // A raised guard BRACES against the incoming body instead (blocked = no launch).
  updateThrownBodies(dt) {
    for (const v of this.entities) {
      if (!(v._thrownT > 0)) continue;
      v._thrownT -= dt;
      if (v._thrownT <= 0 || !v.alive) { v._thrownBy = null;v._personThrow=null; continue; }
      const spd = Math.hypot(v.vel.x, v.vel.y, v.vel.z);
      if (spd < 24) continue;
      const by = v._thrownBy;
      v._thrownHit = v._thrownHit || new Set();
      for (const e of this.entities) {
        if (e === v || e === by || !e.alive || v._thrownHit.has(e.id)) continue;
        if (by && !this.isFoe(by, e)) continue;              // you bowl at the OTHER side
        const dx = e.pos.x - v.pos.x, dz = e.pos.z - v.pos.z;
        if (Math.hypot(dx, dz) > e.radius + v.radius + 1.4 || Math.abs(e.pos.y - v.pos.y) > 9) continue;
        v._thrownHit.add(e.id);
        const hit = Math.min(30, 8 + spd * 0.22);
        const kx = v.vel.x / (spd || 1), kz = v.vel.z / (spd || 1);
        e.takeDamage(hit, { src: by || v, slam: true, hitstop: 0.1, kb: { x: kx * spd * 0.55, y: 6, z: kz * spd * 0.55 }, launch: 10 });
        if (!(e._blocked > 0)) e.launchT = Math.max(e.launchT, 1.0);   // struck clean → they chain into walls too
        v.takeDamage(hit * 0.6, { src: by || v, slam: true, unblockable: true, hitstop: 0.1 });
        v.vel.multiplyScalar(0.55);
        const imp = e.pos.clone().setY(e.pos.y + 5.6);
        this.vfx.impactStar(imp, 10, '#ffffff', 0.2);
        this.vfx.ring(imp, { color: '#ff8a3a', r0: 1, r1: 10, life: 0.3 });
        this.world.shake(1.3); this.audio.impact(1.25, imp); this.audio.boom(0.4, imp);
        if (this.hud) this.hud.damageNumber(e.pos, 'BOWLED ' + Math.round(hit), '#ff8a3a', false);
        this.noise(imp, 1.1, by || v);
      }
    }
  }

  // BLIND SMOKE (manual §14): a dense, oily cloud. Anyone inside keeps a short blind refresh —
  // step out and your eyes clear in about half a second. The zone is the delivery; the STATUS
  // does the work (bots lose sight via ai.js, humans lose the lock and the aim magnet here).
  // GROUND SPIKES (brief T2.8): a cone that RAISES cover. The spikes are real collision —
  // registered like any other cover so physics, LOS, fog and projectiles all see them — but
  // they are TEMPORARY, and they are made of whatever the ground here is (asphalt gives broken
  // road, dirt gives stone). They sweep themselves up on expiry.
  raiseSpike(x, z, cfg = {}, src = null) {
    const w = this.world;
    const gy = w.heightAt ? w.heightAt(x, z) : 0;
    const h = cfg.h || 11, r = cfg.r || 2.6;
    const rural = !!(w.plan && w.plan.rural);
    const mat = new THREE.MeshStandardMaterial({ color: rural ? '#6b5f4a' : '#3a3b40', roughness: 0.95, flatShading: true });
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5), mat);
    m.position.set(x, gy - h, z); m.castShadow = true; m.rotation.y = Math.random() * 6.28;
    this.scene.add(m);
    const co = { mesh: m, crack: null, x, z, r, hx: r, hz: r, top: gy + h * 0.5, h: gy + h,
                 hp: cfg.hp || 40, maxHp: cfg.hp || 40, y0: gy + h * 0.5 - h / 2, w: r * 2, d: r * 2,
                 destroyed: false, _spike: true, _t: cfg.dur || 6, _rise: 0, _gy: gy, _h: h };
    w.cover.push(co); w.coverAll.push(co);
    (this._spikes = this._spikes || []).push(co);
    this.particles.burst(x, gy + 0.5, z, { count: 8, speed: 9, life: 0.5, size: 2.2, color: rural ? ['#6b5f4a', '#8a7a5a'] : ['#3a3b40', '#6a6f7a'], up: 7, drag: 1.2 });
    this.audio.impact(0.5, { x, y: gy, z });
    if (w.refreshFogBoxes) w.refreshFogBoxes();
    return co;
  }
  updateSpikes(dt) {
    const S = this._spikes; if (!S || !S.length) return;
    const w = this.world;
    for (let i = S.length - 1; i >= 0; i--) {
      const co = S[i];
      if (co._rise < 1) {                                  // they COME UP, sequentially — not popped
        co._rise = Math.min(1, co._rise + dt * 5);
        co.mesh.position.y = co._gy - co._h + co._rise * (co._h * 1.5);
      }
      co._t -= dt;
      if (co._t <= 0 || co.destroyed) {
        this.scene.remove(co.mesh);
        if (co.mesh.geometry) co.mesh.geometry.dispose();
        if (co.mesh.material) co.mesh.material.dispose();
        const a = w.cover.indexOf(co); if (a >= 0) w.cover.splice(a, 1);
        const b = w.coverAll.indexOf(co); if (b >= 0) w.coverAll.splice(b, 1);
        S.splice(i, 1);
        if (w.refreshFogBoxes) w.refreshFogBoxes();
      }
    }
  }
  addSmoke(x, z, r, dur, src) {
    (this._smoke = this._smoke || []).push({ x, z, r, t: dur });
    this.particles.burst(x, 3, z, { count: 26, speed: 13, life: 1.3, size: 6, color: ['#2a2d33', '#3a3f47', '#23262c'], up: 5, drag: 1.5 });
    this.audio.boom(0.28, { x, y: 2, z });
    this.noise({ x, y: 2, z }, 0.7, src || null);
  }
  // BLACK HOLE ROUND (brief T2.6). The DEBRIS moves before the bodies do — that is the whole
  // read: dust and smoke curve inward first, giving you the beat you need to leave. Then it
  // implodes; there is no outward blast, which is what separates it from every other bomb.
  addSingularity(pos, r, dur, pull, src, color) {
    (this._sing = this._sing || []).push({ x: pos.x, y: pos.y, z: pos.z, r, t: dur, dur, pull, src, color: color || '#1a1020' });
    this.audio.blast(120, 0.5, pos);
    this.vfx.ring(pos.clone(), { color: color || '#7fb0d0', r0: r, r1: 1, life: 0.5 });
  }
  updateSingularity(dt) {
    const S = this._sing; if (!S || !S.length) return;
    for (let i = S.length - 1; i >= 0; i--) {
      const s = S[i]; s.t -= dt;
      const p = { x: s.x, y: s.y, z: s.z };
      if (s.t <= 0) {
        // THE IMPLOSION — inward, never a fireball
        this.areaDamage(s.src, p, s.r * 0.55, 26, 1.2);
        this.vfx.flash(new THREE.Vector3(s.x, s.y, s.z), '#0b0510', s.r * 0.5, 0.22);
        this.vfx.ring(new THREE.Vector3(s.x, s.y, s.z), { color: '#9ab0d0', r0: s.r * 0.7, r1: 0.5, life: 0.35 });
        this.world.shake(1.1); this.audio.boom(0.7, p);
        S.splice(i, 1); continue;
      }
      // debris first
      for (let k = 0; k < 2; k++) {
        const a = Math.random() * Math.PI * 2, rr = s.r * (0.6 + Math.random() * 0.5);
        this.particles.spawn({ x: s.x + Math.cos(a) * rr, y: s.y + (Math.random() * 2 - 1) * 4, z: s.z + Math.sin(a) * rr,
          vx: -Math.cos(a) * rr * 1.6, vy: 0, vz: -Math.sin(a) * rr * 1.6, life: 0.5, size: 1.6 + Math.random() * 1.6,
          color: ['#6a6f7a', '#3a3f47', '#9ab0d0'], drag: 0.2 });
      }
      // then the bodies — a real pull, lifted past the walk clamp like every other shove
      for (const f of this.entities) {
        if (!f.alive || f.isDummy || f === s.src) continue;
        const dx = s.x - f.pos.x, dy = s.y - f.pos.y, dz = s.z - f.pos.z;
        const d = Math.hypot(dx, dy, dz); if (d > s.r || d < 0.001) continue;
        const k = (1 - d / s.r) * s.pull * dt * (1 - (f.def.strength ?? 5) * 0.05);
        f.vel.x += (dx / d) * k; f.vel.y += (dy / d) * k * 0.6; f.vel.z += (dz / d) * k;
        f.burstT = Math.max(f.burstT || 0, 0.12);
      }
    }
  }
  updateSmoke(dt) {
    const S = this._smoke; if (!S || !S.length) return;
    for (let i = S.length - 1; i >= 0; i--) {
      const s = S[i]; s.t -= dt;
      if (s.t <= 0) { S.splice(i, 1); continue; }
      if (Math.random() < dt * 30) this.particles.spawn({ x: s.x + (Math.random() * 2 - 1) * s.r * 0.8, y: 1 + Math.random() * 5.5, z: s.z + (Math.random() * 2 - 1) * s.r * 0.8, vx: (Math.random() * 2 - 1) * 2, vy: 1.4 + Math.random() * 2, vz: (Math.random() * 2 - 1) * 2, life: 1.5, size: 5 + Math.random() * 3.5, color: ['#2a2d33', '#3a3f47', '#23262c'], drag: 1.2 });
      for (const f of this.entities) {
        if (!f.alive || f.isDummy) continue;
        const dx = f.pos.x - s.x, dz = f.pos.z - s.z;
        if (dx * dx + dz * dz > s.r * s.r || f.pos.y > 16) continue;
        f.blindT = Math.max(f.blindT, 0.55);
      }
    }
  }

  // ---------- THE GEAR SYSTEM (manual §16): powers are what you ARE, gear is what you HOLD ----------
  _gearKind(ab) {
    const n = (ab.name || '').toLowerCase();
    if (ab.type === 'bow' || ab.type === 'quiver') return 'bow';
    if (/shotgun/.test(n)) return 'shotgun';
    if (/pistol|sidearm|smg/.test(n)) return 'pistol';
    if (ab.type === 'rifle') return 'rifle';
    if (/knife|dagger/.test(n)) return 'knife';
    if (/axe/.test(n)) return 'axe';
    if (/spear|trident/.test(n)) return 'spear';
    if (ab.dmgClass === 'slash' || /blade|sword/.test(n)) return 'sword';
    return 'rifle';
  }
  spawnGearDrop(ab, x, z) {
    const mats = { armor: new THREE.MeshStandardMaterial({ color: '#565c66', roughness: 0.45, metalness: 0.7 }) };
    const mesh = buildWeapon(this._gearKind(ab), mats);
    mesh.rotation.z = Math.PI / 2.2; mesh.rotation.y = Math.random() * Math.PI * 2;
    mesh.scale.setScalar(1.6);
    const gy = this.world.heightAt ? this.world.heightAt(x, z) : 0;
    mesh.position.set(x, gy + 0.8, z);
    this.scene.add(mesh);
    (this._drops = this._drops || []).push({ ab, mesh, x, z, t: 20, y0: gy + 0.8 });
  }
  // ⚠ ONE PUMP FOR EVERY FIGHTER'S PSYCHE. Decay, the pending instant action, and the tell —
  // in one place, so an emotion cannot be updated twice or forgotten by a code path added later.
  // ⚠ THE WORLD DRIVES THE WHEEL TOO, not just punches. Without this a fighter is emotionally inert
  // until someone hits them, which is the opposite of how people work — most of what you feel in a
  // fight comes from the SITUATION: being outnumbered, being hunted, losing, being watched, having
  // nothing to do. Appraised once a second per fighter, so it costs nothing and cannot spin.
  _ambientPsyche(e, t) {
    const P = e._psyche;
    if (!P) return;
    if (t - (P._ambT || -9) < 1) return;
    P._ambT = t;
    const near = (r) => this.entities.filter(o => o.alive && o.def && o !== e && !o.isDummy
      && Math.hypot(o.pos.x - e.pos.x, o.pos.z - e.pos.z) < r);
    const foes = near(90).filter(o => this.isFoe(e, o));
    const allies = near(90).filter(o => !this.isFoe(e, o));

    if (foes.length === 0) {
      // nothing to do is its own pressure — it is what makes a bored fighter go looking
      P.feel(allies.length ? 'idle' : 'alone', 1, t);
    } else if (foes.length - allies.length >= 2) {
      P.feel('outnumbered', Math.min(1.4, (foes.length - allies.length) * 0.5), t);
    }

    const hpF = e.hp / Math.max(1, e.maxHp);
    if (hpF < 0.3) P.feel('lowHealth', (0.3 - hpF) * 3, t);
    if (e._wounds && (e._wounds.arm || e._wounds.leg || e._wounds.torso)) P.feel('wounded', 0.35, t);

    // ⚠ THE FIGHT'S SCORE IS A DRIVER. Who is actually ahead — measured off the same stats the
    // report and the end screen use, so the feeling cannot disagree with the scoreboard.
    const st = this.stats && this.stats.get && this.stats.get(e);
    if (st) {
      const given = st.dmg || 0, taken = st.taken || 0;
      if (given > taken * 1.6 && given > 40) P.feel('winning', 0.5, t);
      else if (taken > given * 1.6 && taken > 40) P.feel('losing', 0.5, t);
    }

    // BEING HUNTED. The police ladder is already a real pressure in the world; it should be one
    // inside the fighter's head as well.
    if (this.police && this.police.heatOf) {
      const heat = this.police.heatOf(e) || 0;
      if (heat > 35) P.feel('hunted', Math.min(1.3, heat / 120), t);
    }

    // BEING WATCHED. Glory is only served if someone is there to see it — the crowd the
    // pedestrian layer already simulates.
    if (this.peds && this.peds.mood) {
      if (this.peds.mood === 'cheer') P.feel('crowdCheer', 0.6, t);
      else if (this.peds.mood === 'panic') P.feel('crowdFlees', 0.4, t);
    }

    // A NAME FROM THE BOOK. If someone here has beaten you before, that is personal — and the
    // record already knows, so nothing new has to be stored.
    if (!P._rivalChecked && foes.length) {
      P._rivalChecked = 1;
      try {
        const rec = this._recOf && this._recOf(e.def.id);
        const hist = rec && rec.hist;
        if (hist && foes.some(o => hist.some(h => h && h.foe === o.def.id && h.r === 'L'))) {
          P.feel('rivalHere', 1, t);
        }
      } catch (err) { /* the book is optional */ }
    }
  }

  updatePsyche(dt) {
    const t = this.time || 0;
    // ⚠ THE PLAYER GETS ONE UP FRONT. Everyone else grows a psyche the first time something happens
    // to them, but the HUD chip has to have something to show from the first frame of the match.
    if (this.player && !this.player._psyche) psycheOf(this.player);
    for (const e of this.entities) {
      if (!e.alive || !e._psyche) continue;
      const P = e._psyche;
      P.update(dt, t);
      this._ambientPsyche(e, t);
      if (P.pendingInstant) {
        const row = P.pendingInstant; P.pendingInstant = null;
        applyInstant(this, e, row);
        // ⚠ THE FEELING SPEAKS. This is the whole point of the layer Robert asked for: you can see
        // how a character feels because they SAY it, in a balloon whose shape matches the emotion.
        if (this.comic && row.text) {
          const tone = P.main === 'angry' ? 'yell' : P.main === 'fearful' ? 'weak'
            : P.main === 'sad' ? 'weak' : P.main === 'surprised' ? 'yell'
            : P.main === 'bad' ? 'whisper' : 'talk';
          const near = !this.player || (Math.abs(this.player.pos.x - e.pos.x) < 300 && Math.abs(this.player.pos.z - e.pos.z) < 300);
          if (near && t - (this._feelSpokeT || -9) > 1.6) {
            this._feelSpokeT = t;
            try { this.comic.say(e, row.text, { tone }); } catch (err) {}
          }
        }
      }
      // the ground ring already reports state; emotion tints it when nothing louder is happening
      if (e.parts && e.parts.stateRing && e.parts.stateRing.material && !e.guarding && !e.grabbing
          && !(e.staggerT > 0) && (e.meleeCharge || 0) <= 0) {
        e.parts.stateRing.material.color.set(P.colour);
        e.parts.stateRing.material.opacity = 0.18 + (P.value / 10) * 0.3;
      }
    }
  }

  updateDrops(dt) {
    const D = this._drops; if (!D || !D.length) return;
    for (let i = D.length - 1; i >= 0; i--) {
      const d = D[i]; d.t -= dt;
      d.mesh.rotation.y += dt * 0.9;
      d.mesh.position.y = d.y0 + Math.sin(this.time * 2.2 + i) * 0.25;
      if (d.t <= 0) {
        this.scene.remove(d.mesh);
        d.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
        D.splice(i, 1);
      }
    }
  }
  // G near a dropped weapon = take it into the CARRY HAND (never hides a kit slot; X fires it)
  pickupGear(f) {
    const D = this._drops; if (!D || !D.length) return false;
    let best = null, bd = 8 * 8;
    for (const d of D) {
      const q = (d.mesh.position.x - f.pos.x) ** 2 + (d.mesh.position.z - f.pos.z) ** 2;
      if (q < bd) { bd = q; best = d; }
    }
    if (!best) return false;
    if(!equipmentPolicy(f).personalWeapons){if(this.isHuman(f))this.hud?.feed(equipmentPolicy(f).weaponReason,'#ffd24a');return false;}
    if (f._gearHeld) this.dropGear(f, false);              // hands are a slot: swap, don't stack
    const prof = weaponProficiency(f.def);
    const ab = best.ab;
    const eff = { ...ab, gear: true,
      damage: ab.damage != null ? +(ab.damage * prof).toFixed(2) : ab.damage,
      dmgMin: ab.dmgMin != null ? +(ab.dmgMin * prof).toFixed(2) : ab.dmgMin,
      dmgMax: ab.dmgMax != null ? +(ab.dmgMax * prof).toFixed(2) : ab.dmgMax,
      spread: ab.spread != null ? +(ab.spread / prof).toFixed(4) : ab.spread };   // proficiency shows in the HANDS
    f._gearHeld = { ab: eff, base: ab, t: Infinity, prof };
    f.slots._gear = { def: eff, cd: 0, chargeT: 0, sustainT: 0 };
    firearmAmmo(f.slots._gear);
    const hand = buildWeapon(this._gearKind(ab), { armor: new THREE.MeshStandardMaterial({ color: '#565c66', roughness: 0.45, metalness: 0.7 }) });
    mountHeldWeapon(f,hand);
    this.scene.remove(best.mesh);
    best.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    this._drops.splice(this._drops.indexOf(best), 1);
    this.audio.impact(0.5, f.pos);
    if (this.isHuman(f) && this.hud) this.hud.feed(`SCAVENGED: ${ab.name} ×${prof.toFixed(2)} — X fires it`, '#ffd24a');
    return true;
  }
  /**
   * Put an ARMORY ROW in a fighter's hands directly, with no ground drop involved. Same shape, same
   * proficiency, same mesh as picking one up — extracted from the pickup path so the selector in
   * `engine/hands.js` cannot build a second, subtly different kind of "held".
   * ⚠ Proficiency shows in the HANDS, not in the weapon: the row is untouched and the EFFECTIVE
   * ability is what gets held. A soldier and a bruiser hold the same carbine differently.
   */
  equipFrom(f, row, {primary=false}={}) {
    if (!f || !row || !row.ab) return null;
    if(!equipmentPolicy(f).personalWeapons){if(this.isHuman(f))this.hud?.feed(equipmentPolicy(f).weaponReason,'#ffd24a');return null;}
    if (f._gearHeld) this.dropGear(f, false);
    const prof = weaponProficiency(f.def);
    const ab = row.ab;
    const eff = { ...ab, gear: true,
      damage: ab.damage != null ? +(ab.damage * prof).toFixed(2) : ab.damage,
      dmgMin: ab.dmgMin != null ? +(ab.dmgMin * prof).toFixed(2) : ab.dmgMin,
      dmgMax: ab.dmgMax != null ? +(ab.dmgMax * prof).toFixed(2) : ab.dmgMax,
      spread: ab.spread != null ? +(ab.spread / prof).toFixed(4) : ab.spread };
    // Issued and scavenged equipment share the same persistent lifetime.
    f._gearHeld = { ab: eff, base: ab, t: Infinity, prof, chosen: true, rowId: row.id, primary };
    f.slots._gear = { def: eff, cd: 0, chargeT: 0, sustainT: 0 };
    firearmAmmo(f.slots._gear);
    if(primary){
      f._loadoutPrimary=f.slots.lmb;f.slots.lmb=f.slots._gear;
      // Keep the held-emitter contract, but tick this shared slot only once.
      Object.defineProperty(f.slots,'_gear',{value:f.slots.lmb,writable:true,configurable:true,enumerable:false});
      f._selSlot='lmb';f._hand=3;
    }
    const hand = buildWeapon(row.mesh||this._gearKind(ab), { armor: new THREE.MeshStandardMaterial({ color: '#565c66', roughness: 0.45, metalness: 0.7 }) });
    mountHeldWeapon(f,hand);
    if(row.equipmentAsset){const gear=f._gearHeld;gear.equipmentReady=replaceHeldEquipment(f,row.equipmentAsset,gear,{loader:this._equipmentAssetLoader});}
    return eff;
  }

  dropGear(f, spawnDrop = true) {
    if (!f._gearHeld) return;
    if(f._firearmReload?.slot===f.slots._gear)cancelFirearmReload(f);
    if (spawnDrop) this.spawnGearDrop(f._gearHeld.base, f.pos.x + (Math.random() * 4 - 2), f.pos.z + (Math.random() * 4 - 2));
    disposeHeldEquipment(f,this);
    if(f._gearHeld.primary){f.slots.lmb=f._loadoutPrimary;delete f._loadoutPrimary;}
    delete f.slots._gear;
    f._gearHeld = null;
    // ⚠ THE SELECTOR IS AN INTENT, AND AN EMPTY HAND MUST NOT KEEP CLAIMING A WEAPON. This is the ONE
    // path out of holding something, so it is the one place that can honestly say "you are on your
    // fists now" — and without it `_hand` still read 3 while the hands were empty, which is worse
    // than cosmetic: `selectHand` returns early when you re-press the slot you are already on, so
    // pressing 3 after a disarm or a dry pickup did NOTHING, forever. Every caller that legitimately
    // re-arms (selectHand, equipFrom) sets `_hand` immediately after this returns.
    if (f._hand > 1) f._hand = 1;
  }
  drainGear(f, dt) {
    const H = f._gearHeld; if (!H) return;
    H.t -= dt;
    if (H.t <= 0) {
      this.dropGear(f, false);                             // dry — the leash: a pickup never becomes kit
      if (this.isHuman(f) && this.hud) this.hud.feed('DRY — tossed it', '#8b8577');
      this.audio.zap(160, f.pos);
    }
  }
  // A landed grab STRIPS the weapon: the held pickup hits the pavement, and the victim's own
  // gear-tagged kit slots go dead for the window (runSlot gate). Powers keep firing — you can
  // take the man's gun, never his fire.
  disarm(v, by) {
    let any = false;
    if (v._gearHeld) { this.dropGear(v, true); any = true; }
    if (Object.values(v.slots).some(s => s && s.def && s.def.gear)) { v._disarmT = 6; any = true; }
    if (any && this.hud) this.hud.damageNumber(v.pos, 'DISARMED', '#ffd24a', true);
    if (any) this.audio.zap(300, v.pos);
  }

  updateCarry(dt) {
    for (const f of this.entities) {
      const c = f._carry; if (!c) continue;
      if (!f.alive) { this.scene.remove(c.mesh); f._carry = null; f.speed = f.def.speed || 30; continue; }
      c.t += dt;
      const h = c.kind === 'plane' ? 17 : c.kind === 'car' ? 13 : c.kind === 'rock' ? 11.5 : 15;
      c.mesh.position.set(f.pos.x - f.aim.x * 1.5, f.pos.y + h + Math.sin(c.t * 3) * 0.3, f.pos.z - f.aim.z * 1.5);
      c.mesh.rotation.y = f.facing + Math.PI / 2;
      c.mesh.rotation.z = Math.sin(c.t * 2.2) * 0.05;
    }
  }

  _buildLockMark() {
    // HARD LOCK reads as a CROSSHAIR now (Robert 2026-07-24: "I almost want a crosshair and a
    // lock for when it's target locked") — ring + four ticks + centre dot, unmistakably a lock
    // rather than the gold soft-aim reticle.
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d');
    x.strokeStyle = '#ff3b3b'; x.lineWidth = 4.5;
    x.beginPath(); x.arc(32, 32, 19, 0, Math.PI * 2); x.stroke();
    x.lineWidth = 5; x.lineCap = 'round';
    for (const [x0, y0, x1, y1] of [[32, 2, 32, 13], [32, 51, 32, 62], [2, 32, 13, 32], [51, 32, 62, 32]]) {
      x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke();
    }
    x.fillStyle = '#fff'; x.beginPath(); x.arc(32, 32, 3.4, 0, Math.PI * 2); x.fill();
    x.strokeStyle = 'rgba(255,255,255,0.85)'; x.lineWidth = 1.6;
    x.beginPath(); x.arc(32, 32, 19, 0, Math.PI * 2); x.stroke();
    const tex = new THREE.CanvasTexture(cv);
    this.redTri = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
    this.redTri.scale.set(7, 7, 7); this.redTri.visible = false; this.scene.add(this.redTri);
  }

  updateReticle(dt) {
    // gold soft reticle = where the mouse is aiming (what your attacks will hit)
    const t = this.lockTarget;
    // ⚠ THE GOLD RETICLE IS A GROUND DECAL AND THE GROUND IS NOT WHERE THE FIGHT IS. It is drawn at
    // y = 0.35 under the soft target — legible in an isometric street fight, and in an air battle a
    // ring on the desert a few hundred units below the two people actually fighting. The screen-centre
    // crosshair in the HUD replaces it here, because a chase camera aims where it LOOKS.
    if (combatView(this)==='bfp'||this.mapCam) {
      this.reticle.visible = false;
      // HUD owns the aim point and its lock state. A second crosshair floating
      // above the head competes with the actual shot and blooms over the fighter.
      this.redTri.visible = false;
      return;
    }
    if (t && t.alive) {
      this.reticle.visible = true;
      this.reticle.position.set(t.pos.x, 0.35, t.pos.z);
      this._retRing.rotation.z += dt * 1.6; this._retRing2.rotation.z -= dt * 1.1;
      this._retChev.position.y = 13 + t.pos.y + Math.sin(this.time * 7) * 0.6;
      const c = t.def.colors.accent;
      this._retRing.material.color.set(c); this._retRing2.material.color.set(c); this._retChev.material.color.set(c);
    } else this.reticle.visible = false;
    // red triangle = the hard-locked target (who you face) — only while you can see them
    const h = this.hardLock;
    if (h && h.alive && (!this.fov || (h._vis ?? 1) > 0.35)) {
      this.redTri.visible = true;
      this.redTri.position.set(h.pos.x, h.pos.y + 15 + Math.sin(this.time * 5) * 0.7, h.pos.z);
    } else this.redTri.visible = false;
  }

  // ---------- field of vision ----------
  updateVision(dt) {
    const p = this.player;
    if (!p || !this.fov) { for (const e of this.entities) { e._vis = 1; if (e.obj) e.obj.visible = true; } this.world.setFogEnabled(false); return; }
    this.world.setFogEnabled(true);
    const h2 = this.humans[1] && this.humans[1].fighter;
    this.world.updateFog(p.pos.x, p.pos.z, p.aim.x, p.aim.z, p.def.colors.accent, (h2 && h2.alive) ? h2.pos : null);
    for (const e of this.entities) {
      if (e._banished) { e.obj.visible = false; continue; }   // BANISHED: they are not on this field at all
      if (e._inert) { e.obj.visible = false; continue; }      // POSSESSED AWAY: the body is left behind, not here
      if (this.isHuman(e) || e.team === p.team) { e._vis = 1; e.obj.visible = true; continue; }   // your own side is always visible (incl. AI partners)
      let see = this._humanSees(p, e) || (h2 && h2.alive && this._humanSees(h2, e));
      if (!see) { const d = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z); if (d < this.visReveal && this._bright(e)) see = true; }
      e._vis = damp(e._vis == null ? (see ? 1 : 0) : e._vis, see ? 1 : 0, 12, dt);
      if (see && !e._seen) this._revealFx(e);
      // ⚠ ONE GHOST PER FIGHTER, AND NOT EVERY FRAME. The trigger is edge-based (seen -> unseen),
      // which sounds like it fires once — but `see` is recomputed from line-of-sight every frame,
      // so a foe standing at the edge of a wall or the vision cone flickers, and EVERY flicker
      // used to spawn a full ghost: a new mesh and two new materials, and a second '?' sprite
      // stacked on top of the first. Measured 40 live ghosts in one 90-second fight once the
      // police turned up. The marker is meant to say "they were here" once, not pile up.
      if (!see && e._seen && this.time - (e._ghostT || -9) > 1.2) { e._ghostT = this.time; this._lastKnown(e); }
      e._seen = see;
      const show = e._vis > 0.35;
      if (e.obj.visible !== show) e.obj.visible = show;
    }
  }
  _humanSees(p, e) {
    if (p._revealT > 0) return true;                 // The Ring Sees — the network is her retina
    const vm = ((p.sheet && p.sheet.visMult) || 1) * (p.blindT > 0 ? 0.28 : 1);   // AWARENESS extends the eye — smoke closes it (manual §14)
    const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz) || 1;
    if (d < this.visNear * vm) return true;
    if (d < this.visRange * vm && ((dx / d) * p.aim.x + (dz / d) * p.aim.z) > this.visCos) return this.canSee(p, e);
    return false;
  }

  canSee(a, b) {
    for (const c of this.world.cover) {
      if(c.finiteBuilding){if(this.world.traceBox3(a.pos.x,a.pos.y+5,a.pos.z,b.pos.x,b.pos.y+5,b.pos.z,c)>=0)return false;continue;}
      if (Math.min(a.pos.y, b.pos.y) + 5 > (c.top ?? c.h)) continue;              // both above the block → seen over it
      if (this._segBox(a.pos.x, a.pos.z, b.pos.x, b.pos.z, c.x, c.z, (c.hx ?? c.r) + 1, (c.hz ?? c.r) + 1)) return false;
    }
    // interior walls block sight exactly like cover, but only the buildings the segment touches
    // pay anything — corner-peeking inside a bungalow rides the SAME honesty machinery as outside.
    // ⚠ _segBox detects boundary CROSSINGS only — a segment fully inside the footprint (both
    // fighters in the same house, the corner-warfare case) never crosses it, so the gate must
    // also pass when either endpoint is inside.
    for (const it of (this.world.interiors || [])) {
      if (Math.min(a.pos.y, b.pos.y) + 5 > it.top) continue;
      const aIn = Math.abs(a.pos.x - it.x) < it.hx + 1 && Math.abs(a.pos.z - it.z) < it.hz + 1;
      const bIn = Math.abs(b.pos.x - it.x) < it.hx + 1 && Math.abs(b.pos.z - it.z) < it.hz + 1;
      if (!aIn && !bIn && !this._segBox(a.pos.x, a.pos.z, b.pos.x, b.pos.z, it.x, it.z, it.hx + 1, it.hz + 1)) continue;
      for (const wl of it.walls)
        if (this._segBox(a.pos.x, a.pos.z, b.pos.x, b.pos.z, wl.x, wl.z, wl.hx + 0.4, wl.hz + 0.4)) return false;
    }
    return true;
  }
  _segBox(x0, z0, x1, z1, cx, cz, hx, hz) {
    const dx = x1 - x0, dz = z1 - z0; let tmin = 0, tmax = 1;
    if (Math.abs(dx) < 1e-5) { if (x0 < cx - hx || x0 > cx + hx) return false; }
    else { let t1 = (cx - hx - x0) / dx, t2 = (cx + hx - x0) / dx; if (t1 > t2) { const t = t1; t1 = t2; t2 = t; } tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2); if (tmin > tmax) return false; }
    if (Math.abs(dz) < 1e-5) { if (z0 < cz - hz || z0 > cz + hz) return false; }
    else { let t1 = (cz - hz - z0) / dz, t2 = (cz + hz - z0) / dz; if (t1 > t2) { const t = t1; t1 = t2; t2 = t; } tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2); if (tmin > tmax) return false; }
    return tmin > 0.03 && tmin < 0.985;
  }
  _bright(e) {
    if (e.state === 'charge') return true;
    for (const o of this.projectiles.list) if (o.caster === e && (o.sustaining || (o.radius || 0) > 3.5)) return true;
    return false;
  }
  _revealFx(e) { if ((e._vis || 0) > 0.85) return; this.vfx.ring(e.pos.clone().setY(0.5), { color: e.def.colors.accent, r0: 1, r1: 8, life: 0.35, flat: true, y: 0.5 }); }
  _qSprite() {
    if (!this._qTex) { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#ff3b3b'; x.font = 'bold 54px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('?', 32, 36); this._qTex = new THREE.CanvasTexture(c); }
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this._qTex, transparent: true, depthTest: false, depthWrite: false })); s.scale.set(5, 5, 5); return s;
  }
  _lastKnown(e) {
    const m = new THREE.Mesh(this._ghostGeo, new THREE.MeshBasicMaterial({ color: '#9aa', transparent: true, opacity: 0.34, depthWrite: false }));
    m.position.copy(e.pos); m.position.y += 5; m.rotation.y = e.facing; this.scene.add(m);
    const q = this._qSprite(); q.position.set(e.pos.x, e.pos.y + 13, e.pos.z); this.scene.add(q);
    let t = 0; const life = 2.6;
    this.vfx._add({ update: (dt) => { t += dt; const k = t / life; m.material.opacity = 0.34 * (1 - k); q.material.opacity = 1 - k * k; return k >= 1; }, dispose: () => { this.scene.remove(m); m.material.dispose(); this.scene.remove(q); q.material.dispose(); } });
  }

  // Target the character the cursor is OVER; else the foe nearest the cursor (aim-assist).
  pickTarget(p) {
    // ⚠ UNDER AN OPEN SKY THE MAGNET MEASURES FROM THE CROSSHAIR, NOT THE CURSOR (aaa-05 §3.1).
    // There is no pointer lock, so the mouse cursor is a stale, free-floating screen position the
    // player is not looking at — measuring aim from it silently dragged every shot to wherever it
    // happened to sit, while the crosshair stayed nailed to screen centre. Measuring from centre
    // also makes `_hoverPick` reachable: put the crosshair on a body, click, and you hard-lock it.
    // ⚠ In the iso city the cursor IS the aim and pickTarget is correct as written — this is a
    // branch on `_openSky`, not a replacement.
    const pw = p._openSky;
    const cx = pw ? innerWidth * 0.5 : this.input.mouse.clientX;
    const cy = pw ? innerHeight * 0.5 : this.input.mouse.clientY;
    let hover = null, hoverD = 1e9, near = null, nearD = 110;   // magnet radius trimmed (was 210 — grabbed aim from across the screen)
    const sp = this._sp, sp2 = this._sp2 || (this._sp2 = { x: 0, y: 0, behind: false });
    for (const f of this.entities) {
      if (!this.isFoe(p, f)) continue;
      if (this.fov && (f._vis || 0) < 0.4) continue;                        // can't target what you can't see
      this.world.screenPosOf(f.pos.x, f.pos.y + 5, f.pos.z, sp);
      if (sp.behind) continue;
      this.world.screenPosOf(f.pos.x, f.pos.y + 9.5, f.pos.z, sp2);
      const half = Math.max(28, Math.hypot(sp.x - sp2.x, sp.y - sp2.y) + 22); // on-screen body size
      const d = Math.hypot(sp.x - cx, sp.y - cy);
      if (d < half && d < hoverD) { hoverD = d; hover = f; }               // cursor is over this character
      // THE GROUND-COLUMN PASS (altitude plan 2): a flier is routinely off-frame while their
      // ground ring is still on screen. Clicking the RING locks the fighter above it — the
      // thing you can see is the thing you can click. No camera change, no new input.
      if (f.pos.y - (f.groundY || 0) > 14) {
        this.world.screenPosOf(f.pos.x, (f.groundY || 0) + 0.5, f.pos.z, sp2);
        if (!sp2.behind) {
          const gd = Math.hypot(sp2.x - cx, sp2.y - cy);
          if (gd < 34 && gd < hoverD) { hoverD = gd; hover = f; }
          if (gd < nearD) { nearD = gd; near = f; }
        }
      }
      let nd = d; if (f === this._lastLock) nd -= 40;                      // stickiness
      if (nd < nearD) { nearD = nd; near = f; }
    }
    this._hoverPick = hover;                                               // direct-hover only — hard-lock uses this
    const pick = SETTINGS.aimAssist === false ? hover : (hover || near);   // options can turn the magnet off
    this._lastLock = pick; return pick;
  }

  // Nearest foe within a cone of a world aim direction (gamepad right-stick).
  pickTargetDir(p, dx, dz) {
    const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
    let best = null, bestDot = 0.4;
    for (const f of this.entities) {
      if (!this.isFoe(p, f)) continue;
      const fx = f.pos.x - p.pos.x, fz = f.pos.z - p.pos.z, d = Math.hypot(fx, fz) || 1;
      if (d > 130) continue;
      const dot = (fx / d) * dx + (fz / d) * dz;
      if (dot > bestDot) { bestDot = dot; best = f; }
    }
    this._lastLock = best; return best;
  }

  slowmo(dur, mul = 0.42) { this._slowT = Math.max(this._slowT || 0, dur); this._slowMul = mul; }

  // ---------- SOUND: the honest way for a blind bot to find a fight ----------
  // Bots can no longer read your position (see ai.js THE HONESTY LAW), so the world has to be
  // audible instead. Explosions, heavy hits and KOs broadcast a position that nearby AI hears
  // with distance-scaled FUZZ — meaning a loud fighter draws a crowd and a quiet one can slip
  // a block over and vanish. `loud` ≈ 1 is a solid punch, 2+ is a detonation.
  noise(pos, loud = 1, src = null) {
    if (this.soundscape && this.soundscape.heard) this.soundscape.heard(loud, pos, this.player);   // the ambience DIRECTOR hears everything the bots do (manual §20)
    // THE BIRDS HEAR IT TOO. Same broadcast, so a flock breaking off a roof two blocks away is a
    // real tell that a fight has started — not an animation someone remembered to trigger.
    if (this.world.wildlife) this.world.wildlife.scare(pos.x, pos.z, 70 + loud * 60);
    if (!this.entities.length) return;
    for (const e of this.entities) {
      if (!e.ai || !e.alive || e === src) continue;
      if (src && e.team === src.team) continue;               // your own side isn't hunting you
      e.ai.hear(pos.x, pos.z, pos.y || 0, loud);
    }
  }

  // An enemy beam currently aimed at f (for AI to block / counter).
  incomingBeam(f) {
    let best=null,soonest=Infinity;
    for (const o of this.projectiles.list) {
      if (o.team === f.team || o.caster === f) continue;
      const arrival=beamThreatTime(o,f,this.world);
      if(arrival<soonest){best=o;soonest=arrival;}
    }
    return best;
  }
  // An enemy projectile heading at f.
  incomingProjectile(f,range=24) {
    let best=null,soonest=Infinity;
    for (const o of this.projectiles.list) {
      if (o.dead || o.sustaining !== undefined || !o.vel || o.team === f.team) continue;
      const dx=f.pos.x-o.pos.x,dy=f.pos.y+5-o.pos.y,dz=f.pos.z-o.pos.z,D=Math.hypot(dx,dy,dz);
      if(D>range||D<1)continue;
      const speed2=o.vel.lengthSq(),arrival=(dx*o.vel.x+dy*o.vel.y+dz*o.vel.z)/Math.max(1,speed2);
      const miss=Math.hypot(dx-o.vel.x*arrival,dy-o.vel.y*arrival,dz-o.vel.z*arrival);
      if(arrival>0&&arrival<soonest&&miss<6+(o.radius||0)+(o.blast||0)){best=o;soonest=arrival;}
    }
    return best;
  }

  // Soft body separation so fighters don't stack (skips grab pairs).
  /**
   * T — ACQUIRE, THEN CYCLE, THEN LET GO.
   *
   * Robert: *"you should be able to hit the T and then you get the little symbol above their hair …
   * if there's multiple enemies you should be able to cycle through them."*
   *
   * The order is by SCREEN-RELATIVE angle from where you are already looking, not by distance —
   * cycling by distance jumps you across the sky, while cycling by angle walks the enemies in front of
   * you left to right, which is what makes the second press predictable.
   *
   * ⚠ It obeys the honesty law like every other targeting path: you may only lock what you can
   * actually SEE (`_vis`), so this cannot become a wallhack that finds someone through a mesa.
   * ⚠ And the cycle ENDS in release. A lock you cannot drop is the thing that was stopping him flying
   * past people, so the last press hands the sky back rather than wrapping forever.
   */
  cycleLock(p) {
    // ⚠ TARGET ONLY WHAT YOU ARE LOOKING AT, AND T ALWAYS RELEASES (Robert, 2026-07-28: "the targeting
    // is on permanently, I can't turn it off... you should only be able to target what you're looking
    // at... T to toggle while already locked should toggle off"). The old cycle CAPTURED a foe list
    // and walked it, but the list went stale the moment a foe moved or _vis flickered, so repeated T
    // re-ranked and RE-LOCKED list[0] instead of releasing — the "stuck on" bug. And it had no front
    // cone, so it locked foes BEHIND you. Now: a FRONT-CONE list (never behind), rebuilt each press.
    const cam = this.world.camera, cf = _v.set(0, 0, 0); cam.getWorldDirection(cf);
    const FRONT = Math.PI/18; // 10° from the actual crosshair, not a hemisphere magnet.
    const ang = (e) => {
      const dx = e.pos.x - cam.position.x, dy = e.pos.y+5.2 - cam.position.y, dz = e.pos.z - cam.position.z;
      const l = Math.hypot(dx, dy, dz) || 1;
      return Math.acos(Math.max(-1, Math.min(1, (dx * cf.x + dy * cf.y + dz * cf.z) / l)));
    };
    // Practice targets teach the same focus controls as live opponents. The
    // shared availability check still rejects carried, hidden and invalid targets.
    const front = this.entities.filter(e => e.def&&lockAvailable(this,p,e)&&ang(e)<=FRONT);
    front.sort((a, b) => ang(a) - ang(b));
    const locked = (this.hardLock && this.hardLock.alive) ? this.hardLock : null;
    // A following camera continually re-ranks its current foe first. Cycling that list can
    // therefore lock forever. T is a toggle: acquire the viewed foe, or unconditionally release.
    const next = locked ? null : (front[0] || null);
    this.hardLock = next;
    if (this.audio) { try { this.audio.ui && this.audio.ui(); } catch (err) {} }
    if (this.hud && this.hud.feed) this.hud.feed(next ? `TARGET · ${next.def.name}` : 'TARGET RELEASED');
    return next;
  }

  validateLock(p){
    const foe=this.hardLock;
    if(foe&&!lockAvailable(this,p,foe)){
      this.hardLock=null;
    }
  }

  beginBodyContactFrame() { this._bodyContactFrame=beginBodyContactFrame(this.entities); }

  resolveBodies() {
    const E = this.entities;
    resolveBodyContacts(E,this._bodyContactFrame);this._bodyContactFrame=null;
    for (let i = 0; i < E.length; i++) {
      const a = E[i]; if (!a.alive || a._scoutVehicle || a._aircraftVehicle || a._passengerTransport) continue;
      for (let j = i + 1; j < E.length; j++) {
        const b = E[j]; if (!b.alive || b._scoutVehicle || b._aircraftVehicle || b._passengerTransport) continue;
        if (a.grabbing === b || b.grabbing === a || a.grabbedBy === b || b.grabbedBy === a) continue;
        // PowerWorld uses swept, posed core contact above. Preserve the legacy
        // city ground solver without applying a second root-cylinder push.
        if(a._openSky||b._openSky)continue;
        if (Math.abs(b.pos.y - a.pos.y) > 7) continue;
        const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, d = Math.hypot(dx, dz), min = a.radius + b.radius;
        if (d < min && d > 0.001) {
          const push = (min - d) * 0.5, nx = dx / d, nz = dz / d;
          a.pos.x -= nx * push; a.pos.z -= nz * push; b.pos.x += nx * push; b.pos.z += nz * push;
        }
      }
    }
    for(const f of E)if(f.alive)syncChargePresentation(f);
  }

  // ---------- setup ----------
  addFighter(def, opts) {
    const f = new Fighter(def, opts); f._game = this;
    f.stats = { dmg: 0, taken: 0, big: 0, bigKind: 'blast' }; f._bestStreak = 0;   // the news desk's stat sheet
    this.scene.add(f.obj); this.entities.push(f);
    return f;
  }

  // THE DEFERRED-CALLBACK LAW: a setTimeout fires OUTSIDE the frame loop, so main.js's try/catch
  // cannot see it — an exception there escapes every safety net the game has, and the callback can
  // land in a match that no longer exists (chain lightning damaging a fighter from the last round).
  // `later` is the one choke point: it stamps the match generation, refuses to run across a reset,
  // and swallows its own throw. Never call setTimeout directly with anything that touches the fight.
  // ⚠ the try covers the WHOLE body, not just fn() — a throw from the bookkeeping would escape into
  // the void exactly like the throw this method exists to contain.
  later(fn, ms) {
    const gen = this._gen | 0;
    const id = setTimeout(() => {
      try {
        if (this._timers) this._timers.delete(id);
        if ((this._gen | 0) !== gen) return;          // the match this belonged to is over
        fn();
      } catch (e) { try { this.reportError(e, 'later'); } catch (e2) {} }
    }, ms);
    if (!this._timers) this._timers = new Set();
    this._timers.add(id);
    return id;
  }

  // THE REPEATED-ERROR LAW: a throw inside the frame loop is caught and the loop keeps going —
  // but the SAME throw then fires 60×/second. Unthrottled `console.error` of a stack object at
  // 60Hz is itself a freeze (devtools serialises every one), and the player just sees a game that
  // stopped moving with nothing said. So: log each distinct error ONCE in full, count the rest,
  // and tell the player on the feed that the frame is failing rather than leaving them guessing.
  reportError(err, where) {
    const msg = (err && err.message) || String(err);
    const line = String((err && err.stack) || '').split('\n')[1] || '';
    const key = (where || '') + '|' + msg + '|' + line.trim();
    let rec = this._errSeen.get(key);
    if (!rec) {
      // errors whose message carries a varying number ("NaN at index 42") are all distinct keys,
      // so the ledger itself would grow forever at 60Hz. Bound it — the accounting must not leak.
      if (this._errSeen.size >= 200) this._errSeen.delete(this._errSeen.keys().next().value);
      rec = { n: 0, told: false };
      this._errSeen.set(key, rec);
      console.error('[THRESHOLD]' + (where ? ' (' + where + ')' : ''), err);
    }
    rec.n++;
    // a handful is a hiccup; a flood means the frame is genuinely broken and the player deserves to know.
    // ⚠ the feed call is wrapped: this method runs FROM the frame's catch and from window.onerror, so
    // an error handler that can itself throw is the one thing worse than the error it was reporting.
    if (rec.n === 30 && !rec.told) {
      rec.told = true;
      console.error(`[THRESHOLD] the above error has now fired ${rec.n}× — the frame is failing repeatedly`);
      try { if (this.hud && this.hud.feed) this.hud.feed('⚠ ENGINE FAULT — see console (' + msg.slice(0, 60) + ')', '#ff8a6a'); } catch (e) {}
    } else if (rec.n % 600 === 0) console.error(`[THRESHOLD] ${key.slice(0, 90)} ×${rec.n}`);
    return rec.n;
  }

  // ⚠ EVERY TRANSIENT THE MATCH CREATED DIES WITH THE MATCH.
  //
  // The three reset paths (startMatch / startMode / _tourneyRound) each hand-listed what to
  // clear, so every system added afterwards was silently exempt. Measured before this existed:
  // ten match restarts left 20 ground spikes, 10 decoys, 10 domes, 10 raised walls, 10 time
  // fields, 10 gravity zones and 10 interactables alive — cover 17 → 48, scene children
  // 49 → 104, geometries 279 → 628. Cover count drives physics, LOS and the fog raster, so
  // that is a slow march to a freeze, not a tidy-up nicety.
  //
  // ONE list, called from all three. A new zone system adds its line HERE and is covered
  // everywhere, which is the whole point.
  clearTransients() {
    clearScannerPanel(this);
    this.ms?.threatLab?.dispose();
    this.ms?.convoyOperation?.dispose();
    this.ms?.frontline?.dispose();
    this.ms?.zombies?.dispose();
    this.ms?.desertLaw?.dispose();
    // the weather goes home with everything else that must not outlive a match (the reset law)
    if (this.weather && this.weather.reset) this.weather.reset();
    // ⚠ THE FRAME CLAIM goes home too (Wave 3 VIEW rider) — a camera claim that survives a reset is
    // the "camera stuck 18u back next fight" bug. Dormant today (no carrier calls world.frameClaim),
    // but the reset law says clear it here, not when a carrier finally lands.
    if (this.world && this.world.clearFrameClaims) this.world.clearFrameClaims();
    // ⚠ AND SO DOES POWERWORLD'S OPEN SKY. The dimension raises `BANDS.ceiling`/`.sky` on the shared
    // band object, and a raised ceiling leaking into a city fight would let a flier climb out of the
    // theatre. `MODE_IMPL` has no teardown hook, and inventing one would be a second reset path —
    // this is the one place that empties the board, so the restore belongs here.
    if (this._bands0) { Object.assign(BANDS, this._bands0); this._bands0 = null; }
    if (this._ring) this._ring.close();
    if (this._pwStage) this._pwStage.close();   // POWERWORLD's stage is a transient like any other
    document.body.classList.remove('powerworld');   // and the class goes home with it (the reset law)
    if (this._fov0 != null) { this.fov = this._fov0; this._fov0 = null; }   // and so is a suspended fog of war
    if (this.lab) { try { this.lab.close(); } catch (e) {} this.lab = null; }   // the white room is a transient too
    if (this.baseRoom) { try { this.baseRoom.close(); } catch (e) {} this.baseRoom = null; }   // ⚠ and so is the BASE — its walls are real cover records; leaving them behind is the invisible-wall bug
    if (this.comic) { try { this.comic.clear(); } catch (e) {} }              // captions must not outlive their match
    this._gen = (this._gen | 0) + 1;                  // retire every in-flight deferred callback
    if (!this._timers) this._timers = new Set();
    for (const id of this._timers) clearTimeout(id);
    this._timers.clear();
    const W = this.world;
    const killCover = (co) => {
      if (!co) return;
      if (co.mesh) {
        this.scene.remove(co.mesh);
        if (co.mesh.geometry) co.mesh.geometry.dispose();
        if (co.mesh.material && !co.mesh.material._shared) co.mesh.material.dispose();
      }
      const a = W.cover.indexOf(co); if (a >= 0) W.cover.splice(a, 1);
      const b = W.coverAll.indexOf(co); if (b >= 0) W.coverAll.splice(b, 1);
    };
    for (const co of (this._spikes || [])) killCover(co);         // ground spikes (brief T2.8)
    for (const co of (this._reshaped || [])) killCover(co);       // raised walls (brief T3.11)
    this._spikes = []; this._reshaped = [];

    for (const d of (this._decoys || [])) {                       // holograms (brief T2.9)
      if (!d.grp) continue;
      this.scene.remove(d.grp);
      d.grp.traverse(o => { if (o.material) o.material.dispose(); if(o.userData._decoyGeometry||o.userData._snapshotGeometry)o.geometry.dispose(); });
    }
    this._decoys = [];

    for (const d of (this._domes || [])) {                        // shield bubbles (brief T3.15)
      if (!d.mesh) continue;
      this.scene.remove(d.mesh);
      if (d.mesh.geometry) d.mesh.geometry.dispose();
      if (d.mesh.material) d.mesh.material.dispose();
    }
    this._domes = [];

    this._fires = []; this._sing = []; this._smoke = [];          // pure data zones
    if (this.timeFields) this.timeFields.clear();                 // owns its own meshes
    if (this.gravityZones) this.gravityZones.clear();
    if (this.weather) { this.weather.clear(); this.weather.dispose(); }

    // interactables registered by a MATCH go; city-owned ones belong to the city and are
    // cleared by world._teardownCity instead (the documented teardown trap).
    if (this.interactables) this.interactables = this.interactables.filter(h => h.cityOwned);
    this._focus = null;

    for (const d of (this._drops || [])) { if (d && d.mesh) { this.scene.remove(d.mesh); if (d.mesh.geometry) d.mesh.geometry.dispose(); } }
    this._drops = [];
    // a prop in mid-air when the match ends must not still be shootable in the next one (the reset
    // law). The MESHES belong to vfx entries, which vfx clears; this list is the record side.
    for (const fl of (this._flung || [])) fl.dead = true;
    this._flung = [];

    this._koCam = null; this._spectate = null;
    // ⚠ THE RESET LAW REACHES THE FIGHTERS (aaa-03 F7). PowerWorld stamps `_openSky`/`_chaseKb` onto
    // every entity and `gait` walks a machine; a raised ceiling or a stale open-sky flag leaking into
    // a city duel would let a flier climb out of the theatre, and a stale `gait` would carry the wrong
    // grammar for a frame. The three reset paths empty `this.entities` right after this, so today this
    // is belt-and-suspenders — but a new mode that reuses bodies would step straight on F7 without it.
    for (const e of this.entities) {
      if (!e || !e.def) continue;
      e._openSky = false; e._chaseKb = false;
      e.gait = GAIT.GROUNDED; e._gaitFly = false; e._liftT = 0; e._settleT = 0; e._gaitCrash = 0;
    }
    // VIEW's Wave-1 rider: the camera re-anchors so the new match's first frame is not a lerp from
    // wherever the last one left the chase rig (world.snapChase(), aaa-04 / POWERWORLD_AAA WAVE 1).
    if (W.snapChase) W.snapChase();
    if (W.refreshFogBoxes) W.refreshFogBoxes();
  }

  startMatch(charId) {
    // F9 (altitude plan): a carry that survives a match start leaves an orphan mesh in the
    // scene and a fighter permanently slowed. Release every carry before anything else.
    for (const e of this.entities) if (e && e._carry) { try { this.scene.remove(e._carry.mesh); } catch (err) {} e._carry = null; e.speed = e.def.speed || 30; }
    // clear
    this.clearTransients();   // every zone/prop the LAST match made (see the method)
    for (const e of this.entities) { this.scene.remove(e.obj); if (e.dispose) e.dispose(); }
    this.entities.length = 0;
    for (const m of this.minions) if (m._dispose) m._dispose(this);   // ghost drones haunted rematches
    this.minions.length = 0;
    for (const c of this.constructs) c._dispose(this); this.constructs.length = 0;
    for (const pj of this.projectiles.list) if (pj._dispose) pj._dispose(this);   // returns pooled lights too
    this.projectiles.list.length = 0;
    while (this.portals.length) this._closePair(this.portals[0]);
    this.hardLock = null; this.lockTarget = null;
    this.world.resetTerrain(); this.vfx.clearScorches();   // restore blocks + flatten craters each match
    if (this.peds) this.peds.reset();
    if (this.news) this.news.reset(null);   // no crew on the legacy quick-boot path

    const def = ROSTER.find(r => r.id === charId) || ROSTER[0];
    this.player = this.addFighter(def, { isPlayer: true, team: 0, x: 0, z: 30 });
    this.player.ai = null;

    // the room starts EMPTY — N orders a training bot, B orders a rival
    this.running = true;
  }

  setPlayerChar(charId) {
    if (!this.player) return;
    const def = ROSTER.find(r => r.id === charId); if (!def) return;
    const { x, z } = this.player.pos; const y = this.player.pos.y, cameraPreset=this.player._cameraPreset;
    this.scene.remove(this.player.obj); if (this.player.dispose) this.player.dispose();
    const i = this.entities.indexOf(this.player); if (i >= 0) this.entities.splice(i, 1);
    this.player = this.addFighter(def, { isPlayer: true, team: 0, x, z });
    if(cameraPreset==='frontline')this.player._cameraPreset=cameraPreset;
    this.player.human = true; this.player.scheme = 'kbm';
    if (this.humans[0]) this.humans[0].fighter = this.player; else this.humans.push({ fighter: this.player, scheme: 'kbm' });
    this.player.pos.y = y;
    this.vfx.flash(this.player.pos.clone().setY(5), def.colors.accent, 10, 0.4);
    this.vfx.ring(this.player.pos.clone().setY(1), { color: def.colors.accent, r0: 2, r1: 16, life: 0.4, flat: true, y: 0.4 });
  }

  spawnDummy(x, z) {
    // a PROJECTED opponent, not a mannequin — cyan construct colours mark it as fabricated
    const def = { name: 'Sim Construct', colors: { primary: '#2f6f86', secondary: '#1d4a5c', accent: '#7fe6ff', skin: '#8fd8ee' }, hp: 120, ki: 100, speed: 0, abilities: {}, holo: true };
    const d = this.addFighter(def, { team: 1, dummy: true, x, z });
    // Practice contact must reproduce the field knockback without granting dummy flight.
    d._chaseKb = this.modeId === 'powerworld';
    return d;
  }

  // THE FIRING RANGE (2026-07-28, Robert: "Make targets for me to test combat and shooting").
  // One call raises a whole range DOWN YOUR AIM: five static constructs on a distance ladder
  // (15/30/50/80/120u — CLOSE through FAR, the same bands the slot chips use) fanned slightly
  // off-axis so a near target never eclipses a far one, plus two MOVERS strafing across the lane
  // at 40u and 70u (driven by the real mover in controlBot — lead them like real fighters).
  // Dummies respawn where they fell, so the range resets itself. Shift+N on the keyboard; also
  // `LSW.game.deployRange()` (agent-native — the key and the console reach the same method).
  deployRange() {
    const p = this.player; if (!p) return 0;
    let ax = p.aim.x, az = p.aim.z; const al = Math.hypot(ax, az);
    if (al > 0.01) { ax /= al; az /= al; } else { ax = 1; az = 0; }
    const rx = -az, rz = ax;                                    // lateral, across the lane
    const at = (d, side) => ({ x: p.pos.x + ax * d + rx * side, z: p.pos.z + az * d + rz * side });
    const lanes = [[15, -6], [30, 6], [50, -12], [80, 12], [120, 0]];
    let n = 0;
    for (const [d, s] of lanes) { const t = at(d, s); this.spawnDummy(t.x, t.z); n++; }
    for (const [d, sp] of [[40, 26], [70, 34]]) {
      const a = at(d, -22), b = at(d, 22);
      const m = this.spawnDummy(a.x, a.z);
      m.speed = sp;                                             // spawnDummy's def is speed 0 — a mover needs legs
      m._patrol = { x0: a.x, z0: a.z, x1: b.x, z1: b.z, flip: true };
      n++;
    }
    if (this.hud) this.hud.feed(`RANGE DEPLOYED — 5 static (15/30/50/80/120u) + 2 movers (40u, 70u)`, '#7fe6ff');
    return n;
  }

  spawnRival(charId) {
    const pick = charId ? ROSTER.find(r => r.id === charId) : ROSTER[(Math.random() * ROSTER.length) | 0];
    const ang = rand(0, TAU), r = 60;
    const b = this.addFighter(pick, { team: 1, x: Math.cos(ang) * r, z: Math.sin(ang) * r - 20 });
    b.ai = new AI(b, 1);
    this.vfx.flash(b.pos.clone().setY(5), pick.colors.accent, 10, 0.4);
    return b;
  }

  // ---------- modes & players ----------
  spawnEnemy(charId, o = {}) {
    const pick = charId ? (ROSTER.find(r => r.id === charId) || ROSTER[0]) : ROSTER[(Math.random() * ROSTER.length) | 0];
    const ang = rand(0, TAU), r = o.r ?? 70;
    const b = this.addFighter(pick, { team: o.team ?? 1, x: o.x ?? Math.cos(ang) * r, z: o.z ?? Math.sin(ang) * r });
    b.ai = new AI(b, o.aiLevel || 1);
    if (o.noRespawn) b.noRespawn = true;
    for (let i = 1; i < (o.level || 1); i++) this.levelUp(b, true);   // scale up quietly
    b.xp = 0;
    this.vfx.flash(b.pos.clone().setY(5), pick.colors.accent, 9, 0.35);
    return b;
  }
  // an online opponent: a real fighter whose authority lives on the other machine
  spawnRemote(charId) {
    const def = ROSTER.find(r => r.id === charId) || ROSTER[0];
    const f = this.addFighter(def, { team: 1, x: 0, z: -34 });
    f.remote = true; f.ai = null;
    return f;
  }
  // remote puppet: interpolate toward the streamed state; big jumps = their evade/teleport
  controlRemote(f, dt) {
    f.moveDir = { x: 0, z: 0 };
    const n = f._net; if (!n) return;
    const dx = n.x - f.pos.x, dy = n.y - f.pos.y, dz = n.z - f.pos.z;
    if (Math.hypot(dx, dz) > 26) { f.pos.set(n.x, n.y, n.z); this.afterimage(f); }
    else { const k = 1 - Math.exp(-12 * dt); f.pos.x += dx * k; f.pos.y += dy * k; f.pos.z += dz * k; }
    f.vel.set(n.vx || 0, n.vy || 0, n.vz || 0);               // drives the run/flight animation
    f.faceDir(Math.sin(n.f || 0), Math.cos(n.f || 0));
    if (n.a) f.aim3.set(n.a[0], n.a[1], n.a[2]);
    f.flying = !!n.fl;
    if (f.alive) f.guarding = !!n.gd;
    if (n.k != null) f.ki = n.k;
    if (n.h != null && f.alive) {                              // victim authority: their sim owns their hp
      if (n.h < f.hp - 0.5) f.hitFlash = 1;
      f.hp = n.h;
      if (f.hp <= 0) f._ko();                                  // the KO loop below scores it
    }
  }

  spawnHuman(charId, scheme, o = {}) {
    const def = ROSTER.find(r => r.id === charId) || ROSTER[0];
    const f = this.addFighter(def, { isPlayer: this.humans.length === 0, team: o.team ?? 0, x: o.x ?? 0, z: o.z ?? 30 });
    f.human = true; f.scheme = scheme; f.pnum = this.humans.length + 1;
    this.humans.push({ fighter: f, scheme });
    if (this.humans.length === 1) this.player = f;
    return f;
  }
  startMode(id, o = {}) {
    this.clearTransients();   // every zone/prop the LAST match made (see the method)
    for (const e of this.entities) { this.scene.remove(e.obj); if (e.dispose) e.dispose(); }
    this.entities.length = 0; this.humans.length = 0;
    for (const m of this.minions) if (m._dispose) m._dispose(this);
    this.minions.length = 0;
    for (const c of this.constructs) c._dispose(this); this.constructs.length = 0;
    for (const pj of this.projectiles.list) if (pj._dispose) pj._dispose(this);
    this.projectiles.list.length = 0;
    while (this.portals.length) this._closePair(this.portals[0]);
    this.hardLock = null; this.lockTarget = null; this.combo = 0; this.comboT = 0;
    this.world.resetTerrain(); this.vfx.clearScorches();
    if (this.peds) this.peds.reset();
    this.modeId = id; this.mode = MODE_IMPL[id] || MODE_IMPL.training; this.ms = {}; this.matchOver = false; this.matchResult = null;
    this.friendlyFire = false;   // tournament setup flips it on
    // fresh match record + the field crew rolls out (they skip the Danger Room)
    this.matchT = 0; this.matchLog = []; this.cityStats = { civs: 0, cars: 0, blocks: 0, craters: 0, cops: 0 };
    this.bigHit = { amount: 0, by: null, kind: 'blast' }; this._p1MaxCombo = 0; this.matchReport = null;
    if (this.news) this.news.reset(id);
    if (this.police) this.police.reset();
    this.world.setSim(id === 'training');   // the Danger Room fabricates its world
    const two = !!o.twoPlayer;
    this.spawnHuman(o.p1 || 'sol', 'kbm', { x: two ? -20 : 0, z: 30 });
    if (two) this.spawnHuman(o.p2 || 'vega', 'pad', { x: 20, z: 30, team: id === 'duel' ? 1 : 0 });
    this.mode.setup(this, o);
    this.running = true;
  }
  endMatch(result) {
    if (this.matchOver) return;
    clearScannerPanel(this);
    this.matchOver = true; this.matchResult = result;
    this.news?.endMatch(result);
    this.slowmo(0.35, 0.4); this.world.punch(0.8);
    // NOTE: a live recording keeps rolling behind the end screen (the final KO's ragdoll IS the
    // money shot) — it finalizes on its own clock into the same clips array the TV is playing.
    try { this.matchReport = buildReport(this, result); } catch (e) { console.error('news desk', e); this.matchReport = null; }
    // decided duels move the book at match weight (tournament rounds are booked by the bracket)
    try {
      if (this.modeId === 'duel' && this.ms.p1 && this.ms.enemy && this.ms.enemy.def) {
        const w = result.win ? this.ms.p1 : this.ms.enemy, l = result.win ? this.ms.enemy : this.ms.p1;
        if (w.def.id && l.def.id) {
          matchElo(w.def.id, l.def.id, [w.def, l.def], 'duel');
          for (const id of [w.def.id, l.def.id]) {            // a completed bout is medicine (manual §18)
            const h = healBout(id);
            if (h && h.cleared && this.hud) this.hud.feed(`MEDICAL: ${id.toUpperCase()} cleared to fight — ${h.name} healed`, '#8fe08a');
          }
        }
      }
      // an Invitational match reports to the bracket: books tournament Elo, sims the rest of the
      // round off-screen, and — if this was the final or the player's exit — crowns the champion
      if (this.modeId === 'tournament' && this.ms.T && this.ms.m) {
        const sc = result.win ? [this.ms.aWins, this.ms.bWins] : [this.ms.bWins, this.ms.aWins];   // winner-first, like a real box score
        this.ms.T.reportPlayerMatch(this.ms.m, result.win, sc);
      }
    } catch (e) { console.error('rankings', e); }
    if (this.onMatchEnd) { try { this.onMatchEnd(result); } catch (e) { console.error('onMatchEnd', e); } }
    if (this.hud) this.hud.showEndScreen(result, this);
  }
  // One elimination round of an Invitational match: full respawn of both sides in line formations.
  // City damage PERSISTS across rounds — the battlefield remembers, and so does the news desk.
  _tourneyRound() {
    const ms = this.ms, T = ms.T, m = ms.m; if (!m) return;
    // the tape is cumulative: lead fighters inherit their stat sheets across rounds
    const prevA = ms.aLeadF ? ms.aLeadF.stats : null, prevB = ms.bLeadF ? ms.bLeadF.stats : null;
    this.clearTransients();   // every zone/prop the LAST match made (see the method)
    for (const e of this.entities) { this.scene.remove(e.obj); if (e.dispose) e.dispose(); }
    this.entities.length = 0; this.humans.length = 0;
    for (const m of this.minions) if (m._dispose) m._dispose(this);
    this.minions.length = 0;
    for (const c of this.constructs) c._dispose(this); this.constructs.length = 0;
    for (const pj of this.projectiles.list) if (pj._dispose) pj._dispose(this);
    this.projectiles.list.length = 0;
    while (this.portals.length) this._closePair(this.portals[0]);
    this.hardLock = null; this.lockTarget = null;
    const mine = T.sides[0], theirs = T.playerFoeSide(m);
    const p1 = this.spawnHuman(mine.ids[0], 'kbm', { x: mine.ids.length > 1 ? -13 : 0, z: 46 });
    p1.noRespawn = true;                                     // elimination rules — a round death sticks
    if (prevA) p1.stats = prevA;
    ms.aLeadF = p1;
    for (let i = 1; i < mine.ids.length; i++) {
      const ally = this.spawnEnemy(mine.ids[i], { team: 0, x: 13 + (i - 1) * 22, z: 48, aiLevel: 1.15 });
      ally.noRespawn = true;
    }
    theirs.ids.forEach((id, i) => {
      const foe = this.spawnEnemy(id, { team: 1, x: (i - (theirs.ids.length - 1) / 2) * 26, z: -46, aiLevel: 1.2 });
      foe.noRespawn = true;
      if (i === 0) { if (prevB) foe.stats = prevB; ms.bLeadF = foe; }
    });
    ms.roundLive = true;
    if (this.hud) {
      this.hud.setPlayer(p1.def);
      this.hud.announce('ROUND ' + ms.round, ms.roundName + ' · vs ' + T.sideName(theirs), '#ffd24a');
    }
  }
  _waveCount(n) { return Math.min(6, 1 + Math.floor(n * 0.7)); }
  _spawnWave(n) {
    const count = this._waveCount(n), level = 1 + Math.floor((n - 1) / 2), chars = ROSTER.map(r => r.id);
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * TAU;
      this.spawnEnemy(chars[(Math.random() * chars.length) | 0], { x: Math.cos(ang) * 100, z: Math.sin(ang) * 100, level, aiLevel: Math.min(1.7, 1 + n * 0.05), noRespawn: true });
    }
  }

  // ---------- combat helpers ----------
  // fixation (police tunnel vision): a fixated fighter ONLY fights its fixation, and nobody
  // else's targeting minds the badge — heroes who keep civilians safe never trade with cops.
  isFoe(a, b) {
    if (!b || !b.alive || b === a) return false;
    if(a.isDummy){
      const lab=this.ms?.threatLab,trial=lab?.meleeTrial;
      return !!(lab?.state==='preparing'&&['defend','air-defense'].includes(trial?.kind)&&trial.target===a&&a._meleeTrial===trial&&b===this.player);
    }
    if (a.fixation) return b === a.fixation;
    if (b.fixation && b.fixation !== a) return false;
    return b.team !== a.team || b.isDummy;
  }

  // DECOY HOLOGRAM (brief T2.9): an untargetable copy that enemies RETARGET onto. It is not
  // a fighter — it never takes damage, never blocks, casts no contact shadow — it is a lie the
  // AI's own targeting believes, and it glitches instead of reacting when struck.
  spawnDecoy(caster, dur = 5) {
    const g = new THREE.Group();
    const src = caster.obj;
    const clone = snapshotHeroSkins(src.clone(true));
    clone.position.set(0,0,0); // the outer group owns the decoy's world position
    clone.traverse(o => {
      // Holograms freeze the presented pose. Static meshes may be shared, but
      // a live limb-deformation buffer would keep bending with the caster.
      if(o.geometry?.userData.deformsWithRig){o.geometry=o.geometry.clone();o.userData._decoyGeometry=true;}
      if (o.material) {
        o.material = o.material.clone();
        o.material.transparent = true; o.material.opacity = 0.62;
        if (o.material.emissive) { o.material.emissive.set(caster.def.colors.accent); o.material.emissiveIntensity = 0.5; }
      }
      if (o.isMesh) o.castShadow = false;                   // no proper contact shadow — the tell
    });
    g.add(clone);
    g.position.copy(caster.pos); // the inner clone already carries full body rotation
    this.scene.add(g);
    const d = { grp: g, t: dur, dur, owner: caster, pos: g.position, baseY:g.position.y, alive: true, isDecoy: true,
                team: caster.team, def: caster.def, name: caster.name, radius: caster.radius || 3 };
    (this._decoys = this._decoys || []).push(d);
    this.vfx.ring(caster.pos.clone().setY(1), { color: caster.def.colors.accent, r0: 1, r1: 7, life: 0.3, flat: true, y: 0.5 });
    this.audio.teleport(caster.pos);
    return d;
  }
  updateDecoys(dt) {
    const D = this._decoys; if (!D || !D.length) return;
    for (let i = D.length - 1; i >= 0; i--) {
      const d = D[i]; d.t -= dt;
      // slight colour separation + occasional frame-skip: it reads as a projection, not a body
      const skip = Math.random() < 0.03;
      d.grp.visible = !skip;
      d.grp.position.y = d.baseY + Math.sin(this.time * 9) * 0.06;
      if (d.t <= 0) {
        this.scene.remove(d.grp);
        d.grp.traverse(o => { if (o.material) o.material.dispose(); if(o.userData._decoyGeometry||o.userData._snapshotGeometry)o.geometry.dispose(); });
        this.vfx.flash(d.pos.clone().setY(5), d.def.colors.accent, 6, 0.16);
        D.splice(i, 1);
      }
    }
  }
  // a decoy is a legal TARGET but never a real one — nearestFoe is where bots decide
  nearestFoe(caster, pos, maxDist = 200) {
    let best = null, bd = maxDist * maxDist;
    // a live decoy on the other team outranks the real body: that is the entire point of it
    for (const d of (this._decoys || [])) {
      if (!d.alive || d.team === caster.team) continue;
      const dx = d.pos.x - pos.x, dz = d.pos.z - pos.z; const dd = dx * dx + dz * dz;
      if (dd < bd) { bd = dd; best = d; }
    }
    for (const f of this.entities) {
      if (!this.isFoe(caster, f)) continue;
      const dx = f.pos.x - pos.x, dz = f.pos.z - pos.z; const d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = f; }
    }
    return best;
  }

  overlapFoe(caster, pos, radius) {
    for (const f of this.entities) {
      if (!this.isFoe(caster, f)) continue;
      const dx = f.pos.x - pos.x, dz = f.pos.z - pos.z;
      if (Math.hypot(dx, dz) < radius + f.radius && Math.abs(pos.y - (f.pos.y + 5)) < 9) return f;
    }
    return null;
  }

  /**
   * TELEPORT-INTERCEPT (docs/POWERWORLD.md §13.2, manual §46). You hit someone hard, they go flying —
   * and instead of watching them go, you blink to them and keep going. This is **the core high-skill
   * technique of ESF**, and its research turned up nine named combos built on it.
   *
   * ⚠ IT ADDS NO KEY, NO SYSTEM AND NO STATE FIELD. Every part of it already existed:
   *   · `launchT` is the "this body did not arrive here under its own power" signal (the slam rules'),
   *   · `lastHitBy` says whose launch it was, so you can only chase your OWN work,
   *   · `burstT` is the mandatory lift on `move()`'s walk-speed clamp,
   *   · `updateBlinkMark` already draws a destination marker.
   * It is one function so the two delivery lanes cannot drift: the `teleport` ability TYPE and the
   * `blink` EVADE. Two carriers, and the roster already has them — **KANO** (Snap Transit + a blink
   * evade) and **APEX** (Afterimage + a blink evade).
   *
   * ⚠ THE COUNTER IS THE BEST PART, AND IT IS ESF'S OWN — BY ACCIDENT. In ESF, whether you could
   * follow a launched body depended on how hard you launched it: a standing hit was catchable, a full
   * swoop hit was not. The research says outright that this emerged accidentally, so here it is
   * deliberate: past `CATCH_SPD` the body is moving too fast to intercept and you have to fly it down.
   * That is what stops the biggest hit from also being the best hit.
   *
   * ⚠ ARRIVAL IS SHORT OF THE BODY AND AT EXACTLY ITS ALTITUDE. Short, because ESF 1.2.1 had to stop
   * teleport OVERSHOOTING and that is precisely why intercepting was so hard before it. At its
   * altitude, because the melee vertical rule would otherwise refuse the punch you teleported to make.
   * @returns {boolean} true if an intercept happened — the caller then skips its normal behaviour.
   */
  intercept(f) {
    const CATCH_SPD = 132, REACH = 190;
    let best = null, bd = REACH * REACH;
    for (const e of this.entities) {
      if (!this.isFoe(f, e) || !e.alive) continue;
      if (!(e.launchT > 0) || e.lastHitBy !== f) continue;          // only your own launch, only in flight
      const q = (e.pos.x - f.pos.x) ** 2 + (e.pos.y - f.pos.y) ** 2 + (e.pos.z - f.pos.z) ** 2;
      if (q < bd) { bd = q; best = e; }
    }
    if (!best) return false;
    const spd = Math.hypot(best.vel.x, best.vel.y, best.vel.z);
    // ⚠ THE CATCH LINE RIDES THE KNOCKBACK DIAL OR THE MECHANIC DIES SILENTLY. Multiplying the
    // impulse without moving this line makes EVERY launch too fast to follow, so teleport-intercept
    // would still be "shipped" and unreachable. Scaled by the same number, the ESF trade survives
    // intact: a standing hit is catchable, a full-speed swoop hit is not. City reads 132 as before.
    const CATCH = best._chaseKb ? pwCatchSpeed() : CATCH_SPD;
    if (spd > CATCH) {
      // ⚠ IT SAYS WHY. A refusal the player cannot read is indistinguishable from a broken button.
      if (this.isHuman(f) && this.hud) this.hud.feed('TOO FAST TO CATCH — fly them down', '#8b8577');
      return false;
    }
    // arrive on the far side of their travel, a body-length short, at their altitude
    const v = Math.hypot(best.vel.x, best.vel.z) || 1;
    const ax = best.vel.x / v, az = best.vel.z / v;
    this.afterimage(f);
    f.pos.set(best.pos.x + ax * 6.5, best.pos.y, best.pos.z + az * 6.5);
    f.vel.set(best.vel.x * 0.55, best.vel.y * 0.55, best.vel.z * 0.55);   // match their travel, mostly
    f.burstT = Math.max(f.burstT || 0, 0.5);        // or move()'s walk clamp eats the match-speed
    f.flying = f.flying || best.flying;             // you go where they went
    f.faceDir(best.pos.x - f.pos.x, best.pos.z - f.pos.z);
    f.invuln = 0;                                   // ⚠ NO i-frames: both lanes grant them by default
    this.afterimage(f);
    const col = f.def.colors.accent;
    this.vfx.flash(f.pos.clone().setY(f.pos.y + 5), col, 7, 0.24);
    this.particles.burst(f.pos.x, f.pos.y + 5, f.pos.z, { count: 20, speed: 26, life: 0.38, size: 2.8, color: ['#fff', col] });
    this.audio.teleport(); this.noise(f.pos, 0.7, f);
    if (this.isHuman(f) && this.hud) this.hud.feed('INTERCEPT — ' + (best.def ? best.def.name : 'target'), col);
    this.slowmo && this.slowmo(0.1, 0.55);
    // aaa-06 §8.2: the teleport catch is the dimension's signature technique and lands no fighter
    // hit — fire the impact frame here, the site that knows it is heavy.
    { const S = this._look || (this._look = SETTINGS); if (this.world.print && S.fxImpact !== false) this.world.print.impactFrame(1, 1); }
    return true;
  }

  coneFoe(caster, range, arc) {
    let best = null, bd = range * range;
    for (const f of this.entities) {
      if (!this.isFoe(caster, f)) continue;
      const dx = f.pos.x - caster.pos.x, dz = f.pos.z - caster.pos.z; const d = Math.hypot(dx, dz);
      const dy = Math.abs(f.pos.y - caster.pos.y);
      // ⚠ THE VERTICAL GATE IS ABOUT DECKS, AND THERE ARE NO DECKS IN THE AIR. The flat ±10u rule is
      // right on the ground — melee is a same-deck weapon and a jab must not reach a foe a storey
      // overhead — but 10u is **1.04 fighter heights**, and the four flight bands are 82–115u apart.
      // Airborne it meant two fliers at even slightly different altitudes could not touch each other
      // at all: no jab, no cross, no haymaker, no grab, no cone. In a dimension whose entire premise
      // is air combat that is not a balance number, it is a wall.
      //
      // In the air, ALTITUDE SPENDS REACH: the test becomes the real 3-D distance, so you can punch
      // someone above you exactly as far as you could punch them beside you, and no further. That is
      // fair, readable, and it needs no new field — `flying` already says which case you are in.
      // ⚠ READER #4 (aaa-03 §1): selects on the GAIT OWNER of BOTH parties, not `flying`. Two
      // air-owned fighters spend reach on altitude (the real 3-D distance); anything TOUCHING the
      // ground gets the flat ±10u deck rule. On the PowerWorld floor `flying` was stuck true, so the
      // deck rule never applied — now a grounded fighter uses it correctly. (The missing vertical arc
      // in the dot test below is a separate defect, aaa-03 §8.8, and belongs to the combat spec.)
      if (GAIT_OWNER[caster.gait] === 'air' && GAIT_OWNER[f.gait] === 'air') { if (Math.hypot(d, dy) > range) continue; }
      else { if (d > range) continue; if (dy > 10) continue; }
      const dot = (dx / (d || 1)) * caster.aim.x + (dz / (d || 1)) * caster.aim.z;
      if (dot < Math.cos(arc)) continue;
      if (d * d < bd) { bd = d * d; best = f; }
    }
    return best;
  }

  // AN ARMED CITIZEN FIRES. The street answering back — see THE VIGILANTISM LAW in
  // pedestrians.js. Deliberately a real ballistic round and nothing special: it meets ARMOUR and
  // TOUGHNESS like any other bullet, so against a Might-10 frame it is almost nothing. The point
  // is not the damage. It is the noise (police hear it), the tally, and the fact that a city
  // where vigilantism is banned physically shoots at you.
  civilianShot(x, z, target) {
    if (!target || !target.alive) return;
    // ⚠ do NOT use the shared _v here — spawnProjectile keeps the pos vector, and _v is reused
    // by the very next caller (the aliasing rule at the top of projectiles.js, same class of bug).
    const from = new THREE.Vector3(x, 6.4, z);
    const dir = new THREE.Vector3(target.pos.x - x, (target.pos.y + 5) - 6.4, target.pos.z - z).normalize();
    // civilians are bad shots — a wide, honest spread
    dir.x += (Math.random() - 0.5) * 0.13; dir.y += (Math.random() - 0.5) * 0.06; dir.z += (Math.random() - 0.5) * 0.13;
    this.projectiles.spawnProjectile({ pos: from, team: 3, def: { colors: { accent: '#c9b98a' } }, name: 'CITIZEN', powerBuff: 1, alive: true, isCivilian: true }, {
      pos: from, vel: dir.normalize().multiplyScalar(150),
      radius: 0.5, damage: 9, blast: 0, power: 0.2, life: 1.5,
      bullet: true, ballistic: true, weapon: 'pistol', color: '#c9b98a',
    });
    this.audio.gunshot && this.audio.gunshot(0.55, { x, z });
    this.noise({ x, y: 6, z }, 0.7, null);     // the police HEAR the street shooting
    this.cityStats.shots = (this.cityStats.shots || 0) + 1;
  }

  areaDamage(caster, pos, radius, damage, power = 1, o = {}) {
    for (const f of this.entities) {
      if(!caster)break;
      const foe = this.isFoe(caster, f);
      // TEAM DAMAGE (tournament ruling): with friendlyFire on, your splash catches your OWN side
      // at half strength. Melee and beams stay disciplined — explosions do not.
      const ff = !foe && this.friendlyFire && f !== caster && f.alive && f.def && !f.isDummy && f.team === caster.team;
      if (!foe && !ff) continue;
      const dx = f.pos.x - pos.x, dz = f.pos.z - pos.z, dy = (f.pos.y + 5) - pos.y;
      const d = Math.hypot(dx, dz, dy);
      if (d > radius + f.radius) continue;
      const fall = 1 - clamp(d / (radius + f.radius), 0, 1) * 0.6;
      const kb = _v.set(dx, 0, dz).setLength((damage * 0.6 + 12) * fall);
      // src attribution: explosions now CREDIT the blaster (artillery kills used to score nobody)
      const dealt = f.takeDamage(damage * fall * caster.powerBuff * (ff ? 0.5 : 1), { src: caster, kb, launch: (6 + power * 6) * fall, hitstop: 0.05, dtype: o.dtype });
      if (o.dot && dealt > 0) f.addDot({ ...o.dot, src: caster });   // caustic/incendiary payloads ride the blast
      if (o.freeze && dealt > 0 && f.addFrost) f.addFrost(o.freeze, caster);   // ice-slick traps ENCASE (brief Tier1 #9)
      if (ff && dealt >= 3 && this.hud && (this._ffFeedT || 0) <= this.time - 2.5) {
        this._ffFeedT = this.time;
        this.hud.feed(`⚠ FRIENDLY FIRE — ${caster.name} clipped ${f.name}`, '#ffb03a');
      }
    }
    // Native constructs are separate finite-box receivers, not humanoid targets.
    // A callback can exhaust an owner and remove several proxies synchronously.
    if(Number.isFinite(radius)&&radius>0&&Number.isFinite(damage)&&damage>0&&caster){
      for(const c of [...this.world.cover]){
        if(!c.onConstructHit||c.construct?.dead)continue;
        const at=new THREE.Vector3(clamp(pos.x,c.x-c.hx,c.x+c.hx),clamp(pos.y,c.bottom,c.top),clamp(pos.z,c.z-c.hz,c.z+c.hz));
        const distance=at.distanceTo(pos);
        if(distance<=radius)c.onConstructHit(damage*caster.powerBuff*(1-.6*clamp(distance/radius,0,1)),{src:caster,pos:at,lane:'splash'});
      }
    }
    this.worldImpact(pos, radius, power, caster);   // crater the ground + damage cover + street life
  }

  // A splash: ripple rings on the surface + spray. Fired by blasts over water and by ragdolls
  // going in ("carry the fall" — it reads under slow-mo because the rings live ~0.5s).
  splash(pos, power = 1) {
    const p = new THREE.Vector3(pos.x, 0.55, pos.z);
    this.vfx.ring(p, { color: '#bfe8f0', r0: 1.5, r1: 9 + power * 8, life: 0.5 });
    this.vfx.ring(p, { color: '#7fb8c8', r0: 1, r1: 5 + power * 5, life: 0.34 });
    const n = Math.round(8 + power * 9);
    for (let i = 0; i < n; i++) this.particles.spawn({
      x: pos.x + (Math.random() - 0.5) * 4, y: 0.6, z: pos.z + (Math.random() - 0.5) * 4,
      vx: (Math.random() - 0.5) * 15, vy: 8 + Math.random() * 15 * power, vz: (Math.random() - 0.5) * 15,
      life: 0.45 + Math.random() * 0.3, size: 1 + Math.random() * 1.1, color: ['#cfeef8', '#9fd4e8'], drag: 1.4, shrink: true,
    });
    if (this.audio.splash) this.audio.splash(power, pos);
  }

  // ---------- destructible environment ----------
  // A blast on the world: crater the ground (big hits only) and damage nearby cover.
  worldImpact(pos, radius, power = 1, src = null) {
    const groundY=this.world.heightAt?.(pos.x,pos.z)??0;
    if (Math.abs(pos.y-groundY) < 6.5 && (power >= 1.25 || radius >= 14)) {
      this.world.crater(pos.x, pos.z, Math.min(radius * 0.45, 22), Math.min(power * 1.3, 5));
      this.vfx.scorch(new THREE.Vector3(pos.x, groundY+.14, pos.z), Math.min(radius * 0.5, 24), '#161a22');  // scorch resolves the crater's new floor
      this.cityStats.craters++;
    }
    // over WATER a blast reads as water — ripple rings, spray, and the right sound
    if (pos.y < 7 && this.world.waterAt && this.world.waterAt(pos.x, pos.z)) this.splash(pos, Math.min(2, power));
    if (this.news) this.news.onBlast(pos, radius, power);   // the crew ducks — or eats pavement
    this.noise(pos, Math.min(2.6, 0.9 + power * 0.6 + radius * 0.02), src);   // detonations carry
    // Destruction can recursively explode other props and splice several cover
    // records. Snapshot this blast's candidates; dead records are skipped below.
    const blastCover=this.world.cover.slice();
    for (let i = blastCover.length - 1; i >= 0; i--) {
      const c = blastCover[i]; if (c.construct || c.hp == null || c.hp <= 0) continue;
      // Volumetric props opt into 3D blast distance. A detonation over a convoy
      // must not hurt its vehicles merely because their map footprints overlap.
      if(c.blastBounds&&c.blastBounds.distanceToPoint(pos)>radius)continue;
      const d = Math.hypot(pos.x - c.x, pos.z - c.z);
      if (d < radius + (c.r || 6)) { const fall = 1 - clamp((d - (c.r || 6)) / (radius + 1), 0, 1); this.damageBlock(c, power * 20 * fall, pos, src); }
    }
    // parked cars catch blasts and go up in chained fireballs
    if (this.world.cars) for (const car of this.world.cars) {
      if (car.dead) continue;
      const d = Math.hypot(pos.x - car.x, pos.z - car.z);
      if (d < radius + 5) { car.hp -= 12 + power * 10; if (car.hp <= 0) this._explodeCar(car, src); }
    }
    // the crowd reacts: scatter wide; anyone caught in the blast goes down (collateral)
    if (hasCivilians(this.modeId) && this.peds && pos.y < 12) {
      this.peds.scare(pos.x, pos.z, radius * 4);
      const downed = this.peds.blast(pos.x, pos.z, Math.max(6, radius * 0.85));
      if (downed) {
        this.cityStats.civs += downed;
        if (this.police) this.police.onCivHarm(src, downed, pos);   // the villain is whoever hurts humans — and WHERE decides what it costs
        if (this.hud) this.hud.feed(`⚠ COLLATERAL — ${downed} civilian${downed > 1 ? 's' : ''} down`, '#ff8a6a');
        if (src && this.isHuman(src)) src.score = Math.max(0, (src.score || 0) - 40 * downed);
        if (downed >= 2 && this.news) this.news.highlight('collateral', 'CIVILIANS CAUGHT IN THE BLAST', { dur: 2.0, priority: 1, focus: pos });
      }
    }
  }
  _explodeCar(car, src) {
    car.dead = true; car.mesh.position.y = -0.25;
    // plain cars are one mesh; police cruisers are a GROUP (body + light bar) — char it ALL, kill the lights
    if (car.mesh.isGroup) car.mesh.traverse(o => { if (o.material) { o.material = this.world._charred; } });
    else car.mesh.material = this.world._charred;
    const pos = { x: car.x, y: 2.5, z: car.z };
    this.cityStats.cars++;
    if (this.news) this.news.highlight('car', 'VEHICLE FIRE — POSSIBLE CHAIN REACTION', { dur: 2.0, priority: 2, focus: pos });
    this.vfx.flash(new THREE.Vector3(car.x, 3, car.z), '#ff8a3d', 14, 0.5);
    this.particles.burst(car.x, 2, car.z, { count: 26, speed: 26, life: 0.85, size: 5.2, color: ['#ff8a3d', '#ffd24a', '#22232c'], up: 15, grav: 8, drag: 1.2 });
    this.vfx.scorch(new THREE.Vector3(car.x, 0.18, car.z), 8, '#161a22');
    this.audio.boom(0.55, pos); this.world.shake(1.2); this.world.punch(0.85);
    this.areaDamage(src || this.player, pos, 14, 22, 2);   // hero-scale fireball — hurts fighters, craters, CHAINS to the next car
  }
  damageBlock(c, amt, pos, src = null) {
    if(c.onConstructHit)return c.onConstructHit(amt,{src,pos,lane:'cover'});
    if(c.construct)return;
    if (c.hp == null || c.hp <= 0 || amt <= 0) return;
    c.hp -= amt;
    if (src) c._breaker = src;                       // whoever was working on it owns what it does back
    const py = Math.min(c.top || c.h, (pos && pos.y) || 6);
    this.particles.burst(c.x + rand(-c.hx, c.hx), py, c.z + rand(-c.hz, c.hz), { count: 4 + (amt * 0.12 | 0), speed: 12, life: 0.5, size: 3.2, color: ['#3a3a44', '#22232c', '#6a6a74'], up: 5, grav: 8, drag: 1.5 });
    this.world.setBlockCracks(c);
    if (c.hp <= 0) this.shatterBlock(c, src);
    else this._ventHazard(c);
  }

  // ---------- THE DISTRICT REACTS (data/districts.js) ----------
  // ⚠ THE TELL COMES BEFORE THE BANG. A hazard nobody saw coming is not a mechanic, it is an
  // ambush — the player has to be able to READ that this particular wall is the wrong wall to throw
  // somebody through. A damaged hazardous structure VENTS: coloured smoke out of the fracture, a
  // named warning on the feed the first time it is touched, and a hiss. The intensity rides the
  // remaining hull, so the closer it is to going up the harder it is to miss.
  _ventHazard(c) {
    const HZ = districtRow(c.district).hazard;
    if (!HZ || c.hp <= 0) return;
    const frac = c.hp / c.maxHp;
    if (frac > 0.78) return;                          // a scratch on a tank is not a leak
    if (!c._ventSeen) {
      c._ventSeen = true;
      if (this.hud) this.hud.feed(`⚠ ${HZ.tell} — that structure will go up`, HZ.color);
      try { this.audio.zap(220, { x: c.x, z: c.z }); } catch (e) {}
    }
    if ((c._ventT || 0) > this.time) return;
    c._ventT = this.time + 0.28;
    const urgency = 1 - frac;                          // near death it is pouring out
    this.particles.burst(c.x + rand(-c.hx * 0.6, c.hx * 0.6), (c.top || c.h) * 0.6, c.z + rand(-c.hz * 0.6, c.hz * 0.6), {
      count: 3 + (urgency * 7 | 0), speed: 6 + urgency * 10, life: 1.1 + urgency, size: 4 + urgency * 3,
      color: [HZ.color, '#ffffff'], up: 6 + urgency * 8, grav: -1.5, drag: 0.8,
    });
  }

  // WHAT BREAKS BACK. Everything here routes through systems that already exist — `areaDamage`
  // (which brings craters, car chains, collateral booking, kill attribution and the whole
  // resistance table with it) and `addDot` for the cloud that stays. There is no bespoke damage
  // path, and the hazard cannot do anything an ability could not already do.
  // ⚠ EVERY HAZARD CARRIES A REAL `dtype`, so the counter was never authored: `metal` shrugs off a
  // fuel fire and is IMMUNE to the toxic clouds, and CORRODES in the chemical works. A robot picks
  // its fights by district whether or not anybody told it to.
  districtHazard(c, src) {
    // ⚠ NEVER INSIDE A VENUE. A venue hides the city rather than tearing it down, so the previous
    // theatre's tagged cover can still be sitting in `world.cover` while you are in a boxing hall —
    // and a fuel-farm detonation in the ring would be the district layer reaching into a fight it
    // does not govern. `hasCity` is the one definition (data/modes.js), the same one the nameplate
    // reads, so the rule and the surface that announces it can never disagree.
    if (!hasCity(this.modeId)) return;
    const HZ = districtRow(c.district).hazard;
    if (!HZ) return;
    const at = new THREE.Vector3(c.x, Math.min(8, (c.top || c.h) * 0.4), c.z);
    const who = src || c._breaker || this.player;
    this.vfx.flash(at.clone().setY(6), HZ.color, 26, 0.7);
    this.vfx.shockwave(at.clone().setY(0.4), { color: HZ.color, radius: HZ.r * 0.8, power: HZ.blast });
    this.particles.burst(c.x, 5, c.z, { count: 44, speed: 34, life: 1.3, size: 7, color: [HZ.color, '#ffd24a', '#22232c'], up: 22, grav: 7, drag: 1.1 });
    this.world.shake(2.4); this.world.punch(1.4);
    this.audio.boom(0.95, { x: c.x, z: c.z });
    // the secondary — a REAL explosion, so it craters, chains to parked cars and books its own
    // collateral against whoever caused it
    this.areaDamage(who, at, HZ.r, HZ.dmg, HZ.blast, { dtype: HZ.dtype });
    if (this.hud) this.hud.feed(`💥 ${HZ.tell} DETONATION — ${this.world.districtAt(c.x, c.z)}`, HZ.color);
    if (this.news) this.news.highlight('building', `${HZ.tell} EXPLOSION — ` + this.world.districtAt(c.x, c.z), { dur: 2.8, priority: 3, focus: at });
    if (!HZ.dot || !HZ.linger) return;
    // ...and the part that stays. A cloud is a ZONE, not a hit — the same shape the armory's gas
    // uses, and for the same reason: what makes a chemical works frightening is that the ground is
    // still dangerous after the bang.
    // ⚠ `later`, NEVER a bare setTimeout — a cloud must not outlive the match that made it
    // (the deferred-callback law), and this one schedules itself repeatedly.
    this.addSmoke(c.x, c.z, HZ.r * 0.55, HZ.linger, who);
    const R = HZ.r * 0.55;
    const tick = (left) => {
      if (left <= 0) return;
      for (const e of this.entities) {
        if (!e.alive || !e.pos || e.isDummy) continue;
        if (Math.hypot(e.pos.x - c.x, e.pos.z - c.z) > R) continue;
        e.addDot({ ...HZ.dot, color: HZ.color, src: who });
      }
      this.particles.burst(c.x, 3, c.z, { count: 8, speed: 7, life: 1.8, size: 5.5, color: [HZ.color, '#ffffff'], up: 3, drag: 0.7 });
      this.later(() => tick(left - 1), 900);
    };
    tick(Math.round(HZ.linger / 0.9));
  }

  shatterBlock(c, src = null) {
    if(c.construct)return;
    // ⚠ A COVER RECORD MAY OWN ITS OWN DEATH. The city's version below reads `c.mesh`, `c.crack` and
    // `c.y0` and calls `districtAt` — none of which a venue's hand-registered rock has, so a
    // destructible stage could not route through the one choke point without either faking those
    // fields or forking the function. One hook instead, checked first: no city cover carries
    // `onShatter`, so this line is inert everywhere except the dimension that sets it.
    if (c.onShatter) { try { return c.onShatter(this, c, src); } catch (e) { return this.reportError(e, 'onShatter'); } }
    this.cityStats.blocks++;
    if (this.news) this.news.highlight('building', 'STRUCTURE COLLAPSE — ' + this.world.districtAt(c.x, c.z), { dur: 2.6, priority: 2, focus: { x: c.x, y: 8, z: c.z } });
    const w = c.w || c.r * 1.6, h = c.h, d = c.d || c.r * 1.6;
    const mat = new THREE.MeshStandardMaterial({ color: '#b5ae9e', roughness: 0.9, metalness: 0.05 });   // white-stone rubble
    for (let i = 0; i < 11; i++) {
      const s = rand(1.4, 3.4);
      const chunk = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), mat);
      let px = c.x + rand(-w / 2, w / 2), py = rand(2, h), pz = c.z + rand(-d / 2, d / 2);
      chunk.position.set(px, py, pz); chunk.castShadow = true; this.scene.add(chunk);
      let vx = rand(-20, 20), vy = rand(12, 28), vz = rand(-20, 20), sp = rand(-7, 7), t = 0;
      this.vfx._add({
        update: (dt) => { t += dt; vy -= 62 * dt; px += vx * dt; py += vy * dt; pz += vz * dt; if (py < 1) { py = 1; vy *= -0.32; vx *= 0.6; vz *= 0.6; } chunk.position.set(px, py, pz); chunk.rotation.x += sp * dt; chunk.rotation.z += sp * 0.7 * dt; if (t > 2) { chunk.material.transparent = true; chunk.material.opacity = Math.max(0, 1 - (t - 2) / 0.9); } return t > 2.9; },
        dispose: () => { this.scene.remove(chunk); chunk.geometry.dispose(); },
      });
    }
    this.particles.burst(c.x, h * 0.5, c.z, { count: 28, speed: 16, life: 1.0, size: 6.5, color: ['#cfc8b8', '#8b8577', '#e8e2d4'], up: 8, grav: 4, drag: 1.2 });   // masonry dust
    this.vfx.scorch(new THREE.Vector3(c.x, 0.2, c.z), (c.r || 6) * 1.25, '#20242e');
    this.world.crater(c.x, c.z, (c.r || 6) * 0.7, 2.2);
    const mesh = c.mesh, crack = c.crack, y0 = c.y0; this.world.removeBlockFromCover(c);
    let ct = 0; this.vfx._add({
      update: (dt) => { ct += dt; const k = clamp(ct / 0.5, 0, 1); mesh.position.y = y0 - k * (h * 0.92); mesh.scale.y = Math.max(0.04, 1 - k); if (crack) { crack.position.y = mesh.position.y; crack.scale.copy(mesh.scale); crack.material.opacity = 0.9 * (1 - k); } return k >= 1; },
      dispose: () => { mesh.visible = false; if (crack) crack.visible = false; },   // hidden, not disposed — resetTerrain restores it
    });
    this.world.shake(1.5); this.world.punch(0.9); this.audio.boom(0.6, { x: c.x, z: c.z });
    // ⚠ LAST, AFTER THE COLLAPSE IS FULLY BOOKED. The hazard calls `areaDamage`, which craters,
    // chains to cars and can shatter the NEXT block — so this block has to be off the cover list and
    // its own stats counted before the secondary goes off, or a chain re-enters a half-finished
    // collapse. `removeBlockFromCover` above is what makes the recursion terminate.
    this.districtHazard(c, src);
  }

  // ---------- gamified combat: kills, streaks, XP/levels, announcer ----------
  isHuman(f) { return this.humans.some(h => h.fighter === f); }

  handleKO(victim) {

    try { this.startKoCam(victim); } catch (e) {}   // ROADMAP 18 · camera drama
    const practice=this.ms?.threatLab?.state==='preparing'&&this.ms.threatLab.meleeTrial;
    if(practice&&(practice.ownsPracticeActor(victim)||(victim===this.player&&practice.ownsThreat(victim.lastHitBy)))) {
      // Training keeps native KO/ragdoll presentation without campaign rewards,
      // dropped equipment, trauma, stock changes or operation kill callbacks.
      this.audio.cry(victim.def.voicePitch||1,victim.pos);
      this.slowmo(.45,.34);
      this.hud?.showKO?.(victim===this.player?'PRACTICE DOWN':'THREAT DEFEATED',victim.name,'#ffd24a');
      return;
    }
    // THE DROP ECONOMY (manual §16): KO'd gear carriers leave a weapon on the street — 20s to
    // claim it. Held pickups fall too. Police sidearms join the economy the same way.
    if (!victim.isDummy) {
      // Snapshot carried kit before dropGear restores a replaced primary for
      // respawn. That backup was not carried and must not become a second drop.
      const heldAb = victim._gearHeld?.ab;
      const gearAb = Object.values(victim.slots).map(s => s && s.def).find(d => d && d.gear);
      if (victim._gearHeld) this.dropGear(victim, true);
      if (gearAb && gearAb !== heldAb && (this._drops || []).length < 10) this.spawnGearDrop(gearAb, victim.pos.x + (Math.random() * 5 - 2.5), victim.pos.z + (Math.random() * 5 - 2.5));
    }
    const src = victim.lastHitBy;
    const killer = (src && victim.lastHitT < 4 && src !== victim && src.def) ? src : null;

    // ⚠ TRAUMA IS BOOKED FROM WHAT PEOPLE ACTUALLY WITNESSED, not from a menu. Robert: "seeing a
    // friend die in front of them may require some help." So it is gated on LINE OF SIGHT — the
    // same `canSee` the AI honesty law uses. Somebody two blocks away behind a building did not
    // watch anyone die, and booking them grief would be the system lying about its own premise.
    try {
      for (const w of this.entities) {
        if (!w.alive || w === victim || !w.def || w.dummy) continue;
        if (!this.canSee(w, victim)) continue;
        const ally = w.team === victim.team;
        const dist = Math.hypot(w.pos.x - victim.pos.x, w.pos.z - victim.pos.z);
        if (dist > 220) continue;
        const near = Math.max(0.35, 1 - dist / 220);
        if (ally) traumatise(w.id, 'allyKilled', near);
        else if (w === killer) traumatise(w.id, 'killed', near);
      }
    } catch (e) { this.reportError(e, 'trauma'); }

    // ⚠ BOTH OF THESE MUST LIVE BELOW `const killer`. Placed at the top of handleKO they sat in the
    // temporal dead zone and EVERY KNOCKOUT THREW — a crash on the most common event in the game,
    // introduced twice (the comic panel and the psyche trigger) and invisible until something died.
    // A `const` declared later in a function is not "undefined" above it; touching it is a throw.
    if (victim) {
      const kp = killer && psycheOf(killer);
      if (kp) kp.feel('kill', 1, this.time || 0);
      for (const e of this.entities) {
        if (!e.alive || e === victim || e === killer) continue;
        const ep = psycheOf(e);
        if (ep && e.team === victim.team) ep.feel('allyDown', 1, this.time || 0);
      }
    }
    // THE KO IS THE PANEL EVERY COMIC ENDS ON — one caption, one sound effect, and nothing else.
    if (this.comic && victim && victim.pos) {
      try {
        const feedback=selectHitFeedback({knockedOut:true,healthLost:0,absorbed:{plate:0,armor:0,shield:0,nanite:0},guard:'none',deflected:false,statusesAdded:[]});
        (this.comic.impact||this.comic.sfx).call(this.comic,killer?feedback.word:'DOWN!',victim.pos,{feedback,power:1,red:true,size:42,life:1.3});
        if (combatView(this)!=='bfp'&&(this.isHuman(killer) || this.isHuman(victim))) {
          this.comic.caption((victim.name || 'THEY') + ' is down!', { where: 'top', red: !this.isHuman(killer), life: 2.4 });
        }
      } catch (e) { this.reportError && this.reportError(e, 'comic.ko'); }
    }
    if (killer) {
      const bonus = 100 + Math.max(0, killer.streak) * 25;
      killer.kills++; killer.score += bonus; killer.streak++;
      this.grantXp(killer, 45 + victim.level * 12);
      if (this.isHuman(killer)) this.announceKill(killer, victim, bonus);
      killer.lastKillT = 0;
    }
    victim.streak = 0;
    if (killer) killer._bestStreak = Math.max(killer._bestStreak || 0, killer.streak);
    // ---------- DEPTH HOOKS, part two: what a knockdown MEANS ----------
    if (killer && !victim.isDummy) {
      const kind = victim._lastHitKind || 'blast';
      // (6) ENVIRONMENTAL CALLOUTS — how they died is its own little story
      if (this.isHuman(killer) && this.hud) {
        if (kind === 'slam') this.hud.announce('DEMOLITION', `${victim.name} went through the city`, '#c9c2b4');
        else if (victim.pos.y > 40) this.hud.announce('SKYFALL', `${victim.name} fell out of the sky`, '#7fe6ff');
        else if ((killer.style || 0) > 70) this.hud.announce('STYLISH K.O.', 'variety bonus banked', '#ffd24a');
      }
      // (7) NEMESIS — settle the score and get paid for it
      if (killer._nemesis === victim) {
        killer._nemesis = null; killer.score += 250;
        if (this.isHuman(killer) && this.hud) this.hud.announce('SCORE SETTLED', `${victim.name} is no longer your nemesis`, '#8fe08a');
      }
      if (this.isHuman(victim) && victim._lastAggressor && victim._lastAggressor.alive) {
        victim._nemesis = victim._lastAggressor;
        if (this.hud) this.hud.feed(`☠ ${victim._nemesis.name} is your NEMESIS — pay them back`, '#ff8a6a');
      }
      // (8) STYLE BANKED — the meter converts to score, then resets. Spend it or lose it.
      if (this.isHuman(killer) && (killer.style || 0) > 25) {
        const rank = killer.style > 90 ? 'S' : killer.style > 65 ? 'A' : killer.style > 40 ? 'B' : 'C';
        killer.score += Math.round(killer.style * 3);
        if (this.hud) this.hud.scorePopup(victim.pos, `${rank}-RANK +${Math.round(killer.style * 3)}`);
        killer.style = 0; killer._styleSeen = {};
      }
      // (9) THE CROWD REACTS — civilians nearby cheer the takedown (they film everything anyway)
      if (this.peds && this.isHuman(killer)) {
        for (let i = 0; i < 26; i++) this.particles.spawn({ x: victim.pos.x + rand(-22, 22), y: rand(1, 9), z: victim.pos.z + rand(-22, 22), vx: 0, vy: rand(9, 20), vz: 0, life: 0.7, size: 2.2, color: ['#ffd24a', '#fff'], drag: 1.1, shrink: true });
      }
    }
    // (10) MASTERY — every kit logs its own use count, so the codex can show what you actually fight with
    if (killer && killer.def && killer._lastSlot) {
      killer._mastery = killer._mastery || {};
      killer._mastery[killer._lastSlot] = (killer._mastery[killer._lastSlot] || 0) + 1;
    }
    if (victim.def.police) (this.ms?.desertLaw||this.police)?.onCopDown(killer);
    // THE HERO SIDE — a CLEAN rival takedown (no civilians harmed, not a cop, not a civilian) by the
    // human player, in a country where vigilantism is legal, makes the crowd cheer instead of flee.
    if (killer && this.isHuman(killer) && !victim.def.police && !victim.isDummy && !killer.def.police
        && this.peds && this.peds.cheer && this.police && this.police.heatOf(killer) < 8) {
      this.peds.cheer(victim.pos.x, victim.pos.z);
    }
    // the news layer: log the knockdown, and the camera swings to the body
    if (!victim.isDummy && this.mode) {
      this.matchLog.push({ t: this.matchT, type: 'ko', v: victim.name, vid: victim.def.id, k: killer ? killer.name : null, kid: killer && killer.def ? killer.def.id : null, kind: victim._lastHitKind || 'blast', at: this.world.districtAt(victim.pos.x, victim.pos.z) });
      if (this.news) this.news.highlight('ko', victim.name + ' IS DOWN' + (killer ? ' — ' + killer.name + ' STANDS' : ''), { dur: 3.4, priority: 3, focus: victim.pos,actor:killer,target:victim });
      if (this.audio.sample && (this.isHuman(victim) || (killer && this.isHuman(killer)))) this.audio.sample('sting.ko', { bus: 'music', gain: 0.8 });
      // the ledger: every registered-weapon knockdown moves the power rankings (AI or human pilot
      // alike) — friendly-fire KOs shame the feed but never touch the book
      if (killer && killer.def && killer.def.id && victim.def.id && killer.team !== victim.team && !killer.def.police && !victim.def.police
        && !killer._controlled && !victim._controlled && !killer._frontlineClone && !victim._frontlineClone && !killer._encounterNPC && !victim._encounterNPC && this.modeId !== 'training' && !this.ms?.threatLab) {
        koElo(killer.def.id, victim.def.id, [killer.def, victim.def]);   // a DOMINATED fighter's KOs are the controller's doing — the book stays honest
        // THE MEDICAL LEDGER (manual §18): some knockdowns leave a mark that outlives the match
        if (Math.random() < 0.3) {
          const inj = bookInjury(victim.def.id, victim._lastHitKind || 'strike', victim.def);
          if (inj) {
            if (this.hud) this.hud.feed(`MEDICAL: ${victim.name} — ${inj.name}, out ${inj.bouts} sanctioned bouts of form`, '#ff8a6a');
            (this._medNews = this._medNews || []).push({ name: victim.name, injury: inj.name, bouts: inj.bouts });   // the news desk reads the same record
          }
        }
      }
    }
    if(victim.def.vocalFamily==='zombie')zombieSound(this,victim,'death');
    else this.audio.cry(victim.def.voicePitch || 1, victim.pos);   // the falling wail
    this.noise(victim.pos, 2.2, null);                        // a death scream carries across the district
    // KO flourish — slowmo + banner when a human is involved (avoids spam in bot-vs-bot rumble)
    const involvesHuman = this.isHuman(victim) || (killer && this.isHuman(killer));
    if (involvesHuman) {
      this.slowmo(0.45, 0.34); if (this.world.punch) this.world.punch(0.9);
      if (this.hud && this.hud.showKO) {
        const down = this.isHuman(victim);
        this.hud.showKO(down ? 'DOWN' : 'K.O.', victim.name, down ? '#ff5a4a' : (killer ? killer.def.colors.accent : '#fff'));
      }
    }
    if (this.mode && this.mode.onKO && !this.matchOver) this.mode.onKO(this, victim, killer);   // the scoreboard freezes with the final whistle
    if (this.onKill) this.onKill(victim);
  }

  grantXp(f, amt) {
    if (!f) return; f.xp += amt;
    while (f.level < 10 && f.xp >= f.xpNext) { f.xp -= f.xpNext; this.levelUp(f); }
    if (f.level >= 10) f.xp = Math.min(f.xp, f.xpNext);
  }
  levelUp(f, quiet = false) {
    f.level++; f.xpNext = Math.round(f.xpNext * 1.35);
    f.levelMult = 1 + (f.level - 1) * 0.06;              // level → damage (capped at lvl 10)
    if (f.buffT <= 0) f.powerBuff = f.levelMult;
    f.maxHp = Math.round(f.maxHp * 1.07); f.hp = Math.min(f.maxHp, f.hp + f.maxHp * 0.25);
    f.maxKi = Math.round(f.maxKi * 1.04);
    // POWER TIERS (super-saiyan style): crossing 4/7/10 is a TRANSFORMATION, not just a number.
    // Android cores (energyInfinite) never drain — but they CAP at Tier II: ascended heroes out-scale them.
    let newTier = tierOf(f.level);
    if (f.energyInfinite) newTier = Math.min(newTier, 2);
    const tiered = newTier > f.tier; f.tier = newTier;
    const authored = formAt(f.def,f.level,f.energyInfinite);
    if (authored.form || f.formLevel) f.applyForm(authored.form);
    f.formLevel = authored.level; f.formName = authored.form?.name || '';
    if (!quiet) {
      const tc = TIER_COLORS[f.tier] || f.def.colors.accent;
      const airborne = f.airborne;
      if (tiered) {
        this.vfx.explode(f.pos.clone().setY(f.pos.y + 5), { color: tc, color2: '#fff', radius: 16, power: 1.8, energyShell: airborne, scorch: false });
        if (airborne) this.vfx.ring(f.pos.clone().setY(f.pos.y + 4), { color: tc, r0: 2, r1: 46, life: 0.6, flat: true });
        else if (f.pos.y > 0.1) this.vfx.ring(f.pos.clone().setY(f.pos.y + 0.2), { color: tc, r0: 2, r1: 46, life: 0.6, flat: true });
        else this.vfx.shockwave(f.pos.clone().setY(0.2), { color: tc, radius: 46, power: 1.6 });
        this.vfx.lightning(f.pos.clone().setY(f.pos.y + 2), { color: tc, count: 6, radius: 16, height: 22 });
        for (let i = 0; i < 60; i++) this.particles.spawn({ x: f.pos.x + rand(-3, 3), y: f.pos.y + rand(0, 6), z: f.pos.z + rand(-3, 3), vx: rand(-3, 3), vy: rand(26, 50), vz: rand(-3, 3), life: 1.2, size: 3.6, color: [tc, '#fff'], drag: 0.5 });
        this.world.punch(0.7); this.world.shake(1.8); this.audio.power(true); this.audio.boom(0.8, f.pos);
        f._yellCd = 0; this.heroYell(f, 1.6);   // the ascension SCREAM
        this.slowmo(0.3, 0.4);
        if (this.hud && (this.isHuman(f) || this.mode)) this.hud.announce('TIER ' + ['', 'I', 'II', 'III', 'MAX'][f.tier], f.name + ' ASCENDS', tc);
        // ASCENDING SPITS. Three arcs over half a second — the air can't hold it.
        if (this.audio.arc) for (let i = 0; i < 3; i++) this.later(() => this.audio.arc(1.1 + f.tier * 0.2, f.pos), i * 140);
        if (this.news) this.news.highlight('tier', f.name + ' ASCENDS — POWER READINGS SPIKE', { dur: 2.4, priority: 2, focus: f.pos,actor:f });
      } else {
        // Ordinary advancement is not an explosion. In the close combat view
        // keep the body/target readable; reserve the transformation for tiers.
        const close=this.world.camMode==='chase';
        if(close){
          for(let i=0;i<8;i++)this.particles.spawn({x:f.pos.x+rand(-2,2),y:f.pos.y+rand(1,5),z:f.pos.z+rand(-2,2),vx:0,vy:8,vz:0,life:.4,size:.45,color:[f.def.colors.accent],drag:.5});
        }else this.vfx.explode(f.pos.clone().setY(f.pos.y + 5), { color: f.def.colors.accent, color2: '#fff', radius: 11, power: 1.1, energyShell: airborne, scorch: false });
        this.vfx.ring(f.pos.clone().setY(f.pos.y + (airborne ? 3 : 0.5)), { color: f.def.colors.accent, r0: 2, r1: close?6:24, life: 0.6, flat: true,opacity:close?.35:.85 });
        this.audio.power(true);
        if (this.isHuman(f) && this.hud) this.hud.announce('LEVEL ' + f.level, `+6% DMG · +7% HP · +4% KI`, f.def.colors.accent);   // the delta card — SEE what leveling gave you
      }
    } else f.tier = newTier;
  }
  announceKill(killer, victim, bonus) {
    if (!this.hud) return;
    let text = null, sub = killer.name;
    if (!this.ms.firstBlood) { this.ms.firstBlood = true; text = 'FIRST BLOOD'; }
    else if (killer.lastKillT < 2.2) { killer._multi = (killer._multi || 1) + 1; const m = killer._multi; text = m >= 4 ? 'QUAD KO!' : m === 3 ? 'TRIPLE KO!' : 'DOUBLE KO!'; }
    else { killer._multi = 1; const s = killer.streak; if (s === 3) text = 'RAMPAGE'; else if (s === 5) text = 'UNSTOPPABLE'; else if (s >= 7) text = 'GODLIKE'; if (text) sub = killer.name + ' · ' + s + ' streak'; }
    if (text && this.hud) this.hud.announce(text, sub, killer.def.colors.accent);
    if (killer === this.player && this.hud && this.hud.scorePopup) this.hud.scorePopup(victim.pos, bonus);
  }

  // ---------- energy clarity ----------
  // A sustained/charged ability just ran the caster's ki dry. Make the failure readable:
  // smoke-fizzle VFX, a power-down cue, a DRAINED tag, and a short "winded" state the HUD shows.
  onDrained(f) {
    if (f.drainedT > 0.2) return;                      // debounce — one cue per drain event
    f.drainedT = 1.5;
    this.particles.burst(f.pos.x, f.pos.y + 6, f.pos.z, { count: 12, speed: 9, life: 0.7, size: 3.2, color: ['#6a7078', '#3a3f47', f.def.colors.accent], up: 7, grav: -2, drag: 1.8 });
    this.vfx.ring(f.pos.clone().setY(f.pos.y + 5), { color: '#8a9099', r0: 4, r1: 1, life: 0.3 });
    try { this.audio.zap(140); this.audio.zap(90); } catch (e) {}
    if (this.isHuman(f) && this.hud) {
      this.hud.damageNumber(f.pos, 'DRAINED', '#7fbfff', true);
      if (this.hud.kiWarn) this.hud.kiWarn();
    }
  }
  // The DBZ voice: charge screams, transformation roars, battle shouts — per-character pitch,
  // proximity-attenuated, cooldown so nobody screams every frame.
  heroYell(f, intensity = 1) {
    if (!f.def.yells || (f._yellCd || 0) > 0 || f.state === 'ko') return;
    f._yellCd = 1.4 + Math.random() * 0.5;
    this.audio.yell(f.def.voicePitch || 1, 0.5 + intensity * 0.45, intensity, f.pos);
  }

  // A launched fighter just hit a wall / the ground hard (entity._slam). Sell the crunch.
  onSlam(f, dmg, kind, {ordinaryFall=false}={}) {
    const p = f.pos.clone().setY(f.pos.y + 4);
    this.vfx.impactStar(p, 8 + dmg * 0.35, '#ffffff', 0.18);
    this.particles.burst(f.pos.x, f.pos.y + 3, f.pos.z, { count: 14, speed: 24, life: 0.5, size: 3, color: ['#8a8f99', '#fff', f.def.colors.accent], up: 8, grav: 14, drag: 1.6 });
    if (kind === 'ground' || kind === 'roof') {
      this.vfx.shockwave(f.pos.clone().setY(f.pos.y+.2), { color: '#c9cfd9', radius: ordinaryFall?Math.min(16,4+dmg*.1):14+dmg, power: ordinaryFall?.3:.9 });
      if(kind==='ground'&&!ordinaryFall)this.world.crater(f.pos.x, f.pos.z, 6, 1.2);
    }
    this.world.shake(1.2); this.audio.impact(1.15, f.pos); this.audio.boom(0.35, f.pos);
    this.audio.grunt(f.def.voicePitch || 1, f.pos);   // pain is universal
    if (this.hud) this.hud.damageNumber(f.pos, (ordinaryFall?'FALL ':'SLAM ') + Math.round(dmg), '#ffb03a', false);
    if (this.isHuman(f) && this.hud) this.hud.flashScreen('#ff8a5a', 0.12);
  }

  // SECOND WIND (manual §13): hold any attack for one full second while downed → rise at a
  // quarter health with the tank EMPTY and Overdrive's window live — drained fists refill ki.
  secondWindHold(f, holding, dt) {
    f._swHold = holding ? (f._swHold || 0) + dt : 0;
    if (f._swHold >= 1) this.secondWindRise(f);
  }
  secondWindRise(f) {
    // ⚠ SURVIVING SOMETHING YOU SHOULD NOT HAVE IS AN EVENT. Second wind is the engine's own
    // "should be dead" moment, so it is exactly where nearDeath belongs — and it can also leave a
    // physical mark nobody sees until a physician looks: cardiac strain from being run past the line.
    try {
      traumatise(f.id, 'nearDeath', 1);
      if (Math.random() < 0.45) inflict(f.id, 'cardiac', 1, 'second wind');
    } catch (e) { this.reportError(e, 'trauma'); }    f.downedT = 0; f._swHold = 0; f.staggerT = 0; f.state = 'idle';
    f.hp = f.maxHp * 0.25;
    f.ki = 0; f.drainedT = 5;                        // Overdrive's moment: the comeback attribute earns its keep
    f.invuln = Math.max(f.invuln, 1.2);
    this.vfx.shockwave(f.pos.clone().setY(0.3), { color: '#ffd24a', radius: 16, power: 1.1 });
    this.vfx.ring(f.pos.clone().setY(5), { color: '#ffd24a', r0: 2, r1: 14, life: 0.4 });
    this.world.shake(1.1); this.audio.boom(0.5, f.pos); this.heroYell(f, 1.2);
    this.slowmo(0.25, 0.45);
    if (this.hud) { this.hud.announce('SECOND WIND', 'overdrive burning — your fists refill the tank', '#ffd24a'); this.hud.flashScreen('#ffd24a', 0.2); }
    if (this.audio.sample) this.audio.sample('sting.ko', { gain: 0.75 });
  }

  // A KO'd body just hit the dirt (ragdoll core impact). Weight = strength: the heavies BREAK the ground.
  onRagdollImpact(f, spd, pos) {
    const str = f.strength ?? 5;
    const power = clamp(spd / 55, 0.5, 1.7) * (0.65 + str * 0.09);
    this.world.crater(pos.x, pos.z, 3.5 + str * 0.55, 0.8 + power * 0.9);
    this.particles.burst(pos.x, 0.8, pos.z, { count: 16 + str * 2, speed: 18 + str * 1.5, life: 0.65, size: 3.4, color: ['#6a655a', '#8a8577', '#3a3f47'], up: 9, grav: 14, drag: 1.5 });
    this.vfx.ring(new THREE.Vector3(pos.x, 0.35, pos.z), { color: '#c9bfa9', r0: 2, r1: 9 + str * 1.2, life: 0.42, flat: true, y: 0.35 });
    this.world.shake(0.7 + power * 0.9);
    this.audio.impact(0.75 + power * 0.5, pos);
    if (str >= 7) { this.audio.boom(0.55, pos); this.world.punch(0.85); }   // the big ones land like meteors
  }

  // Pressed an ability without the ki to pay for it (nothing fired — say so).
  onNoKi(f, key) {
    if (!this.isHuman(f)) return;
    if (this.hud && this.hud.kiDenied) this.hud.kiDenied(key);
    if ((f._noKiT || 0) <= 0) { f._noKiT = 0.25; try { this.audio.zap(120); } catch (e) {} }
  }

  // A raised guard just REJECTED a melee strike (called from takeDamage's guard branch for every
  // strike-flagged blocked hit — jabs, straights, melee abilities, rush hits). The attacker BOUNCES
  // off and eats a recovery stagger; a last-instant guard (<0.22s) is a PARRY: bigger bounce, longer
  // stagger, meter refund. This is the law that makes blocking actually stop melee spam.
  onBlockedStrike(att, blk, o = {}) {
    // COUNTER STANCE (brief T2.18): if the blocker is in a riposte window, the block becomes
    // an ANSWER. One use per window — a stance, not a permanent parry — and it rides the same
    // choke point every blocked strike already goes through, so it covers every melee source.
    if (blk && blk._riposte && !blk._riposte.used && att && att.alive) {
      blk._riposte.used = true;
      const dmg = blk._riposte.dmg * (blk.powerBuff || 1);
      const dx = att.pos.x - blk.pos.x, dz = att.pos.z - blk.pos.z, d = Math.hypot(dx, dz) || 1;
      att.takeDamage(dmg, { src: blk, strike: true, dtype: 'physical', hitstop: 0.12,
        kb: { x: (dx / d) * 46, y: 8, z: (dz / d) * 46 }, launch: 10 });
      att.staggerT = Math.max(att.staggerT, 0.55);
      this.slowmo(0.12, 0.42);
      this.vfx.impactStar(blk.pos.clone().setY(blk.pos.y + 5), 9, '#ffd24a', 0.22);
      this.audio.impact(1.1, blk.pos);
      if (this.hud) this.hud.damageNumber(blk.pos, 'COUNTER', '#ffd24a', true);
      blk._poseHold = 0.22;                       // the short martial punctuation the brief asks for
    }
    if (!att || !blk || !att.alive) return;
    if ((att._bounceCd || 0) > 0) return;                      // one rejection per exchange — no bounce-lock
    att._bounceCd = 0.3;
    const perfect = (blk._guardUpT ?? 99) < 0.22;
    const dx = att.pos.x - blk.pos.x, dz = att.pos.z - blk.pos.z, d = Math.hypot(dx, dz) || 1;
    const push = perfect ? 54 : (o.push ?? 38);
    att.vel.x += (dx / d) * push; att.vel.z += (dz / d) * push; att.vel.y = Math.max(att.vel.y, 5);
    att.staggerT = Math.max(att.staggerT, perfect ? 0.8 : (o.stagger ?? 0.45));
    att.hitstop = Math.max(att.hitstop, 0.1);
    att.strikeCd = Math.max(att.strikeCd || 0, 0.55);
    att.meleeCharge = 0; att.strikeActive = 0; att.comboWin = 0;   // the chain is BROKEN
    const imp = blk.pos.clone().add(att.pos).multiplyScalar(0.5); imp.y += 5.8;
    if (perfect) {
      blk.guardMeter = clamp(blk.guardMeter + 0.12, 0, 1);         // a clean parry refunds meter
      if (!o.contactFx) {
        this.vfx.impactStar(imp, 11, '#ffd24a', 0.22);
        this.vfx.ring(imp, { color: '#ffd24a', r0: 1, r1: 11, life: 0.3 });
      }
      this.audio.impact(1.0, imp); this.audio.zap(980, imp);
      this.slowmo(0.09, 0.45); this.world.shake(0.9);
      if (this.hud) { this.hud.damageNumber(blk.pos, 'PARRY!', '#ffd24a', true); if (this.isHuman(blk)) this.hud.flashScreen('#ffd24a', 0.1); }
    } else {
      if (!o.contactFx) this.vfx.impactStar(imp, 8, '#bfe0ff', 0.18);
      this.audio.zap(520, imp); this.audio.impact(0.55, imp);
      this.world.shake(0.5);
      if (this.hud && (this.isHuman(blk) || this.isHuman(att))) this.hud.damageNumber(att.pos, 'REPELLED', '#bfe0ff', true);
    }
  }

  // Called by Fighter.takeDamage for EVERY hit — damage numbers, sparks, combo.
  // THE ONOMATOPOEIA TABLE. A comic never writes "hit" — the WORD is the sound, and which word
  // depends on what landed. It lives beside onHit because that is the one place that knows.
  _sfxWord(amount, opts) {
    const dc = (opts && opts.dmgClass) || '', dt = (opts && opts.dtype) || '';
    const big = amount > 26, huge = amount > 48;
    if (opts && opts.slam) return huge ? 'KRA-THOOM!' : big ? 'WHAAM!' : 'THUD!';
    if (dc === 'slash') return big ? 'SHKKT!' : 'SHINK!';
    if (dt === 'ballistic') return 'BLAM!';
    if (dt === 'fire') return big ? 'FWOOSH!' : 'FWIP!';
    if (dt === 'cold') return 'KRIK-KRAK!';
    if (dt === 'energy') return huge ? 'KRAKA-DOOM!' : big ? 'ZAAK!' : 'ZAP!';
    if (opts && opts.strike) return huge ? 'KRAKKO!' : big ? 'THWAKK!' : 'POW!';
    return big ? 'WHUMP!' : 'BAP!';
  }

  presentHitOutcome(target,opts={},outcome){
    if(!outcome||!target?.pos)return;
    const feedback={...selectHitFeedback(outcome),dtype:outcome.dtype},t=this.time||0,family=feedback.id;
    const targetTimes=this._hitFeedbackTimes?.get(target)||new Map(),last=targetTimes.get(family)??-9;
    const delay=outcome.attackClass==='bullet'?.32:.42;
    if(t-last<=delay)return;
    if(!this._hitFeedbackTimes)this._hitFeedbackTimes=new WeakMap();
    targetTimes.set(family,t);this._hitFeedbackTimes.set(target,targetTimes);
    if(this.hud&&feedback.label)this.hud.damageNumber(target.pos,feedback.label,
      family==='guard-broken'?'#ff5a4a':family==='deflect'?'#ffd24a':'#e8e2d6',true);
    if(this.comic&&feedback.word&&family!=='ko'){
      const pl=this.player,near=!pl||(Math.abs(pl.pos.x-target.pos.x)<260&&Math.abs(pl.pos.z-target.pos.z)<260);
      if(near)(this.comic.impact||this.comic.sfx).call(this.comic,feedback.word,target.pos,
        {feedback,power:Math.min(1,Math.max(.25,(outcome.healthLost||0)/60)),red:family==='guard-broken'});
    }
  }

  onHit(target, amount, opts = {}, blocked = false, outcome = null) {
    this.ms?.threatLab?.meleeTrial?.hit(target,amount,opts,blocked,outcome);
    if(this.modeId==='powerworld')presentMaterialHit(this,target,amount,opts,blocked,outcome);
    confirmCombatOutcome(this,target,opts,outcome);
    if(outcome?.healthLost>0&&!outcome.knockedOut&&!opts.dot)zombieSound(this,target,'hurt');
    this.ms?.frontline?.onHit(target, amount);
    const src = opts.src;
    // THE WHITE ROOM reads the choke point rather than modelling damage itself — see whiteroom.js.
    // The evasion drill's score is the same event seen from the other side: a hit that lands on YOU.
    // ⚠ ONLY THE BIG ONES, AND ONLY NEAR THE PLAYER. A sound effect per beam tick is confetti;
    // this rate limit is what keeps the layer reading as a comic panel and not as a damage log.
    // Sustained sources (dot) never letter at all.
    // ⚠ THE WHEEL TURNS ON REAL EVENTS. Every trigger here is something that actually happened in
    // the fight — no timers, no randomness deciding how someone feels. Sustained sources are
    // excluded or a beam would spin the wheel sixty times a second.
    if (!opts.dot && amount > 0) {
      const src = opts.src;
      const big = amount >= target.maxHp * 0.12;
      const tp = psycheOf(target);
      if (tp) tp.feel(blocked ? 'blocked' : big ? 'hurtBad' : 'hurtLight', 1, this.time || 0);
      if (src && src !== target) {
        const sp = psycheOf(src);
        if (sp) sp.feel(blocked ? 'blocked' : big ? 'bigHitThem' : 'hitThem', 1, this.time || 0);
      }
      if (tp && target.hp / target.maxHp < 0.25) tp.feel('lowHealth', 0.5, this.time || 0);
    }
    // ⚠ THE IMPACT FRAME HANGS OFF THE CHOKE POINT, not off melee.js. Every present and future
    // source of a heavy blow already routes through here, which is the same reason the block law
    // lives in takeDamage rather than in each ability. A haymaker, a dive punch, a thrown car and a
    // beam overpower all get it for nothing, and none of them had to know this exists.
    // ⚠ Blocked hits never get one. The frame means CONNECTED; spend it on a blocked jab and it
    // stops meaning anything within about four seconds of a real fight.
    if (this.world && this.world.print && !blocked && !opts.dot && amount > 0) {
      const S = this._look || (this._look = SETTINGS);
      const heavy = amount >= (target.maxHp || 100) * 0.14 || opts.heavy || opts.haymaker;
      if (heavy && S.fxImpact !== false) this.world.print.impactFrame(1, Math.min(1, 0.7 + amount / 260));
      if (heavy && S.fxSpeedLines !== false && target.pos && this.isHuman && (this.isHuman(target) || this.isHuman(src))) {
        const p = this.world.toScreen ? this.world.toScreen(target.pos) : null;
        this.world.print.speedLines(p ? p.x : 0.5, p ? p.y : 0.5, Math.min(1, 0.45 + amount / 200), 0.2);
      }
    }
    // ⚠ A HAYMAKER ALWAYS LETTERS, WHATEVER THE NUMBER. The gate was damage-only, so the single most
    // committed punch in the game printed nothing when it landed on a heavyweight — the hit that
    // most deserves the loudest tell was the one most likely to be under the threshold. The word is
    // the comic layer's whole job; spend it on intent, not on arithmetic.
    // the ring scores off the choke point rather than watching the fight itself
    if (this._ring) this._ring.onHit(target, amount, opts, blocked);
    const feedback=outcome&&selectHitFeedback(outcome);
    if(outcome)Game.prototype.presentHitOutcome.call(this,target,opts,outcome);
    if (this.comic && !outcome && !opts.dot && target && target.pos && (amount>=14||opts.haymaker)) {
      const pl = this.player;
      const near = !pl || (Math.abs(pl.pos.x - target.pos.x) < 260 && Math.abs(pl.pos.z - target.pos.z) < 260);
      const t = this.time || 0;
      // ⚠ the rate limit exists so a beam is not confetti — but it must not let a JAB eat the
      // haymaker's word 0.3s later. A committed blow always gets through.
      const family='legacy',urgent=opts.haymaker;
      const targetTimes=this._hitFeedbackTimes?.get(target)||new Map(),last=targetTimes.get(family)??-9;
      if (near && (urgent || t-last>(outcome?.attackClass==='bullet'?.32:.42))) {
        if(!this._hitFeedbackTimes)this._hitFeedbackTimes=new WeakMap();
        targetTimes.set(family,t);this._hitFeedbackTimes.set(target,targetTimes);
        (this.comic.impact||this.comic.sfx).call(this.comic,feedback?.word||this._sfxWord(amount,opts),target.pos,
          {feedback,power:opts.haymaker?1:Math.min(1,Math.max(.25,(outcome?.healthLost||amount)/60)),
            red:!!(feedback?.id==='ko'||feedback?.id==='guard-broken'||opts.slam||opts.haymaker||amount>48)});
      }
    }
    if (this.lab) {
      this.lab.capture(target, amount, opts, blocked);
      if (target === this.player && amount > 0 && !blocked) this.lab.noteHitTaken();
    }
    // OVERDRIVE (per-character attribute): when your tank is empty, your FISTS refill it.
    // spend big → go in swinging → recharge. Landing melee while drained/low converts damage to ki.
    if (src && !blocked && opts.strike && amount >= 2 && (src.drainedT > 0 || src.ki < src.maxKi * 0.25)) {
      const od = src.def.overdrive ?? 1;
      if (od > 0) {
        const gain = Math.min(amount * 1.15 * od, src.maxKi - src.ki);
        if (gain > 1) {
          src.ki += gain;
          this.particles.burst(src.pos.x, src.pos.y + 5, src.pos.z, { count: 6, speed: 12, life: 0.4, size: 2, color: ['#7fe6ff', '#fff'], up: 8, drag: 1.2 });
          if (this.isHuman(src) && this.hud) { this.hud.damageNumber(src.pos, '+' + Math.round(gain) + ' KI', '#7fe6ff', true); if (this.hud.overdriveFlash) this.hud.overdriveFlash(); }
        }
      }
    }
    // directional damage cue when the human player is hit
    if (this.hud && this.hud.hitDirection && this.isHuman(target) && src && src !== target && (outcome?.healthLost??amount)>0) this.hud.hitDirection(src.pos);
    // A HELD BEAM on a raised guard calls onHit EVERY FRAME (blocked + dot). Even with the light
    // count now stable, spawning a flash mesh + a BLOCK number 60×/s is wasted churn and a strobe —
    // throttle the sustained-block cosmetics to ~8/s per target. One tell, not sixty.
    const beamBlock = blocked && opts.dot;
    const showBlockFx = !beamBlock || (this.time - (target._blkFxT || -1) > 0.12);
    if (beamBlock && showBlockFx) target._blkFxT = this.time;
    if (this.hud) {
      const shown=outcome?.healthLost??amount;
      if (!outcome&&blocked) { if (showBlockFx) this.hud.damageNumber(target.pos, 'BLOCK', '#bfe0ff', true); }
      else if (!outcome&&opts.dmgClass === 'slash' && shown >= 3) this.hud.damageNumber(target.pos, '⚔ ' + Math.round(shown), '#ffdcdc', false, true);
      else if (!outcome&&opts.dmgColor && shown >= 1) this.hud.damageNumber(target.pos, Math.round(shown), opts.dmgColor, true);
      else if (!outcome&&shown >= 5) this.hud.damageNumber(target.pos, Math.round(shown), src === this.player ? '#ffe08a' : '#ff9a6a');
    }
    // Danger Room: dummies log incoming damage for the live DPS meters
    if (target.isDummy && !blocked) { (target._dmgLog = target._dmgLog || []).push({ t: this.time, a: amount }); target._dmgTotal = (target._dmgTotal || 0) + amount; }
    // Swept fists own their close feedback. Real positive panel absorption also
    // owns its metal contact, including residual HP, not a second body bubble.
    const closeFeedback = target._openSky || this.modeId === 'powerworld';
    if (showBlockFx && !(opts.contactFx && closeFeedback) && !(opts.naniteResult?.absorbed>0)) {
      // Rifle chip should mark the actual contact, not hide half the hero in
      // a white sphere. Keep committed/heavy hits and overhead City feedback.
      const shown=outcome?.healthLost??amount,guarded=outcome?outcome.guard!=='none':blocked;
      if(!outcome||shown>0){
        const chip=closeFeedback&&opts.ballistic&&shown<(target.maxHp||100)*.06&&!opts.heavy&&!opts.haymaker;
        const point=chip&&opts.contactPoint ? opts.contactPoint.clone() : target.pos.clone().setY(target.pos.y+5.6);
        this.vfx.flash(point,guarded?'#cfe6ff':(target.def.colors.accent||'#fff'),chip?.55:guarded?3:2.4,.1);
      }
    }
    if (src === this.player && !blocked) {
      if (amount >= 5) { this.combo++; if (this.combo > this._p1MaxCombo) this._p1MaxCombo = this.combo; if (this.hud) this.hud.combo(this.combo); }
      this.comboT = 1.3;
    }
    if (src && !blocked && this.isHuman(src) && amount >= 1 && !(this.ms?.threatLab?.state==='preparing'&&this.ms.threatLab.meleeTrial?.ownsThreat(target))) this.grantXp(src, amount * 0.35);   // XP for landing damage

    // ---------- DEPTH HOOKS (cheap systems that reward how you fight, not just that you win) ----------
    if (src && !blocked && amount >= 1 && this.isHuman(src) && !target.isDummy) {
      // (1) STYLE — variety pays. Repeating one button decays the meter; mixing tools builds it.
      const sig = opts.strike ? 'melee' : opts.dot ? 'beam' : opts.dmgClass === 'slash' ? 'blade' : 'blast';
      src._styleSeen = src._styleSeen || {};
      const fresh = !src._styleSeen[sig];
      src._styleSeen[sig] = this.time;
      for (const k in src._styleSeen) if (this.time - src._styleSeen[k] > 6) delete src._styleSeen[k];
      src.style = Math.min(120, (src.style || 0) + amount * (fresh ? 1.6 : 0.5));
      src._styleT = 3.2;
      // (2) AERIAL — both of you off the deck is harder, so it pays more
      if (src.pos.y > 10 && target.pos.y > 10) {
        src.score += Math.round(amount * 0.6);
        if ((src._airT || 0) <= 0) { src._airT = 2.5; if (this.hud) this.hud.announce('AERIAL', 'sky duel bonus', '#7fe6ff'); }
      }
      // (3) MOMENTUM — a clean streak with no damage taken ramps your output a little
      src._clean = (src._clean || 0) + 1;
      if (src._clean === 12 && this.hud) this.hud.announce('IN THE POCKET', '+10% while untouched', '#ffd24a');
    }
    // (4) LAST STAND — under a fifth of your health you hit harder. Comebacks should feel possible.
    if (target && !blocked && this.isHuman(target)) {
      target._clean = 0;
      if (target.hp > 0 && target.hp < target.maxHp * 0.2 && !target._lastStand) {
        target._lastStand = true;
        if (this.hud) { this.hud.announce('LAST STAND', '+20% damage — finish it', '#ff5a4a'); this.hud.flashScreen('#ff3b3b', 0.18); }
      } else if (target.hp > target.maxHp * 0.35) target._lastStand = false;
    }
    // (5) NEMESIS — whoever put you down last is marked, and beating them pays
    if (target && this.isHuman(target) && src && src.def && !src.def.police) target._lastAggressor = src;
    // ATTACKING THE POLICE escalates on its own — every hit on a badge books heat and hardens them.
    if(target?.def?.police&&src?.def&&!src.def.police){
      if(this.ms?.desertLaw)this.ms.desertLaw.onCopHurt(src,blocked?(outcome?.guardAbsorbed||0):amount);
      else if(!blocked)this.police?.onCopHurt(src,amount);
    }
    // a solid hit is LOUD — nearby bots hear the scuffle and come looking (fair discovery)
    if (amount >= 10 && src && src !== target) this.noise(target.pos, Math.min(1.6, 0.5 + amount * 0.02), src);
    // the news desk's ledger: who dealt what, the biggest hit on record, and hot moments worth a camera
    if (!blocked && amount >= 1 && src && src.def && src !== target && !target.isDummy) {
      const kind = opts.strike ? 'fists' : opts.slam ? 'slam' : opts.dot ? 'beam' : opts.dmgClass === 'slash' ? 'blade' : 'blast';
      target._lastHitKind = kind;
      if (src.stats) { src.stats.dmg += amount; if (amount > src.stats.big) { src.stats.big = amount; src.stats.bigKind = kind; } }
      if (target.stats) target.stats.taken += amount;
      if (amount > this.bigHit.amount) this.bigHit = { amount, by: src, kind, t: this.matchT };
      // A launch is worth filming even when toughness keeps its damage below
      // the old 26 HP cutoff (Vega's native Rush Combo lands for 24).
      const launchBlow=opts.strike&&!opts.dot&&amount>=12&&Math.hypot(opts.kb?.x||0,opts.kb?.y||0,opts.kb?.z||0)>=40;
      if ((amount >= 26 || launchBlow) && this.news) this.news.highlight('bighit', src.name + (kind === 'fists' ? ' LANDS A MASSIVE BLOW' : ' — MASSIVE ENERGY DISCHARGE'), { dur: 2.1, priority: 1, focus: target.pos,actor:src,target });
    }
  }

  // ---------- dimensional doors (Portal-style paired rifts) ----------
  placePortal(caster, def) {
    const range = def.range || 80;
    let px, pz;
    if (caster.isPlayer) { px = this.aimPoint.x; pz = this.aimPoint.z; }
    else { px = caster.pos.x + caster.aim.x * 34; pz = caster.pos.z + caster.aim.z * 34; }
    const dx = px - caster.pos.x, dz = pz - caster.pos.z, d = Math.hypot(dx, dz) || 1;
    if (d > range) { px = caster.pos.x + dx / d * range; pz = caster.pos.z + dz / d * range; }
    const open = this._openPair && this._openPair.owner === caster && !this._openPair.b ? this._openPair : null;
    if (open) {                                      // second press → BLUE exit door; the pair goes live
      open.b = this._mkPortal(px, pz, def.colorB || '#37c7ff');
      open.life = def.dur || 14; this._openPair = null;
      this.audio.power(true);
    } else {                                         // first press → ORANGE entry door (replaces your old pair)
      const old = this.portals.find(p => p.owner === caster);
      if (old) this._closePair(old);
      const pr = { owner: caster, a: this._mkPortal(px, pz, def.colorA || '#ff8a2a'), b: null, life: (def.dur || 14) + 6 };
      this.portals.push(pr); this._openPair = pr;
      this.audio.teleport();
    }
  }
  _mkPortal(x, z, color) {
    const grp = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.55, 10, 36), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
    const disc = new THREE.Mesh(new THREE.CircleGeometry(4.2, 28), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    grp.add(ring, disc); grp.position.set(x, 6.2, z);
    this.scene.add(grp);
    this.vfx.ring(new THREE.Vector3(x, 1, z), { color, r0: 1, r1: 10, life: 0.4, flat: true, y: 0.5 });
    return { x, z, grp, ring, color };
  }
  _closePair(pr) {
    for (const side of [pr.a, pr.b]) if (side) { this.scene.remove(side.grp); side.grp.children.forEach(m => { m.geometry.dispose(); m.material.dispose(); }); }
    const i = this.portals.indexOf(pr); if (i >= 0) this.portals.splice(i, 1);
    if (this._openPair === pr) this._openPair = null;
  }
  updatePortals(dt) {
    // Final animated emitters precede world transfers; preparing projectile
    // motion afterwards must not move a teleported shot back to its hand.
    this.projectiles.resolveLaunches(this);
    for (let i = this.portals.length - 1; i >= 0; i--) {
      const pr = this.portals[i];
      pr.life -= dt;
      if (pr.life <= 0 || !pr.owner.alive && !pr.b) { this._closePair(pr); continue; }
      pr._humT = (pr._humT || 0) - dt;
      if (pr._humT <= 0 && pr.b) {                     // an OPEN doorway hums — a soft positional pulse per side (manual §20)
        pr._humT = 1.35;
        this.audio.zap(190, { x: pr.a.x, y: 6, z: pr.a.z });
        this.audio.zap(238, { x: pr.b.x, y: 6, z: pr.b.z });
      }
      for (const side of [pr.a, pr.b]) if (side) {
        side.grp.rotation.y += dt * 1.4; side.ring.rotation.z += dt * 2.2;
        if (Math.random() < 0.2) this.particles.spawn({ x: side.x + rand(-3, 3), y: 6 + rand(-3, 3), z: side.z + rand(-3, 3), vx: 0, vy: rand(2, 6), vz: 0, life: 0.5, size: 1.8, color: [side.color, '#fff'], drag: 1, shrink: true });
      }
      if (!pr.b) continue;                            // only half a doorway — nothing to walk through yet
      const hop = (obj, from, to) => {
        obj.pos.x = to.x + (obj.pos.x - from.x); obj.pos.z = to.z + (obj.pos.z - from.z);
        obj._portalCd = 0.9;
        this.vfx.flash(new THREE.Vector3(from.x, 6, from.z), from.color, 5, 0.18);
        this.vfx.flash(new THREE.Vector3(to.x, 6, to.z), to.color, 6, 0.22);
        this.audio.teleport();
      };
      const tryHop = (obj, yMid) => {
        if (obj._portalCd > 0) { obj._portalCd -= dt; return; }
        if (yMid > 14) return;                        // doors are ground-level
        if (Math.hypot(obj.pos.x - pr.a.x, obj.pos.z - pr.a.z) < 5) hop(obj, pr.a, pr.b);
        else if (Math.hypot(obj.pos.x - pr.b.x, obj.pos.z - pr.b.z) < 5) hop(obj, pr.b, pr.a);
      };
      for (const f of this.entities) if (f.alive) tryHop(f, f.pos.y);
      for (const o of this.projectiles.list) if (o.vel && o.sustaining === undefined && !o.dead) tryHop(o, o.pos.y);
    }
    for(const f of this.entities)if(f.alive)syncChargePresentation(f);
  }

  // ---------- items (gadgets outside the ability slots — no ki, one button) ----------
  // Teleport beacon: press once to PLANT it where you stand, press again — from anywhere — to
  // snap back to it. Bait-and-swap: plant, push in shooting, then vanish back to your spot.
  useItem(f,index=f?._selectedGadget??0) {
    if (f.noPowers) { if (this.isHuman(f) && this.hud) this.hud.feed('PURE BOXING — no gadgets', '#8b8577'); return; }
    const it = selectedGadget(f,index); if (!it) return;
    const research=this.ms?.threatLab&&f.team===this.player?.team?(this.campaign?.effects()??{}):{};
    const acc = f.def.colors.accent;
    if (it.state === 'cooldown' || it.state === 'spent') { if (this.isHuman(f) && this.hud) this.hud.feed(it.state === 'spent' ? 'No charges left' : 'Recharging…', '#8b8577'); return; }
    // one-shot gadgets (medkit / flashbang / jump jets / shield cell) — charges, then a recharge gap
    if (it.def.kind !== 'beacon') {
      const spend = () => {
        it.charges = (it.charges ?? it.def.charges ?? 1) - 1;
        if (it.charges > 0) { it.state = 'cooldown'; it.cd = (it.def.cd || 8) * (f.sheet ? f.sheet.cdMult : 1) * (it.def.kind==='scanner'?(research.scannerCooldownMult??1):1); }
        else it.state = 'spent';   // out until respawn refills the pouch
      };
      switch (it.def.kind) {
        case 'scanner':startThreatScan(this,f,it,spend);break;
        case 'repair':{
          const v=this.pwStage?.convoy?.vehicles.find(v=>!v.destroyed&&v.cover.hp<v.cover.maxHp&&v.mesh.position.distanceTo(f.pos)<30);
          if(!v){if(this.isHuman(f))this.hud?.feed('Repair: approach a damaged vehicle','#d5bd80');break;}
          const cost=Math.ceil(10*(research.repairCostMult??1));
          try{const receipt=this.campaign?.spend(crypto.randomUUID(),cost);if(!receipt?.accepted){this.hud?.feed(`Repair requires ${cost} supplies`,'#d5bd80');break;}v.cover.hp=Math.min(v.cover.maxHp,v.cover.hp+(it.def.repair||40));spend();this.hud?.feed(`Vehicle repaired · −${cost} supplies`,'#d5bd80');}catch(e){this.hud?.feed(`Repair save failed: ${e.message}`,'#d5bd80');}break;
        }
        // ---- THE ARMORY'S GEAR (2026-07-26) -------------------------------------------------
        // ⚠ VISION IS A DEVICE YOU CARRY, not a permanent stat. Night vision, the motion tracker
        // and the thermal scope all route through the ONE vision-mode system that already exists,
        // so nothing new has to know they were added.
        case 'vision': {
          setVisionMode(f, it.def.mode || 'night', it.def.dur || 24, this);
          this.audio.zap(560, f.pos); spend(); break;
        }
        // ⚠ GAS IS A ZONE, NOT A HIT. It hangs where it lands and keeps working — which is the
        // whole difference between a grenade and a gas grenade. Smoke does no damage at all: it
        // takes away the one thing every shooter needs.
        case 'gas': {
          const pl = it.def.payload || 'smoke', R = it.def.r || 16, DUR = it.def.dur || 8;
          const p2 = f.pos.clone();
          this.addSmoke(p2.x, p2.z, R, DUR, f);                 // every gas blinds — that is what a cloud does
          if (pl !== 'smoke') {
            const tint = pl === 'mustard' ? '#c8b84a' : '#dfe8c0';
            // the cloud KEEPS working: a repeating tick inside the radius for its whole life.
            // ⚠ `later`, never a bare setTimeout — a cloud must not outlive its match (the
            // deferred-callback law), and this one schedules itself repeatedly.
            const tick = (left) => {
              if (left <= 0) return;
              for (const e of this.entities) {
                if (!e.alive || e === f || !e.pos) continue;
                if (Math.hypot(e.pos.x - p2.x, e.pos.z - p2.z) > R) continue;
                if (pl === 'teargas') {
                  e.addDot({ dps: 1.6, dur: 2, color: tint, kind: 'gas', dtype: 'toxic', src: f });
                  e.staggerT = Math.max(e.staggerT || 0, 0.35);
                } else {
                  e.addDot({ dps: 7, dur: 4, color: tint, kind: 'acid', dtype: 'acid', corrode: 6, src: f });
                }
              }
              this.particles.burst(p2.x, 3, p2.z, { count: 10, speed: 7, life: 1.6, size: 5,
                color: [tint, '#ffffff'], up: 3, drag: 0.7 });
              this.later(() => tick(left - 1), 900);
            };
            tick(Math.round(DUR / 0.9));
          }
          this.audio.zap(300, f.pos); this.noise(p2, 0.5, f); spend(); break;
        }
        case 'armor': {                                          // a ballistic plate: an ablative pool
          f._shieldHp = (f._shieldHp || 0) + (it.def.hp || 55);
          this.vfx.ring(f.pos.clone().setY(5), { color: '#cfd8e0', r0: 2, r1: 9, life: 0.4 });
          this.audio.land(0.6, 'metal', f.pos); spend(); break;
        }
        case 'jammer': {
          // ⚠ IT CUTS THE RADIO, NOT THEIR EYES. Bots stop SHARING what they have seen and fall
          // back on their own sight — a real tactical effect that never makes them blind or stupid.
          for (const e of this.entities) if (e.ai) e.ai._jammedT = (it.def.dur || 12);
          this.vfx.ring(f.pos.clone().setY(4), { color: '#7fe6ff', r0: 3, r1: 30, life: 0.6, flat: true, y: 1 });
          this.audio.zap(180, f.pos); spend(); break;
        }
        case 'medkit':
          f.heal(it.def.heal || 40);
          this.vfx.ring(f.pos.clone().setY(5), { color: '#8fe08a', r0: 2, r1: 8, life: 0.4 });
          this.particles.burst(f.pos.x, f.pos.y + 5, f.pos.z, { count: 12, speed: 10, life: 0.6, size: 2.2, color: ['#8fe08a', '#fff'], up: 10, drag: 1 });
          this.audio.zap(820, f.pos); spend(); break;
        case 'flashbang': {
          this.vfx.flash(f.pos.clone().setY(6), '#ffffff', 16, 0.3);
          if (this.hud && this.isHuman(f)) this.hud.flashScreen('#fff', 0.2);
          this.audio.zap(1200, f.pos); this.audio.impact(0.7, f.pos);
          for (const e of this.entities) {
            if (!this.isFoe(f, e)) continue;
            const d = Math.hypot(e.pos.x - f.pos.x, e.pos.z - f.pos.z);
            if (d > (it.def.radius || 26)) continue;
            e.staggerT = Math.max(e.staggerT, 0.5);
            if (e.ai) { e.ai._mem = 0; e.ai.belief = null; e.ai._patrol = null; }   // flashbanged: they lose the plot entirely
          }
          spend(); break;
        }
        case 'jetcell':
          if (f._jetT <= 0) f._jetPrev = f.flightTier;
          f.flightTier = 3; f._jetT = it.def.dur || 6;
          if (!f.flying) f.toggleFlight();
          this.audio.zap(560, f.pos); this.audio.power(true); spend(); break;
        case 'shieldpack':
          f._shieldHp = (it.def.shield || 45)*(research.shieldHpMult??1);
          this.vfx.ring(f.pos.clone().setY(5.4), { color: '#7fe6ff', r0: 3, r1: 7, life: 0.4 });
          this.audio.zap(700, f.pos); spend(); break;
      }
      return;
    }
    if (it.state === 'ready') {
      // PLANT — a humming tripod with a light shaft, right at her feet
      const grp = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 0.5, 10), new THREE.MeshStandardMaterial({ color: '#2a2f38', roughness: 0.4, metalness: 0.7 }));
      base.position.y = 0.25; grp.add(base);
      // FIELD KIT, not a spell: tripod legs, a mast and a blinking status lamp. The ONLY part
      // that earns a glow is the recall ring — that bit really is a teleport field.
      const steel = new THREE.MeshStandardMaterial({ color: '#3a4048', roughness: 0.45, metalness: 0.85 });
      for (let s = 0; s < 3; s++) {
        const a = (s / 3) * Math.PI * 2 + 0.5;
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 3.4, 6), steel);
        leg.position.set(Math.cos(a) * 1.4, 1.2, Math.sin(a) * 1.4);
        leg.rotation.z = Math.cos(a) * 0.32; leg.rotation.x = -Math.sin(a) * 0.32; grp.add(leg);
      }
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 4.4, 6), steel);
      mast.position.y = 3.2; grp.add(mast);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), new THREE.MeshStandardMaterial({ color: acc, emissive: acc, emissiveIntensity: 1.6, roughness: 0.3 }));
      lamp.position.y = 5.5; grp.add(lamp);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.15, 8, 24), new THREE.MeshBasicMaterial({ color: acc, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.7; grp.add(ring);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 3.4, 8, 1, true), new THREE.MeshBasicMaterial({ color: acc, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      shaft.position.y = 2.4; grp.add(shaft);
      grp.userData.ring = ring; grp.userData.shaft = shaft; grp.userData.lamp = lamp;   // named refs, not child indices
      grp.position.set(f.pos.x, Math.max(0, f.pos.y), f.pos.z);
      this.scene.add(grp);
      it.mesh = grp; it.pos = grp.position.clone(); it.state = 'deployed';
      f._beaconHp = f.hp;   // AI remembers how healthy she was when she planted it
      this.vfx.ring(it.pos.clone().setY(0.5), { color: acc, r0: 1, r1: 9, life: 0.4, flat: true, y: 0.5 });
      this.audio.zap(520); this.audio.zap(760);
      if (this.isHuman(f) && this.hud) this.hud.feed('Beacon planted — press again to recall', acc);
    } else if (it.state === 'deployed') {
      // RECALL — vanish, reappear at the beacon, pick it back up
      this.afterimage(f);
      this.vfx.flash(f.pos.clone().setY(5), acc, 6, 0.2);
      f.pos.set(it.pos.x, it.pos.y, it.pos.z); f.vel.multiplyScalar(0.2);
      f.flying = false; f.invuln = Math.max(f.invuln, 0.35);
      this.afterimage(f);
      this.vfx.flash(f.pos.clone().setY(5), acc, 7, 0.25); this.audio.teleport();
      this.particles.burst(f.pos.x, 4, f.pos.z, { count: 16, speed: 22, life: 0.4, size: 2.4, color: ['#fff', acc] });
      if (it.mesh) { this.scene.remove(it.mesh); it.mesh.traverse(o => { if (o.material) o.material.dispose(); if (o.geometry) o.geometry.dispose(); }); it.mesh = null; }
      it.pos = null; it.state = 'cooldown'; it.cd = it.def.cd || 3;
    }
  }
  updateItems(dt) {
    for (const f of this.entities) if (f.items) for (const it of f.items) {
      if (it.state === 'deployed' && it.mesh) {
        const U = it.mesh.userData;                                               // ⚠ named refs: the beacon
        if (U.ring) U.ring.rotation.z += dt * 2;                                  // is real hardware now, so
        if (U.shaft) U.shaft.material.opacity = 0.1 + Math.sin(this.time * 5) * 0.05;   // child order shifted
        if (U.lamp) U.lamp.material.emissiveIntensity = (this.time * 2 % 1 < 0.5) ? 2.2 : 0.35;
        if (Math.random() < 0.1) this.particles.spawn({ x: it.pos.x + rand(-1, 1), y: 0.6, z: it.pos.z + rand(-1, 1), vx: 0, vy: 8, vz: 0, life: 0.5, size: 1.6, color: f.def.colors.accent, drag: 0.5, shrink: true });
      }
    }
  }

  // ---------- fx helpers used by abilities ----------
  spawnBeamFor(caster, def, p = 1, investedKi = 0) {
    return this.projectiles.spawnBeam(caster, {
      radius: (def.radius || 1.6) * (def.chargeWidth ? (1 + (p - 1) * 0.6) : 1),
      tipSpeed: def.tipSpeed || 150, maxLen: def.maxLen || 120,
      dps: (def.dps || 60) * p, kiPerSec: def.kiPerSec || 22,
      pushForce:def.pushForce??(def.faceOrigin?0:368),guardChip:def.guardChip,guardDrain:def.guardDrain,
      sourceGlow:def.sourceGlow,sourceScale:def.sourceScale,impactGlow:def.impactGlow,
      detonateRadius: (def.detonateRadius ?? Math.max(8,(def.radius||1.6)*8))*p,
      detonateDamage: (def.detonateDamage ?? (def.dps||60)*.8)*p,
      remoteDetonate: def.remoteDetonate===true,
      pierceFighters:def.pierceFighters===true,
      interceptBullets:def.interceptBullets===true,interceptKi:def.interceptKi,investedKi,
      color: def.color, color2: def.color2, power: (def.power || 1) * p, steer: def.steer,
      might: (def.might || (def.dps || 60) / 50) * p * (caster.def.beamMight || 1),   // char treats the budget differently
      dtype: def.dtype, siphon: def.siphon, spiral: def.spiral, faceOrigin: def.faceOrigin, chest: def.chest,
      combinedHands:usesCombinedHands(caster,def),castHand:def.castHand,
      // Character abilities own an articulated emitter. Low-level environmental
      // streams may still be spawned without a fighter's animation channel.
      poseLaunch:true,chargedRelease:!!def.charge,
      // THE BEAM ANATOMY (data/visual.js): BUILD is how much of it there is, TEMPER is what it is
      // doing inside. Both derived from the ability's own radius and material, both overridable.
      build: beamBuildOf(def), temper: beamTemperOf(def),
    });
  }

  chargeGather(caster, color, pos, intensity = 1) {
    const n = Math.ceil(1 + intensity * 2);
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), r = rand(8, 16 + intensity * 6), h = rand(-6, 6);
      this.particles.spawn({ x: pos.x + Math.cos(a) * r, y: pos.y + h, z: pos.z + Math.sin(a) * r, vx: -Math.cos(a) * r * 3, vy: -h * 3, vz: -Math.sin(a) * r * 3, life: 0.34, size: 2.4, color: [color, '#fff'], drag: 0.2, shrink: true });
    }
  }

  muzzleFlash(caster, color, scale = 1, off, at) {
    const m = at?at.clone():caster.muzzle(_v.clone()); if (off) m.add(off);
    this.vfx.flash(m, color || '#fff', 4 * scale, 0.1);
    this.particles.burst(m.x, m.y, m.z, { count: 5, speed: 14, life: 0.22, size: 2.2 * scale, color: [color, '#fff'], dir: { x: caster.aim.x, z: caster.aim.z }, spread: 0.6 });
  }

  trail(caster, color) {
    for (let i = 0; i < 5; i++) this.particles.spawn({ x: caster.pos.x + rand(-1, 1), y: caster.pos.y + 5 + rand(-3, 3), z: caster.pos.z + rand(-1, 1), vx: -caster.vel.x * 0.2, vy: 0, vz: -caster.vel.z * 0.2, life: 0.26, size: 3, color: [color, '#fff'], drag: 2, shrink: true });
  }

  afterimage(caster) {
    const m = new THREE.Mesh(this._ghostGeo, new THREE.MeshBasicMaterial({ color: caster.def.colors.accent, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.copy(caster.pos); m.position.y += 5; m.rotation.y = caster.facing; this.scene.add(m);
    let t = 0; this.vfx._add({ update: (dt) => { t += dt; m.material.opacity = 0.5 * (1 - t / 0.35); m.scale.setScalar(1 + t * 0.5); return t >= 0.35; }, dispose: () => { this.scene.remove(m); m.material.dispose(); } });
  }

  summon(caster, def) {
    // OVERWATCH TURRET BUFF (brief T2.10): a summon flagged `inherit` adopts the OWNER's
    // stat-sheet multipliers, so investing in yourself invests in your hardware too.
    if (def.inherit && caster.sheet) def = { ...def, damage: (def.damage || 10) * (caster.sheet.blastMult || 1) * (caster.powerBuff || 1), _inherited: true };
    const n = def.count || 3;
    for (let i = 0; i < n; i++) this.minions.push(new Minion(this, caster, def, i));
    // cap
    while (this.minions.filter(m => m.owner === caster).length > (def.max || 6)) { const idx = this.minions.findIndex(m => m.owner === caster); this.minions[idx]._dispose(this); this.minions.splice(idx, 1); }
  }

  spawnConstruct(caster, def, slotState = null) {
    const existing=slotState&&constructForSlot(this,caster,slotState);
    if(existing)return existing;
    let placement=null;
    if(def.construct==='tank'){
      tankSettings(def);placement=tankPlacement(this,caster);
      if(slotState)slotState.placementDenied=!placement;
      if(!placement)return null;
    }
    const c = new Construct(this, caster, def, placement);
    if(slotState){
      c.slotKey=Object.keys(caster.slots||{}).find(key=>caster.slots[key]===slotState)??null;
      c.slotState=slotState;slotState.active=c;
    }
    this.constructs.push(c); return c;
  }

  // ---------- control ----------
  retireCombatViewInput(subject=this.player,{preserveCarry=false}={}) {
    if(subject){
      if(subject._personCarry){if(preserveCarry){subject._personCarry.throwArmed=false;subject._personCarry.whirling=false;}else this.melee.release(subject);}
      this.melee.clearInput(subject);this.melee.guard(subject,false);cancelHeldAttacks(subject);
      subject.moveDir={x:0,z:0};subject.flyHeld=subject.descendHeld=subject.cruiseHeld=subject._scopeHeld=false;
      resetMovementGears(subject);
      if(this.netplay?.active)for(const key of Object.keys(subject.slots))this.netplay.queueSlot(key,4,subject.aim3);
    }
    const input=this.input;
    if(input){
      input.keys.clear();input.justPressed.clear();input.justReleased.clear();input.cancelVersion++;
      // The deferred pointer-lock event belongs to this already-retired input
      // epoch; it must not cancel a preserved menu carry a second time.
      if(input.mouse.locked)input._retiredPointerLock=true;
      if(preserveCarry&&subject?._personCarry)subject._personCarry.cancelVersion=input.cancelVersion;
      Object.assign(input.mouse,{left:false,right:false,leftEdge:false,rightEdge:false,leftUp:false,rightUp:false,b3:false,b4:false,dx:0,dy:0});
      input.wheel=input.wheelPrimary=input.wheelSecondary=0;input.pointerLock=false;
    }
    this.pad?.suppressCombatHeld?.();this._padAim=null;this._tapT=null;
    this.hardLock=this.lockTarget=null;this._aimHit=null;this._aimFresh=false;
    clearForegroundVisibility(this.world);this.world.clearFreeLook?.();this.world.snapChase();
  }

  prepareCombatView(inputDt) {
    this.combatOverlayOpen=!!(this._armory||this.hud?.overlayOpen?.()||this.inventoryPanel?.isOpen||this.powerPicker?.isOpen);
    const active=combatLookActive(this),w=this.world;
    const previous=this._combatControlOwner,changed=previous&&previous!==this.player;
    const rigChanged=previous===this.player&&this._combatControlParts!==this.player?.parts;
    const resumed=active&&previous&&!this._combatLookWasActive;
    if((this._combatLookWasActive&&!active)||changed||resumed)this.retireCombatViewInput(previous,{preserveCarry:!changed&&this.running&&!this.hud?.titleOpen});
    else if(rigChanged){
      // Authored forms replace presentation parts on the same living actor.
      // Refresh rig-dependent view state without releasing its held attacks.
      clearForegroundVisibility(w);w.snapChase();this._aimHit=null;this._aimFresh=false;
    }
    this._combatControlOwner=this.player;this._combatControlParts=this.player?.parts;this._combatLookWasActive=active;
    if(!active&&combatView(this)==='bfp')this.pad?.suppressCombatHeld?.();
    this._combatLockPressed=this.pad?.sampleCombatLock?.(active)??false;
    if(this.input)this.input.pointerLock=active;
    if(!active){w.clearFreeLook?.();return;}
    this.validateLock(this.player);
    // First entry must establish a real perspective eye even without a look
    // delta. Subsequent zero-time solves only update the view, never gameplay.
    if(w.camMode!=='chase'||!w._bfpCameraActive||!w._lookActive)w.chase(this.player,this.hardLock,0,'bfp');
    const sight=w._sightZoom||1;
    const padLook=this.pad?.active&&this.pad.viewFreeLook;
    const pixels=2.4*Math.max(0,Math.min(.05,inputDt||0))/(w._lookSens||.0024);
    const lookInput=padLook?{...this.input,down:code=>code==='AltLeft'||this.input.down(code),mouse:{...this.input.mouse,dx:this.input.mouse.dx+this.pad.rx*pixels,dy:this.input.mouse.dy+this.pad.ry*pixels}}:this.input;
    if(!w.freeLookInput(lookInput,inputDt,sight))w.mouseLook(this.input.mouse.dx/sight,this.input.mouse.dy/sight);
    // Native deadzone-normalized stick values; 2.4 radians/s at full throw.
    // Convert to existing mouse-look units so pitch limits/inversion stay shared.
    if(this.pad?.active&&!padLook){
      w.mouseLook(this.pad.rx*pixels/sight,this.pad.ry*pixels/sight);
    }
    w.chase(this.player,this.hardLock,0,'bfp');
    w.camera.updateMatrixWorld(true);
  }

  onMovementPowerupReady(f) { return activatePowerUp(f,this); }

  controlPlayer(dt, inputDt = dt) {
    const p = this.player; if (!p || !p.alive) { if (p) { resetMovementGears(p);cancelHeldAttacksIfIncapacitated(p);p.moveDir = { x: 0, z: 0 }; } this.lockTarget = null; return; }
    cancelHeldAttacksIfIncapacitated(p);
    const inp = this.input, m = inp.mouse, pad = this.humans.length < 2 ? this.pad : NULL_PAD;   // in 2P the pad drives P2
    const chase=combatView(this)==='bfp';
    if(this.running===false||this.matchOver||this.mapCam||this.hud?.titleOpen||this.combatOverlayOpen){resetMovementGears(p);p.moveDir={x:0,z:0};return;}
    if(this._pwStage?.transport?.handleInput(inp,dt)){resetMovementGears(p);return;}
    if(this._pwStage?.aircraft?.piloting?.handleInput(inp,dt)){resetMovementGears(p);return;}
    if(this._pwStage?.convoy?.driving?.handleInput(inp,dt)){resetMovementGears(p);return;}

    // Chase view traces the actual camera centre; legacy view retains cursor aim.
    const a3 = this._aim3pt;
    let soft;
    if (!chase && pad.active && pad.aiming) {
      const ax = this.right.x * pad.rx + this.fwd.x * (-pad.ry), az = this.right.z * pad.rx + this.fwd.z * (-pad.ry);
      soft = p.blindT > 0 ? null : this.pickTargetDir(p, ax, az);
      if (soft) soft.center(a3); else a3.set(p.pos.x + ax * 50, 6, p.pos.z + az * 50);
      this._padAim = { x: ax, z: az };                  // remember the heading for when the thumb lifts
    } else if (!chase && pad.active && this._padAim) {
      // ⚠ LIFTING THE AIM THUMB WAS AIMING AT THE TOP-LEFT CORNER OF THE SCREEN. `Input.mouse.clientX/Y`
      // initialise to 0 and are only ever written by a `mousemove` — which never fires on a touch
      // device — so the moment the stick was released this fell through to the mouse branch and
      // `screenToGround(0, 0)` resolved to the corner of the world. On an iPad, where BOTH thumbs are
      // on sticks and you have to let go of one to press anything, that is most of the session.
      // ⚠ RELEASING A STICK MEANS "HOLD THIS HEADING", NOT "AIM SOMEWHERE ELSE" — so the last heading
      // is retained. That is also what makes a pad feel like a pad rather than like a lost cursor.
      const ax = this._padAim.x, az = this._padAim.z;
      soft = p.blindT > 0 ? null : this.pickTargetDir(p, ax, az);
      if (soft) soft.center(a3); else a3.set(p.pos.x + ax * 50, 6, p.pos.z + az * 50);
    } else if (chase) {
      // ⚠ FREE AIM IN BFP VIEW IS THE CAMERA RAY, NEVER THE MAGNET (Robert, 2026-07-28: "target
      // seems to always be on"). `pickTarget` snaps the aim to the NEAREST foe and set `lockTarget`
      // every frame, so the hostile reticle was ALWAYS lit and the aim got yanked off where you look.
      // BFP aims where you LOOK; a SOFT target exists only when a foe is genuinely under the crosshair.
      // THE RETICLE NEVER LIES (aaa-05): trace from the CAMERA through screen centre — NOT camBasis
      // (the framing axis, 15° off) — and aim at the world point that ray reaches. A gentle assist
      // radius (`pad`) still nudges onto a foe near the reticle; the aggressive magnet is gone.
      const cam = this.world.camera;
      if(this.world.freeLooking)this.world.combatAimDirection(_camDir);
      else cam.getWorldDirection(_camDir);
      const rayOrigin=this.world.freeLooking?this.world.combatAimOrigin(_camOrigin):cam.position;
      const firearmRange=firearmAimRange(p,AIM_MAX_D);
      this._aimHit = this.world.aimTrace(_aimOut, {
        origin: rayOrigin, dir: _camDir, maxD: firearmRange>AIM_MAX_D?firearmRange+rayOrigin.distanceTo(p.pos):AIM_MAX_D,
        foes: p._personCarry?this.entities.filter(e=>e!==p._personCarry.victim):this.entities, ignore: p, blind: p.blindT > 0,   // A carried payload must not intercept its owner's throw aim.
        flung: this._flung,
        pad: SETTINGS.aimAssist === false ? 0 : (p.radius || 2.2) * 0.5,
      });
      a3.copy(_aimOut.point);
      soft = (p.blindT <= 0 && this._aimHit?.hit === 'foe' && this.isFoe(p,this._aimHit.ent)) ? this._aimHit.ent : null;
    } else {
      soft = p.blindT > 0 ? null : this.pickTarget(p);             // BLIND: the aim magnet lets go
      if (soft) soft.center(a3);
      else { this.world.screenToGround(m.clientX, m.clientY, a3); a3.y = 3; }
    }
    // hard lock ONLY on a direct click ON a character (LMB is also fire — the old "any attack
    // click near a foe locks you" was the "faces one way while I aim another" bug)
    // Firing never locks in BFP view: T, L1+R3 or the touch lock button owns that choice.
    if (!chase && m.leftEdge && this._hoverPick) this.hardLock = this._hoverPick;
    else if (!chase && pad.active && pad.pressed('lmb') && soft) this.hardLock = soft;   // iso city: pads keep soft
    // T toggles the viewed target in BFP and releases a cursor-acquired legacy lock elsewhere.
    if (inp.pressed('KeyT')||(chase&&this._combatLockPressed)) {
      if (chase) this.cycleLock(p);
      else this.hardLock = null;
    }
    if (this.hardLock && !this.hardLock.alive) this.hardLock = null;
    if (p.blindT > 0) this.hardLock = null;                       // BLIND breaks the lock (manual §14)
    if(chase)this.validateLock(p);
    this.lockTarget = soft;
    // ⚠ THE HARD LOCK OWNS THE AIM POINT (aaa-05 §8). Facing already follows the lock (below); the
    // aim point did NOT — it came from `soft` (the magnet), which is usually the same fighter but
    // need not be, so you could be locked to A, facing A, and shooting at B. In BFP view the
    // lock is an explicit "this is the target": it owns the point, the facing AND the crosshair, or
    // "locked" means three things at once. The legacy cursor contract remains separate.
    if (chase && this.hardLock && this.hardLock.alive) this.hardLock.center(a3);
    p.aimWorld.copy(a3);p.hasAimWorld=true;
    this.aimPoint.copy(a3).setY(0);
    // pass 1 — a provisional direction from the body, only to resolve the flat `aim` the muzzle
    // needs, and to drive facing.
    p.aim3.set(a3.x - p.pos.x, a3.y - (p.pos.y + 5.8), a3.z - p.pos.z).normalize();
    // facing: hard-locked → always face the lock; otherwise face where you aim
    if (this.hardLock && this.hardLock.alive) p.faceDir(this.hardLock.pos.x - p.pos.x, this.hardLock.pos.z - p.pos.z);
    else p.faceDir(p.aim3.x, p.aim3.z);
    // pass 2 — ⚠ THE SHOT LEAVES THE MUZZLE, SO THE AIM IS MEASURED FROM THE MUZZLE (aaa-05 §6.2).
    // `aim3` above is measured from `pos + 5.8`, but every shot leaves `c.muzzle()` at `pos + aim*3.4`
    // — a camera-independent residual of `3.4·sin θ` (2.94u at 60° pitch, a clean miss on a 2.2u
    // body). `faceDir` has just written `aim`, the only input `muzzle()` needs beyond `pos`, so this
    // is exact and not a one-frame lag. ⚠ Do NOT re-run `faceDir` — pass 1 owns facing; running it
    // twice with two slightly different vectors makes the body yaw chase its own tail.
    if (chase) {
      p.muzzle(_muz);
      p.aim3.set(a3.x - _muz.x, a3.y - _muz.y, a3.z - _muz.z).normalize();
    }
    this._aimFresh = true;   // controlPlayer set the aim point this frame — the post-cameraDrive re-anchor is a no-op

    // ⚠ THE KEYMAP IS READ 49 LINES BEFORE IT USED TO BE DECLARED. `const KM` sat further down this
    // same function while the SECOND WIND branch below already read `KM.strike` — and a `const` is
    // in the temporal dead zone until its declaration, so **every frame you spent downed threw a
    // ReferenceError**: the rally input was never evaluated, you could not get up, and the frame
    // failed at 60Hz behind the try/catch. Measured 1,800 throws in one duel. Declared once, here,
    // above every use.
    const modern=this.modeId==='powerworld';
    const KM = modern?POWERWORLD_CONTROLS:meleeKeymap(p,keymap(SETTINGS.scheme));
    inp.independentCombat=modern;
    if(modern&&!this.powerPicker?.updatePad){for(const [action,field,list] of [['cyclePrimary','_selSlot','primaryChoices'],['cycleSecondary','_selSecondary','secondaryChoices']])if(pad.pressed(action)&&!pad.down('lmb')&&!pad.down('rmb')){
      const choices=selectedAttacks(p,KM)[list],i=choices.indexOf(p[field]);if(choices.length){cancelHeldSlot(p,p[field]);p[field]=choices[(i+1+choices.length)%choices.length];this.hud?.selectSlot(p._selSlot,p._selSecondary);}
    }}
    const soldierControls=soldierControlsActive(p,this);
    const directSelection=!modern&&soldierControls&&selectSoldierAttack(p,inp);
    const mouseCombat=sampleMouseCombat(p,inp,KM,inputDt,k=>pad.down(k)||inp.down((modern?{q:'Digit1',e:'Digit2',f:'Digit3',r:'Digit4'}:{q:'KeyQ',e:'KeyE',f:'KeyH',r:'KeyR'})[k]));
    p._scopeHeld=mouseCombat.scope||(pad.down('scope')&&p.slots[mouseCombat.primary]?.def.type==='rifle'&&p.slots[mouseCombat.primary]?.def.scopeZoom>1);
    if(firearmSightZoom(p)>1)p.slots[mouseCombat.primary]._poseUntil=p.animT+.18;
    for(const key of mouseCombat.cancel){cancelHeldSlot(p,key);if(this.netplay?.active)this.netplay.queueSlot(key,4,p.aim3);}
    if(directSelection||mouseCombat.changed.length)this.hud?.selectSlot(mouseCombat.primary,mouseCombat.secondary);
    // stunned while held or frozen solid — capable heroes auto-escape via the melee system
    if (p.grabbedBy || p.frozenT > 0) {
      if(modern&&p.grabbedBy&&p.frozenT<=0){const holder=p.grabbedBy;
        if(holder._personCarry?.friendly&&(inp.pressed('KeyE')||pad.pressed('grab'))){this.melee.release(holder);return;}
        if((inp.pressed('KeyE')||pad.pressed('grab'))&&holder.grabMode==='front'&&(holder._clinchElapsed||0)<.3)this.melee._breakFree(holder);
        else if(inp.down('KeyE')||pad.down('grab'))holder.grabT-=inputDt*Math.min(2,Math.max(.5,(p.def.strength||5)/(holder.def.strength||5)));
      }
      p.moveDir = { x: 0, z: 0 }; return;
    }
    // SECOND WIND (manual §13): downed is a held breath — the only input that matters is the rally
    if (p.downedT > 0) {
      p.moveDir = { x: 0, z: 0 };
      const holding = m.left || m.right || inp.down(KM.strike || 'KeyV') || inp.down('KeyQ') || inp.down('KeyE')
        || inp.down('KeyH') || inp.down('KeyR')
        || pad.down('lmb') || pad.down('rmb') || pad.down('strike') || pad.down('q') || pad.down('e') || pad.down('r') || pad.down('f');
      this.secondWindHold(p, holding, dt);
      return;
    }

    // --- move (iso-relative; analog on pad, digital on keys) ---
    let ix = 0, iz = 0;
    if (pad.active && pad.moving) { ix = pad.lx; iz = -pad.ly; }
    else {
      if (inp.down('KeyW') || inp.down('ArrowUp')) iz += 1;
      if (inp.down('KeyS') || inp.down('ArrowDown')) iz -= 1;
      if (inp.down('KeyA') || inp.down('ArrowLeft')) ix -= 1;
      if (inp.down('KeyD') || inp.down('ArrowRight')) ix += 1;
    }
    // ⚠ MOVEMENT FOLLOWS THE MOUSE, NOT THE CAMERA (Robert, 2026-07-25: "you face one way and press
    // W and it moves weird — it's supposed to go the way you face").
    //
    // This used to build the move basis from the fixed isometric camera axes, so W always went
    // up-screen no matter where you were looking: aim left, press W, and your character walked
    // sideways relative to their own body. Forward is now the direction you are AIMING, flattened,
    // with A/D strafing across it — the character-relative scheme a twin-stick action game wants.
    // `right` is fwd × up = (-fz, 0, fx), which keeps A/D from inverting when you face south.
    // ⚠ POWERWORLD FLIES OFF THE CAMERA, IN THREE DIMENSIONS, AND THAT IS THE WHOLE FEEL.
    // Two separate things were wrong for a flight brawler. (1) The basis: `this.fwd`/`this.right` are
    // computed ONCE in the constructor from the fixed isometric `camDir`, so behind a chase camera the
    // movement axes are stale — and building forward out of `aim3` instead welds it to whatever you
    // have locked, which is exactly why pressing forward at someone flew you INTO them and then
    // orbited: the direction was re-aimed at them every frame. (2) The Y: `moveDir` was flattened, so
    // vertical was a separate elevator key. Live camera basis, pitch included, and forward means
    // where the camera is looking.
    // ⚠ READER #8 (aaa-03 §1): the player MOVE BASIS — the primary "which grammar is live" tell (§6.1).
    // Air-owned → 3-D, forward-is-look, pitch included; ground-owned → the 2-D `else` branch below.
    // `GAIT_OWNER === 'air'` not `flying`, so standing on the PowerWorld floor gives the GROUND control
    // scheme (push forward and you do NOT climb — that single fact is the grammar) instead of a stuck
    // 3-D basis. During LIFT/AIRBORNE/STOOP it is 3-D; during SETTLE/GROUNDED it is 2-D.
    if (p._openSky && GAIT_OWNER[p.gait] === 'air') {
      // ⚠ WHEN LOCKED, FORWARD IS THE LINE TO THEM — NOT THE CAMERA'S FORWARD. Measured on an
      // approach: the chase camera sits above and off the shoulder, so its forward reads **y = −0.17**
      // even with the target at exactly your altitude. Flying "at" someone therefore sank you ~30u
      // over a hundred units of travel, and because the camera keeps orbiting to hold the framing,
      // forward rotated as you closed and the approach curved into a spiral. Both are cinematic
      // framing doing a flight controller's job. Locked = straight at them; unlocked = the camera is
      // the only thing that knows where you want to go, so it is the basis.
      let fwx, fwy, fwz;
      // ⚠ THE LOCK LIVES ON THE GAME, NOT ON THE FIGHTER. `this.hardLock` is what T, the click path,
      // the reticle and the facing rule all read; `p.hardLock` is nothing at all, so this steered off
      // the camera every time and only looked correct in a harness that had set the wrong field.
      const L = this.hardLock;
      const ld = L && L.alive ? Math.hypot(L.pos.x - p.pos.x, L.pos.y - p.pos.y, L.pos.z - p.pos.z) : 0;
      // ⚠ A LOCK STEERS THE APPROACH, IT DOES NOT HOLD YOU ON TOP OF THEM. Steering all the way in
      // means that the moment you arrive, "forward" flips to point back the way you came and you
      // oscillate around them — measured, a swoop reached 3.2u and then sat there rocking instead of
      // coming out the far side. Inside `PASS`, the lock lets go of the wheel and your own heading
      // carries you through. That is the whole swoop: committed approach, then you are past them and
      // have to turn around like anybody else.
      // ⚠ THE HEADING IS LATCHED ON THE WAY IN, NOT RE-DERIVED. Reading the live velocity inside the
      // pass window is not enough: closing on a target bleeds speed, so by the time you were inside it
      // you were often under the threshold and fell back to a camera that points straight at them —
      // measured, the swoop parked at 10-16u and rocked back and forth on the boundary. Latching the
      // direction you ARRIVED with makes the punch-through unconditional and repeatable.
      const PASS = 16;
      if (L && L.alive && ld > PASS) {
        fwx = (L.pos.x - p.pos.x) / ld; fwy = (L.pos.y - p.pos.y) / ld; fwz = (L.pos.z - p.pos.z) / ld;
        p._swoop = null;
      } else if (L && L.alive) {
        if (!p._swoop) {
          const s = Math.hypot(p.vel.x, p.vel.y, p.vel.z);
          p._swoop = s > 4 ? { x: p.vel.x / s, y: p.vel.y / s, z: p.vel.z / s }
                           : { x: (L.pos.x - p.pos.x) / (ld || 1), y: (L.pos.y - p.pos.y) / (ld || 1), z: (L.pos.z - p.pos.z) / (ld || 1) };
        }
        fwx = p._swoop.x; fwy = p._swoop.y; fwz = p._swoop.z;
      } else {
        p._swoop = null;
        const cf = _v.set(0, 0, 0);
        if (this.world._lookActive) {
          const cp=Math.cos(this.world._lookPitch);
          cf.set(Math.sin(this.world._lookYaw)*cp,Math.sin(this.world._lookPitch),Math.cos(this.world._lookYaw)*cp);
        } else this.world.camera.getWorldDirection(cf);
        fwx = cf.x; fwy = cf.y; fwz = cf.z;
      }
      const rx = -fwz, rz = fwx, rl = Math.hypot(rx, rz) || 1;     // right, flattened
      const d3 = { x: fwx * iz + (rx / rl) * ix, y: fwy * iz, z: fwz * iz + (rz / rl) * ix };
      const l3 = Math.hypot(d3.x, d3.y, d3.z);
      if (l3 > 1) { d3.x /= l3; d3.y /= l3; d3.z /= l3; }
      p.moveDir = d3;
    } else {
    let fx = p.aim3.x, fz = p.aim3.z;
    const fl = Math.hypot(fx, fz);
    if (!chase && fl > 0.001 && SETTINGS.moveRelative !== 'camera') {
      fx /= fl; fz /= fl;
      const dir = _v.set(fx * iz - fz * ix, 0, fz * iz + fx * ix);
      if (dir.lengthSq() > 1) dir.normalize();
      p.moveDir = { x: dir.x, z: dir.z };
    } else {
      const dir = _v.set(0, 0, 0);
      if(chase){
        const fx=Math.sin(this.world._lookYaw),fz=Math.cos(this.world._lookYaw);
        dir.set(fx*iz-fz*ix,0,fz*iz+fx*ix);
      }else dir.addScaledVector(this.fwd, iz).addScaledVector(this.right, ix);
      if (dir.lengthSq() > 1) dir.normalize();   // keep analog magnitude, cap at 1
      p.moveDir = { x: dir.x, z: dir.z };
    }
    }
    // double-tap a move key → this hero's evade tech (dash / blink / sprint / slide / phase — data-driven)
    // ⚠ THE EVADE BASIS IS THE MOVEMENT BASIS (aaa-02 §3.5 change 2 — a straight bug, not a design
    // item). This used to read `this.fwd`/`this.right`, which are computed ONCE in the ctor from the
    // fixed ISOMETRIC camera — so in the aim-relative scheme (the default) and behind the chase
    // camera, a double-tap rolled along axes the movement no longer used: tap LEFT while aiming
    // south and the dodge went screen-left, not your left. The basis here now mirrors the moveDir
    // branch above exactly: aim-relative when selected, camera-relative in BFP,
    // `this.fwd/right` only in the legacy camera scheme (where movement itself still uses them).
    if (!this._tapT) this._tapT = {};
    let bfx, bfz, brx, brz;                       // evade basis: fwd (bfx,bfz), right (brx,brz)
    if (p._openSky && GAIT_OWNER[p.gait] === 'air') {
      const cb = this.world.camBasis;   // ⚠ camBasis, NOT getWorldDirection — the offset carries the spin bias (see the flight-forward note above)
      const cl = Math.hypot(cb.x, cb.z) || 1; bfx = cb.x / cl; bfz = cb.z / cl;
      brx = -bfz; brz = bfx;
    } else {
      let fx = p.aim3.x, fz = p.aim3.z; const fl = Math.hypot(fx, fz);
      if (!chase && fl > 0.001 && SETTINGS.moveRelative !== 'camera') { bfx = fx / fl; bfz = fz / fl; brx = -bfz; brz = bfx; }
      else if(chase){bfx=Math.sin(this.world._lookYaw);bfz=Math.cos(this.world._lookYaw);brx=-bfz;brz=bfx;}
      else { bfx = this.fwd.x; bfz = this.fwd.z; brx = this.right.x; brz = this.right.z; }
    }
    for (const [k1, k2, tx, tz] of TAP_DIRS) {
      if (inp.pressed(k1) || inp.pressed(k2)) {
        const now = performance.now() / 1000, last = this._tapT[k1] || -9;
        this._tapT[k1] = now;
        if (now - last < 0.28 && now - last > 0.04) {
          const ex = brx * tx + bfx * tz, ez = brz * tx + bfz * tz;
          performEvade(p, { x: ex, z: ez }, this);
        }
      }
    }
    // flight + guard keys come from the active control scheme (Options → Control Scheme)
    p.flyHeld = inp.down(KM.up) || pad.down('fly');
    if(p.def.archetype==='soldier'){
      if(inp.pressed('KeyZ')&&p.onFoot&&!p.flying&&!p.grabbedBy&&!p.guarding)p.prone=!p.prone;
      if(inp.pressed('KeyC')||p.flyHeld)p.prone=false;
    }
    p.descendHeld = (modern?(p.onFoot?inp.down('KeyC'):inp.down(KM.down)):(soldierControls ? (p.onFoot?inp.down('KeyC'):inp.down(KM.down)) : inp.down(KM.down))) || inp.down('ControlLeft') || inp.down('ControlRight') || pad.down('descend');
    if(modern&&pad.pressed('evade'))performEvade(p,Math.hypot(p.moveDir.x,p.moveDir.z)>.01?p.moveDir:p.aim,this);
    // THE JKA ROLL TRIGGER (aaa-02 §3.5 change 3): crouch PRESSED while already running on foot
    // fires the fighter's own evade kind ALONG THE RUN. Not a new move — a second door into
    // performEvade: a dodge you reach by already running is a different decision from one you reach
    // by double-tapping, and it costs one `if`. The direction is the VELOCITY (the run you brought),
    // never the aim — a roll goes where your legs were going.
    // ⚠ THE THRESHOLD IS A FRACTION OF *YOUR OWN* RUN, NOT THE PORTED CONSTANT. The spec's direct
    // conversion (200 qu/s → 34.3 wu/s) is ABOVE some fighters' measured run equilibrium (MERC
    // tops out at 33 — drag settles under the 36.7 walk clamp), which makes the roll a control
    // that exists and can never fire (the rung-nobody-can-reach law). JKA's 200 qu/s is ~80% of
    // ITS run speed (250), so the honest port is the RATIO: 0.8 × this fighter's own walk clamp.
    if (!modern&&!soldierControls&&(inp.pressed(KM.down) || pad.pressed('descend')) && p.onFoot) {
      const rv = Math.hypot(p.vel.x, p.vel.z);
      if (rv >= p.speed * 1.08 * 0.8) performEvade(p, { x: p.vel.x / rv, z: p.vel.z / rv }, this);
    }
    const gearInput=updateMovementGears(p,{held:inp.down('ShiftLeft')||inp.down('ShiftRight')||pad.down('dash')||p._gearUiHeld,selectGear:p._gearUiHeld?p._gearUiSelection:undefined,cancelVersion:inp.cancelVersion},inputDt);
    if(gearInput.powerupReady)this.onMovementPowerupReady?.(p);
    const sprintInput={mouse:inp.mouse,down:code=>inp.down(code)||(code==='ShiftLeft'&&(pad.down('dash')||p._gearUiHeld))};
    const sprint=soldierControls?soldierSprint(p,sprintInput,mouseCombat):1;
    p.move(p.moveDir, dt, sprint);
    if(!modern&&p.grabbing&&inp.pressed('KeyJ')){
      if(p._personCarry)this.melee.setdownPerson(p);else this.melee.liftPerson(p);
    }

    // --- melee trifecta — Strike (tap=jab, HOLD=haymaker) · Grab · Guard (V/G/C+X+Mouse4, pad ▢/○/L1) ---
    const np = this.netplay && this.netplay.active ? this.netplay : null;
    if(KM.mouseMelee&&inp.pressed(KM.strike)&&canChangeMouseTool(p,inp)){
      p._selSlot='melee';p._selSecondary='grab';this.hud?.selectSlot('melee','grab');this.hud?.feed('MELEE · LMB punch / heavy · RMB grab / throw · C block','#ffd24a');
    }
    const mouseMelee=!!KM.mouseMelee&&p._selSlot==='melee';
    if ((!KM.mouseMelee&&inp.pressed(KM.strike || 'KeyV')) || pad.pressed('strike') || (mouseMelee&&m.leftEdge)) { this.melee.chargeStart(p); if (np) np.queueMelee('cs'); }
    if ((!KM.mouseMelee&&inp.released(KM.strike || 'KeyV')) || pad.released('strike') || (mouseMelee&&m.leftUp)) { this.melee.chargeRelease(p); if (np) np.queueMelee('cr'); }
    if(mouseCombat.secondary==='grab'&&mouseCombat.buttons.right.pressed){this.melee.grab(p);if(np)np.queueMelee('grab');}
    // G: carrying → THROW it · something heavy in reach → hoist it · otherwise the normal grab
    if(modern)contextualGrab(this,p,{pressed:inp.pressed('KeyE')||pad.pressed('grab'),held:inp.down('KeyE')||pad.down('grab'),released:inp.released('KeyE')||pad.released('grab'),version:inp.cancelVersion},inputDt);
    if (!modern&&((!soldierControls&&inp.pressed(KM.grab || 'KeyG')) || pad.pressed('grab'))) {
      // THE G-CHAIN (altitude plan 3), in priority order. Four behaviours on one key is only
      // acceptable because the PROMPT shows which one is armed — see hud.interactPrompt.
      //   focused interactable ? interact : carrying ? throw : gear underfoot ? pick up
      //   : prop in reach ? hoist : melee grab
      if (p.grabbing) { this.melee.grab(p);if(np)np.queueMelee('grab'); }
      else if (this.doInteract(p)) { /* the world answered */ }
      else if (p._carry) this.throwProp(p);
      else if (this.pickupGear(p)) {}                      // a weapon on the ground beats a hoist (manual §16)
      else if (!this.grabProp(p)) { this.melee.grab(p); if (np) np.queueMelee('grab'); }
    }
    this.melee.guard(p, ((!soldierControls||KM.guard!=='KeyC')&&inp.down(KM.guard)) || inp.mouse.b3 || (!modern&&inp.mouse.b4) || pad.down('guard'));
    if(!modern&&((!soldierControls&&inp.released(KM.grab||'KeyG'))||pad.released('grab')||(mouseCombat.secondary==='grab'&&mouseCombat.buttons.right.released)))this.melee.releaseGrab(p);
    if(!modern&&soldierControls&&inp.pressed('KeyQ')&&p.items.length)this.useItem(p);
    if(!modern&&soldierControls&&inp.pressed('KeyE')&&!p.guarding&&!p.grabbedBy&&!p.frozenT&&!p.staggerT){
      if(!this.doInteract(p))this.pickupGear(p);
    }
    if(modern){
      if(p._gadgetInputVersion!==inp.cancelVersion){p._gadgetInputVersion=inp.cancelVersion;p._gadgetPickerUsed=true;p._gadgetHold=0;}
      if(inp.pressed(KM.item)||pad.pressed('item')){p._gadgetHold=0;p._gadgetPickerUsed=false;}
      if(inp.down(KM.item)||pad.down('item')){p._gadgetHold=(p._gadgetHold||0)+inputDt;if(p._gadgetHold>=.3&&!p._gadgetPickerUsed){p._gadgetPickerUsed=true;this.inventoryPanel?.open();}}
      if((inp.released(KM.item)||pad.released('item'))&&!p._gadgetPickerUsed&&p.items.length)this.useItem(p);
    }
    else if (p._gearHeld&&!p._gearHeld.primary) {             // issued primary fires through LMB
      const gi = { pressed: inp.pressed(KM.item)||(chase&&pad.pressed('item')), held: inp.down(KM.item)||(chase&&pad.down('item')), released: inp.released(KM.item)||(chase&&pad.released('item')), dt };
      if (gi.pressed || gi.held || gi.released) runSlot(p, '_gear', gi, this);
      if (gi.held) this.drainGear(p, dt);
    } else if ((inp.pressed(KM.item)||(chase&&pad.pressed('item'))) && p.items.length) this.useItem(p);   // the carried item (beacon: plant / recall)

    // --- powers (keyboard/mouse OR gamepad) ---
    const busy = p.guarding || p.strikeActive > 0 || p.grabState || p.grabbing || p.meleeCharge > 0 || p.staggerT > 0;
    const infantry=p.def.archetype==='soldier';
    if(!busy&&(inp.pressed(infantry?'KeyR':'KeyY')||pad.pressed('reload')))requestReload(p,p._gearHeld&&!p._gearHeld.primary?'_gear':mouseCombat.primary,this);
    const orK = (code, a) => ({ pressed: inp.pressed(code) || pad.pressed(a), held: inp.down(code) || pad.down(a), released: inp.released(code) || pad.released(a) });
    const intents = {
      lmb: { pressed: !modern&&pad.pressed('lmb'), held: !modern&&pad.down('lmb'), released: !modern&&pad.released('lmb') },
      rmb: { pressed: !modern&&pad.pressed('rmb'), held: !modern&&pad.down('rmb'), released: !modern&&pad.released('rmb') },
      q: orK(modern?'Digit1':'KeyQ', 'q'), e: orK(modern?'Digit2':'KeyE', 'e'), r: orK(modern?'Digit4':'KeyR', 'r'), f: orK(modern?'Digit3':'KeyH', 'f'),
      shift: {pressed:false,held:false,released:false},
      _gear:{pressed:false,held:false,released:false},
    };
    if(infantry&&!modern)intents.r={pressed:pad.pressed('r'),held:pad.down('r'),released:pad.released('r')};
    if(modern)for(const [action,key] of [['lmb',mouseCombat.primary],['rmb',mouseCombat.secondary]])if(intents[key]){
      intents[key].pressed||=pad.pressed(action);intents[key].held||=pad.down(action);intents[key].released||=pad.released(action);
    }
    if(soldierControls&&!modern){
      intents.e={pressed:pad.pressed('e'),held:pad.down('e'),released:pad.released('e')};
      // The tactical shortcuts use the existing authored kit and payment/action
      // path. They never replace the player's selected primary or secondary.
      intents.q={pressed:pad.pressed('q'),held:pad.down('q'),released:pad.released('q')};
      if(inp.pressed('KeyG')){
        const grenade=SLOT_KEYS.find(k=>{const d=p.slots[k]?.def;return d?.type==='projectile'&&d.gear&&d.canister&&d.grav>0;});
        if(grenade)intents[grenade].pressed=true;
        else this.hud?.feed('NO THROWABLE EQUIPPED','#ffd24a');
      }
    }
    for(const [key,it] of Object.entries(mouseCombat.slots)){
      const direct=intents[key];
      for(const edge of ['pressed','held','released'])direct[edge]||=it[edge];
      if(direct.held)direct.released=false;
    }
    // ⚠ THIS WAS A HARD-CODED `KeyF` AND BRAWLER PUTS THE JAB THERE — so in that scheme F both
    // punched and took off, which is exactly the collision `KEYMAPS`' own header forbids ("no two
    // keys in one scheme may collide"). The law was unenforceable because the binding lived outside
    // the table. It is a scheme field now; BRAWLER flies on G, which its own grab move freed up.
    if (inp.pressed(KM.fly || 'KeyF')||(modern&&pad.pressed('flightToggle'))) p.toggleFlight();
    if (np) for (const k of SLOT_KEYS) {          // stream ability intents to the other machine
      if (!p.slots[k]) continue;
      if (intents[k].pressed) np.queueSlot(k, 1, p.aim3);
      else if (intents[k].released) np.queueSlot(k, 3, p.aim3);
    }
    for (const k of SLOT_KEYS) if (p.slots[k]) feedSlot(this, p, k, intents[k], busy, dt);
    if(modern&&p.slots._gear){feedSlot(this,p,'_gear',intents._gear,busy,dt);if(intents._gear.held)this.drainGear(p,dt);}
  }

  // Player 2 (gamepad): right-stick auto-aims, left-stick moves.
  controlPad(f, dt) {
    if (!f || !f.alive || this.matchOver || this.running===false || this.mapCam || this.hud?.titleOpen || this.combatOverlayOpen) { if (f) { resetMovementGears(f);cancelHeldAttacksIfIncapacitated(f);f.moveDir = { x: 0, z: 0 }; } return; }
    cancelHeldAttacksIfIncapacitated(f);
    const pad = this.pad;
    if(f.grabbedBy?._personCarry?.friendly&&pad.pressed('grab')){this.melee.release(f.grabbedBy);f.moveDir={x:0,z:0};return;}
    if (f.grabbedBy || f.frozenT > 0) { f.moveDir = { x: 0, z: 0 }; return; }
    if (f.downedT > 0) {
      f.moveDir = { x: 0, z: 0 };
      const holding = pad.down('lmb') || pad.down('rmb') || pad.down('strike') || pad.down('q') || pad.down('e') || pad.down('r') || pad.down('f');
      this.secondWindHold(f, holding, dt);
      return;
    }
    let tgt;
    if (pad.aiming) {
      const ax = this.right.x * pad.rx + this.fwd.x * (-pad.ry), az = this.right.z * pad.rx + this.fwd.z * (-pad.ry);
      tgt = this.pickTargetDir(f, ax, az);
      if (!tgt) { f.aim3.set(ax, 0.02, az).normalize(); f.faceDir(ax, az); }
    } else tgt = this.nearestFoe(f, f.pos, 200);
    if (tgt) { f.aim3.set(tgt.pos.x - f.pos.x, (tgt.pos.y + 5.2) - (f.pos.y + 5.8), tgt.pos.z - f.pos.z).normalize(); f.faceDir(tgt.pos.x - f.pos.x, tgt.pos.z - f.pos.z); }
    if(tgt)tgt.center(f.aimWorld);else f.aimWorld.copy(f.pos).addScaledVector(f.aim3,500);
    f.hasAimWorld=true;
    const dir = _v.set(0, 0, 0).addScaledVector(this.fwd, -pad.ly).addScaledVector(this.right, pad.lx);
    if (dir.lengthSq() > 1) dir.normalize();
    f.moveDir = { x: dir.x, y:0, z: dir.z };
    if(f._openSky && f.airborne && tgt) {
      f.moveDir.y=clamp((tgt.pos.y-f.pos.y)/45,-.7,.7)*Math.hypot(dir.x,dir.z);
      const len=Math.hypot(f.moveDir.x,f.moveDir.y,f.moveDir.z);
      if(len>1){f.moveDir.x/=len;f.moveDir.y/=len;f.moveDir.z/=len;}
    }
    f.flyHeld = pad.down('fly'); f.descendHeld = pad.down('descend');
    const gearInput=updateMovementGears(f,{held:pad.down('dash')||f._gearUiHeld,selectGear:f._gearUiHeld?f._gearUiSelection:undefined},dt);
    if(gearInput.powerupReady)this.onMovementPowerupReady?.(f);
    f.sprintHeld=f.def.archetype==='soldier'&&f.onFoot&&!f.flying&&!f.prone&&!f.crouching&&!f.guarding&&!f._firearmReload&&!pad.down('lmb')&&!pad.down('rmb')&&pad.down('dash');
    f.move(f.moveDir, dt, f.sprintHeld?f.movementGear.profile.ground[0]:1);
    if (pad.pressed('strike')) this.melee.chargeStart(f);
    if (pad.released('strike')) this.melee.chargeRelease(f);
    if (pad.pressed('grab')) this.melee.grab(f);
    this.melee.guard(f, pad.down('guard'));
    const busy = f.guarding || f.strikeActive > 0 || f.grabState || f.grabbing || f.meleeCharge > 0 || f.staggerT > 0;
    const P = (a) => ({ pressed: pad.pressed(a), held: pad.down(a), released: pad.released(a) });
    const it = { lmb: P('lmb'), rmb: P('rmb'), q: P('q'), e: P('e'), r: P('r'), f: P('f'), shift: {pressed:false,held:false,released:false} };
    for(const [selected,trigger]of [[f._selSlot,'lmb'],[f._selSecondary,'rmb']])if(selected==='shift'){
      for(const edge of ['pressed','held','released'])it.shift[edge]||=it[trigger][edge];
      it[trigger]={pressed:false,held:false,released:false};
    }
    if(it.shift.held)it.shift.released=false;
    for (const k of SLOT_KEYS) if (f.slots[k]) feedSlot(this, f, k, it[k], busy, dt);
  }

  controlBot(f, dt) {
    if(f._meleeTrial){f._meleeTrial.control(f,dt);return;}
    if(f._passengerTransport)return;
    // ⚠ MOOD CHANGES WHAT A BOT WANTS, NOT WHAT IT CAN DO. Anger pulls the preferred range in and
    // pushes aggression up; fear does the reverse; panic makes it erratic; a fleeing fighter simply
    // leaves. None of it grants an ability or bends the physics — the honesty and fairness laws
    // still hold, and a frightened bot is beatable in exactly the ways a frightened person is.
    if (f._psyche && f.ai) {
      const MP = f._psyche;
      f.ai.aggroBias = MP.aggroAdd;
      f.ai.rangeBias = MP.rangeAdd;
      if (f._moodMeleeT > 0) f.ai.rangeBias = (f.ai.rangeBias || 0) - 40;
      if (f._moodFleeT > 0) { f.ai.aggroBias = -1; f.ai.rangeBias = (f.ai.rangeBias || 0) + 120; }
      f.ai.erratic = f._moodErraticT > 0;
    }

    // THE FIRING-RANGE MOVER (2026-07-28, "make targets for me to test combat and shooting"): a
    // target with `_patrol` ping-pongs between two posts under the REAL mover (f.move — friction,
    // footing, the whole physics), so leading a strafing target here is leading a real fighter.
    // No ai — it never fights back, never sees you; it is a target, not an opponent.
    if (f._patrol && f.alive && !f.ai) {
      const P = f._patrol;
      const tx = P.flip ? P.x1 : P.x0, tz = P.flip ? P.z1 : P.z0;
      const dx = tx - f.pos.x, dz = tz - f.pos.z, d = Math.hypot(dx, dz);
      if (d < 2.5) { P.flip = !P.flip; f.moveDir = { x: 0, z: 0 }; }
      else { f.moveDir = { x: dx / d, z: dz / d }; f.faceDir(dx, dz); f.move(f.moveDir, dt); }
      return;
    }
    if (!f.ai || !f.alive) { cancelHeldAttacksIfIncapacitated(f);f.moveDir = { x: 0, z: 0 }; return; }
    cancelHeldAttacksIfIncapacitated(f);
    if (f.grabbedBy || f.frozenT > 0) { f.moveDir = { x: 0, z: 0 }; return; }   // stunned while held / frozen
    // finish an AI haymaker wind-up
    if (f._aiCharge > 0) { f._aiCharge -= dt; if (f._aiCharge <= 0 || f.meleeCharge <= 0) { this.melee.chargeRelease(f); f._aiCharge = 0; } }
    const it = f.ai.intent(dt, this);
    const deployment=f._deploymentTarget;
    const leader=f._squadLeader;
    if(deployment){
      const dx=deployment.x-f.pos.x,dz=deployment.z-f.pos.z,d=Math.hypot(dx,dz);
      it.move=d>2?{x:dx/d,z:dz/d}:{x:0,z:0};it.aimDir=it.move;it.fly=false;it.slots={};it.target=null;
    }
    if(!deployment&&leader?.alive&&!it.target){
      const dx=leader.pos.x-f.pos.x,dz=leader.pos.z-f.pos.z,d=Math.hypot(dx,dz);
      it.move=d>22?{x:dx/d,z:dz/d}:{x:0,z:0};
      if(d>22)it.aimDir=it.move;
      const motion=leader.moveDir,moving=motion&&Math.hypot(motion.x,motion.z)>.2;
      if(moving&&d<14&&d>.01&&(-dx*motion.x-dz*motion.z)/d>.25){
        // Idle followers must yield the leader's travel lane instead of making
        // a solid wall at their follow-distance stop point.
        const side=this.entities.indexOf(f)%2?1:-1;
        it.move={x:motion.z*side,z:-motion.x*side};
      }
      it.fly=f.flightTier>0&&(leader.pos.y>f.pos.y+8||leader.flying&&d>22);
    }
    const chargingLeap=!deployment&&driveTraversalLeapAI(f,it,this,dt);
    if (it.aimDir) f.faceDir(it.aimDir.x, it.aimDir.z);
    // 3D aim. ⚠ `it.target` is ONLY set when the AI can actually see the foe (honesty law), and
    // `it.aimAt` is where it BELIEVES it should shoot — the target's centre plus its own lead error
    // and hand-wander (fairness law). Never aim at the true body centre: that reads as an aimbot.
    if (it.aimAt) f.aim3.set(it.aimAt.x - f.pos.x, (it.aimAt.y + 5.2) - (f.pos.y + 5.8), it.aimAt.z - f.pos.z).normalize();
    else f.aim3.set(f.aim.x, 0, f.aim.z);
    if(it.aimAt)f.aimWorld.set(it.aimAt.x,it.aimAt.y+5.2,it.aimAt.z);
    else f.aimWorld.copy(f.pos).addScaledVector(f.aim3,500);
    f.hasAimWorld=true;
    const dir = _v.set(it.move.x, 0, it.move.z); if (dir.lengthSq() > 1) dir.normalize();
    f.moveDir = { x: dir.x, z: dir.z };
    f.flyHeld = !!it.fly;
    f.descendHeld = f.flying && !it.fly;      // no longer wants to fly → sink back down and land
    const requestedGear=it.movementGear??(f.def.momentumGlide&&it.target&&f.onFoot&&f.ki>20&&f.pos.distanceTo(it.target.pos)>40?2:f.flying&&it.fly?1:0);
    const gearInput=updateMovementGears(f,{held:requestedGear>0&&!f.movementGear?.blocked,selectGear:requestedGear||undefined},dt);
    if(gearInput.powerupReady)this.onMovementPowerupReady?.(f);
    if(f._openSky && f.airborne && it.target) {
      // Visible-target height belongs in the same 3-D movement intent, not an always-on rise
      // button. Once level with an opponent the bot hovers and strafes instead of oscillating.
      f.moveDir.y=clamp((it.target.pos.y-f.pos.y)/32,-.8,.8);
      const len=Math.hypot(f.moveDir.x,f.moveDir.y,f.moveDir.z);
      if(len>1){f.moveDir.x/=len;f.moveDir.y/=len;f.moveDir.z/=len;}
      f.flyHeld=!!f.def.momentumGlide&&Math.hypot(f.vel.x,f.vel.z)>=f.def.momentumGlide.minSpeed;f.descendHeld=false;
    }
    f.move(f.moveDir, dt);

    if(chargingLeap)return; // The committed traversal gesture owns this brief windup.

    // --- defensive reactions to incoming beams / projectiles ---
    // ⚠ FAIRNESS: a bot must not answer a threat on the frame it appears. `_reactT` is its reflex
    // delay (from ai.reflex, so difficulty buys nerves, not precognition) — the threat has to have
    // existed for that long before it may block or juke. Feints and fast openers now WORK.
    if (f._forceBeamT > 0) f._forceBeamT -= dt;
    f._counterCd = (f._counterCd || 0) - dt;
    // ⚠ SHOOT THE CAR. Robert described the exchange in both directions — *"the other person could be
    // throwing little energy blasts at whatever you're throwing at them"* — so a bot that only ever
    // ate a thrown boulder would make half the mechanic single-player-only. It obeys both laws it
    // has to: LINE OF SIGHT (honesty — no shooting a rock through a spire) and a REFLEX DELAY off
    // its own `ai.reflex` (fairness — difficulty buys nerves, never precognition). Under an open sky
    // only; `_flung` is empty in the city so this is one length check per bot per frame there.
    f._flungShotCd = (f._flungShotCd || 0) - dt;
    if (f._openSky && this._flung && this._flung.length) {
      const fl = this.incomingFlung(f);
      const seen = fl && this.canSee(f, { pos: fl });
      if (seen) f._flungT = (f._flungT || 0) + dt; else f._flungT = 0;
      if (seen && f._flungT > (f.ai.reflex || 0.2) && f._flungShotCd <= 0 && !f.grabbing && !f.grabState && !f._carry) {
        const k = ['lmb', 'rmb', 'q', 'e'].find(s => f.slots[s] && slotUnlocked(f,s) && f.slots[s].cd <= 0 && SHOOTDOWN_TYPES.has(f.slots[s].def.type) && f.ki > (f.slots[s].def.cost || 0));
        if (k) {
          // aim at where it IS — a prop is a big slow object and leading it is not the skill test here
          f.aim3.set(fl.x - f.pos.x, fl.y - (f.pos.y + 5.8), fl.z - f.pos.z).normalize();
          f.faceDir(fl.x - f.pos.x, fl.z - f.pos.z);
          runSlot(f, k, { pressed: true, held: false, released: true, dt }, this);
          f._flungShotCd = 0.28 + Math.random() * 0.25;
        }
      }
    } else f._flungT = 0;
    const beamThreat=this.incomingBeam(f),projectileThreat=beamThreat?null:this.incomingProjectile(f,f.ai.seeRange);
    // Observe early, act when the shot approaches. A new shot never inherits
    // another shot's reaction timer, and misses at other altitudes are ignored.
    const imminent=!projectileThreat||projectileThreat.pos.distanceTo(f.pos)/Math.max(1,projectileThreat.vel.length())<.55;
    const reacted=f.ai.observeThreat(beamThreat||projectileThreat,dt,this,imminent);
    if(f._guardThreat&&(f._guardThreat!==beamThreat||f.ai._threat!==beamThreat))f._guardThreat=null;
    if(f._guardThreat&&!f.grabbing&&!f.grabState)f._guardT=Math.max(f._guardT||0,.3);
    if (!f.grabbing && !f.grabState && reacted) {
      const beam = beamThreat;
      if (beam) {
        const bk = ['lmb', 'rmb', 'r', 'e', 'q'].find(k => f.slots[k] && slotUnlocked(f,k) && f.slots[k].def.type === 'beam' && f.slots[k].cd <= 0 && f.ki > 30);
        if (it.ready && bk && f._forceBeamT <= 0 && f._counterCd <= 0 && Math.random() < 0.45) { f._forceBeam = bk; f._forceBeamT = 1.1 + Math.random() * 1.3; f._counterCd = 3.5; }
        else if (f._forceBeamT <= 0) {f._guardThreat=beam;f._guardT=Math.max(f._guardT||0,.85);}
      } else {
        const proj = projectileThreat;
        if (proj && f._forceBeamT <= 0) {
          // juke sideways with the hero's own evade tech, else block
          if (f.def.evade && f.evadeCd <= 0 && Math.random() < 0.35) {
            const vl = Math.hypot(proj.vel.x, proj.vel.z) || 1, side = Math.random() < 0.5 ? 1 : -1;
            performEvade(f, { x: (-proj.vel.z / vl) * side, z: (proj.vel.x / vl) * side }, this);
          } else if (Math.random() < 0.3) f._guardT = Math.max(f._guardT || 0, 0.65);
        }
      }
    }

    // items: bots use their gadgets like players would
    for (let itemIndex=0;itemIndex<f.items.length;itemIndex++) {
      const it = selectedGadget(f,itemIndex); if(!it)continue; const k = it.def.kind;
      if (k === 'beacon') {   // plant healthy, BAIL when it turns
        if (it.state === 'ready' && f.hp > f.maxHp * 0.55 && Math.random() < 0.005) this.useItem(f,itemIndex);
        else if (it.state === 'deployed' && (f.hp < (f._beaconHp || f.maxHp) - 28 || (f.hp < f.maxHp * 0.3 && Math.random() < 0.05))) this.useItem(f,itemIndex);
      } else if (it.state === 'ready') {
        if (k === 'medkit' && f.hp < f.maxHp * 0.5) this.useItem(f,itemIndex);
        else if (k === 'shieldpack' && f.hp < f.maxHp * 0.6 && f._shieldHp <= 0) this.useItem(f,itemIndex);
        else if (k === 'flashbang' && this.nearestFoe(f, f.pos, 18) && Math.random() < 0.03) this.useItem(f,itemIndex);
        else if (k === 'jetcell' && f._jetT <= 0) { const foe = this.nearestFoe(f, f.pos, 90); if (foe && foe.pos.y > 14 && Math.random() < 0.02) this.useItem(f,itemIndex); }
      }
    }

    // CLINCH: the bot aims the throw — at a second foe it can SEE if one stands anywhere useful
    // (throwing one enemy into another is the point of the move) — then hurls. Reflex paces it.
    if (f.grabState === 'clinch' && f.grabbing) {
      f._clinchAimT = (f._clinchAimT || 0) + dt;
      const held = f.grabbing;
      let best = null, bd = 90 * 90;
      for (const e of this.entities) {
        if (e === f || e === held || !e.alive || !this.isFoe(f, e)) continue;
        const d2 = (e.pos.x - f.pos.x) ** 2 + (e.pos.z - f.pos.z) ** 2;
        if (d2 < bd && this.canSee(f, e)) { bd = d2; best = e; }
      }
      if (best) {
        f.faceDir(best.pos.x - f.pos.x, best.pos.z - f.pos.z);
        f.aim3.set(best.pos.x - f.pos.x, (best.pos.y + 4.5) - (f.pos.y + 5.2), best.pos.z - f.pos.z).normalize();
      }
      if (!f._clinchFinisher && !f._clinchPunch && f.meleeCharge<=0 && f._aiCharge<=0 && f._clinchAimT > Math.max(0.28, (f.ai.reflex || 0.2) * 1.7)) {
        f._clinchAimT=0;
        // Strong grapplers drive a lone opponent down; a visible second target
        // keeps the bowling-ball throw valuable. Short holds must finish now.
        if(!best && f.strength>=7 && f.grabT>1.05 && !f._victimEscape) {
          this.melee.chargeStart(f);f._aiCharge=.6/((f.sheet&&f.sheet.chargeRate)||1);
        } else this.melee.grab(f);
      }
      f.moveDir = { x: 0, z: 0 };
      return;   // wrestling IS the turn — no other actions while holding a body
    }
    f._clinchAimT = 0;

    // close-range melee mixups (skip if committing to a counter-beam)
    // ⚠ `!f.strikeActive` — AND A SPENT TIMER IS NEGATIVE, WHICH IS TRUTHY. `strikeActive` counts
    // down past zero and settles at about -0.01, so after a bot's FIRST swing this condition was
    // false for the rest of the match: the mixup never ran again AND `_meleeCd` (decremented inside
    // this block) froze forever. Measured: two fists-only fighters standing 8u apart with clean
    // state threw ONE punch in twenty seconds. **Every bot in the game has been throwing exactly
    // one melee strike per fight**, which is the whole of "melee is non-existent" and "the other
    // person can't get to me". Every one of the other twelve reads of this field in the codebase
    // already says `> 0`; this single site was the odd one out.
    if (f.def.ai?.meleePolicy!=='ability' && !f._forceBeam && !f.grabbing && !f.grabState && !(f.strikeActive > 0)) {
      const foe = it.ready ? it.target : null;
      const d = foe ? Math.hypot(foe.pos.x - f.pos.x, foe.pos.z - f.pos.z) : 99;
      f._meleeCd = (f._meleeCd || 0) - dt;
      // a turtling foe is worth stepping INTO grab range for (the bounce pushes bots out of it)
      const turtleReach = foe && foe.guarding && (foe._guardUpT ?? 0) > 0.35 ? 13.5 : 11;
      const approachReach=f._openSky?meleeApproach(f.def,f.airborne).range:turtleReach;
      const approachDistance=foe?f.pos.distanceTo(foe.pos):Infinity;
      if (foe && (d < turtleReach || approachDistance < approachReach) && f._meleeCd <= 0) {
        f._meleeCd = 0.45 + Math.random() * 0.7;
        const style = f.ai && f.ai.style, r = Math.random();
        // THE TRIFECTA, READ LIVE: a turtling foe gets GRABBED or HAYMAKERED, never jabbed at.
        // (Bots used to spam strikes into a raised shield forever — now they solve it.)
        const turtling = foe.guarding && (foe._guardUpT ?? 0) > 0.35;
        if(d>=turtleReach){
          // Use the same committed strike entry as humans. A distant guard does
          // not authorize a longer grab; the defender can block this approach.
          this.melee.strike(f);
        }
        else if (turtling) {
          if (r < 0.55) this.melee.grab(f);                                    // grab beats guard
          else if (!f._aiCharge && (f.def.meleeTiers ?? 3) >= 2) { this.melee.chargeStart(f); f._aiCharge = 0.6 + Math.random() * 0.5; f._meleeCd = 1.1; }   // or CRUSH it
          else this.melee.grab(f);
        }
        // ARRIVING AT SPEED = PUNCH (momentum melee, manual §10): a bot that closed under cruise
        // cashes the approach in rather than rolling the normal mixup. Never into a raised guard.
        else if (Math.hypot(f.vel.x, f.vel.y, f.vel.z) > 26) { this.melee.strike(f); f._meleeCd = 0.55 + Math.random() * 0.4; }
        else if (style === 'grappler' && r < 0.55) this.melee.grab(f);         // Cell seeks grabs to absorb/heal
        else if (r < (style === 'rusher' ? 0.72 : 0.5)) this.melee.strike(f);
        else if (r < 0.68) this.melee.grab(f);
        else if (r < 0.85 && !f._aiCharge && (f.def.meleeTiers ?? 3) >= 2) {   // wind up a HAYMAKER (guard-crusher)
          this.melee.chargeStart(f); f._aiCharge = 0.55 + Math.random() * 0.55; f._meleeCd = 1.1;
        }
        else f._guardT = 0.5;
      }
    }
    f._guardT = (f._guardT || 0) - dt;
    // GUARD THE WOUNDED ARM (manual §18): a bot carrying a serious arm wound covers up in
    // stray moments — doctrine, not physics, and it reads as protecting the injury.
    if (f._wounds && f._wounds.arm >= 2 && f.staggerT <= 0 && !f.grabState && Math.random() < 0.012) {
      f._guardT = Math.max(f._guardT, 0.45);
    }
    this.melee.guard(f, f._guardT > 0);

    const busy = f.guarding || f.strikeActive > 0 || f.grabState || f.grabbing || f.meleeCharge > 0 || f.staggerT > 0;
    // committed counter-beam (hold the beam slot → creates a beam battle)
    if (f._forceBeam && slotUnlocked(f,f._forceBeam) && f._forceBeamT > 0 && !busy) {
      const first = !f._forceBeamActive; f._forceBeamActive = true;
      runSlot(f, f._forceBeam, { pressed: first, held: true, released: false, dt }, this);
    } else {
      if (f._forceBeamActive) { runSlot(f, f._forceBeam, { pressed: false, held: false, released: true, dt }, this); f._forceBeamActive = false; f._forceBeam = null; }
      if (!busy) for (const k of SLOT_KEYS) if (f.slots[k] && it.slots[k]) feedSlot(this, f, k, it.slots[k], false, dt);
    }
  }

  // The body owns distance; camera right owns stereo. Copy into AudioBus before
  // combat emits sound and again after the final camera solve for the next frame.
  updateAudioListener() {
    if (!this.player) return;
    const camera=this.world.camera,pos=this.player.pos;
    camera.updateMatrixWorld();
    this.audio.listen(pos.x,pos.z,pos.y,_v.setFromMatrixColumn(camera.matrixWorld,0));
  }

  // ---------- main update ----------
  update(dt) {
    // Preparation owns no simulation time and must not first-use a cold shader
    // through either camera. Input/frame cleanup remains owned by the boot loop.
    if(this._frontlinePreparing){this.pad.update();this.audio.sweep();return;}
    dt = Math.min(dt, 0.05);   // parity floor 20fps (was 0.033/30fps — weak GPUs played in literal slow motion)
    const inputDt = dt; // Selection gestures keep their response time during impact slow motion.
    this.pad.powerworld=this.modeId==='powerworld'&&this.humans?.length!==2;this.pad.update();
    this.pad.sampleViewGesture?.(inputDt,this.running&&this.player?.alive&&!this.combatOverlayOpen&&!this.hud?.titleOpen);
    this.powerPicker?.updatePad(inputDt);
    if(this.touch?.portrait){this.audio.sweep();this.world.render();return;}
    this.prepareCombatView(inputDt);
    this.audio.sweep();   // kill orphaned sustained sounds (stuck-tone watchdog) — even on title/pause
    if (!this.running) {
      // THE MAP TOOL owns the camera while it is open — authoring a city is not a paused match,
      // and `follow` would drag the view back to the player every frame.
      if (this.mapCam) { this.world.orbit(this.mapCam); this.world.render(); return; }
      if(combatView(this)==='bfp'&&this.world.camMode==='chase'){this.hud?.updateCrosshair?.(this);this.world.render();return;}
      this.world.follow(this.player ? _v.copy(this.player.pos).setY(6) : _v.set(0, 6, 0), dt);
      this.world.render(); return;
    }
    if (this._slowT > 0) { this._slowT -= dt; dt *= this._slowMul || 1; }   // impact slow-mo
    this.time += dt;
    if (this.mode && !this.matchOver) this.matchT += dt;   // the match clock the news report cites

    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) { this.combo = 0; if (this.hud) this.hud.combo(0); } }
    // style bleeds away when you stop fighting, and the two damage multipliers ride powerBuff
    for (const h of this.humans) {
      const f = h.fighter; if (!f) continue;
      if (f._styleT > 0) { f._styleT -= dt; } else if (f.style > 0) f.style = Math.max(0, f.style - dt * 14);
      if (f._airT > 0) f._airT -= dt;
      const bonus = (f._lastStand ? 0.2 : 0) + ((f._clean || 0) >= 12 ? 0.1 : 0);
      refreshCombatPower(f,bonus);
    }
    if (this.mode && !this.matchOver) this.mode.tick(this, dt);

    // control: P1 (keyboard+mouse), P2+ (gamepad), everyone else = AI
    // View input and the zero-time eye solve ran once above, before any control.
    this.updateAudioListener();
    for(const f of this.entities)f._localTimeScale=this.timeFields.scaleFor(f);
    this.controlPlayer(dt*(this.player?._localTimeScale??1), inputDt);
    for (let i = 1; i < this.humans.length; i++) this.controlPad(this.humans[i].fighter, dt*(this.humans[i].fighter._localTimeScale??1));
    for (const f of this.entities) { if (this.isHuman(f)) continue; if (f.remote) this.controlRemote(f, dt*(f._localTimeScale??1)); else this.controlBot(f, dt*(f._localTimeScale??1)); }

    this.melee.beginContactFrame();
    this.beginBodyContactFrame();
    for (const f of this.entities) {
      if (!f._medChecked) {
        f._medChecked = true;
        // carry-over injuries from the book: small, capped, and announced (manual §18)
        // Campaign replacements use campaign stock, not sanctioned-arena medical penalties.
        if (!this.ms?.threatLab && f.def && f.def.id && !f.def.police && !f.isDummy && !f._frontlineClone && !f._encounterNPC) {
          const inj = injuryOf(f.def.id);
          if (inj) {
            f.maxHp = Math.round(f.maxHp * (1 - Math.min(0.08, inj.debuff || 0.05)));
            f.hp = Math.min(f.hp, f.maxHp);
            f._bookInjury = inj;
            if (this.hud && this.isHuman(f)) this.hud.feed(`CARRYING: ${inj.name} — clears after ${inj.bouts} sanctioned bout${inj.bouts > 1 ? 's' : ''}`, '#ff8a6a');
          }
        }
      }
      f.update(dt*(f._localTimeScale??1), this);
      updateFlightSense(f,dt,this);
    }
    this.resolveBodies();
    this.melee.endContactFrame();
    this.ms?.threatLab?.meleeTrial?.capture();
    for (const f of this.entities) {
      const wasAlive = f._wasAlive !== false;
      if (wasAlive && f.state === 'ko') this.handleKO(f);
      f._wasAlive = f.state !== 'ko';
    }
    for (let i = this.entities.length - 1; i >= 0; i--) if (this.entities[i]._remove) { const e = this.entities[i]; this.scene.remove(e.obj); if (e.dispose) e.dispose(); this.entities.splice(i, 1); }  // survival dead removal

    this.updateItems(dt);
    this.updatePortals(dt);
    settleConstructUpkeep(this,dt);
    this.projectiles.update(dt, this);
    for (let i = this.minions.length - 1; i >= 0; i--) if (!this.minions[i].update(dt, this)) this.minions.splice(i, 1);
    for (let i = this.constructs.length - 1; i >= 0; i--) if (!this.constructs[i].update(dt, this)) this.constructs.splice(i, 1);
    // aaa-06 §7: cap on-screen spark AREA in the close (chase) frame only — 3.5% of frame height,
    // ~1/8 of a fighter — and leave the city (camMode iso) byte-identical at 0 (unbounded).
    this.particles.setMaxPx(this.world.camMode === 'chase' ? PW_FX.ptMaxFrac * (this.world.renderer?.domElement?.height || innerHeight) : 0);
    this.particles.update(dt);
    this.vfx.update(dt);
    if (this.running && this.peds) this.peds.update(dt, this);
    if (this.police) this.police.update(dt);
    this.updateVision(dt);
    for(const f of this.entities)if(f._scoutVehicle||f._aircraftVehicle)f.obj.visible=false;
    this.updateReticle(dt);
    this.updatePlayerMark(dt);
    this.updateSpacingRings();
    this.updateBlinkMark(dt);
    this.updateCarry(dt);
    this.updateThrownBodies(dt);
    this.updateSmoke(dt);
    this.updateSingularity(dt);
    this.updateSpikes(dt);
    this.updateInteractFocus(dt);
    this.updateKoCam(dt);
    this.updateFires(dt);
    this.checkRingOut(dt);
    this.updateSpectate();
    this.updateDecoys(dt);
    if(this._threatRoom?.active)this.weather.updateDomains(dt);
    else this.weather.update(dt);
    this.timeFields.update(dt);
    this.gravityZones.update(dt);
    updateDomes(this, dt);
    updateReshaped(this, dt);
    this.updatePsyche(dt);
    this.updateDrops(dt);
    // LOW ORBIT DEPARTURE (manual §17): a burner-class flier that punches through the ceiling
    // and keeps the throttle open is LEAVING THE THEATER — offer the world map. Once per climb.
    {
      const p = this.player;
      if (this.running && this.mode && p && p.alive && p.def.afterburner && p._burnT > 0.8
          && p.pos.y > BANDS.ceiling + 44 && !this._departing && this.onDepart) {
        this._departing = true;
        this.onDepart(p);
      }
      // ⚠ A GATE THAT REFUSES SILENTLY IS UNDEBUGGABLE. With `verbose on` in the console it names
      // the FIRST condition it failed, once every half second — which is how "shift+space did
      // nothing" stops being a mystery and starts being a sentence.
      if (this.dev && this.dev.verbose && p && p.alive) {
        const why = !p.def.afterburner ? p.def.id + ' is not burner-class'
          : !p.flying ? 'not flying (press F)'
          : !p.cruiseHeld ? 'cruise not held (SHIFT)'
          : p.ki <= 1 ? 'tank dry — ki ' + Math.round(p.ki)
          : (p._burnT || 0) <= 0.8 ? 'burner lighting… ' + (p._burnT || 0).toFixed(2) + 's / 0.80s'
          : p.pos.y <= BANDS.ceiling + 44 ? 'climbing — ' + Math.round(p.pos.y) + 'u of ' + Math.round(BANDS.ceiling + 44) + 'u'
          : this._departing ? 'already offered this climb' : null;
        if (why) this.dev.trace('depart', why);
      }
      if (p && p.pos.y < BANDS.ceiling - 40) this._departing = false;   // re-arm after a real descent
    }
    this.updateThrowArc();
    if (this.mode && !this.matchOver) { const over = this.mode.isOver(this); if (over) this.endMatch(over); }

    this.cameraDrive(dt);   // ⚠ the ONE arbiter — cinematic > chase view > the two-player fit
    this.updateAudioListener();
    // The shared BFP crosshair is projected here after cameraDrive. Two reasons it lives here and
    // not in updateReticle or hud.update (aaa-05 §6.4):
    //   · AFTER cameraDrive: controlPlayer computes the aim point a frame before the camera moves;
    //     projecting it earlier uses a one-frame-stale camera, which reads as ~4px = 1.6u of error
    //     while the chase camera is drifting (a foe overhead with no stable framing).
    //   · in game.update, not hud.update: the reticle harness steps game.update by hand and never
    //     calls hud.update, so the mark has to move here for the gate to be measurable at all.
    const _pl = this.player;
    if (_pl && combatLookActive(this)) {
      // ⚠ REFRESH THE CAMERA MATRIX FIRST. cameraDrive set the camera POSITION and its quaternion via
      // lookAt, but matrixWorld — which getWorldDirection and screenPosOf's .project() both read — is
      // only rebuilt by updateMatrixWorld, normally in render() a frame later. Both the re-anchor and
      // updateCrosshair need the fresh matrix or the mark lands on last frame's camera.
      const _cam = this.world.camera;
      _cam.updateMatrixWorld();
      // ⚠ RE-ANCHOR onto game.player's ACTUAL aim ray when the player is BOT-DRIVEN (spectator cam,
      // AI-vs-AI tests): controlBot writes aim3 but never the aim point, so a stale point would trail
      // the mover. `_aimFresh` is set by controlPlayer, so this is SKIPPED for the human (their traced
      // point is authoritative). A bot aims where a human never can — off-axis, even launched behind
      // its own chase camera — so anchor ON the shot line but IN FRONT of the lens (the distance is
      // free; only the sign of the depth matters). Behind-and-aiming-away has no on-screen mark and is
      // a state a real player is never in.
      if (!this._aimFresh) {
        _pl.muzzle(_muz);
        _cam.getWorldDirection(_camDir);
        const _O = _cam.position;
        const _depthM = (_muz.x - _O.x) * _camDir.x + (_muz.y - _O.y) * _camDir.y + (_muz.z - _O.z) * _camDir.z;
        const _fwdDot = _pl.aim3.x * _camDir.x + _pl.aim3.y * _camDir.y + _pl.aim3.z * _camDir.z;
        const _D = _depthM > 8 ? 4 : (_fwdDot > 0.05 ? clamp((30 - _depthM) / _fwdDot, 4, 4000) : 4);
        this._aim3pt.set(_muz.x + _pl.aim3.x * _D, _muz.y + _pl.aim3.y * _D, _muz.z + _pl.aim3.z * _D);
      }
    }
    this.hud?.updateCrosshair?.(this);
    this._aimFresh = false;
    if (this.player) this.world.updateOcclusion(this.player.pos, dt);   // towers between lens and player go glassy
    if (this.news) this.news.update(dt);   // the crew shoots BEFORE the main pass — their POV render hides under it
    this.world.render();
  }

  /**
   * ⚠ ONE ARBITER FOR THE CAMERA. `mapCam` was already meant to be the "someone else is driving"
   * channel, but it was only ever READ inside `if (!this.running)` — so `updateKoCam` and
   * `updateSpectate`, which both set it during a LIVE match, were writing to nothing while
   * `followHumans` overwrote the view unconditionally every frame. Both features looked dead.
   * (`world.orbitAngle`, which `updateSpectate` reads, is never assigned anywhere in the repo either.)
   *
   * Priority: cinematic/map owner → one-player BFP view → legacy/shared fit.
   */
  cameraDrive(dt) {
    const view=combatView(this),active=combatLookActive(this);
    if(!active)clearForegroundVisibility(this.world);
    if(this.input)this.input.pointerLock=active;
    if (this.mapCam) { if (this.input) this.input.pointerLock = false; this.world.orbit(this.mapCam); return; }
    if (view==='bfp') {
      if(followDeathBody(this))return;
      // Input deltas were consumed once in the pre-control solve. This final solve
      // follows the updated native body while preserving the same view owner.
      if(!active&&this.world.camMode==='chase')return;
      // ⚠ FRAME THE FIGHT ONLY ON AN EXPLICIT HARD LOCK (T). An unlocked camera is YOURS to steer with
      // the mouse — a spectator cam that swings to whatever foe wanders within 220u was fighting the
      // mouse for control (the "I can't aim where I'm looking" feel). No lock → the mouse owns the view.
      let foe = (this.hardLock && this.hardLock.alive) ? this.hardLock : null;
      if (foe && this.fov && (foe._vis ?? 1) < 0.4) foe = null;
      this.world.chase(this.player, foe, dt,'bfp');
      if(!active)clearForegroundVisibility(this.world);
      return;
    }
    if (this.input) this.input.pointerLock = false;
    this.followHumans(dt);
  }

  followHumans(dt) {
    if (this.humans.length >= 2 && this.humans[1].fighter.alive) {
      const a = this.humans[0].fighter.pos, b = this.humans[1].fighter.pos;
      const spread = Math.hypot(a.x - b.x, a.z - b.z);
      this.world.setBaseZoom(clamp(spread * 0.6 + 56, 78, 128));
      this.world.follow(_v.set((a.x + b.x) / 2, 6 + (a.y + b.y) * 0.2, (a.z + b.z) / 2), dt);
    } else if (this.player) {
      this.world.setBaseZoom(78);
      _v.copy(this.player.pos); _v.x += (this.aimPoint.x - this.player.pos.x) * 0.12; _v.z += (this.aimPoint.z - this.player.pos.z) * 0.12;
      this.world.follow(_v, dt);
    }
  }
}

export { ROSTER };









import {validateSquad} from './squad-config.js';

