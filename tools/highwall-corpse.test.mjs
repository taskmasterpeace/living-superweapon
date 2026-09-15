import test from 'node:test';
import assert from 'node:assert/strict';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
test('Highwall damage rewards cannot change character XP or tier',()=>{
 const x=mainCombatFixture();try{const {g,p}=x;g.ms={highwall:true};const xp=p.xp,level=p.level;g.grantXp(p,9999);assert.equal(p.xp,xp);assert.equal(p.level,level);}finally{x.close();}
});
test('Highwall persistent LSW corpse remains knocked out after normal despawn deadline',()=>{
 const {g}=mainCombatFixture();const f=g.player;
 f.noRespawn=true;f.persistCorpse=true;f.hp=0;f._ko();
 f._updateKO(60,g);
 assert.equal(f.state,'ko');assert.equal(f.hp,0);assert.ok(!f._remove);
 f.persistCorpse=false;f._updateKO(.1,g);assert.equal(f._remove,true);
});
