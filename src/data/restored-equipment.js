// Explicitly admitted owned source packages. Pin identity/hash exactly as the
// authored registry does; arbitrary props cannot masquerade as firearms.
const entries=Object.freeze({
 'prop.reference-weapon-rifle-m16@4':Object.freeze({id:'prop.reference-weapon-rifle-m16',version:4,kind:'prop',dir:'prop.reference-weapon-rifle-m16/v4',packageHash:'8a37f9250fcd2005180dc997cd27fe1bd90abe374fb7ca1e14133e7f3c500391',weaponKind:'rifle',twoHanded:true}),
 'prop.reference-weapon-pistol-1@5':Object.freeze({id:'prop.reference-weapon-pistol-1',version:5,kind:'prop',dir:'prop.reference-weapon-pistol-1/v5',packageHash:'26bbde6e4e66fb6b424973747794c3a551b7d5ed48d522ece0c96e3e4b013145',weaponKind:'pistol',twoHanded:false}),
});
export const restoredEquipmentEntry=ref=>entries[ref]||null;

export function restoredEquipmentMountManifest(manifest,weaponKind){
 const profile=restoredEquipmentEntry(`${manifest.id}@${manifest.version}`);if(!profile)return manifest;
 if(profile.weaponKind!==weaponKind)throw Error('Restored equipment class does not match this weapon.');
 const source=name=>manifest.sockets.find(s=>s.name===name);
 const grip=source('grip-primary'),support=source('grip-support'),muzzle=source('attachment-muzzle');
 if(!grip||!muzzle||profile.twoHanded&&!support)throw Error('Restored firearm lacks its authored grip or muzzle sockets.');
 // Source art is Y-up/Z-forward. Runtime firearm art uses -Y-forward/Z-up.
 // The inverse primary frame rotates source geometry and ALL sockets together
 // by +90° X without rescaling, editing vertices or relocating the muzzle.
 return {...manifest,sockets:[
  {...grip,name:'grip',rotation:[-Math.SQRT1_2,0,0,Math.SQRT1_2]},
  ...(support?[{...support,name:'support'}]:[]),{...muzzle,name:'muzzle'},
 ],equipment:{class:'firearm',hand:'right',twoHanded:profile.twoHanded,
  sourceAdapter:'restored-arsenal-v1',reloadPresentation:'static-source-no-action-parts'}};
}
