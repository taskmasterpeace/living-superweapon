// Full-body blocking candidates. Gameplay timing and displacement remain simulation-owned.
// Measured from Idle_Loop(0) on the shipped GLB: arm +X reaches forward,
// thigh -X kicks forward and shin +X retracts. Keep these distinct axes.
// Bound shoulder elevation plus elbow flexion to avoid folding throws behind the head.
const guard={'DEF-upper_armR':[.35,0,.18],'DEF-upper_armL':[.35,0,-.18],'DEF-forearmR':[.8,0,0],'DEF-forearmL':[.8,0,0]};
const pose=(time,joints)=>({time,joints:{...guard,...joints}});
const make=(duration,contact,chamber,impact)=>({duration,loop:false,markers:{contact:contact*duration,release:(contact+.08)*duration,controlReturn:duration},poses:[{time:0,joints:{}},pose(.2,chamber),pose(contact,impact),pose(contact+.08,impact),pose(.78,chamber),{time:1,joints:{}}]});
const front=make(.62,.4,{'DEF-thighR':[-1.2,0,0],'DEF-shinR':[1.5,0,0],'DEF-spine003':[-.1,0,-.08]}, {'DEF-thighR':[-1.25,0,0],'DEF-shinR':[.12,0,0],'DEF-thighL':[.12,0,0],'DEF-spine003':[-.2,0,-.1]});
const round=make(.78,.44,{'DEF-hips':[0,-.35,0],'DEF-thighR':[-1,0,.55],'DEF-shinR':[1.4,0,0]}, {'DEF-hips':[0,.55,0],'DEF-spine003':[0,.25,-.18],'DEF-thighR':[-1.15,0,.7],'DEF-shinR':[.2,0,0],'DEF-upper_armL':[.6,0,-.65]});
const knee=make(.52,.38,{'DEF-thighR':[.25,0,0],'DEF-shinR':[.65,0,0],'DEF-spine003':[.1,0,0]}, {'DEF-thighR':[-1.35,0,0],'DEF-shinR':[1.45,0,0],'DEF-spine003':[-.12,0,-.08]});
function mirror(d){return {...d,markers:{...d.markers},poses:d.poses.map(k=>({time:k.time,joints:Object.fromEntries(Object.entries(k.joints).map(([name,[x,y,z]])=>[name.replace(/[LR]$/,s=>s==='L'?'R':'L'),[x,-y,-z]]))}))};}
export const COMBAT_BODY_STUDIES=Object.fromEntries([['Front kick',front],['Roundhouse kick',round],['Knee strike',knee]].flatMap(([name,d])=>[[name+' / right',d],[name+' / left',mirror(d)]]));
// Throws are blocking candidates: distinct anticipation, release and follow-through.
const throwPose=(time,joints)=>({time,joints});
const axe={duration:1.05,loop:false,hand:'right',markers:{contact:0,release:.48,controlReturn:.95},poses:[throwPose(0,{}),throwPose(.25,{'DEF-spine003':[-.12,-.22,0],'DEF-upper_armR':[1.65,0,.1],'DEF-forearmR':[.8,0,0],'DEF-upper_armL':[.4,0,-.3],'DEF-thighL':[-.12,0,0]}),throwPose(.48/1.05,{'DEF-spine003':[.18,.2,0],'DEF-upper_armR':[.95,0,.08],'DEF-forearmR':[.1,0,0],'DEF-upper_armL':[.2,0,-.5],'DEF-thighR':[.15,0,0]}),throwPose(.7,{'DEF-spine003':[.22,.3,0],'DEF-upper_armR':[.65,.1,-.12],'DEF-forearmR':[.2,0,0],'DEF-upper_armL':[.2,0,-.5]}),throwPose(1,{})]};
const boomerang={duration:1.1,loop:false,hand:'right',markers:{contact:0,release:.5,controlReturn:1},poses:[throwPose(0,{}),throwPose(.25,{'DEF-hips':[0,-.2,0],'DEF-spine003':[0,-.35,0],'DEF-upper_armR':[.45,-.15,.48],'DEF-forearmR':[.8,0,0],'DEF-upper_armL':[.5,0,-.25]}),throwPose(.5/1.1,{'DEF-hips':[0,.1,0],'DEF-spine003':[.08,.35,0],'DEF-upper_armR':[.95,.05,.15],'DEF-forearmR':[.15,0,0],'DEF-upper_armL':[.3,0,-.45]}),throwPose(.72,{'DEF-spine003':[.12,.45,0],'DEF-upper_armR':[.75,.15,-.2],'DEF-forearmR':[.55,0,0],'DEF-upper_armL':[.2,0,-.35]}),throwPose(1,{})]};
export const THROW_BODY_STUDIES=Object.fromEntries([['Throwing axe',axe],['Boomerang throw',boomerang]].flatMap(([name,d])=>[[name,d],[name+' / left',{...mirror(d),hand:'left'}]]));
