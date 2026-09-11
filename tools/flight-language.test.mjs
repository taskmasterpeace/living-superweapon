import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,PerspectiveCamera} from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {FlightWake} from '../src/engine/flight-wake.js';
import {animateHands} from '../src/engine/hero-hand.js';
import {profileFromDef,resetFlightStyle,applyProfile,validateProfile} from '../src/tool/studio-profile.js';
const base=ROSTER.find(d=>d.id==='kano');
test('six authored languages produce distinct production flight silhouettes and preserve weapon grips',()=>{
 const signatures=[];
 for(const style of ['hero','twin','martial','thruster','hammer','glider']){
  const p=resetFlightStyle(profileFromDef(base),style),f=new Fighter(applyProfile(base,p));
  try{Object.assign(f,{_openSky:true,flying:true,gait:'airborne',_flyPose:1});f.vel.set(0,0,80);
   for(let i=0;i<120;i++){f.animT=i/60;f._animate(1/60);}
   const a=f.parts;signatures.push([a.armL.rotation.x,a.armR.rotation.x,a.armL.rotation.z,a.armR.rotation.z].map(n=>n.toFixed(2)).join(','));
   if(style==='twin')assert.ok(a.armL.rotation.x<-2.4&&a.armR.rotation.x<-2.4,'Both fists must lead');
   if(style==='thruster'||style==='glider'){
    assert.ok(a.armR.children[2].morphTargetInfluences[0]>.7,'Propulsion/glide palms remain clenched');
    f.poseStrike=1;for(let i=0;i<30;i++)f._animate(1/60);assert.ok(a.armR.children[2].morphTargetInfluences[0]<.1,'Flight palm overrides melee fist');
   }
   if(style==='martial')assert.ok(a.g.rotation.x<1.3,'BFP cruise hides the torso behind boot soles');
   f.poseStrike=0;for(let i=0;i<60;i++)f._animate(1/60);
   const cruise=a.g.rotation.x;f.cruiseHeld=true;for(let i=0;i<120;i++)f._animate(1/60);
   assert.ok(a.g.rotation.x>=cruise-.01,'Boost should streamline, not raise the chest farther than cruise');
   if(style==='glider')assert.ok(a.armL.children[2].morphTargetInfluences[0]<.1,'Leading boost fist must close');
  }finally{f.dispose();}
 }
 assert.equal(new Set(signatures).size,6,'Flight style labels still share silhouettes');
});
test('ordinary fast flight leaves a readable world-space wake, not a boost-only stub',()=>{
 for(const hz of [30,60,120]){
  const scene=new Scene(),camera=new PerspectiveCamera(),f=new Fighter(base);scene.add(f.obj);
  Object.assign(f,{_openSky:true,flying:true,gait:'airborne',_flyPose:1,cruiseHeld:false,_burnT:0});f.vel.set(0,0,80);
  const w=new FlightWake({scene,camera},f);
  try{for(let i=0;i<hz;i++){f.pos.z+=80/hz;f._animate(1/hz);f.obj.updateMatrixWorld(true);w.update(1/hz);}
   assert.ok(w.mesh.visible,'Normal flight has no trail');
   assert.ok(w.n>25,'Trail is too short to communicate travel');
   assert.ok(w.history[(w.n-1)*6+2]-w.history[2]>25,'Visible traveled path is under 25 units');
   f.vel.set(0,0,0);w.update(1/hz);
   assert.ok(Math.max(...w.mesh.geometry.attributes.aAlpha.array)>.1,'Braking erases existing trail instead of fading its history');
   for(let i=0;i<hz;i++)w.update(1/hz);assert.equal(w.mesh.visible,false);
  }finally{w.dispose();f.dispose();}
 }
});
test('wake authoring survives presentation serialization with validated limits',()=>{
 const p=profileFromDef(base);assert.ok(p.wake,'Missing wake authoring data');p.wake.width=.55;p.wake.life=.7;
 assert.equal(applyProfile(base,JSON.parse(JSON.stringify(p))).model.wake.width,.55);
 p.wake.life=100;assert.throws(()=>validateProfile(p));
});

test('face and chest attacks keep braced fists instead of inheriting open flight palms',()=>{
 const f=new Fighter(applyProfile(base,resetFlightStyle(profileFromDef(base),'glider')));
 try{Object.assign(f,{flying:true,gait:'airborne',_flyPose:1});
  for(const source of ['face','chest']){f._combatAim={source,weight:1,gather:0};
   for(let i=0;i<60;i++)animateHands(f,1/60);
   for(const arm of [f.parts.armL,f.parts.armR])assert.ok(arm.children[2].morphTargetInfluences[0]<.01,source+' loses braced fist');
  }
 }finally{f.dispose();}
});

test('winged flight silhouettes use tapered volume instead of rectangular cards',()=>{
 const f=new Fighter(ROSTER.find(d=>d.id==='majesty'));
 try{const wings=[];f.parts.torso.traverse(o=>{if(o.name==='flight-wing')wings.push(o);});
  assert.equal(wings.length,2);for(const wing of wings){wing.geometry.computeBoundingBox();const b=wing.geometry.boundingBox;
   assert.ok(b.max.z-b.min.z>.05,'Wing is a flat billboard');assert.notEqual(wing.geometry.type,'PlaneGeometry');
  }
 }finally{f.dispose();}
});

test('repulsor stabilizing palms sit outside the shoulders, not crossed behind the spine',()=>{
 const f=new Fighter(applyProfile(base,resetFlightStyle(profileFromDef(base),'thruster')));
 try{Object.assign(f,{_openSky:true,flying:true,gait:'airborne',_flyPose:1});
  for(const speed of [0,80]){f.vel.set(0,0,speed);for(let i=0;i<120;i++)f._animate(1/60);f.obj.updateMatrixWorld(true);
   for(const [arm,side] of [[f.parts.armL,-1],[f.parts.armR,1]]){
    const shoulder=arm.getWorldPosition(f.pos.clone()),palm=arm.children[2].getWorldPosition(f.pos.clone());
    assert.ok((palm.x-shoulder.x)*side>.1,'Stabilizer palm crosses inward');
   }
  }
 }finally{f.dispose();}
});
