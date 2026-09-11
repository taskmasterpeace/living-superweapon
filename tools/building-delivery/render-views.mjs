// render-views.mjs — deterministic annotated orthographic drawings of the lab, straight from the
// model (no browser, no external input). These are the DIMENSIONED views the handoff asks for:
// soldier-scale door clearance, the stair section, the roof edge, the breach opening and large-hero
// clearance. Silhouettes are drawn to the SAME measured scale the colliders use, so a reader can
// check clearance by eye against the numbers. Output: public/building-delivery/lab.v1/views/*.svg
//
// These are ORTHOGRAPHIC ENGINEERING VIEWS of the real geometry — not generated concept art. The
// GLB screenshots (viewer.html) are the pictorial companion.

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

// palette (Impact bible; literals — SVG/canvas cannot read CSS tokens)
const C = { bg: '#14161c', grid: '#232630', wall: '#c7ad7e', wallLine: '#0a0b10', weak: '#b89a63', hazard: '#ff5a4a',
  stair: '#55575e', roof: '#2a2c33', roofWeak: '#3a3d46', parapet: '#b79d70', ped: '#3a3d46', glow: '#7fe6ff',
  bone: '#e8e2d6', gold: '#ffd24a', dim: '#9aa0ad', soldier: '#7fe6ff', hero: '#ffd24a', door: '#34373f' };

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
function svgDoc(w, h, title, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="Inter,system-ui,sans-serif">
<rect width="${w}" height="${h}" fill="${C.bg}"/>
<text x="16" y="26" fill="${C.gold}" font-size="16" font-weight="700" letter-spacing="0.5">${esc(title)}</text>
${body}
</svg>\n`;
}
const R = (x, y, w, h, fill, opt = {}) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}"${opt.stroke ? ` stroke="${opt.stroke}" stroke-width="${opt.sw || 1}"` : ''}${opt.dash ? ` stroke-dasharray="${opt.dash}"` : ''}${opt.o != null ? ` opacity="${opt.o}"` : ''}/>`;
const L = (x1, y1, x2, y2, stroke, sw = 1, dash) => `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${stroke}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
const Tx = (x, y, s, fill, size = 11, anchor = 'start', weight = 400) => `<text x="${f(x)}" y="${f(y)}" fill="${fill}" font-size="${size}" text-anchor="${anchor}" font-weight="${weight}">${esc(s)}</text>`;
const Circle = (cx, cy, r, stroke, fill = 'none', sw = 1.5, o = 1) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" opacity="${o}"/>`;
const f = (v) => Math.round(v * 100) / 100;

// dimension line with end ticks + label (horizontal or vertical), in screen space
function dim(x1, y1, x2, y2, label, color = C.dim) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const horiz = Math.abs(x2 - x1) >= Math.abs(y2 - y1);
  const t = 4;
  const ticks = horiz
    ? L(x1, y1 - t, x1, y1 + t, color) + L(x2, y2 - t, x2, y2 + t, color)
    : L(x1 - t, y1, x1 + t, y1, color) + L(x2 - t, y2, x2 + t, y2, color);
  return L(x1, y1, x2, y2, color) + ticks +
    `<text x="${f(mx)}" y="${f(my - (horiz ? 4 : 0))}" fill="${color}" font-size="10" text-anchor="middle">${esc(label)}</text>`;
}
const uLabel = (u) => `${u}u / ${(u * MPU).toFixed(2)}m`;

// ---- scale + projections ---------------------------------------------------
const S = 15;                 // px per world unit
const PAD = 70;
const proj = {
  // plan (x right, z: rear at top -> front at bottom)
  planX: (x, minX) => PAD + (x - minX) * S,
  planY: (z, minZ) => PAD + (z - minZ) * S,
  // elevation (a-axis horizontal, y up)
  elevX: (a, minA) => PAD + (a - minA) * S,
  elevY: (y, maxY) => PAD + (maxY - y) * S,
};

function scaleBar(x, y) {
  const len = 10 * S;
  return L(x, y, x + len, y, C.bone, 2) + L(x, y - 4, x, y + 4, C.bone, 2) + L(x + len, y - 4, x + len, y + 4, C.bone, 2) +
    Tx(x + len / 2, y - 8, uLabel(10), C.bone, 10, 'middle');
}

