// Full-body blocking candidates. Gameplay timing and displacement remain simulation-owned.
const guard={'DEF-upper_armR':[.65,0,.25],'DEF-upper_armL':[.65,0,-.25],'DEF-forearmR':[1.1,0,0],'DEF-forearmL':[1.1,0,0]};
const pose=(time,joints)=>({time,joints:{...guard,...joints}});
const make=(duration,contact,chamber,impact)=>({duration,loop:false,markers:{contact:contact*duration,release:(contact+.08)*duration,controlReturn:duration},poses:[{time:0,joints:{}},pose(.2,chamber),pose(contact,impact),pose(contact+.08,impact),pose(.78,chamber),{time:1,joints:{}}]});
const front=make(.85,.43,{'DEF-thighR':[-1.2,0,0],'DEF-shinR':[1.5,0,0],'DEF-spine003':[-.1,0,-.08]}, {'DEF-thighR':[-1.5,0,0],'DEF-shinR':[.12,0,0],'DEF-thighL':[.12,0,0],'DEF-spine003':[-.2,0,-.1]});
const round=make(1,.48,{'DEF-hips':[0,-.35,0],'DEF-thighR':[-1,0,.55],'DEF-shinR':[1.4,0,0]}, {'DEF-hips':[0,.55,0],'DEF-spine003':[0,.25,-.18],'DEF-thighR':[-1.15,0,.7],'DEF-shinR':[.2,0,0],'DEF-upper_armL':[.6,0,-.65]});
const knee=make(.7,.4,{'DEF-thighR':[.25,0,0],'DEF-shinR':[.65,0,0],'DEF-spine003':[.1,0,0]}, {'DEF-thighR':[-1.7,0,0],'DEF-shinR':[1.8,0,0],'DEF-spine003':[-.12,0,-.08]});
function mirror(d){return {...d,markers:{...d.markers},poses:d.poses.map(k=>({time:k.time,joints:Object.fromEntries(Object.entries(k.joints).map(([name,[x,y,z]])=>[name.replace(/[LR]$/,s=>s==='L'?'R':'L'),[x,-y,-z]]))}))};}
export const COMBAT_BODY_STUDIES=Object.fromEntries([['Front kick',front],['Roundhouse kick',round],['Knee strike',knee]].flatMap(([name,d])=>[[name+' / right',d],[name+' / left',mirror(d)]]));
