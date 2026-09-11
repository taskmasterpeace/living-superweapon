import {pairedCombatFixture} from './paired-combat-fixture.mjs';
import {runSlot} from '../../src/engine/abilities.js';

// Production fighter, slots and projectile manager. The pose clock is fixed;
// velocity drives native locomotion, but this fixture does not integrate travel.
export function disjointCombatFixture({motion='strafe',hz=60,kind='beam',order='normal',scene,frame}={}){
 const ground=['stand','walk','jog','strafe'].includes(motion);
 const x=pairedCombatFixture({motion:ground?'strafe':motion,hz,scene,frame}),{f,g,dt}=x;
 f.level=10;
 Object.assign(f.slots.lmb.def,{faceOrigin:false,castStyle:'palm',type:kind,handPattern:'right',interval:.21,spread:.001,color:'#ffd64a'});
 Object.assign(f.slots.rmb.def,{type:'volley',castStyle:'palm',handPattern:'left',interval:.16,spread:.001,color:'#ff6249'});
 if(order==='reverse')f.slots=Object.fromEntries(Object.entries(f.slots).reverse());
 f.vel.set(motion==='walk'?7.5:motion==='jog'?16:motion==='strafe'?14:0,motion==='rise'?12:motion==='descend'?-12:0,motion==='fly'?36:0);
 const held={lmb:false,rmb:false};
 const input=(key,pressed,hold,released=false)=>runSlot(f,key,{pressed,held:hold,released,dt},g);
 return {...x,start(key){held[key]=true;input(key,true,true);},stop(key){held[key]=false;input(key,false,false,true);},
  step(){
   for(const [key,s]of Object.entries(f.slots)){s.cd=Math.max(0,s.cd-dt);if(held[key])input(key,false,true);}
   x.step();
   g.particles.update(dt);g.vfx.update(dt);
  },
 };
}
