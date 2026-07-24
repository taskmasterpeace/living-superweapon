// WAR WORLD: ASCENDANTS — DOM HUD + character-select screen.
import { ROSTER, SLOT_ORDER } from '../data/characters.js';
import { CSS, CODEX_MOBILE, PHONE_CSS } from './hud.styles.js';
import { DTYPES, DTYPE_INFO, resistOf, bandOf } from './entity.js';
import { glyph, padActive, padFaces } from '../core/glyphs.js';
import { MODES } from '../data/modes.js';
import { clamp, TAU } from '../core/util.js';
import { ATTR_DEFS, TALENTS, deriveAttrs, heroTalents, rankName, rankColor, RANKS, bakeSheet } from '../data/ranks.js';
import { SETTINGS, saveSettings, applySettings, KEYMAPS, keymap } from '../core/settings.js';
import { identityOf } from '../data/identities.js';
import { icon, ATTR_ICON, ICON_MEANING } from './icons.js';
import { writeBroadcast, tapeRows, llmPunchUp, titleCase, money, causeLine, mulberry } from '../data/news.js';
import { recOf, snapshotTable, rankingTable, recentIncidents, championId, tournamentNo } from '../data/rankings.js';
import { cityList } from '../data/cities.js';
import { generatePlan, thresholdPlan, galleryPlan, TILE_INFO, VARIANTS, popLabel, CELL, CELL_RANGE, POP_TYPES, TILE_FOOT, TILE_SIZES, NO_RESCUE, applyPlanEdits, regionOf, ROAD, validatePlan } from '../data/cityplan.js';
import { mountAtlas } from './atlasUI.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---- THRESHOLD REGISTRY paperwork: file numbers, country codes, deterministic file dates ----
function flagCC(flag) {
  const cps = [...String(flag || '')].map((c) => c.codePointAt(0)).filter((c) => c >= 0x1F1E6 && c <= 0x1F1FF);
  return cps.length >= 2 ? String.fromCharCode(65 + cps[0] - 0x1F1E6, 65 + cps[1] - 0x1F1E6) : 'XX';
}
function fileNoOf(c, roster) {
  const i = roster.indexOf(c);
  return `LSW-${String((i < 0 ? 98 : i) + 1).padStart(3, '0')}-${c.isCustom ? 'CX' : flagCC(identityOf(c).f)}`;
}
function fileDate(id) {
  let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `${2019 + h % 7}-${String(1 + (h >> 3) % 12).padStart(2, '0')}-${String(1 + (h >> 7) % 28).padStart(2, '0')}`;
}
function agoStr(t) {
  const s = (Date.now() - t) / 1000;
  if (s < 90) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}
const isSynthDef = (c) => /unit|lab-grown|synthezoid|war engine|synthetic/i.test((identityOf(c).n || ''));

// (KEYMAPS live in core/settings.js so game.js can read them without importing the HUD)

// ---- THE CODEX: case-file generators — every line derived from the REAL kit data ----
function cfAbilityRows(def) {
  return SLOT_ORDER.filter(s => def.abilities[s.k]).map(s => {
    const a = def.abilities[s.k];
    const dmg = a.dmgMax ? `${a.dmgMin ?? '?'}–${a.dmgMax}` :
      a.hits ? `${a.damage}×${a.hits}${a.finisher ? '+' + a.finisher : ''}` :
      a.damage ? String(a.damage) : a.dps ? `${a.dps}/s` : a.heal ? `+${a.heal}hp` : a.mult ? `×${a.mult}` : '—';
    const cost = a.cost ? `${a.cost}` : a.kiPerSec ? `${a.kiPerSec}/s` : '0';
    const cd = a.cd ? `${a.cd}s` : a.interval ? `${(1 / a.interval).toFixed(0)}rps` : '—';
    const reach = a.maxLen ? `${a.maxLen}u` : a.range ? `${a.range}u` : a.speed ? `v${Math.round(a.speed)}` : a.radius && a.type === 'cone' ? '—' : a.blast ? `r${a.blast}` : '—';
    const notes = [];
    if (a.charge || a.maxCharge) notes.push('CHARGE-SCALED');
    if (a.homing) notes.push('HOMING');
    if (a.cold) notes.push('FREEZE BUILDUP');
    if (a.payloads) notes.push('PAYLOADS: ' + a.payloads.join('/').toUpperCase());
    if (a.shock) notes.push('GROUND SHOCK');
    if (a.invuln) notes.push('I-FRAMES');
    if (a.spendAll) notes.push('SPENDS ALL KI');
    if (a.steer) notes.push('STEERABLE');
    if (a.construct) notes.push('CONSTRUCT: ' + a.construct.toUpperCase());
    if (a.boomerang) notes.push('RETURNS');
    if (a.type === 'nova') notes.push(`FEEDS THE WHOLE TANK · r ${a.minRadius || 16}→${a.maxRadius || 44}u · CASTER LEFT DRY`);
    if (a.type === 'mindcontrol') notes.push(`DOMINATES ${a.dur || 6}s — MINDS ONLY, NEVER BADGES`);
    return { slot: s.label, name: a.name, kind: a.type.toUpperCase(), dmg, cost, cd, reach, notes: notes.join(' · '), ult: s.k === 'r' };
  });
}
// countermeasure doctrine — what the Treaty would actually brief a responder
function cfCounterNotes(def) {
  const N = [];
  const A = Object.values(def.abilities || {});
  if (def.guardType === 'barrier') N.push(['GUARD', 'Barrier covers 360° but BURNS ki (16/s) — starve the tank, then commit. It breaks at zero.']);
  else if (def.guardType === 'deflect') N.push(['GUARD', 'Deflect guard RETURNS projectiles and arrows to the shooter. Close to fists, or open with an unblockable grab.']);
  else N.push(['GUARD', 'Standard guard: a held HAYMAKER crushes it (0.85s stagger, meter −0.55). Jabs into a block are punishable.']);
  if (def.teleEscape) N.push(['GRABS', 'FRONT grabs get teleported out of (20 ki). Take the back — back-grabs are unescapable on anyone.']);
  if (def.thorns) N.push(['GRABS', 'Subject is thorned — grab attempts are punished on contact. Strike, do not latch.']);
  if (def.grabHeal) N.push(['GRABS', 'Subject HEALS off its own grabs. Do not trade at grapple range.']);
  if (def.phase) N.push(['PHASE', 'Can run intangible on held ki. Wait out the drain; unblockable and true damage still connect.']);
  if ((def.overdrive ?? 1) >= 1) N.push(['ENERGY', 'OVERDRIVE: an empty tank makes their fists batteries. A drained subject at melee range is NOT disarmed.']);
  if (def.energyInfinite) N.push(['ENERGY', 'Core never drains and never fizzles — but the platform is TIER-CAPPED at II. Outscale it in long engagements.']);
  if (def.frostResist) N.push(['COLD', 'Frost buildup halved. Freeze doctrine is poor value against this subject.']);
  if ((def.beamMight || 1) >= 1.2) N.push(['BEAMS', 'Certified Beam Master — do not accept a beam clash below 60% ki; the struggle point WILL walk to you.']);
  if ((def.flightTier ?? 3) === 0) N.push(['AIR', 'Subject is GROUNDED (leap only). Take altitude and shell — they cannot follow.']);
  else if ((def.flightTier ?? 3) === 1) N.push(['AIR', 'Clumsy flier: sags without thrust, no stable hover. Pressure them off the deck.']);
  if ((def.strength ?? 5) >= 7) N.push(['FRAME', `STR ${def.strength}: knockback plans fail, beam-shove is halved, ice shatters early, slams land like demolition.`]);
  if (A.some(a => a.type === 'mine')) N.push(['GROUND', 'Plants proximity mines (≤3 live). Sweep your approach lanes with ranged fire.']);
  if (A.some(a => a.type === 'portal')) N.push(['SPACE', 'Deploys paired doors — projectiles travel through them too. Do not trust sightlines near an open ring.']);
  if (def.tentacles) N.push(['REACH', 'Tentacle seizure drags to the nearest wall for slam damage. Break line or stay past reach.']);
  const style = def.ai && def.ai.style;
  const STYLE_NOTE = {
    rusher: 'Closes distance relentlessly — keep a wall at YOUR back, never theirs.',
    beamer: 'Sustained pressure at range — approach on the diagonal between beam windows.',
    artillery: 'Shells from distance and altitude — the shadow of the shot is your timer.',
    zoner: 'Controls ground with placed effects — the space they give you is the trap.',
    bruiser: 'Mid-range trades — do not stand in their preferred band (~' + ((def.ai && def.ai.range) || 30) + 'u).',
    trickster: 'Teleports behind committed attacks — hold your evade until AFTER the blink.',
    grappler: 'Every approach is a grab setup — strike beats grab; interrupt the startup.',
    summoner: 'Kills the summons first or fights two armies — your call, make it early.',
  };
  if (style && STYLE_NOTE[style]) N.push(['DOCTRINE', STYLE_NOTE[style]]);
  return N.slice(0, 7);
}
const CF_BUILD = ['—', 'FRAIL', 'LIGHT', 'LIGHT', 'STANDARD', 'STANDARD', 'CONDITIONED', 'POWERFUL', 'HEAVY', 'SUPERHEAVY', 'IRRESISTIBLE'];

// (stylesheet lives in hud.styles.js — extracted 2026-07-24)


// Derive a 0–10 stat profile + trait tags from a character's raw data.
export function heroStats(d) {
  const A = Object.values(d.abilities || {});
  const maxOf = (fn) => A.reduce((m, a) => Math.max(m, fn(a) || 0), 0);
  const maxDmg = maxOf(a => a.dmgMax || a.damage || a.finisher || (a.dps ? a.dps * 0.5 : 0));
  const maxRange = maxOf(a => a.maxLen || (a.speed ? a.speed * 0.4 : 0) || a.range);
  const hasBlink = A.some(a => a.type === 'teleport') || d.teleEscape;
  const hasDash = A.some(a => a.type === 'dash');
  const n = (v, mx) => Math.max(1, Math.min(10, Math.round(v / mx * 10)));
  const tags = [];
  if (d.beamMight >= 1.2) tags.push('Beam Master');
  if (A.some(a => a.type === 'construct')) tags.push('Constructs');
  if (A.some(a => a.type === 'summon')) tags.push('Summoner');
  if (A.some(a => a.type === 'meteor')) tags.push('Artillery');
  if (A.some(a => a.type === 'charge')) tags.push('Charge');
  if (A.some(a => a.type === 'nova')) tags.push('Supernova');
  if (A.some(a => a.type === 'mindcontrol')) tags.push('Dominator');
  if (d.thorns) tags.push('Thorns');
  if (d.phase) tags.push('Phase');
  if (d.grabHeal) tags.push('Absorb');
  if (d.tentacles) tags.push('Tentacles');
  if (A.some(a => a.type === 'portal')) tags.push('Portals');
  if (A.some(a => a.type === 'rifle')) tags.push('Gunner');
  if (d.metal) tags.push('Armored');
  if (d.guardStrong) tags.push('Shield');
  if (d.energyInfinite) tags.push('∞ Core');
  if (d.flightTier === 0) tags.push('Grounded');
  else if (d.flightTier === 1) tags.push('Clumsy Flier');
  else if (d.flightTier === 2) tags.push('Levitator');
  if (d.flyStyle === 'ice') tags.push('Rider');
  if (d.flyStyle === 'fire') tags.push('Fire Wake');
  if ((d.items || []).length) tags.push('Gadgeteer');
  if (hasBlink) tags.push('Blink');
  if (A.some(a => a.fly) || d.speed >= 40) tags.push('Aerial');
  return {
    power: n(maxDmg, 90), range: n(maxRange, 170),
    mobility: Math.min(10, Math.round(d.speed / 45 * 6) + (hasBlink ? 3 : 0) + (hasDash ? 1 : 0)),
    defense: Math.min(10, Math.round(d.hp / 150 * 7) + (d.phase ? 2 : 0) + (d.thorns ? 1 : 0)),
    health: n(d.hp, 150), energy: n(d.ki, 130), speed: n(d.speed, 45),
    strength: d.strength ?? 5,
    tags: tags.slice(0, 7),
  };
}

// LeFevre Threat Level scale (Threshold Treaty)
export const THREAT_COLORS = { 'Low': 'var(--good)', 'Moderate': 'var(--gold)', 'High': '#ff9a3a', 'Very High': 'var(--danger)', 'Extreme': '#ff2f2f' };

// "What am I getting into?" — a mechanical AT-A-GLANCE derived from the ACTUAL kit, so it can
// never drift from the data. Returns [iconName, text, lead?] chips.
// RECOVERY on the LeFevre pattern — a tiered WORD, never a number (Robert 2026-07-24: "I don't
// want numbers cause it's hard to see how that relates to other things"). Derived from the live
// sheet multiplier, so it can never drift from what the engine actually regenerates.
export function recoveryTier(def) {
  if (def.energyInfinite) return '∞ CORE';
  const m = (bakeSheet(def).kiRegenMult) || 1;
  return m < 0.9 ? 'SLOW' : m < 1.05 ? 'STANDARD' : m < 1.25 ? 'QUICK' : m < 1.5 ? 'RAPID' : 'PRODIGIOUS';
}

export function kitFacts(def) {
  const A = Object.values(def.abilities || {});
  const st = heroStats(def);
  const has = (t) => A.some(a => a.type === t);
  const STYLE = {
    rusher: ['mobility', 'RUSHDOWN — closes fast, fights in your face'],
    beamer: ['energy', 'BEAM PRESSURE — sustained energy at range'],
    artillery: ['power', 'ARTILLERY — big shells from a distance'],
    zoner: ['range', 'ZONER — controls space, punishes approach'],
    bruiser: ['strength', 'BRUISER — mid-range brawling'],
    trickster: ['mobility', 'TRICKSTER — teleports & mixups'],
    grappler: ['might', 'GRAPPLER — seizes you and slams you'],
    summoner: ['person', 'COMMANDER — minions do the fighting'],
  };
  const out = [];
  const s = STYLE[def.ai && def.ai.style] || ['strength', 'BRAWLER'];
  out.push([s[0], s[1], true]);
  out.push(['range', st.range >= 7 ? 'LONG range' : st.range >= 4 ? 'MID range' : 'CLOSE range']);
  const str = def.strength ?? 5;
  out.push(['fighting', str >= 7 ? 'HEAVY fists' : str >= 4 ? 'solid fists' : 'light fists']);
  const ft = def.flightTier ?? 3;
  out.push(['flight', ft === 0 ? 'grounded' : ft === 1 ? 'clumsy flier' : ft === 2 ? 'levitates' : 'full flight']);
  out.push(['energy', recoveryTier(def) + ' recovery']);
  if (def.guardType === 'deflect') out.push(['defense', 'DEFLECT guard — bullets bounce back']);
  else if (def.guardType === 'barrier') out.push(['defense', 'BARRIER guard — blocks 360°, costs ki']);
  // what they actually carry
  const nBeams = A.filter(a => a.type === 'beam').length;
  if (nBeams) out.push(['energy', nBeams > 1 ? nBeams + ' beams' : 'a beam']);
  if (has('rifle')) out.push(['range', 'guns']);
  if (has('bow')) out.push(['range', 'a payload bow']);
  if (has('charge')) out.push(['power', 'a charge bomb — hold to grow it']);
  if (has('growingorb')) out.push(['power', 'a giant channeled orb']);
  if (has('meteor')) out.push(['power', 'an airstrike ult']);
  if (has('summon')) out.push(['person', 'summons']);
  if (has('construct')) out.push(['might', 'solid-light constructs']);
  if (has('tentacle')) out.push(['might', 'a grab-chain — drag & slam']);
  if (has('portal')) out.push(['mobility', 'portals']);
  if (A.some(a => a.type === 'cone' && a.cold)) out.push(['defense', 'a FREEZE cone']);
  else if (has('cone')) out.push(['strength', 'a force cone']);
  if (has('mine')) out.push(['threat', 'proximity mines']);
  if (has('lifedrain')) out.push(['health', 'a life siphon']);
  if (has('rush')) out.push(['fighting', 'a multi-hit rush']);
  if (has('teleport')) out.push(['mobility', 'a teleport']);
  if (has('phase')) out.push(['defense', 'intangibility']);
  if (has('facebomb')) out.push(['threat', 'a homing seeker bomb']);
  if (has('nova')) out.push(['energy', 'a SUPERNOVA — the whole tank, one blast']);
  if (has('mindcontrol')) out.push(['intellect', 'a mind leash — one foe fights for them']);
  if ((def.items || []).length) out.push(['intellect', 'gadgets: ' + def.items.map(i => i.name).join(', ')]);
  return out;
}

function describeEvade(ev) {
  switch (ev.kind) {
    case 'blink': return 'short teleport in the tapped direction (i-frames)';
    case 'sprint': return 'speed surge for ~' + (ev.dur || 1.5) + 's';
    case 'slide': return 'long frictionless slide (i-frames)';
    case 'phase': return 'slip through attacks while dashing (long i-frames)';
    case 'leap': return 'huge parabolic jump — clears buildings';
    default: return 'burst dash with i-frames';
  }
}

function describeAbility(a) {
  if (a.type === 'grapple') return `Grapnel line — reel to rooftops or ledge-hang (${a.range || 95}u)`;
  switch (a.type) {
    case 'beam': return (a.charge ? 'Chargeable ' : '') + 'steerable energy beam' + (a.radius > 2 ? ' (wide)' : ' (thin)');
    case 'projectile': return (a.homing ? 'Homing ' : '') + (a.grav ? 'lobbed ' : '') + 'blast' + (a.shock ? ', cracks the ground' : '');
    case 'volley': return 'rapid alternating-hand blast volley';
    case 'cone': return a.cold ? 'wide freezing breath — slows on hit' : 'wide force cone — knockback';
    case 'charge': return 'hold to charge a size-scaling blast + ground shockwave';
    case 'growingorb': return 'channel a giant orb overhead, then hurl it';
    case 'melee': return (a.fly ? 'flying ' : '') + 'melee strike that launches';
    case 'rush': return 'teleporting multi-hit rush combo';
    case 'teleport': return 'blink to your aim (breaks grabs)';
    case 'dash': return 'quick i-frame dash';
    case 'summon': return 'summon seeker drones that fight for you';
    case 'construct': return 'cursor-steered ' + (a.construct || 'solid-light') + ' construct';
    case 'buff': return 'power-up' + (a.invuln ? ' + invincibility' : '') + (a.heal ? ' + heal' : '') + (a.spendAll ? ' (spends all ki)' : '');
    case 'meteor': return 'call down a meteor storm at your aim';
    case 'phase': return 'hold to go intangible — spends energy';
    case 'tentacle': return 'tentacles seize a foe, drag them in, and SLAM them into the nearest wall';
    case 'portal': return 'place a door, then its exit — anything that touches one comes out the other';
    case 'rifle': return (a.interval > 0.2 ? 'heavy sidearm — hard-hitting shots' : 'full-auto tracer fire') + ' (ammo = ki)';
    case 'bow': return 'hold to draw — arrow speed & damage scale; payload from your quiver';
    case 'facebomb': return 'charge her up — she drifts to the target, lingers a heartbeat, then DETONATES';
    case 'mine': return 'plant proximity mines at your aim (up to 3) — they arm, blink, and erase';
    case 'lifedrain': return 'hold to siphon — their health flows into yours';
    case 'quiver': return 'switch broadheads: ' + (a.payloads || ['explosive', 'flame', 'poison']).join(' / ');
    case 'nova': return 'hold to feed your WHOLE ki tank in — one omnidirectional detonation, then you are empty';
    case 'mindcontrol': return 'seize a lesser mind — it fights for you until the leash snaps';
    default: return a.type;
  }
}

// The edit layer lives in the PLANNER now (it has to re-derive sockets and the road graph after a
// paint). Re-exported here because the atlas and everything that resolves a theater import it from
// the HUD — one code path, no drift.
export { applyPlanEdits } from '../data/cityplan.js';

