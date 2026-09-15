import fs from 'node:fs';import {execFileSync} from 'node:child_process';const p='src/engine/game.js';let s=execFileSync('git',['show','HEAD:'+p],{encoding:'utf8'});s="import {squadYieldMove} from './squad-yield.js';\n"+s;s=s.replace('it.move={x:motion.z*side,z:-motion.x*side};',`const door=this.pwStage?.researchLab?.doorHandle?.pos;
        const atDoor=door&&Math.hypot(f.pos.x-door.x,f.pos.z-door.z)<16;
        it.move=atDoor?(squadYieldMove(f,leader,this.world.cover,side)||{x:0,z:0}):{x:motion.z*side,z:-motion.x*side};`);fs.writeFileSync(p,s);
