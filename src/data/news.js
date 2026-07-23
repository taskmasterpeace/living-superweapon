// THRESHOLD — the NEWS DESK. Pure language + report assembly for KMK 9 ACTION NEWS:
// the field crew's lower-thirds, the post-fight broadcast script, the tale-of-the-tape,
// and the city-desk damage math. Everything is generated DYNAMICALLY from what actually
// happened (the match log, the stat sheet, the city counters, the in-world clock) in the
// register a local TV reporter would really use — civilians don't know attack names, so
// powers are described the way witnesses would describe them. An optional LAN LLM
// (the Mac Mini Ollama box) punches up the copy when reachable; the procedural writer
// is the always-offline baseline and must stand alone.

// ---------- seeded variety ----------
export function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = (rng, arr) => arr[(rng() * arr.length) | 0];

// ---------- the city (matches world.js districts) ----------
export function districtAt(x, z) {
  if (x > 150) return 'THE HARBOR FRONT';
  if (x < -140 && z > 140) return 'THE GARRISON';
  if (x < -140 && z > -130) return 'MEMORIAL PARK';
  if (z < -60) return 'DOWNTOWN';
  if (z > 60) return 'THE SOUTHSIDE';
  return 'MIDTOWN PLAZA';
}
const DISTRICT_CASUAL = {
  'THE HARBOR FRONT': 'the harbor front', 'THE GARRISON': 'the military annex', 'MEMORIAL PARK': 'Memorial Park',
  'DOWNTOWN': 'downtown', 'THE SOUTHSIDE': 'the Southside', 'MIDTOWN PLAZA': 'Midtown Plaza',
};
export const casualDistrict = (D) => DISTRICT_CASUAL[D] || (D ? D.toLowerCase() : 'the city');

