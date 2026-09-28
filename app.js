const CFG=window.INSUBRIA_CONFIG||{};
const sb=supabase.createClient(CFG.supabaseUrl||'',CFG.supabaseKey||'');
let currentUser=null,currentProfile=null,isAdmin=false, realtime=[];
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fmtDate=d=>new Date(d).toLocaleDateString('it-IT',{day:'2-digit',month:'short'});
const fmtDateTime=d=>new Date(d).toLocaleString('it-IT',{dateStyle:'short',timeStyle:'short'});
const initials=n=>(n||'?').split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase();

function showAuth(msg='',error=false){$('authMessage').textContent=msg;$('authMessage').className='auth-message '+(error?'error':'');$('authScreen').classList.remove('hidden');$('appShell').classList.add('hidden');}
function showApp(){ $('authScreen').classList.add('hidden');$('appShell').classList.remove('hidden'); }
function nav(page){document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));$(page).classList.add('active');document.querySelectorAll('.bottom button').forEach(x=>x.classList.toggle('active',x.dataset.page===page));history.replaceState(null,'','#'+page);}
document.querySelectorAll('.bottom button').forEach(b=>b.onclick=()=>nav(b.dataset.page));

async function boot(){
 if(!CFG.supabaseUrl||CFG.supabaseUrl.includes('TUO-PROGETTO')){showAuth('Configura prima config.js con URL e Publishable Key di Supabase.',true);return;}
 const {data:{session}}=await sb.auth.getSession();
 if(session) await startSession(session.user);
 else showAuth();
 sb.auth.onAuthStateChange(async(_event,session)=>{if(session) await startSession(session.user);else{currentUser=null;currentProfile=null;showAuth();}});
}
async function startSession(user){
 currentUser=user;
 let {data:p,error}=await sb.from('profiles').select('*').eq('id',user.id).maybeSingle();
 if(error){showAuth(error.message,true);return;}
 if(!p){
   const name=user.user_metadata?.name||user.email?.split('@')[0]||'Socio';
   const ins=await sb.from('profiles').insert({id:user.id,name,email:user.email,role:'Socio'}).select().single();
   if(ins.error){showAuth(ins.error.message,true);return;} p=ins.data;
 }
 currentProfile=p;isAdmin=['Presidente','Segretario','Amministratore'].includes(p.role);
 $('profileName').value=p.name||'';$('profileRole').value=p.role||'Socio';$('profilePhone').value=p.phone||'';$('profileEmail').value=p.email||user.email||'';
 $('adminInfo').textContent=isAdmin?'Sei amministratore del Club.':'Profilo socio autenticato.';
 document.querySelectorAll('.admin-only').forEach(x=>x.style.display=isAdmin?'inline-flex':'none');
 showApp();
 const page=location.hash.slice(1);nav($(page)?page:'home');
 subscribeRealtime(); await renderAll();
 if('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
}

$('loginBtn').onclick=async()=>{const email=$('authEmail').value.trim(),password=$('authPassword').value;if(!email||!password)return showAuth('Inserisci email e password.',true);const r=await sb.auth.signInWithPassword({email,password});if(r.error)showAuth(r.error.message,true);};
$('signupBtn').onclick=async()=>{const name=$('authName').value.trim(),email=$('authEmail').value.trim(),password=$('authPassword').value;if(!name||!email||password.length<6)return showAuth('Inserisci nome, email e una password di almeno 6 caratteri.',true);const r=await sb.auth.signUp({email,password,options:{data:{name}}});if(r.error)return showAuth(r.error.message,true);if(r.data.session) await startSession(r.data.user);else showAuth('Account creato. Controlla la tua email per confermare l’account, poi accedi.');};
$('resetBtn').onclick=async()=>{const email=$('authEmail').value.trim();if(!email)return showAuth('Inserisci prima la tua email.',true);const r=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});showAuth(r.error?r.error.message:'Email per reimpostare la password inviata.');};
$('logoutBtn').onclick=()=>sb.auth.signOut();
$('postBtn').onclick=addPost;$('chatBtn').onclick=sendChat;$('newEventBtn').onclick=()=>openEvent();$('saveProfileBtn').onclick=saveProfile;$('photoInput').onchange=e=>addPhotos(e.target.files);$('docInput').onchange=e=>addDocs(e.target.files);$('closeModal').onclick=closeModal;

