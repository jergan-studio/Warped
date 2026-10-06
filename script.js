const DB='warped-drive',STORE='files';let db,files=[],view='drive',recording=false,recorder,recordStream,recordChunks=[];const $=id=>document.getElementById(id);
function toast(t){$('toast').textContent=t;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),2200)}
function initDB(){return new Promise((res,rej)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE,{keyPath:'id',autoIncrement:true});r.onsuccess=()=>{db=r.result;res()};r.onerror=()=>rej(r.error)})}
function allFiles(){return new Promise((res,rej)=>{const r=db.transaction(STORE).objectStore(STORE).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function putFile(f){return new Promise((res,rej)=>{const r=db.transaction(STORE,'readwrite').objectStore(STORE).add(f);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function replace(f){return new Promise((res,rej)=>{const r=db.transaction(STORE,'readwrite').objectStore(STORE).put(f);r.onsuccess=res;r.onerror=()=>rej(r.error)})}
async function refresh(){files=await allFiles();render()}
function fmt(n){if(n<1024)return n+' B';if(n<1048576)return(n/1024).toFixed(1)+' KB';if(n<1073741824)return(n/1048576).toFixed(1)+' MB';return(n/1073741824).toFixed(1)+' GB'}
function icon(type,name){if(name.endsWith('/'))return'📁';if(type.startsWith('image/'))return'🖼️';if(type.startsWith('video/'))return'🎬';if(type.startsWith('audio/'))return'🎵';if(type.includes('html'))return'🌐';if(type.includes('javascript'))return'🟨';if(type.includes('pdf'))return'📕';if(/zip|compressed/.test(type))return'🗜️';return'📄'}
function esc(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function isWebFile(f){return !f.trashed && !f.name.endsWith('/') && (/\.html?$/i.test(f.name)||/\.js$/i.test(f.name))}
function render(){
 let q=$('searchInput').value.toLowerCase(),list=files.filter(f=>f.name.toLowerCase().includes(q));
 if(view==='trash')list=list.filter(f=>f.trashed);else list=list.filter(f=>!f.trashed);
 if(view==='starred')list=list.filter(f=>f.starred);if(view==='recent')list.sort((a,b)=>b.created-a.created);
 $('viewTitle').textContent={drive:'My Drive',recent:'Recent',starred:'Starred',trash:'Trash'}[view];
 $('crumb').textContent='Private • This device • '+list.length+' item'+(list.length===1?'':'s');
 $('fileGrid').innerHTML=list.map(f=>'<article class="file-card"><div><div class="file-icon">'+icon(f.type,f.name)+'</div><div class="file-name" title="'+esc(f.name)+'">'+esc(f.name)+'</div><div class="file-meta">'+fmt(f.size||0)+'</div></div><div class="actions">'+(view==='trash'?'<button onclick="restore('+f.id+')">Restore</button>':'<button onclick="downloadFile('+f.id+')">Download</button>'+(isWebFile(f)?'<button onclick="runWebFile('+f.id+')">▶ Run</button>':'')+'<button onclick="star('+f.id+')">'+(f.starred?'★':'☆')+'</button><button onclick="trash('+f.id+')">Trash</button>')+'</div></article>').join('');
 $('empty').classList.toggle('hidden',list.length!==0);let total=files.reduce((n,f)=>n+(f.size||0),0);$('storageText').textContent=files.length+' file'+(files.length===1?'':'s')+' stored locally ('+fmt(total)+')';$('storageFill').style.width=Math.min(100,total/1073741824*100)+'%'
}
async function addFiles(list){for(const f of list)await putFile({name:f.name,type:f.type||'application/octet-stream',size:f.size,blob:f,created:Date.now(),starred:false,trashed:false});await refresh();toast('Added '+list.length+' file'+(list.length===1?'':'s')+' to private drive')}
async function downloadFile(id){let f=files.find(x=>x.id===id);if(!f)return;let a=document.createElement('a');a.href=URL.createObjectURL(f.blob);a.download=f.name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
async function trash(id){let f=files.find(x=>x.id===id);if(f){f.trashed=true;await replace(f);await refresh();toast('Moved to Trash')}}
async function restore(id){let f=files.find(x=>x.id===id);if(f){f.trashed=false;await replace(f);await refresh()}}
async function star(id){let f=files.find(x=>x.id===id);if(f){f.starred=!f.starred;await replace(f);await refresh()}}

function blobText(blob){return blob.text()}
async function buildMiniSite(mainFile){
 const htmlFiles=files.filter(f=>!f.trashed&&!f.name.endsWith('/')&&/\.html?$/i.test(f.name));
 const jsFiles=files.filter(f=>!f.trashed&&!f.name.endsWith('/')&&/\.js$/i.test(f.name));
 let html;
 if(/\.js$/i.test(mainFile.name)){
   const code=await blobText(mainFile.blob);
   html='<!doctype html><html><head><meta charset="utf-8"><title>'+esc(mainFile.name)+'</title></head><body><script>'+code.replace(/<\/script/gi,'<\\/script')+'<\/script></body></html>';
 }else html=await blobText(mainFile.blob);
 const urls=[];
 const makeUrl=async f=>{const u=URL.createObjectURL(f.blob);urls.push(u);return u};
 const byName=new Map();
 for(const f of files)if(!f.trashed&&!f.name.endsWith('/'))byName.set(f.name.toLowerCase(),f);
 html=html.replace(/(<script\b[^>]*\bsrc\s*=\s*["'])([^"']+)(["'][^>]*>)[\s\S]*?<\/script>/gi,async m=>m);
 const srcReplacements=[];
 const attrRe=/(\b(?:src|href)\s*=\s*["'])([^"'#]+)(["'])/gi;
 let m,last=0,out='';
 while((m=attrRe.exec(html))){out+=html.slice(last,m.index);let name=m[2].split('?')[0].split('#')[0].replace(/^\.\//,'');let f=byName.get(name.toLowerCase());if(f){let u=await makeUrl(f);out+=m[1]+u+m[3]}else out+=m[0];last=attrRe.lastIndex}
 out+=html.slice(last);html=out;
 return {html,urls};
}
async function runWebFile(id){
 const f=files.find(x=>x.id===id);if(!f)return;
 const {html,urls}=await buildMiniSite(f);
 $('previewTitle').textContent=f.name+' — Mini Website';
 $('previewFrame').srcdoc=html;
 $('previewModal').classList.remove('hidden');
 $('previewFrame').onload=()=>urls.forEach(u=>URL.revokeObjectURL(u));
}
$('closePreview').onclick=()=>{$('previewModal').classList.add('hidden');$('previewFrame').srcdoc=''}
$('unlockBtn').onclick=()=>$('privacyOverlay').classList.add('hidden');
$('fileInput').onchange=e=>addFiles([...e.target.files]);$('searchInput').oninput=render;
document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>{view=b.dataset.view;document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));b.classList.add('active');render()});
$('newBtn').onclick=()=>$('newMenu').classList.toggle('hidden');
$('folderBtn').onclick=async()=>{let name=prompt('Folder name');if(!name)return;await putFile({name:name+'/',type:'folder',size:0,blob:new Blob(['Warped folder']),created:Date.now(),starred:false,trashed:false});$('newMenu').classList.add('hidden');await refresh();toast('Folder created')};
$('dropZone').ondragover=e=>{e.preventDefault();$('dropZone').classList.add('drag')};$('dropZone').ondragleave=()=>$('dropZone').classList.remove('drag');$('dropZone').ondrop=e=>{e.preventDefault();$('dropZone').classList.remove('drag');addFiles([...e.dataTransfer.files])};

async function toggleRecord(){
 if(recording){recording=false;recorder?.stop();recordStream?.getTracks().forEach(t=>t.stop());$('recordBlackout').classList.add('hidden');$('recordBtn').classList.remove('recording');$('recordBtn').textContent='● Record Tab';return}
 try{recordStream=await navigator.mediaDevices.getDisplayMedia({video:{displaySurface:'browser'},audio:false});recording=true;recordChunks=[];recorder=new MediaRecorder(recordStream);recorder.ondataavailable=e=>{if(e.data.size)recordChunks.push(e.data)};recorder.onstop=()=>{if(recordChunks.length){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(recordChunks,{type:recorder.mimeType||'video/webm'}));a.download='warped-tab-recording.webm';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}recordChunks=[]};recorder.start();$('recordBlackout').classList.remove('hidden');$('recordBtn').classList.add('recording');$('recordBtn').textContent='■ Stop Recording';recordStream.getVideoTracks()[0].addEventListener('ended',()=>{if(recording)toggleRecord()});toast('Recording started — tab is black')}catch(e){toast('Recording was cancelled')}}
$('recordBtn').onclick=toggleRecord;
(async()=>{await initDB();await refresh()})();