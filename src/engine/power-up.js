import {runSlot} from './abilities.js';
export function activatePowerUp(f,game){
 const s=f?.powerUp;if(!s||s.activeT>0||!f.alive)return false;
 const before=s.cd;runSlot(f,'_powerUp',{pressed:true,held:true,released:false,dt:0},game);
 if(s.cd>before){s.activeT=s.def.dur||10;return true;}return false;
}
