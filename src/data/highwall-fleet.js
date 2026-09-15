// Player-operated handling stations. These do not claim armed mounts or AI crews.
export const HIGHWALL_FLEET_PRESETS=Object.freeze([
 Object.freeze({id:'motorcycle',name:'Pursuit motorcycle',cls:'wheeled',x:38,z:236,yaw:Math.PI,highwall:true}),
 Object.freeze({id:'tank',name:'Battle tank',cls:'tracked',x:66,z:210,yaw:Math.PI,highwall:true}),
 Object.freeze({id:'mech-light',name:'Light mech',cls:'mech',x:99,z:218,yaw:Math.PI,highwall:true}),
 // ⚠ positions must stay clear of the CURRENT highwallLayout pieces — the layout
 // grew under the old pad at (238,-238) and the spawn validator refused it.
 Object.freeze({id:'helicopter',name:'Helicopter',cls:'rotor',x:-300,z:-352,yaw:0,highwall:true}),
 Object.freeze({id:'jet-a',name:'Strike jet · separate flight proving ground',cls:'fixedwing',x:0,z:-600,yaw:0,altitude:160,highwall:false}),
]);
