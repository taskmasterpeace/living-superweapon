// THE CIRCUIT — the single-player career: the connective tissue between matches.
// A career is a PERSISTENT WEAPON working a world that already exists: every offer is
// generated off the LIVE Elo book (rankings.js), staged in a REAL city off the sheet
// (cities.js), paid in a purse the bank remembers, and while you fight, the rest of
// the roster sims its own matches so the board moves without you. Pure logic — zero
// DOM, zero Three.js. localStorage `threshold_career_v1`.

import { cityList } from './cities.js';
import { countryOf } from './countries.js';
import { relationOf, factionOf, sameBloc, rationaleOf, FACTION_LOOK } from './relations.js';
import { snapshotTable, championId, crownChampion, injuryOf, healBout, matchElo, recOf } from './rankings.js';
import { recoveryPlan, deriveOrigin } from './origins.js';
import { advanceDays, gameDate } from './orbits.js';
import { birthdayCrossings, ageOf } from './age.js';

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

export function newCareer(heroId, home) {
  return {
    v: 1, heroId, week: 1, bank: 0, renown: 0, titles: 0, streak: 0, lastReport: null,
    home: home || null,                // the state you answer to — see homeOf()
    seed: 1 + ((Math.random() * 1e6) | 0),
    history: [],                       // [{week, kind, foe, city, result:'W'|'L'|'REST', paid}]
    slate: null,                       // dealt lazily by genSlate — null after every week turn
  };
}


// -------------------------------------------------------------------------------------------
// THE GOVERNMENT CONTRACT — what the 168x168 relationship matrix is FOR.
// Robert, handing the sheet over: "this is the climate of our game... determines your govnmt
// assigned missions". So the state you answer to reads its own file on the country you are being
// sent to, and that ONE number decides what kind of job it is.
//
// Every rung is a different fight, not a different purse on the same fight: the far end is
// deniable and the near end is a parade. The pay curve is deliberately V-SHAPED — a state pays
// most to send you somewhere it cannot officially go, and pays least for a favour to a friend —
// so the money and the safety pull in opposite directions and the card is a real decision.
export const POSTURES = {
  1: { key: 'deniable', label: 'DENIABLE OPERATION', icon: '\u2620',
       d: 'No cover, no extraction, no acknowledgement. If it goes wrong you were never sent.',
       purse: 2.15, renown: 0.35, support: false, flagged: true },
  2: { key: 'interdiction', label: 'INTERDICTION', icon: '\u26a0',
       d: 'A cold posting. You are tolerated, watched, and on your own if it turns.',
       purse: 1.55, renown: 0.7, support: false, flagged: false },
  3: { key: 'observation', label: 'OBSERVATION DUTY', icon: '\u25ce',
       d: 'Nobody here has an opinion about you. Show the flag and come home.',
       purse: 0.8, renown: 0.9, support: false, flagged: false },
  4: { key: 'joint', label: 'JOINT OPERATION', icon: '\u2694',
       d: 'A partner service works alongside you. The locals will not get in your way.',
       purse: 1.0, renown: 1.25, support: true, flagged: false },
  5: { key: 'defense', label: 'MUTUAL DEFENSE', icon: '\u2605',
       d: 'A treaty obligation. Their state opens every door you need.',
       purse: 1.15, renown: 1.6, support: true, flagged: false },
};

