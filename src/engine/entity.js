import {restorePersonThrowOverlay} from './person-throw-pose.js';
import {beginImpactRecovery,updateImpactRecovery,poseImpactRecovery} from './impact-recovery.js';
import {resolvePhysicalStats} from '../data/physical-stats.js';
import {zombieRifleHit,zombieLegSpeed,poseZombieInjuries} from './zombie-locational-damage.js';
import {loadModularCharacter} from './modular-character.js';
import {anchorStatusIndicators} from './status-indicator-anchor.js';
import {fallingGravity,thrownDrag} from './body-ballistics.js';
import {animateHeldGrip} from './held-grip-pose.js';
import {stopFlightAudio} from './flight-sense.js';
import {migratePowerUpDef} from '../data/power-up.js';
import {canMomentumGlide,steerMomentumGlide} from './momentum-glide.js';
import {updateTraversalLeap,steerTraversalLeap,cancelInterruptedTraversalLeap} from './traversal-leap.js';
import {buildingContact} from './building-contact.js';
import {retireFighterEquipment} from './authored-equipment.js';
import {createPowerUpState,advancePowerUp,retirePowerUp} from '../core/power-up-state.js';
// WAR WORLD: ASCENDANTS — Fighter: articulated figure, stats, physics, flight, combat, ability state.
import { moodMult } from './psyche.js';
import {mergeAuthoredSelection} from '../data/authored-selection.js';
import {loadFighterMotion,invalidateFighterMotion} from './authored-character.js';
import {firearmAmmo,updateFirearmReload} from './firearm-ammo.js';
import {advanceThrowAction,animateThrowAction,restoreThrowPose,cancelInterruptedThrow} from './throwable-action.js';
import {animateReloadPose,restoreReloadPose} from './reload-presentation.js';
import {damageAdmission} from './damage-admission.js';
import {advanceBurstWindow,recordBurstDamage,resetBurstWindow} from './burst-window.js';
import { inflict } from '../data/medical.js';
import { BUILDS, frameOf, applyFrame, figure, buildWeapon } from './figure.js';
import {mountHeldWeapon} from './weapon-emission.js';
export { BUILDS, frameOf, applyFrame, figure, buildWeapon };   // re-exported: existing importers are unaffected
import { updateDupes, updatePossession, updateElastic, updateWallCrawl, updateTk, updateMimic, updateMount, updateVisionMode, pulseDupes, dupePool } from './systems2.js';
import { updateSize, updateInvisible, updateRegen, updateBanish, beginRegen } from './systems.js';
import * as THREE from 'three';
import {registerShieldContact,configureShieldSurface} from './shield-surface.js';
import { clamp, damp, TAU, lerp, BANDS, bandOf, PW_KB, PW_AIR, GAIT, GAIT_OWNER } from '../core/util.js';
export { BANDS, bandOf, setBands } from '../core/util.js';
import { ARENA as ARENA_FALLBACK } from './world.js';   // ⚠ review item 7: the FROZEN flagship value.
// It is a last-resort default ONLY — every live read must go through world.ARENA, which is
// per-city. A bare import silently clamps a Mega City back to the flagship's 240.
import { Ragdoll } from './ragdoll.js';
import { buildTentacles } from './tentacles.js';
import {updateWebSnare,updateWebSnareVisual,poseWebSnare} from './web-snare.js';
import {cancelInterruptedRush} from './rush-safety.js';
import { bakeSheet } from '../data/ranks.js';
import { setRim } from './figure.js';
import { heroModelOf } from '../data/hero-models.js';
import {canUseFlight} from './mobility-policy.js';
import {loadSoldierEquipment} from './clone-equipment.js';
import {updateSoldierLoadoutPresentation} from './soldier-loadout-presentation.js';
import {restoreBowEquipment,updateBowAttachments} from './bow-pose.js';
import { clearSlotFx,cancelHeldSlot } from './abilities.js';
import {retireOwnedConstructs} from './construct-policy.js';
import { steerFlight, ownsFlightVelocity } from './flight-motion.js';
import { animateFlight } from './flight-pose.js';
import { ridingBoard, syncFlightBoard } from './board-flight.js';
import {animateGround,restoreGroundBase,animateGroundTransition} from './ground-motion.js';
import {animateCrouchPose,restoreCrouchPose,updateCrouchBounds} from './crouch-pose.js';
import {animatePronePose,restorePronePose,updateProneBounds} from './prone-pose.js';
import {animateJump,usesFlightPose} from './jump-motion.js';
import {groundHeading,animateDirectionalAim,restoreDirectionalAim} from './directional-pose.js';
import {animateFreeLookHead,restoreFreeLookHead} from './free-look-head.js';
import { animateCombatAim, restoreCombatBase } from './combat-pose.js';
import {advanceAbilityMeleePose,cancelInterruptedAbilityMeleePose} from './ability-melee-pose.js';
import {restoreChestAim} from './chest-pose.js';
import {restoreSpineAim} from './spine-pose.js';
import {clearWebControl,clearWebControlsFromSource,updateWebControl,webControlMoveMultiplier} from './web-control.js';
import {restoreGroundAimSupport} from './ground-aim-support.js';
import { restoreAuthoredStrikeBase } from './strike-motion.js';
import {animateHands} from './hero-hand.js';
import {castingMoveScale,rangedPoseChannels} from './cast-channels.js';
import {syncChargePresentation} from './power-emission.js';
import { animateCape, syncHeadCover, bendArm } from './hero-rig.js';
import { updateLimbSurfaces } from './hero-limb-surface.js';
import {updateHeroSkin,disposeHeroSkin} from './hero-skin.js';
import { queueHitReaction, restoreHitReaction, animateHitReaction } from './hit-reaction.js';
import {restoreLostControlPose,animateLostControlPose} from './lost-control-pose.js';
import {createNaniteState,advanceNanites,resetNanites,retireNanites,damageNanite} from './nanite-state.js';
import {updateNaniteAudio} from './nanite-audio.js';
import {claimNaniteContact} from './nanite-forearms.js';
import {presentNanites} from './nanite-forearms.js';
import {slotUnlocked} from '../data/progression.js';
import {attackIdentity} from '../data/attack-tuning.js';
import {poseNaniteForearms,restoreNanitePose} from './nanite-pose.js';
import {animateRiflePose,restoreRiflePose} from './rifle-pose.js';
import {updateWebZip,presentWebZip} from './web-zip.js';
import {sweepFighterEnvironment} from './fighter-environment-contact.js';
import {isTransportingPerson,personCarrySpeed,syncPersonCarry} from './person-carry.js';
import {fallDamage,prepareWindBody,applyBodyWind,windMoveScale,windImpactSpeed,reconcileWindCarry} from './weather-body.js';
import {unitsToMeters} from '../core/world-units.js';
import {guardEnergyRate} from '../data/guard-energy.js';
import {createMovementGears,resetMovementGears,movementGearBlocked,movementTravelScale,steerGroundGear} from '../core/movement-gears.js';
import {clearFlightFeet,poseFlightFeet} from './flight-feet.js';

// power tiers (Super-Saiyan-style): level 1–3 = I, 4–6 = II, 7–9 = III, 10 = MAX
export function tierOf(level) { return level >= 10 ? 4 : level >= 7 ? 3 : level >= 4 ? 2 : 1; }
export const TIER_COLORS = ['#ffffff', null, '#ffd24a', '#ffedb0', '#ffffff'];   // [tier] — null = hero accent

let _fid = 1;
const copyAppearance = value => value && typeof value === 'object'
  ? Object.fromEntries(Object.entries(value).map(([key,item])=>[key,copyAppearance(item)])) : value;
const freezeAppearance = value => {
  if(value && typeof value==='object'){for(const item of Object.values(value))freezeAppearance(item);Object.freeze(value);}
  return value;
};
const appearanceKey = value => JSON.stringify(value, function(key,item){
  return item && typeof item==='object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(k=>[k,item[k]])) : item;
});
function formAppearance(base,form){
  const model={...copyAppearance(base.model),...copyAppearance(form?.model)};
  const assets=mergeAuthoredSelection(base.model.assets,form?.model?.assets);
  if(assets!==undefined)model.assets=assets;
  if(base.model.wake||form?.model?.wake)model.wake={...base.model.wake,...form?.model?.wake};
  // Authored pose targets belong to their flight language. A form that chooses
  // another language starts from that language's defaults, unless it authors poses.
  if(model.flightStyle!==base.model.flightStyle&&!form?.model?.poses)delete model.poses;
  return {name:form?.name??base.name,model,
    frame:{...base.frame,...form?.frame},colors:{...base.colors,...form?.colors}};
}
function figureResources(roots){
  const resources=new Set();
  for(const root of roots)root?.traverse(o=>{if(o.isInstancedMesh&&o.userData.naniteOwned)resources.add(o);if(o.geometry)for(const g of o.geometry.palmVariants||[o.geometry])resources.add(g);if(o.skeleton)resources.add(o.skeleton);for(const m of [].concat(o.material||[]))resources.add(m);});
  return resources;
}
const _anchor = new THREE.Vector3();
const _handW = new THREE.Vector3();   // scratch for the fist's world position (the measured swing, §4.6)
// THE JUMP (aaa-02-ground.md §3.4) — the game's FIRST jump. `Space` is the flight key in all four
// schemes; on the GROUND it now jumps, and the same key HELD past the apex (or pressed again in the
// air) is takeoff. One key, two meanings, disambiguated by FOOTING. JUMP_VEL is derived to match
// JKA's jump apex IN BODY LENGTHS under our 60 wu/s² gravity, not ported: apex 0.564 body heights →
// sqrt(2·60·(0.564·9.6)) = 25.5 wu/s → apex 5.42 wu, airtime 0.85 s.
const JUMP_VEL = 25.5, GRAVITY = 60;
// COYOTE (§2.3) — feet count as "on the ground" for this long after leaving a lip. DERIVED, not
// picked: ≥ 2 clamped sim frames (the 0.05 s slow-mo cap → 0.10 s) and inside one frame of the jab's
// 0.10 s startup, so a move never visibly fires from ground state after the ground is gone.
const COYOTE = 0.12;
// GROUND STOPSPEED (§3.2) — Q3's pm_stopspeed 100 qu/s = 17.1 wu/s. Above it friction is proportional
// (≈ the exponential we already run); below it the drop becomes a CONSTANT (17.1·6 = 102.6 wu/s²), so
// the last speed is shed in 0.167 s — the crisp Quake stop instead of an exponential's endless tail.
// GROUND CLASS ONLY: the open-sky coast (§3.5) and every launched/thrown/slide class keep exp decay.
const STOP_SPEED = 17.1;
// flight tuning — levitation model: hold to rise, release to HOVER, descend key to sink.
// THE OPEN-SKY GLIDE. One coefficient for all three axes, so releasing the stick decays the same way
// whichever direction you were going — see `move()` and the `_openSky` coast branch. PowerWorld only.
const AIR_DRAG = 1.8;
const FLY_RISE = 46, FLY_SINK = 26, FLY_TAKEOFF = 19, FLY_HOVER_BOB = 3.2;   // rise 30→38 (2026-07-24 feel pass: 'flying is really slow'); SINK stays 26 — it is the deck-servo speed cap

// ---- weapon models — one registry, every archetype: mounts on the DRIVEN fist meshes so
// poses and the ragdoll carry them. Built along the arm's -Y axis (same convention as the rifle).
// GEAR PROFICIENCY (manual §16): ANYONE can pick up the SMG — soldiers are just better with
// it. Derived like resistOf so no hero is hand-authored; `def.gearProf` always wins. Word
// boundaries are load-bearing (the frameOf lesson — 'imp' once matched 'simpler').
// THE WEIGHT LADDER (manual §21): everything liftable has TONNAGE, and STRENGTH is a lift
// CAPACITY curve — human below six, superhuman past it (STR6 ≈ a sedan, STR8 ≈ a truck,
// STR10 ≈ an airliner). Derived, never hand-authored; the ratio capacity/weight drives
// carry speed, throw speed and impact — all throwable, none equally.
export const PROP_WEIGHT = { lamp: 0.3, rock: 0.5, tree: 1.1, car: 1.9, plane: 24 };
// =================================================================================================
// THE STRENGTH LADDER lives in data/scale.js now — ONE table, read by everything.
//
// ⚠ IT USED TO LIVE HERE, AS AN ELEVEN-ENTRY ARRAY, and that was the whole problem. `def.strength`
// is 1–10, so a lift ladder keyed on it can only ever have ten rungs — which meant every character
// from "throws a car" to "throws an airliner" had to fit between 8 and 10, and RAGE, TITAN, NOVA
// and MAJESTY all rounded to the same lifting power. Robert's ladder runs 1–4999 with fifteen named
// bands, and it is now the real axis: `def.rank`. The 1–10 stays as the AUTHORING shorthand and as
// the combat multiplier (melee damage, knockback resistance, ice break-out) — those are tuned and
// are deliberately untouched. What moved to rank is what a fighter can LIFT and what they are
// CALLED. See data/scale.js for why the two of his tables are kept as two tables.
//
// TWO FRONT DOORS, ONE LADDER: `liftCapacityOf(def)` is the real one; `liftCapacity(str)` is the
// 1–10 shim for callers that only have a number. Both end up in `liftTonsOfRank`, so they cannot
// disagree — which is exactly the failure mode the old duplicated array had.
// ⚠ IMPORT *AND* RE-EXPORT. `export … from` is a pure pass-through — it does NOT bind the names in
// this module's scope, so the functions below would be reading undefined.
import { LB_PER_TON, rankOf, liftTonsOfRank, rankForTons, strengthFromRank } from '../data/scale.js';
export { LB_PER_TON, rankOf, bandOf as rankBandOf, designationOf, threatOfRank, comparisonOf, csOf,
         liftTonsOfRank, rankForTons, strengthFromRank, knockbackOf, rankLine } from '../data/scale.js';
export const liftCapacityOf = (def) => liftTonsOfRank(rankOf(def));
export const liftCapacity = (str) => liftTonsOfRank(rankOf({ strength: str ?? 5 }));
export const liftLb = (str) => liftCapacity(str) * LB_PER_TON;
export const strengthRank = (str) => rankOf({ strength: str ?? 5 });

// People have weight too — the person-vs-person battle. Frame, plate and bulk all count.
// ⚠ A PERSON'S WEIGHT HAS A STRENGTH EQUIVALENT — Robert: "people weight should have str
// equivalent." So a body is priced on the SAME ladder as everything else: `bodyLiftRank` is the
// RANK you need to pick this person up, derived from their weight rather than asserted. That is
// what makes "you have to be strong enough to grab them" a real rule instead of a number someone
// chose — RAGE cannot be scooped up by a fighter who cannot lift his mass.
export function bodyWeight(def) {
  if(Number.isFinite(def?.weightLb)&&def.weightLb>0)return def.weightLb/LB_PER_TON;
  const str = (def && def.strength) ?? 5;
  const lb = 120                                   // a light adult, before anything else
    + str * 11                                     // muscle scales with the rank
    + (def && def.metal ? 620 : 0)                 // a machine is mostly machine
    + Math.max(0, (((def && def.hp) || 100) - 100)) * 1.9;   // bulk reads off the hull
  return +(lb / LB_PER_TON).toFixed(3);
}
export const bodyWeightLb = (def) => Math.round(bodyWeight(def) * LB_PER_TON);
export const bodyLiftRank = (def) => rankForTons(bodyWeight(def));
// kept for anything still speaking 1–10 — same ladder, expressed in the old units
export const liftStrFor = (tons) => strengthFromRank(rankForTons(tons));
export const bodyLiftStr = (def) => liftStrFor(bodyWeight(def));

export function weaponProficiency(def) {
  if (def.gearProf) return def.gearProf;
  const txt = `${def.role || ''} ${def.title || ''} ${def.blurb || ''}`.toLowerCase();
  if (/\b(soldier|arsenal|ranger|marksman|sniper|operator|tactical|hunter|agent|jackal|sharpshooter)\b/.test(txt)) return 1.25;
  if ((def.strength ?? 5) >= 9) return 0.7;            // a monster never learned to aim — why would he
  if (def.meleeTiers === 3 || /\b(martial|trained|detective|vigilante)\b/.test(txt)) return 1.05;
  return 1.0;
}


// per-hero FLIGHT SPEED (creator ruling: "certain people can just fly faster than others").
// Multiplies air speed for tier-3 fliers; everyone else defaults 1. def.flySpeed overrides.
const FLY_SPEEDS = {
  majesty: 1.3, torch: 1.28, olympus: 1.25, sol: 1.2, vanguard: 1.2, apex: 1.2, stormcall: 1.2,
  kano: 1.15, vega: 1.15, nova: 1.12, specter: 1.1, tempest: 1.1, marshal: 1.1, mystward: 1.08,
};
// ALT_BANDS is the PRESENTATION face of the layer contract: names and colours for the ring,
// the ladder and the radar. ⚠ Review item 9: it used to carry its own `max` numbers, which were
// dead (nothing read them) and DISAGREED with the per-city bands the moment a city had a 250u
// spire. The thresholds now DERIVE from the one live source — `BANDS` in core/util.js — via a
// getter, so a copy can never drift again.
export const ALT_BANDS = [
  { name: 'GROUND', c: '#8fe08a', get max() { return BANDS.ground; } },
  { name: 'BUILDING', c: '#ffd24a', get max() { return BANDS.building; } },
  { name: 'SKY', c: '#7fe6ff', get max() { return BANDS.sky; } },
  { name: 'CLOUDS', c: '#ffffff', get max() { return Infinity; } },
];
// bandOf/BANDS live in core/util.js (re-exported above) — per-city, set by world.rebuildCity.

// ---- DAMAGE TYPES (docs/COMBAT_MANUAL.md §3) ----------------------------------------------
// Every damage event carries a `dtype`. Every fighter carries a resistance table. ONE multiplier,
// applied at the takeDamage choke point, so a defence can never be bypassed by a new ability
// forgetting about it. Missing entry = 1.0 = full damage.
const _BLOOD = new THREE.Color('#3a0d0d');   // the suit-darkening target — bleeding's palette, nobody else's
import {DTYPES, DTYPE_INFO, DOT_DTYPE, resistOf} from '../data/damage-types.js';
export {DTYPES, DTYPE_INFO, DOT_DTYPE, resistOf};

// per-hero silhouette flourishes (all mounted on driven meshes so the ragdoll carries them).

export class Fighter {
  constructor(def, opts = {}) {
    def=resolvePhysicalStats(def);
    def=migratePowerUpDef(def);
    this.id = _fid++;
    this.def = def;
    this.name = def.name;
    this.team = opts.team ?? 1;
    this.isPlayer = !!opts.isPlayer;
    this.isDummy = !!opts.dummy;

    this.parts = figure(def);
    this.obj = this.parts.g;
    this._figureRoots = [...this.obj.children];
    this._formBase = freezeAppearance({name:def.name,model:copyAppearance(heroModelOf(def)),frame:copyAppearance(frameOf(def)),colors:copyAppearance(def.colors||{})});
    this._formKey = appearanceKey(this._formBase);
    this._pendingForm = undefined;
    this._retiredFormResources = new Set();
    this._formResourceWatch = new Set();
    this._formResourceT = 0;
    this._formDisposed = false;
    if(typeof document!=='undefined'&&heroModelOf(def).equipment==='soldier')
      this._soldierEquipmentLoading=loadSoldierEquipment(this).catch(error=>{this._soldierEquipmentError=error.message;console.error('Soldier equipment',error);});
    // ⚠ A CHARACTER RIG IS NOT LEVEL GEOMETRY. auditSurfaces exists to find z-fighting in the WORLD,
    // and a figure is dozens of deliberately interpenetrating solids (a head inside a neck, a fist
    // inside a sleeve). Left unmarked, every extra fighter added a handful of phantom "problems"
    // and the audit's signal drowned in its own crowd. Marked here, at the one place a rig is made.
    this.obj.userData.rig = true;
    this.pos = this.obj.position;
    this.pos.set(opts.x || 0, 0, opts.z || 0);
    this.spawn = this.pos.clone();
    this.vel = new THREE.Vector3();
    this.facing = 0;            // radians around Y (body orientation)
    this.aim = new THREE.Vector3(1, 0, 0); // world dir on XZ (facing)
    this.aim3 = new THREE.Vector3(1, 0, 0); // full 3D attack direction (adjusts up/down for height)
    this.aimWorld = new THREE.Vector3(); this.hasAimWorld = false;

    this.maxHp = def.hp || 100; this.hp = this.maxHp;
    this.maxKi = def.ki || 100; this.ki = def.energyInfinite ? (def.ki || 100) : this.maxKi * 0.5;
    this.speed = def.speed || 30;
    this.radius = 2.2;

    this.state = 'idle';       // idle|move|cast|hit|ko|charge
    this.stateT = 0;
    this.hitstop = 0;
    this.hitFlash = 0;
    this.castPose = 0;         // 0..1 arms-forward blend
    this._castPoseRanged = false; // owner of the most recently refreshed cast pose
    this.punchPose = 0;
    this.koT = 0;
    this.invuln = 0;
    this.powerBuff = 1;        // damage/speed multiplier (levelMult × active transform)
    this.buffT = 0; this.buffName = '';
    // --- progression / scoring (gamified combat) ---
    this.level = 1; this.xp = 0; this.xpNext = 100; this.levelMult = 1;
    this.score = 0; this.kills = 0; this.streak = 0;
    this.lastHitBy = null; this.lastHitT = 99; this.lastKillT = 99;
    this.flyHeld = false;       // ascend intent (SPACE / pad ✕ held)
    this.descendHeld = false;   // descend intent (Ctrl / pad held)
    this.flying = false;        // levitation mode — gravity suspended, you hover
    this._flyPrev = false;      // rising-edge detector for take-off
    // THE GAIT MACHINE (aaa-03). `gait` is the DERIVED answer to "where am I with respect to the
    // floor" — six states, one writer (`_updateGait`), computed every frame. It REPLACES `flying`
    // as the proxy the ground-vs-air readers consult, and it is correct in the city too (in the
    // city the deck servo keeps a flier off the floor, so ground-owner ⟺ !flying there). `flying`
    // stays the physics source of truth for the flight chain; `gait` is derived from it, not beside.
    this.gait = GAIT.GROUNDED;
    this._gaitFly = false;      // flying at the END of the last _updateGait — the takeoff rising edge
    this._liftT = 0; this._liftBase = 0; this._settleT = 0;   // LIFT ramp clock/base, SETTLE ramp clock
    this._gaitCrash = 0;        // set by _slam when it APPLIES: "somebody drove me into geometry" (T8)
    this.onBlock = false;
    // FOOTING (aaa-02 §2.3): the REAL ground state. `flying`/`gait` answer "which grammar owns me";
    // `onFoot` answers "are my feet on something" — which is what jump, crouch, the roll and the
    // MEASURED SWING (melee.js swingMult, dormant until this is set) all need. `_handSpd` is the
    // fist's world speed, computed each frame in the poser.
    this.onFoot = true; this.footT = 0; this.airT = 0;
    // ⚠ `_landT` MUST INIT TO 0 (the ctor-init law — same trap as the AI reaction fields): it is
    // first WRITTEN by a hard landing, and the jump gate reads `_landT <= 0` — `undefined <= 0` is
    // FALSE in JS, so a fighter who had never hard-landed could never jump. Found by a Math.max spy
    // after three reads of `(_landT||0)` masked it as "0.00" — coerce in DISPLAYS, never in GATES.
    this._landT = 0;
    this.crouching = false;                                  // CROUCH (§3.6): KM.down while onFoot
    this.prone = false;
    this._jumpT = 0;                                         // jump apex clock — while > 0, holding Space does not take off
    this._handSpd = 0; this._handPrev = null;               // measured swing (§4.6)
    this.animT = Math.random() * 10;

    // per-slot ability runtime state
    this.powerUp=createPowerUpState(def);
    this.slots = {};
    for (const k in def.abilities) this.slots[k] = { def: def.abilities[k], cd: 0, charging: false, chargeT: 0, active: null, sustainT: 0 };
    for(const slot of Object.values(this.slots))firearmAmmo(slot);
    this._nanites=createNaniteState(def.abilities);
    this.globalCast = 0; // small global cast lockout

    // --- melee trifecta state (Strike / Guard / Grab) ---
    this.guarding = false; this.guardMeter = 1; this.staggerT = 0; this.guardBreakT = 0; this._blocked = 0;
    this.stunT = 0; this._stunImmune = 0; this._burst = 0; this._burstT = 0;   // THE STUN: burst damage in a short window
    this.grabbing = null; this.grabbedBy = null; this.grabState = null; this.grabT = 0; this.grabMode = '';
    this._meleeBuffer=null;this._meleeQueuedHeld=false;this._clinchFinisher=null;this._clinchPunch=null;this._clinchStrikeCd=0;
    this.strikeIdx = 0; this.strikeActive = 0; this.strikeCd = 0; this.comboWin = 0; this.strikeHit = null;
    this.phase = false;                 // energy-intangible
    this.poseStrike = 0; this.poseGuard = 0; this.poseGrab = 0;
    // AI reaction state (must start at 0, not undefined — guard/counter logic compares <= 0)
    this._forceBeamT = 0; this._forceBeam = null; this._forceBeamActive = false; this._counterCd = 0; this._meleeCd = 0; this._guardT = 0; this._aiCharge = 0;
    // double-tap evade + energy-drained state
    this.evadeCd = 0; this.sprintT = 0; this.sprintMult = 1.6; this._slideT = 0; this.drainedT = 0;
    this.flySpeed = def.flySpeed || FLY_SPEEDS[def.id] || 1;   // who owns the sky
    this._deckSnap = -1; this._climbBand = -1;                 // the four-deck ladder's dock state
    this._grapple = null; this.hanging = null; this.gliding = false;   // grapnel line / ledge-hang / mechanical wings
    this.chargingKi = false; this._chargeT = 0; this._chargeScanT = 0; this._safeDist = 1e9;   // the POWER CHARGE (DBZ ruling)
    this.cruiseHeld = false;                                    // SHIFT while flying = sustained cruise
    this.movementGear=createMovementGears();
    this.burstT = 0;            // dash-burst window — move() doesn't clamp velocity back to walk speed
    this._sprintThrough = false; this._sprintLightning = false;   // VOLT: run through cover, blue lightning wake
    // slam physics: launchT > 0 = recently knocked/thrown → wall/ground impacts hurt (dashing into walls doesn't)
    this.launchT = 0; this._slamCd = 0;
    this._thrownT = 0; this._thrownBy = null;   // aimed-throw body-as-projectile window (manual §11)
    this._mvX = 0; this._mvZ = 0; this._mvT = 0;   // live move intent (directional descent)
    // WAVE 3 AIR (aaa-01 §4/§5): the open-sky flight momentum state. `_airStop` is the C5 stopspeed
    // threshold (stamped in move() from the fighter's base air wish speed); `_driftSgn` latches
    // PM_Drifting's lateral sign through a straight-line release (Math.sign(0) is 0 — without the
    // latch the bank flickers off, aaa-01 §4.4 step 4).
    this._airStop = 0; this._driftSgn = 0; this._driftK = 0;
    this.shockT = 0; this._shockImmune = 0;                              // ROADMAP 5 · shock
    // ROADMAP 4 · ARMOUR AS A THIRD BAR — a real pool, not just a flat subtraction. Derived
    // from what the fighter IS, so nothing is hand-authored: plate is plate.
    this.armorMax = (def.armor || 0) + (def.metal ? 26 : 0);
    this.armor = this.armorMax; this._armorCalm = 0;
    this._siphon = null; this._bloodBuff = null; this._riposte = null;   // Tier-2 buff lanes
    this.sizeScale = 1; this._sizeT = 0; this._sizeMight = 1; this._sizeKb = 1; this._sizeLift = 0;
    this._invis = null; this._regen = null; this._regenReady = null; this._banished = null;   // Tier-3 states
    this._dupes = null; this._dupeOf = null; this._possessing = null; this._elastic = null;
    this._tk = null; this._mimic = null; this._mount = null; this._visionMode = null;
    this._onWall = null; this._climb = 0; this._reachBonus = 0; this._inert = false;
    this._bleed = 0; this._bleedStill = 0; this._bleedAcc = 0; this._bleedTick = 0; this._bleedSrc = null; this._suitHex = null;   // BLEEDING (manual §12)
    this.downedT = 0; this._swHold = 0; this._secondWindUsed = false;   // SECOND WIND (manual §13) — a player's drama, never a bot's
    this._disarmT = 0; this._gearHeld = null; this._gearMesh = null;    // THE GEAR SYSTEM (manual §16)
    this._hand = 1; this._handT = 0;                                    // THE HANDS (engine/hands.js) — slot 1 is always fists
    this._wounds = { arm: 0, leg: 0, torso: 0 }; this._woundT = { arm: 0, leg: 0, torso: 0 };   // ZONED WOUNDS (manual §18)
    this.sleepT = 0; this._sleepImmune = 0; this._sleepK = 0;   // SLEEP (manual §14): fold slowly, wake on ANY damage
    this.blindT = 0;                                            // BLIND (manual §14): smoke owns the eyes
    this.metal = !!def.metal;   // robot: sparks when hit, foot exhaust, sturdier vs knockback
    this.tier = 1;              // power tier (from level) — drives aura color + HUD meter size
    this.tentacles = null;      // built lazily on first update (needs the scene)
    // strength (1–10, default 5): melee damage up, knockback/beam-shove down, faster freeze break-outs
    this.strength = def.strength ?? 5;
    // the SHEET — seven ranked attributes + talents baked to flat multipliers (data/ranks.js).
    // This is the D&D layer: FGT/AGL/MGT/VIG/INT/AWR/RES all do real engine work.
    this.sheet = bakeSheet(def);
    // ⚠ the rim is injected at construction and driven by a uniform (figure.js) — set the strength
    // from the live setting HERE rather than re-injecting, which would recompile every material.
    const rimWorld = opts.world || (typeof game !== 'undefined' ? game?.world : null);
    setRim(this.parts, opts.rimK ?? rimWorld?._rimK ?? 0.8);
    this.resist = resistOf(def, this.sheet);
    // WHAT ARE YOU MADE OF — drives landing/impact sound. Derived, with def.body as the override.
    this.body = def.body || (def.metal ? 'metal' : def.phase ? 'energy' : def.tentacles ? 'insect' : 'flesh');       // damage-type resistances, derived + def overrides (manual §3)
    this._corrode = 0;                 // ACID: seconds of armour corrosion left
    this._corrodeAmt = 0;              // how much armour is currently eaten
    this.attrs = this.sheet.attrs;
    this._shieldHp = 0; this._jetT = 0; this._jetPrev = 0;   // gadget states (shield cell / jump jets)
    // flight expertise: 0 = grounded (leapers) · 1 = clumsy forward flier (can't hover — Greatest
    // American Hero) · 2 = levitator (hover + reposition, no cruise speed) · 3 = full flight (paragon)
    this.flightTier = def.flightTier ?? 3;
    this.energyInfinite = !!def.energyInfinite;   // android core: ki never drains — but tier caps at II
    this.meleeCharge = 0;       // charged-melee wind-up (melee.js) — >0 while holding the punch
    this._heavyT = 0; this._heavyP = 0; this._heavyHay = false;
    this.frost = 0; this.frozenT = 0; this._frostImmuneT = 0;   // cold buildup → encased in ice
    this._dots = [];            // damage-over-time stacks [{dps,t,color,kind,src}]
    this._webControl=null;this._webControlImmune=0;this._webControls=new Set();this._webControlEpoch=0;
    this._quiverIdx = 0;        // archer payload selector (quiver ability cycles it)
    // ITEMS — gadgets a character CARRIES, outside the ability slots: no ki, cooldown-only,
    // one button (X). First kind: the teleport beacon (drop → fight elsewhere → recall to it).
    this.items = (def.items || []).map(d => ({ def: d, state: 'ready', cd: 0, pos: null, mesh: null, charges: d.charges ?? 1 }));
    // per-character trifecta traits
    this.thorns = def.thorns || 0;                                   // damages whoever holds you
    this.canPhase = !!def.phase;                                     // can spend energy to go intangible
    this.grabHeal = def.grabHeal || 0;                              // lifesteal on your throws
    this.teleEscape = def.teleEscape || Object.values(def.abilities || {}).some(a => a.type === 'teleport'); // blinks out of grabs
    if(typeof document!=='undefined'){loadFighterMotion(this);this._modularReady=loadModularCharacter(this).catch(error=>{this._modularError=error.message;console.error('Modular character',error);});}
  }