// silhouette figures to scale (elevation): head + torso + legs, total height = hgt (u)
function figElev(cx, groundY, hgt, color, label) {
  const top = groundY - hgt * S;                 // groundY is screen y of feet; up = smaller y
  const headR = hgt * S * 0.11;
  const headCy = top + headR;
  const bodyTop = headCy + headR, bodyBot = groundY - hgt * S * 0.34;
  const shoulderW = hgt * S * 0.16;
  return Circle(cx, headCy, headR, color, 'none', 2) +
    L(cx, bodyTop, cx, bodyBot, color, 2) +
    L(cx - shoulderW, bodyTop + headR * 0.5, cx + shoulderW, bodyTop + headR * 0.5, color, 2) +
    L(cx, bodyBot, cx - shoulderW * 0.8, groundY, color, 2) + L(cx, bodyBot, cx + shoulderW * 0.8, groundY, color, 2) +
    (label ? Tx(cx, groundY + 14, label, color, 9, 'middle') : '');
}

// ============================================================================
// VIEW 1 — GROUND PLAN (soldier recover route + footprints)
// ============================================================================
function planGround() {
  const minX = -M.footprint.width_x / 2 - 6, maxX = M.footprint.width_x / 2 + 6;
  const minZ = -M.footprint.depth_z / 2 - 6, maxZ = M.footprint.depth_z / 2 + 6;
  const w = (maxX - minX) * S + 2 * PAD, h = (maxZ - minZ) * S + 2 * PAD + 40;
  const px = (x) => proj.planX(x, minX), pz = (z) => proj.planY(z, minZ);
  let b = '';
  // grid every 5u
  for (let gx = Math.ceil(minX / 5) * 5; gx <= maxX; gx += 5) b += L(px(gx), pz(minZ), px(gx), pz(maxZ), C.grid, 1);
  for (let gz = Math.ceil(minZ / 5) * 5; gz <= maxZ; gz += 5) b += L(px(minX), pz(gz), px(maxX), pz(gz), C.grid, 1);
  // ground pieces only (min.y <= 0.5): walls, breach panel, stairs, pedestal
  for (const p of M.pieces) {
    if (p.aabb.min[1] > 0.5) continue;
    if (!(p.collider || p.role === 'prop')) continue;
    const x0 = px(p.aabb.min[0]), z0 = pz(p.aabb.min[2]), ww = (p.aabb.max[0] - p.aabb.min[0]) * S, hh = (p.aabb.max[2] - p.aabb.min[2]) * S;
    let fill = C.wall, opt = { stroke: C.wallLine, sw: 1 };
    if (p.role === 'step') fill = C.stair;
    else if (p.material === 'weak_panel') { fill = C.weak; opt = { stroke: C.hazard, sw: 2, dash: '5 3' }; }
    else if (p.role === 'prop') fill = C.ped;
    b += R(x0, z0, ww, hh, fill, opt);
  }
  // case glow ring
  const cp = recipe.casePedestal; b += Circle(px(cp.x), pz(cp.z), 1.6 * S, C.glow, 'none', 2, 0.9);
  // soldier recover route
  const path = M.routes.soldier_recover.path.map((n) => M.waypoints[n]);
  let d = 'M ' + path.map((p) => `${f(px(p[0]))} ${f(pz(p[2]))}`).join(' L ');
  b += `<path d="${d}" fill="none" stroke="${C.soldier}" stroke-width="2" stroke-dasharray="2 4" opacity="0.9"/>`;
  for (const p of path) b += Circle(px(p[0]), pz(p[2]), 3, C.soldier, C.bg, 1.5);
  // soldier footprint (radius) at the door + large-hero footprint at the breach
  const fd = M.openings[0]; b += Circle(px(fd.center[0]), pz(M.footprint.depth_z / 2 - M.footprint.wallThickness / 2), M.fitting.fighterRadius_u * S, C.soldier, 'none', 2) +
    Tx(px(fd.center[0]), pz(M.footprint.depth_z / 2) + 26, `soldier Ø${(2 * M.fitting.fighterRadius_u)}u`, C.soldier, 9, 'middle');
  const bp = M.openings[2]; b += Circle(px(M.footprint.width_x / 2), pz(bp.center[2]), M.fitting.largeHeroMaxWidth_u / 2 * S, C.hero, 'none', 2, 0.9) +
    Tx(px(M.footprint.width_x / 2) + 8, pz(bp.center[2]), `large hero Ø${M.fitting.largeHeroMaxWidth_u}u`, C.hero, 9, 'start');
  // dims: footprint width + depth
  b += dim(px(-M.footprint.width_x / 2), pz(minZ) + 22, px(M.footprint.width_x / 2), pz(minZ) + 22, uLabel(M.footprint.width_x), C.gold);
  b += dim(px(maxX) - 24, pz(-M.footprint.depth_z / 2), px(maxX) - 24, pz(M.footprint.depth_z / 2), uLabel(M.footprint.depth_z), C.gold);
  // door + interior door gap widths
  b += dim(px(fd.center[0] - fd.clearance.w / 2), pz(M.footprint.depth_z / 2) + 6, px(fd.center[0] + fd.clearance.w / 2), pz(M.footprint.depth_z / 2) + 6, `door ${uLabel(fd.clearance.w)}`, C.bone);
  b += dim(px(bp.center[2] * 0 + M.footprint.width_x / 2) + 4, pz(bp.center[2] - bp.clearance.w / 2), px(M.footprint.width_x / 2) + 4, pz(bp.center[2] + bp.clearance.w / 2), `breach ${uLabel(bp.clearance.w)}`, C.hazard);
  // labels
  b += Tx(px(-6), pz(9), 'ENTRY LAB', C.bone, 12, 'middle', 700);
  b += Tx(px(-2), pz(-6), 'CASE ROOM', C.bone, 12, 'middle', 700);
  b += Tx(px(cp.x), pz(cp.z) - 2, 'CASE', C.glow, 9, 'middle');
  b += Tx(px(10.8), pz(-6), 'STAIR', C.bone, 10, 'middle');
  b += Tx(px(fd.center[0]), pz(M.footprint.depth_z / 2 + 4), '▲ FRONT (+Z)', C.bone, 10, 'middle');
  b += Tx(px(M.footprint.width_x / 2 + 4), pz(bp.center[2]) - 10, 'FLANK (+X) ▶', C.hazard, 10, 'start');
  b += scaleBar(PAD, h - 24);
  b += Tx(w - 16, h - 20, 'GROUND PLAN · soldier recover route (cyan) · rear at top, entrance at bottom', C.dim, 10, 'end');
  return svgDoc(w, h, 'RESEARCH LAB — GROUND PLAN', b);
}

