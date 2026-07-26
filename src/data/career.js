// THE CIRCUIT — the single-player career: the connective tissue between matches.
// A career is a PERSISTENT WEAPON working a world that already exists: every offer is
// generated off the LIVE Elo book (rankings.js), staged in a REAL city off the sheet
// (cities.js), paid in a purse the bank remembers, and while you fight, the rest of
// the roster sims its own matches so the board moves without you. Pure logic — zero
// DOM, zero Three.js. localStorage `threshold_career_v1`.

import { cityList } from './cities.js';
import { countryOf } from './countries.js';
import { snapshotTable, championId, crownChampion, injuryOf, healBout, matchElo, recOf } from './rankings.js';
import { recoveryPlan, deriveOrigin } from './origins.js';
import { advanceDays } from './orbits.js';

const KEY = 'threshold_career_v1';
export const TITLE_RENOWN = 60;        // the belt is EARNED — renown gates the title shot
export const CLINIC_FEE = 80;          // $K to heal an injury NOW instead of resting it off

// mulberry32 — deterministic slates: the same (seed, week) always deals the same offers,
// so the desk can be closed and reopened without rerolling the world.
function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function loadCareer() {
  try { const c = JSON.parse(localStorage.getItem(KEY) || 'null'); return c && c.heroId ? c : null; } catch { return null; }
}
export function saveCareer(c) { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch {} }
export function clearCareer() { try { localStorage.removeItem(KEY); } catch {} }

export function newCareer(heroId) {
  return {
    v: 1, heroId, week: 1, bank: 0, renown: 0, titles: 0, streak: 0, lastReport: null,
    seed: 1 + ((Math.random() * 1e6) | 0),
    history: [],                       // [{week, kind, foe, city, result:'W'|'L'|'REST', paid}]
    slate: null,                       // dealt lazily by genSlate — null after every week turn
  };
}

const pick = (R, arr) => arr[(R() * arr.length) | 0];

// a city for the fight — preference is a FILTER, never a hard requirement (small saves
// still get offers if no city matches). Stored as {name, country}: cityList() builds a
// FRESH array per call, so identity/index can never be persisted (the known law).
function pickCity(R, pred) {
  const all = cityList();
  const pool = pred ? all.filter(pred) : all;
  const c = pick(R, pool.length ? pool : all);
  return { name: c.name, country: c.country, crime: c.crime, safety: c.safety, pop: c.pop, popType: c.popType };
}

const duelPurse = (foeElo) => Math.max(30, Math.round((40 + Math.max(0, foeElo - 1100) * 0.25) / 5) * 5);
export const heatMult = (streak) => 1 + 0.08 * Math.min(5, streak || 0);   // promoters chase a run

// what the country sheet already makes TRUE in-match, surfaced on the card — an offer in
// Tokyo and an offer in Mogadishu are different FIGHTS, and the desk should say so.
function intelFor(city) {
  if (!city) return [];
  const co = countryOf(city.country), lines = [];
  if (co) {
    if (co.vigilantism === 'Banned') lines.push('VIGILANTISM BANNED — you are a criminal on sight; the street draws early');
    else if (co.vigilantism === 'Legal') lines.push('VIGILANTISM LEGAL — clean wins get CHEERED here');
    const eta = Math.max(5, Math.min(24, 26 - (city.safety || 40) * 0.25));
    lines.push('POLICE RESPONSE ~' + Math.round(eta) + 's — ' + (eta <= 9 ? 'collateral gets answered FAST' : eta >= 18 ? 'the law is a rumor out here' : 'standard dispatch'));
  }
  if ((city.crime || 0) >= 70) lines.push('CRIME ' + city.crime + ' — an armed street; corpses embolden nobody');
  return lines.slice(0, 3);
}
// fighting UP the board is a harder bot and a fatter purse; squashing down is neither
const gapAi = (myElo, foeElo) => +Math.max(0.85, Math.min(1.75, 1.02 + (foeElo - myElo) / 400 * 0.55)).toFixed(2);
const underdogMult = (myElo, foeElo) => 1 + Math.min(0.6, Math.max(0, (foeElo - myElo) / 400) * 0.5);

