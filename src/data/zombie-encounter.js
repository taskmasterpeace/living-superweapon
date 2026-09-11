// Versioned procedural encounter recipe. Shared native rig, AI, melee and
// ragdoll author the runtime; no copied animation/asset dependency is required.
export const ZOMBIE_ENCOUNTER=Object.freeze({version:1,waves:Object.freeze([4,6,8]),recovery:5,spawnRadius:48,maxAlive:8});
export function zombieDefinition(wave=0){
 return {id:'desert-zombie',name:wave>1?'RAVENOUS':'SHAMBLER',title:'Outpost outbreak',role:'Undead',origin:'altered',
  colors:{primary:'#535442',secondary:'#292b25',accent:'#bbb28a',skin:'#969c78'},
  model:{body:'procedural',costume:'tactical',hair:'cropped',hairColor:'#46483d',emblem:false},build:{},frame:{bulk:.88,scale:1,broad:1},
  hp:38+Math.min(2,wave)*12,ki:50,speed:21+Math.min(2,wave)*3,strength:2,rank:6,threat:'Low',flightTier:0,
  overdrive:0,energyInfinite:false,meleeTiers:2,guardType:'block',items:[],psyche:false,
  ai:{style:'rusher',range:6,aggro:.95,fly:0,meleePolicy:'ability'},
  abilities:{lmb:{type:'melee',name:'Raking blow',cost:0,cd:.95,damage:6+Math.min(2,wave),range:10,arc:.75,lunge:16,knock:8,launch:0,color:'#c5baa0'}}};
}
