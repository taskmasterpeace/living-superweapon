const fs=require('fs');let p='src/tool/character-foundation.js';let s=fs.readFileSync(p,'utf8').replace("for(const key of ['beard',","for(const key of ['skirt','beard',");fs.writeFileSync(p,s);
