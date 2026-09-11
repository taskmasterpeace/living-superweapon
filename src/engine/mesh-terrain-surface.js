import {Ray,Vector3} from 'three';
import {TriangleSurfaceIndex} from './triangle-surface-index.js';

// Static exterior only. The central deformable grid stays live and is never
// baked here. Index the actual world-space triangles, not another noise field.
export class MeshTerrainSurface {
 constructor(mesh,{cacheLimit=512}={}){
  this.cacheLimit=Math.max(0,Math.floor(cacheLimit));
  this.cache=new Map();this.ray=new Ray();this.delta=new Vector3();
  this.index=new TriangleSurfaceIndex(mesh);
  this.ceiling=this.index.bounds.max.y+1;
 }
 get cacheSize(){return this.cache.size;}
 heightAt(x,z){
  if(!this.index)return undefined;
  const key=`${x},${z}`;
  if(this.cache.has(key))return this.cache.get(key);
  this.ray.origin.set(x,this.ceiling,z);this.ray.direction.set(0,-1,0);
  const hit=this.index.rayIntersect(this.ray),height=hit?hit.position.y:undefined;
  if(this.cacheLimit){
   if(this.cache.size>=this.cacheLimit)this.cache.delete(this.cache.keys().next().value);
   this.cache.set(key,height);
  }
  return height;
 }
 entry(a,b,verticalRadius=0){
  if(!this.index)return Infinity;
  const floor=this.heightAt(a.x,a.z);
  if(floor!==undefined&&a.y-verticalRadius<=floor)return 0;
  this.delta.subVectors(b,a);const length=this.delta.length();if(length<1e-12)return Infinity;
  this.ray.origin.copy(a);this.ray.origin.y-=verticalRadius;
  this.ray.direction.copy(this.delta).divideScalar(length);
  const hit=this.index.rayIntersect(this.ray);
  return hit&&hit.distance<=length+1e-8?Math.min(1,hit.distance/length):Infinity;
 }
 dispose(){this.cache.clear();this.index?.clear();this.index=null;}
}
