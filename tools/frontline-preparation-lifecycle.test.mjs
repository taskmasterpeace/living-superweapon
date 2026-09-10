import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareFrontline} from '../src/engine/frontline-preparation.js';

const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const drain=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
function fixture(){
 const calls=[],screens=[],original={name:'original'},main={name:'composer'},sun={castShadow:true};
 let target=original,cube=3,mip=2;
 const renderer={info:{programs:[]},getRenderTarget:()=>target,getActiveCubeFace:()=>cube,getActiveMipmapLevel:()=>mip,
  setRenderTarget(t,c=0,m=0){target=t;cube=c;mip=m;},
  compile(scene,camera){calls.push({scene,camera,target,shadow:sun.castShadow});renderer.info.programs.push({isReady:()=>true,getUniforms(){},getAttributes(){}});}};
 const game={world:{renderer,scene:{},camera:{name:'main'},sun,composer:{renderTarget1:main}},news:{cam:{name:'news'}},errors:[],reportError(error){this.errors.push(error);}};
 const makeStage=()=>({g:game,group:{},frontlineLoading:Promise.resolve(),aircraft:{loading:Promise.resolve()},convoy:{loading:Promise.resolve()}});
 const ui=()=>{const screen={updates:[],destroyed:0,update(text){this.updates.push(text);},destroy(){this.destroyed++;}};screens.push(screen);return screen;};
 return{game,renderer,calls,screens,ui,makeStage,original,get state(){return{target,cube,mip,shadow:sun.castShadow};}};
}

test('cancel before any asset settles immediately releases gate and does no GPU work after late completion',async()=>{
 const x=fixture(),terrain=deferred(),stage=x.makeStage();stage.frontlineLoading=terrain.promise;
 const task=prepareFrontline(stage,{ui:x.ui});task.cancel();
 assert.equal(x.game._frontlinePreparing,null);assert.equal(x.screens[0].destroyed,1);
 terrain.resolve();assert.equal(await task.promise,false);
 assert.equal(stage.frontlineReady,false);assert.equal(x.calls.length,0);assert.deepEqual(x.game.errors,[]);
 assert.deepEqual(x.state,{target:x.original,cube:3,mip:2,shadow:true});
});

test('late rejected assets from a canceled match cannot report failure or release a graphics-ready rematch',async()=>{
 const x=fixture(),terrain=deferred(),first=x.makeStage();first.frontlineLoading=terrain.promise;
 const old=prepareFrontline(first,{ui:x.ui});await drain();
 const second=x.makeStage(),next=prepareFrontline(second,{ui:x.ui});
 assert.equal(old.cancelled,true);assert.equal(await next.promise,true);
 terrain.reject(Error('Old network request failed'));assert.equal(await old.promise,false);
 assert.equal(first.frontlineReady,false);assert.equal(second.frontlineReady,true);assert.equal(x.game._frontlinePreparing,null);
 assert.deepEqual(x.game.errors,[]);assert.equal(x.screens[0].destroyed,1);assert.equal(x.screens[1].destroyed,1);
});

test('terrain readiness alone cannot admit graphics before both convoy and aircraft assets settle',async()=>{
 const x=fixture(),stage=x.makeStage(),terrain=deferred(),aircraft=deferred(),convoy=deferred();
 stage.frontlineLoading=terrain.promise;stage.aircraft.loading=aircraft.promise;stage.convoy.loading=convoy.promise;
 const task=prepareFrontline(stage,{ui:x.ui});terrain.resolve();await drain();assert.equal(x.calls.length,0);
 aircraft.resolve();await drain();assert.equal(x.calls.length,0);assert.equal(stage.frontlineReady,false);
 convoy.resolve();assert.equal(await task.promise,true);assert.equal(x.calls.length,4);assert.equal(stage.frontlineReady,true);
});

test('old queued program poll is inert after a rematch retires its material programs',async()=>{
 const x=fixture(),first=x.makeStage(),poll=deferred();let waiting=false;
 x.renderer.compile=()=>{x.calls.push('old compile');x.renderer.info.programs.push({isReady:()=>false,getUniforms(){throw Error('Retired uniform access');},getAttributes(){}});};
 const old=prepareFrontline(first,{ui:x.ui,wait:()=>{waiting=true;return poll.promise;}});await drain();assert.equal(waiting,true);
 const oldProgram=x.renderer.info.programs[0];oldProgram.isReady=()=>{throw Error('Retired program queried');};
 // Native material disposal removes a program from renderer.info.programs;
 // only the old task's private snapshot still references it.
 x.renderer.info.programs=[];
 x.renderer.compile=()=>x.renderer.info.programs.push({isReady:()=>true,getUniforms(){},getAttributes(){}});
 const second=x.makeStage(),next=prepareFrontline(second,{ui:x.ui});assert.equal(await next.promise,true);
 poll.resolve();assert.equal(await old.promise,false);
 assert.equal(second.frontlineReady,true);assert.equal(x.game._frontlinePreparing,null);assert.deepEqual(x.game.errors,[]);
 assert.deepEqual(x.state,{target:x.original,cube:3,mip:2,shadow:true});
});

test('first-use shader diagnostic failure keeps error gate and restores exact renderer state',async()=>{
 const x=fixture(),stage=x.makeStage();
 x.renderer.compile=()=>x.renderer.info.programs.push({isReady:()=>true,getUniforms(){this.diagnostics={runnable:false};},getAttributes(){}});
 const task=prepareFrontline(stage,{ui:x.ui});assert.equal(await task.promise,false);
 assert.equal(task.status,'error');assert.match(task.error,/shader could not compile/);assert.equal(stage.frontlineReady,false);
 assert.equal(x.game._frontlinePreparing,task);assert.equal(x.game.errors.length,1);
 assert.deepEqual(x.state,{target:x.original,cube:3,mip:2,shadow:true});task.cancel();assert.equal(x.game._frontlinePreparing,null);
});
