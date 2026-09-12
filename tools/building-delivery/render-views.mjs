// render-views.mjs — deterministic annotated orthographic drawings of the (two-story) lab, from the
// model. No browser, no external input. Dimensioned views with to-scale soldier (cyan) and
// large-hero (gold) silhouettes. Output: public/building-delivery/lab.v1/views/*.svg
//
// Six views: ground plan, upper plan, roof plan, a Z-section through the switchback stair (both
// floors + slab + roof), front elevation (door clearance), flank/breach elevation (large-hero).
// These are ENGINEERING VIEWS of the real geometry; the GLB renders (viewer/shots) are the pictorial
// companion.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { buildModel } from './lib/model.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const OUT = join(REPO, 'public', 'building-delivery', 'lab.v1', 'views');
const recipe = JSON.parse(readFileSync(join(REPO, 'authoring', 'buildings', 'lab.v1', 'recipe.json'), 'utf8'));
const M = buildModel(recipe);
const MPU = M.units.metersPerUnit;
const HX = M.footprint.width_x / 2, HZ = M.footprint.depth_z / 2, T = M.footprint.wallThickness;
const F2F = M.storey.floorToFloor, DECK = M.storey.deckTop_y, PARA = M.storey.parapetTop_y, CEIL = M.storey.ceilingUnderside_y;

const C = { bg:'#14161c', grid:'#232630', wall:'#c7ad7e', wallLine:'#0a0b10', weak:'#b89a63', hazard:'#ff5a4a',
  stair:'#55575e', roof:'#2a2c33', roofWeak:'#3a3d46', floor:'#7a6a4f', parapet:'#b79d70', ped:'#3a3d46', glow:'#7fe6ff',
  bone:'#e8e2d6', gold:'#ffd24a', dim:'#9aa0ad', soldier:'#7fe6ff', hero:'#ffd24a', cam:'#ff5a4a' };
const f = (v) => Math.round(v * 100) / 100;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const S = 12, PAD = 66;
const doc = (w, h, title, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="Inter,system-ui,sans-serif"><rect width="${w}" height="${h}" fill="${C.bg}"/><text x="16" y="26" fill="${C.gold}" font-size="16" font-weight="700">${esc(title)}</text>${body}</svg>\n`;
const RC = (x, y, w, h, fill, o = {}) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}"${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw || 1}"` : ''}${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}${o.o != null ? ` opacity="${o.o}"` : ''}/>`;
const L = (x1, y1, x2, y2, s, sw = 1, dash) => `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${s}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
const Tx = (x, y, s, fill, sz = 11, an = 'start', w = 400) => `<text x="${f(x)}" y="${f(y)}" fill="${fill}" font-size="${sz}" text-anchor="${an}" font-weight="${w}">${esc(s)}</text>`;
const Ci = (cx, cy, r, st, fl = 'none', sw = 1.5, o = 1, dash) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fl}" stroke="${st}" stroke-width="${sw}" opacity="${o}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
const uL = (u) => `${u}u / ${(u * MPU).toFixed(2)}m`;
function dim(x1, y1, x2, y2, label, color = C.dim) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, horiz = Math.abs(x2 - x1) >= Math.abs(y2 - y1), t = 4;
  return L(x1, y1, x2, y2, color) + (horiz ? L(x1, y1 - t, x1, y1 + t, color) + L(x2, y2 - t, x2, y2 + t, color) : L(x1 - t, y1, x1 + t, y1, color) + L(x2 - t, y2, x2 + t, y2, color)) + `<text x="${f(mx)}" y="${f(my - (horiz ? 4 : 0))}" fill="${color}" font-size="10" text-anchor="middle">${esc(label)}</text>`;
}
const scaleBar = (x, y) => L(x, y, x + 10 * S, y, C.bone, 2) + L(x, y - 4, x, y + 4, C.bone, 2) + L(x + 10 * S, y - 4, x + 10 * S, y + 4, C.bone, 2) + Tx(x + 5 * S, y - 8, uL(10), C.bone, 10, 'middle');
function figElev(cx, groundY, hgt, color, label) {
  const top = groundY - hgt * S, hr = hgt * S * 0.11, hcy = top + hr, bt = hcy + hr, bb = groundY - hgt * S * 0.34, sw = hgt * S * 0.16;
  return Ci(cx, hcy, hr, color, 'none', 2) + L(cx, bt, cx, bb, color, 2) + L(cx - sw, bt + hr * 0.5, cx + sw, bt + hr * 0.5, color, 2) + L(cx, bb, cx - sw * 0.8, groundY, color, 2) + L(cx, bb, cx + sw * 0.8, groundY, color, 2) + (label ? Tx(cx, groundY + 14, label, color, 9, 'middle') : '');
}
const pieceColor = (p) => p.node.startsWith('breakable_') && p.material === 'weak_panel' ? C.weak
  : p.material === 'weak_panel' ? C.weak : p.role === 'step' ? C.stair : p.role === 'roof' ? (p.breakGroup ? C.roofWeak : C.roof) : p.role === 'floor' ? (p.breakGroup ? C.roofWeak : C.floor) : p.role === 'parapet' ? C.parapet : p.role === 'prop' ? C.ped : C.wall;