// ============================================================================
// VIEW 2 — FRONT ELEVATION (door clearance)
// ============================================================================
function elevFront() {
  const minX = -M.footprint.width_x / 2 - 4, maxX = M.footprint.width_x / 2 + 4;
  const maxY = M.storey.parapetTop_y + 4;
  const w = (maxX - minX) * S + 2 * PAD, h = maxY * S + 2 * PAD;
  const px = (x) => proj.elevX(x, minX), py = (y) => proj.elevY(y, maxY);
  const groundScreenY = py(0);
  let b = '';
  // building silhouette (front wall band), door opening cut, lintel, parapet, roof
  const fd = M.openings[0];
  const wt = M.footprint.wallThickness;
  // wall as two flanks + lintel (front elevation)
  b += R(px(-M.footprint.width_x / 2), py(M.storey.ceilingUnderside_y), (fd.center[0] - fd.clearance.w / 2 + M.footprint.width_x / 2) * S, M.storey.ceilingUnderside_y * S, C.wall, { stroke: C.wallLine });
  b += R(px(fd.center[0] + fd.clearance.w / 2), py(M.storey.ceilingUnderside_y), (M.footprint.width_x / 2 - fd.center[0] - fd.clearance.w / 2) * S, M.storey.ceilingUnderside_y * S, C.wall, { stroke: C.wallLine });
  b += R(px(fd.center[0] - fd.clearance.w / 2), py(M.storey.ceilingUnderside_y), fd.clearance.w * S, (M.storey.ceilingUnderside_y - fd.clearance.h) * S, C.wall, { stroke: C.wallLine }); // lintel
  // door frame (gold) + open leaf hint
  b += R(px(fd.center[0] - fd.clearance.w / 2 - 0.6), py(fd.clearance.h + 0.6), (fd.clearance.w + 1.2) * S, 0.6 * S, C.gold);
  b += R(px(fd.center[0] - fd.clearance.w / 2 - 0.6), py(fd.clearance.h), 0.6 * S, fd.clearance.h * S, C.gold);
  b += R(px(fd.center[0] + fd.clearance.w / 2), py(fd.clearance.h), 0.6 * S, fd.clearance.h * S, C.gold);
  // roof slab + parapet
  b += R(px(-M.footprint.width_x / 2), py(M.storey.deckTop_y), M.footprint.width_x * S, (M.storey.deckTop_y - M.storey.ceilingUnderside_y) * S, C.roof, { stroke: C.wallLine });
  b += R(px(-M.footprint.width_x / 2), py(M.storey.parapetTop_y), M.footprint.width_x * S, (M.storey.parapetTop_y - M.storey.deckTop_y) * S, C.parapet, { stroke: C.wallLine, o: 0.85 });
  // ground line
  b += L(px(minX), groundScreenY, px(maxX), groundScreenY, C.bone, 2);
  // figures: soldier (9.6u) in the doorway + a standing head-height marker (11u)
  b += figElev(px(fd.center[0]), groundScreenY, M.fitting.soldierAndStandardHeroHeight_u, C.soldier, `soldier ${M.fitting.soldierAndStandardHeroHeight_u}u`);
  // large hero to the side (shows he does NOT fit the door)
  b += figElev(px(M.footprint.width_x / 2 + 2.2), groundScreenY, M.fitting.largeHeroMaxHeight_u, C.hero, `large hero ${M.fitting.largeHeroMaxHeight_u}u`);
  // dims: door height + width, building height
  b += dim(px(fd.center[0] + fd.clearance.w / 2) + 10, py(0), px(fd.center[0] + fd.clearance.w / 2) + 10, py(fd.clearance.h), `door ${uLabel(fd.clearance.h)}`, C.bone);
  b += dim(px(fd.center[0] - fd.clearance.w / 2), py(0) + 26, px(fd.center[0] + fd.clearance.w / 2), py(0) + 26, uLabel(fd.clearance.w), C.bone);
  b += dim(px(-M.footprint.width_x / 2) - 12, py(0), px(-M.footprint.width_x / 2) - 12, py(M.storey.parapetTop_y), `H ${uLabel(M.storey.parapetTop_y)}`, C.gold);
  b += Tx(px(0), py(M.storey.deckTop_y + 1) - 4, 'ROOF DECK (accessible)', C.bone, 10, 'middle');
  b += Tx(px(fd.center[0]), py(fd.clearance.h) - 4, `head clearance +${(fd.clearance.h - M.fitting.standingHeadHeight_u).toFixed(1)}u over ${M.fitting.standingHeadHeight_u}u`, C.soldier, 9, 'middle');
  b += scaleBar(PAD, h - 20);
  b += Tx(w - 16, h - 16, 'FRONT ELEVATION (+Z) · soldier clears the door; large hero uses the breach', C.dim, 10, 'end');
  return svgDoc(w, h, 'RESEARCH LAB — FRONT ELEVATION · DOOR CLEARANCE', b);
}