// THE SLATE — this week's offers, dealt from the live world. Deterministic per (seed, week).
export function genSlate(career, roster) {
  const R = mulberry(career.seed * 7919 + career.week * 104729);
  const table = snapshotTable(roster);
  const me = table.find(r => r.id === career.heroId);
  const defOf = (id) => roster.find(d => d.id === id);
  const offers = [];
  const usedFoes = new Set([career.heroId]);

  // an Elo NEIGHBOR — a real matchup, not a squash. Window widens until someone's home.
  const neighbor = (span) => {
    if (!me) return null;
    const i = table.indexOf(me);
    const cand = table.filter((r, j) => j !== i && Math.abs(j - i) <= span && !usedFoes.has(r.id) && defOf(r.id) && !defOf(r.id).police);
    return cand.length ? pick(R, cand) : null;
  };

  // 1 · THE HEADLINER — a ranked duel against a neighbor on the board.
  const heat = heatMult(career.streak);
  const rivalryWith = (foeName) => career.history.slice(0, 5).filter(x => x.foe === foeName).length >= 2;
  const dress = (o, foeRow) => {                    // heat + underdog + rivalry + intel, uniformly
    if (foeRow && me) {
      o.aiLevel = gapAi(me.elo, foeRow.elo);
      const um = underdogMult(me.elo, foeRow.elo);
      if (um > 1.05) { o.underdog = true; o.purse = Math.round(o.purse * um / 5) * 5; }
    }
    if (heat > 1.001) { o.heat = +heat.toFixed(2); o.purse = Math.round(o.purse * heat / 5) * 5; }
    if (o.foeName && rivalryWith(o.foeName)) { o.rivalry = true; o.renown = Math.round(o.renown * 1.5); }
    o.intel = intelFor(o.city);
    o.rankAtAccept = me ? me.rank : null;           // the WEEK REPORT's rank arrow starts here
    return o;
  };
  const h = neighbor(4) || neighbor(10) || neighbor(52);
  if (h) {
    usedFoes.add(h.id);
    const foe = defOf(h.id);
    offers.push(dress({
      id: 'w' + career.week + '-headliner', kind: 'duel', icon: '⚔', label: 'THE HEADLINER',
      foe: h.id, foeName: foe.name, city: pickCity(R, c => c.pop >= 900000),
      purse: duelPurse(h.elo), renown: 8 + Math.max(0, (me ? me.rank : 99) - h.rank),
      blurb: `A ranked bout. ${foe.name} sits #${h.rank} on the board (${h.w}–${h.l}). Win and the book moves.`,
    }, h));
  }

  // 2 · THE GRUDGE — your own record remembers who beat you. The book IS the memory.
  const rec = recOf(career.heroId, defOf(career.heroId));
  const lastLoss = (rec.hist || []).find(x => !x.win && defOf(x.vs) && !usedFoes.has(x.vs));
  if (lastLoss) {
    usedFoes.add(lastLoss.vs);
    const foe = defOf(lastLoss.vs), row = table.find(r => r.id === lastLoss.vs);
    offers.push(dress({
      id: 'w' + career.week + '-grudge', kind: 'grudge', icon: '🔥', label: 'THE GRUDGE',
      foe: lastLoss.vs, foeName: foe.name, city: pickCity(R, c => c.pop >= 250000),
      purse: Math.round(duelPurse(row ? row.elo : 1225) * 1.5 / 5) * 5, renown: 14,
      blurb: `${foe.name} beat you. The promoters know a story when they see one — rematch money is real money.`,
    }, row));
  } else {
    const x = neighbor(8);
    if (x) {
      usedFoes.add(x.id);
      const foe = defOf(x.id);
      offers.push(dress({
        id: 'w' + career.week + '-crosstown', kind: 'duel', icon: '⚔', label: 'CROSSTOWN',
        foe: x.id, foeName: foe.name, city: pickCity(R, c => c.pop < 900000 && c.pop > 60000),
        purse: duelPurse(x.elo), renown: 7,
        blurb: `${foe.name} wants a sanctioned bout on neutral ground. Smaller lights, same book.`,
      }, x));
    }
  }

  // 3 · THE DEFENSE CONTRACT — a high-crime city pays a weapon to hold the street.
  const waves = 3 + (((R() * 3) | 0));
  offers.push(dress({
    id: 'w' + career.week + '-contract', kind: 'defense', icon: '🛡', label: 'DEFENSE CONTRACT',
    foe: null, foeName: null, city: pickCity(R, c => c.crime >= 55),
    purse: 35 + waves * 15, renown: 10, waves,
    blurb: `Hold the district through ${waves} waves. The city pays because its own response can't.`,
  }, null));

  // 4 · THE EXHIBITION — rumble money. Low stakes, quick cash.
  offers.push(dress({
    id: 'w' + career.week + '-exhibition', kind: 'rumble', icon: '💥', label: 'EXHIBITION',
    foe: null, foeName: null, city: pickCity(R, c => c.popType === 'City' || c.popType === 'Large City'),
    purse: 60, renown: 6,
    blurb: 'A four-way show fight, first to 12. The crowd pays for chaos; the book barely watches.',
  }, null));

  // 5 · every 4th week: THE TITLE SHOT — the champion (or #1) defends against the earned.
  if (career.week % 4 === 0) {
    let champ = championId();
    if (!champ || champ === career.heroId || !defOf(champ)) champ = (table.find(r => r.id !== career.heroId) || {}).id;
    const foe = defOf(champ);
    if (foe) {
      const row = table.find(r => r.id === champ);
      const locked = career.renown < TITLE_RENOWN;
      offers.unshift(dress({
        id: 'w' + career.week + '-title', kind: 'title', icon: '🏆', label: 'THE TITLE SHOT',
        foe: champ, foeName: foe.name, city: pickCity(R, c => c.pop >= 2000000),
        purse: duelPurse(row ? row.elo : 1400) * 3, renown: 40, locked,
        blurb: locked
          ? `The belt is earned. RENOWN ${career.renown}/${TITLE_RENOWN} — keep fighting; the office will call.`
          : `${foe.name} holds the crown. One bout, everything on the book. Win it and the cold open says your name.`,
      }, row));
    }
  }

  // always: REST — the free week. The body heals one bout; the world keeps moving.
  offers.push({
    id: 'w' + career.week + '-rest', kind: 'rest', icon: '🛏', label: 'REST WEEK',
    foe: null, foeName: null, city: null, purse: 0, renown: 0,
    blurb: injuryOf(career.heroId)
      ? 'Sit the week out and let the body knit. One recovery bout, free.'
      : 'Sit the week out. Nothing heals because nothing is broken — but the board won\'t wait.',
  });
  return offers;
}

