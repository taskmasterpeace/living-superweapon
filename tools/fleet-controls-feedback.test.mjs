import test from 'node:test';
import assert from 'node:assert/strict';
import {suppressFleetShortcut,fleetControls} from '../src/engine/fleet-controls.js';
import {FleetPilot} from '../src/engine/fleet-pilot.js';
test('vehicle switching hint appears only in the vehicle simulation',()=>{
 for(const cls of ['wheeled','tracked','mech','rotor','fixedwing']){
  assert.doesNotMatch(fleetControls(cls),/L next vehicle/);
  assert.doesNotMatch(fleetControls(cls,{canSwitchVehicle:false}),/L next vehicle/);
  assert.match(fleetControls(cls,{canSwitchVehicle:true}),/L next vehicle/);
  assert.match(fleetControls(cls),/J exit/);
 }
});
test('vehicle practice blocks spawn and hero selection shortcuts but retains exit and flight keys',()=>{
 for(const state of [{_simActive:true},{player:{_fleetVehicle:{}}}]){
  for(const k of ['KeyN','KeyB','Tab','BracketLeft'])assert.ok(suppressFleetShortcut(state,k));
  for(const k of ['KeyJ','KeyL','KeyR','KeyF','KeyG','Escape'])assert.equal(suppressFleetShortcut(state,k),false);
 }
 assert.equal(suppressFleetShortcut({},'KeyN'),false);
});
test('repeated helicopter steering never rolls; descent and gear controls are explicit',()=>{
 const p=new FleetPilot({running:true,player:{},audio:{}});p.actor={cls:'rotor'};
 const input={down:k=>k==='KeyA'||k==='ControlLeft',pressed:k=>k==='KeyA'};
 p.handleInput(input);p.handleInput(input);assert.equal(p._c.barrel,0);assert.equal(p._c.turn,-1);assert.equal(p._c.lift,-1);
 assert.match(fleetControls('rotor'),/Ctrl descend/);assert.match(fleetControls('fixedwing'),/R\/F throttle/);
 p.actor.cls='fixedwing';p.handleInput({down:()=>false,pressed:k=>k==='KeyG'});assert.equal(p._c.gearToggle,true);
});
