import test from 'node:test';import assert from 'node:assert/strict';
import {assertSameCheckout,playtestIdentityPlugin} from './playtest/identity.mjs';
const identity={version:1,worktree:'D:/game',revision:'abc',trackedDiffHash:'123'};
test('rejects wrong root/revision/edited code and missing endpoint data',()=>{assert.equal(assertSameCheckout(identity,{...identity}).revision,'abc');for(const value of [null,{}, {...identity,worktree:'D:/other'}, {...identity,revision:'def'}, {...identity,trackedDiffHash:'456'}, {...identity,version:2}])assert.throws(()=>assertSameCheckout(identity,value),/mismatch/);});
test('endpoint is serve-only, loopback-only, read-only and uncached',async()=>{let middleware,reads=0;const plugin=playtestIdentityPlugin(async()=>{reads++;return identity;});assert.equal(plugin.apply,'serve');plugin.configureServer({config:{root:'test'},middlewares:{use(fn){middleware=fn;}}});
 const invoke=async(url,peer='127.0.0.1',method='GET')=>{const r={headers:{},setHeader(k,v){this.headers[k]=v;},end(body){this.body=body;}};await middleware({url,method,socket:{remoteAddress:peer}},r,()=>{r.next=true;});return r;};
 assert.equal((await invoke('/normal')).next,true);assert.equal((await invoke('/__pw_playtest_identity','192.168.1.1')).statusCode,403);assert.equal((await invoke('/__pw_playtest_identity','::1','POST')).statusCode,405);assert.equal(reads,0);
 const response=await invoke('/__pw_playtest_identity');assert.equal(response.headers['Cache-Control'],'no-store');assert.deepEqual(JSON.parse(response.body),identity);assert.equal(reads,1);
});
