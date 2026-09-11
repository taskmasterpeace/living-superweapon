const REF=/^[a-z0-9][a-z0-9._-]{0,79}@[1-9]\d*$/;
const HASH=/^[0-9a-f]{64}$/;

export class AuthoredAssetError extends Error {
  constructor(code,message,{ref,cause,retryable=false}={}){
    super(message,{cause});this.name='AuthoredAssetError';this.code=code;this.ref=ref;
    this.retryable=retryable;this.fallbackAvailable=true;this.status='unavailable';
  }
}

const freeze=value=>{
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}
  return value;
};
const clone=value=>JSON.parse(JSON.stringify(value));
const safeRelative=(path,allowSlash=true)=>{
  if(typeof path!=='string'||path.length===0||path.includes('\\')||/^[a-z][a-z0-9+.-]*:/i.test(path))return false;
  let decoded;try{decoded=decodeURIComponent(path);}catch{return false;}
  return !decoded.startsWith('/')&&!decoded.includes('\\')&&!/[?#]/.test(decoded)&&(allowSlash||!decoded.includes('/'))&&decoded.split('/').every(part=>part&&part!=='.'&&part!=='..');
};
function descendantUrl(path,base,code,ref){
  if(!safeRelative(path))fail(code,`Unsafe authored asset path in ${ref??'catalog'}.`,{ref});
  const parent=new URL(base),resolved=new URL(path,parent),prefix=parent.pathname.endsWith('/')?parent.pathname:`${parent.pathname}/`;
  if(resolved.origin!==parent.origin||resolved.search||resolved.hash||!resolved.pathname.startsWith(prefix))fail(code,`Authored asset path escapes its declared directory in ${ref??'catalog'}.`,{ref});
  return resolved;
}
const fail=(code,message,options)=>{throw new AuthoredAssetError(code,message,options);};
const finiteArray=(value,length)=>Array.isArray(value)&&value.length===length&&value.every(Number.isFinite);

function validateCatalog(value){
  if(!value||value.format!=='pw-asset-catalog'||value.formatVersion!==1||!Array.isArray(value.packages))fail('INVALID_CATALOG','Authored asset catalog has an unsupported format.');
  const seen=new Set();
  for(const entry of value.packages){
    const ref=`${entry?.id}@${entry?.version}`;
    if(!REF.test(ref)||seen.has(ref)||typeof entry.kind!=='string'||!safeRelative(entry.dir)||!HASH.test(entry.packageHash||''))fail('INVALID_CATALOG',`Invalid authored asset catalog entry: ${ref}.`);
    seen.add(ref);
  }
  return freeze(clone(value));
}

function validateManifest(manifest,entry,expectedKind,ref){
  if(!manifest||manifest.format!=='pw-asset-package'||manifest.formatVersion!==1||manifest.id!==entry.id||manifest.version!==entry.version||manifest.packageHash!==entry.packageHash)
    fail('INVALID_MANIFEST',`Manifest identity does not match catalog entry ${ref}.`,{ref});
  if(manifest.kind!==entry.kind)fail('INVALID_MANIFEST',`Manifest kind does not match catalog entry ${ref}.`,{ref});
  if(expectedKind&&manifest.kind!==expectedKind)fail('WRONG_KIND',`${ref} is ${manifest.kind}, not ${expectedKind}.`,{ref});
  if(!Array.isArray(manifest.outputs)||manifest.outputs.length===0)fail('INVALID_MANIFEST',`${ref} declares no outputs.`,{ref});
  const roles=new Set();
  for(const output of manifest.outputs){
    if(!safeRelative(output?.path)||roles.has(output?.role)||typeof output.role!=='string'||!HASH.test(output.sha256||'')||!Number.isSafeInteger(output.bytes)||output.bytes<0)
      fail(output?.path&&!safeRelative(output.path)?'OUTPUT_TRAVERSAL':'INVALID_MANIFEST',`Invalid output declaration in ${ref}.`,{ref});
    roles.add(output.role);
  }
  for(const socket of manifest.sockets??[]){
    if(!socket||typeof socket.name!=='string'||typeof socket.parent!=='string'||!finiteArray(socket.position,3)||!finiteArray(socket.rotation,4))fail('INVALID_MANIFEST',`Invalid socket transform in ${ref}.`,{ref});
  }
  if(manifest.bounds&&(!finiteArray(manifest.bounds.min,3)||!finiteArray(manifest.bounds.max,3)))fail('INVALID_MANIFEST',`Invalid bounds in ${ref}.`,{ref});
  const bridge=manifest.compatibility?.poseBridge;
  if(bridge&&(!Number.isInteger(bridge.frameLength)||bridge.frameLength!==45||typeof bridge.layout!=='string'||!bridge.layout.startsWith('8x3 unit segment directions')))fail('INVALID_MANIFEST',`Unsupported pose bridge in ${ref}.`,{ref});
  return freeze(clone(manifest));
}

async function sha256(bytes){
  const digest=await globalThis.crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');
}
function inspectGlb(bytes,ref){
  const view=new DataView(bytes);if(view.byteLength<20||view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2)fail('INVALID_GLB',`${ref} output is not a GLB 2 file.`,{ref});
  const jsonLength=view.getUint32(12,true),jsonType=view.getUint32(16,true);
  if(jsonType!==0x4e4f534a||20+jsonLength>view.byteLength)fail('INVALID_GLB',`${ref} has no valid embedded GLB JSON.`,{ref});
  let doc;try{doc=JSON.parse(new TextDecoder().decode(new Uint8Array(bytes,20,jsonLength)).replace(/\u0000+$/,''));}catch(cause){fail('INVALID_GLB',`${ref} has invalid embedded GLB JSON.`,{ref,cause});}
  for(const resource of [...(doc.buffers??[]),...(doc.images??[])])if(resource.uri&&!String(resource.uri).startsWith('data:'))fail('EXTERNAL_RESOURCE',`${ref} references an external GLB resource.`,{ref});
}
function ownedDisposer(root){
  const geometries=new Set(),materials=new Set(),textures=new Set(),skeletons=new Set();
  root.traverse(object=>{
    if(object.geometry)geometries.add(object.geometry);if(object.skeleton)skeletons.add(object.skeleton);
    const mats=Array.isArray(object.material)?object.material:[object.material];
    for(const material of mats)if(material){materials.add(material);for(const value of Object.values(material))if(value?.isTexture)textures.add(value);}
  });
  let disposed=false;return ()=>{if(disposed)return;disposed=true;for(const item of textures)item.dispose();for(const item of materials)item.dispose();for(const item of geometries)item.dispose();for(const item of skeletons)item.dispose();root.removeFromParent();};
}

export function createAuthoredAssetLoader({fetch:fetchImpl=globalThis.fetch,baseUrl,parseGLB}={}){
  const rootUrl=new URL(baseUrl??'/authored-assets/',globalThis.location?.href??'http://localhost/').href;
  let catalogPromise;const packageCache=new Map(),byteCache=new Map();
  const get=async(url,kind,ref)=>{
    let response;try{response=await fetchImpl(url);}catch(cause){fail('FETCH_FAILED',`Could not fetch ${kind} for ${ref??'authored assets'}.`,{ref,cause,retryable:true});}
    if(!response?.ok)fail('FETCH_FAILED',`Could not fetch ${kind} for ${ref??'authored assets'} (${response?.status??'network error'}).`,{ref,retryable:true});
    return response;
  };
  async function loadCatalog(){
    if(!catalogPromise)catalogPromise=(async()=>{const response=await get(new URL('catalog.json',rootUrl),'catalog');let value;try{value=await response.json();}catch(cause){fail('INVALID_CATALOG','Authored asset catalog is not valid JSON.',{cause,retryable:true});}return validateCatalog(value);})().catch(error=>{catalogPromise=undefined;throw error;});
    return catalogPromise;
  }
  async function resolvePackage(ref,expectedKind){
    if(typeof ref!=='string'||!REF.test(ref))fail('INVALID_REFERENCE',`Invalid authored asset reference: ${String(ref)}.`,{ref});
    const key=`${ref}|${expectedKind??''}`;if(packageCache.has(key))return packageCache.get(key);
    const promise=(async()=>{const catalog=await loadCatalog(),entry=catalog.packages.find(item=>`${item.id}@${item.version}`===ref);if(!entry)fail('PACKAGE_UNAVAILABLE',`Authored asset ${ref} is not in this catalog.`,{ref,retryable:true});
      if(expectedKind&&entry.kind!==expectedKind)fail('WRONG_KIND',`${ref} is ${entry.kind}, not ${expectedKind}.`,{ref});
      const packageDir=descendantUrl(entry.dir,rootUrl,'INVALID_CATALOG',ref),packageUrl=new URL(`${packageDir.href}/`),response=await get(new URL('manifest.json',packageUrl),'manifest',ref);let raw;try{raw=await response.json();}catch(cause){fail('INVALID_MANIFEST',`Manifest for ${ref} is not valid JSON.`,{ref,cause});}
      const manifest=validateManifest(raw,entry,expectedKind,ref);return freeze({manifest,baseUrl:packageUrl.href,packageHash:entry.packageHash});})();
    packageCache.set(key,promise);try{return await promise;}catch(error){packageCache.delete(key);throw error;}
  }
  async function readOutput(ref,role,{type='json',expectedKind}={}){
    const pack=await resolvePackage(ref,expectedKind),output=pack.manifest.outputs.find(item=>item.role===role);if(!output)fail('OUTPUT_UNAVAILABLE',`${ref} has no ${role} output.`,{ref});
    const key=`${ref}|${role}`;let promise=byteCache.get(key);if(!promise){promise=(async()=>{const response=await get(descendantUrl(output.path,pack.baseUrl,'OUTPUT_TRAVERSAL',ref),'output',ref),buffer=await response.arrayBuffer();if(buffer.byteLength!==output.bytes||await sha256(buffer)!==output.sha256)fail('HASH_MISMATCH',`Output verification failed for ${ref} (${role}).`,{ref,retryable:true});return buffer;})();byteCache.set(key,promise);}
    let buffer;try{buffer=await promise;}catch(error){byteCache.delete(key);throw error;}const own=buffer.slice(0);
    if(type==='bytes')return own;if(type!=='json')fail('INVALID_OUTPUT_TYPE',`Unsupported output type ${type}.`,{ref});
    try{return freeze(JSON.parse(new TextDecoder().decode(own)));}catch(cause){fail('INVALID_OUTPUT',`${ref} ${role} output is not valid JSON.`,{ref,cause});}
  }
  async function loadBodyDefinition(ref){return readOutput(ref,'body',{type:'json',expectedKind:'humanoid-body'});}
  async function loadEquipmentInstance(ref){
    const pack=await resolvePackage(ref,'equipment'),bytes=await readOutput(ref,'glb',{type:'bytes',expectedKind:'equipment'});inspectGlb(bytes,ref);
    let gltf;if(parseGLB)gltf=await parseGLB(bytes.slice(0),pack.baseUrl);else{const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');gltf=await new GLTFLoader().parseAsync(bytes.slice(0),pack.baseUrl);}
    const root=gltf.scene??gltf.scenes?.[0];if(!root?.traverse)fail('INVALID_GLB',`${ref} did not contain a scene.`,{ref});
    return {root,manifest:pack.manifest,dispose:ownedDisposer(root)};
  }
  return {loadCatalog,resolvePackage,readOutput,loadBodyDefinition,loadEquipmentInstance};
}

const singleton=createAuthoredAssetLoader();
export const loadCatalog=(...args)=>singleton.loadCatalog(...args);
export const resolvePackage=(...args)=>singleton.resolvePackage(...args);
export const readOutput=(...args)=>singleton.readOutput(...args);
export const loadBodyDefinition=(...args)=>singleton.loadBodyDefinition(...args);
export const loadEquipmentInstance=(...args)=>singleton.loadEquipmentInstance(...args);
