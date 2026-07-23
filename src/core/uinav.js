// CONTROLLER MENU NAVIGATION — the thing that makes "no mouse, no keyboard" actually true.
//
// The game already plays fine on a pad: core/gamepad.js feeds game.pad and controlPad drives a
// fighter. But every SCREEN around the match — the roster, mode select, options, the atlas, the
// bracket, the news report, the pause menu — was mouse-and-keyboard only. On a Steam Deck that
// meant you could fight but never start a fight.
//
// Approach: DO NOT rebuild the menus. They are ordinary DOM and already respond to click. This
// module polls the pad, keeps a focus cursor over whatever interactive elements are on the
// topmost visible surface, and synthesises clicks. Every screen we already have — and every screen
// we add later — gets controller support for free, with no per-screen code.
//
// Geometry, not tab order: moving "right" picks the element whose centre is genuinely to the
// right, weighted against cross-axis drift. That matches what a player expects from a grid of
// character cards, which a linear tab order badly does not.

const DEAD = 0.55;          // stick deadzone for a discrete step
const REPEAT_FIRST = 0.42;  // hold-to-repeat: first delay
const REPEAT_NEXT = 0.13;   // hold-to-repeat: subsequent

// Surfaces in priority order — the LAST visible one wins, matching the z-stack the CSS sets up.
const SURFACES = [
  '#title',
  '#hud .end',            // end-of-match screen
  '#hOnline', '#hAtlas', '#hRankings', '#hBracket', '#hCodex', '#hDamage', '#hHowto', '#hOptions',
  '#hCreator',
  '#hud .paused',         // the pause menu
];

const FOCUSABLE = 'button, .rcard, .mcard, .c3, .fc, .cbtn, .odone, [data-scheme], [data-q], [data-t], a[href], input, select, .atrow, .rkrow';

export class UINav {
  constructor(game, hud) {
    this.game = game; this.hud = hud;
    this.el = null;                 // currently focused element
    this.enabled = true;
    this._t = 0; this._held = null; this._repeat = 0;
    this._prevA = false; this._prevB = false; this._prevY = false;
    this._lastSurface = null;
    this._injectCss();
  }

  _injectCss() {
    const s = document.createElement('style');
    // The focus ring has to read at arm's length on a 7" handheld, so it is deliberately louder
    // than a desktop :focus style — a gold outline plus a lift, using the existing tokens.
    s.textContent = `
      .padfocus { outline:3px solid var(--gold) !important; outline-offset:3px;
        box-shadow:0 0 0 6px rgba(255,210,74,.18), 0 8px 22px rgba(0,0,0,.55) !important;
        border-radius:var(--r-2); position:relative; z-index:5; }
      body.padding-nav * { cursor:none !important; }`;
    document.head.appendChild(s);
  }

  // The visible surface the player is actually looking at.
  _surface() {
    let found = null;
    for (const sel of SURFACES) {
      const e = document.querySelector(sel);
      if (!e) continue;
      const st = getComputedStyle(e);
      // ⚠ NOT offsetParent — every one of these surfaces is position:fixed, and a fixed element
      // reports offsetParent === null even when it is plainly on screen. That check silently made
      // the title screen undrivable by pad. Measure the box instead.
      const r = e.getBoundingClientRect();
      if (st.display !== 'none' && st.visibility !== 'hidden' && r.width > 0 && r.height > 0) found = e;
    }
    return found;
  }

