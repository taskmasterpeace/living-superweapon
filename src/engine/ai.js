// WAR WORLD: ASCENDANTS — character-authentic AI. Each hero fights in the style of its counterpart:
// beamers zone, rushers blitz, artillery kites, zoners wall up, tricksters teleport/phase, grapplers grab, summoners hide behind minions.
import { pickByPersonality } from './psyche.js';
import { HOLD_TYPES, holdTimeFor } from './abilityMeta.js';
import { rand, chance, pick } from '../core/util.js';
import {remoteAttack,remoteInRange} from './remote-control.js';
import {slotUnlocked} from '../data/progression.js';
import {updateSquadReport} from './squad-reports.js';
import {zombieAwareness} from './zombie-audio.js';

// HOLD + holdTime derive from TYPE_META — ONE registration point per type (review item 2).
const HOLD = HOLD_TYPES;
const holdTime = (t) => holdTimeFor(t, rand);

function deriveStyle(def) {
  const types = Object.values(def.abilities || {}).map(a => a.type);
  if (types.includes('summon')) return 'summoner';
  if (types.includes('construct')) return 'zoner';
  if (types.includes('meteor')) return 'artillery';
  if ((def.speed || 30) >= 40) return 'rusher';
  if (types.includes('beam')) return 'beamer';
  return 'bruiser';
}

export class AI {
  constructor(bot, level = 1) {
    level = Math.max(.5, Math.min(2, Number.isFinite(level) ? level : 1));
    this.bot = bot; this.level = level;
    const p = bot.def.ai || {};
    this.style = p.style || deriveStyle(bot.def);
    this.range = p.range ?? 34;
    this.aggro = p.aggro ?? 0.7;
    this.flyTend = p.fly ?? 0.3;
    this.byType = {};
    for (const k in bot.slots) { const t = bot.slots[k].def.type; (this.byType[t] = this.byType[t] || []).push(k); }
    this.think = 0; this.strafe = 1; this.gcd = rand(0.3, 0.9); this.action = null;
    // ---- SENSES (see docs: bots must never read the truth they haven't earned) ----
    // AWARENESS from the tabletop sheet buys real perception: a Cosmic-awareness subject sees
    // farther and wider than a civilian-eyed brawler.
    // ⚠ WEATHER REACHES THE AI THROUGH ONE MULTIPLY, AND NOTHING ELSE CHANGES. The honesty law
    // already forbids a bot acting on anything it has not earned by sight, radio or noise — so
    // shortening the sight range degrades acquisition, tracking, search and squad callouts for free.
    // A bot in a storm genuinely loses you. There is no weather branch anywhere in this file.
    const wx = (bot._game && bot._game.weather && bot._game.weather.visMult) || 1;
    const vm = ((bot.sheet && bot.sheet.visMult) || 1) * wx;
    this.seeNear = 30 * vm; this.seeRange = 118 * vm; this.seeCos = Math.cos(Math.min(1.45, 1.2 * vm));
    this.hearRange = 150 * vm;
    this._sees = false;
    // BELIEF — everything the bot thinks it knows. `ls` is a REMEMBERED point, not a live feed.
    this.belief = null;          // { x, z, y, t: age, src: 'sight'|'noise'|'radio' }
    this._mem = 0;               // >0 = the sighting is still fresh enough to act on
    this._searchT = 0; this._scanA = 0; this._scanDir = chance(0.5) ? 1 : -1;
    this._patrol = null; this._patrolT = 0;

    // ---- HANDS & NERVES: the bot is skilled, never superhuman (see THE FAIRNESS LAW) ----
    // Difficulty (`level`) buys REFLEXES and STEADINESS — never knowledge, never physics.
    const sh = bot.sheet || {};
    const agi = (sh.agility ?? 5) / 5;             // AGILITY turns the head
    const fig = (sh.fighting ?? 5) / 5;            // FIGHTING steadies the hands
    this.turnRate = (2.1 + 0.5 * agi) * (0.75 + level * 0.3);   // rad/s — a real neck, not a turret
    this.reflex = Math.max(0.2, 0.4 / level);     // difficulty never buys instant reactions
    this.aimJitter = 0.085 / (level * (0.7 + fig * 0.4));       // radians of wander at rest
    this.lead = Math.min(0.85, 0.35 * level);      // how much of a target's motion it predicts
    this._aimA = bot.facing;                       // the aim it is ACTUALLY holding (turn-rate limited)
    this._aimPitch=0;this._seenTarget=null;this._threat=null;this._threatAge=0;this._threatAnswered=false;
    this._beamSeenPoint={x:0,y:0,z:0};
    this._errA = 0; this._errT = 0; this._errTo = 0;
    this._acq = 0;                                 // acquisition timer — can't shoot the instant you appear
    this._lastSeen = false;
    this._opener = 0;                              // cruise-punch approach timer (momentum melee, manual §10)
  }

