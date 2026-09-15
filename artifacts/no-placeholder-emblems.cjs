const fs=require('fs');let p='src/data/hero-signature-recipes.js';let s=fs.readFileSync(p,'utf8').replace("emblem:'sig-'+d.id","emblem:'none'");fs.writeFileSync(p,s);