  _items(surface) {
    return [...surface.querySelectorAll(FOCUSABLE)].filter(e => {
      if (e.disabled) return false;
      const r = e.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) return false;                 // laid out but collapsed
      const st = getComputedStyle(e);
      return st.display !== 'none' && st.visibility !== 'hidden' && +st.opacity > 0.05;
    });
  }

  _focus(el) {
    if (this.el === el) return;
    if (this.el) this.el.classList.remove('padfocus');
    this.el = el;
    if (el) {
      el.classList.add('padfocus');
      // Menus scroll on a handheld; keep the cursor on screen without yanking the view.
      if (el.scrollIntoView) el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }
  }

  // Pick the nearest item in a direction. Cross-axis drift is penalised heavily (×2.2) so a grid
  // of cards steps like a grid instead of wandering diagonally.
  _step(dx, dy) {
    const surface = this._surface(); if (!surface) return;
    const items = this._items(surface); if (!items.length) return;
    if (!this.el || !surface.contains(this.el)) { this._focus(items[0]); return; }
    const a = this.el.getBoundingClientRect();
    const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    let best = null, bestScore = Infinity;
    for (const e of items) {
      if (e === this.el) continue;
      const r = e.getBoundingClientRect();
      const ex = r.left + r.width / 2, ey = r.top + r.height / 2;
      const along = (ex - ax) * dx + (ey - ay) * dy;               // distance in the travel axis
      if (along <= 2) continue;                                    // must actually be that way
      const cross = Math.abs((ex - ax) * dy - (ey - ay) * dx);     // sideways drift
      const score = along + cross * 2.2;
      if (score < bestScore) { bestScore = score; best = e; }
    }
    if (best) this._focus(best);
  }

  _activate() {
    if (!this.el) return;
    const e = this.el;
    if (e.tagName === 'INPUT' || e.tagName === 'SELECT') { e.focus(); return; }
    e.click();
    // The click usually swaps surfaces (start a match, open a panel). Re-seat next frame.
    setTimeout(() => { const s = this._surface(); if (s && (!this.el || !s.contains(this.el))) this._seed(); }, 60);
  }

  _back() {
    if (this.hud.overlayOpen && this.hud.overlayOpen()) { this.hud.closeOverlays(); this._seed(); return; }
    // On the title, B backs out of the preview to the roster; in a match it is the pause toggle,
    // which padSystem already owns via Start.
  }

  _seed() {
    const s = this._surface(); if (!s) { this._focus(null); return; }
    const items = this._items(s);
    // Prefer the primary action if the screen has one — ENTER THE ARENA, Done, Continue.
    const primary = items.find(e => /enter the arena|continue|done|got it|rematch/i.test(e.textContent || ''));
    this._focus(primary || items[0] || null);
  }

  update(dt) {
    if (!this.enabled) return;
    const pad = this.game.pad;
    if (!pad || !pad.connected) { if (this.el) this._focus(null); document.body.classList.remove('padding-nav'); return; }

    const surface = this._surface();
    if (!surface) {                       // in a match — no menu to drive
      if (this.el) this._focus(null);
      document.body.classList.remove('padding-nav');
      this._lastSurface = null;
      return;
    }
    document.body.classList.add('padding-nav');
    if (surface !== this._lastSurface) { this._lastSurface = surface; this._seed(); }

    // --- direction: dpad OR left stick, with hold-to-repeat
    let dx = 0, dy = 0;
    // raw D-pad indices, not the named map — in a match the D-pad fires abilities
    if (pad.raw(12) || pad.ly < -DEAD) dy = -1;
    else if (pad.raw(13) || pad.ly > DEAD) dy = 1;
    else if (pad.raw(14) || pad.lx < -DEAD) dx = -1;
    else if (pad.raw(15) || pad.lx > DEAD) dx = 1;

    const key = dx + ',' + dy;
    if (dx || dy) {
      if (this._held !== key) { this._held = key; this._repeat = REPEAT_FIRST; this._step(dx, dy); }
      else { this._repeat -= dt; if (this._repeat <= 0) { this._repeat = REPEAT_NEXT; this._step(dx, dy); } }
    } else this._held = null;

    // --- buttons. A confirms, B backs out, Y is the desktop QUIT chord on the title.
    const a = pad.raw(0);        // A / Cross confirms
    const b = pad.raw(1);        // B / Circle backs out
    if (a && !this._prevA) this._activate();
    if (b && !this._prevB) this._back();
    this._prevA = !!a; this._prevB = !!b;
  }
}
