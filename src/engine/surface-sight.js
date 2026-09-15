import * as THREE from 'three';

// Presentation only. Render the existing finite collision solids from the character's
// eye, then compare scenery fragments against that depth. AI/projectiles keep exact LOS.
export class SurfaceSight {
 constructor(world,viewer){
  this.world=world;this.viewer=viewer;this.scene=new THREE.Scene();
  this.camera=new THREE.PerspectiveCamera(112,1,.5,150);
  this.target=new THREE.WebGLRenderTarget(768,768,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter});
  this.target.depthTexture=new THREE.DepthTexture(768,768,THREE.UnsignedIntType);
  this.geometry=new THREE.BoxGeometry(1,1,1);
  this.material=new THREE.MeshBasicMaterial({color:0xffffff});
  this.uniforms={wwSightDepth:{value:this.target.depthTexture},wwSightMatrix:{value:new THREE.Matrix4()},wwSightEye:{value:new THREE.Vector3()},wwSightDir:{value:new THREE.Vector3(0,0,1)},wwSightRange:{value:96},wwSightCos:{value:Math.cos(.96)},wwSightOn:{value:0},wwSightFar:{value:150}};
 }
 replace(solids){
  this.boxes?.removeFromParent();this.boxes?.dispose();
  const active=solids.filter(s=>!s.destroyed&&s.top>s.bottom);
  this.boxes=new THREE.InstancedMesh(this.geometry,this.material,active.length);
  const pose=new THREE.Object3D();
  active.forEach((s,i)=>{pose.position.set(s.x,(s.top+s.bottom)/2,s.z);pose.scale.set(s.hx*2,s.top-s.bottom,s.hz*2);pose.updateMatrix();this.boxes.setMatrixAt(i,pose.matrix);});
  this.boxes.instanceMatrix.needsUpdate=true;this.boxes.computeBoundingSphere();this.scene.add(this.boxes);
 }
 attach(root){
  root?.traverse(o=>{for(const m of(o.material?(Array.isArray(o.material)?o.material:[o.material]):[])){
   if(m.userData.wwSurfaceSight)continue;
   m.userData.wwSurfaceSight=true;
   const before=m.onBeforeCompile,cache=m.customProgramCacheKey.bind(m);
   m.onBeforeCompile=shader=>{
    before.call(m,shader);Object.assign(shader.uniforms,this.uniforms);
    shader.vertexShader='varying vec3 wwSightPosition;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nwwSightPosition=(modelMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader=`varying vec3 wwSightPosition;
uniform sampler2D wwSightDepth;uniform mat4 wwSightMatrix;
uniform vec3 wwSightEye,wwSightDir;uniform float wwSightOn,wwSightRange,wwSightCos,wwSightFar;
float wwSurfaceVisible(){
 vec3 delta=wwSightPosition-wwSightEye;float distanceToEye=length(delta);
 if(distanceToEye>wwSightRange||dot(normalize(delta),wwSightDir)<wwSightCos)return 0.0;
 // Pull the surface a fraction toward the eye, avoiding depth acne at its own collider.
 vec3 samplePoint=wwSightPosition-normalize(delta)*0.24;
 vec4 projected=wwSightMatrix*vec4(samplePoint,1.0);
 vec3 uv=projected.xyz/projected.w*.5+.5;
 if(projected.w<=0.0||any(lessThan(uv,vec3(0.0)))||any(greaterThan(uv,vec3(1.0))))return 0.0;
 float depth=texture2D(wwSightDepth,uv.xy).r;
 float surfaceDistance=(0.5*wwSightFar)/(wwSightFar-depth*(wwSightFar-0.5));
 return step(projected.w,surfaceDistance+0.05);
}
`+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>','#include <fog_fragment>\nif(wwSightOn>0.5)gl_FragColor.rgb=mix(vec3(0.028,0.036,0.039),gl_FragColor.rgb,wwSurfaceVisible());');
   };
   m.customProgramCacheKey=()=>cache()+'-character-surface-sight-v1';m.needsUpdate=true;
  }});
 }
 render(){
  const state=this.viewer(),p=state?.player,u=this.uniforms;
  u.wwSightOn.value=state?.enabled?1:0;if(!state?.enabled)return;
  if(!p?.alive||p.blindT>0){u.wwSightRange.value=0;return;}
  const eye=u.wwSightEye.value.copy(p.pos);eye.y+=5;
  const direction=u.wwSightDir.value.copy(p.aim3||p.aim).normalize();
  const range=state.range||96,cos=state.cos??Math.cos(.96);
  u.wwSightRange.value=range;u.wwSightCos.value=cos;
  this.camera.fov=THREE.MathUtils.radToDeg(2*Math.acos(cos))+2;
  this.camera.far=range+1;u.wwSightFar.value=this.camera.far;this.camera.position.copy(eye);
  this.camera.up.set(0,Math.abs(direction.y)>.99?0:1,Math.abs(direction.y)>.99?1:0);
  this.camera.lookAt(eye.clone().add(direction));this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld(true);
  u.wwSightMatrix.value.multiplyMatrices(this.camera.projectionMatrix,this.camera.matrixWorldInverse);
  const renderer=this.world.renderer,previous=renderer.getRenderTarget(),autoClear=renderer.autoClear;
  try{renderer.autoClear=true;renderer.setRenderTarget(this.target);renderer.clear();renderer.render(this.scene,this.camera);}
  finally{renderer.setRenderTarget(previous);renderer.autoClear=autoClear;}
 }
 dispose(){this.boxes?.dispose();this.geometry.dispose();this.material.dispose();this.target.depthTexture.dispose();this.target.dispose();}
}
