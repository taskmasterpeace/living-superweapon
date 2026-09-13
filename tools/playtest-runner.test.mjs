import test from 'node:test';import assert from 'node:assert/strict';
import {selectScenario,validateResult,scenarios,parseRunArgs} from './playtest/scenarios.mjs';
import {access} from 'node:fs/promises';
test('registry resolves only explicit scenarios backed by existing scripts',async()=>{for(const id of Object.keys(scenarios))await access(new URL(selectScenario(id).script,import.meta.url));for(const id of ['../other','toString','constructor',''])assert.throws(()=>selectScenario(id),/Unknown scenario/);});
test('missing or failed output never becomes a successful acceptance run',()=>{for(const value of [null,{}, {passed:false},{passed:true,errors:['runtime error']}])assert.throws(()=>validateResult(value));assert.equal(validateResult({passed:true,errors:[]}).passed,true);});

test('scheme selection preserves scenario behavior and alias defaults',()=>{
 const run=parseRunArgs(['--scenario','melee-grab-guard','--scheme','touch']);
 assert.deepEqual(run.config,{attack:'grab',scheme:'touch'});
 assert.equal(parseRunArgs(['--scenario','gamepad-guard']).config.scheme,'pad');
 assert.equal(parseRunArgs(['--scenario','melee-guard']).config.scheme,'kbm');
 assert.equal(scenarios['melee-grab-guard'].config.scheme,undefined);
});
test('unsupported input paths and malformed CLI fail before starting a browser',()=>{
 for(const args of [[],['--scenario'],['--scenario','melee-guard','--other','pad'],['--scenario','melee-guard','--scheme','bogus'],['--scenario','webline-chain','--scheme','touch'],['--scenario','melee-guard','--scheme','pad','extra']])assert.throws(()=>parseRunArgs(args));
});
