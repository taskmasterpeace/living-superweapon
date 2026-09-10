// Hashing and canonical JSON. Every recorded hash in a manifest comes through here so
// two clean builds agree byte-for-byte on what "the same output" means.
import {createHash} from 'node:crypto';

export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export const sha256Text=text=>sha256(Buffer.from(text,'utf8'));

// Sorted keys at every depth, no whitespace, arrays kept in order. Non-finite numbers
// are refused rather than serialised as null, so a NaN can never hide inside a hash.
export function canonicalJson(value){
 return JSON.stringify(sortValue(value));
}
function sortValue(value){
 if(Array.isArray(value))return value.map(sortValue);
 if(value&&typeof value==='object'){
  const out={};for(const key of Object.keys(value).sort())out[key]=sortValue(value[key]);return out;
 }
 if(typeof value==='number'&&!Number.isFinite(value))throw new Error('canonicalJson: non-finite number');
 return value;
}
export const hashJson=value=>sha256Text(canonicalJson(value));
// The package hash covers everything except itself.
export function packageHashOf(manifest){
 const {packageHash,...rest}=manifest;return hashJson(rest);
}
