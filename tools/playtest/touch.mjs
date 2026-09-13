const sessions=new WeakMap();
async function session(page){let s=sessions.get(page);if(!s){s={client:await page.context().newCDPSession(page),points:new Map(),origin:null};sessions.set(page,s);}return s;}
const point=(id,x,y)=>({id,x,y,radiusX:3,radiusY:3,force:1});
async function send(s,type){await s.client.send('Input.dispatchTouchEvent',{type,touchPoints:[...s.points.values()]});}
export async function touchButton(page,id,held){
 if(!/^[a-z]+$/.test(id))throw new Error('Invalid touch action ID');
 const s=await session(page);
 if(!held){if(s.points.delete(1))await send(s,'touchEnd');return;}
 const button=page.locator('#touch [data-b="'+id+'"]');
 if(!await button.isVisible()||await button.isDisabled())throw new Error('Touch action unavailable: '+id);
 const box=await button.boundingBox();if(!box)throw new Error('Touch button has no visible bounds');
 s.points.set(1,point(1,box.x+box.width/2,box.y+box.height/2));await send(s,'touchStart');
}
export async function touchMove(page,x,y){
 if(![x,y].every(v=>Number.isFinite(v)&&v>=-1&&v<=1))throw new Error('Invalid touch movement axes');
 const s=await session(page);
 if(x===0&&y===0){s.origin=null;if(s.points.delete(2))await send(s,'touchEnd');return;}
 if(!s.origin){const zone=page.locator('#touch #tzL');if(!await zone.isVisible())throw new Error('Touch movement zone unavailable');const b=await zone.boundingBox();if(!b||b.width<100||b.height<100)throw new Error('Touch movement zone too small');s.origin={x:b.x+b.width/2,y:b.y+b.height/2};s.points.set(2,point(2,s.origin.x,s.origin.y));await send(s,'touchStart');}
 // Native touch stick reaches full deflection at 46 CSS pixels.
 s.points.set(2,point(2,s.origin.x+x*46,s.origin.y+y*46));await send(s,'touchMove');
}