async function renderAll(){await Promise.all([renderMembers(),renderEvents(),renderPosts(),renderChat(),renderGallery(),renderDocs()]);await renderHome();}
async function renderHome(){
 const {data:events=[]}=await sb.from('events').select('*').order('event_date',{ascending:true}).gte('event_date',new Date().toISOString()).limit(3);
 $('statMembers').textContent=(await sb.from('profiles').select('id',{count:'exact',head:true})).count||0;
 $('statEvents').textContent=(await sb.from('events').select('id',{count:'exact',head:true})).count||0;
 $('statPosts').textContent=(await sb.from('posts').select('id',{count:'exact',head:true})).count||0;
 const ids=(events||[]).map(e=>e.id);
 let attendanceMap={};
 if(ids.length){
   const r=await sb.from('event_attendees').select('event_id,user_id,status').in('event_id',ids);
   for(const a of r.data||[]){
     attendanceMap[a.event_id] ||= {yes:0,mine:'pending'};
     if(a.status==='yes') attendanceMap[a.event_id].yes++;
     if(a.user_id===currentUser.id) attendanceMap[a.event_id].mine=a.status;
   }
 }
 $('homeEvents').innerHTML=events?.length?events.map(e=>eventCard(e,attendanceMap[e.id]||{yes:0,mine:'pending'})).join(''):'<div class="empty">Nessun evento inserito.</div>';
}

async function memberAvatar(path,size=120){
 if(!path)return '';
 const r=await sb.storage.from('avatars').createSignedUrl(path,3600);
 return r.data?.signedUrl||'';
}

async function renderMembers(){
 const {data,error}=await sb.from('profiles').select('*').eq('is_active',true).order('name');
 if(error)return toast(error.message,true);
 const cards=[];
 for(const m of data||[]){
   const url=await memberAvatar(m.avatar_path);
   const avatar=url?`<img class="avatar" src="${url}" alt="Foto di ${esc(m.name)}">`:`<div class="avatar initials">${initials(m.name)}</div>`;
   cards.push(`<div class="card member" onclick="openMember('${m.id}')">
      ${avatar}
      <div style="flex:1"><strong>${esc(m.name)}</strong><div class="muted">${esc(m.role||'Socio')}</div>${m.phone?`<div class="muted">📞 ${esc(m.phone)}</div>`:''}</div>
      <div class="member-actions">${m.id===currentUser.id?'<span class="badge">Tu</span>':''}<span class="btn light">Dettagli</span></div>
   </div>`);
 }
 $('membersList').innerHTML=cards.join('')||'<div class="empty">Nessun socio.</div>';
}

async function openMember(id){
 const {data:m,error}=await sb.from('profiles').select('*').eq('id',id).single();
 if(error||!m)return toast(error?.message||'Socio non trovato.',true);
 const url=await memberAvatar(m.avatar_path);
 const avatar=url?`<img class="member-detail-avatar" src="${url}" alt="Foto di ${esc(m.name)}">`:`<div class="member-detail-avatar initials">${initials(m.name)}</div>`;
 $('modalContent').innerHTML=`
   <div class="member-detail-head">${avatar}<div><h2 style="margin:0">${esc(m.name)}</h2><div class="muted">${esc(m.role||'Socio')}</div></div></div>
   <div class="card mini" style="margin-top:16px">
     ${m.phone?`<div class="detail-row"><span>📞</span><a href="tel:${esc(m.phone)}">${esc(m.phone)}</a></div>`:''}
     ${m.email?`<div class="detail-row"><span>✉️</span><a href="mailto:${esc(m.email)}">${esc(m.email)}</a></div>`:''}
     <div class="detail-row"><span>👤</span><span>${m.id===currentUser.id?'Il tuo profilo':'Socio del Club'}</span></div>
   </div>`;
 openModal();
}

