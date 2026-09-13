// WAR WORLD: ASCENDANTS — gamepad support (PS2 DualShock / standard mapping).
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
  // ⚠ THE ITEM BUTTON WAS MISSING ENTIRELY, so `pad.pressed('item')` was permanently false and
  // **every gadget and every scavenged weapon was keyboard-only** — unreachable on a Steam Deck or
  // an iPad, which are the two platforms this game is built for. R3 (right-stick click) because the
  // right thumb is already on that stick to aim: a click costs no hand movement, and X is fly.
  item: 11,                // R3 (right-stick click) = gadget / fire held gear
  q: 12, e: 15, f: 14,     // Dpad up / right / left = Q / E / F
  swap: 13,                // Dpad down = swap hero
  start: 9, select: 8,     // pause / roster
};

export const POWERWORLD_MAP={lmb:7,rmb:6,guard:4,grab:5,strike:2,evade:1,fly:0,descend:13,dash:10,lock:11,item:3,flightToggle:12,cyclePrimary:14,cycleSecondary:15,start:9,select:8};
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
    const map=this.powerworld?POWERWORLD_MAP:MAP;
    for (const k in map) this.cur[k] = !!(b[map[k]] && b[map[k]].pressed);
    if(this.powerworld){
      this.cur.reload=!!(this.cur.descend&&this.cur.strike);
      if(this.cur.reload)(this._combatSuppressed??=new Set()).add('strike');
    }
    const anyBtn = Object.values(this.cur).some(Boolean);
    const anyStick = Math.abs(this.lx) + Math.abs(this.ly) + Math.abs(this.rx) + Math.abs(this.ry) > 0;
    if (anyBtn || anyStick) this._everUsed = true;
    this.active = this._everUsed;       // once a pad is used, treat it as the active input device
  }

  // View tap opens inventory; a hold owns independent look until release.
  sampleViewGesture(dt,allowed){
    this.inventoryRequested=false;this.viewFreeLook=false;
    if(!this.powerworld||!this.connected||!allowed){this._viewAge=0;this._viewConsumed=true;return;}
    if(this.pressed('select')){this._viewAge=0;this._viewConsumed=false;}
    if(this.down('select')&&!this._viewConsumed){
      this._viewAge=(this._viewAge||0)+Math.max(0,dt);
      if(this._viewAge>=.28)this.viewFreeLook=true;
    }
    if(this.released('select')){
      this.inventoryRequested=!this._viewConsumed&&(this._viewAge||0)<.28;
      this._viewAge=0;this._viewConsumed=true;
    }
  }

  // Sample after physical/touch input is merged. A chord owns R3 until its
  // physical release, including the release edge; modifier order cannot fire X.
  sampleCombatLock(active) {
    const held=this._combatSuppressed;
    if(held)for(const key of held)if(!this.cur[key]&&!this.prev[key])held.delete(key);
    if(!active)return false;
    if(this.pressed('lock'))return true;
    if(!this.powerworld&&this.down('guard')&&this.pressed('item')){
      (this._combatSuppressed??=new Set()).add('item');return true;
    }
    return false;
  }
  suppressCombatHeld() {
    const held=this._combatSuppressed??=new Set();
    for(const key of Object.keys(this.cur))if(this.cur[key]&&!['start','select','swap'].includes(key))held.add(key);
  }
  down(a) { return !this._combatSuppressed?.has(a)&&!!this.cur[a]; }
  raw(i) { return !!this.btn[i]; }      // raw standard-mapping index: 0 A · 1 B · 12-15 D-pad
  pressed(a) { return !this._combatSuppressed?.has(a)&&!!this.cur[a] && !this.prev[a]; }
  released(a) { return !this._combatSuppressed?.has(a)&&!this.cur[a] && !!this.prev[a]; }
  get moving() { return Math.abs(this.lx) + Math.abs(this.ly) > 0; }
  get aiming() { return Math.abs(this.rx) + Math.abs(this.ry) > 0; }
}
