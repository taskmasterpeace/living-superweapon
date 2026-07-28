// POWERWORLD — the front door.
//
// ⚠ WHY THIS IS ITS OWN MODULE AND NOT A FLAG ON `buildTitle`. War World's title screen is 286
// lines welded to War World's identity: the KMK 9 cold-open desk, the circuit and firm banners, the
// registry dossier with its classification stamp. PowerWorld shares none of that and wants things
// that screen has no concept of — an opponent picker, a difficulty dial, a dimension readout.
// Threading a profile through the other one would have put an `if` on every block. The ENGINE is
// shared (see boot.js); the chrome is not, because the chrome is the only part that differs.
//
// ⚠ EVERY NUMBER ON THIS SCREEN IS DERIVED FROM THE THING IT DESCRIBES. The arena radius, the spire
// and boulder counts, the loose-rock total, the rubble ladder and how much of the roster can lift
// each rung all come from `STAGE` / `RUBBLE` / `liftCapacityOf` at render time. A front door that
// authors its own facts is a front door that will one day describe a stage that no longer exists —
// the same law as the damage codex and the character sheet.
//
// ⚠ AND IT DOES NOT OFFER A STAGE SELECTOR. There is exactly one stage today. Six greyed slots
// would imply content that does not exist, which is the one thing a control must never do.
import { ROSTER } from '../data/characters.js';
import { STAGE, RUBBLE } from './powerworld.js';
// ⚠ `liftCapacityOf` lives in entity.js, not scale.js. Two front doors, one ladder — the def-based
// one is the real API and `liftCapacity(str)` is the 1-10 shim; both end in `liftTonsOfRank`.
import { liftCapacityOf } from './entity.js';
import { heroStats, kitFacts, THREAT_COLORS } from './hud.js';
import { icon } from './icons.js';
import { esc } from './hudUtil.js';

const PREF = 'powerworld_prefs_v1';

// The four rules of `_openSky` (manual §46). Named here because a player arriving on this page has
// no way to know this dimension is different, and "one flag, four rules" is the actual design.
const LAWS = [
  ['flight', 'EVERY fighter flies here — grounded ones included. Forward is where you look, in 3-D.'],
  ['range', 'A punch SENDS them. The same haymaker travels 15 body lengths against the city\'s two.'],
  ['power', 'The ground is ammunition — break a spire, pick up the rubble, throw it. Shoot theirs down.'],
  ['threat', 'No civilians, no police, no press. Nothing here is watching and nothing here is innocent.'],
];

/** How many of the 52 can lift this rung — the ladder's own justification, computed live. */
function liftersFor(tons) {
  let n = 0;
  for (const d of ROSTER) { try { if (liftCapacityOf(d) >= tons) n++; } catch { /* custom with no rank */ } }
  return n;
}

/**
 * Mount PowerWorld's front door.
 * @param {object} ctx  the boot context — { game, hud, enter, ROSTER }
 * @returns {{open:Function, close:Function, el:HTMLElement}}
 */
