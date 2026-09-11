import test from 'node:test';
import assert from 'node:assert/strict';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';

const dt=1/60;
function heldBeamFixture(){
  const x=mainCombatFixture({hero:'kano',mode:'powerworld'}),{g,p}=x;
  p._openSky=true;g.ms.chaseCam=true;p._selSlot='lmb';
  Object.assign(g.input.mouse,{left:true,leftEdge:true});
  const step=()=>{
    g.time+=dt;x.control(dt);p.animT+=dt;p.advanceActionPose(dt);
    p._animate(dt);p.obj.updateMatrixWorld(true);g.projectiles.update(dt,g);g.input.endFrame();
  };
  try{
    for(let i=0;i<180;i++){
      step();
      if(p.slots.lmb.active?.emissionAge>0)break;
    }
    const beam=p.slots.lmb.active;
    assert.ok(beam?.sustaining&&!beam.pendingLaunch&&beam.emissionAge>0,'fixture must launch the native held Wave Cannon');
    return {...x,beam,step};
  }catch(error){x.close();throw error;}
}

// A presentation rig replacement must not take ownership away from the same
// living fighter. This catches cancellation in the next native camera/input pass.
test('authored level-up keeps the held beam emitting across the replacement rig',()=>{
  const x=heldBeamFixture();
  try{
    const {g,p,w,beam}=x,oldParts=p.parts,root=p.obj,age=beam.emissionAge;
    const target=x.foe({z:85});g.hardLock=target;
    oldParts.foreground.uniforms.uCloseAmount.value=.8;
    p.def.progression={forms:{2:{name:'Ascended Kano',frame:{scale:1.2},colors:{primary:'#ffc54a'}}}};
    g.levelUp(p,true);
    assert.notEqual(p.parts,oldParts,'authored level-up must actually replace the rig');
    assert.equal(p.obj,root);assert.equal(p.slots.lmb.active,beam);
    const ki=p.ki;
    g.prepareCombatView(dt);
    assert.equal(beam.sustaining,true,'camera preparation cancelled a living fighter’s held beam on form change');
    assert.equal(g.input.mouse.left,true,'form change must preserve the held physical trigger');
    assert.equal(g.hardLock,target,'presentation changes must preserve the chosen target');
    assert.equal(oldParts.foreground.uniforms.uCloseAmount.value,0,'retired rig must release its foreground mask');
    assert.equal(w._foregroundParts,p.parts,'foreground state must belong to the replacement rig');
    x.step();
    assert.equal(p.slots.lmb.active,beam);assert.equal(beam.dead,false);
    assert.ok(beam.emissionAge>age,'the same beam must emit fresh packets after form change');
    assert.ok(p.ki<ki,'continued emission must retain its native sustain payment');
    assert.ok(w.camera.matrixWorld.elements.every(Number.isFinite));
  }finally{x.close();}
});

for(const interruption of ['player replacement','pause','view loss']){
  test(`a held beam still cancels on ${interruption}`,()=>{
    const x=heldBeamFixture();
    try{
      const {g,p,beam}=x;
      if(interruption==='player replacement'){
        const replacement=x.foe({team:p.team});g.player=replacement;g.humans[0].fighter=replacement;
      }else if(interruption==='pause')g.running=false;
      else g.mapCam={x:0,z:0,yaw:0,pitch:.8,zoom:60};
      g.prepareCombatView(dt);
      assert.equal(beam.sustaining,false);
      assert.equal(p.slots.lmb.active,null);
      assert.equal(g.input.mouse.left,false);
    }finally{x.close();}
  });
}