  // ⚠ READER #1 of the ten (aaa-03 §1). `grounded` was `onFloor && !flying`, which returns FALSE for a
  // fighter standing on the PowerWorld floor because `flying` never goes false there. It now reads the
  // gait's OWNER, so "feet planted" is the machine's answer, not the boolean's. In the city this is
  // byte-identical (the servo makes ground-owner ⟺ !flying); under an open sky it is the whole fix.
  get grounded() { return GAIT_OWNER[this.gait] === 'ground'; }
  // the mirror: air-owned = LIFT/AIRBORNE/STOOP. The ground-vs-air proxy readers use this instead of
  // `this.flying`, so a GROUNDED fighter on the PowerWorld floor is never treated as airborne again.
  get airborne() { return GAIT_OWNER[this.gait] === 'air'; }
  get alive() { return this.state !== 'ko'; }

  // ---- THE GAIT STATE MACHINE (aaa-03 §2/§3) --------------------------------------------------
  // ONE writer, computed at the top of `_physics` AFTER inputs are written and BEFORE the flight
  // chain (§2.1 — a flag that changes what a released button does must be READ by that chain, never
  // tested in front of it; that is the `_openSky`-before-the-input-branch bug pre-empted). Derived
  // entirely from state the engine already computes; if `gait` and the physics ever disagree, the
  // physics is right and `gait` has a bug. The transitions carry input ownership across on ONE frame
  // edge (§4) — a transition state belongs, for input, to the grammar it is going TO, from frame one.
  _updateGait(dt) {
    const groundY = this.groundY || 0;
    const flying = this.flying;
    const onFloor = this.pos.y <= groundY + 0.02 || this.onBlock;
    // a corpse has no grammar (T12); a claim on the body (grapnel/ledge-hang) OWNS the gait and no
    // transition fires while it holds — they already suspend the deck servo and gravity (§8.1).
    if (this.state === 'ko') { this.gait = GAIT.GROUNDED; this._liftT = this._settleT = 0; this._gaitFly = flying; this._gaitCrash = 0; return; }
    if (this._grapple || this.hanging) { this._gaitFly = flying; return; }

    const crashArmed = this._gaitCrash > 0; this._gaitCrash = 0;
    let g = this.gait;

    // CRASH ≡ stagger (§2/§4): the only 'none' owner, and it is a refusal the engine already has.
    // ⚠ T1n IS A HARD CONSTRAINT: a 'none' sample MUST be staggered, so CRASH is gated on
    // `staggerT > 0`. It is entered only on a real "somebody put me here" event — `_slam` applying
    // (T8) WHILE staggered — so a plain guard-break stagger stays GROUNDED and the city is unchanged.
    if (crashArmed && this.staggerT > 0) { this.gait = GAIT.CRASH; this._liftT = this._settleT = 0; this._gaitFly = flying; return; }
    if (g === GAIT.CRASH) {
      if (this.staggerT > 0) { this._gaitFly = flying; return; }       // still owned by the stagger
      // T11 — the most important row: an involuntary arrival returns you to the grammar you were in,
      // never to GROUNDED. `flying` is preserved through a slam (§3.2), so this reads it directly.
      g = flying ? GAIT.AIRBORNE : (onFloor ? GAIT.GROUNDED : GAIT.AIRBORNE);
      this._liftT = this._settleT = 0;
    }

    const tookOff = flying && !this._gaitFly;   // the `flying` field went true (either takeoff door, §8.1)
    if (flying) {
      if (tookOff) { this.gait = GAIT.LIFT; this._liftT = 0; this._liftBase = this.pos.y; }   // T1
      else if (g === GAIT.CRASH) this.gait = GAIT.AIRBORNE;            // resumed a crash while flying
      if (this.gait === GAIT.LIFT) {                                   // the LIFT ramp
        this._liftT += dt;
        // clearance is a body radius above the SURFACE you left (a rooftop takeoff is already high),
        // a statement about the world, not a tuning number. The 0.30s is a stuck-state guard only.
        if (this.pos.y - this._liftBase > this.radius || this._liftT >= 0.30) this.gait = GAIT.AIRBORNE;   // T2
      } else {                                                         // AIRBORNE / STOOP
        const diving = this.descendHeld && this._mvT > 0 && (Math.abs(this._mvX) > 0.2 || Math.abs(this._mvZ) > 0.2);
        this.gait = diving ? GAIT.STOOP : GAIT.AIRBORNE;               // T4 / T5 — the engine's own power-dive predicate
      }
    } else {
      if (g === GAIT.LIFT) { this.gait = GAIT.GROUNDED; this._liftT = 0; }   // T3 — cancelled the takeoff before clearance
      else if (onFloor) {
        if (GAIT_OWNER[g] === 'air') { this.gait = GAIT.SETTLE; this._settleT = Math.max(0.10, this._landT || 0); }   // T6/T7 — arrived under your own power
        else if (g === GAIT.SETTLE) { this._settleT -= dt; if (this._settleT <= 0) this.gait = GAIT.GROUNDED; }       // T9
        else this.gait = GAIT.GROUNDED;
      } else {
        // not flying, off the ground: a knocked-up grounded fighter, a glider, a stunned flier
        // falling. Air-owned by physics — the ground grammar cannot own you while your feet are off it.
        this.gait = GAIT.AIRBORNE;
      }
    }
    this._gaitFly = flying;
  }

  // F key: flight is a MODE you switch on and off, not a button you hold.
  toggleFlight() {
    if (this.state === 'ko' || this.grabbedBy || this.frozenT > 0) return;
    if (this.flying) { this.flying = false; }                       // cut it — gravity takes you down
    // Open air removes altitude bands, not a character's movement identity.
    else if (canUseFlight(this)) {
      this.flying = true;
      if (this.pos.y < 1.5) this.vel.y = 19;                        // pop off the ground (matches FLY_TAKEOFF)
      this._liftFx = 0.25;
      if (this._game) { try { this._game.audio.zap(560); } catch (e) {} }
    } else if (this._game && this._game.isHuman(this) && this._game.hud) {
      this._game.ui('feed', this.name + ' cannot fly', '#8b8577');    // leapers stay honest
    }
  }

  faceDir(dx, dz) { if (dx * dx + dz * dz > 1e-4) { this.facing = Math.atan2(dx, dz); this.aim.set(dx, 0, dz).normalize(); } }
  center(out = new THREE.Vector3()) { if(this._pronePose?.weight>0)return out.copy(this.pos).add(this._pronePose.center);return out.set(this.pos.x, this.pos.y + 5.2-(this._crouchPose?.drop||0), this.pos.z); }

  muzzle(out = new THREE.Vector3(), fwd = 3.4, h = 5.8) {
    if(this.parts.rig) {
      if(h===8.3) {
        this.parts.eyeL.getWorldPosition(out);
        this.parts.eyeR.getWorldPosition(_handW);
        return out.add(_handW).multiplyScalar(.5).addScaledVector(this.aim3,.12);
      }
      const socket=h<=5.4?this.parts.torso:this.parts.armR.children[2];
      socket.getWorldPosition(out);
      return out.addScaledVector(this.aim3,h<=5.4?fwd:Math.max(0,fwd-3.4));
    }
    return out.set(this.pos.x + this.aim.x * fwd, this.pos.y + h, this.pos.z + this.aim.z * fwd);
  }

  // Free all scene-level extras (tentacles, deployed items, planted mines). Call when the fighter leaves play.
  // (the grapnel line mesh rides along — see dispose body)
  // The in-world altitude tag: band name + metres, drawn small on the marker ring. Built LAZILY on
  // first liftoff — a grounded fighter never allocates one — and torn down with the fighter.
  _altTag(p, band, h, lift) {
    const show = h > 3;
    if (!show) { if (p.altTag) p.altTag.visible = false; return; }
    if (!p.altTag) {
      const c = document.createElement('canvas'); c.width = 256; c.height = 64;
      const tex = new THREE.CanvasTexture(c);
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
      spr.scale.set(9.5, 2.4, 1); spr.renderOrder = 3;
      spr.userData.cv = c; spr.userData.tex = tex;
      p.groundRig.add(spr); p.altTag = spr;
    }
    const spr = p.altTag; spr.visible = true;
    spr.position.set(0, 0.55 - this.pos.y + (this.groundY || 0) + lift + 2.6, 0);
    const m = Math.round(unitsToMeters(h));
    const key = band + '|' + m;
    if (key !== spr.userData.key) {
      spr.userData.key = key;
      const c = spr.userData.cv, x = c.getContext('2d');
      x.clearRect(0, 0, 256, 64);
      // ⚠ canvas 2d cannot read CSS tokens — literals only (the map-maker lesson).
      const col = ALT_BANDS[band].c;
      x.font = 'bold 30px Rajdhani, system-ui, sans-serif';
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.lineWidth = 5; x.strokeStyle = 'rgba(8,7,6,0.92)';
      const txt = ALT_BANDS[band].name + '  ' + m + 'm';
      x.strokeText(txt, 128, 34); x.fillStyle = col; x.fillText(txt, 128, 34);
      spr.userData.tex.needsUpdate = true;
    }
  }

  // Presentation-only transformation. Keep the authoritative root and position
  // vector alive: camera targets, voices, attacks and world effects may hold them.
  applyForm(form = null) {
    const appearance=formAppearance(this._formBase,form),key=appearanceKey(appearance);
    if(this.state==='ko'||this.ragdoll){this._pendingForm=copyAppearance(form);return false;}
    this._pendingForm=undefined;
    this.formName=form?.name??'';
    if(key===this._formKey)return true;
    clearWebControl(this);clearWebControlsFromSource(this);
    // An imported base is temporary articulation, not the new model's bind.
    // Remove it before copying transforms into a replacement rig. The combat
    // snapshot also contains that imported base and must not reintroduce it.
    // A held pressure brace also owns the elbow/wrist, even without an imported
    // body channel. Restore the complete reaction before transferring any rig.
    restoreFreeLookHead(this);
    restoreLostControlPose(this);restoreThrowPose(this);restoreReloadPose(this);restoreRiflePose(this);restorePronePose(this);restoreNanitePose(this);restoreHitReaction(this);
    if(this._jumpMotion?.applied||this._groundTransition?.applied||(this._groundMotion?.applied&&this._groundMotion.rig===this.parts.rig)||(this._authoredStrike?.applied&&this._authoredStrike.rig===this.parts.rig)||this._directionalPose?.applied||this._chestPose?.applied||this._spinePose?.applied||this._groundAimSupport?.applied){
      restoreAuthoredStrikeBase(this);restoreCombatBase(this);restoreSpineAim(this);restoreChestAim(this);restoreGroundAimSupport(this);restoreDirectionalAim(this);restoreGroundBase(this);
      this._combatPoseBase=null;this._hitReactionBase=null;
    }
    restoreBowEquipment(this);
    const def={...this.def,model:appearance.model,frame:appearance.frame,colors:appearance.colors},old=this.parts,next=figure(def),root=this.obj;
    const newRoots=[...next.g.children],oldRoots=this._figureRoots;
    const rim=old.mats.suit?._rimU?.uRimK.value??this._game?.world?._rimK??.8;
    setRim(next,rim);
    // Carry the current articulated orientations onto the new proportions. The
    // next animation tick will rebuild its locomotion/aim overlays normally.
    for(const name of ['body','torso','head','cowl','pelvis','emblem','armL','armR','legL','legR']){
      if(!old[name]||!next[name])continue;
      const hitBase=this._hitReactionBase?.[name];
      next[name].quaternion.copy(this._combatPoseBase?.[name]??hitBase?.quaternion??old[name].quaternion);
      if(old.rig?.rest[name]&&next.rig?.rest[name])next[name].position.add((hitBase?.position??old[name].position).clone().sub(old.rig.rest[name]));
    }
    next.body.position.copy(old.body.position).multiplyScalar(next.rig.pivotHeight/old.rig.pivotHeight);
    for(const name of ['armL','armR']){
      bendArm(next[name],-old[name].children[1].rotation.x);
      for(let i=0;i<3;i++)next[name].children[i].quaternion.copy(old[name].children[i].quaternion);
    }
    for(const name of ['legL','legR'])next[name].userData.knee.quaternion.copy(old[name].userData.knee.quaternion);
    // Lazy status markers are independent of costume construction. Transfer
    // them intact (including their owned canvas textures), along with held gear.
    for(const name of ['altTag','iceBoard','stars','zzz','woundPips','eyeMark'])if(old[name])next[name]=old[name];
    if(next.altTag)next.groundRig.add(next.altTag);
    for(const name of ['ice','guardArc','aura']){
      next[name].visible=old[name].visible;next[name].material.opacity=old[name].material.opacity;
    }
    if(this.canPhase)for(const name of ['suit','suit2']){
      next.mats[name].transparent=old.mats[name].transparent;next.mats[name].opacity=old.mats[name].opacity;
    }
    if(this._invis){
      const vis=Math.max(.06,Math.min(.9,this._invis.seen));
      const opacity=this._game?.isHuman?.(this)?Math.max(.28,vis):vis;
      const baselines=new Map();
      for(const child of newRoots)child.traverse(o=>{if(o.material&&!Array.isArray(o.material)&&!baselines.has(o.material))baselines.set(o.material,o.material.opacity??1);});
      for(const child of newRoots)child.traverse(o=>{
        if(o.material&&!Array.isArray(o.material)){
          if(o.userData._inv0===undefined)o.userData._inv0=baselines.get(o.material);
          o.material.transparent=true;o.material.opacity=opacity*o.userData._inv0;
        }
      });
    }
    if(this._gearMesh&&this._gearMesh.parent!==root)root.add(this._gearMesh);
    // Paired equipment shares the primary item's buffers. Preserve both mounts
    // before collecting the retired body, or its off-hand copy marks live gear
    // for disposal during the next temporary detach/remount.
    if(this._gearPair&&this._gearPair.parent!==root)root.add(this._gearPair);
    retireFighterEquipment(this,{preserveHeld:true});
    disposeHeroSkin(old);
    for(const resource of figureResources(oldRoots))this._retiredFormResources.add(resource);
    for(const child of oldRoots)child.removeFromParent();
    Object.assign(root.userData,next.g.userData,{rig:true});
    for(const child of newRoots)root.add(child);
    next.g=root;this.parts=next;this._figureRoots=newRoots;this.def=def;this._formKey=key;
    if(typeof document!=='undefined'&&heroModelOf(def).equipment==='soldier')
      this._soldierEquipmentLoading=loadSoldierEquipment(this).catch(error=>{this._soldierEquipmentError=error.message;console.error('Soldier equipment',error);});
    if(this._gearMesh?.userData.weaponKind)mountHeldWeapon(this,this._gearMesh,true);
    this.pos=root.position;
    // These caches store transforms from the previous rig; gameplay reaction
    // velocity, melee targets and flight momentum remain on the same Fighter.
    this._combatPoseBase=null;this._combatRendered=null;this._hitReactionBase=null;this._hitReactionCache=null;this._riflePose=null;
    this._groundMotion=null;this._groundTransition=null;this._jumpMotion=null;this._authoredStrike=null;this._chestPose=null;this._spinePose=null;this._groundAimSupport=null;
    this._handPrev=null;this._handSpd=0;this._band=undefined;this._stateCol=null;
    if(this._suitHex!=null)this._suitHex=next.mats.suit.color.getHex();
    root.updateMatrixWorld(true);updateLimbSurfaces(next,true);updateHeroSkin(next);
    presentNanites(this);
    this._releaseFormResources();
    if(typeof document!=='undefined'){loadFighterMotion(this);this._modularReady=loadModularCharacter(this).catch(error=>{this._modularError=error.message;console.error('Modular character',error);});}
    return true;
  }

  _releaseFormResources() {
    const pending=this._retiredFormResources;
    for(const node of this._formResourceWatch)node.removeEventListener('removed',this._onFormBorrowerRemoved);
    this._formResourceWatch.clear();
    if(!pending.size)return;
    const live=new Set(),scene=this._game?.scene;
    const visit=node=>{
      if(this._formDisposed&&node===this.obj)return;
      let borrows=false;
      const use=resource=>{if(pending.has(resource)){live.add(resource);borrows=true;}};
      use(node.geometry);
      if(node.isInstancedMesh&&node.userData.naniteOwned)use(node);
      for(const geometry of node.geometry?.palmVariants||[])use(geometry);
      use(node.skeleton);
      for(const material of [].concat(node.material||[])){use(material);use(material.map);}
      if(borrows)for(let parent=node;parent&&parent!==scene;parent=parent.parent)this._formResourceWatch.add(parent);
      for(const child of node.children)visit(child);
    };
    if(scene)visit(scene);
    else if(!this._formDisposed)visit(this.obj);
    for(const resource of pending)if(!live.has(resource)){pending.delete(resource);resource.dispose();}
    // Borrowers such as holograms may survive the actor. Ancestor removal events
    // release the last shared buffer even after Fighter.update has stopped.
    this._onFormBorrowerRemoved ||= ()=>this._releaseFormResources();
    for(const node of this._formResourceWatch)node.addEventListener('removed',this._onFormBorrowerRemoved);
  }

  dispose() {
    this._modularEpoch=(this._modularEpoch||0)+1;this._modularCharacter?.dispose();this._modularCharacter=null;
    restoreBowEquipment(this);
    stopFlightAudio(this);
    if(this._formDisposed)return;
    retirePowerUp(this);
    resetMovementGears(this);
    clearWebControl(this);clearWebControlsFromSource(this);
    this._formDisposed=true;
    invalidateFighterMotion(this);
    this.releaseHang();
    retireNanites(this._nanites);presentNanites(this);
    if(this._game)retireOwnedConstructs(this._game,this,'owner-removed');
    this._jumpMotion=null;
    disposeHeroSkin(this.parts);
    this._game?.melee?.release(this);
    this._game?.melee?.clearInput(this);
    this._flightWake?.dispose();
    this._surfaceWake?.dispose();
    // F9: releasing the fighter must release whatever they were holding, or the prop mesh
    // outlives them in the scene and the world keeps a reference to a dead carrier.
    if (this._carry) { try { if (this._game) this._game.scene.remove(this._carry.mesh); } catch (e) {} this._carry = null; }
    // THE FIGURE ITSELF must free its GPU objects — figure()/buildWeapon() allocate per-fighter
    // geometries and materials (suits, limbs, flair, weapons, the ice shell, the stun stars).
    // Every clear path calls dispose(); without this traverse each hero swap/respawn orphaned
    // dozens of GPU objects (the 2026-07-24 code review's headline finding). Shared textures
    // are NOT disposed here (material.dispose never touches .map).
    // ⚠ the alt tag's CanvasTexture is PER-FIGHTER, and the traverse below disposes materials
    // but never their .map — so it has to be freed by name or every liftoff leaks a texture.
    if(this.parts?.altTag?.userData.tex)this._retiredFormResources.add(this.parts.altTag.userData.tex);
    if(this.parts?.eyeMark?.material.map)this._retiredFormResources.add(this.parts.eyeMark.material.map);
    retireFighterEquipment(this);
    for(const resource of figureResources([this.obj]))this._retiredFormResources.add(resource);
    this._releaseFormResources();
    if (this._grapLine) { this._grapLine.userData.disposeChain?.(); this._grapLine.geometry.dispose(); this._grapLine.material.dispose(); if (this._game) this._game.scene.remove(this._grapLine); this._grapLine = null; }
    if (this.tentacles) { for (const t of this.tentacles) t.dispose(); this.tentacles = null; }
    clearSlotFx(this);   // stop charge hums + orbs — a disposed mid-charge fighter must not ring into the next match
    for (const k in this.slots) {
      const st = this.slots[k];
      if (st.list) { for (const m of st.list) if (m.mesh && m.mesh.parent) { m.mesh.parent.remove(m.mesh); m.mesh.traverse(o => { if (o.material) o.material.dispose(); if (o.geometry) o.geometry.dispose(); }); } st.list.length = 0; }
    }
    for (const it of this.items) if (it.mesh) {
      it.mesh.parent && it.mesh.parent.remove(it.mesh);
      it.mesh.traverse(o => { if (o.material) o.material.dispose(); if (o.geometry) o.geometry.dispose(); });
      it.mesh = null; it.state = 'ready'; it.pos = null;
    }
  }