export function mountPWTitle(ctx) {
  const { hud } = ctx;
  let prefs = {};
  try { prefs = JSON.parse(localStorage.getItem(PREF) || '{}') || {}; } catch {}

  // ⚠ HIDE WAR WORLD'S `#title`, AND THIS IS NOT TIDINESS — IT IS A REAL BUG THIS PAGE HAD.
  // `#title` is styled by shell.css as a full-viewport `display:flex` with a background gradient and
  // `pointer-events:auto`. On index.html that is fine because `showTitle`/`hideTitle` own its
  // display. PowerWorld never calls either — its door is `#pwTitle` — so the element sat there at
  // its CSS default: EMPTY, opaque, at z-index 30, laying a dark veil over the whole match and
  // swallowing every click aimed at the game. It looked like a rendering fault and was a stylesheet
  // one. Caught by a screenshot; no assertion I had written could see it.
  const wwTitle = document.getElementById('title');
  if (wwTitle) wwTitle.style.display = 'none';

  const el = document.createElement('div');
  el.id = 'pwTitle';
  el.style.display = 'none';
  document.body.appendChild(el);

  if (!document.getElementById('pwTitleCss')) {
    const s = document.createElement('style');
    s.id = 'pwTitleCss';
    // ⚠ Tokens only — no literal colours beyond the stage's own palette, which is imported from the
    // stage so the door is painted in the sky it is a door to. NO PURPLE (house rule).
    s.textContent = `
#pwTitle{ position:fixed; inset:0; z-index:30; overflow-y:auto; display:none;
  flex-direction:column; align-items:center; justify-content:flex-start;
  background:
    radial-gradient(120% 80% at 50% -10%, ${STAGE.sky.topDay}55 0%, transparent 60%),
    linear-gradient(180deg, var(--ink,#0a0c12) 0%, #0a0c12 100%);
  font-family:var(--f-display,Rajdhani,system-ui,sans-serif); color:var(--text,#e8e2d4);
  padding:18px 20px 40px; }
#pwTitle>*:first-child{ margin-top:auto; }
#pwTitle>*:last-child{ margin-bottom:auto; }
#pwTitle .pwtop{ display:flex; gap:8px; align-self:flex-end; margin-bottom:10px; flex-wrap:wrap; }
#pwTitle .pwtop button, #pwTitle .pwtop a{ font-family:var(--f-mono,monospace); font-size:var(--t-micro,9px);
  letter-spacing:.14em; text-transform:uppercase; text-decoration:none; cursor:pointer;
  background:var(--surface,#12110ecc); color:var(--text-3,#b8b0a0); border:1px solid var(--line,#3a362e);
  padding:7px 12px; border-radius:var(--r-1,4px); transition:.2s; min-height:32px; }
#pwTitle .pwtop button:hover, #pwTitle .pwtop a:hover{ color:var(--gold,#f5b21a); border-color:var(--line-gold,#6b5824); }
#pwTitle .pwhead{ text-align:center; margin-bottom:4px; }
#pwTitle h1{ font-size:clamp(38px,7vw,74px); font-weight:800; letter-spacing:-.02em; line-height:.92;
  background:linear-gradient(180deg, ${STAGE.sky.horDay} 0%, ${STAGE.rock} 62%, var(--gold,#f5b21a) 100%);
  -webkit-background-clip:text; background-clip:text; color:transparent; }
#pwTitle .pwkick{ font-family:var(--f-mono,monospace); font-size:var(--t-micro,9px); letter-spacing:.3em;
  text-transform:uppercase; color:var(--text-5,#8b8577); margin-top:6px; }
#pwTitle .pwlaws{ display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:8px;
  max-width:1000px; width:100%; margin:14px 0 10px; }
#pwTitle .pwlaw{ display:flex; gap:8px; align-items:flex-start; padding:9px 11px;
  background:var(--surface,#12110ecc); border:1px solid var(--line,#3a362e); border-left:2px solid var(--gold-deep,#8a6b1e);
  border-radius:var(--r-1,4px); font-size:var(--t-sm,11px); color:var(--text-2,#cfc7b6); line-height:1.4; }
#pwTitle .pwlaw svg{ flex:0 0 auto; margin-top:1px; color:var(--gold,#f5b21a); }
#pwTitle .pwstage{ display:flex; flex-wrap:wrap; gap:0; max-width:1000px; width:100%;
  border:1px solid var(--line,#3a362e); background:var(--surface,#12110ecc); border-radius:var(--r-1,4px);
  margin-bottom:12px; overflow:hidden; }
#pwTitle .pwsf{ flex:1 1 120px; padding:8px 11px; border-right:1px solid var(--line,#3a362e); }
#pwTitle .pwsf:last-child{ border-right:none; }
#pwTitle .pwsk{ display:block; font-family:var(--f-mono,monospace); font-size:var(--t-micro,9px);
  letter-spacing:.16em; color:var(--text-5,#8b8577); text-transform:uppercase; }
#pwTitle .pwsv{ font-family:var(--f-mono,monospace); font-size:13px; color:var(--gold,#f5b21a); }
#pwTitle .pwsv small{ color:var(--text-4,#9a9385); font-size:9px; }
#pwTitle .pwwrap{ display:flex; gap:14px; max-width:1000px; width:100%; align-items:flex-start; flex-wrap:wrap; }
#pwTitle .pwpv{ flex:0 0 268px; background:var(--surface-solid,#14130f); border:1px solid var(--line,#3a362e);
  border-top:2px solid var(--pc,var(--gold,#f5b21a)); border-radius:var(--r-1,4px); padding:13px; }
#pwTitle .pwpvn{ font-size:24px; font-weight:800; letter-spacing:-.01em; line-height:1; }
#pwTitle .pwpvt{ font-family:var(--f-mono,monospace); font-size:var(--t-micro,9px); letter-spacing:.13em;
  text-transform:uppercase; color:var(--text-5,#8b8577); margin:4px 0 9px; }
#pwTitle .pwbar{ display:flex; align-items:center; gap:7px; margin:3px 0; font-size:10px; }
#pwTitle .pwbar span:first-child{ flex:0 0 62px; font-family:var(--f-mono,monospace); font-size:9px;
  letter-spacing:.1em; color:var(--text-5,#8b8577); text-transform:uppercase; }
#pwTitle .pwbar i{ flex:1; height:4px; background:var(--line,#3a362e); border-radius:2px; overflow:hidden; }
#pwTitle .pwbar i b{ display:block; height:100%; }
#pwTitle .pwbar em{ flex:0 0 16px; text-align:right; font-family:var(--f-mono,monospace);
  font-size:9px; font-style:normal; color:var(--text-3,#b8b0a0); }
#pwTitle .pwfacts{ display:flex; flex-wrap:wrap; gap:4px; margin-top:9px; }
#pwTitle .pwfacts span{ font-size:9px; font-family:var(--f-mono,monospace); letter-spacing:.06em;
  color:var(--text-4,#9a9385); background:var(--surface-hi,#1c1a15); border:1px solid var(--line,#3a362e);
  padding:2px 6px; border-radius:var(--r-1,4px); }
#pwTitle .pwlift{ margin-top:9px; padding-top:8px; border-top:1px dashed var(--line,#3a362e);
  font-family:var(--f-mono,monospace); font-size:9px; color:var(--text-4,#9a9385); line-height:1.6; }
#pwTitle .pwlift b{ color:var(--gold,#f5b21a); }
#pwTitle .pwright{ flex:1 1 380px; display:flex; flex-direction:column; gap:9px; min-width:300px; }
#pwTitle .pwtabs{ display:flex; gap:6px; }
#pwTitle .pwtab{ flex:1; font-family:var(--f-mono,monospace); font-size:var(--t-micro,9px); letter-spacing:.16em;
  text-transform:uppercase; padding:8px; cursor:pointer; text-align:center; min-height:32px;
  background:var(--surface,#12110ecc); border:1px solid var(--line,#3a362e); color:var(--text-4,#9a9385);
  border-radius:var(--r-pill,20px); transition:.2s; }
#pwTitle .pwtab.on{ background:var(--grad-gold,linear-gradient(180deg,#f5b21a,#8a6b1e));
  color:var(--on-gold,#20180a); border-color:var(--gold,#f5b21a); font-weight:700; }
#pwTitle .pwtab.off{ opacity:.4; pointer-events:none; }
/* ⚠ A SCROLL REGION ALWAYS CLIPS AT ITS BOUNDARY — the fade is what turns that from a defect into
   an affordance. The first version cut the ninth row of fighters exactly in half with no scrollbar
   and no gradient, which reads as a broken grid rather than "there is more below". Caught by the
   screenshot, not by any assertion: nothing I could have asserted knows what a sliced row looks
   like. The mask fades the last 26px so the cut is deliberate. */
#pwTitle .pwroster{ display:grid; grid-template-columns:repeat(auto-fill,minmax(104px,1fr)); gap:5px;
  max-height:286px; overflow-y:auto; padding:3px 3px 14px;
  scrollbar-width:thin; scrollbar-color:var(--gold-deep,#8a6b1e) transparent;
  -webkit-mask-image:linear-gradient(180deg,#000 0,#000 calc(100% - 26px),transparent 100%);
          mask-image:linear-gradient(180deg,#000 0,#000 calc(100% - 26px),transparent 100%); }
#pwTitle .pwc{ cursor:pointer; padding:7px 8px; background:var(--surface,#12110ecc);
  border:1px solid var(--line,#3a362e); border-left:3px solid var(--ac); border-radius:var(--r-1,4px);
  transition:.15s; min-height:44px; }
#pwTitle .pwc:hover{ background:var(--surface-hi,#1c1a15); transform:translateX(2px); }
#pwTitle .pwc.sel{ border-color:var(--gold,#f5b21a); border-left-color:var(--ac);
  background:var(--surface-raised,#1a1813); box-shadow:0 0 0 1px var(--gold-deep,#8a6b1e) inset; }
#pwTitle .pwcn{ font-size:12px; font-weight:700; letter-spacing:.02em; color:var(--ac); line-height:1.1; }
#pwTitle .pwct{ font-family:var(--f-mono,monospace); font-size:8px; letter-spacing:.08em;
  color:var(--text-5,#8b8577); text-transform:uppercase; margin-top:2px; }
#pwTitle .pwrow{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
#pwTitle .pwrow>span.pwlbl{ font-family:var(--f-mono,monospace); font-size:var(--t-micro,9px);
  letter-spacing:.16em; color:var(--text-5,#8b8577); text-transform:uppercase; }
#pwTitle .pwseg{ display:flex; border:1px solid var(--line,#3a362e); border-radius:var(--r-pill,20px); overflow:hidden; }
#pwTitle .pwseg button{ font-family:var(--f-mono,monospace); font-size:9px; letter-spacing:.1em;
  text-transform:uppercase; padding:7px 13px; cursor:pointer; background:transparent; border:none;
  color:var(--text-4,#9a9385); transition:.2s; min-height:32px; }
#pwTitle .pwseg button.on{ background:var(--gold-deep,#8a6b1e); color:var(--on-gold,#20180a); font-weight:700; }
#pwTitle .pwgo{ width:100%; padding:15px; font-family:var(--f-display,Rajdhani,sans-serif); font-size:19px;
  font-weight:800; letter-spacing:.16em; text-transform:uppercase; cursor:pointer; min-height:52px;
  background:var(--grad-gold,linear-gradient(180deg,#f5b21a,#8a6b1e)); color:var(--on-gold,#20180a);
  border:none; border-radius:var(--r-1,4px); transition:.2s; }
#pwTitle .pwgo:hover{ filter:brightness(1.12); transform:translateY(-1px); }
#pwTitle .pwnote{ font-family:var(--f-mono,monospace); font-size:9px; color:var(--text-5,#8b8577);
  letter-spacing:.05em; line-height:1.5; }
body.phone #pwTitle .pwpv{ display:none; }
body.phone #pwTitle h1{ font-size:34px; }
`;
    document.head.appendChild(s);
  }

  let selYou = ROSTER.find(r => r.id === prefs.p1) || ROSTER[0];
  let selFoe = ROSTER.find(r => r.id === prefs.p2) || ROSTER[2] || ROSTER[1] || ROSTER[0];
  let picking = 'you';                       // which slot the roster grid is assigning
  let two = !!prefs.two;
  let ai = prefs.ai || 1.25;

  const save = () => { try { localStorage.setItem(PREF, JSON.stringify({ p1: selYou.id, p2: selFoe.id, two, ai })); } catch {} };

  // ---- the stage readout, every figure derived from the stage itself ----
  const loose = STAGE.loose.reduce((a, b) => a + b, 0);
  const stageFacts = () => [
    ['ARENA', `${STAGE.radius * 2}u`, 'across'],
    ['COVER', `${STAGE.spires + STAGE.boulders}`, `${STAGE.spires} spires · ${STAGE.boulders} boulders`],
    ['LOOSE ROCK', `${loose}`, 'throwable from the first frame'],
    ['CEILING', `${STAGE.spaceTo}u`, `space from ${STAGE.spaceFrom}u`],
    ['WITNESSES', 'NONE', 'no law, no press'],
  ];

  function render() {
    const you = selYou, foe = selFoe;
    el.innerHTML = `
      <div class="pwtop">
        <a href="./index.html" title="The full game — the city, the career, the registry">← WAR WORLD</a>
        <button id="pwRank">📊 Rankings</button>
        <button id="pwOpt">⚙ Options</button>
        <button id="pwHow">❓ How to Play</button>
      </div>
      <div class="pwhead">
        <h1>POWERWORLD</h1>
        <div class="pwkick">The other dimension · open sky · nothing here is watching</div>
      </div>
      <div class="pwlaws">
        ${LAWS.map(([ic, t]) => `<div class="pwlaw">${icon(ic, 13)}<span>${t}</span></div>`).join('')}
      </div>
      <div class="pwstage">
        ${stageFacts().map(([k, v, s]) => `<div class="pwsf"><span class="pwsk">${k}</span><span class="pwsv">${v} <small>${esc(s)}</small></span></div>`).join('')}
      </div>
      <div class="pwwrap">
        <div class="pwpv" id="pwPv"></div>
        <div class="pwright">
          <div class="pwtabs">
            <div class="pwtab ${picking === 'you' ? 'on' : ''}" data-pick="you">YOU — ${esc(you.name)}</div>
            <div class="pwtab ${picking === 'foe' ? 'on' : ''} ${two ? 'off' : ''}" data-pick="foe">${two ? 'PLAYER 2 PICKS THEIR OWN' : 'OPPONENT — ' + esc(foe.name)}</div>
          </div>
          <div class="pwroster" id="pwRoster"></div>
          <div class="pwrow">
            <span class="pwlbl">Players</span>
            <div class="pwseg" id="pwTwo">
              <button data-two="0" class="${two ? '' : 'on'}">1P vs AI</button>
              <button data-two="1" class="${two ? 'on' : ''}">2P LOCAL</button>
            </div>
            <span class="pwlbl" style="margin-left:6px">Opponent</span>
            <div class="pwseg" id="pwAi">
              ${[['0.85', 'ROOKIE'], ['1.25', 'PRO'], ['1.75', 'ELITE']].map(([v, n]) =>
                `<button data-ai="${v}" class="${Math.abs(ai - +v) < 0.01 ? 'on' : ''}"${two ? ' disabled style="opacity:.35"' : ''}>${n}</button>`).join('')}
            </div>
          </div>
          <button class="pwgo" id="pwGo">ENTER THE DIMENSION ▶</button>
          <div class="pwnote">One stage. <b>T</b> locks on and cycles · <b>SPACE</b> climbs, and keeps climbing ·
            <b>G</b> hoists a rock · fists and powers work exactly as they do at home.</div>
        </div>
      </div>`;

    // ---- the roster grid ----
    const grid = el.querySelector('#pwRoster');
    const sel = picking === 'you' ? you : foe;
    grid.innerHTML = ROSTER.map(c => `
      <div class="pwc ${c.id === sel.id ? 'sel' : ''}" data-id="${esc(c.id)}" style="--ac:${c.colors.accent}">
        <div class="pwcn">${esc(c.name)}</div>
        <div class="pwct">${esc(String(c.threat || '—'))}</div>
      </div>`).join('');
    for (const card of grid.querySelectorAll('.pwc')) {
      card.onclick = () => {
        const c = ROSTER.find(r => r.id === card.dataset.id); if (!c) return;
        if (picking === 'you') selYou = c; else selFoe = c;
        save(); render();
      };
    }

    // ---- the preview: whoever is being picked ----
    const pv = el.querySelector('#pwPv');
    const c = sel, st = heroStats(c);
    const tc = THREAT_COLORS[c.threat] || 'var(--text-4)';
    pv.style.setProperty('--pc', c.colors.accent);
    const bar = (label, v, col) => `<div class="pwbar"><span>${label}</span><i><b style="width:${v * 10}%;background:${col}"></b></i><em>${v}</em></div>`;
    let lift = 0; try { lift = liftCapacityOf(c); } catch {}
    const heaviest = RUBBLE.filter(r => r.w <= lift).pop();
    pv.innerHTML = `
      <div class="pwpvn" style="color:${c.colors.accent}">${esc(c.name)}</div>
      <div class="pwpvt">${esc(c.title)} · <span style="color:${tc}">${esc(String(c.threat || '—'))}</span></div>
      ${bar('Power', st.power, '#ff6a4a')}${bar('Strength', st.strength, '#e8a24a')}
      ${bar('Range', st.range, 'var(--gold,#f5b21a)')}${bar('Mobility', st.mobility, 'var(--info,#7fb0ff)')}
      ${bar('Defense', st.defense, 'var(--good,#8fe08a)')}${bar('Health', st.health, '#ff8a5a')}
      <div class="pwfacts">${kitFacts(c).slice(0, 5).map(([ic, t]) => `<span>${esc(t)}</span>`).join('')}</div>
      <div class="pwlift">
        HEAVIEST ROCK THEY LIFT — <b>${heaviest ? heaviest.n : 'NOTHING ON THIS STAGE'}</b>${heaviest ? ` (${heaviest.w}t)` : ''}<br>
        ${heaviest ? `${liftersFor(heaviest.w)} of ${ROSTER.length} fighters can lift that.` : `Everything here is too heavy for them — they fight with what they were born with.`}
      </div>`;

    // ---- wiring ----
    // ⚠ THE FILMSTRIP IS THE PICKER FOR *YOU* (Robert, 2026-07-28: "use the character selector we
    // had earlier — this is what we should have"). Clicking YOU opens the DBZ-arena SELECT YOUR
    // CHARACTER screen (hudSelect.js, live 3D hero + filmstrip); ENTER there launches straight into
    // PowerWorld against the currently-picked opponent. ESC drops back to this door (onSelectBack —
    // without it, showSelect's back path would open the CITY title on the PowerWorld page).
    // The OPPONENT keeps the grid: assigning a foe is admin, picking YOUR fighter is the ceremony.
    for (const t of el.querySelectorAll('.pwtab')) t.onclick = () => {
      if (t.dataset.pick === 'you' && hud.showSelect) {
        hud.onSelectBack = () => {};                       // the door is still mounted beneath
        hud.showSelect((cfg) => {
          selYou = ROSTER.find(r => r.id === cfg.p1) || selYou; save();
          ctx.enter({ mode: 'powerworld', p1: selYou.id, p2: selFoe.id, twoPlayer: two, aiLevel: ai });
        }, { mode: 'powerworld', modeName: 'POWERWORLD', p1: selYou.id });
        return;
      }
      picking = t.dataset.pick; render();
    };
    for (const b of el.querySelectorAll('#pwTwo button')) b.onclick = () => { two = b.dataset.two === '1'; if (two) picking = 'you'; save(); render(); };
    for (const b of el.querySelectorAll('#pwAi button')) b.onclick = () => { if (two) return; ai = +b.dataset.ai; save(); render(); };
    el.querySelector('#pwOpt').onclick = () => hud.showOptions();
    el.querySelector('#pwHow').onclick = () => hud.showHowto();
    el.querySelector('#pwRank').onclick = () => hud.showRankings();
    el.querySelector('#pwGo').onclick = () => {
      save();
      // ⚠ `p2` is what every mode calls the opponent — powerworld's setup reads `o.enemy || o.p2`.
      ctx.enter({ mode: 'powerworld', p1: selYou.id, p2: selFoe.id, twoPlayer: two, aiLevel: ai });
    };
  }

  function open() {
    render();
    // ⚠ `hud.titleOpen` is READ BY THE FRAME LOOP and by padSystem — a front door that does not set
    // it leaves the game thinking a match is live behind the menu (Escape pauses nothing, the pad's
    // select button does the wrong thing, the wheel cycles a hero you cannot see).
    hud.titleOpen = true;
    document.body.classList.remove('playing');
    el.style.display = 'flex';
  }
  function close() {
    hud.titleOpen = false;
    el.style.display = 'none';
  }

  return { open, close, el, render, get state() { return { you: selYou.id, foe: selFoe.id, two, ai }; } };
}