  // The hand wobble: a slow random walk, not per-frame noise (per-frame reads as a laser with static).
  _wander(dt) {
    this._errT -= dt;
    if (this._errT <= 0) { this._errT = rand(0.25, 0.7); this._errTo = rand(-this.aimJitter, this.aimJitter); }
    this._errA += (this._errTo - this._errA) * Math.min(1, dt * 4);
    return this._errA;
  }
  // Turn the head toward a bearing at a FINITE rate. This is what makes flanking real.
  _turnToward(angle, dt) {
    let d = (angle - this._aimA) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2;
    const step = this.turnRate * dt;
    this._aimA += Math.abs(d) <= step ? d : Math.sign(d) * step;
    return { x: Math.sin(this._aimA), z: Math.cos(this._aimA), onTarget: Math.abs(d) < 0.25 };
  }

  // Each visible projectile/beam earns one decision after its own observation
  // window. Retrying a 35% dodge roll every render frame made it near-certain.
  observeThreat(threat,dt,game,ready=true) {
    const b=this.bot,source=threat?.muzzle||threat?.pos;
    const visibleAt=pos=>{
      if(!pos)return false;
      const dx=pos.x-b.pos.x,dz=pos.z-b.pos.z,d=Math.hypot(dx,dz);
      return Math.hypot(dx,pos.y-b.pos.y,dz)<this.seeRange
        &&(d<this.seeNear||(dx*b.aim.x+dz*b.aim.z)/Math.max(.001,d)>this.seeCos)&&game.canSee(b,{pos});
    };
    let visible=false;
    if(threat&&!threat.dead&&!threat.pendingLaunch&&!(b.blindT>0)){
      visible=visibleAt(source);
      // A long shot can enter our sight while its caster remains out of range.
      // Observe the closest already-emitted segment, never a future aim line.
      if(!visible&&threat.path&&threat.pn>1){
        const p=threat.path,point=this._beamSeenPoint;let closest=Infinity;
        for(let i=1;i<threat.pn;i++){
          const a=(i-1)*3,c=i*3,dx=p[c]-p[a],dy=p[c+1]-p[a+1],dz=p[c+2]-p[a+2],l2=dx*dx+dy*dy+dz*dz;
          if(l2<1e-12)continue;
          const t=Math.max(0,Math.min(1,((b.pos.x-p[a])*dx+(b.pos.y+5.2-p[a+1])*dy+(b.pos.z-p[a+2])*dz)/l2));
          const x=p[a]+dx*t,y=p[a+1]+dy*t,z=p[a+2]+dz*t,d2=(x-b.pos.x)**2+(y-b.pos.y-5.2)**2+(z-b.pos.z)**2;
          if(d2<closest){closest=d2;point.x=x;point.y=y;point.z=z;}
        }
        if(closest<Infinity)visible=visibleAt(point);
      }
    }
    if(!visible){this._threat=null;this._threatAge=0;this._threatAnswered=false;return false;}
    if(this._threat!==threat){this._threat=threat;this._threatAge=0;this._threatAnswered=false;}
    this._threatAge+=dt;
    if(!ready||this._threatAnswered||this._threatAge+1e-8<this.reflex)return false;
    this._threatAnswered=true;return true;
  }