  // ---- status: damage-over-time (poison/burn/gas arrows & clouds) ----
  // BLEEDING (manual §12): heavy trauma and slash-class weapons open a WOUND. Movement tears
  // it wider; stillness clots it shut. Machines and energy bodies cannot bleed. The tell —
  // red drips falling DOWNWARD — belongs to bleeding alone (the status-language law).
  addBleed(src) {
    if (this.metal || this.body === 'energy' || this.isDummy || this.state === 'ko') return;
    const was = this._bleed || 0;
    this._bleed = Math.min(3, was + 1);
    if (src) this._bleedSrc = src;
    this._bleedStill = 0;
    if (this._suitHex == null && this.parts && this.parts.mats && this.parts.mats.suit) this._suitHex = this.parts.mats.suit.color.getHex();
    if (this._game) {
      if (this._game.hud && was === 0) this._game.ui('damageNumber', this.pos, 'BLEEDING', '#ff4a3a', true);
      this._game.particles.burst(this.pos.x, this.pos.y + 5, this.pos.z, { count: 6, speed: 8, life: 0.4, size: 1.8, color: ['#c22a2a', '#7a1414'], up: -2, grav: 30, drag: 0.6 });
    }
  }
  // ZONED WOUNDS (manual §18): one BIG hit marks the body part it landed on. LIGHT → SERIOUS
  // → CRITICAL per zone; VIGOR (ccRecover) walks the ladder back down a rung at a time.
  // Debuffs are the tells: a leg wound IS a limp (speed), an arm wound weakens the fists,
  // a torso wound slows the tank. Cleared on respawn. Dummies measure; they don't bruise.
  addWound(zone, kind) {
    const W = this._wounds; if (!W || W[zone] == null || W[zone] >= 3 || this.isDummy) return;
    W[zone]++;
    (this._woundKind = this._woundKind || {})[zone] = kind || 'CONTUSION';
    const rec = (this.sheet && this.sheet.ccRecover) || 1;
    this._woundT[zone] = 28 / rec;
    // ⚠ A VISIBLE WOUND CAN LEAVE SOMETHING INVISIBLE BEHIND. This is the join between the injury
    // system (which the player sees, on the HUD, immediately) and the medical chart (which they do
    // not). A serious wound sometimes writes a HIDDEN condition — internal bleeding under a torso
    // hit, a hairline fracture under an arm hit, a concussion under a head one — and it is already
    // costing them from that moment. Nobody is told. That gap is the whole feature.
    if (W[zone] >= 2 && this.def && !this.def.police) {
      const roll = Math.random();
      const cond = zone === 'torso' ? (roll < 0.34 ? 'internal' : roll < 0.5 ? 'cardiac' : null)
                 : zone === 'arm'   ? (roll < 0.30 ? 'hairline' : roll < 0.42 ? 'nerve' : null)
                 : /* leg */          (roll < 0.28 ? 'hairline' : roll < 0.4 ? 'scarring' : null);
      if (cond) { try { inflict(this.id, cond, W[zone] - 1, zone + ' wound'); } catch (e) {} }
    }
    if (this._game && this._game.hud) {
      const label = ['', 'LIGHT', 'SERIOUS', 'CRITICAL'][W[zone]];
      this._game.ui('damageNumber', this.pos, `${zone.toUpperCase()} · ${kind || 'CONTUSION'} · ${label}`, '#c9564a', true);
    }
  }

  clotBleed(game, silent) {
    if (!(this._bleed > 0)) return;
    this._bleed = 0; this._bleedAcc = 0; this._bleedStill = 0; this._bleedTick = 0;
    const mats = this.parts && this.parts.mats;
    if (mats && mats.suit && this._suitHex != null) mats.suit.color.setHex(this._suitHex);
    if (!silent && game && game.hud && game.isHuman(this)) game.hud.damageNumber(this.pos, 'CLOTTED', '#e8e2d4', true);
  }

  // ⚠ `clotBleed` had no sibling. Bleeding could be stopped and a poison or a burn could not,
  // which is why two finished research rows ("clears toxic damage over time", "clears burn damage
  // over time") described their effect in PROSE — there was no verb to point at. One kind, or all.
  clearDot(kind, game) {
    if (!this._dots.length) return 0;
    const before = this._dots.length;
    if (kind) { const i = this._dots.findIndex(d => d.kind === kind); if (i >= 0) this._dots.splice(i, 1); }
    else this._dots.length = 0;
    const n = before - this._dots.length;
    if (n && game && game.hud && game.isHuman(this)) game.hud.damageNumber(this.pos, 'PURGED', '#e8e2d4', true);
    return n;
  }

  // SLEEP (manual §14): the payload lane's proving status. The victim FOLDS slowly to the
  // ground, uncontrolled, and wakes INSTANTLY on any damage. Machines don't sleep (it is a
  // chemical); dummies measure, they don't nap; 3s immunity after waking stops chain-sleep.
  // ROADMAP 5 · SHOCK — the anti-machine status. Freeze, burn and poison all favour flesh;
  // shock is the one that MACHINES cannot shrug off (a robot has no metabolism to resist it,
  // but it does have circuits). Metal takes 1.6x duration; flesh resists it.
  addShock(dur, src) {
    if (this.isDummy || this.state==='ko' || this.invuln>0 || this._shockImmune > 0) return;
    const machine = this.def.metal || this.body === 'metal';
    const d = dur * (machine ? 1.6 : 0.55) / ((this.sheet && this.sheet.ccRecover) || 1);
    this.shockT = Math.max(this.shockT || 0, d);
    this.staggerT=Math.max(this.staggerT||0,.05);
    this.guarding=false;this.flying=false;this.flyHeld=false;
    this._game?.melee?.clearInput(this);
    this._shockImmune = 3;
    if (this._game) {
      this._game.ui('damageNumber', this.pos, machine ? 'SYSTEMS DOWN' : 'SHOCKED', '#bfe9ff', true);
      this._game.vfx.lightning(this.pos.clone().setY(this.pos.y + 4), { color: '#bfe9ff', count: 3, radius: 4, height: 8 });
      this._game.audio.zap(880, this.pos);
    }
  }
  addSleep(dur, src) {
    if (this.metal || this.isDummy || this.state === 'ko' || this._sleepImmune > 0 || this.frozenT > 0) return;
    const rec = (this.sheet && this.sheet.ccRecover) || 1;
    this.sleepT = Math.max(this.sleepT, dur / rec);
    this._sleepGrace = 0.15;   // the delivery packet (direct hit + blast, same instant) never wakes its own sleep
    if (src && src !== this) { this.lastHitBy = src; this.lastHitT = 0; }
    this.guarding = false; this.chargingKi = false; this.meleeCharge = 0; this.strikeActive = 0;
    this.flying = false; this.flyHeld = false; this.gliding = false;   // a sleeping flier falls
    this._game?.melee?.clearInput(this);
    if (this.grabbing && this._game) this._game.melee.release(this);
    if (this._game && this._game.hud) this._game.ui('damageNumber', this.pos, 'ASLEEP', '#ffe9b0', true);
    if (this._game) this._game.audio.zap(170, this.pos);
  }
  wake(natural) {
    if (!(this.sleepT > 0) && !natural) return;
    this.sleepT = 0; this._sleepImmune = 3;
    if (natural && this._game && this._game.hud) this._game.ui('damageNumber', this.pos, 'WOKE', '#ffe9b0', true);
  }

  addDot(o) {
    if (this.state === 'ko' || this.invuln > 0) return;
    const kind = o.kind || 'poison';
    // every stack knows its DAMAGE TYPE, so the tick can be resisted like any other hit
    const dtype = o.dtype || DOT_DTYPE[kind] || 'toxic';
    const same = this._dots.find(d => d.kind === kind);
    if (same) { same.t = Math.max(same.t, o.dur || 3); same.dps = Math.max(same.dps, o.dps || 4); same.src = o.src || same.src; }
    else {
      this._dots.push({ dps: o.dps || 4, t: o.dur || 3, color: o.color || '#8fe08a', kind, dtype, corrode: o.corrode, src: o.src || null });
      this._game?.presentHitOutcome?.(this,{src:o.src},{dtype,attackClass:'status',healthLost:0,
        absorbed:{plate:0,armor:0,shield:0,nanite:0},guard:'none',deflected:false,knockedOut:false,
        statusesAdded:[kind==='burn'?'burning':kind],contact:null});
    }
  }

  // ---- status: frost buildup → ENCASED IN ICE. Strength melts out faster; fire heroes resist;
  // blink heroes spend ki to teleport out the instant it lands. A heavy hit shatters it early (bonus dmg).
  addFrost(amt, src) {
    if (this.state === 'ko' || this.frozenT > 0 || this._frostImmuneT > 0 || this.invuln > 0) return;
    this.frost = clamp(this.frost + amt * (this.def.frostResist ? 0.45 : 1), 0, 1);
    if (this.frost >= 1) {
      this.frost = 0;
      if (this.teleEscape && this.ki >= 20) {           // magic/blink types slip out instantly
        this.ki -= 20;
        if (this._game) { this._game.afterimage(this); this._game.audio.teleport(); }
        this.pos.x -= this.aim.x * 18; this.pos.z -= this.aim.z * 18; this.invuln = 0.4; this._frostImmuneT = 2;
        return;
      }
      // freeze duration: strength melts it — STR 10 ≈ 0.9s, STR 1 ≈ 2.4s
      this.frozenT = clamp(2.6 - this.strength * 0.17, 0.8, 2.6);
      this._game?.presentHitOutcome?.(this,{src},{dtype:'cold',attackClass:'status',healthLost:0,
        absorbed:{plate:0,armor:0,shield:0,nanite:0},guard:'none',deflected:false,knockedOut:false,statusesAdded:['frozen'],contact:null});
      if (src && src !== this) { this.lastHitBy = src; this.lastHitT = 0; }
      this.guarding = false; this.meleeCharge = 0; this.strikeActive = 0;
      this.flyHeld = false; this.descendHeld = false;
      if (this._game) {
        this._game.audio.zap(180);
        this._game.particles.burst(this.pos.x, this.pos.y + 5, this.pos.z, { count: 16, speed: 14, life: 0.5, size: 2.6, color: ['#bfeaff', '#eaffff', '#fff'], up: 4, drag: 1.5 });
        if (this._game.hud && this._game.isHuman(this)) this._game.ui('damageNumber', this.pos, 'FROZEN', '#bfeaff', true);
      }
    }
  }
  _thaw(shattered) {
    if (this.frozenT <= 0) return;
    this.frozenT = 0; this._frostImmuneT = 2.5; this.invuln = Math.max(this.invuln, 0.4);
    if (this._game) {
      this._game.particles.burst(this.pos.x, this.pos.y + 5, this.pos.z, { count: shattered ? 26 : 14, speed: shattered ? 26 : 14, life: 0.6, size: 3, color: ['#bfeaff', '#eaffff', '#fff'], up: 6, grav: 18, drag: 1.4 });
      this._game.audio.zap(shattered ? 90 : 300);
      if (shattered) { this._game.world.shake(0.8); this._game.audio.impact(0.9); }
    }
  }

  takeDamage(amount, opts = {}) {
    if(amount>0&&opts.src&&opts.src.team!==this.team)this._friendlyLanding=false;
    const localNanite=claimNaniteContact(this,opts.naniteContact,opts);delete opts.naniteResult;
    // DUPLICATES (brief T3.4) share ONE health pool: damage to any copy is damage to the
    // original, and a pulse travels through every active duplicate so the link is visible.
    if (this._dupeOf && this._dupeOf.alive) {
      const dealt = this._dupeOf.takeDamage(amount, opts);
      this.hp = this._dupeOf.hp; this.maxHp = this._dupeOf.maxHp;
      if (this._game) pulseDupes(this, this._game);
      if (this.hp <= 0) { this.noRespawn = true; this._remove = true; }
      return dealt;
    }

    if (this.remote) {
      // victim-authoritative netcode: their machine owns their hp — we just spark and
      // remember who hit them so the KO credit lands when their death streams back
      this.hitFlash = 1;
      if (opts.src) { this.lastHitBy = opts.src; this.lastHitT = 0; }
      return;
    }
    const zombieHit=zombieRifleHit(this,amount,opts);if(zombieHit!==null)return zombieHit;
    if (this.state === 'ko' || this.invuln > 0) return 0;
    const resolvedStart={hp:this.hp,armor:this.armor||0,shield:this._shieldHp||0,
      bleed:this._bleed>0,frozen:this.frozenT>0,stun:this.stunT>0,corrode:this._corrode>0,dots:new Set((this._dots||[]).map(d=>d.kind))};
    let resolvedDtype=null,resolvedPlate=0,resolvedNanite=0,resolvedGuard='none',resolvedDeflected=false,resolvedGuardEnergy=0,resolvedGuardAbsorbed=0,resolvedGuardBreakReason=null;
    const resolvedOutcome=()=>{
      const statusesAdded=[];
      if(!resolvedStart.bleed&&this._bleed>0)statusesAdded.push('bleeding');
      if(!resolvedStart.frozen&&this.frozenT>0)statusesAdded.push('frozen');
      if(!resolvedStart.stun&&this.stunT>0)statusesAdded.push('stunned');
      if(!resolvedStart.corrode&&this._corrode>0)statusesAdded.push('corroded');
      for(const d of this._dots||[])if(!resolvedStart.dots.has(d.kind))statusesAdded.push(d.kind==='burn'?'burning':d.kind);
      return Object.freeze({dtype:resolvedDtype,resistance:admission.resistance??1,attackClass:opts.ballistic?'bullet':opts.strike?'melee':opts.dot?'sustained':'impact',
        healthLost:Math.max(0,resolvedStart.hp-this.hp),absorbed:Object.freeze({plate:resolvedPlate,
          armor:Math.max(0,resolvedStart.armor-(this.armor||0)),shield:Math.max(0,resolvedStart.shield-(this._shieldHp||0)),nanite:resolvedNanite}),
        guard:resolvedGuard,guardBreakReason:resolvedGuardBreakReason,guardEnergySpent:resolvedGuardEnergy,guardAbsorbed:resolvedGuardAbsorbed,
        deflected:resolvedDeflected,knockedOut:this.state==='ko',statusesAdded:Object.freeze(statusesAdded),
        contact:opts.contactPoint?Object.freeze({x:opts.contactPoint.x,y:opts.contactPoint.y,z:opts.contactPoint.z}):null});
    };
    const admission=damageAdmission(this,amount,opts);
    // ⚠ MOOD REACHES THE FIGHT HERE, at the one place every damage source already passes through —
    // not at the ten call sites that multiply by powerBuff. An angry fighter hits harder and a sad
    // one hits softer because of one line, and nothing else has to know emotions exist.
    amount=admission.moodAmount;
    if(admission.consumeCrit)opts.src._moodCrit=0; // "the first one hurts"
    // ---- SECOND WIND, the counterplay (manual §13): a DOWNED body ignores chip — only a HEAVY
    // STRIKE or a slam FINISHES it for real. Everything else is beneath the moment.
    if (this.downedT > 0) {
      if (!((opts.strike && amount >= 15) || opts.slam)) return 0;
      this.downedT = 0;
      if (this._game && this._game.hud) this._game.ui('damageNumber', this.pos, 'FINISHED', '#ff3b3b', true);
      // fall through — the blow lands for real and the KO completes (the wind is already spent)
    }
    // SLEEP (manual §14): any damage at all is the one wake rule — the only exception is the
    // 0.15s delivery grace, so a tranq dart's own blast can't wake the sleep it just delivered
    if (this.sleepT > 0 && amount > 0 && !(this._sleepGrace > 0)) this.wake();
    // Predator, size and air-superiority arithmetic share the admission result.
    // SIZE CHANGE (brief T3.2): a giant hits harder and is harder to move; a shrunken fighter
    // is the reverse. One number drives both sides of the exchange.
    amount=admission.preBallisticAmount;
    // AIR SUPERIORITY (brief T2.20): some fighters own the sky. A strike landed on a victim who
    // is genuinely AIRBORNE hits harder and drives them DOWN — the vertical read the brief asks
    // for. Data-driven off the attacker's def; nothing hard-codes a hero.
    if (opts.strike && opts.src && opts.src.def && opts.src.def.airSuperiority && this.pos.y > 12 && !this.grounded) {
      const AS = opts.src.def.airSuperiority;
      opts.launch = -(Math.abs(opts.launch || 0) + (AS.slam || 26));
      if (this._game && this._game.hud && this._game.isHuman(opts.src)) this._game.ui('damageNumber', this.pos, 'AIR SUPERIORITY', '#7fe6ff', true);
    }
    // EVERY hit has a type. Callers that don't declare one get the sane default for what they are,
    // so no damage source in the game is ever untyped and resistances can't be silently skipped.
    const dtype = admission.dtype;
    resolvedDtype=dtype;
    // ---- THE BALLISTIC SCALE: a gun is lethal to people and an annoyance to superweapons ----
    // A shotgun ends a pedestrian. Against a registered weapon it meets ARMOUR first (a plated
    // chassis eats the shot), then TOUGHNESS (a Might-10 frame barely notices lead). Energy,
    // fists and slams are unaffected — only `ballistic` damage is filtered here.
    if (opts.ballistic) {
      const plate = admission.plate;   // ACID eats the plate
      if (plate > 0) {
        const stopped = admission.stopped;
        resolvedPlate=stopped;
        amount = admission.afterPlateAmount;
        if (this._game && stopped > 0.5 && Math.random() < 0.5) {      // sparks off the plate
          this._game.particles.burst(this.pos.x, this.pos.y + 5, this.pos.z, { count: 3, speed: 16, life: 0.22, size: 1.2, color: ['#ffd97a', '#c9c2b4'], drag: 2 });
        }
      }
      amount=admission.ballisticAmount; // STR 10 takes ~15% from bullets
      if (amount <= 0.4) {                                             // it simply did not get through
        this.hitFlash = Math.max(this.hitFlash, 0.35);
        if (this._game) this._game.onHit(this, 0, opts, true,resolvedOutcome());
        return 0;
      }
    }
    // ---- DAMAGE TYPE RESISTANCE (manual §3) — the one multiplier every defence hangs off ----
    {
      const rz = admission.resistance;
      if (rz !== 1) {
        amount = admission.amount;
        if (rz === 0) {                                  // outright immune — say so, don't fail silently
          this._game?.presentHitOutcome?.(this,opts,resolvedOutcome());
          return 0;
        }
      }
      // MAGIC SIPHONS: the wand pulls their tank into yours. An `energyInfinite` frame (TITAN)
      // has no tank to drain, so the siphon finds nothing — it still takes the DAMAGE, it just
      // can't be milked. Explicitly guarded: the pin happens in update(), so without this the
      // ki visibly dipped and refilled every hit.
      if (dtype === 'magic' && amount > 0 && !this.def.energyInfinite) {
        const pull = Math.min(this.ki, amount * (opts.siphon || 0.8));
        if (pull > 0) {
          this.ki = Math.max(0, this.ki - pull);
          const s2 = opts.src;
          if (s2 && s2 !== this && s2.maxKi) s2.ki = clamp(s2.ki + pull * 0.6, 0, s2.maxKi);
          if (this._game && Math.random() < 0.3) {
            this._game.particles.spawn({ x: this.pos.x, y: this.pos.y + 5, z: this.pos.z,
              vx: (Math.random() * 2 - 1) * 5, vy: 7, vz: (Math.random() * 2 - 1) * 5,
              life: 0.5, size: 2.4, color: ['#ff7a5a', '#ffd9b0'], drag: 1.3, shrink: true });
          }
        }
      }
      // ACID CORRODES: eats into this fighter's armour for the duration, which is what makes it
      // the counter to the ballistic scale rather than just another poison.
      if (dtype === 'acid') {
        this._corrode = Math.max(this._corrode, opts.corrodeDur || 5);
        this._corrodeAmt = Math.min(12, this._corrodeAmt + (opts.corrode || 3));
      }
    }
    // Actual native attack metadata is the only authority for local cell damage.
    // Phase/immunity do not corrode metal; a full panel block still proceeds to
    // the existing guard consequences, reporting zero HP instead of integrity.
    let naniteFullBlock=false;
    if(localNanite&&!(this.phase&&!opts.unblockable&&!opts.trueDamage)){
      const cell=this._nanites.modules.get(opts.naniteContact.slot).cells[opts.naniteContact.cell],before=cell.hp;
      const result=damageNanite(this._nanites,opts.naniteContact,amount,localNanite.absorb);
      resolvedNanite=result.absorbed;
      result.integrity=before-cell.hp;
      opts.naniteResult=result;amount=result.remaining;naniteFullBlock=result.absorbed>0&&amount===0;
      if(result.disabledSlot)cancelHeldSlot(this,result.disabledSlot);
      if(naniteFullBlock)opts.contactFx=true;
      if(result.integrity>0&&!opts.dot&&!opts.strike)this._game?.vfx?.contact(opts.naniteContact.point,opts.naniteContact.normal,{color:'#bdc2b8',power:.55});
    }
    // A physical nanite panel intercepts first. Fighter guard then buys admitted
    // damage with energy; only its unpaid remainder reaches personal HP pools.
    const energyGuard=this._openSky||this._game?.modeId==='powerworld';
    const guardDx=opts.src?opts.src.pos.x-this.pos.x:0,guardDz=opts.src?opts.src.pos.z-this.pos.z:0;
    const guardDistance=Math.hypot(guardDx,guardDz)||1;
    const guardInArc=this.def.guardType==='barrier'||guardDx/guardDistance*this.aim.x+guardDz/guardDistance*this.aim.z>-.15;
    const paidGuard=energyGuard&&this.guarding&&this.staggerT<=0&&!this.chargingKi&&!this.phase&&!opts.unblockable&&!opts.trueDamage&&opts.src&&guardInArc;
    const guardedAmount=amount;
    let energyBreak=false;
    if(paidGuard){
      const rate=guardEnergyRate(this.def,opts),cost=Math.max(0,amount)*rate;
      const paid=this.energyInfinite?cost:Math.min(Math.max(0,this.ki),cost);
      if(!this.energyInfinite)this.ki=Math.max(0,this.ki-paid);
      resolvedGuardEnergy=this.energyInfinite?0:paid;resolvedGuardAbsorbed=paid/rate;
      amount=Math.max(0,amount-resolvedGuardAbsorbed);
      energyBreak=!this.energyInfinite&&this.ki<=1e-8&&cost>0;
    }
    // Personal armor/shield pools receive only damage not already intercepted.
    // ROADMAP 4 · THE ARMOUR BAR eats the hit before HP does, and any hit resets the
    // out-of-combat repair timer. Bypassed by trueDamage, like every other pool.
    if (this.armor > 0 && !opts.trueDamage && amount > 0) {
      this._armorCalm = 0;
      const eaten = Math.min(this.armor, amount * 0.55);
      this.armor -= eaten; amount -= eaten;
      if (this._game && eaten > 1) this._game.vfx.flash(this.pos.clone().setY(this.pos.y + 5), '#cfe6ff', 2.2, 0.08);
    }

    if (this._shieldHp > 0 && !opts.trueDamage && !naniteFullBlock && amount > 0) {
      const soak = Math.min(this._shieldHp, amount);
      this._shieldHp -= soak; amount -= soak;
      this._game?.audio?.soundLibrary?.native?.('shieldpack-hit',{pos:this.pos});
      if (this._game) this._game.particles.burst(this.pos.x, this.pos.y + 5.5, this.pos.z, { count: 5, speed: 16, life: 0.3, size: 1.8, color: ['#7fe6ff', '#fff'], drag: 1.4 });
      if (amount <= 0.01 && !paidGuard) { if (this._game) this._game.onHit(this, 0, opts, true,resolvedOutcome()); return 0; }
    }
    // energy-intangible: strikes/projectiles pass through
    if (this.phase && !opts.unblockable && !opts.trueDamage) {
      const g = this._game;
      if (g && Math.random() < 0.6) g.particles.burst(this.pos.x, this.pos.y + 5, this.pos.z, { count: 3, speed: 8, life: 0.3, size: 2.2, color: [this.def.colors.accent, '#fff'] });
      return 0;
    }
    // GUARD beats STRIKE: block frontal, non-grab damage ('barrier' guards cover ALL directions)
    // THE POWER CHARGE price: a fighter deep in the scream is DEFENSELESS — the raised guard
    // does not block, the hit lands full and breaks the charge (DBZ ruling 2026-07-24).
    if (this.chargingKi && amount > 0 && opts.src && opts.src !== this) {
      this.chargingKi = false; this._chargeT = 0; this.guarding = false;
      this.staggerT = Math.max(this.staggerT, 0.35);
    }
    if (this.guarding && this.staggerT <= 0 && !opts.unblockable && !(energyGuard&&opts.trueDamage) && opts.src) {
      const dx = opts.src.pos.x - this.pos.x, dz = opts.src.pos.z - this.pos.z, d = Math.hypot(dx, dz) || 1;
      const inArc = this.def.guardType === 'barrier' || (dx / d) * this.aim.x + (dz / d) * this.aim.z > -0.15;
      if (inArc) {   // attacker in front arc (or omnidirectional barrier)
        const sh = this.def.guardStrong ? 0.55 : 1;                  // riot shield: harder block, tougher meter
        const beam=opts.dot&&Number.isFinite(opts.beamDelta)&&opts.beamDelta>=0;
        if(beam)opts.beamBlocked=true;
        if(!energyGuard)amount *= (opts.strike ? 0.12 : beam ? clamp(opts.beamGuardChip??.22,0,1) : opts.dot ? 0.5 : 0.42) * sh;
        const crush=energyGuard&&opts.guardCrush;
        const drain=crush?.55:beam?Math.max(0,opts.beamGuardDrain??.28)*opts.beamDelta:opts.strike?.14:opts.dot?.012:.22;
        this.guardMeter = clamp(this.guardMeter - drain * sh, 0, 1);
        // The reached beam segment owns its once-per-time pressure, including
        // authored zero push. Do not add a second frame-dependent guard impulse.
        const pb = beam ? 0 : opts.dot ? 0.8 : 5;
        this.vel.x -= (dx / d) * pb; this.vel.z -= (dz / d) * pb;     // braced BACKWARD, away from the attacker
        this.hitstop = Math.max(this.hitstop, opts.dot ? 0 : 0.03); this._blocked = 0.16;
        if(guardedAmount>0&&!(opts.naniteResult?.absorbed>0))registerShieldContact(this,opts);
        this.hp = clamp(this.hp - amount, 0, this.maxHp);
        if(amount>0&&opts.src!==this){this.lastHitBy=opts.src;this.lastHitT=0;}
        if (this.guardMeter <= 0.001||energyBreak||crush) { this.guarding = false; this.staggerT = crush?.85:.7; this.guardBreakT = this.staggerT; this.state = 'hit'; this.stateT = 0; resolvedGuard='broken'; resolvedGuardBreakReason=crush?'heavy-crush':energyBreak?'energy-exhausted':'meter-depleted'; } // guard break
        else resolvedGuard='blocked';
        if(resolvedGuard==='broken')this._game?.audio?.soundLibrary?.native?.('guard-break',{pos:this.pos});
        if(energyBreak)this._game?.onDrained?.(this);
        // A BLOCKED STRIKE REJECTS THE ATTACKER — bounce + recovery stagger (parry if the guard
        // was raised at the last instant). This is what stops melee spam against a raised guard.
        if (opts.strike && !crush && this._game && this._game.onBlockedStrike) this._game.onBlockedStrike(opts.src, this, {contactFx:opts.contactFx});
        this._resolveLethal(opts);
        if (this._game) this._game.onHit(this, amount, opts, true,resolvedOutcome());
        return amount;
      }
    }
    if (opts.src && opts.src !== this) { this.lastHitBy = opts.src; this.lastHitT = 0; }   // for kill attribution
    // getting hit cancels your own grab attempt (STRIKE beats GRAB)
    if (this.grabState === 'startup') { this.grabState = null; this.grabT = 0; }
    if (!opts.dot && !opts.clinchThorns) this._game?.melee?.clearInput(this);
    if (this.grabbing && this._game && !opts.clinchThorns) this._game.melee.release(this);

    // frozen solid: a heavy hit SHATTERS the ice early for bonus damage
    if (this.frozenT > 0 && (opts.strike || (opts.kb && Math.hypot(opts.kb.x || 0, opts.kb.z || 0) > 30))) {
      amount *= 1.3; this._thaw(true);
    }
    this.hp = clamp(this.hp - amount, 0, this.maxHp);
    this.ki = clamp(this.ki + amount * 0.4, 0, this.maxKi); // build ki when hurt
    // ⚠ `??` NOT `||`: sustained sources (beams, cones, lifedrain, DoT ticks) pass hitstop: 0 on
    // PURPOSE. With `||`, that falsy 0 became 0.04 EVERY FRAME and re-armed the freeze forever —
    // anything under a beam was pinned in hitstop (no physics, no actions, frozen animation) for as
    // long as the beam touched it. That was the "shoot the dummy and it freezes" bug, and it also
    // meant any beam was a permanent stunlock on a live fighter. An explicit 0 must mean 0.
    // Continuous contact needs a low glow, not an HDR impact flash re-armed every
    // step. Keep discrete punches/blasts bright, including a punch during a beam.
    // Contact owns its spark: a brief material accent must not erase the suit
    // through the entire recoil. Keep projectile/blast and sustained-hit rules.
    // Ordinary rifle chip must not repaint the entire open-sky body white each
    // shot. Use admitted HP damage; heavy impacts and all city feedback stay intact.
    const smallBallistic = opts.ballistic && amount > 0 && amount < this.maxHp * .06;
    // Dummies and clones intentionally lack free-flight physics. They still
    // share the field camera and must not use the city's full-body strobe.
    const closeFeedback = this._openSky || this._game?.modeId === 'powerworld';
    this.hitFlash = Math.max(this.hitFlash, closeFeedback ? (opts.dot || smallBallistic ? .22 : opts.contactFx ? .3 : 1) : 1);
    this.hitstop = Math.max(this.hitstop, opts.hitstop ?? 0.04);
    queueHitReaction(this, amount, opts);
    // STRENGTH plants your feet: 10 shrugs off ~40% of knockback, 1 gets ragdolled around
    let kbMul = (this.metal ? 0.72 : 1) * (1.22 - this.strength * 0.047);
    // ⚠ POWERWORLD HITS HARDER THAN THE CITY, AND THAT IS THE WHOLE POINT (manual §47). The carry
    // was already four times the city's; what was missing was the LAUNCH. `_chaseKb` is set only by
    // the powerworld mode, so an undefined flag leaves `kbMul` exactly as the city computed it.
    // ⚠ VERTICAL IS ITS OWN NUMBER. At parity with the horizontal every punch is a pop-up — the fight
    // climbs instead of crossing the stage, which reads as floaty rather than violent.
    let kbLaunchMul = kbMul;
    if (this._chaseKb) { kbMul *= PW_KB.kb; kbLaunchMul *= PW_KB.launch; }
    if (opts.kb) { this.vel.x += (opts.kb.x || 0) * kbMul; this.vel.y += (opts.kb.y || 0) * kbLaunchMul; this.vel.z += (opts.kb.z || 0) * kbMul; }
    if (opts.launch) this.vel.y += opts.launch * kbLaunchMul;
    // launched hard enough → walls and the ground become weapons for ~1.1s (slam damage in _physics)
    if (!opts.slam) {
      const kmag = opts.kb ? Math.hypot(opts.kb.x || 0, opts.kb.z || 0) : 0;
      if (kmag > 30 || Math.abs(opts.launch || 0) > 12) {this._personThrow=null;this.launchT = this._chaseKb ? PW_KB.window : 1.1;}
      else if (this._chaseKb && opts.finisher && amount > 0 && kmag > 0) {
        // A connected combo ender needs a short carry even below heavy-launch strength.
        // Funded guards return before this point; retain the normal resistance-scaled impulse.
        this._personThrow=null;this.launchT=Math.max(this.launchT,.55);
      }   // A new launch owns its own impact.
      if ((kmag > 14 || (opts.launch || 0) > 6) && (this.hanging || this._grapple)) this.releaseHang();   // knocked off the wall
    }
    // ---- BLEEDING (manual §12): heavy physical trauma and every slash-class weapon OPENS A WOUND.
    // After the guard branch on purpose: blocked hits never wound. Bleed ticks can't re-wound.
    if (amount > 0 && opts.src && opts.src !== this && !opts.bleed
        && ((opts.dmgClass === 'slash' && amount >= 4) || (dtype === 'physical' && amount >= 18))) {
      this.addBleed(opts.src);
    }
    // ---- ZONED WOUNDS (manual §18): a single hit ≥16% of max hp marks the zone it struck,
    // and dtype+kind DERIVE the injury type — fire burns, slams fracture, slashes lacerate,
    // cold scars, acid on a metal frame corrodes. No hand-authoring, ever.
    if (amount >= this.maxHp * 0.16 && opts.src && opts.src !== this && !opts.bleed && this.state !== 'ko') {
      const wkind = dtype === 'fire' ? 'BURN' : opts.slam ? 'FRACTURE' : opts.dmgClass === 'slash' ? 'LACERATION'
        : dtype === 'cold' ? 'FROST-SCAR' : (dtype === 'acid' && this.metal) ? 'CORROSION' : opts.strike ? 'FRACTURE' : 'CONTUSION';
      this.addWound(opts.zone || (opts.dmgClass === 'slash' ? 'arm' : opts.slam ? 'leg' : dtype === 'cold' ? 'leg' : 'torso'), wkind);
    }
    // ---- THE STUN (manual §9): a big enough beating in a short window scrambles anyone ----
    // Track burst damage over a rolling ~2s; crossing 24% of max hp = STUNNED (stars around the
    // head, no actions, and a flyer FALLS — "knocked out of the air"). ccRecover shortens it,
    // a 4s immunity stops chain-stunning, frozen fighters are already disabled.
    if (amount > 0 && opts.src && opts.src !== this && !this.isDummy) {
      recordBurstDamage(this,amount);
      if (this.stunT <= 0 && this._stunImmune <= 0 && this.frozenT <= 0 && this.state !== 'ko'
          && this._burst >= this.maxHp * 0.24) this.applyStun();
    }
    // robots shower sparks instead of bruising
    if (this.metal && this._game && amount >= 3) {
      this._game.particles.burst(this.pos.x, this.pos.y + 5.5, this.pos.z, { count: 8, speed: 26, life: 0.4, size: 1.8, color: ['#ffd97a', '#fff', '#ff9a2a'], up: 4, grav: 26, drag: 1.2 });
    }
    this.state = 'hit'; this.stateT = 0;
    this._resolveLethal(opts);
    if (this._game) this._game.onHit(this, amount, opts, false,resolvedOutcome());
    return amount;
  }

