import * as THREE from 'three';

// Shared images outlive individual fighters. Construction stays synchronous;
// preparation explicitly waits only for textures referenced by its own actors.
const surfaceMaps=new Map(),surfaceRecords=new WeakMap();
function loadSurface(record){
 const generation=++record.generation;
 record.status='loading';record.error=null;
 record.promise=new Promise(resolve=>{record.settle=resolve;});
 const current=()=>record.generation===generation&&record.status==='loading';
 const finish=(error=null)=>{
  if(!current())return;
  record.error=error;record.status=error?'error':'ready';record.settle({error});
 };
 if(typeof document==='undefined'){finish();return;}
 const fail=error=>finish(new Error(`Could not prepare hero texture ${record.url}: ${error?.message||'image load failed'}. Return to the menu and retry.`));
 try{
  new THREE.ImageLoader().load(record.url,image=>{
   if(!current())return;
   // ImageLoader's load event alone need not finish browser image decoding.
   // This chain always handles rejection, even outside a loading gate (Studio).
   Promise.resolve().then(()=>image.decode?.()).then(()=>{
    if(!current())return;
    record.texture.image=image;record.texture.needsUpdate=true;finish();
   }).catch(fail);
  },undefined,fail);
 }catch(error){fail(error);}
}
function surfaceMap(url,configure,key=url){
 if(surfaceMaps.has(key))return surfaceMaps.get(key).texture;
 const texture=new THREE.Texture();configure(texture);
 const record={url,texture,generation:0,status:'new',error:null,promise:null,settle:null};
 surfaceMaps.set(key,record);surfaceRecords.set(texture,record);
 texture.addEventListener('dispose',()=>{
  if(record.status==='disposed')return;
  record.generation++;record.status='disposed';record.error=new Error(`Hero texture was disposed while preparing: ${url}`);
  record.settle?.({error:record.error});
  if(surfaceMaps.get(key)===record)surfaceMaps.delete(key);
 });
 loadSurface(record);return texture;
}

// Resolves after image decode, not GPU upload. The battlefield loading gate
// must still warm its real render paths before publishing gameplay readiness.
export async function prepareHeroSurfaces(roots,{retry=false}={}){
 const records=new Set();
 for(const root of roots)root?.traverse(node=>{
  for(const material of [].concat(node.material||[]))for(const key of ['map','bumpMap','normalMap','roughnessMap']){
   const record=surfaceRecords.get(material[key]);if(record)records.add(record);
  }
 });
 for(const record of records)if(retry&&record.status==='error')loadSurface(record);
 const results=await Promise.all([...records].map(record=>record.promise));
 for(const result of results)if(result.error)throw result.error;
 // Read current status too: disposal can occur after a ready promise settled.
 for(const record of records)if(record.error)throw record.error;
}
function garmentMap(name){
 return surfaceMap(`./textures/hero/field-garment/${name}.png`,texture=>{
  texture.name=name;texture.colorSpace=THREE.NoColorSpace;texture.flipY=false;
  texture.anisotropy=4;texture.repeat.set(1,1);
 });
}
function fieldWeave(){
 return surfaceMap('./textures/hero/technical-weave-v1.png',texture=>{
  texture.name='technical-weave-v1';texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(16,16);texture.anisotropy=4;
 });
}

function fabricWeave(){
 const url='./textures/hero/technical-weave-v1.png';
 // The same audited image needs a separate sampler: changing fieldWeave's
 // shared repeat/color-space would alter existing tactical characters.
 return surfaceMap(url,texture=>{
  texture.name='fitted-fabric-relief';texture.colorSpace=THREE.NoColorSpace;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(1,1.5);texture.anisotropy=4;
 },url+'|fitted-relief');
}
const fittedFabric=model=>model.body==='superhero-male'&&model.costume==='fitted'&&(model.surface??'standard')==='standard';
export function createCapeMaterial(color,model){
 const material=new THREE.MeshStandardMaterial({color,roughness:.9,side:THREE.DoubleSide,metalness:0});
 if(fittedFabric(model)){material.bumpMap=fabricWeave();material.bumpScale=.005;}
 return material;
}

// A presentation preset, usable by creator characters through their profile.
// It never owns poses, sockets, collision or simulation scale.
export function applyHeroSurface(materials,model){
 if(fittedFabric(model)){
  for(const material of [materials.suit,materials.suit2]){
   material.bumpMap=fabricWeave();material.bumpScale=.003;material.roughness=.88;material.metalness=0;
   material.userData.heroFabric=true;
  }
 }
 if(model.surface!=='field')return;
 const {suit,suit2,armor}=materials,tailored=model.body==='superhero-male',texture=tailored?garmentMap('garment-neutral-albedo'):fieldWeave();
 suit.color.multiplyScalar(.58);suit2.color.copy(suit.color);
 for(const material of [suit,suit2]){
  material.map=texture;material.bumpMap=tailored?null:texture;material.bumpScale=.012;
  material.normalMap=tailored?garmentMap('garment-normal'):null;
  material.roughnessMap=tailored?garmentMap('garment-roughness'):null;
  material.roughness=tailored?1:.88;material.metalness=0;
 }
 armor.roughness=.54;armor.metalness=.10;
}
