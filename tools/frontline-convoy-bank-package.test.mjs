import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

test('bank candidate packaging retains every reviewed Float32 byte and the matching exposure provenance',()=>{
 const root='assets-src/frontline-convoy-bank-study/',file=root+'candidate-bed-data.json';
 assert.ok(existsSync(file),'Reviewed bank has not been serialized for candidate integration');
 const data=JSON.parse(readFileSync(file)),raw=readFileSync(root+'native-bed.f32');
 assert.equal(data.segments,256);assert.equal(data.halfSpan,1028);assert.equal(data.encoding,'float32-le');
 assert.deepEqual(Buffer.from(data.encoded,'base64'),raw,'Serialization changes the authoritative physical bed');
 const sha=createHash('sha256').update(raw).digest('hex');assert.equal(data.sha256,sha);
 assert.equal(JSON.parse(readFileSync(root+'material/metadata.json')).groundSHA256,sha);
});