  // Chip damage and direct hits share the same death/Second Wind lifecycle.
  // Returning early from block used to leave a living, guarding fighter at 0 HP.
  _resolveLethal(opts) {
    if(this.hp>0||this.state==='ko')return; // a nested riposte may already have resolved this death
    // Second Wind is an explicit authored opt-in. Default play must not turn a
    // lethal hit into an unexplained 1-HP movement lock requiring a rally input.
    if (this.def.secondWind === true && this.hp <= 0 && !this._secondWindUsed && !this.isDummy && !this.remote
        && this._game && this._game.isHuman(this)) {
      this._secondWindUsed = true;
      this.hp = 1; this.downedT = 2.4; this._swHold = 0;
      this.stunT = 0; this.frozenT = 0; this.meleeCharge = 0; this.strikeActive = 0;
      this.guarding = false; this.chargingKi = false;
      this.flying = false; this.flyHeld = false; this.gliding = false;
      if (this.grabbing) this._game.melee.release(this);
      const g = this._game;
      g.slowmo(1.2, 0.35);
      if (g.hud) { g.hud.announce('STAY DOWN?', 'hold any attack — invincible always gets up', '#ff5a4a'); g.hud.flashScreen('#ff3b3b', 0.25); }
      g.audio.grunt(this.def.voicePitch || 1, this.pos);
      g.vfx.ring(this.pos.clone().setY(0.5), { color: '#ff5a4a', r0: 1, r1: 11, life: 0.5, flat: true, y: 0.5 });
    }
    if (this.hp <= 0) this._ko(opts);
  }

  applyStun() {
    const rec = (this.sheet && this.sheet.ccRecover) || 1;
    this.stunT = 1.7 / rec;
    resetBurstWindow(this);
    this.flying = false; this.flyHeld = false;         // a stunned flyer FALLS — gravity owns them
    this.gliding = false;
    this.guarding = false; this.chargingKi = false; this.meleeCharge = 0; this.strikeActive = 0;
    if (this._game) {
      if (this.grabbing) this._game.melee.release(this);
      this._game.audio.sample ? this._game.audio.sample('parry', { pos: this.pos, rate: 0.6, gain: 0.7 }) : this._game.audio.hit(180, this.pos);
      if (this._game.hud && this._game.hud.damageNumber) this._game.ui('damageNumber', this.pos, 'STUNNED', '#ffd24a', true);
    }
  }

  _ko(opts = {}) {
    stopFlightAudio(this);
    const restorePose=this._lostControlPose?.applied?this._lostControlPose.nodes:[];this._lostControlPose=null;
    retirePowerUp(this);
    clearWebControl(this);clearWebControlsFromSource(this);
    invalidateFighterMotion(this);
    retireNanites(this._nanites);presentNanites(this);
    if(this._game)retireOwnedConstructs(this._game,this,'owner-ko',true);
    this._game?.melee?.clearInput(this);
    // Keep the final joint transforms for ragdoll capture, but never carry a live
    // aiming weight/world target into the next life. Base joints restore in _animate.
    this._combatAim = null;
    this._riflePose = null; // ragdoll keeps final contacts, never an old restore snapshot
    if(this._jumpMotion)Object.assign(this._jumpMotion,{take:null,mode:null,time:0,weight:0,wasAir:false});
    if(this._groundTransition)Object.assign(this._groundTransition,{remaining:0,blocked:true,family:null});
    if(this._spinePose){this._spinePose.engaged=false;this._spinePose.bias=0;}
    this._groundAimSupport?.rotation.identity();
    this._hitReaction = null;
    this.state = 'ko'; this.koT = 0; this.flyHeld = false; this.flying = false; this.descendHeld = false;
    this.releaseHang();
    this.guarding = false; this.phase = false; this.strikeActive = 0; this.guardBreakT = 0;
    if(this.parts.guardArc){this.parts.guardArc.visible=false;this.parts.guardArc.material.clearHits?.();}
    this.frozenT = 0; this.frost = 0; this.stunT = 0; resetBurstWindow(this); this._dots.length = 0; this.meleeCharge = 0; this._heavyT = 0;
    this.clotBleed(null, true);   // the dead stop bleeding (and the suit un-tints for the respawn)
    this.sleepT = 0; this.blindT = 0; this._sleepK = 0; this.downedT = 0;this.shockT=0;this._shockImmune=0;
    if (this.parts.ice) this.parts.ice.visible = false;
    if (this._game && (this.grabbing || this.grabbedBy)) this._game.melee.release(this.grabbing ? this : this.grabbedBy);
    if (this._game) for (const e of this._game.entities) if (e.grabbedBy === this) { e.grabbedBy = null; if (e.state === 'hit') e.state = 'idle'; }   // tentacle holds die with the holder
    clearSlotFx(this);   // silence charge hums + remove orbs FIRST — clearing `charging` below orphans them otherwise (the stuck-tone bug)
    for (const k in this.slots) { const s = this.slots[k]; s.charging = false; s.active = null; s.chargeT = 0; s.sustainT = 0; }   // dying mid-generation leaves nothing armed
    resetMovementGears(this);
    this.cruiseHeld = false;
    if (this._burnLoop) { this._burnLoop.stop(); this._burnLoop = null; }   // the dead don't burn (manual §20)
    if (this._grapLoop) { this._grapLoop.stop(); this._grapLoop = null; }
    if (this._held) this._held.clear();   // netplay: no ghost-held beams from a dead puppet
    // become a ragdoll — carry the killing blow's knockback (+ a small pop) into the sim as launch
    if (this.canPhase) { for (const m of [this.parts.mats.suit, this.parts.mats.suit2]) { m.transparent = false; m.opacity = 1; } }
    const downward = opts.meleeMove === 'slam-release';
    this.ragdoll = new Ragdoll(this, this.vel.clone().add(new THREE.Vector3(0, downward ? 0 : 12, 0)), { downward,restorePose });
    this.vel.set(0, 0, 0);
  }

  heal(a) { this.hp = clamp(this.hp + a * this.sheet.healMult, 0, this.maxHp); }
  spendKi(a) { if (this.energyInfinite) return true; if (this.ki < a) return false; this.ki -= a; return true; }
  // Ordinary regeneration only. Anchored resource rehearsals share this exact
  // native calculation without advancing physics, status clocks or guard charge.
  regenerateKi(dt, anyCharge = Object.values(this.slots).some(s => s.charging || s.sustainT > 0)) {
    if (this.energyInfinite) this.ki = this.maxKi;
    else if(!((this._openSky||this._game?.modeId==='powerworld')&&this._blocked>0))this.ki = clamp(this.ki + (anyCharge ? 3 : 8) * this.sheet.kiRegenMult * moodMult(this, 'kiRegen', 1) * (1 - 0.07 * ((this._wounds && this._wounds.torso) || 0)) * dt, 0, this.maxKi);
  }

  // Launch impacts and vulnerable-body falls share one contact admission. An
  // ordinary self-powered wall touch remains harmless; wind-driven walls don't.
  _slam(game, speed, kind, axis=null) {
    if (!game || this._slamCd > 0 || this.state === 'ko' || speed < 30) return;
    const personThrow=this._personThrow&&this._thrownT>0&&this._thrownBy===this._personThrow.owner&&this.lastHitBy===this._personThrow.owner?this._personThrow:null;
    if(personThrow?.impacted)return;
    const ownedSpeed=this.launchT>0?speed:kind==='wall'?windImpactSpeed(this,axis):0;
    const landing=kind==='ground'||kind==='roof';
    const launchDamage=(landing?ownedSpeed>38:ownedSpeed>=30)?Math.min(32,(ownedSpeed-22)*.5):0;
    const dmg=Math.max(launchDamage,fallDamage(this,speed,kind));
    if(dmg<=0)return;
    if(personThrow)personThrow.impacted=true;
    this._slamCd = 0.45;
    const src = this.launchT>0&&this.lastHitT < 3 ? this.lastHitBy : null;
    this.takeDamage(dmg, { src, slam: true, unblockable: true, hitstop: 0.1 });
    if(personThrow&&landing)beginImpactRecovery(this);
    // T8: somebody drove me into geometry. `_updateGait` consumes this next frame and, IF the impact
    // left me staggered, calls it CRASH — the 'none' owner. A slam that neither staggers nor stuns
    // just keeps my grammar (F1: an involuntary arrival never cancels flight). NOTE `_slam` does NOT
    // itself write staggerT — that would change every city wall-slam (rule: the city is unchanged).
    this._gaitCrash = 1;
    if (game.onSlam) game.onSlam(this, dmg, kind, {ordinaryFall:this.launchT<=0&&kind!=='wall'});
  }

  update(dt, game) {
    updateImpactRecovery(this,dt);
    if(movementGearBlocked(this))resetMovementGears(this);
    cancelInterruptedThrow(this);
    updateFirearmReload(this,dt,game);
    cancelInterruptedRush(this);
    updateWebSnare(this,dt,game);
    // Status branches may return before advanceActionPose (notably frozen).
    // Retire an interrupted hit window now, without advancing its visual clock.
    cancelInterruptedAbilityMeleePose(this);
    if(this._nanites)for(const [slot,module]of this._nanites.modules)if(!module.retired){
      let identity;try{if(this.slots[slot])identity=attackIdentity(this.slots[slot].def);}catch{/* Invalid replacement cannot retain a capability. */}
      if(identity!==module.sourceKey){cancelHeldSlot(this,slot);retireNanites(this._nanites,slot);}
    }
    if(this._retiredFormResources.size&&(this._formResourceT-=dt)<=0){this._formResourceT=.25;this._releaseFormResources();}
    this.animT += dt;
    if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt * 4);
    if (this.buffT > 0) { this.buffT -= dt; if (this.buffT <= 0) { this.powerBuff = this.levelMult; this.buffName = ''; } }
    this.lastHitT += dt; this.lastKillT += dt;
    if (this._landT > 0) this._landT -= dt; if (this._liftFx > 0) this._liftFx -= dt;
    if (this._chill > 0) { this._chill -= dt; if (this._chill <= 0) this.speed = this.def.speed || 30; }
    if (this.invuln > 0) this.invuln -= dt;
    // mood one-shots run on their own short clocks — they are moments, not states
    if (this._moodVulnT > 0) this._moodVulnT -= dt;
    if (this._moodMeleeT > 0) this._moodMeleeT -= dt;
    if (this._moodErraticT > 0) this._moodErraticT -= dt;
    if (this._moodFleeT > 0) this._moodFleeT -= dt;
    if (this._moodHasteT > 0) this._moodHasteT -= dt;
    if (this.evadeCd > 0) this.evadeCd -= dt;
    if (this._bounceCd > 0) this._bounceCd -= dt;   // blocked-strike rejection debounce
    if (this.sprintT > 0) this.sprintT -= dt;
    if (this._slideT > 0) this._slideT -= dt;
    if (this.burstT > 0) this.burstT -= dt;
    if (this.launchT > 0) this.launchT -= dt;
    if (this.downedT > 0) {
      this.downedT -= dt;
      this.staggerT = Math.max(this.staggerT, 0.12);   // one pin — every action gate already reads stagger
      this._landT = Math.max(this._landT, 0.22);       // the knee: he is DOWN
      this.vel.x *= 0.85; this.vel.z *= 0.85;
      if (this.downedT <= 0 && this.hp <= 1.01) {      // never rallied — the knockout completes
        this.hp = 0; this._ko();
      }
    }
    if (this._sleepImmune > 0) this._sleepImmune -= dt;
    if (this._disarmT > 0) this._disarmT -= dt;
    // THE DRAW (engine/hands.js). ⚠ `_handT` was SET at every hand swap and decremented by nothing,
    // so it read 0.35 forever — any surface asking "am I drawing?" would have answered yes for the
    // rest of the match. A timer nobody ticks is not a timer, it is a constant with a misleading name.
    if (this._handT > 0) this._handT -= dt;
    if (this._wounds) for (const z of ['arm', 'leg', 'torso']) {
      if (this._wounds[z] > 0 && (this._woundT[z] -= dt) <= 0) {
        this._wounds[z]--;
        if (this._wounds[z] > 0) this._woundT[z] = 28 / ((this.sheet && this.sheet.ccRecover) || 1);
      }
    }
    // Ordinary open-sky travel has a continuous slipstream too; boost controls its emphasis.
    if(this._game&&this._openSky&&(this.airborne||this.def.movementTrail)&&this.alive){
      this._game.vfx.surfaceWake?.(this);
      if(this.vel.lengthSq()>900&&(this.def.model?.wake?.intensity??1)>0)this._game.vfx.flightWake(this);
    }
    // ---- AFTERBURNER (manual §15): hold cruise 0.8s with a burner-class core → IGNITION ----
    {
      const AF = this.def.afterburner;
      // ⚠ READER #10 (aaa-03 §1): the burner is a FLIGHT system and must not stay lit on the floor.
      // `airborne` (gait) not `flying`, so a fighter standing on the PowerWorld floor cuts the burn.
      if (!this.movementGear?.managed && AF && this.airborne && this.cruiseHeld && this.ki > 1 && !(this._openSky && this.guarding)) {   // Semantic gears own their own travel budget.
        const was = this._burnT || 0;
        this._burnT = was + dt;
        if (was < 0.8 && this._burnT >= 0.8 && this._game) {   // ignition: one compression ring, then the wake
          this._game.vfx.ring(this.pos.clone().setY(this.pos.y + 5), { color: (AF.wake && AF.wake[0]) || '#fff', r0: 6, r1: 1, life: 0.25 });
          this._game.audio.boom(0.35, this.pos);
          // the LOOP LAW (manual §20): ignition is the one-shot, the BURN is a sustained voice —
          // created fading in, driven every live frame, faded on cut, reaped by the watchdog
          if (!this._burnLoop && this._game.audio.sustain) this._burnLoop = this._game.audio.sustain('fire', this.pos);
        }
        if (this._burnT > 0.8) {
          this.ki = Math.max(0, this.ki - ((AF.kiPerSec || 6) - 2.6) * dt);   // cruise already bills 2.6/s
          if (this._burnLoop) this._burnLoop.set(0.5 + Math.min(0.6, Math.hypot(this.vel.x, this.vel.y, this.vel.z) / 170), this.pos);
          if (this._game && this._openSky) this._game.vfx.flightWake(this);
          else if (this._game && Math.random() < 0.85) {                     // city wake retains its distant particle language
            const w = AF.wake || ['#ffffff', '#ffd24a'];
            this._game.particles.spawn({ x: this.pos.x - this.vel.x * 0.045, y: this.pos.y + 4 - this.vel.y * 0.045, z: this.pos.z - this.vel.z * 0.045,
              vx: -this.vel.x * 0.16 + (Math.random() * 6 - 3), vy: -this.vel.y * 0.16 + (Math.random() * 6 - 3), vz: -this.vel.z * 0.16 + (Math.random() * 6 - 3),
              life: 0.5, size: 3 + Math.random() * 2, color: w, drag: 0.8, shrink: true });
          }
        }
      } else if ((this._burnT || 0) > 0.8 && this._game) {                   // tank dry / throttle closed: the wake BREAKS APART
        const AFW = (AF && AF.wake) || ['#ffffff', '#ffd24a'];
        if(!this._openSky)this._game.particles.burst(this.pos.x, this.pos.y + 4, this.pos.z, { count: 12, speed: 18, life: 0.5, size: 2.6, color: AFW, drag: 1.2 });
        this._burnT = 0;
        if (this._burnLoop) { this._burnLoop.stop(); this._burnLoop = null; }
      } else {
        this._burnT = 0;
        if (this._burnLoop) { this._burnLoop.stop(); this._burnLoop = null; }
      }
    }
    if (this._sleepGrace > 0) this._sleepGrace -= dt;
    updateWebControl(this,dt);
    if (this.sleepT > 0) {
      this.sleepT -= dt;
      this.staggerT = Math.max(this.staggerT, 0.12);            // the one pin — no actions while folded
      this._sleepK = Math.min(1, (this._sleepK || 0) + dt * 1.5);   // the SLOW fold, not an instant freeze
      this._landT = Math.max(this._landT, 0.26 * this._sleepK);     // knees give out as the fold deepens
      this.vel.x *= 0.8; this.vel.z *= 0.8;
      if (this._game && Math.random() < dt * 1.4) {             // soft slow rings — stun's stars are sharp, this is a lullaby
        this._game.vfx.ring(this.pos.clone().setY(this.pos.y + 9.4), { color: '#ffe9b0', r0: 0.6, r1: 3.4, life: 0.85 });
      }
      if (this.sleepT <= 0) this.wake(true);
    } else if (this._sleepK > 0) this._sleepK = Math.max(0, this._sleepK - dt * 3);
    if (this.blindT > 0) this.blindT -= dt;
    if (this._slamCd > 0) this._slamCd -= dt;
    if (this.drainedT > 0) this.drainedT -= dt;
    if (this._noKiT > 0) this._noKiT -= dt;
    this._bowDraw = damp(this._bowDraw || 0, this._bowDrawT || 0, 16, dt);   // archer draw pose blend
    for (const it of this.items) if (it.cd > 0) { it.cd -= dt; if (it.cd <= 0 && it.state === 'cooldown') it.state = 'ready'; }
    if (this._revealT > 0) this._revealT -= dt;
    // jump-jet gadget: temporary full flight for grounded heroes
    if (this._jetT > 0) {
      this._jetT -= dt;
      if (game && Math.random() < 0.7) game.particles.spawn({ x: this.pos.x + (Math.random() * 2 - 1), y: this.pos.y + 0.8, z: this.pos.z + (Math.random() * 2 - 1), vx: 0, vy: -12, vz: 0, life: 0.35, size: 2.2, color: ['#ffd97a', '#8a8f99'], drag: 1.2, shrink: true });
      if (this._jetT <= 0) { this.flightTier = this._jetPrev; if (this.flying && this.flightTier < 1) this.flying = false; }
    }
    if (this._frostImmuneT > 0) this._frostImmuneT -= dt;
    if (this.frost > 0 && this.frozenT <= 0) this.frost = Math.max(0, this.frost - dt * 0.25);   // buildup decays
    // damage-over-time stacks (poison/burn/gas)
    // ⚠ DoT ticks MUST route through takeDamage (manual §2). They used to subtract HP directly,
    // which meant every poison/burn/gas stack silently ignored armour, toughness, phase, the
    // shield pack, guard AND every resistance — a poison arrow ticked TITAN exactly as hard as
    // it ticked a civilian. Damage accumulates and lands as a DISCRETE tick so the number is
    // readable and the hit-flash doesn't strobe at 60Hz.
    // ---- SHOCK (roadmap 5): actions locked, and a machine sparks while it lasts ----
    if (this.shockT > 0) {
      this.shockT -= dt;
      this.staggerT = Math.max(this.staggerT, 0.05);          // one pin = every existing gate
      if (Math.random() < dt * 26) {
        const p = this.pos;
        game.particles.spawn({ x: p.x + (Math.random() * 4 - 2), y: p.y + 3 + Math.random() * 6, z: p.z + (Math.random() * 4 - 2), vx: 0, vy: 2, vz: 0, life: 0.18, size: 1.1, color: ['#bfe9ff', '#fff'], drag: 1 });
      }
      if (this.flying && this.shockT > 0) this.flying = false;   // a shocked flier drops
    }
    if (this._shockImmune > 0) this._shockImmune -= dt;
    if (this._mvT > 0) this._mvT -= dt;   // the move intent is a FRESHNESS window, not a latch
    // ---- ARMOUR AS A THIRD BAR (roadmap 4): plate soaks hits and knits back together out of
    // combat. Only armoured/metal fighters have one, so it reads as a property of the chassis.
    if (this.armorMax > 0) {
      this._armorCalm = (this._armorCalm || 0) + dt;
      if (this._armorCalm > 5 && this.armor < this.armorMax) this.armor = Math.min(this.armorMax, this.armor + dt * (this.armorMax * 0.14));
    }

    // ---- TIER THREE per-frame, part two ----
    updateDupes(this, dt, game);
    updatePossession(this, dt, game);
    updateElastic(this, dt, game);
    updateWallCrawl(this, dt, game);
    updateTk(this, dt, game);
    updateMimic(this, dt, game);
    updateMount(this, dt, game);
    updateVisionMode(this, dt, game);

    // ---- TIER THREE per-frame: size, invisibility, regeneration, banishment ----
    updateSize(this, dt, game);
    updateInvisible(this, dt, game);
    updateRegen(this, dt, game);
    updateBanish(this, dt, game);