  // A remembered position. Never overwrite a fresh SIGHTING with a vague noise/radio cue.
  remember(x, z, y, src, jitter = 0) {
    const rank = { sight: 3, radio: 2, noise: 1 };
    if (this.belief && this._mem > 0 && rank[this.belief.src] > rank[src]) return;
    const j = jitter;
    this.belief = { x: x + rand(-j, j), z: z + rand(-j, j), y, t: 0, src };
    this._mem = src === 'sight' ? 4 : src === 'radio' ? 3 : 2.2;
    this._searchT = 0;           // a new lead resets the search
  }
  // Something loud happened. Distant noises give a VAGUE bearing, close ones a good one.
  hear(x, z, y, loud) {
    if (this._sees) return;                                   // eyes beat ears
    const b = this.bot;
    const d = Math.hypot(x - b.pos.x, z - b.pos.z);
    const reach = this.hearRange * loud;
    if (d > reach) return;
    this.remember(x, z, y, 'noise', 4 + (d / Math.max(1, reach)) * 26);   // far = fuzzy
  }
  // A teammate radioed a sighting.
  radio(x, z, y) { if (!this._sees) this.remember(x, z, y, 'radio', 6); }

  intent(dt, game) {
    if (this._jammedT > 0) this._jammedT -= (game && game.dt) || 1 / 60;   // the jam wears off
    const b = this.bot;
    const out = { move: { x: 0, z: 0 }, aimDir: null, slots: {}, fly: false, target: null, ready:false };
    for (const k in b.slots) out.slots[k] = { pressed: false, held: false, released: false };

    // focus the player if it's a foe, else the nearest
    // ⚠ PERSONALITY DECIDES WHO, THE HONESTY LAW DECIDES WHETHER THEY KNOW. The Combat Compendium
    // gives each of the twenty types a target preference (most health / least health / biggest
    // threat / easiest / random) — but it only ever chooses among foes this bot can ACTUALLY SEE,
    // so a "goes for the weakest" fighter still cannot know who is weakest through a wall.
    let real = (game.player && game.isFoe(b, game.player) && game.player.alive) ? game.player : game.nearestFoe(b, b.pos, 500);
    if(b._highwallUnit){
      // A mixed battle must not ignore an observed nearby foe solely because the
      // player (possibly hidden) was first in the historical target preference.
      const visible=game.entities.filter(e=>e!==b&&e.alive&&game.isFoe(b,e)).filter(e=>{
        const dx=e.pos.x-b.pos.x,dz=e.pos.z-b.pos.z,d=Math.hypot(dx,dz)||1;
        return b.blindT<=0&&(d<this.seeNear||d<this.seeRange&&(dx*b.aim.x+dz*b.aim.z)/d>this.seeCos)&&game.canSee(b,e);
      });
      if(visible.length)real=visible.reduce((a,e)=>b.pos.distanceToSquared(e.pos)<b.pos.distanceToSquared(a.pos)?e:a);
    }
    if (b._psyche) {
      const seen = game.entities.filter(e => e.alive && e.def && !e.isDummy && game.isFoe(b, e)
        && b.blindT<=0 && game.canSee(b,e) && Math.hypot(e.pos.x - b.pos.x, e.pos.z - b.pos.z) < this.seeRange
        && (Math.hypot(e.pos.x-b.pos.x,e.pos.z-b.pos.z)<this.seeNear || ((e.pos.x-b.pos.x)*b.aim.x+(e.pos.z-b.pos.z)*b.aim.z)/Math.max(.001,Math.hypot(e.pos.x-b.pos.x,e.pos.z-b.pos.z))>this.seeCos));
      if (seen.length > 1) real = pickByPersonality(game, b, seen) || real;
    }
    if (!real) { out.aimDir = { x: Math.sin(b.facing), z: Math.cos(b.facing) }; return out; }

    // --- vision ---
    const rdx = real.pos.x - b.pos.x, rdz = real.pos.z - b.pos.z, rd = Math.hypot(rdx, rdz) || 1;
    const inCone = rd < this.seeNear || (rd < this.seeRange && (rdx / rd) * b.aim.x + (rdz / rd) * b.aim.z > this.seeCos);
    // BLIND (manual §14): smoke owns the eyes. A blinded bot gains NO new sight — it hunts the
    // belief it already had, which ages and drifts. It believes wrongly, exactly as specified.
    const sees = b.blindT > 0 ? false : (inCone && game.canSee(b, real));
    this._sees = sees;
    if (sees) {
      this.remember(real.pos.x, real.pos.z, real.pos.y, 'sight');
      this._callOut(game, real);                              // tell the squad
    } else {
      if (this._mem > 0) this._mem -= dt;
      if (this.belief) this.belief.t += dt;
      this._lastSeen = false;
    }

    updateSquadReport(this,game,real,sees);
    zombieAwareness(game,b,sees);
    if (!sees) {
      // ⚠ THE HONESTY LAW: with no line of sight the bot knows NOTHING about where the foe is.
      // It may only act on BELIEF — a remembered sighting, a noise it heard, a teammate's call.
      // (This branch used to fall back to `real.pos`, the live truth, which is why bots felt
      // omniscient: one that had never seen you would still walk straight at you.)
      const goal = this._searchGoal(game, dt);
      out.navigationGoal={x:goal.x,z:goal.z};
      const hx = goal.x - b.pos.x, hz = goal.z - b.pos.z, hd = Math.hypot(hx, hz) || 1;
      let mx = hx / hd, mz = hz / hd;
      // 1:1-scale city: tall blocks can wedge a bot against a wall — FLANK when progress stalls
      this._stuckT = (this._stuckT || 0) + dt;
      if (this._stuckT > 0.5) {
        this._stuckT = 0;
        const moved = Math.hypot(b.pos.x - (this._lastX ?? b.pos.x), b.pos.z - (this._lastZ ?? b.pos.z));
        this._lastX = b.pos.x; this._lastZ = b.pos.z;
        if (moved < 2.5) this._flankT = 1.6;
        else if (this._flankT > 0) this._flankT -= 0.5;
      }
      if (this._flankT > 0) {
        this._flankT -= dt;
        mx += (-hz / hd) * this.strafe * 1.5; mz += (hx / hd) * this.strafe * 1.5;
        const ml = Math.hypot(mx, mz) || 1; mx /= ml; mz /= ml;
      }
      out.move = { x: mx, z: mz };
      // SWEEP: searching eyes scan off the path of travel — this is what makes juking work,
      // and what lets a bot walk right past someone holding still behind cover.
      this._scanA += this._scanDir * dt * 1.5;
      if (Math.abs(this._scanA) > 0.85) { this._scanDir *= -1; this._scanA = Math.sign(this._scanA) * 0.85; }
      out.aimDir = this._turnToward(Math.atan2(mx, mz) + this._scanA, dt);   // the head turns at a human rate
      // altitude is a GUESS from the last sighting, never live truth
      out.fly = !!(this.belief && this._mem > 0 && this.belief.y - b.pos.y > 8 && this.flyTend > 0.4);
      this.action = null; return out;
    }
    this._flankT = 0; this._stuckT = 0; this._scanA = 0; this._searchT = 0;

    const tx = real.pos.x, tz = real.pos.z, ty = real.pos.y;
    const dx = tx - b.pos.x, dz = tz - b.pos.z, d = Math.hypot(dx, dz) || 1, dh = ty - b.pos.y;
    // ⚠ THE FAIRNESS LAW: a bot may not snap to a target. It TURNS at a finite rate, its hands
    // WANDER, and it leads a moving target imperfectly. Difficulty raises skill, never certainty.
    const lead = this.lead * Math.min(1.1, d / 60);                 // lead more at range, like a person
    const ax = tx + (real.vel ? real.vel.x * lead : 0), az = tz + (real.vel ? real.vel.z * lead : 0);
    const aimed = this._turnToward(Math.atan2(ax - b.pos.x, az - b.pos.z) + this._wander(dt), dt);
    out.aimDir = aimed;
    // the point it BELIEVES it should shoot — never the exact body centre
    const aimDistance=Math.max(1,Math.hypot(ax-b.pos.x,ty-b.pos.y,az-b.pos.z));
    const pitch=Math.atan2(ty-b.pos.y,Math.hypot(ax-b.pos.x,az-b.pos.z));
    const pitchDelta=pitch-this._aimPitch,maxPitch=this.turnRate*dt;
    this._aimPitch+=Math.max(-maxPitch,Math.min(maxPitch,pitchDelta));
    // The firing point follows the same bounded bearing as the body, including
    // held beams. Previously only the visual facing turned; aimAt snapped exactly.
    const flat=Math.cos(this._aimPitch)*aimDistance;
    out.aimAt={x:b.pos.x+aimed.x*flat,y:b.pos.y+Math.sin(this._aimPitch)*aimDistance,z:b.pos.z+aimed.z*flat};
    out.target = real;
    // ACQUISITION: eyes-on doesn't mean trigger-ready — a beat to register and commit
    if (!this._lastSeen || this._seenTarget!==real) {
      this._acq = this.reflex * rand(0.8, 1.5);
      // THE CRUISE-PUNCH OPENER (momentum melee, manual §10): a confident flier OPENS the
      // engagement by throttling straight in and arriving fist-first. Doctrine (flyTend) picks
      // WHO does it; difficulty buys the judgment to use it — never extra physics.
      if (this.flyTend > 0.55 && b.flightTier >= 2 && d > 42 && d < 150
          && b.hp > b.maxHp * 0.5 && chance(0.18 + 0.3 * Math.min(2, this.level)))
        this._opener = Math.min(3.2, d / 34);
    }
    this._lastSeen = true;
    this._seenTarget=real;
    if (this._acq > 0) this._acq -= dt;
    const ready = this._acq <= 0 && aimed.onTarget && Math.abs(pitchDelta)<.25;
    out.ready=ready;
    const lowHp = b.hp < b.maxHp * 0.32;
    out.fly = (dh > 6 && this.flyTend > 0.25) || (this.flyTend > 0.6 && ty > 4 && dh > -6);

    // movement — hold preferred range + strafe
    this.think -= dt; if (this.think <= 0) { this.think = rand(0.6, 1.5); this.strafe = chance(0.5) ? 1 : -1; }
    let mx = 0, mz = 0;
    // ⚠ MOOD SHIFTS WHAT THE BOT WANTS, applied here where the preferred range and aggression are
    // decided — never to its reflexes, its aim or its knowledge. An angry fighter closes; a
    // frightened one backs off; neither gains an ability or bends the physics. The fairness law
    // holds: difficulty buys judgement, and now emotion buys INTENT, but never certainty.
    const ag = Math.max(0, Math.min(1.2, this.aggro + (this.aggroBias || 0)));
    let pref = this.range * (lowHp ? 1.5 : 1) + (this.rangeBias || 0);
    pref = Math.max(6, pref);
    if (ag > 0.85 && !lowHp) pref *= 0.8;
    if (real._wounds && real._wounds.leg > 0) pref *= 0.75;   // a visible LIMP invites pressure — sight-gated (we are in the sees branch; manual §18)
    // ⚠ THE DEADBAND HAS TO SCALE WITH THE RANGE, and a flat ±8 is why a melee bot never arrives.
    // A beamer holding 40u wants a generous band; a boxer holding 7u does NOT, because ±8 is wider
    // than the entire useful distance — it stops approaching at 15u, strafes there forever, and
    // never throws a punch. Measured before this: two fists-only fighters spent 25 seconds circling
    // at 11.1u and landed ZERO strikes. This is not a boxing bug, it is every close-range doctrine
    // in the game: `bruiser` (18) idles out to 26u, well past the 11u jab.
    const band = Math.max(2.5, pref * 0.35);
    if (d > pref + band) { mx = dx / d; mz = dz / d; } else if (d < pref - band) { mx = -dx / d; mz = -dz / d; }
    let sa = 0.4 + ag * 0.3;
    if (this.erratic) sa *= 2.2;                      // panic: the strafe stops being a plan
    mx += (-dz / d) * this.strafe * sa; mz += (dx / d) * this.strafe * sa;
    out.move = { x: mx, z: mz };
    // opener: full commit straight at the foe under throttle; arriving overhead = drop into a dive punch
    if (this._opener > 0) {
      this._opener -= dt;
      if (d < 13) this._opener = 0;                          // arrived — the melee layer throws the punch
      else out.move = { x: dx / d, z: dz / d };              // the run-up IS the attack
      out.fly = d > 24 || dh > -6;                           // close + above the foe = descend onto them
    }

    // --- abilities (only when the target is actually in view) ---
    const hadAction=!!this.action;
    if (this.action) {
      this.action.t -= dt; const k = this.action.key;
      if (b.slots[k] && slotUnlocked(b,k) && this.action.t > 0) out.slots[k].held = true;
      else { if (b.slots[k]) out.slots[k].released = true; this.action = null; }
    }
    if(ready)for(const [key,st] of Object.entries(b.slots)){
      if(remoteInRange(b,st,real)){
        out.slots[key]={pressed:true,held:false,released:false};
        if(this.action?.key===key)this.action=null;
        this.gcd=Math.max(this.gcd,.35);
        return out; // a second press through runSlot, never direct damage or a new launch
      }
    }
    if(hadAction)return out;
    if (lowHp || b.powerUp?.def.timeField && d <= b.powerUp.def.timeField.radius*.85) {
      const form=b.powerUp;
      if(form&&form.cd<=0&&form.activeT<=0&&b.ki>=(form.def.cost||0)&&slotUnlocked(b,form.sourceSlot||'_powerUp')){
        out.movementGear=2;this.gcd=1;return out;
      }
      const buff = (this.byType.buff || []).find(k => slotUnlocked(b,k) && b.slots[k].cd <= 0 && b.ki >= (b.slots[k].def.cost || 0));
      if (buff && chance(0.5)) { out.slots[buff].pressed = true; this.gcd = 1; return out; }
    }
    this.gcd -= dt;
    if (this.gcd <= 0 && ready) {   // not aimed / not yet registered = not shooting
      this.gcd = rand(0.55, 1.15) / this.level;
      const key = this.pick(d, dh, lowHp, real);
      if (key) {
        const type = b.slots[key].def.type;
        if (HOLD.has(type)) { this.action = { key, t: holdTime(type) }; out.slots[key].pressed = true; out.slots[key].held = true; }
        else out.slots[key].pressed = true;
      }
    }
    return out;
  }

