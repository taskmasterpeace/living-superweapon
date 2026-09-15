import fs from 'node:fs';const p='src/tool/animation-page.js';let s=fs.readFileSync(p,'utf8');
s=s.replace("select.value='vega';","select.value='vega';\nconst receiverLabel=document.createElement('label');receiverLabel.textContent='Held character';const receiverSelect=document.createElement('select');receiverSelect.setAttribute('aria-label','Held character');for(const d of ROSTER)receiverSelect.add(new Option(d.name,d.id));receiverSelect.value='merc';receiverLabel.append(receiverSelect);receiverLabel.hidden=true;$('#marker-editor').before(receiverLabel);receiverSelect.onchange=()=>character();");
s=s.replace("ROSTER.find(d=>d.id==='merc')","ROSTER.find(d=>d.id===receiverSelect.value)");
s=s.replace("entry=e;clip=resolveAnimationClip(e.id)","entry=e;receiverLabel.hidden=e.kind!=='procedural';clip=resolveAnimationClip(e.id)");
fs.writeFileSync(p,s);
