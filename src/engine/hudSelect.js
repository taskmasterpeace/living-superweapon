// SELECT YOUR CHARACTER — the arena-fighter select screen (DBZ filmstrip), Steam-Deck first.
//
// A horizontal filmstrip of the 52 roster as accent CARDS, scrolling so the selection stays
// centred; the SELECTED fighter is rendered LIVE in 3D in the middle, lit with a soft radial aura
// in that hero's OWN accent colour, with the big name, LeFevre threat, rank band and three
// kitFacts chips beside it. Controller-navigable end to end (A/D · arrows · wheel · LB/RB), no
// mouse required.
//
// ⚠ ONLY THE SELECTED HERO IS RENDERED LIVE. 52 figures each frame would tank the budget — the
// strip panels are cheap CSS accent cards and the centre is ONE `figure(def)` in its own tiny
// renderer, swapped on selection. The loop only runs while the screen is open.
//
// ⚠ EVERYTHING DERIVES FROM THE DATA — heroStats/kitFacts/rankOf/threat/accent — so the screen can
// never say something the engine doesn't. NO PURPLE except KIVULI's own accent (the sole exception,
// authored on the def). Canvas/aura colours are LITERALS off `def.colors.accent` — Canvas 2D and
// the WebGL renderer cannot read CSS tokens.

import * as THREE from 'three';
import { figure } from './figure.js';
import { ROSTER } from '../data/characters.js';
import { heroStats, kitFacts, THREAT_COLORS } from './hud.js';
import { rankOf, rankBandOf } from '../data/scale.js';
import { identityOf } from '../data/identities.js';
import { icon } from './icons.js';
import { glyph, padActive } from '../core/glyphs.js';

