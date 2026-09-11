import * as THREE from 'three';

const SEGMENTS=48,LIFE=3.4;
// Two finite vapor ribbons sampled from the jet's actual path. World-space
// history bends through the turn instead of following its current heading.
export class FrontlineContrails{
 constructor(scene,sample){
  this.sample=sample;this.disposed=false;this.frame={};this.point=new THREE.Vector3();this.eye=new THREE.Vector3();this.side=new THREE.Vector3();this.tangent=new THREE.Vector3();
  this.group=new THREE.Group();this.group.name='frontline-contrails';scene.add(this.group);
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{},vertexShader:`varying vec2 vTrail;void main(){vTrail=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 vTrail;void main(){float edge=pow(max(0.,1.-abs(vTrail.x*2.-1.)),1.6);float end=smoothstep(0.,.045,vTrail.y)*(1.-smoothstep(.55,1.,vTrail.y));gl_FragColor=vec4(.93,.95,1.,edge*end*.44);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  }`});
  this.meshes=[-1,1].map(sign=>{
   const geometry=new THREE.BufferGeometry(),uv=[],indices=[];
   geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array((SEGMENTS+1)*6),3).setUsage(THREE.DynamicDrawUsage));
   for(let i=0;i<=SEGMENTS;i++){uv.push(0,i/SEGMENTS,1,i/SEGMENTS);if(i<SEGMENTS){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}}
   geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);
   const mesh=new THREE.Mesh(geometry,material);mesh.userData.side=sign;mesh.frustumCulled=false;this.group.add(mesh);return mesh;
  });
 }
 update(time,camera){
  if(this.disposed||!Number.isFinite(time)||!camera)return;
  for(const mesh of this.meshes){
   const positions=mesh.geometry.attributes.position;
   for(let i=0;i<=SEGMENTS;i++){
    const age=i/SEGMENTS,f=this.sample(time-age*LIFE,this.frame),sy=Math.sin(f.yaw),cy=Math.cos(f.yaw);
    this.point.set(f.x+cy*mesh.userData.side*5-sy*10,f.y, f.z-sy*mesh.userData.side*5-cy*10);
    this.tangent.set(sy,0,cy);this.eye.subVectors(camera.position,this.point).normalize();this.side.crossVectors(this.tangent,this.eye);
    if(this.side.lengthSq()<.0001)this.side.set(cy,0,-sy);this.side.normalize().multiplyScalar(.7+age*1.8);
    positions.setXYZ(i*2,this.point.x-this.side.x,this.point.y-this.side.y,this.point.z-this.side.z);
    positions.setXYZ(i*2+1,this.point.x+this.side.x,this.point.y+this.side.y,this.point.z+this.side.z);
   }
   positions.needsUpdate=true;
  }
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.group.removeFromParent();for(const mesh of this.meshes)mesh.geometry.dispose();this.meshes[0].material.dispose();this.group.clear();}
}
