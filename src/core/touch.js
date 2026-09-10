// WAR WORLD: ASCENDANTS — TOUCH CONTROLS (iPhone / iPad).
// The trick: this emits exactly the same shape the Gamepad class does (lx/ly/rx/ry + cur/prev
// button maps), so it feeds `game.pad` and every existing control path — controlPlayer's
// `pad.down()/pressed()/released()`, the aim stick, melee, flight — works untouched.
//
// Layout: LEFT thumb = move stick (appears where you touch). RIGHT thumb = aim stick (drag to
// aim + auto-fire primary on tap). Action buttons sit above the right stick; the ability rail
// mirrors the HUD slots. Everything is a real DOM element so it scales with the safe area.

import {slotUnlocked,unlockLevel} from '../data/progression.js';
import {remoteAttack} from '../engine/remote-control.js';
import {combatLookActive} from '../engine/combat-view.js';
import {attackIcon} from '../engine/attack-icons.js';
import {icon} from '../engine/icons.js';
import {firearmStatus} from '../engine/firearm-ammo.js';

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
  // ⚠ THERE WAS NO ITEM BUTTON, so on an iPad every gadget — medkit, flashbang, jetcell, shield
  // pack, the beacon — and every weapon you scavenged off the street was unusable. The glyph is
  // geometry, not an emoji: it renders at a fixed size and is not at the mercy of a platform font.
  ['item', '◈', 'tb-item'],
  ['lock', '◎', 'tb-lock'],
  ['scope', 'Sight', 'tb-scope'], ['reload', 'Reload', 'tb-reload'],
];
// system buttons map onto the pad actions main.js's padSystem() already listens for
const SYS = [['start', '⏸'], ['select', '☰']];

