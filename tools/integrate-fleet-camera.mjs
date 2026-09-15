import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
const p='src/data/camera-presets.js';let s=readFileSync(p,'utf8');const source=readFileSync('D:/lsw/.worktrees/pw-launch-inheritance/'+p,'utf8');const block=source.slice(source.indexOf('// PER-CLASS'),source.indexOf('// Temporary vehicles win'));
s=s.replace('// Temporary vehicles win',block+'// Temporary vehicles win').replace('export function cameraProfileOf(subject,preference=null){','export function cameraProfileOf(subject,preference=null){\n if(subject._fleetVehicle)return cameraForClass(subject._fleetVehicle.cls,subject._fleetVehicle.span);');writeFileSync(p,s);
copyFileSync('D:/lsw/.worktrees/pw-launch-inheritance/tools/vehicle-camera.test.mjs','tools/vehicle-camera.test.mjs');