const SEL_CSS = `
#hSelect{position:fixed;inset:0;z-index:71;display:none;flex-direction:column;
  font-family:var(--f-display,"Rajdhani",system-ui,sans-serif);color:var(--text,#e8e2d6);
  background:radial-gradient(120% 90% at 50% 8%,rgba(14,14,20,.62),rgba(6,7,11,.94) 70%);}
#hSelect.on{display:flex}
#hSelect .selscan{position:absolute;inset:0;pointer-events:none;
  background:repeating-linear-gradient(0deg,rgba(0,0,0,.16) 0 1px,transparent 1px 3px);opacity:.35;mix-blend-mode:multiply}
#hSelect .seltop{display:flex;align-items:baseline;gap:16px;padding:20px 34px 6px}
#hSelect .seltitle{font-size:34px;font-weight:800;letter-spacing:.14em;line-height:1;
  color:var(--gold,#ffd24a);text-shadow:0 2px 0 var(--gold-shadow,#7a3d05),0 0 26px rgba(245,178,26,.35);text-transform:uppercase}
#hSelect .selkick{font-family:var(--f-mono,monospace);font-size:11px;letter-spacing:.22em;color:var(--text-4,#8b8577)}
#hSelect .selmode{margin-left:auto;font-family:var(--f-mono,monospace);font-size:11px;letter-spacing:.18em;
  color:var(--gold,#ffd24a);border:1px solid var(--line-gold,rgba(245,178,26,.35));border-radius:20px;padding:5px 14px;text-transform:uppercase}
#hSelect .selstage{flex:1;display:flex;align-items:center;gap:24px;padding:0 40px;min-height:0}
#hSelect .selcvwrap{position:relative;flex:1.15;height:100%;display:flex;align-items:center;justify-content:center;min-width:0}
#hSelect .selaura{position:absolute;left:50%;top:50%;width:78%;height:88%;transform:translate(-50%,-50%);
  border-radius:50%;filter:blur(6px);pointer-events:none;opacity:.9;animation:selpulse 3.4s ease-in-out infinite}
@keyframes selpulse{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.06)}}
#hSelect #selCv{position:relative;width:100%;height:100%;z-index:1}
#hSelect .selfloor{position:absolute;left:50%;bottom:10%;width:56%;height:34px;transform:translateX(-50%);
  border-radius:50%;background:radial-gradient(ellipse,rgba(0,0,0,.55),transparent 70%);pointer-events:none}
#hSelect .selinfo{flex:.85;max-width:440px;display:flex;flex-direction:column;gap:12px;padding-right:6px}
#hSelect .selfile{font-family:var(--f-mono,monospace);font-size:11px;letter-spacing:.2em;color:var(--text-5,#8b8577);
  display:flex;align-items:center;gap:10px}
#hSelect .selflag{font-size:15px}
#hSelect .selname{font-size:62px;font-weight:800;line-height:.92;letter-spacing:.01em;text-transform:uppercase;
  text-shadow:0 3px 0 rgba(0,0,0,.5),0 0 30px currentColor;filter:saturate(1.1)}
#hSelect .selttl{font-size:15px;font-weight:600;letter-spacing:.06em;color:var(--text-2,#c9c2b4);text-transform:uppercase;margin-top:-2px}
#hSelect .selbadges{display:flex;flex-wrap:wrap;gap:8px;margin-top:2px}
#hSelect .selbadge{font-family:var(--f-mono,monospace);font-size:11px;letter-spacing:.14em;font-weight:700;
  padding:5px 12px;border-radius:6px;border:1px solid;text-transform:uppercase;display:inline-flex;align-items:center;gap:6px}
#hSelect .selchips{display:flex;flex-direction:column;gap:7px;margin-top:6px}
#hSelect .selchip{display:flex;align-items:center;gap:9px;font-size:13px;font-weight:600;letter-spacing:.02em;
  color:var(--text-2,#c9c2b4);background:var(--surface,rgba(8,10,16,.55));border:1px solid var(--line,rgba(255,255,255,.08));
  border-left:3px solid var(--pc,#ffd24a);border-radius:8px;padding:8px 12px}
#hSelect .selchip svg{flex:none;opacity:.85}
#hSelect .selchip.lead{color:var(--text,#e8e2d6);font-weight:700}
#hSelect .selstrip{position:relative;height:150px;margin-top:4px;overflow:hidden;
  -webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);
  mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
#hSelect .selstripInner{position:absolute;left:0;top:14px;display:flex;gap:10px;padding:0 0;
  transition:transform .28s cubic-bezier(.2,.7,.2,1);will-change:transform}
#hSelect .scard{position:relative;flex:none;width:88px;height:122px;border-radius:10px;overflow:hidden;cursor:pointer;
  border:1px solid rgba(255,255,255,.1);background:linear-gradient(180deg,var(--c1),var(--c2));
  filter:grayscale(.5) brightness(.62);opacity:.72;transition:transform .28s cubic-bezier(.2,.7,.2,1),filter .28s,opacity .28s,box-shadow .28s;
  transform-origin:center bottom}
#hSelect .scard .snm{position:absolute;left:0;right:0;bottom:0;padding:4px 5px 5px;
  font-size:10px;font-weight:800;letter-spacing:.03em;text-align:center;color:#fff;text-transform:uppercase;
  background:linear-gradient(180deg,transparent,rgba(0,0,0,.82));text-shadow:0 1px 2px #000;line-height:1}
#hSelect .scard .ssil{position:absolute;left:50%;top:46%;transform:translate(-50%,-50%);font-size:44px;font-weight:900;
  color:rgba(255,255,255,.22);text-shadow:0 2px 6px rgba(0,0,0,.4)}
#hSelect .scard .sfno{position:absolute;top:4px;left:5px;font-family:var(--f-mono,monospace);font-size:8px;letter-spacing:.05em;color:rgba(255,255,255,.7)}
#hSelect .scard .sdot{position:absolute;top:5px;right:5px;width:8px;height:8px;border-radius:50%;box-shadow:0 0 6px currentColor}
#hSelect .scard.on{filter:none;opacity:1;transform:scale(1.28) translateY(-8px);z-index:5;
  border-color:var(--c-accent);box-shadow:0 0 0 2px var(--c-accent),0 10px 26px rgba(0,0,0,.6),0 0 34px var(--c-glow)}
#hSelect .selbar{display:flex;align-items:center;justify-content:center;gap:26px;padding:12px 40px 16px;
  font-family:var(--f-mono,monospace);font-size:12px;letter-spacing:.12em;color:var(--text-3,#b7b0a2);
  border-top:1px solid var(--line,rgba(255,255,255,.08))}
#hSelect .selbar b{display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:22px;padding:0 7px;margin-right:7px;
  border:1px solid var(--line-gold,rgba(245,178,26,.35));border-radius:5px;color:var(--gold,#ffd24a);font-weight:700}
#hSelect .selbar .go{color:var(--good,#8fe08a)}
#hSelect .selbar .go b{border-color:rgba(143,224,138,.4);color:var(--good,#8fe08a)}
#hSelect .selfilt{margin-left:auto;font-family:var(--f-mono,monospace);font-size:11px;letter-spacing:.16em;
  color:var(--text-4,#8b8577);border:1px solid var(--line,rgba(255,255,255,.1));border-radius:20px;padding:5px 14px;cursor:pointer}
#hSelect .selfilt:hover{color:var(--gold,#ffd24a);border-color:var(--line-gold,rgba(245,178,26,.35))}
`;

