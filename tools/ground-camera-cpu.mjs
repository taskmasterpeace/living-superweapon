// Camera-only Node CPU isolation. No renderer, GPU or gameplay-FPS claim.
import * as THREE from 'three';
import {World} from '../src/engine/world.js';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
globalThis.innerWidth=1280;globalThis.innerHeight=800;
const rows=[];
for(const kind of ['clear-air','wall','terrain-and-wall'])for(const cold of [false,true]){
 const camera=new THREE.PerspectiveCamera(73.74,1.6,.6,4200),w=Object.create(World.prototype);
 Object.assign(w,{camera,camChase:camera,camMode:'chase',camPos:new THREE.Vector3(),camTarget:new THREE.Vector3(),camBasis:new THREE.Vector3(),
  sun:new THREE.DirectionalLight(),sunOff:new THREE.Vector3(40,60,20),cover:[],interiors:[],_lookActive:true,_lookYaw:-.4814386090661966,_lookPitch:Math.PI/4,
  _shake:0,_shakeT:0,_gseg:112,_ghArena:240,ARENA:240,_gh:new Float32Array(113*113)});
 const f=new Fighter(ROSTER.find(d=>d.id==='sol'));f._openSky=true;f.pos.set(0,kind==='clear-air'?220:0,0);f.vel.set(0,0,0);
 if(kind!=='clear-air')w.cover.push({x:0,z:-5,hx:1,hz:1,top:14});
 if(kind==='terrain-and-wall'){w._gh[54*113+54]=1.4;w._gh[54*113+58]=1.4;}
 // Representative cover-list length, not a claim of native stage distribution.
 for(let i=w.cover.length;i<37;i++)w.cover.push({x:80+(i%6)*20,z:80+Math.floor(i/6)*20,hx:5,hz:5,top:15});
 const times=[];
 try{
  for(let i=0;i<3600;i++){
   if(cold)w.snapChase();const before=performance.now();w.chase(f,null,1/60);const elapsed=performance.now()-before;if(i>=600)times.push(elapsed);
  }
  times.sort((a,b)=>a-b);rows.push({kind,mode:cold?'fresh-solve-every-step':'retained-collision-history',samples:times.length,
   meanMs:times.reduce((a,b)=>a+b,0)/times.length,p95Ms:times[Math.floor(times.length*.95)],maxMs:times.at(-1)});
 }finally{f.dispose();}
}
console.log(JSON.stringify({scope:'Native World.chase camera-only CPU, warm Node, 37 synthetic cover entries; no renderer/animation/GPU/FPS evidence',rows},null,2));
