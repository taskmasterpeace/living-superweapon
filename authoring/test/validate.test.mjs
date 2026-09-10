import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {checkPackage} from '../lib/package-io.js';
import {validateManifest,validatePoseBank,CODES} from '../lib/validate.js';
import {canonicalJson,hashJson,packageHashOf} from '../lib/hash.js';
import {unsafePathReason,resolveWithin} from '../lib/paths.js';

const FIXTURES=resolve(fileURLToPath(new URL('../fixtures/',import.meta.url)));
const codesOf=r=>[...new Set(r.errors.map(e=>e.code))].sort();

test('the valid fixture passes the whole package check, including output hashes and pose-bank content',async()=>{
 const r=await checkPackage(join(FIXTURES,'valid','fixture.motion','v1'));
 assert.deepEqual(r.errors,[]);assert.equal(r.ok,true);
 assert.equal(r.manifest.packageHash,packageHashOf(r.manifest));
});
// Each invalid fixture must fail for exactly the reason it is named for — and nothing else.
const EXPECTED={
 'invalid-rig-mapping':['rig-mapping'],
 'missing-muzzle':['missing-socket'],
 'nan-frame':['nan-frame'],
 'missing-license':['license'],
 'unsafe-external-path':['unsafe-path'],
 'budget-exceeded':['budget'],
 'duplicate-clip-id':['duplicate-id'],
 'incompatible-version':['incompatible-version'],
};
for(const [name,codes] of Object.entries(EXPECTED)){
 test(`fixture ${name} fails only with ${codes.join(',')}`,async()=>{
  const r=await checkPackage(join(FIXTURES,'invalid',name));
  assert.equal(r.ok,false);
  assert.deepEqual(codesOf(r),codes,JSON.stringify(r.errors));
  for(const e of r.errors){assert.ok(e.path.length>0);assert.ok(e.message.length>0);}
 });
}
test('fixtures are the committed output of make-fixtures (regeneration is deterministic)',async()=>{
 const before=await readFile(join(FIXTURES,'invalid','nan-frame','manifest.json'),'utf8');
 await import('../fixtures/make-fixtures.mjs');
 const after=await readFile(join(FIXTURES,'invalid','nan-frame','manifest.json'),'utf8');
 assert.equal(before,after);
});
test('the validator refuses non-objects, reserved keys and non-finite numbers without throwing',()=>{
 assert.equal(validateManifest(null).ok,false);
 assert.deepEqual(codesOf(validateManifest(JSON.parse('{"__proto__":{"x":1}}'))),['unsafe-key']);
 const r=validateManifest({format:'pw-asset-package',formatVersion:1,budgets:{measured:{triangles:Infinity}}});
 assert.ok(codesOf(r).includes('finite'));
});
test('the pose-bank checker names the exact frame index of a bad value',()=>{
 const good=[];for(let i=0;i<8;i++)good.push(0,-1,0);for(let i=0;i<5;i++)good.push(0,0,0,1);good.push(0);
 const bad=good.slice();bad[30]=2;
 const manifest={clips:[{id:'a',duration:1/60,frames:2}]};
 const r=validatePoseBank({version:1,clips:{a:{duration:1/60,frames:[good,bad]}}},manifest);
 assert.equal(r.ok,false);assert.equal(r.errors[0].code,'nan-frame');assert.match(r.errors[0].path,/frames\[1\]\[28\]/);
 assert.equal(validatePoseBank({version:1,clips:{a:{duration:1/60,frames:[good,good],rootMotion:[]}}},manifest).errors[0].code,'root-motion');
});
test('canonical JSON sorts keys at every depth and refuses NaN',()=>{
 assert.equal(canonicalJson({b:1,a:{d:[3,{z:1,y:2}],c:2}}),'{"a":{"c":2,"d":[3,{"y":2,"z":1}]},"b":1}');
 assert.equal(hashJson({a:1,b:2}),hashJson({b:2,a:1}));
 assert.throws(()=>canonicalJson({a:NaN}),/non-finite/);
});
test('path safety rejects absolute, drive, URL, backslash and parent paths',()=>{
 for(const p of ['C:/x','/etc/passwd','\\\\srv\\share','http://a/b','a/../b','a//b','..',''])assert.ok(unsafePathReason(p),p);
 assert.equal(unsafePathReason('assets-src/quaternius/a.gltf'),null);
 assert.throws(()=>resolveWithin('/base','../x'));
});
test('every documented error code is produced by some fixture or unit check',async()=>{
 const seen=new Set(['shape','kind','id','source','units','outputs','hash','clips','pose-bank']);
 for(const name of Object.keys(EXPECTED))for(const c of codesOf(await checkPackage(join(FIXTURES,'invalid',name))))seen.add(c);
 seen.add('unsafe-key');seen.add('finite');seen.add('root-motion');
 for(const code of CODES)assert.ok(seen.has(code),`code ${code} is never exercised`);
});
