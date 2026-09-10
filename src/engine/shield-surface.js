import * as THREE from 'three';

const safe=(v,fallback,min,max)=>Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;
const hitPoint=new THREE.Vector3();

// Render-state preparation, also used when a live fighter changes theatre.
// Keep this separate from animation: compiling the default two-pass material
// then switching to a single-pass chase guard causes a first-block shader hitch.
export function configureShieldSurface(fighter){
 const material=fighter.parts?.guardArc?.material;if(!material)return;
 const chase=!!fighter._openSky,single=chase;
 const side=chase&&fighter.def.guardType==='barrier'?THREE.FrontSide:THREE.DoubleSide;
 if(material.side!==side||material.forceSinglePass!==single){
  material.side=side;material.forceSinglePass=single;material.needsUpdate=true;
 }
 material.blending=chase?THREE.NormalBlending:THREE.AdditiveBlending;
}

// Original WebGL material: view-edge flow plus four bounded local contact waves.
// Extends BasicMaterial so rig tinting, opacity and foreground handling still work.
export class ShieldSurfaceMaterial extends THREE.MeshBasicMaterial {
 constructor(color,settings={}){
  super({color,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});
  this.clock=0;this.cursor=0;this.lastSustain=-Infinity;
  this.duration=safe(settings.rippleDuration,.7,.2,1.5);
  this.hits=Array.from({length:4},()=>new THREE.Vector4(0,0,1,-1));
  this.surfaceUniforms={shieldTime:{value:0},shieldHits:{value:this.hits},shieldDuration:{value:this.duration},
   shieldStrength:{value:safe(settings.intensity,1,0,2)}};
  this.onBeforeCompile=shader=>{
   Object.assign(shader.uniforms,this.surfaceUniforms);
   shader.vertexShader='varying vec3 shieldLocal; varying vec3 shieldNormal; varying vec3 shieldView;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
    shieldLocal=position; shieldNormal=normalize(normalMatrix*normal); shieldView=-mvPosition.xyz;`);
   shader.fragmentShader=`varying vec3 shieldLocal; varying vec3 shieldNormal; varying vec3 shieldView;
    uniform float shieldTime; uniform float shieldDuration; uniform float shieldStrength;
    uniform vec4 shieldHits[4];
    float shieldHex(vec2 p){
     vec2 s=vec2(1.7320508,3.0);vec2 a=mod(p,s)-s*.5;
     vec2 b=mod(p-s*.5,s)-s*.5;vec2 h=dot(a,a)<dot(b,b)?a:b;
     h=abs(h);return max(dot(h,vec2(.8660254,.5)),h.y);
    }
   `+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    float edge=pow(1.0-abs(dot(normalize(shieldNormal),normalize(shieldView))),2.4);
    float angle=atan(shieldLocal.x,shieldLocal.z);
    vec2 grid=vec2(angle*4.0,shieldLocal.y)*2.0;
    float cell=1.0-smoothstep(.025,.08,abs(shieldHex(grid)-.86));
    float flow=.5+.5*sin(shieldLocal.y*3.0-shieldTime*3.2+sin(angle*8.0)*.5);
    float hits=0.0;
    for(int i=0;i<4;i++){
     float age=shieldTime-shieldHits[i].w;
     if(shieldHits[i].w>=0.0&&age>=0.0&&age<shieldDuration){
      float a=angle-atan(shieldHits[i].x,shieldHits[i].z);
      a=atan(sin(a),cos(a));
      float d=length(vec2(a*4.0,shieldLocal.y-shieldHits[i].y));
      float k=age/shieldDuration;
      hits+=(1.0-k)*(exp(-pow((d-k*6.0)/.22,2.0))+.5*exp(-d*d*3.0)*exp(-k*9.0));
     }
    }
    diffuseColor.rgb*=.65+edge*.8+flow*.12+min(hits,1.4)*.7;
    diffuseColor.a=clamp((diffuseColor.a*(.12+edge*.7+cell*.38+flow*.08)+hits*.48)*shieldStrength,0.0,.72);
   `);
  };
  this.customProgramCacheKey=()=> 'lsw-shield-surface-v1';
 }
 registerHit(localPoint,sustained=false){
  if(!localPoint||![localPoint.x,localPoint.y,localPoint.z].every(Number.isFinite))return false;
  if(sustained&&this.clock-this.lastSustain<.16)return false;
  if(sustained)this.lastSustain=this.clock;
  this.hits[this.cursor].set(localPoint.x,localPoint.y,localPoint.z,this.clock);
  this.cursor=(this.cursor+1)%this.hits.length;return true;
 }
 advance(dt){
  if(!(dt>0)||!Number.isFinite(dt))return;
  this.clock+=dt;this.surfaceUniforms.shieldTime.value=this.clock;
  for(const hit of this.hits)if(hit.w>=0&&this.clock-hit.w>=this.duration)hit.w=-1;
 }
 clearHits(){for(const hit of this.hits)hit.w=-1;this.cursor=0;this.lastSustain=-Infinity;}
}

export function registerShieldContact(fighter,opts={}){
 const arc=fighter.parts?.guardArc;
 if(!arc?.material.registerHit)return;
 if(opts.bleed||(opts.dot&&!opts.contactFx&&!opts.contactPoint))return;
 const point=opts.contactPoint,source=opts.src?.pos;
 if(point)hitPoint.copy(point);
 else if(source)hitPoint.set(source.x,source.y+5.4,source.z);
 else return;
 arc.updateWorldMatrix(true,false);arc.worldToLocal(hitPoint);
 if(![hitPoint.x,hitPoint.y,hitPoint.z].every(Number.isFinite))return;
 // A hit point may be on the body inside the shield, or only a source direction
 // may be known. Both project onto the visible guard, never above/beyond it.
 const shape=arc.geometry?.parameters||{};
 if(shape.radius){
  if(hitPoint.lengthSq()<1e-8)hitPoint.set(0,0,1);
  hitPoint.setLength(shape.radius);
 }else{
  const height=shape.height||6.2,radius=((shape.radiusTop||3.8)+(shape.radiusBottom||4.2))*.5;
  hitPoint.y=Math.max(-height*.5,Math.min(height*.5,hitPoint.y));
  let angle=Math.atan2(hitPoint.x,hitPoint.z);
  if(shape.thetaLength<Math.PI*2){
   const start=shape.thetaStart||0,end=start+shape.thetaLength;
   angle=Math.max(start,Math.min(end,angle));
  }
  hitPoint.x=Math.sin(angle)*radius;hitPoint.z=Math.cos(angle)*radius;
 }
 arc.material.registerHit(hitPoint,!!opts.dot);
}
