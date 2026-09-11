import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const base=process.env.LSW_NEWS_ARCHIVE_URL||'http://127.0.0.1:5182/powerworld.html';
const browser=await chromium.launch({channel:'chromium'}),page=await browser.newPage();
try{
 await page.goto(base);await page.waitForFunction(()=>!!globalThis.indexedDB);
 const result=await page.evaluate(async()=>{
  const {createNewsArchive}=await import('/src/core/news-archive.js');
  const dbName=`news-archive-test-${Date.now()}-${Math.random()}`;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1;canvas.getContext('2d').fillRect(0,0,1,1);
  const image=()=>new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  const clip=async(id,createdAt,heroIds=['sol'],title=id)=>({id,matchId:'m1',createdAt,title,tag:'ko',heroIds,favorite:false,fps:12,priority:3,width:1,height:1,slow:true,slowFrom:0,slowTo:1,audio:false,frames:[await image()]});
  const a=createNewsArchive({dbName});await a.setBudget(180);
  await a.put(await clip('a',1));await a.update('a',{favorite:true});a.close();
  const b=createNewsArchive({dbName});
  const persisted=await b.list({heroId:'sol'}),wrong=await b.list({heroId:'vega'});
  await b.put(await clip('a',1,['sol'],'replacement'));const afterOverwrite=await b.stats();
  await b.put(await clip('b',2));await b.put(await clip('c',3));const afterEviction=(await b.list()).map(x=>x.id);
  await b.setBudget(100);
  let rejected='';try{const huge=await clip('huge',3);huge.frames=[new Blob([huge.frames[0],new Uint8Array(2000)],{type:'image/png'})];await b.put(huge);}catch(e){rejected=e.message;}
  const afterAtomic=await b.list();
  await b.update('a',{title:'renamed',favorite:true});const renamed=await b.get('a');
  await b.put(await clip('a',1,['sol'],'stale recorder title'));const retryTitle=(await b.get('a')).title;
  const backup=await b.exportClip('a');let invalid='';try{await b.importBackup(new Blob(['{"version":999}'],{type:'application/json'}));}catch(e){invalid=e.message;}
  let badMetadata='';try{const bad=await clip('meta',4);bad.fps=Infinity;bad.heroIds=Array.from({length:100},(_,i)=>`hero-${i}`);await b.put(bad);}catch(e){badMetadata=e.message;}
  let malformed='';try{const bad=await clip('bad',4);bad.frames=[new Blob(['not png'],{type:'image/png'})];await b.put(bad);}catch(e){malformed=e.message;}
  const bombBytes=new Uint8Array(24);bombBytes.set([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82]);new DataView(bombBytes.buffer).setUint32(16,10000);new DataView(bombBytes.buffer).setUint32(20,10000);
  let bomb='';try{const bad=await clip('bomb',5);bad.width=bad.height=10000;bad.frames=[new Blob([bombBytes],{type:'image/png'})];await b.put(bad);}catch(e){bomb=e.message;}
  await b.remove('a');const deletedGet=await b.get('a'),afterDelete=await b.list(),stats=await b.stats();b.close();
  return {persisted,wrong,afterOverwrite,afterEviction,afterAtomic:afterAtomic.map(x=>x.id),renamed,retryTitle,backupType:backup.type,invalid,rejected,badMetadata,malformed,bomb,deletedGet,afterDelete:afterDelete.map(x=>x.id),stats};
 });
 assert.equal(result.persisted[0].favorite,true);assert.equal(result.wrong.length,0);
 assert.equal(result.afterOverwrite.count,1,'idempotent overwrite does not double count');
 assert.deepEqual(result.afterEviction,['c','a'],'oldest ordinary clip is evicted before a favorite');
 assert.deepEqual(result.afterAtomic,['a'],'failed insertion is atomic and favorite remains');
 assert.equal(result.renamed.title,'renamed');assert.equal(result.retryTitle,'renamed','idempotent recorder retry preserves a user rename');assert.equal(result.backupType,'application/json');
 assert.match(result.badMetadata,/fps|hero/i);
 assert.match(result.invalid,/version/i);assert.match(result.rejected,/budget/i);assert.match(result.malformed,/header/i);assert.match(result.bomb,/dimension|pixel/i);
 assert.equal(result.deletedGet,null,'deleting the surviving record removes metadata and media');assert.deepEqual(result.afterDelete,[]);
 console.log(JSON.stringify({ok:true,tests:15,stats:result.stats}));
}finally{await browser.close();}
