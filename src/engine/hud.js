// Living Superweapon — DOM HUD + character-select screen.
import { ROSTER, SLOT_ORDER } from '../data/characters.js';
import { DTYPES, DTYPE_INFO, resistOf } from './entity.js';
import { MODES } from '../data/modes.js';
import { clamp, TAU } from '../core/util.js';
import { ATTR_DEFS, TALENTS, deriveAttrs, heroTalents, rankName, rankColor, RANKS } from '../data/ranks.js';
import { SETTINGS, saveSettings, applySettings, KEYMAPS, keymap } from '../core/settings.js';
import { identityOf } from '../data/identities.js';
import { icon, ATTR_ICON, ICON_MEANING } from './icons.js';
import { writeBroadcast, tapeRows, llmPunchUp, titleCase, money, causeLine, mulberry } from '../data/news.js';
import { recOf, snapshotTable, rankingTable, recentIncidents, championId, tournamentNo } from '../data/rankings.js';
import { cityList } from '../data/cities.js';
import { generatePlan, thresholdPlan, galleryPlan, TILE_INFO, popLabel } from '../data/cityplan.js';

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

const CSS = `
#hud .wrap{ position:absolute; inset:0; }
#hud .vignette{ position:absolute; inset:0; pointer-events:none; background:radial-gradient(125% 105% at 50% 44%, transparent 52%, rgba(0,0,0,.28) 82%, rgba(0,0,0,.62) 100%); z-index:0; }
#hud .radar{ position:absolute; top:16px; right:18px; width:152px; height:152px; padding:0; border-radius:var(--r-3); overflow:hidden; }
#hud .radar canvas{ display:block; width:152px; height:152px; }
#hud .radar .rlab{ position:absolute; top:6px; left:9px; font-size:var(--t-tiny); letter-spacing:.2em; color:#9a9384; text-transform:uppercase; z-index:2; }
#hud .hitring{ position:absolute; inset:0; pointer-events:none; z-index:5; overflow:hidden; }
#hud .hitarc{ position:absolute; width:360px; height:360px; transform:translate(-50%,-50%); border-radius:50%; background:radial-gradient(circle, rgba(255,52,34,.5), rgba(255,52,34,.16) 45%, transparent 70%); opacity:.95; transition:opacity .55s ease-out; }
#hud .danger{ position:absolute; inset:0; pointer-events:none; z-index:1; opacity:0; background:radial-gradient(115% 100% at 50% 50%, transparent 56%, rgba(190,16,16,.44) 100%); transition:opacity .2s linear; }
#hud .kobanner{ position:absolute; left:50%; top:34%; transform:translateX(-50%) scale(.55); opacity:0; text-align:center; pointer-events:none; z-index:6; transition:opacity .12s ease, transform .2s cubic-bezier(.2,1.6,.4,1); }
#hud .kobanner .kob{ font-family:'Rajdhani','Inter',sans-serif; font-weight:800; font-size:118px; line-height:.82; letter-spacing:.05em; color:#fff; text-shadow:0 6px 0 #7a0d05, 0 0 44px rgba(255,90,40,.75); }
#hud .kobanner .kos{ font-size:16px; letter-spacing:.32em; text-transform:uppercase; color:var(--gold-pale); margin-top:6px; }
#hud .panel{ position:absolute; background:rgba(8,10,16,.55); border:1px solid rgba(255,255,255,.10); border-radius:var(--r-3); backdrop-filter:blur(4px); }
#hud .pl{ left:18px; bottom:18px; padding:12px 14px; min-width:240px; }
#hud .pl .nm{ font-weight:800; font-size:20px; letter-spacing:.04em; }
#hud .pl .rl{ font-size:var(--t-sm); text-transform:uppercase; letter-spacing:.16em; color:var(--text-4); margin-bottom:8px; }
#hud .bar{ height:12px; border-radius:var(--r-2); background:rgba(0,0,0,.5); overflow:hidden; margin-top:6px; box-shadow:inset 0 0 0 1px rgba(255,255,255,.08); }
#hud .bar > i{ display:block; height:100%; width:50%; border-radius:var(--r-2); transition:width .09s linear; }
#hud .hpF{ background:linear-gradient(90deg,var(--danger),#ff9a3a); }
#hud .kiF{ background:linear-gradient(90deg,#3aa0ff,var(--info)); }
#hud .kiF.low{ background:linear-gradient(90deg,#f5a21a,var(--gold-pale)); }
#hud .kiF.crit{ background:linear-gradient(90deg,var(--danger),#ff9a3a); animation:kipulse .45s infinite; }
@keyframes kipulse{ 50%{ filter:brightness(1.7); } }
#hud .bar.kiflash{ box-shadow:0 0 16px rgba(255,90,74,.95), inset 0 0 0 1px rgba(255,110,90,.95); }
#hud .kistate{ color:var(--danger-2); font-weight:800; letter-spacing:.14em; margin-left:8px; opacity:0; transition:opacity .15s; }
#hud .kistate.on{ opacity:1; animation:kipulse .45s infinite; }
#hud .kiover{ color:var(--info); font-weight:800; letter-spacing:.14em; margin-left:8px; opacity:0; transition:opacity .15s; }
#hud .kiover.on{ opacity:1; text-shadow:0 0 10px rgba(127,230,255,.8); }
#title .pvthreat{ display:inline-block; font-size:var(--t-label); font-weight:800; letter-spacing:.14em; text-transform:uppercase; padding:3px 10px; border-radius:var(--r-pill); margin-top:8px; border:1px solid; }
#title .sheet{ margin-top:12px; border-top:1px solid rgba(255,255,255,.1); padding-top:10px; }
#title .sheet .sh{ font-size:var(--t-tiny); letter-spacing:.22em; color:var(--text-5); text-transform:uppercase; margin-bottom:6px; }
#title .arow{ display:flex; align-items:center; gap:7px; font-size:var(--t-sm); margin-bottom:3px; }
#title .arow .an2{ width:70px; color:var(--text-4); letter-spacing:.06em; text-transform:uppercase; font-size:var(--t-label); }
#title .arow .av{ width:14px; text-align:right; font-weight:800; color:var(--text); }
#title .arow .arank{ font-size:var(--t-tiny); font-weight:800; letter-spacing:.08em; text-transform:uppercase; padding:1px 7px; border-radius:var(--r-2); border:1px solid; }
#title .arow .abar{ flex:1; height:5px; background:rgba(0,0,0,.45); border-radius:var(--r-1); overflow:hidden; }
#title .arow .abar i{ display:block; height:100%; border-radius:var(--r-1); }
#title .tals{ margin-top:8px; display:flex; flex-wrap:wrap; gap:5px; }
#title .tals span{ font-size:var(--t-label); padding:3px 9px; border-radius:var(--r-4); background:rgba(127,230,255,.1); color:#a8dcff; border:1px solid rgba(127,230,255,.28); }
#title .tals span b{ color:#e0f2ff; }
#title .gear{ margin-top:8px; font-size:var(--t-sm); color:var(--text-2); }
#title .gear b{ color:var(--gold); }
#hud .slot.deny{ animation:slotshake .32s; }
#hud .slot.deny{ border-color:var(--danger); box-shadow:0 0 12px rgba(255,90,74,.5); }
@keyframes slotshake{ 0%,100%{transform:translateX(0)} 22%{transform:translateX(-4px)} 55%{transform:translateX(3px)} 80%{transform:translateX(-2px)} }
#hud .slot .cost.nope{ color:#ff7a6a; font-weight:800; }
#hud .lab{ font-size:var(--t-label); letter-spacing:.14em; color:var(--text-5); text-transform:uppercase; margin-top:8px; }
#hud .slots{ left:50%; transform:translateX(-50%); bottom:16px; display:flex; gap:8px; padding:10px; }
#hud .slot{ width:66px; height:66px; border-radius:var(--r-3); background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.10); position:relative; overflow:hidden; display:flex; flex-direction:column; justify-content:flex-end; padding:6px; }
#hud .slot .key{ position:absolute; top:4px; left:6px; font-size:var(--t-sm); font-weight:800; color:var(--gold); letter-spacing:.06em; }
#hud .slot .cost{ position:absolute; top:4px; right:6px; font-size:var(--t-label); color:#7fbfff; }
#hud .slot .an{ font-size:var(--t-label); line-height:1.05; color:var(--text); font-weight:600; }
#hud .slot .cd{ position:absolute; left:0; right:0; bottom:0; background:rgba(0,0,0,.62); height:0%; transition:height .05s linear; }
#hud .slot .cdn{ position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  font-family:var(--f-mono); font-size:var(--t-lg); font-weight:700; color:var(--gold-pale); text-shadow:0 2px 6px #000; pointer-events:none; }
#hud .slot.ult{ border-color:rgba(245,178,26,.5); box-shadow:0 0 16px rgba(245,178,26,.25); }
#hud .slot.dim{ opacity:.4; }
#hud .slot.on{ border-color:var(--gold); box-shadow:0 0 16px rgba(255,210,74,.5); }
#hud .slot.sel{ outline:2px solid var(--info); outline-offset:2px; }   /* wheel-selected power */
#hud .foe{ left:50%; transform:translateX(-50%); top:16px; width:min(520px,60vw); padding:8px 12px; text-align:center; }
#hud .foe .fn{ font-weight:700; letter-spacing:.06em; font-size:var(--t-md); }
#hud .foe .bar{ height:9px; }
#hud .foe .fhpF{ background:linear-gradient(90deg,var(--danger),#ffb03a); }
#hud .hint{ right:18px; bottom:18px; padding:10px 12px; max-width:260px; font-size:var(--t-body); color:var(--text-3); line-height:1.6; transition:opacity .4s ease, transform .4s ease; }
#hud .hint b{ color:var(--gold); font-weight:700; }
#hud .hint .hgrp{ margin-bottom:7px; }
#hud .hint .hgt{ font-family:var(--f-mono); font-size:var(--t-micro); letter-spacing:var(--tr-wider); color:var(--info);
  border-bottom:1px solid rgba(127,230,255,.22); padding-bottom:2px; margin-bottom:3px; }
#hud .hint .hgr{ display:flex; gap:8px; line-height:1.35; }
#hud .hint .hgr b{ flex:0 0 92px; text-align:right; font-size:var(--t-label); }
#hud .hint .hgr span{ color:var(--text-3); font-size:var(--t-label); }
/* the wall of text earns its place for ~18s, then gets out of the way (F1 brings it back) */
#hud .hint.mini{ max-width:none; padding:6px 11px; font-size:var(--t-label); letter-spacing:.14em; color:var(--text-5); }
#hud .hint.mini .hintbody{ display:none; }
#hud .hint .hintchip{ display:none; white-space:nowrap; }
#hud .hint.mini .hintchip{ display:block; }
#hud .hint .hintchip b{ color:var(--gold); }
/* off-screen target arrow — the fight can hide from you now, so point at it */
#hud .foearrow{ position:absolute; width:0; height:0; pointer-events:none; z-index:6; opacity:0; transition:opacity .2s; }
#hud .foearrow i{ position:absolute; left:-13px; top:-13px; width:26px; height:26px; border-radius:50%; background:rgba(255,90,74,.16); border:1.5px solid rgba(255,90,74,.85); box-shadow:0 0 14px rgba(255,90,74,.45); }
#hud .foearrow u{ position:absolute; left:-5px; top:-24px; width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent; border-bottom:11px solid var(--danger); transform-origin:5px 17px; }
#hud .foearrow span{ position:absolute; left:16px; top:-8px; font-size:var(--t-label); font-weight:800; letter-spacing:.1em; color:var(--danger-2); text-shadow:0 1px 3px #000; white-space:nowrap; }
#hud .foearrow.on{ opacity:.95; }
#hud .charge{ left:50%; transform:translateX(-50%); bottom:96px; width:280px; height:10px; display:none; }
#hud .charge > i{ background:linear-gradient(90deg,var(--gold),#ff5a2a); }
#hud .feed{ left:18px; top:16px; padding:6px 10px; font-size:var(--t-body); color:#cbb; display:flex; flex-direction:column; gap:2px; background:transparent; border:none; }
#hud .feed div{ opacity:.9; }
/* select screen additions */
#title .selwrap{ display:flex; gap:22px; align-items:stretch; max-width:1080px; width:100%; }
#title .preview{ flex:0 0 300px; text-align:left; border:1px solid rgba(255,255,255,.12); border-radius:var(--r-4); padding:18px; background:rgba(255,255,255,.03); display:flex; flex-direction:column; }
#title .preview .pvname{ font-size:30px; font-weight:800; letter-spacing:.03em; }
#title .preview .pvttl{ font-size:var(--t-body); letter-spacing:.2em; text-transform:uppercase; color:var(--gold-pale); margin:2px 0 12px; }
#title .preview .pvblurb{ font-size:var(--t-lg); color:var(--text-2); line-height:1.5; }
#title .preview .pvsig{ margin-top:12px; display:flex; flex-direction:column; gap:6px; }
#title .preview .pvsig span{ font-size:var(--t-body); color:var(--text); background:rgba(255,255,255,.05); border-radius:var(--r-2); padding:5px 8px; border-left:3px solid var(--pc,var(--gold)); }
#title .rcard.sel{ border-color:var(--pc); background:rgba(255,255,255,.09); box-shadow:0 0 22px -6px var(--pc); transform:translateY(-3px); }
#title .rcard .rl{ margin-top:2px; }
#title .rcard .cstat{ font-size:var(--t-label); color:var(--text-5); margin-top:4px; letter-spacing:.04em; }
#title .rcard .cstat b{ color:#e8c39a; }
#title .preview{ flex:0 0 350px; max-height:70vh; overflow-y:auto; }
#title .pvstats{ margin-top:14px; display:flex; flex-direction:column; gap:5px; }
#title .statrow{ display:flex; align-items:center; gap:8px; font-size:var(--t-sm); }
#title .statrow .sl{ width:78px; color:var(--text-4); letter-spacing:.1em; text-transform:uppercase; }
#title .statrow .sb{ flex:1; height:8px; background:rgba(0,0,0,.45); border-radius:var(--r-1); overflow:hidden; box-shadow:inset 0 0 0 1px rgba(255,255,255,.08); }
#title .statrow .sb > i{ display:block; height:100%; border-radius:var(--r-1); transition:width .25s ease; }
#title .statrow .sv{ width:20px; text-align:right; color:var(--text); font-weight:800; }
#title .pvtags{ margin-top:11px; display:flex; flex-wrap:wrap; gap:6px; }
#title .pvtags span{ font-size:var(--t-label); letter-spacing:.1em; text-transform:uppercase; padding:3px 9px; border-radius:var(--r-pill); background:rgba(255,210,74,.12); color:var(--gold-pale); border:1px solid rgba(255,210,74,.32); }
#title .pvabil{ margin-top:13px; border-top:1px solid rgba(255,255,255,.1); padding-top:11px; display:flex; flex-direction:column; gap:8px; }
#title .pvabil .ab b{ display:inline-block; min-width:38px; font-size:var(--t-sm); letter-spacing:.03em; }
#title .pvabil .ab .an{ font-weight:700; color:var(--text); font-size:var(--t-body); }
#title .pvabil .ab .ad{ display:block; color:#9c958a; font-size:var(--t-sm); line-height:1.3; margin-left:38px; }
#title .modes{ display:flex; gap:12px; justify-content:center; margin:4px 0; flex-wrap:wrap; }
#title .modecard{ cursor:pointer; width:158px; padding:12px 14px; border-radius:var(--r-3); border:1px solid rgba(255,255,255,.10); background:rgba(255,255,255,.03); text-align:left; transition:transform .12s, border-color .12s, background .12s; }
#title .modecard:hover{ transform:translateY(-2px); background:rgba(255,255,255,.06); }
#title .modecard.sel{ border-color:var(--mc,var(--gold)); box-shadow:0 0 22px -8px var(--mc,var(--gold)); background:rgba(255,255,255,.08); }
#title .modecard .mi{ font-size:22px; }
#title .modecard .mn{ font-weight:800; font-size:16px; letter-spacing:.03em; margin-top:2px; }
#title .modecard .mt{ font-size:var(--t-label); letter-spacing:.14em; text-transform:uppercase; color:var(--text-4); }
#title .ptabs{ display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
#title .ptabs .pt{ cursor:pointer; font-weight:800; font-size:var(--t-body); letter-spacing:.06em; padding:8px 14px; border-radius:var(--r-2); border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.04); color:var(--text-3); }
#title .ptabs .pt.on{ background:linear-gradient(180deg,var(--gold),var(--gold-warm)); color:var(--on-gold); border:none; }
#title .ptabs .p2pick{ cursor:pointer; font-weight:700; font-size:var(--t-body); padding:8px 12px; border-radius:var(--r-2); border:1px solid rgba(255,255,255,.14); color:var(--text); }
#title .modehint{ font-size:var(--t-md); color:var(--text-3); line-height:1.5; }
#hud .gd{ height:7px; }
#hud .gdF{ background:linear-gradient(90deg,#9fd0ff,#e6f2ff); }
#hud .gdF.stagger{ background:linear-gradient(90deg,#ff6a4a,#ffb03a); }
#hud .dmgwrap{ position:absolute; inset:0; overflow:hidden; }
#hud .dmg{ position:absolute; font-weight:800; letter-spacing:.01em; transform:translate(-50%,-50%); text-shadow:0 2px 5px rgba(0,0,0,.85), 0 0 12px rgba(0,0,0,.5); will-change:transform,opacity; }
#hud .combo{ position:absolute; left:50%; top:88px; transform:translateX(-50%) scale(1); transform-origin:top center; text-align:center; opacity:0; transition:opacity .14s ease, transform .09s ease; }
#hud .combo .n{ font-weight:800; font-size:46px; line-height:.9; color:var(--gold); text-shadow:0 3px 0 var(--gold-shadow), 0 0 24px rgba(245,178,26,.55); }
#hud .combo .l{ font-size:var(--t-body); letter-spacing:.28em; color:var(--gold-pale); text-transform:uppercase; }
#hud .paused{ position:absolute; inset:0; display:none; align-items:center; justify-content:center; background:rgba(4,5,9,.5); backdrop-filter:blur(2px); }
#hud .paused .t{ font-size:40px; font-weight:800; letter-spacing:.14em; color:var(--gold); text-shadow:0 0 30px rgba(245,178,26,.4); }
#hud .hitflash{ position:absolute; inset:0; opacity:0; pointer-events:none; mix-blend-mode:screen; }
#hud .modebar{ left:50%; transform:translateX(-50%); top:12px; display:flex; align-items:center; gap:16px; padding:8px 20px; }
#hud .modebar .seg{ display:flex; flex-direction:column; align-items:center; min-width:52px; }
#hud .modebar .mv{ font-size:23px; font-weight:800; letter-spacing:.03em; line-height:1; }
#hud .modebar .ml{ font-size:var(--t-tiny); letter-spacing:.16em; color:var(--text-4); text-transform:uppercase; margin-top:3px; }
#hud .modebar .vs{ color:var(--text-5); font-weight:800; font-size:var(--t-md); }
#hud .announce{ position:absolute; left:50%; top:20%; transform:translateX(-50%) scale(1); transform-origin:top center; text-align:center; opacity:0; transition:opacity .18s ease, transform .12s ease; pointer-events:none; }
#hud .announce .at{ font-size:54px; font-weight:800; letter-spacing:.05em; text-shadow:0 4px 0 rgba(0,0,0,.5), 0 0 34px rgba(0,0,0,.5); }
#hud .announce .as{ font-size:var(--t-lg); letter-spacing:.22em; text-transform:uppercase; color:var(--text); margin-top:2px; }
#hud .xpwrap{ margin-top:9px; display:flex; align-items:center; gap:8px; }
#hud .pl{ transition:min-width .5s cubic-bezier(.2,1.4,.4,1); }
#hud .tierb{ display:inline-flex; align-items:center; justify-content:center; height:26px; padding:0 9px; border-radius:var(--r-2); font-weight:800; font-size:var(--t-body); letter-spacing:.08em; flex:0 0 auto; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.14); color:var(--text-3); }
#hud .tierb.t2{ background:linear-gradient(180deg,var(--gold),var(--gold-warm)); color:var(--on-gold); border:none; box-shadow:0 0 12px rgba(245,178,26,.5); }
#hud .tierb.t3{ background:linear-gradient(180deg,#ffedb0,var(--gold)); color:var(--on-gold); border:none; box-shadow:0 0 16px rgba(255,224,138,.7); }
#hud .tierb.t4{ background:linear-gradient(180deg,#ffffff,#ffedb0); color:var(--on-gold); border:none; box-shadow:0 0 22px rgba(255,255,255,.8); animation:kipulse .6s infinite; }
#hud .lvl{ display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:var(--r-2); background:linear-gradient(180deg,var(--gold),var(--gold-warm)); color:var(--on-gold); font-weight:800; font-size:var(--t-lg); box-shadow:0 2px 0 var(--gold-shadow); flex:0 0 auto; }
#hud .xp{ flex:1; height:6px; border-radius:var(--r-1); background:rgba(0,0,0,.5); overflow:hidden; box-shadow:inset 0 0 0 1px rgba(255,255,255,.08); }
#hud .xp > i{ display:block; height:100%; background:linear-gradient(90deg,var(--gold),#ffe89a); border-radius:var(--r-1); transition:width .2s; }
#hud .kit{ left:18px; bottom:212px; padding:9px 13px; min-width:210px; }   /* docked to the player panel, not floating */
#hud .kit .kh{ font-size:var(--t-label); letter-spacing:.16em; color:var(--text-5); text-transform:uppercase; margin-bottom:5px; }
#hud .kit .chips{ display:flex; flex-wrap:wrap; gap:5px; }
#hud .kit .chip{ font-size:var(--t-sm); font-weight:700; padding:3px 9px; border-radius:var(--r-4); background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.10); color:var(--text-3); }
#hud .kit .chip.on{ color:var(--on-gold); }
#hud .endscr{ position:absolute; inset:0; display:none; flex-direction:column; align-items:center; justify-content:center; gap:14px; background:radial-gradient(120% 90% at 50% 40%, rgba(14,10,6,.72), rgba(4,5,9,.94)); pointer-events:auto; z-index:40; }
#hud .endscr .et{ font-size:76px; font-weight:800; letter-spacing:.04em; }
#hud .endscr .el{ font-size:16px; color:var(--text-2); text-align:center; line-height:1.6; }
#hud .endscr .stats{ display:flex; gap:28px; margin:10px 0 6px; }
#hud .endscr .stat .sv{ font-size:32px; font-weight:800; color:var(--gold); text-align:center; }
#hud .endscr .stat .sl{ font-size:var(--t-sm); letter-spacing:.14em; color:var(--text-4); text-transform:uppercase; text-align:center; }
#hud .endscr .btns{ display:flex; gap:12px; margin-top:6px; }
#hud .endscr button{ pointer-events:auto; cursor:pointer; font-family:inherit; font-weight:800; letter-spacing:.12em; font-size:var(--t-lg); color:var(--on-gold); padding:13px 24px; border:none; border-radius:var(--r-3); background:linear-gradient(180deg,var(--gold),var(--gold-warm)); box-shadow:0 5px 0 var(--gold-shadow); text-transform:uppercase; }
#hud .endscr button.ghost{ background:rgba(255,255,255,.08); color:var(--text); box-shadow:none; border:1px solid rgba(255,255,255,.15); }
/* ORIGIN — forge card + custom-hero affordances */
#title .rcard{ position:relative; }
#title .rcard .cchip{ position:absolute; top:8px; right:8px; font-size:var(--t-micro); font-weight:800; letter-spacing:.14em; padding:2px 7px; border-radius:var(--r-2); background:rgba(255,210,74,.14); border:1px solid rgba(255,210,74,.4); color:var(--gold-pale); }
#title .rcard .cedit{ position:absolute; bottom:8px; right:8px; font-size:var(--t-md); opacity:0; transition:opacity .12s; color:var(--gold); }
#title .rcard:hover .cedit{ opacity:.95; }
#title .rcard.forge{ border-style:dashed; border-color:rgba(255,210,74,.4); background:rgba(255,210,74,.04); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; min-height:96px; text-align:center; }
#title .rcard.forge .fplus{ font-size:26px; font-weight:800; color:var(--gold); line-height:1; }
#title .rcard.forge:hover{ box-shadow:0 0 22px -6px var(--gold); }
/* interactive tutorial banner */
#hud .tut{ left:50%; transform:translateX(-50%); top:64px; width:min(560px,82vw); padding:13px 18px 12px; text-align:center; z-index:8; }
#hud .tut .tstep{ font-size:var(--t-tiny); letter-spacing:.24em; color:var(--text-5); text-transform:uppercase; }
#hud .tut .tobj{ font-family:'Rajdhani','Inter',sans-serif; font-weight:800; font-size:27px; color:var(--gold); letter-spacing:.04em; line-height:1.1; margin:2px 0; }
#hud .tut .tkeys{ display:inline-block; font-weight:800; font-size:var(--t-md); color:var(--on-gold); background:linear-gradient(180deg,var(--gold),var(--gold-warm)); padding:4px 13px; border-radius:var(--r-2); margin:4px 0 2px; box-shadow:0 2px 0 var(--gold-shadow); }
#hud .tut .ttip{ font-size:var(--t-body); color:var(--text-3); margin-top:4px; }
#hud .tut .tdots{ display:flex; gap:5px; justify-content:center; margin-top:9px; }
#hud .tut .tdots i{ width:8px; height:8px; border-radius:50%; background:rgba(255,255,255,.14); }
#hud .tut .tdots i.on{ background:var(--gold); box-shadow:0 0 8px rgba(255,210,74,.6); }
#hud .tut .tskip{ position:absolute; top:9px; right:12px; cursor:pointer; font-size:var(--t-label); letter-spacing:.12em; color:var(--text-5); text-transform:uppercase; pointer-events:auto; }
#hud .tut .tskip:hover{ color:var(--gold); }
@keyframes tutpop{ 0%{ transform:translateX(-50%) scale(.92);} 60%{ transform:translateX(-50%) scale(1.05);} 100%{ transform:translateX(-50%) scale(1);} }
#hud .tut.pop{ animation:tutpop .3s ease; }
/* pause menu */
#hud .paused{ flex-direction:column; pointer-events:auto; z-index:45; }
#hud .paused .pwrap{ display:flex; flex-direction:column; gap:10px; align-items:center; background:rgba(8,10,16,.78); border:1px solid rgba(255,255,255,.12); border-radius:var(--r-4); padding:26px 34px; backdrop-filter:blur(6px); }
#hud .paused button{ cursor:pointer; font-family:inherit; font-weight:800; letter-spacing:.12em; font-size:var(--t-lg); color:var(--on-gold); padding:12px 26px; min-width:240px; border:none; border-radius:var(--r-3); background:linear-gradient(180deg,var(--gold),var(--gold-warm)); box-shadow:0 4px 0 var(--gold-shadow); text-transform:uppercase; }
#hud .paused button.ghost{ background:rgba(255,255,255,.08); color:var(--text); box-shadow:none; border:1px solid rgba(255,255,255,.15); }
/* full-screen overlays (options / how-to-play) — live on <body> so they stack over the title */
.lswovl{ position:fixed; inset:0; z-index:62; display:none; align-items:center; justify-content:center; background:rgba(4,5,9,.8); backdrop-filter:blur(3px); pointer-events:auto; color:var(--text); }
.lswovl .obox{ width:min(700px,94vw); max-height:88vh; overflow-y:auto; background:rgba(14,16,24,.97); border:1px solid rgba(255,255,255,.14); border-radius:var(--r-4); padding:22px 26px; font-family:"Rajdhani","Inter",system-ui,sans-serif; }
.lswovl .oh{ font-weight:800; font-size:26px; letter-spacing:.1em; color:var(--gold); margin-bottom:14px; text-transform:uppercase; }
.lswovl .orow{ display:flex; align-items:center; gap:12px; margin-bottom:12px; }
.lswovl .orow .ol{ width:200px; font-size:var(--t-sm); letter-spacing:.12em; text-transform:uppercase; color:var(--text-4); }
.lswovl .orow input[type=range]{ flex:1; accent-color:var(--gold-deep); }
.lswovl .orow .ov{ width:48px; text-align:right; font-weight:800; font-size:var(--t-md); }
.lswovl .chips3{ display:flex; gap:6px; flex-wrap:wrap; flex:1; }
.lswovl .c3{ cursor:pointer; font-size:var(--t-sm); font-weight:800; padding:6px 12px; border-radius:var(--r-2); border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.04); color:var(--text-3); }
.lswovl .c3.on{ background:linear-gradient(180deg,var(--gold),var(--gold-warm)); color:var(--on-gold); border-color:transparent; }
.lswovl .odone{ cursor:pointer; margin-top:10px; font-family:inherit; font-weight:800; letter-spacing:.12em; font-size:var(--t-lg); color:var(--on-gold); padding:12px 26px; border:none; border-radius:var(--r-3); background:linear-gradient(180deg,var(--gold),var(--gold-warm)); box-shadow:0 4px 0 var(--gold-shadow); text-transform:uppercase; width:100%; }
.lswovl .odone.oghost{ background:rgba(255,255,255,.08); color:var(--text); box-shadow:none; border:1px solid rgba(255,255,255,.15); }
.lswovl .oline2{ font-size:var(--t-body); color:var(--text-3); margin:8px 0; line-height:1.5; }
.lswovl .roomcode{ text-align:center; font-size:var(--t-lg); letter-spacing:.2em; color:var(--text-4); margin-bottom:12px; }
.lswovl .roomcode b{ font-size:34px; letter-spacing:.34em; color:var(--gold); text-shadow:0 0 18px rgba(245,178,26,.4); margin-left:8px; }
.lswovl .netvs{ display:flex; align-items:center; gap:14px; justify-content:center; margin-bottom:14px; }
.lswovl .netp{ flex:1; text-align:center; border:1px solid rgba(255,255,255,.12); border-radius:var(--r-3); padding:14px 10px; background:rgba(255,255,255,.03); }
.lswovl .netp b{ display:block; font-size:16px; color:var(--text); }
.lswovl .netp span{ display:block; font-size:var(--t-body); color:var(--info); margin-top:2px; }
.lswovl .netp em{ display:block; font-style:normal; font-size:var(--t-tiny); letter-spacing:.2em; color:var(--text-5); margin-top:5px; }
.lswovl .netp.wait b{ color:var(--text-5); font-size:var(--t-md); }
.lswovl .vs2{ font-weight:800; color:var(--gold); }
.lswovl .hsec{ margin-bottom:13px; }
/* --- THE DAMAGE CODEX --- */
.lswovl .dgbox{ max-width:64rem; }
.lswovl .dgsub{ font-size:var(--t-sm); color:var(--text-3); line-height:1.62; margin-bottom:14px; }
.lswovl .dgsec{ font-family:var(--f-mono); font-size:var(--t-micro); letter-spacing:var(--tr-wider); color:var(--text-5);
  border-top:1px dashed var(--line-gold); padding-top:10px; margin:16px 0 8px; }
.lswovl .dgrow{ display:flex; gap:12px; padding:10px 0; border-bottom:1px solid var(--line); }
.lswovl .dgtag{ flex:0 0 92px; font-family:var(--f-mono); font-size:var(--t-micro); letter-spacing:var(--tr-wider);
  color:var(--dc); border:1px solid var(--dc); border-radius:var(--r-1); padding:5px 0; text-align:center; align-self:flex-start; }
.lswovl .dgbody{ flex:1 1 auto; min-width:0; }
.lswovl .dgnote{ font-size:var(--t-sm); color:var(--text-2); margin-bottom:6px; line-height:1.5; }
.lswovl .dgline{ display:flex; gap:8px; font-family:var(--f-mono); font-size:var(--t-micro); line-height:1.75; }
.lswovl .dgline b{ flex:0 0 62px; color:var(--text-5); letter-spacing:var(--tr-wide); font-weight:400; }
.lswovl .dgline span{ color:var(--text-3); min-width:0; overflow-wrap:anywhere; }
.lswovl .dgline.dgw span{ color:var(--danger); }
@media (max-width:680px){ .lswovl .dgrow{ flex-direction:column; gap:6px; } .lswovl .dgtag{ align-self:stretch; } }
.lswovl .hsec .ht{ font-size:var(--t-sm); letter-spacing:.18em; color:var(--gold-pale); text-transform:uppercase; margin-bottom:5px; }
.lswovl .hsec .hb{ font-size:var(--t-md); color:var(--text-2); line-height:1.65; }
.lswovl .hsec .hb b{ color:var(--gold); }
.lswovl .hsec .hb em{ color:var(--info); font-style:normal; font-weight:700; }
/* title top bar + roster filters */
#title .topbar{ position:absolute; top:16px; right:18px; display:flex; gap:8px; }
#title .topbar button{ cursor:pointer; font-family:inherit; font-weight:800; font-size:var(--t-body); letter-spacing:.08em; color:var(--text); padding:9px 14px; border-radius:var(--r-2); border:1px solid rgba(255,255,255,.14); background:rgba(255,255,255,.05); text-transform:uppercase; }
#title .topbar button:hover{ border-color:var(--gold); color:var(--gold); }
#title .filters{ display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
#title .filters .fc{ cursor:pointer; font-size:var(--t-label); font-weight:800; letter-spacing:.08em; padding:5px 10px; border-radius:var(--r-3); border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.04); color:var(--text-3); text-transform:uppercase; }
#title .filters .fc.on{ background:rgba(255,210,74,.16); border-color:rgba(255,210,74,.5); color:var(--gold-pale); }
#title .filters select{ font-family:inherit; font-size:var(--t-sm); font-weight:700; color:var(--text); background:rgba(0,0,0,.5); border:1px solid rgba(255,255,255,.14); border-radius:var(--r-2); padding:5px 8px; }
#title .filters input{ font-family:inherit; font-size:var(--t-body); color:var(--text); background:rgba(0,0,0,.4); border:1px solid rgba(255,255,255,.14); border-radius:var(--r-2); padding:5px 10px; width:120px; outline:none; }
#title .filters input:focus{ border-color:var(--gold); }
#title .filters .cnt{ font-size:var(--t-label); color:var(--text-5); letter-spacing:.1em; margin-left:auto; }
/* the cast layer: identity, at-a-glance, rank ladder, sheet flipping */
#title .preview{ position:relative; }
#title .pvflip{ position:absolute; top:14px; right:14px; display:flex; gap:6px; z-index:2; }
#title .pvflip span{ cursor:pointer; width:26px; height:26px; display:inline-flex; align-items:center; justify-content:center; border-radius:var(--r-2); border:1px solid rgba(255,255,255,.16); background:rgba(255,255,255,.05); color:var(--gold); font-size:16px; font-weight:800; user-select:none; }
#title .pvflip span:hover{ border-color:var(--gold); box-shadow:0 0 10px rgba(255,210,74,.3); }
#title .pvident{ display:flex; flex-direction:column; gap:3px; margin:7px 0 9px; font-size:var(--t-body); color:var(--text); }
#title .pvident svg{ color:var(--gold-pale); }
#title .glance{ display:flex; flex-wrap:wrap; gap:5px; margin-top:10px; }
#title .glance span{ font-size:var(--t-label); padding:4px 9px; border-radius:var(--r-3); background:rgba(127,230,255,.08); color:#cfe8f2; border:1px solid rgba(127,230,255,.2); }
#title .glance span svg{ color:var(--info); }
#title .glance span.lead{ background:rgba(255,210,74,.12); color:var(--gold-pale); border-color:rgba(255,210,74,.35); font-weight:700; }
#title .glance span.lead svg{ color:var(--gold); }
#title .ladder{ display:flex; align-items:center; gap:2px; margin:2px 0 7px; }
#title .ladder i{ width:12px; height:5px; border-radius:var(--r-1); display:inline-block; }
#title .ladder span{ font-size:var(--t-micro); color:var(--text-5); letter-spacing:.1em; text-transform:uppercase; margin-left:6px; }
#title .statrow .sl svg{ color:var(--text-4); }
#title .arow .an2 svg{ color:var(--text-4); }
#title .rcard .cflag{ font-size:var(--t-sm); font-weight:400; }
/* ---- KMK 9 ACTION NEWS: the live field monitor (PiP) ---- */
#hud .pip{ position:absolute; top:184px; right:18px; width:186px; padding:6px; z-index:7; }
#hud .pip canvas{ display:block; width:100%; border-radius:var(--r-2); }
#hud .pip .pipcap{ display:flex; align-items:center; gap:6px; font-size:var(--t-tiny); font-weight:800; letter-spacing:.16em; color:var(--danger-2); text-transform:uppercase; padding:0 2px 4px; }
#hud .pip .pipdot{ width:7px; height:7px; border-radius:50%; background:#ff2f2f; box-shadow:0 0 9px rgba(255,47,47,.95); animation:pipblink 1.1s steps(2,start) infinite; }
@keyframes pipblink{ 50%{ opacity:.2; } }
/* ---- the broadcast end screen: a TV set playing the crew's actual footage ---- */
#hud .endscr.news{ justify-content:flex-start; gap:0; padding:24px 20px 46px; overflow:hidden; background:radial-gradient(130% 100% at 50% 0%, rgba(18,14,9,.95), rgba(4,5,9,.99)); }
#hud .endscr.news .nwrap{ width:min(1180px,96vw); display:flex; flex-direction:column; gap:13px; max-height:100%; min-height:0; }
#hud .nmast{ display:flex; align-items:center; gap:12px; }
#hud .nmast .n9{ width:38px; height:38px; border-radius:50%; background:var(--broadcast); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:24px; font-family:'Rajdhani','Inter',sans-serif; box-shadow:0 3px 0 #5a0a0d, 0 0 24px rgba(216,31,38,.45); flex:0 0 auto; }
#hud .nmast .nb b{ display:block; font-size:19px; font-weight:800; letter-spacing:.12em; color:var(--text); line-height:1.05; }
#hud .nmast .nb span{ font-size:var(--t-tiny); letter-spacing:.3em; color:var(--gold-deep); text-transform:uppercase; }
#hud .nmast .nlive{ margin-left:auto; display:flex; align-items:center; gap:8px; font-size:var(--t-sm); font-weight:800; letter-spacing:.14em; color:var(--text-2); }
#hud .nmast .nlive i{ width:8px; height:8px; border-radius:50%; background:#ff2f2f; box-shadow:0 0 8px rgba(255,47,47,.9); animation:pipblink 1.1s steps(2,start) infinite; }
#hud .nbody{ display:flex; gap:20px; min-height:0; }
#hud .ncl{ flex:0 0 460px; display:flex; flex-direction:column; gap:8px; }
#hud .ncr{ flex:1; min-width:0; display:flex; flex-direction:column; gap:11px; overflow-y:auto; padding-right:6px; }
#hud .tvset{ background:linear-gradient(178deg,#262a31,#0e1013 78%); border:1px solid rgba(255,255,255,.09); border-radius:var(--r-4); padding:13px 13px 7px; box-shadow:0 24px 60px -18px rgba(0,0,0,.92), inset 0 1px 0 rgba(255,255,255,.09); }
#hud .tvscreen{ position:relative; border-radius:var(--r-2); overflow:hidden; background:#000; box-shadow:inset 0 0 40px rgba(0,0,0,.85); }
#hud .tvscreen canvas{ display:block; width:100%; aspect-ratio:16/9; }
#hud .tvscan{ position:absolute; inset:0; pointer-events:none; background:repeating-linear-gradient(0deg, rgba(0,0,0,.17) 0 1px, transparent 1px 3px); }
#hud .tvglare{ position:absolute; inset:0; pointer-events:none; background:linear-gradient(112deg, rgba(255,255,255,.10), rgba(255,255,255,.02) 26%, transparent 42%); }
#hud .tvtag{ position:absolute; top:9px; right:9px; font-size:var(--t-label); font-weight:800; letter-spacing:.1em; color:#fff; background:rgba(216,31,38,.92); border-radius:var(--r-1); padding:3px 8px; transition:background .15s, color .15s; }
#hud .tvtag.slow{ background:rgba(245,178,26,.95); color:var(--on-gold); box-shadow:0 0 16px rgba(245,178,26,.5); }
#hud .tvchin{ display:flex; align-items:center; justify-content:space-between; padding:8px 3px 3px; }
#hud .tvchin .tvbrand{ font-size:var(--t-tiny); letter-spacing:.3em; color:#6b7078; font-weight:700; }
#hud .tvchin .tvgrill{ flex:1; height:8px; margin:0 12px; background:repeating-linear-gradient(90deg, rgba(255,255,255,.09) 0 2px, transparent 2px 6px); border-radius:var(--r-1); }
#hud .tvchin .tvled{ width:6px; height:6px; border-radius:50%; background:var(--good); box-shadow:0 0 7px rgba(143,224,138,.9); }
#hud .tvcap{ font-size:var(--t-sm); color:var(--text-3); padding:2px 4px 0; min-height:17px; }
#hud .tvprog{ display:flex; gap:3px; padding:6px 2px 2px; }
#hud .tvprog i{ flex:1; height:3px; background:rgba(255,255,255,.13); border-radius:var(--r-1); position:relative; overflow:hidden; }
#hud .tvprog i b{ position:absolute; left:0; top:0; bottom:0; width:0%; background:var(--gold-deep); box-shadow:0 0 6px rgba(245,178,26,.6); }
#hud .tvprog i.slow b{ background:var(--gold-pale); }
#hud .tvcap b{ color:var(--gold); }
#hud .ncrew{ font-size:var(--t-tiny); letter-spacing:.18em; color:var(--text-5); text-transform:uppercase; padding:0 4px; }
#hud .nkickrow{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
#hud .nkick{ display:inline-block; font-size:var(--t-label); font-weight:900; letter-spacing:.22em; color:#fff; background:var(--broadcast); padding:4px 11px; border-radius:var(--r-1); text-transform:uppercase; }
#hud .nhead{ font-family:'Rajdhani','Inter',sans-serif; font-weight:800; font-size:33px; line-height:1.03; letter-spacing:.02em; color:var(--text); text-shadow:0 3px 0 rgba(0,0,0,.5); }
#hud .nsub{ font-size:var(--t-sm); letter-spacing:.2em; color:var(--gold-deep); text-transform:uppercase; }
#hud .nsub b{ color:var(--text); }
#hud .nscript{ display:flex; flex-direction:column; gap:8px; border-left:3px solid rgba(245,178,26,.5); padding:2px 0 2px 12px; min-height:60px; }
#hud .sline{ font-size:var(--t-md); color:var(--text-2); line-height:1.55; }
#hud .sline .swho{ display:inline-block; font-size:var(--t-tiny); font-weight:900; letter-spacing:.16em; color:#0d0e12; background:var(--gold-deep); border-radius:var(--r-1); padding:2px 7px; margin-right:8px; transform:translateY(-1px); text-transform:uppercase; }
#hud .sline.field .swho{ background:var(--broadcast); color:#fff; }
#hud .sline .cursor{ display:inline-block; width:7px; height:13px; background:var(--gold-deep); margin-left:2px; animation:pipblink .7s steps(2,start) infinite; vertical-align:-2px; }
#hud .nboards{ display:flex; gap:12px; flex-wrap:wrap; }
#hud .board{ flex:1; min-width:250px; background:rgba(10,12,18,.72); border:1px solid rgba(255,255,255,.09); border-radius:var(--r-3); padding:11px 13px; }
#hud .board .bh{ font-size:var(--t-tiny); font-weight:800; letter-spacing:.24em; color:var(--gold-deep); text-transform:uppercase; padding-bottom:7px; border-bottom:1px solid rgba(245,178,26,.25); margin-bottom:8px; display:flex; justify-content:space-between; }
#hud .board .bh em{ font-style:normal; color:var(--text-5); letter-spacing:.1em; }
#hud table.tape{ width:100%; border-collapse:collapse; }
#hud table.tape th{ font-size:var(--t-sm); font-weight:800; letter-spacing:.06em; padding:2px 4px 6px; text-align:center; }
#hud table.tape td{ font-size:var(--t-body); padding:3.5px 4px; text-align:center; color:var(--text); font-weight:700; border-top:1px solid rgba(255,255,255,.05); }
#hud table.tape td.lb{ font-size:var(--t-tiny); letter-spacing:.13em; color:var(--text-5); text-align:left; text-transform:uppercase; font-weight:600; }
#hud table.tape td.win{ color:var(--gold); }
#hud .cityrow{ display:flex; justify-content:space-between; font-size:var(--t-body); color:var(--text-2); padding:3.5px 0; border-top:1px solid rgba(255,255,255,.05); }
#hud .cityrow:first-of-type{ border-top:none; }
#hud .cityrow b{ color:var(--text); }
#hud .citysum{ margin-top:8px; padding-top:8px; border-top:1px dashed rgba(245,178,26,.35); display:flex; justify-content:space-between; align-items:baseline; }
#hud .citysum .cl{ font-size:var(--t-tiny); letter-spacing:.18em; color:var(--text-5); text-transform:uppercase; }
#hud .citysum .cv{ font-family:'Rajdhani','Inter',sans-serif; font-size:26px; font-weight:800; color:var(--gold); text-shadow:0 0 18px rgba(245,178,26,.35); }
#hud .wcard{ background:rgba(216,31,38,.08); border:1px solid rgba(216,31,38,.3); border-radius:var(--r-3); padding:9px 13px; font-size:var(--t-md); color:var(--text-2); font-style:italic; line-height:1.5; }
#hud .wcard b{ font-style:normal; font-size:var(--t-label); letter-spacing:.14em; color:var(--danger-2); display:block; margin-top:3px; text-transform:uppercase; }
#hud .sat{ display:none; align-items:center; gap:8px; font-size:var(--t-label); font-weight:800; letter-spacing:.18em; color:var(--info); text-transform:uppercase; }
#hud .sat i{ width:7px; height:7px; border-radius:50%; background:var(--info); box-shadow:0 0 8px rgba(127,230,255,.9); animation:pipblink .9s steps(2,start) infinite; }
#hud .nticker{ position:absolute; left:0; right:0; bottom:0; height:36px; background:var(--ink); border-top:2px solid var(--gold-deep); display:flex; align-items:stretch; overflow:hidden; }
#hud .nticker .tkbrand{ flex:0 0 auto; display:flex; align-items:center; gap:7px; background:var(--broadcast); color:#fff; font-weight:900; letter-spacing:.12em; font-size:var(--t-body); padding:0 14px; z-index:1; }
#hud .nticker .tkwrap{ flex:1; position:relative; overflow:hidden; }
#hud .nticker .tkx{ position:absolute; white-space:nowrap; font-size:var(--t-body); font-weight:700; letter-spacing:.1em; color:var(--text-2); line-height:36px; animation:tick 38s linear infinite; }
#hud .nticker .tkx b{ color:var(--gold-deep); margin:0 16px; font-weight:900; }
@keyframes tick{ 0%{ transform:translateX(0); } 100%{ transform:translateX(-50%); } }
#hud .endscr.news .btns{ margin:2px 0 4px; }
@media (max-width:1020px){ #hud .ncl{ flex-basis:380px; } #hud .nhead{ font-size:26px; } }
/* ================= THRESHOLD REGISTRY — the superweapon intelligence database ================= */
#title{ --mono:'Cascadia Mono','Consolas',ui-monospace,'SF Mono',monospace; }
#title .clsbar{ display:flex; align-items:center; gap:10px; width:min(1080px,94vw); }
#title .clsbar .clschip{ flex:0 0 auto; font-family:var(--mono); font-size:var(--t-tiny); font-weight:700; letter-spacing:.18em; color:#fff; background:#a8161d; padding:3px 9px; border-radius:var(--r-1); }
#title .clsbar .clsline{ flex:1; font-family:var(--mono); font-size:var(--t-tiny); letter-spacing:.24em; color:var(--text-5); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; border-top:1px solid rgba(245,178,26,.28); border-bottom:1px solid rgba(245,178,26,.28); padding:3px 0; }
#title .term{ font-family:var(--mono); font-size:var(--t-sm); letter-spacing:.08em; color:#8fbf8a; }
#title .term b{ color:#c8e8c0; font-weight:700; }
#title .term .tcur{ display:inline-block; margin-left:3px; color:var(--good); animation:pipblink 1s steps(2,start) infinite; }
#title .filters .flab{ font-family:var(--mono); font-size:var(--t-tiny); letter-spacing:.2em; color:var(--text-5); margin-right:2px; }
/* file cards */
#title .rcard{ border-left:3px solid var(--tc,var(--text-6)); }
#title .rcard .fhead{ display:flex; justify-content:space-between; align-items:center; margin-bottom:2px; }
#title .rcard .fno{ font-family:var(--mono); font-size:var(--t-micro); letter-spacing:.08em; color:var(--text-5); }
#title .rcard .fst{ font-family:var(--mono); font-size:var(--t-micro); letter-spacing:.12em; color:var(--good); }
#title .rcard .fst.op{ color:var(--info); }
#title .rcard .frow{ display:flex; justify-content:space-between; align-items:flex-end; margin-top:5px; }
#title .rcard .felo{ font-family:var(--mono); font-size:var(--t-tiny); color:var(--gold-pale); letter-spacing:.06em; }
#title .rcard .felo b{ color:var(--gold); font-weight:700; }
#title .rcard .fbar{ width:34px; height:9px; opacity:.5; background:repeating-linear-gradient(90deg,var(--text-2) 0 1px,transparent 1px 3px,var(--text-2) 3px 5px,transparent 5px 6px); }
/* the dossier */
#title .preview{ overflow:hidden; }
#title .preview::before{ content:''; position:absolute; inset:0; pointer-events:none; z-index:3; background:repeating-linear-gradient(0deg, rgba(255,255,255,.022) 0 1px, transparent 1px 3px); }
#title .preview::after{ content:'THRESHOLD REGISTRY // EYES ONLY'; position:absolute; left:50%; top:46%; transform:translate(-50%,-50%) rotate(-24deg); font-family:var(--mono); font-weight:700; font-size:30px; letter-spacing:.2em; white-space:nowrap; color:#f4efe6; opacity:.05; pointer-events:none; z-index:-1; }
#title h1{ font-size:clamp(28px,4.6vw,54px); margin-top:26px; }   /* the registry header stack needs the air (and the topbar its corner) */
#title .dsh{ display:flex; align-items:center; justify-content:space-between; gap:8px; font-family:var(--mono); font-size:var(--t-tiny); letter-spacing:.14em; color:var(--text-5); border-bottom:1px dashed rgba(245,178,26,.35); padding-bottom:6px; margin-bottom:8px; }
#title .dsh b{ color:var(--gold-pale); font-weight:700; }
#title .stamp{ position:absolute !important; top:44px; right:-18px; z-index:4 !important; transform:rotate(9deg); font-family:var(--mono); font-weight:700; font-size:var(--t-md); letter-spacing:.3em; color:var(--stamp); border:2.5px solid var(--stamp); border-radius:var(--r-1); padding:3px 12px 3px 15px; opacity:.8; pointer-events:none; mix-blend-mode:screen; }
#title .idrows{ font-family:var(--mono); font-size:var(--t-label); display:flex; flex-direction:column; gap:2.5px; margin:7px 0 4px; }
#title .idrows .ir{ display:flex; gap:8px; }
#title .idrows .ik{ flex:0 0 96px; color:var(--text-5); letter-spacing:.06em; }
#title .idrows .iv{ color:var(--text); }
#title .idrows .iv.act{ color:var(--good); }
#title .idrows .iv.opn{ color:var(--info); }
#title .frec{ display:flex; gap:6px; flex-wrap:wrap; margin-top:6px; }
#title .frec span{ font-family:var(--mono); font-size:var(--t-label); padding:3px 8px; border-radius:var(--r-1); background:rgba(245,178,26,.08); border:1px solid rgba(245,178,26,.25); color:var(--gold-pale); }
#title .frec span b{ color:var(--gold); font-weight:700; }
#title .incid{ margin-top:6px; display:flex; flex-direction:column; gap:2px; font-family:var(--mono); font-size:var(--t-label); color:var(--text-4); }
#title .incid .iw{ color:var(--good); } #title .incid .il{ color:var(--danger-2); }
#title .sheet .sh, #title .pvsig-h{ font-family:var(--mono); letter-spacing:.2em; }
@keyframes regsweep{ 0%{ top:-8%; } 100%{ top:108%; } }
#title .preview .sweep{ position:absolute; left:0; right:0; height:34px; z-index:2; pointer-events:none; background:linear-gradient(180deg, transparent, rgba(245,178,26,.045), transparent); animation:regsweep 7s linear infinite; }
/* the sports-desk power board */
.lswovl .rkhead{ display:flex; align-items:center; gap:10px; margin-bottom:4px; }
.lswovl .rkhead .n9{ width:30px; height:30px; border-radius:50%; background:var(--broadcast); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:19px; }
.lswovl .rkhead .rt b{ display:block; font-size:17px; letter-spacing:.1em; color:var(--text); line-height:1.05; }
.lswovl .rkhead .rt span{ font-size:var(--t-tiny); letter-spacing:.26em; color:var(--gold-deep); text-transform:uppercase; }
.lswovl .rkmeta{ margin-left:auto; font-family:'Cascadia Mono',Consolas,monospace; font-size:var(--t-label); color:var(--text-5); letter-spacing:.12em; text-align:right; }
.lswovl table.rk{ width:100%; border-collapse:collapse; }
.lswovl table.rk th{ font-size:var(--t-tiny); letter-spacing:.2em; color:var(--text-5); text-transform:uppercase; text-align:left; padding:7px 8px 5px; border-bottom:1px solid rgba(245,178,26,.3); }
.lswovl table.rk td{ font-size:var(--t-md); padding:5.5px 8px; border-bottom:1px solid rgba(255,255,255,.05); color:var(--text-2); }
.lswovl table.rk td.rkn{ font-family:'Cascadia Mono',Consolas,monospace; color:var(--text-5); width:40px; }
.lswovl table.rk tr:nth-child(-n+3) td.rkn{ color:var(--gold); font-weight:700; }
.lswovl table.rk td.mv{ width:38px; font-size:var(--t-sm); font-weight:800; }
.lswovl table.rk td.mv.up{ color:var(--good); } .lswovl table.rk td.mv.dn{ color:var(--danger-2); } .lswovl table.rk td.mv.fl{ color:var(--text-6); }
.lswovl table.rk td.who{ font-weight:700; color:var(--text); }
.lswovl table.rk td.who i{ display:inline-block; width:9px; height:9px; border-radius:50%; margin-right:8px; background:var(--hc); box-shadow:0 0 8px var(--hc); }
.lswovl table.rk td.who .crown{ margin-left:7px; }
.lswovl table.rk td.elo{ font-family:'Cascadia Mono',Consolas,monospace; color:var(--gold); font-weight:700; }
.lswovl table.rk td.rec{ font-family:'Cascadia Mono',Consolas,monospace; font-size:var(--t-sm); color:var(--text-4); }
.lswovl table.rk td.thr{ font-size:var(--t-label); letter-spacing:.08em; }
.lswovl .rkfoot{ margin-top:9px; font-family:'Cascadia Mono',Consolas,monospace; font-size:var(--t-tiny); letter-spacing:.14em; color:var(--text-6); }
/* ---- THE INVITATIONAL bracket ---- */
.lswovl .brsub{ font-family:'Cascadia Mono',Consolas,monospace; font-size:var(--t-label); letter-spacing:.16em; color:var(--text-5); margin:-6px 0 4px; }
.lswovl .brsub b{ color:var(--gold); }
.lswovl .brwrap{ display:flex; gap:16px; align-items:stretch; margin:12px 0 6px; }
.lswovl .brcol{ flex:1.15; display:flex; flex-direction:column; justify-content:space-around; gap:10px; min-width:0; }
.lswovl .brcol.champ{ flex:0.9; justify-content:center; }
.lswovl .brh{ text-align:center; font-size:var(--t-tiny); font-weight:800; letter-spacing:.26em; color:var(--text-5); text-transform:uppercase; margin-bottom:-4px; }
.lswovl .bm{ position:relative; border:1px solid rgba(255,255,255,.10); border-radius:var(--r-3); background:rgba(255,255,255,.03); padding:7px 10px; }
.lswovl .bm::after{ content:''; position:absolute; right:-16px; top:50%; width:16px; height:1px; background:rgba(245,178,26,.35); }
.lswovl .brcol:last-child .bm::after, .lswovl .brcol.champ .bm::after{ display:none; }
.lswovl .bm.live{ border-color:var(--gold); animation:brpulse 1.6s ease infinite; }
@keyframes brpulse{ 0%,100%{ box-shadow:0 0 10px -4px var(--gold); } 50%{ box-shadow:0 0 24px -2px var(--gold); } }
.lswovl .bm .bs{ display:flex; align-items:center; gap:7px; padding:3px 0; font-size:var(--t-body); font-weight:700; color:var(--text-2); min-width:0; }
.lswovl .bm .bs .seed{ font-family:'Cascadia Mono',Consolas,monospace; font-size:var(--t-tiny); color:var(--text-5); width:17px; flex:0 0 auto; }
.lswovl .bm .bs i{ width:8px; height:8px; border-radius:50%; background:var(--hc,var(--text-5)); box-shadow:0 0 7px var(--hc,transparent); flex:0 0 auto; }
.lswovl .bm .bs .bn{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.lswovl .bm .bs .belo{ margin-left:auto; font-family:'Cascadia Mono',Consolas,monospace; font-size:var(--t-tiny); color:var(--text-5); flex:0 0 auto; }
.lswovl .bm .bs.win{ color:var(--gold); }
.lswovl .bm .bs.win .belo{ color:var(--gold-pale); }
.lswovl .bm .bs.lose{ opacity:.42; }
.lswovl .bm .bs.lose .bn{ text-decoration:line-through; }
.lswovl .ychip{ font-size:var(--t-micro); font-weight:900; letter-spacing:.1em; background:var(--broadcast); color:#fff; padding:1.5px 5px; border-radius:var(--r-1); flex:0 0 auto; }
.lswovl .bscore{ font-family:'Cascadia Mono',Consolas,monospace; font-size:var(--t-label); font-weight:700; color:var(--gold); background:rgba(245,178,26,.12); border:1px solid rgba(245,178,26,.35); border-radius:var(--r-1); padding:1px 6px; flex:0 0 auto; }
.lswovl .bsim{ font-size:var(--t-micro); letter-spacing:.14em; color:#7fb0d0; border:1px solid rgba(127,176,208,.4); border-radius:var(--r-1); padding:1px 4px; flex:0 0 auto; }
.lswovl .btbd{ color:var(--text-6); font-style:italic; font-weight:600; }
.lswovl .bchamp{ text-align:center; padding:18px 10px; border:1px dashed rgba(245,178,26,.55); border-radius:var(--r-3); background:rgba(245,178,26,.05); }
.lswovl .bchamp .tro{ font-size:36px; filter:drop-shadow(0 0 14px rgba(245,178,26,.8)); animation:brpulse 2s ease infinite; }
.lswovl .bchamp .cn{ font-size:17px; font-weight:800; letter-spacing:.06em; color:var(--gold); margin-top:4px; }
.lswovl .bchamp .cl{ font-size:var(--t-micro); letter-spacing:.3em; color:var(--text-5); text-transform:uppercase; margin-top:3px; }
.lswovl .bchamp.tbd{ opacity:.55; }
/* ---- the THEATER: in-match city nameplate + the CITY ATLAS ---- */
#hud .cityplate{ position:absolute; left:50%; transform:translateX(-50%); bottom:108px; font-family:'Cascadia Mono',Consolas,monospace; font-size:var(--t-label); letter-spacing:.14em; color:var(--text-4); background:rgba(8,10,16,.5); border:1px solid rgba(255,255,255,.08); border-radius:var(--r-2); padding:4px 12px; pointer-events:none; }
#hud .cityplate b{ color:var(--gold-pale); font-weight:700; }
/* ===== THE DANGER ROOM — a simulated environment + the engine's test harness =====
   Everything but your character should read as PROJECTED: scanned grid, corner brackets,
   a sweeping holo line, and a live telemetry column. This is how we test the engine. */
#hud .simfx{ position:absolute; inset:0; pointer-events:none; z-index:2; display:none; }
#hud.sim .simfx{ display:block; }
#hud .simfx .simgrid{ position:absolute; inset:0; opacity:.15;
  background-image:linear-gradient(var(--info) 1px, transparent 1px), linear-gradient(90deg, var(--info) 1px, transparent 1px);
  background-size:44px 44px; -webkit-mask-image:radial-gradient(120% 90% at 50% 50%, #000 30%, transparent 76%);
  mask-image:radial-gradient(120% 90% at 50% 50%, #000 30%, transparent 76%); }
#hud .simfx .simscan{ position:absolute; inset:0; opacity:.4;
  background:repeating-linear-gradient(0deg, rgba(127,230,255,.055) 0 1px, transparent 1px 4px); }
#hud .simfx .simsweep{ position:absolute; left:0; right:0; height:130px; opacity:.55;
  background:linear-gradient(180deg, transparent, rgba(127,230,255,.11), transparent); animation:simsweep 6s linear infinite; }
@keyframes simsweep{ 0%{ top:-16%; } 100%{ top:104%; } }
#hud .simfx .simc{ position:absolute; width:26px; height:26px; border:2px solid var(--info); opacity:.5; }
#hud .simfx .c1{ left:10px; top:10px; border-right:0; border-bottom:0; }
#hud .simfx .c2{ right:10px; top:10px; border-left:0; border-bottom:0; }
#hud .simfx .c3{ left:10px; bottom:10px; border-right:0; border-top:0; }
#hud .simfx .c4{ right:10px; bottom:10px; border-left:0; border-top:0; }
#hud .simfx .simtag{ position:absolute; left:50%; top:12px; transform:translateX(-50%);
  font-family:var(--f-mono); font-size:var(--t-tiny); letter-spacing:var(--tr-wider); color:var(--info); opacity:.8; }
#hud .simfx .simtag i{ display:inline-block; width:7px; height:7px; border-radius:50%; background:var(--info);
  margin-right:7px; animation:pipblink 1.4s steps(2,start) infinite; }
#hud .telem{ position:absolute; left:14px; top:14px; width:236px; padding:9px 11px; z-index:8;
  font-family:var(--f-mono); font-size:var(--t-micro); line-height:1.5; color:var(--text-4);
  background:rgba(6,10,16,.8); border:1px solid rgba(127,230,255,.28); border-radius:var(--r-2); display:none; }
#hud.sim .telem{ display:block; }
#hud .telem h4{ font-size:var(--t-tiny); letter-spacing:var(--tr-wide); color:var(--info); font-weight:700;
  border-bottom:1px solid rgba(127,230,255,.25); padding-bottom:4px; margin-bottom:5px; display:flex; justify-content:space-between; }
#hud .telem .tg{ margin-top:6px; padding-top:5px; border-top:1px dashed rgba(255,255,255,.09); }
#hud .telem .tr2{ display:flex; justify-content:space-between; gap:8px; }
#hud .telem .tk{ color:var(--text-5); } #hud .telem .tv{ color:var(--text-2); }
#hud .telem .tv.hot{ color:var(--gold); } #hud .telem .tv.bad{ color:var(--danger); } #hud .telem .tv.ok{ color:var(--good); }
#hud .telem .subj{ color:var(--info); font-weight:700; }
/* ---- ALTITUDE LADDER: which of the four bands you're in, and which way you're moving ---- */
#hud .alt{ position:absolute; right:18px; top:196px; width:58px; display:flex; flex-direction:column-reverse; gap:3px; padding:8px 7px; align-items:stretch; }
#hud .alt .arung{ position:relative; height:24px; border-radius:var(--r-1); background:var(--surface-hi); border:1px solid var(--line); display:flex; align-items:center; justify-content:center; transition:background .18s, border-color .18s, transform .18s; }
#hud .alt .arung b{ font-family:var(--f-mono); font-size:var(--t-micro); letter-spacing:var(--tr); color:var(--text-6); font-weight:700; }
#hud .alt .arung.on{ transform:scaleX(1.12); }
#hud .alt .arung.on b{ color:var(--on-gold); }
#hud .alt .alab{ font-family:var(--f-mono); font-size:var(--t-micro); letter-spacing:var(--tr-wide); color:var(--text-5); text-align:center; padding-bottom:3px; }
#hud .alt .aval{ font-family:var(--f-mono); font-size:var(--t-tiny); color:var(--gold-pale); text-align:center; padding-top:4px; }
#hud .alt .aval i{ font-style:normal; color:var(--text-5); }
#hud .wantedrow{ font-size:var(--t-sm); font-weight:800; letter-spacing:.16em; color:var(--police); margin:1px 0 2px; text-shadow:0 0 10px rgba(90,160,255,.6); animation:pipblink 1.2s steps(2,start) infinite; }
#title .term .thchip{ cursor:pointer; color:#7fb0d0; border-bottom:1px dashed rgba(127,176,208,.5); pointer-events:auto; }
#title .term .thchip:hover{ color:#a8d8f0; }
.lswovl .atwrap{ display:flex; gap:16px; min-height:0; }
.lswovl .atlist{ flex:1.2; min-width:0; display:flex; flex-direction:column; gap:8px; }
.lswovl .atlist input{ font-family:'Cascadia Mono',Consolas,monospace; font-size:var(--t-body); color:var(--text); background:rgba(0,0,0,.4); border:1px solid rgba(255,255,255,.14); border-radius:var(--r-2); padding:7px 11px; outline:none; }
.lswovl .atchips{ display:flex; gap:5px; flex-wrap:wrap; }
.lswovl .atchips .c3{ font-size:var(--t-tiny); padding:4px 9px; }
.lswovl .atrows{ overflow-y:auto; max-height:46vh; display:flex; flex-direction:column; gap:5px; padding-right:4px; }
.lswovl .atrow{ cursor:pointer; display:flex; align-items:center; gap:9px; border:1px solid rgba(255,255,255,.08); border-radius:var(--r-2); padding:7px 10px; background:rgba(255,255,255,.02); }
.lswovl .atrow:hover{ border-color:rgba(245,178,26,.5); background:rgba(255,255,255,.05); }
.lswovl .atrow.sel{ border-color:var(--gold); background:rgba(245,178,26,.08); }
.lswovl .atrow .an3{ font-weight:800; font-size:var(--t-md); color:var(--text); }
.lswovl .atrow .ac3{ font-size:var(--t-label); color:var(--text-5); letter-spacing:.06em; }
.lswovl .atrow .apop{ margin-left:auto; text-align:right; font-family:'Cascadia Mono',Consolas,monospace; font-size:var(--t-tiny); color:var(--text-4); letter-spacing:.04em; }
.lswovl .atrow .atags{ display:flex; gap:3px; margin-top:2px; flex-wrap:wrap; }
.lswovl .atrow .atags i{ display:inline-block; width:8px; height:8px; border-radius:var(--r-1); }
.lswovl .atprev{ flex:1; display:flex; flex-direction:column; gap:9px; }
.lswovl .atprev canvas{ width:100%; border-radius:var(--r-3); border:1px solid rgba(255,255,255,.1); background:#0c0e14; }
.lswovl .atmeta{ font-family:'Cascadia Mono',Consolas,monospace; font-size:var(--t-label); color:var(--text-4); line-height:1.7; letter-spacing:.05em; }
.lswovl .atmeta b{ color:var(--gold); }
.lswovl .atbtns{ display:flex; flex-direction:column; gap:7px; }
.lswovl .atbtns .odone{ margin-top:0; }
/* ================= THE CODEX — a Planetary-grade CASE FILE per superweapon ================= */
.lswovl.codex{ align-items:flex-start; padding:3vh 0; overflow-y:auto; }
.lswovl .cfbox{ position:relative; width:min(980px,95vw); margin:auto; background:linear-gradient(178deg, rgba(20,21,26,.99), rgba(13,14,18,.99)); border:1px solid rgba(245,178,26,.3); border-radius:var(--r-1); padding:0 0 18px; font-family:'Rajdhani','Inter',sans-serif; color:var(--text-2); overflow:hidden; }
.lswovl .cfbox::before{ content:''; position:absolute; inset:0; pointer-events:none; z-index:5; background:repeating-linear-gradient(0deg, rgba(255,255,255,.016) 0 1px, transparent 1px 3px); }
.lswovl .cfbox::after{ content:'THRESHOLD TREATY OFFICE — UNAUTHORIZED DISCLOSURE IS A TREATY OFFENSE'; position:absolute; left:50%; top:50%; transform:translate(-50%,-50%) rotate(-28deg); font-family:'Cascadia Mono',Consolas,monospace; font-weight:700; font-size:26px; letter-spacing:.24em; white-space:nowrap; color:#f4efe6; opacity:.035; pointer-events:none; }
.lswovl .cftop{ display:flex; align-items:center; gap:12px; background:var(--ink); border-bottom:2px solid var(--gold-deep); padding:11px 18px; }
.lswovl .cftop .clschip{ font-family:'Cascadia Mono',Consolas,monospace; font-size:var(--t-tiny); font-weight:700; letter-spacing:.18em; color:#fff; background:#a8161d; padding:3px 9px; border-radius:var(--r-1); flex:0 0 auto; }
.lswovl .cftop .cft{ font-family:'Cascadia Mono',Consolas,monospace; font-size:var(--t-sm); letter-spacing:.22em; color:var(--text-2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.lswovl .cftop .cfnav{ margin-left:auto; display:flex; gap:6px; flex:0 0 auto; }
.lswovl .cftop .cfnav span{ cursor:pointer; width:28px; height:28px; display:inline-flex; align-items:center; justify-content:center; border:1px solid rgba(255,255,255,.18); border-radius:var(--r-1); color:var(--gold); font-size:17px; font-weight:800; background:rgba(255,255,255,.04); user-select:none; }
.lswovl .cftop .cfnav span:hover{ border-color:var(--gold); }
.lswovl .cfhead{ display:flex; align-items:flex-start; gap:18px; padding:16px 22px 6px; position:relative; }
.lswovl .cfhead .cfportrait{ flex:0 0 92px; height:92px; border-radius:var(--r-2); border:2px solid var(--cfa,var(--gold-deep)); display:flex; align-items:center; justify-content:center; font-size:44px; font-weight:900; color:var(--cfa,var(--gold-deep)); background:radial-gradient(80% 80% at 50% 35%, rgba(255,255,255,.07), rgba(0,0,0,.35)); text-shadow:0 0 24px var(--cfa); }
.lswovl .cfhead .cfid .cfalias{ font-size:36px; font-weight:800; letter-spacing:.04em; line-height:1; color:var(--cfa,var(--gold)); }
.lswovl .cfhead .cfid .cfrole{ font-size:var(--t-sm); letter-spacing:.26em; text-transform:uppercase; color:var(--gold-pale); margin:3px 0 8px; }
.lswovl .cfhead .cfid .cfmeta{ font-family:'Cascadia Mono',Consolas,monospace; font-size:var(--t-label); letter-spacing:.1em; color:var(--text-5); }
.lswovl .cfstamp{ position:absolute; right:26px; top:14px; transform:rotate(7deg); font-family:'Cascadia Mono',Consolas,monospace; font-weight:700; font-size:var(--t-lg); letter-spacing:.3em; color:var(--stamp); border:3px solid var(--stamp); border-radius:var(--r-1); padding:5px 14px 5px 17px; opacity:.85; mix-blend-mode:screen; text-align:center; line-height:1.5; }
.lswovl .cfstamp small{ display:block; font-size:var(--t-micro); letter-spacing:.2em; color:var(--stamp); }
.lswovl .cfgrid{ display:grid; grid-template-columns:1fr 1fr; gap:0 26px; padding:8px 22px 4px; }
.lswovl .cfsec{ margin-bottom:13px; min-width:0; }
.lswovl .cfsec.wide{ grid-column:1 / -1; }
.lswovl .cfsec .cfsh{ font-family:'Cascadia Mono',Consolas,monospace; font-size:var(--t-label); font-weight:700; letter-spacing:.26em; color:var(--gold-deep); border-bottom:1px dashed rgba(245,178,26,.4); padding-bottom:4px; margin-bottom:7px; }
.lswovl .cfrow{ display:flex; gap:10px; font-family:'Cascadia Mono',Consolas,monospace; font-size:var(--t-sm); padding:2px 0; }
.lswovl .cfrow .k{ flex:0 0 148px; color:var(--text-5); letter-spacing:.05em; }
.lswovl .cfrow .v{ color:var(--text); min-width:0; }
.lswovl .cfrow .v.hot{ color:var(--gold); } .lswovl .cfrow .v.ok{ color:var(--good); } .lswovl .cfrow .v.syn{ color:var(--info); }
.lswovl .redact{ display:inline-block; background:#0c0d11; color:transparent; border-radius:var(--r-1); box-shadow:inset 0 0 0 1px rgba(255,255,255,.05); user-select:none; }
.lswovl table.cfarm{ width:100%; border-collapse:collapse; font-family:'Cascadia Mono',Consolas,monospace; }
.lswovl table.cfarm th{ font-size:var(--t-micro); letter-spacing:.2em; color:var(--text-5); text-transform:uppercase; text-align:left; padding:4px 7px; border-bottom:1px solid rgba(245,178,26,.35); }
.lswovl table.cfarm td{ font-size:var(--t-label); padding:4.5px 7px; border-bottom:1px solid rgba(255,255,255,.05); color:var(--text-2); vertical-align:top; }
.lswovl table.cfarm td.sl2{ color:var(--gold); font-weight:700; width:40px; }
.lswovl table.cfarm td.an3{ color:var(--text); font-weight:700; white-space:nowrap; }
.lswovl table.cfarm td.dm{ color:#ff9a6a; }
.lswovl table.cfarm tr.ult td{ background:rgba(245,178,26,.05); }
.lswovl .cfcounter{ display:flex; flex-direction:column; gap:5px; }
.lswovl .cfcounter .cn{ display:flex; gap:8px; font-size:var(--t-body); line-height:1.45; color:var(--text-2); }
.lswovl .cfcounter .cn i{ flex:0 0 auto; font-style:normal; color:var(--danger-2); font-family:'Cascadia Mono',Consolas,monospace; font-size:var(--t-label); padding-top:2px; }
.lswovl .cfquote{ border-left:3px solid rgba(216,31,38,.6); padding:6px 12px; font-style:italic; font-size:var(--t-md); color:var(--text-2); background:rgba(216,31,38,.05); border-radius:0 6px 6px 0; }
.lswovl .cfquote b{ display:block; font-style:normal; font-family:'Cascadia Mono',Consolas,monospace; font-size:var(--t-tiny); letter-spacing:.16em; color:var(--danger-2); margin-top:4px; }
.lswovl .cffoot{ display:flex; justify-content:space-between; align-items:center; font-family:'Cascadia Mono',Consolas,monospace; font-size:var(--t-tiny); letter-spacing:.18em; color:var(--text-6); padding:10px 22px 0; border-top:1px dashed rgba(255,255,255,.1); margin:4px 22px 0; }
.lswovl .cfbtnrow{ display:flex; gap:9px; padding:12px 22px 0; }
.lswovl .cfbtnrow .odone{ margin-top:0; flex:1; }
#title .pvcodex{ cursor:pointer; margin-top:11px; text-align:center; font-family:var(--mono); font-size:var(--t-label); font-weight:700; letter-spacing:.22em; color:#0d0e12; background:linear-gradient(180deg,var(--gold),var(--gold-warm)); border-radius:var(--r-2); padding:9px 8px; box-shadow:0 3px 0 var(--gold-shadow); user-select:none; }
#title .pvcodex:hover{ filter:brightness(1.08); }
.lswovl table.rk tr{ cursor:pointer; }
  /* ================= RESPONSIVE: phones & tablets =================
     Every screen must be reachable and readable on an iPhone. Multi-column layouts
     collapse to one scrollable column; tap targets grow; the HUD compacts. */
  @media (max-width: 900px){
    /* the title screen is a SCROLLING PAGE on a phone — pan-y so iOS never swallows the gesture,
       and bottom padding so nothing hides under the fixed ENTER bar */
    #title{ gap:10px; justify-content:flex-start; overflow-y:auto; -webkit-overflow-scrolling:touch;
      touch-action:pan-y; padding:12px 10px calc(96px + env(safe-area-inset-bottom)); }
    #title h1{ font-size:clamp(22px,7vw,38px); margin-top:2px; }
    #title .topbar{ position:static; order:-1; width:100%; display:grid; grid-template-columns:repeat(3,1fr); gap:6px; margin-bottom:2px; }
    #title .topbar button{ padding:10px 6px; font-size:11px; }
    #title .clsbar{ width:100%; }
    #title .clsbar .clsline{ font-size:8px; letter-spacing:.1em; }
    #title .selwrap{ flex-direction:column; gap:12px; }
    #title .preview{ flex:0 0 auto; max-height:none; width:100%; }
    #title .modes{ gap:8px; }
    #title .modecard{ width:calc(50% - 8px); padding:9px 10px; }
    .roster{ grid-template-columns:repeat(2,1fr); max-height:none; }
    /* ENTER THE ARENA is FIXED to the bottom of the viewport: you can always reach it, at any
       scroll position. (Sticky inside a nested flex column did not survive on iOS.) */
    .startbtn{ position:fixed; left:10px; right:10px; bottom:calc(10px + env(safe-area-inset-bottom));
      width:auto; margin:0; padding:16px 20px; font-size:16px; z-index:40; }
    #title .roster{ padding-bottom:4px; }
    #title .modehint{ margin-bottom:2px; }
    /* overlays: full-bleed sheets */
    .lswovl{ align-items:stretch; }
    .lswovl.codex{ overflow-y:auto; -webkit-overflow-scrolling:touch; }
    .lswovl.codex .cfbox{ max-height:none; }   /* the OVERLAY scrolls the case file, not the box */
    .lswovl .cftop{ flex-wrap:wrap; gap:6px; }
    .lswovl .cftop .cft{ font-size:var(--t-micro); letter-spacing:var(--tr); flex:1 1 100%; order:3; white-space:normal; }
    .lswovl .cffoot{ flex-direction:column; gap:4px; text-align:center; }
    .lswovl .cfhead{ padding:12px 14px 4px; }
    .lswovl .cfgrid{ padding:8px 14px 4px; }
    .lswovl .obox, .lswovl .cfbox{ width:100% !important; max-height:100vh; border-radius:0; margin:0;
      padding-top:calc(14px + env(safe-area-inset-top)); padding-bottom:calc(14px + env(safe-area-inset-bottom)); }
    .lswovl .atwrap, .lswovl .brwrap{ flex-direction:column; }
    .lswovl .atrows{ max-height:38vh; }
    .lswovl .brcol{ gap:7px; }
    .lswovl .bm::after{ display:none; }
    .lswovl .rkmeta{ display:none; }
    .lswovl table.rk td, .lswovl table.rk th{ padding:5px 4px; }
    .lswovl .odone{ padding:15px 18px; }
    /* the case file stacks to one column */
    .lswovl .cfgrid{ grid-template-columns:1fr; }
    .lswovl .cfrow{ flex-wrap:wrap; }
    .lswovl .cfrow .k{ flex:0 0 110px; }
    .lswovl .cfrow .v{ flex:1 1 100%; padding-left:110px; margin-top:-14px; }
    /* wide data tables scroll sideways instead of blowing out the page */
    .lswovl table.rk{ display:block; overflow-x:auto; white-space:nowrap; }
    .lswovl table.rk td.rec:last-of-type, .lswovl table.rk th:nth-child(6){ display:none; }  /* KO col: least useful on a phone */
    .lswovl .cfhead{ flex-wrap:wrap; }
    .lswovl .cfstamp{ position:static; transform:none; margin-top:8px; }
    .lswovl table.cfarm{ display:block; overflow-x:auto; white-space:nowrap; }
    /* the news broadcast stacks: TV first, then the script */
    #hud .nbody{ flex-direction:column; }
    #hud .ncl{ flex:0 0 auto; }
    #hud .nhead{ font-size:22px; }
    #hud .endscr.news{ padding:10px 8px 42px; }
    #hud .nboards{ flex-direction:column; }
    /* HUD compaction so the play area survives */
    #hud .hint{ display:none; }
    #hud .radar{ width:104px; height:104px; top:calc(8px + env(safe-area-inset-top)); right:8px; }
    #hud .radar canvas{ width:104px; height:104px; }
    #hud .alt{ top:calc(120px + env(safe-area-inset-top)); right:8px; width:44px; padding:5px; }
    #hud .pip{ display:none; }
    #hud .pl{ left:8px; bottom:calc(8px + env(safe-area-inset-bottom)); min-width:150px; padding:8px 10px; transform:scale(.9); transform-origin:bottom left; }
    #hud .kit{ left:8px; bottom:calc(150px + env(safe-area-inset-bottom)); transform:scale(.85); transform-origin:bottom left; }
    #hud .slots{ display:none; }              /* the touch rail replaces them */
    #hud .cityplate{ bottom:auto; top:calc(8px + env(safe-area-inset-top)); left:8px; transform:none; font-size:8.5px; max-width:52vw; }
    #hud .modebar{ top:calc(4px + env(safe-area-inset-top)); transform:translateX(-50%) scale(.85); }
    #hud .endscr .btns{ flex-direction:column; width:100%; }
    #hud .endscr button{ width:100%; }
  }
  /* NO ORIENTATION GATE. The game is perfectly playable in portrait (you just see less of the
     street), and a full-screen "rotate your device" wall is one more thing standing between the
     player and the fight. Landscape is a suggestion, not a requirement. */
  /* rotate nudge — the arena reads far better in landscape on a phone */
  #hud .rotate{ position:absolute; inset:0; z-index:30; display:none; align-items:center; justify-content:center;
    background:rgba(4,5,9,.92); pointer-events:auto; text-align:center; padding:24px; }
  #hud .rotate div{ font-family:var(--f-display); }
  #hud .rotate .ri{ font-size:44px; margin-bottom:10px; animation:rot 2.2s ease-in-out infinite; }
  @keyframes rot{ 0%,100%{ transform:rotate(0); } 50%{ transform:rotate(90deg); } }
`;

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

