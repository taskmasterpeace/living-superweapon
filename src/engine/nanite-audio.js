// Observe simulation transitions; rendering and audio never advance cell state.
export function updateNaniteAudio(f){
 const previous=f._naniteAudio ||= new Map(),state=f._nanites,live=new Set(),events=new Set();
 if(state&&!state.disposed&&f.state!=='ko')for(const [slot,m] of state.modules){
  if(m.retired||!m.unlocked||!m.deployed)continue;
  live.add(slot);const old=previous.get(slot),broken=m.cells.map(c=>c.broken);
  if(!old||old.epoch!==m.epoch)events.add('nanite-form');
  else for(let i=0;i<broken.length;i++){
   if(broken[i]&&!old.broken[i])events.add('nanite-break');
   if(!broken[i]&&old.broken[i])events.add('nanite-reform');
  }
  previous.set(slot,{epoch:m.epoch,broken});
 }
 for(const slot of previous.keys())if(!live.has(slot))previous.delete(slot);
 for(const id of events)f._game?.audio?.soundLibrary?.play(id,{pos:f.pos});
}
