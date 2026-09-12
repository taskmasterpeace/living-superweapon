// glb-write.mjs — a tiny, zero-dependency glTF 2.0 / GLB writer for axis-aligned boxes.
//
// No three.js, no gltf-transform, no network. This is the whole reason the package rebuilds on a
// clean checkout with Node alone. It emits one mesh/primitive per render node (a group of boxes that
// share one material), each node a named glTF node so integration can hide/swap by stable ID.
// Flat-shaded (per-face normals), single interleaved-free binary buffer, deterministic byte layout.

const F32 = 4, U32 = 4;
const hex2rgb = (h) => {
  const s = h.replace('#', '');
  const srgb = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);
  // glTF baseColorFactor is LINEAR; convert from the sRGB hex the recipe authors in.
  return srgb.map((c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
};

// 6 faces of an AABB: [normal, [4 corner vertices ccw-from-outside]]
function boxFaces(min, max) {
  const [x0, y0, z0] = min, [x1, y1, z1] = max;
  return [
    [[1, 0, 0], [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]]],   // +X
    [[-1, 0, 0], [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]]],  // -X
    [[0, 1, 0], [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]]],   // +Y
    [[0, -1, 0], [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]]],  // -Y
    [[0, 0, 1], [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]],   // +Z
    [[0, 0, -1], [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]]],  // -Z
  ];
}

// nodes: [{ name, material:{color,metallic,roughness,emissive?}, boxes:[{min,max}] }]
export function boxesToGlb(nodes, { name = 'model' } = {}) {
  const positions = [], normals = [], indices = [];
  const accessorRanges = [];   // per node: {posOff,posCount,nrmOff,idxOff,idxCount,minP,maxP}
  for (const node of nodes) {
    const posStart = positions.length / 3;
    const idxStart = indices.length;
    const minP = [Infinity, Infinity, Infinity], maxP = [-Infinity, -Infinity, -Infinity];
    let base = 0;
    // local vertex index base within THIS node's accessor
    let localBase = 0;
    for (const b of node.boxes) {
      for (const [n, corners] of boxFaces(b.min, b.max)) {
        for (const v of corners) {
          positions.push(v[0], v[1], v[2]); normals.push(n[0], n[1], n[2]);
          for (let k = 0; k < 3; k++) { minP[k] = Math.min(minP[k], v[k]); maxP[k] = Math.max(maxP[k], v[k]); }
        }
        indices.push(localBase, localBase + 1, localBase + 2, localBase, localBase + 2, localBase + 3);
        localBase += 4;
      }
    }
    const posCount = positions.length / 3 - posStart;
    accessorRanges.push({ posStart, posCount, idxStart, idxCount: indices.length - idxStart, minP, maxP });
    base = posStart; void base;
  }

  // Binary layout: [positions f32][pad4][normals f32][pad4][indices u32]
  const posBytes = positions.length * F32;
  const nrmBytes = normals.length * F32;
  const idxBytes = indices.length * U32;
  const pad4 = (n) => (4 - (n % 4)) % 4;
  const posLen = posBytes, posPad = pad4(posLen);
  const nrmOffset = posLen + posPad, nrmPad = pad4(nrmBytes);
  const idxOffset = nrmOffset + nrmBytes + nrmPad;
  const binLen = idxOffset + idxBytes;
  const bin = Buffer.alloc(binLen + pad4(binLen));
  for (let i = 0; i < positions.length; i++) bin.writeFloatLE(positions[i], i * F32);
  for (let i = 0; i < normals.length; i++) bin.writeFloatLE(normals[i], nrmOffset + i * F32);
  for (let i = 0; i < indices.length; i++) bin.writeUInt32LE(indices[i], idxOffset + i * U32);

  // glTF JSON
  const gltf = {
    asset: { version: '2.0', generator: 'building-delivery/glb-write.mjs' },
    scene: 0, scenes: [{ nodes: [] }], nodes: [], meshes: [], materials: [],
    accessors: [], bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: posBytes, target: 34962 },
      { buffer: 0, byteOffset: nrmOffset, byteLength: nrmBytes, target: 34962 },
      { buffer: 0, byteOffset: idxOffset, byteLength: idxBytes, target: 34963 },
    ],
    buffers: [{ byteLength: bin.length }],
  };
  nodes.forEach((node, i) => {
    const r = accessorRanges[i];
    const m = node.material || {};
    const matIndex = gltf.materials.length;
    gltf.materials.push({
      name: node.name + '_mat',
      doubleSided: true,
      pbrMetallicRoughness: {
        baseColorFactor: [...hex2rgb(m.color || '#cccccc'), 1],
        metallicFactor: m.metallic ?? 0, roughnessFactor: m.roughness ?? 0.9,
      },
      ...(m.emissive ? { emissiveFactor: hex2rgb(m.emissive) } : {}),
    });
    const posAcc = gltf.accessors.length;
    gltf.accessors.push({ bufferView: 0, byteOffset: r.posStart * 3 * F32, componentType: 5126, count: r.posCount, type: 'VEC3', min: r.minP, max: r.maxP });
    const nrmAcc = gltf.accessors.length;
    gltf.accessors.push({ bufferView: 1, byteOffset: r.posStart * 3 * F32, componentType: 5126, count: r.posCount, type: 'VEC3' });
    const idxAcc = gltf.accessors.length;
    gltf.accessors.push({ bufferView: 2, byteOffset: r.idxStart * U32, componentType: 5125, count: r.idxCount, type: 'SCALAR' });
    const meshIndex = gltf.meshes.length;
    gltf.meshes.push({ name: node.name, primitives: [{ attributes: { POSITION: posAcc, NORMAL: nrmAcc }, indices: idxAcc, material: matIndex, mode: 4 }] });
    gltf.nodes.push({ name: node.name, mesh: meshIndex });
    gltf.scenes[0].nodes.push(i);
  });

  // GLB container
  const jsonStr = JSON.stringify(gltf);
  const jsonBuf = Buffer.from(jsonStr, 'utf8');
  const jsonPad = pad4(jsonBuf.length);
  const jsonChunk = Buffer.concat([jsonBuf, Buffer.alloc(jsonPad, 0x20)]);
  const binPad = pad4(bin.length);
  const binChunk = binPad ? Buffer.concat([bin, Buffer.alloc(binPad, 0)]) : bin;
  const total = 12 + 8 + jsonChunk.length + 8 + binChunk.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(total, 8);
  const jsonHdr = Buffer.alloc(8); jsonHdr.writeUInt32LE(jsonChunk.length, 0); jsonHdr.writeUInt32LE(0x4e4f534a, 4);
  const binHdr = Buffer.alloc(8); binHdr.writeUInt32LE(binChunk.length, 0); binHdr.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jsonHdr, jsonChunk, binHdr, binChunk]);
}

// Count triangles / verts / draw calls for the budget report.
export function meshStats(nodes) {
  let tris = 0, verts = 0;
  for (const node of nodes) { const nb = node.boxes.length; verts += nb * 24; tris += nb * 12; }
  return { drawCalls: nodes.length, triangles: tris, vertices: verts, materials: nodes.length };
}