function eventCard(e,a={yes:0,mine:'pending'}){
 const mine=a.mine||'pending';
 const yesClass=mine==='yes'?'rsvp-yes':'';
 const noClass=mine==='no'?'selected rsvp-no':'';
 return `<div class="card event" onclick="openEvent('${e.id}')">
   <div class="event-date">${fmtDate(e.event_date)}</div>
   <div style="flex:1;min-width:0"><strong>${esc(e.title)}</strong><div class="muted">${esc(e.location||'')} · ${new Date(e.event_date).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}</div><div class="muted" style="margin-top:4px">${a.yes||0} partecipanti</div></div>
   <div class="event-actions">
     <button class="btn ${yesClass}" onclick="event.stopPropagation();rsvp('${e.id}','yes')">${mine==='yes'?'✓ Partecipo':'Partecipo'}</button>
     <button class="btn ${noClass}" onclick="event.stopPropagation();rsvp('${e.id}','no')">${mine==='no'?'✓ Non partecipo':'Non partecipo'}</button>
     ${isAdmin?`<button class="btn light" onclick="event.stopPropagation();openEvent('${e.id}')">Modifica</button>`:''}
   </div>
 </div>`;
}

async function getAttendanceMap(events){
 const ids=(events||[]).map(e=>e.id); const map={};
 if(!ids.length)return map;
 const r=await sb.from('event_attendees').select('event_id,user_id,status').in('event_id',ids);
 if(r.error){toast(r.error.message,true);return map;}
 for(const a of r.data||[]){
   map[a.event_id] ||= {yes:0,mine:'pending'};
   if(a.status==='yes')map[a.event_id].yes++;
   if(a.user_id===currentUser.id)map[a.event_id].mine=a.status;
 }
 return map;
}

async function renderEvents(){
 const {data:events,error}=await sb.from('events').select('*').order('event_date');
 if(error)return toast(error.message,true);
 const map=await getAttendanceMap(events||[]);
 $('eventsList').innerHTML=events?.length?events.map(e=>eventCard(e,map[e.id]||{yes:0,mine:'pending'})).join(''):'<div class="empty">Nessun evento.</div>';
}

async function openEvent(id=''){
 const result=id?await sb.from('events').select('*').eq('id',id).single():{data:{title:'',event_date:'',location:'',details:''}};
 const e=result.data;
 if(id&&(!e||result.error))return toast(result.error?.message||'Evento non trovato.',true);
 let attendance='';
 if(id){
   const r=await sb.from('event_attendees').select('status,user_id,profiles(name)').eq('event_id',id);
   const mine=r.data?.find(x=>x.user_id===currentUser.id)?.status||'pending';
   attendance=`<div class="card mini"><strong>La tua partecipazione</strong><div class="actions" style="margin-top:10px"><button class="btn ${mine==='yes'?'rsvp-yes':''}" onclick="rsvp('${id}','yes')">${mine==='yes'?'✓ Partecipo':'Partecipo'}</button><button class="btn light ${mine==='no'?'selected':''}" onclick="rsvp('${id}','no')">${mine==='no'?'✓ Non partecipo':'Non partecipo'}</button></div><div class="muted" style="margin-top:8px">${(r.data||[]).filter(x=>x.status==='yes').length} partecipanti</div></div>`;
 }
 $('modalContent').innerHTML=`<h2>${id?'Evento':'Nuovo evento'}</h2>
 <input id="eTitle" class="input" placeholder="Titolo" value="${esc(e?.title||'')}">
 <input id="eDate" class="input" type="datetime-local" style="margin-top:8px" value="${e?.event_date?new Date(e.event_date).toISOString().slice(0,16):''}">
 <input id="eLoc" class="input" placeholder="Luogo" style="margin-top:8px" value="${esc(e?.location||'')}">
 <textarea id="eDetails" class="textarea" style="margin-top:8px" placeholder="Descrizione">${esc(e?.details||'')}</textarea>
 ${attendance}
 <div class="actions admin-only"><button class="btn" onclick="saveEvent('${id}')">Salva</button>${id?`<button class="btn danger" onclick="deleteEvent('${id}')">Elimina</button>`:''}</div>`;
 if(!isAdmin){document.querySelectorAll('#modalContent .admin-only').forEach(x=>x.style.display='none');document.querySelectorAll('#modalContent input,#modalContent textarea').forEach(x=>x.disabled=true);}
 openModal();
}

