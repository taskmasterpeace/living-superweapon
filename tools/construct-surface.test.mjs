import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

const { ConstructSurface } = await import('../src/engine/construct-surface.js');
const { Construct } = await import('../src/engine/summons.js');

test('mixed simultaneous constructs stay bounded and leave no cover or scene objects after expiry',()=>{
 const scene=new THREE.Scene(),game={scene,aimPoint:new THREE.Vector3(24,0,18),time:0,world:{cover:[]},vfx:{flash(){}},nearestFoe:()=>null};
 const owner={isPlayer:true,pos:new THREE.Vector3(),aim:new THREE.Vector3(0,0,1),def:{effects:{construct:{density:2,assemblyTime:.3}}}};
 for(let cycle=0;cycle<4;cycle++){
  const live=Array.from({length:12},(_,i)=>new Construct(game,owner,{construct:['fist','hammer','wall','turret'][i%4],duration:.6,color:'#45d978'}));
  assert.equal(game.world.cover.length,3);assert.equal(scene.children.length,12);
  for(const c of live)assert.ok(c.surfaceFx.geometry.attributes.position.count<=2048);
  for(let frame=0;frame<48;frame++){game.time+=1/60;for(const c of live)if(!c.dead)c.update(1/60,game);}
  assert.ok(live.every(c=>c.dead&&c.surfaceFx.disposed));
  assert.equal(scene.children.length,0);assert.equal(game.world.cover.length,0);
 }
});

function makeRoot({ opacity = 0.72 } = {}) {
  const root = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: '#45d978', emissive: '#45d978', transparent: true, opacity,
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 6), material);
  root.add(mesh);
  return { root, mesh, material };
}

function particleNode(root) {
  return root.children.find((child) => child.isPoints);
}

function advance(surface, hz, seconds, remainingLife = Infinity) {
  const frames = Math.round(hz * seconds);
  for (let i = 0; i < frames; i++) surface.update(1 / hz, remainingLife);
}

function makeConstruct(kind = 'fist') {
  const game = {
    scene: new THREE.Scene(),
    aimPoint: new THREE.Vector3(24, 0, -11),
    time: 0,
    world: { cover: [] },
    vfx: { flash() {} },
  };
  const owner = {
    isPlayer: true,
    pos: new THREE.Vector3(2, 0, 3),
    aim: new THREE.Vector3(0, 0, 1),
    def: { effects: { construct: { density: 0.35, assemblyTime: 0.3 } } },
  };
  return { construct: new Construct(game, owner, { construct: kind, duration: 3, color: '#45d978' }), game };
}

test('Construct attaches particles at its placed transform and advances them after gameplay motion', () => {
  const { construct, game } = makeConstruct('fist');
  const particles = particleNode(construct.obj);
  assert.ok(particles, 'Construct should attach one particle surface draw');
  assert.deepEqual(construct.obj.position.toArray(), construct.pos.toArray(), 'first frame must start at the gameplay placement');
  const version = particles.geometry.getAttribute('position').version;
  construct.update(1 / 60, game);
  assert.ok(particles.geometry.getAttribute('position').version > version, 'frame update should advance assembly positions');
  construct._dispose(game);
  assert.equal(particles.parent, null, 'Construct disposal should detach particle resources');
});

test('samples child geometry in root-local coordinates despite root translation and rotation', () => {
  const { root, mesh } = makeRoot();
  root.position.set(80, 25, -40);
  root.rotation.set(0.2, 1.1, -0.15);
  mesh.position.set(10, 3, -2);
  mesh.rotation.z = Math.PI / 2;
  const surface = new ConstructSurface(root, { assemblyTime: 0.15, density: 0.45 });
  surface.update(1, Infinity);
  const positions = particleNode(root).geometry.getAttribute('position').array;
  for (let i = 0; i < positions.length; i += 3) {
    assert.ok(positions[i] >= 7.7 && positions[i] <= 12.3, `local x ${positions[i]} should follow the translated child, not root world position`);
    assert.ok(positions[i + 1] >= 1.7 && positions[i + 1] <= 4.3, `local y ${positions[i + 1]} should include child rotation`);
    assert.ok(positions[i + 2] >= -5.3 && positions[i + 2] <= 1.3, `local z ${positions[i + 2]} should remain in child geometry bounds`);
  }
  surface.dispose();
});

