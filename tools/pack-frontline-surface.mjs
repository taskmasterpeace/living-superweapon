import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url);
// Passed explicitly so this build-only dependency does not enter game runtime.
const sharp=require(path.resolve(process.argv[2]));
const surfaces=[['rock_face','rock_face_diff_2k.jpg','sandstone-albedo.webp',2048],['rock_face','rock_face_nor_gl_2k.jpg','sandstone-normal.webp',2048],['rock_face','rock_face_rough_2k.jpg','sandstone-rough.webp',1024],['aerial_ground_rock','aerial_ground_rock_diff_2k.jpg','gravel-albedo.webp',2048],['aerial_ground_rock','aerial_ground_rock_nor_gl_2k.jpg','gravel-normal.webp',1024]];
for(const [id,src,out,size]of surfaces){await sharp(`assets-src/polyhaven/${id}/${src}`).resize(size,size).webp({quality:88}).toFile(`public/textures/frontline/${out}`);console.log(out);}
