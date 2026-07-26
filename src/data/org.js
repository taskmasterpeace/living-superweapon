// THE ORGANISATION — a budget, a headquarters, and people whose names you learn.
//
// Robert: "They are managing a team of LSWs, mercs… and scientists and engineers. Let them start
// with a budget then hire mercs and an LSW from our list. After selecting country you should select
// the corporate headquarters to build your base, or your PMC's name — maybe certain countries will
// name it for you. Hiring people, make sure it respects the culture codes."
//
// ⚠ FOUR KINDS OF PERSON, AND THEY ARE NOT INTERCHANGEABLE. An LSW fights and is the reason you get
// contracts. A MERC fights and is the reason you can take two contracts. A SCIENTIST never throws a
// punch and is the only way the research tree exists at all. An ENGINEER builds and repairs. The
// interesting decision is that they compete for the same money, and the two who cannot fight are
// the two the player will be tempted to cut — right up until the week they matter.
//
// ⚠ THE FOUNDING IS AN ORDER OF DECISIONS, and each one narrows the next: the COUNTRY decides what
// is legal and how big a site you can hold; the CITY decides the site survey and who you can hire;
// the NAME is the first thing the country takes away from you if it is that kind of country.

import { countryOf, countryList } from './countries.js';
import { cityList } from './cities.js';
import { hireName, firmNaming, suggestFirmNames, cultureName } from './names.js';
import { siteSurvey } from './base.js';
import { chartOf, statusWord } from './medical.js';
import { rankOf, bandOf } from './scale.js';

const LS = 'threshold_org_v1';

// -------------------------------------------------------------------------------------------------
// STARTING MONEY. ⚠ DERIVED FROM WHERE YOU INCORPORATE, not a difficulty setting. A firm founded in
// a wealthy permissive state opens with real capital; one founded where the work is illegal opens
// with what somebody could move quietly. That is the same decision as the site survey, seen from
// the other side, and it is why the country screen is the first screen.
export function seedCapital(city, country) {
  const co = country || (city && countryOf(city.country));
  const gdp = ((co && co.gdpPerCapita) || 20) / 100;
  const legal = (co && co.lswRegs) === 'Legal' ? 1 : (co && co.lswRegs) === 'Regulated' ? 0.7 : 0.42;
  const scale = Math.min(1, Math.log10(Math.max(1e4, (city && city.pop) || 5e4)) / 7.2);
  const cash = Math.round((180 + gdp * 900 + scale * 260) * legal / 10) * 10;
  return {
    cash,
    note: legal < 0.5 ? 'ILLEGAL HERE — YOUR BACKERS MOVED WHAT THEY COULD MOVE QUIETLY'
      : gdp > 0.7 ? 'A DEEP LOCAL CAPITAL MARKET' : 'MODEST BACKING',
  };
}

// -------------------------------------------------------------------------------------------------
// ROLES. `fight` decides whether they can be sent on a contract at all.
export const ROLES = {
  lsw:       { n: 'ASCENDANT',  fight: true,  base: 42, d: 'A registered superweapon. The reason contracts come to you.' },
  merc:      { n: 'OPERATOR',   fight: true,  base: 11, d: 'Trained, armed, and mortal. Two of them cost less than one Ascendant.' },
  scientist: { n: 'SCIENTIST',  fight: false, base: 14, d: 'Never throws a punch. Without one, the research tree does not exist.' },
  engineer:  { n: 'ENGINEER',   fight: false, base: 12, d: 'Builds it, repairs it, and keeps the containment field powered.' },
  physician: { n: 'PHYSICIAN',  fight: false, base: 16, d: 'Finds what is wrong before it becomes what ended a career.' },
  psych:     { n: 'PSYCHOLOGIST', fight: false, base: 15, d: 'The only person who can treat what a bad night in the field left behind.' },
};
export const ROLE_IDS = Object.keys(ROLES);

const hash = (s) => { let h = 2166136261 >>> 0; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };

