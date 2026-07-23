// Living Superweapon — TOUCH CONTROLS (iPhone / iPad).
// The trick: this emits exactly the same shape the Gamepad class does (lx/ly/rx/ry + cur/prev
// button maps), so it feeds `game.pad` and every existing control path — controlPlayer's
// `pad.down()/pressed()/released()`, the aim stick, melee, flight — works untouched.
//
// Layout: LEFT thumb = move stick (appears where you touch). RIGHT thumb = aim stick (drag to
// aim + auto-fire primary on tap). Action buttons sit above the right stick; the ability rail
// mirrors the HUD slots. Everything is a real DOM element so it scales with the safe area.

export function isTouchDevice() {
  return (('ontouchstart' in window) || navigator.maxTouchPoints > 0) &&
         matchMedia('(pointer: coarse)').matches;
}

const BTNS = [
  // id,        label,  className
  ['lmb', '●', 'tb-lmb'], ['rmb', '◆', 'tb-rmb'], ['r', 'R', 'tb-ult'],
  ['q', 'Q', 'tb-q'], ['e', 'E', 'tb-e'], ['f', 'H', 'tb-f'],
  ['strike', '✊', 'tb-strike'], ['guard', '🛡', 'tb-guard'], ['grab', '✋', 'tb-grab'],
  ['dash', '»', 'tb-dash'], ['fly', '▲', 'tb-fly'], ['descend', '▼', 'tb-desc'],
];
// system buttons map onto the pad actions main.js's padSystem() already listens for
const SYS = [['start', '⏸'], ['select', '☰']];

export class TouchControls {
  constructor(pad) {
    this.pad = pad;                 // we write straight into the live Gamepad object
    this.enabled = false;
    this.cur = {};                  // our own button state; merged into pad.cur each frame
    this.lx = 0; this.ly = 0; this.rx = 0; this.ry = 0;
    this._move = null; this._aim = null;   // active touch ids
    this._root = null;
  }

  mount() {
    if (this._root) return;
    const root = document.createElement('div');
    root.id = 'touch';
    root.innerHTML = `
      <div class="tzone tzone-l" id="tzL"><div class="tstick" id="tsL"><i></i></div></div>
      <div class="tzone tzone-r" id="tzR"><div class="tstick" id="tsR"><i></i></div></div>
      <div class="tpad">
        ${BTNS.map(([id, label, cls]) => `<button class="tbtn ${cls}" data-b="${id}">${label}</button>`).join('')}
      </div>
      <div class="tsys">
        ${SYS.map(([id, label]) => `<button class="tbtn tsm" data-b="${id}">${label}</button>`).join('')}
      </div>`;
    document.body.appendChild(root);
    this._root = root;
    this._stickL = root.querySelector('#tsL'); this._stickR = root.querySelector('#tsR');
    this._knobL = this._stickL.firstElementChild; this._knobR = this._stickR.firstElementChild;

    // --- buttons: pointer events so a finger can slide off without sticking ---
    for (const b of root.querySelectorAll('.tbtn')) {
      const id = b.dataset.b;
      const on = (e) => { e.preventDefault(); e.stopPropagation(); this.cur[id] = true; b.classList.add('on'); };
      const off = (e) => { e.preventDefault(); e.stopPropagation(); this.cur[id] = false; b.classList.remove('on'); };
      b.addEventListener('pointerdown', on);
      b.addEventListener('pointerup', off);
      b.addEventListener('pointercancel', off);
      b.addEventListener('pointerleave', off);
      b.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    // --- the two thumb zones ---
    const zoneL = root.querySelector('#tzL'), zoneR = root.querySelector('#tzR');
    const start = (side) => (e) => {
      e.preventDefault();
      const t = e.changedTouches ? e.changedTouches[0] : e;
      const st = { id: t.identifier ?? 'm', x0: t.clientX, y0: t.clientY };
      if (side === 'l') { this._move = st; this._place(this._stickL, t.clientX, t.clientY); }
      else { this._aim = st; this._place(this._stickR, t.clientX, t.clientY); }
    };
    const move = (e) => {
      e.preventDefault();
      const list = e.changedTouches ? Array.from(e.changedTouches) : [e];
      for (const t of list) {
        const id = t.identifier ?? 'm';
        if (this._move && id === this._move.id) this._drag(this._move, t, this._knobL, 'l');
        if (this._aim && id === this._aim.id) this._drag(this._aim, t, this._knobR, 'r');
      }
    };
    const end = (e) => {
      const list = e.changedTouches ? Array.from(e.changedTouches) : [e];
      for (const t of list) {
        const id = t.identifier ?? 'm';
        if (this._move && id === this._move.id) { this._move = null; this.lx = this.ly = 0; this._knobL.style.transform = ''; this._stickL.classList.remove('on'); }
        if (this._aim && id === this._aim.id) { this._aim = null; this.rx = this.ry = 0; this._knobR.style.transform = ''; this._stickR.classList.remove('on'); }
      }
    };
    for (const [zone, side] of [[zoneL, 'l'], [zoneR, 'r']]) {
      zone.addEventListener('touchstart', start(side), { passive: false });
      zone.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') start(side)(e); });
    }
    addEventListener('touchmove', move, { passive: false });
    addEventListener('touchend', end); addEventListener('touchcancel', end);
    addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' && (this._move || this._aim)) move(e); });
    addEventListener('pointerup', (e) => { if (e.pointerType === 'mouse') end(e); });
  }

  _place(stick, x, y) {
    stick.style.left = x + 'px'; stick.style.top = y + 'px';
    stick.classList.add('on');
  }
  _drag(st, t, knob, side) {
    const R = 46;
    let dx = t.clientX - st.x0, dy = t.clientY - st.y0;
    const d = Math.hypot(dx, dy);
    if (d > R) { dx = dx / d * R; dy = dy / d * R; }
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    const nx = dx / R, ny = dy / R;
    if (side === 'l') { this.lx = nx; this.ly = ny; }
    else { this.rx = nx; this.ry = ny; }
  }

  show(on) {
    if (!this._root) return;
    this.enabled = on;
    this._root.style.display = on ? 'block' : 'none';
    if (!on) { this.cur = {}; this.lx = this.ly = this.rx = this.ry = 0; }
  }

  // Called every frame BEFORE game.update polls the pad: merge touch into the pad's live state
  // so every existing `pad.down/pressed/released` check just works.
  apply() {
    const p = this.pad;
    if (!this.enabled) return;
    p.prev = p._tprev || {};
    const cur = {};
    for (const k in this.cur) if (this.cur[k]) cur[k] = true;
    p.cur = cur; p._tprev = { ...cur };
    p.lx = this.lx; p.ly = this.ly; p.rx = this.rx; p.ry = this.ry;
    p.active = true;                    // `moving`/`aiming` are getters off these — never assign them
  }
}
