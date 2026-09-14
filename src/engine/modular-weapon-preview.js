import * as T from 'three';

// Authored actor units (before actor.scale). Legacy buildWeapon meshes use a
// different, -Y native-rig basis, so they cannot use this palm socket directly.
export const MODULAR_WEAPON_CLIP_FAMILIES=Object.freeze({
  dualKatana:Object.freeze({label:'Dual katana grip preview',clips:['Sword_Idle'],gaps:['Dedicated dual wield attack animation']}),
  none:Object.freeze({label:'Unarmed',clips:['Idle_Loop','Punch_Jab','Punch_Cross'],gaps:[]}),
  spear:Object.freeze({label:'Spear grip preview',clips:['Sword_Idle'],gaps:['Dedicated spear thrust']}),
  sword:Object.freeze({label:'Authored sword',clips:['Sword_Idle','Sword_Attack'],gaps:[]}),
  bat:Object.freeze({label:'Shared one-handed slash preview',clips:['Sword_Idle','Sword_Attack'],gaps:['Dedicated baseball bat swing','Two-handed bat grip / animation']}),
  axe:Object.freeze({label:'Shared one-handed slash preview',clips:['Sword_Idle','Sword_Attack'],gaps:['Dedicated axe swing','Two-handed axe grip / animation']}),
  shield:Object.freeze({label:'Offhand shield prop',clips:[],gaps:['Authored shield block / bash animation']}),
});

