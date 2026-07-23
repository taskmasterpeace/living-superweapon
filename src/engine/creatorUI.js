// THRESHOLD — ORIGIN: the character creator screen. D&D-for-superheroes point-buy over
// the ranks.js sheet model. Ruling compliance (docs/DESIGN_DECISIONS.md): NOT named Foundry;
// LIVE damage numbers beside every power pick; LeFevre threat auto-computed as you build.
// Pure DOM in the house style (warm dark + gold). No purple.
import {
  BUDGETS, ATTR_COST, GIFTS, FLIGHT_TIERS, GUARD_TYPES, EVADE_KINDS, MELEE_TIERS,
  TALENT_COST, GADGETS, POWERS, PALETTES, SKINS, FRAMES, powerById,
  tally, freshPicks, buildDef, validate, threatOf, derived, deriveAI, saveCustom, deleteCustom,
} from '../data/creator.js';
import { ATTR_DEFS, TALENTS, rankName, rankColor } from '../data/ranks.js';
import { heroStats, THREAT_COLORS } from './hud.js';

const CSS = `
#origin{ position:fixed; inset:0; z-index:60; display:none; flex-direction:column; align-items:center; overflow-y:auto;
  background:radial-gradient(120% 90% at 50% 30%, rgba(20,16,10,.97), rgba(4,5,9,.99)); color:#e8e2d6; padding:20px 22px 30px; }
#origin *{ box-sizing:border-box; }
#origin .ohead{ width:100%; max-width:1560px; display:flex; align-items:center; gap:18px; flex-wrap:wrap; margin-bottom:14px; }
#origin .ohead h2{ font-family:'Rajdhani','Inter',sans-serif; font-weight:800; font-size:34px; letter-spacing:.08em; margin:0; color:#ffd24a; text-shadow:0 0 26px rgba(245,178,26,.35); }
#origin .ohead .osub{ font-size:10px; letter-spacing:.26em; text-transform:uppercase; color:#8b8577; }
#origin .budgets{ display:flex; gap:7px; flex-wrap:wrap; }
#origin .bch{ cursor:pointer; font-size:11px; font-weight:800; letter-spacing:.08em; padding:7px 12px; border-radius:9px; border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.04); color:#b7b0a2; }
#origin .bch.on{ background:linear-gradient(180deg,#ffd15a,#f5921a); color:#160d02; border-color:transparent; }
#origin .pts{ margin-left:auto; text-align:right; }
#origin .pts .pv{ font-size:26px; font-weight:800; letter-spacing:.03em; }
#origin .pts .pl2{ font-size:9px; letter-spacing:.22em; color:#8b8577; text-transform:uppercase; }
#origin .errs{ width:100%; max-width:1560px; min-height:18px; font-size:12px; color:#ff8a6a; margin-bottom:8px; }
#origin .cols{ width:100%; max-width:1560px; display:grid; grid-template-columns:280px 1fr 360px; gap:16px; align-items:start; }
@media (max-width:1100px){ #origin .cols{ grid-template-columns:1fr; } }
#origin .col{ border:1px solid rgba(255,255,255,.12); border-radius:14px; background:rgba(255,255,255,.03); padding:16px; max-height:calc(100vh - 150px); overflow-y:auto; }
#origin .sh{ font-size:9px; letter-spacing:.22em; color:#8b8577; text-transform:uppercase; margin:14px 0 7px; }
#origin .sh:first-child{ margin-top:0; }
#origin input[type=text]{ width:100%; font-family:inherit; font-size:15px; font-weight:700; letter-spacing:.04em; color:#e8e2d6; background:rgba(0,0,0,.4); border:1px solid rgba(255,255,255,.14); border-radius:9px; padding:9px 11px; outline:none; }
#origin input[type=text]:focus{ border-color:#ffd24a; box-shadow:0 0 12px rgba(255,210,74,.25); }
#origin input[type=range]{ width:100%; accent-color:#f5b21a; }
#origin .swatches{ display:flex; flex-wrap:wrap; gap:7px; }
#origin .sw{ cursor:pointer; width:34px; height:34px; border-radius:9px; border:2px solid rgba(255,255,255,.14); position:relative; overflow:hidden; }
#origin .sw i{ position:absolute; inset:0; }
#origin .sw i.b{ clip-path:polygon(100% 0,100% 100%,0 100%); }
#origin .sw em{ position:absolute; right:2px; top:2px; width:9px; height:9px; border-radius:50%; }
#origin .sw.on{ border-color:#ffd24a; box-shadow:0 0 12px rgba(255,210,74,.5); }
#origin .sw.skin{ width:27px; height:27px; border-radius:50%; }
#origin .chips2{ display:flex; flex-wrap:wrap; gap:6px; }
#origin .c2{ cursor:pointer; font-size:11px; font-weight:700; padding:6px 11px; border-radius:14px; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.10); color:#b7b0a2; }
#origin .c2.on{ background:rgba(255,210,74,.16); border-color:rgba(255,210,74,.5); color:#ffd97a; }
#origin .c2 .cc{ color:#7fbfff; font-weight:800; margin-left:5px; font-size:10px; }
#origin .c2.on .cc{ color:#ffcf7a; }
#origin .oline{ font-size:10px; color:#8b8577; margin-top:4px; line-height:1.45; }
#origin .arow2{ display:flex; align-items:center; gap:8px; margin-bottom:7px; }
#origin .arow2 .an{ width:76px; font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:#a49c8c; }
#origin .arow2 .does{ display:block; font-size:8px; letter-spacing:.02em; color:#6b6557; text-transform:none; }
#origin .arow2 button{ cursor:pointer; width:24px; height:24px; border-radius:7px; border:1px solid rgba(255,255,255,.16); background:rgba(255,255,255,.05); color:#e8e2d6; font-weight:800; font-size:13px; line-height:1; font-family:inherit; }
#origin .arow2 button:hover{ background:rgba(255,210,74,.2); }
#origin .arow2 .av{ width:18px; text-align:center; font-weight:800; font-size:14px; }
#origin .arow2 .arank{ min-width:86px; text-align:center; font-size:9px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; padding:2px 7px; border-radius:9px; border:1px solid; }
#origin .arow2 .ac{ width:34px; text-align:right; font-size:10px; color:#7fbfff; }
#origin .slotrow{ display:flex; gap:7px; flex-wrap:wrap; margin-bottom:10px; }
#origin .slotc{ cursor:pointer; width:76px; min-height:56px; border-radius:10px; border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.04); padding:6px 7px; position:relative; }
#origin .slotc .k{ font-size:10px; font-weight:800; color:#ffd24a; letter-spacing:.05em; }
#origin .slotc .pn{ font-size:9px; line-height:1.15; color:#e8e2d6; font-weight:600; margin-top:3px; }
#origin .slotc .pn.none{ color:#6b6557; font-weight:400; }
#origin .slotc.on{ border-color:#ffd24a; box-shadow:0 0 14px rgba(255,210,74,.45); background:rgba(255,210,74,.08); }
#origin .slotc.ult{ border-color:rgba(245,178,26,.45); }
#origin .slotc.fixed{ opacity:.5; cursor:default; }
#origin .cat{ display:grid; grid-template-columns:repeat(auto-fill,minmax(196px,1fr)); gap:8px; }
#origin .pcard{ cursor:pointer; border:1px solid rgba(255,255,255,.10); border-radius:10px; background:rgba(255,255,255,.035); padding:9px 10px; transition:border-color .1s, background .1s; }
#origin .pcard:hover{ background:rgba(255,255,255,.07); }
#origin .pcard.mine{ border-color:#ffd24a; background:rgba(255,210,74,.1); }
#origin .pcard.taken{ opacity:.42; }
#origin .pcard .pn2{ display:flex; align-items:baseline; gap:7px; }
#origin .pcard .pn2 b{ font-size:12.5px; letter-spacing:.02em; color:#e8e2d6; }
#origin .pcard .pn2 .cost{ margin-left:auto; font-size:11px; font-weight:800; color:#7fbfff; }
#origin .pcard .nums{ font-size:10.5px; color:#ffcf7a; margin-top:4px; letter-spacing:.02em; }
#origin .pcard .pdesc{ font-size:9.5px; color:#8b8577; margin-top:2px; line-height:1.35; }
#origin .pcard .pcat{ display:inline-block; font-size:8px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; color:#9a9384; }
#origin .sheet2 .bigname{ font-size:26px; font-weight:800; letter-spacing:.03em; line-height:1; }
#origin .sheet2 .bigttl{ font-size:10px; letter-spacing:.2em; text-transform:uppercase; color:#ffcf7a; margin:3px 0 10px; }
#origin .threatb{ display:inline-block; font-size:11px; font-weight:800; letter-spacing:.14em; text-transform:uppercase; padding:5px 13px; border-radius:20px; border:1px solid; margin-bottom:10px; }
#origin .dline{ font-size:11.5px; color:#c9c2b4; margin-bottom:10px; }
#origin .dline b{ color:#ffd24a; }
#origin .statrow2{ display:flex; align-items:center; gap:8px; font-size:11px; margin-bottom:4px; }
#origin .statrow2 .sl{ width:70px; color:#a49c8c; letter-spacing:.1em; text-transform:uppercase; font-size:9.5px; }
#origin .statrow2 .sb{ flex:1; height:7px; background:rgba(0,0,0,.45); border-radius:4px; overflow:hidden; box-shadow:inset 0 0 0 1px rgba(255,255,255,.08); }
#origin .statrow2 .sb i{ display:block; height:100%; border-radius:4px; transition:width .2s ease; }
#origin .statrow2 .sv{ width:18px; text-align:right; font-weight:800; }
#origin .kitrow{ display:flex; gap:8px; font-size:11px; margin-bottom:6px; align-items:baseline; }
#origin .kitrow b{ min-width:38px; color:#ffd24a; font-size:10.5px; }
#origin .kitrow .kn{ font-weight:700; }
#origin .kitrow .kd{ display:block; color:#ffcf7a; font-size:10px; }
#origin .brk{ display:flex; flex-wrap:wrap; gap:5px; margin-top:6px; }
#origin .brk span{ font-size:9.5px; padding:3px 8px; border-radius:12px; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.10); color:#a49c8c; }
#origin .brk span b{ color:#e8e2d6; }
#origin .obtns{ display:flex; gap:10px; margin-top:14px; flex-wrap:wrap; }
#origin .obtns button{ cursor:pointer; font-family:inherit; font-weight:800; letter-spacing:.1em; font-size:13px; padding:12px 18px; border-radius:10px; text-transform:uppercase; border:none; }
#origin .obtns .go{ color:#160d02; background:linear-gradient(180deg,#ffd15a,#f5921a); box-shadow:0 4px 0 #7a3d05; flex:1; }
#origin .obtns .go:disabled{ opacity:.45; cursor:not-allowed; }
#origin .obtns .ghost{ background:rgba(255,255,255,.08); color:#e8e2d6; border:1px solid rgba(255,255,255,.15); }
#origin .obtns .danger{ background:rgba(255,74,58,.14); color:#ff8a6a; border:1px solid rgba(255,90,74,.4); }
`;

