const KEY="insubria-v2-data";
let data=JSON.parse(localStorage.getItem(KEY)||"null")||{
 members:[{id:id(),name:"Mario Rossi",role:"Presidente",phone:"",email:"",photo:""},{id:id(),name:"Anna Bianchi",role:"Segretario",phone:"",email:"",photo:""}],
 events:[],posts:[{id:id(),author:"Insubria App",text:"Benvenuti nella nuova app del Club!",date:new Date().toISOString()}],
 chats:[],photos:[],docs:[]
};
save();

function id(){return crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)}
function save(){localStorage.setItem(KEY,JSON.stringify(data))}
function esc(s){return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function initials(n){return (n||"?").split(/\s+/).map(x=>x[0]).slice(0,2).join("").toUpperCase()}
function nav(page){
 document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));
 document.getElementById(page).classList.add("active");
 document.querySelectorAll(".bottom button").forEach(x=>x.classList.toggle("active",x.dataset.page===page));
 history.replaceState(null,"","#"+page);
}
document.querySelectorAll(".bottom button").forEach(b=>b.onclick=()=>nav(b.dataset.page));
window.addEventListener("load",()=>{const p=location.hash.slice(1);nav(document.getElementById(p)?p:"home");render(); if("serviceWorker"in navigator)navigator.serviceWorker.register("./service-worker.js");});

function render(){
 document.getElementById("statMembers").textContent=data.members.length;
 document.getElementById("statEvents").textContent=data.events.length;
 document.getElementById("statPosts").textContent=data.posts.length;
 renderMembers();renderEvents();renderPosts();renderChat();renderGallery();renderDocs();renderHome();
}
function renderHome(){
 const c=document.getElementById("homeEvents");let es=[...data.events].sort((a,b)=>a.date.localeCompare(b.date)).slice(0,3);
 c.innerHTML=es.length?es.map(eventCard).join(""):'<div class="empty">Nessun evento inserito.</div>';
}
function renderMembers(){
 const c=document.getElementById("membersList");
 c.innerHTML=data.members.length?data.members.map(m=>`<div class="card member">
 ${m.photo?`<img class="avatar" src="${m.photo}">`:`<div class="avatar initials">${initials(m.name)}</div>`}
 <div style="flex:1"><strong>${esc(m.name)}</strong><div class="muted">${esc(m.role)}</div>${m.phone?`<div class="muted">📞 ${esc(m.phone)}</div>`:""}</div>
 <button class="btn light" onclick="openMember('${m.id}')">Modifica</button></div>`).join(""):'<div class="empty">Nessun socio.</div>';
}
function openMember(mid=""){
 const m=data.members.find(x=>x.id===mid)||{id:"",name:"",role:"",phone:"",email:"",photo:""};
 document.getElementById("modalContent").innerHTML=`<h2>${mid?"Modifica socio":"Nuovo socio"}</h2>
 <div class="formgrid">
 <input id="mName" class="input" placeholder="Nome e cognome" value="${esc(m.name)}">
 <input id="mRole" class="input" placeholder="Ruolo" value="${esc(m.role)}">
 <input id="mPhone" class="input" placeholder="Telefono" value="${esc(m.phone)}">
 <input id="mEmail" class="input" placeholder="Email" value="${esc(m.email)}">
 </div>
 <div style="margin-top:10px"><label class="btn yellow">📷 Foto<input id="mPhoto" type="file" accept="image/*" hidden></label><span id="photoName" class="muted" style="margin-left:8px">${m.photo?"Foto già presente":""}</span></div>
 <div class="actions" style="margin-top:14px"><button class="btn" onclick="saveMember('${m.id}')">Salva</button>${mid?`<button class="btn danger" onclick="deleteMember('${m.id}')">Elimina</button>`:""}</div>`;
 document.getElementById("mPhoto").onchange=e=>document.getElementById("photoName").textContent=e.target.files[0]?.name||"";
 openModal();
}
function saveMember(mid){
 const name=document.getElementById("mName").value.trim();if(!name)return alert("Inserisci nome e cognome.");
 const file=document.getElementById("mPhoto").files[0];
 const finish=photo=>{let m=data.members.find(x=>x.id===mid);if(!m){m={id:id(),photo:""};data.members.push(m)}
 Object.assign(m,{name,role:document.getElementById("mRole").value.trim(),phone:document.getElementById("mPhone").value.trim(),email:document.getElementById("mEmail").value.trim(),photo:photo||m.photo||""});save();closeModal();render();};
 if(file){const r=new FileReader();r.onload=e=>finish(e.target.result);r.readAsDataURL(file)}else finish("");
}
function deleteMember(mid){if(confirm("Eliminare questo socio?")){data.members=data.members.filter(x=>x.id!==mid);save();closeModal();render()}}

