// Paint belongs to the deformable native surface, not a hovering second floor.
// Existing photographed gravel supplies aggregate detail; markings wear into
// that surface and deform with its craters. No extra geometry or draw calls.
export const OUTPOST_PAVING=Object.freeze([
 {name:'outpostApron',kind:'concrete',rect:[-120,120,85,455],feather:1.8},
 {name:'outpostRoad',kind:'asphalt',rect:[-55,-25,-30,110],feather:1.5},
 {name:'outpostRunway',kind:'asphalt',rect:[-15,95,340,800],feather:.9},
]);
export function outpostSurfaceAt(x,z){
 for(let i=OUTPOST_PAVING.length-1;i>=0;i--){const p=OUTPOST_PAVING[i],[x0,x1,z0,z1]=p.rect;
  if(x>=x0-p.feather&&x<=x1+p.feather&&z>=z0-p.feather&&z<=z1+p.feather)return p.kind;
 }
 return 'sand';
}
const glFloat=n=>Number.isInteger(n)?n.toFixed(1):String(n);
export const OUTPOST_SURFACE_COMMON=`
 float outpostRect(vec2 p,vec4 r,float feather){
  vec2 d=max(vec2(r.x,r.z)-p,p-vec2(r.y,r.w));
  return 1.0-smoothstep(-feather,feather,max(d.x,d.y));
 }
`;
export const OUTPOST_SURFACE_COLOR=`
 ${OUTPOST_PAVING.map(p=>`float ${p.name}=outpostRect(groundP,vec4(${p.rect.map(glFloat).join(',')}),${glFloat(p.feather)});`).join('\n')}
 float outpostPaving=max(max(outpostApron,outpostRoad),outpostRunway);
 float outpostAggregate=dot(gravel,vec3(.2126,.7152,.0722));
 vec3 outpostConcrete=vec3(.24,.225,.195)*(.72+outpostAggregate*.85);
 vec3 outpostAsphalt=vec3(.055,.060,.063)*(.70+outpostAggregate*1.1);
 vec2 slab=abs(fract((groundP+vec2(5.,0.))/25.)-.5);
 float expansion=max(smoothstep(.478,.496,slab.x),smoothstep(.478,.496,slab.y));
 outpostConcrete*=1.-expansion*.27;
 vec3 outpostBase=mix(outpostConcrete,outpostAsphalt,max(outpostRoad,outpostRunway));
 float edgeDust=terrainFbm(groundP*.045)*.16;
 outpostBase=mix(outpostBase,vec3(.32,.245,.16),edgeDust);
 diffuseColor.rgb=mix(diffuseColor.rgb,outpostBase,outpostPaving);
 float runwayCenter=(1.-smoothstep(.65,1.15,abs(groundP.x-40.)))*step(mod(groundP.y-370.,32.),16.);
 float runwayEdges=(1.-smoothstep(.55,1.05,abs(abs(groundP.x-40.)-50.)));
 float thresholds=max(outpostRect(groundP,vec4(-4.,84.,355.,370.),.3),outpostRect(groundP,vec4(-4.,84.,773.,788.),.3));
 thresholds*=step(mod(groundP.x+4.,11.),5.5);
 float runwayPaint=max(max(runwayCenter,runwayEdges),thresholds)*outpostRunway;
 vec2 heli=groundP-vec2(-45.,210.);
 float heliRing=1.-smoothstep(.7,1.4,abs(length(heli)-38.));
 float heliH=max(outpostRect(heli,vec4(-13.,-9.,-17.,17.),.35),outpostRect(heli,vec4(9.,13.,-17.,17.),.35));
 heliH=max(heliH,outpostRect(heli,vec4(-13.,13.,-2.,2.),.35));
 float helipadPaint=max(heliRing,heliH)*outpostApron;
 float wear=.64+.26*terrainNoise(groundP*.7);
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.66,.62,.51),runwayPaint*wear);
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.72,.49,.11),helipadPaint*wear);
`;
