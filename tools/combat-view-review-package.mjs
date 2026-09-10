import {spawnSync} from 'node:child_process';
import {mkdir,writeFile,copyFile} from 'node:fs/promises';
import {constants} from 'node:fs';
import {dirname,join} from 'node:path';

// Read-only Git inspection. The only write is the generated review artifact.
// No task-start snapshot exists: never call this a task-only tracked-file diff.
const files=[
 'src/engine/combat-view.js','src/engine/game.js','src/engine/world.js',
 'src/engine/hud.js','src/engine/hud.styles.js','src/boot.js',
 'src/core/gamepad.js','src/core/touch.js','tools/main-combat-view.test.mjs',
 'tools/helpers/main-combat-fixture.mjs',
 'tools/ground-camera.test.mjs','tools/main-combat-view-browser.mjs',
 'tools/main-entry-camera-browser.mjs',
];
if(process.argv.includes('--snapshot-only')){
 // Freeze this review's exact file state for a subsequent correction diff.
 // This is a bounded review artifact, not a copied checkout/worktree.
 const base='artifacts/main-combat-view-review-baseline';
 for(const file of files){
  const destination=join(base,file);await mkdir(dirname(destination),{recursive:true});
  await copyFile(file,destination,constants.COPYFILE_EXCL).catch(error=>{if(error.code!=='EEXIST')throw error;});
 }
 console.log(JSON.stringify({snapshot:base,files:files.length}));
 process.exit(0);
}
const git=args=>{
 const result=spawnSync('git',['-c','core.safecrlf=false',...args],{encoding:'utf8',maxBuffer:32*1024*1024});
 if(result.error)throw result.error;
 return result;
};
const head=git(['rev-parse','HEAD']);if(head.status!==0)throw new Error(head.stderr);
let output=`# Main-city combat view review package\n\nGenerated ${new Date().toISOString()}\nHEAD ${head.stdout.trim()}\n\n`;
output+='Attribution: shared dirty checkout, no commits and no task-start tracked-file snapshots. Tracked-file diffs below compare HEAD with the complete current working file and include earlier work. Untracked files appear as full additions, including pre-existing ground-camera tests. Use the implementation report\'s changed-seam list to attribute this task. This is not a narrow task-only patch.\n\n';
for(const file of files){
 const tracked=git(['ls-files','--error-unmatch','--',file]).status===0;
 const diff=git(tracked?['diff','-U10','HEAD','--',file]:['diff','--no-index','-U10','--','NUL',file]);
 if(diff.status!==0&&diff.status!==1)throw new Error(`${file}: ${diff.stderr}`);
 output+=`\n## ${file} (${tracked?'HEAD-to-current; includes prior edits':'full untracked-file snapshot'})\n\n${diff.stdout}`;
}
await mkdir('artifacts',{recursive:true});
const path='artifacts/main-combat-view-review.patch';await writeFile(path,output);
console.log(JSON.stringify({path,head:head.stdout.trim(),bytes:Buffer.byteLength(output),files:files.length}));
