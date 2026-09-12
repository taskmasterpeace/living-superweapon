import {gadgetCatalog} from '../data/gadget-catalog.js';
import {equipmentPolicy} from './equipment-policy.js';
export function issueTrainingGadget(game,f,def,index){
 if(!game._threatRoom?.active||game.ms?.threatLab?.state!=='preparing'||f!==game.player||!f.alive)return {ok:false,reason:'Equipment issue is available in the training room before deployment.'};
 if(!Number.isInteger(index)||index<0||index>=equipmentPolicy(f).gadgetLimit||index>f.items.length)return {ok:false,reason:'Choose an available gadget slot; fill earlier slots first.'};
 if(!gadgetCatalog().some(r=>JSON.stringify(r.def)===JSON.stringify(def)))return {ok:false,reason:'Unknown gadget definition.'};
 const old=f.items[index];if(old&&(old.state!=='ready'||old.cd>0||old.mesh))return {ok:false,reason:'Recall the gadget and wait for its cooldown before replacing it.'};
 f.items[index]={def:structuredClone(def),state:'ready',cd:0,pos:null,mesh:null,charges:def.charges??1};f._selectedGadget=index;return {ok:true};
}
