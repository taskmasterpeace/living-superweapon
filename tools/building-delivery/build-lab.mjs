// build-lab.mjs — generate the research-lab delivery package from the authored recipe.
//
//   node tools/building-delivery/build-lab.mjs            # build into public/building-delivery/lab.v1
//   node tools/building-delivery/build-lab.mjs --out DIR  # build elsewhere (used by reproduce)
//
// Deterministic: no timestamps, no randomness, no external input. A clean checkout rebuilds
// byte-identical files (verify with reproduce-lab.mjs). Provenance date comes from the recipe.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { buildModel } from './lib/model.mjs';
import { boxesToGlb, meshStats } from './lib/glb-write.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
export const RECIPE_PATH = join(REPO, 'authoring', 'buildings', 'lab.v1', 'recipe.json');
export const DEFAULT_OUT = join(REPO, 'public', 'building-delivery', 'lab.v1');

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const jsonBuf = (obj) => Buffer.from(JSON.stringify(obj, null, 2) + '\n', 'utf8');

// group pieces into GLB render nodes (one material per node)
function renderNodes(model) {
  const byNode = new Map();
  for (const p of model.pieces) {
    if (!byNode.has(p.node)) byNode.set(p.node, { name: p.node, material: { color: p.color, metallic: p.metallic, roughness: p.roughness, emissive: p.emissive }, boxes: [], pieces: [] });
    const g = byNode.get(p.node);
    g.boxes.push(p.aabb); g.pieces.push(p.id);
    if (g.material.color !== p.color) console.warn(`  ! node ${p.node} mixes colors (${g.material.color} vs ${p.color})`);
  }
  return [...byNode.values()];
}

