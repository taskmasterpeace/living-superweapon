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
  const backup=await b.exportClip('a');let invalid='';try{await b.importBackup(new Blob(['{"version":999}'],{type:'application/json'}));}catch(e){invalid=e.message;}
  await b.remove('b');const afterDelete=await b.list();const stats=await b.stats();b.close();
  return {persisted,wrong,afterOverwrite,afterEviction,afterAtomic:afterAtomic.map(x=>x.id),renamed,backupType:backup.type,invalid,rejected,afterDelete:afterDelete.map(x=>x.id),stats};
 });
 assert.equal(result.persisted[0].favorite,true);assert.equal(result.wrong.length,0);
 assert.equal(result.afterOverwrite.count,1,'idempotent overwrite does not double count');
 assert.deepEqual(result.afterEviction,['c','a'],'oldest ordinary clip is evicted before a favorite');
 assert.deepEqual(result.afterAtomic,['a'],'failed insertion is atomic and favorite remains');
 assert.equal(result.renamed.title,'renamed');assert.equal(result.backupType,'application/json');
 assert.match(result.invalid,/version/i);assert.match(result.rejected,/budget/i);assert.deepEqual(result.afterDelete,['a']);
 console.log(JSON.stringify({ok:true,tests:10,stats:result.stats}));
}finally{await browser.close();}
