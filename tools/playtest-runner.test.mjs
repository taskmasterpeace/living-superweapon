import test from 'node:test';import assert from 'node:assert/strict';
import {selectScenario,validateResult,scenarios} from './playtest/scenarios.mjs';
import {access} from 'node:fs/promises';
test('registry resolves only explicit scenarios backed by existing scripts',async()=>{for(const id of Object.keys(scenarios))await access(new URL(selectScenario(id).script,import.meta.url));for(const id of ['../other','toString','constructor',''])assert.throws(()=>selectScenario(id),/Unknown scenario/);});
test('missing or failed output never becomes a successful acceptance run',()=>{for(const value of [null,{}, {passed:false},{passed:true,errors:['runtime error']}])assert.throws(()=>validateResult(value));assert.equal(validateResult({passed:true,errors:[]}).passed,true);});
