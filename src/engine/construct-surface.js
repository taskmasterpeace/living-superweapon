import * as THREE from 'three';

const MAX_PARTICLES = 2048;
const MIN_PARTICLES = 24;
const DISSOLVE_TIME = 0.45;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function finiteOr(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function makeRng(seed = 0x6d2b79f5) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function materialList(material) {
  return Array.isArray(material) ? material : [material];
}

function collectSurface(root) {
  const triangles = [];
  const materials = [];
  const seenMaterials = new Set();
  const rootInverse = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const toRoot = new THREE.Matrix4();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  let totalArea = 0;

  root.traverse((node) => {
    if (!node.isMesh || !node.geometry) return;
    if (node.userData?.constructSurfaceExclude) return;
    for (const material of materialList(node.material)) {
      if (!material || seenMaterials.has(material)) continue;
      seenMaterials.add(material);
      materials.push({
        material,
        opacity: finiteOr(material.opacity, 1),
        transparent: material.transparent,
      });
    }

    const position = node.geometry.getAttribute('position');
    if (!position || position.count < 3) return;
    toRoot.multiplyMatrices(rootInverse, node.matrixWorld);
    const index = node.geometry.index;
    const elementCount = index ? index.count : position.count;
    for (let i = 0; i + 2 < elementCount; i += 3) {
      const ai = index ? index.getX(i) : i;
      const bi = index ? index.getX(i + 1) : i + 1;
      const ci = index ? index.getX(i + 2) : i + 2;
      a.fromBufferAttribute(position, ai).applyMatrix4(toRoot);
      b.fromBufferAttribute(position, bi).applyMatrix4(toRoot);
      c.fromBufferAttribute(position, ci).applyMatrix4(toRoot);
      ab.subVectors(b, a);
      ac.subVectors(c, a);
      const crossX = ab.y * ac.z - ab.z * ac.y;
      const crossY = ab.z * ac.x - ab.x * ac.z;
      const crossZ = ab.x * ac.y - ab.y * ac.x;
      const crossLength = Math.hypot(crossX, crossY, crossZ);
      const area = crossLength * 0.5;
      if (!(area > 1e-8) || !Number.isFinite(area)) continue;
      totalArea += area;
      triangles.push({
        ax: a.x, ay: a.y, az: a.z,
        bx: b.x, by: b.y, bz: b.z,
        cx: c.x, cy: c.y, cz: c.z,
        nx: crossX / crossLength, ny: crossY / crossLength, nz: crossZ / crossLength,
        endArea: totalArea,
      });
    }
  });

  return { triangles, materials, totalArea };
}

function findTriangle(triangles, area) {
  let low = 0;
  let high = triangles.length - 1;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (area <= triangles[middle].endArea) high = middle;
    else low = middle + 1;
  }
  return triangles[low];
}

/**
 * A bounded, root-local particle skin for native construct meshes.
 * The original meshes and materials remain owned by their caller.
 */
