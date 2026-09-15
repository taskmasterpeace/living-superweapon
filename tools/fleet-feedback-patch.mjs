import fs from 'node:fs';
function edit(p,pairs){let s=fs.readFileSync(p,'utf8').replaceAll('\r\n','\n');for(const [a,b] of pairs){if(!s.includes(a.replaceAll('\r\n','\n')))throw Error('Missing '+a.slice(0,70));s=s.replace(a.replaceAll('\r\n','\n'),b);}fs.writeFileSync(p,s);}
edit('src/engine/fleet-pilot.js',[
["import { FleetAudio } from './fleet-audio.js';","import { FleetAudio } from './fleet-audio.js';\nimport {FleetControlsHud,fleetControls} from './fleet-controls.js';"],
['barrel: c.barrel, parked: false','barrel: 0, gearToggle:c.gearToggle, parked: false'],
["this._audio = new FleetAudio(game.audio);","this._audio = new FleetAudio(game.audio); this._hud=new FleetControlsHud();"],
["    // double-tap A/D → barrel roll (aircraft + the airborne whip)\r\n    let barrel = 0;\r\n    for (const k of ['KeyA', 'KeyD']) if (input?.pressed?.(k)) { const now = (typeof performance !== 'undefined' ? performance.now() : Date.now()); if (this._tapKey === k && now - this._tapT < 300) barrel = k === 'KeyA' ? -1 : 1; this._tapKey = k; this._tapT = now; }", "    // Steering taps never trigger an aerobatic maneuver.\n    const barrel = 0;"],
['aimX: 0, aimY: 0, barrel,',"aimX: 0, aimY: 0, barrel, gearToggle:!!input?.pressed?.('KeyG'),"],
['— WASD DRIVE · J EXIT','— ${fleetControls(a.cls)}'],
['    this._seat();\r\n    this._audio.enter(a);','    this._seat();\n    this._hud.update(a);\n    this._audio.enter(a);'],
['    driveActor(a, fleetIntent(a.cls, this._c || {}), dt, this.game.world);','    driveActor(a, fleetIntent(a.cls, this._c || {}), dt, this.game.world);\n    if(this._c)this._c.gearToggle=false;\n    this._hud.update(a);'],
['  exit() {','  exit() {\n    this._hud.dispose();']]);
edit('src/boot.js',[["import { Input } from './core/input.js';","import { Input } from './core/input.js';\nimport {suppressFleetShortcut} from './engine/fleet-controls.js';"],['    if (!started) return;','    if (!started) return;\n    if(suppressFleetShortcut(game,e.code)){e.preventDefault();return;}']]);
edit('src/engine/game.js',[
['if(!w.freeLookInput(lookInput,inputDt,sight))w.mouseLook','if(!w.freeLookInput(lookInput,inputDt,sight)&&!this.player?._fleetVehicle)w.mouseLook'],
['if(this.pad?.active&&!padLook){','if(this.pad?.active&&!padLook&&!this.player?._fleetVehicle){'],
['const alt = gy + 40; actor.pos.y = alt; actor.motion.speed = (actor.env?.top || 100) * .55;', 'const alt = gy + 160; actor.pos.y = alt;\n      actor.motion.lever = Math.min(1,Math.max(.7,((actor.env?.stall||0)+(actor.env?.liftRamp||0)+10)/(actor.env?.top||100)));\n      actor.motion.speed = (actor.env?.top || 100) * actor.motion.lever;']]);