// ============================================================================
// VIEW 3 — FLANK ELEVATION (breach opening + large-hero clearance)
// ============================================================================
function elevFlank() {
  const minZ = -M.footprint.depth_z / 2 - 4, maxZ = M.footprint.depth_z / 2 + 4;
  const maxY = M.storey.parapetTop_y + 4;
  const w = (maxZ - minZ) * S + 2 * PAD, h = maxY * S + 2 * PAD;
  // z increases to the RIGHT (front on the right)
  const pz = (z) => proj.elevX(z, minZ), py = (y) => proj.elevY(y, maxY);
  const groundScreenY = py(0);
  const bp = M.openings[2];
  let b = '';
  const z0 = bp.center[2] - bp.clearance.w / 2, z1 = bp.center[2] + bp.clearance.w / 2;
  // flank wall flanks + lintel above breach + solid below-none
  b += R(pz(-M.footprint.depth_z / 2), py(M.storey.ceilingUnderside_y), (z0 + M.footprint.depth_z / 2) * S, M.storey.ceilingUnderside_y * S, C.wall, { stroke: C.wallLine });
  b += R(pz(z1), py(M.storey.ceilingUnderside_y), (M.footprint.depth_z / 2 - z1) * S, M.storey.ceilingUnderside_y * S, C.wall, { stroke: C.wallLine });
  b += R(pz(z0), py(M.storey.ceilingUnderside_y), bp.clearance.w * S, (M.storey.ceilingUnderside_y - bp.clearance.h) * S, C.wall, { stroke: C.wallLine }); // lintel above breach
  // the weak panel (intact) with hazard stripes — drawn semi-transparent to show it fills the hole
  b += R(pz(z0), py(bp.clearance.h), bp.clearance.w * S, bp.clearance.h * S, C.weak, { stroke: C.hazard, sw: 2, dash: '6 4', o: 0.55 });
  for (let i = 0; i < 3; i++) { const zc = bp.center[2] + (i - 1) * (bp.clearance.w / 3.2); b += R(pz(zc - 0.9), py(bp.clearance.h - 1.5), 1.8 * S, (bp.clearance.h - 3) * S, C.hazard, { o: 0.5 }); }
  // roof + parapet
  b += R(pz(-M.footprint.depth_z / 2), py(M.storey.deckTop_y), M.footprint.depth_z * S, (M.storey.deckTop_y - M.storey.ceilingUnderside_y) * S, C.roof, { stroke: C.wallLine });
  b += R(pz(-M.footprint.depth_z / 2), py(M.storey.parapetTop_y), M.footprint.depth_z * S, (M.storey.parapetTop_y - M.storey.deckTop_y) * S, C.parapet, { stroke: C.wallLine, o: 0.85 });
  b += L(pz(minZ), groundScreenY, pz(maxZ), groundScreenY, C.bone, 2);
  // large hero silhouette centred in the breach — fits
  b += figElev(pz(bp.center[2]), groundScreenY, M.fitting.largeHeroMaxHeight_u, C.hero, `large hero ${M.fitting.largeHeroMaxHeight_u}u`);
  // large-hero width bracket vs breach width
  b += Circle(pz(bp.center[2]), groundScreenY - M.fitting.largeHeroMaxHeight_u * S * 0.5, M.fitting.largeHeroMaxWidth_u / 2 * S, C.hero, 'none', 1.5, 0.6);
  // dims
  b += dim(pz(z0), py(0) + 26, pz(z1), py(0) + 26, `breach ${uLabel(bp.clearance.w)}`, C.hazard);
  b += dim(pz(z1) + 10, py(0), pz(z1) + 10, py(bp.clearance.h), `breach ${uLabel(bp.clearance.h)}`, C.hazard);
  b += Tx(pz(bp.center[2]), py(bp.clearance.h) - 4, `clears large hero (${M.fitting.largeHeroMaxWidth_u}u wide, ${M.fitting.largeHeroMaxHeight_u}u tall)`, C.hero, 9, 'middle');
  b += Tx(pz(bp.center[2]), py(bp.clearance.h / 2), 'WEAK PANEL (intact)', C.hazard, 10, 'middle', 700);
  b += scaleBar(PAD, h - 20);
  b += Tx(w - 16, h - 16, 'FLANK ELEVATION (+X) · dashed = intact weak panel; break it for a large-hero opening', C.dim, 10, 'end');
  return svgDoc(w, h, 'RESEARCH LAB — FLANK / BREACH ELEVATION · LARGE-HERO CLEARANCE', b);
}

