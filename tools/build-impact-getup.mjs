// Rebuild only the shipped recovery clip; never regenerates the source motion bank.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from 'three';
const bank='public/models/modular-hero/motion-bank.json',output='src/data/impact-getup-clip.json';
const entry=JSON.parse(fs.readFileSync(bank,'utf8')).entries.find(e=>e.take==='LayToIdle');
if(!entry)throw Error('Missing LayToIdle source');
const expected='8cee20ab1bc55130092447e810e26df22dd2803eccc54f52137a7d54d7ab88a8';
if(entry.source.sha256!==expected)throw Error('Source provenance changed; review before rebuilding');
if(fs.existsSync(entry.source.file)&&createHash('sha256').update(fs.readFileSync(entry.source.file)).digest('hex')!==expected)throw Error('Actual source hash mismatch');
const c=T.AnimationClip.parse(entry.clip);
for(const track of c.tracks){const sample=track.createInterpolant(),times=[],values=[];for(let k=0;k<=32;k++){const t=c.duration*k/32;times.push(t);values.push(...sample.evaluate(t));}track.times=new Float32Array(times);track.values=new Float32Array(values);track.optimize();}
const result={source:entry.source,take:entry.take,status:'source-mapped-candidate',rootMotionPolicy:'Visual skeleton only; simulation root untouched',clip:T.AnimationClip.toJSON(c)};
fs.writeFileSync(output,JSON.stringify(result));console.log(output);
