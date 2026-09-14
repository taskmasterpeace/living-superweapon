import * as T from 'three';
import {ROSTER} from '../data/characters.js';
import {createDec52Actor} from './dec52-actor.js';
import {fighterPathFraction} from './fighter-environment-contact.js';
// Native Fighter owns health/status/physics/KO; this adapter owns its quadruped
// rendering and accepted bite cycle. No humanoid pose is used for this body.
export async function createDec52Encounter(game,{origin,target,loader}={}){
 const actor=await createDec52Actor({family:'hound',scene:game.scene,loader});
 let f;try{f=game.addFighter({...ROSTER.find(d=>d.id==='merc'),id:'dec52-hound',name:'Dec-52 hound',flightTier:0,abilities:{},items:[],speed:18,weightLb:110},{team:(typeof target==='function'?target():target)?.team===0?1:0,dummy:true,x:origin.x,z:origin.z});}catch(e){actor.dispose();throw e;}
 f.pos.copy(origin);f.noRespawn=true;f._openSky=true;f._modularEpoch=(f._modularEpoch||0)+1;f._modularCharacter?.dispose();f._modularCharacter=null;
 f._creatureActor=actor;f._creatureFamily='dec52-hound';
 actor.sync({pos:new T.Vector3(),yaw:0,alive:true},0);
 const local=new T.Box3().setFromObject(actor.actor);actor.actor.position.y-=local.min.y;local.translate(new T.Vector3(0,-local.min.y,0));
 f.radius=Math.max(local.max.x,-local.min.x,local.max.z,-local.min.z);f.bodyBounds=local.clone();
 let yaw=0,token=0,hitToken=0,lastHp=f.hp,bite=null,cooldown=0,disposed=false;
 const sync=dt=>{
  if(f.hp<lastHp)actor.acceptAction({type:'hit',token:++hitToken});lastHp=f.hp;
  actor.sync({pos:f.pos,vel:f.vel,yaw,alive:f.alive,incapacitated:f.staggerT>0||f.stunT>0||f.frozenT>0||f.grabbedBy,hitstop:f.hitstop>0},Math.max(0,dt));
  f.bodyBounds.copy(local).applyMatrix4(new T.Matrix4().makeRotationY(yaw));f.obj.visible=false;
 };
 f._animate=dt=>sync(dt);f._sync=()=>{f.obj.position.copy(f.pos);f.obj.visible=false;};
 const originalDispose=f.dispose.bind(f);f.dispose=()=>{if(disposed)return;disposed=true;actor.dispose();originalDispose();};
 const api={fighter:f,actor,
  control(dt){
   if(disposed)return;if(!Number.isFinite(dt)||dt<0)throw Error('Invalid creature timestep');
   cooldown=Math.max(0,cooldown-dt);
   if(!f.alive||f.hitstop>0||f.stunT>0||f.staggerT>0||f.frozenT>0||f.grabbedBy){bite=null;return;}
   const v=typeof target==='function'?target():target;if(!v?.alive||!game.isFoe(f,v)){bite=null;f.move(new T.Vector3(),dt);return;}
   const direction=v.pos.clone().sub(f.pos);direction.y=0;if(direction.lengthSq()>1e-6){direction.normalize();yaw=Math.atan2(direction.x,direction.z);f.faceDir(direction.x,direction.z);}sync(0);
   const jaw=actor.actor.getObjectByName('nanite-jaw')||actor.actor.getObjectByName('nanite-head'),mouth=jaw.getWorldPosition(new T.Vector3());
   const nearest=v.pos.clone();nearest.y=T.MathUtils.clamp(mouth.y,v.pos.y+(v.bodyBounds?.min.y??0),v.pos.y+(v.bodyBounds?.max.y??12));
   const distance=mouth.distanceTo(nearest),reach=(v.radius||2.2)+1;
   if(!bite&&cooldown===0&&distance<=reach+1){bite={elapsed:0,contact:false};cooldown=.95;actor.acceptAction({type:'bite',token:++token});}
   if(bite){
    const prior=bite.elapsed;bite.elapsed+=dt;
    if(!bite.contact&&prior<=.195&&bite.elapsed>=.195){bite.contact=true;if(distance<=reach&&fighterPathFraction({radius:0,sizeScale:.01},game.world,mouth,nearest)>=.999)v.takeDamage(8,{src:f,strike:true,meleeMove:'bite',hitstop:.035});}
    if(bite.elapsed>=.65)bite=null;f.move(new T.Vector3(),dt);
   }else f.move(direction,dt);
  },dispose(){f.dispose();}
 };sync(0);return api;
}
