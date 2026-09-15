const fs=require('fs');let p='src/engine/modular-costume.js',s=fs.readFileSync(p,'utf8').replaceAll("['cape','robe'","['tornClothes','cape','robe'").replace("['robe','sleeves','collar','glasses']","['tornClothes','robe','sleeves','collar','glasses']").replaceAll("name:'Infected ·","tornClothes:true,name:'Infected ·");fs.writeFileSync(p,s);
p='src/engine/modular-character.js';s=fs.readFileSync(p,'utf8').replace("['robe'","['tornClothes','robe'");fs.writeFileSync(p,s);
p='character-foundation.html';s=fs.readFileSync(p,'utf8').replace('<input id="robe"','<input id="tornClothes" type="checkbox">Torn shirt</label><label><input id="robe"');fs.writeFileSync(p,s);
p='src/tool/character-foundation.js';s=fs.readFileSync(p,'utf8').replaceAll("['robe'","['tornClothes','robe'");fs.writeFileSync(p,s);
p='src/tool/creature-foundation.js';s=fs.readFileSync(p,'utf8').replace('metersToUnits(1.8288)/1.795','metersToUnits(1.8288)/(1.795-.022)').replace('soldier.actor.position.x=-7;','soldier.actor.position.set(-7,-.022*soldier.actor.scale.y,0);');fs.writeFileSync(p,s);
p='tools/modular-character.test.mjs';s=fs.readFileSync(p,'utf8').replace('count<=36','count<=42');fs.writeFileSync(p,s);
