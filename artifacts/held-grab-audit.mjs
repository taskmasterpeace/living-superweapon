import {mainCombatFixture} from '../tools/helpers/main-combat-fixture.mjs';
import {bladeById} from '../src/data/armory.js';
const x=mainCombatFixture({hero:'merc',mode:'powerworld'});
try {
 const {p,g}=x;p._openSky=true;g.equipFrom(p,bladeById('bat'),{primary:true});
 const v=x.foe({z:4});v.invuln=0;v.faceDir(0,-1);
 g.melee.grab(p);for(let i=0;i<20;i++)g.melee.update(p,1/60);
 p._animate(1/60);
 console.log(JSON.stringify({clinch:p.grabState,holdsTarget:p.grabbing===v,weaponVisible:p._gearMesh.visible,weaponHandOccupied:p.parts.armR.children[2].userData.gripOccupied}));
} finally {x.close();}
