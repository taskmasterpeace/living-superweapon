// The build driver: recipe → adapter → normalized outputs → validated, versioned package.
// Rebuilding a committed recipe never calls an AI or a paid service; every input is a file
// with a hash. Cache key = source hashes + recipe + tool version + adapter version + options.
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {resolve,relative,dirname,join} from 'node:path';
import {REPO_ROOT,AUTHORING_ROOT,OUTPUT_ROOT,resolveWithin,toPosix,unsafePathReason,isUnderSourceRoot} from './paths.js';
import {sha256,sha256Text,hashJson,packageHashOf} from './hash.js';
import {limitsFor,BUDGET_KEYS} from './budgets.js';
import {commitPackage,listPackages,readPackage,writeCatalog} from './package-io.js';
import {POSE_BRIDGE} from './slots.js';
import {ADAPTERS} from '../adapters/index.js';

const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
const threeVersion=JSON.parse(await readFile(new URL('../node_modules/three/package.json',import.meta.url),'utf8')).version;
export const TOOL={name:'powerworld-authoring',version:pkg.version,three:threeVersion};
// The cache must not survive a change to the tool's own code: hash every lib/adapter/vendor
// source into the key, so an edited derivation rule can never serve yesterday's output.
async function toolSourceHash(){
 const {readdir}=await import('node:fs/promises');
 const parts=[];
 for(const dir of ['lib','adapters','vendor']){
  const walk=async d=>{let entries=[];try{entries=await readdir(d,{withFileTypes:true});}catch{return;}for(const e of entries.sort((x,y)=>x.name.localeCompare(y.name))){const p=join(d,e.name);if(e.isDirectory())await walk(p);else if(/\.(m?js|json)$/.test(e.name))parts.push(toPosix(relative(AUTHORING_ROOT,p))+':'+sha256(await readFile(p)));}};
  await walk(join(AUTHORING_ROOT,dir));
 }
 return sha256Text(parts.join('\n'));
}
const TOOL_SOURCE=await toolSourceHash();
export const UNITS={lengthUnit:'game-unit',metersPerUnit:0.19,up:'+Y',forward:'+Z',handedness:'right'};

