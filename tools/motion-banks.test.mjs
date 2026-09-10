import test from 'node:test';
import assert from 'node:assert/strict';
import bundled from '../src/data/locomotion-bank.json' with {type:'json'};
import {createMotionBankResolver} from '../src/engine/motion-banks.js';

const packageFixture=()=>({
 manifest:{id:'motion.hero-ual',version:1,clips:[
  {id:'walk',events:[{t:.4,type:'footstep',side:'L'}]},
  {id:'reload',events:[{t:.2,type:'mag-out'},{t:.65,type:'mag-in'}]}
 ]},packageHash:'abc',baseUrl:'https://assets.invalid/motion.hero-ual/v1/'
});
function loader(){return {
 async resolvePackage(ref,kind){assert.equal(ref,'motion.hero-ual@1');assert.equal(kind,'humanoid-motion');return packageFixture();},
 async readOutput(ref,role,options){assert.equal(role,'pose-bank');assert.equal(options.expectedKind,'humanoid-motion');return {version:1,source:{pack:'fixture'},clips:{walk:structuredClone(bundled.clips.walk),reload:{duration:1,frames:bundled.clips.walk.frames.slice(0,3)}}};}
};}

test('explicit role selects a verified package and metadata comes from its manifest',async()=>{
 const banks=createMotionBankResolver(loader());await banks.loadMotionPackage('motion.hero-ual@1');
 const f={def:{model:{assets:{motion:{locomotion:'motion.hero-ual@1'}}}}};
 const found=banks.resolveMotionClip(f,'locomotion','walk');
 assert.equal(found.packageId,'motion.hero-ual@1');assert.equal(found.packageHash,'abc');
 assert.deepEqual(found.metadata.events,[{t:.4,type:'footstep',side:'L'}]);
 assert.deepEqual(found.clip.frames,bundled.clips.walk.frames);
 assert.notEqual(found.metadata,found.clip,'event metadata must not be smuggled in pose frames');
});

test('absent clip or unloaded package uses the bundled role fallback',async()=>{
 const banks=createMotionBankResolver(loader());
 const f={def:{model:{assets:{motion:{locomotion:'motion.hero-ual@1'}}}}};
 const before=banks.resolveMotionClip(f,'locomotion','walk');assert.equal(before.source,'bundled');
 await banks.loadMotionPackage('motion.hero-ual@1');
 const missing=banks.resolveMotionClip(f,'locomotion','sprint');assert.equal(missing.source,'bundled');
 assert.equal(missing.clip,bundled.clips.sprint);
});

test('cached package data is immutable and action state remains fighter-owned',async()=>{
 const banks=createMotionBankResolver(loader());const loaded=await banks.loadMotionPackage('motion.hero-ual@1');
 assert.ok(Object.isFrozen(loaded)&&Object.isFrozen(loaded.clips.walk));
 const a={def:{model:{assets:{motion:{reload:'motion.hero-ual@1'}}}},_firearmReload:{elapsed:.1}};
 const b={def:a.def,_firearmReload:{elapsed:.8}};
 assert.equal(banks.resolveMotionClip(a,'reload','reload').clip,banks.resolveMotionClip(b,'reload','reload').clip);
 assert.notEqual(a._firearmReload,b._firearmReload);
});
