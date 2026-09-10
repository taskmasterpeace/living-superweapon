import test from 'node:test';
import assert from 'node:assert/strict';
import {broadcastPackage,importBroadcastProfile,saveBroadcastProfile,loadBroadcastProfile} from '../src/data/broadcast-profile.js';
test('project camera export roundtrip preserves direction and rejects unrelated character packages',()=>{
 assert.deepEqual(importBroadcastProfile(broadcastPackage({crashZoom:.5,handheld:.2,shotHold:2})),{crashZoom:.5,handheld:.2,shotHold:2});
 assert.throws(()=>importBroadcastProfile({version:1,heroId:'sol'}));
 assert.throws(()=>importBroadcastProfile({format:'lsw-broadcast-camera',version:1,camera:{crashZoom:NaN}}));
});
test('camera settings survive project save/load without a character profile',()=>{
 const values=new Map(),storage={setItem:(k,v)=>values.set(k,v),getItem:k=>values.get(k)};
 saveBroadcastProfile({crashZoom:.1,handheld:.8,shotHold:1.5},storage);
 assert.deepEqual(loadBroadcastProfile(storage),{crashZoom:.1,handheld:.8,shotHold:1.5});
 assert.throws(()=>saveBroadcastProfile({}, {setItem(){throw Error('quota');}}),/quota/);
});
