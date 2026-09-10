import * as THREE from 'three';

// Tileable density/domain-warp atlas, built once per stage. Rendering uses a
// handful of filtered texture reads in the existing sky draw, not ray marching.
export function createStormCloudTexture(){
 const size=256,data=new Uint8Array(size*size*4);
 const hash=(x,y,seed)=>{let n=Math.imul(x+seed,374761393)^Math.imul(y+seed,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
 function noise(u,v,cells,seed){
  const x=u*cells,y=v*cells,ix=Math.floor(x),iy=Math.floor(y);
  let a=x-ix,b=y-iy;a=a*a*(3-2*a);b=b*b*(3-2*b);
  const h00=hash(ix%cells,iy%cells,seed),h10=hash((ix+1)%cells,iy%cells,seed);
  const h01=hash(ix%cells,(iy+1)%cells,seed),h11=hash((ix+1)%cells,(iy+1)%cells,seed);
  return (h00+(h10-h00)*a)*(1-b)+(h01+(h11-h01)*a)*b;
 }
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size,i=(y*size+x)*4;
  for(let channel=0;channel<2;channel++){
   const seed=41+channel*713;
   const f=noise(u,v,8,seed)*.38+noise(u,v,16,seed)*.30+noise(u,v,32,seed)*.20+noise(u,v,64,seed)*.12;
   data[i+channel]=Math.round(f*255);
  }
  data[i+2]=data[i];data[i+3]=255;
 }
 const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);
 texture.name='storm-density-atlas';texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
 texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;
 texture.generateMipmaps=true;texture.needsUpdate=true;return texture;
}

export const STORM_CLOUD_UNIFORMS=`
uniform sampler2D uStormNoise;
uniform float uCloudTime;
uniform float uWeatherFlash;
`;
export const STORM_CLOUD_FRAGMENT=`
   float cloudAmount=clamp((uWeatherCloud-.05)/.95,0.0,1.0);
   if(cloudAmount>.001){
     // Project onto an overhead bank. Low-frequency underside and faster scud
     // have independent drift, so the ceiling has depth without extra meshes.
     vec2 cloudUV=skyDir.xz/(max(skyDir.y,0.0)+.55)*.35;
     vec2 drift=vec2(uCloudTime*.0009,uCloudTime*.00035);
     vec2 warp=texture2D(uStormNoise,cloudUV*.45+drift*.3).rg-.5;
     vec2 bankUV=cloudUV+warp*.025+drift;
     float bank=texture2D(uStormNoise,bankUV).r;
     float scud=texture2D(uStormNoise,cloudUV*1.9-drift*1.6).g;
     float density=bank*.70+scud*.30;
     float cover=smoothstep(.52-cloudAmount*.32,.68-cloudAmount*.32,density);
     float sunward=texture2D(uStormNoise,bankUV+vec2(.008,.005)).r;
     float rim=clamp((bank-sunward)*2.5+.40,0.0,1.0);
     float thickness=smoothstep(.30,.67,density);
     vec3 underside=mix(vec3(.31,.36,.36),vec3(.025,.037,.040),thickness);
     underside+=vec3(.17,.20,.20)*rim*(1.0-thickness*.65);
     float cloudLight=mix(.20,1.0,uFrontlineDayMix);
     vec3 cloudColor=underside*cloudLight+vec3(.34,.45,.50)*uWeatherFlash*(.5+rim*.5);
     vec3 baseSky=mix(c,photographed,uFrontlineDayMix);
     // Overcast mist closes the distant gaps, but nearby banks retain relief.
     baseSky=mix(baseSky,vec3(.10,.14,.16)*cloudLight,cloudAmount*.88);
     float horizon=smoothstep(-.08,.10,skyDir.y);
     vec3 stormSky=mix(baseSky,cloudColor,cover*cloudAmount*horizon);
     photographed=stormSky;
     c=mix(c,stormSky,cloudAmount*horizon);
   }
`;
