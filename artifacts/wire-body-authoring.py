from pathlib import Path
p=Path('src/tool/character-authoring-panel.js')
s=p.read_text(encoding='utf-8')
s=s.replace('working={};','working={};workingBody=null;')
s=s.replace('keys:[{time:0,pose:capture()}]','keys:[{time:0,pose:capture(),bodyPosition:captureBody()}]')
s=s.replace('keys.push({time,pose:capture()});','const bodyPosition=captureBody();for(const k of keys)if(!k.bodyPosition)k.bodyPosition=[...bodyPosition];keys.push({time,pose:capture(),bodyPosition});')
s=s.replace("$('time').oninput=()=>{time=+$('time').value;playing=false;};", "$('time').oninput=()=>{time=+$('time').value;playing=false;working={};workingBody=null;};")
s=s.replace('actor.updateMatrixWorld(true);rehearsal.update(time,m);', "const bodyPosition=workingBody||sampleBodyPosition(m,time);if(bodyPosition)actor.getObjectByName('DEF-hips').position.fromArray(bodyPosition);$('body-y').value=actor.getObjectByName('DEF-hips').position.y.toFixed(3);actor.updateMatrixWorld(true);rehearsal.update(time,m);")
p.write_text(s,encoding='utf-8')
