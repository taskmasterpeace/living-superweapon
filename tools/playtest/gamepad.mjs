import {sessionFor} from './session.mjs';
export async function installEmulatedGamepad(page){
 const s=sessionFor(page);if(s.phase!=='setup')throw new Error('Install emulated gamepad before acceptance');
 await page.addInitScript(()=>{
  const state={id:'PowerWorld test controller',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0})),timestamp:0};
  Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[state]});
  globalThis.__PW_TEST_GAMEPAD=state;
 });
 s.device='browser-emulated-standard-gamepad';
}
export async function gamepadButton(page,index,held){
 if(!Number.isInteger(index)||index<0||index>16)throw new Error('Invalid gamepad index');
 await page.evaluate(({index,held})=>{const state=globalThis.__PW_TEST_GAMEPAD;if(!state)throw new Error('Emulated gamepad is not installed');state.buttons[index]={pressed:held,touched:held,value:held?1:0};state.timestamp=performance.now();},{index,held});
}

export async function gamepadMove(page,x,y){
 if(![x,y].every(v=>Number.isFinite(v)&&v>=-1&&v<=1))throw new Error('Stick axes must be finite values from -1 to 1');
 await page.evaluate(({x,y})=>{const s=globalThis.__PW_TEST_GAMEPAD;if(!s)throw new Error('Emulated gamepad is not installed');s.axes[0]=x;s.axes[1]=y;s.timestamp=performance.now();},{x,y});
}
