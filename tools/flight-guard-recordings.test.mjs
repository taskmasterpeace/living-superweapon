import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {SoundLibrary} from '../src/core/sound-library.js';
import {SOUND_LIBRARY_SAMPLES} from '../src/data/sound-library-recordings.js';
import {MANIFEST,HOT_SET} from '../src/core/samples.js';

test('flight and guard break map exact imported files with correct loop identity and preload',async()=>{
 const library=new SoundLibrary({storage:null});
 for(const [id,loop]of [['flight',true],['guard-break',false]]){
  const sample=SOUND_LIBRARY_SAMPLES[id];assert.equal(library.source(id),'bundled-recording');
  assert.equal(!!MANIFEST[sample].loop,loop);assert.equal(library.cue(id).loop,loop);assert.ok(HOT_SET.includes(sample));
  const stem='public/audio/'+MANIFEST[sample].f[0],bytes=await fs.readFile(stem+'.mp3'),provenance=JSON.parse(await fs.readFile(stem+'.provenance.json'));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),provenance.sha256);
  if(loop){assert.equal(provenance.manifestEntry.kind,'loop');assert.equal(provenance.manifestEntry.dur,16);assert.equal(provenance.manifestEntry.status,'confirmed');}
  library.setSettings(id,{source:'placeholder'});assert.equal(library.source(id),'synthesized-placeholder');
 }
});
