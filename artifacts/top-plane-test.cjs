const fs=require('fs');let p='tools/modular-image-placements.test.mjs';let s=fs.readFileSync(p,'utf8').replace('assert.equal(marks.length,8)','assert.equal(marks.length,9)');fs.writeFileSync(p,s);
