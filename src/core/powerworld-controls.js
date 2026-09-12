// Shared character actions; selected powers never change the meaning of melee.
export const POWERWORLD_CONTROLS=Object.freeze({name:'POWERWORLD',wheel:'ability',digitsSwap:false,mouseMelee:false,independentCombat:true,
 up:'Space',down:'ControlLeft',guard:'KeyQ',item:'KeyX',strike:'KeyV',grab:'KeyE',fly:'KeyF',
 upLabel:'SPACE',downLabel:'CTRL',guardLabel:'Q / MOUSE4',itemLabel:'X',strikeLabel:'V',grabLabel:'E',flyLabel:'F',swapLabel:'F3',
 blurb:'V punch / hold heavy · Q guard · E interact / grab · C crouch · Z prone (soldier only) · double-tap direction dodge · TAB powers · I inventory'});

// Acquisition and management are different gestures. Cancel/blur never throws.
export function contextualGrab(game,f,input,dt){
 const s=f._contextGrab??={age:0,managing:false,armed:false,version:input.version};
 if(s.version!==input.version){s.age=0;s.managing=s.armed=false;s.version=input.version;if(f._personCarry){f._personCarry.throwArmed=false;f._personCarry.whirling=false;}return;}
 if(input.pressed){s.age=0;s.armed=false;s.managing=!!(f.grabbing||f._carry);
  if(!s.managing){
   if(!game.doInteract(f)&&!game.pickupGear(f)&&!game.grabProp(f))game.melee.grab(f);
  }
 }
 if(f.grabbing&&!f._personCarry&&(Math.hypot(f.moveDir?.x||0,f.moveDir?.z||0)>.01||f.flyHeld||f.flying))game.melee.liftPerson(f);
 if(input.held&&s.managing){s.age+=dt;if(s.age>=.28&&!s.armed){s.armed=true;if(f.grabbing){game.melee.liftPerson(f);if(f._personCarry)game.melee.grab(f);}}}
 if(input.released&&s.managing){
  if(s.armed){if(f.grabbing){if(f._personCarry)game.melee.releaseGrab(f);else game.melee.grab(f);}else if(f._carry)game.throwProp(f);}
  else if(f.grabbing){if(f.airborne||!game.melee.setdownPerson(f))game.melee.release(f);}
  else if(f._carry)game.throwProp(f,true);
  s.managing=s.armed=false;s.age=0;
 }
}
