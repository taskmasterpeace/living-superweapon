// Renders the manifest's own numbers. Everything here is a read of the package; nothing is
// computed from a recipe or a claim.
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'})[c]);
export function renderReport(m,entry){
 const b=m.budgets,rows=Object.keys(b.limits).map(key=>{
  const used=b.measured[key],limit=b.limits[key],frac=limit?Math.min(1,used/limit):0;
  return `<tr><td>${key}</td><td class="mono">${used.toLocaleString()}</td><td class="mono">${limit.toLocaleString()}</td><td><div class="bar"><i class="${used>limit?'over':''}" style="width:${(frac*100).toFixed(1)}%"></i></div></td></tr>`;
 }).join('');
 const sockets=(m.sockets||[]).map(s=>`<span>${esc(s.name)} → ${esc(s.parent)}</span>`).join('')||'<span>none</span>';
 const clips=(m.clips||[]).map(c=>`<tr><td class="mono">${esc(c.id)}</td><td>${esc(c.take)}</td><td class="mono">${c.duration.toFixed(3)}s</td><td>${c.loop?'loop':'once'}</td><td class="mono">${c.frames}@${c.sampleRate}Hz</td><td>${esc(c.handedness)}${c.mirror?' · mirror '+c.mirror:''}</td><td>${(c.events||[]).map(e=>`${esc(e.type)}${e.side?'·'+e.side:''}@${e.t.toFixed(2)}`).join(', ')}</td></tr>`).join('');
 const sources=m.source.files.map(f=>`<tr><td class="mono">${esc(f.path)}</td><td class="mono">${f.sha256.slice(0,16)}…</td></tr>`).join('');
 const mapping=m.rig?.mapping?Object.entries(m.rig.mapping).map(([slot,joint])=>`<span>${esc(slot)} ← ${esc(joint)}</span>`).join(''):'';
 const zones=(m.hitZones||[]).map(z=>`<span>${esc(z.zone)} ${esc(z.shape)} @ ${esc(z.attach)}</span>`).join('')||'<span>none declared (optional metadata; runtime collision stays main-task owned)</span>';
 return `
 <p><b class="${entry.ok?'pass':'fail'}">${entry.ok?'STRUCTURAL PASS':'STRUCTURAL FAIL'}</b> · ${entry.errors} validation errors · <b>Visual acceptance: not recorded here</b> (a package that validates is not art-approved; see docs/authoring/WORKFLOW.md)</p>
 <h3>Budgets · ${esc(b.profile)}</h3><table class="report"><tr><th>metric</th><th>measured</th><th>limit</th><th>use</th></tr>${rows}</table>
 <h3>Provenance</h3><p>${esc(m.provenance.author)} · ${esc(m.provenance.license)} · ${esc(m.provenance.redistribution)}${m.provenance.url?` · <a href="${esc(m.provenance.url)}" target="_blank" rel="noopener">source page</a>`:''}${m.provenance.revision?` · rev ${esc(m.provenance.revision)}`:''}</p>${m.provenance.terms?`<p class="mono" style="font-size:11px">${esc(m.provenance.terms)}</p>`:''}
 <h3>Source · ${esc(m.source.adapter)}</h3><table class="report"><tr><th>file</th><th>sha256</th></tr>${sources}<tr><td class="mono">${esc(m.source.recipe.path)}</td><td class="mono">${m.source.recipe.sha256.slice(0,16)}…</td></tr></table>
 <p class="mono" style="font-size:11px">tool ${esc(m.tool.name)} ${esc(m.tool.version)} · three ${esc(m.tool.three)} · adapter v${m.tool.adapterVersion} · cache ${esc(m.build.cacheKey.slice(0,12))} · content ${esc(m.build.contentHash?.slice(0,12)||'')}</p>
 <h3>Units</h3><p class="mono" style="font-size:11px">${esc(m.units.lengthUnit)} (1u = ${m.units.metersPerUnit}m) · up ${esc(m.units.up)} · forward ${esc(m.units.forward)} · source ${esc(m.units.sourceConversion.sourceUp)}/${esc(m.units.sourceConversion.sourceForward)} · scale ×${m.units.sourceConversion.scale} · yaw ${m.units.sourceConversion.yawDegrees}° · mirrorX ${m.units.sourceConversion.mirrorX}</p>
 ${m.rig?`<h3>Rig · ${esc(m.rig.skeleton)}${m.rig.bones?` · ${m.rig.bones} bones`:''}${m.rig.catalogBody?` · body ${esc(m.rig.catalogBody)}`:''}</h3><div class="chips">${mapping}</div>`:''}
 <h3>Sockets</h3><div class="chips">${sockets}</div>
 ${clips?`<h3>Clips</h3><table class="report"><tr><th>id</th><th>take</th><th>duration</th><th>loop</th><th>frames</th><th>hand</th><th>events</th></tr>${clips}</table>`:''}
 <h3>Hit zones</h3><div class="chips">${zones}</div>
 <h3>Outputs</h3><table class="report"><tr><th>file</th><th>role</th><th>bytes</th><th>sha256</th></tr>${m.outputs.map(o=>`<tr><td class="mono">${esc(o.path)}</td><td>${esc(o.role)}</td><td class="mono">${o.bytes.toLocaleString()}</td><td class="mono">${o.sha256.slice(0,16)}…</td></tr>`).join('')}</table>`;
}
