import test from 'node:test';
import assert from 'node:assert/strict';
import {transportShellPieces} from '../src/engine/transport-shell.js';
test('thin wall subdivision preserves extent and limits turned doorway intrusion',()=>{
 const wall={center:[10.5,13.5,0],half:[.5,8,20]},pieces=transportShellPieces([wall]);
 assert.equal(pieces.length,10);
 assert.equal(pieces[0].center[2]-pieces[0].half[2],-20);
 assert.equal(pieces.at(-1).center[2]+pieces.at(-1).half[2],20);
 for(const p of pieces)assert.ok(p.half[2]<=2);
 const floor={center:[0,5,0],half:[11,.7,20]};assert.deepEqual(transportShellPieces([floor]),[floor]);
});
