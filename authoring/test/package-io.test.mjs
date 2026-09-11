import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {commitPackage,checkPackage,listPackages,writeCatalog} from '../lib/package-io.js';

const FIXTURE=fileURLToPath(new URL('../fixtures/valid/fixture.motion/v1/',import.meta.url));

test('a failed build never replaces the previous valid package',async()=>{
 const root=await mkdtemp(join(tmpdir(),'pw-pkg-'));
 try{
  const manifest=JSON.parse(await readFile(join(FIXTURE,'manifest.json'),'utf8'));
  const bank=await readFile(join(FIXTURE,'pose-bank.json'));
  const {packageHash,outputs,...partial}=manifest;
  const first=await commitPackage(partial,[{path:'pose-bank.json',role:'pose-bank',bytes:bank}],root);
  assert.equal((await checkPackage(first.dir)).ok,true);
  const good=await readFile(join(first.dir,'manifest.json'),'utf8');
  // Second attempt: same id/version, but a corrupted pose bank.
  const corrupt=Buffer.from(bank.toString('utf8').replace('"frames":[[','"frames":[[NaN,'));
  await assert.rejects(commitPackage(partial,[{path:'pose-bank.json',role:'pose-bank',bytes:corrupt}],root),/previous package untouched/);
  assert.equal(await readFile(join(first.dir,'manifest.json'),'utf8'),good);
  assert.deepEqual((await readdir(join(root,'fixture.motion'))).sort(),['v1']);
  const catalog=await writeCatalog(root);
  assert.equal(catalog.packages.length,1);assert.equal(catalog.ok,true);
  assert.deepEqual(await listPackages(root),[join(root,'fixture.motion','v1')]);
 }finally{await rm(root,{recursive:true,force:true});}
});