// live numbers per power — the "show damage while picking" ruling
export function powerNumbers(ab) {
  const r = (x) => Math.round(x);
  switch (ab.type) {
    case 'beam': return `${ab.dps} dps hose · ${ab.radius >= 2 ? 'WIDE' : 'thin'} · ${ab.kiPerSec} ki/s${ab.charge ? ' · CHARGES' : ''}`;
    case 'projectile': return `${ab.damage} dmg · blast ${ab.blast} · spd ${ab.speed}${ab.homing ? ' · homing' : ''}${ab.boomerang ? ' · RETURNS' : ''}${ab.grav ? ' · lobbed' : ''}`;
    case 'volley': return `${ab.damage}/shot · ~${r(ab.damage / ab.interval)} dps stream`;
    case 'rifle': return `${ab.damage}/rnd · ~${r(ab.damage / ab.interval)} dps · ${ab.spread <= 0.02 ? 'precision' : 'auto'}`;
    case 'cone': return `${ab.dps} dps · ${ab.range}u cone${ab.cold ? ' · FREEZES' : ''}${ab.push ? ' · shoves' : ''}`;
    case 'lifedrain': return `${ab.dps} dps → ${r(ab.ratio * 100)}% healed`;
    case 'charge': return `${ab.dmgMin}–${ab.dmgMax} dmg · blast→${ab.maxBlast} · scales`;
    case 'melee': return `${ab.damage} dmg · launch ${ab.launch || 0}${ab.fly ? ' · flying' : ''}`;
    case 'rush': return `${ab.hits}×${ab.damage} + ${ab.finisher} finisher`;
    case 'teleport': return `${ab.range}u blink · ${ab.cost} ki`;
    case 'phase': return `intangible · ${ab.kiPerSec} ki/s`;
    case 'summon': return `${ab.count} units · ${ab.damage}/hit · ${ab.duration}s`;
    case 'construct': return `${ab.construct} · ${ab.duration}s`;
    case 'tentacle': return `${ab.damage} dmg · ${ab.range}u seize → SLAM`;
    case 'portal': return `door pair · ${ab.range}u · ${ab.dur}s`;
    case 'buff': return `×${ab.mult} for ${ab.dur}s${ab.heal ? ` · +${ab.heal} hp` : ''}${ab.reveal ? ' · WALLHACK' : ''}`;
    case 'meteor': return `${ab.count}×${ab.damage} rain · blast ${ab.blast}`;
    case 'spiritbomb': return `grows ${ab.minR}→${ab.maxR}u · hurl`;
    case 'bow': return `${ab.dmgMin}–${ab.dmgMax} dmg draw · payloads`;
    case 'quiver': return `cycles broadheads`;
    case 'mine': return `${ab.max}×${ab.damage} traps · blast ${ab.blast}`;
    case 'facebomb': return `charge-scaled seeker bomb`;
    default: return ab.type;
  }
}
const PDESC = {
  beam: 'a hose of energy — the tip travels, never hitscan', blast: 'thrown destruction', charge: 'hold to grow it — release the consequence',
  cone: 'close-range field control', martial: 'fists, up close', mobility: 'be somewhere else',
  gear: 'hardware — ammo is ki', command: 'things that fight for you', support: 'force multipliers', artillery: 'the sky answers',
};

