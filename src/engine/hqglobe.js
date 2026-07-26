// =================================================================================================
// THE INCORPORATION GLOBE — choosing where your firm exists, on the actual planet.
//
// Robert: *"use the globe when selecting corporate HQ at the start of the game."*
//
// This is the right instinct and it is worth saying why, because it changes the decision rather than
// decorating it. Founding a firm was previously reachable only from the dev console, and the version
// of that screen anyone would have built by default is two dropdowns — country, then city. Two
// dropdowns make incorporation an administrative step. **A globe makes it a geopolitical one.** You
// are looking at the whole world at once, so choosing Zurich over Mogadishu is visibly choosing a
// hemisphere, a neighbourhood, a set of neighbours; and every one of the 1,050 cities is standing
// there in real coordinates arguing its own case.
//
// ⚠ EVERYTHING ON THIS SCREEN IS READ, NEVER AUTHORED. The footprint you are permitted comes from
// `siteSurvey` (eleven sheet fields), the money from `seedCapital`, the naming rights from
// `firmNaming` — 46 of 168 states take the naming decision away from you and say so. If this screen
// and the game ever disagree about what a country is like, this screen is wrong by construction.
//
// The globe is the SAME `buildEarth` the space layer flies past, so the atmosphere, the terminator
// and the day/night cycle are the ones the rest of the game is using (manual §43). There is no
// second Earth to keep in sync.
// =================================================================================================
import * as THREE from 'three';
import { buildEarth, llToVec3 } from './earthglobe.js';
import { CITY_LATLON } from '../data/citycoords.js';
import { cityList } from '../data/cities.js';
import { countryOf } from '../data/countries.js';
import { siteSurvey } from '../data/base.js';
import { seedCapital, firmNaming, suggestFirmNames, found, countryBrief } from '../data/org.js';
import { gameDate } from '../data/orbits.js';
import { flagFor } from '../data/identities.js';

const R = 100;                       // globe radius in this scene's units
const NEAR = 1.16, FAR = 4.4;        // the zoom range you are allowed — always recognisably a planet
const DEG = Math.PI / 180;

