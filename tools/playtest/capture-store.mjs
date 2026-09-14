import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
export function captureStorePlugin(){return {name:'local-capture-store',apply:'serve',configureServer(server){
 server.middlewares.use('/__capture',async(req,res,next)=>{
  if(req.method!=='POST')return next();
  const host=req.headers.host,origin=req.headers.origin;
  if(!/^(127\.0\.0\.1|localhost|\[::1\]):\d+$/.test(host||'')||origin!=='http://'+host){res.statusCode=403;res.end();return;}
  try{
   let size=0;const chunks=[];
   for await(const chunk of req){size+=chunk.length;if(size>32*1024*1024)throw Error('Clip exceeds 32 MB');chunks.push(chunk);}
   if(!size||!String(req.headers['content-type']).startsWith('video/webm'))throw Error('Expected WebM');
   const meta=JSON.parse(decodeURIComponent(req.headers['x-capture-metadata']||'%7B%7D'));
   const name='take-'+randomUUID(),dir=resolve(server.config.root,'artifacts/live-capture');await mkdir(dir,{recursive:true});
   await writeFile(resolve(dir,name+'.webm'),Buffer.concat(chunks));await writeFile(resolve(dir,name+'.json'),JSON.stringify(meta,null,2));
   res.setHeader('Content-Type','application/json');res.end(JSON.stringify({path:resolve(dir,name+'.webm')}));
  }catch(e){res.statusCode=400;res.end(String(e.message));}
 });
}};}