export class ConstructSurface {
  constructor(root, { color = '#5fd66a', assemblyTime = 0.65, density = 1 } = {}) {
    this.root = root;
    this.assemblyTime = clamp(finiteOr(assemblyTime, 0.65), 0.15, 2);
    this.density = clamp(finiteOr(density, 1), 0, 2);
    this.elapsed = 0;
    this.disposed = false;
    this.points = null;
    this.geometry = null;
    this.material = null;
    this._positions = null;
    this._starts = null;
    this._targets = null;
    this._normals = null;
    this._phases = null;
    this._rates = null;
    this._solidMaterials = [];

    if (!root || this.density <= 0) return;
    root.updateWorldMatrix(true, true);
    const sampled = collectSurface(root);
    this._solidMaterials = sampled.materials;
    if (!(sampled.totalArea > 0) || sampled.triangles.length === 0) return;

    const count = Math.min(MAX_PARTICLES, Math.max(MIN_PARTICLES, Math.round(sampled.totalArea * this.density * 1.25)));
    const positions = new Float32Array(count * 3);
    const starts = new Float32Array(count * 3);
    const targets = new Float32Array(count * 3);
    const normals = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const rates = new Float32Array(count);
    const rng = makeRng();
    const center = new THREE.Vector3();
    const bounds = new THREE.Box3();

    for (const triangle of sampled.triangles) {
      bounds.expandByPoint(new THREE.Vector3(triangle.ax, triangle.ay, triangle.az));
      bounds.expandByPoint(new THREE.Vector3(triangle.bx, triangle.by, triangle.bz));
      bounds.expandByPoint(new THREE.Vector3(triangle.cx, triangle.cy, triangle.cz));
    }
    bounds.getCenter(center);
    const radius = Math.max(0.25, bounds.getSize(new THREE.Vector3()).length() * 0.12);

    for (let i = 0, offset = 0; i < count; i++, offset += 3) {
      const triangle = findTriangle(sampled.triangles, rng() * sampled.totalArea);
      const rootU = Math.sqrt(rng());
      const u = 1 - rootU;
      const v = rng() * rootU;
      const w = 1 - u - v;
      targets[offset] = triangle.ax * u + triangle.bx * v + triangle.cx * w;
      targets[offset + 1] = triangle.ay * u + triangle.by * v + triangle.cy * w;
      targets[offset + 2] = triangle.az * u + triangle.bz * v + triangle.cz * w;
      normals[offset] = triangle.nx;
      normals[offset + 1] = triangle.ny;
      normals[offset + 2] = triangle.nz;

      const angle = rng() * Math.PI * 2;
      const z = rng() * 2 - 1;
      const radial = Math.sqrt(Math.max(0, 1 - z * z));
      const distance = radius * Math.cbrt(rng());
      starts[offset] = center.x + Math.cos(angle) * radial * distance;
      starts[offset + 1] = center.y + z * distance;
      starts[offset + 2] = center.z + Math.sin(angle) * radial * distance;
      positions[offset] = starts[offset];
      positions[offset + 1] = starts[offset + 1];
      positions[offset + 2] = starts[offset + 2];
      phases[i] = rng() * Math.PI * 2;
      rates[i] = 0.75 + rng() * 0.75;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color,
      size: 0.22,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.88,
      depthTest: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      toneMapped: true,
    });
    const points = new THREE.Points(geometry, material);
    points.name = 'construct-surface-particles';
    points.frustumCulled = false;
    root.add(points);

    this.points = points;
    this.geometry = geometry;
    this.material = material;
    this._positions = positions;
    this._starts = starts;
    this._targets = targets;
    this._normals = normals;
    this._phases = phases;
    this._rates = rates;
    this.update(0, Infinity);
  }

  update(dt, remainingLife = Infinity) {
    if (this.disposed || !this.points) return;
    const step = Number.isFinite(dt) && dt > 0 ? dt : 0;
    this.elapsed += step;
    const progress = clamp(this.elapsed / this.assemblyTime, 0, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const remaining = Number.isFinite(remainingLife) ? Math.max(0, remainingLife) : Infinity;
    const dissolve = remaining < DISSOLVE_TIME ? 1 - remaining / DISSOLVE_TIME : 0;
    const stableFlow = progress * (1 - dissolve) * 0.018;
    const dissolveDrift = dissolve * dissolve * 0.7;

    for (let i = 0, offset = 0; i < this._phases.length; i++, offset += 3) {
      const nx = this._normals[offset];
      const ny = this._normals[offset + 1];
      const nz = this._normals[offset + 2];
      const flow = Math.sin(this.elapsed * this._rates[i] + this._phases[i]) * stableFlow + dissolveDrift;
      this._positions[offset] = this._starts[offset] + (this._targets[offset] - this._starts[offset]) * eased + nx * flow;
      this._positions[offset + 1] = this._starts[offset + 1] + (this._targets[offset + 1] - this._starts[offset + 1]) * eased + ny * flow;
      this._positions[offset + 2] = this._starts[offset + 2] + (this._targets[offset + 2] - this._starts[offset + 2]) * eased + nz * flow;
    }
    this.geometry.getAttribute('position').needsUpdate = true;
    this.material.opacity = (0.16 + (1 - progress) * 0.5) * (1 - dissolve);
    this.material.size = 0.1 + (1 - progress) * 0.14 + dissolve * 0.08;

    for (let i = 0; i < this._solidMaterials.length; i++) {
      const entry = this._solidMaterials[i];
      const assemblyAlpha = 0.25 + eased * 0.75;
      const dissolveAlpha = 1 - dissolve * 0.7;
      entry.material.opacity = Math.max(0.18, entry.opacity * assemblyAlpha * dissolveAlpha);
      entry.material.transparent = entry.transparent || entry.material.opacity < 0.999;
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (let i = 0; i < this._solidMaterials.length; i++) {
      const entry = this._solidMaterials[i];
      entry.material.opacity = entry.opacity;
      entry.material.transparent = entry.transparent;
    }
    if (this.points?.parent) this.points.parent.remove(this.points);
    this.geometry?.dispose();
    this.material?.dispose();
    this.points = null;
    this.geometry = null;
    this.material = null;
  }
}