  // Where a blind bot walks. Priority: a lead it believes → the place the lead ran out →
  // a patrol sweep of the district. It NEVER consults the target's real position.
  _searchGoal(game, dt) {
    const b = this.bot;
    this._searchT += dt;
    if (this.belief && this._mem > 0) {
      const d = Math.hypot(this.belief.x - b.pos.x, this.belief.z - b.pos.z);
      if (d > 7) return this.belief;                       // still heading to the lead
      this._mem = 0;                                       // arrived and nobody's here — the trail is cold
      this._searchT = 0; this._patrol = null;
    }
    // cold: sweep outward from the last lead (people move), else patrol the map
    const A = (game.world && (game.world.combatRadius || game.world.ARENA)) || 240;
    if (!this._patrol || this._patrolT <= 0 || Math.hypot(this._patrol.x - b.pos.x, this._patrol.z - b.pos.z) < 12) {
      this._patrolT = rand(3.5, 7);
      const from = this.belief || b.pos;
      const spread = this.belief && this._searchT < 9 ? 55 : A * 0.7;   // search near the trail first, then wander
      const a = rand(0, Math.PI * 2), r = rand(spread * 0.35, spread);
      const wx = Math.max(-A + 20, Math.min(A - 20, from.x + Math.cos(a) * r));
      const wz = Math.max(-A + 20, Math.min(A - 20, from.z + Math.sin(a) * r));
      this._patrol = { x: wx, z: wz, y: 0 };
    }
    this._patrolT -= dt;
    return this._patrol;
  }
  // Squad radio: a bot that SEES the foe calls the position to living allies in earshot.
  // Fair (it's earned by one pair of eyes) and it makes 2v2 / police responses read as a unit.
  _callOut(game, foe) {
    // ⚠ THE JAMMER HAS TO BE READ SOMEWHERE OR IT IS A PARTICLE EFFECT. It cuts SQUAD RADIO only:
    // a jammed bot still sees perfectly with its own eyes, it just stops being told what everyone
    // else can see. That is a real tactical effect that never makes anyone blind or stupid.
    if (this._jammedT > 0) return;
    this._radioT = (this._radioT || 0) - 1;
    if (this._radioT > 0) return;
    this._radioT = 30;                                     // ~every half second of frames
    const b = this.bot;
    for (const e of game.entities) {
      if (e === b || !e.alive || !e.ai || e.team !== b.team) continue;
      if (Math.hypot(e.pos.x - b.pos.x, e.pos.z - b.pos.z) > 160) continue;
      e.ai.radio(foe.pos.x, foe.pos.z, foe.pos.y);
    }
  }

