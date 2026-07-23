// THRESHOLD — LEARN TO PLAY: interactive onboarding that watches your REAL inputs.
// Every step reads live fighter state each frame — you pass by actually doing the thing,
// never by clicking "next". Steps that don't apply to the chosen hero (no flight, no
// gadget) are skipped automatically. Runs in a calm Danger Room (no rival).

const STEPS = [
  {
    id: 'move', obj: 'Move', keys: 'W A S D', tip: 'The mouse aims everything. Walk a lap.',
    init: (S, f) => { S.x = f.pos.x; S.z = f.pos.z; S.acc = 0; },
    check: (f, g, S) => { S.acc += Math.hypot(f.pos.x - S.x, f.pos.z - S.z); S.x = f.pos.x; S.z = f.pos.z; return S.acc > 55; },
  },
  {
    id: 'fire', obj: 'Fire your main power', keys: 'LMB', tip: 'Aim at a Training Bot and let it rip.',
    init: (S, f) => clearUse(f, 'lmb'), check: (f) => slotUsed(f, 'lmb'),
  },
  {
    id: 'fire2', obj: 'Fire your second power', keys: 'RMB', tip: 'Some powers charge or sustain — try HOLDING it.',
    init: (S, f) => clearUse(f, 'rmb'), check: (f) => slotUsed(f, 'rmb'),
  },
  {
    id: 'jab', obj: 'Throw a jab', keys: 'V — tap', tip: 'Get close to a bot first.',
    check: (f) => f.strikeActive > 0,
  },
  {
    id: 'haymaker', obj: 'Charge a HAYMAKER', keys: 'V — hold, then release', tip: 'Hold until you rumble. Haymakers CRUSH guards.',
    init: (S) => { S.charged = false; },
    check: (f, g, S) => { if (f.meleeCharge > 0.6) S.charged = true; return S.charged && f.meleeCharge <= 0 && f._heavyHay === true; },
  },
  {
    id: 'guard', obj: 'Hold your guard', keys: 'C — hold', tip: 'Blocks strikes to chip damage. Grabs go right through it.',
    init: (S) => { S.t = 0; },
    check: (f, g, S, dt) => { if (f.guarding) S.t += dt; return S.t > 0.8; },
  },
  {
    id: 'grab', obj: 'Grab a Training Bot', keys: 'G — up close', tip: 'Strike beats Grab · Grab beats Guard · Guard beats Strike.',
    check: (f) => !!(f.grabState === 'clinch' || f.grabbing),
  },
  {
    id: 'evade', obj: 'Evade', keys: '2×TAP a direction', tip: 'Double-tap W/A/S/D fast. This is your escape hatch.',
    check: (f) => f.evadeCd > 0,
  },
  {
    id: 'fly', obj: 'Take off and climb', keys: 'F, then hold SPACE', tip: 'Release SPACE to hover in place.',
    enabled: (f) => (f.def.flightTier ?? 3) > 0,
    check: (f) => f.flying && f.pos.y > 6,
  },
  {
    id: 'land', obj: 'Descend and land', keys: 'Z — hold', tip: 'Touch down to fold your wings.',
    enabled: (f) => (f.def.flightTier ?? 3) > 0,
    check: (f) => !f.flying && f.pos.y < 0.5,
  },
  {
    id: 'item', obj: 'Use your gadget', keys: 'X', tip: 'Gadgets cost no ki — cooldown only.',
    enabled: (f) => (f.items || []).length > 0,
    init: (S, f) => { S.snap = JSON.stringify(f.items); },
    check: (f, g, S) => JSON.stringify(f.items) !== S.snap,
  },
  {
    id: 'ult', obj: 'Unleash your ULTIMATE', keys: 'R', tip: 'The big one. Watch the blue ki bar — empty means fizzle.',
    init: (S, f) => clearUse(f, 'r'), check: (f) => slotUsed(f, 'r'),
  },
  {
    id: 'ko', obj: 'Destroy a Training Bot', keys: 'everything you know', tip: 'Finish one. Make it violent.',
    check: (f, g) => g.entities.some(e => e.isDummy && e.state === 'ko'),   // dummies stay down 2.2s — plenty
  },
];
const slotUsed = (f, k) => {
  const s = f.slots && f.slots[k];
  return !!s && (s.cd > 0 || s.charging || s.sustainT > 0 || s.chargeT > 0 || (f._slotUse && f._slotUse[k]));
};
const clearUse = (f, k) => { if (f._slotUse) delete f._slotUse[k]; };

export class Tutorial {
  constructor(game, hud) { this.game = game; this.hud = hud; this.active = false; }

  begin() {
    const f = this.game.player; if (!f) return;
    this.steps = STEPS.filter(s => !s.enabled || s.enabled(f));
    this.i = -1; this.active = true; this._doneT = 0;
    this._advance();
  }

  _advance() {
    this.i++;
    if (this.i >= this.steps.length) { this._complete(); return; }
    const st = this.steps[this.i];
    this.S = {};
    if (st.init) st.init(this.S, this.game.player, this.game);
    this.hud.showTutorial(st, this.i, this.steps.length);
  }

  _complete() {
    this.active = false;
    try { localStorage.setItem('threshold_tutorial_done', '1'); } catch { /* fine */ }
    this.hud.completeTutorial();
    this.game.audio.boom(0.5);
    if (this.hud.announce) this.hud.announce('YOU ARE THE WEAPON', 'tutorial complete — TAB for the roster, B for a rival', '#ffd24a');
  }

  skip() { this.active = false; this.hud.hideTutorial(); }

  update(dt) {
    if (!this.active) return;
    const f = this.game.player; if (!f) return;
    const st = this.steps[this.i];
    if (st.check(f, this.game, this.S, dt)) {
      this.game.audio.zap(980);
      this.hud.tutorialStepDone();
      this._advance();
    }
  }
}