// ============================================================================
// VIEW 4 — STAIR SECTION
// ============================================================================
function sectionStairs() {
  const minZ = -M.footprint.depth_z / 2 - 4, maxZ = M.footprint.depth_z / 2 + 4;
  const maxY = M.storey.parapetTop_y + 4;
  const w = (maxZ - minZ) * S + 2 * PAD, h = maxY * S + 2 * PAD;
  const pz = (z) => proj.elevX(z, minZ), py = (y) => proj.elevY(y, maxY);
  const groundScreenY = py(0);
  let b = '';
  // shell walls (section cut) at front & rear
  b += R(pz(M.footprint.depth_z / 2 - M.footprint.wallThickness), py(M.storey.ceilingUnderside_y), M.footprint.wallThickness * S, M.storey.ceilingUnderside_y * S, C.wall, { stroke: C.wallLine });
  b += R(pz(-M.footprint.depth_z / 2), py(M.storey.ceilingUnderside_y), M.footprint.wallThickness * S, M.storey.ceilingUnderside_y * S, C.wall, { stroke: C.wallLine });
  // roof slab + hatch gap + parapet
  const hatch = recipe.openings.roof_hatch;
  const hz0 = hatch.centerZ - hatch.depth / 2, hz1 = hatch.centerZ + hatch.depth / 2;
  b += R(pz(-M.footprint.depth_z / 2), py(M.storey.deckTop_y), (hz0 + M.footprint.depth_z / 2) * S, (M.storey.deckTop_y - M.storey.ceilingUnderside_y) * S, C.roof, { stroke: C.wallLine });
  b += R(pz(hz1), py(M.storey.deckTop_y), (M.footprint.depth_z / 2 - hz1) * S, (M.storey.deckTop_y - M.storey.ceilingUnderside_y) * S, C.roof, { stroke: C.wallLine });
  // stairs (each step from floor to its top)
  for (const st of M.stairs.steps) {
    const z0 = st.aabb.min[2], z1 = st.aabb.max[2], top = st.aabb.max[1];
    b += R(pz(z0), py(top), (z1 - z0) * S, top * S, C.stair, { stroke: C.wallLine });
  }
  b += L(pz(minZ), groundScreenY, pz(maxZ), groundScreenY, C.bone, 2);
  // figure on a mid step
  const mid = M.stairs.steps[3]; const midz = (mid.aabb.min[2] + mid.aabb.max[2]) / 2; const midtop = mid.aabb.max[1];
  b += figElev(pz(midz), py(midtop), M.fitting.soldierAndStandardHeroHeight_u, C.soldier, '');
  // dims: riser + tread + total rise + hatch
  const s0 = M.stairs.steps[0];
  b += dim(pz(s0.aabb.max[2]) + 6, py(0), pz(s0.aabb.max[2]) + 6, py(s0.aabb.max[1]), `riser ${uLabel(M.stairs.rise)}`, C.gold);
  b += dim(pz(s0.aabb.min[2]), groundScreenY + 22, pz(s0.aabb.max[2]), groundScreenY + 22, `tread ${uLabel(M.stairs.tread)}`, C.bone);
  b += dim(pz(-M.footprint.depth_z / 2) - 12, py(0), pz(-M.footprint.depth_z / 2) - 12, py(M.storey.deckTop_y), `rise ${uLabel(M.storey.deckTop_y)}`, C.gold);
  b += dim(pz(hz0), py(M.storey.deckTop_y) - 8, pz(hz1), py(M.storey.deckTop_y) - 8, `hatch ${uLabel(hatch.width)}`, C.bone);
  b += dim(pz(M.footprint.depth_z / 2 - M.footprint.wallThickness) + 4, py(0), pz(M.footprint.depth_z / 2 - M.footprint.wallThickness) + 4, py(M.storey.ceilingUnderside_y), `ceiling ${uLabel(M.storey.ceilingUnderside_y)}`, C.bone);
  b += Tx(pz(M.stairs.steps[6].aabb.min[2]), py(M.storey.deckTop_y) - 6, 'HATCH → ROOF', C.bone, 9, 'middle');
  b += Tx(pz(0), py(M.storey.deckTop_y + 1) - 4, 'ROOF DECK', C.bone, 10, 'middle');
  b += scaleBar(PAD, h - 20);
  b += Tx(w - 16, h - 16, `SECTION through the stair bay · ${M.stairs.steps.length} steps to the roof (riser ≤ 2.5u snap tolerance)`, C.dim, 10, 'end');
  return svgDoc(w, h, 'RESEARCH LAB — STAIR SECTION · ROOF ACCESS', b);
}

