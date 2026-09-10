// A portable, original sample kit. It never mutates the shipped roster or storage.
import {freshPicks,buildDef} from '../src/data/creator.js';
import {profileFromDef,resetFlightStyle} from '../src/tool/studio-profile.js';
import {setAttackOverride} from '../src/data/attack-tuning.js';
import {exportCharacter} from '../src/tool/character-package.js';

export function cometCharacter(){
  const picks={...freshPicks(),name:'COMET',title:'The Skybreaker',budget:'unbound',palette:8,flightTier:3,
    attrs:{fgt:6,agl:7,mgt:7,vig:7,int:4,awr:6,res:7},
    slots:{lmb:'wavecannon',rmb:'volley',q:'kibolt',e:'bigbang',f:'powerbuff',r:'finalbeam'}};
  const def=buildDef(picks,'cx_comet_example');
  const profile=resetFlightStyle(profileFromDef(def),'martial');
  profile.model.costume='martial';profile.model.hairColor='#1c2527';
  profile.colors={primary:'#eef0e2',secondary:'#173241',accent:'#ffba43',skin:'#d8a778'};
  for(const [slot,patch] of Object.entries({
    lmb:{remoteDetonate:true,maxCharge:1.4,tipSpeed:150,radius:1.25,dps:48,kiPerSec:18,detonateRadius:14,detonateDamage:42},
    rmb:{damage:5,interval:.11,speed:120,spread:.06},
    q:{remoteDetonate:true,splitCount:4,splitSpread:.4,splitSpeed:105,splitHoming:5,damage:64,radius:1.6,blast:5.5,speed:80,cd:1.1,cost:16},
    e:{remoteDetonate:true,maxCharge:1.8,maxR:4.5,dmgMax:84,maxBlast:24},
    r:{remoteDetonate:true,detonateRadius:24,detonateDamage:75},
  }))profile.attacks=setAttackOverride(profile.attacks,def,slot,patch);
  return exportCharacter({picks,def},profile);
}
