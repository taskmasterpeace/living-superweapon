import {damageBadges,damageSymbol} from './damage-symbols.js';
import {characterIdentityView} from './character-identity-view.js';
import {createFieldFootage} from './field-footage-view.js';
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
import {METERS_PER_UNIT} from '../core/world-units.js';
import { figure } from './figure.js';
import { ROSTER } from '../data/characters.js';
import { heroStats, kitFacts, THREAT_COLORS } from './hud.js';
import { rankOf, rankBandOf } from '../data/scale.js';
import { identityOf } from '../data/identities.js';
import { icon } from './icons.js';
import { glyph, padActive } from '../core/glyphs.js';
import { profileOf, visOf } from '../data/visual.js';
import { describeAbility, slotFacts, esc } from './hudUtil.js';
import {attackGuide,resistanceGuide} from './combat-guide.js';

// 1u ≈ 0.19m (TRUE 1:1 SCALE, CLAUDE.md); the hero is 9.6u = 1.8m. Everything the studio draws is in
// world units, so the figure and a power's footprint stand at their real relative sizes by construction.
const U_TO_M = METERS_PER_UNIT;
const SLOT_ORDER = ['lmb', 'rmb', 'q', 'e', 'f', 'shift', 'r'];   // the fire order on the HUD row
// Reach in world units, from whatever field the ability actually uses (mirrors hudUtil.reachOf, which
// isn't exported — one small copy, kept in step with it).
function powReach(a) {
  if (!a) return 0;
  if (a.reach) return a.reach;
  if (a.range) return a.range;
  if (a.maxLen) return a.maxLen;
  if (a.speed) return a.speed * (a.life != null ? a.life : 1.2);
  if (a.radius) return a.radius;
  return 0;
}