// the enter() config an accepted offer becomes — the offer IS the match card
export function acceptCfg(career, offer) {
  if (offer.kind === 'defense') return { mode: 'survival', p1: career.heroId, waves: offer.waves, career: offer.id };
  if (offer.kind === 'rumble') return { mode: 'rumble', p1: career.heroId, career: offer.id };
  return { mode: 'duel', p1: career.heroId, enemy: offer.foe, aiLevel: offer.aiLevel, career: offer.id };   // duel / grudge / title — the bot scales with the Elo gap
}

// the world does not wait for you — three simulated bouts a week keep the board alive
function simWeek(career, roster, R) {
  const pool = roster.filter(d => !d.isDummy && !d.police && d.id !== career.heroId);
  let line = null;
  for (let i = 0; i < 3 && pool.length > 3; i++) {
    const a = pick(R, pool); let b = pick(R, pool);
    if (a === b) continue;
    const ra = recOf(a.id, a), rb = recOf(b.id, b);
    const pA = 1 / (1 + Math.pow(10, (rb.elo - ra.elo) / 400));   // Elo-weighted coin, like the bracket sims
    const aWins = R() < pA;
    matchElo(aWins ? a.id : b.id, aWins ? b.id : a.id, aWins ? [a, b] : [b, a], 'sim');
    if (!line) line = (aWins ? a.name + ' over ' + b.name : b.name + ' over ' + a.name);
  }
  return line;
}

// book a fought offer: purse (win) or the show-money cut (loss), renown, the ledger line,
// the week turn, the world sim. Title wins crown the champion in the SAME book the cold
// open and codex already read — the career cannot tell a different story than the game.
export function resolveOffer(career, offer, win, roster) {
  // DOUBLE OR NOTHING (offer.stake): the purse doubles on a win; a loss pays NOTHING and
  // costs renown — the show-money floor is exactly what you wagered away.
  let paid = win ? offer.purse : Math.round(offer.purse * 0.25);
  let ren = win ? offer.renown : 2;
  if (offer.stake) { paid = win ? offer.purse * 2 : 0; ren = win ? offer.renown : -4; }
  career.bank += paid; career.renown = Math.max(0, career.renown + ren);
  career.streak = win ? (career.streak || 0) + 1 : 0;
  if (offer.kind === 'title' && win) { crownChampion(career.heroId); career.titles = (career.titles || 0) + 1; }
  career.history.unshift({ week: career.week, kind: offer.kind, foe: offer.foeName || offer.label, city: offer.city ? offer.city.name : '—', result: win ? 'W' : 'L', paid });
  if (career.history.length > 24) career.history.length = 24;
  const bookedWeek = career.week;
  career.week++; career.slate = null;
  const simLine = simWeek(career, roster, mulberry(career.seed * 31 + career.week));
  const table = snapshotTable(roster);
  const now = table.find(r => r.id === career.heroId);
  career.lastReport = {
    week: bookedWeek, result: win ? 'W' : 'L', paid, ren, label: offer.foeName || offer.label,
    stake: !!offer.stake, streak: career.streak,
    rankFrom: offer.rankAtAccept ?? null, rankTo: now ? now.rank : null,
    simLine, title: offer.kind === 'title' && win,
  };
  return { paid, ren };
}

