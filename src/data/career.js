// THE CIRCUIT — the single-player career: the connective tissue between matches.
// A career is a PERSISTENT WEAPON working a world that already exists: every offer is
// generated off the LIVE Elo book (rankings.js), staged in a REAL city off the sheet
// (cities.js), paid in a purse the bank remembers, and while you fight, the rest of
// the roster sims its own matches so the board moves without you. Pure logic — zero
// DOM, zero Three.js. localStorage `threshold_career_v1`.

import { cityList } from './cities.js';
import { snapshotTable, championId, crownChampion, injuryOf, healBout, matchElo, recOf } from './rankings.js';

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
    v: 1, heroId, week: 1, bank: 0, renown: 0, titles: 0,
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
  return { name: c.name, country: c.country, crime: c.crime, pop: c.pop, popType: c.popType };
}

const duelPurse = (foeElo) => Math.max(30, Math.round((40 + Math.max(0, foeElo - 1100) * 0.25) / 5) * 5);

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
  const h = neighbor(4) || neighbor(10) || neighbor(52);
  if (h) {
    usedFoes.add(h.id);
    const foe = defOf(h.id);
    offers.push({
      id: 'w' + career.week + '-headliner', kind: 'duel', icon: '⚔', label: 'THE HEADLINER',
      foe: h.id, foeName: foe.name, city: pickCity(R, c => c.pop >= 900000),
      purse: duelPurse(h.elo), renown: 8 + Math.max(0, (me ? me.rank : 99) - h.rank),
      blurb: `A ranked bout. ${foe.name} sits #${h.rank} on the board (${h.w}–${h.l}). Win and the book moves.`,
    });
  }

  // 2 · THE GRUDGE — your own record remembers who beat you. The book IS the memory.
  const rec = recOf(career.heroId, defOf(career.heroId));
  const lastLoss = (rec.hist || []).find(x => !x.win && defOf(x.vs) && !usedFoes.has(x.vs));
  if (lastLoss) {
    usedFoes.add(lastLoss.vs);
    const foe = defOf(lastLoss.vs), row = table.find(r => r.id === lastLoss.vs);
    offers.push({
      id: 'w' + career.week + '-grudge', kind: 'grudge', icon: '🔥', label: 'THE GRUDGE',
      foe: lastLoss.vs, foeName: foe.name, city: pickCity(R, c => c.pop >= 250000),
      purse: Math.round(duelPurse(row ? row.elo : 1225) * 1.5 / 5) * 5, renown: 14,
      blurb: `${foe.name} beat you. The promoters know a story when they see one — rematch money is real money.`,
    });
  } else {
    const x = neighbor(8);
    if (x) {
      usedFoes.add(x.id);
      const foe = defOf(x.id);
      offers.push({
        id: 'w' + career.week + '-crosstown', kind: 'duel', icon: '⚔', label: 'CROSSTOWN',
        foe: x.id, foeName: foe.name, city: pickCity(R, c => c.pop < 900000 && c.pop > 60000),
        purse: duelPurse(x.elo), renown: 7,
        blurb: `${foe.name} wants a sanctioned bout on neutral ground. Smaller lights, same book.`,
      });
    }
  }

  // 3 · THE DEFENSE CONTRACT — a high-crime city pays a weapon to hold the street.
  const waves = 3 + (((R() * 3) | 0));
  offers.push({
    id: 'w' + career.week + '-contract', kind: 'defense', icon: '🛡', label: 'DEFENSE CONTRACT',
    foe: null, foeName: null, city: pickCity(R, c => c.crime >= 55),
    purse: 35 + waves * 15, renown: 10, waves,
    blurb: `Hold the district through ${waves} waves. The city pays because its own response can't.`,
  });

  // 4 · THE EXHIBITION — rumble money. Low stakes, quick cash.
  offers.push({
    id: 'w' + career.week + '-exhibition', kind: 'rumble', icon: '💥', label: 'EXHIBITION',
    foe: null, foeName: null, city: pickCity(R, c => c.popType === 'City' || c.popType === 'Large City'),
    purse: 60, renown: 6,
    blurb: 'A four-way show fight, first to 12. The crowd pays for chaos; the book barely watches.',
  });

  // 5 · every 4th week: THE TITLE SHOT — the champion (or #1) defends against the earned.
  if (career.week % 4 === 0) {
    let champ = championId();
    if (!champ || champ === career.heroId || !defOf(champ)) champ = (table.find(r => r.id !== career.heroId) || {}).id;
    const foe = defOf(champ);
    if (foe) {
      const row = table.find(r => r.id === champ);
      const locked = career.renown < TITLE_RENOWN;
      offers.unshift({
        id: 'w' + career.week + '-title', kind: 'title', icon: '🏆', label: 'THE TITLE SHOT',
        foe: champ, foeName: foe.name, city: pickCity(R, c => c.pop >= 2000000),
        purse: duelPurse(row ? row.elo : 1400) * 3, renown: 40, locked,
        blurb: locked
          ? `The belt is earned. RENOWN ${career.renown}/${TITLE_RENOWN} — keep fighting; the office will call.`
          : `${foe.name} holds the crown. One bout, everything on the book. Win it and the cold open says your name.`,
      });
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
  return { mode: 'duel', p1: career.heroId, enemy: offer.foe, career: offer.id };   // duel / grudge / title
}

// the world does not wait for you — three simulated bouts a week keep the board alive
function simWeek(career, roster, R) {
  const pool = roster.filter(d => !d.isDummy && !d.police && d.id !== career.heroId);
  for (let i = 0; i < 3 && pool.length > 3; i++) {
    const a = pick(R, pool); let b = pick(R, pool);
    if (a === b) continue;
    const ra = recOf(a.id, a), rb = recOf(b.id, b);
    const pA = 1 / (1 + Math.pow(10, (rb.elo - ra.elo) / 400));   // Elo-weighted coin, like the bracket sims
    const aWins = R() < pA;
    matchElo(aWins ? a.id : b.id, aWins ? b.id : a.id, aWins ? [a, b] : [b, a], 'sim');
  }
}

// book a fought offer: purse (win) or the show-money cut (loss), renown, the ledger line,
// the week turn, the world sim. Title wins crown the champion in the SAME book the cold
// open and codex already read — the career cannot tell a different story than the game.
export function resolveOffer(career, offer, win, roster) {
  const paid = win ? offer.purse : Math.round(offer.purse * 0.25);
  const ren = win ? offer.renown : 2;
  career.bank += paid; career.renown += ren;
  if (offer.kind === 'title' && win) { crownChampion(career.heroId); career.titles = (career.titles || 0) + 1; }
  career.history.unshift({ week: career.week, kind: offer.kind, foe: offer.foeName || offer.label, city: offer.city ? offer.city.name : '—', result: win ? 'W' : 'L', paid });
  if (career.history.length > 24) career.history.length = 24;
  career.week++; career.slate = null;
  simWeek(career, roster, mulberry(career.seed * 31 + career.week));
  return { paid, ren };
}

export function restWeek(career, roster) {
  const healed = healBout(career.heroId);   // resting knits ONE bout; the clinic buys them all
  career.history.unshift({ week: career.week, kind: 'rest', foe: '—', city: '—', result: 'REST', paid: 0 });
  if (career.history.length > 24) career.history.length = 24;
  career.week++; career.slate = null;
  simWeek(career, roster, mulberry(career.seed * 31 + career.week));
  return healed;
}

// PAY THE CLINIC — heal NOW for money instead of resting for time. The one honest bank sink.
export function payClinic(career) {
  const inj = injuryOf(career.heroId);
  if (!inj || career.bank < CLINIC_FEE) return null;
  career.bank -= CLINIC_FEE;
  let out = null;
  for (let i = 0; i < 4; i++) { out = healBout(career.heroId); if (!out || out.cleared) break; }
  return out;
}

export const fmtMoney = (k) => k >= 1000 ? '$' + (k / 1000).toFixed(1) + 'M' : '$' + k + 'K';
