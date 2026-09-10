// Read-only native parking and support witnesses for a later terrain proposal.
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {World} from '../src/engine/world.js';
import {PowerWorldStage} from '../src/engine/powerworld.js';
import {FrontlineConvoy} from '../src/engine/frontline-convoy.js';
const noop=()=>{},scene=new THREE.Scene(),world=Object.create(World.prototype);
Object.assign(world,{scene,cover:[],coverAll:[],interiors:[],cars:[],planes:[],rocks:[],treeSpots:[],ARENA:240,refreshFogBoxes:noop,setSkyWorld:noop,setSpace:noop});
const game={world,scene,entities:[],time:0,running:false},stage=new PowerWorldStage(game);
globalThis.document={createElement:()=>({getContext:()=>({createRadialGradient:()=>({addColorStop:noop}),beginPath:noop,arc:noop,fill:noop})})};globalThis.self=globalThis;
globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});globalThis.Image=class{height=1;set src(value){queueMicrotask(()=>this.onload?.());}};
let convoy;
try{
 stage.open();if(process.env.FRONTLINE_BANK_CANDIDATE){const raw=await readFile(process.env.FRONTLINE_BANK_CANDIDATE),bed=new Float32Array(raw.buffer,raw.byteOffset,raw.byteLength/4);world._gh.set(bed);world._ghBase.set(bed);}
 const sampled=[],nativeHeight=world.heightAt.bind(world);world.heightAt=(x,z)=>{sampled.push([x,z]);return nativeHeight(x,z);};
 const file=await readFile('public/models/frontline/armored-scout.glb'),asset=await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength),'');
 convoy=new FrontlineConvoy(stage,{loader:{loadAsync:async()=>asset}});await convoy.loading;if(!convoy.ready)throw Error(convoy.error||'Parking failed');
 const report={label:'CPU native parking on current accepted terrain; no runtime changes',parks:convoy.vehicles.map(v=>{
  const c=v.cover,cy=Math.cos(.25),sy=Math.sin(.25),wheelFootprints=[[-4.9395,7.9],[4.9395,7.9],[-4.9395,-8.5],[4.9395,-8.5]].map(([dx,dz])=>{const x=c.x+cy*dx+sy*dz,z=c.z-sy*dx+cy*dz;return {x,z,height:world.heightAt(x,z)};});
  return {x:c.x,z:c.z,hx:c.hx,hz:c.hz,ground:v.ground,wheelFootprints,matrix:v.mesh.matrixWorld.toArray()};
 })};
 const stencils=new Set();for(const [x,z]of sampled){const c=Math.floor((x+1028)*256/2056),r=Math.floor((z+1028)*256/2056);for(const i of [r*257+c,r*257+c+1,(r+1)*257+c,(r+1)*257+c+1])stencils.add(i);}
 report.sampledHeightQueries=sampled;report.protectedNativeIndices=[...stencils].sort((a,b)=>a-b);report.bedSHA256=createHash('sha256').update(Buffer.from(world._ghBase.buffer)).digest('hex');
 const out=process.env.FRONTLINE_BANK_STUDY||'assets-src/frontline-background-study';await mkdir(out,{recursive:true});
 await writeFile(out+'/convoy-parking-witnesses.json',JSON.stringify(report,null,2));console.log(JSON.stringify({parks:report.parks,samples:sampled.length,protectedIndices:stencils.size}));
}finally{convoy?.dispose();stage.close();}