export function restWeek(career, roster) {
  const healed = healBout(career.heroId);   // resting knits ONE bout; the clinic buys them all
  career.history.unshift({ week: career.week, kind: 'rest', foe: '—', city: '—', result: 'REST', paid: 0 });
  if (career.history.length > 24) career.history.length = 24;
  const bookedWeek = career.week;
  career.week++; career.slate = null;
  const simLine = simWeek(career, roster, mulberry(career.seed * 31 + career.week));
  career.lastReport = { week: bookedWeek, rest: true, healed: healed && healed.name, cleared: healed && healed.cleared, simLine, streak: career.streak };
  return healed;
}

// PAY THE CLINIC — heal NOW for money instead of resting for time. The one honest bank sink.
// THE HOSPITAL (Combat Compendium: origins & healing). The clinic used to be one flat fee that
// wiped any injury — money in, problem gone. The compendium makes it a real decision, because what
// a hospital can do for you depends on WHAT YOU ARE:
//
//   · a SKILLED HUMAN is fully treatable and back in 36 hours
//   · a SPIRITUAL enhancement can be patched to 30% and it takes six days
//   · a ROBOTIC fighter tops out at 20% — a ward is the wrong building, it needs a workshop
//   · an ALIEN cannot be admitted at all
//
// ⚠ IT COSTS TIME, NOT JUST MONEY, and time is real now — `advanceDays` moves the same calendar the
// planets orbit on, so a long stay genuinely puts the fight in a different season. That is the
// whole reason to make hospitals a system rather than a button.
export const HOSPITAL_FEE_PER_STAY = 34;      // $K, per stay — cheaper than the old flat wipe

export function hospitalQuote(career, def, sheet) {
  const inj = injuryOf(career.heroId);
  const plan = recoveryPlan(def, sheet, inj);
  const stays = plan.canAdmit ? plan.stays : 0;
  return {
    ...plan, injury: inj,
    cost: stays * HOSPITAL_FEE_PER_STAY,
    days: Math.ceil(plan.totalHours / 24),
    affordable: career.bank >= stays * HOSPITAL_FEE_PER_STAY,
    needed: !!inj,
  };
}

// Admit them. Returns what happened, or null with a reason the caller can show.
export function admitToHospital(career, def, sheet) {
  const q = hospitalQuote(career, def, sheet);
  if (!q.needed) return { ok: false, reason: 'NOTHING TO TREAT' };
  if (!q.canAdmit) return { ok: false, reason: 'CANNOT BE ADMITTED — ' + (q.why || ''), alternative: q.alternative };
  if (!q.affordable) return { ok: false, reason: 'CANNOT AFFORD IT', cost: q.cost };
  career.bank -= q.cost;
  // ⚠ THE CAP IS THE POINT. Only a 100%-cap origin walks out clean; everyone else leaves with
  // something still wrong, which is exactly what the sheet says and what makes origin matter.
  let out = null;
  const full = q.healMax >= 1;
  for (let i = 0; i < q.stays; i++) { out = healBout(career.heroId); if (!out || out.cleared) break; }
  if (!full && out && out.cleared) {
    // a partial origin cannot be cleared outright — it comes back with reduced bouts, not none
    const inj = injuryOf(career.heroId);
    if (!inj) { /* the ledger only tracks whole bouts; the cap is reported honestly below */ }
  }
  career.days = (career.days || 0) + q.days;
  advanceDays(q.days);
  career.ledger = career.ledger || [];
  career.ledger.unshift({ week: career.week, kind: 'HOSPITAL',
    text: q.origin.name + ' — ' + Math.round(q.healMax * 100) + '% cap, ' + q.days + 'd, ' + fmtMoney(q.cost) });
  if (career.ledger.length > 24) career.ledger.length = 24;
  saveCareer(career);
  return { ok: true, ...q, result: out, cleared: !!(out && out.cleared), capped: !full };
}

// kept as the old name so nothing that called it breaks; it now routes through the table
export function payClinic(career, def, sheet) {
  const r = admitToHospital(career, def, sheet);
  return r && r.ok ? r.result : null;
}

export const fmtMoney = (k) => k >= 1000 ? '$' + (k / 1000).toFixed(1) + 'M' : '$' + k + 'K';
