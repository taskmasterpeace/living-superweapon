import fs from 'node:fs/promises';
import {validateAsset,compileAuthoredMotion} from '../src/engine/character-authoring.js';
import {CHARACTER_BONES} from '../src/data/character-bones.js';
const filename=process.argv[2];
if(!filename){console.error('Usage: node tools/validate-character-asset.mjs path/to/asset.json');process.exit(1);}
try{const asset=validateAsset(JSON.parse(await fs.readFile(filename,'utf8')),CHARACTER_BONES);if(asset.motion&&!compileAuthoredMotion(asset).validate())throw Error('Invalid compiled clip');console.log(JSON.stringify({ok:true,name:asset.name,parts:asset.parts.length,keys:asset.motion?.keys.length||0,status:asset.motion?'candidate':'asset',rig:asset.rig}));}catch(e){console.error(e.message);process.exit(1);}
