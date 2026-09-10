// Shared physical grading, surfacing and parking contract. Units are native
// (~5u/metre). Keep the entry combat pocket clear; the service road joins the
// vehicle bays, rotor pad, hangar apron and northbound runway.
export const OUTPOST_GRADE_RECTS=[[-130,130,80,465],[-135,-65,20,470],[-65,-15,-40,100],[-35,115,300,810]];
export const OUTPOST_SCOUT_PARKS=[[-60,95],[-90,285],[-90,450]];
export const OUTPOST_SCOUT_YAWS=[.25,Math.PI/2,.25];
export const OUTPOST_PRESS_PARK={x:115,z:-15};
export const OUTPOST_AIRCRAFT_PARKS={helicopter:{x:-45,z:210},jet:{x:40,z:410}};
export const OUTPOST_BUILDINGS=[
 {kind:'command',x:-105,z:55,yaw:Math.PI},
 {kind:'watchtower',x:-110,z:130,yaw:0},
 {kind:'hangar',x:-95,z:350,yaw:Math.PI},
 {kind:'barricade',x:65,z:70,yaw:0},
 {kind:'barricade',x:95,z:70,yaw:0},
];
function rectDistance(x,z,[x0,x1,z0,z1]){return Math.hypot(Math.max(x0-x,0,x-x1),Math.max(z0-z,0,z-z1));}
export function outpostDistance(x,z){return Math.min(...OUTPOST_GRADE_RECTS.map(r=>rectDistance(x,z,r)));}
// Cut-and-fill envelope caps the shoulder grade itself. Multiplying the old
// relief by a blend weight steepened its existing slopes into an unsafe lip.
export function gradeOutpostHeight(x,z,natural){return Math.min(natural,outpostDistance(x,z)*.65);}
export function outpostReserved(x,z,padding=0){return OUTPOST_GRADE_RECTS.some(r=>rectDistance(x,z,r)<=padding);}
