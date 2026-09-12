// THE KMK 9 POST-FIGHT BROADCAST — extracted from hud.js (code review item 4).
//
// Methods of HUD, installed onto HUD.prototype. ⚠ THE TV SKIPS '#'-TOKEN FRAMES: a clip slot
// holds a token until its async JPEG blob lands, and drawImage of an incomplete Image is a
// spec-level no-op. Never make the encode synchronous again (the broadcast encode law).

import { esc } from './hudUtil.js';
import { llmPunchUp, money, tapeRows, titleCase, writeBroadcast } from '../data/news.js';
import {hydrateClipFrames} from './broadcast-frames.js';

export const BroadcastMixin = {
  showEndScreen(result, g) {
    globalThis.document?.body?.classList.add('report-open');
    if (this.game && this.game.touch) this.game.touch.show(false);   // thumbs off the report — rematch re-shows them
    if (g.matchReport) { this._showBroadcast(result, g); return; }
    const p = g.player;
    const stats = [['Score', p.score], ['KOs', p.kills], ['Level', p.level]];
    if (result.wave != null) stats.unshift(['Wave', result.wave]);
    this.el.end.classList.remove('news');
    this.el.end.innerHTML = `
      <div class="et" style="color:${result.win ? 'var(--good)' : 'var(--danger-2)'}">${result.title}</div>
      <div class="el">${(result.lines || []).join('<br/>')}</div>
      <div class="stats">${stats.map(s => `<div class="stat"><div class="sv">${s[1]}</div><div class="sl">${s[0]}</div></div>`).join('')}</div>
      <div class="btns"><button id="eRematch">${g._careerOffer ? 'CONTINUE ▸ THE CIRCUIT' : 'Rematch'}</button><button class="ghost" id="eMenu">Main Menu</button></div>`;
    this.el.end.style.display = 'flex';
    this.el.end.querySelector('#eRematch').onclick = () => { this.hideEndScreen(); if (g._careerOffer && this.onCareerContinue) this.onCareerContinue(); else if (this.onRematch) this.onRematch(); };
    this.el.end.querySelector('#eMenu').onclick = () => { this.hideEndScreen(); if (this.onMenu) this.onMenu(); };
  },

  _showBroadcast(result, g) {
    const rep = g.matchReport;
    let b;
    try { b = writeBroadcast(rep); } catch (e) { console.error('newsroom', e); g.matchReport = null; this.showEndScreen(result, g); return; }
    const tape = tapeRows(rep);
    const winColor = result.win ? '#1d7a3a' : '#8a1d24';
    const pchip = (s) => s ? `<span style="display:inline-flex;align-items:center;gap:6px;color:${esc(s.colors.accent)}"><i style="width:9px;height:9px;border-radius:50%;background:${esc(s.colors.accent)};box-shadow:0 0 8px ${esc(s.colors.accent)}"></i>${esc(s.name)}</span>` : '—';
    let tapeHtml = '';
    if (tape.cols.length === 2 && !tape.ranked) {
      const hi = (lb, av, bv) => {
        const a = parseFloat(av), b2 = parseFloat(bv);
        if (isNaN(a) || isNaN(b2) || a === b2) return [0, 0];
        const lower = /TAKEN/.test(lb);                       // damage TAKEN: less is the flex
        return (a > b2) !== lower ? [1, 0] : [0, 1];
      };
      tapeHtml = `<table class="tape"><tr><th class="lb"></th><th>${pchip(tape.cols[0])}</th><th>${pchip(tape.cols[1])}</th></tr>
        ${tape.rows.map(r => { const [wa, wb] = hi(r[0], r[1], r[2]); return `<tr><td class="lb">${esc(r[0])}</td><td class="${wa ? 'win' : ''}">${esc(r[1])}</td><td class="${wb ? 'win' : ''}">${esc(r[2])}</td></tr>`; }).join('')}</table>`;
    } else if (tape.ranked) {
      tapeHtml = `<table class="tape">${tape.rows.map((r, i) => `<tr><td class="lb">${i + 1}. ${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('')}</table>`;
    } else if (tape.cols.length === 1) {
      tapeHtml = `<table class="tape"><tr><th class="lb"></th><th>${pchip(tape.cols[0])}</th></tr>${tape.rows.map(r => `<tr><td class="lb">${esc(r[0])}</td><td class="win">${esc(r[1])}</td></tr>`).join('')}</table>`;
    }
    for (const L of b.script) L.label = L.who === 'ANCHOR' ? titleCase(b.anchorName || 'Anchor') : titleCase(L.who);   // the desk has a name
    const c = rep.city;
    const cityRows = [
      ['Civilians treated', c.civs], ['Structures down', c.blocks], ['Vehicles destroyed', c.cars], ['Impact craters', c.craters],
    ].map(([l, v]) => `<div class="cityrow"><span>${l}</span><b>${v}</b></div>`).join('');
    const tickerHtml = b.ticker.map(t => `<b>◆</b><span>${esc(t)}</span>`).join('');
    this.el.end.classList.add('news');
    this.el.end.innerHTML = `
    <div class="nwrap">
      <div class="nmast">
        <div class="n9">9</div>
        <div class="nb"><b>KMK ACTION NEWS</b><span>First on the scene</span></div>
        <div class="nlive"><i></i> ${esc(b.clockStr)} · ${esc(b.district)}</div>
      </div>
      <div class="nbody">
        <div class="ncl">
          <div class="tvset">
            <div class="tvscreen"><canvas id="nTv" width="640" height="360"></canvas><div class="tvscan"></div><div class="tvglare"></div><div class="tvtag" id="nTvTag">SIGNAL</div></div>
            <div class="tvchin"><span class="tvbrand">MK·TRINITY</span><span class="tvgrill"></span><span class="tvled"></span></div>
          <div class="tvprog" id="nTvProg"></div>
          </div>
          <div class="tvcap" id="nTvCap">Field footage — KMK 9</div>
          <div class="ncrew">Desk: ${esc(titleCase(b.anchorName || 'KMK 9'))} · Field: ${esc(titleCase(rep.reporter))} · Camera: ${esc(rep.operator)}</div>
          <div class="btns"><button id="eRematch">${g.modeId === 'tournament' ? 'CONTINUE ▸ BRACKET' : g._careerOffer ? 'CONTINUE ▸ THE CIRCUIT' : 'Rematch'}</button><button class="ghost" id="eMenu">Main Menu</button></div>
        </div>
        <div class="ncr">
          <div class="nkickrow">
            <span class="nkick">${esc(b.kicker)}</span>
            <span class="nkick" style="background:${winColor}">${esc(result.title)}</span>
            <span class="sat" id="nSat"><i></i> Satellite desk update</span>
          </div>
          <div class="nhead" id="nHead">${esc(b.headline)}</div>
          <div class="nsub">${rep.operation ? 'Operation report' : rep.arena ? 'Arena report' : 'Special report'} · <b>${esc(b.district)}</b> · this ${esc(b.timeWord)}</div>
          ${result.operation?`<section class="board" aria-label="Operation outcome"><div class="bh">${esc(result.title)} <em>MISSION RECEIPT</em></div>${(result.lines||[]).map(line=>`<p style="padding:0 14px;line-height:1.5">${esc(line)}</p>`).join('')}</section>`:''}
          <div class="nscript" id="nScript"></div>
          <div class="wcard" id="nWit" style="display:none"></div>
          <div class="nboards${rep.arena ? ' arena-report' : ''}">
            <div class="board"><div class="bh">Tale of the tape <em>OFFICIAL</em></div>${tapeHtml}</div>
            ${rep.arena ? '' : `<div class="board"><div class="bh">City desk <em>DAMAGE ASSESSMENT</em></div>${cityRows}
              <div class="citysum"><span class="cl">Early estimate</span><span class="cv">${esc(money(b.est))}</span></div>
            </div>`}
          </div>
        </div>
      </div>
      <div class="nticker"><div class="tkbrand">KMK 9</div><div class="tkwrap"><div class="tkx">${tickerHtml}${tickerHtml}</div></div></div>
    </div>`;
    this.el.end.style.display = 'flex';
    const tourn = g.modeId === 'tournament', circ = !!g._careerOffer;
    this.el.end.querySelector('#eRematch').onclick = () => {
      this.hideEndScreen();
      if (tourn && this.onBracketContinue) this.onBracketContinue();
      else if (circ && this.onCareerContinue) this.onCareerContinue();
      else if (this.onRematch) this.onRematch();
    };
    this.el.end.querySelector('#eMenu').onclick = () => { this.hideEndScreen(); if (this.onMenu) this.onMenu(); };
    try { this.game.audio.sting(); } catch {}
    this._startTV(rep);
    // (9) SKIP THE TYPING — click/tap the report and the whole script lands at once.
    const sc0 = this.el.end.querySelector('#nScript');
    if (sc0) sc0.style.cursor = 'pointer';
    this.el.end.onclick = (ev) => { if (ev.target.tagName === 'BUTTON') return; this._skipType = true; };
    this._skipType = false;
    this._typeScript(b.script, () => {
      const w = this.el.end.querySelector('#nWit'), sc = this.el.end.querySelector('#nScript');
      if (w && b.witness) {
        w.style.display = 'block'; w.style.marginTop = '4px';
        w.innerHTML = `${esc(b.witness.quote)}<b>— ${esc(b.witness.attrib)}</b>`;
        if (sc) sc.appendChild(w);   // lives INSIDE the script flow — can never collide with a typing line
      }
    });
    // the dynamic layer: a LAN language model rewrites the desk copy when reachable (offline-safe)
    const runId = this._tvRun;
    llmPunchUp(rep, b).then((out) => {
      if (!out || this._tvRun !== runId || this.el.end.style.display === 'none') return;
      const sat = this.el.end.querySelector('#nSat'), head = this.el.end.querySelector('#nHead');
      if (sat) sat.style.display = 'inline-flex';
      if (head && out.headline) { head.style.transition = 'opacity .18s'; head.style.opacity = '0'; setTimeout(() => { head.textContent = out.headline; head.style.opacity = '1'; }, 190); }
      const sc = this.el.end.querySelector('#nScript');
      if (sc && out.anchor) for (const line of out.anchor) {
        const d = document.createElement('div'); d.className = 'sline';
        d.innerHTML = `<span class="swho" style="background:var(--info)">DESK UPDATE</span>`;
        d.appendChild(document.createTextNode(line));
        sc.appendChild(d);
      }
      const w = this.el.end.querySelector('#nWit');
      if (w && out.witnessQuote) { w.style.display = 'block'; w.innerHTML = `${esc(out.witnessQuote)}<b>— witness statement, via the satellite desk</b>`; }
      try { this.game.audio.zap(980); } catch {}
    }).catch(() => {});
  },

  _startTV(rep) {
    this._stopTV();
    const run = this._tvRun = (this._tvRun || 0) + 1;
    const cvs = this.el.end.querySelector('#nTv'); if (!cvs) return;
    const x = cvs.getContext('2d');
    const tag = this.el.end.querySelector('#nTvTag'), cap = this.el.end.querySelector('#nTvCap');
    const prog = this.el.end.querySelector('#nTvProg');
    const clips = rep.clips || [];
    let progN = -1;
    const syncProg = () => {   // one segment per clip; the live one fills as the playhead moves
      if (!prog) return;
      if (clips.length !== progN) { progN = clips.length; prog.innerHTML = clips.map(cl => `<i class="${cl.slow ? 'slow' : ''}"><b></b></i>`).join(''); }
    };
    syncProg();
    // static noise tile, redrawn with random offsets — reads as analog snow
    const noise = document.createElement('canvas'); noise.width = 160; noise.height = 90;
    const nx = noise.getContext('2d'); const nd = nx.createImageData(160, 90);
    for (let i = 0; i < nd.data.length; i += 4) { const v = (Math.random() * 255) | 0; nd.data[i] = nd.data[i + 1] = nd.data[i + 2] = v; nd.data[i + 3] = 255; }
    nx.putImageData(nd, 0, 0);
    const drawStatic = () => {
      x.imageSmoothingEnabled = false;
      x.drawImage(noise, (Math.random() * -40) | 0, (Math.random() * -30) | 0, 220, 130, 0, 0, 640, 360);
      x.imageSmoothingEnabled = true;
      x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(0, 0, 640, 360);
    };
    const load = (clip) => hydrateClipFrames(clip);
    let ci = 0, mode = clips.length ? 'static' : 'nosignal', t0 = performance.now(), prev = null;
    let ph = 0, prevT = 0, wasSlow = false;   // float playhead — KO clips glide into slow motion at the moment of impact
    if (!clips.length) { tag.textContent = 'NO SIGNAL'; cap.innerHTML = 'Awaiting crew footage — <b>KMK 9</b>'; }
    const begin = (i) => {
      ci = i % clips.length; mode = 'static'; t0 = performance.now();
      if (prev && prev !== clips[ci]) { prev._imgs = null; prev._imageUrls=null; prev._ready = null; }   // keep one clip decoded at a time
      prev = clips[ci];
      load(clips[ci]);
      try { if (this.el.end.style.display !== 'none') this.game.audio.staticBurst(0.22); } catch {}
      tag.textContent = `REPLAY ${ci + 1}/${clips.length}`; tag.classList.remove('slow'); wasSlow = false;
      cap.innerHTML = `<b>${esc(clips[ci].title)}</b> · T+${esc(clips[ci].tLabel)} · cam ${esc(clips[ci].shotBy)}`;
    };
    const loop = (now) => {
      if (this._tvRun !== run || !cvs.isConnected) return;
      if(clips[ci]?._dead){
        const next=clips.findIndex(cl=>!cl._dead&&cl.frames.some(u=>u&&u[0]!=='#'));
        if(next<0)mode='nosignal';else begin(next);
      }
      if(clips[ci]&&!clips[ci]._dead)load(clips[ci]);
      if (mode === 'nosignal') {
        drawStatic();
        const available=clips.findIndex(cl=>!cl._dead&&cl.frames.some(u=>u&&u[0]!=='#'));
        if (available>=0) begin(available);
      } else if (mode === 'static') {
        drawStatic();
        const clip = clips[ci];
        const first=clip?._imgs?.findIndex(im=>im?.complete&&im.naturalWidth)||0;
        if (now - t0 > 340 && first>=0 && clip?._imgs?.[first]?.naturalWidth) { mode = 'play'; ph = first; prevT = now; wasSlow = false; }
      } else {
        const clip = clips[ci];
        // slow-motion window: the exact moment of a KO / massive hit crawls at 0.38×, then back to speed
        const slowNow = !!(clip.slow && ph >= clip.slowFrom && ph <= clip.slowTo);
        const rate = slowNow ? 0.38 : 1;
        ph += (Math.min(now - prevT, 100) / 1000) * clip.fps * rate; prevT = now;
        syncProg();
        if (prog) { const segs = prog.children; for (let s = 0; s < segs.length; s++) { const bfill = segs[s].firstChild; if (bfill) bfill.style.width = s < ci ? '100%' : s === ci ? Math.min(100, (ph / clip.frames.length) * 100) + '%' : '0%'; } }
        if (slowNow !== wasSlow) {
          wasSlow = slowNow;
          tag.textContent = slowNow ? 'SLO-MO ▶' : `REPLAY ${ci + 1}/${clips.length}`;
          tag.classList.toggle('slow', slowNow);
        }
        const fi = Math.floor(ph);
        if (fi >= clip.frames.length) { begin(ci + 1); }
        else {
          const im = clip._imgs[fi];
          if (im && im.complete && im.naturalWidth) x.drawImage(im, 0, 0, 640, 360);
        }
      }
      this._tvRaf = requestAnimationFrame(loop);
    };
    if (clips.length) begin(0);
    this._tvRaf = requestAnimationFrame(loop);
  },
};