const CSS = `
#hqg{ position:fixed; inset:0; z-index:64; display:none; color:var(--text); font-family:var(--f-display,"Rajdhani",system-ui,sans-serif); }
#hqg.on{ display:block; }
#hqg .hqgrab{ position:absolute; inset:0; cursor:grab; }
#hqg .hqgrab.drag{ cursor:grabbing; }
#hqg .hqtop{ position:absolute; top:0; left:0; right:0; padding:10px 18px; display:flex; align-items:center; gap:14px;
  background:linear-gradient(180deg,rgba(6,7,10,.92),rgba(6,7,10,0)); pointer-events:none; }
#hqg .hqcls{ font-family:var(--f-mono,"Cascadia Code",monospace); font-size:var(--t-micro,8.5px); letter-spacing:.34em;
  text-transform:uppercase; color:var(--stamp,#b8523f); border:1px solid currentColor; padding:3px 8px; }
#hqg .hqttl{ font-size:20px; font-weight:800; letter-spacing:.16em; text-transform:uppercase; color:var(--gold); }
#hqg .hqhint{ margin-left:auto; font-family:var(--f-mono,monospace); font-size:var(--t-micro,8.5px); letter-spacing:.2em;
  color:var(--text-5,#7d776b); text-transform:uppercase; }
#hqg .hqpanel{ position:absolute; top:56px; right:18px; width:min(392px,42vw); max-height:calc(100vh - 96px); overflow-y:auto;
  background:rgba(12,13,17,.93); border:1px solid var(--line,rgba(255,255,255,.12)); border-radius:var(--r-2,8px);
  padding:16px 18px 18px; backdrop-filter:blur(4px); }
#hqg .hqsh{ font-family:var(--f-mono,monospace); font-size:var(--t-micro,8.5px); letter-spacing:.3em; text-transform:uppercase;
  color:var(--text-5,#7d776b); border-bottom:1px dashed var(--line-2,rgba(255,255,255,.09)); padding-bottom:5px; margin:16px 0 9px; }
#hqg .hqsh:first-child{ margin-top:0; }
#hqg .hqcity{ font-size:26px; font-weight:800; letter-spacing:.04em; color:var(--text); line-height:1.05; }
#hqg .hqco{ font-family:var(--f-mono,monospace); font-size:var(--t-sm,11px); letter-spacing:.16em; color:var(--gold-pale,#e8cf92);
  text-transform:uppercase; margin-top:3px; }
#hqg .hqrow{ display:flex; gap:10px; align-items:baseline; padding:3px 0; font-size:var(--t-md,13px); }
#hqg .hqrow .k{ font-family:var(--f-mono,monospace); font-size:var(--t-micro,8.5px); letter-spacing:.18em; text-transform:uppercase;
  color:var(--text-5,#7d776b); width:112px; flex:none; }
#hqg .hqrow .v{ color:var(--text-2,#cfc7b6); }
#hqg .hqrow .v.hot{ color:var(--gold); font-weight:700; }
#hqg .hqrow .v.bad{ color:var(--danger,#c9564a); }
#hqg .hqfoot{ font-size:var(--t-sm,11px); color:var(--text-4,#96907f); line-height:1.45; margin-top:5px; }
#hqg .hqgrid{ display:grid; grid-template-columns:repeat(9,1fr); gap:2px; width:108px; margin:6px 0 2px; }
#hqg .hqgrid i{ aspect-ratio:1; background:var(--surface-hi,#22201b); border:1px solid transparent; }
#hqg .hqgrid i.on{ background:var(--gold-deep,#8a6b1e); border-color:var(--gold,#e0b23c); }
#hqg input.hqname{ width:100%; background:var(--surface-hi,#1a1a16); border:1px solid var(--line,rgba(255,255,255,.14));
  color:var(--text); padding:7px 9px; font-family:var(--f-display,inherit); font-size:var(--t-lg,15px); letter-spacing:.08em;
  text-transform:uppercase; border-radius:var(--r-1,4px); }
#hqg .hqsug{ display:flex; flex-wrap:wrap; gap:5px; margin-top:7px; }
#hqg .hqsug b{ cursor:pointer; font-family:var(--f-mono,monospace); font-size:var(--t-micro,8.5px); letter-spacing:.12em;
  padding:3px 7px; border:1px solid var(--line-2,rgba(255,255,255,.09)); color:var(--text-4,#96907f); border-radius:var(--r-pill,20px); }
#hqg .hqsug b:hover{ color:var(--gold); border-color:var(--gold-deep,#8a6b1e); }
#hqg .hqbtns{ display:flex; gap:8px; margin-top:16px; }
#hqg .hqbtns button{ flex:1; padding:11px 8px; font-family:var(--f-display,inherit); font-size:var(--t-lg,15px); font-weight:800;
  letter-spacing:.14em; text-transform:uppercase; border-radius:var(--r-1,4px); cursor:pointer;
  background:var(--surface-hi,#1c1a15); border:1px solid var(--line,rgba(255,255,255,.14)); color:var(--text-2,#cfc7b6); }
#hqg .hqbtns button.go{ background:var(--grad-gold,linear-gradient(180deg,#e0b23c,#8a6b1e)); border-color:var(--gold);
  color:var(--on-gold,#20180a); }
#hqg .hqbtns button:disabled{ opacity:.4; cursor:default; }
#hqg .hqempty{ font-size:var(--t-md,13px); color:var(--text-4,#96907f); line-height:1.5; }
#hqg .hqscan{ position:absolute; inset:0; pointer-events:none; opacity:.16;
  background:repeating-linear-gradient(180deg,rgba(255,255,255,.05) 0 1px,transparent 1px 3px); }
`;

