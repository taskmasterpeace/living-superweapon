const fs=require('fs');let p='tools/build-modular-character.py',s=fs.readFileSync(p,'utf8');const marker='# Ragged lower shirt tabs;';const code=`# Lab coat: open chest, split knee-length tails and fitted sleeves. No cloth solver.
for side in ['L','R']:
 s=1 if side=='L' else -1
 mesh('Coat.front.'+side,[(s*.055,-.122,1.46),(s*.21,-.122,1.44),(s*.16,-.12,1.04),(s*.045,-.12,1.04)],[(0,1,2,3)],'DEF-spine.003','suit','coat')
 mesh('Coat.lapel.'+side,[(s*.05,-.139,1.47),(s*.14,-.139,1.40),(s*.055,-.139,1.30)],[(0,1,2)],'DEF-spine.003','suit','coat')
 mesh('Coat.side.'+side,[(s*.21,-.122,1.44),(s*.21,.122,1.44),(s*.16,.12,1.04),(s*.16,-.12,1.04)],[(0,1,2,3)],'DEF-spine.003','suit','coat')
 for label,y in [('front',-.14),('back',.14)]:
  mesh('Coat.tail.'+label+'.'+side,[(s*.025,y,1.05),(s*.17,y,1.05),(s*.205,y*1.15,.55),(s*.025,y*1.15,.55)],[(0,1,2,3)],'DEF-thigh.'+side,'suit','coat')
 mesh('Coat.tail.side.'+side,[(s*.17,-.14,1.05),(s*.17,.14,1.05),(s*.205,.161,.55),(s*.205,-.161,.55)],[(0,1,2,3)],'DEF-thigh.'+side,'suit','coat')
 shaped_segment('Coat.upperSleeve.'+side,'DEF-upper_arm.'+side,[(0,.092,.094),(.5,.098,.099),(1,.065,.068)],'suit','coat')
 shaped_segment('Coat.lowerSleeve.'+side,'DEF-forearm.'+side,[(0,.069,.072),(.45,.068,.07),(1,.051,.054)],'suit','coat')
mesh('Coat.back',[(-.21,.122,1.44),(.21,.122,1.44),(.16,.12,1.04),(-.16,.12,1.04)],[(0,1,2,3)],'DEF-spine.003','suit','coat')
box('Coat.badge.border',(.13,-.137,1.34),(.07,.008,.076),'DEF-spine.003','dark','coat',0)
box('Coat.badge.card',(.13,-.144,1.34),(.053,.006,.059),'DEF-spine.003','suit','coat',0)
box('Coat.pen',(.14,-.15,1.385),(.012,.009,.044),'DEF-spine.003','accent','coat',0)
`;s=s.replace(marker,code+'\n'+marker);fs.writeFileSync(p,s);
p='src/engine/modular-costume.js';s=fs.readFileSync(p,'utf8');s=s.replace('export const MODULAR_RECIPES={',`export const MODULAR_RECIPES={
 scientist:{name:'Scientist · laboratory coat',frame:'hero',anatomy:'male',hair:'swept',hairColor:'#493322',skin:'#c79c72',primary:'#30383c',secondary:'#bb2929',trim:'#252b2e',emblemColor:'#eee9df',emblem:'none',coat:true,glasses:true,cape:false,armor:false,backpack:false,shoulders:false,gauntlets:false,knees:false,belt:false,gloves:'bare',footwear:'shoes',muscle:.85},
 striped:{name:'Striped explorer · fabric example',frame:'hero',hair:'swept',skin:'#c79c72',primary:'#e8e6d9',secondary:'#c62b31',trim:'#263443',pattern:'stripes',emblem:'none',cape:false,armor:false,shoulders:false,gauntlets:false,knees:false,belt:false,gloves:'bare',muscle:.85},`);s=s.replace("pattern:['solid','gilt','custom']","pattern:['solid','gilt','stripes','pinstripe','custom']");s=s.replace("['wristbands','tornClothes'","['coat','wristbands','tornClothes'");s=s.replace("if(slot==='cape')","if(slot==='coat')m.visible=!!r.coat;\n  if(r.coat&&['arms','deltoids','forearms','gauntlets','sleeves','robe','collar','shoulders'].includes(slot))m.visible=false;\n  if(slot==='cape')"); // exclusions must happen AFTER other visibility rules
s=s.replace("const colors={", "if(r.coat&&['arms','deltoids','forearms','gauntlets','sleeves','robe','collar','shoulders'].includes(slot))m.visible=false;\n  const colors={");s=s.replace("if(slot==='boxingGloves')m.material.color.set(r.gloveColor);","if(slot==='boxingGloves')m.material.color.set(r.gloveColor);\n  if(slot==='coat'&&m.material.name==='suit')m.material.color.set('#eeeae2');");s=s.replace("m.material.name==='suit'&&r.pattern!=='solid'","slot!=='coat'&&m.material.name==='suit'&&r.pattern!=='solid'");fs.writeFileSync(p,s);
p='src/engine/modular-character.js';s=fs.readFileSync(p,'utf8').replace("MODULAR_SLOTS=['wristbands'","MODULAR_SLOTS=['coat','wristbands'");fs.writeFileSync(p,s);
p='src/tool/character-foundation.js';s=fs.readFileSync(p,'utf8').replace("['wristbands','tornClothes'","['coat','wristbands','tornClothes'");fs.writeFileSync(p,s);
p='character-foundation.html';s=fs.readFileSync(p,'utf8').replace('<option value="gilt">','<option value="stripes">Horizontal stripes</option><option value="pinstripe">Business pinstripe</option><option value="gilt">').replace('<label><input id="tornClothes"','<label><input id="coat" type="checkbox">Lab coat</label><label><input id="tornClothes"');fs.writeFileSync(p,s);
p='src/engine/modular-surfaces.js';s=fs.readFileSync(p,'utf8').replace("}else{\n  const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle=recipe.primary;",` }else if(recipe.pattern==='stripes'||recipe.pattern==='pinstripe'){
  const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle=recipe.primary;x.fillRect(0,0,256,256);x.fillStyle=recipe.secondary;
  for(let i=0;i<256;i+=64)recipe.pattern==='stripes'?x.fillRect(0,i,256,32):x.fillRect(i,0,3,256);t=new T.CanvasTexture(c);
 }else{
  const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle=recipe.primary;`);fs.writeFileSync(p,s);