export class HUD {
  constructor(game) {
    this.game = game;
    // THE CODEX ON A PHONE (Robert 2026-07-24: "cluttered as a motherfucker, the mobile is
    // horrible"). Below 640px the case-file rows stack label-over-value instead of fighting for
    // a 148px label column, the armament table scrolls sideways instead of clipping, and the
    // pager/close controls grow to thumb size. Steam Deck (1280×800) uses the desktop layout.
    
    const s = document.createElement('style'); s.textContent = CSS + CODEX_MOBILE + PHONE_CSS; document.head.appendChild(s);
    this.root = document.getElementById('hud');
    this.title = document.getElementById('title');
    this.feedLines = [];
    this._build();
  }

  _build() {
    this.root.innerHTML = `
    <div class="wrap">
      <div class="vignette"></div>
      <div class="panel feed" id="hFeed"></div>
      <div class="panel foe" id="hFoe" style="display:none">
        <div class="fn" id="foeName">RIVAL</div>
        <div class="bar"><i class="fhpF" id="foeHp" style="width:100%"></i></div>
      </div>
      <div class="panel pl">
        <div class="nm" id="plName">—</div>
        <div class="wantedrow" id="plWanted" style="display:none"></div>
        <div class="rl" id="plRole">—</div>
        <div class="lab">HEALTH</div><div class="bar"><i class="hpF" id="plHp"></i></div>
        <div class="lab">KI / ENERGY<span class="kistate" id="kiState">DRAINED</span><span class="kiover" id="kiOver">⚡ OVERDRIVE — FISTS REFILL</span></div><div class="bar" id="kiBar"><i class="kiF" id="plKi"></i></div>
        <div class="lab">GUARD</div><div class="bar gd"><i class="gdF" id="plGd"></i></div>
        <div class="xpwrap"><span class="lvl" id="plLvl">1</span><span class="tierb" id="plTier">TIER I</span><span class="xp"><i id="plXp" style="width:0%"></i></span></div>
      </div>
      <div class="panel modebar" id="hMode" style="display:none"></div>
      <div class="announce" id="hAnn"><div class="at" id="hAnnT"></div><div class="as" id="hAnnS"></div></div>
      <div class="panel kit" id="hKit" style="display:none"><div class="kh" id="hKitH">KIT</div><div class="chips" id="hKitChips"></div></div>
      <div class="endscr" id="hEnd"></div>
      <div class="panel charge" id="hCharge"><i style="width:0%"></i></div>
      <div class="combo" id="hCombo"><div class="n" id="hComboN">0</div><div class="l">Hits</div></div>
      <div class="dmgwrap" id="hDmg"></div>
      <div class="panel slots" id="hSlots"></div>
      <div class="foearrow" id="hFoeArrow"><i></i><u></u><span></span></div>
      <div class="rotate" id="hRotate"><div><div class="ri riphone"></div><div style="font-size:18px;font-weight:800;letter-spacing:.1em;color:var(--gold)">ROTATE YOUR DEVICE</div><div style="font-size:13px;color:var(--text-3);margin-top:6px">The arena plays in landscape.</div></div></div>
      <div class="panel hint" id="hHint">
        <div class="hintchip">❓ <b>F1</b> CONTROLS</div>
        <div class="hintbody" id="hHintBody"></div>
      </div>
      <div class="panel tut" id="hTut" style="display:none">
        <span class="tskip" id="hTutSkip">skip ✕</span>
        <div class="tact" id="hTutAct"></div>
        <div class="tstep" id="hTutStep"></div>
        <div class="tobj" id="hTutObj"></div>
        <div class="tdist" id="hTutDist"></div>
        <div><span class="tkeys" id="hTutKeys"></span></div>
        <div class="ttip" id="hTutTip"></div>
        <div class="tdots" id="hTutDots"></div>
      </div>
      <div class="paused" id="hPaused"><div class="pwrap">
        <div class="t">PAUSED</div>
        <button data-p="resume">▶ Resume</button>
        <button data-p="options" class="ghost">⚙ Options</button>
        <button data-p="howto" class="ghost">❓ How to Play</button>
        <button data-p="menu" class="ghost">Main Menu</button>
        <button data-p="quit" class="ghost" id="pQuit" style="display:none">⏻ Quit Game</button>
      </div></div>
      <div class="hitflash" id="hFlash"></div>
      <div class="danger" id="hDanger"></div>
      <div class="hitring" id="hHits"></div>
      <div class="panel radar" id="hRadar"><div class="rlab">Radar</div><canvas id="hRadarC" width="152" height="152"></canvas></div>
      <div class="panel pip" id="hPip" style="display:none"><div class="pipcap"><span class="pipdot"></span><span>ON AIR — KMK 9</span></div></div>
      <div class="cityplate" id="hCity" style="display:none"></div>
      <div class="simfx"><div class="simgrid"></div><div class="simscan"></div><div class="simsweep"></div>
        <span class="simc c1"></span><span class="simc c2"></span><span class="simc c3"></span><span class="simc c4"></span>
        <div class="simtag"><i></i>THRESHOLD SIMULATION — DANGER ROOM · SUBJECT IS LIVE, ALL ELSE PROJECTED</div></div>
      <div class="telem" id="hTelem"></div>
      <div class="panel alt" id="hAlt" style="display:none">
        <div class="aval" id="hAltV">0m</div>
        <div class="arung" data-b="0"><b>GND</b></div>
        <div class="arung" data-b="1"><b>BLD</b></div>
        <div class="arung" data-b="2"><b>SKY</b></div>
        <div class="arung" data-b="3"><b>CLD</b></div>
        <div class="alab">ALT</div>
      </div>
      <div class="kobanner" id="hKO"><div class="kob" id="hKOt">K.O.</div><div class="kos" id="hKOs"></div></div>
    </div>`;
    this.el = {
      feed: this.root.querySelector('#hFeed'),
      foe: this.root.querySelector('#hFoe'), foeName: this.root.querySelector('#foeName'), foeHp: this.root.querySelector('#foeHp'),
      name: this.root.querySelector('#plName'), role: this.root.querySelector('#plRole'),
      hp: this.root.querySelector('#plHp'), ki: this.root.querySelector('#plKi'), gd: this.root.querySelector('#plGd'),
      kiBar: this.root.querySelector('#kiBar'), kiState: this.root.querySelector('#kiState'), kiOver: this.root.querySelector('#kiOver'),
      charge: this.root.querySelector('#hCharge'), chargeI: this.root.querySelector('#hCharge > i'),
      slots: this.root.querySelector('#hSlots'),
      combo: this.root.querySelector('#hCombo'), comboN: this.root.querySelector('#hComboN'),
      dmg: this.root.querySelector('#hDmg'), paused: this.root.querySelector('#hPaused'),
      flash: this.root.querySelector('#hFlash'),
      lvl: this.root.querySelector('#plLvl'), xp: this.root.querySelector('#plXp'), tier: this.root.querySelector('#plTier'),
      plPanel: this.root.querySelector('.pl'),
      mode: this.root.querySelector('#hMode'), ann: this.root.querySelector('#hAnn'), annT: this.root.querySelector('#hAnnT'), annS: this.root.querySelector('#hAnnS'),
      kit: this.root.querySelector('#hKit'), kitChips: this.root.querySelector('#hKitChips'), end: this.root.querySelector('#hEnd'),
      radar: this.root.querySelector('#hRadar'), radarC: this.root.querySelector('#hRadarC'),
      pip: this.root.querySelector('#hPip'),
      city: this.root.querySelector('#hCity'), telem: this.root.querySelector('#hTelem'),
      alt: this.root.querySelector('#hAlt'), altV: this.root.querySelector('#hAltV'),
      altRungs: [...this.root.querySelectorAll('#hAlt .arung')],
      wanted: this.root.querySelector('#plWanted'),
      hits: this.root.querySelector('#hHits'), danger: this.root.querySelector('#hDanger'),
      ko: this.root.querySelector('#hKO'), koT: this.root.querySelector('#hKOt'), koS: this.root.querySelector('#hKOs'),
      hint: this.root.querySelector('#hHint'), foeArrow: this.root.querySelector('#hFoeArrow'),
      tut: this.root.querySelector('#hTut'), tutStep: this.root.querySelector('#hTutStep'), tutObj: this.root.querySelector('#hTutObj'),
      tutAct: this.root.querySelector('#hTutAct'), tutDist: this.root.querySelector('#hTutDist'),
      tutKeys: this.root.querySelector('#hTutKeys'), tutTip: this.root.querySelector('#hTutTip'), tutDots: this.root.querySelector('#hTutDots'),
    };
    this.root.querySelector('#hTutSkip').onclick = () => { this.hideTutorial(); this.onTutorialSkip && this.onTutorialSkip(); };
    this._radarCtx = this.el.radarC.getContext('2d');
    // pause menu actions
    this.el.paused.querySelectorAll('button').forEach(b => b.onclick = () => {
      const a = b.dataset.p;
      if (a === 'resume') { this.setPaused(false); this.onResume && this.onResume(); }
      else if (a === 'options') this.showOptions();
      else if (a === 'howto') this.showHowto();
      else if (a === 'menu') { this.setPaused(false); this.onMenu && this.onMenu(); }
      // CONTROLLER-ONLY NEEDS A WAY OUT. On a Steam Deck there is no keyboard and no window
      // chrome, so without this the player is trapped in a fullscreen app.
      else if (a === 'quit' && window.LSW_DESKTOP) window.LSW_DESKTOP.quit();
    });
    if (window.LSW_DESKTOP) { const q = this.el.paused.querySelector('#pQuit'); if (q) q.style.display = ''; }
    this._buildOverlays();
    this.buildHintBody();   // the static wall is gone — the grouped panel is the ONLY format
  }

  // ---- options + how-to-play overlays (on <body> so they stack above the title screen) ----
  _buildOverlays() {
    const mk = (id) => { const d = document.createElement('div'); d.id = id; d.className = 'lswovl'; document.body.appendChild(d); return d; };
    this.optionsEl = mk('hOptions'); this.howtoEl = mk('hHowto'); this.onlineEl = mk('hOnline'); this.damageEl = mk('hDamage');
    this.establishEl = document.createElement('div'); this.establishEl.id = 'hEstablish'; this.establishEl.className = 'establish';
    this.establishEl.style.display = 'none'; document.body.appendChild(this.establishEl);
    this.rankingsEl = mk('hRankings'); this.bracketEl = mk('hBracket'); this.atlasEl = null;   // created by mountAtlas on first open
    this.codexEl = mk('hCodex'); this.codexEl.classList.add('codex');
    try { this.theater = JSON.parse(localStorage.getItem('threshold_theater_v1') || 'null') || { flagship: true, seed: 1 }; } catch { this.theater = { flagship: true, seed: 1 }; }
  }

  // ---- THE CITY ATLAS: 1,050 real cities off the world sheet → pick a theater, preview its plan ----
  resolveTheaterPlan() {
    const t = this.theater || { flagship: true };
    if (t.gallery) return galleryPlan();
    if (t.flagship || t.cityId == null) return thresholdPlan();
    const city = cityList()[t.cityId];
    if (!city) return thresholdPlan();
    const plan = generatePlan(city, t.seed || 1, { N: t.N, waterCols: t.waterCols, cell: t.cell, popType: t.popType, humanH: t.humanH || undefined, roomScale: t.roomScale || undefined });
    return applyPlanEdits(plan, t.edits);   // hand-painted cells win over the generator
  }
  // --- THE ATLAS — extracted to engine/atlasUI.js (one module, two mounts: this in-game screen
  // and the standalone atlas.html tool). The hud owns only THEATER persistence and the game-side
  // furniture: hiding the title/root and handing the orbit camera to game.update via game.mapCam.
  showAtlas() {
    if (!this._atlasUI) {
      this._atlasUI = mountAtlas(document.body, {
        world: this.game.world, game: this.game,
        theater: this.theater,
        feed: (m, c) => this.feed(m, c),
        onTheater: (t, label) => {
          this.theater = t;
          try { localStorage.setItem('threshold_theater_v1', JSON.stringify(t)); } catch {}
          const tt = this.title.querySelector('#termTheater'); if (tt) tt.textContent = label;
          this.feed('Theater set — ' + label, '#7fb0d0');
        },
        onProvingGround: () => { this.theater = { gallery: true }; this.onProvingGround && this.onProvingGround(); },
        onLiveChange: (on, cam) => {
          const g = this.game;
          if (on) {
            g.mapCam = cam;
            this._titleWasShown = this.title && this.title.style.display !== 'none';
            if (this.title) this.title.style.display = 'none';
            if (this.root) this.root.style.display = 'none';   // radar, feed, kit chips — match furniture
          } else {
            g.mapCam = null;
            if (this.root) this.root.style.display = '';
            if (this._titleWasShown && this.title) this.title.style.display = '';
          }
        },
      });
      this.atlasEl = this._atlasUI.el;      // overlayOpen()/closeOverlays() read this
    }
    this._atlasUI.open();
  }
  // Headless recipes and older callers reach the validator here; the ONE implementation lives in
  // data/cityplan.js (exported), so the tool and the sweep can never disagree.
  _validatePlan(plan) { return validatePlan(plan); }


  // ---- the KMK 9 SPORTS DESK power board — every match (AI or piloted) moves the book ----
  showRankings() {
    const rows = rankingTable(ROSTER);
    const champ = championId();
    this.rankingsEl.innerHTML = `<div class="obox" style="width:min(780px,94vw)">
      <div class="rkhead">
        <div class="n9">9</div>
        <div class="rt"><b>ASCENDANT POWER RANKINGS</b><span>KMK 9 sports desk · the official book</span></div>
        <div class="rkmeta">INVITATIONAL #${tournamentNo()}<br/>SOURCED: AI-v-AI + PILOTED BOUTS</div>
      </div>
      <table class="rk"><tr><th>#</th><th>Δ</th><th>Weapon</th><th>Rating</th><th>Record</th><th>KO</th><th>LeFevre</th></tr>
      ${rows.map((r) => {
        const mv = r.moved > 0 ? `<td class="mv up">▲${r.moved}</td>` : r.moved < 0 ? `<td class="mv dn">▼${-r.moved}</td>` : '<td class="mv fl">—</td>';
        const tc = THREAT_COLORS[r.threat] || 'var(--text-4)';
        return `<tr data-cid="${esc(r.id)}" title="Open the case file"><td class="rkn">${String(r.rank).padStart(2, '0')}</td>${mv}
          <td class="who" style="--hc:${esc(r.colors.accent)}"><i></i>${esc(r.name)}${r.id === champ ? '<span class="crown" title="Reigning Invitational champion">🏆</span>' : ''}</td>
          <td class="elo">${r.elo}</td><td class="rec">${r.played ? r.w + '–' + r.l : 'UNTESTED'}</td>
          <td class="rec">${r.ko}/${r.kod}</td><td class="thr" style="color:${tc}">${esc(r.threat || '—')}</td></tr>`;
      }).join('')}</table>
      <div class="rkfoot">RATINGS SEED FROM THE LEFEVRE SCALE · EVERY KNOCKDOWN AND DECIDED MATCH MOVES THE BOOK · KO = SCORED/CONCEDED</div>
      <button class="odone">Done</button>
    </div>`;
    this.rankingsEl.querySelector('.odone').onclick = () => { this.rankingsEl.style.display = 'none'; };
    this.rankingsEl.querySelectorAll('tr[data-cid]').forEach(tr => tr.onclick = () => {
      const d = ROSTER.find(r2 => r2.id === tr.dataset.cid);
      if (d) this.showCodex(d);
    });
    this.rankingsEl.style.display = 'flex';
  }

  // ---- THE INVITATIONAL bracket — seeding view, between-rounds view, and the champion card ----
  showBracket(T, opts = {}) {
    const live = T.currentMatch();
    const sideRow = (idx, m) => {
      if (idx == null) return `<div class="bs"><span class="seed">—</span><span class="bn btbd">AWAITING WINNER</span></div>`;
      const s = T.sides[idx], d = T.def(s.ids[0]);
      const won = m.winner != null && m.winner === idx, lost = m.winner != null && m.winner !== idx;
      const score = won && m.score ? `<span class="bscore">${m.score[0]}–${m.score[1]}</span>${m.sim ? '<span class="bsim">SIM</span>' : ''}` : '';
      return `<div class="bs${won ? ' win' : ''}${lost ? ' lose' : ''}" style="--hc:${d ? esc(d.colors.accent) : 'var(--text-5)'}">
        <span class="seed">S${s.seed}</span><i></i><span class="bn">${esc(T.sideName(s))}</span>${s.human ? '<span class="ychip">YOU</span>' : ''}${score || `<span class="belo">${T.sideElo(s)}</span>`}
      </div>`;
    };
    const cellHtml = (m) => `<div class="bm${m === live ? ' live' : ''}">${sideRow(m.a, m)}${sideRow(m.b, m)}</div>`;
    T._resolveLinks();
    const champ = T.champion();
    const champD = champ ? T.def(champ.ids[0]) : null;
    const fmtLabel = { '1v1': 'LONE WOLF · 1v1', '2v2': 'DUOS · 2v2', '1v2': 'UNDERDOG · 1 vs 2' }[T.format] || T.format;
    this.bracketEl.innerHTML = `<div class="obox" style="width:min(1040px,96vw)">
      <div class="rkhead">
        <div class="n9" style="background:linear-gradient(180deg,var(--gold),var(--gold-warm));color:var(--on-gold)">🏆</div>
        <div class="rt"><b>${esc(T.label)}</b><span>single elimination · best-of-3 elimination rounds · team damage LIVE</span></div>
        <div class="rkmeta">FORMAT: ${fmtLabel}<br/>SANCTION: THRESHOLD TREATY OFFICE</div>
      </div>
      <div class="brsub">&gt; SEEDED FROM THE <b>POWER RANKINGS</b> — EVERY RESULT BOOKS BACK INTO THE LEDGER</div>
      <div class="brwrap">
        <div class="brcol"><div class="brh">Quarterfinals</div>${T.rounds[0].map(cellHtml).join('')}</div>
        <div class="brcol"><div class="brh">Semifinals</div>${T.rounds[1].map(cellHtml).join('')}</div>
        <div class="brcol"><div class="brh">Grand Final</div>${T.rounds[2].map(cellHtml).join('')}</div>
        <div class="brcol champ"><div class="brh">Champion</div>
          <div class="bchamp${champ ? '' : ' tbd'}">
            <div class="tro">🏆</div>
            <div class="cn" style="${champD ? `color:${esc(champD.colors.accent)}` : ''}">${champ ? esc(T.sideName(champ)) : 'TO BE DECIDED'}</div>
            <div class="cl">${champ ? (champ.human ? 'YOUR CITY NOW' : 'THE BOOK CLOSES') : 'WINNER TAKES THE BOOK'}</div>
          </div>
        </div>
      </div>
      ${live
        ? `<button class="odone" id="brNext">⚔ ${esc(T.roundName())} — ${esc(T.sideName(T.playerFoeSide(live)))} — FIGHT</button>`
        : `<button class="odone" id="brDone">${champ && champ.human ? '🏆 TAKE THE BELT — BACK TO THE REGISTRY' : 'BACK TO THE REGISTRY'}</button>`}
    </div>`;
    const next = this.bracketEl.querySelector('#brNext');
    if (next) next.onclick = () => { this.hideBracket(); opts.onNext && opts.onNext(); };
    const done = this.bracketEl.querySelector('#brDone');
    if (done) done.onclick = () => { this.hideBracket(); opts.onDone && opts.onDone(); };
    this.bracketEl.style.display = 'flex';
  }
  hideBracket() { this.bracketEl.style.display = 'none'; }