export function createModularWeaponPreview(actor){
  const hand=side=>actor.getObjectByName(T.PropertyBinding.sanitizeNodeName(`DEF-hand.${side}`))||actor.getObjectByName(`DEF-hand.${side}`);
  const right=hand('R'),left=hand('L');
  if(!right||!left)throw new Error('Modular weapon preview requires DEF-hand.R and DEF-hand.L');
  const geometries=new Set(),materials=new Set();
  function material(color,metalness=0,roughness=.55){const m=new T.MeshStandardMaterial({color,metalness,roughness,flatShading:true});materials.add(m);return m;}
  const steel=material('#cdd5ce',.65,.28),gold=material('#bba365',.5,.4),dark=material('#262b29'),wood=material('#a36a38'),face=material('#385d68',.35);
  function mesh(group,geometry,mat,x=0,y=0,z=0){geometries.add(geometry);const m=new T.Mesh(geometry,mat);m.position.set(x,y,z);group.add(m);return m;}
  const weapons={};
  for(const kind of ['sword','bat','axe','spear']){
    const group=new T.Group();group.name=`review-${kind}`;group.userData.weaponKind=kind;
    group.userData.gripKind='cylinder';group.userData.clipFamily=MODULAR_WEAPON_CLIP_FAMILIES[kind];
    // Exact existing workshop sword grip; preserve authored hand articulation.
    group.position.set(0,.075,.028);group.rotation.set(Math.PI/2,0,0);right.add(group);weapons[kind]=group;
  }
  const dual=new T.Group();right.add(dual);weapons.dualKatana=dual;const off=new T.Group();left.add(off);for(const group of [dual,off]){group.position.set(0,.075,.028);group.rotation.x=Math.PI/2;mesh(group,new T.CylinderGeometry(.018,.018,.20,6),dark);mesh(group,new T.BoxGeometry(.10,.02,.065),gold,0,.11);const shape=new T.Shape();shape.moveTo(-.018,.12);shape.lineTo(.018,.12);shape.quadraticCurveTo(.025,.66,.11,.91);shape.lineTo(.065,.86);shape.quadraticCurveTo(-.016,.60,-.018,.12);mesh(group,new T.ExtrudeGeometry(shape,{depth:.012,bevelEnabled:false}),steel,0,0,-.006);}dual.userData.clipFamily=MODULAR_WEAPON_CLIP_FAMILIES.dualKatana;
  const spear=weapons.spear;mesh(spear,new T.CylinderGeometry(.014,.014,1.6,6),wood,0,.45);mesh(spear,new T.ConeGeometry(.05,.22,4),steel,0,1.36);
  const sword=weapons.sword;
  mesh(sword,new T.CylinderGeometry(.016,.016,.15,8),dark);
  mesh(sword,new T.BoxGeometry(.20,.025,.035),gold,0,.075);
  mesh(sword,new T.BoxGeometry(.046,.72,.014),steel,0,.445);
  mesh(sword,new T.ConeGeometry(.024,.08,4),steel,0,.845);
  const bat=weapons.bat;
  // Full .91m bat: narrow wrapped handle, angular tapered shoulder, broad barrel.
  mesh(bat,new T.CylinderGeometry(.018,.018,.20,8),dark,0,.025);
  mesh(bat,new T.CylinderGeometry(.031,.031,.023,8),wood,0,-.0865);
  mesh(bat,new T.CylinderGeometry(.048,.018,.36,8),wood,0,.305);
  mesh(bat,new T.CylinderGeometry(.046,.048,.31,8),wood,0,.64);
  mesh(bat,new T.CylinderGeometry(.038,.046,.025,8),wood,0,.8075);
  const axe=weapons.axe;
  mesh(axe,new T.CylinderGeometry(.018,.022,.79,8),wood,0,.305);
  mesh(axe,new T.CylinderGeometry(.024,.024,.16,8),dark);
  const bladeShape=new T.Shape();bladeShape.moveTo(-.075,.51);bladeShape.lineTo(.10,.54);bladeShape.lineTo(.25,.45);bladeShape.lineTo(.30,.52);bladeShape.lineTo(.30,.77);bladeShape.lineTo(.23,.83);bladeShape.lineTo(.09,.71);bladeShape.lineTo(-.075,.70);bladeShape.closePath();
  mesh(axe,new T.ExtrudeGeometry(bladeShape,{depth:.045,bevelEnabled:false}),steel,0,0,-.0225);
  mesh(axe,new T.BoxGeometry(.065,.14,.06),gold,0,.635);
  const shield=new T.Group();shield.name='review-shield';shield.userData.clipFamily=MODULAR_WEAPON_CLIP_FAMILIES.shield;
  // Authored left-hand +X points inward and +Y runs down the fingers.
  // Put the plate outside the back of the fist (-X), with its top toward
  // the wrist (-Y). The sword palm rotation makes the shield a flat tray.
  shield.position.set(0,.075,.028);shield.rotation.set(0,Math.PI/2,Math.PI);left.add(shield);
  // Keep the handle across the palm (hand Z), behind the outward plate.
  mesh(shield,new T.CylinderGeometry(.018,.018,.14,8),dark).rotation.z=Math.PI/2;
  const plate=mesh(shield,new T.CylinderGeometry(.31,.31,.035,8),gold,0,.04,-.075);plate.rotation.x=Math.PI/2;
  const inset=mesh(shield,new T.CylinderGeometry(.273,.273,.039,8),face,0,.04,-.083);inset.rotation.x=Math.PI/2;
  mesh(shield,new T.SphereGeometry(.068,8,4),steel,0,.04,-.11).scale.z=.5;
  const roundParts=shield.children.slice(1);const kite=new T.Group(),riot=new T.Group();shield.add(kite,riot);const sh=new T.Shape();sh.moveTo(-.29,.35);sh.lineTo(.29,.35);sh.lineTo(.31,-.14);sh.lineTo(0,-.52);sh.lineTo(-.31,-.14);sh.closePath();mesh(kite,new T.ExtrudeGeometry(sh,{depth:.04,bevelEnabled:false}),steel,0,.1,-.13);mesh(riot,new T.BoxGeometry(.64,.95,.04),dark,0,.02,-.12);mesh(riot,new T.BoxGeometry(.47,.12,.045),face,0,.30,-.145);
  // Rear grip brackets join the palm handle to each style's plate.
  for(const x of [-.06,.06])mesh(shield,new T.BoxGeometry(.025,.025,.11),dark,x,0,-.055);
  let state={weapon:'none',shield:false,shieldStyle:'round'},disposed=false;
  const api={weapons,shield,clipFamilies:MODULAR_WEAPON_CLIP_FAMILIES,
    get state(){return {...state};},
    set(next={}){
      if(disposed)throw new Error('Modular weapon preview is disposed');
      const updated={...state,...next};
      if(updated.weapon!=='none'&&!Object.hasOwn(weapons,updated.weapon))throw new Error(`Unknown preview weapon: ${updated.weapon}`);
      state={weapon:updated.weapon,shield:!!updated.shield,shieldStyle:updated.shieldStyle||'round'};for(const o of roundParts)o.visible=state.shieldStyle==='round';kite.visible=state.shieldStyle==='kite';riot.visible=state.shieldStyle==='riot';
      for(const [kind,group] of Object.entries(weapons))group.visible=kind===state.weapon;
      off.visible=state.weapon==='dualKatana';shield.visible=state.shield&&!off.visible;return {...state};
    },
    dispose(){if(disposed)return;disposed=true;for(const group of [...Object.values(weapons),shield,off])group.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();},
  };
  api.set();return api;
}
