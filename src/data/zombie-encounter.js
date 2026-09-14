// Versioned procedural encounter recipe. Shared native rig, AI, melee and
// ragdoll author the runtime; no copied animation/asset dependency is required.
export const ZOMBIE_ENCOUNTER=Object.freeze({version:1,waves:Object.freeze([4,6,8]),recovery:5,spawnRadius:48,maxAlive:8});
export function zombieDefinition(wave=0,{sprinter=false}={}){
 return {zombieProfile:sprinter?'sprinter':'common',id:'desert-zombie',name:sprinter?'SPRINTER':'SHAMBLER',title:'Outpost outbreak',role:'Undead',origin:'altered',
  colors:{primary:'#535442',secondary:'#292b25',accent:'#bbb28a',skin:'#969c78'},
  model:{body:'faceted-v1',costume:'tactical',hair:'cropped',hairColor:'#46483d',emblem:false},build:{},frame:{bulk:.88,scale:1,broad:1},
  hp:sprinter?50:100,ki:50,speed:sprinter?42:21,strength:2,rank:6,threat:'Low',flightTier:0,
  overdrive:0,energyInfinite:false,meleeTiers:2,guardType:'block',items:[],psyche:false,vocalFamily:'zombie',
  ai:{style:'rusher',range:6,aggro:.95,fly:0,meleePolicy:'ability'},
  abilities:{lmb:{type:'melee',name:'Raking blow',cost:0,cd:.95,damage:6+Math.min(2,wave),range:10,arc:.75,lunge:16,knock:8,launch:0,color:'#c5baa0'}}};
}