test('indexed and non-indexed transformed parts produce only finite bounded particles', () => {
  const root = new THREE.Group();
  const indexed = new THREE.Mesh(new THREE.SphereGeometry(3, 8, 6), new THREE.MeshBasicMaterial());
  indexed.position.set(-5, 2, 1);
  indexed.scale.set(1.5, 0.75, 2);
  const nonIndexed = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 3).toNonIndexed(), new THREE.MeshBasicMaterial());
  nonIndexed.position.set(7, -1, 4);
  nonIndexed.rotation.set(0.4, -0.7, 0.25);
  root.add(indexed, nonIndexed);
  const surface = new ConstructSurface(root, { density: 2, assemblyTime: 0.2 });
  advance(surface, 60, 0.25);
  const attribute = particleNode(root).geometry.getAttribute('position');
  assert.ok(attribute.count > 0 && attribute.count <= 2048, `particle count ${attribute.count} must be bounded`);
  for (const value of attribute.array) assert.ok(Number.isFinite(value), `particle coordinate ${value} must be finite`);
  surface.dispose();
});

test('assembly converges consistently at 30, 60, and 120 Hz', () => {
  const runs = [30, 60, 120].map((hz) => {
    const { root } = makeRoot();
    const surface = new ConstructSurface(root, { density: 0.5, assemblyTime: 0.8 });
    advance(surface, hz, 0.4);
    return { surface, root, positions: [...particleNode(root).geometry.getAttribute('position').array] };
  });
  for (let run = 1; run < runs.length; run++) {
    assert.equal(runs[run].positions.length, runs[0].positions.length);
    for (let i = 0; i < runs[0].positions.length; i++) {
      assert.ok(Math.abs(runs[run].positions[i] - runs[0].positions[i]) < 1e-4, `coordinate ${i} diverged by frame rate`);
    }
  }
  for (const run of runs) run.surface.dispose();
});

test('completed assembly converges from its seed volume onto the sampled solid surface', () => {
  const { root } = makeRoot();
  const surface = new ConstructSurface(root, { density: 0.8, assemblyTime: 0.3 });
  const attribute = particleNode(root).geometry.getAttribute('position');
  const seeded = [...attribute.array];
  advance(surface, 60, 0.5);
  let moved = 0;
  for (let i = 0; i < attribute.array.length; i += 3) {
    const x = attribute.array[i];
    const y = attribute.array[i + 1];
    const z = attribute.array[i + 2];
    const onSurface = Math.abs(Math.abs(x) - 1) < 0.06
      || Math.abs(Math.abs(y) - 2) < 0.06
      || Math.abs(Math.abs(z) - 3) < 0.06;
    assert.ok(onSurface, `settled point (${x}, ${y}, ${z}) must lie on the sampled box surface`);
    moved += Math.hypot(x - seeded[i], y - seeded[i + 1], z - seeded[i + 2]);
  }
  assert.ok(moved > attribute.count, 'assembly should visibly travel out from the clustered seed volume');
  surface.dispose();
});

test('excluded edge shells neither add particles nor expand sampled positions', () => {
  const one = makeRoot();
  const baseline = new ConstructSurface(one.root, { density: 1, assemblyTime: 0.2 });
  const baselineCount = particleNode(one.root).geometry.getAttribute('position').count;

  const two = makeRoot();
  const shell = new THREE.Mesh(
    new THREE.BoxGeometry(200, 200, 200),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.1 }),
  );
  shell.userData.constructSurfaceExclude = true;
  two.root.add(shell);
  const withShell = new ConstructSurface(two.root, { density: 1, assemblyTime: 0.2 });
  advance(withShell, 60, 0.25);
  const attribute = particleNode(two.root).geometry.getAttribute('position');
  assert.equal(attribute.count, baselineCount, 'excluded presentation shells must not affect area-weighted count');
  for (let i = 0; i < attribute.array.length; i += 3) {
    assert.ok(Math.abs(attribute.array[i]) <= 1.06);
    assert.ok(Math.abs(attribute.array[i + 1]) <= 2.06);
    assert.ok(Math.abs(attribute.array[i + 2]) <= 3.06);
  }
  baseline.dispose();
  withShell.dispose();
});

