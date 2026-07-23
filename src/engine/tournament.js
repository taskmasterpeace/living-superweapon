// THRESHOLD — THE INVITATIONAL. An eight-seed single-elimination bracket over the Elo book.
// Formats: '1v1' lone wolves · '2v2' duos (you get a partner) · '1v2' underdog (you alone, every
// rival side is a pair). The player PLAYS their matches (best-of-3 elimination rounds, team damage
// live); every other match resolves off-screen by rating-weighted simulation, booked into the
// rankings at sim weight. Real player matches book at full tournament weight. The final crowns a
// champion in the ledger (the sports desk shows the 🏆).
import { recOf, snapshotTable, matchElo, crownChampion, tournamentNo } from '../data/rankings.js';

const ROUND_NAMES = ['QUARTERFINAL', 'SEMIFINAL', 'GRAND FINAL'];

export class Tournament {
  constructor(roster, playerId, format = '1v1') {
    this.roster = roster; this.format = format; this.no = tournamentNo();
    this.label = 'THRESHOLD INVITATIONAL #' + this.no;
    const mySize = format === '2v2' ? 2 : 1;
    const oppSize = format === '1v1' ? 1 : 2;
    // draw pool: the book's finest, lightly shuffled so every bracket isn't identical
    const pool = snapshotTable(roster).map(r => r.id).filter(id => id !== playerId);
    const draw = pool.slice(0, 7 * oppSize + (mySize - 1) + 4);
    for (let i = draw.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [draw[i], draw[j]] = [draw[j], draw[i]]; }
    const take = (n) => draw.splice(0, n);
    this.sides = [{ ids: [playerId, ...take(mySize - 1)], human: true }];
    for (let s = 0; s < 7; s++) this.sides.push({ ids: take(oppSize), human: false });
    // seed by side rating, then classic 8-bracket order: 1v8 · 4v5 · 3v6 · 2v7
    const seeded = this.sides.map((s, i) => ({ i, elo: this.sideElo(s) })).sort((a, b) => b.elo - a.elo);
    seeded.forEach((s, rank) => { this.sides[s.i].seed = rank + 1; });
    const bySeed = (n) => seeded[n - 1].i;
    this.rounds = [
      [this._m(bySeed(1), bySeed(8)), this._m(bySeed(4), bySeed(5)), this._m(bySeed(3), bySeed(6)), this._m(bySeed(2), bySeed(7))],
      [this._m(null, null), this._m(null, null)],
      [this._m(null, null)],
    ];
  }
  _m(a, b) { return { a, b, winner: null, score: null, sim: false }; }

  sideElo(s) { return Math.round(s.ids.reduce((t, id) => t + recOf(id, this.def(id)).elo, 0) / s.ids.length); }
  def(id) { return this.roster.find(d => d.id === id); }
  sideName(s) { return s.ids.map(id => { const d = this.def(id); return d ? d.name : '?'; }).join(' & '); }
  humanSideIdx() { return 0; }

  // pull winners forward into the next round's slots
  _resolveLinks() {
    const w = (m) => (m && m.winner != null) ? m.winner : null;
    const R = this.rounds;
    R[1][0].a = w(R[0][0]); R[1][0].b = w(R[0][1]);
    R[1][1].a = w(R[0][2]); R[1][1].b = w(R[0][3]);
    R[2][0].a = w(R[1][0]); R[2][0].b = w(R[1][1]);
  }
  currentRoundIdx() {
    this._resolveLinks();
    for (let r = 0; r < 3; r++) if (this.rounds[r].some(m => m.winner == null)) return r;
    return -1;   // bracket complete
  }
  roundName(r = this.currentRoundIdx()) { return ROUND_NAMES[Math.max(0, r)] || 'GRAND FINAL'; }
  // the player's next live match (sides resolved), or null if eliminated / champion decided
  currentMatch() {
    const r = this.currentRoundIdx();
    if (r < 0) return null;
    const m = this.rounds[r].find(m2 => m2.winner == null && (m2.a === 0 || m2.b === 0));
    return (m && m.a != null && m.b != null) ? m : null;
  }
  isFinal(m) { return this.rounds[2].includes(m); }
  matchSides(m) { return [this.sides[m.a], this.sides[m.b]]; }
  playerFoeSide(m) { return this.sides[m.a === 0 ? m.b : m.a]; }
  // still in the bracket = no decided match involving side 0 that side 0 lost
  humanAlive() { return ![].concat(...this.rounds).some(m => m.winner != null && m.winner !== 0 && (m.a === 0 || m.b === 0)); }

  // The player's match is decided on the arena floor — book it, then let the rest of the
  // round (and, if the player is out, the rest of the BRACKET) resolve by simulation.
  reportPlayerMatch(m, playerWon, score) {
    const foe = m.a === 0 ? m.b : m.a;
    m.winner = playerWon ? 0 : foe; m.score = score; m.sim = false;
    const A = this.sides[0].ids[0], B = this.sides[foe].ids[0];
    matchElo(playerWon ? A : B, playerWon ? B : A, [this.def(playerWon ? A : B), this.def(playerWon ? B : A)], 'tournament');
    this._simForward();
    return this.champion();
  }
  _simMatch(m) {
    const a = this.sides[m.a], b = this.sides[m.b];
    const ea = this.sideElo(a), eb = this.sideElo(b);
    const pA = 1 / (1 + Math.pow(10, (eb - ea) / 400));
    const aWins = Math.random() < pA;
    m.winner = aWins ? m.a : m.b; m.sim = true;
    m.score = Math.random() < Math.abs(pA - 0.5) + 0.35 ? [2, 0] : [2, 1];   // lopsided books sweep more often
    const W = aWins ? a : b, L = aWins ? b : a;
    matchElo(W.ids[0], L.ids[0], [this.def(W.ids[0]), this.def(L.ids[0])], 'sim');
  }
  // sim every undecided match the player is NOT in; if the player is out of the bracket,
  // run it all the way down and crown whoever survives
  _simForward() {
    for (let guard = 0; guard < 9; guard++) {
      this._resolveLinks();
      const r = this.currentRoundIdx();
      if (r < 0) break;
      const pending = this.rounds[r].filter(m => m.winner == null && m.a != null && m.b != null);
      const mine = pending.find(m => m.a === 0 || m.b === 0);
      for (const m of pending) if (m !== mine) this._simMatch(m);
      if (mine) break;                                   // the player still has a live match — stop here
      if (!pending.length && this.rounds[r].some(m => m.a == null || m.b == null)) continue;
      if (!pending.length) continue;
    }
    this._resolveLinks();
    const champ = this.champion();
    if (champ && !this._crowned) { this._crowned = true; crownChampion(champ.ids[0]); }
  }
  champion() {
    const f = this.rounds[2][0];
    return f.winner != null ? this.sides[f.winner] : null;
  }
}
