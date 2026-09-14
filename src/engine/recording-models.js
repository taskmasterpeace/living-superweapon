import {heroModelOf} from '../data/hero-models.js';
export function recordingModels(actors){
 return actors.filter(Boolean).map(f=>({id:f.def.id,body:f._creatureActor?(f._creatureFamily||'dec52-creature'):heroModelOf(f.def).body,loadedCreature:!!f._creatureActor,loadedModular:!!f._modularCharacter,error:f._modularError||null}));
}
export function requireRecordingModels(actors){
 const models=recordingModels(actors);
 if(models.some(m=>m.body==='faceted-v1'&&!m.loadedModular))throw Error('Modular character still loading or failed. Wait for the current models before recording.');
 return models;
}