// LeFevre Threat Level scale (Living Superweapon Threshold Treaty)
export const THREAT_COLORS = { 'Low': 'var(--good)', 'Moderate': 'var(--gold)', 'High': '#ff9a3a', 'Very High': 'var(--danger)', 'Extreme': '#ff2f2f' };

// "What am I getting into?" — a mechanical AT-A-GLANCE derived from the ACTUAL kit, so it can
// never drift from the data. Returns [iconName, text, lead?] chips.
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
  if (def.guardType === 'deflect') out.push(['defense', 'DEFLECT guard — bullets bounce back']);
  else if (def.guardType === 'barrier') out.push(['defense', 'BARRIER guard — blocks 360°, costs ki']);
  // what they actually carry
  const nBeams = A.filter(a => a.type === 'beam').length;
  if (nBeams) out.push(['energy', nBeams > 1 ? nBeams + ' beams' : 'a beam']);
  if (has('rifle')) out.push(['range', 'guns']);
  if (has('bow')) out.push(['range', 'a payload bow']);
  if (has('charge')) out.push(['power', 'a charge bomb — hold to grow it']);
  if (has('spiritbomb')) out.push(['power', 'a giant channeled orb']);
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
  switch (a.type) {
    case 'beam': return (a.charge ? 'Chargeable ' : '') + 'steerable energy beam' + (a.radius > 2 ? ' (wide)' : ' (thin)');
    case 'projectile': return (a.homing ? 'Homing ' : '') + (a.grav ? 'lobbed ' : '') + 'blast' + (a.shock ? ', cracks the ground' : '');
    case 'volley': return 'rapid alternating-hand blast volley';
    case 'cone': return a.cold ? 'wide freezing breath — slows on hit' : 'wide force cone — knockback';
    case 'charge': return 'hold to charge a size-scaling blast + ground shockwave';
    case 'spiritbomb': return 'channel a giant orb overhead, then hurl it';
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
    default: return a.type;
  }
}

