import {Box3,DynamicDrawUsage,Frustum,Matrix4,Vector3} from 'three';

// Distance/stride levels follow the small terrain-LOD model examined in CWR's
// LandscapeLod.hpp. This annular implementation additionally preserves borders
// and rejects simplification whose projected height error would be visible.
function variant(position,spokes,r0,r1,j0,j1,stride){
 const indices=[],vertex=(r,j)=>r*spokes+j%spokes;let error=0;
 const full=(r,j)=>{const a=vertex(r,j),b=vertex(r,j+1),c=vertex(r+1,j+1),d=vertex(r+1,j);indices.push(a,c,b,a,d,c);};
 // Radial spacing is already coarse and nonuniform. Keep every ring; stride
 // only around the ring, where the source has dense, nearly uniform samples.
 for(let r=r0;r<r1;r++)for(let j=j0;j<j1;j+=stride){
  const rr=r+1,jj=Math.min(j1,j+stride),begin=indices.length;
  if(stride===1||jj-j<2||(r===r0&&rr===r1)){for(let x=j;x<jj;x++)full(r,x);continue;}
  if(r>r0&&rr<r1){
   const a=vertex(r,j),b=vertex(r,jj),c=vertex(rr,jj),d=vertex(rr,j);indices.push(a,c,b,a,d,c);
  }else{
   if(r===r0){
    const d=vertex(rr,j);for(let x=j;x<jj;x++)indices.push(d,vertex(r,x+1),vertex(r,x));
    indices.push(d,vertex(rr,jj),vertex(r,jj));
   }else{
    const a=vertex(r,j);for(let x=j;x<jj;x++)indices.push(a,vertex(rr,x),vertex(rr,x+1));
    indices.push(a,vertex(rr,jj),vertex(r,jj));
   }
  }
  // Error is measured against the original surface samples, not estimated
  // from distance alone. Double it as a conservative admission margin.
  for(let y=r;y<=rr;y++)for(let x=j;x<=jj;x++){
   const v=vertex(y,x),px=position.getX(v),py=position.getY(v);
   for(let k=begin;k<indices.length;k+=3){
    const a=indices[k],b=indices[k+1],c=indices[k+2],ax=position.getX(a),ay=position.getY(a),bx=position.getX(b),by=position.getY(b),cx=position.getX(c),cy=position.getY(c);
    const det=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);if(Math.abs(det)<1e-10)continue;
    const u=((by-cy)*(px-cx)+(cx-bx)*(py-cy))/det,vv=((cy-ay)*(px-cx)+(ax-cx)*(py-cy))/det,w=1-u-vv;
    if(u<-.00001||vv<-.00001||w<-.00001)continue;
    error=Math.max(error,Math.abs(position.getZ(v)-(u*position.getZ(a)+vv*position.getZ(b)+w*position.getZ(c))));break;
   }
  }
 }
 return {indices:Uint32Array.from(indices),error:error*2};
}

export class TerrainDetail {
 constructor(mesh){
  this.mesh=mesh;this.fullIndices=mesh.geometry.index.array.slice();this.patches=[];this.cameraCache=new Map();this.stats={};
  this.frustum=new Frustum();this.matrix=new Matrix4();this.point=new Vector3();this.lastCamera=null;
  const {spokes,rings}=mesh.geometry.userData.ringGrid,position=mesh.geometry.attributes.position;
  mesh.updateWorldMatrix(true,true);
  for(let r=0;r<rings;r+=4)for(let j=0;j<spokes;j+=32){
   const rr=Math.min(rings,r+4),jj=Math.min(spokes,j+32),box=new Box3(),border=[],id=(y,x)=>y*spokes+x%spokes;
   for(let y=r;y<=rr;y++)for(let x=j;x<=jj;x++)box.expandByPoint(this.point.fromBufferAttribute(position,id(y,x)).applyMatrix4(mesh.matrixWorld));
   for(let y=r;y<rr;y++){border.push([id(y,j),id(y+1,j)],[id(y,jj),id(y+1,jj)]);}
   for(let x=j;x<jj;x++){border.push([id(r,x),id(r,x+1)],[id(rr,x),id(rr,x+1)]);}
   this.patches.push({box,guardBox:box.clone().expandByScalar(128),border,variants:[1,2,4].map(stride=>variant(position,spokes,r,rr,j,jj,stride))});
  }
  mesh.geometry.index.setUsage(DynamicDrawUsage);
  this.before=mesh.onBeforeRender;
  mesh.onBeforeRender=(renderer,scene,camera,...args)=>{this.before.call(mesh,renderer,scene,camera,...args);this.update(camera,renderer.domElement.height);};
 }
 update(camera,height=941){
  camera.updateMatrixWorld(true);this.matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
  const signature=Array.from(this.matrix.elements).concat(height),key=camera.uuid;
  let entry=this.cameraCache.get(key),dirty=false;
  if(!entry||signature.some((value,i)=>Math.abs(value-entry.signature[i])>1e-8)){
   if(!entry){entry={indices:new Uint32Array(this.fullIndices.length),selection:new Int8Array(this.patches.length).fill(-2)};dirty=true;}
   this.frustum.setFromProjectionMatrix(this.matrix);
   const position=camera.getWorldPosition(this.point),fov=camera.getEffectiveFOV?.()??58;
   const focal=height/(2*Math.tan(fov*Math.PI/360)),near=Math.max(1800,camera.far*.33),mid=Math.max(near+300,camera.far*.66);
   const stats={levels:[0,0,0],culled:0,triangles:0,maxPixelError:0};let count=0;
   for(let i=0;i<this.patches.length;i++){
    const patch=this.patches[i];
    if(!this.frustum.intersectsBox(patch.guardBox)){stats.culled++;dirty ||= entry.selection[i]!==-1;entry.selection[i]=-1;continue;}
    const distance=patch.box.distanceToPoint(position),pixelScale=focal/Math.max(1,distance);
    let level=distance>mid?2:distance>near?1:0;
    while(level>0&&patch.variants[level].error*pixelScale>.75)level--;
    const chosen=patch.variants[level];dirty ||= entry.selection[i]!==level;entry.selection[i]=level;stats.levels[level]++;
    stats.maxPixelError=Math.max(stats.maxPixelError,chosen.error*pixelScale);
   }
   if(dirty){for(let i=0;i<this.patches.length;i++)if(entry.selection[i]>=0){const chosen=this.patches[i].variants[entry.selection[i]];entry.indices.set(chosen.indices,count);count+=chosen.indices.length;}entry.count=count;}
   stats.triangles=entry.count/3;entry.signature=signature;entry.stats=stats;
   this.cameraCache.delete(key);if(this.cameraCache.size>=3)this.cameraCache.delete(this.cameraCache.keys().next().value);this.cameraCache.set(key,entry);
  }
  if(this.active!==entry||dirty){
   const geometry=this.mesh.geometry;geometry.index.array.set(entry.indices.subarray(0,entry.count));
   geometry.index.clearUpdateRanges();geometry.index.addUpdateRange(0,entry.count);geometry.index.needsUpdate=true;geometry.setDrawRange(0,entry.count);this.active=entry;
  }
  this.stats=entry.stats;return this.stats;
 }
 dispose(){
  const geometry=this.mesh.geometry;geometry.index.array.set(this.fullIndices);geometry.index.clearUpdateRanges();geometry.index.needsUpdate=true;geometry.setDrawRange(0,Infinity);
  this.mesh.onBeforeRender=this.before;this.cameraCache.clear();this.patches.length=0;this.active=null;
 }
}
