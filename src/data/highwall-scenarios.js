// Scenario population is independent of reusable environment placement.
export const HIGHWALL_SCENARIOS=Object.freeze({
 corridor:{title:'Squad skirmish',goal:'Defeat the Red squad. Regroup through the central junction.',soldiers:4,zombies:0},
 combined:{title:'Combined arms',goal:'Fly as Sol with a Blue squad against Red soldiers and a flyer. The tank supports player driving only.',soldiers:4,zombies:0,vehicle:'tank',player:'sol',enemyFlyer:true},
 infestation:{title:'Infestation',goal:'Clear the infected from the western routes.',soldiers:0,zombies:6},
 outbreak:{title:'Outbreak during battle',goal:'Survive both opposing soldiers and infected. Contact can infect biological soldiers.',soldiers:4,zombies:14,infection:true},
 horde:{title:'Horde pressure · 16',goal:'Hold the routes against sixteen infected. No unlimited respawns.',soldiers:0,zombies:16,infection:true},
 stress32:{title:'Stress test · 32',goal:'Experimental load: 32 active infected, not a performance guarantee.',soldiers:0,zombies:32,infection:true},
 stress64:{title:'Stress test · 64',goal:'Experimental load: 64 active infected, not a performance guarantee.',soldiers:0,zombies:64,infection:true},
 turning:{title:'Accelerated infection',goal:'Contact infects eligible soldiers. A dead infected casualty turns after six seconds.',soldiers:4,zombies:6,infection:true,turnDelay:6},
 systems:{title:'Systems walk-through',goal:'Visit the control post: door, live surveillance, audio and video. No enemies.',soldiers:0,zombies:0},
 air:{title:'Air intrusion',goal:'Use roofs to break sight from the opposing flyer. No scripted anti-air damage.',soldiers:4,zombies:0},
 vehicle:{title:'Vehicle crossing',goal:'Board the tank and cross the armored lane. Player-drivable; no AI crew.',soldiers:4,zombies:0,vehicle:'tank'},
 motorcycle:{title:'Motorcycle handling',goal:'Drive the armored lane. Handling station; mounted weapons and rider pose are unfinished.',soldiers:0,zombies:0,vehicle:'motorcycle'},
 mech:{title:'Mech handling',goal:'Walk and turn the light mech. Player-operated; mounted weapons are unsupported.',soldiers:0,zombies:0,vehicle:'mech-light'},
 helicopter:{title:'Helicopter handling',goal:'Lift off over the eastern field. Player-operated; no AI crew or mounted weapons.',soldiers:0,zombies:0,vehicle:'helicopter'},
 intercept:{title:'Flyer interception',goal:'Approach the opposing flyer above the eastern field.',soldiers:0,zombies:0},
});
export function zombieSpawns(count){
 const xs=[-188,-170,-152,-110,-92,-74,-266,-248],zs=[122,140,158,-10,8,26,-118,-100,-82,-250,-232,-214];
 return Array.from({length:count},(_,i)=>({x:xs[i%xs.length],z:zs[Math.floor(i/xs.length)],sprinter:i%8===7}));
}
