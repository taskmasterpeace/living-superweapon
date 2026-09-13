import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {Weather} from '../src/engine/systems.js';
import {TrainingWeatherScope} from '../src/engine/training-weather-scope.js';
import {weatherSurface} from '../src/engine/weather-lightning.js';
import {RainField} from '../src/engine/rain-field.js';

test('training storm ages, spends energy, expires and restores suspended desert weather',()=>{
 const x=mainCombatFixture({mode:'powerworld'});
 try{
  const {g,p,w}=x;g.weather=new Weather(g);const desert=g.weather;
  desert.set('storm',{instant:true});desert.time=12;
  const old=desert.command({src:p,dur:20,wind:1,cloud:1});old.age=3;
  const scope=new TrainingWeatherScope(g),training=g.weather;
  assert.equal(old.group.visible,false);assert.equal(training.wind,0);
  assert.equal(training.sampleBodyWind(p.pos,new Vector3()).length(),0);
  const ki=p.ki,storm=training.command({src:p,dur:2,kiPerSec:5,wind:1,cloud:1});
  training.updateDomains(1);
  assert.equal(storm.age,1);assert.equal(p.ki,ki-5);
  assert.ok(training.sampleBodyWind(p.pos,new Vector3()).length()>0);
  assert.equal(desert.time,12);assert.equal(old.age,3);assert.equal(desert.stateId,'storm');
  training.updateDomains(1);training.updateDomains(1);
  assert.equal(training.layers.size,0);assert.equal(storm.disposed,true);
  const live=training.command({src:p,dur:10,wind:1});
  scope.close();scope.close();
  assert.equal(live.disposed,true);assert.equal(g.weather,desert);
  assert.equal(old.disposed,false);assert.equal(old.group.visible,true);
  assert.equal(desert.layers.get(p),old);assert.equal(desert.time,12);
  desert.dispose();
 }finally{x.close();}
});

test('simulation ceiling remains solid but does not shelter weather; platform still shelters',()=>{
 const ceiling={x:0,z:0,hx:310,hz:310,bottom:300,top:304,weatherTransparent:true};
 const platform={x:0,z:0,hx:20,hz:20,bottom:46,top:50};
 const world={heightAt:()=>0,cover:[ceiling,platform],interiors:[]};
 assert.equal(weatherSurface(world,80,0),.04);assert.equal(weatherSurface(world,0,0),50.04);
 const rain=new RainField(world);rain.covers=[ceiling,platform];
 assert.equal(rain.surface(80,0),0);assert.equal(rain.surface(0,0),50);
 assert.equal(ceiling.bottom,300);assert.equal(ceiling.top,304);rain.dispose();
});
