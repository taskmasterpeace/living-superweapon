import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {Workbook,SpreadsheetFile,FileBlob} from '@oai/artifact-tool';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const input=path.join(root,'artifacts/combat-workbook-data.json');
const out=path.join(root,'outputs/flight-combat-20260914');
const data=JSON.parse(await fs.readFile(input,'utf8'));
await fs.mkdir(out,{recursive:true});
const priorReviews=new Map(),existing=path.join(out,'PowerWorld-Combat-Production.xlsx');
try{
 await fs.access(existing);
 const prior=await SpreadsheetFile.importXlsx(await FileBlob.load(existing));
 for(const name of ['Decisions','Characters','Motion clips','Asset library','Audio','Equipment']){
  let sheet;try{sheet=prior.worksheets.getItem(name)}catch(error){if(name==='Equipment')continue;throw error}
  if(!sheet&&name==='Equipment')continue;
  const rows=sheet.getUsedRange().values,headers=rows[5],reviewIndex=headers.indexOf('User review'),notesIndex=headers.indexOf('Review notes');
  assert.ok(reviewIndex>=0&&notesIndex>=0,`${name} review columns missing`);
  priorReviews.set(name,new Map(rows.slice(6).filter(r=>r[0]!=null).map(r=>[String(r[0]),{userReview:r[reviewIndex],reviewNotes:r[notesIndex]}])));
 }
}catch(error){if(error.code!=='ENOENT')throw error;}
const wb=Workbook.create(),records=[];
const col=n=>{let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s};
const C=(key,title,width=22,fmt)=>({key,title,width,fmt});
const decisions=data.decisions.map((r,i)=>({id:`D${String(i+1).padStart(2,'0')}`,topic:r[0],decision:r[1],status:r[2],notes:r[3],source:'Creator decisions, 2026-09-14 session'}));
const specs=[
 {name:'Decisions',rows:decisions,height:66,context:'Decisions and scope. Amber cells are editable review fields. Review status does not change runtime behavior.',cols:[C('id','ID',9),C('topic','Topic',24),C('userReview','User review',18),C('reviewNotes','Review notes',35),C('status','Work status',20),C('decision','Decision',62),C('notes','Constraints',60),C('source','Source',47)]},
 {name:'Characters',rows:data.characters,height:58,context:'Birth dates marked Generated default need canon review. Heritage is not authored. Real names and cities are existing project data.',cols:[C('id','Character ID',18),C('name','Name',24),C('userReview','User review',18),C('reviewNotes','Review notes',35),C('realName','Real name',27),C('city','City',28),C('country','Country',17),C('birthDate','Birth date',16,'mm/dd/yy'),C('birthBasis','Birth date basis',39),C('age','Age',10,'0'),C('heritage','Heritage',20),C('origin','Origin',18),...['Fighting','Agility','Strength','Resilience','Intelligence','Perception','Mental'].map(k=>C(k,k,15,'0')),C('hp','Health',12,'0'),C('energy','Energy',12,'0'),C('flightTier','Flight tier',14,'0'),C('flightStyle','Flight style',20),C('collisionMassLb','Collision mass (lb)',23,'#,##0.0'),C('pickupMassLb','Pickup mass (lb)',22,'#,##0.0'),C('liftCapacityLb','Lift capacity (lb)',24,'#,##0'),C('impactTolerance','Impact tolerance (game units)',28,'0.00'),C('massBasis','Mass basis',39),C('source','Source',80)]},
 {name:'Motion clips',rows:data.motions,height:76,context:'Imported clips retain their review and runtime status. A retargeted or previewable clip is not proof of live combat admission.',cols:[C('id','Clip ID',49),C('userReview','User review',18),C('reviewNotes','Review notes',35),C('take','Take',38),C('role','Role',18),C('duration','Duration (s)',17,'0.000'),C('frames','Frames',12,'0'),C('loop','Loops',12),C('status','Import status',28),C('runtime','Runtime use',56),C('blockers','Known blockers',64),C('license','License',38),C('source','Source file',80),C('sha256','SHA-256',74)]},
 {name:'Asset library',rows:data.assets,height:80,context:'Listing verification and local validation are separate. Public listings do not establish account entitlement.',cols:[C('id','Asset ID',11,'0'),C('title','Asset',45),C('userReview','User review',18),C('reviewNotes','Review notes',35),C('publisher','Publisher',25),C('priority','Priority',13),C('kind','Type',20),C('localStatus','Local validation',50),C('verification','Listing verification',57),C('note','Use and conversion notes',77),C('source','Source URL',90)]},
 {name:'Audio',rows:data.audio.map(r=>({...r,source:r.source||'src/data/sound-library.js; src/data/sound-library-recordings.js'})),height:76,context:'Dialogue lines are candidate text unless a real recording is identified. A nonverbal synthesized marker does not speak the line.',cols:[C('id','Audio ID',50),C('label','Label',38),C('userReview','User review',18),C('reviewNotes','Review notes',35),C('family','Family',19),C('event','Trigger event',36),C('wiring','Runtime wiring',24),C('recording','Recording availability',62),C('line','Candidate dialogue',65),C('notes','Notes',77),C('source','Source',78)]},
];
specs.push({name:'Equipment',rows:data.equipment,context:'Base action values precede defenses. Grid dimensions are proposals, not enforced capacity or weight. Blank numbers have no source value.',cols:[C('id','Equipment ID',28),C('name','Name',38),C('userReview','User review',18),C('reviewNotes','Review notes',35),C('category','Category',18),C('subtype','Subtype',20),C('damage','Base damage',18,'0.00'),C('damageType','Damage type',27),C('interval','Action interval (s)',23,'0.000'),C('speed','Projectile speed (units/s)',28,'0.0'),C('magazine','Magazine',17,'0'),C('reserve','Reserve ammo',19,'0'),C('reload','Reload (s)',17,'0.00'),C('charges','Charges',15,'0'),C('columns','Proposed grid columns',27,'0'),C('rows','Proposed grid rows',24,'0'),C('footprintStatus','Footprint status',53),C('weight','Weight basis',33),C('iconStatus','Icon status',18),C('iconId','Icon ID',40),C('voice','Sound key',23),C('role','Equipment role',46),C('notes','Notes',85),C('source','Source',78)]});
for(const spec of specs){
 if(spec.name==='Audio')spec.cols.find(c=>c.key==='event').width=64;
 const sheet=wb.worksheets.add(spec.name);sheet.showGridLines=false;sheet.tabColor=spec.name==='Decisions'?'#44371E':'#B49B5C';
 const last=col(spec.cols.length-1),end=6+spec.rows.length;
 const all=sheet.getRange(`A1:${last}${end}`);all.format.font={name:'Arial',size:10,color:'#222820'};all.format.verticalAlignment='center';all.format.rowHeight=22;
 sheet.getRange('A2').values=[[`Power World ${spec.name.toLowerCase()}`]];sheet.getRange('A2').format.font={name:'Arial',size:16,bold:true,color:'#44371E'};sheet.getRange('A2').format.rowHeight=28;
 sheet.getRange(`A3:${last}3`).format.borders={bottom:{style:'thin',color:'#B49B5C'}};
 sheet.getRange('A3').values=[['As of']];sheet.getRange('B3').values=[[new Date(data.asOf+'T00:00:00Z')]];sheet.getRange('B3').setNumberFormat('mm/dd/yy');sheet.getRange('E3').values=[['Records']];sheet.getRange('F3').formulas=[[`=COUNTA(A7:A${end})`]];
 sheet.getRange('A4').values=[[spec.context]];sheet.getRange('A4').format.font={name:'Arial',size:10,italic:true,color:'#65665D'};
 const header=sheet.getRange(`A6:${last}6`);header.values=[spec.cols.map(c=>c.title)];
 const values=spec.rows.map(r=>spec.cols.map(c=>{const prior=priorReviews.get(spec.name)?.get(String(r.id));if(c.key==='userReview')return prior?.userReview||r.userReview||'Pending';if(c.key==='reviewNotes')return prior?.reviewNotes||'';const v=r[c.key];if(v==null)return null;if(c.key==='birthDate'&&v)return new Date(v+'T00:00:00Z');return typeof v==='string'&&v.startsWith('=')?"'"+v:v}));
 sheet.getRange(`A7:${last}${end}`).values=values;
 const table=sheet.tables.add(`A6:${last}${end}`,true,'PW'+spec.name.replace(/\s/g,''));table.style='TableStyleLight1';table.showFilterButton=true;
 header.format={fill:'#302D23',font:{name:'Arial',size:10,bold:true,color:'#FFFFFF'},horizontalAlignment:'center',verticalAlignment:'center',wrapText:true};header.format.rowHeight=34;
 const body=sheet.getRange(`A7:${last}${end}`);body.format.rowHeight=36;body.format.wrapText=true;body.format.verticalAlignment='center';
 spec.cols.forEach((c,i)=>{const range=sheet.getRange(`${col(i)}1:${col(i)}${end}`);range.format.columnWidth=c.width;if(c.fmt)sheet.getRange(`${col(i)}7:${col(i)}${end}`).setNumberFormat(c.fmt);if(c.fmt)sheet.getRange(`${col(i)}7:${col(i)}${end}`).format.horizontalAlignment='right'});
 body.format.wrapText=true;
 spec.rows.forEach((r,ri)=>{const lines=Math.max(...spec.cols.map(c=>Math.ceil(String(r[c.key]??'').length/(c.width*.98))));sheet.getRange(`A${ri+7}:${last}${ri+7}`).format.rowHeight=Math.max(32,lines*15+10)});
 const reviewIndex=spec.cols.findIndex(c=>c.key==='userReview'),review=sheet.getRange(`${col(reviewIndex)}7:${col(reviewIndex)}${end}`),notes=sheet.getRange(`${col(reviewIndex+1)}7:${col(reviewIndex+1)}${end}`);
 review.format.fill='#FFF0BD';notes.format.fill='#FFF8DF';review.dataValidation={rule:{type:'list',values:['Pending','Approved','Revise','Deferred']}};
 review.conditionalFormats.add('containsText',{text:'Revise',format:{fill:'#FBE2D8',font:{color:'#952D20',bold:true}}});
 sheet.freezePanes.freezeRows(6);sheet.freezePanes.freezeColumns(spec.name==='Motion clips'?1:2);
 records.push({sheet:spec.name,rows:spec.rows.length,columns:spec.cols.length,end,reviewColumn:col(reviewIndex),sourceColumn:col(spec.cols.findIndex(c=>c.key==='source'))});
}
wb.recalculate();
const checks=[];
for(const [i,spec]of specs.entries()){
 const sheet=wb.worksheets.getItem(spec.name),record=records[i];
 assert.equal(sheet.getRange('F3').values[0][0],spec.rows.length,`${spec.name} record count`);
 const actual=sheet.getRange(`A7:${col(spec.cols.length-1)}${record.end}`).values;
 assert.equal(actual.length,spec.rows.length);
 assert.deepEqual(actual.map(r=>r[0]),spec.rows.map(r=>r.id));
 const inspection=await wb.inspect({kind:'table',range:`'${spec.name}'!A6:H9`,include:'values,formulas',tableMaxRows:4,tableMaxCols:8,maxChars:2200});
 checks.push({sheet:spec.name,count:spec.rows.length,inspection:inspection.ndjson});
 const preview=await wb.render({sheetName:spec.name,range:spec.name==='Decisions'?'A1:H11':'A1:H12',scale:1,format:'png'});
 await fs.writeFile(path.join(out,`preview-${spec.name.replace(/ /g,'-').toLowerCase()}.png`),new Uint8Array(await preview.arrayBuffer()));
}
const scan=await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:100},summary:'formula error scan'});
const xlsx=await SpreadsheetFile.exportXlsx(wb);await xlsx.save(path.join(out,'PowerWorld-Combat-Production.xlsx'));
await fs.writeFile(path.join(out,'verification.json'),JSON.stringify({asOf:data.asOf,input,records,checks,formulaScan:scan.ndjson},null,2));
console.log(JSON.stringify({output:path.join(out,'PowerWorld-Combat-Production.xlsx'),records,formulaScan:scan.ndjson}));
