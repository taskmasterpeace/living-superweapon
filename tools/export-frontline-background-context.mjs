// Source preview context only; never overwrites reviewed/runtime terrain data.
import * as THREE from 'three';
import {writeFile} from 'node:fs/promises';
import {World} from '../src/engine/world.js';
import {PowerWorldStage} from '../src/engine/powerworld.js';
const noop=()=>{},scene=new THREE.Scene(),world=Object.create(World.prototype);
Object.assign(world,{scene,cover:[],coverAll:[],interiors:[],cars:[],planes:[],rocks:[],treeSpots:[],ARENA:240,refreshFogBoxes:noop,setSkyWorld:noop,setSpace:noop});
const stage=new PowerWorldStage({world,scene,entities:[]}),prior=globalThis.document;
globalThis.document={createElement:()=>({getContext:()=>({createRadialGradient:()=>({addColorStop:noop}),beginPath:noop,arc:noop,fill:noop})})};
try{stage.open();const floor=stage.group.getObjectByName('frontline-distant-ground').geometry;
 await writeFile('assets-src/frontline-background-study/current-far-floor.json',JSON.stringify({position:[...floor.attributes.position.array],index:[...floor.index.array]}));
}finally{stage.close();if(prior===undefined)delete globalThis.document;else globalThis.document=prior;}
