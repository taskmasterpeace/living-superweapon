import {readFile} from 'node:fs/promises';
import {validateAnimationClip} from '../src/data/animation-catalog.js';
const [path,category]=process.argv.slice(2);
try{
 if(!path||!['Melee','Locomotion','Jump and landing'].includes(category))throw Error('Usage: node tools/validate-animation-bank.mjs <bank.json> "Melee|Locomotion|Jump and landing"');
 const bank=JSON.parse(await readFile(path,'utf8'));
 if(!bank?.clips||Array.isArray(bank.clips)||typeof bank.clips!=='object'||!Object.keys(bank.clips).length)throw Error('Bank must contain a non-empty clips object');
 const clips=Object.entries(bank.clips).map(([id,clip])=>({id,issues:clip&&typeof clip==='object'?validateAnimationClip(clip,category):['invalid-clip']}));
 const valid=clips.every(c=>!c.issues.length);
 console.log(JSON.stringify({path,category,valid,clips,note:'Data validation only. Review complete motion, attachments, contacts and native gameplay before assigning.'},null,2));
 if(!valid)process.exitCode=1;
}catch(e){console.error(e.message);process.exitCode=1;}
