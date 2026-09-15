// Development-only identity, injected by Vite. Never included in production builds.
const badge=document.createElement('button');
badge.type='button';
badge.textContent='TEST BUILD · checking…';
badge.style.cssText='position:fixed;right:10px;bottom:8px;z-index:2147483000;background:#15160feb;color:#efd778;border:1px solid #6b6039;border-radius:6px;padding:5px 8px;font:11px system-ui;cursor:pointer;max-width:80vw';
badge.title='Click to inspect the checkout serving this page';
document.body.append(badge);
let identity=null;
badge.onclick=()=>{if(identity)window.alert(`PowerWorld test build\n\nBranch: ${identity.branch}\nRevision: ${identity.revision}\nCheckout: ${identity.worktree}\nTracked changes: ${identity.trackedDiffHash}\nURL: ${location.href}\n\nThis identifies the served checkout; it does not certify gameplay acceptance.`);};
try{
 const response=await fetch('/__pw_playtest_identity',{cache:'no-store'});
 if(!response.ok)throw Error('Identity unavailable');
 identity=await response.json();
 if(identity.version!==1||!identity.revision||!identity.worktree)throw Error('Invalid identity');
 badge.textContent=`TEST · ${identity.branch} · ${identity.revision.slice(0,7)} · :${location.port}`;
}catch{
 badge.textContent='TEST BUILD · IDENTITY UNVERIFIED';badge.style.color='#ffb3a1';
}
