// THRESHOLD — THE OPENING DIRECTOR. Every real match cold-opens like a show: the COUNTRY names
// itself, the CITY introduces its numbers, and then ONE OF TEN cinematic openers runs — a case
// file typing itself out, the KMK 9 desk cutting in with YOUR OWN footage from the last match,
// a satellite pass, the sports desk's tale of the tape, the response ladder telling you exactly
// what the state will send if you cross the line. Robert's ruling (2026-07-24): country → city →
// population → the slow cinematic; ten variants, dynamically chosen; leverage the real data —
// the sheets, the LeFevre scale, the book, the clips. Everything here reads LIVE data so it can
// never lie, everything is skippable on any key, and Options owns the dial (FULL / QUICK / OFF).
//
// Testable by construction: playOpening(..., { manual: true }) returns a handle and never
// touches rAF — the verifier steps it by hand. The camera rides game.mapCam (honoured by
// game.update while !running), the same channel the map maker's live mode uses.
import { countryOf } from '../data/countries.js';
import { climateLine } from '../data/climate.js';
import { snapshotTable, championId, recentIncidents } from '../data/rankings.js';
import { ladderGatesFor } from './police.js';
import { ROSTER } from '../data/characters.js';
import { heroStats } from './hud.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const flagOf = (code) => {
  const c = String(code || '').toUpperCase();
  if (c.length !== 2 || !/^[A-Z]{2}$/.test(c)) return '▦';
  return String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65, 0x1F1E6 + c.charCodeAt(1) - 65);
};
const fmtPop = (n) => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'K' : String(n || '—');

export const OPENING_NAMES = ['casefile', 'broadcast', 'flyover', 'teletype', 'ladder', 'satellite', 'tape', 'siren', 'freeze', 'ledger'];