export function generatePackage(recipePath = RECIPE_PATH) {
  const recipe = JSON.parse(readFileSync(recipePath, 'utf8'));
  const model = buildModel(recipe);
  const nodes = renderNodes(model);
  const glb = boxesToGlb(nodes, { name: recipe.id });
  const stats = meshStats(nodes);

  // ---- collider module -----------------------------------------------------
  const colliders = {
    id: recipe.id, version: recipe.version, kind: recipe.kind,
    space: 'building-local — origin at footprint ground-centre, floor plane y=0, +Y up, entrance faces +Z, breach flank +X. AABBs are min/max in world units (u).',
    units: model.units, axes: model.axes,
    note: 'Stable-ID collider pieces. `collider` = blocks movement/projectiles; `standable` = you can rest on its top (role floor/step/roof/prop); `breakable` pieces vanish when their breakGroup breaks (state "intact-only"). Decor pieces (collider:false, standable:false) are render-only and carry no physics. This is the AUTHORITATIVE physics description; the GLB nodes (same `node` names) are render only.',
    pieces: model.pieces.map((p) => ({
      id: p.id, node: p.node, level: p.level, role: p.role, material: p.material,
      collider: p.collider, standable: p.standable, breakable: p.breakable, breakGroup: p.breakGroup,
      state: p.state, hp: p.hp, dtype: p.dtype, aabb: p.aabb,
    })),
    breakGroups: model.breakGroups,
    fadeNodesByLevel: model.fadeNodesByLevel,
    states: model.states,
  };

  // ---- opening + room graph -------------------------------------------------
  const roomGraph = {
    id: recipe.id, version: recipe.version,
    note: 'Rooms as volumes, openings as edges (with clearance and state gate), plus navigation waypoints and named routes. Opening centres double as the runtime `doorways` nav points (src/engine/citytiles.js bungalow `doorways`).',
    rooms: model.rooms, openings: model.openings, waypoints: model.waypoints, routes: model.routes,
    stairs: model.stairs,
  };
  const openings = { id: recipe.id, version: recipe.version, openings: model.openings, note: roomGraph.note };
  const shelter = {
    id: recipe.id, version: recipe.version,
    note: 'Roof + shelter volumes. `interior_shelter` suppresses rain, transitions interior ambient at openings, and asks the camera to shorten its boom (collision-safe) while the player is inside. `roofVolume.standableTop` is the accessible roof deck height.',
    shelter: model.shelter, roofVolume: model.roofVolume,
  };
  const debris = {
    id: recipe.id, version: recipe.version,
    note: 'Bounded debris per breakable. Chunk counts, size ranges, tri budget and lifetime are suggestions; spawnAABB is the volume the breaking piece occupied. Never a whole-building shatter.',
    debris: model.debris,
  };

  // ---- direct runtime subset (GROUND FLOOR, works TODAY on world.interiors) --
  const S = model.storey, HX = recipe.footprint.width_x / 2, HZ = recipe.footprint.depth_z / 2;
  const groundTop = S.floorToFloor;   // ground-floor ceiling = the upper-floor slab top (single-storey `top` for the subset)
  // Project only ground-floor floor-standing blockers (level 0, min.y ~ 0). Lintels (min.y > 0) are
  // overhead and MUST be excluded, or they would put a solid box across a doorway.
  const groundWalls = model.pieces
    .filter((p) => p.collider && p.role === 'blocker' && p.level === 0 && p.aabb.min[1] <= 0.01)
    .map((p) => ({ id: p.id, breakGroup: p.breakGroup || undefined,
      x: (p.aabb.min[0] + p.aabb.max[0]) / 2, z: (p.aabb.min[2] + p.aabb.max[2]) / 2,
      hx: (p.aabb.max[0] - p.aabb.min[0]) / 2, hz: (p.aabb.max[2] - p.aabb.min[2]) / 2 }));
  const fdO = model.openings.find((o) => o.id === 'front_door'), idO = model.openings.find((o) => o.id === 'interior_door_l0');
  const runtimeInterior = {
    id: recipe.id, version: recipe.version,
    note: 'DIRECT-SUBSET projection of the GROUND FLOOR onto the current runtime world.interiors contract (src/engine/world.js:95, entity.js:2085): intact ground-floor shell + partition as vertical AABBs floor->top(=upper-floor slab) with door GAPS. Lintels are omitted so no box sits across a doorway. Place by adding a world (x,z) centre + yaw; coordinates are building-local.',
    caveats: 'GROUND FLOOR ONLY. This single-storey contract cannot carry the upper floor, the inter-storey slab, the stairs (no intermediate standable surface), per-piece breakable state, floor/roof smash panels, or the roof-as-real-top. `top` here is the upper-floor slab (16u), NOT the roof (32u) — standing "on top" via this record would put you on the upper floor. The full two-story building needs the extension seam + per-camera fade in docs/building-delivery/INTEGRATION.md. To breach the ground flank, drop the wall whose `breakGroup` is "breach_panel".',
    interior: {
      x: 0, z: 0, hx: HX, hz: HZ, top: groundTop,
      levels: model.meta.levels, rooms: model.rooms.filter((r) => r.level === 0).length,
      walls: groundWalls.map(({ id, breakGroup, x, z, hx, hz }) => ({ x: r5(x), z: r5(z), hx: r5(hx), hz: r5(hz), id, ...(breakGroup ? { breakGroup } : {}) })),
      doorways: [
        [r5(fdO.center[0]), r5(HZ - recipe.footprint.wallThickness / 2)],
        [r5(idO.center[0]), r5(recipe.levels[0].partition.z)],
      ],
    },
  };

  // ---- assemble files, hash, manifest --------------------------------------
  const files = [];
  const push = (name, buf) => files.push({ name, buffer: buf, sha256: sha256(buf), bytes: buf.length });
  push(recipe.outputs.renderMesh, glb);
  push(recipe.outputs.colliders, jsonBuf(colliders));
  push(recipe.outputs.openings, jsonBuf(openings));
  push(recipe.outputs.roomGraph, jsonBuf(roomGraph));
  push(recipe.outputs.shelter, jsonBuf(shelter));
  push(recipe.outputs.debris, jsonBuf(debris));
  push(recipe.outputs.runtimeInterior, jsonBuf(runtimeInterior));

  const MPU = model.units.metersPerUnit, op = (id) => model.openings.find((o) => o.id === id);
  const dims = {
    footprint_u: { width_x: recipe.footprint.width_x, depth_z: recipe.footprint.depth_z, wallThickness: recipe.footprint.wallThickness },
    levels: model.meta.levels, floorToFloor_u: S.floorToFloor, perFloorCeiling_u: S.ceilingUnderside_y,
    bbox_u: model.bbox, roofDeckTop_u: S.deckTop_y, parapetTop_u: S.parapetTop_y, interiorClearHalf_u: S.interiorHalf,
    footprint_m: { width: r5(recipe.footprint.width_x * MPU), depth: r5(recipe.footprint.depth_z * MPU) },
    heightTotal_m: r5(S.parapetTop_y * MPU), perFloorCeiling_m: r5(S.ceilingUnderside_y * MPU),
  };
  const R2 = model.fitting.fighterRadius_u, HEAD = model.fitting.standingHeadHeight_u;
  const LHW = model.fitting.largeHeroMaxWidth_u, LHH = model.fitting.largeHeroMaxHeight_u, CAM = model.fitting.chaseCamComfortDia_u;
  const roomInner = (id) => { const r = model.rooms.find((x) => x.id === id); return r ? { w: r5(r.aabb.max[0] - r.aabb.min[0]), d: r5(r.aabb.max[2] - r.aabb.min[2]) } : null; };
  const clearances = {
    frontDoor_u: op('front_door').clearance, interiorDoor_u: op('interior_door_l0').clearance,
    breachOpening_u: op('breach_panel').clearance, upperWindow_u: op('window_front').clearance,
    fitsSoldier: op('front_door').clearance.w >= 2 * R2 + 1 && op('front_door').clearance.h >= HEAD,
    fitsLargeHeroThroughBreach: op('breach_panel').clearance.w >= LHW && op('breach_panel').clearance.h >= LHH,
    stairs: model.stairs.map((s) => ({ id: s.id, from: s.from, to: s.to, steps: s.steps.length, riser_u: s.rise, tread_u: s.tread, reachesTop: s.reachesTop, maxRiser_u: s.maxRiser })),
    chaseCamComfort: { ringDia_u: CAM, groundEntry: roomInner('ground_entry'), upperFront: roomInner('upper_front'),
      groundEntryFits: (() => { const r = roomInner('ground_entry'); return !!r && r.w >= CAM && r.d >= CAM; })(),
      upperFrontFits: (() => { const r = roomInner('upper_front'); return !!r && r.w >= CAM && r.d >= CAM; })() },
  };

  const manifest = {
    id: recipe.id, version: recipe.version, title: recipe.title, kind: recipe.kind,
    generatedBy: 'tools/building-delivery/build-lab.mjs', deterministic: true,
    provenance: recipe.provenance, license: recipe.license, generator: recipe.generator,
    units: model.units, axes: model.axes, fitting: model.fitting,
    dimensions: dims, clearances,
    budgets: { ...stats, renderNodes: nodes.length, glbBytes: glb.length, levels: model.meta.levels, colliderPieces: model.pieces.filter((p) => p.collider).length, breakables: Object.keys(recipe.breakables).length, rooms: model.rooms.length, openings: model.openings.length, stairs: model.stairs.length },
    files: files.map((f) => ({ path: f.name, sha256: f.sha256, bytes: f.bytes, role: fileRole(f.name, recipe) })).sort((a, b) => a.path.localeCompare(b.path)),
    renderNodeList: nodes.map((n) => ({ node: n.name, pieces: n.pieces })),
    knownGaps: KNOWN_GAPS,
    integration: 'See docs/building-delivery/INTEGRATION.md for the exact seam (direct subset + extension points).',
  };
  const manifestBuf = jsonBuf(manifest);
  manifest._selfHashNote = 'manifest hashes cover every OTHER output; this file is not self-hashed.';
  files.push({ name: recipe.outputs.manifest, buffer: manifestBuf, sha256: sha256(manifestBuf), bytes: manifestBuf.length });
  // packageHash over the sorted (path, sha256) of the non-manifest files:
  const packageHash = sha256(Buffer.from(manifest.files.map((f) => f.path + ':' + f.sha256).join('\n')));
  manifest.packageHash = packageHash;
  const finalManifestBuf = jsonBuf(manifest);
  files[files.length - 1] = { name: recipe.outputs.manifest, buffer: finalManifestBuf, sha256: sha256(finalManifestBuf), bytes: finalManifestBuf.length };

  return { recipe, model, nodes, files, manifest };
}

