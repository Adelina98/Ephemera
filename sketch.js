/* EPHEMERA — p5.js personal ticket diary
   Paste this whole file into sketch.js in editor.p5js.org.
   OCR library (Tesseract.js) is loaded on demand from a CDN.
   Data is stored locally in this browser using IndexedDB.
*/
const EP = {
  db: null, tickets: [], year: new Date().getFullYear(), month: new Date().getMonth(),
  view: 'calendar', current: null, image: '', videoStream: null, ocrWorker: null,
  drawing: false, last: null, tool: 'pen', penColor: '#111111',
};

function setup() {
  noCanvas();
  document.title = 'ephemera. — a personal ticket archive';
  const style = document.createElement('style');
  style.textContent = `
    *{box-sizing:border-box}body{margin:0;background:#fff;color:#111;font-family:Inter,'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14px}
    button,input,textarea,select{font:inherit}button{cursor:pointer}button:disabled{cursor:not-allowed;opacity:.4}
    #ep{max-width:1200px;margin:0 auto;padding:26px 36px 70px}#ep header{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #111;padding-bottom:23px}
    .brand{font-size:27px;font-weight:500;letter-spacing:-1.5px}.rightnav{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .btn{background:#fff;border:1px solid #d3d3d3;border-radius:0;padding:10px 13px;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:#111}
    .btn:hover{border-color:#111}.btn.dark{background:#111;border-color:#111;color:white}.btn.on{border-color:#111;background:#efefef}
    .meta{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#777}.hero{display:flex;justify-content:space-between;gap:20px;align-items:end;margin:42px 0 26px}
    h1{font-size:clamp(32px,5vw,58px);font-weight:400;letter-spacing:-.055em;margin:6px 0 0;line-height:1.06}
    h2{font-size:26px;font-weight:400;letter-spacing:-.04em;margin:0}.rule{border:0;border-top:1px solid #ddd;margin:24px 0}
    .calendar-head{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border-top:1px solid #111}
    .dayname{padding:14px 7px;text-align:center;color:#777;font-size:11px}.calendar{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border-left:1px solid #e5e5e5;border-top:1px solid #e5e5e5}
    .day{min-height:118px;position:relative;background:#fff;border:0;border-right:1px solid #e5e5e5;border-bottom:1px solid #e5e5e5;text-align:left;padding:8px;overflow:hidden}
    .day:hover:not(.empty){background:#f6f6f6}.day.empty{background:#fcfcfc;cursor:default}.daynum{font-size:11px;color:#666}
    .ticketthumb{width:100%;height:66px;object-fit:contain;display:block;margin:4px auto 0}.count{position:absolute;right:7px;top:7px;font-size:10px;color:#777}
    .sectionrow{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.gallery{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:24px;margin-top:20px}
    .tile{background:#fff;border:0;text-align:left;padding:0;min-width:0}.tilefigure{height:160px;border:1px solid #eee;display:flex;align-items:center;justify-content:center;padding:14px;background:#fafafa}
    .tilefigure img{width:100%;height:100%;object-fit:contain}.tile p{font-size:12px;margin:10px 0 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .tile small{color:#777}.panel{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:30px}.field{display:block;margin-bottom:14px}
    .field label{display:block;font-size:10px;color:#777;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px}
    .field input,.field textarea,.field select{display:block;width:100%;border:1px solid #ddd;border-radius:0;background:#fff;padding:11px;outline:none;color:#111}
    .field input:focus,.field textarea:focus{border-color:#111}.field textarea{min-height:105px;resize:vertical}
    .preview{border:1px solid #e5e5e5;background:#fafafa;min-height:275px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;padding:20px}
    .preview img{max-width:100%;max-height:350px;object-fit:contain}.hint{color:#888;line-height:1.6;font-size:12px}
    .toolbar{display:flex;gap:8px;flex-wrap:wrap;margin:15px 0}.status{font-size:12px;color:#555;margin-top:12px;min-height:18px}
    #cameraVideo{width:100%;max-height:350px;object-fit:contain;background:#111;display:none}
    .editorwrap{width:100%;max-width:1000px;margin:20px auto;position:relative;border:1px solid #ddd;background:#f6f6f6;touch-action:none}
    #journalCanvas{display:block;width:100%;height:auto;touch-action:none;cursor:crosshair}
    .editorfields{display:grid;grid-template-columns:1fr 1fr;gap:14px}.emptymsg{text-align:center;padding:70px 15px;color:#777}
    .badge{border:1px solid #ddd;padding:6px 8px;color:#777;font-size:10px;text-transform:uppercase;letter-spacing:.07em}
    @media(max-width:700px){#ep{padding:18px 14px 48px}.brand{font-size:23px}.rightnav{gap:5px}.btn{padding:8px;font-size:10px}
      .hero{margin:32px 0 20px}.day{min-height:80px;padding:4px}.ticketthumb{height:40px}.panel,.editorfields{grid-template-columns:1fr}
      .gallery{grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}.tilefigure{height:135px}}
  `;
  document.head.appendChild(style);
  document.body.insertAdjacentHTML('beforeend', `<div id="ep"><header><div class="brand">ephemera.</div><div class="rightnav">
    <button class="btn" id="calendarTab">CALENDAR</button><button class="btn" id="gridTab">GRID</button>
    <button class="btn dark" id="addTab">+ ADD TICKET</button></div></header><main id="epContent"></main>
    <input type="file" id="fileInput" accept="image/*" hidden><input type="file" id="cameraInput" accept="image/*" capture="environment" hidden>
    <input type="file" id="bulkInput" accept="image/*" multiple hidden></div>`);
  document.getElementById('calendarTab').onclick = () => { stopCamera(); EP.view='calendar'; render(); };
  document.getElementById('gridTab').onclick = () => { stopCamera(); EP.view='grid'; render(); };
  document.getElementById('addTab').onclick = () => { stopCamera(); newTicket(); };
  document.getElementById('fileInput').onchange = async e => { if(e.target.files[0]) await imagePicked(e.target.files[0]); e.target.value=''; };
  document.getElementById('cameraInput').onchange = async e => { if(e.target.files[0]) await imagePicked(e.target.files[0]); e.target.value=''; };
  document.getElementById('bulkInput').onchange = async e => { await importMany(Array.from(e.target.files)); e.target.value=''; };
  openDB().then(async db => {EP.db=db; await refreshTickets(); render();}).catch(err=>{
    document.getElementById('epContent').textContent='Cannot access browser storage: '+err.message;
  });
}