// ⚠ THE INVERSE OF `llToVec3`, AND IT HAS TO BE DERIVED FROM IT RATHER THAN GUESSED. The projection
// shipped wrong once already (90 degrees of longitude out, manual §41) precisely because a second
// hand-rolled spherical was written beside the first. Read it straight back off the forward form:
//   x = -cos(phi)*sin(theta) · y = cos(theta) · z = sin(phi)*sin(theta)
//   theta = pi*(90-lat)/180  · phi = 2pi*(lon+180)/360
function vecToLL(v) {
  const n = v.clone().normalize();
  const lat = 90 - Math.acos(Math.max(-1, Math.min(1, n.y))) / DEG;
  const phi = Math.atan2(n.z, -n.x);                       // inverse of the pair above
  let lon = phi / DEG - 180;
  while (lon < -180) lon += 360;
  while (lon > 180) lon -= 360;
  return { lat, lon };
}

// great-circle distance in km, the same formula the transit screen uses
function km(a, b) {
  const dLat = (b.lat - a.lat) * DEG, dLon = (b.lon - a.lon) * DEG;
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * DEG) * Math.cos(b.lat * DEG) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(s)));
}

const money = (k) => k >= 1000 ? '$' + (k / 1000).toFixed(2) + 'M' : '$' + k + 'K';
const popWord = (p) => p >= 1e6 ? (p / 1e6).toFixed(p >= 1e7 ? 0 : 1) + 'M' : Math.round(p / 1e3) + 'K';