  // ---- ONLINE: rooms, lobby, the wire ----
  showOnline() { this.renderOnline(); this.onlineEl.style.display = 'flex'; }
  renderOnline() {
    const np = this.netplay; if (!np) return;
    const net = np.net, inLobby = net.state === 'lobby';
    const hero = (id) => { const d = ROSTER.find(r => r.id === id); return d ? d.name : '—'; };
    let body;
    if (!inLobby) {
      body = `
        <div class="orow"><span class="ol">Callsign</span><input type="text" id="onName" maxlength="14" spellcheck="false" value="${net.identity.name || ''}" placeholder="PILOT" style="flex:1;font-family:inherit;font-size:var(--t-lg);font-weight:700;color:var(--text);background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.14);border-radius:var(--r-2);padding:9px 11px;outline:none;"></div>
        <div class="oline2">Playing as <b style="color:var(--gold)">${hero(this.selectedHero || 'sol')}</b> — pick a different hero on the title screen first.</div>
        <button class="odone" id="onCreate">Create Room</button>
        <div class="orow" style="margin-top:6px"><input type="text" id="onCode" maxlength="4" spellcheck="false" placeholder="CODE" style="width:110px;text-transform:uppercase;font-family:inherit;font-size:18px;font-weight:800;letter-spacing:.3em;color:var(--gold);background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.14);border-radius:var(--r-2);padding:9px 11px;outline:none;text-align:center;"><button class="odone oghost" id="onJoin" style="flex:1;margin-top:0">Join Room</button></div>
        <div class="oline2" id="onStatus"></div>`;
    } else {
      const me = `<div class="netp"><b>${net.identity.name || 'PILOT'}</b><span>${hero(net.heroId)}</span><em>${net.isHost ? 'HOST' : 'CHALLENGER'}</em></div>`;
      const them = net.peer
        ? `<div class="netp"><b>${net.peer.name}</b><span>${hero(net.peer.heroId)}</span><em>${net.peer.host ? 'HOST' : 'CHALLENGER'}</em></div>`
        : `<div class="netp wait"><b>Waiting for a challenger…</b><span>send them the code</span></div>`;
      body = `
        <div class="roomcode">ROOM <b>${net.room}</b></div>
        <div class="netvs">${me}<span class="vs2">VS</span>${them}</div>
        ${net.isHost
          ? `<button class="odone" id="onFight" ${net.peer ? '' : 'disabled'}>⚔ FIGHT</button>`
          : `<div class="oline2">Waiting for the host to start the duel…</div>`}
        <button class="odone oghost" id="onLeave">Leave Room</button>`;
    }
    this.onlineEl.innerHTML = `<div class="obox"><div class="oh">🌐 Online Duel</div>${body}<button class="odone oghost" id="onClose" style="margin-top:6px">Close</button></div>`;
    const $ = (s) => this.onlineEl.querySelector(s);
    $('#onClose').onclick = () => { this.onlineEl.style.display = 'none'; };
    const status = (t, err) => { const el = $('#onStatus'); if (el) { el.textContent = t; el.style.color = err ? 'var(--danger-2)' : 'var(--good)'; } };
    if (!inLobby) {
      $('#onName').oninput = (e) => np.net.setName(e.target.value);
      $('#onCreate').onclick = async () => {
        try { status('Connecting…'); np.net.setName($('#onName').value); await np.hostRoom(this.selectedHero || 'sol'); this.renderOnline(); }
        catch (err) { status('Could not create room: ' + err.message, true); }
      };
      $('#onJoin').onclick = async () => {
        try { status('Joining…'); np.net.setName($('#onName').value); await np.joinRoom($('#onCode').value, this.selectedHero || 'sol'); this.renderOnline(); }
        catch (err) { status('Could not join: ' + err.message, true); }
      };
    } else {
      const f = $('#onFight'); if (f) f.onclick = () => { this.onlineEl.style.display = 'none'; np.startOnline(); };
      $('#onLeave').onclick = async () => { await np.leave(); this.renderOnline(); };
    }
  }
  setHintVisible(v) { if (this.el.hint) this.el.hint.style.display = v ? 'block' : 'none'; }
  // The help panel, ORGANISED — one titled group per thing you do, instead of a wall of prose.
  // Rebuilt whenever the control scheme changes so it always shows YOUR bindings, not defaults.
  buildHintBody() {
    const el = this.root.querySelector('#hHintBody'); if (!el) return;
    const K = keymap(SETTINGS.scheme);
    const grp = (title, rows) => `<div class="hgrp"><div class="hgt">${title}</div>${rows.filter(Boolean).map(([k, d]) => `<div class="hgr"><b>${k}</b><span>${d}</span></div>`).join('')}</div>`;
    const wheelSel = K.wheel === 'ability';
    // ⚠ IF A PAD IS THE ACTIVE DEVICE, PRINT PAD GLYPHS. Telling a Steam Deck player about WASD
    // and LMB is telling them about keys that do not exist on the machine in their hands.
    const pad = this.game && this.game.pad;
    const P = padActive(pad);
    const G = (a) => glyph(a, pad);
    this._hintPad = P;                                   // so armHintTimer can re-render on change
    el.innerHTML = P
      ? grp('MOVE & AIM', [[G('move'), 'move'], [G('aim'), 'aim'], [G('dash'), 'dash'], ['2×FLICK', 'evade']]) +
        grp('MELEE', [[G('strike'), 'tap = jab · HOLD = haymaker'], [G('grab'), 'grab · hoist a car/tree'], [G('guard'), 'guard (hold)']]) +
        grp('POWERS', [[G('lmb') + ' / ' + G('rmb'), 'primary · secondary'],
          [G('q') + ' / ' + G('e'), 'skills'], [G('f'), '4th power'], [G('ult'), 'ULTIMATE'], [G('item'), 'gadget']]) +
        grp('FLIGHT', [[G('fly'), 'flight ON / rise'], [G('descend'), 'descend'], [G('dash') + ' (air)', 'cruise']]) +
        grp('SYSTEM', [[G('swap'), 'swap hero'], [G('roster'), 'roster'], [G('pause'), 'pause'],
          [G('confirm') + ' / ' + G('back'), 'confirm · back (menus)']])
      : grp('MOVE & AIM', [['WASD', 'move'], ['MOUSE', 'aim'], ['CLICK FOE', 'lock on · T to release'], ['2×TAP', 'evade'], ['SHIFT', 'dash']]) +
        grp('MELEE', [['V', 'tap = jab · HOLD = haymaker'], ['G', 'grab · hoist a car/tree'], [K.guardLabel, 'guard (hold)']]) +
        grp('POWERS', [
          wheelSel ? ['WHEEL', 'pick a power'] : null,
          [wheelSel ? 'LMB' : 'LMB / RMB', wheelSel ? 'fire the picked power' : 'primary · secondary'],
          wheelSel ? ['RMB', 'secondary'] : null,
          ['Q / E', 'skills'], ['H', '4th power'], ['R', 'ULTIMATE'], [K.itemLabel, 'gadget'],
        ]) +
        grp('FLIGHT', [['F', 'flight ON/OFF'], [K.upLabel, 'rise'], [K.downLabel, 'descend'], ['SHIFT (air)', 'cruise']]) +
        grp('SYSTEM', [[K.swapLabel, 'swap hero'], ['TAB', 'roster'], ['B', 'order a rival'], ['N', 'order a training bot'], ['ESC', 'pause'], ['F1', 'this panel']]);
  }
  // The full control list is onboarding, not furniture: it earns ~18s of a fresh match, then
  // collapses to a corner chip. F1 (or the Options toggle) brings it back any time.
  hintFull(on) { if (this.el.hint) this.el.hint.classList.toggle('mini', !on); }
  toggleHint() { if (this.el.hint) { this.el.hint.classList.toggle('mini'); this._hintPinned = !this.el.hint.classList.contains('mini'); } }
  // wheel-select feedback: light the chosen slot so the wheel has a visible consequence
  selectSlot(key) {
    if (!this.slotEls) return;
    for (const k in this.slotEls) this.slotEls[k].root.classList.toggle('sel', k === key);
  }
  armHintTimer() {
    this.buildHintBody();   // always show the ACTIVE scheme's bindings
    clearTimeout(this._hintT); this._hintPinned = false;
    this.hintFull(true);
    this._hintT = setTimeout(() => { if (!this._hintPinned) this.hintFull(false); }, 18000);
  }

  // The height meter: four rungs (GROUND / BUILDING / SKY / CLOUDS) with the live one lit in your
  // hero's colour, plus the raw altitude. Crossing a band lights the next rung — you can watch
  // yourself climb or drop a level.
  updateAltitude(g, p) {
    const el = this.el.alt; if (!el) return;
    const show = !!(g.mode && g.running && p && p.alive);
    if (show !== this._altOn) { this._altOn = show; el.style.display = show ? 'flex' : 'none'; }
    if (!show) return;
    const y = Math.max(0, p.pos.y);
    const band = bandOf(y);                      // ONE rule, imported — never hand-copy the thresholds
    const acc = p.def.colors.accent;
    if (band !== this._altBand) {
      const up = this._altBand != null && band > this._altBand;
      this._altBand = band;
      this.el.altRungs.forEach((r, i) => {
        const on = i === band;
        r.classList.toggle('on', on);
        r.style.background = on ? acc : '';
        r.style.borderColor = on ? acc : '';
      });
      if (this._altBand != null && band > 0) {   // a band change is worth a beat of feedback
        el.style.transform = `translateY(${up ? 3 : -3}px)`;
        clearTimeout(this._altT); this._altT = setTimeout(() => { el.style.transform = ''; }, 130);
      }
    }
    const m = Math.round(y * 0.19);   // 1u ≈ 0.19m at true scale — report in metres, like a real altimeter
    const txt = m > 0 ? m + 'm' : '<i>GROUND</i>';
    if (txt !== this._altTxt) { this._altTxt = txt; this.el.altV.innerHTML = txt; }
  }

  // ===== THE TEST HARNESS =====
  // In the Danger Room we surface everything the engine knows: frame cost, live entity/FX
  // counts, the player's exact combat state, per-dummy DPS, and — critically — each bot's
  // HONEST senses (what it believes, from which source, and how good its hands are). If a
  // system misbehaves, it should be visible here before it's visible in a bug report.
  // (5) telemetry is normally a Danger Room thing, but F2 forces it anywhere
  toggleTelemetry() { this._telForce = !this._telForce; this.feed(this._telForce ? '◈ Telemetry ON (F2)' : '◈ Telemetry off (F2)', 'var(--info)'); }
  updateTelemetry(g) {
    const on = (g.modeId === 'training' || this._telForce) && g.running;
    if (on !== this._simOn) { this._simOn = on; this.root.classList.toggle('sim', on); }
    if (!on) return;
    const now = performance.now();
    if (this._telT && now - this._telT < 120) return;    // 8 Hz — readable, and cheap
    this._telT = now;
    const p = g.player, w = g.world;
    const row = (k, v, cls = '') => `<div class="tr2"><span class="tk">${k}</span><span class="tv ${cls}">${v}</span></div>`;
    const bands = ['GROUND', 'BUILDING', 'SKY', 'CLOUDS'];
    const b = bandOf(p.pos.y);
    const fps = w.fps, ft = (w._ema || 16.7);
    let html = `<h4><span>◈ SIMULATION TELEMETRY</span><span>${fps} FPS</span></h4>`;
    html += row('FRAME', ft.toFixed(1) + ' ms', ft > 24 ? 'bad' : ft < 17 ? 'ok' : 'hot');
    html += row('QUALITY TIER', 'T' + (w._qTier ?? '?') + (w.qualityOverride != null ? ' (locked)' : ''));
    html += row('ENTITIES', g.entities.length);
    html += row('PROJECTILES', g.projectiles.list.length);
    html += row('PARTICLES', (g.particles && g.particles.count) || (g.particles && g.particles.live) || '—');
    html += row('COVER / FADES', `${w.cover.length} / ${(w._fades && w._fades.size) || 0}`);
    // the live subject
    html += `<div class="tg"><div class="subj">SUBJECT — ${esc(p.name)}</div>`;
    html += row('HP / KI', `${p.hp | 0}/${p.maxHp} · ${p.ki | 0}/${p.maxKi}`, p.hp < p.maxHp * 0.3 ? 'bad' : '');
    html += row('STATE', `${p.state}${p.hitstop > 0 ? ' +hitstop' : ''}${p.staggerT > 0 ? ' +stagger' : ''}`, p.hitstop > 0 ? 'bad' : '');
    html += row('ALTITUDE', `${(p.pos.y * 0.19).toFixed(1)} m · ${bands[b]}`, b ? 'hot' : '');
    html += row('FLYING / GUARD', `${p.flying ? 'YES' : 'no'} / ${p.guarding ? 'UP' : 'down'}`);
    html += row('GUARD METER', (p.guardMeter * 100 | 0) + '%', p.guardMeter < 0.3 ? 'bad' : '');
    html += row('TIER / LVL', `${p.tier} / ${p.level}`);
    html += row('COMBO', g.combo + (g._p1MaxCombo ? ` (best ${g._p1MaxCombo})` : ''));
    html += `</div>`;
    // dummies: live damage instrumentation
    const dummies = g.entities.filter(e => e.isDummy);
    if (dummies.length) {
      html += `<div class="tg"><div class="subj">DAMAGE BENCH</div>`;
      for (const d of dummies) {
        const log = d._dmgLog || [];
        while (log.length && log[0].t < g.time - 3) log.shift();
        const dps = log.reduce((s, x) => s + x.a, 0) / 3;
        html += row(`DUMMY ${d.id}`, `${dps.toFixed(0)} dps · Σ${Math.round(d._dmgTotal || 0)}`, dps > 0.5 ? 'hot' : '');
      }
      html += `</div>`;
    }
    // every bot's honest senses + fair hands
    const bots = g.entities.filter(e => e.ai && e.alive && !e.isDummy);
    if (bots.length) {
      html += `<div class="tg"><div class="subj">AI — SENSES &amp; HANDS</div>`;
      for (const f of bots.slice(0, 3)) {
        const ai = f.ai;
        html += row(esc(f.name), ai._sees ? 'SEES YOU' : (ai.belief ? 'believes:' + ai.belief.src : 'no idea'), ai._sees ? 'bad' : ai.belief ? 'hot' : 'ok');
        html += row('  reflex/turn', `${ai.reflex.toFixed(2)}s · ${ai.turnRate.toFixed(1)} r/s`);
        html += row('  mem/jitter', `${ai._mem.toFixed(1)}s · ${(ai.aimJitter * 100).toFixed(1)}`);
      }
      html += `</div>`;
    }
    // the city / villain systems, live
    const c = g.cityStats || {};
    html += `<div class="tg"><div class="subj">WORLD</div>`;
    html += row('CIV / CARS / BLOCKS', `${c.civs || 0} / ${c.cars || 0} / ${c.blocks || 0}`, (c.civs || 0) ? 'bad' : '');
    html += row('HEAT / WANTED', `${g.police ? g.police.heatOf(p) | 0 : 0} · ${'★'.repeat(g.police ? g.police.wantedLevel(p) : 0) || '—'}`, (g.police && g.police.wantedLevel(p)) ? 'bad' : '');
    html += row('OFFICERS', g.entities.filter(e => e.def && e.def.police).length);
    html += `</div>`;
    if (html !== this._telHtml) { this._telHtml = html; this.el.telem.innerHTML = html; }
  }

  // Point at the fight. Bots can genuinely hide now, so an off-screen target gets an edge marker.
  updateFoeArrow(g) {
    const el = this.el.foeArrow; if (!el) return;
    const inMatch = !!(g.mode && g.running && !g.matchOver);
    let foe = null;
    if (inMatch) {
      const cand = (g.hardLock && g.hardLock.alive) ? g.hardLock : (g.lockTarget && g.lockTarget.alive) ? g.lockTarget : null;
      foe = cand && !cand.isDummy ? cand : null;
      if (!foe) { const n = g.nearestFoe(g.player, g.player.pos, 400); if (n && !n.isDummy && (!g.fov || (n._vis || 0) > 0.4)) foe = n; }
    }
    if (!foe) { if (this._arrowOn) { this._arrowOn = false; el.classList.remove('on'); } return; }
    const sp = g.world.screenPosOf(foe.pos.x, foe.pos.y + 6, foe.pos.z);
    const m = 64, W = innerWidth, H = innerHeight;
    const off = sp.behind || sp.x < m || sp.x > W - m || sp.y < m || sp.y > H - m;
    if (!off) { if (this._arrowOn) { this._arrowOn = false; el.classList.remove('on'); } return; }
    // project the bearing onto the screen edge
    const cx = W / 2, cy = H / 2;
    let dx = sp.x - cx, dy = sp.y - cy;
    if (sp.behind) { dx = -dx; dy = -dy; }
    const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
    const sx = Math.min(Math.abs((W / 2 - m) / (dx || 1e-6)), Math.abs((H / 2 - m) / (dy || 1e-6)));
    const x = cx + dx * sx, y = cy + dy * sx;
    el.style.left = x + 'px'; el.style.top = y + 'px';
    el.querySelector('u').style.transform = `rotate(${Math.atan2(dy, dx) * 180 / Math.PI + 90}deg)`;
    const dist = Math.round(Math.hypot(foe.pos.x - g.player.pos.x, foe.pos.z - g.player.pos.z));
    const lab = `${foe.name} ${dist}m`;
    if (lab !== this._arrowLab) { this._arrowLab = lab; el.querySelector('span').textContent = lab; }
    el.querySelector('span').style.left = (x > W - m * 2.6) ? '-92px' : '16px';
    if (!this._arrowOn) { this._arrowOn = true; el.classList.add('on'); }
  }

  // ---- interactive tutorial banner ----
  showTutorial(st, i, n, act) {
    const t = this.el.tut; t.style.display = 'block';
    t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop');
    if (this.el.tutAct) this.el.tutAct.textContent = act || '';
    if (this.el.tutDist) this.el.tutDist.textContent = '';
    this.el.tutStep.textContent = `LEARN TO PLAY — ${i + 1} / ${n}`;
    this.el.tutObj.textContent = st.obj;
    this.el.tutKeys.textContent = st.keys;
    this.el.tutTip.textContent = st.tip;
    this.el.tutDots.innerHTML = Array.from({ length: n }, (_, k) => `<i class="${k < i ? 'on' : ''}"></i>`).join('');
  }
  tutorialStepDone() { this.flashScreen('var(--gold)', 0.08); }
  setTutorialDist(txt) { if (this.el.tutDist && this.el.tutDist.textContent !== txt) this.el.tutDist.textContent = txt ? '🞋 ' + txt : ''; }
  completeTutorial() { this.hideTutorial(); }
  hideTutorial() { if (this.el.tut) this.el.tut.style.display = 'none'; }
  overlayOpen() { return [this.optionsEl, this.howtoEl, this.rankingsEl, this.bracketEl, this.atlasEl, this.codexEl, this.damageEl].some(e => e && e.style.display === 'flex'); }
  closeOverlays() { if (this._atlasUI) this._atlasUI.close(); for (const e of [this.optionsEl, this.howtoEl, this.rankingsEl, this.atlasEl, this.codexEl, this.damageEl]) if (e) e.style.display = 'none'; }   // the bracket closes only through its own buttons

