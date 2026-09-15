import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {ConvexHull} from 'three/examples/jsm/math/ConvexHull.js';
import {Color,Vector3} from 'three';
import {disposeAircraftAsset} from './frontline-aircraft.js';
import {heroModelOf} from '../data/hero-models.js';

export const CLONE_EQUIPMENT_ASSET='./models/frontline/clone-kit.glb';
const PALETTES={
 soldier:{suit:'#525b3d',suit2:'#424a36',armor:'#34382d',shell:'#555b42',webbing:'#948368',hardware:'#252a27'},
 clone:{suit:'#424746',suit2:'#393e3c',armor:'#363b39',shell:'#c1b49a',webbing:'#958974',hardware:'#292e2d'},
};
function applyPalette(f,kind){
 const colors=PALETTES[kind],p=f.parts;
 // A Studio-applied definition carries authored poses with its presentation
 // profile. Equipment must not overwrite the creator's saved uniform colors.
 const authoredUniform=kind==='soldier'&&(f.def?.model?.poses||f.def?.isCustom);
 if(!authoredUniform)for(const key of ['suit','suit2','armor'])p.mats?.[key]?.color.set(colors[key]);
 // Authored anatomy uses the same live palette Color objects as the base rig.
 // Keep skin tones and source weapon materials untouched.
 if(p.emblem)p.emblem.visible=false;
 if(p.mats?.suit)f._suitHex=p.mats.suit.color.getHex();
 const material=p.skin?.materials.body;
 if(kind==='clone'&&material&&!material.userData.cloneIdentification){
  const compile=material.onBeforeCompile,key=material.customProgramCacheKey;
  material.onBeforeCompile=function(shader,...args){
   compile.call(this,shader,...args);
   shader.uniforms.cloneIdentificationColor={value:new Color('#cf713c')};
   shader.fragmentShader='uniform vec3 cloneIdentificationColor;\n'+shader.fragmentShader;
   // Sleeve band in the source body's bind space follows its native skin weights
   // through the entire animation. No floating ring geometry, no extra draw.
   shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`
    float cloneSleeveBand=smoothstep(.275,.282,abs(heroBind.x))*(1.0-smoothstep(.335,.342,abs(heroBind.x)))*smoothstep(1.32,1.36,heroBind.y);
    diffuseColor.rgb=mix(diffuseColor.rgb,cloneIdentificationColor,cloneSleeveBand);
    #include <roughnessmap_fragment>`);
  };
  material.customProgramCacheKey=()=>key.call(material)+'|clone-sleeve-id-v1';
  material.userData.cloneIdentification=true;material.needsUpdate=true;
 }
}
function supportHull(root){
 root.updateWorldMatrix(true,true);const inverse=root.matrixWorld.clone().invert(),points=[];
 root.traverse(o=>{const a=o.geometry?.attributes.position;if(!a)return;for(let i=0;i<a.count;i++)points.push(new Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).applyMatrix4(inverse));});
 const hull=new ConvexHull().setFromPoints(points),vertices=new Set();
 for(const face of hull.faces){let edge=face.edge;do{vertices.add(edge.vertex.point);edge=edge.next;}while(edge!==face.edge);}
 // Convex hull vertices preserve exact directional minima/maxima for floor and
 // box support. Compute once behind loading, not thousands of points per KO step.
 return [...(vertices.size?vertices:points)].flatMap(p=>p.toArray());
}
function fitPlayerCarrier(root){
 // Preserve every front-facing vertex and the authored shoulder webbing. Only
 // broaden the rear armor panel below the neck; this stays inside the existing
 // side-webbing width and cannot move the front rifle contact surface.
 root.traverse(o=>{
  if(!o.isMesh||o.material.name==='kit-webbing-khaki')return;
  const p=o.geometry.attributes.position;let changed=false;
  for(let i=0;i<p.count;i++)if(p.getZ(i)<0){
   const x=p.getX(i),y=p.getY(i);p.setX(i,x*1.28);
   if(y<.15)p.setY(i,.15+(y-.15)*1.12);
   changed=true;
  }
  if(changed){p.needsUpdate=true;o.geometry.computeVertexNormals();o.geometry.computeBoundingBox();o.geometry.computeBoundingSphere();}
 });
}
// Rigid authored accessories follow the existing driven parts, including KO.
// Each fighter owns its GPU resources so native fighter disposal stays valid.
export async function loadCloneEquipment(encounter,{loader=new GLTFLoader(),kind='clone'}={}){
 const originalParts=new Map(encounter.soldiers.map(f=>[f,f.parts]));
 const asset=await loader.loadAsync(CLONE_EQUIPMENT_ASSET);
 try{
  if(encounter.disposed)return;
  const entries=[['clone_helmet_head','head'],['clone_vest_torso','torso']];
  for(const [name]of entries){
   const root=asset.scene.getObjectByName(name);if(!root)throw Error(`Clone equipment missing ${name}`);
   root.traverse(o=>{if(o.isMesh&&Array.isArray(o.material))throw Error('Clone equipment requires scalar materials');});
  }
  if(kind==='soldier')fitPlayerCarrier(asset.scene.getObjectByName('clone_vest_torso'));
  for(const [name]of entries){const root=asset.scene.getObjectByName(name);root.userData.ragdollSupport=supportHull(root);}
  for(const f of encounter.soldiers){
   if(f._formDisposed||f.parts!==originalParts.get(f)||f.parts.head.getObjectByName('clone_helmet_head'))continue;
   applyPalette(f,kind);
   const materials=new Map();
   for(const [name,key]of entries){
    const root=asset.scene.getObjectByName(name).clone(true);root.userData.heroGear=true;root.userData.sourceOnly=false;
    root.traverse(o=>{
     if(!o.isMesh)return;
     o.geometry=o.geometry.clone();o.userData.heroGear=true;o.castShadow=true;o.receiveShadow=true;
     const material=o.material,vestShell=kind==='soldier'&&key==='torso'&&material.name==='kit-shell-olive';
     const materialKey=vestShell?'soldier-vest-shell':material;
     if(!materials.has(materialKey)){
      const copy=material.clone(),palette=PALETTES[kind];
      const color=vestShell?'#998467':material.name==='kit-shell-olive'?palette.shell:material.name==='kit-webbing-khaki'?palette.webbing:material.name==='kit-rubber-hardware'?palette.hardware:null;
      if(color)copy.color.set(color);materials.set(materialKey,copy);
     }
     o.material=materials.get(materialKey);
    });
    f.parts[key].add(root);
   }
   f.parts.cowl.visible=false;
   // Replace the old silhouette only after the fitted helmet is available.
   // The superhero headband otherwise protrudes through it as a false wide brim.
   for(const child of f.parts.head.children)if(child.name==='hair-back'||child.name==='hero-headband')child.visible=false;
   const old=f.parts.torso.getObjectByName('field-torso_harness');if(old)old.visible=false;
   f._cloneEquipment=true;
   if(kind==='soldier')f._soldierEquipment=true;
  }
 }finally{disposeAircraftAsset(asset.scene);}
}

// Reuse the authored accessory asset for grounded player roles. Async completion
// is guarded against disposal AND a replacement appearance; stale gear must not
// pop onto a new form. The Fighter owns disposal of the attached resources.
export function loadSoldierEquipment(f,options={}){
 // This carrier is authored against the native superhero body. The modular
 // body already owns skinned vest/helmet slots, so adding it asynchronously
 // creates a second outfit driven by unrelated torso and head proportions.
 if(heroModelOf(f.def||{}).body==='faceted-v1')return Promise.resolve(false);
 return loadCloneEquipment({soldiers:[f],get disposed(){return !!f._formDisposed;}},{...options,kind:'soldier'});
}