  pick(d, dh, lowHp, tgt) {
    const b = this.bot, T = this.byType;
    // PURE BOXING: the slots are gated at `runSlot`, so without this the bot would spend the whole
    // fight pressing dead buttons and standing still instead of throwing hands. Returning null here
    // drops it straight to the melee layer, which is the correct doctrine for a boxer anyway.
    if (b.noPowers) return null;
    const ok = (k) => slotUnlocked(b,k) && !remoteAttack(b,b.slots[k]) && b.slots[k].cd <= 0 && b.ki >= (b.slots[k].def.cost || 0);
    const one = (arr) => { const e = (arr || []).filter(ok); return e.length ? pick(e) : null; };
    const close = d < 14, far = d >= 44;

    if (lowHp) {
      if (T.phase && chance(0.5)) return one(T.phase);
      if (T.teleport && chance(0.45)) return one(T.teleport);
    }
    // A RAISED GUARD IS A WALL: rushes and melee abilities bounce off it now, so don't feed them.
    // Reposition or throw something instead; the close-quarters mixup (controlBot) does the grabbing.
    if (tgt && tgt.guarding && (tgt._guardUpT ?? 0) > 0.3 && d < 16) {
      return one(T.teleport) || one(T.dash) || one(T.projectile) || one(T.volley) || null;
    }
    if (b.slots.r && ok('r') && chance(0.14)) {                 // occasional ultimate — but never a WASTED one
      const rd = b.slots.r.def, rt = rd.type;
      const waste = (rt === 'nova' && (d > 34 || b.ki < b.maxKi * 0.5))          // a supernova wants a close foe and a fed tank
        || (rt === 'mindcontrol' && d > (rd.range || 42));                        // a mind out of reach can't be seized
      if (!waste) return 'r';
    }

    switch (this.style) {
      case 'rusher':
        if (far) return one(T.dash) || one(T.teleport) || one(T.projectile) || one(T.beam);
        if (close) return one(T.rush) || one(T.melee) || one(T.projectile);
        return one(T.rush) || one(T.projectile) || one(T.dash) || one(T.beam);
      case 'beamer':
        if (close) return one(T.melee) || one(T.cone) || one(T.beam);
        return one(T.beam) || one(T.rifle) || one(T.projectile) || one(T.volley);
      case 'artillery':
        if (T.quiver && chance(0.1)) { const q = one(T.quiver); if (q) return q; }   // archers rotate broadheads
        if (far) return one(T.meteor) || one(T.bow) || one(T.charge) || one(T.projectile) || one(T.beam);
        if (close) return one(T.cone) || one(T.dash) || one(T.melee);
        return one(T.bow) || one(T.charge) || one(T.projectile) || one(T.beam) || one(T.volley);
      case 'zoner':
        if (chance(0.4)) { const c = one(T.construct) || one(T.summon) || one(T.mine); if (c) return c; }
        if (close) return one(T.cone) || one(T.melee) || one(T.dash);
        return one(T.beam) || one(T.rifle) || one(T.projectile) || one(T.volley) || one(T.construct) || one(T.mine);
      case 'summoner':
        if (chance(0.5)) { const s = one(T.summon) || one(T.construct); if (s) return s; }
        if (close) return one(T.cone) || one(T.dash);
        return one(T.projectile) || one(T.summon);
      case 'grappler':
        if (far) return one(T.teleport) || one(T.dash) || one(T.projectile) || one(T.beam);
        if (close) return one(T.lifedrain) || one(T.tentacle) || one(T.melee) || one(T.rush);   // grabs handled by controlBot melee layer
        if (T.tentacle && d < 32 && chance(0.5)) { const t = one(T.tentacle); if (t) return t; }
        return one(T.projectile) || one(T.dash) || one(T.beam);
      case 'trickster':
        if (lowHp && T.phase) return one(T.phase);
        if (T.portal && chance(0.12)) { const p = one(T.portal); if (p) return p; }   // RIFT scatters doors
        if (close) return one(T.rush) || one(T.melee) || one(T.teleport);
        if (far) return one(T.beam) || one(T.projectile) || one(T.charge);
        return one(T.beam) || one(T.projectile) || one(T.teleport);
      case 'bruiser':
      default:
        if (close) return one(T.melee) || one(T.rush) || one(T.cone);
        if (far) return one(T.charge) || one(T.beam) || one(T.projectile) || one(T.dash);
        return one(T.projectile) || one(T.charge) || one(T.beam) || one(T.melee);
    }
  }
}