function r5(v) { return Math.round(v * 1e5) / 1e5; }
function fileRole(name, recipe) {
  const o = recipe.outputs; const m = { [o.renderMesh]: 'render-mesh', [o.colliders]: 'colliders', [o.openings]: 'openings', [o.roomGraph]: 'room-graph', [o.shelter]: 'shelter', [o.debris]: 'debris', [o.runtimeInterior]: 'runtime-subset', [o.manifest]: 'manifest' };
  return m[name] || 'data';
}

const KNOWN_GAPS = [
  'THIRD-PERSON VISIBILITY IS PER-CAMERA FADE, NOT ROOF REMOVAL. Indoors the runtime must fade only the geometry between the chase camera and the player (roof, the floor-slab above the player, near walls) — the storey you are in and lower storeys stay solid. Node names carry the level (fadeNodesByLevel in colliders.json) so this is storey-agnostic. The roof-off shot in the renders is an AUTHORING view only, never the gameplay model.',
  'Multi-level colliders need the runtime extension: the current world.interiors is single-storey floor->top columns. The upper floor, the inter-storey slab, the stairs (no intermediate standable surface), per-piece breakable state, floor/roof smash panels, and the roof-as-real-top are a superset. runtime-interior.json carries only the GROUND FLOOR (its `top` is the upper-floor slab, not the roof). See INTEGRATION.md §B.',
  'Auto step-up: the runtime moves by walk + jump + fly with no stair step-up. Both stair flights are walkable in proportion (riser <= 2.5u snap tolerance) and reach their level; climbing on foot needs the movement step-up seam (or jumping the steps / flight). Validated geometrically by the fixture.',
  'Debris is a bounded SPEC (counts/sizes/lifetime/spawn volume), not baked chunk meshes; the runtime spawns them. No collapse simulation.',
  'The research case object is a FrontlineEncounter runtime entity; this package supplies the pedestal and case_spawn waypoint, not the case. The dev viewer needs three.js (CDN) and is not a build input.',
  'Main task must verify native camera boom/fade, projectile collision, rain occlusion, AI pathing and destruction in-engine; the standalone fixture proves geometry/clearance/LOS/fade-node math only, not gameplay feel.',
];