test('particles are strongest while forming and settle into restrained surface detail', () => {
  const { root } = makeRoot();
  const surface = new ConstructSurface(root, { density: 0.8, assemblyTime: 0.4 });
  surface.update(0.08, Infinity);
  const formingOpacity = particleNode(root).material.opacity;
  advance(surface, 60, 0.5);
  const settledOpacity = particleNode(root).material.opacity;
  assert.ok(formingOpacity >= 0.45, `forming opacity ${formingOpacity} should make assembly readable`);
  assert.ok(settledOpacity <= 0.25, `settled opacity ${settledOpacity} should not wash out the solid`);
  assert.ok(formingOpacity >= settledOpacity * 2, 'forming and settled states need a visible contrast');
  surface.dispose();
});

test('native constructs use restrained edge shells and recognizable fist and hammer silhouettes', () => {
  const fistFixture = makeConstruct('fist');
  const fist = fistFixture.construct;
  const fistEdges = fist.obj.getObjectByName('construct-surface-edges');
  assert.ok(fistEdges, 'construct should retain a restrained edge surface');
  assert.equal(fistEdges.userData.constructSurfaceExclude, true, 'edge surface must be excluded from particle sampling');
  assert.equal(fistEdges.material.blending, THREE.NormalBlending, 'edge surface must not use additive overdraw');
  assert.ok(Math.max(fistEdges.scale.x, fistEdges.scale.y, fistEdges.scale.z) <= 1.03, 'edge surface should hug the solid');
  assert.ok(fist.body.material.emissiveIntensity <= 0.35, 'solid emissive must remain restrained');
  assert.equal(fist.obj.children.filter((node) => node.name.startsWith('construct-fist-knuckle-')).length, 4);
  assert.ok(fist.obj.getObjectByName('construct-fist-thumb'));
  fist.obj.position.set(0, 0, 0); fist.obj.rotation.set(0, 0, 0); fist.obj.updateMatrixWorld(true);
  const palmBounds = new THREE.Box3().setFromObject(fist.obj.getObjectByName('construct-fist-palm'));
  const detailBounds = new THREE.Box3();
  for (const detail of fist.obj.children.filter((node) => node.name.startsWith('construct-fist-knuckle-') || node.name === 'construct-fist-thumb')) {
    detailBounds.union(new THREE.Box3().setFromObject(detail));
  }
  const detailProtrudes = detailBounds.min.x < palmBounds.min.x - 1e-4
    || detailBounds.min.y < palmBounds.min.y - 1e-4
    || detailBounds.min.z < palmBounds.min.z - 1e-4
    || detailBounds.max.x > palmBounds.max.x + 1e-4
    || detailBounds.max.y > palmBounds.max.y + 1e-4
    || detailBounds.max.z > palmBounds.max.z + 1e-4;
  assert.ok(detailProtrudes, 'knuckles or thumb must visibly protrude beyond the palm silhouette');
  const fistBounds = palmBounds.clone().union(detailBounds);
  assert.ok(fistBounds.min.x >= -3 && fistBounds.max.x <= 3, 'fist must retain its prior 6-unit width');
  assert.ok(fistBounds.min.y >= -2.5 && fistBounds.max.y <= 2.5, 'fist must retain its prior 5-unit height');
  assert.ok(fistBounds.min.z >= -3.5 && fistBounds.max.z <= 3.5, 'fist must retain its prior 7-unit depth');
  const fistReach = Math.max(fistBounds.min.length(), fistBounds.max.length());
  assert.ok(fistReach <= 6, `fist silhouette reach ${fistReach} must stay within its existing 6-unit contact envelope`);

  const hammerFixture = makeConstruct('hammer');
  const hammer = hammerFixture.construct;
  assert.ok(hammer.obj.getObjectByName('construct-hammer-head'));
  const handle = hammer.obj.getObjectByName('construct-hammer-handle');
  assert.ok(handle);
  let handleGeometryDisposals = 0;
  let handleMaterialDisposals = 0;
  handle.geometry.addEventListener('dispose', () => handleGeometryDisposals++);
  handle.material.addEventListener('dispose', () => handleMaterialDisposals++);
  fist._dispose(fistFixture.game);
  hammer._dispose(hammerFixture.game);
  assert.equal(handleGeometryDisposals, 1, 'added construct geometry must be disposed exactly once');
  assert.equal(handleMaterialDisposals, 1, 'shared construct material must be disposed exactly once');
});