function eventCard(e){return `<div class="card event"><div class="event-date">${new Date(e.date).toLocaleDateString("it-IT",{day:"2-digit",month:"short"})}</div><div style="flex:1"><strong>${esc(e.title)}</strong><div class="muted">${esc(e.location)} · ${new Date(e.date).toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"})}</div></div><button class="btn light" onclick="openEvent('${e.id}')">Dettagli</button></div>`}
function renderEvents(){const c=document.getElementById("eventsList");let es=[...data.events].sort((a,b)=>a.date.localeCompare(b.date));c.innerHTML=es.length?es.map(eventCard).join(""):'<div class="empty">Nessun evento.</div>'}
function openEvent(eid=""){const e=data.events.find(x=>x.id===eid)||{id:"",title:"",date:"",location:"",details:""};
 document.getElementById("modalContent").innerHTML=`<h2>${eid?"Modifica evento":"Nuovo evento"}</h2><input id="eTitle" class="input" placeholder="Titolo" value="${esc(e.title)}"><input id="eDate" class="input" type="datetime-local" style="margin-top:8px" value="${e.date?e.date.slice(0,16):""}"><input id="eLoc" class="input" placeholder="Luogo" style="margin-top:8px" value="${esc(e.location)}"><textarea id="eDetails" class="textarea" style="margin-top:8px" placeholder="Descrizione">${esc(e.details)}</textarea><div class="actions"><button class="btn" onclick="saveEvent('${e.id}')">Salva</button>${eid?`<button class="btn danger" onclick="deleteEvent('${e.id}')">Elimina</button>`:""}</div>`;openModal();}
function saveEvent(eid){let title=eTitle.value.trim();if(!title||!eDate.value)return alert("Inserisci titolo e data.");let e=data.events.find(x=>x.id===eid);if(!e){e={id:id()};data.events.push(e)}Object.assign(e,{title,date:new Date(eDate.value).toISOString(),location:eLoc.value.trim(),details:eDetails.value.trim()});save();closeModal();render();}
function deleteEvent(eid){if(confirm("Eliminare evento?")){data.events=data.events.filter(x=>x.id!==eid);save();closeModal();render()}}

function renderPosts(){document.getElementById("postsList").innerHTML=data.posts.map(p=>`<div class="card"><strong>${esc(p.author)}</strong><div class="muted">${new Date(p.date).toLocaleString("it-IT")}</div><div style="margin-top:7px">${esc(p.text)}</div></div>`).join("")}
function addPost(){let a=postAuthor.value.trim()||"Socio";let t=postText.value.trim();if(!t)return;data.posts.unshift({id:id(),author:a,text:t,date:new Date().toISOString()});postText.value="";save();render();}
function renderChat(){chatList.innerHTML=data.chats.map(c=>`<div class="bubble ${c.author===chatAuthor.value.trim()?"mine":""}"><strong>${esc(c.author)}</strong><div>${esc(c.text)}</div><div class="muted">${new Date(c.date).toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"})}</div></div>`).join("")||'<div class="empty">Nessun messaggio.</div>';chatList.scrollTop=chatList.scrollHeight}
function sendChat(){let a=chatAuthor.value.trim()||"Socio",t=chatText.value.trim();if(!t)return;data.chats.push({id:id(),author:a,text:t,date:new Date().toISOString()});chatText.value="";save();render();}
function addPhotos(inp){[...inp.files].forEach(f=>{let r=new FileReader();r.onload=e=>{data.photos.unshift({id:id(),name:f.name,data:e.target.result});save();renderGallery()};r.readAsDataURL(f)});inp.value=""}
function renderGallery(){galleryList.innerHTML=data.photos.map(p=>`<img src="${p.data}" alt="${esc(p.name)}">`).join("")||'<div class="empty">Nessuna foto.</div>'}
function addDocs(inp){[...inp.files].forEach(f=>{let r=new FileReader();r.onload=e=>{data.docs.unshift({id:id(),name:f.name,data:e.target.result});save();renderDocs()};r.readAsDataURL(f)});inp.value=""}
function renderDocs(){docsList.innerHTML=data.docs.map(d=>`<div class="card doc"><div class="docicon">PDF</div><div style="flex:1"><strong>${esc(d.name)}</strong></div><a class="btn light" href="${d.data}" download="${esc(d.name)}">Apri</a></div>`).join("")||'<div class="empty">Nessun documento.</div>'}
function openModal(){modal.classList.add("open")}
function closeModal(){modal.classList.remove("open")}
function resetData(){if(confirm("Cancella tutti i dati salvati su questo dispositivo?")){localStorage.removeItem(KEY);location.reload()}}