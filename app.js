const storeKey = "insubria-data-v1";
let state = {
  members: [],
  events: [],
  posts: [],
  chats: [],
  gallery: [],
  docs: []
};

function save(){
  localStorage.setItem(storeKey, JSON.stringify(state));
}

function load(){
  const raw = localStorage.getItem(storeKey);
  if(raw) state = JSON.parse(raw);
  else {
    // seed
    state.members = [
      {id: uid(), name:"Luca Rossi", role:"Presidente", email:"luca@example.com"},
      {id: uid(), name:"Anna Bianchi", role:"Tesoriere", email:"anna@example.com"}
    ];
    state.events = [
      {id: uid(), title:"Cena di Benvenuto", date: new Date(Date.now()+7*24*3600*1000).toISOString(), location:"Ristorante Il Girasole", details:"Portare buon umore", attendees:[]}
    ];
    state.posts = [{id:uid(), author:"System", text:"Benvenuti nella Insubria App!", date:new Date().toISOString()}];
    save();
  }
}

function uid(){ return Math.random().toString(36).slice(2,10) }

function el(id){ return document.getElementById(id) }

function renderMembers(){
  const list = el("members-list");
  list.innerHTML = "";
  state.members.forEach(m=>{
    const div = document.createElement("div"); div.className="list-item";
    const avatar = document.createElement("div"); avatar.className="avatar"; avatar.textContent = m.name.split(" ").map(s=>s[0]).slice(0,2).join("");
    const name = document.createElement("div"); name.innerHTML = `<strong>${m.name}</strong><div class="small">${m.role||""}</div>`;
    const actions = document.createElement("div");
    const btn = document.createElement("button"); btn.className="btn"; btn.textContent="Dettagli";
    btn.onclick = ()=> openMember(m.id);
    const del = document.createElement("button"); del.className="btn secondary"; del.textContent="Elimina";
    del.onclick = ()=>{ state.members = state.members.filter(x=>x.id!==m.id); save(); renderAll(); };
    actions.appendChild(btn); actions.appendChild(del);
    div.appendChild(avatar); div.appendChild(name); div.appendChild(actions);
    list.appendChild(div);
  });
}

function openMember(id){
  const m = state.members.find(x=>x.id===id);
  if(!m) return;
  el("member-name").value = m.name;
  el("member-role").value = m.role||"";
  el("member-email").value = m.email||"";
  el("member-id").value = m.id;
  showSection("member-edit");
}

function saveMember(){
  const id = el("member-id").value;
  const name = el("member-name").value.trim();
  if(!name) return alert("Inserisci nome");
  const role = el("member-role").value.trim();
  const email = el("member-email").value.trim();
  if(id){
    const idx = state.members.findIndex(x=>x.id===id);
    if(idx>=0){ state.members[idx].name=name; state.members[idx].role=role; state.members[idx].email=email; }
  } else {
    state.members.push({id:uid(), name, role, email});
  }
  save(); renderAll(); showSection("members");
}

function renderEvents(){
  const list = el("events-list"); list.innerHTML="";
  state.events.sort((a,b)=>new Date(a.date)-new Date(b.date)).forEach(e=>{
    const div = document.createElement("div"); div.className="card";
    div.innerHTML = `<div class="row"><div><strong>${e.title}</strong><div class="small">${new Date(e.date).toLocaleString()}</div></div><div><button class="btn" onclick="openEvent('${e.id}')">Dettagli</button></div></div>`;
    list.appendChild(div);
  });
}

function openEvent(id){
  const e = state.events.find(x=>x.id===id);
  if(!e) return;
  el("event-id").value = e.id;
  el("event-title").value = e.title;
  el("event-date").value = new Date(e.date).toISOString().slice(0,16);
  el("event-location").value = e.location||"";
  el("event-details").value = e.details||"";
  renderEventAttendees(e);
  showSection("event-edit");
}