export class CreatorUI {
  constructor(roster) {
    this.roster = roster;
    const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s);
    this.root = document.createElement('div'); this.root.id = 'origin'; document.body.appendChild(this.root);
    this.open = false;
    this._esc = (e) => { if (e.code === 'Escape' && this.open) { e.stopPropagation(); this.close(false); } };
    addEventListener('keydown', this._esc, true);
  }

  show({ edit, onDone, onCancel } = {}) {
    this.onDone = onDone; this.onCancel = onCancel;
    this.picks = edit ? JSON.parse(JSON.stringify(edit.picks)) : freshPicks();
    this.editingId = edit ? edit.def.id : null;
    this.selSlot = 'lmb';
    this.open = true;
    this._buildShell();
    this.renderAll();
    this.root.style.display = 'flex';
    this.root.querySelector('#oName').focus();
  }

  close(done) {
    this.open = false; this.root.style.display = 'none';
    if (!done && this.onCancel) this.onCancel();
  }

  _buildShell() {
    this.root.innerHTML = `
      <div class="ohead">
        <div><h2>ORIGIN</h2><div class="osub">Forge a Living Superweapon</div></div>
        <div class="budgets" id="oBudgets"></div>
        <div class="pts"><div class="pv" id="oPts">0</div><div class="pl2">points</div></div>
      </div>
      <div class="errs" id="oErrs"></div>
      <div class="cols">
        <div class="col" id="oIdent">
          <div class="sh">Name</div><input type="text" id="oName" maxlength="14" placeholder="CODENAME" spellcheck="false">
          <div class="sh">Epithet</div><input type="text" id="oTitle" maxlength="26" placeholder="Living Superweapon" spellcheck="false">
          <div class="sh">Colors</div><div class="swatches" id="oPal"></div>
          <div class="sh">Skin</div><div class="swatches" id="oSkin"></div>
          <div class="sh">Frame</div><div class="chips2" id="oFrame"></div>
          <div class="sh">Cape</div><div class="chips2" id="oCape"></div>
          <div class="sh">Voice · <span id="oVoiceV" style="color:#ffd24a"></span></div>
          <input type="range" id="oVoice" min="0.55" max="1.3" step="0.05">
          <div class="chips2" style="margin-top:8px" id="oYells"></div>
          <div class="oline">Deep 0.55 — the mountain. High 1.3 — the livewire.</div>
        </div>
        <div class="col" id="oBuild"></div>
        <div class="col sheet2" id="oSheet"></div>
      </div>`;
    const P = this.picks;
    const nm = this.root.querySelector('#oName'), tt = this.root.querySelector('#oTitle'), vc = this.root.querySelector('#oVoice');
    nm.value = P.name; tt.value = P.title; vc.value = P.voicePitch;
    nm.oninput = () => { P.name = nm.value; this.renderSheet(); this.renderHeader(); };
    tt.oninput = () => { P.title = tt.value; this.renderSheet(); };
    vc.oninput = () => { P.voicePitch = parseFloat(vc.value); this.root.querySelector('#oVoiceV').textContent = P.voicePitch.toFixed(2); };
  }

  renderAll() { this.renderIdentity(); this.renderBuild(); this.renderSheet(); this.renderHeader(); }

  renderHeader() {
    const P = this.picks, t = tally(P), b = BUDGETS.find(x => x.id === P.budget);
    const cap = b && b.pts > 0 ? b.pts : 0;
    const el = this.root.querySelector('#oBudgets');
    el.innerHTML = BUDGETS.map(x => `<span class="bch${x.id === P.budget ? ' on' : ''}" data-b="${x.id}" title="${x.blurb}">${x.name}${x.pts ? ` · ${x.pts}` : ''}</span>`).join('');
    el.querySelectorAll('.bch').forEach(c => c.onclick = () => { P.budget = c.dataset.b; this.renderHeader(); this.renderSheet(); });
    const pts = this.root.querySelector('#oPts');
    pts.textContent = cap ? `${t.total} / ${cap}` : `${t.total}`;
    pts.style.color = !cap ? '#e8e2d6' : t.total > cap ? '#ff5a4a' : t.total > cap * 0.9 ? '#ffd24a' : '#8fe08a';
    this.root.querySelector('#oErrs').textContent = validate(P).join('  ·  ');
  }

  renderIdentity() {
    const P = this.picks;
    const pal = this.root.querySelector('#oPal');
    pal.innerHTML = PALETTES.map((p, i) => `<span class="sw${i === P.palette ? ' on' : ''}" data-i="${i}" title="${p.name}"><i style="background:${p.primary}"></i><i class="b" style="background:${p.secondary}"></i><em style="background:${p.accent}"></em></span>`).join('');
    pal.querySelectorAll('.sw').forEach(s => s.onclick = () => { P.palette = +s.dataset.i; this.renderIdentity(); this.renderSheet(); });
    const sk = this.root.querySelector('#oSkin');
    sk.innerHTML = SKINS.map((c, i) => `<span class="sw skin${i === P.skin ? ' on' : ''}" data-i="${i}"><i style="background:${c}"></i></span>`).join('');
    sk.querySelectorAll('.sw').forEach(s => s.onclick = () => { P.skin = +s.dataset.i; this.renderIdentity(); });
    const fr = this.root.querySelector('#oFrame');
    fr.innerHTML = FRAMES.map((f, i) => `<span class="c2${i === P.frame ? ' on' : ''}" data-i="${i}">${f.name}</span>`).join('');
    fr.querySelectorAll('.c2').forEach(s => s.onclick = () => { P.frame = +s.dataset.i; this.renderIdentity(); });
    const cp = this.root.querySelector('#oCape');
    cp.innerHTML = ['No Cape', 'Cape'].map((n, i) => `<span class="c2${(!!i) === P.cape ? ' on' : ''}" data-i="${i}">${n}</span>`).join('');
    cp.querySelectorAll('.c2').forEach(s => s.onclick = () => { P.cape = s.dataset.i === '1'; this.renderIdentity(); });
    const yl = this.root.querySelector('#oYells');
    yl.innerHTML = ['Silent', 'Battle Cries'].map((n, i) => `<span class="c2${(!!i) === P.yells ? ' on' : ''}" data-i="${i}">${n}</span>`).join('');
    yl.querySelectorAll('.c2').forEach(s => s.onclick = () => { P.yells = s.dataset.i === '1'; this.renderIdentity(); });
    this.root.querySelector('#oVoiceV').textContent = (+P.voicePitch).toFixed(2);
  }

  renderBuild() {
    const P = this.picks, root = this.root.querySelector('#oBuild');
    const chip = (on, label, cost, data) => `<span class="c2${on ? ' on' : ''}" ${data}>${label}${cost ? `<span class="cc">${cost}p</span>` : ''}</span>`;
    // attributes
    const attrRows = ATTR_DEFS.map(a => {
      const v = P.attrs[a.k], rc = rankColor(v);
      return `<div class="arow2"><span class="an">${a.name}<span class="does">${a.does}</span></span>
        <button data-a="${a.k}" data-d="-1">−</button><span class="av">${v}</span><button data-a="${a.k}" data-d="1">+</button>
        <span class="arank" style="color:${rc};border-color:${rc}55;background:${rc}14">${rankName(v)}</span>
        <span class="ac">${ATTR_COST[v]}p</span></div>`;
    }).join('');
    // traits
    const tr = (list, cur, key) => `<div class="chips2">${list.map(o =>
      chip(o.v === cur, o.name, o.cost, `data-t="${key}" data-v="${o.v}" title="${o.d}"`)).join('')}</div>`;
    // powers
    const slotRow = ['lmb', 'rmb', 'q', 'e', 'f', 'r'].map(k => {
      const pid = P.slots[k], p = pid && powerById(pid);
      return `<div class="slotc${k === this.selSlot ? ' on' : ''}${k === 'r' ? ' ult' : ''}" data-s="${k}">
        <div class="k">${k === 'lmb' ? 'LMB' : k === 'rmb' ? 'RMB' : k === 'r' ? 'R · ULT' : k.toUpperCase()}</div>
        <div class="pn${p ? '' : ' none'}">${p ? p.name : 'empty'}</div></div>`;
    }).join('') + `<div class="slotc fixed"><div class="k">SHIFT</div><div class="pn">Burst Dash</div></div>`;
    const wantUlt = this.selSlot === 'r';
    const cards = POWERS.filter(p => !!p.ult === wantUlt).map(p => {
      const takenIn = Object.entries(P.slots).find(([, v]) => v === p.id);
      const mine = takenIn && takenIn[0] === this.selSlot;
      return `<div class="pcard${mine ? ' mine' : ''}${takenIn && !mine ? ' taken' : ''}" data-p="${p.id}">
        <div class="pn2"><b>${p.name}</b><span class="cost">${p.cost}p</span></div>
        <span class="pcat">${p.cat}</span>
        <div class="nums">${powerNumbers(p.ab)}</div>
        <div class="pdesc">${PDESC[p.cat] || ''}${p.req ? ` · needs ${powerById(p.req).name}` : ''}</div></div>`;
    }).join('');
    root.innerHTML = `
      <div class="sh">Attributes — the rank ladder</div>${attrRows}
      <div class="sh">Flight</div>${tr(FLIGHT_TIERS, P.flightTier, 'flightTier')}
      <div class="sh">Guard</div>${tr(GUARD_TYPES, P.guardType, 'guardType')}
      <div class="sh">Evade (2×tap)</div>${tr(EVADE_KINDS, P.evade, 'evade')}
      <div class="sh">Melee Style</div>${tr(MELEE_TIERS, P.meleeTiers, 'meleeTiers')}
      <div class="sh">Gifts</div><div class="chips2">${GIFTS.map(g => chip(P.gifts.includes(g.id), g.name, g.cost, `data-g="${g.id}" title="${g.d}"`)).join('')}</div>
      <div class="sh">Talents — max 3 · ${TALENT_COST}p each</div><div class="chips2">${Object.entries(TALENTS).map(([k, t]) => chip(P.talents.includes(k), t.name, TALENT_COST, `data-tal="${k}" title="${t.does}"`)).join('')}</div>
      <div class="sh">Gadgets — max 2 · on X</div><div class="chips2">${GADGETS.map(g => chip(P.gadgets.includes(g.id), g.name, g.cost, `data-gad="${g.id}" title="${g.d}"`)).join('')}</div>
      <div class="sh">Powers — pick a slot, then arm it</div>
      <div class="slotrow">${slotRow}</div>
      <div class="cat">${cards}</div>`;
    // events
    root.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
      const k = b.dataset.a; P.attrs[k] = Math.max(1, Math.min(10, P.attrs[k] + (+b.dataset.d)));
      this.renderBuild(); this.renderSheet(); this.renderHeader();
    });
    root.querySelectorAll('[data-t]').forEach(c => c.onclick = () => {
      const k = c.dataset.t; const v = k === 'flightTier' || k === 'meleeTiers' ? +c.dataset.v : c.dataset.v;
      P[k] = v; this.renderBuild(); this.renderSheet(); this.renderHeader();
    });
    root.querySelectorAll('[data-g]').forEach(c => c.onclick = () => {
      const id = c.dataset.g; const i = P.gifts.indexOf(id);
      if (i >= 0) P.gifts.splice(i, 1); else P.gifts.push(id);
      this.renderBuild(); this.renderSheet(); this.renderHeader();
    });
    root.querySelectorAll('[data-tal]').forEach(c => c.onclick = () => {
      const id = c.dataset.tal; const i = P.talents.indexOf(id);
      if (i >= 0) P.talents.splice(i, 1); else if (P.talents.length < 3) P.talents.push(id);
      this.renderBuild(); this.renderSheet(); this.renderHeader();
    });
    root.querySelectorAll('[data-gad]').forEach(c => c.onclick = () => {
      const id = c.dataset.gad; const i = P.gadgets.indexOf(id);
      if (i >= 0) P.gadgets.splice(i, 1); else if (P.gadgets.length < 2) P.gadgets.push(id);
      this.renderBuild(); this.renderSheet(); this.renderHeader();
    });
    root.querySelectorAll('.slotc:not(.fixed)').forEach(c => c.onclick = () => { this.selSlot = c.dataset.s; this.renderBuild(); });
    root.querySelectorAll('.pcard').forEach(c => c.onclick = () => {
      const id = c.dataset.p;
      for (const k of Object.keys(P.slots)) if (P.slots[k] === id) P.slots[k] = null;   // move if armed elsewhere
      P.slots[this.selSlot] = (P.slots[this.selSlot] === id) ? null : id;               // toggle in place
      this.renderBuild(); this.renderSheet(); this.renderHeader();
    });
  }

  renderSheet() {
    const P = this.picks, root = this.root.querySelector('#oSheet');
    const def = buildDef(P, this.editingId || 'cx_preview');
    const t = tally(P), st = heroStats(def), d = derived(P.attrs), ai = deriveAI(P.slots, P.flightTier);
    const tc = THREAT_COLORS[def.threat] || '#a49c8c';
    const bar = (label, v, col) => `<div class="statrow2"><span class="sl">${label}</span><span class="sb"><i style="width:${v * 10}%;background:${col}"></i></span><span class="sv">${v}</span></div>`;
    const kit = Object.entries(P.slots).filter(([, v]) => v).map(([k, v]) => {
      const p = powerById(v);
      return `<div class="kitrow"><b>${k === 'lmb' ? 'LMB' : k === 'rmb' ? 'RMB' : k.toUpperCase()}</b><span><span class="kn">${p.name}</span><span class="kd">${powerNumbers(p.ab)}</span></span></div>`;
    }).join('') || `<div class="oline">No powers armed yet.</div>`;
    const errs = validate(P);
    root.innerHTML = `
      <div class="bigname" style="color:${def.colors.accent}">${def.name}</div>
      <div class="bigttl">${def.title || 'Living Superweapon'}</div>
      <div class="threatb" style="color:${tc};border-color:${tc}66;background:${tc}18">LeFevre Threat · ${def.threat}</div>
      <div class="dline">HP <b>${d.hp}</b> · KI <b>${d.ki}</b> · SPD <b>${d.speed}</b> · STR <b>${d.strength}</b> · Doctrine <b>${ai.style.toUpperCase()}</b></div>
      ${bar('Power', st.power, '#ff6a4a')}${bar('Range', st.range, '#ffd24a')}${bar('Mobility', st.mobility, '#7fe6ff')}
      ${bar('Defense', st.defense, '#8fe08a')}${bar('Health', st.health, '#ff8a5a')}${bar('Energy', st.energy, '#7fb0ff')}
      <div class="sh">The Kit — live numbers</div>${kit}
      <div class="sh">Cost Breakdown</div>
      <div class="brk"><span>Attributes <b>${t.attrs}</b></span><span>Powers <b>${t.powers}</b></span><span>Traits <b>${t.traits}</b></span><span>Talents <b>${t.talents}</b></span><span>Gadgets <b>${t.gadgets}</b></span><span style="border-color:${tc}66;color:${tc}">TOTAL <b style="color:${tc}">${t.total}</b></span></div>
      <div class="obtns">
        <button class="ghost" id="oCancel">Cancel</button>
        ${this.editingId ? '<button class="danger" id="oDelete">Delete</button>' : ''}
        <button class="ghost" id="oSave" ${errs.length ? 'disabled' : ''}>Save</button>
        <button class="go" id="oTest" ${errs.length ? 'disabled' : ''}>Save & Test ▶</button>
      </div>`;
    root.querySelector('#oCancel').onclick = () => this.close(false);
    const del = root.querySelector('#oDelete');
    if (del) del.onclick = () => { deleteCustom(this.editingId, this.roster); this.close(true); if (this.onDone) this.onDone(null, {}); };
    const commit = (test) => {
      const errs2 = validate(this.picks); if (errs2.length) { this.renderHeader(); return; }
      const final = buildDef(this.picks, this.editingId);
      saveCustom(this.picks, final, this.roster);
      this.close(true);
      if (this.onDone) this.onDone(final, { test });
    };
    root.querySelector('#oSave').onclick = () => commit(false);
    root.querySelector('#oTest').onclick = () => commit(true);
  }
}