// CLI — run only when invoked directly (not when imported by reproduce-lab.mjs).
const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const outArg = process.argv.indexOf('--out');
  const out = outArg >= 0 ? resolve(process.argv[outArg + 1]) : DEFAULT_OUT;
  const recArg = process.argv.indexOf('--recipe');
  const recipePath = recArg >= 0 ? resolve(process.argv[recArg + 1]) : RECIPE_PATH;
  mkdirSync(out, { recursive: true });
  const { files, manifest } = generatePackage(recipePath);
  for (const f of files) writeFileSync(join(out, f.name), f.buffer);
  console.log(`built ${files.length} files -> ${out}`);
  console.log(`  packageHash ${manifest.packageHash}`);
  console.log(`  budgets: ${manifest.budgets.triangles} tris, ${manifest.budgets.drawCalls} draw calls (${manifest.budgets.renderNodes} nodes), ${manifest.budgets.materials} materials, ${manifest.budgets.glbBytes} GLB bytes`);
  console.log(`  colliders: ${manifest.budgets.colliderPieces} pieces, ${manifest.budgets.breakables} breakables, ${manifest.budgets.rooms} rooms, ${manifest.budgets.openings} openings`);
  for (const f of manifest.files) console.log(`    ${f.sha256.slice(0, 12)}  ${f.path}  (${f.bytes}b, ${f.role})`);
}
