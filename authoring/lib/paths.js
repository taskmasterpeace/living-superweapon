// Path safety. Imported files and manifests are untrusted; a path is data until proven
// to be a plain relative location inside a root this pipeline is allowed to touch.
import {resolve,sep,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';

export const REPO_ROOT=resolve(fileURLToPath(new URL('../../',import.meta.url)));
export const AUTHORING_ROOT=resolve(REPO_ROOT,'authoring');
export const OUTPUT_ROOT=resolve(REPO_ROOT,'public','authored-assets');
export const SOURCE_ROOTS=['assets-src/','authoring/'];

const SAFE=/^[A-Za-z0-9][A-Za-z0-9._\-/]{0,199}$/;
const BACKSLASH=String.fromCharCode(92);
export function unsafePathReason(p){
 if(typeof p!=='string'||!p.length)return 'path must be a non-empty string';
 if(p.length>200)return 'path is longer than 200 characters';
 if(/^[A-Za-z]:/.test(p)||p.startsWith('/')||p.startsWith(BACKSLASH))return 'path must be relative';
 if(p.includes(BACKSLASH))return 'path must use forward slashes';
 if(/^[a-z][a-z0-9+.-]*:/i.test(p))return 'path must not be a URL';
 if(p.split('/').some(seg=>seg==='..'||seg==='.'||seg===''))return 'path must not contain . or .. segments';
 if(!SAFE.test(p))return 'path contains characters outside [A-Za-z0-9._-/]';
 return null;
}
export const isSafeRelativePath=p=>unsafePathReason(p)===null;
export function isUnderSourceRoot(p){return SOURCE_ROOTS.some(root=>p.startsWith(root));}
// Resolve a manifest-relative or repo-relative path and refuse anything escaping its base.
export function resolveWithin(base,p){
 const reason=unsafePathReason(p);if(reason)throw new Error(`${reason}: ${p}`);
 const abs=resolve(base,p),rel=relative(base,abs);
 if(rel.startsWith('..')||isAbsolute(rel))throw new Error(`path escapes its base: ${p}`);
 return abs;
}
export const toPosix=p=>p.split(sep).join('/');
