import {createDec52Animator} from './dec52-motion-library.js';
/** Animation adapter only. The caller owns position, collision and damage.
 * attackToken and jumpToken identify accepted actions, not held input buttons.
 * velocity is metres/second; runSpeed uses those same units.
 */
export function createDec52GameplayMotion(actor,family,{runSpeed=4}={}){
 if(!Number.isFinite(runSpeed)||runSpeed<=0)throw Error('Invalid Dec-52 run speed');
 const animator=createDec52Animator(actor,family),available=new Set(animator.clips.map(c=>c.userData.action));
 let attackToken,jumpToken,hitToken,shuttingDown=false,oneShot=null,last=null;
 return {clips:animator.clips,update(state,dt){
  if(!Number.isFinite(dt)||dt<0)throw Error('Invalid Dec-52 timestep');
  if(state.dead){
   oneShot=null;attackToken=state.attackToken;jumpToken=state.jumpToken;hitToken=state.hitToken;
   if(!available.has('shutdown'))return last;
   last=animator.advance('shutdown',state.hitstop?0:dt,{restart:!shuttingDown});shuttingDown=true;return last;
  }
  shuttingDown=false;
  if(state.incapacitated){oneShot=null;attackToken=state.attackToken;jumpToken=state.jumpToken;hitToken=state.hitToken;return last;}
  if(state.hitstop)return last;
  if(state.attackToken!=null&&state.attackToken!==attackToken){attackToken=state.attackToken;
   const id=family==='mech'?(state.attackKind==='claw'?'claw':'fire')+'-'+(state.hand==='left'?'left':'right'):'bite';
   if(available.has(id))oneShot={id,restart:true};
  }
  if(state.jumpToken!=null&&state.jumpToken!==jumpToken){jumpToken=state.jumpToken;if(!oneShot&&available.has('jump'))oneShot={id:'jump',restart:true};}
  if(state.hitToken!=null&&state.hitToken!==hitToken){hitToken=state.hitToken;if(available.has('hit'))oneShot={id:'hit',restart:true};}
  const speed=Math.hypot(state.velocity?.x||0,state.velocity?.z||0);
  const desired=oneShot?.id||(state.flying?'flight':speed>.05?(speed>=runSpeed?'run':'walk'):state.searching&&available.has('sniff')?'sniff':'idle');
  if(!available.has(desired))return null;
  last=animator.advance(desired,dt,{restart:!!oneShot?.restart});
  if(oneShot){oneShot.restart=false;if(last.finished)oneShot=null;}
  return last;
 },dispose(){animator.dispose();}};
}