// ---------- PLAN (top-down) for a level key (0,1) or 'roof' ----------
function plan(levelKey, title, opts = {}) {
  const minX = -HX - 6, maxX = HX + 6, minZ = -HZ - 6, maxZ = HZ + 6;
  const w = (maxX - minX) * S + 2 * PAD, h = (maxZ - minZ) * S + 2 * PAD + 30;
  const px = (x) => PAD + (x - minX) * S, pz = (z) => PAD + 24 + (z - minZ) * S;
  let b = '';
  for (let gx = Math.ceil(minX / 5) * 5; gx <= maxX; gx += 5) b += L(px(gx), pz(minZ), px(gx), pz(maxZ), C.grid, 1);
  for (let gz = Math.ceil(minZ / 5) * 5; gz <= maxZ; gz += 5) b += L(px(minX), pz(gz), px(maxX), pz(gz), C.grid, 1);
  const roles = levelKey === 'roof' ? ['roof', 'parapet'] : ['blocker', 'step', 'prop'];
  const bandLo = levelKey === 'roof' ? DECK : Number(levelKey) * F2F, bandHi = bandLo + F2F;
  for (const p of M.pieces) {
    const onLevel = String(p.level) === String(levelKey);
    const stairHere = p.role === 'step' && p.aabb.min[1] >= bandLo - 0.01 && p.aabb.min[1] < bandHi - 0.01;  // this storey's flight
    const floorPanelHere = p.role === 'floor' && p.breakGroup && onLevel;                                     // breakable floor panel
    if (!((onLevel && roles.includes(p.role)) || stairHere || floorPanelHere)) continue;
    const x0 = px(p.aabb.min[0]), z0 = pz(p.aabb.min[2]), ww = (p.aabb.max[0] - p.aabb.min[0]) * S, hh = (p.aabb.max[2] - p.aabb.min[2]) * S;
    const weak = !!p.breakGroup && (p.material === 'weak_panel' || p.material === 'roof_panel_weak');
    b += RC(x0, z0, ww, hh, pieceColor(p), weak ? { stroke: C.hazard, sw: 2, dash: '5 3' } : { stroke: C.wallLine, sw: 1 });
  }
  if (opts.route) { const path = M.routes[opts.route].path.map((n) => M.waypoints[n]); b += `<path d="M ${path.map((p) => `${f(px(p[0]))} ${f(pz(p[2]))}`).join(' L ')}" fill="none" stroke="${C.soldier}" stroke-width="2" stroke-dasharray="2 4" opacity="0.9"/>`; for (const p of path) b += Ci(px(p[0]), pz(p[2]), 3, C.soldier, C.bg, 1.5); }
  if (opts.chaseRoom) { const r = M.rooms.find((x) => x.id === opts.chaseRoom); const cx = (r.aabb.min[0] + r.aabb.max[0]) / 2, cz = (r.aabb.min[2] + r.aabb.max[2]) / 2; b += Ci(px(cx), pz(cz), 6 * S, C.cam, 'none', 1.6, 0.85, '4 4') + Ci(px(cx), pz(cz), 2.2 * S, C.soldier, C.soldier, 1.6, 0.4); b += Tx(px(cx), pz(cz) + 6 * S + 12, `chase-cam Ø${M.fitting.chaseCamComfortDia_u}u`, C.cam, 9, 'middle'); }
  if (opts.case) { const cp = recipe.levels[0].casePedestal; b += Ci(px(cp.x), pz(cp.z), 1.6 * S, C.glow, 'none', 2, 0.9) + Tx(px(cp.x), pz(cp.z) - 2, 'CASE', C.glow, 9, 'middle'); }
  b += dim(px(-HX), pz(minZ) + 20, px(HX), pz(minZ) + 20, uL(M.footprint.width_x), C.gold);
  b += dim(px(maxX) - 22, pz(-HZ), px(maxX) - 22, pz(HZ), uL(M.footprint.depth_z), C.gold);
  for (const [lab, lx, lz] of (opts.labels || [])) b += Tx(px(lx), pz(lz), lab, C.bone, 11, 'middle', 700);
  b += Tx(px(fdCenter()), pz(HZ + 3.5), '▲ FRONT (+Z)', C.bone, 10, 'middle');
  b += scaleBar(PAD, h - 18);
  b += Tx(w - 16, h - 14, opts.note || '', C.dim, 10, 'end');
  return doc(w, h, title, b);
}
function fdCenter() { return M.openings.find((o) => o.id === 'front_door').center[0]; }

