// Adapter for humanoid bodies: a proportion + socket package over a KNOWN catalog body. It does
// not ship a mesh — the hero-body catalog already does — it ships the measured rig facts an
// equipment fitter needs (pivot height, arm lengths, hand/holster/sling sockets) by building the
// production Fighter headlessly through the same Studio profile path the game uses.
import * as THREE from 'three';
import {Fighter} from '../../src/engine/entity.js';
import {ROSTER} from '../../src/data/characters.js';
import {HERO_BODIES} from '../../src/data/hero-models.js';
import {profileFromDef,applyProfile} from '../../src/tool/studio-profile.js';
import {readFile} from 'node:fs/promises';
import {REPO_ROOT} from '../lib/paths.js';
import {resolve} from 'node:path';

const round=(v,d=4)=>Array.isArray(v)?v.map(n=>round(n,d)):+v.toFixed(d);
const quat=(x,y,z)=>new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z)).toArray().map(n=>+n.toFixed(6));
export default {
 name:'humanoid-body',version:1,kinds:['humanoid-body'],
 async build({recipe,log}){
  const def=ROSTER.find(d=>d.id===recipe.hero);if(!def)throw new Error(`hero "${recipe.hero}" is not in the roster`);
  if(!HERO_BODIES.includes(recipe.catalogBody))throw new Error(`catalog body "${recipe.catalogBody}" is not bundled (${HERO_BODIES.join(', ')})`);
  const profile=profileFromDef(def);profile.model.body=recipe.catalogBody;
  if(recipe.frame)Object.assign(profile.frame,recipe.frame);
  const effective=applyProfile(def,profile); // validates frame limits exactly as Studio does
  const f=new Fighter(effective,{rimK:.14});
  f.pos.set(0,0,0);f.obj.position.set(0,0,0);f.obj.updateMatrixWorld(true);
  const p=f.parts,rig=p.rig,w=o=>round(o.getWorldPosition(new THREE.Vector3()).toArray());
  const scale=effective.frame?.scale??1;
  // Height from the driven rig (head socket to the lower boot), never from a skinned mesh's
  // bind-space bounding box, which cannot see the frame.
  const bootY=Math.min(new THREE.Box3().setFromObject(p.legL.userData.boot).min.y,new THREE.Box3().setFromObject(p.legR.userData.boot).min.y);
  const headY=new THREE.Box3().setFromObject(p.head).max.y;
  // Sockets the engine already owns are recorded as identity on their rig parent. The holster
  // and sling are DERIVED from the built rig's anatomy — hip pivot, thigh half-width, torso
  // half-depth — as world offsets, then expressed in the parent's local space by dividing out
  // that part's frame scale (a socket parented to a bulk-scaled pelvis inherits its scale).
  const half=(mesh,axis)=>{mesh.geometry.computeBoundingBox();const size=mesh.geometry.boundingBox.getSize(new THREE.Vector3());return size[axis]*.5*mesh.getWorldScale(new THREE.Vector3())[axis];};
  const hipX=Math.abs(p.legR.getWorldPosition(new THREE.Vector3()).x),thighHalf=Math.max(half(p.legR.userData.thigh,'x'),half(p.legR.userData.thigh,'z'));
  const torsoHalfDepth=half(p.torso,'z');
  const toLocal=(parent,world)=>{const s=parent.getWorldScale(new THREE.Vector3());return round([world[0]/s.x,world[1]/s.y,world[2]/s.z]);};
  const holsterWorld=[hipX+thighHalf+.42*scale,-.55*scale,.12*scale];
  const slingWorld=[.45*scale,.35*scale,-(torsoHalfDepth+.55*scale)];
  const sockets=[
   {name:'hand.right',parent:'rightHand',position:[0,0,0],rotation:[0,0,0,1]},
   {name:'hand.left',parent:'leftHand',position:[0,0,0],rotation:[0,0,0,1]},
   {name:'holster.hip',parent:'pelvis',position:toLocal(p.pelvis,holsterWorld),rotation:quat(0,0,-.18),worldOffset:round(holsterWorld)},
   {name:'sling.back',parent:'chest',position:toLocal(p.torso,slingWorld),rotation:quat(.15,0,-.35),worldOffset:round(slingWorld)},
   ...(recipe.sockets||[]),
  ];
  // Optional semantic hit zones (the brief's six gameplay zones), derived from the driven rig's
  // own part volumes. Metadata only: runtime collision and effects stay main-task owned.
  const capsule=(zone,from,to,radiusMesh,attach)=>{
   const a=from.getWorldPosition(new THREE.Vector3()),b=to.getWorldPosition(new THREE.Vector3()),origin=from.getWorldPosition(new THREE.Vector3());
   return {zone,shape:'capsule',attach,center:round(a.sub(origin).toArray()),end:round(b.sub(origin).toArray()),radius:round(Math.max(half(radiusMesh,'x'),half(radiusMesh,'z')))};
  };
  const headHalf=half(p.head,'y');
  const hitZones=[
   {zone:'head',shape:'sphere',attach:'head',center:[0,0,0],radius:round(headHalf)},
   {zone:'torso',shape:'capsule',attach:'pelvis',center:[0,0,0],end:round(p.torso.getWorldPosition(new THREE.Vector3()).sub(p.pelvis.getWorldPosition(new THREE.Vector3())).toArray()),radius:round(Math.max(half(p.torso,'x'),half(p.torso,'z')))},
   capsule('arm.left',p.armL,p.armL.children[2],p.armL.children[0],'armL'),
   capsule('arm.right',p.armR,p.armR.children[2],p.armR.children[0],'armR'),
   capsule('leg.left',p.legL,p.legL.userData.boot,p.legL.userData.thigh,'legL'),
   capsule('leg.right',p.legR,p.legR.userData.boot,p.legR.userData.thigh,'legR'),
  ];
  const body={
   version:1,hero:def.id,catalogBody:recipe.catalogBody,frame:effective.frame,hitZones,
   measured:{pivotHeight:round(rig.pivotHeight),upperLength:round(p.armR.userData.upperLength),foreLength:round(p.armR.userData.foreLength),
    height:round(headY-bootY),headTop:round(headY),footBottom:round(bootY),shoulderSpan:round(Math.abs(w(p.armL)[0]-w(p.armR)[0])),
    hipX:round(hipX),thighHalfWidth:round(thighHalf),torsoHalfDepth:round(torsoHalfDepth),
    rest:{rightHand:w(rig.sockets.rightHand),leftHand:w(rig.sockets.leftHand),pelvis:w(rig.sockets.pelvis),chest:w(rig.sockets.chest),head:w(rig.sockets.head)}},
   sockets,
  };
  f.dispose();
  const bank=JSON.parse(await readFile(resolve(REPO_ROOT,'src','data','hero-body-bank.json'),'utf8')).bodies[recipe.catalogBody];
  let triangles=0;for(const m of bank.meshes)triangles+=Math.floor(m.index.length/3);
  const text=JSON.stringify(body,null,1)+'\n',bytes=Buffer.from(text,'utf8');
  log(`  ${recipe.id}: ${recipe.catalogBody} scale ${scale} pivot ${body.measured.pivotHeight} height ${body.measured.height} span ${body.measured.shoulderSpan}`);
  return {
   manifest:{
    rig:{skeleton:'pw-hero-rig@1',catalogBody:recipe.catalogBody,bones:bank.joints.length},
    sockets,hitZones,
    frame:effective.frame,
    units:{sourceConversion:{scale:1,yawDegrees:0,mirrorX:false,sourceUp:'+Y',sourceForward:'+Z',note:'catalog body already in game units; see assets-src/quaternius/base-characters/PROVENANCE.md'}},
    budgets:{measured:{triangles,drawCalls:bank.meshes.length,materials:new Set(bank.meshes.map(m=>m.material)).size,bones:bank.joints.length,textures:1,bytes:Buffer.byteLength(JSON.stringify(bank))}},
    provenance:{},
   },
   outputs:[{path:'body.json',role:'body',bytes}],
  };
 },
};
