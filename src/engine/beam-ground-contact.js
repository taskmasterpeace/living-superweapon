import * as THREE from 'three';
import {GROUND_LAYER} from '../core/util.js';
export const BEAM_GROUND_LIMITS=Object.freeze({interval:.12,spacing:1.2,perBeam:96,life:45,fade:10});
// The authoritative clip point is copied before receiver/cover queries reuse
// their temporary vectors. Only the final unchanged traveled endpoint may emit.
export class BeamGroundContact {
 constructor(){this.point=new THREE.Vector3();this.last=new THREE.Vector3();this.stamp=new THREE.Vector3();this.reset();}
 reset(){this.valid=false;this.time=0;this.lastTime=-Infinity;this.count=0;this.dt=0;}
 begin(dt){this.valid=false;this.dt=Number.isFinite(dt)?Math.max(0,dt):0;this.time+=this.dt;}
 capture(point,arc){this.point.copy(point);this.arc=arc;this.valid=true;}
 emit(game,tip,arc,radius,sustaining,clash){
  if(!this.valid||!this.dt||!sustaining||clash||!game.vfx?.beamGroundScorch||this.count>=BEAM_GROUND_LIMITS.perBeam)return false;
  if(this.point.distanceToSquared(tip)>1e-6||Math.abs(arc-this.arc)>1e-4)return false;
  const size=Math.max(.7,Math.min(6,radius*1.5)),spacing=Math.max(BEAM_GROUND_LIMITS.spacing,size*.8);
  if(this.time-this.lastTime+1e-9<BEAM_GROUND_LIMITS.interval||this.count&&Math.hypot(this.point.x-this.last.x,this.point.z-this.last.z)<spacing)return false;
  const y=game.world.heightAt?.(this.point.x,this.point.z);if(!Number.isFinite(y))return false;
  this.stamp.set(this.point.x,y,this.point.z);game.vfx.beamGroundScorch(this.stamp,size);
  this.last.copy(this.point);this.lastTime=this.time;this.count++;return true;
 }
}
// Local X/Z tessellation samples the actual desert at every vertex. It can bend
// over multiple terrain triangles; tilting a single flat circle cannot do that.
export function terrainScorchMesh(world,pos,radius){
 const lift=GROUND_LAYER.shadow+.025,geometry=new THREE.PlaneGeometry(radius*2,radius*2,8,8);geometry.rotateX(-Math.PI/2);
 const a=geometry.attributes.position;
 for(let i=0;i<a.count;i++){
  const y=world.heightAt(pos.x+a.getX(i),pos.z+a.getZ(i));
  if(!Number.isFinite(y)){geometry.dispose();return null;}
  a.setY(i,y-pos.y+lift);
 }
 a.needsUpdate=true;geometry.computeBoundingSphere();
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,
  uniforms:{opacity:{value:.6}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:'uniform float opacity;varying vec2 vUv;void main(){vec2 p=vUv*2.0-1.0;float r=length(p);float grain=fract(sin(dot(floor(vUv*48.0),vec2(12.9898,78.233)))*43758.5453);float a=(1.0-smoothstep(.42,1.0,r))*(.72+.28*grain)*opacity;if(a<.01)discard;gl_FragColor=vec4(.025,.017,.009,a);}' });
 const mesh=new THREE.Mesh(geometry,material);mesh.position.copy(pos);mesh.userData.beamGroundScorch=true;mesh.userData.groundLift=lift;mesh.userData.age=0;return mesh;
}
export function disposeScorch(scene,mesh){scene.remove(mesh);mesh.material.dispose();if(mesh.userData.beamGroundScorch)mesh.geometry.dispose();}