// -------------------------------------------------------------------------------------------------
const blank = () => ({
  founded: false, firm: '', stateNamed: false, country: '', city: '', cultureCode: 0,
  cash: 0, week: 0, roster: [], ledger: [], seed: 1,
});
let _org = null;
export function org() {
  if (_org) return _org;
  try { const raw = localStorage.getItem(LS); if (raw) { const p = JSON.parse(raw); if (p && Array.isArray(p.roster)) { _org = p; return _org; } } } catch {}
  _org = blank();
  return _org;
}
export function saveOrg() { try { localStorage.setItem(LS, JSON.stringify(_org)); } catch {} return _org; }
export function resetOrg() { _org = blank(); return saveOrg(); }

// ---- THE FOUNDING FLOW -----------------------------------------------------------------------
// step 1: what a country would mean. Everything the player needs to choose between them.
export function countryBrief(name) {
  const co = countryOf(name);
  if (!co) return null;
  const naming = firmNaming(co);
  const cities = cityList().filter((c) => c.country === name);
  const best = cities.map((c) => ({ c, s: siteSurvey(c, co) })).sort((a, b) => b.s.n - a.s.n)[0];
  return {
    country: co, flagName: co.name, demonym: co.demonym,
    lswRegs: co.lswRegs, vigilantism: co.vigilantism, cloning: co.cloning,
    naming, cities: cities.length,
    bestSite: best ? { city: best.c.name, n: best.s.n, label: best.s.label } : null,
    capital: seedCapital(best && best.c, co),
    culture: cultureName((best && best.c.cultureCode) || 0),
  };
}

// step 2: the headquarters city — the site survey is the real content of this screen
export function hqOptions(countryName, n = 12) {
  const co = countryOf(countryName);
  return cityList().filter((c) => c.country === countryName)
    .map((c) => ({ city: c, site: siteSurvey(c, co), capital: seedCapital(c, co) }))
    .sort((a, b) => b.site.n - a.site.n || b.city.pop - a.city.pop)
    .slice(0, n);
}

// step 3: found it. ⚠ The country may take the naming decision away from you, and it says why.
export function found(countryName, cityName, wantedName) {
  const co = countryOf(countryName);
  const city = cityList().find((c) => c.name === cityName && c.country === countryName);
  if (!co || !city) return { ok: false, why: 'NO SUCH REGISTRY ENTRY' };
  const o = org();
  const naming = firmNaming(co);
  o.founded = true;
  o.country = countryName; o.city = cityName; o.cultureCode = city.cultureCode || 0;
  o.stateNamed = !naming.own;
  o.firm = naming.own ? (wantedName || suggestFirmNames(co, hash(cityName))[0]) : naming.name;
  const cap = seedCapital(city, co);
  o.cash = cap.cash; o.week = 1; o.seed = hash(countryName + cityName);
  o.ledger = [{ w: 0, t: 'FOUNDED', d: o.firm + ' · ' + cityName + ', ' + countryName, amt: cap.cash }];
  saveOrg();
  return { ok: true, firm: o.firm, stateNamed: o.stateNamed, why: naming.why, capital: cap,
           site: siteSurvey(city, co) };
}

// -------------------------------------------------------------------------------------------------
// THE MARKET. ⚠ WHO IS AVAILABLE DEPENDS ON WHERE YOU ARE — culture-correct names, and an Ascendant
// pool drawn from the actual roster and priced off the rank ladder, so hiring a Cosmic-tier weapon
// is a decision about your whole budget rather than a line item.
export function salaryFor(role, level = 1, rank = 0) {
  const base = ROLES[role].base;
  if (role === 'lsw') {
    const b = bandOf(rank || 20);
    const tier = Math.max(0, Math.min(6, Math.floor((b.lo >= 100 ? 6 : b.lo >= 80 ? 5 : b.lo >= 50 ? 4 : b.lo >= 40 ? 3 : b.lo >= 30 ? 2 : b.lo >= 20 ? 1 : 0))));
    return Math.round(base * Math.pow(1.85, tier));
  }
  return Math.round(base * (0.8 + level * 0.35));
}

