// Gameplay-unit aerodynamics: pressure grows with speed squared; footing is
// static resistance, not a magic speed cap. Physics still owns every collision.
const finite=(v,fallback)=>Number.isFinite(v)?v:fallback;

export function fallDamage(f,speed,kind){
 if(kind!=='ground'&&kind!=='roof')return 0;
 const e=f.def.environment||{};
 const scale=Math.max(0,finite(e.fallDamageScale,f.def.archetype==='soldier'?1:0));
 const safe=Math.max(0,finite(e.fallSafeSpeed,56));
 return Math.max(0,speed*speed-safe*safe)*.035*scale;
}

// Conservative collision proxies, not expensive render-mesh raycasts. A wall
// only shelters its downwind side and only below its actual top.
export function windShelter(world,pos,dx,dz,bodyHeight=6){
 const y=pos.y+bodyHeight;
 for(const list of [world?.cover,world?.interiors])for(const c of list||[]){
  if(c.destroyed||!Number.isFinite(c.top)||c.top<=y)continue;
  const reach=Math.min(90,Math.max(12,(c.top-y)*3));
  let lo=0,hi=reach;
  for(const axis of ['x','z']){
   const half=axis==='x'?(c.hx??c.r??0):(c.hz??c.r??0);
   const d=axis==='x'?-dx:-dz,delta=c[axis]-pos[axis];
   if(Math.abs(d)<1e-6){if(Math.abs(delta)>half){hi=-1;break;}}
   else{let a=(delta-half)/d,b=(delta+half)/d;if(a>b)[a,b]=[b,a];lo=Math.max(lo,a);hi=Math.min(hi,b);}
  }
  if(hi>=lo&&hi>=0)return .12;
 }
 return 1;
}

export function prepareWindBody(f,game){
 const out=f._weatherBody||(f._weatherBody={});
 out.x=out.y=out.z=out.pressure=0;out.driven=false;out.coefficient=0;out.footing=0;
 const w=game?.weather;
 if(!w||w.wind<=.15&&!w.layers?.size||!f.alive||f._scoutVehicle||f._aircraftVehicle||f.phase)return out;
 const e=f.def.environment||{},size=Math.max(.35,f.sizeScale||1),strength=f.def.strength??5;
 // Authored kilograms describe the base body; Size Change always scales mass.
 const mass=Math.max(20,finite(e.massKg,90*(f.def.metal?1.8:1))*size**3)/90;
 const resistance=Math.max(.1,finite(e.windResistance,1+Math.max(0,strength-4)**2*.55));
 if(w.sampleBodyWind)w.sampleBodyWind(f.pos,out);
 else{out.x=Math.cos(w.windDir||0)*w.windSpeed;out.z=Math.sin(w.windDir||0)*w.windSpeed;}
 const horizontal=Math.hypot(out.x,out.z),dx=horizontal>0?out.x/horizontal:0,dz=horizontal>0?out.z/horizontal:0;
 const exposure=windShelter(game.world,f.pos,dx,dz,f.prone?1.5:f.crouching?3:6);
 const speed=horizontal*exposure;
 out.x=dx*speed;out.z=dz*speed;out.y*=exposure;
 out.liftResistance=mass*resistance/(size*size);
 out.coefficient=.11*size*size/(mass*resistance);
 out.pressure=out.coefficient*speed*speed;
 const grounded=!f.flying&&(f.onBlock||f.pos.y<=(f.groundY||0)+.1);
 out.footing=grounded?(24+12*strength)*(f.prone?3.8:f.crouching?1.8:1)*(f.guarding?1.6:1):0;
 out.driven=out.pressure>out.footing+1;
 return out;
}

export function windMoveScale(f,game){
 const w=prepareWindBody(f,game);
 // Static pressure determines control loss; relative air speed determines
 // acceleration. Using relative pressure for both would oscillate ownership.
 return w.driven&&w.footing>0?Math.max(.04,Math.min(1,(w.footing/w.pressure)**2)):1;
}

export function reconcileWindCarry(f){
 const carry=f._windCarry||(f._windCarry={x:0,z:0});
 for(const axis of ['x','z'])carry[axis]=carry[axis]*f.vel[axis]>0?Math.sign(carry[axis])*Math.min(Math.abs(carry[axis]),Math.abs(f.vel[axis])):0;
 return carry;
}

export function applyBodyWind(f,w,dt){
 // Attribute only surviving momentum, including when the weather has ended.
 const carry=reconcileWindCarry(f);
 if(!w.driven)return;
 const x=w.x-f.vel.x,z=w.z-f.vel.z,speed=Math.hypot(x,z);
 if(speed<.001)return;
 const acceleration=Math.max(0,w.coefficient*speed*speed-w.footing*.35);
 // Never overshoot the air's velocity at a long frame; no unbounded impulses.
 const step=Math.min(speed,acceleration*Math.min(.1,dt))/speed;
 f.vel.x+=x*step;f.vel.z+=z*step;
 carry.x+=x*step;carry.z+=z*step;
 // A headwind braking self-powered flight is not a wind-launched impact.
 reconcileWindCarry(f);
 const supported=!f.flying&&(f.onBlock||f.pos.y<=(f.groundY||0)+.1);
 // Do not make a microscopic hop every frame in weak skirt updrafts. Lift
 // must overcome gravity before releasing a supported body from the floor.
 if(w.y>0&&(!supported||w.y*2.4/w.liftResistance>65)){
  const response=1-Math.exp(-2.4*Math.min(.1,dt)/w.liftResistance);
  f.vel.y+=(w.y-f.vel.y)*response;
 }
}

export function windImpactSpeed(f,axis){
 if(axis!=='x'&&axis!=='z')return 0;
 const carry=f._windCarry?.[axis]||0,velocity=f._windFrameVelocity?.[axis]||0;
 return carry*velocity>0?Math.min(Math.abs(carry),Math.abs(velocity)):0;
}
