// Living Superweapon — gamepad support (PS2 DualShock / standard mapping).
// Left stick = move · Right stick = aim · triggers/buttons = powers & melee.
//
// Standard button indices: 0 Cross/A · 1 Circle/B · 2 Square/X · 3 Triangle/Y
//   4 L1 · 5 R1 · 6 L2 · 7 R2 · 8 Select · 9 Start · 10 L3 · 11 R3
//   12 Dpad-up · 13 Dpad-down · 14 Dpad-left · 15 Dpad-right
const MAP = {
  lmb: 7, rmb: 6,          // R2 primary power, L2 secondary power
  dash: 5,                 // R1 dash
  guard: 4,                // L1 guard (hold)
  strike: 2,               // Square strike
  grab: 1,                 // Circle grab
  fly: 0,                  // Cross fly / ascend (hold)
  descend: 10,             // L3 (left-stick click) descend while flying (hold)
  r: 3,                    // Triangle ultimate
  q: 12, e: 15, f: 14,     // Dpad up / right / left = Q / E / F
  swap: 13,                // Dpad down = swap hero
  start: 9, select: 8,     // pause / roster
};

export class Gamepad {
  constructor() {
    this.connected = false; this.active = false; this._everUsed = false;
    this.btn = [];                       // raw button state by standard index (for menu nav)
    this.dead = 0.24; this.lx = 0; this.ly = 0; this.rx = 0; this.ry = 0;
    this.cur = {}; this.prev = {};
    addEventListener('gamepadconnected', () => { this.connected = true; });
    addEventListener('gamepaddisconnected', () => { this.connected = false; });
  }

  update() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null;
    for (const p of pads) { if (p && p.connected) { gp = p; break; } }
    this.connected = !!gp;
    this.prev = this.cur; this.cur = {};
    if (!gp) { this.active = false; this.lx = this.ly = this.rx = this.ry = 0; this.btn.length = 0; return; }
    const dz = (v) => (Math.abs(v) < this.dead ? 0 : (Math.abs(v) - this.dead) / (1 - this.dead) * Math.sign(v));
    this.lx = dz(gp.axes[0] || 0); this.ly = dz(gp.axes[1] || 0);
    this.rx = dz(gp.axes[2] || 0); this.ry = dz(gp.axes[3] || 0);
    const b = gp.buttons;
    // RAW button state by standard index, kept alongside the named map. Menu navigation
    // (core/uinav.js) needs the D-pad and face buttons directly — the named map binds the D-pad to
    // ability slots, which is right in a match and useless in a menu.
    this.btn.length = b.length;
    for (let i = 0; i < b.length; i++) this.btn[i] = !!(b[i] && b[i].pressed);
    for (const k in MAP) this.cur[k] = !!(b[MAP[k]] && b[MAP[k]].pressed);
    const anyBtn = Object.values(this.cur).some(Boolean);
    const anyStick = Math.abs(this.lx) + Math.abs(this.ly) + Math.abs(this.rx) + Math.abs(this.ry) > 0;
    if (anyBtn || anyStick) this._everUsed = true;
    this.active = this._everUsed;       // once a pad is used, treat it as the active input device
  }

  down(a) { return !!this.cur[a]; }
  raw(i) { return !!this.btn[i]; }      // raw standard-mapping index: 0 A · 1 B · 12-15 D-pad
  pressed(a) { return !!this.cur[a] && !this.prev[a]; }
  released(a) { return !this.cur[a] && !!this.prev[a]; }
  get moving() { return Math.abs(this.lx) + Math.abs(this.ly) > 0; }
  get aiming() { return Math.abs(this.rx) + Math.abs(this.ry) > 0; }
}