// Text inputs are hashed and parsed with their line endings normalised to LF, so a checkout made
// with Git's CRLF conversion records and reproduces the same hashes as one made without it.
export const TEXT_SOURCE=/[.](json|js|mjs|md|txt|gltf|asf|amc|csv)$/i;
const CR=String.fromCharCode(13),LF=String.fromCharCode(10);
export const normalizeEol=bytes=>{const s=bytes.toString('utf8');return s.includes(CR)?Buffer.from(s.split(CR+LF).join(LF).split(CR).join(LF),'utf8'):bytes;};
export async function loadRecipe(recipePath){
 const abs=resolve(REPO_ROOT,recipePath),text=normalizeEol(await readFile(abs)).toString('utf8');
 const recipe=JSON.parse(text);
 const rel=toPosix(relative(REPO_ROOT,abs));
 if(!rel.startsWith('authoring/recipes/'))throw new Error(`recipes live under authoring/recipes/: ${rel}`);
 if(typeof recipe.adapter!=='string'||!Object.hasOwn(ADAPTERS,recipe.adapter))throw new Error(`${rel}: unknown adapter "${recipe.adapter}". Known: ${Object.keys(ADAPTERS).join(', ')}`);
 return {recipe,path:rel,sha256:sha256Text(text),dir:dirname(abs)};
}
// Source files are declared by the recipe, resolved against the repo, hashed before use.
export async function resolveSources(loaded){
 const files=[];
 for(const p of loaded.recipe.sources||[]){
  const reason=unsafePathReason(p);if(reason)throw new Error(`${loaded.path}: source ${p}: ${reason}`);
  if(!isUnderSourceRoot(p))throw new Error(`${loaded.path}: source ${p} must live under assets-src/ or authoring/`);
  const abs=resolveWithin(REPO_ROOT,p);
  let bytes;try{bytes=await readFile(abs);}catch{throw new Error(`${loaded.path}: source file missing: ${p}. See docs/authoring/SOURCES.md for how to fetch pinned sources.`);}
  if(TEXT_SOURCE.test(p))bytes=normalizeEol(bytes);
  files.push({path:p,sha256:sha256(bytes),abs,bytes});
 }
 return files;
}
async function cacheGet(key){
 try{const text=await readFile(join(AUTHORING_ROOT,'.cache',key+'.json'),'utf8');return JSON.parse(text);}catch{return null;}
}
async function cachePut(key,value){
 await mkdir(join(AUTHORING_ROOT,'.cache'),{recursive:true});
 await writeFile(join(AUTHORING_ROOT,'.cache',key+'.json'),JSON.stringify(value));
}
// Same id, different content → next version. Same content → the existing version is kept.
async function chooseVersion(id,contentHash,root){
 const dirs=(await listPackages(root)).filter(d=>toPosix(d).includes(`/${id}/v`));
 let max=0,same=null;
 for(const dir of dirs){
  const {manifest}=await readPackage(dir);
  if(manifest.id!==id)continue;
  max=Math.max(max,manifest.version);
  if(manifest.build?.contentHash===contentHash)same=manifest.version;
 }
 return {version:same??max+1,existing:same!==null,latest:max};
}
export async function buildRecipe(recipePath,{root=OUTPUT_ROOT,profile='desktop',force=false,log=()=>{}}={}){
 const loaded=await loadRecipe(recipePath);
 const adapter=ADAPTERS[loaded.recipe.adapter];
 const sources=await resolveSources(loaded);
 const options=loaded.recipe.options||{};
 const cacheKey=hashJson({sources:sources.map(s=>({path:s.path,sha256:s.sha256})),recipe:loaded.sha256,tool:TOOL,toolSource:TOOL_SOURCE,adapter:{name:adapter.name,version:adapter.version},options,profile});
 log(`build ${loaded.recipe.id} via ${adapter.name}@${adapter.version} (cache ${cacheKey.slice(0,12)})`);
 let produced=force?null:await cacheGet(cacheKey);
 if(produced){log('  cache hit');produced.outputs=produced.outputs.map(o=>({...o,bytes:Buffer.from(o.bytes,'base64')}));}
 else{
  produced=await adapter.build({recipe:loaded.recipe,recipeDir:loaded.dir,sources,options,log});
  await cachePut(cacheKey,{...produced,outputs:produced.outputs.map(o=>({...o,bytes:Buffer.from(o.bytes).toString('base64')}))});
 }
 const {manifest:partial,outputs}=produced;
 const measured={};for(const key of BUDGET_KEYS)measured[key]=Number.isInteger(partial.budgets?.measured?.[key])?partial.budgets.measured[key]:0;
 const frames=(partial.clips||[]).reduce((n,c)=>n+(c.frames||0),0);
 const limits=limitsFor(loaded.recipe.kind,profile,{frames});
 const contentHash=hashJson({outputs:outputs.map(o=>({path:o.path,role:o.role,sha256:sha256(o.bytes)})),partial:{...partial,budgets:undefined}});
 const {version,existing}=await chooseVersion(loaded.recipe.id,contentHash,root);
 if(existing&&!force){log(`  unchanged: ${loaded.recipe.id} v${version} already holds this content`);return {unchanged:true,id:loaded.recipe.id,version};}
 const manifest={
  format:'pw-asset-package',formatVersion:1,id:loaded.recipe.id,version,kind:loaded.recipe.kind,displayName:loaded.recipe.displayName,tags:loaded.recipe.tags||[],
  ...partial,
  provenance:{...loaded.recipe.provenance,...partial.provenance},
  source:{adapter:`${adapter.name}@${adapter.version}`,files:sources.map(s=>({path:s.path,sha256:s.sha256})),recipe:{path:loaded.path,sha256:loaded.sha256},...partial.source},
  tool:{...TOOL,adapterVersion:adapter.version},
  build:{options,cacheKey,contentHash,profile},
  units:{...UNITS,sourceConversion:partial.units?.sourceConversion},
  budgets:{profile,measured,limits},
  // Structural pass is what commitPackage proves; visual acceptance and blockers are declared
  // on the recipe by a person and default to "not approved, no blockers known".
  acceptance:{visual:'unapproved',blockers:[],...(loaded.recipe.acceptance||{}),...(partial.acceptance||{})},
 };
 if(loaded.recipe.kind==='humanoid-motion')manifest.compatibility={...manifest.compatibility,poseBridge:{frameLength:POSE_BRIDGE.frameLength,layout:POSE_BRIDGE.layout,engineModule:POSE_BRIDGE.engineModule}};
 const committed=await commitPackage(manifest,outputs,root);
 log(`  wrote ${toPosix(relative(REPO_ROOT,committed.dir))} (${outputs.length} outputs)`);
 return {unchanged:false,id:manifest.id,version,dir:committed.dir,manifest:committed.manifest};
}
export async function buildAll(recipePaths,opts={}){
 const results=[];
 for(const p of recipePaths){
  try{results.push({recipe:p,...(await buildRecipe(p,opts))});}
  catch(e){results.push({recipe:p,failed:true,error:e.message,report:e.report});opts.log?.(`  FAILED ${p}: ${e.message}`);if(e.report)for(const err of e.report.errors)opts.log?.(`    [${err.code}] ${err.path}: ${err.message}`);}
 }
 await writeCatalog(opts.root||OUTPUT_ROOT);
 return results;
}
