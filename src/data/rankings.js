// THRESHOLD — the POWER RANKINGS ledger. Every match the engine runs — AI vs AI, human vs AI,
// tournament rounds — feeds one persistent Elo book per hero id. The Registry reads it for each
// subject's FIELD RECORD, the KMK 9 sports desk renders the top table, and the Invitational
// seeds its bracket from it. Ratings are seeded from the LeFevre threat scale so day-one boards
// look sane; play reshapes them from there. localStorage `threshold_rankings_v1`.

const KEY = 'threshold_rankings_v1';
const SEED = { 'Low': 1120, 'Moderate': 1190, 'High': 1260, 'Very High': 1330, 'Extreme': 1400 };

let BOOK = null;   // { heroes: { id: {elo,w,l,ko,kod,hist:[{vs,win,how,t}]} }, season, champion, tournaments }

function load() {
  if (BOOK) return BOOK;
  try { BOOK = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { BOOK = null; }
  if (!BOOK || !BOOK.heroes) BOOK = { heroes: {}, season: 1, champion: null, tournaments: 0 };
  return BOOK;
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(BOOK)); } catch {} }

export function recOf(id, def) {
  const B = load();
  if (!B.heroes[id]) B.heroes[id] = { elo: SEED[def && def.threat] ?? 1225, w: 0, l: 0, ko: 0, kod: 0, hist: [] };
  return B.heroes[id];
}
const expected = (a, b) => 1 / (1 + Math.pow(10, (b - a) / 400));

// A knockdown between two registered weapons — small K so single KOs nudge, matches decide.
export function koElo(killerId, victimId, defs, k = 10) {
  if (!killerId || !victimId || killerId === victimId) return;
  const A = recOf(killerId, defs && defs[0]), B = recOf(victimId, defs && defs[1]);
  const d = Math.round(k * (1 - expected(A.elo, B.elo)));
  A.elo += d; B.elo -= d; A.ko++; B.kod++;
  save();
}

// A decided match. how: 'duel' | 'tournament' | 'sim' | 'rumble'. Sims barely move the book.
export function matchElo(winnerId, loserId, defs, how = 'duel') {
  if (!winnerId || !loserId || winnerId === loserId) return { d: 0 };
  const k = how === 'sim' ? 6 : how === 'tournament' ? 40 : 28;
  const A = recOf(winnerId, defs && defs[0]), B = recOf(loserId, defs && defs[1]);
  const d = Math.round(k * (1 - expected(A.elo, B.elo)));
  A.elo += d; B.elo -= d; A.w++; B.l++;
  const t = Date.now();
  A.hist.unshift({ vs: loserId, win: 1, how, t }); if (A.hist.length > 8) A.hist.length = 8;
  B.hist.unshift({ vs: winnerId, win: 0, how, t }); if (B.hist.length > 8) B.hist.length = 8;
  save();
  return { d };
}

export function crownChampion(id) { const B = load(); B.champion = id; B.tournaments++; save(); }
export function championId() { return load().champion; }
export function tournamentNo() { return load().tournaments + 1; }

// Pure ranking snapshot — NO movement bookkeeping. The Registry's dossiers read this;
// only the sports-desk BOARD calls rankingTable (which advances the Δ-since-last-look state).
export function snapshotTable(roster) {
  return roster.filter(d => !d.isDummy).map(d => {
    const r = recOf(d.id, d);
    return { id: d.id, elo: r.elo, w: r.w, l: r.l, ko: r.ko, kod: r.kod };
  }).sort((a, b) => b.elo - a.elo).map((r, i) => ((r.rank = i + 1), r));
}

// The board: every roster hero ranked by Elo (unplayed heroes ride their threat seed).
export function rankingTable(roster) {
  const rows = roster.filter(d => !d.isDummy).map(d => {
    const r = recOf(d.id, d);
    return { id: d.id, name: d.name, threat: d.threat, colors: d.colors, elo: r.elo, w: r.w, l: r.l, ko: r.ko, kod: r.kod, played: r.w + r.l > 0 };
  }).sort((a, b) => b.elo - a.elo);
  // movement vs the last time anyone looked at the board
  const B = load(); const prev = B.prevRanks || {};
  rows.forEach((row, i) => { row.rank = i + 1; row.moved = prev[row.id] ? prev[row.id] - (i + 1) : 0; });
  B.prevRanks = Object.fromEntries(rows.map(r => [r.id, r.rank])); save();
  return rows;
}
export function rankOf(id, roster) { return rankingTable(roster).find(r => r.id === id); }

// Registry dossier line: the subject's recent activity, human-readable.
export function recentIncidents(id, roster) {
  const r = load().heroes[id];
  if (!r || !r.hist.length) return [];
  return r.hist.slice(0, 4).map(h => {
    const foe = roster.find(x => x.id === h.vs);
    return { win: !!h.win, vs: foe ? foe.name : String(h.vs || '?').toUpperCase(), how: h.how, t: h.t };
  });
}
export function resetRankings() { BOOK = { heroes: {}, season: 1, champion: null, tournaments: 0 }; save(); }