  // ================= THE CODEX — the full case file on one superweapon =================
  // Every line is DERIVED from live data (kit numbers, the Elo book, AI doctrine, the registry)
  // so the file can never lie. Planetary rules: stamps, redactions, and useful intelligence.
  showCodex(def) {
    const render = (c) => {
      const idn = identityOf(c), st = heroStats(c), synth = isSynthDef(c);
      const fno = fileNoOf(c, ROSTER), rec = recOf(c.id, c);
      const snapAll = snapshotTable(ROSTER), me = snapAll.find(r => r.id === c.id) || { rank: '—' };
      const incid = recentIncidents(c.id, ROSTER);
      const champ = championId() === c.id;
      const tc = THREAT_COLORS[c.threat] || 'var(--text-4)';
      const rows = cfAbilityRows(c);
      const counters = cfCounterNotes(c);
      const ai = c.ai || {};
      const at = deriveAttrs(c), tl = heroTalents(c);
      const rez = resistOf(c);
      let h = 0; for (const ch of String(c.id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      const rng = mulberry(h);
      const domKind = Object.values(c.abilities || {}).some(a => a.type === 'beam') ? 'beam'
        : (c.strength ?? 5) >= 7 ? 'fists'
        : Object.values(c.abilities || {}).some(a => a.dmgClass === 'slash') ? 'blade' : 'blast';
      const vp = c.voicePitch || 1;
      const ft = c.flightTier ?? 3;
      const ev = c.evade || {};
      const red = (w) => `<span class="redact">${'█'.repeat(w)}</span>`;
      this.codexEl.innerHTML = `<div class="cfbox" style="--cfa:${esc(c.colors.accent)}">
        <div class="cftop">
          <span class="clschip">TOP SECRET // THRESHOLD</span>
          <span class="cft">CASE FILE ${esc(fno)} · ASCENDANT REGISTRY · COSMIC-EYES ONLY</span>
          <div class="cfnav"><span id="cfPrev" title="Previous file (←)">‹</span><span id="cfNext" title="Next file (→)">›</span><span id="cfClose" title="Close (ESC)">✕</span></div>
        </div>
        <div class="cfhead">
          <div class="cfportrait">${esc(c.name[0])}</div>
          <div class="cfid">
            <div class="cfalias">${esc(c.name)}${champ ? ' 🏆' : ''}</div>
            <div class="cfrole">${esc(c.title || '')} · ${esc(c.role || '')}</div>
            <div class="cfmeta">FILE OPENED ${fileDate(c.id)} · LAST REVIEWED TODAY · HANDLER: ${red(9)}</div>
          </div>
          <div class="cfstamp">LEFEVRE<br/>${esc((c.threat || 'UNRATED').toUpperCase())}<small>THRESHOLD TREATY ASSESSMENT</small></div>
        </div>
        <div class="cfbody">
        <div class="cfrail">
          <div class="cfsec">
            <div class="cfsh">§01 · IDENTIFICATION</div>
            <div class="cfrow"><span class="k">LEGAL NAME</span><span class="v">${esc(idn.n)}</span></div>
            <div class="cfrow"><span class="k">REGISTERED</span><span class="v">${esc(idn.c)}</span></div>
            <div class="cfrow"><span class="k">NATION</span><span class="v">${esc(idn.co)} ${idn.f}</span></div>
            <div class="cfrow"><span class="k">STATUS</span><span class="v ${synth ? 'syn' : 'ok'}">● ${synth ? 'OPERATIONAL — SYNTHETIC' : 'ACTIVE IN THE FIELD'}</span></div>
            <div class="cfrow"><span class="k">RESIDENCE</span><span class="v">${red(14)}</span></div>
            <div class="cfrow"><span class="k">FRAME</span><span class="v">${CF_BUILD[c.strength ?? 5]} · 1.80m REF</span></div>
            <div class="cfrow"><span class="k">VOICE</span><span class="v">${vp < 0.85 ? 'LOW REGISTER' : vp > 1.1 ? 'HIGH REGISTER' : 'MID REGISTER'}</span></div>
          </div>
          <div class="cfsec">
            <div class="cfsh">ATTRIBUTES — THE LADDER</div>
            ${ATTR_DEFS.map(a => { const v = at[a.k]; return `<div class="atline" title="${esc(a.d || a.name)}"><span class="atn">${esc(a.name.toUpperCase())}</span><span class="atr" style="color:${rankColor(v)}">${esc(rankName(v).toUpperCase())}</span><span class="atb"><i style="width:${v * 10}%;background:${rankColor(v)}"></i></span><b class="atv">${v}</b></div>`; }).join('')}
          </div>
          <div class="cfsec">
            <div class="cfsh">DERIVED</div>
            <div class="cfrow"><span class="k">HULL</span><span class="v">${c.hp} HP · GUARD ${(c.guardType || 'BLOCK').toUpperCase()}</span></div>
            <div class="cfrow"><span class="k">POWER CORE</span><span class="v ${c.energyInfinite ? 'syn' : ''}">${c.energyInfinite ? '∞ CORE — TIER-CAPPED II' : `RESERVE ${c.ki} · ${recoveryTier(c)} RECOVERY`}</span></div>
            <div class="cfrow"><span class="k">MIGHT</span><span class="v">STR ${c.strength ?? 5}/10${(c.meleeTiers ?? 3) >= 3 ? ' · FULL STRIKE CHAIN' : ' · HEAVY HANDS'}</span></div>
            <div class="cfrow"><span class="k">FLIGHT</span><span class="v">${['GROUNDED', 'CLASS I — UNSTABLE', 'CLASS II — LEVITATOR', 'CLASS III — FULL FLIGHT'][ft]}</span></div>
            <div class="cfrow"><span class="k">ESCAPE</span><span class="v">${(ev.name || ev.kind || 'DASH').toUpperCase()}</span></div>
          </div>
          <div class="cfsec">
            <div class="cfsh">DEFENSES — TYPED RESISTANCE</div>
            <div class="cfres">${DTYPES.map(dt => { const rz = rez[dt] ?? 1; if (rz === 1) return ''; const info = DTYPE_INFO[dt] || {}; const cls = rz === 0 ? 'imm' : rz < 1 ? 'res' : 'weak'; return `<span class="rchip ${cls}" title="${esc(info.note || dt)}">${esc(info.label || dt.toUpperCase())} ${rz === 0 ? 'IMMUNE' : '×' + (Math.round(rz * 100) / 100)}</span>`; }).filter(Boolean).join('') || '<span class="rchip">STANDARD PROFILE — NO NOTED RESISTANCES</span>'}</div>
          </div>
          ${tl.length ? `<div class="cfsec"><div class="cfsh">TALENTS</div>${tl.map(k => TALENTS[k] ? `<div class="cfrow"><span class="k">◆</span><span class="v">${esc(TALENTS[k].name.toUpperCase())} — ${esc(TALENTS[k].d || '')}</span></div>` : '').join('')}</div>` : ''}
          ${(c.items || []).length ? `<div class="cfsec"><div class="cfsh">CARRIED GEAR</div>${c.items.map(i => `<div class="cfrow"><span class="k">■</span><span class="v">${esc(i.name.toUpperCase())}${i.charges ? ' ×' + i.charges : ''}</span></div>`).join('')}</div>` : ''}
        </div>
        <div class="cfmain">
          <div class="cfcols">
          <div class="cfsec">
            <div class="cfsh">§02 · THREAT ASSESSMENT</div>
            <div class="cfrow"><span class="k">LEFEVRE CLASS</span><span class="v" style="color:${tc};font-weight:700">${esc(c.threat || 'UNRATED')}</span></div>
            <div class="cfrow"><span class="k">BASIS</span><span class="v">OUTPUT ${st.power}/10 · REACH ${st.range}/10 · MOBILITY ${st.mobility}/10 · RESILIENCE ${st.defense}/10</span></div>
            <div class="cfrow"><span class="k">FLIGHT CERT</span><span class="v">${['GROUNDED — LEAP ONLY', 'CLASS I — UNSTABLE', 'CLASS II — LEVITATOR', 'CLASS III — FULL FLIGHT'][ft]}${c.flySpeed ? ` · AIRSPEED ×${c.flySpeed}` : ''}</span></div>
          </div>
          <div class="cfsec">
            <div class="cfsh">§03 · SANCTIONED RECORD</div>
            <div class="cfrow"><span class="k">POWER INDEX</span><span class="v hot">${rec.elo} · RANK #${me.rank}/${snapAll.length}${champ ? ' · REIGNING CHAMPION' : ''}</span></div>
            <div class="cfrow"><span class="k">BOUT RECORD</span><span class="v">${rec.w}–${rec.l}${rec.w + rec.l ? '' : ' (UNTESTED)'} · ${rec.ko} KO / ${rec.kod} CONCEDED</span></div>
            ${incid.length ? incid.map(x => `<div class="cfrow"><span class="k">${x.win ? '▲ VICTORY' : '▼ DEFEAT'}</span><span class="v" style="color:${x.win ? 'var(--good)' : 'var(--danger-2)'}">${x.win ? 'def.' : 'lost to'} ${esc(x.vs)} · ${x.how === 'tournament' ? 'INVITATIONAL' : x.how.toUpperCase()} · ${agoStr(x.t)}</span></div>`).join('') : '<div class="cfrow"><span class="k">HISTORY</span><span class="v">NO SANCTIONED BOUTS ON RECORD</span></div>'}
          </div>
          <div class="cfsec">
            <div class="cfsh">§04 · BEHAVIORAL DOCTRINE</div>
            <div class="cfrow"><span class="k">DOCTRINE</span><span class="v hot">${(ai.style || 'BRAWLER').toUpperCase()}</span></div>
            <div class="cfrow"><span class="k">BAND · AGGRO · AIR</span><span class="v">~${ai.range || 30}u · ${Math.round((ai.aggro ?? 0.6) * 100)}% · ${Math.round((ai.fly ?? 0.3) * 100)}%</span></div>
            ${[c.thorns && 'THORNED — PUNISHES GRABS', c.phase && 'INTANGIBILITY CAPABLE', c.grabHeal && 'ABSORBS ON GRAB', c.teleEscape && 'TELEPORT ESCAPE ARTIST', c.metal && 'ARMORED CHASSIS', c.frostResist && 'COLD-HARDENED', (c.beamMight || 1) >= 1.2 && 'CERTIFIED BEAM MASTER'].filter(Boolean).map(t => `<div class="cfrow"><span class="k">FLAG</span><span class="v hot">${t}</span></div>`).join('')}
          </div>
          </div>
          <div class="cfsec wide">
            <div class="cfsh">§05 · DOCUMENTED ARMAMENT — VERIFIED FIGURES</div>
            <div class="cfarmwrap"><table class="cfarm"><tr><th>SLOT</th><th>DESIGNATION</th><th>CLASS</th><th>OUTPUT</th><th>KI</th><th>CYCLE</th><th>REACH</th><th>NOTES</th></tr>
            ${rows.map(r => `<tr class="${r.ult ? 'ult' : ''}"><td class="sl2">${esc(r.slot)}</td><td class="an3">${esc(r.name)}</td><td>${esc(r.kind)}</td><td class="dm">${esc(r.dmg)}</td><td>${esc(r.cost)}</td><td>${esc(r.cd)}</td><td>${esc(r.reach)}</td><td>${esc(r.notes)}</td></tr>`).join('')}
            </table></div>
          </div>
          <div class="cfsec wide">
            <div class="cfsh">§06 · IF ENCOUNTERED — COUNTERMEASURE BRIEF</div>
            <div class="cfcounter">${counters.map(([k2, t]) => `<div class="cn"><i>[${esc(k2)}]</i><span>${esc(t)}</span></div>`).join('')}</div>
          </div>
          <div class="cfsec wide">
            <div class="cfsh">§07 · FIELD INTERCEPT</div>
            <div class="cfquote">“Subject was last observed delivering ${esc(causeLine(rng, domKind))}.”<b>— WITNESS DEPOSITION · INCIDENT FILE ${red(6)} · TRANSCRIBED BY THE ${esc(idn.co.toUpperCase())} DESK</b></div>
          </div>
        </div>
        </div>
        <div class="cffoot"><span>THRESHOLD TREATY OFFICE · INDEX COPY 7 OF 9</span><span>PAGE 1 OF 1 · FILE ${esc(fno)}</span></div>
      </div>`;
      const nav = (d) => { const i = ROSTER.indexOf(c); render(ROSTER[(i + d + ROSTER.length) % ROSTER.length]); };
      this.codexEl.querySelector('#cfPrev').onclick = () => nav(-1);
      this.codexEl.querySelector('#cfNext').onclick = () => nav(1);
      this.codexEl.querySelector('#cfClose').onclick = () => { this.codexEl.style.display = 'none'; };
      const dn = this.codexEl.querySelector('#cfDone'); if (dn) dn.onclick = () => { this.codexEl.style.display = 'none'; };
      this.codexEl.scrollTop = 0;
    };
    render(def);
    this.codexEl.style.display = 'flex';
  }

  showOptions() {
    const S = SETTINGS;
    const slider = (key, label, max, step) => `<div class="orow"><span class="ol">${label}</span><input type="range" data-k="${key}" min="0" max="${max}" step="${step}" value="${S[key]}"><span class="ov" data-v="${key}">${Math.round(S[key] * 100)}%</span></div>`;
    const toggle = (key, label) => `<div class="orow"><span class="ol">${label}</span><div class="chips3"><span class="c3${S[key] ? ' on' : ''}" data-t="${key}" data-on="1">ON</span><span class="c3${!S[key] ? ' on' : ''}" data-t="${key}" data-on="0">OFF</span></div></div>`;
    this.optionsEl.innerHTML = `<div class="obox">
      <div class="oh">Options</div>
      ${slider('master', 'Master Volume', 1, 0.05)}
      <div class="dgsec">THE MIX</div>
      ${slider('volMusic', 'Music', 1, 0.05)}
      ${slider('volSfx', 'Combat &amp; World', 1, 0.05)}
      ${slider('volVoice', 'Voices', 1, 0.05)}
      ${slider('volAmbient', 'City Ambience', 1, 0.05)}
      ${slider('volUi', 'Interface &amp; Broadcast', 1, 0.05)}
      <div class="dgsec">GAME</div>
      ${slider('voice', 'Battle Cry Intensity', 1, 0.05)}
      ${slider('shake', 'Screen Shake', 1.5, 0.05)}
      ${toggle('dmgNumbers', 'Damage Numbers')}
      ${toggle('hints', 'Controls Hint Panel')}
      ${toggle('aimAssist', 'Aim Assist · magnet targeting')}
      ${toggle('heroVoice', 'Hero Voices · DBZ yells (off: fighters fight in silence)')}
      <div class="orow"><span class="ol">Control Scheme</span><div class="chips3">
        ${Object.entries(KEYMAPS).map(([k, m]) => `<span class="c3${keymap(S.scheme) === m ? ' on' : ''}" data-scheme="${k}">${m.name}</span>`).join('')}
      </div></div>
      <div class="oline2" id="schemeBlurb">${esc(keymap(S.scheme).blurb)}</div>
      <div class="orow"><span class="ol">Render Quality</span><div class="chips3">
        ${[['auto', 'AUTO'], ['2', 'HIGH'], ['1', 'BALANCED'], ['0', 'LOW']].map(([v, n]) => `<span class="c3${String(S.quality) === v ? ' on' : ''}" data-q="${v}">${n}</span>`).join('')}
      </div></div>
      <div class="orow"><span class="ol">Match Opening</span><div class="chips3">
        ${[['full', 'CINEMATIC'], ['quick', 'QUICK CARD'], ['off', 'OFF']].map(([v, n]) => `<span class="c3${S.opening === v ? ' on' : ''}" data-open="${v}">${n}</span>`).join('')}
      </div></div>
      <div class="oline2">CINEMATIC cold-opens each match with one of ten openers — case file, broadcast, flyover… Any key skips.</div>
      <button class="odone">Done</button>
    </div>`;
    const apply = () => { applySettings(this.game); saveSettings(); };
    this.optionsEl.querySelectorAll('input[type=range]').forEach(r => r.oninput = () => {
      S[r.dataset.k] = parseFloat(r.value);
      this.optionsEl.querySelector(`[data-v="${r.dataset.k}"]`).textContent = Math.round(S[r.dataset.k] * 100) + '%';
      apply();
      if (r.dataset.k === 'master' || r.dataset.k === 'voice') this.game.audio.zap(700);   // audible feedback
    });
    this.optionsEl.querySelectorAll('[data-t]').forEach(c => c.onclick = () => { S[c.dataset.t] = c.dataset.on === '1'; apply(); this.showOptions(); });
    this.optionsEl.querySelectorAll('[data-q]').forEach(c => c.onclick = () => { S.quality = c.dataset.q === 'auto' ? 'auto' : c.dataset.q; apply(); this.showOptions(); });
    this.optionsEl.querySelectorAll('[data-open]').forEach(c => c.onclick = () => { S.opening = c.dataset.open; apply(); this.showOptions(); });
    if (!this._uiSndWired) {
      this._uiSndWired = true;
      document.addEventListener('click', (ev) => {
        const el = ev.target && ev.target.closest && ev.target.closest('button, .c3, .chip, .rcard, .mcard, .slot, .odone, .oline, [data-t], [data-q], [data-scheme]');
        if (el && this.game && this.game.audio) this.game.audio.sample && this.game.audio.sample('ui.click', { bus: 'ui' });
      }, true);
    }
    this.optionsEl.querySelectorAll('[data-scheme]').forEach(c => c.onclick = () => {
      S.scheme = c.dataset.scheme; apply(); this.buildHintBody(); this.hintFull(true);   // show the new bindings
      this.feed('Controls: ' + keymap(S.scheme).name, 'var(--gold)');
      this.showOptions();
    });
    this.optionsEl.querySelector('.odone').onclick = () => { apply(); this.optionsEl.style.display = 'none'; };
    this.optionsEl.style.display = 'flex';
  }

  showHowto() {
    this.howtoEl.innerHTML = `<div class="obox">
      <div class="oh">How to Play</div>
      <div class="hsec"><div class="ht">Move & Aim</div><div class="hb"><b>WASD</b> move · <b>Mouse</b> aims everything · hover a foe to target them · <b>Click</b> a foe = hard lock (<b>T</b> clears) · <b>SHIFT</b> dash · <b>2×TAP</b> a direction = your evade</div></div>
      <div class="hsec"><div class="ht">Powers</div><div class="hb"><b>LMB / RMB / Q / E / H</b> fire your powers · <b>R</b> is your ULTIMATE · many powers <em>charge</em> — hold to grow them, release to fire · everything spends <em>KI</em>: run dry and you fizzle, so watch the blue bar</div></div>
      <div class="hsec"><div class="ht">The Melee Triangle</div><div class="hb"><b>V</b> strike (tap = jab combo · <em>hold</em> = HAYMAKER) · <b>G</b> grab · <b>C / Mouse4</b> guard — <em>Strike beats Grab · Grab beats Guard · Guard beats Strike</em> · a HAYMAKER crushes a guard wide open · back-grabs can't be escaped</div></div>
      <div class="hsec"><div class="ht">Flight</div><div class="hb"><b>F</b> toggles flight on/off · hold <b>SPACE</b> to rise · release to hover · <b>Z</b> to descend and land · hold <b>SHIFT</b> in the air to <em>CRUISE</em> (some heroes fly much faster than others) · the <em>ring under every fighter</em> is their altitude band — green GROUND · gold BUILDING · cyan SKY · white CLOUDS — match colors to reach them</div></div>
      <div class="hsec"><div class="ht">Gadgets & The Meter</div><div class="hb"><b>X</b> uses your carried gadget (beacon, medkit, flashbang…) · low ki opens <em>OVERDRIVE</em> — your fists refill the tank · leveling up climbs <em>TIERS</em>: your aura and your meter literally grow</div></div>
      <div class="hsec"><div class="ht">Swapping & The Rest</div><div class="hb"><b>MOUSE WHEEL</b> or <b>1–0</b> swap hero mid-match · <b>TAB</b> roster · <b>B</b> spawns a rival · <b>ESC</b> pause · <b>M</b> mute · 🎮 pad: sticks move/aim · R2/L2 powers · ▢ ○ melee · L1 guard · ✕ fly</div></div>
      <div class="hsec"><div class="ht">The Golden Rule</div><div class="hb">The LeFevre threat scale is real — a Street-tier human <em>should</em> lose to a Cosmic superweapon. Lopsided is honest. Pick your fights, or forge your own weapon in <b>ORIGIN</b>.</div></div>
      <div class="hsec"><div class="ht">Damage Types</div><div class="hb">Every hit has a <em>type</em> — physical, ballistic, energy, fire, cold, toxic, acid — and every fighter resists them differently. A machine <em>cannot</em> be poisoned; <b>ACID</b> eats the armour that stops bullets. Open the codex for the full table.</div></div>
      <button class="odone" id="howtoDmg">☣ Open the Damage Codex</button>
      <button class="odone" id="howtoTut">🎓 Play the Tutorial — learn by doing</button>
      <button class="odone oghost">Got It — Let's Fight</button>
    </div>`;
    const seen = () => { try { localStorage.setItem('threshold_howto_seen', '1'); } catch {} this.howtoEl.style.display = 'none'; };
    this.howtoEl.querySelector('.oghost').onclick = seen;
    this.howtoEl.querySelector('#howtoDmg').onclick = () => this.showDamage();
    this.howtoEl.querySelector('#howtoTut').onclick = () => { seen(); this.onTutorial && this.onTutorial(); };
    this.howtoEl.style.display = 'flex';
  }

  // ---- THE ESTABLISHING SHOT ------------------------------------------------------------
  // Every match opens on a title card the way a film opens on a city: the name, then the facts
  // underneath it, then the card lifts and you are standing in it. The Danger Room gets a
  // different one — it BOOTS rather than arrives, because it is a simulation and should say so.
  showEstablishing(plan, opts = {}) {
    const el = this.establishEl;
    clearTimeout(this._estT1); clearTimeout(this._estT2);
    const sim = !!opts.sim;
    const esc2 = (v) => esc(String(v == null ? '' : v));

    if (sim) {
      el.className = 'establish sim';
      el.innerHTML = `
        <div class="estinner">
          <div class="estkick">THRESHOLD TREATY OFFICE · TRAINING DIVISION</div>
          <div class="esttitle">THE DANGER ROOM</div>
          <div class="estsub">SIMULATED ENVIRONMENT</div>
          <div class="estboot">
            <div><b>ENVIRONMENT</b><span>PROJECTED</span></div>
            <div><b>SUBJECT</b><span>LIVE</span></div>
            <div><b>SAFETIES</b><span>ENGAGED</span></div>
            <div><b>TELEMETRY</b><span>RECORDING</span></div>
          </div>
          <div class="estbar"><i></i></div>
        </div>`;
    } else {
      const C = opts.country || {};
      const crime = plan.crime ?? 50, safety = plan.safety ?? 50;
      const bar = (v, good) => {
        const pct = Math.max(0, Math.min(100, v));
        return `<div class="estbarline"><i style="width:${pct}%;background:${good ? 'var(--good)' : 'var(--danger)'}"></i></div>`;
      };
      el.className = 'establish';
      el.innerHTML = `
        <div class="estinner">
          <div class="estkick">${esc2(opts.kicker || 'THEATER OF OPERATIONS')}</div>
          <div class="esttitle">${esc2(plan.name)}</div>
          <div class="estsub">${esc2(plan.country || '')}</div>
          <div class="eststats">
            <div class="eststat"><b>POPULATION</b><span>${esc2(plan.popLabel || '')}</span></div>
            <div class="eststat"><b>DISTRICTS</b><span>${esc2((plan.types || []).join(' · ') || 'MIXED')}</span></div>
            <div class="eststat"><b>CRIME INDEX</b><span>${crime}</span>${bar(crime, false)}</div>
            <div class="eststat"><b>SAFETY INDEX</b><span>${safety}</span>${bar(safety, true)}</div>
            ${C.lawEnforcement != null ? `<div class="eststat"><b>POLICE RESPONSE</b><span>~${opts.eta ?? '?'}s</span></div>` : ''}
            ${C.vigilantism ? `<div class="eststat"><b>VIGILANTISM</b><span class="${C.vigilantism === 'Banned' ? 'estbad' : ''}">${esc2(C.vigilantism.toUpperCase())}</span></div>` : ''}
          </div>
        </div>`;
    }

    el.style.display = 'flex';
    // three beats: HOLD on the card, LIFT the veil, then get out of the way entirely
    el.classList.remove('lift', 'gone');
    void el.offsetWidth;                       // force a reflow so the transition actually plays
    this._estT1 = setTimeout(() => el.classList.add('lift'), sim ? 1500 : 2200);
    this._estT2 = setTimeout(() => { el.classList.add('gone'); el.style.display = 'none'; }, sim ? 3200 : 4200);
  }
  hideEstablishing() {
    clearTimeout(this._estT1); clearTimeout(this._estT2);
    if (this.establishEl) { this.establishEl.style.display = 'none'; this.establishEl.classList.add('gone'); }
  }

  // THE DAMAGE CODEX — the in-game half of docs/COMBAT_MANUAL.md. Every row is READ FROM THE LIVE
  // TABLES (DTYPE_INFO + resistOf run against the real roster), so this screen physically cannot
  // drift from what the engine does. Protocol §6: a new damage type shows up here for free.
  showDamage() {
    const el = this.damageEl;
    const R = ROSTER;
    // who resists / is weak to each type — computed from the same function combat uses
    const tables = R.map(d => ({ d, r: resistOf(d) }));
    const nameOf = (x) => x.d.name;
    const rows = DTYPES.map(t => {
      const info = DTYPE_INFO[t];
      const immune = tables.filter(x => x.r[t] === 0).map(nameOf);
      const resists = tables.filter(x => x.r[t] > 0 && x.r[t] < 0.9).map(nameOf);
      const weak = tables.filter(x => x.r[t] > 1.05).map(nameOf);
      const cap = (a, n = 6) => a.length > n ? a.slice(0, n).join(' · ') + ` +${a.length - n}` : (a.join(' · ') || '—');
      return `<div class="dgrow">
        <div class="dgtag" style="--dc:${info.c}">${info.label}</div>
        <div class="dgbody">
          <div class="dgnote">${esc(info.note)}</div>
          <div class="dgline"><b>IMMUNE</b><span>${esc(cap(immune))}</span></div>
          <div class="dgline"><b>RESISTS</b><span>${esc(cap(resists))}</span></div>
          <div class="dgline dgw"><b>WEAK</b><span>${esc(cap(weak))}</span></div>
        </div></div>`;
    }).join('');
    el.innerHTML = `<div class="obox dgbox">
      <div class="oh">Damage Codex</div>
      <div class="dgsub">Every hit in the game carries a TYPE. Every fighter carries resistances to those types.
        This table is generated from the live combat tables — it is always what the engine is actually doing.</div>
      ${rows}
      <div class="dgsec">THE ORDER OF OPERATIONS</div>
      <div class="dgsub">Damage is filtered in this order — anything that stops it here never reaches health:
        <b>armour</b> (bullets only) → <b>toughness</b> (Strength) → <b>type resistance</b> →
        <b>shield pack</b> → <b>phase</b> → <b>guard</b> → health.</div>
      <div class="dgsec">READING A FIGHT</div>
      <div class="dgsub"><b>IMMUNE</b> means exactly that — a machine cannot be poisoned, and the number will say so.
        <b>ACID</b> is the answer to armour: it corrodes plate for five seconds, and a chassis that was
        shrugging off bullets starts taking them. Against bare flesh it is the wrong tool.</div>
      <button class="odone oghost">Close</button>
    </div>`;
    el.querySelector('.oghost').onclick = () => { el.style.display = 'none'; };
    el.style.display = 'flex';
  }

  // ⚠ CANVAS 2D CANNOT READ CSS TOKENS. `ctx.fillStyle = '#ffd24a'` is silently ignored and
  // the previous colour is kept — it is not an error, it just draws the wrong thing. Anything
  // painted into a <canvas> must use these literals. Keep them in sync with :root in index.html.
  // ---- combat UI: radar, hit direction, KO banner ----
  updateRadar(g) {
    const ctx = this._radarCtx; if (!ctx || this.el.radar.style.display === 'none') return;
    const now = performance.now();                                   // ~25 Hz is plenty for a minimap
    if (this._radarLast && now - this._radarLast < 40) return;
    this._radarLast = now;
    const W = 152, R = W / 2, cx = R, cy = R, A = (g.world && g.world.ARENA) || 175, sc = (R - 9) / A;
    const toXY = (wx, wz) => [cx + wx * sc, cy + wz * sc];
    ctx.clearRect(0, 0, W, W);
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R - 3, 0, TAU); ctx.clip();
    ctx.fillStyle = 'rgba(16,20,30,.82)'; ctx.fillRect(0, 0, W, W);
    // the harbor
    if (g.world && g.world.waterX != null) {
      ctx.fillStyle = 'rgba(70,140,180,.4)';
      const wx = cx + g.world.waterX * sc;
      ctx.fillRect(wx, 0, W - wx, W);
    }
    // cover blocks
    ctx.fillStyle = 'rgba(120,132,155,.55)';
    for (const c of (g.world && g.world.cover) || []) { const [x, y] = toXY(c.x, c.z); const w = (c.hx ?? c.r) * sc, h = (c.hz ?? c.r) * sc; ctx.fillRect(x - w, y - h, Math.max(2, w * 2), Math.max(2, h * 2)); }
    // district labels (canon names on the flagship only — generated cities read from their plan)
    if (!g.world.plan || g.world.plan.flagship) {
      ctx.font = '700 8px sans-serif'; ctx.textAlign = 'center'; ctx.globalAlpha = 0.85;
      const lab = (t, wx, wz, col) => { const [x, y] = toXY(wx, wz); ctx.fillStyle = col; ctx.fillText(t, x, y); };
      lab('COM', -96, -140, '#9fc0ff'); lab('RES', 0, 140, '#ffb87a'); lab('IND', 156, -20, '#c0d0e0'); lab('MIL', -144, 200, '#a8c070');
      ctx.globalAlpha = 1;
    }
    const P = g.player;
    // player vision wedge
    if (P) {
      const [px, py] = toXY(P.pos.x, P.pos.z), aang = Math.atan2(P.aim.z, P.aim.x);
      if (g.fov) { ctx.fillStyle = 'rgba(245,178,26,.14)'; ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, 34, aang - 0.62, aang + 0.62); ctx.closePath(); ctx.fill(); }
    }
    // enemies: solid red if seen, faded "?" at last-known if not
    for (const e of g.entities) {
      if (e === P || !e.def || e.isDummy || !e.alive) continue;
      const vis = g.fov ? (e._vis || 0) : 1;
      if (vis > 0.4) { const [ex, ey] = toXY(e.pos.x, e.pos.z); ctx.fillStyle = e.def.police ? 'var(--police)' : 'var(--danger)'; ctx.beginPath(); ctx.arc(ex, ey, 3.4, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1; ctx.stroke(); }
      else if (e._lastKnown) { const [lx, ly] = toXY(e._lastKnown.x, e._lastKnown.z); ctx.fillStyle = 'rgba(255,90,74,.6)'; ctx.font = 'bold 11px Inter,sans-serif'; ctx.fillText('?', lx - 3, ly + 4); }
    }
    // deployed beacon — gold diamond so she always knows where home is
    if (P && P.items) for (const it of P.items) if (it.state === 'deployed' && it.pos) {
      const [bx, by] = toXY(it.pos.x, it.pos.z);
      ctx.save(); ctx.translate(bx, by); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = P.def.colors.accent; ctx.fillRect(-3, -3, 6, 6);
      ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1; ctx.strokeRect(-3, -3, 6, 6); ctx.restore();
    }
    // player marker + facing tick
    if (P) { const [px, py] = toXY(P.pos.x, P.pos.z); ctx.strokeStyle = 'rgba(255,210,74,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + P.aim.x * 13, py + P.aim.z * 13); ctx.stroke(); ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(px, py, 3.8, 0, TAU); ctx.fill(); ctx.strokeStyle = '#160d02'; ctx.lineWidth = 1.2; ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(245,178,26,.32)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, R - 3, 0, TAU); ctx.stroke();
  }

  // red glow at the screen edge in the direction damage came from
  hitDirection(worldPos) {
    if (!this.game.world) return;
    const sp = this.game.world.screenPosOf(worldPos.x, (worldPos.y || 0) + 4, worldPos.z);
    const cxp = innerWidth / 2, cyp = innerHeight / 2;
    let ang = Math.atan2((sp.y || cyp) - cyp, (sp.x || cxp) - cxp);
    if (sp.behind) ang += Math.PI;                       // source behind camera → opposite edge
    const rad = Math.min(innerWidth, innerHeight) * 0.5;
    const el = document.createElement('div'); el.className = 'hitarc';
    el.style.left = (cxp + Math.cos(ang) * rad) + 'px';
    el.style.top = (cyp + Math.sin(ang) * rad) + 'px';
    this.el.hits.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = '0'; });
    setTimeout(() => el.remove(), 600);
    while (this.el.hits.children.length > 6) this.el.hits.firstChild.remove();
  }