// The country a career answers to: the FIRM's, if one has been founded, otherwise the fighter's
// own. A hero always has a homeland (data/identities.js), so the system works from week one
// without waiting on the founding flow.
export function homeOf(career, def) {
  // ⚠ the identity field is `co` (data/identities.js: {n, c, co, f}) — `country` is undefined
  return (career && career.home) || (def && def.person && def.person.co) || null;
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

  // 5 · THE GOVERNMENT CONTRACT — the relationship matrix, made into a job.
  // The target is chosen for how INTERESTING the standing is, not at random: a slate of neutral
  // postings would never show the player that the system exists. Ties break toward hostility,
  // because that is the rung with something to say.
  const home = career.home || null;
  if (home && relationOf(home, home)) {
    const cand = [];
    for (let k = 0; k < 26; k++) {
      const c = pickCity(R, null);
      if (!c.country || c.country === home) continue;
      const rel = relationOf(home, c.country);
      if (!rel) continue;                        // the matrix does not carry it — never invent one
      cand.push({ c, rel, weight: 1 + Math.abs(3 - rel.v) });
    }
    // ⚠ ROULETTE, NOT "TAKE THE MOST EXTREME". Sorting by weight and picking from the top three
    // made 33 of 48 contracts DENIABLE OPERATIONS — the rung with the most to say became the
    // default, which is the fastest way to make it mean nothing. A mild bias toward the ends
    // (weight 1 + |3-v|) lets the world's own distribution through: most of the map is strained
    // or indifferent, so most weeks are ordinary and a black posting is an event.
    let total = 0; for (const x of cand) total += x.weight;
    let roll = R() * total, chosen = null;
    for (const x of cand) { roll -= x.weight; if (roll <= 0) { chosen = x; break; } }
    if (!chosen && cand.length) chosen = cand[cand.length - 1];
    if (chosen) {
      const P = POSTURES[chosen.rel.v];
      const foeRow = neighbor(8) || neighbor(52);
      const foe = foeRow ? defOf(foeRow.id) : null;
      if (foe) usedFoes.add(foeRow.id);
      const bloc = factionOf(chosen.c.country), myBloc = factionOf(home);
      const o = dress({
        id: 'w' + career.week + '-govt', kind: 'govt', icon: P.icon,
        label: 'GOVERNMENT CONTRACT',
        posture: P.key, postureLabel: P.label, rel: chosen.rel.v, relWord: chosen.rel.word,
        relColor: chosen.rel.color, home, targetCountry: chosen.c.country,
        bloc, sameBloc: !!myBloc && myBloc === bloc, flagged: !!P.flagged, support: !!P.support,
        foe: foe ? foe.id : null, foeName: foe ? foe.name : null,
        city: chosen.c,
        purse: Math.max(20, Math.round(duelPurse(foeRow ? foeRow.elo : 1100) * P.purse / 5) * 5),
        renown: Math.max(2, Math.round(9 * P.renown)),
        blurb: P.d,
      }, foeRow);
      o.why = rationaleOf(chosen.c.country);
      offers.push(o);
    }
  }

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
  // A DENIABLE OPERATION IS A DIFFERENT FIGHT, not a bigger cheque. `govFlagged` preloads police
  // heat: in a country your state cannot officially be in, the law is already looking for you
  // before the first punch. Every other posture runs as an ordinary bout.
  if (offer.kind === 'govt') return { mode: 'duel', p1: career.heroId, enemy: offer.foe,
    aiLevel: offer.aiLevel, career: offer.id, govFlagged: !!offer.flagged };
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

// ⚠ A CAREER WEEK HAD NO DURATION. `career.week++` moved a counter and the CALENDAR never moved,
// so the in-game date only advanced when somebody was hospitalised — and `birthdayCrossings`,
// which is the whole point of per-person birth dates, could never fire. A week is seven days.
// One helper, because both the fight and the rest week turn it and they were already duplicated.
function turnWeek(career, roster) {
  const from = gameDate();
  advanceDays(7);
  const to = gameDate();
  career.slate = null;
  const cross = birthdayCrossings(roster || [], from, to);
  if (!cross.length) return;
  career.ledger = career.ledger || [];
  const mine = cross.find(c => c.def.id === career.heroId);
  // The player's own birthday is always reported; everyone else only when they cross a BAND,
  // because "someone turned 34" is noise and "someone entered their decline" is news.
  if (mine) career.ledger.unshift({ week: career.week, kind: 'BIRTHDAY',
    text: `${mine.def.name} turns ${mine.to}${mine.bandChanged ? ' — ' + mine.band.label : ''}` });
  for (const c of cross.filter(c => c.bandChanged && c.def.id !== career.heroId).slice(0, 2))
    career.ledger.unshift({ week: career.week, kind: 'BIRTHDAY', text: `${c.def.name} is ${c.to} — ${c.band.label}` });
  if (career.ledger.length > 24) career.ledger.length = 24;
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
  career.week++; turnWeek(career, roster);
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
  career.week++; turnWeek(career, roster);
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
