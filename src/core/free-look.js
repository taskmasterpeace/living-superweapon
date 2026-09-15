// View-only shoulder offsets. The existing look angles remain the travel/aim
// frame; no body direction, camera boom or gameplay state belongs here.
export const FREE_LOOK_DEFAULTS=Object.freeze({yawLimit:82*Math.PI/180,pitchLimit:50*Math.PI/180,returnRate:12,sideShift:9.5,backShift:2.8,targetWeight:.52});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const createFreeLook=()=>({yaw:0,pitch:0,held:false,cancelVersion:null,clock:0,lastTap:-Infinity,latched:false,orbit:false,zoom:1,physicalHeld:false});
export function clearFreeLook(state){state.yaw=state.pitch=0;state.held=state.latched=state.orbit=state.physicalHeld=false;state.zoom=1;state.lastTap=-Infinity;return state;}
export function advanceFreeLook(state,{held=false,wheel=0,dx=0,dy=0,dt=0,sensitivity=.0024,cancelVersion=0,enabled=true},config=FREE_LOOK_DEFAULTS){
 if(state.cancelVersion!==null&&state.cancelVersion!==cancelVersion)clearFreeLook(state);
 state.cancelVersion=cancelVersion;
 if(!enabled)return clearFreeLook(state);
 state.clock=(state.clock||0)+Math.max(0,dt);
 const pressed=held&&!state.physicalHeld;state.physicalHeld=!!held;
 if(pressed){if(state.latched){state.latched=false;state.suppress=true;state.lastTap=-Infinity;}
 else if(state.clock-state.lastTap<.32){state.latched=state.orbit=true;state.lastTap=-Infinity;}
 else state.lastTap=state.clock;}
 if(!held)state.suppress=false;
 state.held=state.latched||!!held&&!state.suppress;
 if(held&&wheel)state.zoom=clamp((state.zoom||1)*Math.exp(wheel*.12),.25,1.8);
 if(state.held){
  state.yaw=state.orbit?Math.atan2(Math.sin(state.yaw-dx*sensitivity),Math.cos(state.yaw-dx*sensitivity)):clamp(state.yaw-dx*sensitivity,-config.yawLimit,config.yawLimit);
  state.pitch=clamp(state.pitch-dy*sensitivity,-config.pitchLimit,config.pitchLimit);
 }else{
  const keep=Math.exp(-config.returnRate*Math.max(0,dt));state.yaw*=keep;state.pitch*=keep;
  if(Math.abs(state.yaw)<1e-5)state.yaw=0;if(Math.abs(state.pitch)<1e-5)state.pitch=0;
  if(!state.yaw&&!state.pitch)state.orbit=false;
 }
 return state;
}