export function market(roster, n = 8) {
  const o = org();
  const out = { lsw: [], merc: [], scientist: [], engineer: [], physician: [], psych: [] };
  const city = cityList().find((c) => c.name === o.city && c.country === o.country);
  // ---- Ascendants: real roster entries, priced by rank
  const pool = (roster || []).filter((d) => !d.police);
  for (let i = 0; i < Math.min(n, pool.length); i++) {
    const d = pool[(hash(o.seed + ':lsw:' + i) % pool.length)];
    if (out.lsw.some((x) => x.defId === d.id)) continue;
    const rk = rankOf(d);
    out.lsw.push({ kind: 'lsw', defId: d.id, name: d.name, rank: rk, band: bandOf(rk).name,
                   threat: d.threat, salary: salaryFor('lsw', 1, rk), sign: salaryFor('lsw', 1, rk) * 3 });
  }
  // ---- everyone else: generated, and from HERE
  for (const role of ['merc', 'scientist', 'engineer', 'physician', 'psych']) {
    for (let i = 0; i < n; i++) {
      const seed = o.seed + ':' + role + ':' + i;
      const h = hash(seed);
      const nm = hireName(city, seed);
      const level = 1 + (h % 3);
      out[role].push({ kind: role, id: role + '_' + h.toString(36), name: nm.full,
                       culture: nm.cultureName, level, salary: salaryFor(role, level),
                       sign: salaryFor(role, level) * 2,
                       major: role === 'scientist' ? ['medicine','genetics','materials','robotics','physics','chemistry','compsci','aerospace'][h % 8]
                            : role === 'physician' ? 'medicine' : role === 'psych' ? 'medicine' : null });
    }
  }
  return out;
}

export function hire(person) {
  const o = org();
  const cost = person.sign || 0;
  if (o.cash < cost) return { ok: false, why: 'YOU CANNOT COVER THE SIGNING FEE ($' + cost + 'K)' };
  if (o.roster.some((p) => p.id === person.id || (person.defId && p.defId === person.defId)))
    return { ok: false, why: 'ALREADY ON THE BOOKS' };
  const rec = { ...person, id: person.id || ('lsw_' + person.defId), hiredWeek: o.week, morale: 6 };
  o.roster.push(rec);
  o.cash -= cost;
  o.ledger.unshift({ w: o.week, t: 'HIRED', d: person.name + ' · ' + ROLES[person.kind].n, amt: -cost });
  chartOf(rec.id);                                    // everyone gets a chart the day they arrive
  saveOrg();
  return { ok: true, person: rec };
}
export function fire(id) {
  const o = org();
  const i = o.roster.findIndex((p) => p.id === id);
  if (i < 0) return { ok: false, why: 'NOT ON THE BOOKS' };
  const p = o.roster.splice(i, 1)[0];
  o.ledger.unshift({ w: o.week, t: 'RELEASED', d: p.name, amt: 0 });
  saveOrg();
  return { ok: true };
}

export const payroll = (b) => (org().roster).reduce((a, p) => a + (p.salary || 0), 0);

// ⚠ PAYROLL IS THE PRESSURE. The two people who cannot fight are the two you are tempted to cut,
// and the week you cut them is the week the research stops and nobody finds the internal bleeding.
export function weekTurn() {
  const o = org();
  const due = payroll();
  o.cash -= due;
  o.week++;
  o.ledger.unshift({ w: o.week, t: 'PAYROLL', d: o.roster.length + ' on the books', amt: -due });
  const broke = o.cash < 0;
  if (broke) o.ledger.unshift({ w: o.week, t: 'ARREARS', d: 'PAYROLL NOT MET — MORALE FALLING', amt: 0 });
  if (broke) for (const p of o.roster) p.morale = Math.max(0, (p.morale ?? 6) - 2);
  saveOrg();
  return { paid: due, cash: o.cash, broke };
}

// what the manager sees: the team, and how each of them is doing
export function teamReport() {
  const o = org();
  return o.roster.map((p) => ({
    ...p, role: ROLES[p.kind].n, fights: ROLES[p.kind].fight,
    health: statusWord(p.id),
  }));
}

export function orgLine() {
  const o = org();
  if (!o.founded) return 'NO FIRM REGISTERED';
  const f = o.roster.filter((p) => ROLES[p.kind].fight).length;
  return `${o.firm}${o.stateNamed ? ' (STATE DESIGNATION)' : ''} · ${o.city}, ${o.country} · ` +
    `$${o.cash}K · ${o.roster.length} ON THE BOOKS (${f} CAN FIGHT) · $${payroll()}K/WEEK`;
}

export { suggestFirmNames, firmNaming };