const SEL_CSS = `
#hSelect{position:fixed;inset:0;z-index:71;display:none;flex-direction:column;
  font-family:var(--f-display,"Rajdhani",system-ui,sans-serif);color:var(--text,#e8e2d6);
  background:radial-gradient(120% 90% at 50% 8%,#17170f 0%,#090a0d 48%,#050609 78%);}
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
#hSelect .selchannel{position:absolute;inset:4% 0 8%;pointer-events:none;overflow:hidden;opacity:.42;mask-image:radial-gradient(ellipse,#000 25%,transparent 72%)}
#hSelect .selchannel .field-footage{width:100%;height:100%;border:0;background:none;padding:0}
#hSelect .selchannel .field-footage>*{display:none}
#hSelect .selchannel .field-footage .ff-screen{display:block;width:100%;height:100%;border:0;border-radius:0;background:none}
#hSelect .selchannel canvas{width:100%;height:100%;object-fit:cover}
#hSelect .selchannel .ff-empty,#hSelect .selchannel .ff-expand,#hSelect .selchannel .ff-bug{display:none}
#hSelect.powon .selchannel{display:none}
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
#hSelect .selcombat{display:flex;flex-wrap:wrap;gap:5px;font-size:12px;line-height:1.4}
#hSelect .selcombat span{padding:3px 5px;background:var(--surface-1,#171b20);border-left:2px solid var(--pc)}
#hSelect .selcombat .weak{border-color:#ff9a73}
#hSelect .selcombat strong{flex-basis:100%;letter-spacing:.06em;color:var(--text-3,#b4afa3)}
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
  background:linear-gradient(180deg,transparent,rgba(0,0,0,.88));text-shadow:0 1px 2px #000;line-height:1;z-index:3}
#hSelect .scard .ssil{position:absolute;left:50%;top:46%;transform:translate(-50%,-50%);font-size:44px;font-weight:900;
  color:rgba(255,255,255,.22);text-shadow:0 2px 6px rgba(0,0,0,.4);transition:opacity .18s}
#hSelect .scard .sidentity{display:block;font-size:8px;line-height:1.25;margin-top:3px;font-weight:600;color:#e1e5e8;text-transform:none;letter-spacing:0}
#hSelect .selidentity{font-size:14px;color:#bfeaff;font-weight:700;letter-spacing:.035em}
#hSelect .scard .sportrait{position:absolute;inset:5px 4px 15px;width:calc(100% - 8px);height:calc(100% - 20px);
  object-fit:contain;object-position:center bottom;opacity:0;z-index:1;filter:drop-shadow(0 5px 5px rgba(0,0,0,.7));transition:opacity .18s}
#hSelect .scard.portrait-ready .sportrait{opacity:1}
#hSelect .scard.portrait-ready .ssil{opacity:0}
#hSelect .scard .sfno{position:absolute;top:4px;left:5px;font-family:var(--f-mono,monospace);font-size:8px;letter-spacing:.05em;color:rgba(255,255,255,.7);z-index:3}
#hSelect .scard .sdot{position:absolute;top:5px;right:5px;width:8px;height:8px;border-radius:50%;box-shadow:0 0 6px currentColor;z-index:3}
#hSelect .scard.on{filter:none;opacity:1;transform:scale(1.28) translateY(-8px);z-index:5;
  border-color:var(--c-accent);box-shadow:0 0 0 2px var(--c-accent),0 10px 26px rgba(0,0,0,.6),0 0 34px var(--c-glow)}
#hSelect .selbar{display:flex;align-items:center;justify-content:center;gap:26px;padding:12px 40px 16px;
  font-family:var(--f-mono,monospace);font-size:12px;letter-spacing:.12em;color:var(--text-3,#b7b0a2);
  border-top:1px solid var(--line,rgba(255,255,255,.08))}
#hSelect .selbar b{display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:22px;padding:0 7px;margin-right:7px;
  border:1px solid var(--line-gold,rgba(245,178,26,.35));border-radius:5px;color:var(--gold,#ffd24a);font-weight:700}
#hSelect .selbar .go{color:var(--good,#8fe08a)}
#hSelect .selbar .go b{border-color:rgba(143,224,138,.4);color:var(--good,#8fe08a)}
/* ---- STRIP FEEL: depth falloff, a landing pop, and a sheen on the selected card ---------------- */
#hSelect .scard{box-shadow:0 4px 12px rgba(0,0,0,.4)}
#hSelect .scard.near{filter:grayscale(.24) brightness(.82);opacity:.9;transform:scale(1.07) translateY(-3px)}
#hSelect .scard.near2{filter:grayscale(.4) brightness(.72);opacity:.8;transform:scale(1.0) translateY(-1px)}
#hSelect .scard.on::after{content:"";position:absolute;inset:0;pointer-events:none;border-radius:10px;
  background:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.32) 48%,transparent 66%);
  transform:translateX(-120%);animation:selsheen 2.6s ease-in-out .25s infinite}
@keyframes selsheen{0%,58%{transform:translateX(-120%)}80%,100%{transform:translateX(120%)}}
#hSelect .scard.pop{animation:selpop .34s cubic-bezier(.2,1.5,.35,1)}
@keyframes selpop{0%{transform:scale(1.06) translateY(-3px)}45%{transform:scale(1.42) translateY(-13px)}100%{transform:scale(1.28) translateY(-8px)}}
#hSelect .scard .sedge{position:absolute;left:0;right:0;top:0;height:3px;background:var(--c-accent);opacity:0;transition:opacity .28s}
#hSelect .scard.on .sedge{opacity:1;box-shadow:0 0 10px var(--c-glow)}

/* ---- POWERS · 1:1 — the studio that renders each ability at true world scale ------------------- */
#hSelect .selpowbtn{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:8px;cursor:pointer;
  font-family:var(--f-mono,monospace);font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;
  color:var(--pc,#ffd24a);background:var(--surface,rgba(8,10,16,.55));border:1px solid var(--pc,#ffd24a);
  border-radius:8px;padding:9px 12px;transition:background .2s,color .2s}
#hSelect .selpowbtn:hover{background:var(--pc,#ffd24a);color:#0a0a0f}
#hSelect .selpowhd{display:flex;align-items:center;gap:10px;margin-bottom:2px}
#hSelect .selpowhd .h{font-size:20px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--pc,#ffd24a)}
#hSelect .selpowhd .x{margin-left:auto;cursor:pointer;font-family:var(--f-mono,monospace);font-size:11px;letter-spacing:.14em;
  color:var(--text-4,#8b8577);border:1px solid var(--line,rgba(255,255,255,.12));border-radius:20px;padding:4px 11px}
#hSelect .selpowhd .x:hover{color:var(--gold,#ffd24a);border-color:var(--line-gold,rgba(245,178,26,.35))}
#hSelect .selpowlist{display:flex;flex-direction:column;gap:6px;overflow-y:auto;max-height:38vh;padding-right:4px}
#hSelect .selprow{display:flex;align-items:center;gap:11px;cursor:pointer;border-radius:8px;padding:8px 11px;
  background:var(--surface,rgba(8,10,16,.5));border:1px solid var(--line,rgba(255,255,255,.08));
  border-left:3px solid var(--rc,#666);transition:background .18s,border-color .18s}
#hSelect .selprow:hover{background:rgba(255,255,255,.05)}
#hSelect .selprow.on{background:var(--rc,#666)18;border-color:var(--rc,#888);box-shadow:inset 0 0 0 1px var(--rc,#888)55}
#hSelect .selprow .g{font-size:15px;width:18px;text-align:center;color:var(--rc,#ffd24a)}
#hSelect .selprow .nm{font-weight:700;font-size:14px;letter-spacing:.01em;color:var(--text,#e8e2d6)}
#hSelect .selprow .sub{margin-left:auto;font-family:var(--f-mono,monospace);font-size:10px;letter-spacing:.1em;color:var(--text-4,#8b8577);text-align:right}
#hSelect .selprow .sub b{color:var(--rc,#ffd24a);font-weight:700}
/* the readout + capture, pinned to the stage so the render behind it stays clean for a screenshot */
#hSelect .selscale{position:absolute;left:50%;bottom:6%;transform:translateX(-50%);display:flex;align-items:center;gap:14px;
  font-family:var(--f-mono,monospace);font-size:12px;letter-spacing:.1em;color:var(--text-2,#c9c2b4);
  background:rgba(6,7,11,.66);border:1px solid var(--line,rgba(255,255,255,.1));border-radius:20px;padding:7px 16px;z-index:3;white-space:nowrap}
#hSelect .selscale b{color:var(--gold,#ffd24a);font-weight:700}
#hSelect .selcap{cursor:pointer;color:var(--gold,#ffd24a);border-left:1px solid var(--line,rgba(255,255,255,.12));padding-left:12px}
#hSelect .selcap:hover{color:#fff}
#hSelect .selprof{position:absolute;left:16px;bottom:14px;z-index:3;display:flex;flex-direction:column;gap:6px;max-width:340px;pointer-events:none}
#hSelect .selprof .pdesc{font-size:13px;font-weight:600;color:var(--text-2,#c9c2b4);line-height:1.25;
  text-shadow:0 1px 3px #000;background:rgba(6,7,11,.5);border-radius:7px;padding:5px 9px}
#hSelect .selprof .ptraits{display:flex;flex-wrap:wrap;gap:5px}
#hSelect .selprof .pt{font-family:var(--f-mono,monospace);font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;
  color:var(--text-3,#b7b0a2);background:rgba(6,7,11,.62);border:1px solid var(--line,rgba(255,255,255,.1));border-radius:5px;padding:3px 7px}
#hSelect .selprof .pt b{color:var(--rc,#ffd24a);font-weight:700}
#hSelect.powon .selstrip,#hSelect.powon .selbar{opacity:.32;filter:saturate(.5);pointer-events:none;transition:opacity .25s}
#hSelect .selgrid{position:absolute;left:16px;top:14px;z-index:3;font-family:var(--f-mono,monospace);font-size:10px;
  letter-spacing:.12em;color:var(--text-5,#8b8577);background:rgba(6,7,11,.5);border-radius:6px;padding:4px 9px;pointer-events:none}
@media(max-width:600px){
 #hSelect .seltop{padding:16px 16px 8px;flex-wrap:wrap;gap:8px;flex-shrink:0;}
 #hSelect .seltitle{font-size:21px;letter-spacing:.06em;}
 #hSelect .selkick{display:none;}
 #hSelect .selmode{font-size:9px;padding:4px 8px;}
 #hSelect .selstage{flex-direction:column;align-items:stretch;overflow-y:auto;gap:8px;padding:0 16px 12px;}
 #hSelect .selcvwrap{flex:none;height:210px;width:100%;}
 #hSelect .selinfo{flex:none;max-width:none;gap:8px;padding:0;}
 #hSelect .selname{font-size:34px;}
 #hSelect .selttl{font-size:12px;}
 #hSelect .selbadges{gap:4px;}
 #hSelect .selbadge{font-size:10px;padding:4px 6px;}
 #hSelect .selchips{gap:4px;margin:0;}
 #hSelect .selchip{font-size:12px;padding:6px;}
 #hSelect .selstrip{height:114px;min-height:114px;flex-shrink:0;}
 #hSelect .scard{width:64px;height:88px;}
 #hSelect .selbar{gap:9px;padding:10px 8px;flex-wrap:wrap;flex-shrink:0;font-size:10px;}
}
@media (orientation:landscape) and (max-height:600px){
 body.is-touch #hSelect .seltop{flex:none;height:38px;box-sizing:border-box;padding:8px 18px;align-items:center}
 body.is-touch #hSelect .seltitle{font-size:20px;letter-spacing:.08em;white-space:nowrap}
 body.is-touch #hSelect .selkick{display:none}
 body.is-touch #hSelect .selstage{flex:1;min-height:0;padding:0 18px;gap:18px;overflow:hidden}
 body.is-touch #hSelect .selcvwrap{height:100%;flex:1}
 body.is-touch #hSelect .selinfo{align-self:stretch;flex:1;overflow-y:auto;min-height:0;gap:6px;padding:6px 4px}
 body.is-touch #hSelect .selname{font-size:30px}
 body.is-touch #hSelect .selfile{font-size:9px}
 body.is-touch #hSelect .selttl{font-size:11px}
 body.is-touch #hSelect .selbadge{font-size:9px;padding:3px 6px}
 body.is-touch #hSelect .selchip{padding:5px 8px;font-size:11px}
 body.is-touch #hSelect .selstrip{flex:none;height:90px;min-height:90px;margin:0}
 body.is-touch #hSelect .selstripInner{top:12px}
 body.is-touch #hSelect .scard{width:56px;height:68px}
 body.is-touch #hSelect .scard.on{transform:scale(1.08) translateY(-3px)}
 body.is-touch #hSelect .selbar{flex:none;gap:12px;padding:4px 12px;font-size:10px;letter-spacing:.04em}
}
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
    this._sel.channel.open();
    this._selResize();
    this._selLoop();
  },

  hideSelect() {
    if (!this._sel) return;
    if (this._powOpen) this._selPowersClose();   // never leave the studio open under the closed screen
    this._selOpen = false;
    this._sel.channel.close();
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
          <div class="selchannel" aria-hidden="true" inert></div>
          <div class="selaura" id="selAura"></div>
          <div class="selfloor"></div>
          <canvas id="selCv"></canvas>
        </div>
        <div class="selinfo" id="selInfo"></div>
      </div>
      <div class="selstrip"><div class="selstripInner" id="selStrip"></div></div>
      <div class="selbar" id="selBar"></div>`;
    document.body.appendChild(el);
    const channel=createFieldFootage(this.game);
    el.querySelector('.selchannel').appendChild(channel.el);
    const strip = el.querySelector('#selStrip');
    const cards = ROSTER.map((d, i) => {
      const identity=characterIdentityView(d);
      const c = d.colors || {};
      const tc = THREAT_COLORS[d.threat] || 'var(--text-4)';
      const card = document.createElement('div');
      card.className = 'scard';
      card.style.setProperty('--c1', c.primary || '#333');
      card.style.setProperty('--c2', c.secondary || '#111');
      card.style.setProperty('--c-accent', c.accent || '#ffd24a');
      card.style.setProperty('--c-glow', (c.accent || '#ffd24a') + '88');
      card.innerHTML = `<span class="sedge"></span>`
        + `<img class="sportrait" alt="${d.name} portrait" decoding="async">`
        + `<span class="sfno">${String(i + 1).padStart(2, '0')}</span>`
        + `<span class="sdot" style="color:${tc};background:${tc}"></span>`
        + `<span class="ssil">${(d.name || '?')[0]}</span>`
        + `<span class="snm">${d.name}<span class="sidentity">${esc(identity.classLabel)} · ${esc(identity.shortMovement)}</span></span>`;
      card.title=d.name+' · '+identity.classLabel+' · '+identity.movement;
      card.onclick = () => { if (this._sel.idx === i) this._selConfirm(); else this._selSelect(i); };
      strip.appendChild(card);
      return card;
    });
    this._sel = {
      channel,
      el, strip, cards, info: el.querySelector('#selInfo'), aura: el.querySelector('#selAura'),
      mode: el.querySelector('#selMode'), bar: el.querySelector('#selBar'),
      cv: el.querySelector('#selCv'), idx: 0, three: null, padPrev: {},
    };
    // keyboard nav — its own listener, only live while the screen is open
    this._selKey = (e) => {
      if (!this._selOpen) return;
      // POWERS STUDIO owns the keys while open: ↑/↓ walk the abilities, P/Enter capture, Esc exits to roster
      if (this._powOpen) {
        if (e.code === 'ArrowDown' || e.code === 'KeyS' || e.code === 'ArrowRight' || e.code === 'KeyD') { this._selPowStep(1); e.preventDefault(); }
        else if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'ArrowLeft' || e.code === 'KeyA') { this._selPowStep(-1); e.preventDefault(); }
        else if (e.code === 'KeyP' || e.code === 'Enter' || e.code === 'NumpadEnter') { this._selCapture(); e.preventDefault(); }
        else if (e.code === 'Escape' || e.code === 'Backspace') { this._selPowersClose(); e.preventDefault(); }
        return;
      }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') { this._selStep(1); e.preventDefault(); }
      else if (e.code === 'ArrowLeft' || e.code === 'KeyA') { this._selStep(-1); e.preventDefault(); }
      else if (e.code === 'ArrowDown' || e.code === 'KeyS') { this._selStep(6); e.preventDefault(); }
      else if (e.code === 'ArrowUp' || e.code === 'KeyW') { this._selStep(-6); e.preventDefault(); }
      else if (e.code === 'KeyP') { this._selPowersOpen(); e.preventDefault(); }
      else if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') { this._selConfirm(); e.preventDefault(); }
      else if (e.code === 'Escape' || e.code === 'Backspace') { this._selBack(); e.preventDefault(); }
    };
    addEventListener('keydown', this._selKey);
    this._selWheelH = (e) => { if (!this._selOpen) return; const d = Math.sign(e.deltaY) || 1; if (this._powOpen) this._selPowStep(d); else this._selStep(d); e.preventDefault(); };
    el.addEventListener('wheel', this._selWheelH, { passive: false });
    addEventListener('resize', () => { if (this._selOpen) this._selResize(); });
  },

  _selBar() {
    if(this.game?.touch){
      this._sel.bar.innerHTML='';
      for(const [label,action] of [['Previous character',()=>this._selStep(-1)],['Select character',()=>this._selConfirm()],['Next character',()=>this._selStep(1)]]){
        const button=document.createElement('button');button.type='button';button.textContent=label;
        button.style.cssText='min-height:44px;padding:8px 14px;border:1px solid #bd9637;border-radius:6px;background:#151510;color:#ffd24a;font:inherit;cursor:pointer';
        if(label==='Select character'){button.style.background='#ffd24a';button.style.color='#151510';}
        button.onclick=action;this._sel.bar.append(button);
      }
      return;
    }
    const pad = this.game && this.game.pad;
    const on = padActive(pad);
    const g = (a) => glyph(a, pad);
    this._sel.bar.innerHTML = on
      ? `<span><b>${g('guard')}</b>/<b>${g('dash')}</b>CYCLE</span><span class="go"><b>${g('confirm')}</b>SELECT</span><span><b>${g('back')}</b>BACK</span>`
      : `<span><b>‹</b><b>›</b> / <b>A</b><b>D</b> CYCLE</span><span class="go"><b>ENTER</b>SELECT</span><span><b>P</b>POWERS · 1:1</span><span><b>ESC</b>BACK</span>`;
  },

  _selStep(d) { this._selSelect((this._sel.idx + d + ROSTER.length) % ROSTER.length); },

  _selCardPortrait(i) {
    const S=this._sel,card=S?.cards?.[i],image=card?.querySelector('.sportrait');
    if(!card||!image||card.dataset.portraitRequested)return;
    card.dataset.portraitRequested='true';
    image.onload=()=>card.classList.add('portrait-ready');
    image.onerror=()=>{delete card.dataset.portraitRequested;card.classList.remove('portrait-ready');};
    import('./player-status-portrait.js').then(module=>module.portraitOf(ROSTER[i])).then(url=>{image.src=url;})
      .catch(error=>{image.onerror();console.warn('Character-select portrait unavailable',ROSTER[i]?.id,error);});
  },

  _selWarmPortraits(origin) {
    const S=this._sel;if(!S)return;
    const token=S.portraitWarmToken=(S.portraitWarmToken||0)+1;
    const order=ROSTER.map((_,i)=>i).sort((a,b)=>{
      const distance=i=>Math.min(Math.abs(i-origin),ROSTER.length-Math.abs(i-origin));
      return distance(a)-distance(b);
    });
    let cursor=0;
    const next=()=>{
      if(token!==S.portraitWarmToken)return;
      this._selCardPortrait(order[cursor++]);
      if(cursor<order.length)setTimeout(next,24);
    };
    setTimeout(next,0);
  },

  _selSelect(i, immediate) {
    const S = this._sel; S.idx = i;
    const def = ROSTER[i];
    S.channel.setHero(def.id);
    this.selectedHero = def.id;
    // depth falloff: the selection blooms, its two neighbours each side read as "nearer", the rest recede
    S.cards.forEach((c, k) => {
      const d = Math.min(Math.abs(k - i), ROSTER.length - Math.abs(k - i));
      c.classList.toggle('on', d === 0);
      c.classList.toggle('near', d === 1);
      c.classList.toggle('near2', d === 2);
    });
    // a tactile landing pop on the card that just became selected (not on the very first frame)
    const card = S.cards[i];
    this._selCardPortrait(i);
    this._selWarmPortraits(i);
    if (!immediate) { card.classList.remove('pop'); void card.offsetWidth; card.classList.add('pop'); }
    // centre the strip on the selection
    const x = (S.strip.parentElement.clientWidth / 2) - (card.offsetLeft + card.offsetWidth / 2);
    S.strip.style.transition = immediate ? 'none' : '';
    S.strip.style.transform = `translateX(${x}px)`;
    if (immediate) requestAnimationFrame(() => { S.strip.style.transition = ''; });
    if (!immediate) { try { this.game && this.game.audio && this.game.audio.zap(600 + (i % 5) * 26); } catch (e) {} }
    if (this._powOpen) this._selPowersClose();   // a new hero drops the powers studio back to the portrait
    this._selInfo(def);
    this._selShow3D(def);
  },

  _selInfo(def) {
    const identity=characterIdentityView(def);
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
      + `<div class="selidentity">${esc(identity.classLabel)} · ${esc(identity.movement)}</div>`
      + `<div class="selbadges">`
        + (def.threat ? `<span class="selbadge" style="color:${tc};border-color:${tc}66;background:${tc}18">${icon('threat', 12)} ${def.threat}</span>` : '')
        + `<span class="selbadge" style="color:${acc};border-color:${acc}66;background:${acc}14">${icon('might', 12)} ${rb.name} · RK ${rk}</span>`
      + `</div>`
      + `<div class="selchips">`
        + facts.map(([ic, t, lead]) => `<div class="selchip${lead ? ' lead' : ''}">${icon(ic, 15)}<span>${t}</span></div>`).join('')
      + `</div>`
      + `<div class="selcombat"><strong>DAMAGE & CONDITIONS</strong><span>${damageBadges([...new Set(Object.values(def.abilities||{}).flatMap(a=>attackGuide(a).types))])} ${esc([...new Set(Object.values(def.abilities||{}).flatMap(a=>attackGuide(a).effects))].join(' · '))}</span></div>`
      + `<div class="selcombat"><strong>STARTING ATTACKS</strong>${['lmb','rmb'].filter(k=>def.abilities?.[k]).map(k=>{const a=def.abilities[k],facts=slotFacts(a,visOf);return `<span>${esc(a.name||k)} · ${esc(facts.kind)}</span>`;}).join('')}</div>`
      + `<div class="selcombat"><strong>RESISTANCES & WEAKNESSES</strong>${resistanceGuide(def).map(r=>`<span class="${r.kind}">${damageSymbol(r.type)} ${esc(r.label)}</span>`).join('')||'<span>Standard damage from all types</span>'}</div>`
      + `<div class="selpowbtn" id="selPowBtn">${icon('might', 14)} POWERS · 1:1 SCALE</div>`;
    const btn = info.querySelector('#selPowBtn');
    if (btn) btn.onclick = () => this._selPowersOpen();
    // the aura in the hero's own accent (literal, not a token)
    this._sel.aura.style.background = `radial-gradient(circle, ${acc}66 0%, ${acc}2e 34%, transparent 66%)`;
  },

  // ---- the live 3D of the selected hero ----
  _selInit3D() {
    const cv = this._sel.cv;
    const renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, preserveDrawingBuffer: true });
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
    // PORTRAIT_CAM is the framing to restore when the powers studio hands the camera back.
    this._sel.three = { renderer, scene, cam, rim, fig: null, foot: null, t: 0, base: -0.42, enterT: 1,
      portraitCam: { pos: cam.position.clone(), look: new THREE.Vector3(0, 4.9, 0) } };
  },

  _selPortraitCam() {
    const T = this._sel.three; if (!T) return;
    T.cam.position.copy(T.portraitCam.pos); T.cam.lookAt(T.portraitCam.look);
  },

  _selShow3D(def) {
    if (!this._sel.three) this._selInit3D();
    const T = this._sel.three;
    if (T.fig) { T.scene.remove(T.fig.g); this._selDispose(T.fig.g); T.fig = null; }
    const P = figure(def);
    P.groundRig.visible = false;         // no shadow/rings/wedge — this is a portrait, not the field
    if (P.aura) { P.aura.material.opacity = 0.14; P.aura.scale.set(1.9, 1.6, 1.9); }
    // A relaxed standing stance. Local -Y is the arm's hanging axis, so the
    // signs must point away from the torso; the old signs folded every hand
    // inward and made the shoulders read as raised wedges.
    P.armL.position.y -= 0.18; P.armR.position.y -= 0.18;
    P.armL.rotation.z = -0.045; P.armR.rotation.z = 0.045;
    P.armL.rotation.x = 0.06; P.armR.rotation.x = 0.06;
    const acc = (def.colors && def.colors.accent) || '#ffffff';
    T.rim.color.set(acc);                // rim the silhouette in the hero's own colour
    T.fig = P; T.base = -0.42;
    T.enterT = 0;                        // drives the entrance (scale-up + lift + aura flash)
    T.scene.add(P.g);
  },

  _selDispose(obj) {
    const resources=new Set();
    obj.traverse(o => {
      if (o.geometry) for(const geometry of o.geometry.palmVariants||[o.geometry])resources.add(geometry);
      if (o.skeleton) resources.add(o.skeleton);
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m && resources.add(m));
    });
    for(const resource of resources)resource.dispose();
  },

  _selResize() {
    if (!this._sel || !this._sel.three) return;
    const cv = this._sel.cv, w = cv.clientWidth || 600, h = cv.clientHeight || 540;
    this._sel.three.renderer.setSize(w, h, false);
    this._sel.three.cam.aspect = w / h; this._sel.three.cam.updateProjectionMatrix();
    // the studio reframes to the current footprint (aspect changed); the portrait leaves its fixed cam
    if (this._powOpen && this._pow && this._pow._extent) this._selFrame(this._pow._extent);
    // re-centre the strip (widths may have changed)
    if (this._selOpen) { const S = this._sel, card = S.cards[S.idx]; if (card) S.strip.style.transform = `translateX(${(S.strip.parentElement.clientWidth / 2) - (card.offsetLeft + card.offsetWidth / 2)}px)`; }
  },

  _selLoop() {
    if (!this._selOpen) return;
    this._selPad();
    const T = this._sel.three;
    if (T) {
      T.t += 0.016;
      T.enterT = Math.min(1, (T.enterT || 0) + 0.06);
      const e = 1 - Math.pow(1 - T.enterT, 3);   // ease-out on the entrance
      if (this._powOpen) {
        // STUDIO: figure planted in profile facing the aim (+X); the footprint animates, the camera holds
        if (T.fig) { T.fig.g.rotation.y = Math.PI / 2; T.fig.g.position.y = 0; T.fig.g.scale.setScalar(1); }
        if (T.foot && T.foot.userData.pulse) T.foot.userData.pulse(T.t);
      } else if (T.fig) {
        // PORTRAIT: entrance (scale/lift/aura flash) then a slow breathing turn + bob
        T.fig.g.rotation.y = T.base + Math.sin(T.t * 0.7) * 0.24;
        T.fig.g.position.y = (1 - e) * -1.6 + Math.sin(T.t * 1.5) * 0.14;
        T.fig.g.scale.setScalar(0.9 + 0.1 * e);
        if (this._sel.aura) this._sel.aura.style.opacity = String(0.55 + 0.35 * e);
      }
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
    if (this._powOpen) {                          // POWERS STUDIO owns the pad while open
      if (edge('dash') || edge('e')) this._selPowStep(1);
      if (edge('guard') || edge('f')) this._selPowStep(-1);
      if (edge('fly')) this._selCapture();        // Cross / A = grab the frame
      if (edge('grab')) this._selPowersClose();   // Circle / B = back to roster
      return;
    }
    if (edge('dash')) this._selStep(1);        // R1 / RB
    if (edge('guard')) this._selStep(-1);       // L1 / LB
    if (edge('e')) this._selStep(1);            // D-pad right
    if (edge('f')) this._selStep(-1);           // D-pad left
    if (edge('fly')) this._selConfirm();        // Cross / A
    if (edge('grab')) this._selBack();          // Circle / B
  },

  // ============================================================================================
  // POWERS · 1:1 — render each of the selected hero's abilities at TRUE world scale beside the
  // 1.8m figure, so the reach/orb/cone footprint reads at its real proportions. A metric readout
  // gives the absolute size and CAPTURE PNG grabs a clean frame for authoring the power's art.
  // Everything derives from live ability data + the 7-trait visual profile, so it can't drift.
  // ============================================================================================
  _selPowKeys(def) {
    const ab = def.abilities || {};
    const keys = SLOT_ORDER.filter(k => ab[k]);
    for (const k of Object.keys(ab)) if (!keys.includes(k) && ab[k]) keys.push(k);   // any extra slots after the known 7
    return keys;
  },

  _selPowersOpen() {
    if (!this._sel || this._powOpen) return;
    const def = ROSTER[this._sel.idx];
    const keys = this._selPowKeys(def);
    if (!keys.length) return;
    this._powOpen = true; this._powKeys = keys; this._powIdx = 0;
    this._sel.el.classList.add('powon');
    // the studio gets a solid dark backing so ADDITIVE energy reads (the portrait is transparent, which
    // is why a beam vanished — additive over transparent/white only brightens toward white). Also the
    // clean backdrop is what a captured reference frame wants.
    if (this._sel.three) this._sel.three.scene.background = new THREE.Color(0x090a10);
    const acc = (def.colors && def.colors.accent) || '#ffd24a';
    // right panel → the abilities browser
    const info = this._sel.info;
    info.innerHTML =
      `<div class="selpowhd"><div class="h">${def.name} · POWERS</div><div class="x" id="selPowX">✕ ROSTER</div></div>`
      + `<div class="selpowlist" id="selPowList">`
      + keys.map((k, i) => {
          const a = def.abilities[k]; const f = slotFacts(a, visOf);
          const rc = a.color || acc;
          return `<div class="selprow" data-i="${i}" style="--rc:${rc}">`
            + `<span class="g">${f.glyph}</span>`
            + `<span class="nm">${a.name || k}</span>`
            + `<span class="sub"><b>${f.range}</b> · ${f.units}u · ${f.kind}</span></div>`;
        }).join('')
      + `</div>`;
    info.querySelector('#selPowX').onclick = () => this._selPowersClose();
    info.querySelectorAll('.selprow').forEach(r => { r.onclick = () => this._selPowPick(+r.dataset.i); });
    // stage overlays (created once per studio session, cleaned on close)
    const wrap = this._sel.el.querySelector('.selcvwrap');
    const mk = (cls) => { const d = document.createElement('div'); d.className = cls; wrap.appendChild(d); return d; };
    this._pow = {
      grid: mk('selgrid'), scale: mk('selscale'), prof: mk('selprof'),
    };
    this._pow.grid.textContent = '1u ≈ 0.19m · GRID 10u';
    this._selPowPick(0);
  },

  _selPowersClose() {
    if (!this._powOpen) return;
    this._powOpen = false;
    this._sel.el.classList.remove('powon');
    // tear down the footprint + studio grid + overlays
    const T = this._sel.three;
    if (T) {
      if (T.foot) { T.scene.remove(T.foot); this._selDispose(T.foot); T.foot = null; }
      if (T.grid) { T.scene.remove(T.grid); T.grid.geometry && T.grid.geometry.dispose(); T.grid.material && T.grid.material.dispose(); T.grid = null; }
      T.scene.background = null;   // hand the transparent portrait backdrop back
      this._selPortraitCam();
    }
    if (this._pow) { for (const k in this._pow) { const el = this._pow[k]; if (el && el.remove) el.remove(); } this._pow = null; }
    this._selInfo(ROSTER[this._sel.idx]);   // rebuild the roster info panel
  },

  _selPowStep(d) {
    if (!this._powOpen) return;
    this._selPowPick((this._powIdx + d + this._powKeys.length) % this._powKeys.length);
  },

  _selPowPick(i) {
    const T = this._sel.three; if (!T) return;
    this._powIdx = i;
    const def = ROSTER[this._sel.idx];
    const key = this._powKeys[i];
    const a = def.abilities[key];
    const acc = (def.colors && def.colors.accent) || '#ffd24a';
    // list highlight
    this._sel.info.querySelectorAll('.selprow').forEach((r, k) => r.classList.toggle('on', k === i));
    try { this.game && this.game.audio && this.game.audio.zap(520 + i * 30); } catch (e) {}
    // rebuild the footprint at 1:1
    if (T.foot) { T.scene.remove(T.foot); this._selDispose(T.foot); T.foot = null; }
    const fp = this._selBuildFootprint(a, acc);
    T.foot = fp.group; T.scene.add(fp.group);
    // a fresh 1:1 ground grid sized to the footprint (every line = 10u ≈ 1.9m)
    if (T.grid) { T.scene.remove(T.grid); T.grid.geometry && T.grid.geometry.dispose(); T.grid.material && T.grid.material.dispose(); }
    const span = Math.max(fp.maxX, -fp.minX, 12);
    const gsize = Math.ceil(span * 2 / 10) * 10;
    const grid = new THREE.GridHelper(gsize, gsize / 10, 0x4a4a55, 0x26262e);
    grid.position.set((fp.minX + fp.maxX) / 2, 0.02, 0);
    grid.material.transparent = true; grid.material.opacity = 0.5;
    T.grid = grid; T.scene.add(grid);
    // frame it, then print the readout + profile
    this._pow._extent = { minX: fp.minX, maxX: fp.maxX, maxY: fp.maxY };
    this._selFrame(this._pow._extent);
    const reach = Math.round(fp.reach);
    const m = (fp.reach * U_TO_M).toFixed(1);
    const f = slotFacts(a, visOf);
    this._pow.scale.innerHTML = `${f.kind} · <b>${reach}u</b> ≈ <b>${m}m</b> · HERO 9.6u = 1.8m`
      + `<span class="selcap" id="selCapBtn">⬇ CAPTURE PNG</span>`;
    this._pow.scale.querySelector('#selCapBtn').onclick = () => this._selCapture();
    const p = profileOf(a) || {};
    const ax = [['SRC', p.source], ['SIL', p.silhouette], ['MOT', p.motion], ['IMP', p.impact], ['RES', p.residue], ['FAM', p.family], ['TELL', p.tell]];
    this._pow.prof.style.setProperty('--rc', a.color || acc);
    this._pow.prof.innerHTML = `<div class="pdesc">${a.name || key} — ${describeAbility(a)}</div>`
      + `<div class="ptraits">` + ax.map(([l, v]) => `<span class="pt"><b>${l}</b> ${v || '—'}</span>`).join('') + `</div>`;
  },

  // Build a group, in WORLD UNITS, that reads as the ability's real spatial footprint. Returns the
  // group plus its extent {minX,maxX,maxY} so the camera can frame it against the figure.
  _selBuildFootprint(a, acc) {
    const g = new THREE.Group();
    const c1 = a.color || acc, c2 = a.color2 || c1;
    const HAND = { x: 1.4, y: 6.0 };
    const reach = powReach(a);
    const glow = (col, op = 0.85) => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false });
    const rod = (from, to, r, col, op) => {
      const dx = to.x - from.x, dy = to.y - from.y, len = Math.hypot(dx, dy) || 0.01;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 14), glow(col, op));
      m.position.set((from.x + to.x) / 2, (from.y + to.y) / 2, 0);
      m.rotation.z = Math.atan2(dy, dx) - Math.PI / 2;   // cylinder's default axis is +Y
      g.add(m); return m;
    };
    const orb = (x, y, r, col, op = 0.8) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 22, 16), glow(col, op)); m.position.set(x, y, 0); g.add(m); return m; };
    let minX = -2.4, maxX = 6, maxY = 10.6, pulse = null;
    const t = a.type;

    if (t === 'beam') {
      const L = a.maxLen || reach || 120, r = Math.max(a.radius || 0.6, 0.5);
      rod(HAND, { x: HAND.x + L, y: HAND.y }, r, c1, 0.55);
      const core = rod(HAND, { x: HAND.x + L, y: HAND.y }, r * 0.42, c2, 0.95);
      orb(HAND.x, HAND.y, r * 1.5, c2, 0.9);        // the muzzle flare
      maxX = HAND.x + L; maxY = HAND.y + r + 1;
      pulse = (tt) => { core.material.opacity = 0.8 + 0.15 * Math.sin(tt * 6); };
    } else if (t === 'cone') {
      const half = (a.arc || 1.1) / 2, L = a.range || reach || 40, N = 22;
      const pos = [HAND.x, HAND.y, 0];
      const verts = [];
      for (let i = 0; i < N; i++) {
        const a0 = -half + (2 * half) * i / N, a1 = -half + (2 * half) * (i + 1) / N;
        verts.push(pos[0], pos[1], pos[2],
          HAND.x + L * Math.cos(a0), HAND.y + L * Math.sin(a0), 0,
          HAND.x + L * Math.cos(a1), HAND.y + L * Math.sin(a1), 0);
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: c1, transparent: true, opacity: 0.4, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
      g.add(mesh);
      maxX = HAND.x + L; maxY = HAND.y + L * Math.sin(half) + 1;
      pulse = (tt) => { mesh.material.opacity = 0.35 + 0.12 * Math.sin(tt * 4); };
    } else if (t === 'nova' || t === 'mine') {
      const R = a.radius || reach || 24, cx = t === 'mine' ? (reach || 20) : 0;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.55, 10, 60), glow(c1, 0.85));
      ring.rotation.x = Math.PI / 2; ring.position.set(cx, 0.3, 0); g.add(ring);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(R, 44), glow(c1, 0.14));
      disc.rotation.x = -Math.PI / 2; disc.position.set(cx, 0.15, 0); g.add(disc);
      orb(cx, 1.2, 1.4, c2, 0.9);
      minX = Math.min(minX, cx - R); maxX = cx + R; maxY = 8;
      pulse = (tt) => { const s = 0.9 + 0.12 * (0.5 + 0.5 * Math.sin(tt * 3)); ring.scale.set(s, s, 1); };
    } else if (t === 'charge' || t === 'growingorb' || t === 'facebomb') {
      const ro = Math.max(a.radius || (t === 'growingorb' ? 5 : t === 'facebomb' ? 2.4 : 3), 1.6);
      const cx = HAND.x + ro + 1, cy = Math.max(HAND.y, ro + 1.5);
      rod(HAND, { x: cx, y: cy }, 0.14, c2, 0.5);
      const o = orb(cx, cy, ro, c1, 0.55); orb(cx, cy, ro * 0.5, c2, 0.9);
      maxX = cx + ro; maxY = cy + ro;
      pulse = (tt) => { const s = 1 + 0.05 * Math.sin(tt * 4); o.scale.setScalar(s); };
    } else if (t === 'melee' || t === 'rush') {
      const R = a.range || a.reach || 12;
      const arc = new THREE.Mesh(new THREE.TorusGeometry(R, 0.5, 8, 40, 1.5), glow(c1, 0.8));
      arc.position.set(HAND.x, HAND.y - 0.5, 0); arc.rotation.z = -0.75; g.add(arc);
      maxX = HAND.x + R; maxY = HAND.y + R * 0.6;
    } else if (t === 'buff' || t === 'phase' || t === 'nova2') {
      const o = orb(0, 5.2, 5.4, c1, 0.22); orb(0, 5.2, 3.2, c2, 0.14);
      rod({ x: 0, y: 0 }, { x: 0, y: 16 }, 1.1, c1, 0.3);   // the rising transformation pillar
      maxX = 6; maxY = 16; minX = -6;
      pulse = (tt) => { o.scale.setScalar(1 + 0.06 * Math.sin(tt * 3)); };
    } else if (t === 'meteor') {
      const R = a.radius || 10, top = 26;
      rod({ x: reach || 20, y: 0 }, { x: reach || 20, y: top }, 1.2, c1, 0.5);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.5, 8, 44), glow(c2, 0.8));
      ring.rotation.x = Math.PI / 2; ring.position.set(reach || 20, 0.3, 0); g.add(ring);
      maxX = (reach || 20) + R; maxY = top; minX = Math.min(minX, (reach || 20) - R);
    } else if (t === 'summon' || t === 'construct') {
      const R = a.range || reach || 20;
      for (let i = 0; i < 3; i++) orb(HAND.x + 3 + i * 2.4, HAND.y + 1 + (i % 2) * 1.4, 0.8, c1, 0.85);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.35, 8, 50), glow(c1, 0.4));
      ring.rotation.x = Math.PI / 2; ring.position.set(0, 0.2, 0); g.add(ring);
      minX = Math.min(minX, -R); maxX = R; maxY = 9;
    } else if (t === 'teleport' || t === 'dash') {
      const R = a.range || reach || 40;
      for (let i = 0; i <= 8; i++) { const x = HAND.x + (R - HAND.x) * i / 8; orb(x, 4.5, 0.35, c2, 0.7); }
      const ghost = new THREE.Mesh(new THREE.BoxGeometry(2.6, 9.6, 1.4), glow(c1, 0.16)); ghost.position.set(R, 4.8, 0); g.add(ghost);
      maxX = R + 1.5; maxY = 10.6;
    } else if (t === 'portal') {
      const R = reach || 50;
      const p1 = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.4, 10, 40), glow('#ff8a3d', 0.85)); p1.position.set(HAND.x + 4, 5, 0); g.add(p1);
      const p2 = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.4, 10, 40), glow('#4aa8ff', 0.85)); p2.position.set(R, 5, 0); g.add(p2);
      maxX = R + 4; maxY = 9;
    } else if (t === 'tentacle' || t === 'grapple' || t === 'mindcontrol' || t === 'lifedrain') {
      const R = reach || 60;
      rod(HAND, { x: R, y: 5 }, 0.4, c1, 0.7);
      orb(R, 5, 1.1, c2, 0.85);
      maxX = R + 1; maxY = 8;
    } else {
      // projectile / volley / rifle / bow / quiver / default: a travel line to reach + an orb at the tip
      const R = reach || 90, ro = Math.max(a.radius || 0.9, 0.7);
      rod(HAND, { x: HAND.x + R, y: HAND.y }, 0.16, c2, 0.6);
      const o = orb(HAND.x + R, HAND.y, ro, c1, 0.85); orb(HAND.x + R, HAND.y, ro * 0.5, c2, 0.95);
      maxX = HAND.x + R + ro; maxY = HAND.y + ro + 1;
      pulse = (tt) => { o.scale.setScalar(1 + 0.08 * Math.sin(tt * 7)); };
    }
    g.userData.pulse = pulse || (() => {});
    return { group: g, minX, maxX, maxY, reach: Math.max(reach, maxX - HAND.x) };
  },

  _selFrame(ext) {
    const T = this._sel.three, cam = T.cam;
    const mnx = Math.min(ext.minX, -2.4), mxx = Math.max(ext.maxX, 6), mxy = Math.max(ext.maxY, 10.6);
    const cx = (mnx + mxx) / 2, cy = mxy * 0.5;
    const Wd = mxx - mnx, Hd = mxy;
    const vfov = cam.fov * Math.PI / 180, aspect = cam.aspect || 1.2;
    const d = Math.max(Wd / (2 * Math.tan(vfov / 2) * aspect), Hd / (2 * Math.tan(vfov / 2))) * 1.18;
    const dir = new THREE.Vector3(0, 0.26, 1).normalize();
    cam.position.set(cx + dir.x * d, cy + dir.y * d, dir.z * d);
    cam.lookAt(cx, cy, 0);
  },

  _selCapture() {
    const T = this._sel.three; if (!T) return;
    T.renderer.render(T.scene, T.cam);   // fresh frame; preserveDrawingBuffer keeps it readable
    try {
      const def = ROSTER[this._sel.idx], key = this._powKeys[this._powIdx];
      const name = `${def.id}-${(def.abilities[key].name || key).replace(/[^a-z0-9]+/gi, '-')}-1x1`.toLowerCase();
      T.renderer.domElement.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = name + '.png';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }, 'image/png');
      this.game && this.game.audio && this.game.audio.zap(880);
    } catch (e) {}
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