// ============================================================================
// VIEW 5 — ROOF PLAN (roof edge + hatch + breakable panel)
// ============================================================================
function planRoof() {
  const minX = -M.footprint.width_x / 2 - 6, maxX = M.footprint.width_x / 2 + 6;
  const minZ = -M.footprint.depth_z / 2 - 6, maxZ = M.footprint.depth_z / 2 + 6;
  const w = (maxX - minX) * S + 2 * PAD, h = (maxZ - minZ) * S + 2 * PAD + 20;
  const px = (x) => proj.planX(x, minX), pz = (z) => proj.planY(z, minZ);
  let b = '';
  // deck
  b += R(px(-M.footprint.width_x / 2), pz(-M.footprint.depth_z / 2), M.footprint.width_x * S, M.footprint.depth_z * S, C.roof, { stroke: C.wallLine });
  // parapet ring (draw as outline thickness)
  const pt = recipe.storey.parapetThickness;
  b += R(px(-M.footprint.width_x / 2), pz(-M.footprint.depth_z / 2), M.footprint.width_x * S, M.footprint.depth_z * S, 'none', { stroke: C.parapet, sw: pt * S });
  // hatch
  const hatch = recipe.openings.roof_hatch;
  b += R(px(hatch.centerX - hatch.width / 2), pz(hatch.centerZ - hatch.depth / 2), hatch.width * S, hatch.depth * S, C.bg, { stroke: C.bone, sw: 1.5 });
  b += Tx(px(hatch.centerX), pz(hatch.centerZ), 'HATCH', C.bone, 9, 'middle');
  // breakable roof panel (hazard)
  const rwp = recipe.roofWeakPanel;
  b += R(px(rwp.centerX - rwp.width / 2), pz(rwp.centerZ - rwp.depth / 2), rwp.width * S, rwp.depth * S, C.roofWeak, { stroke: C.hazard, sw: 2, dash: '6 4' });
  b += Tx(px(rwp.centerX), pz(rwp.centerZ), 'WEAK ROOF', C.hazard, 9, 'middle');
  b += Tx(px(rwp.centerX), pz(rwp.centerZ) + 12, '(smash-through)', C.hazard, 8, 'middle');
  // figure at the roof edge for scale
  b += Circle(px(0), pz(M.footprint.depth_z / 2 - 1.5), M.fitting.fighterRadius_u * S, C.soldier, 'none', 2) + Tx(px(0), pz(M.footprint.depth_z / 2 - 1.5) - 6, 'at edge', C.soldier, 8, 'middle');
  // dims
  b += dim(px(-M.footprint.width_x / 2), pz(minZ) + 22, px(M.footprint.width_x / 2), pz(minZ) + 22, `deck ${uLabel(M.footprint.width_x)}`, C.gold);
  b += dim(px(maxX) - 24, pz(-M.footprint.depth_z / 2), px(maxX) - 24, pz(M.footprint.depth_z / 2), uLabel(M.footprint.depth_z), C.gold);
  b += Tx(px(0), pz(M.footprint.depth_z / 2 + 3.5), 'parapet edge — deck top 15u / parapet 17.2u', C.bone, 10, 'middle');
  b += scaleBar(PAD, h - 24);
  b += Tx(w - 16, h - 20, 'ROOF PLAN · accessible deck, hatch at stairhead, one breakable panel over the case room', C.dim, 10, 'end');
  return svgDoc(w, h, 'RESEARCH LAB — ROOF PLAN · EDGE + HATCH + WEAK PANEL', b);
}

mkdirSync(OUT, { recursive: true });
const files = { 'plan-ground.svg': planGround(), 'elev-front.svg': elevFront(), 'elev-flank-breach.svg': elevFlank(), 'section-stairs.svg': sectionStairs(), 'plan-roof.svg': planRoof() };
for (const [name, svg] of Object.entries(files)) writeFileSync(join(OUT, name), svg);
console.log(`wrote ${Object.keys(files).length} annotated views -> ${OUT}`);
for (const n of Object.keys(files)) console.log('  ' + n);
