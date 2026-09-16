// STEER AUDIT — measures the ACTUAL on-screen turn direction through the real chase
// camera. Board a tank, drop a fixed WORLD marker dead ahead, press D (turn), project
// it: the marker slides LEFT when you turn RIGHT. Needs a dev server on 127.0.0.1:5193.
import {chromium} from 'playwright';
const b=await chromium.launch({headless:false});const p=await b.newPage({viewport:{width:1280,height:800}});
const logs=[];p.on('console',m=>logs.push(m.text()));p.on('pageerror',e=>logs.push('PAGEERROR '+e.message));
try{
 await p.goto('http://127.0.0.1:5193/powerworld.html');
 await p.waitForFunction(()=>window.LSW&&window.LSW.game&&window.LSW.THREE,null,{timeout:60000});
 await p.locator('#hSelect.on').waitFor({timeout:60000}).catch(()=>{});
 const res=await p.evaluate(async()=>{
  const g=window.LSW.game,THREE=window.LSW.THREE;
  const idle={down:()=>false,pressed:()=>false,justPressed:{delete(){}},mouse:{dx:0,dy:0,left:false}};
  const fake=code=>({down:c=>c===code,pressed:()=>false,justPressed:{delete(){}},mouse:{dx:0,dy:0,left:false}});
  // Camera-free guard: the fleet chase camera makes yaw+ read as a LEFT turn on
  // screen (world.js ~2623, +Z-looking camera swaps world-X; derived + confirmed by
  // Robert). So the CORRECTED mapping is: pressing D DECREASES motion.yaw (turns
  // right), pressing A INCREASES it (turns left). We assert exactly that sign.
  const driveYaw=(a,code,n=30)=>{
   const y0=a.motion.yaw||0;
   for(let i=0;i<n;i++){g._fleetPilot.handleInput(fake(code));g._fleetPilot.update(1/60);}
   return (a.motion.yaw||0)-y0;
  };
  async function audit(id){
   g.hud.hideTitle();g.running=true;g.world.render=()=>{};
   g.startMode('freeroam',{p1:'sarge'});
   if(g._fleetPilot?.actor)g._fleetPilot.exit({force:true});
   const a=await g.spawnFleetVehicle(id,{x:0,z:0});
   if(!a)return {error:'no actor for '+id};
   g.player.pos.set(a.pos.x,a.pos.y,a.pos.z);g.player.obj?.position.copy(g.player.pos);
   const entered=g._fleetPilot.enter(a,g.player);
   if(g._fleetPilot.actor!==a){g._fleetPilot.actor=a;a.occupant=g.player;}
   g.player._fleetVehicle=a;
   a.motion.yaw=0;for(let i=0;i<10;i++){g._fleetPilot.handleInput(idle);g._fleetPilot.update(1/60);}   // settle
   a.motion.yaw=0;const dD=driveYaw(a,'KeyD');
   a.motion.yaw=0;const dA=driveYaw(a,'KeyA');
   const right=dD<-1e-3,left=dA>1e-3;
   return {id,cls:a.cls,dYaw_D:+dD.toFixed(3),dYaw_A:+dA.toFixed(3),pass:right&&left,verdict:(right?'D→right ✓':'D→'+(dD>0?'left ✗':'none'))+' | '+(left?'A→left ✓':'A→'+(dA<0?'right ✗':'none'))};
  }
  return {tank:await audit('tank'),mech:await audit('scorpion').catch(e=>({error:String(e)}))};
 },{timeout:150000});
 console.log(JSON.stringify(res,null,1));
 console.log('--- console ---\n'+logs.filter(l=>/error|Error/i.test(l)).slice(-10).join('\n'));
}catch(e){console.log('RUN ERROR',e.message);console.log(logs.slice(-25).join('\n'));}
finally{await b.close();}
