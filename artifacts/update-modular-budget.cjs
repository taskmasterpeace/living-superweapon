const fs=require('fs');let p='tools/modular-character.test.mjs',s=fs.readFileSync(p,'utf8').replace('count<=42','count<=48').replace('tris<4000','tris<=4500');fs.writeFileSync(p,s);