  showKO(text = 'K.O.', sub = '', color = '#fff') {
    this.el.koT.textContent = text; this.el.koT.style.color = color; this.el.koS.textContent = sub;
    this.el.ko.style.opacity = '1'; this.el.ko.style.transform = 'translateX(-50%) scale(1)';
    clearTimeout(this._koT1); clearTimeout(this._koT2);
    this._koT1 = setTimeout(() => { this.el.ko.style.transform = 'translateX(-50%) scale(1.09)'; }, 480);
    this._koT2 = setTimeout(() => { this.el.ko.style.opacity = '0'; }, 1350);
  }
  setCombatUI(on) { this.el.radar.style.display = on ? 'block' : 'none'; }

  // ---- energy feedback ----
  kiWarn() {                                            // ki ran dry mid-ability — flash the bar
    this.el.kiBar.classList.add('kiflash');
    clearTimeout(this._kiT); this._kiT = setTimeout(() => this.el.kiBar.classList.remove('kiflash'), 650);
  }
  kiDenied(key) {                                       // pressed something you can't afford
    this.kiWarn();
    const se = this.slotEls?.[key];
    if (se) { se.root.classList.remove('deny'); void se.root.offsetWidth; se.root.classList.add('deny'); }
  }
  overdriveFlash() {                                    // a fist just converted into ki
    this.el.kiBar.style.boxShadow = '0 0 18px rgba(127,230,255,.95)';
    clearTimeout(this._odT); this._odT = setTimeout(() => { this.el.kiBar.style.boxShadow = ''; }, 350);
  }

  announce(text, sub = '', color = 'var(--gold)') {
    this.el.annT.textContent = text; this.el.annT.style.color = color; this.el.annS.textContent = sub;
    this.el.ann.style.opacity = '1'; this.el.ann.style.transform = 'translateX(-50%) scale(1.12)';
    clearTimeout(this._annT1); clearTimeout(this._annT2);
    this._annT1 = setTimeout(() => { this.el.ann.style.transform = 'translateX(-50%) scale(1)'; }, 110);
    this._annT2 = setTimeout(() => { this.el.ann.style.opacity = '0'; }, 1800);
    try { this.game.audio.zap(760); this.game.audio.blast(220, 0.12); } catch (e) {}
  }
  scorePopup(worldPos, amount) { this.damageNumber({ x: worldPos.x, y: worldPos.y + 4, z: worldPos.z }, '+' + amount, 'var(--gold-pale)', true); }

  updateModeBar(g) {
    const el = this.el.mode; if (!g.mode) { el.style.display = 'none'; return; }
    const h = g.mode.hud(g);
    if (h.type === 'training') { el.style.display = 'none'; return; }
    el.style.display = 'flex';
    let html = '';
    if (h.type === 'duel') html = `<div class="seg"><div class="mv" style="color:var(--good)">${h.a}</div><div class="ml">${h.aName}</div></div><div class="vs">${h.a}–${h.b} · first to ${h.target}</div><div class="seg"><div class="mv" style="color:var(--danger-2)">${h.b}</div><div class="ml">${h.bName}</div></div>`;
    else if (h.type === 'survival') html = `<div class="seg"><div class="mv" style="color:#ffb03a">${h.wave}</div><div class="ml">Wave</div></div><div class="seg"><div class="mv">${h.score}</div><div class="ml">Score</div></div><div class="seg"><div class="mv" style="color:var(--danger-2)">${'♥'.repeat(h.lives) || '—'}</div><div class="ml">Lives</div></div>`;
    else if (h.type === 'rumble') html = `<div class="seg"><div class="mv" style="color:var(--info)">${h.frags}</div><div class="ml">Frags / ${h.target}</div></div><div class="seg"><div class="mv">${h.timer}</div><div class="ml">Seconds</div></div>`;
    else if (h.type === 'tournament') html = `<div class="seg"><div class="mv" style="color:var(--good)">${h.a}</div><div class="ml">YOU</div></div><div class="vs">${h.roundName} · RD ${h.round} · first to ${h.target} · ⚠ TEAM DMG</div><div class="seg"><div class="mv" style="color:var(--danger-2)">${h.b}</div><div class="ml">${h.bName}</div></div>`;
    if (html !== this._modeHtml) { this._modeHtml = html; el.innerHTML = html; }   // dirty-check — no per-frame DOM rebuild
  }

  updateKitWidget(p) {
    const el = this.el.kit; if (!p) { el.style.display = 'none'; return; }
    const chips = []; const d = p.def, acc = d.colors.accent;
    if (p.buffT > 0 && p.buffName) chips.push({ t: p.buffName + ' ' + Math.ceil(p.buffT) + 's', on: true });
    if (p.invuln > 0.15) chips.push({ t: 'INVINCIBLE', on: true });
    if (p.phase) chips.push({ t: 'INTANGIBLE', on: true });
    if (p.frozenT > 0) chips.push({ t: '❄ FROZEN', on: true });
    const bowA = Object.values(d.abilities).find(a => a.type === 'bow');
    if (bowA) { const pls = bowA.payloads || ['explosive', 'flame', 'poison']; chips.push({ t: '➶ ' + pls[p._quiverIdx % pls.length].toUpperCase(), on: true }); }
    if (d.guardType === 'deflect') chips.push({ t: 'DEFLECT GUARD', on: p.guarding });
    if (d.guardType === 'barrier') chips.push({ t: 'BARRIER GUARD', on: p.guarding });
    for (const it of p.items || []) {
      const label = it.def.kind === 'beacon'
        ? (it.state === 'ready' ? 'X TO PLANT' : it.state === 'deployed' ? 'X TO RECALL' : 'RECHARGING ' + Math.ceil(it.cd) + 's')
        : (it.state === 'ready' ? 'X · ×' + (it.charges ?? it.def.charges ?? 1) : it.state === 'spent' ? 'SPENT' : 'CD ' + Math.ceil(it.cd) + 's');
      chips.push({ t: '◈ ' + (it.def.name || it.def.kind).toUpperCase() + ' — ' + label, on: it.state === 'deployed' });
    }
    if (p._shieldHp > 0) chips.push({ t: '🛡 SHIELD ' + Math.round(p._shieldHp), on: true });
    if (p._jetT > 0) chips.push({ t: '🔥 JETS ' + Math.ceil(p._jetT) + 's', on: true });
    if (p._revealT > 0) chips.push({ t: '👁 THE RING SEES ' + Math.ceil(p._revealT) + 's', on: true });
    const mine = this.game.minions.filter(m => m.owner === p).length; const maxD = Math.max(...Object.values(d.abilities).map(a => a.type === 'summon' ? (a.max || 6) : 0), 0);
    if (maxD) chips.push({ t: '◈ DRONES ' + mine + '/' + maxD, on: mine > 0 });
    const cons = this.game.constructs.filter(c => c.owner === p);
    if (Object.values(d.abilities).some(a => a.type === 'construct')) chips.push({ t: cons.length ? 'CONSTRUCT: ' + cons[0].kind.toUpperCase() : 'CONSTRUCTS', on: cons.length > 0 });
    if (d.beamMight >= 1.2) chips.push({ t: 'BEAM MASTER', on: false });
    if (d.grabHeal) chips.push({ t: 'ABSORB', on: false });
    if (d.thorns) chips.push({ t: 'THORNS', on: false });
    if (!chips.length) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    const html = chips.map(c => `<span class="chip${c.on ? ' on' : ''}" style="${c.on ? `background:${acc}22;border-color:${acc}88;color:${acc}` : ''}">${c.t}</span>`).join('');
    if (html !== this._kitHtml) { this._kitHtml = html; this.el.kitChips.innerHTML = html; }   // dirty-check
  }

