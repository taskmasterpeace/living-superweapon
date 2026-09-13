const clients=new WeakMap();
export async function touchButton(page,id,held){
 if(!/^[a-z]+$/.test(id))throw new Error('Invalid touch action ID');
 let client=clients.get(page);if(!client){client=await page.context().newCDPSession(page);clients.set(page,client);}
 if(!held){await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});return;}
 const button=page.locator('#touch [data-b="'+id+'"]');
 if(!await button.isVisible()||await button.isDisabled())throw new Error('Touch action unavailable: '+id);
 const box=await button.boundingBox();if(!box)throw new Error('Touch button has no visible bounds');
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:box.x+box.width/2,y:box.y+box.height/2,radiusX:3,radiusY:3,force:1}]});
}
