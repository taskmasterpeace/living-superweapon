import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),sharp=require(path.resolve(process.argv[2]));
for(const name of ['geology-mask','rock-pbr']){
 await sharp(`assets-src/frontline-ground-material/${name}.png`).webp({lossless:true,effort:6}).toFile(`public/textures/frontline/${name}.webp`);
 console.log('Packed linear-data '+name);
}