export class HUD {
  constructor(game) {
    this.game = game;
    const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s);
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
      <div class="rotate" id="hRotate"><div><div class="ri">📱</div><div style="font-size:18px;font-weight:800;letter-spacing:.1em;color:var(--gold)">ROTATE YOUR DEVICE</div><div style="font-size:13px;color:var(--text-3);margin-top:6px">The arena plays in landscape.</div></div></div>
      <div class="panel hint" id="hHint">
        <div class="hintchip">❓ <b>F1</b> CONTROLS</div>
        <div class="hintbody" id="hHintBody">
        <b>WASD</b> move · <b>Mouse</b> aim · <b>Click a foe</b> to lock/face · <b>T</b> unlock<br/>
        <b>LMB/RMB</b> powers · <b>Q E H</b> skills · <b>R</b> ultimate<br/>
        <b>V</b> tap jab / <b>HOLD</b> haymaker (crushes guards) · <b>G</b> grab<br/>
        <b>C / Mouse4</b> guard · <b>X</b> item (beacon) · <b>SHIFT</b> dash · <b>2×TAP</b> move = evade<br/>
        <b>F</b> flight ON/OFF · <b>SPACE</b> rise · release = hover · <b>Z</b> descend · <b>WHEEL</b> swap hero<br/>
        <b>1–0</b>/<b>TAB</b> heroes · <b>B</b> rival · <b>ESC</b> pause<br/>
        🎮 <b>Pad</b>: sticks move/aim · R2/L2 powers · ▢○ melee · L1 guard
        </div>
      </div>
      <div class="panel tut" id="hTut" style="display:none">
        <span class="tskip" id="hTutSkip">skip ✕</span>
        <div class="tstep" id="hTutStep"></div>
        <div class="tobj" id="hTutObj"></div>
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
    });
    this._buildOverlays();
  }

  // ---- options + how-to-play overlays (on <body> so they stack above the title screen) ----
  _buildOverlays() {
    const mk = (id) => { const d = document.createElement('div'); d.id = id; d.className = 'lswovl'; document.body.appendChild(d); return d; };
    this.optionsEl = mk('hOptions'); this.howtoEl = mk('hHowto'); this.onlineEl = mk('hOnline'); this.damageEl = mk('hDamage');
    this.rankingsEl = mk('hRankings'); this.bracketEl = mk('hBracket'); this.atlasEl = mk('hAtlas');
    this.codexEl = mk('hCodex'); this.codexEl.classList.add('codex');
    try { this.theater = JSON.parse(localStorage.getItem('threshold_theater_v1') || 'null') || { flagship: true, seed: 1 }; } catch { this.theater = { flagship: true, seed: 1 }; }
  }

  // ---- THE CITY ATLAS: 1,050 real cities off the world sheet → pick a theater, preview its plan ----
  resolveTheaterPlan() {
    const t = this.theater || { flagship: true };
    if (t.gallery) return galleryPlan();
    if (t.flagship || t.cityId == null) return thresholdPlan();
    const city = cityList()[t.cityId];
    return city ? generatePlan(city, t.seed || 1) : thresholdPlan();
  }
  _drawPlanPreview(cvs, plan) {
    const x = cvs.getContext('2d'); const S = cvs.width;
    x.clearRect(0, 0, S, S);
    x.fillStyle = '#0c0e14'; x.fillRect(0, 0, S, S);
    if (!plan.cells) {   // the flagship — stylized card
      x.fillStyle = '#ffd97a'; x.font = '800 15px Rajdhani,sans-serif'; x.textAlign = 'center';
      x.fillText('THE WHITE CITY', S / 2, S / 2 - 8);
      x.fillStyle = '#8b8577'; x.font = '9px Consolas,monospace';
      x.fillText('FLAGSHIP THEATER — HAND-BUILT', S / 2, S / 2 + 10);
      return;
    }
    const N = plan.N, pad = 12, cs = (S - pad * 2) / N, gap = Math.max(2, cs * 0.1);
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const cell = plan.cells[r][c];
      const px = pad + c * cs, py = pad + r * cs;
      if (!cell) { x.fillStyle = '#181a20'; x.fillRect(px + gap / 2, py + gap / 2, cs - gap, cs - gap); continue; }
      if (cell.t === 'water') { x.fillStyle = '#2a5a78'; x.fillRect(px, py, cs, cs); continue; }
      x.fillStyle = (TILE_INFO[cell.t] ? TILE_INFO[cell.t].c : 'var(--text-6)') + 'cc';
      x.fillRect(px + gap / 2, py + gap / 2, cs - gap, cs - gap);
      x.fillStyle = 'rgba(0,0,0,.55)'; x.font = `700 ${Math.max(7, cs * 0.16)}px Consolas,monospace`; x.textAlign = 'center';
      x.fillText((cell.t[0] + (cell.v ?? '')).toUpperCase(), px + cs / 2, py + cs / 2 + 3);
    }
    x.fillStyle = '#ffd97a'; x.font = '800 12px Rajdhani,sans-serif'; x.textAlign = 'left';
    x.fillText(plan.name.toUpperCase(), pad, S - 4);
  }
  showAtlas() {
    const cities = cityList();
    const st = this._atlasSt || (this._atlasSt = { q: '', type: 'ALL', sel: this.theater.flagship ? -1 : (this.theater.cityId ?? -1), seed: this.theater.seed || 1 });
    const TYPES = ['ALL', 'Military', 'Political', 'Industrial', 'Company', 'Seaport', 'Resort', 'Mining', 'Educational', 'Temple'];
    const render = () => {
      const q = st.q.toLowerCase();
      let L = cities.filter(c => (st.type === 'ALL' || c.types.includes(st.type)) && (!q || (c.name + ' ' + c.country).toLowerCase().includes(q)));
      const shown = L.slice(0, 28);
      const selCity = st.sel >= 0 ? cities[st.sel] : null;
      const plan = st.sel < 0 ? thresholdPlan() : generatePlan(selCity, st.seed);
      this.atlasEl.innerHTML = `<div class="obox" style="width:min(940px,96vw)">
        <div class="rkhead"><div class="n9" style="background:#2a5a78">🗺</div>
          <div class="rt"><b>CITY ATLAS — THEATER SELECT</b><span>the world sheet · ${cities.length} registered cities</span></div>
          <div class="rkmeta">TILES: ${Object.keys(TILE_INFO).length} TYPES · 2–3 VARIANTS<br/>GRID: 96u CELLS + 22u STREETS</div></div>
        <div class="atwrap">
          <div class="atlist">
            <input id="atQ" placeholder="QUERY: city or country…" value="${esc(st.q)}">
            <div class="atchips">${TYPES.map(t => `<span class="c3${st.type === t ? ' on' : ''}" data-at="${t}">${t.toUpperCase()}</span>`).join('')}</div>
            <div class="atrows">
              <div class="atrow${st.sel < 0 ? ' sel' : ''}" data-ci="-1"><div><div class="an3">THE WHITE CITY <span style="font-size:var(--t-tiny);color:var(--gold)">★ FLAGSHIP</span></div><div class="ac3">Threshold Treaty Zone — the hand-built original</div></div><div class="apop">CITY<br/>SAFE 62</div></div>
              ${shown.map(c => `<div class="atrow${st.sel === c.id ? ' sel' : ''}" data-ci="${c.id}">
                <div><div class="an3">${esc(c.name)}</div><div class="ac3">${esc(c.country)} · ${esc(c.types.join(' / ') || '—')}</div>
                <div class="atags">${c.types.map(t => `<i style="background:${(TILE_INFO[t.toLowerCase()] || {}).c || 'var(--text-6)'}" title="${esc(t)}"></i>`).join('')}</div></div>
                <div class="apop">${esc(c.popType.toUpperCase())}<br/>CRIME ${c.crime}</div>
              </div>`).join('')}
              ${L.length > 28 ? `<div class="ac3" style="text-align:center;padding:4px">… ${L.length - 28} more — refine the query</div>` : ''}
            </div>
          </div>
          <div class="atprev">
            <canvas id="atCv" width="260" height="260"></canvas>
            <div class="atmeta" id="atMeta"></div>
            <div class="atbtns">
              <button class="odone oghost" id="atSeed">⟳ REROLL LAYOUT (SEED ${st.seed})</button>
              <button class="odone" id="atSet">📍 SET AS THEATER</button>
              <button class="odone oghost" id="atGal">🧱 TILE PROVING GROUND</button>
              <button class="odone oghost" id="atClose">CLOSE</button>
            </div>
          </div>
        </div>
      </div>`;
      this._drawPlanPreview(this.atlasEl.querySelector('#atCv'), plan);
      this.atlasEl.querySelector('#atMeta').innerHTML = st.sel < 0
        ? `<b>THE WHITE CITY</b> — 5×5 flagship grid<br/>Four districts + harbor + the bridge<br/>Hand-tuned; the planner's benchmark`
        : `<b>${esc(selCity.name.toUpperCase())}</b>, ${esc(selCity.country)}<br/>${esc(popLabel(selCity.popType, selCity.pop))}<br/>TYPES: ${esc(selCity.types.join(' · ') || 'GENERAL')}<br/>CRIME ${selCity.crime} · SAFETY ${selCity.safety} · GRID ${plan.N}×${plan.N}<br/>POLICE RESPONSE ~${Math.round(Math.max(5, Math.min(24, 26 - selCity.safety * 0.25)))}s ${selCity.safety >= 60 ? '· RAPID' : selCity.safety <= 30 ? '· SLOW' : ''}`;
      const $ = (s) => this.atlasEl.querySelector(s);
      $('#atQ').oninput = (e) => { st.q = e.target.value; render(); setTimeout(() => { const i = $('#atQ'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 0); };
      this.atlasEl.querySelectorAll('[data-at]').forEach(ch => ch.onclick = () => { st.type = ch.dataset.at; render(); });
      this.atlasEl.querySelectorAll('[data-ci]').forEach(row => row.onclick = () => { st.sel = +row.dataset.ci; st.seed = 1; render(); });
      $('#atSeed').onclick = () => { st.seed++; render(); };
      $('#atSet').onclick = () => {
        this.theater = st.sel < 0 ? { flagship: true, seed: 1 } : { cityId: st.sel, seed: st.seed };
        try { localStorage.setItem('threshold_theater_v1', JSON.stringify(this.theater)); } catch {}
        this.atlasEl.style.display = 'none';
        const tt = this.title.querySelector('#termTheater'); if (tt) tt.textContent = st.sel < 0 ? 'THE WHITE CITY' : cities[st.sel].name.toUpperCase();
        this.feed('Theater set — ' + (st.sel < 0 ? 'THE WHITE CITY' : cities[st.sel].name.toUpperCase()), '#7fb0d0');
      };
      $('#atGal').onclick = () => { this.theater = { gallery: true }; this.atlasEl.style.display = 'none'; this.onProvingGround && this.onProvingGround(); };
      $('#atClose').onclick = () => { this.atlasEl.style.display = 'none'; };
    };
    render();
    this.atlasEl.style.display = 'flex';
  }

  // ---- the KMK 9 SPORTS DESK power board — every match (AI or piloted) moves the book ----
  showRankings() {
    const rows = rankingTable(ROSTER);
    const champ = championId();
    this.rankingsEl.innerHTML = `<div class="obox" style="width:min(780px,94vw)">
      <div class="rkhead">
        <div class="n9">9</div>
        <div class="rt"><b>SUPERWEAPON POWER RANKINGS</b><span>KMK 9 sports desk · the official book</span></div>
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
    el.innerHTML =
      grp('MOVE & AIM', [['WASD', 'move'], ['MOUSE', 'aim'], ['CLICK FOE', 'lock on · T to release'], ['2×TAP', 'evade'], ['SHIFT', 'dash']]) +
      grp('MELEE', [['V', 'tap = jab · HOLD = haymaker'], ['G', 'grab · hoist a car/tree'], [K.guardLabel, 'guard (hold)']]) +
      grp('POWERS', [
        wheelSel ? ['WHEEL', 'pick a power'] : null,
        [wheelSel ? 'LMB' : 'LMB / RMB', wheelSel ? 'fire the picked power' : 'primary · secondary'],
        wheelSel ? ['RMB', 'secondary'] : null,
        ['Q / E', 'skills'], ['H', '4th power'], ['R', 'ULTIMATE'], [K.itemLabel, 'gadget'],
      ]) +
      grp('FLIGHT', [['F', 'flight ON/OFF'], [K.upLabel, 'rise'], [K.downLabel, 'descend'], ['SHIFT (air)', 'cruise']]) +
      grp('SYSTEM', [[K.swapLabel, 'swap hero'], ['TAB', 'roster'], ['B', 'spawn rival'], ['ESC', 'pause'], ['F1', 'this panel']]);
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
    const band = y < 8 ? 0 : y < 150 ? 1 : y < 260 ? 2 : 3;
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
    const b = p.pos.y < 8 ? 0 : p.pos.y < 150 ? 1 : p.pos.y < 260 ? 2 : 3;
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
  showTutorial(st, i, n) {
    const t = this.el.tut; t.style.display = 'block';
    t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop');
    this.el.tutStep.textContent = `LEARN TO PLAY — ${i + 1} / ${n}`;
    this.el.tutObj.textContent = st.obj;
    this.el.tutKeys.textContent = st.keys;
    this.el.tutTip.textContent = st.tip;
    this.el.tutDots.innerHTML = Array.from({ length: n }, (_, k) => `<i class="${k < i ? 'on' : ''}"></i>`).join('');
  }
  tutorialStepDone() { this.flashScreen('var(--gold)', 0.08); }
  completeTutorial() { this.hideTutorial(); }
  hideTutorial() { if (this.el.tut) this.el.tut.style.display = 'none'; }
  overlayOpen() { return [this.optionsEl, this.howtoEl, this.rankingsEl, this.bracketEl, this.atlasEl, this.codexEl, this.damageEl].some(e => e && e.style.display === 'flex'); }
  closeOverlays() { for (const e of [this.optionsEl, this.howtoEl, this.rankingsEl, this.atlasEl, this.codexEl, this.damageEl]) if (e) e.style.display = 'none'; }   // the bracket closes only through its own buttons

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
          <span class="cft">CASE FILE ${esc(fno)} · SUPERWEAPON REGISTRY · COSMIC-EYES ONLY</span>
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
        <div class="cfgrid">
          <div class="cfsec">
            <div class="cfsh">§01 · IDENTIFICATION</div>
            <div class="cfrow"><span class="k">LEGAL NAME</span><span class="v">${esc(idn.n)}</span></div>
            <div class="cfrow"><span class="k">REGISTERED</span><span class="v">${esc(idn.c)}</span></div>
            <div class="cfrow"><span class="k">NATION</span><span class="v">${esc(idn.co)} ${idn.f}</span></div>
            <div class="cfrow"><span class="k">STATUS</span><span class="v ${synth ? 'syn' : 'ok'}">● ${synth ? 'OPERATIONAL — SYNTHETIC PLATFORM' : 'ACTIVE IN THE FIELD'}</span></div>
            <div class="cfrow"><span class="k">RESIDENCE</span><span class="v">${red(14)}</span></div>
            <div class="cfrow"><span class="k">NEXT OF KIN</span><span class="v">${red(8)} — SEALED ADDENDUM</span></div>
            <div class="cfrow"><span class="k">FRAME</span><span class="v">${CF_BUILD[c.strength ?? 5]} · STR ${c.strength ?? 5}/10 · 1.80m REF</span></div>
            <div class="cfrow"><span class="k">VOICE</span><span class="v">${vp < 0.85 ? 'LOW REGISTER' : vp > 1.1 ? 'HIGH REGISTER' : 'MID REGISTER'}${c.yells ? ' · BATTLE-VOCAL CONFIRMED' : ' · QUIET OPERATOR'}</span></div>
            <div class="cfrow"><span class="k">POWER CORE</span><span class="v ${c.energyInfinite ? 'syn' : ''}">${c.energyInfinite ? '∞ CORE — NEVER DRAINS · TIER-CAPPED II' : `KI RESERVE ${c.ki} · REGEN STANDARD`}</span></div>
          </div>
          <div class="cfsec">
            <div class="cfsh">§02 · THREAT ASSESSMENT</div>
            <div class="cfrow"><span class="k">LEFEVRE CLASS</span><span class="v" style="color:${tc};font-weight:700">${esc(c.threat || 'UNRATED')}</span></div>
            <div class="cfrow"><span class="k">BASIS</span><span class="v">PEAK OUTPUT ${st.power}/10 · REACH ${st.range}/10 · MOBILITY ${st.mobility}/10 · RESILIENCE ${st.defense}/10</span></div>
            <div class="cfrow"><span class="k">HULL</span><span class="v">${c.hp} HP · GUARD ${(c.guardType || 'standard').toUpperCase()}${(c.meleeTiers ?? 3) >= 3 ? ' · FULL STRIKE CHAIN' : ' · SHORT STRIKE CHAIN'}</span></div>
            <div class="cfrow"><span class="k">FLIGHT CERT</span><span class="v">${['GROUNDED — LEAP ONLY', 'CLASS I — UNSTABLE', 'CLASS II — LEVITATOR', 'CLASS III — FULL FLIGHT'][ft]}${c.flySpeed ? ` · AIRSPEED ×${c.flySpeed}` : ''}</span></div>
            <div class="cfrow"><span class="k">ATTRIBUTES</span><span class="v">${ATTR_DEFS.map(a => `${a.name.slice(0, 3).toUpperCase()} <b style="color:${rankColor(at[a.k])}">${at[a.k]}</b>`).join(' · ')}</span></div>
            ${tl.length ? `<div class="cfrow"><span class="k">TALENTS</span><span class="v">${tl.map(k => TALENTS[k] ? TALENTS[k].name.toUpperCase() : '').filter(Boolean).join(' · ')}</span></div>` : ''}
            ${(c.items || []).length ? `<div class="cfrow"><span class="k">CARRIED GEAR</span><span class="v">${c.items.map(i => i.name.toUpperCase() + (i.charges ? '×' + i.charges : '')).join(' · ')}</span></div>` : ''}
          </div>
          <div class="cfsec">
            <div class="cfsh">§03 · SANCTIONED RECORD</div>
            <div class="cfrow"><span class="k">POWER INDEX</span><span class="v hot">${rec.elo} · RANK #${me.rank}/${snapAll.length}${champ ? ' · REIGNING CHAMPION' : ''}</span></div>
            <div class="cfrow"><span class="k">BOUT RECORD</span><span class="v">${rec.w}–${rec.l}${rec.w + rec.l ? '' : ' (UNTESTED)'}</span></div>
            <div class="cfrow"><span class="k">KNOCKDOWNS</span><span class="v">${rec.ko} SCORED / ${rec.kod} CONCEDED</span></div>
            ${incid.length ? incid.map(x => `<div class="cfrow"><span class="k">${x.win ? '▲ VICTORY' : '▼ DEFEAT'}</span><span class="v" style="color:${x.win ? 'var(--good)' : 'var(--danger-2)'}">${x.win ? 'def.' : 'lost to'} ${esc(x.vs)} · ${x.how === 'tournament' ? 'INVITATIONAL' : x.how.toUpperCase()} · ${agoStr(x.t)}</span></div>`).join('') : '<div class="cfrow"><span class="k">HISTORY</span><span class="v">NO SANCTIONED BOUTS ON RECORD</span></div>'}
          </div>
          <div class="cfsec">
            <div class="cfsh">§04 · SURVEILLANCE — BEHAVIORAL DOCTRINE</div>
            <div class="cfrow"><span class="k">DOCTRINE</span><span class="v hot">${(ai.style || 'BRAWLER').toUpperCase()}</span></div>
            <div class="cfrow"><span class="k">ENGAGEMENT BAND</span><span class="v">~${ai.range || 30}u PREFERRED</span></div>
            <div class="cfrow"><span class="k">AGGRESSION</span><span class="v">${Math.round((ai.aggro ?? 0.6) * 100)}%</span></div>
            <div class="cfrow"><span class="k">AIRBORNE TENDENCY</span><span class="v">${Math.round((ai.fly ?? 0.3) * 100)}%</span></div>
            <div class="cfrow"><span class="k">ESCAPE TECH</span><span class="v">${(ev.name || ev.kind || 'DASH').toUpperCase()} (${(ev.kind || 'dash').toUpperCase()})</span></div>
            ${[c.thorns && 'THORNED — PUNISHES GRABS', c.phase && 'INTANGIBILITY CAPABLE', c.grabHeal && 'ABSORBS ON GRAB', c.teleEscape && 'TELEPORT ESCAPE ARTIST', c.metal && 'ARMORED CHASSIS', c.frostResist && 'COLD-HARDENED', (c.beamMight || 1) >= 1.2 && 'CERTIFIED BEAM MASTER'].filter(Boolean).map(t => `<div class="cfrow"><span class="k">FLAG</span><span class="v hot">${t}</span></div>`).join('')}
          </div>
          <div class="cfsec wide">
            <div class="cfsh">§05 · DOCUMENTED ARMAMENT — VERIFIED FIGURES</div>
            <table class="cfarm"><tr><th>SLOT</th><th>DESIGNATION</th><th>CLASS</th><th>OUTPUT</th><th>KI</th><th>CYCLE</th><th>REACH</th><th>NOTES</th></tr>
            ${rows.map(r => `<tr class="${r.ult ? 'ult' : ''}"><td class="sl2">${esc(r.slot)}</td><td class="an3">${esc(r.name)}</td><td>${esc(r.kind)}</td><td class="dm">${esc(r.dmg)}</td><td>${esc(r.cost)}</td><td>${esc(r.cd)}</td><td>${esc(r.reach)}</td><td>${esc(r.notes)}</td></tr>`).join('')}
            </table>
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
        <div class="cffoot"><span>THRESHOLD TREATY OFFICE · INDEX COPY 7 OF 9</span><span>PAGE 1 OF 1 · FILE ${esc(fno)}</span></div>
        <div class="cfbtnrow"><button class="odone oghost" id="cfDone">CLOSE FILE</button></div>
      </div>`;
      const nav = (d) => { const i = ROSTER.indexOf(c); render(ROSTER[(i + d + ROSTER.length) % ROSTER.length]); };
      this.codexEl.querySelector('#cfPrev').onclick = () => nav(-1);
      this.codexEl.querySelector('#cfNext').onclick = () => nav(1);
      this.codexEl.querySelector('#cfClose').onclick = () => { this.codexEl.style.display = 'none'; };
      this.codexEl.querySelector('#cfDone').onclick = () => { this.codexEl.style.display = 'none'; };
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
      ${slider('voice', 'Voice · Battle Cries', 1, 0.05)}
      ${slider('shake', 'Screen Shake', 1.5, 0.05)}
      ${toggle('dmgNumbers', 'Damage Numbers')}
      ${toggle('hints', 'Controls Hint Panel')}
      ${toggle('aimAssist', 'Aim Assist · magnet targeting')}
      <div class="orow"><span class="ol">Control Scheme</span><div class="chips3">
        ${Object.entries(KEYMAPS).map(([k, m]) => `<span class="c3${keymap(S.scheme) === m ? ' on' : ''}" data-scheme="${k}">${m.name}</span>`).join('')}
      </div></div>
      <div class="oline2" id="schemeBlurb">${esc(keymap(S.scheme).blurb)}</div>
      <div class="orow"><span class="ol">Render Quality</span><div class="chips3">
        ${[['auto', 'AUTO'], ['2', 'HIGH'], ['1', 'BALANCED'], ['0', 'LOW']].map(([v, n]) => `<span class="c3${String(S.quality) === v ? ' on' : ''}" data-q="${v}">${n}</span>`).join('')}
      </div></div>
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
      clip._imgs = clip.frames.map((u) => { const im = new Image(); im.src = u; return im; });
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
      const txt = lvl ? `🚨 WANTED ${'★'.repeat(lvl)}${'☆'.repeat(3 - lvl)}` : '';
      if (txt !== this._wantedTxt) { this._wantedTxt = txt; this.el.wanted.style.display = lvl ? 'block' : 'none'; this.el.wanted.textContent = txt; }
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
  buildTitle(onStart) {
    // (10) OPEN WHERE YOU LEFT OFF — last hero, mode and format are restored from prefs
    const PF = this.prefs || {};
    let selMode = MODES.some(m => m.id === PF.mode) ? PF.mode : 'duel';
    let selP1 = ROSTER.find(r => r.id === PF.p1) || ROSTER[0];
    let selP2 = ROSTER[2], two = !!PF.two;
    if (PF.format) this._tFormat = PF.format;
    this.title.innerHTML = `
      <div class="topbar"><button id="tAtlas">🗺 Atlas</button><button id="tRank">📊 Rankings</button><button id="tNet">🌐 Online</button><button id="tTut">🎓 Tutorial</button><button id="tOpt">⚙ Options</button><button id="tHow">❓ How to Play</button></div>
      <div class="tag">Machine King Labs · Living Superweapon</div>
      <h1>LIVING SUPERWEAPON</h1>
      <div class="clsbar"><span class="clschip">TOP SECRET // THRESHOLD</span><span class="clsline">THRESHOLD TREATY OFFICE — SUPERWEAPON REGISTRY · INDEX COPY 7 OF 9 · COSMIC-EYES ONLY</span><span class="clschip">LSW-INDEX</span></div>
      <div class="term">&gt; QUERY: SUPERWEAPON INDEX — <b id="termCount"></b> · THEATER: <span class="thchip" id="termTheater" title="Open the City Atlas">${(() => { try { const t = this.theater; if (!t || t.flagship) return 'THE WHITE CITY'; if (t.gallery) return 'PROVING GROUND'; const c = cityList()[t.cityId]; return c ? c.name.toUpperCase() : 'THE WHITE CITY'; } catch { return 'THE WHITE CITY'; } })()}</span><span class="tcur">▍</span></div>
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

  showTitle() { this.titleOpen = true; this.title.style.display = 'flex'; this.title.style.visibility = 'visible'; this.title.style.opacity = '1'; }
  hideTitle() { this.titleOpen = false; this.title.style.opacity = '0'; setTimeout(() => { this.title.style.display = 'none'; }, 250); this.title.style.transition = 'opacity .25s'; }
}
