import {ShaderMaterial,Color,DoubleSide} from 'three';

// A transparent clock boundary, distinct from the solid charging shell.
export function speedFieldMaterial(color='#7fd4ff'){
 return new ShaderMaterial({transparent:true,depthWrite:false,side:DoubleSide,
  uniforms:{uColor:{value:new Color(color)},uTime:{value:0},uFade:{value:1}},
  vertexShader:`varying vec3 vNormal; varying vec3 vView; varying vec3 vUnit;
   void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vNormal=normalize(normalMatrix*normal);vView=-mv.xyz;vUnit=normalize(position);gl_Position=projectionMatrix*mv;}`,
  fragmentShader:`uniform vec3 uColor;uniform float uTime;uniform float uFade;
   varying vec3 vNormal;varying vec3 vView;varying vec3 vUnit;
   void main(){float edge=pow(1.0-abs(dot(normalize(vNormal),normalize(vView))),3.0);
    float bands=pow(max(0.0,sin(vUnit.y*36.0-uTime*1.8)),36.0);
    float meridian=pow(max(0.0,cos(atan(vUnit.z,vUnit.x)*12.0+uTime*.45)),48.0);
    float alpha=uFade*(edge*.55+bands*.12+meridian*.065);
    gl_FragColor=vec4(mix(uColor,vec3(1.0,.83,.24),edge*.35),alpha);}`
 });
}