  showEndScreen(result, g) {
    if (this.game && this.game.touch) this.game.touch.show(false);   // thumbs off the report — rematch re-shows them
    if (g.matchReport) { this._showBroadcast(result, g); return; }
    const p = g.player;
    const stats = [['Score', p.score], ['KOs', p.kills], ['Level', p.level]];
    if (result.wave != null) stats.unshift(['Wave', result.wave]);
    this.el.end.classList.remove('news');
    this.el.end.innerHTML = `
      <div class="et" style="color:${result.win ? 'var(--good)' : 'var(--danger-2)'}">${result.title}</div>
      <div class="el">${(result.lines || []).join('<br/>')}</div>
      <div class="stats">${stats.map(s => `<div class="stat"><div class="sv">${s[1]}</div><div class="sl">${s[0]}</div></div>`).join('')}</div>
      <div class="btns"><button id="eRematch">Rematch</button><button class="ghost" id="eMenu">Main Menu</button></div>`;
    this.el.end.style.display = 'flex';
    this.el.end.querySelector('#eRematch').onclick = () => { this.hideEndScreen(); if (this.onRematch) this.onRematch(); };
    this.el.end.querySelector('#eMenu').onclick = () => { this.hideEndScreen(); if (this.onMenu) this.onMenu(); };
  }