// ---------- the in-world clock (world.dayT: 0.25 = noon, 0.75 = midnight) ----------
export function cityHour(dayT) { return (dayT * 24 + 6) % 24; }
export function clockStr(dayT) {
  const h24 = cityHour(dayT);
  const h = Math.floor(h24), m = Math.floor((h24 - h) * 60);
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
export function timeWord(dayT) {
  const h = cityHour(dayT);
  if (h < 5) return 'overnight hours';
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 21) return 'evening';
  return 'night';
}
export function fmtClock(s) { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
export function money(n) {
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
  return '$' + Math.round(n);
}

// ---------- report assembly (reads the live game — the only impure part) ----------
function snap(g, f) {
  if (!f || !f.def) return null;
  const st = f.stats || { dmg: 0, taken: 0, big: 0, bigKind: 'blast' };
  return {
    wanted: g.police ? g.police.wantedLevel(f) : 0,
    name: f.name, id: f.def.id, title: f.def.title || '', role: f.def.role || '',
    threat: f.def.threat || 'Unrated', person: f.def.person || null,
    level: f.level, tier: f.tier, kills: f.kills, streakBest: f._bestStreak || f.streak || 0,
    dmg: Math.round(st.dmg), taken: Math.round(st.taken), big: Math.round(st.big), bigKind: st.bigKind,
    style: (f.ai && f.ai.style) || (f.def.ai && f.def.ai.style) || 'brawler',
    colors: f.def.colors, human: g.isHuman(f), alive: f.alive,
  };
}
export function buildReport(g, result) {
  const md = g.modeId, log = g.matchLog || [], city = g.cityStats || { civs: 0, cars: 0, blocks: 0, craters: 0 };
  const rep = {
    mode: md, win: !!result.win, title: result.title, clock: g.matchT || 0,
    dayT: g.world ? g.world.dayT : 0.3, log, city,
    bigHit: g.bigHit && g.bigHit.amount > 0 ? { ...g.bigHit, by: g.bigHit.by ? g.bigHit.by.name : null } : null,
    p1Combo: g._p1MaxCombo || 0,
    clips: (g.news && g.news.clips) ? g.news.clips : [],
    reporter: g.news ? g.news.reporterName : 'DANA OKAFOR',
    operator: g.news ? g.news.operatorName : 'J. WHITFIELD',
  };
  // where "the scene" is: the last KO's district, else the player's
  const lastKO = [...log].reverse().find(e => e.type === 'ko');
  rep.district = (lastKO && lastKO.at) || (g.player && g.world.districtAt ? g.world.districtAt(g.player.pos.x, g.player.pos.z) : 'MIDTOWN PLAZA');
  rep.place = g.world && g.world.plan ? { name: g.world.plan.name, country: g.world.plan.country } : null;
  // the police story: dispatches this match + the theater's official response grade
  rep.policeEv = log.filter(e => e.type === 'police');
  const safety = (g.world && g.world.plan && g.world.plan.safety) || 50;
  rep.responseS = Math.round(Math.max(5, Math.min(24, 26 - safety * 0.25)));
  if (md === 'duel') {
    const a = g.ms.p1, b = g.ms.enemy;
    rep.kind = 'duel';
    rep.a = snap(g, a); rep.b = snap(g, b);
    rep.aKO = g.ms.p1KO; rep.bKO = g.ms.enemyKO;
    rep.winner = result.win ? rep.a : rep.b;
    rep.loser = result.win ? rep.b : rep.a;
    rep.winKO = result.win ? rep.aKO : rep.bKO; rep.loseKO = result.win ? rep.bKO : rep.aKO;
    // comeback: did the eventual winner trail on KOs at any point?
    let aa = 0, bb = 0, trailed = false;
    for (const e of log) {
      if (e.type !== 'ko') continue;
      if (rep.a && e.vid === rep.a.id) bb++; else if (rep.b && e.vid === rep.b.id) aa++;
      const wUp = result.win ? aa - bb : bb - aa;
      if (wUp < 0) trailed = true;
    }
    rep.comeback = trailed; rep.shutout = rep.loseKO === 0;
  } else if (md === 'survival') {
    rep.kind = 'survival';
    rep.a = snap(g, g.player);
    rep.wave = g.ms.wave; rep.score = g.ms.score;
    rep.winner = null; rep.loser = rep.a;
  } else if (md === 'tournament') {
    // an Invitational bracket match — duel-shaped copy between the two side captains
    rep.kind = 'duel';
    rep.a = snap(g, g.ms.aLeadF); rep.b = snap(g, g.ms.bLeadF);
    rep.aKO = g.ms.aWins; rep.bKO = g.ms.bWins;
    rep.winner = result.win ? rep.a : rep.b; rep.loser = result.win ? rep.b : rep.a;
    rep.winKO = result.win ? rep.aKO : rep.bKO; rep.loseKO = result.win ? rep.bKO : rep.aKO;
    rep.shutout = rep.loseKO === 0; rep.comeback = false;
    const T = g.ms.T, m = g.ms.m;
    rep.invitational = {
      round: g.ms.roundName || 'BRACKET', label: T ? T.label : 'THE INVITATIONAL',
      champion: !!(result.win && T && m && T.isFinal(m)),
      format: T ? T.format : '1v1',
    };
    if (T && T.sides[0].ids.length > 1) rep.allyNames = T.sides[0].ids.slice(1).map(id => { const d = T.def(id); return d ? d.name : '?'; });
  } else {
    rep.kind = 'rumble';
    const ranked = g.entities.filter(e => e.def && !e.isDummy).map(f => snap(g, f)).sort((x, y) => y.kills - x.kills);
    rep.ranked = ranked.slice(0, 4);
    rep.a = ranked[0] || null; rep.b = ranked[1] || null;
    rep.winner = ranked[0] || null; rep.loser = ranked[ranked.length - 1] || null;
    rep.timeout = /TIME/.test(result.title || '');
  }
  return rep;
}

// ---------- reporter language ----------
const REPORTERS = ['DANA OKAFOR', 'MARISOL REYES', 'PETE HALVORSEN', 'RHONDA ACHEBE', 'TODD LARKIN', 'PRIYA NAIR', 'SUSAN CHOI', 'GLENN OYELARAN'];
const OPERATORS = ['J. WHITFIELD', 'M. SANTOS', 'K. ADEBAYO', 'R. KOWALSKI', 'T. NAKAMURA', 'B. LINDQVIST'];
const ANCHORS = ['MORGAN REEVES', 'CARLA VANTERPOOL', 'DEX OKONJO', 'HELEN MAAR', 'RAY STANTON'];
export function pickCrew(seed) { const rng = mulberry(seed); return { reporter: pick(rng, REPORTERS), operator: pick(rng, OPERATORS) }; }

const isSynthetic = (p) => !!(p && /unit|lab-grown|synthezoid|war engine|synthetic/i.test(p.n || ''));

// How a reporter refers to a superweapon — legal-caution register, real paperwork when we have it.
function epithet(rng, s, { full = false } = {}) {
  if (!s) return 'an unidentified superweapon';
  const P = s.person;
  if (full && P && !isSynthetic(P)) {
    return pick(rng, [
      `${s.name} — registered to ${P.n} of ${P.c} —`,
      `${s.name}, the ${P.c}-registered ${s.title.toLowerCase()},`,
      `${P.n} of ${P.c}, who operates under the name ${s.name},`,
    ]);
  }
  if (full && P && isSynthetic(P)) {
    return pick(rng, [
      `${s.name}, the ${P.c}-built synthetic,`,
      `the machine registered as ${s.name}`,
      `${s.name} — Treaty paperwork lists it as "${P.n}" —`,
    ]);
  }
  const t = (s.title || 'superweapon').replace(/^the\s+/i, '').toLowerCase();   // "The Self-Made Man of Steel" → no double article
  return pick(rng, [
    s.name,
    `the ${(s.threat || '').toLowerCase()}-threat ${t} ${s.name}`,
    `the superweapon known as ${s.name}`,
    `the vigilante ${s.name}`,
    s.name,
  ]);
}

// Civilians don't know move names. Kind keys come straight from combat flags.
const CAUSES = {
  fists: [
    'a bare-handed blow witnesses say they felt through the pavement',
    'a single punch onlookers describe as "a thunderclap with knuckles"',
    'a haymaker that, per one bystander, "moved the weather"',
  ],
  slam: [
    'being driven bodily into the side of a building',
    'a throw that ended in a load-bearing wall',
    'what structural engineers will be calling "an unscheduled demolition"',
  ],
  beam: [
    'a sustained beam of energy witnesses tracked from three neighborhoods away',
    'a column of light one resident called "a second sunrise, pointed sideways"',
    'an energy beam that left a glowing trench down the block',
  ],
  blast: [
    'a point-blank energy discharge that lit every window on the street',
    'a detonation that set off car alarms as far as the harbor',
    'an explosive blast that registered on harbor seismographs',
  ],
  blade: [
    'an edged strike witnesses compared to "sheet metal being opened"',
    'a cutting attack that took out a streetlight on the follow-through',
  ],
};
export const causeLine = (rng, kind) => pick(rng, CAUSES[kind] || CAUSES.blast);

// Witnesses live where the fight happened.
const WITNESSES = {
  'DOWNTOWN': [['Elaine Okposo', 'who watched from a bakery doorway'], ['Marcus Tran', 'who filmed it from his office window'], ['a parking attendant who gave only the name Rudy', 'still holding his booth ledger']],
  'THE SOUTHSIDE': [['Rosa Delgadillo', 'who pulled two children off a stoop'], ['Henry Nkemelu', 'whose kitchen window no longer exists'], ['a retiree named Wanda', 'who says she is "not moving, this block is hers"']],
  'THE HARBOR FRONT': [['dockworker Sal Abruzzo', 'who sheltered behind a container crane'], ['a ferry deckhand named Iris', 'who watched the water light up'], ['crane operator Dee Vaughan', 'who refused to come down during the incident']],
  'MEMORIAL PARK': [['a dog walker named Priscilla Mbeki', 'whose four charges are all accounted for'], ['groundskeeper Abel Ruiz', 'who has "re-sodded worse"']],
  'THE GARRISON': [['a duty sergeant who declined to be named', 'speaking through the fence'], ['a private first class on gate duty', 'who described "a very long safety briefing tomorrow"']],
  'MIDTOWN PLAZA': [['food-cart owner Gus Pappas', 'whose awning is now on a roof'], ['bike courier Femi Adisa', 'who kept delivering through the incident'], ['a tourist from Ohio named Chuck', 'who thought it was "part of the show"']],
};
const QUOTES = {
  fists: ['"You didn\'t hear it so much as you wore it."', '"The whole street jumped an inch. I checked."', '"I\'ve seen demolitions politer than that."'],
  slam: ['"The building caught them. The building lost."', '"One second there was a wall there. Then there was a silhouette."'],
  beam: ['"It was noon for about four seconds. In the wrong direction."', '"The light went THROUGH the block. Through it."'],
  blast: ['"Every window on the street said no comment."', '"My coffee left the cup and never came back."', '"It knocked the pigeons out of three trees. They\'re fine. They\'re furious."'],
  blade: ['"It sounded like the sky getting opened with scissors."'],
  generic: ['"This city, I swear. Tuesday."', '"We get one nice plaza and this is what they do with it."'],
};
export function witnessBit(rng, district, kind) {
  const w = pick(rng, WITNESSES[district] || WITNESSES['MIDTOWN PLAZA']);
  const q = pick(rng, (QUOTES[kind] || []).concat(QUOTES.generic));
  return { quote: q, attrib: `${w[0]}, ${w[1]}` };
}

// margin → verb, duration → phrase
function winVerb(rng, rep) {
  if (rep.shutout) return pick(rng, ['dismantled', 'made short work of', 'never let a round slip against', 'shut out']);
  if (rep.comeback) return pick(rng, ['clawed back to beat', 'came from behind to drop', 'rallied past']);
  if (rep.winKO - rep.loseKO <= 1) return pick(rng, ['outlasted', 'edged', 'survived', 'barely put away']);
  return pick(rng, ['brought down', 'dropped', 'overpowered', 'put down']);
}
function durPhrase(rng, s) {
  const m = s / 60;
  if (m < 1.2) return pick(rng, ['in barely a minute of engagement', 'before most bystanders found cover']);
  if (m < 2.5) return `after roughly ${Math.round(m)} minute${Math.round(m) > 1 ? 's' : ''} of sustained combat`;
  if (m < 5) return `in a running battle that lasted nearly ${Math.ceil(m)} minutes`;
  return `after an engagement authorities clocked at over ${Math.floor(m)} minutes`;
}

// City-desk arithmetic — the mayor's office always has a number.
export function damageEstimate(city, rng = Math.random) {
  const n = city.blocks * 2400000 + city.cars * 46500 + city.craters * 11200 + city.civs * 8500 + 18000;
  return Math.round(n * (0.96 + rng() * 0.08));
}

// ---------- the broadcast (procedural writer) ----------
export function writeBroadcast(rep) {
  const rng = mulberry((rep.clock * 1000 + rep.city.craters * 7 + rep.city.civs * 13 + (rep.winner ? rep.winner.name.length : 5)) | 0);
  const D = rep.district, tw = timeWord(rep.dayT);
  const dc = casualDistrict(D) + (rep.place && rep.place.name && rep.place.name !== 'THE WHITE CITY' ? `, ${rep.place.name}` : '');
  const script = [];
  const anchor = (t) => script.push({ who: 'ANCHOR', text: t });
  const field = (t) => script.push({ who: rep.reporter, text: t });
  let headline = 'SUPERWEAPON INCIDENT', kicker = 'SPECIAL REPORT';
  const kos = rep.log.filter(e => e.type === 'ko');
  const lastKO = kos[kos.length - 1];
  const finishing = lastKO ? causeLine(rng, lastKO.kind) : null;
  const wb = rep.bigHit ? witnessBit(rng, D, rep.bigHit.kind || 'blast') : witnessBit(rng, D, lastKO ? lastKO.kind : 'generic');

  if (rep.kind === 'duel' && rep.winner && rep.loser) {
    const W = rep.winner, L = rep.loser;
    headline = pick(rng, [
      `${W.name} DROPS ${L.name} IN ${D}`,
      `${W.name} DEFEATS ${L.name} — ${D} COUNTS THE COST`,
      `${D} SLUGFEST ENDS ${rep.winKO}–${rep.loseKO}: ${W.name} STANDS`,
      rep.comeback ? `${W.name} COMPLETES COMEBACK OVER ${L.name}` : `${W.name} TAKES ${D}`,
    ]);
    kicker = rep.shutout ? 'DECISION: SHUTOUT' : rep.comeback ? 'THE COMEBACK' : 'SUPERWEAPON DUEL';
    if (rep.invitational) {
      kicker = rep.invitational.champion ? '🏆 NEW CHAMPION' : 'INVITATIONAL · ' + rep.invitational.round;
      headline = rep.invitational.champion
        ? `${W.name} TAKES THE ${rep.invitational.label.replace('THRESHOLD ', '')} — CITY SURVIVES THE PARTY`
        : pick(rng, [`${W.name} ADVANCES — ${L.name} OUT OF THE INVITATIONAL`, `${W.name} SURVIVES THE ${rep.invitational.round} IN ${D}`]);
    }
    anchor(`Good ${tw}. ${rep.invitational ? `${rep.invitational.label} ${rep.invitational.round.toLowerCase()} action` : pick(rng, ['Chaos', 'A full-scale superweapon engagement', 'Another Treaty-class incident'])} in ${dc} this ${tw}, where ${epithet(rng, W, { full: true })} ${winVerb(rng, rep)} ${epithet(rng, L)} ${durPhrase(rng, rep.clock)}.`);
    anchor(rep.invitational
      ? `The ${rep.invitational.round.toLowerCase()} went ${rep.winKO} round${rep.winKO > 1 ? 's' : ''} to ${rep.loseKO} under elimination rules — nobody gets back up until the bell. ${lastKO ? `The deciding fall came by ${finishing}.` : ''}`
      : `The final tally: ${rep.winKO} knockdowns to ${rep.loseKO}. ${lastKO ? `It ended ${fmtClock(lastKO.t)} into the engagement — with ${finishing}.` : ''}`);
    if (rep.invitational && rep.allyNames && rep.allyNames.length) anchor(`Team rules were in effect — ${rep.winner.name} shared the floor with ${rep.allyNames.join(' and ')}, and yes: under Invitational law, splash damage counts for BOTH sides. Ask the medics.`);
    if (rep.invitational && rep.invitational.champion) anchor(`That makes ${epithet(rng, W)} the Invitational champion — the belt, the book, and the skyline. The sports desk's power board has a new #1 conversation.`);
    if (rep.comeback) anchor(`${W.name} trailed on knockdowns mid-fight before ${pick(rng, ['turning it around', 'finding another gear', 'refusing to stay down'])} — the crowd on ${dc.replace('the ', '')} corners knew it was over before the Treaty observers did.`);
    field(`${pick(rng, ['The scene here is', 'What\'s left here is', 'I\'m standing in'])} ${pick(rng, ['glass, craters, and car alarms', 'a street the city will be re-paving by Friday', 'what used to be very orderly civic planning'])}. ${pick(rng, ['Cleanup crews are already staging behind me.', 'The Treaty\'s assessors are out here counting windows.', 'Residents are filming everything — some of them never stopped.'])}`);
    if (L.person && !isSynthetic(L.person)) field(`No word yet on the condition of ${L.name}${rng() < 0.6 ? ` — the registry lists ${L.person.n} of ${L.person.c} — ` : ' '}though Treaty medics were seen on scene. ${pick(rng, ['Recovery is expected.', 'They were reportedly conscious and, quote, "annoyed."', 'Their people say a rematch is, quote, "inevitable."'])}`);
    else if (L.person) field(`Recovery units have collected ${L.name}. ${pick(rng, ['Engineers describe the damage as "fixable, with overtime."', 'A spokesperson for the program said only: "it will be back."'])}`);
  } else if (rep.kind === 'survival') {
    const A = rep.a;
    headline = pick(rng, [
      `${A.name} FALLS AFTER WAVE ${rep.wave} ONSLAUGHT`,
      `WAVE ${rep.wave}: ${D} SIEGE FINALLY ENDS`,
      `${A.name} OVERRUN IN ${D} — CITY EXHALES`,
    ]);
    kicker = 'THE SIEGE';
    anchor(`Good ${tw}. It is finally quiet in ${dc}, after ${epithet(rng, A, { full: true })} stood alone against ${rep.wave} successive waves of hostile superweapons ${durPhrase(rng, rep.clock)}.`);
    anchor(`Treaty observers counted ${A.kills} attackers put down before the line broke. ${lastKO && lastKO.vid === A.id ? `The end came with ${finishing}.` : ''}`);
    field(`Residents are coming back out, block by block. The question everyone here is asking: where were the OTHER registered weapons this ${tw}?`);
  } else {
    const W = rep.winner;
    headline = rep.timeout
      ? `CLOCK ENDS ${D} FREE-FOR-ALL — ${W ? W.name + ' ON TOP' : 'NO CLEAR VICTOR'}`
      : `${W ? W.name : 'UNKNOWN'} TAKES FOUR-WAY BRAWL IN ${D}`;
    kicker = 'THE RUMBLE';
    anchor(`Good ${tw}. Not one, not two — ${pick(rng, ['a full free-for-all', 'a four-way superweapon brawl', 'an unsanctioned rumble'])} tore through ${dc} this ${tw}, ${durPhrase(rng, rep.clock)}.`);
    if (W) anchor(`When the dust settled, ${epithet(rng, W, { full: true })} led every combatant with ${W.kills} knockdowns${rep.ranked && rep.ranked[1] ? `, ahead of ${rep.ranked[1].name} at ${rep.ranked[1].kills}` : ''}.`);
    field(`${pick(rng, ['There is no front line in a fight like this — the whole district was the ring.', 'Four flight paths, one skyline. You do the math.'])} Assessment crews will be out here through the ${tw === 'morning' ? 'day' : 'night'}.`);
  }
  // city desk — always
  const anchorName = pick(rng, ANCHORS);
  // the police beat — if units rolled, the desk covers it
  const wantedSide = [rep.a, rep.b].filter(Boolean).sort((x, y) => (y.wanted || 0) - (x.wanted || 0))[0];
  if (rep.policeEv && rep.policeEv.length && wantedSide) {
    const stars = '★'.repeat(Math.max(1, wantedSide.wanted || 1));
    anchor(`City units were on the scene — dispatch logs show a ${rep.responseS}-second response under ${dc.split(',')[0]}'s safety grade. ${wantedSide.wanted ? `${wantedSide.name} leaves this one WANTED ${stars} for civilian harm.` : `${rep.policeEv[0].v} was flagged for civilian harm mid-bout; the flag has since lapsed.`}`);
  }
  const est = damageEstimate(rep.city, rng);
  const cityBits = [];
  if (rep.city.blocks) cityBits.push(`${rep.city.blocks} structure${rep.city.blocks > 1 ? 's' : ''} down or condemned`);
  if (rep.city.cars) cityBits.push(`${rep.city.cars} vehicle${rep.city.cars > 1 ? 's' : ''} destroyed`);
  if (rep.city.civs) cityBits.push(`${rep.city.civs} civilian${rep.city.civs > 1 ? 's' : ''} treated for minor injuries`);
  if (rep.city.craters) cityBits.push(`${rep.city.craters} impact crater${rep.city.craters > 1 ? 's' : ''} awaiting road crews`);
  if (rep.city.cops) cityBits.push(`${rep.city.cops} responding officer${rep.city.cops > 1 ? 's' : ''} injured — the union has questions`);
  anchor(`The city desk tonight: ${cityBits.length ? cityBits.join(', ') + '.' : 'remarkably, no serious structural damage reported.'} The mayor's office puts early estimates at ${money(est)}${rep.city.civs ? ', and is once again urging residents to follow shelter guidance during Treaty-class engagements' : ''}.`);
  field(`Reporting live from ${dc} — ${titleCase(rep.reporter)}, KMK 9 Action News. Back to you.`);

  // ticker — a city that keeps happening around the fight
  const ticker = [
    `SUPERWEAPON INCIDENT IN ${D} — DAMAGES EST. ${money(est)}`,
    rep.winner ? `${rep.winner.name} (LEFEVRE: ${String(rep.winner.threat).toUpperCase()}) CONFIRMED ACTIVE` : 'TREATY OFFICE: "MONITORING"',
    rep.city.blocks ? 'STRUCTURAL CREWS EN ROUTE — AVOID ' + D : 'NO ROAD CLOSURES EXPECTED',
    rep.loser && rep.loser.person && !isSynthetic(rep.loser.person) ? `${rep.loser.name} EXPECTED TO RECOVER` : 'RECOVERY UNITS ON SCENE',
    pick(mulberry((rep.clock * 31) | 0), ['GARBAGE STRIKE ENDS THURSDAY', 'HARBOR FERRY RESUMES 6 AM', 'PLAZA FARMERS MARKET MOVED TO SUNDAY', 'CITY COUNCIL DEBATES "SUPERWEAPON TAX" AGAIN', 'KANO COLA RECALLS "GLOW" FLAVOR', 'ZOO: THE PIGEONS ARE FINE']),
    (() => { const h = cityHour(rep.dayT); return h < 6 ? 'OVERNIGHT CREWS SALUTE YOU' : h < 10 ? 'RUSH HOUR DELAYS: SUPERWEAPON-RELATED' : h < 17 ? `HIGH ${18 + ((rep.clock | 0) % 9)}° — CLEAR OVER THE PLAZA` : h < 21 ? 'GOLDEN HOUR OVER THE HARBOR — VIEWER PHOTOS AT 9' : 'CITY LIGHTS CAM: LIVE ATOP THE KMK TOWER'; })(),
    ...(rep.policeEv && rep.policeEv.length && wantedSide && wantedSide.wanted ? [`${wantedSide.name} WANTED ${'★'.repeat(wantedSide.wanted)} — UNITS ENGAGED`] : []),
    `KMK 9 — FIRST ON THE SCENE`,
  ];
  return { headline, kicker, script, ticker, witness: wb, est, district: D, timeWord: tw, clockStr: clockStr(rep.dayT), anchorName };
}
export function titleCase(s) { return String(s).toLowerCase().replace(/(^|[\s\-'.])\S/g, (c) => c.toUpperCase()); }

// ---------- the tale of the tape ----------
export function tapeRows(rep) {
  if (rep.kind === 'duel' && rep.a && rep.b) {
    const r = (l, av, bv) => [l, av, bv];
    return {
      cols: [rep.a, rep.b],
      rows: [
        r('KNOCKDOWNS', rep.aKO, rep.bKO),
        r('DAMAGE DEALT', rep.a.dmg, rep.b.dmg),
        r('BIGGEST HIT', rep.a.big, rep.b.big),
        r('DAMAGE TAKEN', rep.a.taken, rep.b.taken),
        r('PEAK LEVEL', 'LV ' + rep.a.level, 'LV ' + rep.b.level),
        r('LEFEVRE RATING', rep.a.threat, rep.b.threat),
        ...((rep.a.wanted || rep.b.wanted) ? [r('WANTED', rep.a.wanted ? '★'.repeat(rep.a.wanted) : '—', rep.b.wanted ? '★'.repeat(rep.b.wanted) : '—')] : []),
      ],
    };
  }
  if (rep.kind === 'survival' && rep.a) {
    return {
      cols: [rep.a],
      rows: [
        ['WAVES SURVIVED', rep.wave], ['RIVALS DOWNED', rep.a.kills], ['SCORE', rep.score],
        ['DAMAGE DEALT', rep.a.dmg], ['BIGGEST HIT', rep.a.big], ['DAMAGE TAKEN', rep.a.taken],
      ],
    };
  }
  if (rep.ranked && rep.ranked.length) {
    return { cols: rep.ranked.slice(0, 2), rows: rep.ranked.map((s) => [s.name, s.kills + ' KO', Math.round(s.dmg) + ' DMG']), ranked: true };
  }
  return { cols: [], rows: [] };
}

// ---------- optional LAN LLM punch-up (Mac Mini Ollama). Fully offline-safe. ----------
export async function llmPunchUp(rep, base) {
  let cfg = { url: 'http://192.168.1.217:11434/v1/chat/completions', model: 'qwen3.5' };
  try { const o = JSON.parse(localStorage.getItem('lsw_news_llm') || 'null'); if (o && o.url) cfg = o; } catch {}
  if (localStorage.getItem('lsw_news_llm') === 'off') return null;
  const facts = {
    mode: rep.kind, district: rep.district, timeOfDay: base.timeWord, matchLengthSec: Math.round(rep.clock),
    winner: rep.winner ? { alias: rep.winner.name, civilian: rep.winner.person, threat: rep.winner.threat, title: rep.winner.title, knockdowns: rep.winKO ?? rep.winner.kills } : null,
    loser: rep.loser ? { alias: rep.loser.name, civilian: rep.loser.person, threat: rep.loser.threat, title: rep.loser.title, knockdowns: rep.loseKO ?? rep.loser.kills } : null,
    finishingBlowKind: (rep.log.filter(e => e.type === 'ko').pop() || {}).kind || 'blast',
    comeback: !!rep.comeback, shutout: !!rep.shutout, wave: rep.wave,
    cityDamage: rep.city, estimateUSD: base.est,
  };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 9000);
  try {
    const res = await fetch(cfg.url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal,
      body: JSON.stringify({
        model: cfg.model, temperature: 0.9, max_tokens: 420,
        messages: [
          { role: 'system', content: 'You write local TV news copy for KMK 9 Action News in a city where registered superheroes ("superweapons") legally duel. Punchy, wry, grounded local-news register. Civilians and reporters do NOT know attack names — describe powers the way witnesses would. Never use he/she for combatants; use their alias or they. Output STRICT JSON only: {"headline": string (<=60 chars, ALL CAPS), "anchor": [2 strings, each <=220 chars], "witnessQuote": string (<=120 chars, in double quotes)}.' },
          { role: 'user', content: 'Facts: ' + JSON.stringify(facts) },
        ],
      }),
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const j = await res.json();
    let txt = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    if (!txt) return null;
    txt = txt.replace(/^[\s\S]*?({[\s\S]*})[\s\S]*$/, '$1');
    const out = JSON.parse(txt);
    if (!out.headline || !Array.isArray(out.anchor)) return null;
    out.headline = String(out.headline).slice(0, 80).toUpperCase();
    out.anchor = out.anchor.slice(0, 3).map((s) => String(s).slice(0, 300));
    if (out.witnessQuote) out.witnessQuote = String(out.witnessQuote).slice(0, 160);
    return out;
  } catch { clearTimeout(t); return null; }
}