// One WebGLRenderer + scene, built lazily, reused for the whole session. figure(def) is pure
// THREE construction, so it renders standalone with our own lights.
export const SelectMixin = {
  showSelect(onStart, opts = {}) {
    this._selStart = onStart;
    this._selMode = opts.mode || 'duel';
    if (this.closeOverlays) this.closeOverlays();   // the how-to auto-opens for new players — don't bleed through
    if (!this._sel) this._selBuild();
    const el = this._sel.el;
    // rebuild the mode chip + glyph bar each open (device may have changed)
    this._sel.mode.textContent = (opts.modeName || this._selMode).toUpperCase() + ' ▸';
    this._selBar();
    // pick the starting selection (last picked hero if any)
    const startId = opts.p1 || this.selectedHero || (ROSTER[0] && ROSTER[0].id);
    this._sel.idx = Math.max(0, ROSTER.findIndex(d => d.id === startId));
    el.classList.add('on');
    this._selOpen = true;
    // hide the title CHROME so it doesn't ghost through — the live 3D arena behind becomes the
    // dimmed backdrop (the game keeps rendering the world while running=false).
    if (this.title) { this._selTitleVis = this.title.style.visibility; this.title.style.visibility = 'hidden'; }
    if (this.root) { this._selRootVis = this.root.style.visibility; this.root.style.visibility = 'hidden'; }   // no stray HUD hint bleeding through
    if (this.game && this.game.uinav) this.game.uinav.enabled = false;   // we own the pad while open
    this._selSelect(this._sel.idx, true);
    this._selResize();
    this._selLoop();
  },

  hideSelect() {
    if (!this._sel) return;
    this._selOpen = false;
    this._sel.el.classList.remove('on');
    if (this.title) this.title.style.visibility = this._selTitleVis || 'visible';
    if (this.root) this.root.style.visibility = this._selRootVis || 'visible';
    if (this.game && this.game.uinav) this.game.uinav.enabled = true;
  },

  _selBuild() {
    const style = document.createElement('style'); style.textContent = SEL_CSS; document.head.appendChild(style);
    const el = document.createElement('div'); el.id = 'hSelect';
    el.innerHTML = `
      <div class="selscan"></div>
      <div class="seltop">
        <div class="seltitle">Select Your Character</div>
        <div class="selkick">THRESHOLD REGISTRY — CHOOSE YOUR WEAPON</div>
        <div class="selmode" id="selMode">DUEL ▸</div>
      </div>
      <div class="selstage">
        <div class="selcvwrap">
          <div class="selaura" id="selAura"></div>
          <div class="selfloor"></div>
          <canvas id="selCv"></canvas>
        </div>
        <div class="selinfo" id="selInfo"></div>
      </div>
      <div class="selstrip"><div class="selstripInner" id="selStrip"></div></div>
      <div class="selbar" id="selBar"></div>`;
    document.body.appendChild(el);
    const strip = el.querySelector('#selStrip');
    const cards = ROSTER.map((d, i) => {
      const c = d.colors || {};
      const tc = THREAT_COLORS[d.threat] || 'var(--text-4)';
      const card = document.createElement('div');
      card.className = 'scard';
      card.style.setProperty('--c1', c.primary || '#333');
      card.style.setProperty('--c2', c.secondary || '#111');
      card.style.setProperty('--c-accent', c.accent || '#ffd24a');
      card.style.setProperty('--c-glow', (c.accent || '#ffd24a') + '88');
      card.innerHTML = `<span class="sfno">${String(i + 1).padStart(2, '0')}</span>`
        + `<span class="sdot" style="color:${tc};background:${tc}"></span>`
        + `<span class="ssil">${(d.name || '?')[0]}</span>`
        + `<span class="snm">${d.name}</span>`;
      card.onclick = () => { if (this._sel.idx === i) this._selConfirm(); else this._selSelect(i); };
      strip.appendChild(card);
      return card;
    });
    this._sel = {
      el, strip, cards, info: el.querySelector('#selInfo'), aura: el.querySelector('#selAura'),
      mode: el.querySelector('#selMode'), bar: el.querySelector('#selBar'),
      cv: el.querySelector('#selCv'), idx: 0, three: null, padPrev: {},
    };
    // keyboard nav — its own listener, only live while the screen is open
    this._selKey = (e) => {
      if (!this._selOpen) return;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') { this._selStep(1); e.preventDefault(); }
      else if (e.code === 'ArrowLeft' || e.code === 'KeyA') { this._selStep(-1); e.preventDefault(); }
      else if (e.code === 'ArrowDown' || e.code === 'KeyS') { this._selStep(6); e.preventDefault(); }
      else if (e.code === 'ArrowUp' || e.code === 'KeyW') { this._selStep(-6); e.preventDefault(); }
      else if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') { this._selConfirm(); e.preventDefault(); }
      else if (e.code === 'Escape' || e.code === 'Backspace') { this._selBack(); e.preventDefault(); }
    };
    addEventListener('keydown', this._selKey);
    this._selWheelH = (e) => { if (this._selOpen) { this._selStep(Math.sign(e.deltaY) || 1); e.preventDefault(); } };
    el.addEventListener('wheel', this._selWheelH, { passive: false });
    addEventListener('resize', () => { if (this._selOpen) this._selResize(); });
  },

  _selBar() {
    const pad = this.game && this.game.pad;
    const on = padActive(pad);
    const g = (a) => glyph(a, pad);
    this._sel.bar.innerHTML = on
      ? `<span><b>${g('guard')}</b>/<b>${g('dash')}</b>CYCLE</span><span class="go"><b>${g('confirm')}</b>SELECT</span><span><b>${g('back')}</b>BACK</span>`
      : `<span><b>‹</b><b>›</b> / <b>A</b><b>D</b> CYCLE</span><span class="go"><b>ENTER</b>SELECT</span><span><b>ESC</b>BACK</span>`;
    // filters escape hatch back to the classic registry roster
    const f = document.createElement('span'); f.className = 'selfilt'; f.textContent = '⚙ FILTERS & REGISTRY';
    f.onclick = () => this._selBack();
    this._sel.bar.appendChild(f);
  },

  _selStep(d) { this._selSelect((this._sel.idx + d + ROSTER.length) % ROSTER.length); },

  _selSelect(i, immediate) {
    const S = this._sel; S.idx = i;
    const def = ROSTER[i];
    this.selectedHero = def.id;
    S.cards.forEach((c, k) => c.classList.toggle('on', k === i));
    // centre the strip on the selection
    const card = S.cards[i];
    const x = (S.strip.parentElement.clientWidth / 2) - (card.offsetLeft + card.offsetWidth / 2);
    S.strip.style.transition = immediate ? 'none' : '';
    S.strip.style.transform = `translateX(${x}px)`;
    if (immediate) requestAnimationFrame(() => { S.strip.style.transition = ''; });
    this._selInfo(def);
    this._selShow3D(def);
  },

  _selInfo(def) {
    const acc = (def.colors && def.colors.accent) || '#ffd24a';
    const tc = THREAT_COLORS[def.threat] || 'var(--text-4)';
    const rk = rankOf(def), rb = rankBandOf(rk);
    const idn = identityOf(def);
    const facts = kitFacts(def).slice(0, 3);
    const info = this._sel.info;
    info.style.setProperty('--pc', acc);
    info.innerHTML =
      `<div class="selfile">FILE ${String(this._sel.idx + 1).padStart(3, '0')} · ${(idn.co || '—').toUpperCase()} <span class="selflag">${idn.f || ''}</span></div>`
      + `<div class="selname" style="color:${acc}">${def.name}</div>`
      + `<div class="selttl">${def.title || ''} · ${def.role || ''}</div>`
      + `<div class="selbadges">`
        + (def.threat ? `<span class="selbadge" style="color:${tc};border-color:${tc}66;background:${tc}18">${icon('threat', 12)} ${def.threat}</span>` : '')
        + `<span class="selbadge" style="color:${acc};border-color:${acc}66;background:${acc}14">${icon('might', 12)} ${rb.name} · RK ${rk}</span>`
      + `</div>`
      + `<div class="selchips">`
        + facts.map(([ic, t, lead]) => `<div class="selchip${lead ? ' lead' : ''}">${icon(ic, 15)}<span>${t}</span></div>`).join('')
      + `</div>`;
    // the aura in the hero's own accent (literal, not a token)
    this._sel.aura.style.background = `radial-gradient(circle, ${acc}66 0%, ${acc}2e 34%, transparent 66%)`;
  },

  // ---- the live 3D of the selected hero ----
  _selInit3D() {
    const cv = this._sel.cv;
    const renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
    cam.position.set(0, 6.0, 23.5); cam.lookAt(0, 4.9, 0);
    scene.add(new THREE.HemisphereLight('#cddcff', '#241c12', 1.0));
    const key = new THREE.DirectionalLight('#fff2dc', 1.7); key.position.set(7, 13, 9); scene.add(key);
    const fill = new THREE.DirectionalLight('#8fb0ff', 0.35); fill.position.set(-7, 5, 7); scene.add(fill);
    const rim = new THREE.DirectionalLight('#ffffff', 1.6); rim.position.set(-6, 8, -11); scene.add(rim);
    // the figure's FRONT faces the lens at yaw 0 (eyes toward +Z camera); a touch off-axis = 3/4 pose.
    this._sel.three = { renderer, scene, cam, rim, fig: null, t: 0, base: -0.42 };
  },

  _selShow3D(def) {
    if (!this._sel.three) this._selInit3D();
    const T = this._sel.three;
    if (T.fig) { T.scene.remove(T.fig.g); this._selDispose(T.fig.g); T.fig = null; }
    const P = figure(def);
    P.groundRig.visible = false;         // no shadow/rings/wedge — this is a portrait, not the field
    if (P.aura) { P.aura.material.opacity = 0.14; P.aura.scale.set(1.9, 1.6, 1.9); }
    // a relaxed standing stance: splay the arms a touch off the torso
    P.armL.rotation.z = 0.15; P.armR.rotation.z = -0.15;
    P.armL.rotation.x = 0.06; P.armR.rotation.x = 0.06;
    const acc = (def.colors && def.colors.accent) || '#ffffff';
    T.rim.color.set(acc);                // rim the silhouette in the hero's own colour
    T.fig = P; T.base = -0.42;
    T.scene.add(P.g);
  },

  _selDispose(obj) {
    obj.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m && m.dispose());
    });
  },

  _selResize() {
    if (!this._sel || !this._sel.three) return;
    const cv = this._sel.cv, w = cv.clientWidth || 600, h = cv.clientHeight || 540;
    this._sel.three.renderer.setSize(w, h, false);
    this._sel.three.cam.aspect = w / h; this._sel.three.cam.updateProjectionMatrix();
    // re-centre the strip (widths may have changed)
    if (this._selOpen) { const S = this._sel, card = S.cards[S.idx]; if (card) S.strip.style.transform = `translateX(${(S.strip.parentElement.clientWidth / 2) - (card.offsetLeft + card.offsetWidth / 2)}px)`; }
  },

  _selLoop() {
    if (!this._selOpen) return;
    this._selPad();
    const T = this._sel.three;
    if (T) {
      T.t += 0.016;
      if (T.fig) { T.fig.g.rotation.y = T.base + Math.sin(T.t * 0.7) * 0.24; T.fig.g.position.y = Math.sin(T.t * 1.5) * 0.14; }
      T.renderer.render(T.scene, T.cam);
    }
    requestAnimationFrame(() => this._selLoop());
  },

  // pad polling with our own rising-edge detection (game.update already refreshes pad state)
  _selPad() {
    const pad = this.game && this.game.pad;
    if (!pad) return;
    const P = this._sel.padPrev;
    const edge = (a) => { const d = pad.down(a); const was = P[a]; P[a] = d; return d && !was; };
    if (edge('dash')) this._selStep(1);        // R1 / RB
    if (edge('guard')) this._selStep(-1);       // L1 / LB
    if (edge('e')) this._selStep(1);            // D-pad right
    if (edge('f')) this._selStep(-1);           // D-pad left
    if (edge('fly')) this._selConfirm();        // Cross / A
    if (edge('grab')) this._selBack();          // Circle / B
  },

  _selConfirm() {
    const def = ROSTER[this._sel.idx];
    this.hideSelect();
    if (this._selStart) this._selStart({ mode: this._selMode, p1: def.id, format: '1v1' });
  },

  _selBack() {
    this.hideSelect();
    if (this.onSelectBack) this.onSelectBack(); else if (this.showTitle) this.showTitle();
  },
};