    // ---- VAMPIRIC AURA (brief T2.7): a low crimson circle that drains everyone standing in
    // it and feeds the caster. Veins of energy reach from each victim toward you, and your own
    // shadow deepens as more of them are being drained.
    if (this._siphon && this.alive) {
      const S = this._siphon; S.t -= dt;
      S._acc = (S._acc || 0) + dt;
      if (S._acc >= 0.5) {
        const tick = S._acc; S._acc = 0;
        let drained = 0;
        for (const f of game.entities) {
          if (!f.alive || f === this || f.isDummy || !game.isFoe(this, f)) continue;
          const dx = f.pos.x - this.pos.x, dz = f.pos.z - this.pos.z;
          if (dx * dx + dz * dz > S.r * S.r) continue;
          f.takeDamage(S.dps * tick, { src: this, dot: true, dtype: 'magic', hitstop: 0, dmgColor: S.color });
          drained++;
          game.particles.spawn({ x: f.pos.x, y: f.pos.y + 4, z: f.pos.z, vx: (this.pos.x - f.pos.x) * 1.6, vy: 2, vz: (this.pos.z - f.pos.z) * 1.6, life: 0.4, size: 1.5, color: [S.color, '#ff5a4a'], drag: 0.4 });
        }
        if (drained) { this.hp = Math.min(this.maxHp, this.hp + S.dps * tick * 0.6 * drained); this._siphonN = drained; }
      }
      if (game.vfx && Math.random() < dt * 14) game.vfx.ring(this.pos.clone().setY(0.4), { color: S.color, r0: S.r * 0.9, r1: S.r, life: 0.3, flat: true, y: 0.4 });
      if (S.t <= 0) this._siphon = null;
    }
    // ---- ADRENALINE SURGE (brief T2.14): the power is bought with BLOOD. Each tick dims the
    // glow — the body visibly paying for it — and it cannot kill you, only leave you at 1.
    if (this._bloodBuff && this.alive) {
      const B = this._bloodBuff; B.t -= dt;
      B._acc = (B._acc || 0) + dt;
      if (B._acc >= 0.5) {
        const cost = B.hps * B._acc; B._acc = 0;
        this.hp = Math.max(1, this.hp - cost);
        if (game.hud && game.isHuman(this)) game.hud.damageNumber(this.pos, '-' + Math.round(cost), '#ff5a4a', true);
        game.particles.burst(this.pos.x, this.pos.y + 6, this.pos.z, { count: 3, speed: 5, life: 0.4, size: 1.6, color: ['#ff5a4a', '#8a1d24'], up: 6, drag: 1.4 });
      }
      if (B.t <= 0) this._bloodBuff = null;
    }
    // ---- COUNTER STANCE (brief T2.18): a timing window, not a permanent parry ----
    if (this._riposte) { this._riposte.t -= dt; if (this._riposte.t <= 0 || this._riposte.used) this._riposte = null; }

