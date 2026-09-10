import * as THREE from 'three';
import {sampleFrontlineBedrock} from './frontline-foothills.js';
import {sampleFrontlineBankDelta} from './frontline-bank.js';
import {sampleFrontlineAuthoredHeight,FRONTLINE_BED_HALF} from './frontline-escarpment.js';
import {FRONTLINE_BASE_FAR_BANDS} from './frontline-layout.js';
import {gradeOutpostHeight} from './frontline-outpost-layout.js';
import {MeshTerrainSurface} from './mesh-terrain-surface.js';
import {TerrainDetail} from './terrain-detail.js';
import {outpostSurfaceAt} from './frontline-outpost-surface.js';

// Native World heightfields are regular XY planes, rotated -PI/2: local +Z
// is world height. Keep all physics and crater writes on this visible mesh.
const FIELDS=['ground','groundGeo','_gh','_gvx','_gvz','_gseg','_ghArena','_ghBase','_ghTriangles','_normalsDirty',
 'grass','_canopy','_outerTerrain','_terrainDetail','surfaceAt'];

const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const terrace=(height,step)=>{const h=height/step,level=Math.floor(h);return (level+smooth(.12,.88,h-level))*step;};

// Continuous authored geology: a winding low valley, broad sediment shelves,
// then talus fans connecting the existing rock bases. This is a base height,
// not a displacement shader: native physics and explosions see the same land.
export function sampleFrontlineRelief(x,z,features=[]){
 return gradeOutpostHeight(x,z,sampleFrontlineNaturalRelief(x,z,features));
}
export function sampleFrontlineNaturalRelief(x,z,features=[]){
 const authored=sampleFrontlineAuthoredHeight(x,z);if(authored!==undefined)return authored;
 const extent=Math.max(Math.abs(x),Math.abs(z)),k=FRONTLINE_BED_HALF/extent;
 const ex=Math.max(-FRONTLINE_BED_HALF,Math.min(FRONTLINE_BED_HALF,x*k)),ez=Math.max(-FRONTLINE_BED_HALF,Math.min(FRONTLINE_BED_HALF,z*k));
 // Keep the existing exterior, with an exact source-edge correction fading
 // across the outer apron. Recomposition cannot open the native floor seam.
 const correction=sampleFrontlineAuthoredHeight(ex,ez)-sampleFrontlineReliefBase(ex,ez,features);
 return sampleFrontlineReliefBase(x,z,features)+correction*(1-smooth(FRONTLINE_BED_HALF,1200,extent));
}
function sampleFrontlineReliefBase(x,z,features=[]){
 const radius=Math.hypot(x,z),pad=smooth(130,240,radius);
 const channel=x-Math.sin(z*.0035)*38;
 // Faulted shelf edges retreat by different amounts along the canyon. Their
 // scale is tens of metres, not surface noise; broad benches remain landable.
 const retreat=Math.sin(z*.023+1.1)*12+Math.sin(z*.051-x*.006)*5;
 const bank=smooth(110,345,Math.abs(channel)+retreat);
 const rolling=(Math.sin(x*.006+Math.sin(z*.004))*.5+.5)*(Math.cos(z*.005-x*.001)*.5+.5)*8;
 const shelves=terrace(bank*(82+Math.sin(z*.003+1.2)*11)+rolling,18);
 const outer=smooth(650,2700,radius);
 const farRidges=(.5+.5*Math.sin(x*.0017+Math.sin(z*.0011)))*(.5+.5*Math.cos(z*.0015-x*.0004));
 let height=shelves+outer*(18+farRidges*63);
 let fan=0;
 for(const f of features){
  const dx=(x-f.x)/f.rx,dz=(z-f.z)/f.rz,d2=dx*dx+dz*dz;if(d2>=1)continue;
  const k=1-d2;fan=Math.max(fan,f.height*k*k*(.8+.2*Math.cos(dx*5+dz*3)));
 }
 height+=terrace(fan,5.0);
 // The rock fragments carry the angular detail; the supporting native land
 // stays broad and smooth instead of duplicating a faceted excavation berm.
 height=Math.max(height,sampleFrontlineBedrock(x,z)*.58);
 // Authored ravines cut *across* the shelves and open into the valley. Keeping
 // the cuts in this base sampler means craters remain independent deltas and
 // feet/landing always agree with the visible broken bank.
 const cuts=x<0?[-380,80,410,700]:[-440,-20,310,570];
 const ax=Math.abs(x),cutEnvelope=smooth(145,265,ax)*(1-smooth(640,850,ax));
 for(const at of cuts){
  const bend=Math.sin((ax-320)*.011)*22;
  const distance=Math.abs(z-at-bend),notch=1-smooth(10,57,distance);
  height-=notch*25*cutEnvelope;
 }
 return Math.max(0,Math.max(0,height*pad)+sampleFrontlineBankDelta(x,z));
}

