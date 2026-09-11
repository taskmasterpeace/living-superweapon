// Isolated composition/contact hypothesis. Not imported by the runtime.
import * as T from 'three';
import {World} from '../src/engine/world.js';
import {spineCombatFixture} from './helpers/spine-combat-fixture.mjs';
globalThis.innerWidth=1280;globalThis.innerHeight=800;
function slide(w,start,end,pad){
 const pos=start.clone(),delta=end.clone().sub(start);
 for(let i=0;i<4;i++){
  const target=pos.clone().add(delta);let t=1,hit=null;
  for(const box of w.cover){const n=w.traceBox3(...pos.toArray(),...target.toArray(),box,pad);if(n>=0&&n<t){t=n;hit=box;}}
  pos.addScaledVector(delta,t);if(!hit)break;
  delta.multiplyScalar(1-t);
  const distances=[Math.abs(Math.abs(pos.x-hit.x)-(hit.hx+pad)),Math.abs(Math.abs(pos.z-hit.z)-(hit.hz+pad)),Math.abs(pos.y-(hit.top+pad))];
  const axis=distances[0]<=distances[1]&&distances[0]<=distances[2]?'x':distances[1]<=distances[2]?'z':'y';
  const side=axis==='y'?1:Math.sign(pos[axis]-hit[axis]);pos[axis]+=side*1e-5;delta[axis]=0;
 }
 return pos;
}
for(const yaw of [-30,0,30])for(const pitch of [45,60,79,89]){
 const x=spineCombatFixture({source:'eye',motion:'jog'}),{f}=x,c=new T.PerspectiveCamera(73.74,1.6,.6,4200),w=Object.create(World.prototype);
 const pad=1.4035490833866233,py=pitch*Math.PI/180,ya=yaw*Math.PI/180,forward=new T.Vector3(Math.sin(ya)*Math.cos(py),Math.sin(py),Math.cos(ya)*Math.cos(py)),up=new T.Vector3(-Math.sin(ya)*Math.sin(py),Math.cos(py),-Math.cos(ya)*Math.sin(py));
 Object.assign(w,{camera:c,_lookYaw:ya,cover:[{x:-10.87012740102363,z:-1.62572936057744,hx:8.670127401023638,hz:8.670127401023638,top:14.672523294040003}],interiors:[]});
 const rows=[.4,.5,.6,.7].map(q=>({q,blocked:0,lost:0,coverCrossed:0,minY:Infinity,maxY:-Infinity,eye:[]}));
 try{
  f.vel.set(-32,0,0);x.aim(yaw,Math.tan(py)*100);for(let i=0;i<60;i++)x.step();x.start('lmb');
  for(let i=0;i<120;i++){
   x.step();if(i<30)continue;
   for(const row of rows){
    const a=new T.Vector3(0,5.4,0),raw=a.clone().addScaledVector(forward,-25.5).addScaledVector(up,9);
    raw.y=Math.max(raw.y,pad);
    const q=row.q*Math.tan(73.74*Math.PI/360),den=Math.sin(py)-q*Math.cos(py);
    if(den>0){const maxBack=(Math.cos(py)+q*Math.sin(py))/den*(9.2-raw.y),back=Math.min(Math.hypot(raw.x,raw.z),maxBack);raw.x=-Math.sin(ya)*back;raw.z=-Math.cos(ya)*back;}
    const eye=slide(w,a,raw,pad);c.position.copy(eye);c.lookAt(eye.clone().add(forward));c.updateMatrixWorld(true);
    if(w._camNearestT(...a.toArray(),...eye.toArray(),pad)<1-1e-5)row.coverCrossed++;
    const hits=new T.Raycaster(eye,forward,.6,30).intersectObject(f.parts.body,true).filter(h=>{for(let o=h.object;o;o=o.parent)if(!o.visible)return false;return[].concat(h.object.material).some(m=>!m.transparent);});
    if(hits.length)row.blocked++;
    const h=f.parts.head.getWorldPosition(new T.Vector3()).project(c);
    if(Math.abs(h.x)>=1||Math.abs(h.y)>=1||h.z>=1)row.lost++;
    row.minY=Math.min(row.minY,h.y);row.maxY=Math.max(row.maxY,h.y);row.eye=eye.toArray();
   }
  }
  console.log(JSON.stringify({yaw,pitch,rows}));
 }finally{x.close();}
}
