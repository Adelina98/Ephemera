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
    .ticketthumb{width:100%;height:66px;object-fit:contain;display:block;margin:4px auto 0}.count{
  position:absolute;
  right:8px;
  top:8px;
  font-size:9px;
  letter-spacing:3px;
  color:#111111;
  max-width:65%;
  text-align:right;
  line-height:1.5;
}
    .sectionrow{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.gallery{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:24px;margin-top:20px}
    .tile{background:#fff;border:0;text-align:left;padding:0;min-width:0}
.tilefigure{height:200px;border:1px solid #e5e5e5;display:flex;align-items:center;justify-content:center;padding:15px;background:#fff;box-sizing:border-box}
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
   <button class="btn" id="calendarTab">CALENDAR</button>
<button class="btn" id="gridTab">GALLERY</button>
<button class="btn" id="annualTab">ANNUAL RECAP</button>
    <button class="btn dark" id="addTab">+ ADD TICKET</button></div></header><main id="epContent"></main>
    <input type="file" id="fileInput" accept="image/*" hidden><input type="file" id="cameraInput" accept="image/*" capture="environment" hidden>
    <input type="file" id="bulkInput" accept="image/*" multiple hidden></div>`);
  document.getElementById('calendarTab').onclick = () => { stopCamera(); EP.view='calendar'; render(); };
  document.getElementById('gridTab').onclick = () => { stopCamera(); EP.view='grid'; render(); };
  document.getElementById('addTab').onclick = () => { stopCamera(); newTicket(); };
   
document.getElementById('annualTab').onclick = () => {
  stopCamera();
  annual.step = 0;
  annual.year = "ALL";
  annual.favorite = null;
  renderAnnual();
};

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

function renderGrid() {
  const all = EP.dateFilter
    ? EP.tickets.filter(t => t.date === EP.dateFilter)
    : [...EP.tickets];

  const categories = [
    "All", "Concert", "Recital", "Exhibition",
    "Musical", "Theatre", "Travel", "Other"
  ];

  $('#epContent').innerHTML = `
    <div class="hero">
      <div>
        <div class="meta">THE COLLECTION</div>
        <h1>My Collection.</h1>
      </div>
      <span class="meta">${all.length} OBJECTS</span>
    </div>

    <div class="sectionrow">
      <span class="meta">YOUR TICKETS, YOUR MEMORIES</span>
      <div>
        <select id="galleryFilter" class="btn">
          ${categories.map(c =>
            `<option value="${c}">${c.toUpperCase()}</option>`
          ).join('')}
        </select>

        <select id="gallerySort" class="btn">
          <option value="newest">NEWEST FIRST</option>
          <option value="oldest">OLDEST FIRST</option>
          <option value="title">TITLE A-Z</option>
        </select>

        ${EP.dateFilter ? button('SHOW ALL', 'showAll') : ''}
        ${button('IMPORT MULTIPLE IMAGES', 'bulkImport')}
      </div>
    </div>

    <div class="gallery" id="galleryItems"></div>
  `;

  function updateGallery() {
    const category = $('#galleryFilter').value;
    const sorting = $('#gallerySort').value;

    let shown = all.filter(t =>
      category === "All" ||
      (t.category || "Other").toLowerCase() === category.toLowerCase()
    );

    if (sorting === "newest") {
      shown.sort((a, b) =>
        (b.date || "").localeCompare(a.date || "")
      );
    } else if (sorting === "oldest") {
      shown.sort((a, b) =>
        (a.date || "9999").localeCompare(b.date || "9999")
      );
    } else {
      shown.sort((a, b) =>
        (a.title || "").localeCompare(b.title || "")
      );
    }

    $('#galleryItems').innerHTML = shown.length
      ? shown.map(tileHTML).join('')
      : '<div class="emptymsg">NO TICKETS FOUND.</div>';

    connectTiles();
  }

  $('#galleryFilter').onchange = updateGallery;
  $('#gallerySort').onchange = updateGallery;

  $('#bulkImport').onclick = () => $('#bulkInput').click();

  if ($('#showAll')) {
    $('#showAll').onclick = () => {
      EP.dateFilter = null;
      render();
    };
  }

  updateGallery();
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

/* ==========================================
   EPHEMERA — ALL TICKETS OVERVIEW
   100 Tickets / Complete Collection
========================================== */

let archive100 = [];

function archiveText(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function archiveImagePath(row) {
  const name =
    row.image || row.filename || row.file ||
    row.image_file || "";

  if (!name) return "";

  if (
    name.startsWith("data:") ||
    name.startsWith("https://") ||
    name.startsWith("http://")
  ) {
    return name;
  }

  if (
    name.startsWith("tickets/") ||
    name.startsWith("./tickets/")
  ) {
    return name;
  }

  return "tickets/" + name.split("/").pop();
}

/* LOAD 100 TICKETS */

async function loadArchive100() {
  try {
    const response = await fetch("./tickets.json", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("tickets.json not found");
    }

    const json = await response.json();

    const rows = Array.isArray(json)
      ? json
      : (json.tickets || json.items || []);

    archive100 = rows.map((t, i) => ({
      ...t,
      id: "archive-" + (t.id ?? i + 1),
      title: t.title || t.name || "Untitled",
      date: t.date || t.visit_date || "",
      venue: t.venue || t.location || "",
      category: t.category || "Other",
      image: archiveImagePath(t)
    }));

    console.log("Archive loaded:", archive100.length);

    // Merge with existing ticket records.
    if (typeof EP !== "undefined" &&
        Array.isArray(EP.tickets)) {

      const existing = new Set(
        EP.tickets.map(t => String(t.id))
      );

      for (const ticket of archive100) {
        if (!existing.has(String(ticket.id))) {
          EP.tickets.push(ticket);
        }
      }
    }

  } catch (error) {
    console.error("Archive loading error:", error);
  }
}

/* RENDER ALL 100 */

function renderAllTickets() {
  const area = document.getElementById("epContent");
  if (!area) return;

  area.innerHTML = `
    <section class="overview-wrap">

      <div class="overview-head">
        <div>
          <p>EPHEMERA / COMPLETE COLLECTION</p>
          <h1>The Entire Collection.</h1>
          <p>${archive100.length} ARCHIVED OBJECTS</p>
        </div>

        <button id="overviewSize" class="btn">
          CHANGE VIEW
        </button>
      </div>

      <div id="overviewGrid" class="overview-grid">

        ${archive100.map(t => `
          <button
            class="overview-ticket"
            data-overview-id="${archiveText(t.id)}"
            title="${archiveText(t.title)}"
          >
            <img
              src="${archiveText(t.image)}"
              alt="${archiveText(t.title)}"
              loading="lazy"
            >
          </button>
        `).join("")}

      </div>
    </section>
  `;

  // Open selected ticket.
  document.querySelectorAll("[data-overview-id]")
    .forEach(btn => {
      btn.onclick = () => {
        if (typeof openTicket === "function") {
          openTicket(btn.dataset.overviewId);
        }
      };
    });

  // Toggle overview size.
  const sizeButton = document.getElementById("overviewSize");

  sizeButton.onclick = () => {
    document.getElementById("overviewGrid")
      .classList.toggle("overview-large");
  };
}

/* ADD ALL 100 BUTTON */

function installOverview() {
  const galleryButton =
    document.getElementById("gridTab");

  if (!galleryButton) return false;

  if (document.getElementById("overviewTab")) {
    return true;
  }

  const button = document.createElement("button");

  button.id = "overviewTab";
  button.className = "btn";
  button.textContent = "ALL 100";

  galleryButton.insertAdjacentElement(
    "afterend", button
  );

  button.onclick = () => {
    if (typeof stopCamera === "function") {
      stopCamera();
    }

    EP.dateFilter = null;
    renderAllTickets();
  };

  return true;
}

/* BLACK & WHITE DESIGN */

const overviewCSS = document.createElement("style");

overviewCSS.textContent = `

  .overview-wrap {
    max-width: 1600px;
    margin: 30px auto;
    color: #111111;
    font-family: Arial, Helvetica, sans-serif;
  }

  .overview-head {
    display: flex;
    justify-content: space-between;
    align-items: end;
    gap: 20px;
    border-bottom: 1px solid #111111;
    padding-bottom: 22px;
    margin-bottom: 30px;
  }

  .overview-head h1 {
    font-size: clamp(30px, 5vw, 55px);
    font-weight: 400;
    letter-spacing: -0.04em;
    margin: 10px 0;
  }

  .overview-head p {
    font-size: 11px;
    color: #777777;
    letter-spacing: 0.05em;
  }

  .overview-grid {
    display: grid;
    grid-template-columns:
      repeat(10, minmax(0, 1fr));
    gap: 7px;
    align-items: center;
  }

  .overview-ticket {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    margin: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
    min-width: 0;
  }

  .overview-ticket img {
    display: block;
    width: 100%;
    height: auto;
    max-height: 160px;
    object-fit: contain;
    transition:
      transform 0.25s ease,
      opacity 0.25s ease;
  }

  .overview-ticket:hover img {
    transform: scale(1.08);
    opacity: 0.8;
  }

  .overview-grid.overview-large {
    grid-template-columns:
      repeat(5, minmax(0, 1fr));
    gap: 18px;
  }

  .overview-grid.overview-large img {
    max-height: 240px;
  }

  @media (max-width: 700px) {
    .overview-grid {
      grid-template-columns:
        repeat(4, minmax(0, 1fr));
      gap: 5px;
    }

    .overview-grid.overview-large {
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
    }

    .overview-head {
      align-items: start;
    }
  }

`;

document.head.appendChild(overviewCSS);

/* INITIALIZE */

let overviewAttempts = 0;

const overviewInstaller = setInterval(() => {
  overviewAttempts++;

  if (installOverview()) {
    clearInterval(overviewInstaller);

    loadArchive100();
  }

  if (overviewAttempts > 100) {
    clearInterval(overviewInstaller);
  }
}, 100);

/* ============================================
   EPHEMERA — INTERACTIVE ANNUAL RECAP
   Uses existing archive100 and tickets.json
============================================ */

const annual = {
  step: 0,
  year: "ALL",
  mode: "month",
  favorite: null
};

const annualSteps = [
  "THE COLLECTION",
  "SELECT A YEAR",
  "REARRANGE YOUR YEAR",
  "ONE TO KEEP"
];

function annualRecords() {
  return typeof archive100 !== "undefined"
    ? archive100
    : [];
}

function annualYears() {
  return [...new Set(
    annualRecords()
      .map(t => String(t.date || "").slice(0, 4))
      .filter(y => /^\d{4}$/.test(y))
  )].sort((a, b) => b.localeCompare(a));
}

function annualSelected() {
  if (annual.year === "ALL") return annualRecords();

  return annualRecords().filter(t =>
    String(t.date || "").startsWith(annual.year + "-")
  );
}

function annualStats() {
  const records = annualSelected();
  const months = Array(12).fill(0);
  const categories = {};
  const venues = {};

  records.forEach(t => {
    const m = Number(String(t.date || "").slice(5, 7));

    if (m >= 1 && m <= 12) months[m - 1]++;

    const c = t.category || "Other";
    const v = t.venue || "Unknown";

    categories[c] = (categories[c] || 0) + 1;
    venues[v] = (venues[v] || 0) + 1;
  });

  return { months, categories, venues };
}

function annualSort(items) {
  const copy = [...items];

  if (annual.mode === "category") {
    return copy.sort((a, b) =>
      String(a.category || "Other").localeCompare(
        String(b.category || "Other")
      ) ||
      String(a.date || "").localeCompare(
        String(b.date || "")
      )
    );
  }

  return copy.sort((a, b) =>
    String(a.date || "9999").localeCompare(
      String(b.date || "9999")
    )
  );
}

function renderAnnual() {
  const area = document.getElementById("epContent");
  if (!area) return;

  const records = annualRecords();
  const years = annualYears();
  const stats = annualStats();

  if (!records.length) {
    area.innerHTML = `
      <section class="annual-empty">
        <h1>Annual Recap.</h1>
        <p>No archive data loaded yet.</p>
        <p>Please check tickets.json.</p>
      </section>
    `;
    return;
  }

  let intro = "";

  
if (annual.step === 0) {
  intro = `
    <h1 id="annualTitle">
      ${annual.year === "ALL"
        ? "The Entire Collection."
        : annual.year + "."}
    </h1>

    <p id="annualSubtitle">
      ${annualSelected().length} OBJECTS /
      ${annual.year === "ALL" ? "ALL YEARS" : annual.year}
    </p>
  `;
}


  if (annual.step === 1) {
    intro = `
      <h1>Choose a year.</h1>
      <p>Watch your collection change over time.</p>
    `;
  }

  if (annual.step === 2) {
    intro = `
      <h1>${annual.year}.</h1>
      <p>${annualSelected().length} EXPERIENCES RECORDED</p>
    `;
  }

  if (annual.step === 3) {
    intro = `
      <h1>One to Keep.</h1>
      <p>Which experience would you choose to remember?</p>
    `;
  }

  const barItems = Object.entries(
    annual.mode === "category"
      ? stats.categories
      : Object.fromEntries(
          stats.months.map((v, i) => [
            String(i + 1).padStart(2, "0"),
            v
          ])
        )
  ).sort((a, b) =>
    annual.mode === "category"
      ? b[1] - a[1]
      : a[0].localeCompare(b[0])
  );

  const max = Math.max(1, ...barItems.map(x => x[1]));

  area.innerHTML = `
    <section class="annual-wrap">

      <div class="annual-header">
        <span>EPHEMERA / ANNUAL RECAP</span>
        <span>${annual.step + 1} / 4</span>
      </div>

      <div class="annual-heading">
        ${intro}
      </div>

      <div class="annual-controls">

       
${annual.step >= 0 ? `

          <label>
            YEAR
            <select id="annualYear">
              <option value="ALL">ALL YEARS</option>
              ${years.map(y => `
                <option value="${y}"
                  ${annual.year === y ? "selected" : ""}>
                  ${y}
                </option>
              `).join("")}
            </select>
          </label>
        ` : ""}

        ${annual.step === 2 ? `
          <label>
            ARRANGE BY
            <select id="annualMode">
              <option value="month"
                ${annual.mode === "month" ? "selected" : ""}>
                MONTH
              </option>
              <option value="category"
                ${annual.mode === "category" ? "selected" : ""}>
                CATEGORY
              </option>
            </select>
          </label>
        ` : ""}

        <span id="annualCount"></span>
      </div>

      <div id="annualGrid" class="annual-grid">
        ${records.map((t, i) => `
          <button class="annual-ticket"
            data-index="${i}"
            title="${archiveText(t.title || "Untitled")}">
            <img
              src="${archiveText(t.image || "")}"
              alt="${archiveText(t.title || "Ticket")}"
              loading="lazy">
          </button>
        `).join("")}
      </div>

      ${annual.step === 2 ? `
        <div class="annual-stats">
          <h2>YOUR PATTERNS</h2>

          ${barItems.map(([label, count]) => `
            <div class="annual-stat">
              <span>${archiveText(label)}</span>
              <div class="annual-track">
                <div style="width:${count / max * 100}%"></div>
              </div>
              <span>${count}</span>
            </div>
          `).join("")}

          <p>Recorded visits: ${annualSelected().length}</p>
        </div>
      ` : ""}

      ${annual.step === 3 ? `
        <div id="annualMemory" class="annual-memory">
          SELECT A TICKET ABOVE
        </div>
      ` : ""}

      <div class="annual-navigation">
        <button id="annualPrev">← PREVIOUS</button>
        <span>${annualSteps[annual.step]}</span>
        <button id="annualNext">
          ${annual.step === 3 ? "START AGAIN" : "NEXT →"}
        </button>
      </div>

    </section>
  `;

  const yearSelect = document.getElementById("annualYear");

  if (yearSelect) {
    
yearSelect.onchange = e => {
  annual.year = e.target.value;

  // Update ticket positions and opacity.
  updateAnnualGrid();

  // Update heading and ticket count.
  const title = document.getElementById("annualTitle");
  const subtitle = document.getElementById("annualSubtitle");

  if (title) {
    title.textContent =
      annual.year === "ALL"
        ? "The Entire Collection."
        : annual.year + ".";
  }

  if (subtitle) {
    subtitle.textContent =
      annualSelected().length +
      " OBJECTS / " +
      (annual.year === "ALL"
        ? "ALL YEARS"
        : annual.year);
  }

  // Refresh statistics when viewing patterns.
  if (annual.step === 2) {
    renderAnnual();
  }
};

  }

  const modeSelect = document.getElementById("annualMode");

  if (modeSelect) {
    modeSelect.onchange = e => {
      annual.mode = e.target.value;
      updateAnnualGrid();
      updateAnnualStats();
    };
  }

  document.getElementById("annualPrev").onclick = () => {
    annual.step = Math.max(0, annual.step - 1);
    renderAnnual();
  };

  document.getElementById("annualNext").onclick = () => {
    annual.step = (annual.step + 1) % 4;
    renderAnnual();
  };

  document.querySelectorAll(".annual-ticket").forEach(btn => {
    btn.onclick = () => {
      const ticket = records[Number(btn.dataset.index)];
       
if (annual.year !== "ALL" &&
    !String(ticket.date || "").startsWith(annual.year + "-")) return;


      if (annual.step === 3) {
        annual.favorite = ticket.id;
        updateAnnualGrid();
        showAnnualMemory(ticket);
      } else {
        if (typeof openTicket === "function") {
          openTicket(ticket.id);
        }
      }
    };
  });

  updateAnnualGrid();
}

function updateAnnualGrid() {
  const grid = document.getElementById("annualGrid");
  if (!grid) return;

  const all = annualRecords();
  const selected = annualSelected();
  const selectedIds = new Set(selected.map(t => t.id));
  const order = annualSort(selected);

  const positions = new Map();

  grid.querySelectorAll(".annual-ticket").forEach(el => {
    positions.set(el, el.getBoundingClientRect());
  });

  const indexOrder = new Map(
    order.map((t, i) => [t.id, i])
  );

  grid.querySelectorAll(".annual-ticket").forEach(el => {
    const t = all[Number(el.dataset.index)];
    const active = selectedIds.has(t.id);

    el.style.order = indexOrder.has(t.id)
      ? indexOrder.get(t.id)
      : all.length + Number(el.dataset.index);

    el.style.opacity = active ? "1" : "0.12";

    el.classList.toggle(
      "annual-favorite",
      annual.step === 3 && t.id === annual.favorite
    );
  });

  // Animate changes in ticket positions.
  requestAnimationFrame(() => {
    grid.querySelectorAll(".annual-ticket").forEach(el => {
      const before = positions.get(el);
      const after = el.getBoundingClientRect();

      if (!before) return;

      const dx = before.left - after.left;
      const dy = before.top - after.top;

      if (Math.abs(dx) + Math.abs(dy) > 1 &&
          typeof el.animate === "function") {
        el.animate([
          { transform: `translate(${dx}px, ${dy}px)` },
          { transform: "translate(0, 0)" }
        ], {
          duration: 650,
          easing: "ease-in-out"
        });
      }
    });
  });

  const counter = document.getElementById("annualCount");
  if (counter) {
    counter.textContent =
      `${selected.length} / ${all.length} TICKETS`;
  }
}

function updateAnnualStats() {
  if (annual.step !== 2) return;

  // Refresh the statistics for the new grouping.
  renderAnnual();
}

function showAnnualMemory(ticket) {
  const box = document.getElementById("annualMemory");
  if (!box) return;

  box.innerHTML = `
    <div class="annual-memory-image">
      <img src="${archiveText(ticket.image || "")}"
           alt="Selected ticket">
    </div>
    <div>
      <span>THE ONE I CHOSE TO KEEP</span>
      <h2>${archiveText(ticket.title || "Untitled")}</h2>
      <p>${archiveText(ticket.date || "DATE UNKNOWN")}</p>
      <p>${archiveText(ticket.venue || "")}</p>
      <textarea id="annualNote"
        placeholder="Why does this memory matter to you?"></textarea>
      <button id="annualSaveMemory">
        SAVE MY MEMORY
      </button>
      <p id="annualSavedStatus"></p>
    </div>
  `;

  const key = `ephemera-memory-${ticket.id}`;

  try {
    document.getElementById("annualNote").value =
      localStorage.getItem(key) || "";
  } catch (e) {}

  document.getElementById("annualSaveMemory").onclick = () => {
    try {
      localStorage.setItem(
        key,
        document.getElementById("annualNote").value
      );
      document.getElementById("annualSavedStatus")
        .textContent = "MEMORY SAVED";
    } catch (e) {
      document.getElementById("annualSavedStatus")
        .textContent = "COULD NOT SAVE";
    }
  };
}

/* STYLE */

const annualStyle = document.createElement("style");

annualStyle.textContent = `
  .annual-wrap {
    max-width: 1450px;
    margin: 25px auto;
    color: #111;
    font-family: Arial, Helvetica, sans-serif;
  }

  .annual-header,
  .annual-navigation {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 15px;
    padding: 18px 0;
    border-top: 1px solid #111;
    font-size: 11px;
    letter-spacing: .06em;
  }

  .annual-heading {
    margin: 45px 0 30px;
  }

  .annual-heading h1 {
    font-size: clamp(36px, 6vw, 76px);
    font-weight: 400;
    letter-spacing: -.055em;
    line-height: 1.1;
    margin: 0 0 16px;
  }

  .annual-heading p {
    font-size: 12px;
    color: #777;
  }

  .annual-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    gap: 20px;
    margin-bottom: 25px;
    font-size: 11px;
  }

  .annual-controls label {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .annual-controls select {
    background: #fff;
    color: #111;
    border: 1px solid #ccc;
    border-radius: 0;
    padding: 10px 15px;
    font-size: 12px;
  }

  #annualCount {
    margin-left: auto;
  }

  .annual-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-content: flex-start;
    margin: 20px 0 60px;
  }

  .annual-ticket {
    width: calc((100% - 54px) / 10);
    height: 95px;
    border: 0;
    padding: 0;
    background: transparent;
    cursor: pointer;
    transition: opacity .45s ease;
  }

  .annual-ticket img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .annual-ticket:hover img {
    transform: scale(1.08);
  }

  .annual-ticket.annual-favorite {
    outline: 3px solid #111;
    outline-offset: 2px;
  }

  .annual-stats {
    border-top: 1px solid #111;
    padding: 30px 0 50px;
  }

  .annual-stats h2 {
    font-size: 18px;
    font-weight: 400;
    margin-bottom: 28px;
  }

  .annual-stat {
    display: grid;
    grid-template-columns: 135px 1fr 30px;
    align-items: center;
    gap: 14px;
    margin: 10px 0;
    font-size: 11px;
  }

  .annual-track {
    height: 8px;
    background: #eee;
  }

  .annual-track div {
    height: 100%;
    background: #111;
  }

  .annual-memory {
    border-top: 1px solid #111;
    padding: 35px 0;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 30px;
    font-size: 12px;
  }

  .annual-memory-image img {
    max-width: 100%;
    max-height: 350px;
    object-fit: contain;
  }

  .annual-memory h2 {
    font-size: 28px;
    font-weight: 400;
    line-height: 1.3;
  }

  .annual-memory textarea {
    display: block;
    box-sizing: border-box;
    width: 100%;
    height: 110px;
    margin: 20px 0;
    padding: 12px;
    border: 1px solid #ccc;
    background: white;
    color: #111;
    font: inherit;
  }

  .annual-memory button,
  .annual-navigation button {
    border: 1px solid #111;
    background: white;
    color: #111;
    padding: 12px 16px;
    cursor: pointer;
    font-size: 11px;
  }

  .annual-empty {
    padding: 70px 20px;
  }

  @media (max-width: 700px) {
    .annual-ticket {
      width: calc((100% - 24px) / 5);
      height: 80px;
    }

    .annual-memory {
      grid-template-columns: 1fr;
    }

    .annual-stat {
      grid-template-columns: 80px 1fr 25px;
      gap: 8px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .annual-ticket {
      transition: none;
    }
  }
`;

document.head.appendChild(annualStyle);

/* INSTALL MENU */

let annualInstallAttempts = 0;

const annualInstaller = setInterval(() => {
  annualInstallAttempts++;

  const overviewButton =
    document.getElementById("overviewTab");

  if (overviewButton &&
      !document.getElementById("annualTab")) {

    const btn = document.createElement("button");

    btn.id = "annualTab";
    btn.className = "btn";
    btn.textContent = "ANNUAL RECAP";

    overviewButton.insertAdjacentElement("afterend", btn);

    btn.onclick = () => {
      if (typeof stopCamera === "function") {
        stopCamera();
      }

      annual.step = 0;
      annual.year = "ALL";
      annual.favorite = null;

      renderAnnual();
    };

    clearInterval(annualInstaller);
  }

  if (annualInstallAttempts > 100) {
    clearInterval(annualInstaller);
  }
}, 100);

