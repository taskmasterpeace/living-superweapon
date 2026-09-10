import {Box3,Vector3} from 'three';

// Static surface BVH. Each triangle belongs to exactly one leaf: unlike spatial
// subdivision, a wide shallow terrain triangle is not copied into every cell
// it overlaps. Indexed vertices stay shared; queries use the actual transformed
// geometry and preserve its front-face winding.
export class TriangleSurfaceIndex {
 constructor(mesh){
  mesh.updateWorldMatrix(true,false);
  const geometry=mesh.geometry,position=geometry.attributes.position,indices=geometry.index;
  this.vertices=new Float64Array(position.count*3);
  const point=new Vector3();
  for(let i=0;i<position.count;i++){point.fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld);point.toArray(this.vertices,i*3);}
  this.indices=indices?Uint32Array.from(indices.array):Uint32Array.from({length:position.count},(_,i)=>i);
  const count=this.indices.length/3,order=Uint32Array.from({length:count},(_,i)=>i),centers=new Float64Array(count*3);
  for(let t=0;t<count;t++)for(let axis=0;axis<3;axis++){
   centers[t*3+axis]=(this.vertices[this.indices[t*3]*3+axis]+this.vertices[this.indices[t*3+1]*3+axis]+this.vertices[this.indices[t*3+2]*3+axis])/3;
  }
  const build=(start,end)=>{
   const box=new Box3();
   for(let i=start;i<end;i++)for(let corner=0;corner<3;corner++)box.expandByPoint(point.fromArray(this.vertices,this.indices[order[i]*3+corner]*3));
   const node={box,subTrees:[],triangles:order.subarray(start,end)};
   if(end-start<=12)return node;
   const sx=box.max.x-box.min.x,sy=box.max.y-box.min.y,sz=box.max.z-box.min.z,axis=sx>=sy&&sx>=sz?0:sy>=sz?1:2;
   // Sorting this view partitions a single shared order buffer; leaves never
   // retain duplicate lists or Triangle/Vector objects.
   node.triangles.sort((a,b)=>centers[a*3+axis]-centers[b*3+axis]);
   const mid=(start+end)>>1;
   node.triangles=order.subarray(0,0);node.subTrees=[build(start,mid),build(mid,end)];return node;
  };
  const root=build(0,count);Object.assign(this,root);this.bounds=this.box;
  this._a=new Vector3();this._b=new Vector3();this._c=new Vector3();this._point=new Vector3();this._best=new Vector3();this._stack=[];
 }
 rayIntersect(ray){
  const stack=this._stack;stack.length=0;stack.push(this);
  let best=Infinity;
  while(stack.length){
   const node=stack.pop(),point=ray.intersectBox(node.box,this._point);
   if(!point||(!node.box.containsPoint(ray.origin)&&point.distanceToSquared(ray.origin)>best))continue;
   if(node.subTrees.length){stack.push(...node.subTrees);continue;}
   for(const t of node.triangles){
    this._a.fromArray(this.vertices,this.indices[t*3]*3);this._b.fromArray(this.vertices,this.indices[t*3+1]*3);this._c.fromArray(this.vertices,this.indices[t*3+2]*3);
    if(!ray.intersectTriangle(this._a,this._b,this._c,true,this._point))continue;
    const distance=this._point.distanceToSquared(ray.origin);
    if(distance<best){best=distance;this._best.copy(this._point);}
   }
  }
  return best<Infinity?{distance:Math.sqrt(best),position:this._best.clone()}:false;
 }
 clear(){this.subTrees.length=0;this.triangles=new Uint32Array();this.vertices=new Float64Array();this.indices=new Uint32Array();this._stack.length=0;this.box.makeEmpty();}
}
