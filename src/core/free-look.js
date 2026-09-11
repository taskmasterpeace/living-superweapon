// View-only shoulder offsets. The existing look angles remain the travel/aim
// frame; no body direction, camera boom or gameplay state belongs here.
export const FREE_LOOK_DEFAULTS=Object.freeze({yawLimit:75*Math.PI/180,pitchLimit:50*Math.PI/180,returnRate:12});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const createFreeLook=()=>({yaw:0,pitch:0,held:false,cancelVersion:null});
export function clearFreeLook(state){state.yaw=state.pitch=0;state.held=false;return state;}
export function advanceFreeLook(state,{held=false,dx=0,dy=0,dt=0,sensitivity=.0024,cancelVersion=0,enabled=true},config=FREE_LOOK_DEFAULTS){
 if(state.cancelVersion!==null&&state.cancelVersion!==cancelVersion)clearFreeLook(state);
 state.cancelVersion=cancelVersion;
 if(!enabled)return clearFreeLook(state);
 state.held=!!held;
 if(state.held){
  state.yaw=clamp(state.yaw-dx*sensitivity,-config.yawLimit,config.yawLimit);
  state.pitch=clamp(state.pitch-dy*sensitivity,-config.pitchLimit,config.pitchLimit);
 }else{
  const keep=Math.exp(-config.returnRate*Math.max(0,dt));state.yaw*=keep;state.pitch*=keep;
  if(Math.abs(state.yaw)<1e-5)state.yaw=0;if(Math.abs(state.pitch)<1e-5)state.pitch=0;
 }
 return state;
}
