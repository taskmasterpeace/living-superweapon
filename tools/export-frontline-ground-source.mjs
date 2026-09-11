// Capture the real synchronous native base for offline source authoring only.
import * as THREE from 'three';
import {mkdir,writeFile} from 'node:fs/promises';
import {World} from '../src/engine/world.js';
import {PowerWorldStage} from '../src/engine/powerworld.js';
const noop=()=>{},scene=new THREE.Scene(),world=Object.create(World.prototype);
Object.assign(world,{scene,cover:[],coverAll:[],interiors:[],cars:[],planes:[],rocks:[],treeSpots:[],ARENA:240,refreshFogBoxes:noop,setSkyWorld:noop,setSpace:noop});
const stage=new PowerWorldStage({world,scene,entities:[]});
globalThis.document={createElement:()=>({getContext:()=>({createRadialGradient:()=>({addColorStop:noop}),beginPath:noop,arc:noop,fill:noop})})};
const out='assets-src/frontline-heightfield-candidate';await mkdir(out,{recursive:true});
try{
 stage.open();
 await writeFile(out+'/native-before.f32',Buffer.from(world._ghBase.buffer));
 await writeFile(out+'/source.json',JSON.stringify({segments:world._gseg,halfSpan:world._ghArena,features:stage.frontlineRelief,cover:stage._cover.map(c=>({x:c.x,z:c.z,hx:c.hx,hz:c.hz,top:c.top}))},null,2));
 console.log(JSON.stringify({vertices:world._ghBase.length,segments:world._gseg,halfSpan:world._ghArena,peak:Math.max(...world._ghBase)}));
}finally{stage.close();delete globalThis.document;}