// ---------- ELEVATION on a wall (project pieces near that wall) ----------
function elevation(wall, title, opts = {}) {
  const horiz = wall === '+Z' || wall === '-Z';            // horizontal axis = x (front) or z (flank)
  const minA = horiz ? -HX - 4 : -HZ - 4, maxA = horiz ? HX + 4 : HZ + 4, maxY = PARA + 4;
  const w = (maxA - minA) * S + 2 * PAD, h = maxY * S + 2 * PAD;
  const pa = (a) => PAD + (a - minA) * S, py = (y) => PAD + (maxY - y) * S, gY = py(0);
  const near = (p) => wall === '+Z' ? p.aabb.max[2] >= HZ - T - 0.02 : wall === '+X' ? p.aabb.max[0] >= HX - T - 0.02 : false;
  const aOf = (p, lo) => horiz ? (lo ? p.aabb.min[0] : p.aabb.max[0]) : (lo ? p.aabb.min[2] : p.aabb.max[2]);
  let b = '';
  for (const p of M.pieces) {
    if (p.role === 'decor') continue;
    if (!(near(p) || p.role === 'roof' || p.role === 'parapet')) continue;
    const a0 = pa(aOf(p, true)), a1 = pa(aOf(p, false)), y1 = py(p.aabb.max[1]), y0 = py(p.aabb.min[1]);
    const weak = p.material === 'weak_panel' || (p.role === 'roof' && p.breakGroup);
    b += RC(Math.min(a0, a1), y1, Math.abs(a1 - a0), y0 - y1, pieceColor(p), weak ? { stroke: C.hazard, sw: 2, dash: '6 4', o: 0.85 } : { stroke: C.wallLine, sw: 1 });
  }
  b += L(pa(minA), gY, pa(maxA), gY, C.bone, 2);
  b += Tx(pa(0), py(F2F) - 3, `— floor 2 (y ${F2F}u) —`, C.dim, 9, 'middle');
  for (const fig of (opts.figs || [])) b += figElev(pa(fig.a), gY, fig.h, fig.color, fig.label);
  for (const d of (opts.dims || [])) b += d(pa, py, gY);
  b += dim(pa(minA) + 8, py(0), pa(minA) + 8, py(PARA), `H ${uL(PARA)}`, C.gold);
  b += scaleBar(PAD, h - 18);
  b += Tx(w - 16, h - 14, opts.note || '', C.dim, 10, 'end');
  return doc(w, h, title, b);
}

// ---------- SECTION through the stair bay (both floors + switchback) ----------
function section() {
  const bay = recipe.stairs[0], x0cut = (bay.bayMinX + bay.bayMaxX) / 2;
  const minZ = -HZ - 4, maxZ = HZ + 4, maxY = PARA + 4;
  const w = (maxZ - minZ) * S + 2 * PAD, h = maxY * S + 2 * PAD;
  const pz = (z) => PAD + (z - minZ) * S, py = (y) => PAD + (maxY - y) * S, gY = py(0);
  const cut = (p) => p.aabb.min[0] <= x0cut + 0.01 && p.aabb.max[0] >= x0cut - 0.01;
  let b = '';
  for (const p of M.pieces) {
    if (p.role === 'decor') continue; if (!cut(p)) continue;
    const z0 = pz(p.aabb.min[2]), z1 = pz(p.aabb.max[2]), y1 = py(p.aabb.max[1]), y0 = py(p.aabb.min[1]);
    b += RC(Math.min(z0, z1), y1, Math.abs(z1 - z0), y0 - y1, pieceColor(p), { stroke: C.wallLine, sw: 1 });
  }
  b += L(pz(minZ), gY, pz(maxZ), gY, C.bone, 2);
  // figure on a mid step of flight A
  const sa = M.stairs[0].steps[3]; b += figElev(pz((sa.aabb.min[2] + sa.aabb.max[2]) / 2), py(sa.aabb.max[1]), M.fitting.soldierAndStandardHeroHeight_u, C.soldier, '');
  b += dim(pz(minZ) + 8, py(0), pz(minZ) + 8, py(F2F), `floor-to-floor ${uL(F2F)}`, C.gold);
  b += dim(pz(maxZ) - 20, py(0), pz(maxZ) - 20, py(DECK), `to roof ${uL(DECK)}`, C.gold);
  const s0 = M.stairs[0].steps[0];
  b += dim(pz(s0.aabb.max[2]) + 6, py(0), pz(s0.aabb.max[2]) + 6, py(s0.aabb.max[1]), `riser ${uL(f(M.stairs[0].rise))}`, C.bone);
  b += Tx(pz(0), py(F2F) + 14, 'FLOOR 2 SLAB (= ground ceiling)', C.bone, 10, 'middle');
  b += Tx(pz(0), py(DECK) - 4, 'ROOF DECK', C.bone, 10, 'middle');
  b += Tx(pz(0), py(F2F / 2), 'GROUND', C.dim, 10, 'middle'); b += Tx(pz(0), py(F2F + F2F / 2), 'UPPER', C.dim, 10, 'middle');
  b += scaleBar(PAD, h - 18);
  b += Tx(w - 16, h - 14, `SECTION through the stair bay (x=${x0cut}u) · switchback ground→upper→roof`, C.dim, 10, 'end');
  return doc(w, h, 'RESEARCH LAB — SECTION · TWO FLOORS + STAIR', b);
}