// Match every native perimeter vertex, then spread rings across the exterior.
// This supplies visible distant relief without putting a second floor over the
// deformable patch. The first ring shares exactly the square heightfield edge.
function distantRingGeometry(halfSpan,radius,segments,radial=42,outerRadius=radius){
 const border=[];
 for(let i=0;i<segments;i++)border.push([-halfSpan+i*2*halfSpan/segments,-halfSpan]);
 for(let i=0;i<segments;i++)border.push([halfSpan,-halfSpan+i*2*halfSpan/segments]);
 for(let i=0;i<segments;i++)border.push([halfSpan-i*2*halfSpan/segments,halfSpan]);
 for(let i=0;i<segments;i++)border.push([-halfSpan,halfSpan-i*2*halfSpan/segments]);
 const n=border.length,positions=[],uv=[],indices=[];
 for(let r=0;r<=radial;r++){
  const t=(r/radial)**1.35;
  for(const [x,y]of border){const d=Math.hypot(x,y),scale=1+t*(radius/d-1),px=x*scale,py=y*scale;positions.push(px,py,0);uv.push(.5+px/(2*radius),.5+py/(2*radius));}
 }
 // Append coarse flight-space rings without resampling the existing canyon
 // or its apron. Keep the original UV scale across the join.
 let rings=radial;
 for(let distance=radius;distance<outerRadius;){
  distance=Math.min(outerRadius,distance*1.5);rings++;
  for(const [x,y]of border){const scale=distance/Math.hypot(x,y),px=x*scale,py=y*scale;positions.push(px,py,0);uv.push(.5+px/(2*radius),.5+py/(2*radius));}
 }
 for(let r=0;r<rings;r++)for(let j=0;j<n;j++){
  const a=r*n+j,b=r*n+(j+1)%n,c=b+n,d=a+n;indices.push(a,c,b,a,d,c);
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.userData.ringGrid={spokes:n,rings};geometry.computeVertexNormals();return geometry;
}

export function authorFrontlineRelief(stage){
 const world=stage.g.world;if(!world.groundGeo||world.ground.parent!==stage.group)return;
 world._terrainDetail?.dispose();
 const features=stage._cover.filter(c=>c.mesh.userData.frontlineFormation||(!c.frontlineVehicle&&c.mesh.geometry.type==='CylinderGeometry')).map(c=>({x:c.x,z:c.z,rx:c.hx+145,rz:c.hz+145,height:Math.min(30,c.h*.1)}));
 for(const f of FRONTLINE_BASE_FAR_BANDS)features.push({x:f.x,z:f.z,rx:f.width*.5*1.3,rz:f.depth*.5*1.3,height:Math.min(65,f.height*.15)});
 stage.frontlineRelief=features;
 const position=world.groundGeo.attributes.position;
 for(let i=0;i<position.count;i++){const h=sampleFrontlineRelief(world._gvx[i],world._gvz[i],features);world._gh[i]=h;world._ghBase[i]=h;position.setZ(i,h);}
 position.needsUpdate=true;world.groundGeo.computeVertexNormals();world._normalsDirty=false;
 const far=stage.group.getObjectByName('frontline-distant-ground'),fp=far.geometry.attributes.position;
 for(let i=0;i<fp.count;i++)fp.setZ(i,sampleFrontlineRelief(fp.getX(i),-fp.getY(i),features));
 fp.needsUpdate=true;far.geometry.computeVertexNormals();far.geometry.computeBoundingSphere();
 world._outerTerrain?.dispose();
 world._outerTerrain=new MeshTerrainSurface(far);
 world._terrainDetail=new TerrainDetail(far);
 // Low boulders belong on the newly authored land, not buried beneath a bank.
 // Keep the same measured collider shape and durability while lifting its
 // native top/reset anchor by exactly the local rendered-triangle floor.
 for(const c of stage._cover)if(c.mesh.userData.frontlineBoulder){
  const lift=world.heightAt?.(c.x,c.z)??sampleFrontlineRelief(c.x,c.z,features),delta=lift-(c._frontlineGroundLift||0);
  c.mesh.position.y+=delta;c.y0+=delta;c.top+=delta;c.h+=delta;c._frontlineGroundLift=lift;
 }
}

export function installFrontlineGround(stage,material,combatRadius,distantRadius,outerRadius=distantRadius){
 const world=stage.g.world;
 stage._ground0=new Map(FIELDS.map(key=>[key,Object.getOwnPropertyDescriptor(world,key)]));
 world.surfaceAt=(x,z)=>{
  if(!Number.isFinite(x)||!Number.isFinite(z))return 'unknown';
  const paving=outpostSurfaceAt(x,z);if(paving!=='sand')return paving;
  const dx=(world.heightAt(x+2,z)-world.heightAt(x-2,z))/4,dz=(world.heightAt(x,z+2)-world.heightAt(x,z-2))/4;
  return Math.hypot(dx,dz)>.8?'rock':'sand';
 };
 // A 128u apron puts the static seam outside normal boundary impacts. Extra
 // subdivisions retain ~8u spacing while gameplay bounds remain 900u.
 const halfSpan=combatRadius+128,segments=256;
 const geometry=new THREE.PlaneGeometry(halfSpan*2,halfSpan*2,segments,segments);
 const distantGeometry=distantRingGeometry(halfSpan,distantRadius,segments,42,outerRadius);
 const makeFloor=(geo,name)=>{
  const a=geo.attributes.position,uv=geo.attributes.uv;
  // Identical to the previous large circle's UVs, hence the same 24u sand
  // repeat after the asynchronous texture loader applies its native repeat.
  for(let i=0;i<a.count;i++)uv.setXY(i,.5+a.getX(i)/(2*distantRadius),.5+a.getY(i)/(2*distantRadius));
  const mesh=new THREE.Mesh(geo,material);mesh.name=name;mesh.rotation.x=-Math.PI/2;
  mesh.receiveShadow=true;stage.group.add(mesh);return mesh;
 };
 const floor=makeFloor(geometry,'frontline-playable-ground');
 makeFloor(distantGeometry,'frontline-distant-ground');
 const a=geometry.attributes.position,count=a.count;
 Object.assign(world,{ground:floor,groundGeo:geometry,_gh:new Float32Array(count),_ghBase:new Float32Array(count),
  _gvx:Float32Array.from({length:count},(_,i)=>a.getX(i)),_gvz:Float32Array.from({length:count},(_,i)=>-a.getY(i)),
  _gseg:segments,_ghArena:halfSpan,_ghTriangles:true,_normalsDirty:false,grass:null,_canopy:null,_outerTerrain:null,_terrainDetail:null});
 return floor;
}

export function restoreFrontlineGround(stage){
 if(!stage._ground0)return;
 stage.g.world._terrainDetail?.dispose();
 stage.g.world._outerTerrain?.dispose();
 for(const [key,descriptor]of stage._ground0){
  if(descriptor)Object.defineProperty(stage.g.world,key,descriptor);else delete stage.g.world[key];
 }
 stage._ground0=null;
}