async function saveEvent(id){if(!isAdmin)return;const title=$('eTitle').value.trim();if(!title||!$('eDate').value)return alert('Inserisci titolo e data.');const payload={title,event_date:new Date($('eDate').value).toISOString(),location:$('eLoc').value.trim(),details:$('eDetails').value.trim(),created_by:currentUser.id};const r=id?await sb.from('events').update(payload).eq('id',id):await sb.from('events').insert(payload);if(r.error)toast(r.error.message,true);else{closeModal();renderAll();}}
async function deleteEvent(id){if(!isAdmin||!confirm('Eliminare evento?'))return;const r=await sb.from('events').delete().eq('id',id);if(r.error)toast(r.error.message,true);else{closeModal();renderAll();}}
async function rsvp(eventId,status){
 const r=await sb.from('event_attendees').upsert({event_id:eventId,user_id:currentUser.id,status,updated_at:new Date().toISOString()},{onConflict:'event_id,user_id'}).select();
 if(r.error){toast(r.error.message,true);return;}
 await renderEvents(); await renderHome();
 if($('modal').classList.contains('open'))await openEvent(eventId);
}

async function renderPosts(){const {data,error}=await sb.from('posts').select('id,text,created_at,author_id,profiles(name)').order('created_at',{ascending:false}).limit(100);if(error)return toast(error.message,true);$('postsList').innerHTML=data?.length?data.map(p=>`<div class="card"><strong>${esc(p.profiles?.name||'Socio')}</strong><div class="muted">${fmtDateTime(p.created_at)}</div><div style="margin-top:7px">${esc(p.text)}</div></div>`).join(''):'<div class="empty">Nessun messaggio.</div>';}
async function addPost(){const text=$('postText').value.trim();if(!text)return;const r=await sb.from('posts').insert({author_id:currentUser.id,text});if(r.error)toast(r.error.message,true);else{$('postText').value='';renderPosts();renderHome();}}
async function renderChat(){const {data,error}=await sb.from('chat_messages').select('id,text,created_at,author_id,profiles(name)').order('created_at',{ascending:true}).limit(200);if(error)return toast(error.message,true);$('chatList').innerHTML=data?.length?data.map(c=>`<div class="bubble ${c.author_id===currentUser.id?'mine':''}"><strong>${esc(c.profiles?.name||'Socio')}</strong><div>${esc(c.text)}</div><div class="muted">${new Date(c.created_at).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}</div></div>`).join(''):'<div class="empty">Nessun messaggio.</div>';$('chatList').scrollTop=$('chatList').scrollHeight;}
async function sendChat(){const text=$('chatText').value.trim();if(!text)return;const r=await sb.from('chat_messages').insert({author_id:currentUser.id,text});if(r.error)toast(r.error.message,true);else{$('chatText').value='';renderChat();}}

