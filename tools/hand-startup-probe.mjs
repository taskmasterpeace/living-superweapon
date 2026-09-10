// Diagnostic loader: observes intermediate production stages without changing
// the worktree implementation or bypassing its contact/readiness constraints.
import {registerHooks} from 'node:module';
registerHooks({load(url,context,next){
 const result=next(url,context);
 if(!url.endsWith('/src/engine/combat-pose.js'))return result;
 let source=String(result.source);
 if(process.env.LSW_PROBE_NO_ROUTE)return {...result,source:source.replace('if(!route&&torsoCorrected','if(false&&torsoCorrected')};
 source=source.replace('  return target.angleTo(jointTarget)<1e-6',"if(f.animT>1.3&&f.animT<1.44)console.error('PROGRESS',key,{distance,remaining:target.angleTo(jointTarget),step:target.angleTo(jointStart),route:!!route});\n  return target.angleTo(jointTarget)<1e-6");
 source=source.replace('    // If the moving body already',"if(f.animT>1.3&&f.animT<1.44)console.error('PATH',key,{budget,distance,route:!!route,accepted:target.copy(p.torso.quaternion).invert().multiply(jointAccepted).angleTo(jointStart),zero:pose(0)});\n    // If the moving body already");
 const log=label=>`if(f.animT>1.37&&f.animT<1.44)console.error('${label}', f.animT, [p.armL,p.armR].map(a=>({q:a.quaternion.toArray(),elbow:-a.children[1].rotation.x,reach:a.children[2].getWorldPosition(new THREE.Vector3()).sub(a.getWorldPosition(new THREE.Vector3())).normalize().dot(state.point.clone().sub(a.getWorldPosition(new THREE.Vector3())).normalize())})));`;
 source=source.replace('  // Make the destination physical',log('IK')+'\n  // Make the destination physical');
 source=source.replace('  // IK and the locomotion base',log('CONTACT')+'\n  // IK and the locomotion base');
 source=source.replace("  if(state.source==='hand')for(const [arm,side]",log('SETTLED')+"\n  if(state.source==='hand')for(const [arm,side]");
 return {...result,source};
}});
await import('./hand-beam-startup.test.mjs');
