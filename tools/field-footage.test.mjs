import test from 'node:test';
import assert from 'node:assert/strict';
const api=await import('../src/engine/field-footage.js').catch(()=>({}));
test('footage merges current and previous recordings newest first without duplicates or revoked clips',()=>{
 assert.equal(typeof api.collectFootage,'function');
 const old={frames:['blob:old']},pending={frames:['#pending']},dead={frames:['blob:dead'],_dead:true},fresh={frames:['blob:new']};
 const game={_openingClips:[old],news:{clips:[old,dead,pending,fresh]}};
 assert.deepEqual(api.collectFootage(game),[fresh,pending,old]);
 assert.equal(game.news.clips.length,4,'viewer never takes ownership or prunes recorder');
});
test('playhead clamps seeks, honors source fps, pause, speed and loop',()=>{
 assert.equal(typeof api.FootageTransport,'function');
 const t=new api.FootageTransport();t.select({frames:Array(40).fill('blob:a'),fps:20});
 t.advance(.5);assert.equal(t.frame,10);t.playing=false;t.advance(1);assert.equal(t.frame,10);
 t.seek(100);assert.equal(t.frame,39);t.seek(-1);assert.equal(t.frame,0);
 t.playing=true;t.rate=.5;t.advance(1);assert.equal(t.frame,10);
 t.loop=false;t.seek(38);t.advance(.2);assert.equal(t.frame,39);assert.equal(t.playing,false);
 t.loop=true;t.playing=true;t.advance(.2);assert.equal(t.frame,1);
});
test('pending and invalid footage cannot yield NaN frame/duration',()=>{
 assert.equal(typeof api.FootageTransport,'function');
 const t=new api.FootageTransport();t.select({frames:[],fps:0});t.seek(NaN);t.advance(Infinity);
 assert.equal(t.frame,0);assert.equal(t.duration,0);
 t.select({frames:['#waiting'],fps:NaN});assert.equal(t.duration,1/12);
});
test('match handoff preserves the last nonempty reel and retires only the replaced archive',()=>{
 assert.equal(typeof api.archiveFieldFootage,'function');
 const old={frames:[URL.createObjectURL(new Blob(['old']))]},next={frames:['#pending']};
 const game={_fieldClips:[old],news:{takeClips:()=>[]}};
 api.archiveFieldFootage(game);assert.equal(game._fieldClips[0],old);assert.ok(!old._dead);
 game.news.takeClips=()=>[next];api.archiveFieldFootage(game);
 assert.equal(old._dead,true);assert.equal(old.frames[0],null);assert.equal(game._fieldClips[0],next);
 assert.deepEqual(api.collectFootage(game),[next]);
});