export class TouchControls {
  constructor(pad) {
    this.pad = pad;                 // we write straight into the live Gamepad object
    this.enabled = false;
    this.cur = {};                  // our own button state; merged into pad.cur each frame
    this._presses=new Set();
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
        ${BTNS.map(([id, label, cls]) => `<button class="tbtn ${cls}" data-b="${id}"><span class="touch-art">${label}</span><span class="touch-name"></span><span class="touch-state"></span></button>`).join('')}
      </div>
      <div class="tsys">
        ${SYS.map(([id, label]) => `<button class="tbtn tsm" data-b="${id}">${label}</button>`).join('')}
      </div>`;
    document.body.appendChild(root);
    this._root = root;
    this._lockButton=root.querySelector('[data-b="lock"]');
    this._lockButton.setAttribute('aria-label','Lock or release viewed target');
    this._lockButton.title='Lock / release target';this._lockButton.style.display='none';
    this._abilityButtons=new Map(['lmb','rmb','q','e','f','r','shift'].map(key=>{
      const button=root.querySelector(`[data-b="${key==='shift'?'dash':key}"]`),badge=document.createElement('span');
      badge.className='touch-unlock';badge.hidden=true;button.append(badge);return [key,{button,badge,status:null}];
    }));
    this._stickL = root.querySelector('#tsL'); this._stickR = root.querySelector('#tsR');
    this._knobL = this._stickL.firstElementChild; this._knobR = this._stickR.firstElementChild;

    // --- buttons: pointer events so a finger can slide off without sticking ---
    for (const b of root.querySelectorAll('.tbtn')) {
      const id = b.dataset.b;
      const on = (e) => { e.preventDefault(); e.stopPropagation();if(!this.enabled)return;
        if(this._fighter?.slots[id]?.def.type==='rifle'&&!this.cur.scope)this._fighter._selSlot=id;
        this.pressButton(id); b.classList.add('on');if(e.pointerId!=null)b.setPointerCapture(e.pointerId); };
      const off = (e) => { e.preventDefault(); e.stopPropagation(); this.releaseButton(id); b.classList.remove('on'); };
      b.addEventListener('pointerdown', on);
      b.addEventListener('pointerup', off);
      const cancel=e=>{e.preventDefault();e.stopPropagation();this.cancelButton(id);b.classList.remove('on');};
      b.addEventListener('pointercancel', cancel);
      b.addEventListener('lostpointercapture',e=>{if(this.cur[id])cancel(e);});
      b.addEventListener('pointerleave',e=>{if(this.cur[id]&&!b.hasPointerCapture(e.pointerId))cancel(e);});
      b.addEventListener('contextmenu', (e) => e.preventDefault());
      if(id==='lock'){
        b.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&!e.repeat)on(e);});
        b.addEventListener('keyup',e=>{if(e.key==='Enter'||e.key===' ')off(e);});
        b.addEventListener('blur',()=>{this.cur.lock=false;b.classList.remove('on');});
      }
    }

    // --- the two thumb zones ---
    const zoneL = root.querySelector('#tzL'), zoneR = root.querySelector('#tzR');
    const start = (side) => (e) => {
      if (!this.enabled) return;                 // menus must keep their native touch behaviour
      e.preventDefault();
      const t = e.changedTouches ? e.changedTouches[0] : e;
      const st = { id: t.identifier ?? 'm', x0: t.clientX, y0: t.clientY };
      if (side === 'l') { this._move = st; this._place(this._stickL, t.clientX, t.clientY); }
      else { this._aim = st; this._place(this._stickR, t.clientX, t.clientY); }
    };
    const move = (e) => {
      // ⚠ This is a GLOBAL touchmove listener. It must ONLY swallow the gesture when a stick is
      // actually being dragged — preventDefault()ing every move killed scrolling on every menu
      // (you couldn't reach the START button), which is exactly the bug this comment prevents.
      if (!this.enabled || (!this._move && !this._aim)) return;
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

  updateAccess(fighter){
    if(!this._abilityButtons||!fighter)return;
    this._fighter=fighter;
    const frontline=fighter._game?.modeId==='powerworld';this._root.classList.toggle('frontline-touch',frontline);
    if(frontline){
      const labels={strike:['fighting','Punch'],guard:['defense','Block'],grab:['strength','Grab'],dash:['mobility','Evade'],fly:['flight','Rise'],descend:['flight','Descend'],item:['intellect','Gadget'],lock:['range','Lock'],scope:['range','Sight'],reload:['agility','Reload']};
      for(const [id,[glyph,label]]of Object.entries(labels)){const b=this._root.querySelector(`[data-b="${id}"]`);if(b._label!==label){b._label=label;b.querySelector('.touch-art').innerHTML=icon(glyph,18);b.querySelector('.touch-name').textContent=label;b.setAttribute('aria-label',label);}}
      const selected=fighter.slots[fighter._selSlot||'lmb']?.def,rifle=selected?.type==='rifle';
      this._root.querySelector('[data-b="scope"]').hidden=!(rifle&&selected.scopeZoom>1);
      this._root.querySelector('[data-b="reload"]').hidden=!rifle;
      for(const id of ['fly','descend'])this._root.querySelector(`[data-b="${id}"]`).hidden=(fighter.flightTier??fighter.def.flightTier)===0;
      if(!rifle)this.cur.scope=false;
    }else for(const id of ['scope','reload'])this._root.querySelector(`[data-b="${id}"]`).hidden=true;
    if(this._lockButton){
      const active=combatLookActive(fighter._game);
      this._lockButton.style.display=active?'':'none';
      this._lockButton.setAttribute('aria-pressed',String(active&&!!fighter._game.hardLock));
      if(!active)this.cur.lock=false;
    }
    for(const [key,entry] of this._abilityButtons){
      const slot=fighter.slots[key],locked=!!slot&&!slotUnlocked(fighter,key)&&!remoteAttack(fighter,slot),level=unlockLevel(fighter.def,key);
      const label=slot?.def.name||key.toUpperCase(),status=label+'|'+locked+'|'+level+'|'+frontline;
      if(frontline){
        const state=firearmStatus(fighter,key)||(slot?.cd>.05?slot.cd.toFixed(1)+'s':slot?.charging?'CHARGING':'');
        const node=entry.button.querySelector('.touch-state');if(node.textContent!==state)node.textContent=state;
        entry.button.hidden=!slot;
      }
      if(entry.status===status)continue;entry.status=status;
      if(frontline&&slot){entry.button.querySelector('.touch-art').innerHTML=attackIcon(slot.def);entry.button.querySelector('.touch-name').textContent=slot.def.mobileName||label.replace(/^Scoped /,'').replace(/^Anti-Armor /,'AT ');}
      entry.button.classList.toggle('locked',locked);entry.button.setAttribute('aria-disabled',String(locked));
      entry.button.setAttribute('aria-label',label+(locked?` — unlocks at level ${level}`:''));
      entry.button.title=label+(locked?` — unlocks at level ${level}`:'');
      entry.badge.hidden=!locked;entry.badge.textContent=locked?`LV ${level}`:'';
    }
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
    this._root.classList.toggle('touch-enabled',on);
    this._root.style.display = on ? 'block' : 'none';
    if (!on) { this.cur = {};this._presses.clear(); this.lx = this.ly = this.rx = this.ry = 0; }
  }
  pressButton(id){this.cur[id]=true;this._presses.add(id);}
  releaseButton(id){this.cur[id]=false;}
  cancelButton(id){this.cur[id]=false;this._presses.delete(id);}

  // Called every frame BEFORE game.update polls the pad: merge touch into the pad's live state
  // so every existing `pad.down/pressed/released` check just works.
  apply() {
    const p = this.pad;
    if (!this.enabled) return;
    const g=this._fighter?._game;
    if(g?.modeId==='powerworld'&&!combatLookActive(g)){
      for(const k of Object.keys(this.cur))if(k!=='start'&&k!=='select')delete this.cur[k];
      for(const k of this._presses)if(k!=='start'&&k!=='select')this._presses.delete(k);
      this.lx=this.ly=this.rx=this.ry=0;
    }
    p.prev = p._tprev || {};
    const cur = {};
    for (const k in this.cur) if (this.cur[k]) cur[k] = true;
    for(const k of this._presses)cur[k]=true;this._presses.clear();
    p.cur = cur; p._tprev = { ...cur };
    p.lx = this.lx; p.ly = this.ly; p.rx = this.rx; p.ry = this.ry;
    p.active = true;                    // `moving`/`aiming` are getters off these — never assign them
  }
}
