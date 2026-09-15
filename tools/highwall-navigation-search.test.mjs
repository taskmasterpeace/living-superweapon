import test from 'node:test';
import assert from 'node:assert/strict';
import {HighwallNavigation} from '../src/engine/highwall-navigation.js';
import {routeHighwallIntent} from '../src/engine/highwall-routing.js';
import {highwallLayout} from '../src/data/highwall.js';
import {AI} from '../src/engine/ai.js';
import * as T from 'three';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';

const shape={radius:2.8,height:12};
const start={x:-176.70720766660463,y:0,z:221.7420968967784};
const goal={x:-254.49323706084294,y:0,z:199.70562237551366};
const belief={x:-203.92985730900858,z:187.6495246424305,y:0,t:7.1695000000000295,src:'sight'};
const current=()=>{const layout=highwallLayout();return new HighwallNavigation({bounds:layout.bounds,solids:layout.pieces});};

test('recorded Highwall search request inside cross wall projects to a reachable same-floor endpoint',()=>{
 const nav=current();assert.equal(nav.route(start,goal,shape),null);
 const f={pos:{...start},radius:2.2,ai:{belief:{...belief},_mem:0}},it={navigationGoal:{...goal},move:{x:0,z:0}};
 const original=JSON.stringify({belief:f.ai.belief,goal:it.navigationGoal});
 routeHighwallIntent(nav,f,it,1/60,it.navigationGoal);
 assert.equal(f._highwallRoute.blocked,false);assert.ok(f._highwallRoute.projectedGoal);
 assert.equal(f._highwallRoute.projectedGoal.y,0);
 assert.ok(Math.hypot(goal.x-f._highwallRoute.projectedGoal.x,goal.z-f._highwallRoute.projectedGoal.z)<=32);
 assert.ok(Math.hypot(it.move.x,it.move.z)>.99);
 assert.equal(JSON.stringify({belief:f.ai.belief,goal:it.navigationGoal}),original);
 let p=start;for(const next of f._highwallRoute.points){assert.ok(nav.segmentClear(p,next,shape));p=next;}
});

test('visible targets and explicit move orders are not projected to substitutes',()=>{
 const nav=current();for(const order of [true,false]){
  const f={pos:{...start},radius:2.2,ai:{},_highwallOrder:order?{kind:'move',point:goal}:null};
  const it={move:{x:1,z:0},navigationGoal:goal,...(!order?{target:{pos:goal}}:{})};
  routeHighwallIntent(nav,f,it,.1,goal);
  assert.equal(f._highwallRoute.blocked,true);assert.equal(f._highwallRoute.projectedGoal,null);
 }
});

test('native movement escapes the recorded stalled position and reaches the projected search area',()=>{
 const layout=highwallLayout(),nav=current(),x=mainCombatFixture();
 try{
  x.w.cover=layout.pieces;x.w.coverAll=layout.pieces;x.w.ARENA=1100;x.w.heightAt=()=>0;
  const f=x.p;f._openSky=true;f._altTag=()=>{};f.ai={belief:{...belief},_mem:0};f.radius=2.2;
  f.pos.set(start.x,start.y,start.z);f.obj.position.copy(f.pos);
  let arrived=false;
  for(let i=0;i<60*20;i++){
   const dt=1/60,it=routeHighwallIntent(nav,f,{move:{x:0,z:0},navigationGoal:goal},dt,goal);
   x.g.time+=dt;x.g.dt=dt;f.move(new T.Vector3(it.move.x,0,it.move.z),dt);f.update(dt,x.g);
   const end=f._highwallRoute.projectedGoal;
   if(end&&Math.hypot(f.pos.x-end.x,f.pos.z-end.z)<3){arrived=true;break;}
  }
  assert.ok(arrived,JSON.stringify({pos:f.pos.toArray(),route:f._highwallRoute}));
  assert.deepEqual(f.ai.belief,belief);
 }finally{x.close();}
});

test('search projection cache is copied, bounded, and invalidated by collision replacement',()=>{
 const nav=new HighwallNavigation({bounds:{minX:-60,maxX:60,minZ:-60,maxZ:60},solids:[{x:0,z:0,hx:4,hz:4,top:30}]});
 const a={x:0,y:0,z:30},b={x:0,y:0,z:0};
 const first=nav.projectSearchGoal(a,b,shape);assert.ok(first);first.goal.x=999;first.path.points[0].x=999;
 assert.notEqual(nav.projectSearchGoal(a,b,shape).goal.x,999);assert.equal(nav.projectSearchGoal(a,b,shape).path.points[0].x,0);
 nav.replace([],2);const next=nav.projectSearchGoal(a,b,shape);assert.deepEqual(next.goal,b);assert.equal(next.path.revision,2);
 for(let i=0;i<70;i++)nav.projectSearchGoal(a,{x:300+i,y:0,z:0},shape);
 assert.ok(nav.searchCache.size<=64);
});

test('projection cannot invent floors, cross sealed barriers, or search beyond its finite neighborhood',()=>{
 const nav=new HighwallNavigation({bounds:{minX:-80,maxX:80,minZ:-80,maxZ:80},solids:[{x:0,z:0,hx:3,hz:80,top:40}]});
 const a={x:-60,y:0,z:0};
 assert.equal(nav.projectSearchGoal(a,{x:60,y:0,z:0},shape),null);
 assert.equal(nav.projectSearchGoal(a,{x:-40,y:20,z:0},shape),null);
 assert.equal(nav.projectSearchGoal(a,{x:500,y:0,z:0},shape),null);
});

test('generic cold grounded patrol honors navigation bounds and current floor, flyers retain open arena',()=>{
 const nav={bounds:{minX:-30,maxX:50,minZ:-20,maxZ:60}};
 const g={world:{ARENA:1100,groundNavigation:nav}};
 const bot={pos:{x:0,y:12,z:0},radius:2.2,flying:false};
 const ai={bot,_searchT:20,_mem:0,_patrol:null,_patrolT:0,belief:null};
 for(let i=0;i<100;i++){
  ai._patrolT=0;const p=AI.prototype._searchGoal.call(ai,g,.1);
  assert.ok(p.x>=-27.2&&p.x<=47.2&&p.z>=-17.2&&p.z<=57.2);assert.equal(p.y,12);
 }
 bot.flying=true;let outside=false;
 for(let i=0;i<20;i++){ai._patrolT=0;const p=AI.prototype._searchGoal.call(ai,g,.1);outside ||= Math.abs(p.x)>60||Math.abs(p.z)>60;}
 assert.ok(outside);
 ai.belief={...belief};ai._mem=5;assert.equal(AI.prototype._searchGoal.call(ai,g,.1),ai.belief);
});
