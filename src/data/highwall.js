import {metersToUnits} from '../core/world-units.js';
import {fortificationPlacement} from './fortification-kit.js';

export const HIGHWALL_HEIGHT=metersToUnits(30*.3048);
export const HIGHWALL_BOUNDS=Object.freeze({minX:-324,maxX:324,minZ:-300,maxZ:300});
export const HIGHWALL_PRESETS=Object.freeze([
 {id:'corridor',name:'Corridor fight',description:'Blue: you + 3 soldiers. Red: 4 soldiers. Loop through the western junctions.'},
 {id:'infestation',name:'Infestation',description:'Blue: you + 3 soldiers. Red: 6 shamblers. Bounded groups, no respawns.'},
 {id:'air',name:'Air intrusion',description:'Ground squads plus one opposing flyer. Shelters break overhead sight.'},
 {id:'vehicle',name:'Vehicle crossing',description:'Player-drivable tank in the armored lane. Infantry occupy the crossing. No AI crew.'},
 {id:'intercept',name:'Flyer interception',description:'Separated flyer starts above the eastern field. Clear approach; no invisible ceiling.'},
]);

// Metres are converted once. Every physical panel is shared by renderer and
// navigation/collision; decorations do not silently become extra hitboxes.
export function highwallLayout({gateClosed=true,revision=1}={}){
 const pieces=[],modules=[];
 const place=(id,moduleId,x,z,options={})=>modules.push({id,moduleId,x,z,...options});
 const box=(id,x,z,width,depth,height=HIGHWALL_HEIGHT,bottom=0,kind='wall')=>{
  if(id==='service-gate'){pieces.push({id,x,z,hx:width/2,hz:depth/2,bottom,top:bottom+height,kind});return;}
  const moduleId=kind==='step'?'stairs':kind==='deck'||kind==='roof'?'raised-platform':kind==='post'?'tall-pillar':kind==='cover'?'low-wall':'tall-wall';
  place(id,moduleId,x,z,{span:width,depth,height,y:bottom});
 };
 const wall=(id,x,z,length,axis='z')=>{
  const halves=Math.max(1,Math.round(length/16)),total=halves*16;let along=-total/2,index=0;
  while(along<total/2){const span=Math.min(32,total/2-along),center=along+span/2;
   place(`${id}-${index++}`,span===16?'tall-half-wall':'tall-wall',x+(axis==='x'?center:0),z+(axis==='z'?center:0),{height:HIGHWALL_HEIGHT,rotation:axis==='x'?0:90});
   along+=span;
   if(along<total/2)place(`${id}-support-${index}`,'tall-pillar',x+(axis==='x'?along:0),z+(axis==='z'?along:0),{height:HIGHWALL_HEIGHT+2,rotation:axis==='x'?0:90});
  }
  for(const side of[-1,1])place(`${id}-end-${side}`,'tall-end-cap',x+(axis==='x'?side*total/2:0),z+(axis==='z'?side*total/2:0),{height:HIGHWALL_HEIGHT,rotation:axis==='x'?0:90});
 };
 // Repeated vertical spines, with generous transverse junctions and loops.
 for(const [i,x]of[-286,-208,-130,-52].entries()){
  for(const[j,z]of[-220,-100,20,140].entries()){
   wall(`spine-${i}-${j}`,x,z,72);
  }
 }
 for(const [i,[x,z,len]]of[[-247,-160,78],[-169,-40,78],[-91,80,78],[-247,200,78],[-91,-280,78]].entries())wall(`cross-${i}`,x,z,len,'x');
 // Armored north/south lane and wide crossing: physical screens leave exits.
 for(const z of[-230,-110,110,230])wall(`lane-west-${z}`,-4,z,52);
 for(const z of[-205,125,245])wall(`lane-east-${z}`,132,z,66);
 wall('field-screen',245,80,126,'x');
 // Perimeter and watchtower kit establish a compound, rather than isolated test panels.
 // Tower windows are real openings between authored posts; these have no scripted guards.
 wall('compound-west',-313,0,550);
 wall('compound-north',-164,-286,298,'x');
 wall('compound-south-west',-281,282,64,'x');
 wall('compound-south-east',-80,282,100,'x');
 for(const [i,[x,z]]of[[-302,-274],[-302,270],[-28,-274]].entries()){
  place(`tower-${i}`,'tall-tower',x,z);
 }
 // Roofed links stay outside the armored lane. They protect infantry, not tanks.
 for(const z of[-160,80]){
  box(`roof-${z}`,-28,z,44,34,4,22,'roof');
  for(const dx of[-19,19])for(const dz of[-15,15])box(`post-${z}-${dx}-${dz}`,-28+dx,z+dz,4,4,22,0,'post');
 }
 // Smaller hard cover creates fightable pockets in the open field.
 for(const[i,[x,z,w,d]]of[[180,-185,24,8],[265,-115,8,26],[206,-20,28,8],[62,25,20,8],[82,-40,8,20],[-244,96,18,6],[-166,-220,18,6]].entries())box(`cover-${i}`,x,z,w,d,7,0,'cover');
 // Raised observation post: shallow native step-up treads, open vulnerable sides.
 box('observation-deck',242,234,76,32,10,0,'deck');
 place('post-stairs','stairs',235,265,{span:28,depth:30,height:10});
 box('observation-parapet',242,218,76,4,6,10,'cover');
 place('observation-bunker','bunker',242,234,{span:76,depth:32,height:28,y:10});
 place('bunker-threshold','stairs',242,253,{span:16,depth:6,height:2,y:10});
 // The eastern tower has a continuous physical stair route, not a navigation marker.
 place('tower-access','stairs',-28,-210,{span:16,depth:96,height:48});
 place('yard-barricade','barricade',220,-100);
 place('yard-sandbags','sandbag-barrier',276,-190);
 place('yard-fence','fence',180,-260);
 place('observation-hardpoint','aa-hardpoint',-28,-274,{y:66});
 // A fortified frame uses the existing service gate's real seventy-unit opening.
 place('north-gate-frame','tall-gate-frame',-169,80,{span:94,height:HIGHWALL_HEIGHT+8,depth:16});
 // One repeatable edit proves routes invalidate when geometry changes.
 if(gateClosed)box('service-gate',-169,80,70,6,HIGHWALL_HEIGHT,0,'gate');
 const signs=[
  {text:'HIGHWALL',sub:'COMBINED ARMS / SECTOR 01',x:50,z:275,y:29,w:100},
  {text:'01 / LABYRINTH',sub:'INFANTRY LOOPS',x:-247,z:194,y:29,w:62},
  {text:'02 / ARMORED',sub:'CONNECTED THROUGH ROUTE',x:66,z:-272,y:29,w:84},
  {text:'03 / SHELTER',sub:'INFANTRY ONLY',x:-28,z:62,y:18,w:35},
  {text:'04 / OPEN SKY',sub:'AIR APPROACH / EXPOSED',x:240,z:75,y:30,w:88},
 ];
 // Freestanding route boards have physical supports, rather than floating in space.
 for(const [i,s]of signs.entries())for(const side of[-1,1])box(`sign-support-${i}-${side}`,s.x+side*(s.w/2-2),s.z,2,2,s.y+s.w/8,0,'post');
 for(const module of modules)pieces.push(...fortificationPlacement(module).solids);
 return {version:2,revision,seed:1701,bounds:{...HIGHWALL_BOUNDS},pieces,modules,signs,
  zones:[{id:'infantry',x:-169,z:-40,width:300,depth:490},{id:'armor',x:66,z:0,width:100,depth:570},{id:'air',x:233,z:-110,width:168,depth:320}],
  blue:[{x:-247,z:240},{x:-229,z:240},{x:-247,z:222},{x:-229,z:222}],
  red:[{x:-169,z:0},{x:-151,z:0},{x:-169,z:-18},{x:-151,z:-18}],
  tank:{x:66,z:210},controlPost:{x:235,z:292},airStarts:[{x:212,y:90,z:200},{x:212,y:90,z:-215}],objective:{x:-169,z:140}};
}
