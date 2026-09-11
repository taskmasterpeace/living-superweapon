import {firearmById} from './armory.js';

// The response ladder owns combat numbers. Presentation selects one audited
// fictional Earth rifle; the helmet/carrier remain PowerWorld's existing kit.
export function applyDesertUnitPresentation(def,tier){
 def.body='human';
 def.model={body:'procedural',costume:'tactical',hair:'cropped',emblem:false};
 def.build={weaponR:tier>=3?'rifle':'pistol',helmet:tier>=3?1:0};
 if(tier>=5){
  const rifle=firearmById('kuchler');
  def.model.equipment='soldier';
  def.model.assets={equipment:{rifle:rifle.equipmentAsset}};
  Object.assign(def.abilities.lmb,{name:rifle.ab.name,weapon:'rifle',armoryId:rifle.id,voice:rifle.voice,mesh:rifle.mesh});
 }
 return def;
}
