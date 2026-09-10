// Exact CC0 source ingestion. Runtime consumes the generated bank, never this Node module.
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const ROOT = new URL('../../assets-src/quaternius/base-characters/', import.meta.url);
const SOURCES = {
  'superhero-male': 'Superhero_Male_FullBody',
  'superhero-female': 'Superhero_Female_FullBody',
};
const EYE_FILE = 'T_Eye_Brown.png';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function stripTextureReferences(document) {
  for (const material of document.materials ?? []) {
    delete material.normalTexture;
    delete material.occlusionTexture;
    delete material.emissiveTexture;
    if (material.pbrMetallicRoughness) {
      delete material.pbrMetallicRoughness.baseColorTexture;
      delete material.pbrMetallicRoughness.metallicRoughnessTexture;
    }
  }
  delete document.images;
  delete document.textures;
  delete document.samplers;
}

export async function loadHeroBodySource(kind) {
  if (!Object.hasOwn(SOURCES,kind)) throw new Error(`Unknown hero body source: ${kind}`);
  const stem = SOURCES[kind];

  const gltfFile = `${stem}.gltf`;
  const binFile = `${stem}.bin`;
  const [gltfBytes, binBytes, eyeBytes] = await Promise.all([
    readFile(new URL(gltfFile, ROOT)),
    readFile(new URL(binFile, ROOT)),
    readFile(new URL(EYE_FILE, ROOT)),
  ]);
  const document = JSON.parse(gltfBytes);
  stripTextureReferences(document);
  document.buffers[0].uri = `data:application/octet-stream;base64,${binBytes.toString('base64')}`;

  // FileLoader's in-memory data URI path emits ProgressEvent in browser builds.
  globalThis.ProgressEvent ??= class ProgressEvent {
    constructor(type, init) {
      this.type = type;
      Object.assign(this, init);
    }
  };

  const gltf = await new GLTFLoader().parseAsync(JSON.stringify(document), '');
  gltf.scene.updateMatrixWorld(true);
  return {
    kind,
    gltf,
    files: {gltf: gltfFile, bin: binFile, eye: EYE_FILE},
    sha256: {gltf: sha256(gltfBytes), bin: sha256(binBytes), eye: sha256(eyeBytes)},
  };
}

function materialClass(mesh) {
  const name = mesh.name.toLowerCase();
  if (name.includes('eyebrow')) return 'eyebrows';
  if (name.includes('eye')) return 'eyes';
  return 'body';
}

function transformedAttribute(attribute, matrix, itemSize, normal = false) {
  const result = new Array(attribute.count * itemSize);
  const vector = new THREE.Vector3();
  const normalMatrix = normal ? new THREE.Matrix3().getNormalMatrix(matrix) : null;
  for (let i = 0; i < attribute.count; i++) {
    vector.fromBufferAttribute(attribute, i);
    if (normal) vector.applyNormalMatrix(normalMatrix);
    else vector.applyMatrix4(matrix);
    vector.toArray(result, i * itemSize);
  }
  return result;
}

function attributeArray(attribute) {
  const result = new Array(attribute.count * attribute.itemSize);
  for (let i = 0; i < attribute.count; i++) {
    for (let component = 0; component < attribute.itemSize; component++) {
      result[i * attribute.itemSize + component] = attribute.getComponent(i, component);
    }
  }
  return result;
}

export function bakeHeroBody(source) {
  const skinnedMeshes = [];
  source.gltf.scene.traverse(object => {
    if (object.isSkinnedMesh) skinnedMeshes.push(object);
  });
  if (!skinnedMeshes.length) throw new Error(`No skinned meshes in ${source.kind}`);

  const bones = skinnedMeshes[0].skeleton.bones;
  const jointIndices = new Map(bones.map((bone, index) => [bone, index]));
  const joints = bones.map(bone => ({
    name: bone.name,
    parent: jointIndices.get(bone.parent) ?? -1,
    matrix: bone.matrixWorld.toArray(),
    localMatrix: bone.matrix.toArray(),
  }));

  const meshes = skinnedMeshes.map(mesh => {
    const geometry = mesh.geometry;
    const position = geometry.getAttribute('position');
    const normal = geometry.getAttribute('normal');
    const uv = geometry.getAttribute('uv');
    const skinIndex = geometry.getAttribute('skinIndex');
    const skinWeight = geometry.getAttribute('skinWeight');
    if (!position || !normal || !uv || !skinIndex || !skinWeight) {
      throw new Error(`Incomplete skinned geometry: ${mesh.name}`);
    }
    return {
      name: mesh.name,
      material: materialClass(mesh),
      position: transformedAttribute(position, mesh.matrixWorld, 3),
      normal: transformedAttribute(normal, mesh.matrixWorld, 3, true),
      uv: attributeArray(uv),
      index: geometry.index
        ? attributeArray(geometry.index)
        : Array.from({length: position.count}, (_, index) => index),
      skinIndex: attributeArray(skinIndex),
      skinWeight: attributeArray(skinWeight),
    };
  });

  return {
    source: {
      author: 'Quaternius',
      pack: 'Universal Base Characters',
      license: 'CC0-1.0',
      url: 'https://quaternius.com/packs/universalbasecharacters.html',
      mirror: 'https://codeberg.org/jamesonBradfield/Quaternius_IK_Rigged_with_animations',
      revision: '0cc5dc351f4fffbe13a25381e73cb0a1aea67f47',
      kind: source.kind,
      files: source.files,
      sha256: source.sha256,
      basis: 'Y-up source scene world space',
    },
    joints,
    meshes,
  };
}
