/* =====================================================================
   REPORT WRITER — training crash report (OH-1 fields), citation, incident
   report. Exports watermarked PDFs. Not an official ODPS/court form.
   ===================================================================== */
(()=>{
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const AGENCIES=["Lawrence County Sheriff's Office",'Ironton Police Department','Coal Grove Police Department','Hanging Rock Police Department','South Point Police Department','Chesapeake Police Department','Proctorville Police Department','Athalia Police Department','Ohio State Highway Patrol'];
const PLACES=['Ironton (City)','Athalia (Village)','Chesapeake (Village)','Coal Grove (Village)','Hanging Rock (Village)','Proctorville (Village)','South Point (Village)',
 ...['Aid','Decatur','Elizabeth','Fayette','Hamilton','Lawrence','Mason','Perry','Rome','Symmes','Union','Upper','Washington','Windsor'].map(t=>t+' Township')];
const COURTS=['Ironton Municipal Court','Lawrence County Municipal Court',"Hanging Rock Mayor's Court","Coal Grove Mayor's Court","South Point Mayor's Court","Proctorville Mayor's Court"];
const ORC=['4511.21 Speed','4511.12 Failure to obey traffic control device','4511.13 Red light','4511.43 Stop sign / right of way','4513.263 Seat belt','4510.11 Driving under suspension','4510.12 No operator\'s license','4503.11 No valid registration','4509.101 No proof of financial responsibility','4511.19 OVI','4511.20 Reckless operation','4511.202 Failure to control','4511.21(A) Assured clear distance ahead','4511.25 Left of center','4511.33 Marked lanes','4511.38 Unsafe backing','4511.39 Turn signal','4511.204 Texting while driving'];
const KABCO=['5 - No apparent injury (O)','4 - Possible injury (C)','3 - Suspected minor injury (B)','2 - Suspected serious injury (A)','1 - Fatal (K)'];
const STATES=['OH','KY','WV','IN','PA','MI','Other'];

// ---------- schemas ----------
// field: [key, label (* = mandatory), type, options/extra]
const SCHEMA={
 crash:{title:'Traffic Crash Report',sub:'Training form modeled on the fields of the Ohio OH-1',prefix:'CR',
  sections:[
   {t:'Report',f:[['rptno','Local report #*','text'],['agency','Reporting agency*','select',AGENCIES],['officer','Investigating officer*','text'],['badge','Badge / unit #*','text'],
     ['taken','Report taken by','select',['Police agency','Motorist']],['supp','Supplement (correction/addition)','check'],['photos','Photos taken','check'],['privprop','Private property','check'],['secondary','Secondary crash','check']]},
   {t:'Date and time',f:[['cdate','Crash date*','date'],['ctime','Crash time*','time'],['rtime','Crash reported (time)','time'],['atime','Officer arrival (time)','time'],['cltime','Scene cleared (time)','time'],['closed','Minutes roadway closed','number']]},
   {t:'Location',f:[['county','County*','text'],['place','City, village or township*','select',PLACES],['route','Road / route name*','text'],
     ['rtype','Route type','select',['Interstate','US route','State route','County road','Township road','Municipal street','Private drive/lot']],['mm','Mile marker','text'],['xroad','Intersecting or reference road','text'],
     ['dist','Distance from reference (ft)','number'],['dir','Direction from reference','select',['N','S','E','W']],['lat','Latitude','text'],['lon','Longitude','text']]},
   {t:'Crash',f:[['severity','Crash severity*','select',['1 - Fatal','2 - Serious injury suspected','3 - Minor injury suspected','4 - Injury possible','5 - Property damage only']],['nunits','Number of units*','number'],
     ['hitskip','Hit/skip','select',['No','1 - Solved','2 - Unsolved']],
     ['manner','Manner of crash / collision','select',['Not a collision between two vehicles','Rear-end','Head-on','Rear-to-rear','Backing','Angle','Sideswipe, same direction','Sideswipe, opposite direction','Other/unknown']],
     ['firstevt','First harmful event','select',['Motor vehicle in transport','Parked motor vehicle','Pedestrian','Pedalcyclist','Animal - deer','Animal - other','Fixed object - utility pole','Fixed object - guardrail','Fixed object - tree','Fixed object - ditch/embankment','Overturn/rollover','Other non-collision','Other/unknown']],
     ['harm','Location of first harmful event','select',['1 - On roadway','2 - On shoulder','3 - In median','4 - On roadside','5 - On gore','6 - Outside trafficway','7 - On ramp','8 - Off ramp','9 - Crossover']],
     ['contour','Road contour','select',['1 - Straight level','2 - Straight grade','3 - Curve level','4 - Curve grade','9 - Other/unknown']],
     ['surface','Road surface','select',['Concrete','Blacktop/asphalt','Brick/block','Slag, gravel, stone','Dirt','Other/unknown']],
     ['cond','Surface condition','select',['Dry','Wet','Snow','Ice','Slush','Water (standing/moving)','Mud, dirt, sand','Other/unknown']],
     ['weather','Weather','select',['Clear','Cloudy','Fog, smoke, haze','Rain','Sleet, hail','Snow','Severe crosswinds','Other/unknown']],
     ['light','Light condition','select',['Daylight','Dawn/dusk','Dark - lighted roadway','Dark - roadway not lighted','Dark - unknown lighting','Other/unknown']],
     ['wz','Work zone related','check'],['school','School zone related','check'],['bus','School bus related','check']]},
   {t:'Unit',rep:'units',max:6,f:[['utype','Unit type*','select',['Passenger car','Pickup','SUV','Van','Motorcycle','Commercial truck','Bus','Pedestrian','Pedalcyclist','Other']],
     ['plate','License plate #','text'],['lpstate','Plate state','select',STATES],['vin','VIN','text'],['vyr','Year','number'],['vmake','Make','text'],['vmodel','Model','text'],['vcolor','Color','text'],
     ['ownsame','Owner same as driver','check'],['owner','Owner name (last, first, middle)','text'],['oaddr','Owner address','text'],['ins','Insurance company','text'],['pol','Policy #','text'],
     ['action','Pre-crash action','select',['1 - Straight ahead','2 - Backing','3 - Changing lanes','4 - Overtaking/passing','5 - Making right turn','6 - Making left turn','7 - Making U-turn','8 - Entering traffic lane','9 - Leaving traffic lane','10 - Parked','99 - Other/unknown']],
     ['travel','Direction of travel','select',['N','S','E','W','NE','NW','SE','SW']],['speed','Posted speed','number'],
     ['contrib','Contributing circumstance','select',['None','Failure to yield','Ran red light','Ran stop sign','Exceeded speed limit','Unsafe speed','Improper turn','Left of center','Followed too closely / ACDA','Improper lane change','Improper backing','Improper start from parked position','Equipment failure','Operating in reckless manner','Distracted','Swerved to avoid','Other/unknown']],
     ['damage','Damage','select',['None','Minor','Functional','Disabling']],['towed','Towed','select',['Not towed','Towed - rotation wrecker','Towed - owner request']],['towco','Towed by','text']]},
   {t:'Person',rep:'persons',max:10,f:[['role','Role*','select',['Driver','Occupant','Pedestrian','Pedalcyclist','Witness']],['unitno','Unit #','number'],['pname','Name (last, first, middle)*','text'],['pdob','Date of birth','date'],['psex','Sex','select',['M','F','U']],
     ['paddr','Address','text'],['pphone','Phone','text'],['oln','OL #','text'],['olstate','OL state','select',STATES],['olclass','OL class','select',['D','M','CDL-A','CDL-B','CDL-C','Temporary','None']],
     ['injury','Injury','select',KABCO],['seat','Seating position','select',['1 - Front left (driver)','2 - Front middle','3 - Front right','4 - Second row left','5 - Second row middle','6 - Second row right','7 - Third row','N/A']],
     ['belt','Safety equipment','select',['Shoulder & lap belt','Lap belt only','Child restraint','Helmet','None used','Unknown','N/A']],['airbag','Air bag','select',['Not deployed','Deployed - front','Deployed - side','Deployed - multiple','N/A']],
     ['ems','EMS agency','text'],['hosp','Transported to','text'],['alc','Alcohol suspected','check'],['drug','Drugs suspected','check'],['cite','Cited: ORC section','select',['',...ORC]],['tkt','Ticket #','text']]},
   {t:'Narrative',f:[['narr','Narrative* — describe what happened, unit by unit','area']]},
   {t:'Diagram',f:[['diagram','Crash diagram (draw below)','sketch']]}
  ]},
 cite:{title:'Uniform Traffic Ticket',sub:'Training citation with the Ohio uniform ticket\'s fields',prefix:'TT',
  sections:[
   {t:'Ticket',f:[['tno','Ticket #*','text'],['agency','Agency*','select',AGENCIES],['officer','Officer*','text'],['badge','Badge / unit #*','text']]},
   {t:'Defendant',f:[['dname','Name (last, first, middle)*','text'],['ddob','Date of birth*','date'],['dsex','Sex','select',['M','F','U']],['daddr','Address*','text'],['dcity','City, state, ZIP','text'],
     ['oln','OL #*','text'],['olstate','OL state','select',STATES],['olclass','OL class','select',['D','M','CDL-A','CDL-B','CDL-C','None']],['cdl','CMV / CDL involved','check'],['haz','Hazmat','check']]},
   {t:'Vehicle',f:[['plate','Plate #*','text'],['lpstate','Plate state','select',STATES],['vyr','Year','number'],['vmake','Make','text'],['vmodel','Model','text'],['vcolor','Color','text']]},
   {t:'Offense',f:[['odate','Offense date*','date'],['otime','Time*','time'],['oloc','Location*','text'],['place','City, village or township*','select',PLACES],['charge','Charge (ORC)*','select',ORC],
     ['speed','Speed (mph)','number'],['zone','Posted limit','number'],['meth','Speed measured by','select',['','Radar','Laser','Pace','Aircraft','Visual estimate']],['crash','Crash involved','check'],['pav','Pavement','select',['','Dry','Wet','Snow','Ice']],['vis','Visibility','select',['','Clear','Rain','Fog','Night']],['traffic','Traffic','select',['','Light','Moderate','Heavy']]]},
   {t:'Court',f:[['court','Court*','select',COURTS],['cdate','Appear on (date)*','date'],['ctime','Appear at (time)','time'],['waiv','Waiverable offense','check'],['notes','Officer notes','area']]}
  ]},
 inc:{title:'Incident / Offense Report',sub:'Training general incident report',prefix:'IR',
  sections:[
   {t:'Incident',f:[['rptno','Report #*','text'],['cad','CAD incident #','text'],['agency','Agency*','select',AGENCIES],['officer','Reporting officer*','text'],['badge','Badge / unit #','text'],
     ['idate','Date*','date'],['itime','Time*','time'],['iloc','Location*','text'],['place','City, village or township*','select',PLACES],
     ['offense','Offense / nature*','text'],['orc','ORC section','text'],['disp','Disposition*','select',['Report only','Arrest','Citation issued','Referred to detective','Unfounded','Cleared by exception','Open / pending']]]},
   {t:'Person',rep:'persons',max:10,f:[['role','Role*','select',['Victim','Suspect','Arrestee','Complainant','Witness','Other']],['pname','Name (last, first, middle)*','text'],['pdob','Date of birth','date'],['psex','Sex','select',['M','F','U']],['paddr','Address','text'],['pphone','Phone','text'],['pid','OL / ID #','text']]},
   {t:'Property',rep:'property',max:10,f:[['pdesc','Description','text'],['pstat','Status','select',['Stolen','Recovered','Damaged','Evidence','Found','Seized']],['pval','Value ($)','number'],['pser','Serial #','text']]},
   {t:'Narrative',f:[['narr','Narrative*','area']]}
  ]}
};

// ---------- state ----------
let CUR=null; // {type,id,data,reps}
const store={get(){try{return JSON.parse(localStorage.getItem('lc911_reports')||'[]')}catch(e){return MEM}},set(a){try{localStorage.setItem('lc911_reports',JSON.stringify(a))}catch(e){MEM=a}}};let MEM=[];
const today=()=>{const d=new Date();return d.toISOString().slice(0,10)},nowT=()=>{const d=new Date();return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')};
function newNo(prefix){const d=new Date();return `SIM-${prefix}-${String(d.getFullYear()).slice(2)}-${String(Math.floor(Math.random()*90000)+10000)}`}
function blank(type,pre){
  const sc=SCHEMA[type];const r={type,id:'r'+Date.now(),data:{},reps:{},saved:null};
  sc.sections.forEach(s=>{if(s.rep)r.reps[s.rep]=[{}]});
  const d=r.data;
  if(type==='crash'){d.rptno=newNo('CR');d.county='Lawrence (44)';d.cdate=today();d.ctime=nowT();d.taken='Police agency';d.nunits='2';r.reps.units=[{},{}];r.reps.persons=[{role:'Driver',unitno:'1'},{role:'Driver',unitno:'2'}]}
  if(type==='cite'){d.tno=newNo('TT');d.odate=today();d.otime=nowT();d.olstate='OH';d.lpstate='OH'}
  if(type==='inc'){d.rptno=newNo('IR');d.idate=today();d.itime=nowT()}
  if(pre)Object.entries(pre).forEach(([k,v])=>{if(k==='reps')Object.assign(r.reps,v);else d[k]=v});
  return r;
}

// ---------- UI ----------
function ensureShell(){
  if($('#rw'))return;
  const el=document.createElement('div');el.id='rw';el.className='hidden';
  el.innerHTML=`<div class="rw-top"><b>📝 Report writer</b><span class="rw-badge">TRAINING — not an official record</span>
    <span style="flex:1"></span>
    <button data-rwnew="crash">+ Crash report</button><button data-rwnew="cite">+ Citation</button><button data-rwnew="inc">+ Incident report</button><button id="rwSaved">Saved</button><button id="rwClose" class="warn">Close</button></div>
    <div id="rwBody"></div>`;
  document.body.appendChild(el);
  el.addEventListener('click',onClick);el.addEventListener('input',onInput);el.addEventListener('change',onInput);
}
function openRW(type,pre){ensureShell();$('#rw').classList.remove('hidden');document.body.style.overflow='hidden';if(type){CUR=blank(type,pre);renderForm()}else renderSaved()}
function closeRW(){if(CUR&&dirty)save();$('#rw').classList.add('hidden');document.body.style.overflow=''}
let dirty=false;
// Unsaved work is saved automatically instead of asking (browser dialogs are blocked in some viewers)
function confirmLeave(){if(CUR&&dirty)save();return true}
function fieldHTML(f,val,id){
  const [k,label,type,opt]=f;const req=label.includes('*');const v=val??'';
  const lab=`<label class="f" for="${id}">${esc(label.replace('*',''))}${req?' <b style="color:var(--red)">*</b>':''}</label>`;
  if(type==='check')return `<div class="rwf rchk"><label><input type="checkbox" id="${id}" data-k="${k}" ${v?'checked':''}> ${esc(label)}</label></div>`;
  if(type==='select')return `<div class="rwf">${lab}<select id="${id}" data-k="${k}"><option value="">—</option>${opt.filter(o=>o!=='').map(o=>`<option ${o===v?'selected':''}>${esc(o)}</option>`).join('')}</select></div>`;
  if(type==='area')return `<div class="rwf wide">${lab}<textarea id="${id}" data-k="${k}" rows="8">${esc(v)}</textarea></div>`;
  if(type==='sketch')return `<div class="rwf wide">${lab}<div class="sk-wrap"><canvas id="sketch" width="900" height="420"></canvas><div class="sk-tools"><button data-sk="pen" class="on">✏️ Pen</button><button data-sk="car">🚗 Car box</button><button data-sk="arrow">➜ Arrow</button><button data-sk="text">T Label</button><input id="skText" placeholder="Label text, e.g. Unit 1" style="width:150px"><button data-sk="undo">↶ Undo</button><button data-sk="clear">Clear</button></div></div></div>`;
  return `<div class="rwf">${lab}<input id="${id}" data-k="${k}" type="${type==='number'?'number':type==='date'?'date':type==='time'?'time':'text'}" value="${esc(v)}"></div>`;
}
function renderForm(){
  const sc=SCHEMA[CUR.type],d=CUR.data;
  let h=`<div class="rw-head"><div><h2>${esc(sc.title)}</h2><div class="dim">${esc(sc.sub)} · ${esc(d.rptno||d.tno||'')}</div></div>
    <div class="acts"><button id="rwCheck">✔ Check report</button><button id="rwSave" class="pri">💾 Save</button><button id="rwPdf" class="go">⬇ PDF</button></div></div><div id="rwMsg"></div>`;
  sc.sections.forEach(s=>{
    if(s.rep){
      const list=CUR.reps[s.rep]||[];
      list.forEach((row,i)=>{h+=`<fieldset class="rws"><legend>${esc(s.t)} ${i+1}</legend><div class="rwg">${s.f.map(f=>fieldHTML(f,row[f[0]],`r_${s.rep}_${i}_${f[0]}`).replace(`data-k="${f[0]}"`,`data-rep="${s.rep}" data-i="${i}" data-k="${f[0]}"`)).join('')}</div>
        ${list.length>1?`<button class="rw-del" data-del="${s.rep}" data-i="${i}">Remove ${esc(s.t.toLowerCase())} ${i+1}</button>`:''}</fieldset>`});
      if(list.length<s.max)h+=`<button class="rw-add" data-add="${s.rep}">+ Add ${esc(s.t.toLowerCase())}</button>`;
    }else h+=`<fieldset class="rws"><legend>${esc(s.t)}</legend><div class="rwg">${s.f.map(f=>fieldHTML(f,d[f[0]],'f_'+f[0])).join('')}</div></fieldset>`;
  });
  h+=`<div class="dim" style="font-size:12px;margin:10px 0 40px">This is a training tool. The PDF is watermarked on every page as a simulation and is not an Ohio Department of Public Safety form or a court filing.</div>`;
  $('#rwBody').innerHTML=h;$('#rwBody').scrollTop=0;dirty=false;initSketch();
}
function onInput(e){
  const t=e.target;if(!t.dataset||!t.dataset.k||!CUR)return;
  const v=t.type==='checkbox'?t.checked:t.value;
  if(t.dataset.rep){CUR.reps[t.dataset.rep][+t.dataset.i][t.dataset.k]=v}else CUR.data[t.dataset.k]=v;
  dirty=true;
  if(t.dataset.k==='ownsame'&&t.checked&&t.dataset.rep==='units'){const i=+t.dataset.i;const drv=(CUR.reps.persons||[]).find(p=>p.role==='Driver'&&+p.unitno===i+1);if(drv){CUR.reps.units[i].owner=drv.pname||'';CUR.reps.units[i].oaddr=drv.paddr||'';const o=$(`#r_units_${i}_owner`),a=$(`#r_units_${i}_oaddr`);if(o)o.value=drv.pname||'';if(a)a.value=drv.paddr||''}}
}
function onClick(e){
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.rwnew){if(dirty&&!confirmLeave())return;CUR=blank(b.dataset.rwnew);renderForm()}
  else if(b.id==='rwClose')closeRW();
  else if(b.id==='rwSaved'){if(dirty&&!confirmLeave())return;renderSaved()}
  else if(b.dataset.add){CUR.reps[b.dataset.add].push(b.dataset.add==='persons'&&CUR.type==='crash'?{role:'Occupant'}:{});saveSketch();renderForm();dirty=true;
    const sec=document.querySelectorAll(`[data-rep="${b.dataset.add}"]`);if(sec.length)sec[sec.length-1].scrollIntoView({block:'center'})}
  else if(b.dataset.del){CUR.reps[b.dataset.del].splice(+b.dataset.i,1);saveSketch();renderForm();dirty=true}
  else if(b.id==='rwCheck')check(true);
  else if(b.id==='rwSave')save();
  else if(b.id==='rwPdf')pdf();
  else if(b.dataset.open){const r=store.get().find(x=>x.id===b.dataset.open);if(r){CUR=JSON.parse(JSON.stringify(r));renderForm()}}
  else if(b.dataset.rm){const a=store.get().filter(x=>x.id!==b.dataset.rm);store.set(a);renderSaved()}
  else if(b.dataset.pdf){const r=store.get().find(x=>x.id===b.dataset.pdf);if(r){CUR=JSON.parse(JSON.stringify(r));pdf()}}
  else if(b.dataset.sk)skTool(b);
}
function missing(){
  const sc=SCHEMA[CUR.type],m=[];
  sc.sections.forEach(s=>{s.f.forEach(f=>{if(!f[1].includes('*'))return;
    if(s.rep)(CUR.reps[s.rep]||[]).forEach((r,i)=>{if(!r[f[0]])m.push(`${s.t} ${i+1}: ${f[1].replace('*','')}`)});
    else if(!CUR.data[f[0]])m.push(f[1].replace('*',''))})});
  if(CUR.data.narr!==undefined&&String(CUR.data.narr||'').trim().length<40&&!m.includes('Narrative* — describe what happened, unit by unit'.replace('*','')))m.push('Narrative is too short (40+ characters)');
  if(CUR.type==='crash'){const n=+CUR.data.nunits;if(n&&n!==CUR.reps.units.length)m.push(`Number of units says ${n}, but ${CUR.reps.units.length} unit section(s) are filled in`);
    if(CUR.data.severity&&/^[1-3]/.test(CUR.data.severity)&&!(CUR.reps.persons||[]).some(p=>p.injury&&!/^5/.test(p.injury)))m.push('Severity shows an injury crash, but no person is marked injured')}
  if(CUR.type==='cite'&&CUR.data.charge&&/4511\.21 Speed/.test(CUR.data.charge)&&(!CUR.data.speed||!CUR.data.zone))m.push('Speed charge needs speed and posted limit');
  return m;
}
function check(show){
  const m=missing();const el=$('#rwMsg');
  if(show)el.innerHTML=m.length?`<div class="rw-warn"><b>${m.length} item${m.length>1?'s':''} to fix:</b><ul>${m.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:`<div class="rw-ok">✔ All mandatory fields are complete.</div>`;
  return m;
}
function save(){
  saveSketch();CUR.saved=new Date().toISOString();const a=store.get().filter(x=>x.id!==CUR.id);a.unshift(JSON.parse(JSON.stringify(CUR)));store.set(a.slice(0,60));dirty=false;
  $('#rwMsg').innerHTML=`<div class="rw-ok">Saved in this browser (${new Date().toLocaleTimeString()}).</div>`;
}
function renderSaved(){
  const a=store.get();
  $('#rwBody').innerHTML=`<div class="rw-head"><h2>Saved reports</h2></div>`+(a.length?`<table class="rwt"><tr><th>Type</th><th>Number</th><th>Summary</th><th>Saved</th><th></th></tr>${a.map(r=>`<tr><td>${esc(SCHEMA[r.type].title)}</td><td class="mono">${esc(r.data.rptno||r.data.tno)}</td>
    <td>${esc(r.data.route||r.data.oloc||r.data.iloc||'')} ${esc(r.data.dname||r.data.offense||'')}</td><td>${esc(new Date(r.saved).toLocaleString())}</td>
    <td><button data-open="${r.id}">Open</button><button data-pdf="${r.id}" class="go">PDF</button><button data-rm="${r.id}" class="bad">Delete</button></td></tr>`).join('')}</table>`:'<div class="dim">No saved reports yet. Start one with the buttons above.</div>')+
    `<div class="dim" style="font-size:12px;margin-top:10px">Reports are kept only in this browser on this device.</div>`;
}

// ---------- diagram sketch ----------
let sk=null;
function initSketch(){
  const c=$('#sketch');if(!c){sk=null;return}
  const ctx=c.getContext('2d');sk={c,ctx,tool:'pen',ops:CUR.data.diagramOps?JSON.parse(CUR.data.diagramOps):[],cur:null};
  const pos=e=>{const r=c.getBoundingClientRect();return[(e.clientX-r.left)*c.width/r.width,(e.clientY-r.top)*c.height/r.height]};
  c.onpointerdown=e=>{c.setPointerCapture(e.pointerId);const p=pos(e);
    if(sk.tool==='text'){const t=($('#skText').value||'').trim();if(t){sk.ops.push({t:'text',p,s:t});draw();saveSketch();dirty=true}else{$('#skText').focus()}return}
    sk.cur={t:sk.tool,pts:[p]}};
  c.onpointermove=e=>{if(!sk.cur)return;const p=pos(e);if(sk.cur.t==='pen')sk.cur.pts.push(p);else sk.cur.pts[1]=p;draw()};
  c.onpointerup=()=>{if(sk.cur&&sk.cur.pts.length>1){sk.ops.push(sk.cur);dirty=true}sk.cur=null;draw();saveSketch()};
  draw();
}
function skTool(b){if(!sk)return;const t=b.dataset.sk;
  if(t==='undo'){sk.ops.pop();draw();saveSketch();return}if(t==='clear'){sk.ops=[];draw();saveSketch();return}
  sk.tool=t;document.querySelectorAll('[data-sk]').forEach(x=>x.classList.toggle('on',x===b))}
function draw(){
  const {ctx,c}=sk;ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);
  ctx.strokeStyle='#e5e7eb';ctx.lineWidth=1;for(let x=0;x<c.width;x+=30){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,c.height);ctx.stroke()}for(let y=0;y<c.height;y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(c.width,y);ctx.stroke()}
  ctx.fillStyle='#111';ctx.font='bold 16px sans-serif';ctx.fillText('N ↑',c.width-50,26);
  [...sk.ops,...(sk.cur?[sk.cur]:[])].forEach(o=>{ctx.strokeStyle='#111';ctx.fillStyle='#111';ctx.lineWidth=3;
    if(o.t==='pen'){ctx.beginPath();o.pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.stroke()}
    else if(o.t==='car'&&o.pts[1]){const[a,b]=o.pts;ctx.strokeRect(Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]))}
    else if(o.t==='arrow'&&o.pts[1]){const[a,b]=o.pts;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();const an=Math.atan2(b[1]-a[1],b[0]-a[0]);ctx.beginPath();ctx.moveTo(b[0],b[1]);ctx.lineTo(b[0]-14*Math.cos(an-.4),b[1]-14*Math.sin(an-.4));ctx.lineTo(b[0]-14*Math.cos(an+.4),b[1]-14*Math.sin(an+.4));ctx.closePath();ctx.fill()}
    else if(o.t==='text'){ctx.font='bold 18px sans-serif';ctx.fillText(o.s,o.p[0],o.p[1])}});
}
function saveSketch(){if(!sk||!CUR)return;CUR.data.diagramOps=JSON.stringify(sk.ops);CUR.data.diagramImg=sk.ops.length?sk.c.toDataURL('image/jpeg',.85):''}

// ---------- PDF ----------
function loadJsPDF(){return window.jspdf?Promise.resolve():new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';s.onload=res;s.onerror=()=>rej(new Error('jsPDF failed to load'));document.head.appendChild(s)})}
const asText=(f,v)=>f[2]==='check'?(v?'Yes':'No'):f[2]==='date'&&v?v.slice(5,7)+'/'+v.slice(8,10)+'/'+v.slice(0,4):String(v??'');
async function pdf(){
  saveSketch();const m=check(false);
  try{await loadJsPDF()}catch(e){$('#rwMsg').innerHTML=`<div class="rw-warn">Couldn't load the PDF library here. Open 911dispatchsim.com to export PDFs.</div>`;return}
  const {jsPDF}=window.jspdf;const doc=new jsPDF({unit:'pt',format:'letter'});
  const sc=SCHEMA[CUR.type],d=CUR.data,W=612,H=792,M=36;let y=0,page=1;
  const no=d.rptno||d.tno||'';
  const wm=()=>{doc.saveGraphicsState&&doc.saveGraphicsState();doc.setTextColor(212,212,212);doc.setFont('helvetica','bold');doc.setFontSize(44);
    doc.text('TRAINING SIMULATION',120,H-200,{angle:45});doc.text('NOT AN OFFICIAL RECORD',150,H-110,{angle:45});doc.restoreGraphicsState&&doc.restoreGraphicsState()};
  const header=()=>{wm();doc.setFillColor(17,24,39);doc.rect(0,0,W,52,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(15);doc.text(sc.title.toUpperCase(),M,24);
    doc.setFontSize(8.5);doc.setFont('helvetica','normal');doc.text(`${sc.sub}  -  Lawrence County 911 Dispatch Simulator`,M,40);
    doc.setFont('courier','bold');doc.setFontSize(10);doc.text(no,W-M,24,{align:'right'});doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.text('TRAINING - NOT AN OFFICIAL RECORD',W-M,40,{align:'right'});
    doc.setTextColor(0,0,0);y=66};
  const footer=()=>{try{doc.saveGraphicsState();doc.setGState(new doc.GState({opacity:.35}));doc.setTextColor(150,150,150);doc.setFont('helvetica','bold');doc.setFontSize(44);doc.text('TRAINING SIMULATION',120,H-200,{angle:45});doc.text('NOT AN OFFICIAL RECORD',150,H-110,{angle:45});doc.restoreGraphicsState()}catch(e){}
    doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(120,120,120);doc.text(`Training simulation - not an Ohio Department of Public Safety form or court filing.  Page ${page}`,W/2,H-18,{align:'center'});doc.setTextColor(0,0,0)};
  const need=h=>{if(y+h>H-34){footer();doc.addPage();page++;header()}};
  const secBar=t=>{need(30);doc.setFillColor(229,231,235);doc.rect(M,y,W-2*M,15,'F');doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.text(t.toUpperCase(),M+5,y+10.5);y+=19};
  const grid=(fields,row)=>{
    const cols=3,cw=(W-2*M)/cols;let col=0,rowH=0,y0=y;
    fields.forEach(f=>{
      if(f[2]==='sketch')return;
      const v=asText(f,row[f[0]]);
      if(f[2]==='area'){if(col){y=y0+rowH;col=0;rowH=0}
        doc.setFont('helvetica','normal');doc.setFontSize(9);const lines=doc.splitTextToSize(v||' ',W-2*M-10);
        let i=0;while(i<lines.length||i===0){need(30);const chunk=[];let hgt=16;while(i<lines.length&&y+hgt+11<H-34){chunk.push(lines[i]);hgt+=11;i++}
          doc.setDrawColor(160);doc.rect(M,y,W-2*M,hgt+4);doc.setFontSize(6.5);doc.setTextColor(90);doc.text(f[1].replace('*','').toUpperCase(),M+4,y+8);doc.setTextColor(0);doc.setFontSize(9);doc.text(chunk,M+5,y+19);y+=hgt+8;if(i>=lines.length)break}
        y0=y;return}
      doc.setFont('helvetica','normal');doc.setFontSize(9);const vl=doc.splitTextToSize(v||' ',cw-8).slice(0,3);const h=13+vl.length*10;
      if(col===0){need(h+2);y0=y}
      doc.setDrawColor(170);doc.rect(M+col*cw,y0,cw,Math.max(h,24));
      doc.setFontSize(6.3);doc.setTextColor(90);doc.text(f[1].replace('*','').toUpperCase().slice(0,48),M+col*cw+4,y0+8);doc.setTextColor(0);doc.setFontSize(9);doc.text(vl,M+col*cw+4,y0+18);
      rowH=Math.max(rowH,Math.max(h,24));col++;if(col===cols){y=y0+rowH;col=0;rowH=0}
    });
    if(col){y=y0+rowH}y+=6;
  };
  header();
  sc.sections.forEach(s=>{
    if(s.rep)(CUR.reps[s.rep]||[]).forEach((r,i)=>{secBar(`${s.t} ${i+1}`);grid(s.f,r)});
    else if(s.f.some(f=>f[2]==='sketch')){if(d.diagramImg){need(270);secBar(s.t);doc.addImage(d.diagramImg,'JPEG',M,y,W-2*M,(W-2*M)*420/900);y+=(W-2*M)*420/900+8}}
    else{secBar(s.t);grid(s.f,d)}
  });
  if(m.length){secBar('Incomplete at export');doc.setFontSize(8.5);m.forEach(x=>{need(12);doc.text('- '+x,M+4,y+8);y+=11})}
  footer();
  const name=`${no||'report'}.pdf`;
  try{doc.save(name);$('#rwMsg').innerHTML=`<div class="rw-ok">PDF exported: ${esc(name)}${m.length?` (with ${m.length} incomplete item${m.length>1?'s':''} listed at the end)`:''}.</div>`}
  catch(e){const url=doc.output('bloburl');$('#rwMsg').innerHTML=`<div class="rw-warn">Download was blocked here. <a href="${url}" target="_blank" rel="noopener">Open the PDF</a>, or export from 911dispatchsim.com.</div>`}
  window.__lastPdf=doc;
}

// ---------- public hooks ----------
window.openRW=openRW;
window.rwFromIncident=function(inc,unit,call){
  const zoneToPlace={IRON:'Ironton (City)',COAL:'Coal Grove (Village)',HANG:'Hanging Rock (Village)',HAM:'Hamilton Township',SPT:'South Point (Village)',BURL:'Fayette Township',CHES:'Chesapeake (Village)',
    PROC:'Proctorville (Village)',ATH:'Athalia (Village)',ROME:'Rome Township',WIND:'Windsor Township',PERRY:'Perry Township',LAWT:'Lawrence Township',UPPER:'Upper Township',ELIZ:'Elizabeth Township',WASH:'Washington Township',DEC:'Decatur Township',AID:'Aid Township'};
  const agency={LCSO:"Lawrence County Sheriff's Office",IPD:'Ironton Police Department',CGPD:'Coal Grove Police Department',HRPD:'Hanging Rock Police Department',SPPD:'South Point Police Department',CPD:'Chesapeake Police Department',PPD:'Proctorville Police Department',APD:'Athalia Police Department',OSHP:'Ohio State Highway Patrol'}[unit&&unit.agency]||'';
  const crash=['MVA','MVAI'].includes(inc.nat);const mm=(inc.loc.match(/mile marker (\d+)/)||[])[1];
  const route=inc.loc.replace(/ near mile marker \d+/,'').replace(/^\d+\s+/,'');
  const notes=(inc.notes||'').trim();
  if(crash)openRW('crash',{agency,badge:unit?unit.id:'',place:zoneToPlace[inc.zk]||'',route,mm:mm||'',rtype:/^US-/.test(route)?'US route':/^SR-/.test(route)?'State route':/County Road/.test(route)?'County road':/Township Road/.test(route)?'Township road':'',
    severity:inc.nat==='MVAI'?'3 - Minor injury suspected':'5 - Property damage only',narr:notes?`CAD #${inc.id} notes:\n${notes}\n\n`:''});
  else openRW('inc',{cad:String(inc.id),agency,badge:unit?unit.id:'',iloc:inc.loc,place:zoneToPlace[inc.zk]||'',offense:inc.natD||inc.nat,narr:notes?`CAD #${inc.id} notes:\n${notes}\n\n`:''});
};
window.rwFromCitation=function(c,unit,placeZk){
  const P=c.P;const iso=s=>{const[m,d,y]=s.split('/');return `${y}-${m}-${d}`};
  const agency={LCSO:"Lawrence County Sheriff's Office",IPD:'Ironton Police Department',CGPD:'Coal Grove Police Department',HRPD:'Hanging Rock Police Department',SPPD:'South Point Police Department',CPD:'Chesapeake Police Department',PPD:'Proctorville Police Department',APD:'Athalia Police Department',OSHP:'Ohio State Highway Patrol'}[c.agency]||'';
  const ch=ORC.find(o=>o.startsWith(c.orc+' '))||'';
  const zp={IRON:'Ironton (City)',COAL:'Coal Grove (Village)',HANG:'Hanging Rock (Village)',HAM:'Hamilton Township',SPT:'South Point (Village)',BURL:'Fayette Township',CHES:'Chesapeake (Village)',PROC:'Proctorville (Village)',ATH:'Athalia (Village)',ROME:'Rome Township',WIND:'Windsor Township',PERRY:'Perry Township',LAWT:'Lawrence Township',UPPER:'Upper Township',ELIZ:'Elizabeth Township',WASH:'Washington Township',DEC:'Decatur Township',AID:'Aid Township'};
  openRW('cite',{place:zp[c.zk]||'',tno:c.tno,agency,badge:c.unit,dname:`${P.last}, ${P.first} ${P.mi}`,ddob:iso(P.dob),dsex:P.sex,daddr:P.addr,dcity:`${P.town[0]}, OH ${P.town[1]}`,oln:P.oln,olclass:'D',
    plate:c.plate,odate:iso(c.date),otime:c.time.slice(0,2)+':'+c.time.slice(2),oloc:c.loc,charge:ch,speed:c.mph?String(c.mph[0]):'',zone:c.mph?String(c.mph[1]):'',court:c.court,cdate:iso(c.cdate),ctime:'09:00'});
};
document.addEventListener('click',e=>{const b=e.target.closest('[data-rwopen]');if(b){e.preventDefault();e.stopPropagation();openRW(b.dataset.rwopen||null)}},true);
})();