async function addPhotos(files){for(const f of files){const path=`${currentUser.id}/${crypto.randomUUID()}-${f.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;const up=await sb.storage.from('gallery').upload(path,f,{upsert:false});if(up.error){toast(up.error.message,true);continue;}const ins=await sb.from('gallery_photos').insert({owner_id:currentUser.id,file_path:path,file_name:f.name});if(ins.error)toast(ins.error.message,true);} $('photoInput').value='';renderGallery();}
async function renderGallery(){const {data,error}=await sb.from('gallery_photos').select('*').order('created_at',{ascending:false}).limit(100);if(error)return toast(error.message,true);const cards=[];for(const p of data||[]){const u=await sb.storage.from('gallery').createSignedUrl(p.file_path,3600);cards.push(`<div class="photo-card"><img src="${u.data?.signedUrl||''}" alt="${esc(p.file_name)}"><div class="photo-caption">${esc(p.file_name)}</div></div>`);} $('galleryList').innerHTML=cards.join('')||'<div class="empty">Nessuna foto.</div>';}
async function addDocs(files){for(const f of files){const path=`${currentUser.id}/${crypto.randomUUID()}-${f.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;const up=await sb.storage.from('documents').upload(path,f,{upsert:false});if(up.error){toast(up.error.message,true);continue;}const ins=await sb.from('documents').insert({owner_id:currentUser.id,file_path:path,file_name:f.name});if(ins.error)toast(ins.error.message,true);} $('docInput').value='';renderDocs();}
async function renderDocs(){const {data,error}=await sb.from('documents').select('*').order('created_at',{ascending:false});if(error)return toast(error.message,true);const out=[];for(const d of data||[]){const u=await sb.storage.from('documents').createSignedUrl(d.file_path,3600);out.push(`<div class="card doc"><div class="docicon">FILE</div><div style="flex:1"><strong>${esc(d.file_name)}</strong><div class="muted">${fmtDateTime(d.created_at)}</div></div><a class="btn light" href="${u.data?.signedUrl||'#'}" target="_blank" rel="noopener">Apri</a></div>`);} $('docsList').innerHTML=out.join('')||'<div class="empty">Nessun documento.</div>';}

async function saveProfile(){const payload={name:$('profileName').value.trim(),role:$('profileRole').value.trim()||'Socio',phone:$('profilePhone').value.trim()};if(!payload.name)return alert('Inserisci il nome.');if(payload.role!=='Presidente'&&payload.role!=='Segretario'&&payload.role!=='Amministratore')payload.role='Socio';const r=await sb.from('profiles').update(payload).eq('id',currentUser.id);if(r.error)toast(r.error.message,true);else{currentProfile={...currentProfile,...payload};isAdmin=['Presidente','Segretario','Amministratore'].includes(payload.role);document.querySelectorAll('.admin-only').forEach(x=>x.style.display=isAdmin?'inline-flex':'none');toast('Profilo aggiornato.');renderMembers();}}
function subscribeRealtime(){realtime.forEach(x=>sb.removeChannel(x));realtime=[];['posts','chat_messages','events','event_attendees','gallery_photos','documents','profiles'].forEach(table=>{const ch=sb.channel('insubria-'+table).on('postgres_changes',{event:'*',schema:'public',table},()=>{if(table==='posts')renderPosts();else if(table==='chat_messages')renderChat();else if(table==='events'||table==='event_attendees'){renderEvents();renderHome();}else if(table==='gallery_photos')renderGallery();else if(table==='documents')renderDocs();else if(table==='profiles'){renderMembers();renderHome();}}).subscribe();realtime.push(ch);});}
function openModal(){$('modal').classList.add('open')}function closeModal(){$('modal').classList.remove('open')}
function toast(msg,error=false){if(!msg)return;const old=$('authMessage').textContent;$('authMessage').textContent=msg;$('authMessage').className='auth-message '+(error?'error':'');setTimeout(()=>{$('authMessage').textContent=old;$('authMessage').className='auth-message';},3500);}
window.openEvent=openEvent;window.openMember=openMember;window.saveEvent=saveEvent;window.deleteEvent=deleteEvent;window.rsvp=rsvp;window.addPost=addPost;window.sendChat=sendChat;
boot();
