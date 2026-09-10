import * as THREE from 'three';
import {createStormCloudTexture} from './storm-clouds.js';

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};

// One analytic field, two distinct weather shapes. No rigid-body debris
// simulation and no damage volume: injury remains a consequence of contact.
export class WeatherVortex {
 constructor(game,{kind='tornado',x=0,z=0,radius=65,height=210,duration=55}={}){
  this.g=game;this.kind=kind;this.x=x;this.z=z;this.radius=clamp(radius,35,900);
  this.height=clamp(height,100,500);this.duration=clamp(duration,15,180);this.age=0;this.strength=0;
  this.y=game.world.heightAt?.(x,z)||0;this.group=new THREE.Group();this.group.name=`weather-${kind}`;
  this.group.position.set(x,this.y,z);game.scene.add(this.group);
  this.noise=createStormCloudTexture();
  this.uniforms={uTime:{value:0},uStrength:{value:0},uNoise:{value:this.noise},uHeight:{value:this.height},uRadius:{value:this.radius}};
  const mat=new THREE.ShaderMaterial({uniforms:this.uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,
   vertexShader:`varying vec2 vUv; varying vec3 vNormal; uniform float uTime,uHeight,uRadius;
    void main(){vUv=uv;float h=position.y+.5;float angle=atan(position.z,position.x);
     float radius=uRadius*(.24+.68*pow(h,1.8));
     radius*=1.+.055*sin(angle*5.+h*24.-uTime*2.);
     vec3 p=vec3(position.x*radius,h*uHeight,position.z*radius);
     p.x+=sin(h*3.+uTime*.18)*h*uRadius*.12;
     vNormal=normalMatrix*normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
   fragmentShader:`uniform sampler2D uNoise;uniform float uTime,uStrength;varying vec2 vUv;varying vec3 vNormal;
    void main(){vec2 flow=vec2(vUv.x*2.-uTime*.09+vUv.y*.65,vUv.y*2.-uTime*.04);
     float n=texture2D(uNoise,flow).r*.7+texture2D(uNoise,flow*3.1).g*.3;
     float density=smoothstep(.22,.64,n);float edge=smoothstep(0.,.07,vUv.y)*(1.-smoothstep(.84,1.,vUv.y));
     float shade=.5+.5*max(0.,dot(normalize(vNormal),normalize(vec3(-.5,.7,1.))));
     vec3 col=mix(vec3(.24,.21,.17),vec3(.42,.46,.48),vUv.y)*shade;
     gl_FragColor=vec4(col,density*edge*(.22+.6*uStrength));
     #include <tonemapping_fragment>
     #include <colorspace_fragment>
    }`});
  this.funnel=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,48,28,true),mat);
  this.funnel.frustumCulled=false; // The shader expands the unit-cylinder bounds.
  this.funnel.visible=kind==='tornado';this.group.add(this.funnel);
  // A soft ground debris skirt, not a bright attack-target ring. Fixed 240
  // GPU-animated motes, independent of map size and storm diameter.
  const seeds=new Float32Array(240*3);for(let i=0;i<240;i++){seeds[i*3]=(i*.61803398875)%1;seeds[i*3+1]=(i*.754877666)%1;seeds[i*3+2]=(i*.569840296)%1;}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(seeds,3));
  const dustMat=new THREE.ShaderMaterial({uniforms:this.uniforms,transparent:true,depthWrite:false,
   vertexShader:`uniform float uTime,uRadius,uStrength;varying float vFade;
    void main(){float a=position.x*6.283+uTime*(.8+position.y);float r=uRadius*(.3+position.y*.75);
     vec3 p=vec3(cos(a)*r,1.+position.z*position.z*uRadius*.16*(.4+uStrength),sin(a)*r);
     vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
     gl_PointSize=clamp(900.*(.5+position.z)/max(1.,-mv.z),2.,55.);vFade=(1.-position.y)*(.3+.7*uStrength);}`,
   fragmentShader:`varying float vFade;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;
    gl_FragColor=vec4(.44,.37,.27,(1.-r)*(1.-r)*vFade*.42);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`});
  this.dust=new THREE.Points(geo,dustMat);this.dust.frustumCulled=false;this.group.add(this.dust);
 }
 update(dt){
  this.age+=dt;
  // Four seconds of visible warning; fade-out releases bodies, never deletes
  // momentum. The central column does not teleport to follow the player.
  this.strength=smooth(4,7,this.age)*(1-smooth(this.duration-6,this.duration,this.age));
  this.uniforms.uTime.value=this.age;this.uniforms.uStrength.value=this.strength;
  this.group.visible=this.age<this.duration;
  const library=this.g.audio?.soundLibrary;
  if(this.voice&&library?.active&&!library.active.has(this.voice))this.voice=null;
  if(this.group.visible){this.voice ||= library?.play('weather-vortex',{pos:this.group.position});this.voice?.set(.2+this.strength*.8);}
  else{this.voice?.stop();this.voice=null;}
 }
 sample(pos,out){
  out.x=out.y=out.z=0;
  if(this.strength<=0)return out;
  const x=pos.x-this.x,z=pos.z-this.z,d=Math.hypot(x,z),q=d/this.radius;
  if(q>1.65||d<.001)return out;
  const dx=d>.001?x/d:0,dz=d>.001?z/d:0;
  const envelope=(1-smooth(1,1.65,q))*this.strength;
  if(this.kind==='hurricane'){
   const wall=smooth(.28,.65,q)*envelope;
   const gust=1+.22*Math.sin(this.age*.8+q*4);
   out.x=(-dz*90-dx*12)*wall*gust;out.z=(dx*90-dz*12)*wall*gust;return out;
  }
  const h=(pos.y-this.y)/this.height;
  if(h>1.05||h<-.1)return out;
  const ring=smooth(.06,.28,q)*envelope;
  const outflow=smooth(.58,.92,h),vertical=1-smooth(.55,.95,h);
  const radial=-48*(1-outflow)+100*outflow;
  out.x=(-dz*110+dx*radial)*ring;out.z=(dx*110+dz*radial)*ring;
  out.y=112*ring*vertical*(1-smooth(.7,1.3,q));return out;
 }
 dispose(){this.voice?.stop();this.voice=null;this.group.removeFromParent();this.noise.dispose();
  for(const m of this.group.children){m.geometry.dispose();m.material.dispose();}}
}