test('wall is placed upright and faces the owner across the ground plane', () => {
  const { construct: wall, game } = makeConstruct('wall');
  wall.obj.updateMatrixWorld(true);
  const quaternion = wall.obj.getWorldQuaternion(new THREE.Quaternion());
  const worldUp = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion);
  assert.ok(worldUp.distanceTo(new THREE.Vector3(0, 1, 0)) < 1e-6, `wall up ${worldUp.toArray()} must remain vertical`);
  const actualForward = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion).setY(0).normalize();
  const expectedForward = wall.owner.pos.clone().sub(wall.pos).setY(0).normalize();
  assert.ok(actualForward.dot(expectedForward) > 0.9999, `wall forward ${actualForward.toArray()} must face owner ${expectedForward.toArray()}`);
  wall._dispose(game);
});

test('density zero creates no particle draw and remains safe to update and dispose', () => {
  const { root, mesh } = makeRoot();
  const surface = new ConstructSurface(root, { density: 0, assemblyTime: -20 });
  surface.update(1 / 60, 0.1);
  assert.equal(particleNode(root), undefined);
  surface.dispose();
  assert.equal(mesh.parent, root);
});

test('instances own independent mutable particle positions', () => {
  const a = makeRoot();
  const b = makeRoot();
  const sa = new ConstructSurface(a.root, { density: 0.5, assemblyTime: 1 });
  const sb = new ConstructSurface(b.root, { density: 0.5, assemblyTime: 1 });
  const aa = particleNode(a.root).geometry.getAttribute('position').array;
  const ba = particleNode(b.root).geometry.getAttribute('position').array;
  assert.notEqual(aa, ba, 'instances must not share their mutable position buffer');
  const before = [...ba];
  sa.update(0.25, Infinity);
  assert.deepEqual([...ba], before, 'updating one instance must not mutate another');
  sa.dispose();
  sb.dispose();
});

test('dispose removes only owned resources and restores original material opacity', () => {
  const { root, mesh, material } = makeRoot({ opacity: 0.64 });
  let geometryDisposals = 0;
  let materialDisposals = 0;
  mesh.geometry.addEventListener('dispose', () => geometryDisposals++);
  material.addEventListener('dispose', () => materialDisposals++);
  const surface = new ConstructSurface(root, { density: 0.6, assemblyTime: 1 });
  surface.update(0, Infinity);
  assert.ok(material.opacity >= 0.18 && material.opacity < 0.64, `live solid opacity ${material.opacity} should remain readable while assembling`);
  const particles = particleNode(root);
  surface.dispose();
  assert.equal(particles.parent, null);
  assert.equal(mesh.parent, root, 'original solid mesh remains attached');
  assert.equal(material.opacity, 0.64, 'original opacity is restored');
  assert.equal(geometryDisposals, 0, 'original geometry is not owned');
  assert.equal(materialDisposals, 0, 'original material is not owned');
});
