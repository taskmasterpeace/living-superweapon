import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Box3,Vector3,Matrix3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const run=spawnSync(process.platform==='win32'?'npx.cmd':'npx',['--yes','@gltf-transform/cli@4.5.0','optimize','assets-src/frontline-hero-armor/field-boot.raw.glb','public/models/frontline/field-boot.glb','--compress','false','--flatten','false','--join','false','--instance','false','--palette','false','--simplify','false','--texture-compress','false','--prune-attributes','false'],{stdio:'inherit',shell:process.platform==='win32'});
if(run.status!==0)process.exit(run.status??1);
const bytes=readFileSync('public/models/frontline/field-boot.glb');
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
gltf.scene.updateMatrixWorld(true);
const bank={name:'field_boot',units:'native boot local units',forward:'+Z',position:[],normal:[],uv:[],index:[],groups:[],materials:[]};
const min=new Vector3(Infinity,Infinity,Infinity),max=new Vector3(-Infinity,-Infinity,-Infinity),v=new Vector3(),normalMatrix=new Matrix3();
const round=x=>Math.round(x*1e7)/1e7;
gltf.scene.traverse(o=>{
 if(!o.isMesh)return;
 const g=o.geometry,m=o.material,materialIndex=bank.materials.length,base=bank.position.length/3,start=bank.index.length;
 bank.materials.push({name:m.name,color:m.color.toArray().map(round),roughness:m.roughness,metalness:m.metalness});normalMatrix.getNormalMatrix(o.matrixWorld);
 for(let i=0;i<g.attributes.position.count;i++){
  v.fromBufferAttribute(g.attributes.position,i).applyMatrix4(o.matrixWorld);min.min(v);max.max(v);bank.position.push(...v.toArray().map(round));
  v.fromBufferAttribute(g.attributes.normal,i).applyNormalMatrix(normalMatrix);bank.normal.push(...v.toArray().map(round));
  bank.uv.push(round(g.attributes.uv.getX(i)),round(g.attributes.uv.getY(i)));
 }
 for(let i=0;i<g.index.count;i++)bank.index.push(base+g.index.getX(i));
 bank.groups.push({start,count:g.index.count,materialIndex});
});
bank.bounds={min:min.toArray().map(round),max:max.toArray().map(round)};
mkdirSync('src/data',{recursive:true});writeFileSync('src/data/field-boot-bank.json',JSON.stringify(bank));
const provenance={name:'Original ceramic field boot',created:'2026-09-09',creator:'Original Blender-authored asset for Living Superweapon / War World',externalAssets:[],rights:'Original project geometry and material design. No third-party asset licensing obligations.',source:'tools/author-frontline-hero-armor.py',blenderSource:'assets-src/frontline-hero-armor/field-boot.blend',geometryBank:'src/data/field-boot-bank.json',bankSchema:'Flat position/normal/uv/index arrays; Three.js groups and materials arrays; bounds in native boot local space.',forward:'+Z',pivot:[0,0,0],bounds:bank.bounds,triangles:bank.index.length/3,materialGroups:bank.groups.length,materials:bank.materials,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),texture:'None. Ceramic seams, flex ribs, fasteners and sole tread modeled in geometry.',rigContract:'Symmetric reusable left/right boot. Replaces geometry/materials on existing native boot driver; no new rig, skeleton, clips, controller or URL load at rig initialization.',limitations:'Rigid boot skin; no opening collar, independent toe flex, wear texture or baked AO. Runtime ceramic tint should follow the hero armor.'};
writeFileSync('public/models/frontline/field-boot.provenance.json',JSON.stringify(provenance,null,2));console.log(JSON.stringify(provenance,null,2));
