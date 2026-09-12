const order=['lmb','rmb','q','e','f','r','shift','_gear'];
export function combatChoices(f,map){return [...(!map.independentCombat&&(map.mouseMelee||f._tabMelee)?['melee']:[]),...order.filter(k=>f.slots[k]&&(k!=='_gear'||map.independentCombat))];}
// Never remap a held trigger into a different attack or abandon a live clinch.
export function canChangeMouseTool(f,input){return !input.mouse.left&&!input.mouse.right&&!f.meleeCharge&&!f._meleeQueuedHeld&&!f.mstate&&!f.grabbing&&!f.grabState;}

const empty=()=>({pressed:false,held:false,released:false});
const step=(choices,key,dir)=>choices[(Math.max(0,choices.indexOf(key))+Math.sign(dir)+choices.length)%choices.length];
export function selectedAttacks(f,map){
 const primaryChoices=combatChoices(f,map),secondaryChoices=[...(!map.independentCombat&&(map.mouseMelee||f._tabMelee)?['grab']:[]),...order.filter(k=>f.slots[k]&&(k!=='_gear'||map.independentCombat))];
 const primary=primaryChoices.includes(f._selSlot)?f._selSlot:(f.slots.lmb?'lmb':primaryChoices[0]);
 const fallback=primary==='melee'?'grab':f.slots.rmb?'rmb':secondaryChoices[0];
 return {primary,secondary:secondaryChoices.includes(f._selSecondary)?f._selSecondary:fallback,primaryChoices,secondaryChoices};
}

// Resolve gestures BEFORE runSlot. The right trigger has a 150ms selection window:
// a tap fires on release; a hold starts once the window closes. Scrolling consumes
// that hold, cancelling preparation (never releasing it as a charged projectile).
export function sampleMouseCombat(f,input,map,dt,otherHeld=()=>false){
 const m=input.mouse,s=f._mouseCombat||(f._mouseCombat={age:0,pending:false,armed:false,blocked:false,previous:{}});
 let {primary,secondary,primaryChoices,secondaryChoices}=selectedAttacks(f,map);
 f._selSecondary=secondary;if(map.independentCombat)f._selSlot=primary;
 const out={primary,secondary,scope:false,changed:[],cancel:[],buttons:{left:empty(),right:empty()},slots:Object.fromEntries(order.map(k=>[k,empty()]))};
 if(s.cancelVersion!==undefined&&s.cancelVersion!==(input.cancelVersion||0)){
  s.pending=s.armed=s.blocked=s.sight=s.tapRelease=s.leftTapRelease=false;s.previous={};s.cancelVersion=input.cancelVersion||0;
  return out;
 }
 s.cancelVersion=input.cancelVersion||0;
 // Deferred releases carry their originating ability, not the next selection.
 for(const field of ['tapRelease','leftTapRelease']){
  if(out.slots[s[field]])out.slots[s[field]].released=true;
  s[field]=false;
 }
 const captured=!!(input.wheelPrimary||input.wheelSecondary);
 const leftWheel=captured?input.wheelPrimary:(!m.right?input.wheel:0);
 const rightWheel=captured?input.wheelSecondary:(m.right?input.wheel:0);
 const wrestling=f.meleeCharge||f._meleeQueuedHeld||f.mstate||f.grabbing||f.grabState;
 if(leftWheel&&primaryChoices.length&&!m.leftUp&&(!m.left||m.leftEdge)&&!wrestling){
  primary=step(primaryChoices,primary,leftWheel);f._selSlot=primary;out.changed.push('primary');
 }
 if(rightWheel&&secondaryChoices.length&&!wrestling){
  // A second trigger on the same slot still owns its live channel.
  if(s.armed&&!(m.left&&primary===secondary)&&!otherHeld(secondary))out.cancel.push(secondary);
  secondary=step(secondaryChoices,secondary,rightWheel);f._selSecondary=secondary;
  s.pending=false;s.armed=false;s.blocked=true;out.changed.push('secondary');
 }
 out.primary=primary;out.secondary=secondary;
 out.buttons.left={pressed:!!m.leftEdge,held:!!m.left,released:!!m.leftUp};
 if(m.leftEdge&&m.leftUp&&!m.left){out.buttons.left.held=true;out.buttons.left.released=false;s.leftTapRelease=primary;}
 const R=out.buttons.right;
 if(m.rightEdge)s.sight=f.slots[primary]?.def?.type==='rifle'&&f.slots[primary].def.scopeZoom>1;
 // A fresh press is an explicit new gesture even when release/re-press occur
 // between ticks. Only the frame containing the wheel consumes that press.
 if(s.blocked&&m.rightEdge&&!rightWheel)s.blocked=false;
 if(s.sight){
  out.scope=!!m.right&&!s.blocked;
  s.pending=s.armed=false;
 }else if(!s.blocked){
  if(m.rightEdge){s.pending=true;s.age=0;}
  if(s.pending){
   s.age+=Math.max(0,dt||0);
   if(m.rightUp&&!m.right){R.pressed=true;R.held=true;s.tapRelease=secondary;s.pending=false;}
   else if(m.right&&s.age>=.15){R.pressed=true;s.pending=false;s.armed=true;}
  }
  if(s.armed){R.held=!!m.right;if(m.rightUp&&!m.right){R.released=true;s.armed=false;}}
 }
 if(!m.right){s.blocked=false;s.pending=false;s.sight=false;s.age=0;}
 for(const [key,b] of [[primary,out.buttons.left],[secondary,R]])if(out.slots[key]){
  for(const edge of ['pressed','held','released'])out.slots[key][edge]||=b[edge];
 }
 // Two triggers can share one ability, but lifting one must not end the other.
 for(const [key,it] of Object.entries(out.slots)){
  if(it.held){it.released=false;if(s.previous[key])it.pressed=false;}
  s.previous[key]=it.held;
 }
 return out;
}
