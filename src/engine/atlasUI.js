// THE ATLAS — the map maker as a product. ONE module, TWO mounts:
//   · in-game (opts.game set): the CITY ATLAS screen — theater select + authoring, mounted by hud
//   · solo (no game): the standalone tool page (atlas.html) — always-live, file import/export
// The planner stays pure (data/cityplan.js — zero Three.js); this file is UI + world-driving only.
// Styling lives in src/styles/overlays.css, linked by BOTH pages — never inject a copy here.
import { cityList } from '../data/cities.js';
import { climateLine } from '../data/climate.js';
import {
  generatePlan, applyPlanEdits, thresholdPlan, validatePlan, popLabel,
  TILE_INFO, TILE_SIZES, VARIANTS, POP_TYPES, CELL, CELL_RANGE,
} from '../data/cityplan.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const LAYOUT_KEY = 'threshold_layouts_v1';

export function mountAtlas(host, opts = {}) {
  const world = opts.world;
  const game = opts.game || null;
  const solo = !!opts.solo || !game;
  const feed = opts.feed || ((m, c) => toast(m, c));
  const onTheater = opts.onTheater || null;
  const onProvingGround = opts.onProvingGround || null;
  const onLiveChange = opts.onLiveChange || null;

  const el = document.createElement('div');
  el.id = 'hAtlas';
  el.className = 'lswovl' + (solo ? ' solo' : '');
  host.appendChild(el);

  const theater = opts.theater || { flagship: true, seed: 1 };
  const st = {
    q: '', type: 'ALL', sel: theater.flagship ? -1 : (theater.cityId ?? -1),
    seed: theater.seed || 1, paint: 'residential', edits: { ...(theater.edits || {}) },
    N: theater.N || 0, waterCols: theater.waterCols, cell: theater.cell || 0,
    popType: theater.popType || null, humanH: theater.humanH || 0, hist: [],
  };

  // ---- solo toast (in-game mounts route feed to the hud's ticker instead) --------------------
  function toast(m, c) {
    const t = document.createElement('div');
    t.className = 'attoast'; t.textContent = m; t.style.borderColor = c || 'var(--gold)';
    el.appendChild(t); setTimeout(() => t.remove(), 2600);
  }

  // ---- undo: every mutation goes through mapEdit so UNDO is one unconditional rule ------------
  function mapEdit(fn) {
    (st.hist || (st.hist = [])).push(JSON.stringify({ e: st.edits, N: st.N, w: st.waterCols, s: st.seed, c: st.cell, p: st.popType, m: st.humanH }));
    if (st.hist.length > 50) st.hist.shift();
    fn();
  }
  function mapUndo() {
    if (!st.hist || !st.hist.length) return false;
    const p = JSON.parse(st.hist.pop());
    st.edits = p.e; st.N = p.N; st.waterCols = p.w; st.seed = p.s; st.cell = p.c; st.popType = p.p; st.humanH = p.m || 0;
    return true;
  }
  // Painting. LOCK freezes whatever the generator put here so rerolls can't touch it.
  function paintCell(plan, r, c) {
    const key = r + ',' + c;
    const cur = plan.cells && plan.cells[r] && plan.cells[r][c];
    mapEdit(() => {
      if (st.paint === 'ERASE') { delete st.edits[key]; return; }
      if (st.paint === 'LOCK') {
        if (!cur) return;
        // ⚠ Resolve the ANCHOR first, then toggle — a locked footprint must release from any cell.
        const ak = cur.ref ? cur.ref.join(',') : key;
        const a = cur.ref ? plan.cells[cur.ref[0]][cur.ref[1]] : cur;
        if (st.edits[ak] && st.edits[ak].lock) { delete st.edits[ak]; return; }
        st.edits[ak] = { t: a.t, v: a.v || 0, lock: true };
        return;
      }
      st.edits[key] = { t: st.paint, v: (Math.random() * (VARIANTS[st.paint] || 1)) | 0, sz: st.size || 0 };
    });
  }
  const layouts = () => { try { return JSON.parse(localStorage.getItem(LAYOUT_KEY) || '{}'); } catch { return {}; } };
  const saveLayouts = (o) => { try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(o)); } catch {} };

  // ---- LIVE 3D: build the REAL city while you author it. Solo mounts live here permanently. ----
  let live = false, liveT = 0, liveFit = 0, liveMs = 0, liveEl = null, qWas;
  const camState = { yaw: Math.PI * 0.25, pitch: 0.86, zoom: 260, x: 0, z: 0 };
  function liveOn(plan) {
    if (!world) return;
    live = true;
    world.setSim && world.setSim(false);
    world.setFogEnabled(false);
    // AUTHORING WANTS FULL RESOLUTION — pin quality while the tool owns the screen.
    qWas = world.qualityOverride;
    world.qualityOverride = 2;
    world._qTier = 2; world._applyQuality && world._applyQuality();
    el.classList.add('live');
    if (onLiveChange) onLiveChange(true, camState);
    liveRebuild(plan, true);
    bindLiveInput();
  }
  function liveOff() {
    if (solo) return;                       // the solo page IS the live view — nothing to exit to
    live = false;
    if (world) {
      world.setFogEnabled(true);
      world.qualityOverride = qWas === undefined ? null : qWas;
      if (world.qualityOverride != null) { world._qTier = world.qualityOverride; world._applyQuality && world._applyQuality(); }
    }
    el.classList.remove('live');
    if (onLiveChange) onLiveChange(false, camState);
    if (liveEl) { liveEl.remove(); liveEl = null; }
  }
  function liveRebuild(plan, now) {
    if (!live || !plan || !world) return;
    clearTimeout(liveT);
    if (now) liveRebuildGo(plan); else liveT = setTimeout(() => liveRebuildGo(plan), 90);
  }
  function liveRebuildGo(plan) {
    const t0 = performance.now();
    world.rebuildCity(plan);
    world.setSim && world.setSim(false);
    world.setFogEnabled(false);
    // frame the whole plan the first time; afterwards keep whatever view you were working in
    if (liveFit !== plan.arena) { camState.zoom = plan.arena * 0.85; liveFit = plan.arena; }
    liveMs = performance.now() - t0;
    const stEl = el.querySelector('#atLiveMs');
    if (stEl) stEl.textContent = `${world.cover.length} COVER · ${liveMs.toFixed(1)}ms`;
  }
  // Drag to orbit · right-drag or shift-drag to pan · wheel to zoom. The capture layer sits
  // BEHIND the panel, so the controls stay clickable while the rest of the screen drives the cam.
  function bindLiveInput() {
    if (liveEl) return;
    const cap = document.createElement('div');
    cap.className = 'maplive';
    document.body.appendChild(cap);
    liveEl = cap;
    const C = camState;
    let drag = null;
    // ⚠ setPointerCapture throws if the pointer is already gone — never throw into the frame loop.
    cap.onpointerdown = (e) => { drag = { x: e.clientX, y: e.clientY, pan: e.button === 2 || e.shiftKey }; try { cap.setPointerCapture(e.pointerId); } catch {} };
    cap.onpointerup = (e) => { drag = null; try { cap.releasePointerCapture(e.pointerId); } catch {} };
    cap.oncontextmenu = (e) => e.preventDefault();
    cap.onpointermove = (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.x = e.clientX; drag.y = e.clientY;
      if (drag.pan) {
        const k = C.zoom / 420, cy = Math.cos(C.yaw), sy = Math.sin(C.yaw);
        C.x -= (dx * cy - dy * sy) * k; C.z -= (dx * sy + dy * cy) * k;
      } else { C.yaw -= dx * 0.006; C.pitch = Math.max(0.12, Math.min(1.52, C.pitch + dy * 0.005)); }
    };
    cap.onwheel = (e) => { e.preventDefault(); C.zoom = Math.max(40, Math.min(1400, C.zoom * (e.deltaY > 0 ? 1.12 : 0.89))); };
  }

  // ---- the 2D plan preview ---------------------------------------------------------------------
  function drawPlanPreview(cvs, plan) {
    const x = cvs.getContext('2d'); const S = cvs.width;
    x.clearRect(0, 0, S, S);
    x.fillStyle = '#0c0e14'; x.fillRect(0, 0, S, S);
    if (!plan.cells) {   // the flagship — stylized card
      x.fillStyle = '#ffd97a'; x.font = '800 15px Rajdhani,sans-serif'; x.textAlign = 'center';
      x.fillText('THE WHITE CITY', S / 2, S / 2 - 8);
      x.fillStyle = '#8b8577'; x.font = '9px Consolas,monospace';
      x.fillText('FLAGSHIP THEATER — HAND-BUILT', S / 2, S / 2 + 10);
      return;
    }
    // ⚠ Canvas 2D cannot read CSS tokens — every colour in here must be a literal.
    const N = plan.N, pad = 12, cs = (S - pad * 2) / N, gap = Math.max(2, cs * 0.1);
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const cell = plan.cells[r][c];
      const px = pad + c * cs, py = pad + r * cs;
      if (!cell) { x.fillStyle = '#181a20'; x.fillRect(px + gap / 2, py + gap / 2, cs - gap, cs - gap); continue; }
      if (cell.t === 'water') { x.fillStyle = ['#2a5a78', '#1d4560', '#0e2a40'][Math.min(2, (cell.d || 1) - 1)]; x.fillRect(px, py, cs, cs); continue; }
      if (cell.ref) continue;                                   // the anchor paints the whole footprint
      const fw = cell.fw || 1, fh = cell.fh || 1;
      x.fillStyle = (TILE_INFO[cell.t] ? TILE_INFO[cell.t].c : '#6a6458') + 'cc';
      x.fillRect(px + gap / 2, py + gap / 2, cs * fw - gap, cs * fh - gap);
      if (fw > 1 || fh > 1) {                                   // a multi-cell structure reads as ONE box
        x.strokeStyle = 'rgba(20,18,12,.6)'; x.lineWidth = 2;
        x.strokeRect(px + gap / 2, py + gap / 2, cs * fw - gap, cs * fh - gap);
      }
      x.fillStyle = 'rgba(0,0,0,.55)'; x.font = `700 ${Math.max(7, cs * 0.16)}px Consolas,monospace`; x.textAlign = 'center';
      x.fillText((cell.t[0] + (cell.v ?? '')).toUpperCase(), px + cs * fw / 2, py + cs * fh / 2 + 3);
      if (cell.lock) { x.fillStyle = '#f5b21a'; x.font = `${Math.max(8, cs * 0.2)}px sans-serif`; x.textAlign = 'left'; x.fillText('🔒', px + 2, py + cs * 0.24); }
      else if (cell.painted) { x.fillStyle = '#f5b21a'; x.fillRect(px + gap / 2, py + gap / 2, 4, 4); }
    }
    // THE ROAD GRAPH, drawn as the graph it is: thickness = class, absent = no road at all.
    if (plan.roads) {
      const W = [0, 1.4, 2.6, 4, 5.4], COL = [null, '#a08a5e', '#8d8676', '#b8ad93', '#e0d3ad'];
      const at = (i) => pad + i * cs;
      for (let r = 0; r <= N; r++) for (let c = 0; c < N; c++) {
        const k = plan.roads.h[r][c]; if (!k) continue;
        x.strokeStyle = COL[k]; x.lineWidth = W[k];
        x.beginPath(); x.moveTo(at(c), at(r)); x.lineTo(at(c + 1), at(r)); x.stroke();
      }
      for (let r = 0; r < N; r++) for (let c = 0; c <= N; c++) {
        const k = plan.roads.v[r][c]; if (!k) continue;
        x.strokeStyle = COL[k]; x.lineWidth = W[k];
        x.beginPath(); x.moveTo(at(c), at(r)); x.lineTo(at(c), at(r + 1)); x.stroke();
      }
    }
    x.fillStyle = '#ffd97a'; x.font = '800 12px Rajdhani,sans-serif'; x.textAlign = 'left';
    x.fillText(plan.name.toUpperCase(), pad, S - 4);
  }

  // ---- solo file in/out ------------------------------------------------------------------------
  function download(name, obj) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' }));
    a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  function currentAuthored() {
    return { fmt: 'atlas-1', cityId: st.sel, seed: st.seed, N: st.N || 0, waterCols: st.waterCols, cell: st.cell || 0, popType: st.popType || null, humanH: st.humanH || 0, edits: st.edits };
  }
  function importAuthored(o) {
    if (o.cityId == null || !o.edits) throw new Error('not a plan');
    mapEdit(() => { st.sel = o.cityId; st.seed = o.seed || 1; st.N = o.N || 0; st.waterCols = o.waterCols; st.cell = o.cell || 0; st.popType = o.popType || null; st.humanH = o.humanH || 0; st.edits = { ...o.edits }; });
  }

  // ---- the panel -------------------------------------------------------------------------------
  const cities = cityList();
  const FILTERS = ['ALL', 'Military', 'Political', 'Industrial', 'Company', 'Seaport', 'Resort', 'Mining', 'Educational', 'Temple'];
  function render() {
    const q = st.q.toLowerCase();
    let L = cities.filter(c => (st.type === 'ALL' || c.types.includes(st.type)) && (!q || (c.name + ' ' + c.country).toLowerCase().includes(q)));
    const shown = L.slice(0, 28);
    const selCity = st.sel >= 0 ? cities[st.sel] : null;
    const plan = st.sel < 0 ? thresholdPlan()
      : applyPlanEdits(generatePlan(selCity, st.seed, { N: st.N || undefined, waterCols: st.waterCols, cell: st.cell, popType: st.popType, humanH: st.humanH || undefined }), st.edits);
    el.innerHTML = `<div class="obox" style="width:min(940px,96vw)">
      <div class="rkhead"><div class="n9" style="background:#2a5a78">🗺</div>
        <div class="rt"><b>${solo ? 'ATLAS — CITY GENERATOR' : 'CITY ATLAS — THEATER SELECT'}</b><span>the world sheet · ${cities.length} registered cities</span></div>
        <div class="rkmeta">TILES: ${Object.keys(TILE_INFO).length} TYPES · 2–3 VARIANTS<br/>CELL ${plan.cell || CELL}u · ${plan.N}×${plan.N} · ${plan.arena * 2}u ACROSS</div></div>
      <div class="atwrap">
        <div class="atlist">
          <input id="atQ" placeholder="QUERY: city or country…" value="${esc(st.q)}">
          <div class="atchips">${FILTERS.map(t => `<span class="c3${st.type === t ? ' on' : ''}" data-at="${t}">${t.toUpperCase()}</span>`).join('')}</div>
          <div class="atrows">
            <div class="atrow${st.sel < 0 ? ' sel' : ''}" data-ci="-1"><div><div class="an3">THE WHITE CITY <span style="font-size:var(--t-tiny);color:var(--gold)">★ FLAGSHIP</span></div><div class="ac3">Threshold Treaty Zone — the hand-built original</div></div><div class="apop">CITY<br/>SAFE 62</div></div>
            ${shown.map(c => `<div class="atrow${st.sel === c.id ? ' sel' : ''}" data-ci="${c.id}">
              <div><div class="an3">${esc(c.name)}</div><div class="ac3">${esc(c.country)} · ${esc(c.types.join(' / ') || '—')}</div>
              <div class="atags">${c.types.map(t => `<i style="background:${(TILE_INFO[t.toLowerCase()] || {}).c || 'var(--text-6)'}" title="${esc(t)}"></i>`).join('')}</div></div>
              <div class="apop">${esc(c.popType.toUpperCase())}<br/>CRIME ${c.crime}</div>
            </div>`).join('')}
            ${L.length > 28 ? `<div class="ac3" style="text-align:center;padding:4px">… ${L.length - 28} more — refine the query</div>` : ''}
          </div>
        </div>
        <div class="atprev">
          <canvas id="atCv" width="260" height="260"></canvas>
          <div class="atmeta" id="atMeta"></div>
          <div class="atbtns">
            <div class="atpal" id="atPal"></div>
            <div class="atsize" id="atSize"></div>
            <div class="atpalhint">Click the map to paint · <b>🔒 LOCK</b> freezes a cell against rerolls · painted cells survive everything</div>
            <div class="atstep">
              <span>GRID</span>
              <button class="atsm" data-step="N-1">−</button><b id="atNv">${plan.N}×${plan.N}</b><button class="atsm" data-step="N1">+</button>
              <span style="margin-left:10px">COAST</span>
              <button class="atsm" data-step="W-1">−</button><b>${plan.waterCols} COL</b><button class="atsm" data-step="W1">+</button>
            </div>
            <div class="atstep">
              <span>CELL</span>
              <button class="atsm" data-step="C-8">−</button><b>${plan.cell}u</b><button class="atsm" data-step="C8">+</button>
              <span class="atdim">${plan.arena * 2}u ACROSS · ${(plan.arena * 2 * 0.19).toFixed(0)}m</span>
            </div>
            <div class="atstep">
              <span>PEOPLE</span>
              <button class="atsm" data-step="M-1.6">−</button><b>${(((plan.metric && plan.metric.humanH) || 9.6) * 0.1875).toFixed(1)}m</b><button class="atsm" data-step="M1.6">+</button>
              <span class="atdim">doors · storeys · cars fit them</span>
            </div>
            <div class="atpop">${POP_TYPES.map(p => `<span class="c3${plan.popType === p ? ' on' : ''}" data-pop="${esc(p)}">${esc(p.toUpperCase())}</span>`).join('')}</div>
            <div class="atval">${validatePlan(plan).map(v => `<div class="${v.bad ? 'vbad' : 'vok'}">${v.bad ? '⚠' : '✓'} ${esc(v.t)}</div>`).join('')}</div>
            <div class="atrow2">
              <button class="odone oghost" id="atSeed">⟳ SEED ${st.seed}</button>
              <button class="odone oghost" id="atUndo" ${st.hist && st.hist.length ? '' : 'disabled'}>↶ UNDO${st.hist && st.hist.length ? ' ' + st.hist.length : ''}</button>
            </div>
            <div class="atrow2">
              <button class="odone oghost" id="atClr">✕ ${Object.keys(st.edits).length} EDIT${Object.keys(st.edits).length === 1 ? '' : 'S'}</button>
              <button class="odone oghost" id="atLay">💾 LAYOUTS ${Object.keys(layouts()).length}</button>
            </div>
            ${solo ? `
            <div class="atrow2">
              <button class="odone" id="atExp">⇩ EXPORT .JSON</button>
              <button class="odone oghost" id="atImp">⇪ IMPORT</button>
            </div>` : `
            <button class="odone${live ? ' on' : ''}" id="atLive">${live ? '⏹ EXIT LIVE 3D' : '🎥 BUILD IT — LIVE 3D'}</button>
            ${live ? `<div class="atpalhint" id="atLiveMs">building…</div><div class="atpalhint">drag orbit · right-drag or shift-drag pan · wheel zoom</div>` : ''}
            <button class="odone" id="atSet">📍 SET AS THEATER</button>
            <div class="atrow2">
              <button class="odone oghost" id="atGal">🧱 PROVING GROUND</button>
              <button class="odone oghost" id="atClose">CLOSE</button>
            </div>`}
            ${solo && live ? `<div class="atpalhint" id="atLiveMs">building…</div><div class="atpalhint">drag orbit · right-drag or shift-drag pan · wheel zoom</div>` : ''}
          </div>
        </div>
      </div>
    </div>`;
    drawPlanPreview(el.querySelector('#atCv'), plan);
    el.querySelector('#atMeta').innerHTML = st.sel < 0
      ? `<b>THE WHITE CITY</b> — 5×5 flagship grid<br/>Four districts + harbor + the bridge<br/>Hand-tuned; the planner's benchmark`
      : `<b>${esc(selCity.name.toUpperCase())}</b>, ${esc(selCity.country)}<br/>${esc(popLabel(selCity.popType, selCity.pop))}<br/>TYPES: ${esc(selCity.types.join(' · ') || 'GENERAL')}<br/>CRIME ${selCity.crime} · SAFETY ${selCity.safety} · GRID ${plan.N}×${plan.N}<br/>POLICE RESPONSE ~${Math.round(Math.max(5, Math.min(24, 26 - selCity.safety * 0.25)))}s ${selCity.safety >= 60 ? '· RAPID' : selCity.safety <= 30 ? '· SLOW' : ''}<br/>${esc(climateLine(selCity.climate))}`;
    const $ = (s) => el.querySelector(s);
    $('#atQ').oninput = (e) => { st.q = e.target.value; render(); setTimeout(() => { const i = $('#atQ'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 0); };
    el.querySelectorAll('[data-at]').forEach(ch => ch.onclick = () => { st.type = ch.dataset.at; render(); });
    el.querySelectorAll('[data-ci]').forEach(row => row.onclick = () => { st.sel = +row.dataset.ci; st.seed = 1; render(); });
    // --- the tile palette: derived from TILE_INFO, so a new tile type shows up here for free.
    const pal = $('#atPal');
    if (pal) {
      pal.innerHTML = Object.keys(TILE_INFO).map(t => {
        const Lz = TILE_SIZES[t];
        const tip = Lz ? ` — ${Lz.length} SIZES: ${Lz.map(z => z.f[0] + '×' + z.f[1]).join(' / ')}` : '';
        return `<span class="atsw${st.paint === t ? ' on' : ''}" data-paint="${t}" title="${esc(TILE_INFO[t].label)}${tip}" style="--sw:${TILE_INFO[t].c}">${Lz ? '<i>▦</i>' : ''}</span>`;
      }).join('')
        + `<span class="atsw${st.paint === 'water' ? ' on' : ''}" data-paint="water" title="WATER — paint the sea" style="--sw:#2a5a78"></span>`
        + `<span class="atsw era${st.paint === 'LOCK' ? ' on' : ''}" data-paint="LOCK" title="LOCK — freeze this cell against rerolls">🔒</span>`
        + `<span class="atsw era${st.paint === 'ERASE' ? ' on' : ''}" data-paint="ERASE" title="Erase — hand the cell back to the generator">✕</span>`;
      pal.querySelectorAll('[data-paint]').forEach(sw => sw.onclick = () => {
        st.paint = sw.dataset.paint;
        const Lz = TILE_SIZES[st.paint];                       // default to the middle rung
        st.size = Lz ? Math.floor((Lz.length - 1) / 2) : 0;
        render();
      });
    }
    // --- THE SIZE PICKER — only for a type that HAS a ladder; a control that lies is worse.
    const szEl = $('#atSize');
    if (szEl) {
      // WATER reuses the size row as its DEPTH row — the painted edit's `sz` becomes the tier
      const Lz = st.paint === 'water'
        ? [{ n: 'SHALLOWS', f: [1, 1] }, { n: 'THE DEEP', f: [1, 1] }, { n: 'THE TRENCH', f: [1, 1] }]
        : TILE_SIZES[st.paint];
      szEl.innerHTML = !Lz ? '' : `<span>${st.paint === 'water' ? 'DEPTH' : 'SIZE'}</span>` + Lz.map((z, i) =>
        `<span class="c3${(st.size || 0) === i ? ' on' : ''}" data-size="${i}" title="${z.f[0]}×${z.f[1]} CELLS">${esc(z.n)}</span>`).join('');
      szEl.querySelectorAll('[data-size]').forEach(b2 => b2.onclick = () => { st.size = +b2.dataset.size; render(); });
    }
    // --- click the preview to paint that cell
    const cv = $('#atCv');
    if (cv && st.sel >= 0 && plan.cells) {
      cv.style.cursor = 'crosshair';
      cv.onclick = (ev) => {
        const b = cv.getBoundingClientRect();
        const S = cv.width, pad = 12, N = plan.N, cs = (S - pad * 2) / N;
        const px = (ev.clientX - b.left) * (S / b.width), py = (ev.clientY - b.top) * (S / b.height);
        const c = Math.floor((px - pad) / cs), r = Math.floor((py - pad) / cs);
        if (r < 0 || c < 0 || r >= N || c >= N) return;
        paintCell(plan, r, c); render();
      };
    }
    $('#atClr').onclick = () => { mapEdit(() => { st.edits = {}; }); render(); };
    $('#atSeed').onclick = () => { mapEdit(() => { st.seed++; }); render(); };
    $('#atUndo').onclick = () => { if (mapUndo()) render(); };
    // GRID RESIZE + COASTLINE — through the plan's override channel; painted cells re-apply on top.
    el.querySelectorAll('[data-step]').forEach(b => b.onclick = () => {
      const d = b.dataset.step, k = d[0], dv = +d.slice(1);
      mapEdit(() => {
        if (k === 'N') st.N = Math.max(2, Math.min(9, (st.N || plan.N) + dv));
        else if (k === 'M') st.humanH = Math.max(4.8, Math.min(19.2, (st.humanH || 9.6) + dv));
        else if (k === 'C') st.cell = Math.max(CELL_RANGE[0], Math.min(CELL_RANGE[1], (st.cell || plan.cell) + dv));
        else st.waterCols = Math.max(0, Math.min(3, (st.waterCols != null ? st.waterCols : plan.waterCols) + dv));
      });
      render();
    });
    // POPULATION TYPE is a generator input — the control that authors a hamlet on any row.
    el.querySelectorAll('[data-pop]').forEach(b => b.onclick = () => {
      mapEdit(() => { st.popType = b.dataset.pop === (selCity && selCity.popType) ? null : b.dataset.pop; st.N = 0; });
      render();
    });
    if (!solo) {
      $('#atLive').onclick = () => { if (live) liveOff(); else liveOn(plan); render(); };
      $('#atSet').onclick = () => {
        const t = st.sel < 0 ? { flagship: true, seed: 1 }
          : { cityId: st.sel, seed: st.seed, edits: { ...st.edits }, N: st.N || 0, waterCols: st.waterCols, cell: st.cell || 0, popType: st.popType || null, humanH: st.humanH || 0 };
        const label = st.sel < 0 ? 'THE WHITE CITY' : cities[st.sel].name.toUpperCase();
        if (onTheater) onTheater(t, label);
        el.style.display = 'none';
      };
      $('#atGal').onclick = () => { el.style.display = 'none'; if (onProvingGround) onProvingGround(); };
      $('#atClose').onclick = () => { el.style.display = 'none'; liveOff(); };
    } else {
      $('#atExp').onclick = () => {
        const name = (st.sel < 0 ? 'white-city' : cities[st.sel].name.toLowerCase().replace(/[^a-z0-9]+/g, '-')) + '-atlas.json';
        download(name, currentAuthored());
        feed('Plan exported — ' + name, '#7fb0d0');
      };
      $('#atImp').onclick = () => {
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = '.json,application/json';
        inp.onchange = () => {
          const f = inp.files && inp.files[0]; if (!f) return;
          f.text().then((txt) => {
            try { importAuthored(JSON.parse(txt)); render(); feed('Plan imported — ' + f.name, '#7fb0d0'); }
            catch (err) { feed('That is not a plan JSON — ' + err.message, '#e05a4a'); }
          });
        };
        inp.click();
      };
    }
    $('#atLay').onclick = () => showLayouts();
    if (live) liveRebuild(plan);      // authoring IS the preview — every edit rebuilds
    // Ctrl+Z anywhere in the atlas — the shortcut people try first
    el.onkeydown = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (mapUndo()) render(); } };
    el.tabIndex = -1;
  }

  // ---- NAMED LAYOUTS + PLAN JSON ---------------------------------------------------------------
  // A layout is the whole authored state — city, seed, grid, coastline and every painted cell —
  // saved under a name; the same object is what the JSON box and the solo file buttons move around.
  let layoutEl = null;
  function showLayouts() {
    const cur = currentAuthored();
    const lel = layoutEl || (layoutEl = (() => { const d = document.createElement('div'); d.className = 'lswovl'; d.id = 'hLayouts'; document.body.appendChild(d); return d; })());
    const draw = () => {
      const names = Object.keys(layouts());
      lel.innerHTML = `<div class="obox" style="width:min(620px,94vw)">
        <div class="rkhead"><div class="n9" style="background:#5a4a2a">💾</div>
          <div class="rt"><b>SAVED LAYOUTS</b><span>name a map · reload it · move it between machines</span></div></div>
        <div class="lyrows">${names.length ? names.map(n => `<div class="lyrow"><div><b>${esc(n)}</b><span>${esc((cities[layouts()[n].cityId] || {}).name || '—')} · SEED ${layouts()[n].seed} · ${Object.keys(layouts()[n].edits || {}).length} EDITS</span></div>
          <div><button class="odone oghost lysm" data-load="${esc(n)}">LOAD</button><button class="odone oghost lysm" data-del="${esc(n)}">✕</button></div></div>`).join('') : '<div class="ac3" style="padding:10px;text-align:center">No layouts saved yet.</div>'}</div>
        <div class="lyname"><input id="lyN" placeholder="name this layout…"><button class="odone" id="lySave">SAVE CURRENT</button></div>
        <div class="lyjson"><div class="lylbl">PLAN JSON — copy it out, paste one in</div>
          <textarea id="lyJ" spellcheck="false">${esc(JSON.stringify(cur))}</textarea>
          <div class="atrow2"><button class="odone oghost" id="lyCopy">📋 COPY</button><button class="odone oghost" id="lyImp">⇩ IMPORT PASTED</button></div></div>
        <button class="odone oghost" id="lyClose">CLOSE</button>
      </div>`;
      const $ = (s) => lel.querySelector(s);
      lel.querySelectorAll('[data-load]').forEach(b => b.onclick = () => {
        const o = layouts()[b.dataset.load]; if (!o) return;
        mapEdit(() => { st.sel = o.cityId; st.seed = o.seed; st.N = o.N || 0; st.waterCols = o.waterCols; st.cell = o.cell || 0; st.popType = o.popType || null; st.edits = { ...(o.edits || {}) }; });
        lel.style.display = 'none'; render();
      });
      lel.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { const o = layouts(); delete o[b.dataset.del]; saveLayouts(o); draw(); });
      $('#lySave').onclick = () => {
        const n = ($('#lyN').value || '').trim(); if (!n) return;
        const o = layouts(); o[n] = cur; saveLayouts(o); draw(); render();
        feed('Layout saved — ' + n.toUpperCase(), '#7fb0d0');
      };
      $('#lyCopy').onclick = () => { const t = $('#lyJ'); t.select(); try { document.execCommand('copy'); feed('Plan JSON copied', '#7fb0d0'); } catch {} };
      $('#lyImp').onclick = () => {
        try {
          importAuthored(JSON.parse($('#lyJ').value));
          lel.style.display = 'none'; render(); feed('Plan imported', '#7fb0d0');
        } catch (err) { feed('That is not a plan JSON — ' + err.message, '#e05a4a'); }
      };
      $('#lyClose').onclick = () => { lel.style.display = 'none'; };
    };
    draw();
    lel.style.display = 'flex';
  }

  // ---- the mount API ---------------------------------------------------------------------------
  const api = {
    el,
    cam: camState,
    get live() { return live; },
    open() {
      render();
      el.style.display = 'flex';
      el.focus();
      if (solo && !live) {
        const selCity = st.sel >= 0 ? cities[st.sel] : null;
        const plan = st.sel < 0 ? thresholdPlan()
          : applyPlanEdits(generatePlan(selCity, st.seed, { N: st.N || undefined, waterCols: st.waterCols, cell: st.cell, popType: st.popType, humanH: st.humanH || undefined }), st.edits);
        liveOn(plan);
        render();
      }
    },
    close() { el.style.display = 'none'; liveOff(); if (layoutEl) layoutEl.style.display = 'none'; },
    destroy() { api.close(); el.remove(); if (layoutEl) { layoutEl.remove(); layoutEl = null; } if (liveEl) { liveEl.remove(); liveEl = null; } },
  };
  return api;
}
