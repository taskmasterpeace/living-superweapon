// Original progression example: pure portable data, never auto-installed.
import {freshPicks,buildDef} from '../src/data/creator.js';
import {profileFromDef,resetFlightStyle} from '../src/tool/studio-profile.js';
import {setAttackOverride} from '../src/data/attack-tuning.js';
import {exportCharacter} from '../src/tool/character-package.js';

export function helionCharacter(){
 const picks={...freshPicks(),name:'HELION',title:'The Rising Sun',budget:'unbound',palette:8,flightTier:3,
  attrs:{fgt:6,agl:7,mgt:7,vig:6,int:4,awr:6,res:8},
  slots:{lmb:'wavecannon',rmb:'volley',q:'kibolt',e:'bigbang',f:'powerbuff',r:'finalbeam'}};
 const def=buildDef(picks,'cx_helion_example'),profile=resetFlightStyle(profileFromDef(def),'martial');
 profile.model.costume='fitted';profile.model.hairColor='#202b31';
 profile.colors={primary:'#24424c',secondary:'#b77642',accent:'#ffc85a',skin:'#d8a778'};
 profile.progression={unlocks:{q:4,r:7},forms:{
  4:{name:'Ignition',model:{costume:'martial',flightStyle:'hero',hairColor:'#edc365'},frame:{scale:1.04},colors:{primary:'#e8c478',secondary:'#294752',accent:'#ffd57c'}},
  7:{name:'Corona',model:{costume:'plated',flightStyle:'twin',hairColor:'#f5dfa2'},frame:{scale:1.08,bulk:1.12},colors:{primary:'#f0e4c5',secondary:'#a76432',accent:'#ffe7ab'}},
  10:{name:'White Star',model:{costume:'fitted',flightStyle:'thruster',hairColor:'#fff4df'},frame:{scale:1.12},colors:{primary:'#f5eee0',secondary:'#2a4652',accent:'#fff0c7'}},
 }};
 for(const [slot,patch] of Object.entries({
  lmb:{maxCharge:1.4,tipSpeed:150,radius:1.25,dps:48,kiPerSec:18,interceptBullets:true,interceptKi:30},
  rmb:{damage:5,interval:.11,speed:120,spread:.06},
  q:{damage:64,radius:1.6,blast:5.5,speed:100,cd:1.1,cost:16,collisionPriority:2},
  e:{maxCharge:1.8,maxR:4.5,dmgMax:84,maxBlast:24},
 }))profile.attacks=setAttackOverride(profile.attacks,def,slot,patch);
 return exportCharacter({picks,def},profile);
}
