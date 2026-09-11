// Read the real synchronous native layout/ground for a CPU art study only.
import * as THREE from 'three';
import {writeFile} from 'node:fs/promises';
import {World} from '../src/engine/world.js';
import {PowerWorldStage} from '../src/engine/powerworld.js';
import {FRONTLINE_FORMATIONS,FRONTLINE_TALUS} from '../src/engine/frontline-layout.js';
const noop=()=>{},scene=new THREE.Scene(),world=Object.create(World.prototype);
Object.assign(world,{scene,cover:[],coverAll:[],interiors:[],cars:[],planes:[],rocks:[],treeSpots:[],ARENA:240,refreshFogBoxes:noop,setSkyWorld:noop,setSpace:noop});
const stage=new PowerWorldStage({world,scene,entities:[]});
globalThis.document={createElement:()=>({getContext:()=>({createRadialGradient:()=>({addColorStop:noop}),beginPath:noop,arc:noop,fill:noop})})};
try{
 stage.open();const far=stage.group.children.filter(o=>o.userData.frontlineDistant).map((o,i)=>({x:o.position.x,z:o.position.z,width:o.scale.x*2,depth:o.scale.z*2,height:o.scale.y,yaw:o.rotation.y,profile:i%4,base:-6}));
 const floor=stage.group.getObjectByName('frontline-distant-ground').geometry;
 await writeFile('assets-src/frontline-escarpment-study/baseline-layout.json',JSON.stringify({formations:FRONTLINE_FORMATIONS.map((f,i)=>({...f,profile:i%4})),talus:FRONTLINE_TALUS,far},null,2));
 await writeFile('assets-src/frontline-escarpment-study/baseline-far-floor.json',JSON.stringify({position:[...floor.attributes.position.array],index:[...floor.index.array]}));
 console.log(`Source-only snapshot: ${far.length} distant masses and ${floor.attributes.position.count} far-floor vertices`);
}finally{stage.close();delete globalThis.document;}
