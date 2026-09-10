import * as THREE from 'three';
import {snapshotNaniteForearms} from './nanite-forearms.js';
import bank from '../data/hero-body-bank.json' with {type:'json'};
import {aboveBootCuff,frontDepth} from './hero-skin-geometry.js';
import {waistbandGeometry} from './hero-waistband.js';
import {applyFieldArmorWear} from './field-armor-wear.js';

// Source-authored weighted anatomy, carried by the FINAL gameplay rig. There is
// no second animation controller, root motion, asynchronous actor replacement,
// or collision authority here. Bind-space calibration is the only retarget layer.
const origin=new THREE.Vector3(),up=new THREE.Vector3(0,1,0),front=new THREE.Vector3(0,0,1);
const rotation=new THREE.Quaternion(),axisRotation=new THREE.Quaternion();
let eyeTexture;
function eyes(){
 const material=new THREE.MeshStandardMaterial({color:'#e2d7be',roughness:.32});
 if(typeof document!=='undefined'){
  eyeTexture??=new THREE.TextureLoader().load(new URL('../../assets-src/quaternius/base-characters/T_Eye_Brown.png',import.meta.url).href);
  eyeTexture.colorSpace=THREE.SRGBColorSpace;eyeTexture.flipY=false;material.map=eyeTexture;
 }
 return material;
}
function suitMaterial(parts,points,model){
 const mat=parts.mats.suit.clone(),palette={skinSuit:{value:parts.mats.suit.color},skinLegs:{value:parts.mats.suit2.color},skinBoots:{value:parts.mats.armor.color},skinFace:{value:parts.mats.skin.color},
  skinCuts:{value:new THREE.Vector3(points.pelvis.y+.035,points.calf_r.y*.76,points.neck_01.y+.018)},skinWrist:{value:Math.abs(points.hand_r.x)-.015}};
 for(const region of ['Suit','Legs','Boots','Face'])palette['skinEmission'+region]={value:new THREE.Color(0,0,0)};
 mat.heroPalette=palette;
 // Cut cloth boundaries per fragment in source bind space. Assigning whole
 // triangles to palette slots made every diagonal topology edge a sawtooth seam.
 mat.onBeforeCompile=shader=>{
  parts.mats.suit.onBeforeCompile(shader);
  Object.assign(shader.uniforms,palette);
  shader.vertexShader='varying vec3 heroBind;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nheroBind=position;');
  shader.fragmentShader='varying vec3 heroBind; uniform vec3 skinSuit,skinLegs,skinBoots,skinFace,skinCuts,skinEmissionSuit,skinEmissionLegs,skinEmissionBoots,skinEmissionFace; uniform float skinWrist;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float waist=1.0-smoothstep(skinCuts.x-.0015,skinCuts.x+.0015,heroBind.y-abs(heroBind.x)*.08);
   float boot=1.0-smoothstep(skinCuts.y-.0015,skinCuts.y+.0015,heroBind.y);
   float head=smoothstep(skinCuts.z-.0015,skinCuts.z+.0015,heroBind.y);
   float hand=smoothstep(skinWrist-.0015,skinWrist+.0015,abs(heroBind.x));
   diffuseColor.rgb=mix(mix(mix(skinSuit,skinLegs,waist),skinBoots,boot),skinFace,max(head,hand));
   ${model.surface==='field'?`#ifdef USE_MAP
   diffuseColor.rgb*=mix(vec3(1.0),texture2D(map,vMapUv).rgb,1.0-max(max(head,hand),boot));
   #endif`:''}`);
  if(model.surface==='field'){
   shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`vec3 fieldClothNormal=normal;
    ${THREE.ShaderChunk.normal_fragment_maps}
    normal=normalize(mix(fieldClothNormal,normal,1.0-max(max(head,hand),boot)));`);
   if(model.body==='superhero-male')shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(.88,roughnessFactor,1.0-max(max(head,hand),boot));');
  }
  shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
   totalEmissiveRadiance=mix(mix(mix(skinEmissionSuit,skinEmissionLegs,waist),skinEmissionBoots,boot),skinEmissionFace,max(head,hand));`);
 };
 mat.customProgramCacheKey=()=> 'hero-source-suit-v5-garment-'+(model.surface??'standard')+'-'+(model.body??'procedural');
 return mat;
}
// Source axes describe anatomy (longitudinal and outward), not exporter Euler
// conventions. The destination driver already contains all authored frame scale.
function calibration(center,yAxis,zAxis,scale,offset=origin){
 const y=yAxis.clone().normalize(),z=zAxis.clone().addScaledVector(y,-zAxis.dot(y)).normalize();
 const x=new THREE.Vector3().crossVectors(y,z).normalize();z.crossVectors(x,y).normalize();
 const basis=new THREE.Matrix4().makeBasis(x,y,z).setPosition(center).invert();
 return new THREE.Matrix4().makeTranslation(...offset.toArray()).multiply(new THREE.Matrix4().makeScale(...scale)).multiply(basis);
}
function hideTree(root,keep=new Set()){
 if(!root||keep.has(root))return;
 if(root.isMesh)root.layers.disable(0);
 for(const child of root.children)hideTree(child,keep);
}
function bindings(parts,source){
 const p=parts,points=Object.fromEntries(source.joints.map(j=>[j.name,new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().fromArray(j.matrix))]));
 const mapped=new Map();
 const put=(names,driver,map)=>{for(const name of names)mapped.set(name,{driver,map});};
 const pelvis=points.pelvis,shoulderY=points.upperarm_r.y;
 const trunkCenter=new THREE.Vector3(0,THREE.MathUtils.lerp(pelvis.y,shoulderY,.6125),pelvis.z);
 const torsoMap=calibration(trunkCenter,up,front,[6,3.02/(shoulderY-pelvis.y),5.6]);
 put(['spine_01','spine_02','spine_03','clavicle_l','clavicle_r'],p.torso,torsoMap);
 put(['root','pelvis'],p.pelvis,calibration(pelvis,up,front,[5.7,5.8,5.6]));
 const body=source.meshes.find(m=>m.material==='body');let crown=-Infinity;
 for(let i=1;i<body.position.length;i+=3)crown=Math.max(crown,body.position[i]);
 const headCenter=new THREE.Vector3(0,crown-.12,points.Head.z);
 // Source neck weights extend into the jaw. Letting those weights follow the
 // chest while the cranium followed the head compressed the face under the hair.
 put(['Head','neck_01'],p.head,calibration(headCenter,up,front,[6.2,6.2,6.2]));
 const eyes=source.meshes.find(m=>m.material==='eyes');
 if(eyes)for(const [sign,socket] of [[-1,p.eyeL],[1,p.eyeR]]){
  const box=new THREE.Box3();for(let i=0;i<eyes.position.length;i+=3)if(eyes.position[i]*sign>0)box.expandByPoint(new THREE.Vector3(...eyes.position.slice(i,i+3)));
  if(!box.isEmpty())socket.position.copy(box.getCenter(new THREE.Vector3()).setZ(box.max.z)).applyMatrix4(mapped.get('Head').map);
 }
 const insignia=p.emblem.geometry.attributes.position;
 for(let i=0;i<insignia.count;i++){
  const point=new THREE.Vector3(insignia.getX(i),insignia.getY(i),0).add(p.emblem.position).applyMatrix4(torsoMap.clone().invert());
  const depth=frontDepth(body,point.x,point.y);
  if(Number.isFinite(depth))insignia.setZ(i,(depth-pelvis.z)*5.6+.02-p.emblem.position.z);
 }
 insignia.needsUpdate=true;p.emblem.geometry.computeVertexNormals();p.emblem.geometry.computeBoundingSphere();
 for(const side of ['r','l']){
  // Source anatomical right is the engine's negative-X L slot, already used by
  // our animation ingest. Never mirror geometry or negate its winding.
  const arm=side==='r'?p.armL:p.armR,leg=side==='r'?p.legL:p.legR;
  const upper=points['upperarm_'+side],elbow=points['lowerarm_'+side],hand=points['hand_'+side];
  const thigh=points['thigh_'+side],knee=points['calf_'+side],foot=points['foot_'+side];
  const segment=(name,a,b,driver,length,width)=>put([name],driver,
   calibration(a.clone().add(b).multiplyScalar(.5),a.clone().sub(b),front,[width,length/a.distanceTo(b),width]));
  segment('upperarm_'+side,upper,elbow,arm.children[0],1.65,5.1);
  segment('lowerarm_'+side,elbow,hand,arm.children[1],1.55,5.1);
  segment('thigh_'+side,thigh,knee,leg.userData.thigh,1.95,5.1);
  segment('calf_'+side,knee,foot,leg.userData.shin,1.8,5.1);
  put(['hand_'+side],arm.children[2],calibration(hand,hand.clone().sub(points['middle_01_'+side]),up,[4.6,4.6,4.6],new THREE.Vector3(0,.2,0)));
  put(['foot_'+side,'ball_'+side,'ball_leaf_'+side],leg.userData.boot,
   calibration(foot,up,front,[4.6,4.6,4.6],new THREE.Vector3(0,0,-.1)));
 }
 if(p.cape){
  const seamY=trunkCenter.y+1.25/(3.02/(shoulderY-pelvis.y));let back=Infinity;
  for(let i=0;i<body.position.length;i+=3){
   if(Math.abs(body.position[i])<.2&&Math.abs(body.position[i+1]-seamY)<.035)back=Math.min(back,body.position[i+2]);
  }
  if(Number.isFinite(back))p.cape.position.z=(back-pelvis.z)*5.6-.04;
 }
 return {mapped,points};
}
export function bindHeroSkin(parts,def){
 if(def.model?.surface==='field')applyFieldArmorWear(parts.mats.armor);
 const id=def.model?.body;if(!Object.hasOwn(bank.bodies,id))return;
 const source=bank.bodies[id];
 const {mapped,points}=bindings(parts,source),bones=source.joints.map(j=>{const b=new THREE.Bone();b.name=j.name;b.matrixAutoUpdate=false;b.userData.heroSkinBone=true;return b;});
 const inverses=source.joints.map(j=>new THREE.Matrix4().fromArray(j.matrix).invert());
 const skeleton=new THREE.Skeleton(bones,inverses),records=[];
 const prepared=new Set();
 function prepare(i){
  if(prepared.has(i))return;prepared.add(i);
  const j=source.joints[i],binding=mapped.get(j.name),finger=/^(index|middle|ring|pinky|thumb)_/.test(j.name);
  if(finger){
   prepare(j.parent);
   bones[j.parent].add(bones[i]);
   const local=new THREE.Matrix4().fromArray(j.localMatrix),position=new THREE.Vector3(),quaternion=new THREE.Quaternion(),scale=new THREE.Vector3();local.decompose(position,quaternion,scale);
   const sourceWorld=new THREE.Matrix4().fromArray(j.matrix),q=new THREE.Quaternion().setFromRotationMatrix(sourceWorld);
   const direction=new THREE.Vector3(0,1,0).applyQuaternion(q),curlAxis=new THREE.Vector3().crossVectors(direction,up).normalize().applyQuaternion(q.clone().invert());
   const digit=Number(j.name.split('_')[1]),amount=j.name.startsWith('thumb')?[0,.35,.65,.65][digit]??0:[0,1.1,1.35,1.1][digit]??0;
   records.push({i,parent:j.parent,position,quaternion,scale,curlAxis,amount,hand:j.name.endsWith('_r')?parts.armL.children[2]:parts.armR.children[2]});
  }else{
   if(!binding)throw new Error(`Unsupported catalog body joint: ${j.name}`);
   // Native transform inheritance, not cached world-space matrices: physics
   // separation, portals, portraits and moving parent groups can all move the
   // actor after animation. A bone under its final driver follows automatically.
   binding.driver.add(bones[i]);bones[i].matrix.copy(binding.map).multiply(new THREE.Matrix4().fromArray(j.matrix));
   records.push({i,...binding,bind:new THREE.Matrix4().fromArray(j.matrix)});
  }
 }
 source.joints.forEach((_,i)=>prepare(i));
 const materials={body:suitMaterial(parts,points,def.model),eyes:eyes(),eyebrows:new THREE.MeshStandardMaterial({color:def.model?.hairColor??'#172127',roughness:.85})};
 const meshes=[];
 const sourceFootCut=Math.max(points.foot_r.y,points.foot_l.y)+.06;
 for(const original of source.meshes){
  const sourceMesh=original.material==='body'?aboveBootCuff(original,sourceFootCut):original;
  const attrs={position:new THREE.Float32BufferAttribute(sourceMesh.position,3),normal:new THREE.Float32BufferAttribute(sourceMesh.normal,3),
   uv:new THREE.Float32BufferAttribute(sourceMesh.uv,2),skinIndex:new THREE.Uint16BufferAttribute(sourceMesh.skinIndex,4),skinWeight:new THREE.Float32BufferAttribute(sourceMesh.skinWeight,4)};
  for(const [key,indices] of [[sourceMesh.material,sourceMesh.index]]){
   const geometry=new THREE.BufferGeometry();for(const [name,attr] of Object.entries(attrs))geometry.setAttribute(name,attr);
   geometry.setIndex(indices);
   const mesh=new THREE.SkinnedMesh(geometry,materials[key]);mesh.name=`hero-skin-${key}`;mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;
   // Conservative raycast bounds cover all production articulation, including a
   // ragdoll. Accurate review bounds can be recomputed explicitly without doing
   // a CPU skin of every vertex for every actor on each frame.
   mesh.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,4.6*(def.frame?.scale??1),0),40*(def.frame?.scale??1));
   parts.body.add(mesh);mesh.bind(skeleton,new THREE.Matrix4());meshes.push(mesh);
  }
 }
 // Re-cut the strap from this body's bind surface with its native weights.
 // A pelvis-mounted ring cannot follow a waist blended between several bones.
 const oldBelt=parts.pelvis.getObjectByName('costume-belt'),bodyMesh=meshes.find(m=>m.name==='hero-skin-body');
 if(oldBelt&&bodyMesh){
  const band=waistbandGeometry(bodyMesh.geometry,points.pelvis.y+(def.model.costume==='martial'?.02:.035),points.pelvis.y+.09,.009);
  const belt=new THREE.SkinnedMesh(band,oldBelt.material);belt.name='costume-belt';belt.castShadow=true;belt.receiveShadow=true;belt.frustumCulled=false;
  belt.boundingSphere=bodyMesh.boundingSphere.clone();parts.body.add(belt);belt.bind(skeleton,new THREE.Matrix4());meshes.push(belt);
  oldBelt.removeFromParent();oldBelt.geometry.dispose();
 }
 const keep=new Set([parts.cape,parts.emblem,parts.legL.userData.boot,parts.legR.userData.boot]);
 parts.g.traverse(o=>{if(o.userData.heroGear)keep.add(o);});
 for(const child of parts.head.children)if(child.name==='hair-back')keep.add(child);
 for(const arm of [parts.armL,parts.armR]){
  if(arm.userData.shield)keep.add(arm.userData.shield);
  for(const child of arm.children[2].children)keep.add(child);
 }
 for(const child of parts.torso.children)if(child.name==='flight-wing')keep.add(child);
 for(const root of [parts.torso,parts.pelvis,parts.head,parts.armL,parts.armR,parts.legL,parts.legR])hideTree(root,keep);
 parts.skin={id,source:source.source,sourceFootCut,skeleton,records,meshes,materials,disposed:false};
 updateHeroSkin(parts);
}
export function updateHeroSkin(parts){
 const skin=parts.skin;if(!skin||skin.disposed)return;
 for(const [region,key] of [['Suit','suit'],['Legs','suit2'],['Boots','armor'],['Face','skin']]){
  const material=parts.mats[key];skin.materials.body.heroPalette['skinEmission'+region].value.copy(material.emissive).multiplyScalar(material.emissiveIntensity);
 }
 skin.materials.body.opacity=parts.mats.suit.opacity;skin.materials.body.transparent=parts.mats.suit.transparent;
 for(const r of skin.records){
  const bone=skin.skeleton.bones[r.i];
  if(!r.driver){
   const closed=1-(r.hand.morphTargetInfluences?.[0]??0);
   rotation.copy(r.quaternion).multiply(axisRotation.setFromAxisAngle(r.curlAxis,r.amount*closed));
   bone.matrix.compose(r.position,rotation,r.scale);
  }
 }
 // Refresh attached bind inverses for CPU picking too; ordinary scene rendering
 // also propagates these native bone transforms after any later root correction.
 parts.g.updateWorldMatrix(true,false);parts.g.updateMatrixWorld(true);
 skin.skeleton.update();
}
export function disposeHeroSkin(parts){
 const skin=parts?.skin;if(!skin||skin.disposed)return;
 // Skeletons join Fighter's existing reference-aware resource retirement. A
 // surviving raw scene copy must not lose its bone texture when a form changes.
 skin.disposed=true;
}

// Spectral copies are frozen poses, not second actors sharing live world-space
// bone matrices. Bake the presented vertices into independently owned geometry.
export function snapshotHeroSkins(root){
 snapshotNaniteForearms(root);
 const meshes=[];root.traverse(o=>{if(o.isSkinnedMesh&&(o.name.startsWith('hero-skin-')||o.name==='costume-belt'))meshes.push(o);});
 for(const source of meshes){
  const geometry=source.geometry.clone(),position=geometry.attributes.position,point=new THREE.Vector3();
  for(let i=0;i<position.count;i++){source.getVertexPosition(i,point);position.setXYZ(i,point.x,point.y,point.z);}
  geometry.deleteAttribute('skinIndex');geometry.deleteAttribute('skinWeight');
  geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const copy=new THREE.Mesh().copy(source,false);copy.geometry=geometry;copy.userData._snapshotGeometry=true;
  for(const child of [...source.children])copy.add(child);
  const parent=source.parent;parent.remove(source);parent.add(copy);
 }
 const unused=[];root.traverse(o=>{if(o.userData.heroSkinBone)unused.push(o);});for(const bone of unused)bone.removeFromParent();
 return root;
}