function openDB(){return new Promise((res,rej)=>{
  const req=indexedDB.open('ephemera-tickets-v1',1);
  req.onupgradeneeded=()=>req.result.createObjectStore('tickets',{keyPath:'id'});
  req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error);
});}
function dbRequest(type,action,value){return new Promise((res,rej)=>{
  const tx=EP.db.transaction('tickets',type),store=tx.objectStore('tickets');
  const r=action==='getAll'?store.getAll():action==='put'?store.put(value):store.delete(value);
  r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);
});}
async function refreshTickets(){EP.tickets=await dbRequest('readonly','getAll');EP.tickets.sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999'));}
const $=s=>document.querySelector(s);
function escapeHTML(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function button(label,id,extra=''){return `<button class="btn ${extra}" id="${id}">${label}</button>`;}
function setStatus(s){const el=$('#status');if(el)el.textContent=s;}
function render(){
  $('#calendarTab').classList.toggle('on',EP.view==='calendar');$('#gridTab').classList.toggle('on',EP.view==='grid');
  if(EP.view==='calendar')renderCalendar();
  else if(EP.view==='grid')renderGrid();
  else if(EP.view==='scan')renderScan();
  else if(EP.view==='edit')renderEditor();
}
function formattedDate(d){if(!d)return 'DATE NOT SET';const x=new Date(d+'T12:00:00');return isNaN(x)?d:x.toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'});}
function renderCalendar(){
  const y=EP.year,m=EP.month,first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate();
  let html=`<div class="hero"><div><div class="meta">A PERSONAL ARCHIVE OF THINGS I CHOSE TO KEEP</div><h1>${new Date(y,m,1).toLocaleDateString('en-US',{month:'long',year:'numeric'})}</h1></div>
  <div style="display:flex;gap:8px">${button('←','prevMonth')}${button('→','nextMonth')}</div></div>
  <div class="sectionrow"><span class="meta">${EP.tickets.filter(t=>t.date&&t.date.startsWith(`${y}-${String(m+1).padStart(2,'0')}`)).length} TICKETS THIS MONTH</span>
  <span class="meta">${EP.tickets.length} OBJECTS IN YOUR ARCHIVE</span></div><div class="calendar-head">${['SUN','MON','TUE','WED','THU','FRI','SAT'].map(x=>`<div class="dayname">${x}</div>`).join('')}</div><div class="calendar">`;
  const total=Math.ceil((first+days)/7)*7;
  for(let i=0;i<total;i++){
    const d=i-first+1;
    if(d<1||d>days){html+=`<div class="day empty"></div>`;continue;}
    const date=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const found=EP.tickets.filter(t=>t.date===date),ticket=found[0];
    html+=`<button class="day" data-date="${date}"><span class="daynum">${d}</span>${found.length?`<span class="count">${'●'.repeat(found.length)}</span><img class="ticketthumb" src="${ticket.image}" alt="ticket">`:''}</button>`;
  }
  html+='</div><div class="sectionrow" style="margin-top:28px"><span class="meta">TICKETS WITHOUT A DATE</span><span class="meta">CLICK A DATE TO OPEN</span></div>';
  const undated=EP.tickets.filter(t=>!t.date);
  html+=undated.length?`<div class="gallery">${undated.map(tileHTML).join('')}</div>`:'<p class="hint">No undated tickets.</p>';
  $('#epContent').innerHTML=html;
  $('#prevMonth').onclick=()=>changeMonth(-1);$('#nextMonth').onclick=()=>changeMonth(1);
  document.querySelectorAll('[data-date]').forEach(el=>el.onclick=()=>{
    const matches=EP.tickets.filter(t=>t.date===el.dataset.date);
    if(matches.length===1){openTicket(matches[0].id)}
    else if(matches.length>1){EP.view='grid';EP.dateFilter=el.dataset.date;render()}
    else{newTicket(el.dataset.date)}
  });
  connectTiles();
}
function changeMonth(delta){const date=new Date(EP.year,EP.month+delta,1);EP.year=date.getFullYear();EP.month=date.getMonth();render();}
function tileHTML(t){return `<button class="tile" data-ticket="${escapeHTML(t.id)}"><div class="tilefigure"><img src="${t.image}" alt="${escapeHTML(t.title)}"></div>
  <p>${escapeHTML(t.title||'Untitled ticket')}</p><small>${escapeHTML(formattedDate(t.date))} · ${escapeHTML(t.category||'OTHER')}</small></button>`;}
function connectTiles(){document.querySelectorAll('[data-ticket]').forEach(x=>x.onclick=()=>openTicket(x.dataset.ticket));}
function renderGrid(){
  const shown=EP.dateFilter?EP.tickets.filter(t=>t.date===EP.dateFilter):EP.tickets;
  $('#epContent').innerHTML=`<div class="hero"><div><div class="meta">THE COLLECTION</div><h1>${EP.dateFilter||'All tickets.'}</h1></div><span class="meta">${shown.length} OBJECTS</span></div>
  <div class="sectionrow"><span class="meta">YOUR TICKETS, YOUR MEMORIES</span><div>${EP.dateFilter?button('SHOW ALL','showAll'):''}${button('IMPORT MULTIPLE IMAGES','bulkImport')}</div></div>
  ${shown.length?`<div class="gallery">${shown.map(tileHTML).join('')}</div>`:'<div class="emptymsg">No tickets yet. Add a scan to begin your archive.</div>'}`;
  $('#bulkImport').onclick=()=>$('#bulkInput').click();if($('#showAll'))$('#showAll').onclick=()=>{EP.dateFilter=null;render();};connectTiles();
}
function newTicket(date=''){
  EP.current={id:(crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random()),date,title:'',venue:'',category:'Other',notes:'',image:'',drawing:'',rawText:''};
  EP.image=''; EP.view='scan';render();
}
function renderScan(){
  $('#epContent').innerHTML=`<div class="hero"><div><div class="meta">01 / SCAN AND IDENTIFY</div><h1>Add a ticket.</h1></div></div>
  <div class="panel"><div><div class="preview" id="scanPreview"><span class="hint">Choose an image or open your camera.</span></div><video id="cameraVideo" autoplay playsinline muted></video>
   <div class="toolbar">${button('UPLOAD IMAGE','uploadImage')}${button('MOBILE CAMERA','mobileCamera')}${button('LIVE CAMERA','liveCamera')}${button('CAPTURE FRAME','captureFrame')}</div>
   <p class="hint">Use a clear, well-lit photo. QR codes and booking numbers should be hidden before publishing your collection.</p></div>
   <div><div class="meta" style="margin-bottom:20px">AUTO-FILL / EDIT DETAILS</div>
   ${fieldHTML('Event / Title','title')}${fieldHTML('Date','date','date')}${fieldHTML('Venue / Location','venue')}
   <div class="field"><label>Category</label><select id="field-category">${['Concert','Recital','Exhibition','Musical','Theatre','Travel','Other'].map(x=>`<option ${EP.current.category===x?'selected':''}>${x}</option>`).join('')}</select></div>
   <div class="toolbar">${button('READ TICKET (OCR)','runOCR','dark')}${button('SAVE & DECORATE →','scanNext')}</div><div class="status" id="status"></div>
   <details><summary class="hint">Detected text (optional)</summary><pre id="ocrText" style="white-space:pre-wrap;font-size:11px"></pre></details>
   </div></div>`;
  ['title','date','venue'].forEach(k=>{const e=$('#field-'+k);if(EP.current[k])e.value=EP.current[k];});
  if(EP.current.image)showScanImage();
  $('#uploadImage').onclick=()=>$('#fileInput').click();$('#mobileCamera').onclick=()=>$('#cameraInput').click();
  $('#liveCamera').onclick=startCamera;$('#captureFrame').onclick=captureFrame;
  $('#runOCR').onclick=recognizeTicket;$('#scanNext').onclick=()=>{
    updateFields();if(!EP.current.image){setStatus('Upload or capture a ticket image first.');return;}
    stopCamera();EP.view='edit';render();
  };
}
function fieldHTML(label,key,type='text'){return `<div class="field"><label for="field-${key}">${label}</label><input id="field-${key}" type="${type}" value="${escapeHTML(EP.current[key]||'')}"></div>`;}
function updateFields(){['title','date','venue'].forEach(k=>EP.current[k]=$('#field-'+k).value.trim());EP.current.category=$('#field-category').value;}
async function imagePicked(file){try{
  EP.current.image=await shrinkImage(file);showScanImage();setStatus('Image added. Click READ TICKET (OCR) to recognize text.');
}catch(err){setStatus('Image could not be read: '+err.message);}}
function showScanImage(){const el=$('#scanPreview');if(el)el.innerHTML=`<img src="${EP.current.image}" alt="New ticket">`;}
async function shrinkImage(file){return new Promise((res,rej)=>{
  const fr=new FileReader();fr.onerror=()=>rej(new Error('File read error'));
  fr.onload=()=>{const img=new Image();img.onload=()=>{
    const scale=Math.min(1,1350/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));
    const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);
    res(c.toDataURL('image/jpeg',.8));};img.onerror=()=>rej(new Error('Invalid image'));img.src=fr.result;};fr.readAsDataURL(file);
});}
async function startCamera(){
  try{stopCamera();const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
    EP.videoStream=stream;const video=$('#cameraVideo');video.srcObject=stream;video.style.display='block';$('#scanPreview').style.display='none';
    setStatus('Camera ready. Point it at the ticket, then choose CAPTURE FRAME.');
  }catch(err){setStatus('Camera unavailable. Try MOBILE CAMERA or UPLOAD IMAGE. '+err.message);}
}
function stopCamera(){if(EP.videoStream){EP.videoStream.getTracks().forEach(t=>t.stop());EP.videoStream=null;}}
async function captureFrame(){const v=$('#cameraVideo');if(!v||!EP.videoStream||!v.videoWidth){setStatus('Start the camera first.');return;}
  const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);EP.current.image=c.toDataURL('image/jpeg',.85);
  stopCamera();v.style.display='none';$('#scanPreview').style.display='flex';showScanImage();setStatus('Captured! Now read the ticket with OCR.');
}
function loadScript(url){return new Promise((res,rej)=>{
  if(window.Tesseract){res();return;}const s=document.createElement('script');s.src=url;s.onload=res;s.onerror=()=>rej(new Error('OCR library could not load. Check your connection.'));document.head.appendChild(s);
});}
async function recognizeTicket(){
  if(!EP.current.image){setStatus('Please upload or capture an image first.');return;}
  const b=$('#runOCR');b.disabled=true;
  try{
    setStatus('Loading OCR (Korean + English). First use may take a little longer...');
    await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@6/dist/tesseract.min.js');
    if(!EP.ocrWorker)EP.ocrWorker=await Tesseract.createWorker('kor+eng',1);
    setStatus('Reading printed text...');
    const result=await EP.ocrWorker.recognize(EP.current.image);
    EP.current.rawText=result.data.text||'';
    $('#ocrText').textContent=EP.current.rawText;
    const parsed=parseTicket(EP.current.rawText);
    for(const k of ['date','title','venue'])if(parsed[k]&&!$('#field-'+k).value.trim())$('#field-'+k).value=parsed[k];
    setStatus('Recognition complete. Please check and correct all fields before saving.');
  }catch(err){setStatus('OCR failed: '+err.message+' — you can still enter details manually.');}
  finally{b.disabled=false;}
}
function parseTicket(text){
  const lines=text.split(/\r?\n/).map(s=>s.trim()).filter(s=>s.length>2);
  const joined=lines.join(' '),out={title:'',date:'',venue:''};
  // Dates like 2023.07.05, 2023-07-05, 2023년 7월 5일, 2023/7/5.
  const match=joined.match(/(20\d{2})\s*(?:[.\/-]|년)\s*(\d{1,2})\s*(?:[.\/-]|월)\s*(\d{1,2})/);
  if(match){const yy=+match[1],mm=+match[2],dd=+match[3];const dt=new Date(yy,mm-1,dd);
    if(mm>=1&&mm<=12&&dd>=1&&dd<=31&&dt.getMonth()===mm-1)out.date=`${yy}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;}
  const likelyVenue=lines.find(x=>/(예술의전당|롯데콘서트홀|콘서트홀|아트센터|미술관|극장|홀\b|museum|theat(?:re|er)|concert hall|gallery)/i.test(x));
  out.venue=likelyVenue||'';
  // Heuristic: prefer longer informative lines, skip boilerplate and numbers.
  const candidates=lines.filter(x=>x.length>=4&&!/예매번호|결제|관람일|입장|좌석|금액|예약번호|티켓번호|www\.|http|^[\d\s:.,\-/]+$/i.test(x));
  out.title=(candidates.find(x=>x!==out.venue&&x.length>=8)||candidates.find(x=>x!==out.venue)||'').slice(0,110);
  return out;
}
async function importMany(files){
  const images=files.filter(f=>f.type.startsWith('image/'));let saved=0;
  for(const f of images){try{
    const t={id:(crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random()),title:f.name.replace(/\.[^.]+$/,''),date:'',venue:'',category:'Other',notes:'',drawing:'',rawText:'',image:await shrinkImage(f)};
    await dbRequest('readwrite','put',t);saved++;
  }catch(err){console.warn('Could not import',f.name,err);}}
  EP.dateFilter=null;await refreshTickets();render();alert(`${saved} images imported. They are under TICKETS WITHOUT A DATE until you edit their metadata.`);
}
function openTicket(id){stopCamera();const t=EP.tickets.find(x=>x.id===id);if(!t)return;EP.current=JSON.parse(JSON.stringify(t));EP.view='edit';render();}
function renderEditor(){const t=EP.current;
  $('#epContent').innerHTML=`<div class="hero"><div><div class="meta">02 / REMEMBER & DECORATE</div><h1>${escapeHTML(t.title||'Untitled ticket')}</h1></div>
  <span class="badge">${escapeHTML(formattedDate(t.date))}</span></div>
  <div class="sectionrow"><span class="meta">DRAW ON THE PAGE · WRITE A MEMORY · KEEP THE ORIGINAL</span><div>${button('EDIT INFO','editInfo')}${button('DELETE','deleteTicket')}</div></div>
  <div class="editorwrap"><canvas id="journalCanvas" width="1000" height="570"></canvas></div>
  <div class="toolbar">${button('PEN','penTool','on')}${button('ERASER','eraserTool')}${button('CLEAR DRAWING','clearDrawing')}${button('SAVE TO ARCHIVE','saveTicket','dark')}${button('EXPORT PNG','exportPNG')}</div>
  <div class="editorfields"><div class="field"><label>Memory / Diary note</label><textarea id="editNotes" placeholder="What do you remember about this day?">${escapeHTML(t.notes||'')}</textarea></div>
  <div><div class="field"><label>Title</label><input id="editTitle" value="${escapeHTML(t.title||'')}"></div><div class="field"><label>Date</label><input id="editDate" type="date" value="${escapeHTML(t.date||'')}"></div></div></div>
  <p class="hint">Your drawing and note are saved separately from the original scan. This is a local-browser prototype, not an online account.</p><div id="status" class="status"></div>`;
  $('#penTool').onclick=()=>setTool('pen');$('#eraserTool').onclick=()=>setTool('eraser');
  $('#clearDrawing').onclick=()=>{if(confirm('Clear your drawings on this page?')){EP.current.drawing='';drawPage();}};
  $('#saveTicket').onclick=saveTicket;$('#exportPNG').onclick=exportPNG;
  $('#editInfo').onclick=()=>{EP.current.notes=$('#editNotes').value;EP.current.title=$('#editTitle').value;EP.current.date=$('#editDate').value;saveDrawing();EP.view='scan';render();};
  $('#deleteTicket').onclick=async()=>{if(!confirm('Delete this ticket from your archive?'))return;await dbRequest('readwrite','delete',t.id);await refreshTickets();EP.view='grid';render();};
  attachCanvas();drawPage();
}
let drawLayer=null, pageImage=null;
function attachCanvas(){
  const c=$('#journalCanvas');drawLayer=document.createElement('canvas');drawLayer.width=1000;drawLayer.height=570;
  const ctx=drawLayer.getContext('2d');
  if(EP.current.drawing){const old=new Image();old.onload=()=>{ctx.drawImage(old,0,0,1000,570);drawPage();};old.src=EP.current.drawing;}
  pageImage=new Image();pageImage.onload=drawPage;pageImage.src=EP.current.image;
  c.onpointerdown=e=>{EP.drawing=true;EP.last=canvasPoint(e,c);c.setPointerCapture(e.pointerId);stroke(e,true);};
  c.onpointermove=e=>{if(EP.drawing)stroke(e,false);};
  c.onpointerup=c.onpointercancel=()=>{EP.drawing=false;EP.last=null;saveDrawing();};
  $('#editNotes').oninput=drawPage;$('#editTitle').oninput=drawPage;$('#editDate').oninput=drawPage;
}
function canvasPoint(e,c){const rect=c.getBoundingClientRect();return{x:(e.clientX-rect.left)*c.width/rect.width,y:(e.clientY-rect.top)*c.height/rect.height};}
function stroke(e,first){const p=canvasPoint(e,$('#journalCanvas')),ctx=drawLayer.getContext('2d');ctx.lineWidth=EP.tool==='eraser'?27:2.5;
  ctx.lineCap='round';ctx.lineJoin='round';ctx.globalCompositeOperation=EP.tool==='eraser'?'destination-out':'source-over';ctx.strokeStyle='#111';
  ctx.beginPath();ctx.moveTo(EP.last?EP.last.x:p.x,EP.last?EP.last.y:p.y);ctx.lineTo(p.x+.01,p.y+.01);ctx.stroke();
  ctx.globalCompositeOperation='source-over';EP.last=p;drawPage();}
function setTool(t){EP.tool=t;$('#penTool').classList.toggle('on',t==='pen');$('#eraserTool').classList.toggle('on',t==='eraser');}
function fitRect(w,h,maxW,maxH){const scale=Math.min(maxW/w,maxH/h);return{w:w*scale,h:h*scale};}
function wrapCanvas(ctx,txt,x,y,maxW,lineHeight,maxLines){const words=txt.split(/\s+/);let line='',n=0;
  for(const word of words){const test=line?line+' '+word:word;if(ctx.measureText(test).width>maxW&&line){ctx.fillText(line,x,y+n*lineHeight);n++;line=word;if(n>=maxLines)return;}else line=test;}
  if(line&&n<maxLines)ctx.fillText(line,x,y+n*lineHeight);
}
function drawPage(){const c=$('#journalCanvas');if(!c)return;const ctx=c.getContext('2d');
  ctx.fillStyle='#f7f7f7';ctx.fillRect(0,0,1000,570);
  ctx.fillStyle='#fff';ctx.fillRect(27,27,946,516);
  ctx.strokeStyle='#e1e1e1';ctx.lineWidth=1;ctx.strokeRect(27.5,27.5,945,515);
  if(pageImage&&pageImage.complete&&pageImage.naturalWidth){const f=fitRect(pageImage.naturalWidth,pageImage.naturalHeight,510,420);
    ctx.drawImage(pageImage,70+(510-f.w)/2,70+(420-f.h)/2,f.w,f.h);}
  ctx.fillStyle='#111';ctx.font='500 14px Arial';ctx.fillText('EPHEMERA / PERSONAL MEMORY',645,84);
  ctx.strokeStyle='#ddd';ctx.beginPath();ctx.moveTo(645,107);ctx.lineTo(930,107);ctx.stroke();
  ctx.font='12px Arial';ctx.fillStyle='#777';ctx.fillText(($('#editDate')?.value||EP.current.date||'UNDATED').toUpperCase(),645,137);
  ctx.font='500 22px Arial';ctx.fillStyle='#111';wrapCanvas(ctx,$('#editTitle')?.value||EP.current.title||'Untitled ticket',645,181,285,29,3);
  ctx.font='16px Arial';ctx.fillStyle='#555';wrapCanvas(ctx,$('#editNotes')?.value||EP.current.notes||'Add your memory here…',645,294,285,26,9);
  if(drawLayer)ctx.drawImage(drawLayer,0,0);
  ctx.font='11px Arial';ctx.fillStyle='#888';ctx.fillText('COLLECTED, NOT FORGOTTEN.',70,522);
}
function saveDrawing(){if(drawLayer)EP.current.drawing=drawLayer.toDataURL('image/png');}
async function saveTicket(){try{
  EP.current.notes=$('#editNotes').value;EP.current.title=$('#editTitle').value.trim();EP.current.date=$('#editDate').value;saveDrawing();
  await dbRequest('readwrite','put',EP.current);await refreshTickets();
  if(EP.current.date){const d=new Date(EP.current.date+'T12:00:00');EP.year=d.getFullYear();EP.month=d.getMonth();}
  EP.dateFilter=null;EP.view='calendar';render();
}catch(err){setStatus('Could not save: '+err.message);}}
function exportPNG(){drawPage();const a=document.createElement('a');a.download=`ephemera-${EP.current.date||'undated'}.png`;a.href=$('#journalCanvas').toDataURL('image/png');a.click();}
