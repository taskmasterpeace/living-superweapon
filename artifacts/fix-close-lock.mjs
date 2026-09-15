import{readFile,writeFile}from'node:fs/promises';const path='src/engine/game.js';let s=await readFile(path,'utf8');s=s.replace('const front = this.entities.filter(e => e.def&&lockAvailable(this,p,e)&&ang(e)<=FRONT);',`// The raised shoulder ray cannot pass through a body inside its lateral offset.
    // At touching distance, admit a narrow forward body cone as well. Range and
    // cone remain bounded; shared visibility/LOS checks still apply to both paths.
    const closeFront=e=>{const dx=e.pos.x-p.pos.x,dy=e.pos.y-p.pos.y,dz=e.pos.z-p.pos.z,d=Math.hypot(dx,dy,dz);
      return d>0&&d<=3*((p.radius||2.2)+(e.radius||2.2))&&(dx*cf.x+dy*cf.y+dz*cf.z)/d>=Math.SQRT1_2;};
    const front = this.entities.filter(e => e.def&&lockAvailable(this,p,e)&&(ang(e)<=FRONT||closeFront(e)));`);await writeFile(path,s);
const q='tools/field-research-walk-browser.mjs';s=await readFile(q,'utf8');const a=s.indexOf('for(let i=0;i<8;i++)'),b=s.indexOf('const diagnostic=',a);s=s.slice(0,a)+s.slice(b);await writeFile(q,s);