    // ---- BLEEDING (manual §12): the wound tears with MOVEMENT and clots with STILLNESS ----
    if (this._bleed > 0 && this.state !== 'ko') {
      const bspd = Math.hypot(this.vel.x, this.vel.z);
      const mv = bspd > 26 ? 2.1 : bspd > 8 ? 1 : 0;   // sprint tears the wound wide open
      if (mv === 0) { this._bleedStill += dt; if (this._bleedStill >= 4) this.clotBleed(game); }
      else this._bleedStill = 0;
      if (this._bleed > 0 && mv > 0) {
        this._bleedAcc += this._bleed * 1.1 * mv * dt;
        this._bleedTick += dt;
        if (this._bleedTick >= 0.5) {
          this._bleedTick = 0;
          if (this._bleedAcc >= 0.4) {
            const a = this._bleedAcc; this._bleedAcc = 0;
            // through the choke point like every DoT — trueDamage: the wound is already inside
            this.takeDamage(a, { src: this._bleedSrc, dot: true, bleed: true, unblockable: true, trueDamage: true, dtype: 'physical', hitstop: 0, dmgColor: '#ff4a3a' });
          }
        }
      }
      if (this._bleed > 0 && game) {
        // the tell: red drips falling straight DOWN — downward red is bleeding's alone
        if (Math.random() < dt * (mv > 0 ? 9 : 2.5) * this._bleed) {
          game.particles.spawn({ x: this.pos.x + (Math.random() * 2 - 1) * 1.6, y: this.pos.y + 4.2 + Math.random() * 1.6, z: this.pos.z + (Math.random() * 2 - 1) * 1.6,
            vx: this.vel.x * 0.12, vy: -13, vz: this.vel.z * 0.12, life: 0.5, size: 1.5, color: ['#c22a2a', '#7a1414'], grav: 30, drag: 0.3, shrink: true });
        }
        // the trail a runner leaves
        if (mv > 0) {
          this._bleedTrailT = (this._bleedTrailT || 0) - dt;
          if (this._bleedTrailT <= 0) {
            this._bleedTrailT = 0.16;
            game.particles.spawn({ x: this.pos.x - this.vel.x * 0.05, y: (this.groundY || 0) + 0.5, z: this.pos.z - this.vel.z * 0.05, vx: 0, vy: -1, vz: 0, life: 1.0, size: 2.0, color: ['#8a1a1a', '#5a0e0e'], grav: 2, drag: 3 });
          }
        }
        // the darkening patch on the suit
        const mats = this.parts && this.parts.mats;
        if (mats && mats.suit && this._suitHex != null) {
          mats.suit.color.setHex(this._suitHex).lerp(_BLOOD, Math.min(0.5, this._bleed * 0.17));
        }
      }
    }
    for (let i = this._dots.length - 1; i >= 0; i--) {
      const d = this._dots[i]; d.t -= dt;
      if (this.state !== 'ko' && this.invuln <= 0) {
        d._acc = (d._acc || 0) + d.dps * dt; d._tick = (d._tick || 0) + dt;
        if (d._tick >= 0.5) {
          this.takeDamage(d._acc, { src: d.src, dot: true, hitstop: 0, dtype: d.dtype || 'toxic', dmgColor: d.color, corrode: d.corrode, corrodeDur: d.t });
          // A lethal tick calls _ko(), which clears the whole stack. Stop before
          // the next stale index (or an expiry splice) touches the emptied list.
          if (this.state === 'ko') break;
          d._acc = 0; d._tick = 0;
        }
        if (game && Math.random() < 0.25) game.particles.spawn({ x: this.pos.x + (Math.random() * 3 - 1.5), y: this.pos.y + 4 + Math.random() * 4, z: this.pos.z + (Math.random() * 3 - 1.5), vx: 0, vy: 5, vz: 0, life: 0.5, size: 2, color: d.color, drag: 1, shrink: true });
      }
      if (d.t <= 0) this._dots.splice(i, 1);
    }
    // ACID: the corrosion timer, and the smoke that tells everyone the plate is open
    if (this._corrode > 0) {
      this._corrode -= dt;
      if (this._corrode <= 0) { this._corrode = 0; this._corrodeAmt = 0; }
      else if (game && Math.random() < dt * 22) {
        game.particles.spawn({ x: this.pos.x + (Math.random() * 5 - 2.5), y: this.pos.y + 2 + Math.random() * 7, z: this.pos.z + (Math.random() * 5 - 2.5),
          vx: (Math.random() * 2 - 1) * 2, vy: 9 + Math.random() * 5, vz: (Math.random() * 2 - 1) * 2,
          life: 0.9, size: 3.4, color: ['#c8e04a', '#9ab030', '#e6f0a0'], drag: 0.9, shrink: true });
      }
    }
    // FROZEN SOLID — a block of ice: no actions, physics still shoves you around
    advanceBurstWindow(this,dt);
    if (this._stunImmune > 0) this._stunImmune -= dt;
    if (this.stunT > 0) {
      // applyStun already scales the duration by recovery. This is remaining
      // simulation seconds; scaling the countdown again squares the bonus.
      this.stunT = Math.max(0, this.stunT - dt);
      if (this.stunT <= 0) { this._stunImmune = 4; }   // no chain-stunning
    }
    if (this.frozenT > 0) {
      // This branch returns before melee.update: never bank a hold/finisher until thaw.
      if(game?.melee) {
        game.melee._endStrike(this);
        if(this.grabbing || this.grabState)game.melee.release(this);
      }
      this.guarding = false; this.meleeCharge = 0;
      // _thaw needs a live freeze to retire it and grant refreeze immunity.
      if (this.frozenT <= dt * this.sheet.ccRecover) this._thaw(false);
      else this.frozenT -= dt * this.sheet.ccRecover;
      this._physics(dt, game); this._animate(dt); this._sync(); return;
    }
    // Green-Lantern-style barrier guards run on ki, not just the guard meter (out-drains base regen)
    if (this.guarding && this.def.guardType === 'barrier') {
      this.ki = Math.max(0, this.ki - 16 * dt);
      if (this.ki <= 0) { this.guarding = false; this.staggerT = 0.4; if (game && game.onDrained) game.onDrained(this); }
    }
    for (const k in this.slots) if (this.slots[k].cd > 0) this.slots[k].cd -= dt;
    advancePowerUp(this,dt);
    // melee timers
    if (this.strikeCd > 0) this.strikeCd -= dt;
    if (this.comboWin > 0) this.comboWin -= dt;
    if (this.staggerT > 0) this.staggerT -= dt * this.sheet.ccRecover;   // RESOLVE + Iron Will shake it off
    this.guardBreakT=Math.max(0,(this.guardBreakT||0)-dt*this.sheet.ccRecover);
    if (this._blocked > 0) this._blocked -= dt;
    this.guardMeter = clamp(this.guardMeter + (this.guarding ? 0 : 0.55) * dt, 0, 1);
    if (game && game.melee) game.melee.update(this, dt);
    if (this.sprintT > 0 && game && Math.random() < 0.45) game.trail(this, this.def.colors.accent);   // sprint streak
    // VOLT-style lightning wake: blue arcs crackle behind a sprinting speedster
    if (this.sprintT > 0 && this._sprintLightning && game && Math.random() < 0.3) {
      game.vfx.lightning(this.pos.clone().setY(1.2), { color: '#7fd4ff', count: 2, radius: 5, height: 4 });
    }
    // procedural tentacles (built lazily; idle sway unless an ability aims them)
    if (this.def.tentacles && !this.tentacles && game) this.tentacles = buildTentacles(game.scene, this.def);
    if (this.tentacles) {
      _anchor.set(this.pos.x - this.aim.x * 1.2, this.pos.y + 6.6, this.pos.z - this.aim.z * 1.2);
      for (const t of this.tentacles) t.update(dt, _anchor, this.animT);
    }
    // readability: skid dust when you're being SHOVED along the ground (beam push / knockback / blockstun)
    if (game && this.grounded && (this.launchT > 0 || this._blocked > 0) && Math.hypot(this.vel.x, this.vel.z) > 24 && Math.random() < 0.55) {
      game.particles.spawn({ x: this.pos.x - this.vel.x * 0.02, y: 0.6, z: this.pos.z - this.vel.z * 0.02, vx: -this.vel.x * 0.12 + (Math.random() * 2 - 1) * 4, vy: 5 + Math.random() * 4, vz: -this.vel.z * 0.12 + (Math.random() * 2 - 1) * 4, life: 0.45, size: 3, color: ['#6a655a', '#8a8577'], grav: 8, drag: 1.6 });
    }
    // robot foot exhaust — thruster wash while flying or hustling
    if (this.metal && game && (this.flying || Math.hypot(this.vel.x, this.vel.z) > 14) && Math.random() < 0.6) {
      game.particles.spawn({ x: this.pos.x + (Math.random() * 2 - 1), y: this.pos.y + 0.8, z: this.pos.z + (Math.random() * 2 - 1), vx: -this.vel.x * 0.15, vy: this.flying ? -16 : -4, vz: -this.vel.z * 0.15, life: 0.4, size: 2.6, color: ['#ff9a2a', '#6a6f78', '#ffd97a'], drag: 1.4, shrink: true });
    }
    // signature flight styles — the old-Torch fire wake, the Iceman ride
    const flySpd = Math.hypot(this.vel.x, this.vel.z);
    if (game && this.flying && this.def.flyStyle === 'fire' && flySpd > 8 && Math.random() < 0.8) {
      game.particles.spawn({ x: this.pos.x - this.vel.x * 0.04, y: this.pos.y + 3.5 + Math.random() * 3, z: this.pos.z - this.vel.z * 0.04, vx: -this.vel.x * 0.2 + (Math.random() * 2 - 1) * 4, vy: 3 + Math.random() * 5, vz: -this.vel.z * 0.2 + (Math.random() * 2 - 1) * 4, life: 0.55, size: 3.4, color: ['#ff6a1a', '#ffd24a', '#ff3b1a'], drag: 1, shrink: true });
    }
    if (this.def.flyStyle === 'ice') {
      // he doesn't fly — he RIDES: a frozen board under his feet + a frost ribbon behind
      if (!this.parts.iceBoard) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.35, 6.2), new THREE.MeshStandardMaterial({ color: '#bfeaff', transparent: true, opacity: 0.78, roughness: 0.15, metalness: 0.1, emissive: '#4fb8e6', emissiveIntensity: 0.3 }));
        b.visible = false; this.obj.add(b); this.parts.iceBoard = b;
      }
      const board = this.parts.iceBoard;
      board.visible = ridingBoard(this);
      if (board.visible) {
        if (game && flySpd > 8 && Math.random() < 0.7) game.particles.spawn({ x: this.pos.x - this.vel.x * 0.06, y: this.pos.y + 0.5, z: this.pos.z - this.vel.z * 0.06, vx: -this.vel.x * 0.1, vy: -2, vz: -this.vel.z * 0.1, life: 0.7, size: 2.4, color: ['#bfeaff', '#eaffff'], drag: 0.8, shrink: true });
      }
    }
    this.poseStrike = damp(this.poseStrike, this.strikeActive > 0 ? 1 : 0, 18, dt);
    this.poseGuard = damp(this.poseGuard, this.guarding ? 1 : 0, 14, dt);
    this.poseGrab = damp(this.poseGrab, (this.grabState || this.grabbing) ? 1 : 0, 16, dt);

    if (this.state === 'ko') {
      this._updateKO(dt, game);
      if (this.ragdoll) { this.ragdoll.step(dt, game); this.ragdoll.apply(this); this._sync(); return; }
      this._physics(dt, game); this._animate(dt); this._sync(); return;
    }

    // ki regen (slower while casting/charging; guarding safely doubles as a charge stance)
    const anyCharge = Object.values(this.slots).some(s => s.charging || s.sustainT > 0);
    // the DBZ charge scream: shout when the wind-up starts, ROAR if you keep pouring into it
    if (this._yellCd > 0) this._yellCd -= dt;
    if (anyCharge && !this._wasCharge) { this._chargeHeldT = 0; if (game && game.heroYell) game.heroYell(this, 0.7); }
    if (anyCharge) { this._chargeHeldT = (this._chargeHeldT || 0) + dt; if (this._chargeHeldT > 1.15 && !this._bigYelled && game && game.heroYell) { this._bigYelled = true; game.heroYell(this, 1.3); } }
    else this._bigYelled = false;
    this._wasCharge = anyCharge;
    this.regenerateKi(dt, anyCharge);
    // guard to recover ki — and THE POWER CHARGE (DBZ ruling 2026-07-24): hold the stance while
    // genuinely SAFE and it becomes the real thing — the scream, rising sparks, a white-hot state
    // ring, 40/s regen. A foe closing inside 55u drops you back to an honest block on its own;
    // getting TOUCHED mid-scream lands full damage and breaks it (see takeDamage). Defenseless
    // is the price of charging like that — exactly the genre's bargain.
    if (this.guarding && this._blocked <= 0 && this.def.guardType !== 'barrier') {
      this._chargeScanT -= dt;
      if (this._chargeScanT <= 0 && this._game) {
        this._chargeScanT = 0.2;
        let nd = 1e9;
        for (const f of this._game.entities) {
          if (!this._game.isFoe(this, f) || !f.alive) continue;
          const d = Math.hypot(f.pos.x - this.pos.x, f.pos.z - this.pos.z);
          if (d < nd) nd = d;
        }
        this._safeDist = nd;
      }
      this._chargeT = (this._safeDist > 55) ? this._chargeT + dt : 0;
      const was = this.chargingKi;
      // In PowerWorld this is the BLOCK button at every range, never a hidden
      // conversion to a defenseless stance. City power-charge rules stay intact.
      this.chargingKi = !this._openSky && game?.modeId!=='powerworld' && this._chargeT > 0.5 && this.ki < this.maxKi - 1 && !this.energyInfinite;
      if (this.chargingKi && !was && this._game.heroYell) { this._yellCd = 0; this._game.heroYell(this, 1.15); }
      this.ki = clamp(this.ki + (this.chargingKi ? 40 : 22) * this.sheet.kiRegenMult * dt, 0, this.maxKi);
      if (this.chargingKi && this._game.particles && Math.random() < dt * 16) {
        this._game.particles.spawn({
          x: this.pos.x + (Math.random() - 0.5) * 4.5, y: this.pos.y + 1, z: this.pos.z + (Math.random() - 0.5) * 4.5,
          vx: 0, vy: 15 + Math.random() * 12, vz: 0, life: 0.5, size: 1.7,
          color: [(this.def.colors && this.def.colors.accent) || '#ffd24a', '#fff'], drag: 1.2, shrink: true,
        });
      }
    } else { this.chargingKi = false; this._chargeT = 0; }

    // This entire frame skips physics, including the final partial hitstop.
    // Source/bridge clocks must see the hold before its timer is consumed.
    if (this.hitstop > 0) { this._animate(dt); this.hitstop -= dt; this._sync(); return; }

    if(this._nanites){advanceNanites(this._nanites,dt,new Set(Object.keys(this.slots).filter(key=>slotUnlocked(this,key))));updateNaniteAudio(this);}

    this._physics(dt, game);

    this.advanceActionPose(dt,anyCharge);

    this._animate(dt);
    if (game?.melee) game.melee.resolveContact(this);
    this._sync();
  }

  // Shared by live simulation and the anchored authoring stage. These are presentation
  // clocks only: resource regeneration, movement and collision stay in update().
  advanceActionPose(dt,anyCharge=Object.values(this.slots).some(s=>s.charging||s.sustainT>0)) {
    advanceThrowAction(this,dt);
    advanceAbilityMeleePose(this,dt);
    if (this.state === 'hit' && (this.stateT += dt) > 0.22) this.state = 'idle';
    this.castPose = damp(this.castPose, (this.state === 'cast' || anyCharge) ? 1 : 0, 12, dt);
    this.punchPose = damp(this.punchPose, 0, 10, dt);
    if (this.state === 'cast' && (this.stateT += dt) > 0.28) this.state = 'idle';
  }

  _updateKO(dt, game, {practice=false}={}) {
    this.koT += dt;
    if (this.koT > (this.isDummy ? 2.2 : 3.4)) {
      if (this.noRespawn&&!practice) { this._remove = true; return; }   // survival/wave enemies stay dead
      // put the figure hierarchy back exactly, then respawn
      if (this.ragdoll) { this.ragdoll.restore(); this.ragdoll = null; }
      // Keep the saved overlay base until _animate removes it, but discard the
      // dead life's aiming spring. A respawn is not a chest-attack recovery.
      this._chestPose?.rotation.identity();
      this.hp = this.maxHp; this.ki = this.maxKi * 0.4;
      this._firearmReload=null;if(!practice)for(const slot of Object.values(this.slots)){slot.ammo=null;firearmAmmo(slot);}
      this._zombieLimbs=null;
    this._wounds = { arm: 0, leg: 0, torso: 0 }; this._woundT = { arm: 0, leg: 0, torso: 0 };   // a fresh body (manual §18)
      if(!practice)for (const it of this.items) if (it.state !== 'deployed') { it.charges = it.def.charges ?? 1; it.state = 'ready'; it.cd = 0; }   // fresh pouch each life
      this.state = 'idle'; this.invuln = 1.4; this.vel.set(0, 0, 0);
      retirePowerUp(this);
      resetMovementGears(this);
      reconcileWindCarry(this);
      resetNanites(this._nanites);
      const motionGeneration=this._authoredMotionGeneration;
      if(this._pendingForm!==undefined)this.applyForm(this._pendingForm);
      if(typeof document!=='undefined'&&motionGeneration===this._authoredMotionGeneration)loadFighterMotion(this);
      if (this.isDummy) this.pos.copy(this.spawn);
      else { this.pos.set(this.spawn.x, 0, this.spawn.z); }
      game.vfx.flash(this.pos.clone().setY(5), this.def.colors.accent, 8, 0.4);
    }
  }

  _physics(dt, game) {
    cancelInterruptedTraversalLeap(this);
    if(this._scoutVehicle||this._aircraftVehicle||this._passengerTransport)return; // Seat owns movement, not status/cooldown updates.
    if(updateWebZip(this,dt,game))return;
    if (this.remote) return;   // puppets are positioned by the wire (controlRemote), not local physics
    // The holder owns a clinched victim's transform; gravity/deck servos cannot
    // tug the victim away from the grip between the two fighters' update calls.
    if(this.grabbedBy?.grabState==='clinch'){this.vel.set(0,0,0);return;}
    // WHERE AM I? — computed AFTER this frame's inputs (controlPlayer/Bot/Pad ran already) and BEFORE
    // the flight chain reads them (§2.1). Everything below is UNCHANGED; `gait` only DERIVES from it.
    this._updateGait(dt);
    // --- flight / levitation ---
    if (this.state !== 'ko') {
      // ---- THE GRAPNEL LINE: reeling and hanging own the axes — the deck servo, takeoff and
      // gravity all yield while the line is taut (same contract as launchT for knockback).
      if (this._grapple) {
        const G = this._grapple; G.t += dt;
        // the LINE CREAKS while taut (loop law, manual §20) — the bow's tension voice, repurposed
        if (!this._grapLoop && this._game && this._game.audio.sustain) this._grapLoop = this._game.audio.sustain('bow', this.pos);
        if (this._grapLoop) this._grapLoop.set(G.mantle ? 0.85 : 0.55, this.pos);
        const dx = G.x - this.pos.x, dy = G.y - (this.pos.y + 5.2), dz = G.z - this.pos.z;
        const d = Math.hypot(dx, dy, dz);
        if (G.t > 2.6 || this.staggerT > 0.25) { this._grapple = null; }
        else if (d < 3.2) {
          if (G.mantle) {                                       // top of the line — MANTLE the roof
            this.pos.x = G.x; this.pos.z = G.z; this.pos.y = G.top;
            this.vel.set(0, 0, 0); this.onBlock = true; this.flying = false;
          } else {                                              // below the lip — LEDGE HANG
            const nx = this.pos.x - G.x, nz = this.pos.z - G.z, nl = Math.hypot(nx, nz) || 1;
            this.hanging = { x: G.x + (nx / nl) * 2.4, y: G.y - 6.6, z: G.z + (nz / nl) * 2.4 };
            this.vel.set(0, 0, 0); this.flying = false;
          }
          this._grapple = null;
        } else {
          const v = 90 / d;                                     // the reel: ~90u/s along the line
          this.vel.x = dx * v; this.vel.y = dy * v; this.vel.z = dz * v;
          this.burstT = Math.max(this.burstT || 0, 0.08);       // lift move()'s clamp — the dash gotcha
          this.flying = false; this.gliding = false;
        }
      } else if (this.hanging) {
        // cling: pinned to the wall face. Jump climbs off with a pop; descend just lets go.
        const H = this.hanging;
        this.pos.x = H.x; this.pos.z = H.z;
        this.pos.y = damp(this.pos.y, H.y, 14, dt);
        this.vel.set(0, 0, 0);
        this.flying = false; this.gliding = false;
        if (this.flyHeld && !this._flyPrev) { this.releaseHang(); this.vel.y = 30; }
        else if (this.descendHeld) this.releaseHang();
        this._flyPrev = this.flyHeld;
      } else {
      // rising edge of the ascend intent → take off into levitation (grounded heroes can't)
      // ⚠ `_openSky` HERE TOO. This is the OTHER takeoff path — holding ascend from the ground — and
      // gating it on flightTier alone meant RAGE could be granted flight by the toggle and still not
      // get off the floor with the ascend key. Two doors into one state need the same lock.
      // THE JUMP vs TAKEOFF (aaa-02 §3.4). `Space` is one key with two meanings, disambiguated by
      // FOOTING: a rising edge on the GROUND is a JUMP (the game's first — grounded heroes jump too);
      // the same edge in the AIR, or the button HELD past the apex, is TAKEOFF into flight, so
      // "altitude is the mode switch" survives intact. The jump refuses while a hard landing recovers
      // (_landT gates JUMP and ROLL only, never strike/guard/grab — §2.4).
      const canFly = canUseFlight(this);
      const leapManaged=updateTraversalLeap(this,dt,canFly);
      const rise = this.flyHeld && !this._flyPrev;
      if (!leapManaged && rise && !this.flying && this.onFoot && this._landT <= 0) {
        this.vel.y = Math.max(this.vel.y, JUMP_VEL);         // leave the ground under gravity — NOT flight
        this._jumpT = JUMP_VEL / GRAVITY;                    // ≈ time to apex; holding does not take off until it elapses
        this._liftFx = 0.18;
        if (game && game.audio && game.audio.land) { try { game.audio.land(0.5, this.body, this.pos); } catch (e) {} }
      } else if (!this.flying && canFly && ((rise && !this.onFoot) || (this.flyHeld && !this.onFoot && this._jumpT <= 0))) {
        this.flying = true;                                  // takeoff — a press in the air, or ascend still held past the apex
        if (this.pos.y < 1.5) this.vel.y = FLY_TAKEOFF;      // pop off the ground so even a tap lifts into a hover
        this._liftFx = 0.25;
        if (game && game.audio) { try { game.audio.zap(560); } catch (e) {} }
      }
      if (this._jumpT > 0) this._jumpT -= dt;
      // releasing ascend while aloft → stop climbing and settle here (no long coast up)
      if (!this._openSky && !this.flyHeld && this._flyPrev && this.flying) this.vel.y = clamp(this.vel.y, -FLY_SINK, 5);
      this._flyPrev = this.flyHeld;

      if (this.flying) {
        // ---- THE FOUR-DECK LADDER (ruled 2026-07-23; Robert felt its absence 2026-07-24:
        // "he was going up until I let go of the button and that's exactly where he stopped —
        // that's not how it's supposed to work"). A flying fighter is DOCKED on a deck or IN
        // TRANSIT between decks. GROUND is the exception — free levitation below BANDS.ground.
        // Bands are the per-city plan.bands; BUILDING's deck is the ROOFTOP UNDER YOU when there
        // is one (that is what keeps rooftop play alive), else the skyline default.
        const bandAt2 = (h) => h < BANDS.ground ? 0 : h < BANDS.building ? 1 : h < BANDS.sky ? 2 : 3;
        // ⚠ AND NO BAND CAP UNDER AN OPEN SKY. `maxBand` pins a tier-2 levitator to band 1 — a real
        // balance ruling on Earth (BALANCE.md) and meaningless in a dimension with no bands to speak
        // of. Measured: RAGE took off in PowerWorld and then stopped dead at 28u, held by this cap.
        const maxBand = this._openSky ? 3 : (this.def.maxBand ?? (this.flightTier >= 3 ? 3 : 1));   // tier ≤2 lives below the SKY — a balance ruling, def.maxBand overrides (BALANCE.md)
        const deckOf = (b) => {
          if (b <= 0) return null;                                            // ground band: free float
          if (b === 1) { const r = this._roofUnder(game); return r != null ? r + 3 : BANDS.ground + (BANDS.building - BANDS.ground) * 0.58; }
          if (b === 2) return BANDS.building + (BANDS.sky - BANDS.building) * 0.5;
          return BANDS.sky + (BANDS.ceiling - BANDS.sky) * 0.55;
        };
        if (this.launchT > 0) {
          // knockback owns the axis — a servo here would eat the hit and make heavies weightless.
          // When it expires your band is wherever you ended up. No snap-back tether.
          // GRAVITY INVERSION (brief T3.19): the zone flips the sign, so a ceiling becomes a floor.
          const _gz = game.gravityZones ? game.gravityZones.gravityFor(this) : 1;
          this.vel.y -= 34 * dt * _gz;
          this._deckSnap = -1;
        } else if (ownsFlightVelocity(this)) {
          // move() already solved all three axes, including rise/descent. A second servo or
          // drag here would erase pitch control and reintroduce the elevator feeling.
          this._deckSnap = -1;
        } else if (this.flyHeld) {
          const cb = bandAt2(this.pos.y);
          const lid = deckOf(Math.min(cb, maxBand));
          // ⚠ A LIT AFTERBURNER IS HOW YOU EARN THE BAND ABOVE. The deck servo and LOW ORBIT
          // (manual §15 and §17) shipped the same day and contradicted each other: the servo pins
          // a tier-3 flier at sky + (ceiling − sky)·0.55 — 301 on the flagship — while departure
          // needs ceiling + 44 = 372. So the whole leave-the-planet route was unreachable through
          // the flight controls, and the only reason it ever tested green was that the test set
          // the altitude directly. The ceiling clamp below already makes exactly this exception;
          // the servo has to make it too, or the two rules disagree about the same fighter.
          // ⚠ THE TOP BAND'S DECK IS ITSELF A LID, AND LIFTING `maxBand` DOES NOT REMOVE IT. Measured:
          // with the cap gone and the ceiling clamp skipped, a PowerWorld climb still stopped dead at
          // **684** — which is exactly `sky + (ceiling − sky) × 0.55`, the band-3 deck. So a fifth rule
          // needed the same exception the other four got, and it is the third place that has now had to
          // learn it (the orbit route, the ceiling clamp, here): TWO RULES ABOUT ONE FIGHTER MUST AGREE.
          // ⚠ Found only because the space-ramp test had to climb to 1,500u. The flight suite ran 620
          // frames and topped out at 456, so it could never have reached this — A SHORTER TEST CANNOT
          // FIND A HIGHER LID, and "still rising when the test ended" is not the same as "no ceiling".
          const unlidded = this._openSky || !!(this.def.afterburner && this._burnT > 0.8);
          if (!unlidded && cb >= maxBand && lid != null && this.pos.y >= lid - 0.6) {
            // your ceiling deck — the servo holds you there instead of letting you drift into a band you haven't earned
            this.vel.y = damp(this.vel.y, clamp((lid - this.pos.y) * 2.6, -FLY_SINK, FLY_SINK * 0.9), 6, dt);
          } else if (this._openSky) {
            // ⚠ THE ASCEND SERVO IS A BLEND UNDER AN OPEN SKY, NOT AN ASSIGN (aaa-01 §2.3 / lane AIR).
            // move() runs BEFORE _physics and has already put the PITCHED-FORWARD vertical component of
            // your fly vector into vel.y (`this.vel.y += dir.y·s·dt·A`); a bare `vel.y = damp(…FLY_RISE…)`
            // one function later THREW IT AWAY, so holding SPACE while pointed 45° up climbed at exactly
            // FLY_RISE regardless of where you aimed — a lift, not flight. SPACE is now an ADDED thruster:
            // it only ever raises vel.y toward FLY_RISE, never pulls the steeper pitched climb back down.
            this.vel.y = Math.max(this.vel.y, damp(this.vel.y, FLY_RISE, 7, dt));
          } else {
            this.vel.y = damp(this.vel.y, FLY_RISE, 7, dt);                   // climb — holding the button walks the rungs
          }
          // ⚠ THE RUNG CLICK IS AN AUDIBLE LAYER, and under an open sky it is announcing furniture
          // that is not there. Robert heard the ladder before he could name it: a rising tone every
          // time you cross an invisible line tells you the sky is a building. Silent here.
          if (cb !== this._climbBand) {                                       // the CLICK per rung
            this._climbBand = cb;
            if (game && game.audio && !this._openSky) { try { game.audio.zap(430 + cb * 90, this.pos); } catch (err) {} }
          }
          this._deckSnap = -1;
        } else if (this.descendHeld) {
          this.vel.y = damp(this.vel.y, -FLY_SINK, 7, dt);                    // sink — the landing logic still lands you on roofs first
          // ROADMAP 9 · DIRECTIONAL DESCENT: descending WITH a direction held is a POWER DIVE
          // along your facing, not a lift going down. It trades height for speed, which is what
          // makes the dive punch (manual §10) a real approach instead of a trick.
          const dvx = (this._mvT > 0 ? this._mvX : 0) || 0, dvz = (this._mvT > 0 ? this._mvZ : 0) || 0;
          if (Math.abs(dvx) > 0.2 || Math.abs(dvz) > 0.2) {
            this.vel.x += dvx * 54 * dt; this.vel.z += dvz * 54 * dt;
            this.vel.y = Math.min(this.vel.y, -FLY_SINK * 1.35);
            this.burstT = Math.max(this.burstT || 0, 0.15);
            this._diving = true;
          } else this._diving = false;
          this._climbBand = bandAt2(this.pos.y); this._deckSnap = -1;
        } else if (this.flightTier <= 1 && !this._openSky) {
          this.vel.y = damp(this.vel.y, -7, 4, dt);                           // tier 1 can't hover — it sags
        } else if (this._openSky) {
          // ⚠ POWERWORLD HAS NO DECKS — AND THIS BRANCH REPLACES THE DOCK, NOT THE CONTROLS. I first
          // put this test at the TOP of the chain, which swallowed `flyHeld` and `descendHeld` whole:
          // in PowerWorld you could no longer rise or sink at all, only damp to zero vertical speed.
          // Robert found it in about a minute — *"they don't seem to fly anymore… it's like only able
          // to fly straight."* My test had PASSED because it wrote `pos.y` directly and never drove
          // the ascend input, which is the exact harness failure this project keeps paying for: drive
          // the gate. A flag that changes what happens when you RELEASE a button must live where the
          // release is handled, not in front of the button.
          // ⚠ COAST, DO NOT HOLD. This branch used to damp toward a bob plus a soft floor, which is a
          // HOVER — the machine deciding your altitude the moment you stop asking. Under an open sky
          // the only thing acting on you is drag, so vertical speed you built up carries and bleeds
          // off, exactly like the horizontal axes have always done. That is what makes a swoop a
          // swoop instead of a lift arriving at a floor.
          // ⚠ AND NO SOFT FLOOR. `groundY + 2.6` is an invisible updraft at the bottom of an empty
          // sky: fly low and something you cannot see pushes back.
          this.vel.y *= Math.exp(-AIR_DRAG * dt);   // the SAME number the horizontal axes use
          this._climbBand = bandAt2(this.pos.y); this._deckSnap = -1;
        } else {
          // HOVER = DOCK. Releasing the button eases you onto the CURRENT band's deck — never
          // "wherever your thumb stopped". Servo speed caps at FLY_SINK (26) and slam damage
          // needs < −38, so docking can never hurt (the plan's safety invariant).
          const b = Math.min(bandAt2(this.pos.y), maxBand);
          const deck = deckOf(b);
          if (deck == null) {
            this.vel.y = damp(this.vel.y, Math.sin(this.animT * 2.3) * FLY_HOVER_BOB + (this.pos.y < (this.groundY || 0) + 2.6 ? 7 : 0), 5, dt);   // GROUND: free levitation + the soft floor
          } else {
            const err = deck - this.pos.y;
            const bob = Math.abs(err) < 2 ? Math.sin(this.animT * 2.3) * FLY_HOVER_BOB * 0.55 : 0;
            this.vel.y = damp(this.vel.y, clamp(err * 2.6, -FLY_SINK, FLY_SINK * 0.92) + bob, 6, dt);
            if (Math.abs(err) < 1.8 && this._deckSnap !== b) {                // docked — one soft click
              this._deckSnap = b;
              if (game && game.audio) { try { game.audio.zap(430 + b * 90, this.pos); } catch (err) {} }
            }
          }
          this._climbBand = bandAt2(this.pos.y);
        }
        if (this.flightTier <= 1 && !this._openSky) {                         // clumsy drift — the GAH wobble
          // ⚠ CITY ONLY (aaa-01 lane AIR). Under an open sky the momentum mover (A == AIR_DRAG) owns
          // the axes and a clumsy flier is "bad" through lower speed and worse hover, NOT a random
          // sideways shove that fights the commitment feel BFP is built on. `_openSky`-scoped so the
          // city keeps its GAH wobble byte-for-byte.
          this.vel.x += Math.sin(this.animT * 3.1) * 9 * dt;
          this.vel.z += Math.cos(this.animT * 2.6) * 9 * dt;
        }
      } else if (this.pos.y > 0 || this.vel.y > 0) {
        // MECHANICAL WINGS (def.glider — KNIGHTFALL's cape, the ORIGIN gift): falling with the
        // ascend key held spreads them. Fall clamps to a glide, air control grows (move()),
        // the flight pose banks. No magic: gravity still owns you; landing or descend folds them.
        if(canMomentumGlide(this)&&this.spendKi(this.def.momentumGlide.kiPerSec*dt)){
          this.gliding=true;this.vel.y=Math.max(this.vel.y-60*dt,-this.def.momentumGlide.sink);
        } else if (this.def.glider && this.flyHeld && this.vel.y < 2 && !this.descendHeld && this.pos.y > (this.groundY || 0) + 2.5) {
          this.gliding = true;
          this.vel.y = Math.max(this.vel.y - 60 * dt, -8);
        } else {
          this.gliding = false;
          // GRAVITY INVERSION (brief T3.19): the zone flips the sign of the ONE line that
          // actually pulls bodies down, so a ceiling really can become a floor.
          this.vel.y -= fallingGravity(this,game) * dt;
        }
      } else this.gliding = false;
      }
    }
    // horizontal drag (near-frictionless while sliding — RIME's ice skate — and while flying
    // as a THROWN BODY: a tumbling projectile-person doesn't brake itself, manual §11)
    // ⚠ THE CHASE LOOP IS ONE DRAG COEFFICIENT. A body that was LAUNCHED brakes itself on the
    // walking coefficient (−6/s), while a body that was THROWN gets the slide class (−1.3/s) —
    // "a tumbling projectile-person doesn't brake itself" (manual §11). Measured on a 101 u/s
    // knockback: **16.1u travelled and half the speed gone in 0.18 seconds** on −6, against 63.5u
    // over 0.59s on the slide class. Sixteen units is under two body lengths, which is why there is
    // nothing to chase — you knock someone away and they are still standing in front of you.
    // ⚠ SCOPED, NOT GLOBAL. `_chaseKb` is set by the POWERWORLD rule set, so the city keeps the feel
    // it was tuned with (the ropes, the ring-out rule and every wall slam are calibrated against
    // the short knockback). Whether the long one should become global is a feel call, not mine.
    const launched = this._chaseKb && this.launchT > 0;
    // ⚠ THE TWO AXES HAVE TO AGREE. Releasing the stick under an open sky now COASTS vertically at
    // −1.5 while the horizontal axes still snapped at −6: let go while climbing and you kept rising
    // but stopped dead sideways, which is a stranger sensation than either behaviour on its own.
    // ⚠ AND MOMENTUM IS HALF OF WHAT MAKES A SWOOP A SWOOP. A flier who stops the instant they stop
    // pressing has no weight; the reference carries you through and out the other side, which is
    // exactly the manoeuvre pass-through was added for. −2.4 in the air here, unchanged everywhere
    // else — on foot, in the city, and for anyone standing on the ground.
    // ⚠ ONE NUMBER FOR BOTH AXES (`AIR_DRAG`), because "the two axes have to agree" is not a comment,
    // it is a value. At −2.4 horizontal against −1.5 vertical a swoop carried 12u — 1.25 body lengths,
    // which is a nudge, not a manoeuvre. Matched at −1.8 it carries about two body lengths and is
    // still travelling when it gets there, which is what makes overshooting a real cost.
    // ⚠ READER #7 (aaa-03 §1): the drag CLASS. `flying` on the PowerWorld floor gave `glide = true` →
    // drag 1.8 → you SKATE on the floor. `airborne` (gait) instead: a GROUNDED fighter gets the
    // walking coefficient (6). The `_openSky` gate is kept, so the city (no open sky) is untouched.
    const glide = this._openSky && this.airborne;
    // ⚠ THE LAUNCHED CLASS IS ITS OWN COEFFICIENT NOW, not a borrow of the thrown-body slide class.
    // They were sharing −1.3 because a thrown body and a launched body look alike; they are not the
    // same event. A thrown body was AIMED and is meant to land somewhere; a launched body is being
    // sent away, and how far it goes is the readout of how hard it was hit. `PW_KB.drag` is the dial.
    // ⚠ THE AIR STOPSPEED (aaa-01 §3.5 / C5). BFP's `PM_Friction` uses `control = max(speed, stopspeed)`:
    // proportional drag above the stopspeed, an ABSOLUTE floor below it — which is what lets a flier
    // actually come to REST and hold a position instead of creeping in an exponential's tail forever.
    // The open-sky glide gets that two-regime friction; above `_airStop` it is 1−f·dt ≈ exp(−f·dt)
    // (the swoop coast §3.5 protects is untouched), below it the control clamps to `_airStop` so speed
    // reaches zero in finite time. Everything else (launched, thrown, slide, walk, city flight) keeps
    // the exponential exactly. Launched bodies are excused — their carry is the readout of the hit.
    // GROUND CLASS = feet on a surface under your own power (not launched, thrown, sliding or in the
    // open-sky air). It gets Q3's TWO-REGIME friction (§3.2): proportional above STOP_SPEED, an
    // absolute floor below it, so a run comes to a crisp REST in a sixth of a second instead of
    // creeping down an exponential tail. Everything else keeps the exact exponential it was tuned with.
    const bodyWind=prepareWindBody(this,game);
    const groundClass = !glide && !launched && this.launchT <= 0 && this._slideT <= 0 && this._thrownT <= 0 && this.gait === GAIT.GROUNDED;
    // move() already budgets and brakes a committed entry. Applying walking
    // friction again shortens its authored distance according to frame length.
    const meleeDriven=this._openSky&&this._meleeMotion?.approachEnabled&&
      (this.mstate==='startup'||this.mstate==='active')&&!launched&&this.launchT<=0;
    let dragF;
    if (meleeDriven||ownsFlightVelocity(this)||bodyWind.driven||(groundClass&&this._gearGroundSteering)) {
      dragF = 1;
    } else if (this.gliding&&this.def.momentumGlide&&!launched) {
      dragF=Math.exp(-this.def.momentumGlide.drag*dt);
    } else if (this._traversalLeap?.active&&!launched) {
      dragF=Math.exp(-.12*dt);
    } else if (glide && !launched && this.launchT <= 0 && this._airStop > 0) {
      const sp = Math.hypot(this.vel.x, this.vel.z);
      const control = Math.max(sp, this._airStop);
      dragF = sp > 1e-4 ? Math.max(0, sp - control * AIR_DRAG * dt) / sp : 0;
    } else if (groundClass) {
      const sp = Math.hypot(this.vel.x, this.vel.z);
      // The stop floor must share the crawl speed scale or friction consumes
      // every acceleration step before a prone soldier can start moving.
      const control = Math.max(sp, STOP_SPEED * (this.prone ? .18 : 1));
      dragF = sp > 1e-4 ? Math.max(0, sp - control * 6 * dt) / sp : 0;
    } else {
      dragF = Math.exp((launched || this._thrownT > 0 ? -thrownDrag(this) : this._slideT > 0 ? -1.3 : glide ? -AIR_DRAG : -6) * dt);
    }
    this.vel.x *= dragF; this.vel.z *= dragF;
    if(this._windCarry){this._windCarry.x*=dragF;this._windCarry.z*=dragF;}
    applyBodyWind(this,bodyWind,dt);
    const windFrame=this._windFrameVelocity||(this._windFrameVelocity={x:0,z:0});windFrame.x=this.vel.x;windFrame.z=this.vel.z;
    this.vel.y = ownsFlightVelocity(this) ? clamp(this.vel.y, -PW_AIR.top, PW_AIR.top) : clamp(this.vel.y, -160, this._traversalLeap?.active?this.def.traversalLeap.upMax:70);

    const previousY=this.pos.y;
    sweepFighterEnvironment(this,game,dt);
    // THE FLOOR IS THE TERRAIN, not y=0 — quarry pits, metro cuts and blast craters are real
    // ground you stand in and can be knocked down into. Sampled ONCE per frame and cached.
    this.groundY = (game && game.world && game.world.heightAt) ? game.world.heightAt(this.pos.x, this.pos.z) : 0;
    // FOOTSTEPS — real recordings planted on the run-cycle's zero crossings (small-details law:
    // the leg sine in _animate is sin(animT*12); a sign flip = a foot planting)
    // ⚠ READER #3 (aaa-03 §1): FOOTSTEPS — the single best "your feet are on the ground" cue, and it
    // had NEVER FIRED in PowerWorld because `!this.flying` was false on the floor. Re-gated on
    // `gait === GROUNDED` (not merely ground-owned: SETTLE is the knee-crouch recovery, no steps yet).
    if (this.gait === GAIT.GROUNDED && game && game.audio && game.audio.sample) {
      const _sp = Math.hypot(this.vel.x, this.vel.z);
      if (_sp > 8) {
        const _ss = Math.sin(this.animT * 12) >= 0 ? 1 : -1;
        if (this._stepSign && _ss !== this._stepSign) {
          const _ru = game.world && game.world.plan && game.world.plan.rural;
          game.audio.sample(_ru ? 'step.grass' : 'step.concrete', { pos: this.pos, gain: Math.min(1, 0.45 + _sp / 70) });
        }
        this._stepSign = _ss;
      } else this._stepSign = 0;
    }
    // FINITE GUARD: one NaN in pos poisons the object matrix and blanks the frame with no throw.
    // The audio path coerces every param through fin(); physics gets the same courtesy.
    if (!Number.isFinite(this.pos.x + this.pos.y + this.pos.z)) { this.pos.set(0, 6, 0); this.vel.set(0, 0, 0); }
    if (this.pos.y <= this.groundY) {
      const impact = this.vel.y;
      this.pos.y = this.groundY; if (this.vel.y < 0) this.vel.y = 0;
      // land + exit flight only when you MEANT to come down (holding descend) or you're a clumsy
      // tier-1 flier sagging out. A knockback/beam-shove dipping you to the floor no longer
      // silently cancels flight MODE — that read as "flight randomly turns off".
      // ⚠ AND IT MUST NOT KICK YOU OUT OF THE AIR IN POWERWORLD EITHER. `flightTier <= 1` drops a
      // clumsy flier out of flight MODE the instant they stop climbing — correct over a city, and in
      // a dimension where everyone flies it would eject RAGE and SARGE every time they let go.
      // LANDING (aaa-02 §2.2) — exit flight ONLY on a real ARRIVAL. Landing is not "touching": it is
      // coming down or level (never mid-climb), not while a knockback owns the axis, not while holding
      // ascend. `_openSky` needs only that (this is what finally lets a PowerWorld fighter stand on the
      // floor — `flying` used to stay true there forever, the bug that blocked the whole ground grammar).
      // The city keeps its original descendHeld / tier-1 exit unchanged.
      const arrived = impact <= 0 && this.launchT <= 0 && !this.flyHeld;
      if (this.flying && (this._openSky ? arrived : (!this.flyHeld && (this.descendHeld || this.flightTier <= 1)))) this.flying = false;
      if (impact < -30 && this.state !== 'ko') {
        this._landT = Math.min(0.26, -impact * 0.006);   // knee-crouch on a hard landing
        if (this.crouching) this._landT *= 0.5;          // a crouch held at contact absorbs it (§2.4, JKA delta/=3)
        // YOU HEAR WHAT THEY ARE MADE OF. A robot clangs; a person thumps; a ghost barely lands.
        if (game && game.audio && game.audio.land) game.audio.land(Math.min(2.2, -impact / 38), this.body, this.pos);
      }
      if (impact < -30) this._slam(game, -impact, 'ground');    // admission evaluates authored fall resistance
      // A genuinely airborne incapacitated arrival stays down through its status,
      // then uses the same nonlethal get-up as a thrown landing. No extra damage.
      if(previousY>this.groundY+.05&&impact<0&&(this.stunT>0||this.sleepT>0)&&!this._impactRecovery)beginImpactRecovery(this);
      this._friendlyLanding=false;
    }
    // ⚠ THERE IS NO CEILING IN POWERWORLD. Robert: *"there is no ceiling."* On Earth the lid is the
    // atmosphere and leaving it is a whole ceremony (manual §17 — a lit afterburner, the DEPART offer);
    // in another dimension there is nothing above you to stop at. Raising the number was not enough —
    // a lid you can reach is still a lid — so the clamp does not run here at all.
    if (this.pos.y > BANDS.ceiling && !this._openSky) {
      // ORBIT (manual §17): only a LIT AFTERBURNER forces the upper atmosphere — everyone else
      // meets the ceiling. Past +90 even the burner levels off; the DEPART offer fires below that.
      if (this.def.afterburner && this._burnT > 0.8) {
        if (this.pos.y > BANDS.ceiling + 90) { this.pos.y = BANDS.ceiling + 90; if (this.vel.y > 0) this.vel.y = 0; }
      } else { this.pos.y = BANDS.ceiling; if (this.vel.y > 0) this.vel.y = 0; }
    }
    // harbor splashes — churning through water kicks up spray
    if (game && this.pos.y < 1.5 && game.world.waterAt && game.world.waterAt(this.pos.x, this.pos.z) && Math.hypot(this.vel.x, this.vel.z) > 8 && Math.random() < dt * 10) {
      game.particles.spawn({ x: this.pos.x, y: 0.7, z: this.pos.z, vx: (Math.random() * 2 - 1) * 8, vy: 8 + Math.random() * 6, vz: (Math.random() * 2 - 1) * 8, life: 0.42, size: 2.8, color: ['#bfe6f2', '#7fb8d0', '#ffffff'], drag: 1.4, shrink: true });
    }

    // arena bounds — getting hurled into the border wall slams (and bounces)
    const b = game?._threatRoom?.active ? 300-this.radius : (this._game && this._game.world ? this._game.world.ARENA : ARENA_FALLBACK) - 4;   // per-city bounds (generated maps vary)
    // RING-OUT RULES (backlog): normally the border is a WALL you bounce off. Under ring-out
    // rules it stops holding you in — leaving the arena is how you lose, so the arena has to
    // let you leave. game.checkRingOut then does the honours.
    const ringOut = !!(game && game.ms && game.ms.ringOut);
    if (!ringOut) {
      if (Math.abs(this.pos.x) > b) { this._slam(game, Math.abs(this.vel.x), 'wall','x'); this.vel.x *= -0.4; }
      if (Math.abs(this.pos.z) > b) { this._slam(game, Math.abs(this.vel.z), 'wall','z'); this.vel.z *= -0.4; }
      this.pos.x = clamp(this.pos.x, -b, b); this.pos.z = clamp(this.pos.z, -b, b);
    }

    // The sealed training shell must also contain a burst that crosses an entire
    // wall thickness in one physics step. Match its visible inner ceiling.
    if(game?._threatRoom?.active){const ceiling=300-12*(this.sizeScale||1);if(this.pos.y>ceiling){this.pos.y=ceiling;this.vel.y=Math.min(0,this.vel.y);}}
    // Box3 (AABB) collision vs cover — walls block you, and you can stand on their tops
    this.onBlock = false;
    const ghost = this.sprintT > 0 && this._sprintThrough;   // VOLT sprints straight through cover
    const lowBounds=this.bodyBounds||(this._pronePose?.weight?this._pronePose.bounds:null);
    const bodyHX=lowBounds?(lowBounds.max.x-lowBounds.min.x)*.5:this.radius,bodyHZ=lowBounds?(lowBounds.max.z-lowBounds.min.z)*.5:this.radius;
    const bodyOX=lowBounds?(lowBounds.max.x+lowBounds.min.x)*.5:0,bodyOZ=lowBounds?(lowBounds.max.z+lowBounds.min.z)*.5:0;
    for (const c of game.world.cover) {
      if (ghost&&!c.threatRoom) continue;
      // Aircraft are finite hulls, never invisible ground-to-sky columns.
      if(c.frontlineAircraft&&this.pos.y+(lowBounds?lowBounds.max.y:12*(this.sizeScale||1))<c.bottom)continue;
      const hx = (c.hx ?? c.r) + bodyHX, hz = (c.hz ?? c.r) + bodyHZ, top = c.top ?? c.h;
      const dx = this.pos.x+bodyOX - c.x, dz = this.pos.z+bodyOZ - c.z;
      const ox = hx - Math.abs(dx), oz = hz - Math.abs(dz);
      if (ox <= 0 || oz <= 0) continue;                    // no horizontal overlap
      if(c.finiteBuilding){
        const headHeight=lowBounds?lowBounds.max.y:12*(this.sizeScale||1);
        const contact=buildingContact({feet:this.pos.y,previousFeet:previousY,headHeight,velocityY:this.vel.y,flying:this.flying,launched:this.launchT>0},c);
        if(contact==='below'||contact==='above')continue;
        if(contact==='ceiling'){this.pos.y=c.bottom-headHeight;this.vel.y=Math.min(0,this.vel.y);continue;}
        if(contact==='step'){this.pos.y=top;this.vel.y=Math.max(0,this.vel.y);this.onBlock=true;continue;}
      }
      // land on top — hovering fighters can perch on a block when they sink onto it
      const crossedTop=previousY>=top && this.pos.y<=top;
      if ((crossedTop || (this.pos.y>=top-.05 && this.pos.y<=top+.05)) && this.vel.y <= 2 && !this.flyHeld && (!this.flying || this.descendHeld)) {
        const impact=this.vel.y;
        this.pos.y = top; if (this.vel.y < 0) this.vel.y = 0; this.onBlock = true; this.flying = false;
        if(impact < -30)this._slam(game,-impact,'roof');
        this._friendlyLanding=false;
      } else if (this.pos.y < top - 0.5) {
        const spd = Math.hypot(this.vel.x, this.vel.z);
        if (ox < oz) { this.pos.x += Math.sign(dx || 1) * ox; this.vel.x *= -0.3; }   // push out + bounce
        else { this.pos.z += Math.sign(dz || 1) * oz; this.vel.z *= -0.3; }
        // slammed into a wall hard enough → crack it AND hurt whoever got thrown into it
        // ⚠ WHO BROKE IT MIRRORS THE SLAM LAW: hurled into a fuel tank, your LAUNCHER owns the
        // explosion; flew into it under your own power and you own it yourself. Same `launchT` gate
        // `_slam` uses, so the two can never credit different fighters for one impact.
        // Ordinary walking can exceed 34u/s. Boarding contact must not chew
        // through a parked hull; launches and powered movement still can.
        this._wallContact(game,c,spd,ox<oz?'x':'z');
      }
    }
    // ENTERABLE INTERIORS — the building is standable on top and hollow inside: the wall
    // segments (with their door gaps) do the pushing, so you walk in through the door and
    // fight around corners. Spatially gated — cost exists only at the buildings you overlap.
    // PHASE WALK (brief T2.17): an ordinary phase is intangible to ATTACKS but still bumps
    // into the building. A phase WALKER passes through the wall itself — the surface ripples
    // and closes behind them. Same gate as VOLT's sprint-through, one more way in.
    const wallGhost = ghost || (this.phase && this._phaseWalk);
    if (!wallGhost) for (const it of (game.world.interiors || [])) {
      const hx = it.hx + this.radius, hz = it.hz + this.radius;
      const dx = this.pos.x - it.x, dz = this.pos.z - it.z;
      if (Math.abs(dx) > hx || Math.abs(dz) > hz) continue;
      if (this.pos.y >= it.top - 2.5 && this.vel.y <= 2 && !this.flyHeld && (!this.flying || this.descendHeld)) {
        const impact=this.vel.y;
        this.pos.y = it.top; if (this.vel.y < 0) this.vel.y = 0; this.onBlock = true; this.flying = false;
        if(impact < -30)this._slam(game,-impact,'roof');
        this._friendlyLanding=false;
        continue;                                        // standing on the roof
      }
      if (this.pos.y >= it.top - 0.5) continue;          // flying above it
      // inside: the ceiling is real — no rising out through the roof
      const bodyHeight=lowBounds?lowBounds.max.y:11;
      if (this.pos.y > it.top - bodyHeight) { this.pos.y = it.top - bodyHeight; if (this.vel.y > 0) this.vel.y = 0; }
      for (const wl of it.walls) {
        const whx = wl.hx + bodyHX, whz = wl.hz + bodyHZ;
        const wdx = this.pos.x+bodyOX - wl.x, wdz = this.pos.z+bodyOZ - wl.z;
        const ox = whx - Math.abs(wdx), oz = whz - Math.abs(wdz);
        if (ox <= 0 || oz <= 0) continue;
        const spd = Math.hypot(this.vel.x, this.vel.z);
        if (ox < oz) { this.pos.x += Math.sign(wdx || 1) * ox; this.vel.x *= -0.3; }
        else { this.pos.z += Math.sign(wdz || 1) * oz; this.vel.z *= -0.3; }
        this._slam(game, spd, 'wall',ox<oz?'x':'z');
      }
    }
    // FOOTING (aaa-02 §2.3) — computed LAST, so `onBlock` and `groundY` are final for this frame.
    // A fighter with `flying === false` is airborne for the whole descent, so `flying`/`gait` cannot
    // answer "are my feet on something"; this can. COYOTE keeps it true for 0.12 s of air after a lip.
    // ⚠ Never true while flying: the ground grammar (jump/crouch/roll) must not be offered in the air.
    const _contact = (this.pos.y <= (this.groundY || 0) + 0.01) || this.onBlock;
    if (_contact) { this.footT += dt; this.airT = 0; } else { this.airT += dt; this.footT = 0; }
    this.onFoot = !this.flying && (_contact || this.airT < COYOTE);
    // CROUCH is a single derived predicate: KM.down (descendHeld) while planted. One owner for the
    // ×0.50 in move(), the landing absorb and (via the shell) the roll trigger.
    if(!this.onFoot||this.state==='ko')this.prone=false;
    this.crouching = !this.prone && this.onFoot && this.descendHeld && this.gait === GAIT.GROUNDED && this.state !== 'ko';
    reconcileWindCarry(this);
    syncPersonCarry(this,game);
  }

  _wallContact(game,cover,speed,axis=null) {
    const powered=this.launchT>0||this.flying||this.burstT>0||this.sprintT>0||this._slideT>0;
    const vehicle=cover&&(cover.frontlineVehicle||cover.frontlineAircraft);
    if(speed>34&&(!vehicle||powered)&&cover?.hp!=null&&this._game){
      this._game.damageBlock(cover,speed*.55,{x:this.pos.x,y:this.pos.y+4,z:this.pos.z},
        (this.launchT>0&&this.lastHitBy)||this);
      this.hitstop=Math.max(this.hitstop,.04);
    }
    this._slam(game,speed,'wall',axis);
  }

  // Let go of the grapnel/ledge — the ONE release path (input, damage, KO all come through here).
  releaseHang() {
    this.hanging = null; this._grapple = null;
    if (this._grapLine) this._grapLine.visible = false;
    if (this._grapLoop) { this._grapLoop.stop(); this._grapLoop = null; }   // the line goes quiet with the tension
  }

  // The highest roof (cover top or enterable-building top) under this fighter's feet — the
  // BUILDING band's deck. Hover-only cost, a couple of AABB scans per flying fighter.
  _roofUnder(game) {
    if (!game || !game.world) return null;
    let best = null;
    const x = this.pos.x, z = this.pos.z, y = this.pos.y;
    for (const c of game.world.cover) {
      const top = c.top ?? c.h;
      if (top > y + 2 || c.destroyed) continue;                 // only roofs at or below you
      const hx = (c.hx ?? c.r) + 1.5, hz = (c.hz ?? c.r) + 1.5;
      if (Math.abs(x - c.x) > hx || Math.abs(z - c.z) > hz) continue;
      if (best == null || top > best) best = top;
    }
    for (const it of (game.world.interiors || [])) {
      if (it.top > y + 2) continue;
      if (Math.abs(x - it.x) > it.hx + 1.5 || Math.abs(z - it.z) > it.hz + 1.5) continue;
      if (best == null || it.top > best) best = it.top;
    }
    return best;
  }

  move(dir, dt, sprint = 1) {
    this._gearGroundSteering=false;
    // the live movement INTENT, stamped for the physics pass (directional descent reads it)
    this._mvX = dir ? dir.x : 0; this._mvZ = dir ? dir.z : 0; this._mvT = 0.12;
    if (this.state === 'ko' || this.hitstop > 0 || this.grabbedBy || (this.grabState === 'clinch'&&!isTransportingPerson(this)) || this.staggerT > 0 || this.frozenT > 0 || this.stunT > 0 || this.hanging) return;   // hanging: your feet have nowhere to be
    if(steerTraversalLeap(this,dir,dt))return;
    if(steerMomentumGlide(this,dir,dt))return;
    let s = this.speed * 1.08 * this.powerBuff * sprint * moodMult(this, 'speed', 1) * webControlMoveMultiplier(this);   // ground feel pass 2026-07-24: +8% across the board
    s *= movementTravelScale(this,dir,dt,sprint);
    s *= zombieLegSpeed(this);
    if (this._wounds && this._wounds.leg) s *= 1 - 0.09 * this._wounds.leg;   // the LIMP is real (manual §18)
    if (this.sprintT > 0) s *= this.sprintMult;   // double-tap sprint surge
    if (this.meleeCharge > 0) s *= 0.4;           // winding up a haymaker roots you
    // ⚠ READER #2 (aaa-03 §1): the air-vs-ground speed MULTIPLIER (and the cruise/burner inside it,
    // reader #10). `airborne` (gait) not `flying`, so a fighter standing on the PowerWorld floor uses
    // GROUND speed, not the air multiplier. City: airborne ⟺ flying, so this block is unchanged there.
    if (this.airborne) {
      const airMult = this.flightTier >= 3 ? this.flySpeed * 1.2 : this.flightTier === 2 ? 0.78 : 0.95;   // air feel pass 2026-07-24: fliers +20%, levitators 0.62→0.78, clumsy 0.85→0.95
      s *= airMult;
      // POWER BUYS THE SKY (aaa-01 §5): under an open sky, air speed scales super-linearly with power,
      // derived so airGain(1.70) = 1.50 (BFP's own flight-only PL term, 2.0→3.0 across its range).
      // ⚠ airGain(1.0) = 1.0 EXACTLY — nobody's opening speed moves; the change is neutral at base power.
      if (this._openSky) {
        s *= 1 + PW_AIR.plGain * (this.powerBuff - 1);
        // C5 stopspeed reference: PW_AIR.stopThresh × the BASE air wish speed — read off the
        // CHARACTERISTIC speed, not the cruise/power-inflated `s`, so a coast comes to rest at the
        // same low band whatever the throttle. The coefficient is DERIVED BY MEASUREMENT (C5's own
        // rule): 0.12 keeps the pwmove suite's normalised V2 in [45.7,56] while still terminating.
        this._airStop = PW_AIR.stopThresh * (this.speed * 1.08 * airMult);
      }
      // SHIFT held in the air = sustained CRUISE (not the burst dash) — costs a trickle of ki.
      // ⚠ SUPPRESSED WHILE GUARDING under an open sky (aaa-01 lane AIR): no cruise-boost or burn behind
      // a raised guard. Scoped to `_openSky` so city flight is byte-unchanged.
      if (!this.movementGear?.managed && this.cruiseHeld && this.ki > 1 && !(this._openSky && this.guarding)) {
        s *= 1.5; this.ki = Math.max(0, this.ki - 2.6 * dt);
        // AFTERBURNER (brief Part Six, manual §15): past ignition the throttle opens all the way
        if (this.def.afterburner && this._burnT > 0.8) s *= (this.def.afterburner.mult || 2.1) / 1.5;
      }
      // THE CAMERA'S OWN LIMIT (aaa-01 §5.5): open-sky wish speed caps at PW_AIR.top, derived from the
      // chase camera's eye-damp λ and distance clamp so two fighters closing stay in frame. Last, so it
      // bounds cruise + burner too.
      if (this._openSky&&!this.movementGear?.gear) s = Math.min(s, PW_AIR.top);
    }
    // the harbor: shallow water slows, deep water is a swim (flight lifts you out)
    if (!this.flying && this.pos.y < 2 && this._game && this._game.world.waterAt) {
      const wl = this._game.world.waterAt(this.pos.x, this.pos.z);
      if (wl) s *= wl === 2 ? 0.45 : 0.62;
    }
    if (this.gliding) s *= 1.4;                 // wings out — the glide carries you
    if (this.crouching) s *= 0.5;               // CROUCH (§3.3/§3.6) — pm_duckScale, EXACTLY ×0.50
    if (this.prone) s *= 0.18;
    if (this.guarding) s *= 0.34;               // guarding slows you
    if (this.strikeActive > 0) s *= 0.5;
    s *= castingMoveScale(this);
    s *= personCarrySpeed(this);
    s *= windMoveScale(this,this._game);
    const approach=this._meleeMotion;
    if(this._openSky&&approach?.approachEnabled&&(this.mstate==='startup'||this.mstate==='active')){
      // A committed flight entry brakes cruise momentum just like a grounded
      // step, but along all three axes. Physics still owns wall/ground contact.
      // The strike captured incoming momentum before this action took ownership.
      const step=approach.step,len=this.flying?step.length():Math.hypot(step.x,step.z),origin=approach.approachOrigin;
      if(len>.001){const x=step.x/len,y=this.flying?step.y/len:0,z=step.z/len,travel=(this.pos.x-origin.x)*x+(this.pos.y-origin.y)*y+(this.pos.z-origin.z)*z;
        let remaining=Math.max(0,approach.approachDistance-travel);
        const target=approach.target;
        if(target?.alive){
          const dx=target.pos.x-this.pos.x,dy=this.flying?target.pos.y-this.pos.y:0,dz=target.pos.z-this.pos.z;
          const forward=dx*x+dy*y+dz*z,lateral=Math.max(0,dx*dx+dy*dy+dz*dz-forward*forward),gap=(this.radius||2.2)+(target.radius||2.2)+.5;
          // Brake before body separation pushes a straight approach sideways. Never turn toward a dodge.
          if(forward>0&&lateral<gap*gap&&Math.abs(target.pos.y-this.pos.y)<gap)remaining=Math.min(remaining,Math.max(0,forward-gap));
        }
        const speed=Math.min(len,remaining/Math.max(dt,.001));this.vel.x=x*speed;this.vel.z=z*speed;if(this.flying)this.vel.y=y*speed;return;}
      this.vel.x=this.vel.z=0;if(this.flying)this.vel.y=0;return;
    }
    if(steerGroundGear(this,dir,s,dt)){
      if(this.state==='idle'||this.state==='move')this.state=(dir.x||dir.z)?'move':'idle';
      return;
    }
    if (ownsFlightVelocity(this)) {
      // The committed punch step is an additive action channel. Hover braking
      // controls the player's motion without cancelling that short approach.
      const step=this._meleeMotion && (this.mstate==='startup'||this.mstate==='active') ? this._meleeMotion.step : null;
      if(step)this.vel.sub(step);
      steerFlight(this, dir, s, dt, this.movementGear?.managed?this.movementGear.profile:undefined);
      if(step)this.vel.add(step);
      if (this.state === 'idle' || this.state === 'move') this.state = (dir.x || dir.y || dir.z) ? 'move' : 'idle';
      return;
    }
    // ⚠ THE MOMENTUM COEFFICIENT (aaa-01 §3). BFP's whole flight feel is Quake's `PM_Accelerate` with
    // `a == f` (accel == friction), which makes terminal speed = the wish speed and demotes the clamp
    // to a safety net. Ours ran `a = 9·f`, so a flier reached top speed in 0.124s and turned on a coin.
    // Setting the OPEN-SKY air accel equal to `AIR_DRAG` gives 1.664s to 95% top and a 55.6u stop /
    // turn radius — half a body length of commitment becomes 1.8. The city stays `9` (unchanged).
    const A = (this.airborne && this._openSky) ? PW_AIR.accel : 9;
    this.vel.x += dir.x * s * dt * A;
    this.vel.z += dir.z * s * dt * A;
    // during a dash/slide burst the clamp lifts, so the impulse actually carries you (drag reins it in)
    const mx = (this.burstT > 0 || this._slideT > 0) ? Math.max(s, 150) : s;
    // ⚠ FLIGHT IS NOT A FLOOR PLAN PLUS AN ELEVATOR — THIS IS WHY IT FELT "LAYERED".
    // `dir` has always been `{x, z}`: the mover works the horizontal plane and ALL vertical motion
    // comes from a separate ascend/descend key. That is a lift in a building, and no amount of
    // removing decks fixes it, because the shape of the control is the layering. Under an open sky
    // `dir` carries a Y — forward means *where you are looking*, pitch included — so you climb by
    // flying up at something, which is the whole feel of the reference.
    // ⚠ THE SPEED CLAMP GOES 3-D WITH IT, or a dive is faster than level flight for no reason other
    // than that the limit was only ever measured on two axes.
    // ⚠ THE `dir.y` GATE FIX (aaa-01 lane AIR). This branch used to be gated on `dir.y` being TRUTHY,
    // so a pure horizontal strafe (dir.y === 0) fell silently into the 2-D `else` clamp below, which
    // only bounds `hypot(x,z)` and leaves any vertical velocity uncapped — the 3-D speed limit was
    // never enforced on a strafing flier. It now runs for every open-sky airborne frame, and `dir.y`
    // is read as `(dir.y || 0)` so a strafe adds no spurious vertical.
    // Only powered flight owns vertical steering and its 3-D speed clamp.
    // Walking input during a fall must never cancel gravity/landing damage.
    if (this.airborne && this._openSky && this.flying) {
      this.vel.y += (dir.y || 0) * s * dt * A;
      // PM_DRIFTING (aaa-01 §4): "banking to a stop". While NOT pressing forward but still TRAVELLING
      // forward, push laterally — the strongest single feel-detail in BFP's flight. `aim3` is the basis
      // (where you are pointed), flattened; the mismatch between it and where you slide IS the bank.
      // ⚠ THE REGIME IS LATCHED AT RELEASE, not re-read every frame. §4.1 ("strongest as you slow")
      // and §4.2's displacement table (`k·v₀/f²`, slow-release banks MORE than a fast one) are only
      // reconcilable this way: re-reading `k` every frame lets a fast coast accumulate the slow-regime
      // tail and INVERTS the table (fast > slow, ~5u swerve); latching the regime by how fast you were
      // when you released — the same idea as the sign latch — reproduces §4.2 exactly (1.16u @100,
      // 6.17u @20) and self-fades on the `forwardSpeed` factor, so a hover (forwardSpeed≈0) never drifts.
      if (this.launchT <= 0) {                                          // knockback owns the axis, not the bank
        const a3 = this.aim3, fwdIn = dir.x * a3.x + dir.z * a3.z;      // forward component of THIS frame's input
        if (fwdIn > 0.05) { this._driftSgn = 0; this._driftK = 0; }     // pressing forward — no bank, drop both latches
        else {
          const fwdSpd = this.vel.x * a3.x + this.vel.z * a3.z;         // travel along facing (flattened)
          if (fwdSpd > 1) {                                             // only bank while genuinely coasting forward
            if (!this._driftK) this._driftK = fwdSpd < PW_AIR.driftThresh * s ? PW_AIR.driftSlow : PW_AIR.drift;   // latch the regime at release
            const rl = Math.hypot(a3.x, a3.z) || 1, rx = -a3.z / rl, rz = a3.x / rl;   // right = flatten(fwd × up)
            const rightSpd = this.vel.x * rx + this.vel.z * rz;
            // ⚠ Math.sign(0) is 0 and rightSpeed passes through 0 on a straight-line release — LATCH it,
            // or the push flickers off and the sign flip-flops (aaa-01 §4.4 step 4).
            const sgn = Math.sign(rightSpd) || this._driftSgn || 1; this._driftSgn = sgn;
            this.vel.x += rx * sgn * this._driftK * fwdSpd * dt;
            this.vel.z += rz * sgn * this._driftK * fwdSpd * dt;
            // vertical variant: float up out of a falling strafe (BFP pushes along up; ours is world-up
            // because our `right` is already flattened, aaa-01 §4.4 step 6).
            if (this.vel.y < 0) this.vel.y += PW_AIR.driftUp * Math.abs(rightSpd) * dt;
          }
        }
      }
      const m3 = Math.hypot(this.vel.x, this.vel.y, this.vel.z);
      if (m3 > mx && this.launchT <= 0 && !this._weatherBody?.driven) { const k = mx / m3; this.vel.x *= k; this.vel.y *= k; this.vel.z *= k; }
    } else {
      const h = Math.hypot(this.vel.x, this.vel.z);
      // ⚠ A LAUNCHED BODY MUST NOT BRAKE ITSELF BY WALKING. The 3-D open-sky branch above has always
      // excused `launchT`; this one never did, so a grounded victim who touched the stick had their
      // knockback clamped straight back to walking speed and the long carry was defeated by the one
      // thing anyone does after being hit. Scoped to `_chaseKb` — the city keeps its clamp exactly.
      if (h > mx && !(this._chaseKb && this.launchT > 0) && !this._weatherBody?.driven) { this.vel.x = this.vel.x / h * mx; this.vel.z = this.vel.z / h * mx; }
    }
    if (dir.x || dir.z || dir.y) { if (this.state === 'idle' || this.state === 'move') this.state = 'move'; }
    else if (this.state === 'move') this.state = 'idle';
  }

  _animate(dt) {
    restorePersonThrowOverlay(this);
    clearFlightFeet(this);
    if(this._scoutVehicle||this._aircraftVehicle||this._passengerTransport)return; // Seat owns articulation while Fighter.update stays live.
    const p = this.parts; const moving = Math.hypot(this.vel.x, this.vel.z) > 4;
    // STUN HALO: the cartoon law — stars orbiting the head mean "scrambled, no control"
    if (this.stunT > 0) {
      if (!p.stars) {
        p.stars = [];
        for (let i = 0; i < 3; i++) {
          const st = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), new THREE.MeshBasicMaterial({ color: '#ffd24a', transparent: true, opacity: 0.95, depthWrite: false }));
          this.obj.add(st); p.stars.push(st);
        }
      }
      const t = (this._game ? this._game.time : 0) * 5.2;
      for (let i = 0; i < 3; i++) {
        const a = t + i * 2.094, st = p.stars[i];
        st.visible = true;
        st.position.set(Math.cos(a) * 2.3, 9.6 + Math.sin(t * 0.7 + i) * 0.25, Math.sin(a) * 2.3);
        st.rotation.y = a * 2;
      }
    } else if (p.stars && p.stars[0].visible) { for (const st of p.stars) st.visible = false; }
    // SLEEP TELL (manual §14): three ROUNDED pale-gold dots drifting slowly upward — soft and
    // slow where stun's stars are sharp and fast. Rounded shapes are sleep's silhouette.
    if (this.sleepT > 0) {
      if (!p.zzz) {
        p.zzz = [];
        for (let i = 0; i < 3; i++) {
          const s = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffe9b0', transparent: true, opacity: 0.85, depthWrite: false }));
          this.obj.add(s); p.zzz.push(s);
        }
      }
      const t = (this._game ? this._game.time : 0) * 1.1;
      for (let i = 0; i < 3; i++) {
        const a = t + i * 2.094, s = p.zzz[i];
        const rise = ((t * 0.55 + i * 0.333) % 1);
        s.visible = true;
        s.position.set(Math.cos(a) * 1.5, 9.8 + rise * 2.8, Math.sin(a) * 1.5);
        s.material.opacity = 0.85 * (1 - rise);
        s.scale.setScalar(0.7 + rise * 0.5);
      }
    } else if (p.zzz && p.zzz[0].visible) { for (const s of p.zzz) s.visible = false; }
    // WOUND PIPS (manual §18): a dark marker pinned at each wounded zone, scaled by severity —
    // readable in grayscale (dark-on-suit), one glance says WHERE the body is broken.
    {
      const W = this._wounds;
      const any = W && (W.arm || W.leg || W.torso);
      if (any) {
        if (!p.woundPips) {
          p.woundPips = {};
          for (const [z, x, y] of [['arm', 1.7, 6.3], ['leg', 0.8, 2.2], ['torso', 0, 5.2]]) {
            const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), new THREE.MeshBasicMaterial({ color: '#7a1414', transparent: true, opacity: 0.92, depthWrite: false }));
            m.position.set(x, y, 0.9);
            this.obj.add(m); p.woundPips[z] = m;
          }
        }
        for (const z of ['arm', 'leg', 'torso']) {
          const m = p.woundPips[z], lv = W[z];
          m.visible = lv > 0;
          if (lv > 0) m.scale.setScalar(0.7 + lv * 0.45);
        }
      } else if (p.woundPips && (p.woundPips.arm.visible || p.woundPips.leg.visible || p.woundPips.torso.visible)) {
        for (const z of ['arm', 'leg', 'torso']) p.woundPips[z].visible = false;
      }
    }
    // BLIND TELL (manual §14): the blocked-eye mark at the brow — targeting information, interrupted
    if (this.blindT > 0) {
      if (!p.eyeMark) {
        const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d');
        x.fillStyle = 'rgba(20,22,28,0.78)'; x.strokeStyle = '#e8e2d4'; x.lineWidth = 4.5;
        x.beginPath(); x.ellipse(32, 32, 22, 13, 0, 0, Math.PI * 2); x.fill(); x.stroke();
        x.fillStyle = '#e8e2d4'; x.beginPath(); x.arc(32, 32, 6, 0, Math.PI * 2); x.fill();
        x.strokeStyle = '#ff5a4a'; x.lineWidth = 6; x.lineCap = 'round';
        x.beginPath(); x.moveTo(12, 52); x.lineTo(52, 12); x.stroke();
        const tx = new THREE.CanvasTexture(cv);
        p.eyeMark = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthTest: false, depthWrite: false }));
        p.eyeMark.scale.set(3.2, 3.2, 3.2);
        this.obj.add(p.eyeMark);
      }
      p.eyeMark.visible = true;
      p.eyeMark.position.set(0, 11.8 + Math.sin((this._game ? this._game.time : 0) * 2.2) * 0.2, 0);
    } else if (p.eyeMark && p.eyeMark.visible) p.eyeMark.visible = false;
    // face
    restoreFreeLookHead(this);
    restoreLostControlPose(this);restoreThrowPose(this);restoreReloadPose(this);restoreRiflePose(this);restorePronePose(this);restoreNanitePose(this);restoreHitReaction(this);
    restoreAuthoredStrikeBase(this);
    restoreCombatBase(this);
    restoreSpineAim(this);
    restoreChestAim(this);
    restoreGroundAimSupport(this);
    restoreDirectionalAim(this);
    restoreCrouchPose(this);
    restoreGroundBase(this);
    // shortest-path yaw damp — the naive damp spun the LONG way (~355°) whenever the aim
    // crossed the atan2 seam, reading as "he's facing the wrong way"
    {
      let dy = (groundHeading(this,dt) - this.obj.rotation.y) % TAU;
      if (dy > Math.PI) dy -= TAU; else if (dy < -Math.PI) dy += TAU;
      // Advance -> retreat has two equally short half-turns. Follow the threat
      // side at that tie; choosing the other side winds the shoulders through
      // their rear limit while the eye/hand emission is turning the opposite way.
      if((this._groundHeading||this._flightHeading)&&Math.abs(dy)>Math.PI-.05){
        const aimDelta=Math.atan2(Math.sin(this.facing-this.obj.rotation.y),Math.cos(this.facing-this.obj.rotation.y));
        if(Math.abs(aimDelta)>.001)dy=Math.sign(aimDelta)*Math.abs(dy);
      }
      this.obj.rotation.y += dy * (1 - Math.exp(-14 * dt));
    }
    // idle bob / breathe (+ landing crouch dips the upper body)
    const bob = Math.sin(this.animT * 3.2) * 0.12;
    const land = clamp(this._landT || 0, 0, 1);
    p.torso.position.y = (p.rig?.rest.torso.y ?? 5.2) + bob - land * .7;
    p.head.position.y = (p.rig?.rest.head.y ?? 8.0) + bob - land * .7;
    if (p.rig) p.cowl.position.y = p.rig.rest.cowl.y + bob - land*.7;
    // run cycle — hips swing, KNEES flex on the back-lift; blends to a trailing pose in flight
    const mv = moving ? 1 : 0;
    const rc = Math.sin(this.animT * 12) * (moving ? 0.7 : 0.05);
    this._flyPose = damp(this._flyPose || 0, usesFlightPose(this) ? 1 : 0, 10, dt);
    const fp = this._flyPose, kneeBase = 0.14;
    const prone = clamp(this.obj.rotation.x / 1.5, 0, 1);        // how horizontal the body currently is
    let hipL = rc, hipR = -rc;
    let kneeL = kneeBase + clamp(rc, 0, 1) * 1.5 * mv;   // knee bends as that leg lifts behind
    let kneeR = kneeBase + clamp(-rc, 0, 1) * 1.5 * mv;
    const trail = fp * prone;                                    // legs trail only when CRUISING prone —
    hipL = lerp(hipL, 0.44, trail); hipR = lerp(hipR, 0.44, trail);   // hovering keeps them hanging straight
    kneeL = lerp(kneeL, 0.9, trail); kneeR = lerp(kneeR, 0.9, trail);
    // hover float (creator ruling): one leg tucked in an L, the other long with a soft knee —
    // the classic comic float, not "sitting on an invisible toilet"
    const hov = fp * (1 - prone);
    kneeL = lerp(kneeL, 1.35, hov); kneeR = lerp(kneeR, 0.22, hov);
    hipL = lerp(hipL, 0.55, hov); hipR = lerp(hipR, -0.12, hov);
    kneeL += land * 0.9; kneeR += land * 0.9;                    // landing crouch
    if (this._wounds && this._wounds.leg > 0 && moving) {        // THE LIMP (manual §18): one knee drags stiff — asymmetry IS the read
      kneeR += 0.3 + Math.max(0, Math.sin(this.animT * 12)) * 0.4 * this._wounds.leg;
    }
    hipL -= land * 0.5; hipR -= land * 0.5;
    p.legL.rotation.x = hipL; p.legR.rotation.x = hipR;
    p.legL.userData.knee.rotation.x = kneeL; p.legR.userData.knee.rotation.x = kneeR;
    // arms: blend between run-swing, cast-forward, punch
    const cast = this.castPose, punch = this.punchPose;
    const swing = -rc * 0.8;
    const armFwd = -Math.PI * 0.5; // point forward
    p.armL.rotation.x = lerp(swing, armFwd, Math.max(cast, punch));
    p.armR.rotation.x = lerp(-swing, armFwd, Math.max(cast, punch));
    // A small outward rest angle clears the breathing ribcage. Vertical upper
    // arms let the inner forearm surface cross the torso during cast recovery.
    p.armL.rotation.z = lerp(-.06, 0.25, cast);
    p.armR.rotation.z = lerp(.06, -0.25, cast);
    // --- melee poses (override) ---
    const gS = this.poseStrike, gG = this.poseGuard, gR = this.poseGrab;
    if (gS > 0.02 && !this._openSky) {
      const thr = -Math.PI * 0.66 * gS;
      if (this.strikeIdx === 2) { p.legR.rotation.x = lerp(p.legR.rotation.x, -1.25 * gS, 0.7); p.legR.userData.knee.rotation.x = lerp(p.legR.userData.knee.rotation.x, 0.1, gS); p.armR.rotation.x += thr * 0.3; }   // kick snaps the knee straight
      else { (this.strikeIdx % 2 === 0 ? p.armR : p.armL).rotation.x = thr; }
    }
    if (gG > 0.02) {
      p.armL.rotation.x = lerp(p.armL.rotation.x, -1.9, gG); p.armR.rotation.x = lerp(p.armR.rotation.x, -1.9, gG);
      p.armL.rotation.z = lerp(p.armL.rotation.z, 0.6, gG); p.armR.rotation.z = lerp(p.armR.rotation.z, -0.6, gG);
    }
    if (gR > 0.02) {
      p.armL.rotation.x = lerp(p.armL.rotation.x, -1.5, gR); p.armR.rotation.x = lerp(p.armR.rotation.x, -1.5, gR);
      p.armL.rotation.z = lerp(p.armL.rotation.z, 0.22, gR); p.armR.rotation.z = lerp(p.armR.rotation.z, -0.22, gR);
    }
    // SUPERHERO flight arms — prone cruise: lead fist punched out past the head, off arm swept back
    // along the hip; hover: relaxed float with arms slightly flared. Combat poses always win.
    const combatPose = Math.max(cast, punch, gS, gG, gR, this._bowDraw || 0, this.meleeCharge > 0 ? 1 : 0);
    const flyArm = this._flyPose * (1 - combatPose);
    if (flyArm > 0.02) {
      const pr = prone * flyArm, hov = (1 - prone) * flyArm;
      p.armR.rotation.x = lerp(p.armR.rotation.x, -2.95, pr);
      p.armL.rotation.x = lerp(p.armL.rotation.x, 0.35, pr);
      p.armL.rotation.z = lerp(p.armL.rotation.z, 0.14, pr);
      p.armR.rotation.x = lerp(p.armR.rotation.x, -0.22, hov * 0.85);
      p.armL.rotation.x = lerp(p.armL.rotation.x, -0.22, hov * 0.85);
      p.armL.rotation.z = lerp(p.armL.rotation.z, 0.4, hov);
      p.armR.rotation.z = lerp(p.armR.rotation.z, -0.4, hov);
    }
    // bow draw: bow arm locked out, draw hand pulled to the cheek
    const bd = this._bowDraw || 0;
    if (bd > 0.02) {
      p.armL.rotation.x = lerp(p.armL.rotation.x, -1.55, bd);
      p.armL.rotation.z = lerp(p.armL.rotation.z, 0.1, bd);
      p.armR.rotation.x = lerp(p.armR.rotation.x, -1.15, bd);
      p.armR.rotation.z = lerp(p.armR.rotation.z, -0.45, bd);
    }
    // guard arc — glanceable shield state: visible while guarding, flashes on block, reddens near break
    const ga = p.guardArc;
    if (ga) {
      ga.visible=this.state!=='ko';
      ga.material.advance?.(dt);
      // The additive double-sided shell became a white panel over the defender
      // in chase view. Tint the transmitted body instead of summing white light.
      // Full barriers otherwise composite both the front and rear wall over the
      // wearer, hiding twice as much anatomy as an ordinary frontal guard.
      configureShieldSurface(this);
      const flash = this._blocked > 0 ? (this._openSky ? .14 : .5) : 0;
      const target = this.guarding ? (this._openSky ? .12 : .24) + flash : flash * 0.7;
      ga.material.opacity = damp(ga.material.opacity, target, 14, dt);
      if (this.def.guardType !== 'deflect') {
        const gm = this.guardMeter;
        if (this._openSky) ga.material.color.setRGB(.14 + (1-gm)*.65, .48*gm + .14*(1-gm), .75*gm + .1*(1-gm));
        else ga.material.color.setRGB(0.75 + (1 - gm) * 0.25, 0.88 * gm + 0.25 * (1 - gm), 1 * gm + 0.2 * (1 - gm));   // ice-blue → red as the meter dies
      }
      ga.rotation.y = this._openSky&&this.guarding?this.facing-p.g.rotation.y:damp(ga.rotation.y,0,20,dt);
      ga.scale.setScalar(1 + Math.sin(this.animT * 10) * 0.02);
    }
    // frozen shell
    if (p.ice) {
      const iceOn = this.frozenT > 0;
      if (p.ice.visible !== iceOn) p.ice.visible = iceOn;
      if (iceOn) { p.ice.material.opacity = 0.66 + Math.sin(this.animT * 9) * 0.06; p.ice.rotation.y += dt * 0.4; }
    }
    // charged-melee wind-up: right arm coils back, fist blazes
    if (this.meleeCharge > 0) {
      const ch = Math.min(1, this.meleeCharge);
      p.armR.rotation.x = lerp(p.armR.rotation.x, 0.9 + ch * 0.5, 0.8);
      p.armR.rotation.z = lerp(p.armR.rotation.z, -0.4, 0.6);
      p.armR.children[2].material.emissiveIntensity = 1 + ch * 2.4;
      p.torso.rotation.y = lerp(p.torso.rotation.y, -0.35 * ch, 0.5);
    } else if (Math.abs(p.torso.rotation.y) > 0.01) p.torso.rotation.y = damp(p.torso.rotation.y, 0, 12, dt);
    // phase-intangibility: go ghostly
    if (this.canPhase) {
      const ph = this.phase ? 0.32 : 1;
      for (const m of [p.mats.suit, p.mats.suit2]) { m.transparent = true; m.opacity = damp(m.opacity, ph, 12, dt); }
    }
    // fists glow while casting/charging
    const anyCharge = Object.values(this.slots).some(s => s.charging || s.sustainT > 0);
    const fi = anyCharge ? 2.2 : (cast > 0.3 ? 1.2 : 0);
    p.armL.children[2].material.emissiveIntensity = damp(p.armL.children[2].material.emissiveIntensity, fi, 10, dt);
    p.armR.children[2].material.emissiveIntensity = p.armL.children[2].material.emissiveIntensity;
    // flight pose — the body aligns with the direction of TRAVEL:
    // level cruise → prone (head first), rising → vertical (head points where you're going),
    // pure up/down or hovering at altitude → fully upright, dives → nose-down, strafes → bank into the turn.
    if (!p.rig) {
    let pitchT = 0, rollT = 0;
    // ⚠ READER #9 (aaa-03 §1): the FLIGHT POSE. Driven by `airborne` (gait), so a fighter standing on
    // the PowerWorld floor is UPRIGHT, not prone. The damp(7) below already ramps the pose in over
    // LIFT and out over SETTLE; the explicit gaitBlend envelope (§6.2) is the Loop 4 polish, not this.
    if (usesFlightPose(this)) {
      const fwd = this.vel.x * this.aim.x + this.vel.z * this.aim.z;       // motion along facing
      const latR = this.vel.x * this.aim.z - this.vel.z * this.aim.x;      // motion to the body's right
      const vy = this.vel.y;
      const k = clamp((Math.hypot(this.vel.x, this.vel.z, vy * 0.5) - 6) / 20, 0, 1);   // engage with real speed
      const ang = fwd > 2 ? Math.atan2(fwd, vy) : 0;                       // vertical travel stays feet-first
      // ⚠ UNCLAMP THE DIVE POSE UNDER AN OPEN SKY (aaa-01 §6.2). The 1.85 (≈106°) clamp truncated every
      // dive — a straight-down dive rendered 74° short and the body never pointed down. `ang ∈ [0, π]`
      // here (`fwd > 2` guards the sign), so π is the only bound needed; the ground rig already inverts
      // this pitch exactly (order 'ZXY'), so the shadow/rings stay under a diving fighter. City keeps 1.85.
      pitchT = clamp(ang, 0, this._openSky ? Math.PI : 1.85) * k;
      if (fwd < -4) pitchT = -0.25 * k;                                    // backpedal: slight back-lean
      rollT = clamp(-latR * 0.014, -0.5, 0.5) * k;
    }
    p.g.rotation.x = damp(p.g.rotation.x, pitchT, 7, dt);
    p.g.rotation.z = damp(p.g.rotation.z, rollT, 7, dt);
    // ⚠ THE GROUND RIG CANCELS THE FLIGHT POSE. The two lines above write pitch and roll onto the
    // same group the ground markers hang from, so at prone cruise the markers' local "down" swung
    // nearly horizontal and the shadow and rings slid out from under the fighter — precisely when
    // you are airborne and the marker is the only thing telling you where you are. Order 'ZXY'
    // with y=0 composes Rz(-roll)*Rx(-pitch), which is the exact inverse of the parent's pitch and
    // roll while LEAVING YAW ALONE (the facing wedge still wants the body's yaw).
    if (p.groundRig) { p.groundRig.rotation.x = -p.g.rotation.x; p.groundRig.rotation.z = -p.g.rotation.z; }
    }
    // Once a ranged cast has ended, flight and the arm overlay must recover
    // together. A stale castPose otherwise keeps folding the elbow while the
    // overlay is almost gone. New cast actions and all melee/guard owners keep
    // their own suppression; the neutral authored flight pose is unchanged.
    const rangedRecovery=this._openSky&&(this.state==='idle'||this.state==='cast'&&this._castPoseRanged)&&this._combatAim?.weight>.0001&&!rangedPoseChannels(this).dominant;
    const flightCombat=rangedRecovery?Math.max(this._combatAim.weight,punch,gS,gG,gR,this._bowDraw||0,this.meleeCharge>0?1:0):combatPose;
    animateFlight(this, dt, flightCombat);
    animateGround(this,dt,combatPose);
    animateJump(this,dt);
    animateGroundTransition(this,dt);
    animateCrouchPose(this,dt);
    animateDirectionalAim(this,dt);
    // Grip solvers must see this frame's free hands, including a stowed shield.
    updateSoldierLoadoutPresentation(this);
    animateCombatAim(this, dt);
    animateFreeLookHead(this);
    animateHands(this,dt);
    // aura from ki%/charge/buff — and POWER TIER: higher tiers burn brighter in gold → white-hot
    const auraP = clamp((anyCharge ? 0.62 : 0) + (this.cruiseHeld && this.airborne ? .28 : 0) + (this.powerBuff > 1 ? .20 : 0) + (this.tier - 1) * 0.12, 0, 1);
    const tc = TIER_COLORS[this.tier];
    p.aura.material.color.set(tc || this.def.colors.accent);
    p.aura.material.userData.auraTime.value=this.animT;
    p.aura.material.opacity = damp(p.aura.material.opacity, auraP * (0.5 + (this.tier - 1) * 0.1), 8, dt);
    const tp = 1 + (this.tier - 1) * 0.08;
    p.aura.scale.set((1 + Math.sin(this.animT * 8) * 0.04) * tp, (1.7 + auraP * 0.5) * tp, (1 + Math.sin(this.animT * 8) * 0.04) * tp);
    // contact shadow — pinned to the ground, shrinks & fades as the fighter climbs
    if (p.shadow) {
      const gy = this.groundY || 0, aly = this.pos.y - gy;   // height ABOVE the terrain, not sea level
      p.shadow.position.set(0, 0.05 - aly, 0);
      const alt = clamp(1 - aly / 42, 0.08, 1);
      p.shadow.material.opacity = 0.36 * alt;
      p.shadow.scale.setScalar(clamp(1 - aly * 0.006, 0.4, 1));
    }
    // ---- THE ALTIMETER IS THE MARKER UNDER YOU (2026-07-25) -------------------------------------
    // Robert: "add flight level to the line under the flyer, remove it from the side panel — put
    // it in the circle that indicates what level you are on, small, and have it slowly float up
    // indicating how high your character is."
    //
    // The ring used to be pinned to the ground exactly like the contact shadow, which meant the
    // two markers sat on top of each other and neither said anything about HEIGHT. Now the SHADOW
    // stays on the ground and the RING rises off it, so the GAP between them is the altitude —
    // readable without a number, from any camera angle, for every fighter at once. It is damped
    // rather than tracked so it FLOATS up rather than snapping, and it is capped well below the
    // body so it can never reach your feet and start reading as zero again.
    if (p.bandRing) {
      const gy0 = this.groundY || 0, hAbove = Math.max(0, this.pos.y - gy0);
      // ⚠ LOGARITHMIC, NOT LINEAR-WITH-A-CAP. The first version was `min(h * 0.34, 16)`, which
      // saturates at roughly 47 units — measured: the gap was pinned at 16.5u from h=52 all the
      // way to h=224, so the indicator said the same thing for the entire useful flight range and
      // only worked while you were barely off the ground. A log curve keeps climbing to the
      // ceiling while staying bounded, and gives each altitude band about the same visual space.
      const want = Math.min(6.2 * Math.log(1 + hAbove / 11), 24);
      this._ringLift = this._ringLift === undefined ? want : damp(this._ringLift, want, 3.2, dt);
      const lift = Number.isFinite(this._ringLift) ? this._ringLift : 0;
      p.bandRing.position.set(0, 0.55 - this.pos.y + gy0 + lift, 0);
      // ⚠ THE RING STAYS, THE FOUR COLOURS GO. The lifted ring is a genuinely good altitude cue and
      // an air fight needs one more than a street fight does — but recolouring it per BAND is the
      // layer ladder drawn under every fighter's feet. Under an open sky it is one colour, and the
      // HEIGHT of the ring carries the information on its own, continuously.
      const b = this._openSky ? 1 : bandOf(this.pos.y);
      if (b !== this._band) { this._band = b; p.bandRing.material.color.set(ALT_BANDS[b].c); }
      p.bandRing.material.opacity = this._openSky ? (hAbove > 3 ? 0.5 : 0.22) : (b === 0 ? 0.28 : 0.6);
      // THE TAG rides the ring. Numbers only for a HUMAN — a metre readout floating over every
      // enemy is clutter at best and, for a foe you have only half-seen, an information leak.
      // Their ring still rises, so you read THEIR height as a shape and YOUR height as a figure.
      // ⚠ `this._game`, NEVER a bare `game`. This whole block — the tag AND the plumb line below
      // — used to read an undeclared `game` identifier that resolves to an INCIDENTAL GLOBAL
      // nothing in src/ ever assigns. Measured: `window.game !== theCurrentGame`, so the tether's
      // honesty gate and its scroll clock were consulting a different object entirely, and the
      // new tag silently never built. It failed safe rather than loudly, which is why it lasted.
      // The class already holds the real reference; there is no reason to reach for a global.
      const G = this._game;
      if (G && G.isHuman && G.isHuman(this)) this._altTag(p, b, hAbove, lift);
      else if (p.altTag) p.altTag.visible = false;
      // ---- THE PLUMB LINE ------------------------------------------------------------------
      if (p.tether) {
        const gy = this.groundY || 0, h = this.pos.y - gy;
        // ⚠ THE HONESTY GATE. A tether visible through fog is a wallhack and would silently
        // undo the entire AI-honesty effort. Only draw it for someone actually seen — or in
        // the explicit spectator mode, which is an admin view, not the player HUD.
        const seen = (this._vis === undefined ? 1 : this._vis) > 0.35 || (G && G.hud && G.hud.spectatorBands);
        // ⚠ NEVER WRITE A NON-FINITE VALUE INTO A PERSISTENT BUFFER. This attribute lives for
        // the life of the fighter, so a single transient NaN position would stay in it forever
        // and three.js would report a NaN bounding sphere long after the cause was gone. Guard
        // the write, and ZERO the buffer when hiding rather than leaving stale values behind.
        if (h > 14 && seen && Number.isFinite(h) && Number.isFinite(gy)) {
          p.tether.visible = true;
          const arr = p.tether.geometry.attributes.position.array;
          // ⚠ VALIDATE WHAT IS WRITTEN, NOT WHAT WENT IN. This is the bug that produced
          // `computeBoundingSphere(): Computed radius is NaN` for two days. If `scroll` is ever
          // non-finite then `y0 = Math.max(0, NaN)` is NaN, and the guard below it —
          // `if (y1 <= y0) continue` — does NOT fire, because **NaN <= NaN is false**. A NaN
          // sails straight past a comparison-based skip and lands in a buffer that lives for the
          // life of the fighter. Checking the inputs is not enough; check the OUTPUT.
          const sc = (this.flying && Math.abs(this.vel.y) > 4 && G && Number.isFinite(G.time)) ? (G.time * 22) % 50 : 0;
          const scroll = Number.isFinite(sc) ? sc : 0;
          let n = 0;
          for (let d = 0; d < h && n < 28; d += 50) {
            const y0 = Math.max(0, d - scroll), y1 = Math.min(h, y0 + 26);
            if (!(y1 > y0)) continue;                     // NOT `y1 <= y0` — that lets NaN through
            const a0 = y0 - h, a1 = y1 - h;
            if (!Number.isFinite(a0) || !Number.isFinite(a1)) continue;
            const i = n * 6;
            arr[i] = 0; arr[i + 1] = a0; arr[i + 2] = 0;
            arr[i + 3] = 0; arr[i + 4] = a1; arr[i + 5] = 0;
            n++;
          }
          for (let k = n; k < 28; k++) { const i = k * 6; arr[i] = arr[i + 1] = arr[i + 2] = arr[i + 3] = arr[i + 4] = arr[i + 5] = 0; }
          p.tether.geometry.attributes.position.needsUpdate = true;
          p.tether.geometry.setDrawRange(0, n * 2);
          p.tether.material.color.set(ALT_BANDS[b].c);
          p.tether.material.opacity = (G && G.hud && G.hud.spectatorBands) ? 0.85 : 0.28 + Math.min(0.3, h / 400);
        } else {
          if (p.tether.visible) {                      // hide AND scrub, so nothing stale survives
            const arr = p.tether.geometry.attributes.position.array;
            for (let k = 0; k < arr.length; k++) arr[k] = 0;
            p.tether.geometry.attributes.position.needsUpdate = true;
            p.tether.geometry.setDrawRange(0, 0);
          }
          p.tether.visible = false;
        }
      }
      // FACING: the wedge sits at the front of the ring and counter-rotates the body's smoothing,
      // so it always points exactly where this fighter is actually looking.
      if (p.faceWedge) {
        p.faceWedge.position.set(0, 0.75 - this.pos.y + (this.groundY || 0), 0);
        p.faceWedge.rotation.z = -(this.facing - this.obj.rotation.y);   // group already carries body yaw
        const fm = p.faceWedge.material;
        fm.color.set(ALT_BANDS[b].c);
        fm.opacity = 0.55 + (b === 0 ? 0 : 0.25);
      }
      // STATE: one ring that tells you what they're doing before it lands on you
      // THE LINE IS VISIBLE (readability ruling): a taut gold line from hand to anchor while
      // reeling or hanging — lazily built, hidden on release, disposed with the fighter.
      if (this._grapple?.zip||this.hanging?.zip) {
        // Web zip uses its data color and actual hand socket, not a gold root line.
      } else if ((this._grapple || this.hanging) && this._game) {
        if (!this._grapLine) {
          const ggeo = new THREE.BufferGeometry();
          ggeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3));
          this._grapLine = new THREE.Line(ggeo, new THREE.LineBasicMaterial({ color: '#ffd24a', transparent: true, opacity: 0.85 }));
          this._grapLine.frustumCulled = false;
          this._game.scene.add(this._grapLine);
        }
        const A = this._grapple || { x: this.hanging.x, y: this.hanging.y + 6.6, z: this.hanging.z };
        const pa = this._grapLine.geometry.attributes.position.array;
        pa[0] = this.pos.x; pa[1] = this.pos.y + 6.6; pa[2] = this.pos.z;
        pa[3] = A.x; pa[4] = A.y; pa[5] = A.z;
        this._grapLine.geometry.attributes.position.needsUpdate = true;
        this._grapLine.visible = true;
      } else if (this._grapLine && this._grapLine.visible) this._grapLine.visible = false;
      if (p.stateRing) {
        p.stateRing.position.set(0, 0.35 - this.pos.y + (this.groundY || 0), 0);
        const sm = p.stateRing.material;
        let col = null, op = 0, sc = 1;
        if (this._controlled) { col = '#7fd4ff'; op = 0.55 + Math.sin(this.animT * 6) * 0.2; sc = 1.04; }  // DOMINATED — not their own will
        else if (this.chargingKi) { col = '#ffe9a0'; op = 0.6 + Math.sin(this.animT * 9) * 0.3; sc = 1 + Math.sin(this.animT * 9) * 0.06; }  // THE SCREAM — charging, and defenseless
        else if (this.guarding) { col = '#9fd0ff'; op = 0.7; sc = 1 + Math.sin(this.animT * 8) * 0.02; }        // braced
        else if (this.grabbing || this.grabState) { col = '#8fe08a'; op = 0.75; sc = 1.06; }              // seizing
        else if (this.meleeCharge > 0) { col = '#ff8a3a'; op = 0.45 + Math.min(0.45, this.meleeCharge * 0.6); sc = 1 + this.meleeCharge * 0.12; }  // winding up a haymaker
        else if (this.strikeActive > 0) { col = '#ffffff'; op = 0.8; sc = 1.12; }                          // committed
        else if (this.staggerT > 0) { col = '#ff5a4a'; op = 0.7; sc = 0.94; }                              // rocked — punish window
        if (op > 0) { if (this._stateCol !== col) { this._stateCol = col; sm.color.set(col); } sm.opacity = op; p.stateRing.scale.setScalar(sc); }
        else if (sm.opacity > 0) { sm.opacity = Math.max(0, sm.opacity - dt * 6); }
      }
    }
    // The third-person body and contact shadow carry location/height. The old
    // tabletop glyphs must not compete with feet, weapons or soldier identity.
    const showGroundGlyphs=!(this._openSky||this._game?.modeId==='powerworld');
    for(const key of ['bandRing','faceWedge','stateRing'])if(p[key])p[key].visible=showGroundGlyphs;
    if(!showGroundGlyphs){if(p.altTag)p.altTag.visible=false;if(p.tether)p.tether.visible=false;}
    // cruise wind — the fastest fliers drag visible speed lines (cheap particles, speed-gated)
    if ((this.flying || this.gliding) && this._game && Math.hypot(this.vel.x, this.vel.z) > 38 && Math.random() < 0.55) {
      this._game.particles.spawn({
        x: this.pos.x - this.vel.x * 0.06, y: this.pos.y + 4.6 + (Math.random() * 2 - 1) * 2, z: this.pos.z - this.vel.z * 0.06,
        vx: -this.vel.x * 0.22, vy: 0, vz: -this.vel.z * 0.22,
        life: 0.18, size: 0.38, color: ['#ffffff', '#cfe8ff'], drag: 0.6, shrink: true,
      });
    }
    // hit flash
    const hf = this.hitFlash;
    p.mats.suit.emissiveIntensity = 0.05 + hf * 2;
    p.mats.suit.emissive.setRGB(0.05 + hf, 0.05 + hf * 0.3, 0.05);
    if (hf <= 0) p.mats.suit.emissive.set(this.def.colors.primary);
    // THE MEASURED SWING (aaa-02 §4.6) — the fist's world speed, for melee.js swingMult/handMult. On
    // the GROUND the body stands still and the FIST is what moves, so the air's body-|vel| model is
    // wrong there; JKA measures blade-base travel instead. The fist is arm.children[2] (the rig
    // contract); getWorldPosition composes the poser's fresh rotations, so this reads the swing we
    // just posed. HAND_REF/HAND_SPAN were measured off exactly this signal (bench/ground.js).
    if (dt > 0) {
      const arm = p.armR || p.armL;
      const fist = arm && arm.children && arm.children[2] ? arm.children[2] : arm;
      if (fist) {
        fist.getWorldPosition(_handW);
        if (this._handPrev) this._handSpd = _handW.distanceTo(this._handPrev) / dt;
        this._handPrev = (this._handPrev || new THREE.Vector3()).copy(_handW);
      }
    }
    // Recoil is presentation only: measure offensive fist speed before this carrier
    // so being hit cannot secretly increase the victim's next melee damage.
    animateHitReaction(this, dt);
    poseNaniteForearms(this,dt);
    if(!poseImpactRecovery(this))animatePronePose(this,dt);
    animateRiflePose(this,dt);
    animateReloadPose(this);
    animateThrowAction(this);
    presentWebZip(this);
    animateLostControlPose(this,dt);
    syncHeadCover(p);
    // Cloth reads the final carrier, including recoil, but cannot affect fist-speed damage.
    if(!this._modularCharacter)animateCape(p,this.animT,this.vel.length(),this.vel);
    animateHeldGrip(this);
    updateBowAttachments(this);
    updateLimbSurfaces(p);
    poseWebSnare(this);
    poseFlightFeet(this,dt);
    syncFlightBoard(this);
    poseZombieInjuries(this);
    updateHeroSkin(p);
    presentNanites(this);
    syncChargePresentation(this);
    updateCrouchBounds(this);
    updateProneBounds(this);
    this._modularCharacter?.update();
    anchorStatusIndicators(this);
  }

  _sync() { if(this.ragdoll){updateHeroSkin(this.parts);this._modularCharacter?.update();anchorStatusIndicators(this);} updateWebSnareVisual(this); }
}