  // ---- the KMK 9 ACTION NEWS post-fight broadcast: TV replaying the crew's REAL footage,
  // a typed anchor script about who won and how, the tale of the tape, and the city desk ----
  _showBroadcast(result, g) {
    const rep = g.matchReport;
    let b;
    try { b = writeBroadcast(rep); } catch (e) { console.error('newsroom', e); g.matchReport = null; this.showEndScreen(result, g); return; }
    const tape = tapeRows(rep);
    const winColor = result.win ? '#1d7a3a' : '#8a1d24';
    const pchip = (s) => s ? `<span style="display:inline-flex;align-items:center;gap:6px;color:${esc(s.colors.accent)}"><i style="width:9px;height:9px;border-radius:50%;background:${esc(s.colors.accent)};box-shadow:0 0 8px ${esc(s.colors.accent)}"></i>${esc(s.name)}</span>` : '—';
    let tapeHtml = '';
    if (tape.cols.length === 2 && !tape.ranked) {
      const hi = (lb, av, bv) => {
        const a = parseFloat(av), b2 = parseFloat(bv);
        if (isNaN(a) || isNaN(b2) || a === b2) return [0, 0];
        const lower = /TAKEN/.test(lb);                       // damage TAKEN: less is the flex
        return (a > b2) !== lower ? [1, 0] : [0, 1];
      };
      tapeHtml = `<table class="tape"><tr><th class="lb"></th><th>${pchip(tape.cols[0])}</th><th>${pchip(tape.cols[1])}</th></tr>
        ${tape.rows.map(r => { const [wa, wb] = hi(r[0], r[1], r[2]); return `<tr><td class="lb">${esc(r[0])}</td><td class="${wa ? 'win' : ''}">${esc(r[1])}</td><td class="${wb ? 'win' : ''}">${esc(r[2])}</td></tr>`; }).join('')}</table>`;
    } else if (tape.ranked) {
      tapeHtml = `<table class="tape">${tape.rows.map((r, i) => `<tr><td class="lb">${i + 1}. ${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('')}</table>`;
    } else if (tape.cols.length === 1) {
      tapeHtml = `<table class="tape"><tr><th class="lb"></th><th>${pchip(tape.cols[0])}</th></tr>${tape.rows.map(r => `<tr><td class="lb">${esc(r[0])}</td><td class="win">${esc(r[1])}</td></tr>`).join('')}</table>`;
    }
    for (const L of b.script) L.label = L.who === 'ANCHOR' ? titleCase(b.anchorName || 'Anchor') : titleCase(L.who);   // the desk has a name
    const c = rep.city;
    const cityRows = [
      ['Civilians treated', c.civs], ['Structures down', c.blocks], ['Vehicles destroyed', c.cars], ['Impact craters', c.craters],
    ].map(([l, v]) => `<div class="cityrow"><span>${l}</span><b>${v}</b></div>`).join('');
    const tickerHtml = b.ticker.map(t => `<b>◆</b><span>${esc(t)}</span>`).join('');
    this.el.end.classList.add('news');
    this.el.end.innerHTML = `
    <div class="nwrap">
      <div class="nmast">
        <div class="n9">9</div>
        <div class="nb"><b>KMK ACTION NEWS</b><span>First on the scene</span></div>
        <div class="nlive"><i></i> ${esc(b.clockStr)} · ${esc(b.district)}</div>
      </div>
      <div class="nbody">
        <div class="ncl">
          <div class="tvset">
            <div class="tvscreen"><canvas id="nTv" width="640" height="360"></canvas><div class="tvscan"></div><div class="tvglare"></div><div class="tvtag" id="nTvTag">SIGNAL</div></div>
            <div class="tvchin"><span class="tvbrand">MK·TRINITY</span><span class="tvgrill"></span><span class="tvled"></span></div>
          <div class="tvprog" id="nTvProg"></div>
          </div>
          <div class="tvcap" id="nTvCap">Field footage — KMK 9</div>
          <div class="ncrew">Desk: ${esc(titleCase(b.anchorName || 'KMK 9'))} · Field: ${esc(titleCase(rep.reporter))} · Camera: ${esc(rep.operator)}</div>
          <div class="btns"><button id="eRematch">${g.modeId === 'tournament' ? 'CONTINUE ▸ BRACKET' : 'Rematch'}</button><button class="ghost" id="eMenu">Main Menu</button></div>
        </div>
        <div class="ncr">
          <div class="nkickrow">
            <span class="nkick">${esc(b.kicker)}</span>
            <span class="nkick" style="background:${winColor}">${esc(result.title)}</span>
            <span class="sat" id="nSat"><i></i> Satellite desk update</span>
          </div>
          <div class="nhead" id="nHead">${esc(b.headline)}</div>
          <div class="nsub">Special report · <b>${esc(b.district)}</b> · this ${esc(b.timeWord)}</div>
          <div class="nscript" id="nScript"></div>
          <div class="wcard" id="nWit" style="display:none"></div>
          <div class="nboards">
            <div class="board"><div class="bh">Tale of the tape <em>OFFICIAL</em></div>${tapeHtml}</div>
            <div class="board"><div class="bh">City desk <em>DAMAGE ASSESSMENT</em></div>${cityRows}
              <div class="citysum"><span class="cl">Early estimate</span><span class="cv">${esc(money(b.est))}</span></div>
            </div>
          </div>
        </div>
      </div>
      <div class="nticker"><div class="tkbrand">KMK 9</div><div class="tkwrap"><div class="tkx">${tickerHtml}${tickerHtml}</div></div></div>
    </div>`;
    this.el.end.style.display = 'flex';
    const tourn = g.modeId === 'tournament';
    this.el.end.querySelector('#eRematch').onclick = () => {
      this.hideEndScreen();
      if (tourn && this.onBracketContinue) this.onBracketContinue();
      else if (this.onRematch) this.onRematch();
    };
    this.el.end.querySelector('#eMenu').onclick = () => { this.hideEndScreen(); if (this.onMenu) this.onMenu(); };
    try { this.game.audio.sting(); } catch {}
    this._startTV(rep);
    // (9) SKIP THE TYPING — click/tap the report and the whole script lands at once.
    const sc0 = this.el.end.querySelector('#nScript');
    if (sc0) sc0.style.cursor = 'pointer';
    this.el.end.onclick = (ev) => { if (ev.target.tagName === 'BUTTON') return; this._skipType = true; };
    this._skipType = false;
    this._typeScript(b.script, () => {
      const w = this.el.end.querySelector('#nWit'), sc = this.el.end.querySelector('#nScript');
      if (w && b.witness) {
        w.style.display = 'block'; w.style.marginTop = '4px';
        w.innerHTML = `${esc(b.witness.quote)}<b>— ${esc(b.witness.attrib)}</b>`;
        if (sc) sc.appendChild(w);   // lives INSIDE the script flow — can never collide with a typing line
      }
    });
    // the dynamic layer: a LAN language model rewrites the desk copy when reachable (offline-safe)
    const runId = this._tvRun;
    llmPunchUp(rep, b).then((out) => {
      if (!out || this._tvRun !== runId || this.el.end.style.display === 'none') return;
      const sat = this.el.end.querySelector('#nSat'), head = this.el.end.querySelector('#nHead');
      if (sat) sat.style.display = 'inline-flex';
      if (head && out.headline) { head.style.transition = 'opacity .18s'; head.style.opacity = '0'; setTimeout(() => { head.textContent = out.headline; head.style.opacity = '1'; }, 190); }
      const sc = this.el.end.querySelector('#nScript');
      if (sc && out.anchor) for (const line of out.anchor) {
        const d = document.createElement('div'); d.className = 'sline';
        d.innerHTML = `<span class="swho" style="background:var(--info)">DESK UPDATE</span>`;
        d.appendChild(document.createTextNode(line));
        sc.appendChild(d);
      }
      const w = this.el.end.querySelector('#nWit');
      if (w && out.witnessQuote) { w.style.display = 'block'; w.innerHTML = `${esc(out.witnessQuote)}<b>— witness statement, via the satellite desk</b>`; }
      try { this.game.audio.zap(980); } catch {}
    }).catch(() => {});
  }

  // typewriter for the anchor script — one line at a time, news-crawl cadence
  _typeScript(lines, onDone) {
    const sc = this.el.end.querySelector('#nScript'); if (!sc) return;
    const run = this._tvRun;
    let li = 0;
    const nextLine = () => {
      if (this._tvRun !== run || !sc.isConnected) return;
      if (li >= lines.length) { if (onDone) onDone(); return; }
      const L = lines[li++];
      const d = document.createElement('div');
      d.className = 'sline' + (L.who !== 'ANCHOR' ? ' field' : '');
      d.innerHTML = `<span class="swho">${esc(L.label || (L.who === 'ANCHOR' ? 'ANCHOR' : titleCase(L.who)))}</span><span class="stx"></span><span class="cursor"></span>`;
      sc.appendChild(d);
      const tx = d.querySelector('.stx'), cur = d.querySelector('.cursor');
      const text = L.text; let i = 0; let last = performance.now();
      const tick = (now) => {
        if (this._tvRun !== run || !sc.isConnected) return;
        const n = this._skipType ? text.length : Math.max(1, Math.round((now - last) / 11));   // ~90 chars/sec, or instant on click
        last = now; i = Math.min(text.length, i + n);
        tx.textContent = text.slice(0, i);
        if (i < text.length) requestAnimationFrame(tick);
        else { cur.remove(); setTimeout(nextLine, 200); }
      };
      requestAnimationFrame(tick);
    };
    nextLine();
  }

  // the TV: plays the crew's recorded clips in a loop with analog static between them
  _startTV(rep) {
    this._stopTV();
    const run = this._tvRun = (this._tvRun || 0) + 1;
    const cvs = this.el.end.querySelector('#nTv'); if (!cvs) return;
    const x = cvs.getContext('2d');
    const tag = this.el.end.querySelector('#nTvTag'), cap = this.el.end.querySelector('#nTvCap');
    const prog = this.el.end.querySelector('#nTvProg');
    const clips = rep.clips || [];
    let progN = -1;
    const syncProg = () => {   // one segment per clip; the live one fills as the playhead moves
      if (!prog) return;
      if (clips.length !== progN) { progN = clips.length; prog.innerHTML = clips.map(cl => `<i class="${cl.slow ? 'slow' : ''}"><b></b></i>`).join(''); }
    };
    syncProg();
    // static noise tile, redrawn with random offsets — reads as analog snow
    const noise = document.createElement('canvas'); noise.width = 160; noise.height = 90;
    const nx = noise.getContext('2d'); const nd = nx.createImageData(160, 90);
    for (let i = 0; i < nd.data.length; i += 4) { const v = (Math.random() * 255) | 0; nd.data[i] = nd.data[i + 1] = nd.data[i + 2] = v; nd.data[i + 3] = 255; }
    nx.putImageData(nd, 0, 0);
    const drawStatic = () => {
      x.imageSmoothingEnabled = false;
      x.drawImage(noise, (Math.random() * -40) | 0, (Math.random() * -30) | 0, 220, 130, 0, 0, 640, 360);
      x.imageSmoothingEnabled = true;
      x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(0, 0, 640, 360);
    };
    const load = (clip) => {
      if (clip._imgs) return clip._ready;
      clip._imgs = clip.frames.map((u) => { const im = new Image(); if (u && u[0] !== '#') im.src = u; return im; });   // '#enc…' = encoder never landed — leave it blank, drawImage skips incomplete images
      clip._ready = Promise.all(clip._imgs.map((im) => im.decode ? im.decode().catch(() => {}) : 0));
      return clip._ready;
    };
    let ci = 0, mode = clips.length ? 'static' : 'nosignal', t0 = performance.now(), prev = null;
    let ph = 0, prevT = 0, wasSlow = false;   // float playhead — KO clips glide into slow motion at the moment of impact
    if (!clips.length) { tag.textContent = 'NO SIGNAL'; cap.innerHTML = 'Awaiting crew footage — <b>KMK 9</b>'; }
    const begin = (i) => {
      ci = i % clips.length; mode = 'static'; t0 = performance.now();
      if (prev && prev !== clips[ci]) { prev._imgs = null; prev._ready = null; }   // keep one clip decoded at a time
      prev = clips[ci];
      load(clips[ci]);
      try { if (this.el.end.style.display !== 'none') this.game.audio.staticBurst(0.22); } catch {}
      tag.textContent = `REPLAY ${ci + 1}/${clips.length}`; tag.classList.remove('slow'); wasSlow = false;
      cap.innerHTML = `<b>${esc(clips[ci].title)}</b> · T+${esc(clips[ci].tLabel)} · cam ${esc(clips[ci].shotBy)}`;
    };
    const loop = (now) => {
      if (this._tvRun !== run || !cvs.isConnected) return;
      if (mode === 'nosignal') {
        drawStatic();
        if (clips.length) begin(0);                       // the last shot just wrapped behind the end screen — roll it
      } else if (mode === 'static') {
        drawStatic();
        const clip = clips[ci];
        if (now - t0 > 340 && clip && clip._imgs && clip._imgs[0] && clip._imgs[0].complete) { mode = 'play'; ph = 0; prevT = now; wasSlow = false; }
      } else {
        const clip = clips[ci];
        // slow-motion window: the exact moment of a KO / massive hit crawls at 0.38×, then back to speed
        const slowNow = !!(clip.slow && ph >= clip.slowFrom && ph <= clip.slowTo);
        const rate = slowNow ? 0.38 : 1;
        ph += (Math.min(now - prevT, 100) / 1000) * clip.fps * rate; prevT = now;
        syncProg();
        if (prog) { const segs = prog.children; for (let s = 0; s < segs.length; s++) { const bfill = segs[s].firstChild; if (bfill) bfill.style.width = s < ci ? '100%' : s === ci ? Math.min(100, (ph / clip.frames.length) * 100) + '%' : '0%'; } }
        if (slowNow !== wasSlow) {
          wasSlow = slowNow;
          tag.textContent = slowNow ? 'SLO-MO ▶' : `REPLAY ${ci + 1}/${clips.length}`;
          tag.classList.toggle('slow', slowNow);
        }
        const fi = Math.floor(ph);
        if (fi >= clip.frames.length) { begin(ci + 1); }
        else {
          const im = clip._imgs[fi];
          if (im && im.complete && im.naturalWidth) x.drawImage(im, 0, 0, 640, 360);
        }
      }
      this._tvRaf = requestAnimationFrame(loop);
    };
    if (clips.length) begin(0);
    this._tvRaf = requestAnimationFrame(loop);
  }
  _stopTV() {
    this._tvRun = (this._tvRun || 0) + 1;
    if (this._tvRaf) { cancelAnimationFrame(this._tvRaf); this._tvRaf = 0; }
  }
  hideEndScreen() { this._stopTV(); this.el.end.style.display = 'none'; this.el.end.classList.remove('news'); }

  flashScreen(color = '#ffffff', dur = 0.15) {
    const el = this.el.flash; if (!el) return;
    el.style.transition = 'none'; el.style.background = color; el.style.opacity = '0.5';
    requestAnimationFrame(() => { el.style.transition = `opacity ${dur}s ease-out`; el.style.opacity = '0'; });
  }

  // floating combat number at a world position. slash=true kicks OUTWARD-DOWN (offense reads
  // differently from the defensive popups, which float up).
  damageNumber(worldPos, text, color = '#fff', tag = false, slash = false) {
    if (this.dmgNumbersOff) return;
    if (this.el.dmg.childElementCount > 48) return;   // AoE storms don't get to drown the DOM
    if (!this.game.world) return;
    const sp = this.game.world.screenPosOf(worldPos.x, worldPos.y + 7, worldPos.z);
    if (sp.behind) return;
    const el = document.createElement('div'); el.className = 'dmg'; el.textContent = text;
    el.style.color = color; el.style.left = sp.x + 'px'; el.style.top = sp.y + 'px';
    const num = +text || parseInt(String(text).replace(/[^0-9]/g, ''), 10) || 0;   // "SLAM 18" sizes by the 18
    el.style.fontSize = (tag ? 16 : Math.min(38, 18 + num * 0.45)) + 'px';
    if (slash) { el.style.fontStyle = 'italic'; el.style.textShadow = '0 2px 5px rgba(0,0,0,.85), 0 0 12px rgba(255,90,74,.7)'; }
    this.el.dmg.appendChild(el);
    const dx = slash ? (36 + Math.random() * 26) * (Math.random() < 0.5 ? -1 : 1) : (Math.random() * 2 - 1) * 32;
    const dy = slash ? 30 : -46;
    const t0 = performance.now();
    const anim = (now) => { const k = (now - t0) / 720; if (k >= 1) { el.remove(); return; } el.style.transform = `translate(-50%,-50%) translate(${dx * k}px, ${dy * k}px)${slash ? ' rotate(-8deg)' : ''}`; el.style.opacity = String(1 - k * k); requestAnimationFrame(anim); };
    requestAnimationFrame(anim);
    while (this.el.dmg.children.length > 48) this.el.dmg.firstChild.remove();
  }

  // ---- Danger Room: live DPS meters floating over training dummies ----
  updateDpsMeters(g) {
    const on = g.modeId === 'training' && g.running;
    this._dpsEls = this._dpsEls || {};
    if (!on) { for (const id in this._dpsEls) { this._dpsEls[id].remove(); delete this._dpsEls[id]; } return; }
    for (const e of g.entities) {
      if (!e.isDummy) continue;
      let el = this._dpsEls[e.id];
      if (!el) {
        el = document.createElement('div'); el.className = 'dmg'; el.style.fontSize = '12px'; el.style.color = 'var(--info)';
        el.style.textAlign = 'center'; this.el.dmg.appendChild(el); this._dpsEls[e.id] = el;
      }
      const log = e._dmgLog || [];
      while (log.length && log[0].t < g.time - 3) log.shift();
      const dps = log.reduce((s, x) => s + x.a, 0) / 3;
      const sp = g.world.screenPosOf(e.pos.x, e.pos.y + 16, e.pos.z);
      el.style.left = sp.x + 'px'; el.style.top = sp.y + 'px';
      el.style.transform = 'translate(-50%,-50%)';
      el.style.display = sp.behind ? 'none' : 'block';
      el.textContent = dps > 0.5 ? `DPS ${dps.toFixed(0)} · Σ ${Math.round(e._dmgTotal || 0)}` : (e._dmgTotal ? `Σ ${Math.round(e._dmgTotal)}` : 'DPS —');
    }
  }

  combo(n) {
    const c = this.el.combo;
    if (n >= 2) { this.el.comboN.textContent = n; c.style.opacity = '1'; c.style.transform = 'translateX(-50%) scale(1.15)'; clearTimeout(this._ct); this._ct = setTimeout(() => { c.style.transform = 'translateX(-50%) scale(1)'; }, 90); }
    else c.style.opacity = '0';
  }

  setPaused(on) { this.el.paused.style.display = on ? 'flex' : 'none'; }

  buildSlots(def) {
    this.el.slots.innerHTML = '';
    this.slotEls = {};
    for (const { k, label } of SLOT_ORDER) {
      const a = def.abilities[k]; if (!a) continue;
      const d = document.createElement('div');
      d.className = 'slot' + (k === 'r' ? ' ult' : '');
      d.innerHTML = `<div class="key">${label}</div><div class="cost">${a.cost ? a.cost : a.kiPerSec ? a.kiPerSec + '/s' : ''}</div><div class="an">${a.name}</div><div class="cd" style="height:0%"></div><div class="cdn"></div>`;
      this.el.slots.appendChild(d);
      this.slotEls[k] = { root: d, cd: d.querySelector('.cd'), cost: d.querySelector('.cost'), cdn: d.querySelector('.cdn') };
    }
  }

  setPlayer(def) {
    this.el.name.textContent = def.name;
    this.el.role.textContent = def.title + ' · ' + def.role;
    this.buildSlots(def);
  }

  feed(text, color = 'var(--gold)') {
    const d = document.createElement('div'); d.textContent = text; d.style.color = color;
    this.el.feed.prepend(d); this.feedLines.push(d);
    setTimeout(() => { d.style.transition = 'opacity .5s'; d.style.opacity = '0'; setTimeout(() => d.remove(), 500); }, 2600);
    while (this.el.feed.children.length > 5) this.el.feed.lastChild.remove();
  }

  update() {
    const g = this.game, p = g.player; if (!p) return;
    this.el.hp.style.width = clamp(p.hp / p.maxHp * 100, 0, 100) + '%';
    this.el.ki.style.width = clamp(p.ki / p.maxKi * 100, 0, 100) + '%';
    // energy readability: amber when low, red pulse when critical, DRAINED tag after an all-in fizzle
    const kiFrac = p.ki / p.maxKi, drained = p.drainedT > 0;
    if (p.energyInfinite) {   // android core — the tank literally cannot move
      this.el.ki.classList.remove('crit', 'low'); this.el.kiState.classList.remove('on'); this.el.kiOver.classList.remove('on');
      if (this._infML !== p.id) { this._infML = p.id; this.el.kiState.textContent = '∞ CORE'; this.el.kiState.classList.add('on'); this.el.kiState.style.color = 'var(--info)'; }
    } else {
      if (this._infML) { this._infML = 0; this.el.kiState.textContent = 'DRAINED'; this.el.kiState.style.color = ''; }
      this.el.ki.classList.toggle('crit', drained || kiFrac < 0.15);
      this.el.ki.classList.toggle('low', !drained && kiFrac >= 0.15 && kiFrac < 0.38);
      this.el.kiState.classList.toggle('on', drained);
      // OVERDRIVE window: low tank + a real overdrive attribute → your fists are batteries right now
      this.el.kiOver.classList.toggle('on', !drained && (p.def.overdrive ?? 1) >= 0.7 && kiFrac < 0.25);
    }
    this.el.gd.style.width = clamp(p.guardMeter * 100, 0, 100) + '%';
    this.el.gd.classList.toggle('stagger', p.staggerT > 0);
    this.el.lvl.textContent = p.level;
    this.el.xp.style.width = clamp(p.level >= 10 ? 100 : p.xp / p.xpNext * 100, 0, 100) + '%';
    // power tier: badge changes + the whole meter panel physically WIDENS — a tier-3 bar is visibly bigger than tier-1
    if (this._tier !== p.tier) {
      this._tier = p.tier;
      this.el.tier.textContent = p.tier >= 4 ? 'MAX TIER' : 'TIER ' + ['', 'I', 'II', 'III'][p.tier];
      this.el.tier.className = 'tierb' + (p.tier > 1 ? ' t' + p.tier : '');
      this.el.plPanel.style.minWidth = (240 + (p.tier - 1) * 44) + 'px';
    }

    // ability cooldowns / states
    let charging = 0, maxCharge = 1;
    for (const { k } of SLOT_ORDER) {
      const se = this.slotEls?.[k]; if (!se) continue; const st = p.slots[k]; const def = st.def;
      const cdPct = def.cd ? clamp(st.cd / def.cd, 0, 1) * 100 : 0;
      se.cd.style.height = cdPct + '%';
      // (8) NUMERIC COOLDOWN — "2.4" beats guessing from a shrinking bar
      if (se.cdn) {
        const secs = st.cd > 0.05 ? (st.cd < 1 ? st.cd.toFixed(1) : Math.ceil(st.cd)) : '';
        if (se._cdn !== secs) { se._cdn = secs; se.cdn.textContent = secs; }
      }
      const broke = !!(def.cost && p.ki < def.cost);
      const dim = broke || st.cd > 0.01;
      se.root.classList.toggle('dim', !!dim);
      if (se.cost) se.cost.classList.toggle('nope', broke);   // cost turns red when unaffordable
      se.root.classList.toggle('on', !!(st.charging || st.active));
      if (st.charging) { charging = st.chargeT; maxCharge = def.maxCharge || 1.6; }
      if (st.active && st.active.charge01 != null) { charging = st.active.charge01; maxCharge = 1; }
    }
    if (charging > 0) { this.el.charge.style.display = 'block'; this.el.chargeI.style.width = clamp(charging / maxCharge * 100, 0, 100) + '%'; }
    else this.el.charge.style.display = 'none';

    // target health bar — the foe you're locked on / aiming at, only while visible
    let foe = null;
    if (g.hardLock && g.hardLock.alive && (!g.fov || (g.hardLock._vis || 1) > 0.35)) foe = g.hardLock;
    else if (g.lockTarget && g.lockTarget.alive) foe = g.lockTarget;
    if (foe && !foe.isDummy) {
      this.el.foe.style.display = 'block';
      const vil = g.police && g.police.wantedLevel(foe) > 0 ? '  ·  🚨 VILLAIN' : '';
      this.el.foeName.textContent = foe.name + '  ·  Lv' + foe.level + '  ·  ' + (foe.def.title || '') + vil;
      this.el.foeHp.style.width = clamp(foe.hp / foe.maxHp * 100, 0, 100) + '%';
    } else this.el.foe.style.display = 'none';
    // the wanted meter — the city has opinions about who hurts humans
    if (g.police) {
      const lvl = g.police.wantedLevel(p);
      // ⚠ the ladder runs to SIX now (feds → military → sanctioned LSW). Repeat counts must
      // never go negative — the old `3 - lvl` RangeError lives in memory as a warning.
      const txt = !lvl ? ''
        : lvl >= 6 ? `⚡ SANCTIONED ${'★'.repeat(6)}`
        : lvl === 5 ? `🪖 MARTIAL ${'★'.repeat(5)}`
        : lvl === 4 ? `🕶 FEDERAL ${'★'.repeat(4)}`
        : `🚨 WANTED ${'★'.repeat(lvl)}${'☆'.repeat(Math.max(0, 3 - lvl))}`;
      if (txt !== this._wantedTxt) {
        this._wantedTxt = txt;
        this.el.wanted.style.display = lvl ? 'block' : 'none'; this.el.wanted.textContent = txt;
        const prev = this._wantedLvl || 0;
        if (lvl > prev && g.audio && g.audio.sample) {
          g.audio.sample('sting.wanted', { bus: 'music', gain: 0.45 + lvl * 0.08, rate: 0.92 + lvl * 0.05 });
          this.flashScreen('rgba(90,160,255,0.5)', 0.12);
          this.el.wanted.classList.remove('lvlup'); void this.el.wanted.offsetWidth; this.el.wanted.classList.add('lvlup');
        } else if (!lvl && prev && g.audio && g.audio.sample) {
          g.audio.sample('sting.clear', { bus: 'music', gain: 0.5 });
          this.feed('Flag cleared — units standing down', '#7fb0d0');
        }
        this._wantedLvl = lvl;
      }
    }
    this.updateModeBar(g);
    this.updateKitWidget(p);
    this.updateDpsMeters(g);
    this.updateFoeArrow(g);
    this.updateTelemetry(g);
    this.updateAltitude(g, p);
    // radar (hidden at the title / while paused) + low-HP danger pulse
    const inMatch = !!(g.mode && g.running);
    this.el.radar.style.display = inMatch ? 'block' : 'none';
    this.updateRadar(g);
    // the theater nameplate — where in the world this fight is happening
    const plan = g.world && g.world.plan;
    const plateKey = inMatch && plan ? plan.name + plan.seed : '';
    if (plateKey !== this._plateKey) {
      this._plateKey = plateKey;
      if (!plateKey) this.el.city.style.display = 'none';
      else {
        this.el.city.style.display = 'block';
        this.el.city.innerHTML = `📍 <b>${esc(plan.name.toUpperCase())}</b> · ${esc(plan.country.toUpperCase())} — ${esc(plan.popLabel)}${plan.crime ? ` · CRIME ${plan.crime}` : ''}`;
      }
    }
    // the KMK 9 live monitor — visible while the field crew is ON AIR
    if (g.news) {
      if (!this._pipAdopted && g.news.canvas) { this.el.pip.appendChild(g.news.canvas); this._pipAdopted = true; }
      const onAir = inMatch && !g.matchOver && g.news.enabled && g.news.onAir;
      if (onAir !== this._pipOn) { this._pipOn = onAir; this.el.pip.style.display = onAir ? 'block' : 'none'; }
    }
    const hpFrac = p.hp / p.maxHp;
    this.el.danger.style.opacity = (inMatch && p.alive && hpFrac < 0.28) ? String(clamp(0.32 + Math.sin(performance.now() * 0.006) * 0.3, 0, 0.8)) : '0';
  }

  // ---------- Title / select ----------
  // ---- THE COLD OPEN --------------------------------------------------------------------
  // The home page opens the way a news hour opens: a monitor, a bug, a clock, a lower third and
  // a headline. The monitor plays REAL FOOTAGE — the clips the field crew actually captured in
  // your last match. With no footage yet it runs a broadcast test card, because a dead monitor
  // on a menu reads as broken rather than as "nothing has happened yet".
  _startColdOpen() {
    const cv = this.title.querySelector('#cdCv'); if (!cv) return;
    const ctx = cv.getContext('2d');
    const g = this.game;
    clearInterval(this._cdT);

    const clips = (g && g.news && g.news.clips) ? g.news.clips.filter(c => c && c.frames && c.frames.length) : [];
    const headlines = this._coldHeadlines();
    let hi = 0, ci = 0, fi = 0, tick = 0, staticFor = 0;
    const img = new Image();
    let imgReady = false;
    const loadFrame = () => {
      const live = clips.filter(c => !c._dead);
      const clip = live[ci % live.length]; if (!clip) return;
      imgReady = false;
      img.onload = () => { imgReady = true; };
      img.onerror = () => { clip._dead = true; imgReady = false; };   // a revoked blob kills the CLIP, not the console
      const _fu = clip.frames[fi % clip.frames.length];
      if (_fu && _fu[0] !== '#') img.src = _fu;
    };
    if (clips.length) loadFrame();

    // the test card, for when there is no footage
    const testCard = () => {
      const w = cv.width, h = cv.height;
      const bars = ['#5a5a5a', '#a8a020', '#20a0a8', '#20a020', '#a020a0', '#a02020', '#2020a0'];
      bars.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(i * w / bars.length, 0, w / bars.length + 1, h * 0.72); });
      ctx.fillStyle = '#0d0f14'; ctx.fillRect(0, h * 0.72, w, h * 0.28);
      ctx.fillStyle = '#8b8577'; ctx.font = '600 11px Cascadia Code, Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('KMK 9 — NO FOOTAGE ON FILE', w / 2, h * 0.86);
      ctx.font = '9px Cascadia Code, Consolas, monospace';
      ctx.fillText('FIGHT SOMETHING', w / 2, h * 0.93);
      ctx.textAlign = 'left';
    };

    const noise = (amount) => {
      // analogue snow, drawn sparsely so it costs nothing on a menu
      ctx.globalAlpha = amount;
      for (let i = 0; i < 220; i++) {
        ctx.fillStyle = Math.random() < 0.5 ? '#fff' : '#000';
        ctx.fillRect((Math.random() * cv.width) | 0, (Math.random() * cv.height) | 0, 2, 2);
      }
      ctx.globalAlpha = 1;
    };

    const draw = () => {
      tick++;
      ctx.fillStyle = '#0d0f14'; ctx.fillRect(0, 0, cv.width, cv.height);
      if (staticFor > 0) { staticFor--; noise(0.5); }
      else if (clips.length && imgReady) {
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        noise(0.05);                                  // a permanent light grain — it is a broadcast
      } else if (clips.length) { noise(0.4); }
      else { testCard(); noise(0.06); }

      // advance the footage at broadcast-ish speed
      if (clips.length && tick % 5 === 0) {
        fi++;
        const clip = clips[ci % clips.length];
        if (fi >= clip.frames.length) { fi = 0; ci++; staticFor = 6; }
        loadFrame();
      }
      // the in-world clock, if a world exists
      const cl = this.title.querySelector('#cdClock');
      if (cl && g && g.world && g.world.dayT != null) {
        const mins = Math.floor(g.world.dayT * 1440);
        cl.textContent = String(Math.floor(mins / 60)).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0');
      }
      // rotate the headline
      if (tick % 110 === 0 && headlines.length) {
        hi = (hi + 1) % headlines.length;
        const H = headlines[hi];
        const hEl = this.title.querySelector('#cdHead'), sEl = this.title.querySelector('#cdSub'), lEl = this.title.querySelector('#cdLower');
        if (hEl) { hEl.textContent = H.head; hEl.style.animation = 'none'; void hEl.offsetWidth; hEl.style.animation = ''; }
        if (sEl) sEl.textContent = H.sub;
        if (lEl) lEl.textContent = H.lower;
      }
    };
    this._cdT = setInterval(draw, 66);                // ~15fps; it is a menu, not a game
    if (headlines.length) {
      const H = headlines[0];
      const hEl = this.title.querySelector('#cdHead'), sEl = this.title.querySelector('#cdSub'), lEl = this.title.querySelector('#cdLower');
      if (hEl) hEl.textContent = H.head;
      if (sEl) sEl.textContent = H.sub;
      if (lEl) lEl.textContent = H.lower;
    }
    // the stat strip — real numbers off the book
    const st = this.title.querySelector('#cdStats');
    if (st) {
      try {
        const table = snapshotTable(ROSTER);
        const champ = championId();
        const top = table[0];
        const rows = [
          ['REGISTERED', String(ROSTER.length)],
          ['THEATERS', '1,050'],
          ['NATIONS', '168'],
          champ ? ['CHAMPION', (ROSTER.find(r => r.id === champ) || {}).name || '—'] : ['TOP RATED', top ? top.def.name : '—'],
        ];
        st.innerHTML = rows.map(([k, v]) => `<div><b>${esc(k)}</b><span>${esc(v)}</span></div>`).join('');
      } catch (e) { st.innerHTML = ''; }
    }
  }
  // Headlines built from the LIVE book, so the menu is reporting on your actual game.
  _coldHeadlines() {
    const out = [];
    try {
      const table = snapshotTable(ROSTER);
      const champ = championId();
      if (champ) {
        const c = ROSTER.find(r => r.id === champ);
        if (c) out.push({ head: c.name + ' HOLDS THE BELT', lower: 'THE INVITATIONAL — REIGNING CHAMPION',
          sub: 'The Treaty Office confirms ' + c.name + ' remains undefeated at the top of the sanctioned book.' });
      }
      const top = table[0];
      if (top) out.push({ head: top.def.name + ' LEADS THE BOOK', lower: 'ASCENDANT POWER RANKINGS',
        sub: 'Rated ' + Math.round(top.elo) + ' across ' + (top.rec.w + top.rec.l) + ' sanctioned bouts.' });
      const inc = recentIncidents ? recentIncidents(6) : [];
      for (const i of inc.slice(0, 3)) {
        if (!i || !i.text) continue;
        out.push({ head: String(i.text).toUpperCase().slice(0, 54), lower: 'FIELD REPORT', sub: i.sub || 'Continuing coverage.' });
      }
    } catch (e) { /* the book may be empty on a fresh install */ }
    if (!out.length) {
      out.push({ head: 'NO SANCTIONED BOUTS ON RECORD', lower: 'THE ASCENDANT REGISTRY',
        sub: 'Fifty-two registered weapons. One thousand and fifty cities. Nothing has happened yet.' });
    }
    out.push({ head: 'THE VILLAIN IS WHOEVER HURTS HUMANS', lower: 'TREATY OFFICE — STANDING NOTICE',
      sub: 'Collateral is tracked. Police response is set by the theater. Some nations shoot back.' });
    return out;
  }

  buildTitle(onStart) {
    // (10) OPEN WHERE YOU LEFT OFF — last hero, mode and format are restored from prefs
    const PF = this.prefs || {};
    let selMode = MODES.some(m => m.id === PF.mode) ? PF.mode : 'duel';
    let selP1 = ROSTER.find(r => r.id === PF.p1) || ROSTER[0];
    let selP2 = ROSTER[2], two = !!PF.two;
    if (PF.format) this._tFormat = PF.format;
    this.title.innerHTML = `
      <div class="topbar"><button id="tAtlas">🗺 Atlas</button><button id="tRank">📊 Rankings</button><button id="tNet">🌐 Online</button><button id="tTut">🎓 Tutorial</button><button id="tOpt">⚙ Options</button><button id="tHow">❓ How to Play</button></div>
      <div class="tag">Machine King Labs</div>
      <div class="colddesk" id="coldDesk">
        <div class="cdmon">
          <canvas id="cdCv" width="384" height="216"></canvas>
          <div class="cdbug"><b>KMK</b>9</div>
          <div class="cdlive"><i></i>LIVE</div>
          <div class="cdclock" id="cdClock">--:--</div>
          <div class="cdlower"><span id="cdLower">THE ASCENDANT REGISTRY</span></div>
          <div class="cdscan"></div>
        </div>
        <div class="cdside">
          <div class="cdkick">KMK 9 ACTION NEWS — CONTINUING COVERAGE</div>
          <div class="cdhead" id="cdHead">THE ASCENDANT REGISTRY</div>
          <div class="cdsub" id="cdSub">Fifty-two registered weapons. One thousand and fifty cities. Pick your fight.</div>
          <div class="cdstats" id="cdStats"></div>
        </div>
      </div>
      <h1><span class="t1">WAR WORLD</span><span class="t2">ASCENDANTS</span></h1>
      <div class="clsbar"><span class="clschip">TOP SECRET // THRESHOLD</span><span class="clsline">THRESHOLD TREATY OFFICE — ASCENDANT REGISTRY · INDEX COPY 7 OF 9 · COSMIC-EYES ONLY</span><span class="clschip">WWA-INDEX</span></div>
      <div class="term">&gt; QUERY: ASCENDANT INDEX — <b id="termCount"></b> · THEATER: <span class="thchip" id="termTheater" title="Open the City Atlas">${(() => { try { const t = this.theater; if (!t || t.flagship) return 'THE WHITE CITY'; if (t.gallery) return 'PROVING GROUND'; const c = cityList()[t.cityId]; return c ? c.name.toUpperCase() : 'THE WHITE CITY'; } catch { return 'THE WHITE CITY'; } })()}</span><span class="tcur">▍</span></div>
      <div class="modes" id="modes"></div>
      <div class="selwrap">
        <div class="preview" id="pv"></div>
        <div style="flex:1; display:flex; flex-direction:column; gap:12px;">
          <div class="ptabs" id="ptabs"></div>
          <div class="filters" id="filters"></div>
          <div class="roster" id="roster"></div>
          <button class="startbtn" id="startBtn">ENTER THE ARENA ▶</button>
          <div class="modehint" id="modehint"></div>
        </div>
      </div>`;
    const modesEl = this.title.querySelector('#modes'), roster = this.title.querySelector('#roster'), pv = this.title.querySelector('#pv'), ptabs = this.title.querySelector('#ptabs'), hintEl = this.title.querySelector('#modehint');
    const bar = (label, v, col, tip, ic) => `<div class="statrow"${tip ? ` title="${tip}"` : ''}><span class="sl">${ic ? icon(ic, 11) + ' ' : ''}${label}</span><span class="sb"><i style="width:${v * 10}%;background:${col}"></i></span><span class="sv">${v}</span></div>`;
    const renderPv = (c) => {
      const st = heroStats(c);
      pv.style.setProperty('--pc', c.colors.accent);
      const tc = THREAT_COLORS[c.threat] || 'var(--text-4)';
      const idn = identityOf(c);
      const facts = kitFacts(c);
      const fno = fileNoOf(c, ROSTER), synth = isSynthDef(c);
      const rec = recOf(c.id, c);
      const snap = snapshotTable(ROSTER), me = snap.find(r => r.id === c.id) || { rank: '—' };
      const incid = recentIncidents(c.id, ROSTER);
      pv.innerHTML = `<div class="sweep"></div><div class="stamp">CLASSIFIED</div>
        <div class="pvflip"><span id="pvPrev" title="Previous file (←)">‹</span><span id="pvNext" title="Next file (→)">›</span></div>
        <div class="dsh"><span>SUBJECT FILE <b>${fno}</b></span><span>OPENED <b>${fileDate(c.id)}</b></span></div>
        <div class="pvname" style="color:${c.colors.accent}">${c.name}</div>
        <div class="pvttl">${c.title} · ${c.role}</div>
        <div class="idrows">
          <div class="ir"><span class="ik">LEGAL NAME</span><span class="iv">${esc(idn.n)}</span></div>
          <div class="ir"><span class="ik">REGISTERED</span><span class="iv">${esc(idn.c)} · ${esc(idn.co)} ${idn.f}</span></div>
          <div class="ir"><span class="ik">STATUS</span><span class="iv ${synth ? 'opn' : 'act'}">● ${synth ? 'OPERATIONAL — SYNTHETIC' : 'ACTIVE IN THE FIELD'}</span></div>
        </div>
        <div class="pvblurb">${c.blurb}</div>
        <div class="frec">
          <span>PWR-IDX <b>${rec.elo}</b></span><span>RANK <b>#${me.rank}</b>/${snap.length}</span>
          <span>RECORD <b>${rec.w}–${rec.l}</b></span><span>KO <b>${rec.ko}</b>/${rec.kod}</span>
        </div>
        ${incid.length ? `<div class="incid">${incid.map(h => `<span class="${h.win ? 'iw' : 'il'}">${h.win ? '▲ def.' : '▼ lost to'} ${esc(h.vs)} · ${h.how === 'tournament' ? 'invitational' : h.how} · ${agoStr(h.t)}</span>`).join('')}</div>` : ''}
        <div class="glance">${facts.map(([ic, t, lead]) => `<span${lead ? ' class="lead"' : ''}>${icon(ic, 11)} ${t}</span>`).join('')}</div>
        ${c.threat ? `<div class="pvthreat" title="The LeFevre Threat Scale — the Treaty's official danger rating, Low → Extreme. Mixed matches are SUPPOSED to be lopsided; skill steals rounds, not physics." style="color:${tc};border-color:${tc}66;background:${tc}18">${icon('threat', 11)} LeFevre Threat · ${c.threat}</div>` : ''}
        <div class="pvcodex" id="pvCodex" title="The full Treaty case file — armament figures, countermeasures, the record">📁 OPEN FULL CASE FILE — ${fno}</div>
        <div class="pvstats" title="Hover any bar for what it means">
          ${bar('Power', st.power, '#ff6a4a', 'Heaviest single hit in the kit', 'power')}${bar('Strength', st.strength, '#e8a24a', 'Physical muscle — melee damage up, knockback given & resisted, faster ice break-outs', 'strength')}${bar('Range', st.range, 'var(--gold)', 'How far the kit reaches', 'range')}${bar('Mobility', st.mobility, 'var(--info)', 'Run speed + dashes + teleports', 'mobility')}
          ${bar('Defense', st.defense, 'var(--good)', 'How hard this hero is to put down — HP, phasing, thorns', 'defense')}${bar('Health', st.health, '#ff8a5a', 'Raw hit points', 'health')}${bar('Energy', st.energy, '#7fb0ff', 'Ki pool — every power spends it; run dry and you fizzle', 'energy')}
        </div>
        ${st.tags.length ? `<div class="pvtags">${st.tags.map(t => `<span>${t}</span>`).join('')}</div>` : ''}
        ${(() => {
          const at = deriveAttrs(c), tl = heroTalents(c);
          const rows = ATTR_DEFS.map(a => { const v = at[a.k], rc = rankColor(v); return `<div class="arow" title="${a.name} — ${a.does}. Rank ${v}/10 on the ladder (Civilian → Cosmic)."><span class="an2">${icon(ATTR_ICON[a.k], 11)} ${a.name}</span><span class="abar"><i style="width:${v * 10}%;background:${rc}"></i></span><span class="av">${v}</span><span class="arank" style="color:${rc};border-color:${rc}55;background:${rc}14">${rankName(v)}</span></div>`; }).join('');
          const ladder = `<div class="ladder" title="The rank ladder — every attribute sits on this one scale. Colors = rank tier.">${RANKS.slice(1).map((r, i) => `<i style="background:${r.c}" title="${i + 1} — ${r.n}"></i>`).join('')}<span>Civilian → Cosmic</span></div>`;
          const tals = tl.map(k => { const t = TALENTS[k]; return t ? `<span><b>${t.name}</b> — ${t.does}</span>` : ''; }).join('');
          const gear = (c.items || []).map(it => `<b>${it.name}</b>${it.charges ? ` ×${it.charges}` : ''}`).join(' · ');
          return `<div class="sheet"><div class="sh">§ Attribute Panel — Treaty Assessment</div>${ladder}${rows}</div>
            ${tals ? `<div class="sheet"><div class="sh">§ Documented Talents</div><div class="tals">${tals}</div></div>` : ''}
            ${gear ? `<div class="gear">⛭ Gear: ${gear} <span style="color:var(--text-5)">(X)</span></div>` : ''}`;
        })()}
        <div class="sheet" style="margin-top:12px;border-top:none;padding-top:0"><div class="sh">§ Known Armament / Observed Abilities</div></div>
        <div class="pvabil" style="margin-top:2px;border-top:none;padding-top:0">${SLOT_ORDER.filter(s => c.abilities[s.k]).map(s => { const a = c.abilities[s.k]; return `<div class="ab"><b style="color:${c.colors.accent}">${s.label}</b><span class="an">${a.name}</span><span class="ad">${describeAbility(a)}</span></div>`; }).join('')}
        ${c.evade ? `<div class="ab"><b style="color:${c.colors.accent}">2×TAP</b><span class="an">${c.evade.name || 'Evade'}</span><span class="ad">${describeEvade(c.evade)}</span></div>` : ''}
        ${(c.items || []).map(it => `<div class="ab"><b style="color:${c.colors.accent}">X</b><span class="an">${it.name}</span><span class="ad">carried gadget — no ki cost, cooldown only</span></div>`).join('')}</div>`;
      const pp = pv.querySelector('#pvPrev'), pn = pv.querySelector('#pvNext');
      if (pp) pp.onclick = () => flip(-1);
      if (pn) pn.onclick = () => flip(1);
      const cdx = pv.querySelector('#pvCodex');
      if (cdx) cdx.onclick = () => this.showCodex(c);
    };
    const renderTabs = () => {
      // TOURNAMENT: the tabs row becomes the FORMAT picker (the Invitational is a 1-pilot affair)
      if (selMode === 'tournament') {
        two = false;
        const tf = this._tFormat || (this._tFormat = '1v1');
        ptabs.innerHTML = [['1v1', '⚔ LONE WOLF 1v1'], ['2v2', '🤝 DUOS 2v2'], ['1v2', '🐺 UNDERDOG 1v2']]
          .map(([v, l]) => `<span class="pt${tf === v ? ' on' : ''}" data-tf="${v}">${l}</span>`).join('')
          + `<span style="font-size:var(--t-sm);color:var(--text-5)">8 seeds off the power board · team damage ON</span>`;
        ptabs.querySelectorAll('[data-tf]').forEach(el => el.onclick = () => { this._tFormat = el.dataset.tf; renderTabs(); });
        return;
      }
      const allow2 = selMode === 'duel' || selMode === 'rumble';
      if (!allow2) two = false;
      ptabs.innerHTML = `<span class="pt${!two ? ' on' : ''}" data-two="0">1 PLAYER</span>`
        + (allow2 ? `<span class="pt${two ? ' on' : ''}" data-two="1">2 PLAYERS</span>` : '')
        + (two ? `<span class="p2pick" id="p2pick">P2 ▸ <b style="color:${selP2.colors.accent}">${selP2.name}</b> ⟳</span><span style="font-size:var(--t-sm);color:var(--text-5)">P1 keyboard+mouse · P2 gamepad</span>` : '');
      ptabs.querySelectorAll('.pt').forEach(el => el.onclick = () => { two = el.dataset.two === '1'; renderTabs(); });
      const p2 = ptabs.querySelector('#p2pick'); if (p2) p2.onclick = () => { selP2 = ROSTER[(ROSTER.indexOf(selP2) + 1) % ROSTER.length]; renderTabs(); };
    };
    const renderModes = () => {
      modesEl.innerHTML = MODES.map(m => `<div class="modecard${m.id === selMode ? ' sel' : ''}" data-m="${m.id}" style="--mc:${m.accent}"><div class="mi">${m.icon}</div><div class="mn" style="color:${m.accent}">${m.name}</div><div class="mt">${m.tag}</div></div>`).join('');
      modesEl.querySelectorAll('.modecard').forEach(el => el.onclick = () => { selMode = el.dataset.m; renderModes(); hintEl.textContent = MODES.find(x => x.id === selMode).desc; renderTabs(); });
      hintEl.textContent = MODES.find(x => x.id === selMode).desc;
    };
    // ---- roster with filters / sort / search (52+ heroes need navigation) ----
    const filtersEl = this.title.querySelector('#filters');
    const fState = this._fState || (this._fState = { threat: 'ALL', flight: 'ANY', custom: false, q: '', sort: 'default' });
    const THREATS = ['ALL', 'Low', 'Moderate', 'High', 'Very High', 'Extreme'];
    const stCache = new Map(); const stOf = (c) => { if (!stCache.has(c.id)) stCache.set(c.id, heroStats(c)); return stCache.get(c.id); };
    const listNow = () => {
      let L = ROSTER.slice();
      if (fState.threat !== 'ALL') L = L.filter(c => c.threat === fState.threat);
      if (fState.flight === 'FLIERS') L = L.filter(c => (c.flightTier ?? 3) > 0);
      if (fState.flight === 'GROUNDED') L = L.filter(c => (c.flightTier ?? 3) === 0);
      if (fState.custom) L = L.filter(c => c.isCustom);
      if (fState.q) { const q = fState.q.toLowerCase(); L = L.filter(c => (c.name + ' ' + (c.title || '') + ' ' + (c.role || '')).toLowerCase().includes(q)); }
      const T = { Low: 0, Moderate: 1, High: 2, 'Very High': 3, Extreme: 4 };
      if (fState.sort === 'name') L.sort((a, b) => a.name.localeCompare(b.name));
      else if (fState.sort === 'threat') L.sort((a, b) => (T[b.threat] ?? -1) - (T[a.threat] ?? -1));
      else if (fState.sort === 'power') L.sort((a, b) => stOf(b).power - stOf(a).power);
      else if (fState.sort === 'hp') L.sort((a, b) => b.hp - a.hp);
      else if (fState.sort === 'spd') L.sort((a, b) => b.speed - a.speed);
      return L;
    };
    let cards = [], list = [];
    const select = (c, cardEl) => {
      selP1 = c; this.selectedHero = c.id;
      roster.querySelectorAll('.rcard').forEach(e => e.classList.remove('sel'));
      if (cardEl) cardEl.classList.add('sel');
      renderPv(c);
    };
    this.selectedHero = selP1.id;
    const flip = (d) => {
      if (!list.length) return;
      const i = Math.max(0, list.indexOf(selP1)), n = (i + d + list.length) % list.length;
      select(list[n], cards[n]);
      if (cards[n]) cards[n].scrollIntoView({ block: 'nearest' });
    };
    const mkCard = (c) => {
      const card = document.createElement('div');
      card.className = 'rcard';
      card.style.setProperty('--pc', c.colors.accent);
      const cs = stOf(c), tc = THREAT_COLORS[c.threat] || 'var(--text-4)';
      card.style.setProperty('--tc', tc);
      const synth = isSynthDef(c);
      card.innerHTML = `<div class="fhead"><span class="fno">${fileNoOf(c, ROSTER)}</span><span class="fst${synth ? ' op' : ''}">● ${synth ? 'OPERATIONAL' : 'ACTIVE'}</span></div>`
        + `<span class="dot"></span><div class="nm">${c.name} <span class="cflag">${identityOf(c).f || ''}</span></div><div class="rl">${c.role}</div><div class="cstat">HP <b>${c.hp}</b> · PWR <b>${cs.power}</b> · <span style="color:${tc}">${c.threat || '—'}</span></div>`
        + `<div class="frow"><span class="felo">PWR-IDX <b>${recOf(c.id, c).elo}</b></span><span class="fbar"></span></div>`
        + (c.isCustom ? `<span class="cchip">CUSTOM</span><span class="cedit" title="Edit in ORIGIN">✎</span>` : '');
      card.onmouseenter = () => renderPv(c);
      card.onclick = () => select(c, card);
      card.ondblclick = () => onStart({ mode: selMode, p1: selP1.id, p2: selP2.id, twoPlayer: two, format: this._tFormat || '1v1' });
      const ed = card.querySelector('.cedit');
      if (ed) ed.onclick = (ev) => { ev.stopPropagation(); this.onEditCustom && this.onEditCustom(c); };
      return card;
    };
    const renderFilters = () => {
      filtersEl.innerHTML = `<span class="flab">FILTER //</span>` + THREATS.map(t => `<span class="fc${fState.threat === t ? ' on' : ''}" data-th="${t}">${t}</span>`).join('')
        + ['ANY', 'FLIERS', 'GROUNDED'].map(fl => `<span class="fc${fState.flight === fl ? ' on' : ''}" data-fl="${fl}">${fl === 'ANY' ? '✈ ANY' : fl}</span>`).join('')
        + `<span class="fc${fState.custom ? ' on' : ''}" data-cu="1">CUSTOM</span>`
        + `<select id="fSort"><option value="default">SORT: ROSTER</option><option value="name">NAME</option><option value="threat">THREAT</option><option value="power">POWER</option><option value="hp">HP</option><option value="spd">SPEED</option></select>`
        + `<input id="fQ" placeholder="QUERY INDEX…" value="${fState.q}"><span class="cnt" id="fCnt"></span>`;
      filtersEl.querySelector('#fSort').value = fState.sort;
      filtersEl.querySelectorAll('[data-th]').forEach(c => c.onclick = () => { fState.threat = c.dataset.th; renderFilters(); renderRoster(); });
      filtersEl.querySelectorAll('[data-fl]').forEach(c => c.onclick = () => { fState.flight = c.dataset.fl; renderFilters(); renderRoster(); });
      filtersEl.querySelector('[data-cu]').onclick = () => { fState.custom = !fState.custom; renderFilters(); renderRoster(); };
      filtersEl.querySelector('#fSort').onchange = (e) => { fState.sort = e.target.value; renderRoster(); };
      const q = filtersEl.querySelector('#fQ'); q.oninput = () => { fState.q = q.value; renderRoster(); };
    };
    const renderRoster = () => {
      list = listNow();
      roster.innerHTML = '';
      cards = list.map(c => { const el = mkCard(c); roster.appendChild(el); return el; });
      // the forge card — ORIGIN entry point
      const forge = document.createElement('div');
      forge.className = 'rcard forge';
      forge.innerHTML = `<div class="fplus">＋</div><div class="nm">FORGE NEW</div><div class="rl">ORIGIN</div><div class="cstat">Point-buy your own superweapon</div>`;
      forge.onclick = () => this.onForge && this.onForge();
      roster.appendChild(forge);
      const cnt = filtersEl.querySelector('#fCnt'); if (cnt) cnt.textContent = list.length + ' / ' + ROSTER.length + ' FILES';
      const tc2 = this.title.querySelector('#termCount'); if (tc2) tc2.textContent = `${list.length} ACTIVE FILE${list.length === 1 ? '' : 'S'}`;
      if (!list.includes(selP1)) selP1 = list[0] || ROSTER[0];
      const idx = list.indexOf(selP1);
      if (idx >= 0) cards[idx].classList.add('sel');
      renderPv(selP1);
    };
    // keyboard: arrows move the highlight, Enter enters the arena
    if (this._titleNavBound) removeEventListener('keydown', this._titleNavBound);
    this._titleNavBound = (e) => {
      if (!this.titleOpen || this.overlayOpen()) return;
      const ae = document.activeElement; if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'SELECT')) return;
      const idx = Math.max(0, list.indexOf(selP1));
      let n = null;
      if (e.code === 'ArrowRight') n = idx + 1; else if (e.code === 'ArrowLeft') n = idx - 1;
      else if (e.code === 'ArrowDown') n = idx + 5; else if (e.code === 'ArrowUp') n = idx - 5;
      else if (e.code === 'Enter') { onStart({ mode: selMode, p1: selP1.id, p2: selP2.id, twoPlayer: two, format: this._tFormat || '1v1' }); return; }
      else return;
      e.preventDefault();
      if (list.length) { n = Math.max(0, Math.min(list.length - 1, n)); select(list[n], cards[n]); cards[n].scrollIntoView({ block: 'nearest' }); }
    };
    addEventListener('keydown', this._titleNavBound);
    // top bar
    this.title.querySelector('#tOpt').onclick = () => this.showOptions();
    this.title.querySelector('#tHow').onclick = () => this.showHowto();
    this.title.querySelector('#tTut').onclick = () => this.onTutorial && this.onTutorial();
    this.title.querySelector('#tNet').onclick = () => this.showOnline();
    this.title.querySelector('#tRank').onclick = () => this.showRankings();
    this.title.querySelector('#tAtlas').onclick = () => this.showAtlas();
    const thc = this.title.querySelector('#termTheater'); if (thc) thc.onclick = () => this.showAtlas();
    renderFilters(); renderRoster(); renderModes(); renderTabs();
    this.title.querySelector('#startBtn').onclick = () => onStart({ mode: selMode, p1: selP1.id, p2: selP2.id, twoPlayer: two, format: this._tFormat || '1v1' });
  }

  showTitle() { this.titleOpen = true; this._startColdOpen(); this.title.style.display = 'flex'; this.title.style.visibility = 'visible'; this.title.style.opacity = '1'; }
  hideTitle() { clearInterval(this._cdT); this._cdT = null; this.titleOpen = false; this.title.style.opacity = '0'; setTimeout(() => { this.title.style.display = 'none'; }, 250); this.title.style.transition = 'opacity .25s'; }
}