function renderEventAttendees(e){
  const container = el("event-attendees");
  container.innerHTML = "";
  state.members.forEach(m=>{
    const row = document.createElement("div"); row.className="list-item";
    row.innerHTML = `<div style="flex:1">${m.name}</div>`;
    const btn = document.createElement("button"); btn.className="btn";
    btn.textContent = (e.attendees||[]).includes(m.id)? "Annulla" : "Partecipo";
    btn.onclick = ()=>{
      e.attendees = e.attendees||[];
      if(e.attendees.includes(m.id)) e.attendees = e.attendees.filter(x=>x!==m.id);
      else e.attendees.push(m.id);
      save(); renderEventAttendees(e);
    };
    row.appendChild(btn);
    container.appendChild(row);
  });
}

function saveEvent(){
  const id = el("event-id").value;
  const title = el("event-title").value.trim();
  if(!title) return alert("Inserisci titolo");
  const date = new Date(el("event-date").value).toISOString();
  const location = el("event-location").value.trim();
  const details = el("event-details").value.trim();
  if(id){
    const idx = state.events.findIndex(x=>x.id===id);
    if(idx>=0){ state.events[idx].title=title; state.events[idx].date=date; state.events[idx].location=location; state.events[idx].details=details; }
  } else {
    state.events.push({id:uid(), title, date, location, details, attendees:[]});
  }
  save(); renderAll(); showSection("events");
}

function renderPosts(){
  const list = el("posts-list"); list.innerHTML="";
  state.posts.forEach(p=>{
    const div = document.createElement("div"); div.className="card";
    div.innerHTML = `<div class="row"><div><strong>${p.author}</strong> <div class="small">${new Date(p.date).toLocaleString()}</div></div></div><div style="margin-top:8px">${p.text}</div>`;
    list.appendChild(div);
  });
}

function publishPost(){
  const author = el("post-author").value.trim() || "Anonimo";
  const text = el("post-text").value.trim();
  if(!text) return;
  state.posts.unshift({id:uid(), author, text, date:new Date().toISOString()});
  el("post-text").value=""; save(); renderAll();
}

function renderChat(){
  const list = el("chat-list"); list.innerHTML="";
  state.chats.forEach(c=>{
    const div = document.createElement("div"); div.className="card";
    div.innerHTML = `<div class="small">${c.sender} · ${new Date(c.date).toLocaleTimeString()}</div><div>${c.text}</div>`;
    list.appendChild(div);
  });
}

function sendChat(){
  const name = el("chat-name").value.trim() || "Anonimo";
  const text = el("chat-text").value.trim();
  if(!text) return;
  state.chats.push({id:uid(), sender:name, text, date:new Date().toISOString()});
  el("chat-text").value=""; save(); renderAll(); scrollChat();
}

function scrollChat(){
  const box = el("chat-list");
  box.scrollTop = box.scrollHeight;
}

function renderGallery(){
  const grid = el("gallery-grid"); grid.innerHTML="";
  state.gallery.forEach((g, i)=>{
    const img = document.createElement("img"); img.src = g.data; img.alt = g.name || "foto";
    grid.appendChild(img);
  });
}

function addGalleryFile(input){
  const f = input.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = (e)=>{
    state.gallery.unshift({id:uid(), name:f.name, data:e.target.result});
    save(); renderGallery();
  };
  reader.readAsDataURL(f);
}

function renderDocs(){
  const list = el("docs-list"); list.innerHTML="";
  state.docs.forEach(d=>{
    const a = document.createElement("a"); a.href = d.data; a.target="_blank"; a.textContent = d.name;
    list.appendChild(a);
  });
}

function addDocFile(input){
  const f = input.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = (e)=>{
    state.docs.unshift({id:uid(), name:f.name, data:e.target.result});
    save(); renderDocs();
  };
  reader.readAsDataURL(f);
}

function showSection(id){
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function renderAll(){
  renderMembers(); renderEvents(); renderPosts(); renderChat(); renderGallery(); renderDocs();
}

window.addEventListener('load', ()=>{
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('/service-worker.js').catch(()=>{});
  }
  load();
  renderAll();
  // navigation
  document.querySelectorAll('[data-tab]').forEach(btn=>{
    btn.onclick = ()=> showSection(btn.getAttribute('data-tab'));
  });
  // default show members
  showSection('members');
});