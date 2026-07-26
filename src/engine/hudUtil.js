// THE HUD's SHARED HELPERS — extracted from hud.js (code review item 4, "shared kit helpers
// extracted first"). Escaping, the registry paperwork (file numbers, deterministic file dates),
// the case-file row builders, and the ability describers.
//
// These are used by the codex, the title screen, the broadcast and the in-match HUD alike, so
// they live on their own and every screen imports them. That is what makes splitting the screens
// possible without a circular import.
import { SLOT_ORDER } from '../data/characters.js';
import { visLine, visOf } from '../data/visual.js';
import { identityOf } from '../data/identities.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function flagCC(flag) {
  const cps = [...String(flag || '')].map((c) => c.codePointAt(0)).filter((c) => c >= 0x1F1E6 && c <= 0x1F1FF);
  return cps.length >= 2 ? String.fromCharCode(65 + cps[0] - 0x1F1E6, 65 + cps[1] - 0x1F1E6) : 'XX';
}

export function fileNoOf(c, roster) {
  const i = roster.indexOf(c);
  return `LSW-${String((i < 0 ? 98 : i) + 1).padStart(3, '0')}-${c.isCustom ? 'CX' : flagCC(identityOf(c).f)}`;
}

export function fileDate(id) {
  let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `${2019 + h % 7}-${String(1 + (h >> 3) % 12).padStart(2, '0')}-${String(1 + (h >> 7) % 28).padStart(2, '0')}`;
}

export function agoStr(t) {
  const s = (Date.now() - t) / 1000;
  if (s < 90) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export const isSynthDef = (c) => /unit|lab-grown|synthezoid|war engine|synthetic/i.test((identityOf(c).n || ''));

export function cfAbilityRows(def) {
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
    // THE VISUAL CONTRACT (Phase Zero): the seven traits, derived — what a witness would
    // actually be able to describe. It rides the case file so the look can't drift from the data.
    const vp = visOf(a);
    if (vp) notes.push('SEEN AS: ' + visLine(vp).toUpperCase());
    return { slot: s.label, name: a.name, kind: a.type.toUpperCase(), dmg, cost, cd, reach, notes: notes.join(' · '), ult: s.k === 'r', vis: vp };
  });
}

export function cfCounterNotes(def) {
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

export const CF_BUILD = ['—', 'FRAIL', 'LIGHT', 'LIGHT', 'STANDARD', 'STANDARD', 'CONDITIONED', 'POWERFUL', 'HEAVY', 'SUPERHEAVY', 'IRRESISTIBLE'];

export function describeEvade(ev) {
  switch (ev.kind) {
    case 'blink': return 'short teleport in the tapped direction (i-frames)';
    case 'sprint': return 'speed surge for ~' + (ev.dur || 1.5) + 's';
    case 'slide': return 'long frictionless slide (i-frames)';
    case 'phase': return 'slip through attacks while dashing (long i-frames)';
    case 'leap': return 'huge parabolic jump — clears buildings';
    default: return 'burst dash with i-frames';
  }
}

export function describeAbility(a) {
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

// =================================================================================================
// SLOT FACTS — what an ability IS, before you fire it.
//
// Robert: *"selecting attacks is tough, and I can't tell what an attack does until I use it. The
// names of many attacks don't really say what it does — don't know if it's a projectile or something
// different."*
//
// He is right and the fix costs nothing, because the answer is already in the data: `visOf` resolves
// a delivery SHAPE for every ability in the game and `describeAbility` already writes the sentence.
// The slot chip was showing the name and throwing both away.
//
// ⚠ ONE FUNCTION, so the chip, the tooltip and any future surface cannot disagree about what a power
// is. Same law as the damage codex: a surface is only "derived from the engine" if it reads what the
// engine reads.
// ⚠ GLYPHS ARE GEOMETRY, NOT EMOJI. These render at 9px inside a chip; an emoji is a colour image at
// the mercy of the platform font (Windows draws flag emoji as letter pairs — already paid for once).
const SHAPE_GLYPH = {
  hose: '═', ray: '═', torrent: '═',            // a beam is a line you hold
  bolt: '◆', orb: '◆', card: '◆', blade: '◆',   // a thing that flies
  cone: '◣', burst: '◉', field: '▦', dome: '◠',
  fist: '✕', claw: '✕',                          // contact
  mine: '◇', trap: '◇',
  drone: '❖', construct: '❖',
  self: '◎', aura: '◎',
};
const TYPE_GLYPH = {
  beam: '═', projectile: '◆', volley: '◆', charge: '◆', growingorb: '◆', meteor: '◆', facebomb: '◆',
  rifle: '▪', bow: '▪', quiver: '▪',
  cone: '◣', nova: '◉',
  melee: '✕', rush: '✕', tentacle: '✕', grapple: '✕',
  mine: '◇', portal: '◇',
  summon: '❖', construct: '❖',
  buff: '◎', phase: '◎', teleport: '»', dash: '»',
};
const KIND_WORD = {
  '═': 'BEAM', '◆': 'PROJECTILE', '▪': 'FIREARM', '◣': 'CONE', '◉': 'BLAST',
  '✕': 'MELEE', '◇': 'TRAP', '❖': 'SUMMON', '◎': 'SELF', '▦': 'FIELD', '◠': 'BARRIER', '»': 'MOVE',
};

/** Reach in world units, from whatever field the ability actually uses. */
function reachOf(a) {
  if (a.reach) return a.reach;                                  // melee
  if (a.range) return a.range;                                  // grapple, mindcontrol
  if (a.maxLen) return a.maxLen;                                // beam
  if (a.speed) return a.speed * (a.life != null ? a.life : 1.2); // anything that flies
  if (a.radius) return a.radius;
  return 0;
}
// ⚠ A WORD, NOT A NUMBER — the house rule. "FAR" is a decision; "228u" is arithmetic the player has
// to do mid-fight. The edges are the same altitude/reach bands the rest of the game already uses.
const rangeWord = (u) => u <= 0 ? 'SELF' : u < 20 ? 'CLOSE' : u < 70 ? 'MID' : u < 180 ? 'LONG' : 'FAR';

export function slotFacts(a, visOf) {
  if (!a) return null;
  const v = (typeof visOf === 'function' && visOf(a)) || null;
  const glyph = (v && SHAPE_GLYPH[v.shape]) || TYPE_GLYPH[a.type] || '◆';
  const u = reachOf(a);
  return {
    glyph,
    kind: KIND_WORD[glyph] || 'POWER',
    range: rangeWord(u),
    units: Math.round(u),
    hold: !!(a.charge || a.kiPerSec || a.sustain),
    tip: null,     // filled by the caller, which has describeAbility in scope
  };
}