// ---------- emit ----------
const O = Object.fromEntries(M.openings.map((o) => [o.id, o]));
const front = elevation('+Z', 'RESEARCH LAB — FRONT ELEVATION · DOOR CLEARANCE (two floors)', {
  figs: [{ a: fdCenter(), h: M.fitting.soldierAndStandardHeroHeight_u, color: C.soldier, label: `soldier ${M.fitting.soldierAndStandardHeroHeight_u}u` },
         { a: HX + 2.2, h: M.fitting.largeHeroMaxHeight_u, color: C.hero, label: `large hero ${M.fitting.largeHeroMaxHeight_u}u` }],
  dims: [(pa, py) => dim(pa(fdCenter() + O.front_door.clearance.w / 2) + 10, py(0), pa(fdCenter() + O.front_door.clearance.w / 2) + 10, py(O.front_door.clearance.h), `door ${uL(O.front_door.clearance.h)}`, C.bone)],
  note: 'ground door + upper windows · soldier clears the door, large hero uses the breach',
});
const flank = elevation('+X', 'RESEARCH LAB — FLANK / BREACH ELEVATION · LARGE-HERO CLEARANCE', {
  figs: [{ a: O.breach_panel.center[2], h: M.fitting.largeHeroMaxHeight_u, color: C.hero, label: `large hero ${M.fitting.largeHeroMaxHeight_u}u` }],
  dims: [(pa, py) => dim(pa(O.breach_panel.center[2] - O.breach_panel.clearance.w / 2), py(0) + 26, pa(O.breach_panel.center[2] + O.breach_panel.clearance.w / 2), py(0) + 26, `breach ${uL(O.breach_panel.clearance.w)}`, C.hazard)],
  note: 'dashed = intact weak panel; break it for a large-hero opening',
});

mkdirSync(OUT, { recursive: true });
const files = {
  'plan-ground.svg': plan(0, 'RESEARCH LAB — GROUND PLAN', { route: 'soldier_recover', chaseRoom: 'ground_entry', case: true, labels: [['ENTRY LAB', -6, 9], ['CASE ROOM', -2, -8], ['STAIR ▲', 15.8, -6]], note: 'ground floor · soldier recover route (cyan) · chase-cam ring (red)' }),
  'plan-upper.svg': plan(1, 'RESEARCH LAB — UPPER PLAN', { chaseRoom: 'upper_front', labels: [['UPPER LAB', -6, 9], ['UPPER STORE', -2, -8], ['STAIR ▲', 15.8, -6]], note: 'upper floor · windows on +Z/-X · stair hole + breakable floor panel (hazard)' }),
  'plan-roof.svg': plan('roof', 'RESEARCH LAB — ROOF PLAN', { labels: [['ROOF DECK', 0, 6]], note: 'accessible deck · parapet edge · stair hatch + breakable roof panel (hazard)' }),
  'section-stairs.svg': section(),
  'elev-front.svg': front,
  'elev-flank-breach.svg': flank,
};
for (const [n, svg] of Object.entries(files)) writeFileSync(join(OUT, n), svg);
console.log(`wrote ${Object.keys(files).length} annotated views -> ${OUT}`);
for (const n of Object.keys(files)) console.log('  ' + n);
