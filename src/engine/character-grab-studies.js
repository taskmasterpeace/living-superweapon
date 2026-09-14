// Entry / contact / sustained hold / release / recovery, in local rig radians.
// These candidates do not grant a grab, move a victim, or set combat damage.
// Idle_Loop already bends the elbows. Modest additive shoulder/elbow arcs keep
// the hands anterior; the short entry is a preview timing choice, not a stat rule.
const stance={'DEF-thighL':[-.2,0,-.08],'DEF-thighR':[.12,0,.08],'DEF-shinL':[.35,0,0],'DEF-shinR':[.2,0,0]};
const front={...stance,'DEF-spine003':[.12,0,0],'DEF-upper_armL':[.65,0,-.18],'DEF-upper_armR':[.65,0,.18],'DEF-forearmL':[.5,0,0],'DEF-forearmR':[.5,0,0]};
const rear={...stance,'DEF-spine003':[.18,0,0],'DEF-upper_armL':[.55,.15,-.25],'DEF-upper_armR':[.55,-.15,.25],'DEF-forearmL':[.75,0,.2],'DEF-forearmR':[.75,0,-.2]};
const side={...stance,'DEF-hips':[0,.3,0],'DEF-spine003':[.1,.25,0],'DEF-upper_armL':[.7,.1,-.2],'DEF-upper_armR':[.55,.2,.25],'DEF-forearmL':[.7,0,0],'DEF-forearmR':[.65,0,0]};
const neck={...stance,'DEF-spine003':[-.08,0,0],'DEF-upper_armL':[1.05,0,-.12],'DEF-forearmL':[.25,0,0],'DEF-upper_armR':[.4,0,.3],'DEF-forearmR':[1.15,0,0]};
const entry=joints=>Object.fromEntries(Object.entries(joints).map(([name,a])=>[name,a.map(x=>x*.45)]));
const make=(hold,hand='right')=>({duration:.85,loop:false,hand,markers:{contact:.16,release:.58,controlReturn:.78},poses:[{time:0,joints:{}},{time:.07/.85,joints:entry(hold)},{time:.16/.85,joints:hold},{time:.58/.85,joints:hold},{time:.78/.85,joints:{}},{time:1,joints:{}}]});
export const GRAB_BODY_STUDIES={
 'Paired grab':{...make(front),contactStyle:'front'},
 'Front clinch entry':{...make(front),contactStyle:'front'},
 'Rear body lock entry':{...make(rear),contactStyle:'rear'},
 'Side grab entry':{...make(side),contactStyle:'side'},
 'Neck hold / free right hand':{...make(neck,'left'),contactStyle:'neck'},
};