export function playOpening(game, hud, plan, opts = {}, onDone) {
  const audio = game.audio, C = countryOf(plan.country) || {};
  const p1 = game.player, def = p1 ? p1.def : null;
  const A = plan.arena || 240;
  const variant = opts.variant != null ? opts.variant : (Math.random() * OPENING_NAMES.length) | 0;

  // ---- the stage ----
  // ONE director at a time: a second invocation (rematch spam, tests) must retire the first
  // through its own finish path, or two rAF loops fight over game.running and the camera.
  const prev = document.getElementById('opCine');
  if (prev) { try { prev._finish ? prev._finish() : prev.remove(); } catch (e) {} prev.remove(); }
  const el = document.createElement('div');
  el.id = 'opCine';
  el.innerHTML = `<div class="opbar top"></div><div class="opstage"></div><div class="opbar bot"></div>
    <div class="opskip">ANY KEY TO SKIP</div>`;
  document.body.appendChild(el);
  const stage = el.querySelector('.opstage');

  // the director owns the camera while the sim is held
  const wasRunning = game.running;
  game.running = false;
  const cam = { yaw: Math.random() * 6.28, pitch: 0.92, zoom: A * 0.95, x: 0, z: 0 };
  game.mapCam = cam;

  // ---- typing helper (the case-file sound Robert described: "you hear some typing…") ----
  const typers = [];
  const typeInto = (span, text, cps = 34, quiet = false) => {
    typers.push({ span, text, cps, i: 0, acc: 0, quiet });
  };

  // ---- beats ----
  const spawnPos = p1 ? { x: p1.pos.x, z: p1.pos.z } : { x: 0, z: 0 };
  const beats = [];
  const pushGeo = () => {
    beats.push({
      dur: 1.6,
      on: () => { try { audio.power(true); } catch (e) {} },
      html: `<div class="opgeo">
        <div class="opflag">${flagOf(C.code)}</div>
        <div class="opcountry">${esc((plan.country || 'UNKNOWN STATE').toUpperCase())}</div>
        ${C.motto ? `<div class="opmotto">“${esc(C.motto)}”</div>` : ''}
        ${C.leaderTitle ? `<div class="opline">${esc(String(C.leaderTitle).toUpperCase())} · ${esc((C.demonym || '').toUpperCase())}</div>` : ''}
      </div>`,
      cam: (t) => { cam.yaw += t * 0.0016; cam.zoom = A * (0.98 - t * 0.02); },
    });
    beats.push({
      dur: 2.0,
      on: () => { try { audio.zap(340); } catch (e) {} },
      html: `<div class="opgeo">
        <div class="opkick">THEATER OF OPERATIONS</div>
        <div class="opcity">${esc((plan.name || '').toUpperCase())}</div>
        <div class="opline">${esc((plan.popLabel || plan.popType || '').toUpperCase())}${plan.pop ? ' · POP ' + esc(fmtPop(plan.pop)) : ''}</div>
        ${plan.climate ? `<div class="opline dim">${esc(climateLine(plan.climate))}</div>` : ''}
        <div class="opbars">
          <div class="opbarrow"><span>CRIME</span><div class="opmeter"><i style="width:${plan.crime ?? 50}%;background:var(--danger)"></i></div></div>
          <div class="opbarrow"><span>SAFETY</span><div class="opmeter"><i style="width:${plan.safety ?? 50}%;background:var(--good)"></i></div></div>
        </div>
      </div>`,
      cam: (t) => { cam.yaw += t * 0.0014; cam.pitch = 0.92 - t * 0.00012; cam.zoom = A * (0.94 - t * 0.03); },
    });
  };

  // ---------- THE TEN ----------
  const st = def ? heroStats(def) : null;
  const book = def ? (snapshotTable(ROSTER).find((r) => r.id === def.id) || {}) : {};
  const V = {
    // 1 · THE CASE FILE — typing, "searching…", the file card with the fighter's real numbers
    casefile() {
      beats.push({
        dur: 2.1,
        on: (b) => { typeInto(stage.querySelector('#opQ'), `REGISTRY QUERY: ${(def?.name || 'UNKNOWN')} — ${plan.name?.toUpperCase()}`); },
        html: `<div class="opterm"><div class="optermline">&gt; <span id="opQ"></span><span class="opcaret">▌</span></div>
          <div class="optermline dim">SEARCHING THE ASCENDANT REGISTRY…</div></div>`,
        cam: (t) => { cam.yaw += t * 0.0009; },
      });
      beats.push({
        dur: 3.4,
        on: () => { try { audio.sting(); } catch (e) {} },
        html: `<div class="opcard">
          <div class="opcardtop"><span class="opclass">TOP SECRET // THRESHOLD</span><span>${esc(def?.person?.file || '')}</span></div>
          <div class="opcardname">${esc(def?.name || '')}</div>
          <div class="opcardsub">${esc(def?.title || '')} · ${esc(def?.role || '')}</div>
          <div class="opcardrows">
            <div><b>LEFEVRE</b><span class="hot">${esc(def?.threat || '—')}</span></div>
            <div><b>POWER</b><span>${st ? st.power : '—'}/10</span></div>
            <div><b>MOBILITY</b><span>${st ? st.mobility : '—'}/10</span></div>
            <div><b>RECORD</b><span>${book.w ?? 0}–${book.l ?? 0}</span></div>
          </div>
          <div class="opstamp">CLEARED FOR THEATER</div>
        </div>`,
        cam: (t) => { cam.zoom = Math.max(90, cam.zoom - t * 0.02); },
      });
    },
    // 2 · THE BROADCAST — static, the KMK 9 desk, YOUR OWN footage from the last match
    broadcast() {
      const clips = (game._openingClips || []).filter((c2) => c2.frames && c2.frames.some((u) => u && u[0] !== '#'));
      const clip = clips.sort((a, b) => (b.priority || 0) - (a.priority || 0))[0];
      beats.push({
        dur: 4.6,
        on: () => {
          try { audio.staticBurst(0.3); audio.sting(); } catch (e) {}
          const cv = stage.querySelector('#opTv'); if (!cv) return;
          const ctx = cv.getContext('2d');
          let fi = 0;
          const imgs = clip ? clip.frames.filter((u) => u && u[0] !== '#').map((u) => { const im = new Image(); im.src = u; return im; }) : null;
          el._tvT = setInterval(() => {
            if (!cv.isConnected) { clearInterval(el._tvT); return; }   // stage torn down under us
            if (imgs && imgs.length) {
              const im = imgs[fi++ % imgs.length];
              if (im.complete && im.naturalWidth) ctx.drawImage(im, 0, 0, cv.width, cv.height);
            } else {   // no footage on file → bars, honestly
              const cols = ['#c8c8c8', '#c8b02a', '#2ab0b0', '#2ac82a', '#b02ab0', '#c82a2a', '#2a2ac8'];
              // ⚠ no purple on OUR surfaces — broadcast TEST BARS are the one place the full SMPTE
              // set appears, and even here we swap the violet bar for slate.
              cols[4] = '#5a6a7a';
              cols.forEach((c3, i) => { ctx.fillStyle = c3; ctx.fillRect((cv.width / 7) * i, 0, cv.width / 7 + 1, cv.height); });
              ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(0, cv.height - 26, cv.width, 26);
              ctx.fillStyle = '#fff'; ctx.font = '10px monospace'; ctx.fillText('KMK 9 — NO FOOTAGE ON FILE', 8, cv.height - 10);
            }
          }, clip ? 1000 / (clip.fps || 12) : 400);
        },
        html: `<div class="opnews">
          <div class="opmon"><canvas id="opTv" width="320" height="180"></canvas>
            <span class="opbug">KMK<b>9</b></span><span class="oplive"><i></i>LIVE</span></div>
          <div class="opnewsside">
            <div class="opkick" style="color:var(--broadcast)">KMK 9 ACTION NEWS — CONTINUING COVERAGE</div>
            <div class="opheadline">${clip ? 'PREVIOUSLY: ' + esc(clip.title || 'ASCENDANT ACTIVITY') : esc((plan.name || '').toUpperCase()) + ' BRACES FOR ASCENDANT ACTIVITY'}</div>
            <div class="opline dim">${esc(def?.name || '')} expected in ${esc(game.world.districtAt ? game.world.districtAt(spawnPos.x, spawnPos.z) : 'the district')}</div>
          </div>
        </div>`,
        cam: (t) => { cam.yaw += t * 0.0007; },
      });
    },
    // 3 · THE FLYOVER — letterboxed slow descent from the skyline to the spawn corner
    flyover() {
      beats.push({
        dur: 5.0,
        on: () => { try { audio.zap(220); } catch (e) {} },
        html: `<div class="opfly"><div class="opkick">${esc((plan.name || '').toUpperCase())}</div>
          <div class="opdistrict" id="opDist"></div></div>`,
        cam: (t, tt) => {
          const k = Math.min(1, tt / 5.0);
          cam.yaw += t * 0.0011;
          cam.pitch = 0.92 - k * 0.42;
          cam.zoom = A * 0.95 - k * (A * 0.95 - 120);
          cam.x = spawnPos.x * k; cam.z = spawnPos.z * k;
          const d = stage.querySelector('#opDist');
          if (d && game.world.districtAt) d.textContent = game.world.districtAt(cam.x, cam.z);
        },
      });
    },
    // 4 · THE DOSSIER TELETYPE — the codex speaks, one line at a time
    teletype() {
      const idn = def?.person || {};
      const lines = [
        `SUBJECT ........ ${def?.name || 'UNKNOWN'}`,
        `LEGAL NAME ..... ${idn.name || '[SEALED]'}`,
        `ORIGIN ......... ${idn.home || '[REDACTED]'}${idn.country ? ', ' + idn.country : ''}`,
        `LEFEVRE CLASS .. ${def?.threat || '—'}`,
        `ARMAMENT ....... ${Object.keys(def?.abilities || {}).length} REGISTERED SYSTEMS`,
        `DOCTRINE ....... ${(def?.ai?.style || 'UNKNOWN').toUpperCase()}`,
      ];
      beats.push({
        dur: 4.6,
        on: () => {
          const box = stage.querySelector('#opTele');
          lines.forEach((ln, i) => {
            const row = document.createElement('div'); row.className = 'optermline';
            const span = document.createElement('span'); row.append(span); box.append(row);
            setTimeout(() => typeInto(span, ln, 46), i * 620);
          });
        },
        html: `<div class="opterm" id="opTele"><div class="optermline dim">THRESHOLD TREATY OFFICE — EYES ONLY</div></div>`,
        cam: (t) => { cam.yaw += t * 0.0006; },
      });
    },
    // 5 · THE LADDER — what this state sends when you cross the line (the country sheet, staged)
    ladder() {
      const G = ladderGatesFor(C);
      const eta = game.police ? Math.round(game.police._responseDelay()) : 12;
      const rows = [
        ['★', 'CITY POLICE', `RESPONSE ~${eta}s`, true],
        ['★★★', 'TACTICAL / SWAT', 'AUTHORIZED', true],
        ['★★★★', 'FEDERAL AGENTS', G.feds ? 'BLACK SUBURBANS STANDING BY' : 'NO FEDERAL APPARATUS', G.feds],
        ['★★★★★', 'THE MILITARY', G.military ? 'ON CALL' : 'NO ARMY TO SEND', G.military],
        ['★★★★★★', 'SANCTIONED LSW', G.sanctioned ? 'ONE OF OURS, CLEARED TO ENGAGE' : (C.lswRegs === 'Banned' ? 'PROGRAM BANNED' : 'NO ACTIVE PROGRAM'), G.sanctioned],
      ];
      beats.push({
        dur: 4.8,
        on: () => {
          rows.forEach((r, i) => setTimeout(() => {
            const box = stage.querySelector('#opLad'); if (!box) return;
            const d = document.createElement('div'); d.className = 'opladrow' + (r[3] ? '' : ' dead');
            d.innerHTML = `<b>${r[0]}</b><span>${esc(r[1])}</span><em>${esc(r[2])}</em>`;
            box.append(d);
            try { r[3] ? audio.zap(430 + i * 60) : audio.zap(180); } catch (e) {}
          }, 450 + i * 700));
          try { audio.siren(null, 1); } catch (e) {}
        },
        html: `<div class="opladder"><div class="opkick">IF THIS GOES WRONG — THE RESPONSE LADDER</div><div id="opLad"></div></div>`,
        cam: (t) => { cam.yaw += t * 0.0008; },
      });
    },
    // 6 · THE SATELLITE — straight-down pass with the climate readout
    satellite() {
      beats.push({
        dur: 4.6,
        on: () => { try { audio.zap(760); setTimeout(() => audio.zap(760), 900); } catch (e) {} },
        html: `<div class="opsat">
          <div class="opsatgrid"></div><div class="opsatcross">+</div>
          <div class="opsathud">
            <div>ORBITAL PASS · ${esc((plan.name || '').toUpperCase())}</div>
            ${plan.climate ? `<div>${esc(climateLine(plan.climate))}</div>` : ''}
            <div>${plan.N ? `GRID ${plan.N}×${plan.N} · ` : ''}${A * 2}u ACROSS</div>
          </div></div>`,
        cam: (t, tt) => {
          const k = Math.min(1, tt / 4.6);
          cam.pitch = 1.5; cam.yaw += t * 0.0004;
          cam.zoom = A * 1.05 - k * (A * 0.45);
        },
      });
    },
    // 7 · THE TALE OF THE TAPE — the sports desk's versus card (falls back to the case file solo)
    tape() {
      const foe = game.entities.find((f) => f !== p1 && f.def && !f.def.police && !f.isDummy);
      if (!foe) return V.casefile();
      const s2 = heroStats(foe.def);
      const row = (l, a, b) => `<div class="optaperow"><span>${a}</span><b>${l}</b><span>${b}</span></div>`;
      beats.push({
        dur: 4.2,
        on: () => { try { audio.sting(); } catch (e) {} },
        html: `<div class="optape">
          <div class="opkick">TONIGHT · ${esc((plan.name || '').toUpperCase())}</div>
          <div class="optapenames"><span>${esc(def.name)}</span><em>VS</em><span>${esc(foe.def.name)}</span></div>
          ${row('LEFEVRE', esc(def.threat || '—'), esc(foe.def.threat || '—'))}
          ${row('POWER', st.power + '/10', s2.power + '/10')}
          ${row('MOBILITY', st.mobility + '/10', s2.mobility + '/10')}
          ${row('DEFENSE', st.defense + '/10', s2.defense + '/10')}
        </div>`,
        cam: (t) => { cam.yaw += t * 0.001; },
      });
    },
    // 8 · THE SIREN — the vigilantism stance, stated to your face
    siren() {
      const v = C.vigilantism || 'Regulated';
      const line = v === 'Banned' ? 'THIS CITY SHOOTS BACK' : v === 'Legal' ? 'THIS CITY CHEERS FOR CLEAN WINS' : 'THIS CITY FILMS EVERYTHING';
      const sub = v === 'Banned' ? 'Armed citizens draw on flagged Ascendants. Every phone is evidence.'
        : v === 'Legal' ? 'Sanctioned operations only. Keep civilians out of it and they will love you.'
          : 'Witnesses record. Harm a civilian and the crowd itself calls it in.';
      beats.push({
        dur: 3.8,
        on: () => { try { audio.siren(null, 2); } catch (e) {} },
        html: `<div class="opsiren"><div class="opkick">CIVIL STANCE · ${esc(String(v).toUpperCase())}</div>
          <div class="opsirenline">${esc(line)}</div><div class="opline dim">${esc(sub)}</div></div>`,
        cam: (t) => { cam.yaw += t * 0.0012; cam.zoom = Math.max(150, cam.zoom - t * 0.012); },
      });
    },
    // 9 · THE FREEZE FRAME — tight orbit on the fighter, name in lights ("see them in action")
    freeze() {
      beats.push({
        dur: 4.2,
        on: () => { try { game.heroYell && game.heroYell(p1, 1.1); audio.power(true); } catch (e) {} },
        html: `<div class="opfreeze"><div class="opbigname">${esc(def?.name || '')}</div>
          <div class="opcardsub">${esc(def?.title || '')}</div>
          <div class="opchips">${Object.values(def?.abilities || {}).slice(0, 3).map((a) => a && a.name).filter(Boolean).map((s3) => `<span>${esc(s3)}</span>`).join('')}</div></div>`,
        cam: (t, tt) => {
          const k = Math.min(1, tt / 4.2);
          cam.x = spawnPos.x; cam.z = spawnPos.z;
          cam.pitch = 0.42; cam.zoom = 46 - k * 26; cam.yaw += t * 0.0013;
          if (p1) p1.facing = cam.yaw;   // the subject holds the lens as it orbits
        },
      });
    },
    // 10 · THE LEDGER — the book's opinion of you
    ledger() {
      const inc = def ? recentIncidents(def.id, [def]).slice(0, 2) : [];
      const champ = def && championId() === def.id;
      beats.push({
        dur: 4.2,
        on: () => { try { audio.sting(); } catch (e) {} },
        html: `<div class="opledger">
          <div class="opkick">THE OFFICIAL BOOK · KMK 9 SPORTS DESK</div>
          <div class="opcardname">${champ ? '🏆 ' : ''}${esc(def?.name || '')}</div>
          <div class="opcardrows">
            <div><b>RATING</b><span>${book.elo ?? '—'}</span></div>
            <div><b>RANK</b><span>#${book.rank ?? '—'}</span></div>
            <div><b>RECORD</b><span>${book.w ?? 0}–${book.l ?? 0}${(book.w || book.l) ? '' : ' (UNTESTED)'}</span></div>
          </div>
          ${inc.map((x) => `<div class="opline dim">${x.win ? 'W' : 'L'} · VS ${esc(x.vs)}${x.how ? ' · BY ' + esc(String(x.how).toUpperCase()) : ''}</div>`).join('') || '<div class="opline dim">No sanctioned bouts on record. Tonight starts the file.</div>'}
        </div>`,
        cam: (t) => { cam.yaw += t * 0.0008; },
      });
    },
  };

  pushGeo();
  (V[OPENING_NAMES[variant]] || V.casefile)();

  // ---- the runner ----
  let bi = -1, bt = 0, finished = false;
  const enterBeat = () => {
    bi++;
    if (bi >= beats.length) return finish();
    bt = 0;
    stage.innerHTML = beats[bi].html;
    stage.classList.remove('opin'); void stage.offsetWidth; stage.classList.add('opin');
    if (beats[bi].on) { try { beats[bi].on(beats[bi]); } catch (e) { console.error(e); } }
  };
  const step = (dt) => {
    if (finished) return;
    bt += dt;
    const b = beats[bi];
    if (b && b.cam) { try { b.cam(dt * 1000, bt); } catch (e) {} }
    // the sim is held (running=false) but the CAST must not stand in construction pose —
    // tick idle animation only (no physics, no AI), so arms hang naturally and auras breathe
    for (const f of game.entities || []) {
      if (f.hp > 0 && f._animate) { try { f._animate(dt); f._sync && f._sync(); } catch (e) {} }
    }
    // typers tick (keystroke audio ~ every other char, quiet)
    for (const ty of typers) {
      if (ty.i >= ty.text.length || !ty.span || !ty.span.isConnected) continue;
      ty.acc += dt * ty.cps;
      while (ty.acc >= 1 && ty.i < ty.text.length) {
        ty.acc -= 1; ty.i++;
        ty.span.textContent = ty.text.slice(0, ty.i);
        if (!ty.quiet && ty.i % 2 === 0) { try { audio.keystroke && audio.keystroke(); } catch (e) {} }
      }
    }
    if (b && bt >= b.dur) enterBeat();
  };
  const finish = () => {
    if (finished) return;
    finished = true;
    clearInterval(el._tvT);
    removeEventListener('keydown', onSkip, true); removeEventListener('pointerdown', onSkip, true);
    el.classList.add('opout');
    setTimeout(() => el.remove(), 480);
    // hand the old footage back to the void — the director owned it after beginMatch's handoff
    for (const c2 of (game._openingClips || [])) for (const u of (c2.frames || [])) if (u && u.startsWith && u.startsWith('blob:')) URL.revokeObjectURL(u);
    game._openingClips = null;
    game.mapCam = null;
    game.running = wasRunning;
    if (onDone) onDone();
  };
  const onSkip = (e) => { if (e.type === 'keydown' && e.code === 'F12') return; e.preventDefault(); finish(); };
  addEventListener('keydown', onSkip, true); addEventListener('pointerdown', onSkip, true);
  el._finish = finish;   // the singleton guard retires a live director through its own teardown

  enterBeat();
  if (!opts.manual) {
    let last = performance.now();
    const raf = (now) => {
      if (finished) return;
      step(Math.min((now - last) / 1000, 0.1)); last = now;
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }
  return { step, finish, get done() { return finished; }, variant: OPENING_NAMES[variant] };
}
