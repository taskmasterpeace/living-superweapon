// Entry / contact / sustained hold / release / recovery, in local rig radians.
// These candidates do not grant a grab, move a victim, or set combat damage.
const stance={'DEF-thighL':[-.2,0,-.08],'DEF-thighR':[.12,0,.08],'DEF-shinL':[.35,0,0],'DEF-shinR':[.2,0,0]};
const front={...stance,'DEF-spine003':[.12,0,0],'DEF-upper_armL':[1.15,0,-.25],'DEF-upper_armR':[1.15,0,.25],'DEF-forearmL':[.65,0,0],'DEF-forearmR':[.65,0,0]};
const rear={...stance,'DEF-spine003':[.18,0,0],'DEF-upper_armL':[.9,.25,-.45],'DEF-upper_armR':[.9,-.25,.45],'DEF-forearmL':[1.3,0,.2],'DEF-forearmR':[1.3,0,-.2]};
const side={...stance,'DEF-hips':[0,.3,0],'DEF-spine003':[.1,.25,0],'DEF-upper_armL':[1.15,.2,-.3],'DEF-upper_armR':[.75,.4,.4],'DEF-forearmL':[1.15,0,0],'DEF-forearmR':[.95,0,0]};
const neck={...stance,'DEF-spine003':[-.08,0,0],'DEF-upper_armL':[1.5,0,-.18],'DEF-forearmL':[.25,0,0],'DEF-upper_armR':[.4,0,.3],'DEF-forearmR':[1.15,0,0]};
const entry=joints=>Object.fromEntries(Object.entries(joints).map(([name,a])=>[name,a.map(x=>x*.45)]));
const make=(hold,hand='right')=>({duration:1.4,loop:false,hand,markers:{contact:.42,release:1.05,controlReturn:1.3},poses:[{time:0,joints:{}},{time:.15,joints:entry(hold)},{time:.3,joints:hold},{time:.75,joints:hold},{time:1.3/1.4,joints:{}},{time:1,joints:{}}]});
export const GRAB_BODY_STUDIES={
 'Paired grab':make(front),
 'Front clinch entry':make(front),
 'Rear body lock entry':make(rear),
 'Side grab entry':make(side),
 'Neck hold / free right hand':make(neck,'left'),
};
