// Original, proposed military roster additions. Same ability, resource and AI
// rules as every other fighter; equipment does not grant superhero physiology.
export const MILITARY_ROSTER = [
 {
  id:'breach',name:'BREACH',title:'Entry Team',origin:'skilled',role:'Military / Shield Breacher',art:'cqc',archetype:'soldier',
  colors:{primary:'#596c51',secondary:'#29392f',accent:'#e5b654',skin:'#8c6042'},
  model:{costume:'tactical',flightStyle:'thruster'},build:{helmet:1,visor:1,pauldron:1,gaunt:1,weaponR:'shotgun',shield:1},
  hp:135,ki:100,speed:30,strength:4,rank:24,threat:'Low',flightTier:0,guardStrong:true,guardType:'block',meleeTiers:2,
  ai:{style:'zoner',range:25,aggro:.55,fly:0},evade:{kind:'dash',name:'Entry Roll'},
  items:[{kind:'flashbang',name:'Breach Flash',cd:12,charges:2}],
  blurb:'[PROPOSED] An armored entry specialist. Flechettes control close range, a concussive launcher opens space, and the shield holds a frontal line. Flank or grab the shield; make the shotgun chase you.',
  sig:['LMB Breach Shotgun','RMB Concussion Launcher','C frontal shield · G clinch / throw','X two flashbangs per life'],
  abilities:{
   lmb:{type:'rifle',weapon:'shotgun',voice:'shotgun12',name:'Breach Shotgun',gear:true,cost:8,interval:.78,damage:7,pellets:7,speed:155,radius:.5,blast:1.5,spread:.15,recoil:5,color:'#efc66d',color2:'#fff0c6'},
   rmb:{type:'projectile',name:'Concussion Launcher',gear:true,cost:14,cd:1.5,damage:23,speed:85,radius:1.1,blast:12,grav:8,shock:true,canister:true,color:'#8c9e70',color2:'#efc66d'},
   q:{type:'melee',name:'Shield Check',gear:true,cost:8,cd:1.2,damage:14,range:9,arc:.85,lunge:26,knock:37,launch:3,color:'#efc66d'},
   e:{type:'mine',name:'Entry Charge',gear:true,cost:14,cd:3,damage:25,blast:12,trigger:8,duration:20,color:'#efc66d'},
   f:{type:'buff',name:'Field Dressing',gear:true,cost:20,cd:20,mult:1,dur:3,heal:26,color:'#9ec58b'},
   shift:{type:'dash',name:'Entry Roll',cost:5,cd:.8,power:84,iframes:.23,color:'#efc66d'},
   r:{type:'projectile',name:'Demolition Round',gear:true,cost:30,cd:12,damage:42,speed:75,radius:1.4,blast:18,shock:true,canister:true,color:'#e69c48',color2:'#ffe3aa'},
  },
 },
 {
  id:'recon',name:'RECON',title:'Long Sight',origin:'skilled',role:'Military / Rifle Scout',art:'cqc',archetype:'soldier',
  colors:{primary:'#576d79',secondary:'#24383f',accent:'#83cbd4',skin:'#bb8d68'},
  model:{costume:'tactical',flightStyle:'thruster',equipment:'soldier'},build:{helmet:1,visor:1,collar:1,weaponR:'rifle',weaponL:'pistol'},
  hp:110,ki:115,speed:36,strength:3,rank:23,threat:'Low',flightTier:0,guardType:'block',meleeTiers:2,
  ai:{style:'zoner',range:58,aggro:.5,fly:0},evade:{kind:'dash',name:'Scout Roll'},
  items:[{kind:'jetcell',name:'Limited Jump Jets',cd:18,dur:4,charges:2}],
  blurb:'[PROPOSED] A mobile rifle scout. Fast blaster fire, a charged sidearm and a deliberate marksman shot reward clean aim. Jump jets buy brief altitude, not permanent flight; a close fighter can overwhelm the light armor.',
  sig:['1 Scout Blaster · 3 Scoped Marksman Rifle','Scoped rifle: hold RMB aim · LMB fire · R reload','G grenade · C crouch · Z prone','Q two short jump-jet burns'],
  abilities:{
   lmb:{type:'rifle',weapon:'rifle',voice:'ar556',name:'Scout Blaster',gear:true,cost:2,interval:.13,damage:6,speed:205,radius:.45,blast:1.5,spread:.03,recoil:1.4,color:'#ff7650',color2:'#ffe6c0'},
   rmb:{type:'charge',name:'Charged Sidearm',gear:true,cost:4,cd:.65,kiPerSec:9,maxCharge:1.3,minR:.55,maxR:1.7,dmgMin:10,dmgMax:32,maxBlast:7,speedMin:130,speedMax:180,chargePower:1.7,color:'#83cbd4',color2:'#efffff'},
   q:{type:'rifle',weapon:'rifle',voice:'sniper762',name:'Scoped Marksman Rifle',gear:true,cost:0,magazine:5,reserveAmmo:30,reloadTime:2.6,scopeZoom:4,life:3,interval:1.2,damage:31,speed:320,radius:.45,blast:0,spread:.0015,recoil:3.6,color:'#efc66d',color2:'#fff1cb'},
   e:{type:'projectile',name:'Scout Grenade',gear:true,cost:10,cd:1.2,damage:23,speed:58,radius:1.1,blast:12,grav:11,shock:true,canister:true,color:'#789690',color2:'#efc66d'},
   f:{type:'buff',name:'Trauma Patch',gear:true,cost:20,cd:20,mult:1,dur:3,heal:22,color:'#9ec58b'},
   shift:{type:'dash',name:'Scout Roll',cost:5,cd:.7,power:92,iframes:.23,color:'#83cbd4'},
   r:{type:'projectile',name:'Anti-Armor Rocket',gear:true,cost:30,cd:12,damage:39,speed:100,radius:1.1,blast:15,shock:true,canister:true,color:'#e69c48',color2:'#ffe3aa'},
  },
 },
];
