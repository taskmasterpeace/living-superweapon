// THE ROAD NETWORK — extracted from world.js (code review item 8).
//
// Methods of World, installed onto World.prototype as a mixin; the text is byte-identical to
// what left world.js.
//
// ⚠ Roads are DATA, not a texture (docs/THE_MAP_MAKER.md): `plan.roads.h/v` hold a CLASS per
// edge and 0 means there is no road there — that is what makes a dead end possible. Geometry
// is one subdivided ribbon per edge DRAPED over heightAt, built AFTER excavation so it dips
// into the metro cut. Crosswalk bars must stay WIDE and CLOSE or a crossing reads as litter.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CELL, ROAD, junctionAt } from '../data/cityplan.js';


export const RoadMixin = {
  _roadTex(classId) {
    this._roadTexes = this._roadTexes || {};
    if (this._roadTexes[classId]) return this._roadTexes[classId];
    const R = ROAD[classId];
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    const dirt = R.mat === 'dirt';
    if (dirt) {
      x.fillStyle = '#9a8261'; x.fillRect(0, 0, 128, 128);
      x.fillStyle = 'rgba(112,92,62,0.5)'; x.fillRect(30, 0, 16, 128); x.fillRect(82, 0, 16, 128);   // wheel ruts
      x.fillStyle = 'rgba(160,142,108,0.55)';
      for (let i = 0; i < 260; i++) x.fillRect((i * 61) % 128, (i * 37) % 128, 2, 2);                 // gravel (deterministic)
      x.fillStyle = 'rgba(126,132,86,0.35)'; x.fillRect(60, 0, 8, 128);                               // grass down the crown
    } else {
      // ⚠ ASPHALT MUST READ AS ASPHALT. The first pass painted a #c3bcac shoulder under a #6e6a61
      // carriageway and multiplied the whole thing by a warm #b9b1a2 material tint; under the sun
      // and ACES that came out a light warm tan, so from above a street had almost no value
      // separation from the lot beside it and the city read as one grey mush with dashes on it.
      // The carriageway is now genuinely DARK and neutral, the pavement is a distinct cool stone,
      // and the material no longer tints — value is decided here, in one place.
      x.fillStyle = '#8d887e'; x.fillRect(0, 0, 128, 128);                                            // pavement
      x.strokeStyle = 'rgba(70,66,58,0.20)'; x.lineWidth = 1;                                         // paving joints
      for (let i = 0; i < 128; i += 16) { x.beginPath(); x.moveTo(0, i + .5); x.lineTo(128, i + .5); x.stroke(); }
      x.fillStyle = '#3d3b38'; x.fillRect(10, 0, 108, 128);                                           // carriageway
      // a little tonal noise so a big road isn't a flat slab
      x.fillStyle = 'rgba(255,255,255,0.030)';
      for (let i = 0; i < 300; i++) x.fillRect(10 + (i * 47) % 108, (i * 29) % 128, 3, 2);
      x.fillStyle = 'rgba(20,19,17,0.40)'; x.fillRect(10, 0, 6, 128); x.fillRect(112, 0, 6, 128);      // gutter shadow
      x.fillStyle = 'rgba(226,221,209,0.92)'; x.fillRect(8, 0, 2.5, 128); x.fillRect(117.5, 0, 2.5, 128); // kerb
      x.fillStyle = 'rgba(240,206,110,0.85)';
      if (R.markings === 'dash') { for (let y = 0; y < 128; y += 30) x.fillRect(62, y, 4, 16); }
      else if (R.markings === 'double') { x.fillRect(57, 0, 3, 128); x.fillRect(68, 0, 3, 128); }
      else if (R.markings === 'divided') {
        x.fillStyle = 'rgba(120,124,110,0.75)'; x.fillRect(56, 0, 16, 128);                            // median
        x.fillStyle = 'rgba(240,206,110,0.8)'; x.fillRect(54, 0, 3, 128); x.fillRect(71, 0, 3, 128);
        x.fillStyle = 'rgba(236,233,224,0.55)';
        for (let y = 0; y < 128; y += 26) { x.fillRect(33, y, 3, 12); x.fillRect(92, y, 3, 12); }      // lane lines
      }
    }
    const tx = new THREE.CanvasTexture(c);
    tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.anisotropy = 8;
    this._roadTexes[classId] = tx;
    return tx;
  },

  _roadMat(classId) {
    this._roadMats = this._roadMats || {};
    if (!this._roadMats[classId]) {
      // no tint: the texture above already decides the value (see the note in _roadTex)
      const m = new THREE.MeshStandardMaterial({ map: this._roadTex(classId), roughness: 0.96, metalness: 0, color: '#ffffff' });
      m.userData._shared = true;             // cached across cities — _teardownCity must not kill it
      this._roadMats[classId] = m;
    }
    return this._roadMats[classId];
  },

  _roadPaintMat() {
    if (!this._roadPaint) {
      this._roadPaint = new THREE.MeshBasicMaterial({ color: '#efe9d8', transparent: true, opacity: 0.82, depthWrite: false });
      this._roadPaint.userData._shared = true;
    }
    return this._roadPaint;
  },

  _buildJunction(plan, r, c, K, S, A, add, paint, island, roundR) {
    const j = junctionAt(plan, r, c);
    if (!j || j.deg === 0) return null;
    const arms = [['n', j.n, 0, -1], ['e', j.e, 1, 0], ['s', j.s, 0, 1], ['w', j.w, -1, 0]].filter(a => a[1]);
    const cid = Math.max(j.n, j.e, j.s, j.w), w = ROAD[cid].width * S;
    const px = -A + c * K, pz = -A + r * K;
    const flat = (geo) => { geo.rotateX(-Math.PI / 2); geo.translate(px, 0, pz); return geo; };

    // A DEAD END is a turning head, not a stub.
    if (j.deg === 1) { add(cid, flat(new THREE.CircleGeometry(w * 0.78, 14))); return 'end'; }

    // A ROUNDABOUT, but only where the PLANNER said so — see plan.roundabouts. The island is real
    // cover you can break line of sight behind, which is the whole reason to build one rather than
    // paint one, and the ribbons feeding it have already been trimmed back to its outer edge.
    if (this._isRoundabout(plan, r, c)) {
      const rOut = roundR(w), rIn = rOut * 0.44;
      add(cid, flat(new THREE.RingGeometry(rIn, rOut, 30)));
      island(px, pz, rIn);
      for (let i = 0; i < 12; i++) {                             // give-way chevrons on the ring
        const a = (i / 12) * Math.PI * 2, rr = (rIn + rOut) / 2;
        const g = new THREE.PlaneGeometry(2.6 * S, 6 * S);
        g.rotateX(-Math.PI / 2); g.rotateY(-a); g.translate(px + Math.cos(a) * rr, 0.02, pz + Math.sin(a) * rr);
        paint(g);
      }
      return 'roundabout';
    }

    add(cid, flat(new THREE.PlaneGeometry(w, w, 2, 2)));
    // CORNER FILLETS — a quarter disc tucked into each corner between two adjacent arms, so the
    // kerb line turns instead of stopping dead. This is the single detail that makes a junction
    // stop looking like two ribbons crossing.
    const has = { n: j.n, e: j.e, s: j.s, w: j.w };
    const CORNERS = [['n', 'e', 0], ['e', 's', -Math.PI / 2], ['s', 'w', Math.PI], ['w', 'n', Math.PI / 2]];
    for (const [a, b, rot] of CORNERS) {
      if (!has[a] || !has[b]) continue;
      const fr = w * 0.34;
      const g = new THREE.CircleGeometry(fr, 8, rot, Math.PI / 2);
      g.rotateX(-Math.PI / 2);
      const sx = (a === 'e' || b === 'e') ? 1 : -1, sz = (a === 's' || b === 's') ? 1 : -1;
      g.translate(px + sx * w / 2, 0.005, pz + sz * w / 2);
      add(cid, g);
    }
    // CROSSWALKS + STOP LINE, laid ACROSS the carriageway at the mouth of the junction.
    //
    // ⚠ NOT AT EVERY CORNER. Striping all four arms of all 74 junctions produced 970 separate
    // white quads on one Tokyo plan; from any distance that is not a road network, it is confetti.
    // A real city paints a crossing where the traffic warrants one. So: only on a junction that is
    // actually a crossroads or a tee, and only on arms carrying an ARTERIAL or better — a quiet
    // residential corner gets clean asphalt, which is also what makes the striped junctions read
    // as important.
    const major = arms.filter(a => a[1] >= 3);
    const stripe = (j.deg >= 3) ? major : [];
    for (const [, ac, dx, dz] of stripe) {
      const aw = ROAD[ac].width * S, half = aw * 0.40;             // span the carriageway properly
      const off = w / 2 + 4.5 * S;
      const bar = 4.2 * S, gap = 6.6 * S, depth = 8 * S;
      for (let t = -half; t <= half + 0.01; t += gap) {
        const g = new THREE.PlaneGeometry(dx ? depth : bar, dx ? bar : depth);
        g.rotateX(-Math.PI / 2);
        g.translate(px + dx * off + (dx ? 0 : t), 0.02, pz + dz * off + (dz ? 0 : t));
        paint(g);
      }
      const sg = new THREE.PlaneGeometry(dx ? 1.8 * S : half * 2, dx ? half * 2 : 1.8 * S);   // stop line
      sg.rotateX(-Math.PI / 2);
      sg.translate(px + dx * (off + depth * 0.75), 0.02, pz + dz * (off + depth * 0.75));
      paint(sg);
    }
    return j.kind;
  },

  _buildRoadNet(plan, group) {
    if (!plan || !plan.roads) return 0;
    const A = plan.arena, N = plan.N, RD = plan.roads, K = plan.cell || CELL, S = plan.scale || 1;
    const byClass = {};
    const add = (cid, geo) => (byClass[cid] || (byClass[cid] = [])).push(geo);
    // How far a roundabout reaches — the ribbons feeding it are TRIMMED to this, or the road runs
    // straight through the middle of the island.
    const roundR = (w) => w * 1.15;
    const trimFor = (r, c, cls) => this._isRoundabout(plan, r, c) ? roundR(ROAD[cls].width * S) : 0;
    // one ribbon between two points, subdivided finely enough to follow the ground
    const ribbon = (cid, x0, z0, x1, z1, trim0 = 0, trim1 = 0) => {
      let dx0 = x1 - x0, dz0 = z1 - z0, L = Math.hypot(dx0, dz0);
      if (L > 0 && (trim0 || trim1)) {
        const ux = dx0 / L, uz = dz0 / L;
        x0 += ux * trim0; z0 += uz * trim0; x1 -= ux * trim1; z1 -= uz * trim1;
      }
      const w = ROAD[cid].width * S, dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz);
      if (len < 0.5) return;
      const rows = Math.max(2, Math.round(len / (7 * S)));
      const geo = new THREE.PlaneGeometry(w, len, 2, rows);
      const uv = geo.attributes.uv, reps = Math.max(1, Math.round(len / (24 * S)));
      for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * reps);   // tile the section along the run
      // ⚠ A DIRT TRACK MEANDERS. A metalled road is surveyed and runs straight between its
      // junctions; a track is worn by feet and carts and does not. Bending the ribbon in its own
      // local X before it is rotated into place costs nothing and is the single thing that makes
      // the countryside and the forest stop looking like a street grid with the paint scraped off.
      if (cid === 1) {
        const pos = geo.attributes.position, cols = 3;
        const ph = (Math.abs(x0 * 0.07 + z0 * 0.13) % 6.283), amp = w * 0.9;
        for (let i = 0; i < pos.count; i++) {
          const row = (i / cols) | 0, t = row / rows;
          pos.setX(i, pos.getX(i) + Math.sin(ph + t * 3.4) * amp * Math.sin(t * Math.PI));
        }
        pos.needsUpdate = true;
      }
      geo.rotateX(-Math.PI / 2);
      geo.rotateY(Math.atan2(dx, dz));
      geo.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
      add(cid, geo);
    };
    for (let r = 0; r <= N; r++) for (let c = 0; c < N; c++) {           // horizontal edges (run along X)
      const cid = RD.h[r][c]; if (!cid) continue;
      const z = -A + r * K;
      ribbon(cid, -A + c * K, z, -A + (c + 1) * K, z, trimFor(r, c, cid), trimFor(r, c + 1, cid));
    }
    for (let r = 0; r < N; r++) for (let c = 0; c <= N; c++) {           // vertical edges (run along Z)
      const cid = RD.v[r][c]; if (!cid) continue;
      const x = -A + c * K;
      ribbon(cid, x, -A + r * K, x, -A + (r + 1) * K, trimFor(r, c, cid), trimFor(r + 1, c, cid));
    }
    // JUNCTIONS — see _buildJunction. Every crossing is built from its own degree and arm classes.
    const marks = [];
    const paint = (g) => marks.push(g);
    const kinds = {};
    const islands = [];
    const island = (x, z, r) => islands.push([x, z, r]);
    for (let r = 0; r <= N; r++) for (let c = 0; c <= N; c++) {
      const k = this._buildJunction(plan, r, c, K, S, A, add, paint, island, roundR);
      if (k) kinds[k] = (kinds[k] || 0) + 1;
    }
    // DRAPE + merge: one mesh per class, every vertex sitting just above the real ground
    let meshes = 0;
    this._roadMeshes = [];
    const drape = (geo, lift) => {
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setY(i, this.heightAt(pos.getX(i), pos.getZ(i)) + lift);
      pos.needsUpdate = true; geo.computeVertexNormals();
    };
    for (const cid in byClass) {
      const merged = mergeGeometries(byClass[cid]);
      byClass[cid].forEach(gg => gg.dispose());
      if (!merged) continue;
      drape(merged, 0.12);
      const m = new THREE.Mesh(merged, this._roadMat(cid | 0));
      m.receiveShadow = true; m.renderOrder = 1;
      group.add(m); this._roadMeshes.push(m); meshes++;
    }
    if (marks.length) {                                  // all the road paint in ONE unlit draw
      const mg = mergeGeometries(marks);
      marks.forEach(g => g.dispose());
      if (mg) {
        drape(mg, 0.24);
        const m = new THREE.Mesh(mg, this._roadPaintMat());
        m.renderOrder = 2; group.add(m); this._roadMeshes.push(m);
      }
    }
    for (const [x, z, r] of islands) this._roundaboutIsland(group, x, z, r, plan);
    this._roadStats = { classes: meshes, junctions: Object.values(kinds).reduce((a, b) => a + b, 0),
                        deadEnds: kinds.end || 0, roundabouts: kinds.roundabout || 0, kinds, marks: marks.length };
    return meshes;
  },
};



