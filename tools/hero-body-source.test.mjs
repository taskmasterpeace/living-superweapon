import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {bakeHeroBody, loadHeroBodySource} from './lib/hero-body-source.mjs';

const EXPECTED_JOINTS = [
  'root', 'pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'Head',
  'clavicle_l', 'upperarm_l', 'lowerarm_l', 'hand_l', 'index_01_l',
  'index_02_l', 'index_03_l', 'index_04_leaf_l', 'middle_01_l',
  'middle_02_l', 'middle_03_l', 'middle_04_leaf_l', 'pinky_01_l',
  'pinky_02_l', 'pinky_03_l', 'pinky_04_leaf_l', 'ring_01_l',
  'ring_02_l', 'ring_03_l', 'ring_04_leaf_l', 'thumb_01_l',
  'thumb_02_l', 'thumb_03_l', 'thumb_04_leaf_l', 'clavicle_r',
  'upperarm_r', 'lowerarm_r', 'hand_r', 'index_01_r', 'index_02_r',
  'index_03_r', 'index_04_leaf_r', 'middle_01_r', 'middle_02_r',
  'middle_03_r', 'middle_04_leaf_r', 'pinky_01_r', 'pinky_02_r',
  'pinky_03_r', 'pinky_04_leaf_r', 'ring_01_r', 'ring_02_r',
  'ring_03_r', 'ring_04_leaf_r', 'thumb_01_r', 'thumb_02_r',
  'thumb_03_r', 'thumb_04_leaf_r', 'thigh_l', 'calf_l', 'foot_l',
  'ball_l', 'ball_leaf_l', 'thigh_r', 'calf_r', 'foot_r', 'ball_r',
  'ball_leaf_r',
];

const EXPECTED = {
  'superhero-male': {
    vertices: 8483,
    triangles: 14318,
    hashes: {
      gltf: 'e7fcea214ecf8855afbf910b50de6f9c7d1decfb71ca28bad8a4481452dafeb4',
      bin: '459003f9745853ae562a85506a2b94dd56515c1f37728f9fa3d2ce1a3e4cd92f',
      eye: 'd08e3356a83211bc6ca21fe3a8e39f4b5c1a3b8f85457fc2c0fb57be09935025',
    },
  },
  'superhero-female': {
    vertices: 8844,
    triangles: 15060,
    hashes: {
      gltf: 'adedf28000a0716f689b009a70314506fc62f827498f77ba852acb5610f3f3f4',
      bin: '3a8220a485b33d05d879115a50697728b45a151781106033afb8b8c243fca208',
      eye: 'd08e3356a83211bc6ca21fe3a8e39f4b5c1a3b8f85457fc2c0fb57be09935025',
    },
  },
};

const finite = values => values.every(Number.isFinite);

for (const [kind, expected] of Object.entries(EXPECTED)) {
  test(`${kind} preserves the complete authored geometry and skin`, async () => {
    const baked = bakeHeroBody(await loadHeroBodySource(kind));
    assert.deepEqual(baked.source.sha256, expected.hashes);
    assert.deepEqual(baked.joints.map(joint => joint.name), EXPECTED_JOINTS);
    assert.equal(baked.joints.length, 65);
    assert.equal(baked.joints[0].parent, -1);
    assert.equal(baked.joints.filter(joint => joint.parent === -1).length, 1);
    assert.ok(baked.joints.slice(1).every((joint, index) =>
      joint.parent >= 0 && joint.parent < index + 1));
    assert.ok(baked.joints.every(joint =>
      joint.matrix.length === 16 && joint.localMatrix.length === 16
      && finite(joint.matrix) && finite(joint.localMatrix)
      && joint.parent >= -1 && joint.parent < baked.joints.length));

    assert.deepEqual(baked.meshes.map(mesh => mesh.material).sort(),
      ['body', 'eyebrows', 'eyes']);
    assert.equal(baked.meshes.reduce((sum, mesh) => sum + mesh.position.length / 3, 0),
      expected.vertices);
    assert.ok(expected.vertices > 5000);
    assert.equal(baked.meshes.reduce((sum, mesh) => sum + mesh.index.length / 3, 0),
      expected.triangles);

    for (const mesh of baked.meshes) {
      const vertexCount = mesh.position.length / 3;
      assert.equal(mesh.normal.length, vertexCount * 3);
      assert.equal(mesh.uv.length, vertexCount * 2);
      assert.equal(mesh.skinIndex.length, vertexCount * 4);
      assert.equal(mesh.skinWeight.length, vertexCount * 4);
      assert.ok(finite(mesh.position));
      assert.ok(finite(mesh.normal));
      assert.ok(finite(mesh.uv));
      assert.ok(mesh.index.every(index => Number.isInteger(index)
        && index >= 0 && index < vertexCount));
      assert.ok(mesh.skinIndex.every(index => Number.isInteger(index)
        && index >= 0 && index < baked.joints.length));
      for (let i = 0; i < mesh.skinWeight.length; i += 4) {
        const sum = mesh.skinWeight[i] + mesh.skinWeight[i + 1]
          + mesh.skinWeight[i + 2] + mesh.skinWeight[i + 3];
        assert.ok(Math.abs(sum - 1) < 1e-6, `weight ${i / 4} sums to ${sum}`);
      }
    }
  });
}

test('bake is byte-reproducible from the local source', async () => {
  const first = JSON.stringify(bakeHeroBody(await loadHeroBodySource('superhero-male')));
  const second = JSON.stringify(bakeHeroBody(await loadHeroBodySource('superhero-male')));
  assert.equal(second, first);
});

test('unknown body kinds are rejected before any source is loaded', async () => {
  for(const id of ['superhero-alien','toString','constructor','__proto__'])await assert.rejects(loadHeroBodySource(id), /Unknown hero body source/);
});

test('generated bank exactly matches a fresh compact bake of both local sources', async () => {
  const text = await readFile(new URL('../src/data/hero-body-bank.json', import.meta.url), 'utf8');
  const bodies={};
  for(const id of ['superhero-male','superhero-female'])bodies[id]=bakeHeroBody(await loadHeroBodySource(id));
  assert.equal(text,`${JSON.stringify({version:1,bodies})}\n`,'generated bank must contain the exact fresh source bake');
});