export function openHQGlobe(game, hud, onDone) {
  if (document.getElementById('hqg')) return null;
  if (!document.getElementById('hqgcss')) {
    const st = document.createElement('style'); st.id = 'hqgcss'; st.textContent = CSS;
    document.head.appendChild(st);
  }
  const W = game.world;
  const el = document.createElement('div');
  el.id = 'hqg';
  el.innerHTML = `
    <div class="hqgrab"></div>
    <div class="hqscan"></div>
    <div class="hqtop">
      <span class="hqcls">registry · incorporation</span>
      <span class="hqttl">Where does your firm exist?</span>
      <span class="hqhint">drag to turn · wheel to close in · click a city</span>
    </div>
    <div class="hqpanel"><div class="hqbody"></div></div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('on'));

  // ---- the scene. Swapped into the game's own RenderPass so the globe inherits the exact bloom,
  // exposure and ACES the street has — the same structural trick the space layer uses.
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(42, innerWidth / Math.max(1, innerHeight), 0.5, 40000);
  scene.add(cam);
  const earth = buildEarth(R, { date: gameDate(), dayT: W && W.dayT });
  scene.add(earth.group);

  // the selection pin: a gold spike standing off the surface, which is the one marker that stays
  // readable against city lights on the night side AND pale ocean on the day side
  const pinMat = new THREE.MeshBasicMaterial({ color: 0xffd08a, transparent: true, opacity: 0.95 });
  const pin = new THREE.Mesh(new THREE.ConeGeometry(R * 0.012, R * 0.10, 4), pinMat);
  pin.visible = false;
  scene.add(pin);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd08a, transparent: true, opacity: 0.5,
    side: THREE.DoubleSide, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(R * 0.020, R * 0.027, 32), ringMat);
  ring.visible = false;
  scene.add(ring);

  const pass = W.composer && W.composer.passes && W.composer.passes[0];
  const prev = { scene: pass && pass.scene, cam: pass && pass.camera, running: game.running,
                 fog: W.fogEnabled, title: false, ovl: [] };
  game.running = false;
  if (W.setFogEnabled) W.setFogEnabled(false);
  // ⚠ THIS SCREEN DRAWS ON THE CANVAS, AND THE CANVAS IS AT THE BOTTOM OF THE STACK. The title
  // screen (z30) and every `.lswovl` (z62) are opaque DOM sitting on top of it, so raising a
  // beautiful planet behind them shows the player nothing at all — the first run of this screen came
  // back as the how-to page over a black rectangle. Anything that renders through the composer has
  // to get the DOM out of the way first, and put it back exactly as it found it.
  if (hud && hud.title && hud.title.style.display !== 'none') {
    prev.title = true;
    if (hud.hideTitle) hud.hideTitle(); else hud.title.style.display = 'none';
  }
  document.querySelectorAll('.lswovl').forEach((o) => {
    if (getComputedStyle(o).display !== 'none') { prev.ovl.push(o); o.style.display = 'none'; }
  });
  // and the match HUD, which lives on the canvas: hiding the title screen REVEALS it, so a
  // health bar and a radar label were floating over the planet.
  const hudEl = document.getElementById('hud');
  if (hudEl) { prev.hud = hudEl.style.display; hudEl.style.display = 'none'; }

  // ---- camera orbit state
  let yaw = 0, pitch = 12, dist = 3.1, tYaw = 0, tPitch = 12, tDist = 3.1;
  const LIST = cityList();                 // ⚠ fresh array per call, index-aligned to CITY_LATLON
  let sel = -1, firmName = '';

  function placeCam() {
    const la = pitch * DEG, lo = yaw * DEG, d = dist * R;
    cam.position.set(d * Math.cos(la) * Math.sin(lo), d * Math.sin(la), d * Math.cos(la) * Math.cos(lo));
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld();
  }

  // ---- picking. Raycast the sphere, convert the hit to lat/lon, take the NEAREST REGISTERED CITY.
  // ⚠ Nearest-city rather than point-in-country on purpose: a click always lands on a real row of
  // the sheet, so the panel can never show a country we have no city for, and the answer is exact
  // (1,050 great-circle tests is nothing) instead of a polygon test against 178 countries' rings.
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pick(cx, cy) {
    ndc.set((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    const hit = ray.intersectObject(earth.globe, false)[0];
    if (!hit) return -1;
    const local = earth.group.worldToLocal(hit.point.clone());
    const ll = vecToLL(local);
    let best = -1, bd = 1e9;
    for (let i = 0; i < CITY_LATLON.length; i++) {
      const c = CITY_LATLON[i]; if (!c) continue;
      const d = km(ll, { lat: c[0], lon: c[1] });
      if (d < bd) { bd = d; best = i; }
    }
    return bd < 1400 ? best : -1;      // a click in the middle of the Pacific selects nothing
  }

  function markPin() {
    if (sel < 0) { pin.visible = ring.visible = false; return; }
    const ll = CITY_LATLON[sel];
    const p = llToVec3(ll[1], ll[0], 1, new THREE.Vector3());
    const up = p.clone().applyEuler(earth.group.rotation).normalize();
    const base = up.clone().multiplyScalar(R * 1.006);
    pin.position.copy(base).addScaledVector(up, R * 0.05);
    pin.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), up);
    ring.position.copy(base);
    ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), up);
    pin.visible = ring.visible = true;
  }

  // ---- the panel. Every line is a read of a sheet.
  const body = el.querySelector('.hqbody');
  function render() {
    if (sel < 0) {
      body.innerHTML = `<div class="hqsh">no site selected</div>
        <div class="hqempty">Turn the world and choose a city. Where you incorporate decides what you
        are <b style="color:var(--gold)">permitted to build</b>, how much capital you can raise, and
        whether you may even name your own firm.<br><br>
        <span style="font-family:var(--f-mono,monospace);font-size:var(--t-micro,8.5px);letter-spacing:.2em;color:var(--text-5,#7d776b)">
        ${CITY_LATLON.length} REGISTERED CITIES · ${earth.stats.countries} STATES</span></div>`;
      return;
    }
    const city = LIST[sel], co = countryOf(city.country);
    const survey = siteSurvey(city, co), cap = seedCapital(city, co), nm = firmNaming(co);
    const brief = countryBrief(city.country);
    const grid = [];
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++)
      grid.push(`<i class="${r < survey.n && c < survey.n ? 'on' : ''}"></i>`);
    const vig = (co && co.vigilantism) || '—';
    const vigBad = /banned/i.test(vig);
    body.innerHTML = `
      <div class="hqcity">${city.name}</div>
      <div class="hqco">${flagFor(city.country) || ''} ${city.country}${brief && brief.demonym ? ' · ' + brief.demonym : ''}</div>
      <div class="hqsh">the site survey</div>
      <div class="hqrow"><span class="k">footprint</span><span class="v hot">${survey.n}×${survey.n}${survey.twoFloors ? ' · TWO FLOORS' : ' · ONE FLOOR'}</span></div>
      <div class="hqgrid">${grid.join('')}</div>
      <div class="hqrow"><span class="k">classified</span><span class="v">${survey.label}</span></div>
      <div class="hqfoot">${survey.why}</div>
      <div class="hqsh">the state</div>
      <div class="hqrow"><span class="k">lsw law</span><span class="v ${/banned/i.test((co && co.lswRegs) || '') ? 'bad' : ''}">${(co && co.lswRegs) || 'UNRECORDED'}</span></div>
      <div class="hqrow"><span class="k">vigilantism</span><span class="v ${vigBad ? 'bad' : ''}">${vig}</span></div>
      <div class="hqrow"><span class="k">integrity</span><span class="v">${co ? co.integrity : '—'}${co ? ' / 100' : ''}</span></div>
      <div class="hqrow"><span class="k">the law</span><span class="v">${co ? co.lawEnforcement + ' · BUDGET ' + co.lawBudget : '—'}</span></div>
      <div class="hqsh">capital &amp; ground</div>
      <div class="hqrow"><span class="k">seed capital</span><span class="v hot">${money(cap.cash)}</span></div>
      <div class="hqfoot">${cap.note}</div>
      <div class="hqrow"><span class="k">population</span><span class="v">${popWord(city.pop)} · ${city.popType}</span></div>
      <div class="hqrow"><span class="k">crime</span><span class="v">${city.crime ? city.crime + ' / 100' : 'UNRATED'}</span></div>
      <div class="hqsh">the name</div>
      ${nm.own
        ? `<input class="hqname" maxlength="34" placeholder="NAME YOUR FIRM" value="${(firmName || '').replace(/"/g, '')}">
           <div class="hqsug">${suggestFirmNames(co, sel).slice(0, 4).map(s => `<b>${s}</b>`).join('')}</div>`
        : `<div class="hqrow"><span class="k">issued</span><span class="v hot">${nm.name}</span></div>`}
      <div class="hqfoot">${nm.why}</div>
      <div class="hqbtns">
        <button class="back">Back</button>
        <button class="go">Incorporate</button>
      </div>`;
    const inp = body.querySelector('input.hqname');
    if (inp) {
      inp.oninput = () => { firmName = inp.value; };
      body.querySelectorAll('.hqsug b').forEach(b => {
        b.onclick = () => { firmName = b.textContent; inp.value = firmName; };
      });
    }
    body.querySelector('.back').onclick = () => close(null);
    body.querySelector('.go').onclick = () => {
      const r = found(city.country, city.name, firmName || null);
      if (!r.ok) return;
      if (game.audio && game.audio.sting) game.audio.sting('victory');
      close({ ...r, city: city.name, country: city.country, survey, capital: cap });
    };
  }

  // ---- input
  const grab = el.querySelector('.hqgrab');
  let down = false, moved = 0, lx = 0, ly = 0;
  grab.onpointerdown = (e) => {
    down = true; moved = 0; lx = e.clientX; ly = e.clientY;
    grab.classList.add('drag');
    // ⚠ setPointerCapture throws if the pointer has already gone; a camera drag must never throw
    try { grab.setPointerCapture(e.pointerId); } catch (err) {}
  };
  grab.onpointermove = (e) => {
    if (!down) return;
    const dx = e.clientX - lx, dy = e.clientY - ly;
    lx = e.clientX; ly = e.clientY;
    moved += Math.abs(dx) + Math.abs(dy);
    tYaw -= dx * 0.28;
    tPitch = Math.max(-82, Math.min(82, tPitch + dy * 0.22));
  };
  grab.onpointerup = (e) => {
    down = false; grab.classList.remove('drag');
    if (moved < 6) {                       // a click, not a drag
      const i = pick(e.clientX, e.clientY);
      if (i >= 0 && i !== sel) {
        sel = i; firmName = '';
        markPin(); render();
        // fly the camera to what you picked, so choosing a city is also travelling to it
        const ll = CITY_LATLON[i];
        tYaw = ll[1]; tPitch = Math.max(-70, Math.min(70, ll[0]));
        tDist = Math.max(NEAR, Math.min(tDist, 2.0));
        if (game.audio && game.audio.click) game.audio.click();
      }
    }
  };
  grab.onwheel = (e) => {
    e.preventDefault();
    tDist = Math.max(NEAR, Math.min(FAR, tDist * (1 + Math.sign(e.deltaY) * 0.11)));
  };
  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(null); } };
  window.addEventListener('keydown', onKey, true);

  // ---- the loop. Its own rAF: the sim is stopped, and this screen still has to breathe.
  let alive = true, raf = 0, last = performance.now();
  function frame(now) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const e = 1 - Math.pow(0.001, dt);              // frame-rate independent ease
    // shortest-path yaw, or the globe pirouettes the long way round across the ±180 seam
    let dy = ((tYaw - yaw + 540) % 360) - 180;
    yaw += dy * e; pitch += (tPitch - pitch) * e; dist += (tDist - dist) * e;
    placeCam();
    // ⚠ THE LIVE CLOCK. The terminator, the haze colour and the city lights are all one fact and it
    // is `world.dayT` — so the planet you incorporate on is showing the actual time of day.
    earth.setSun(gameDate(), W && W.dayT);
    earth.setZoomFromCamera(cam);
    if (ring.visible) ringMat.opacity = 0.34 + 0.26 * (0.5 + 0.5 * Math.sin(now * 0.004));
    if (pass) { pass.scene = scene; pass.camera = cam; }
    const g = W.renderer;
    if (g) { g.setScissorTest(false); g.setViewport(0, 0, g.domElement.width, g.domElement.height); }
    cam.aspect = innerWidth / Math.max(1, innerHeight);
    cam.updateProjectionMatrix();
    if (W.composer) W.composer.render();
  }

  function close(result) {
    if (!alive) return;
    alive = false;
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey, true);
    if (pass) { pass.scene = prev.scene; pass.camera = prev.cam; }
    game.running = prev.running;
    if (W.setFogEnabled) W.setFogEnabled(prev.fog !== false);
    prev.ovl.forEach((o) => { o.style.display = ''; });
    if (hudEl) hudEl.style.display = prev.hud || '';
    if (prev.title && hud && hud.showTitle) hud.showTitle();
    scene.remove(earth.group);
    earth.dispose();
    pin.geometry.dispose(); ring.geometry.dispose(); pinMat.dispose(); ringMat.dispose();
    el.remove();
    api.done = true; api.result = result;
    if (onDone) onDone(result);
  }

  placeCam(); render();
  const api = { el, earth, scene, cam, close, done: false, result: null,
    /** Test seam: select by roster index without a mouse. */
    select(i) {
      sel = i; firmName = '';
      markPin(); render();
      // ⚠ the camera goes too. `select` is both the test seam AND the path main.js uses to frame an
      // existing headquarters — a selection that leaves the view on the other side of the planet is
      // not showing you your site.
      const ll = CITY_LATLON[i];
      if (ll) { tYaw = ll[1]; tPitch = Math.max(-70, Math.min(70, ll[0])); tDist = Math.min(tDist, 2.0); }
      return sel;
    },
    pickAt(x, y) { return pick(x, y); },
    /** Test seam: step the ease + render without rAF. */
    step(dt) {
      let dy = ((tYaw - yaw + 540) % 360) - 180;
      const e = 1 - Math.pow(0.001, dt);
      yaw += dy * e; pitch += (tPitch - pitch) * e; dist += (tDist - dist) * e;
      placeCam(); earth.setSun(gameDate(), W && W.dayT); earth.setZoomFromCamera(cam);
      return { yaw, pitch, dist, air: earth.air$ };
    },
    get selected() { return sel < 0 ? null : LIST[sel]; },
  };
  game._hqGlobe = api;
  if (!api.manual) raf = requestAnimationFrame(frame);
  return api;
}
