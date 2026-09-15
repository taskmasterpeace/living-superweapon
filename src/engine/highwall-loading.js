export function highwallLoading(){
 document.getElementById('highwall-loading')?.remove();
 const el=document.createElement('div');el.id='highwall-loading';el.setAttribute('role','status');el.setAttribute('aria-live','polite');
 el.innerHTML=`<style>#highwall-loading{position:fixed;inset:0;z-index:10000;background:#44483c;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#eeeade;font:500 16px Inter,system-ui,sans-serif}#highwall-loading img{width:min(1080px,100vw);max-height:76vh;object-fit:contain}#highwall-loading p{margin:18px;text-align:center}#highwall-loading progress{width:min(360px,75vw);height:5px;accent-color:#b94535}#highwall-loading small{margin-top:18px;color:#d2d2c7}</style><img src="/images/highwall/loading.png" alt="War World Acendents"><p>Preparing Highwall</p><progress aria-label="Loading Highwall"></progress><small>Combined-arms proving ground</small>`;
 document.body.appendChild(el);
 return {stage(text){el.querySelector('p').textContent=text;},frame:()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))),close:()=>el.remove(),fail(error){el.querySelector('p').textContent=`Unable to load: ${error.message}. Reload to retry.`;el.querySelector('progress').remove();}};
}
