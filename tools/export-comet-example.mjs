import {mkdir,writeFile} from 'node:fs/promises';
import {cometCharacter} from '../examples/comet-character.mjs';
const out='artifacts/examples';await mkdir(out,{recursive:true});
await writeFile(`${out}/comet.character.json`,JSON.stringify(cometCharacter(),null,2));
console.log(`Exported ${out}/comet.character.json (no roster/storage changes)`);
