const key=kind=>'lsw.library.favorites.'+kind+'.v1';
export function readFavorites(storage,kind){
 const raw=storage.getItem(key(kind));if(raw===null)return new Set();
 let data;try{data=JSON.parse(raw);}catch{throw Error('Favorites could not be read. Existing data was kept.');}
 if(data.version!==1||!Array.isArray(data.ids)||data.ids.some(id=>typeof id!=='string'||!id||id.length>200))throw Error('Unsupported favorites data. Existing data was kept.');
 return new Set(data.ids);
}
export function toggleFavorite(storage,kind,id){
 if(typeof id!=='string'||!id||id.length>200)throw Error('Choose a valid library entry first.');
 const ids=readFavorites(storage,kind);if(ids.has(id))ids.delete(id);else ids.add(id);
 storage.setItem(key(kind),JSON.stringify({version:1,ids:[...ids]}));return ids;
}
export function mountFavorites({host,kind,selected,onChange,storage=()=>localStorage}){
 const bar=document.createElement('div');bar.className='library-favorites';
 const toggle=document.createElement('button'),filter=document.createElement('button'),notice=document.createElement('p');
 toggle.type=filter.type='button';notice.setAttribute('role','status');notice.style.fontSize='12px';
 bar.style.cssText='display:flex;gap:6px;flex-wrap:wrap;margin:10px 0';bar.append(toggle,filter,notice);host.append(bar);
 let ids=new Set(),only=false;
 const sync=()=>{const chosen=selected(),active=ids.has(chosen);toggle.textContent=active?'★ Favorited':'☆ Favorite selected';toggle.setAttribute('aria-pressed',String(active));filter.textContent='Favorites only';filter.setAttribute('aria-pressed',String(only));filter.style.borderColor=only?'#ffd24a':'';};
 const load=()=>{try{ids=readFavorites(storage(),kind);notice.textContent='';}catch(e){notice.textContent=e.message;}sync();};
 toggle.onclick=()=>{try{ids=toggleFavorite(storage(),kind,selected());notice.textContent='';sync();onChange();}catch(e){notice.textContent=e.message;}};
 filter.onclick=()=>{only=!only;sync();onChange();};load();
 window.addEventListener('storage',e=>{if(e.key===key(kind)){load();onChange();}});
 return {sync,matches:id=>!only||ids.has(id)};
}
