/* =============================================
   NEXMARK v3 — Full App Logic
   Bookmarks+Groups+Tags+Views | Cloud+GDrive |
   Apps | Whiteboard | Todos+Habits+Goals | Books
============================================= */

// ── STATE ───────────────────────────────────────
const STATE = {
  bookmarks:[], notes:[], cloudFiles:[], groups:[],
  todoLists:[], todoItems:[], habits:[], goals:[], books:[],
  wbSessions:[], activeWbSession:null,
  activeNote:null, activeTodoList:null,
  noteAutoSave:null,
  editIds:{ bookmark:null, group:null, habit:null, goal:null, book:null, todoList:null },
  bmView:'grid', activeBmTab:'groups',
  expandedGroups: new Set(), expandedTagSections: new Set(),
  importedLinks:[], activeCloudTab:'cloud-links',
};

const KEYS={
  bm:'nx_bm', notes:'nx_notes', cloud:'nx_cloud', groups:'nx_groups',
  todoLists:'nx_tlists', todoItems:'nx_titems',
  habits:'nx_habits', goals:'nx_goals', books:'nx_books',
  wbSessions:'nx_wb', prefs:'nx_prefs',
};

const GROUP_COLORS=['#7c6af7','#2ec49e','#f06292','#f0b429','#38bdf8','#ff7043','#ab47bc','#26a69a'];

function ls_load(k){try{return JSON.parse(localStorage.getItem(k))||[];}catch{return[];}}
function ls_obj(k,d={}){try{return JSON.parse(localStorage.getItem(k))||d;}catch{return d;}}
function ls_save(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{toast('Storage full!','error');}}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}

// ── INIT ────────────────────────────────────────
function init(){
  STATE.bookmarks  = ls_load(KEYS.bm);
  STATE.notes      = ls_load(KEYS.notes);
  STATE.cloudFiles = ls_load(KEYS.cloud);
  STATE.groups     = ls_load(KEYS.groups);
  STATE.todoLists  = ls_load(KEYS.todoLists);
  STATE.todoItems  = ls_load(KEYS.todoItems);
  STATE.habits     = ls_load(KEYS.habits);
  STATE.goals      = ls_load(KEYS.goals);
  STATE.books      = ls_load(KEYS.books);
  STATE.wbSessions = ls_load(KEYS.wbSessions);

  const prefs = ls_obj(KEYS.prefs,{theme:'dark',accent:'purple',bmView:'grid'});
  STATE.bmView = prefs.bmView||'grid';
  applyPrefs(prefs);

  setupNav();
  setupBmTabs();
  setupCloudTabs();
  setupTodoTabs();
  setupViewToggle();
  setupColorPickers();

  renderBookmarks();
  renderGroups();
  renderTagsView();
  renderNotesList();
  renderCloud();
  renderTodoLists();
  renderHabits();
  renderGoals();
  renderBooks();
  updateStats();

  // Modal backdrop close
  document.querySelectorAll('.modal-overlay').forEach(o=>
    o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('open');}));
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape')document.querySelectorAll('.modal-overlay.open').forEach(m=>m.classList.remove('open'));
  });

  // Search listeners
  document.getElementById('bm-search').addEventListener('input',debounce(()=>{
    if(STATE.activeBmTab==='all')renderBookmarks();
    else if(STATE.activeBmTab==='groups')renderGroups();
    else renderTagsView();
  },200));
  document.getElementById('bm-filter').addEventListener('change',renderBookmarks);
  document.getElementById('notes-search').addEventListener('input',debounce(renderNotesList,200));
  document.getElementById('books-search').addEventListener('input',debounce(renderBooks,200));
  document.getElementById('books-filter').addEventListener('change',renderBooks);

  // Button wiring
  document.getElementById('btn-add-bm').addEventListener('click',openAddBmModal);
  document.getElementById('btn-add-note').addEventListener('click',createNote);
  document.getElementById('btn-add-cloud').addEventListener('click',()=>openModal('cloud-modal'));
  document.getElementById('btn-add-group').addEventListener('click',openAddGroupModal);
  document.getElementById('btn-add-book').addEventListener('click',openAddBookModal);
  document.getElementById('btn-add-todo-list').addEventListener('click',openAddTodoListModal);
  document.getElementById('btn-todo-template').addEventListener('click',openTemplateModal);

  // GDrive token on redirect
  checkGDriveToken();

  // Whiteboard init (deferred)
  initWhiteboardLazy();
}

// ── NAVIGATION ──────────────────────────────────
function setupNav(){
  document.querySelectorAll('.nav-btn[data-panel]').forEach(btn=>{
    btn.addEventListener('click',()=>switchPanel(btn.dataset.panel));
  });
}

function switchPanel(panel){
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  const btn=document.querySelector(`.nav-btn[data-panel="${panel}"]`);
  if(btn)btn.classList.add('active');
  const sec=document.getElementById(`panel-${panel}`);
  if(sec)sec.classList.add('active');
  if(panel==='whiteboard')initWhiteboard();
}

function openApp(name){
  if(name==='whiteboard')switchPanel('whiteboard');
}

// ── BM TABS ─────────────────────────────────────
function setupBmTabs(){
  document.querySelectorAll('#panel-bookmarks .bm-tab').forEach(tab=>{
    tab.addEventListener('click',()=>switchBmTab(tab.dataset.tab));
  });
  // default: groups
  switchBmTab('groups');
}

function switchBmTab(tab){
  STATE.activeBmTab=tab;
  document.querySelectorAll('#panel-bookmarks .bm-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('#panel-bookmarks .bm-tab-content').forEach(c=>c.classList.remove('active'));
  const tabBtn=document.querySelector(`#panel-bookmarks .bm-tab[data-tab="${tab}"]`);
  if(tabBtn)tabBtn.classList.add('active');
  const content=document.getElementById(`bm-tab-${tab}`);
  if(content)content.classList.add('active');
  // Show/hide group actions
  const gActions=document.getElementById('bm-tab-actions-groups');
  if(gActions)gActions.style.display=tab==='groups'?'flex':'none';
  // Show/hide view toggle (only in all tab)
  document.getElementById('bm-view-toggle').style.visibility=tab==='all'?'visible':'hidden';
  if(tab==='groups')renderGroups();
  else if(tab==='tags')renderTagsView();
  else renderBookmarks();
}

// ── VIEW TOGGLE ─────────────────────────────────
function setupViewToggle(){
  document.querySelectorAll('.view-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      STATE.bmView=btn.dataset.view;
      document.querySelectorAll('.view-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const prefs=ls_obj(KEYS.prefs,{});prefs.bmView=STATE.bmView;ls_save(KEYS.prefs,prefs);
      renderBookmarks();
    });
  });
  // Restore saved view
  const saved=ls_obj(KEYS.prefs,{}).bmView||'grid';
  STATE.bmView=saved;
  document.querySelectorAll('.view-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===saved));
}

// ── BOOKMARKS — CRUD ────────────────────────────
function openAddBmModal(){
  STATE.editIds.bookmark=null;
  document.getElementById('bm-modal-title').textContent='Add Bookmark';
  ['bm-url','bm-title','bm-desc','bm-tags','bm-favicon'].forEach(id=>document.getElementById(id).value='');
  populateGroupSelect();
  openModal('bm-modal');
  setTimeout(()=>document.getElementById('bm-url').focus(),100);
}

function openEditBmModal(id){
  const bm=STATE.bookmarks.find(b=>b.id===id);if(!bm)return;
  STATE.editIds.bookmark=id;
  document.getElementById('bm-modal-title').textContent='Edit Bookmark';
  document.getElementById('bm-url').value=bm.url;
  document.getElementById('bm-title').value=bm.title;
  document.getElementById('bm-desc').value=bm.desc||'';
  document.getElementById('bm-tags').value=bm.tags.join(', ');
  document.getElementById('bm-favicon').value=bm.favicon||'';
  populateGroupSelect(bm.groupId||'');
  openModal('bm-modal');
}

function populateGroupSelect(selected=''){
  const sel=document.getElementById('bm-group');
  sel.innerHTML='<option value="">— No Group —</option>'+
    STATE.groups.map(g=>`<option value="${g.id}"${g.id===selected?' selected':''}>${esc(g.icon||'📁')} ${esc(g.name)}</option>`).join('');
}

function saveBookmark(){
  const url=document.getElementById('bm-url').value.trim();
  const title=document.getElementById('bm-title').value.trim();
  const desc=document.getElementById('bm-desc').value.trim();
  const tags=document.getElementById('bm-tags').value.split(',').map(t=>t.trim()).filter(Boolean);
  const favicon=document.getElementById('bm-favicon').value.trim();
  const groupId=document.getElementById('bm-group').value;
  if(!url){toast('URL is required','error');return;}
  let pu;try{pu=new URL(url);}catch{toast('Enter a valid URL','error');return;}
  const af=favicon||`https://www.google.com/s2/favicons?domain=${pu.hostname}&sz=64`;
  const at=title||pu.hostname.replace('www.','');
  if(STATE.editIds.bookmark){
    const i=STATE.bookmarks.findIndex(b=>b.id===STATE.editIds.bookmark);
    if(i>=0)STATE.bookmarks[i]={...STATE.bookmarks[i],url,title:at,desc,tags,favicon:af,groupId,updatedAt:Date.now()};
    toast('Bookmark updated ✓','success');
  }else{
    STATE.bookmarks.unshift({id:uid(),url,title:at,desc,tags,favicon:af,groupId,createdAt:Date.now()});
    toast('Bookmark saved ✓','success');
  }
  ls_save(KEYS.bm,STATE.bookmarks);
  refreshBookmarkViews(); updateStats(); closeModal('bm-modal');
}

function deleteBookmark(id){
  if(!confirm('Delete this bookmark?'))return;
  STATE.bookmarks=STATE.bookmarks.filter(b=>b.id!==id);
  ls_save(KEYS.bm,STATE.bookmarks);
  refreshBookmarkViews(); updateStats(); toast('Deleted','info');
}

function refreshBookmarkViews(){
  updateTagFilter();
  if(STATE.activeBmTab==='all')renderBookmarks();
  else if(STATE.activeBmTab==='groups')renderGroups();
  else renderTagsView();
}

// ── BOOKMARKS — RENDER ALL ───────────────────────
function renderBookmarks(){
  if(STATE.activeBmTab!=='all')return;
  const q=document.getElementById('bm-search').value.toLowerCase();
  const f=document.getElementById('bm-filter').value;
  const grid=document.getElementById('bm-grid');
  const empty=document.getElementById('bm-empty');
  let bms=STATE.bookmarks;
  if(q)bms=bms.filter(b=>b.title.toLowerCase().includes(q)||b.url.toLowerCase().includes(q)||(b.desc||'').toLowerCase().includes(q)||b.tags.some(t=>t.toLowerCase().includes(q)));
  if(f!=='all')bms=bms.filter(b=>b.tags.includes(f));
  if(bms.length===0){grid.innerHTML='';grid.style.display='none';empty.style.display='flex';return;}
  grid.style.display='grid';empty.style.display='none';
  grid.className='bookmarks-grid view-'+STATE.bmView;
  grid.innerHTML=bms.map(bm=>bmCardHTML(bm,true)).join('');
  updateTagFilter();
}

function bmCardHTML(bm,showGroupBadge=false){
  const domain=(()=>{try{return new URL(bm.url).hostname.replace('www.','');}catch{return bm.url;}})();
  const init2=(bm.title||domain).charAt(0).toUpperCase();
  const tags=bm.tags.slice(0,3).map(t=>`<span class="tag-pill" onclick="filterByTag('${esc(t)}')">#${esc(t)}</span>`).join('');
  const group=bm.groupId?STATE.groups.find(g=>g.id===bm.groupId):null;
  const isCompact=STATE.bmView==='compact';
  return `<div class="bm-card">
    <div class="bm-card-header">
      <img class="bm-favicon" src="${esc(bm.favicon)}" alt="" onerror="this.style.display='none';this.nextSibling.style.display='flex'" loading="lazy"/>
      <div class="bm-favicon-fallback" style="display:none">${init2}</div>
      <span class="bm-title" title="${esc(bm.title)}">${esc(bm.title)}</span>
      ${showGroupBadge&&group?`<span class="bm-group-badge" style="--gbg:${group.color||'var(--accent)'}22;--gcol:${group.color||'var(--accent)'}">${esc(group.icon||'📁')}</span>`:''}
    </div>
    ${!isCompact&&bm.desc?`<p class="bm-desc">${esc(bm.desc)}</p>`:''}
    ${!isCompact?`<div class="bm-url">${esc(domain)}</div>`:''}
    ${!isCompact&&tags?`<div class="bm-tags">${tags}</div>`:''}
    <div class="bm-card-actions">
      <button class="card-action-btn open-btn" onclick="window.open('${esc(bm.url)}','_blank')">Open ↗</button>
      <button class="card-action-btn" onclick="openEditBmModal('${bm.id}')">Edit</button>
      <button class="card-action-btn del-btn" onclick="deleteBookmark('${bm.id}')">Delete</button>
    </div>
  </div>`;
}

function updateTagFilter(){
  const sel=document.getElementById('bm-filter');const cur=sel.value;
  const tags=[...new Set(STATE.bookmarks.flatMap(b=>b.tags))].sort();
  sel.innerHTML='<option value="all">All Tags</option>'+tags.map(t=>`<option value="${esc(t)}"${t===cur?' selected':''}>#${esc(t)}</option>`).join('');
}

function filterByTag(tag){
  if(STATE.activeBmTab!=='all')switchBmTab('all');
  document.getElementById('bm-filter').value=tag;
  renderBookmarks();
}

// ── TAGS VIEW ────────────────────────────────────
function renderTagsView(){
  const container=document.getElementById('tags-view-container');
  const empty=document.getElementById('tags-empty');
  const allTags=[...new Set(STATE.bookmarks.flatMap(b=>b.tags))].sort();
  if(allTags.length===0){container.innerHTML='';container.style.display='none';empty.style.display='flex';return;}
  container.style.display='flex';empty.style.display='none';
  const q=document.getElementById('bm-search').value.toLowerCase();
  container.innerHTML=allTags.map(tag=>{
    let bms=STATE.bookmarks.filter(b=>b.tags.includes(tag));
    if(q)bms=bms.filter(b=>b.title.toLowerCase().includes(q)||b.url.toLowerCase().includes(q));
    const isOpen=STATE.expandedTagSections.has(tag);
    return `<div class="tag-section">
      <div class="tag-section-header" onclick="toggleTagSection('${esc(tag)}')">
        <div class="tag-section-name">
          <span style="transform:rotate(${isOpen?90:0}deg);display:inline-block;transition:.2s">›</span>
          #${esc(tag)}
        </div>
        <span class="tag-section-count">${bms.length}</span>
      </div>
      ${isOpen?`<div class="tag-section-body"><div class="tag-section-grid">${bms.map(bm=>bmCardHTML(bm,false)).join('')}</div></div>`:''}
    </div>`;
  }).join('');
}

function toggleTagSection(tag){
  STATE.expandedTagSections.has(tag)?STATE.expandedTagSections.delete(tag):STATE.expandedTagSections.add(tag);
  renderTagsView();
}

// ── GROUPS ────────────────────────────────────────
function openAddGroupModal(){
  STATE.editIds.group=null;
  document.getElementById('group-modal-title').textContent='New Group';
  ['group-name','group-icon','group-desc'].forEach(id=>document.getElementById(id).value='');
  setPickerColor('group-color-picker',GROUP_COLORS[0]);
  openModal('group-modal');
  setTimeout(()=>document.getElementById('group-name').focus(),100);
}

function openEditGroupModal(id){
  const g=STATE.groups.find(g=>g.id===id);if(!g)return;
  STATE.editIds.group=id;
  document.getElementById('group-modal-title').textContent='Edit Group';
  document.getElementById('group-name').value=g.name;
  document.getElementById('group-icon').value=g.icon||'';
  document.getElementById('group-desc').value=g.desc||'';
  setPickerColor('group-color-picker',g.color||GROUP_COLORS[0]);
  openModal('group-modal');
}

function saveGroup(){
  const name=document.getElementById('group-name').value.trim();
  const icon=document.getElementById('group-icon').value.trim()||'📁';
  const desc=document.getElementById('group-desc').value.trim();
  const color=getPickerColor('group-color-picker');
  if(!name){toast('Group name required','error');return;}
  if(STATE.editIds.group){
    const i=STATE.groups.findIndex(g=>g.id===STATE.editIds.group);
    if(i>=0)STATE.groups[i]={...STATE.groups[i],name,icon,desc,color,updatedAt:Date.now()};
    toast('Group updated ✓','success');
  }else{
    STATE.groups.push({id:uid(),name,icon,desc,color,createdAt:Date.now()});
    toast('Group created ✓','success');
  }
  ls_save(KEYS.groups,STATE.groups);renderGroups();closeModal('group-modal');
}

function deleteGroup(id){
  if(!confirm("Delete this group? Bookmarks won't be deleted."))return;
  STATE.groups=STATE.groups.filter(g=>g.id!==id);
  STATE.bookmarks=STATE.bookmarks.map(b=>b.groupId===id?{...b,groupId:''}:b);
  ls_save(KEYS.groups,STATE.groups);ls_save(KEYS.bm,STATE.bookmarks);
  renderGroups();toast('Group deleted','info');
}

function toggleGroupExpand(id){
  STATE.expandedGroups.has(id)?STATE.expandedGroups.delete(id):STATE.expandedGroups.add(id);
  renderGroups();
}

function renderGroups(){
  const container=document.getElementById('groups-container');
  const empty=document.getElementById('groups-empty');
  if(STATE.groups.length===0){container.innerHTML='';container.style.display='none';empty.style.display='flex';return;}
  container.style.display='flex';empty.style.display='none';
  const q=document.getElementById('bm-search').value.toLowerCase();
  container.innerHTML=STATE.groups.map(g=>{
    let members=STATE.bookmarks.filter(b=>b.groupId===g.id);
    if(q)members=members.filter(b=>b.title.toLowerCase().includes(q)||b.url.toLowerCase().includes(q));
    const isOpen=STATE.expandedGroups.has(g.id);
    const count=STATE.bookmarks.filter(b=>b.groupId===g.id).length;
    const bmGrid=members.length===0
      ?'<div class="group-empty-msg">No bookmarks yet — add bookmarks and assign them via Edit → Group.</div>'
      :`<div class="group-bm-grid">${members.map(bm=>bmCardHTML(bm,false)).join('')}</div>`;
    return `<div class="group-card">
      <div class="group-card-header" onclick="toggleGroupExpand('${g.id}')" style="--gcolor:${g.color||'var(--accent)'}">
        <div class="group-header-left">
          <span class="group-chevron${isOpen?' open':''}">›</span>
          <span class="group-icon-badge" style="background:${g.color||'var(--accent)'}22;color:${g.color||'var(--accent)'}">${esc(g.icon||'📁')}</span>
          <div><div class="group-name">${esc(g.name)}</div>${g.desc?`<div class="group-desc-small">${esc(g.desc)}</div>`:''}</div>
        </div>
        <div class="group-header-right" onclick="event.stopPropagation()">
          <span class="group-count" style="background:${g.color||'var(--accent)'}22;color:${g.color||'var(--accent)'}">${count}</span>
          <button class="card-action-btn" onclick="openEditGroupModal('${g.id}')">Edit</button>
          <button class="card-action-btn del-btn" onclick="deleteGroup('${g.id}')">Delete</button>
        </div>
      </div>
      ${isOpen?`<div class="group-body">${bmGrid}</div>`:''}
    </div>`;
  }).join('');
}

// ── IMPORT LINKS FROM FILE ────────────────────────
function importLinksFromFile(event){
  const file=event.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    const text=e.target.result;
    // Extract URLs using regex
    const urlRegex=/https?:\/\/[^\s"'<>)\]]+/gi;
    const found=[...new Set(text.match(urlRegex)||[])];
    if(found.length===0){toast('No URLs found in file','error');event.target.value='';return;}
    STATE.importedLinks=found;
    // Show preview
    const preview=document.getElementById('import-preview');
    preview.innerHTML=found.slice(0,20).map(u=>`<div><span class="imp-url">${esc(u)}</span></div>`).join('')+
      (found.length>20?`<div style="color:var(--text3)">…and ${found.length-20} more</div>`:'');
    document.getElementById('import-group-name').value=file.name.replace(/\.[^.]+$/,'').replace(/[_-]/g,' ');
    document.getElementById('import-group-icon').value='🔗';
    setPickerColor('import-group-color-picker',GROUP_COLORS[Math.floor(Math.random()*GROUP_COLORS.length)]);
    openModal('import-links-modal');
    event.target.value='';
  };
  reader.readAsText(file);
}

function confirmImportLinks(){
  const name=document.getElementById('import-group-name').value.trim();
  const icon=document.getElementById('import-group-icon').value.trim()||'🔗';
  const desc=document.getElementById('import-group-desc').value.trim();
  const color=getPickerColor('import-group-color-picker');
  if(!name){toast('Group name required','error');return;}
  if(!STATE.importedLinks.length){toast('No links to import','error');return;}
  // Create group
  const gid=uid();
  STATE.groups.push({id:gid,name,icon,desc,color,createdAt:Date.now()});
  // Create bookmarks
  const newBms=STATE.importedLinks.map(url=>{
    let domain='';try{domain=new URL(url).hostname.replace('www.','');}catch{}
    return{id:uid(),url,title:domain||url,desc:'',tags:[],favicon:`https://www.google.com/s2/favicons?domain=${domain}&sz=64`,groupId:gid,createdAt:Date.now()};
  });
  STATE.bookmarks=newBms.concat(STATE.bookmarks);
  ls_save(KEYS.groups,STATE.groups);ls_save(KEYS.bm,STATE.bookmarks);
  // Expand new group
  STATE.expandedGroups.add(gid);
  renderGroups();updateStats();
  toast(`Imported ${newBms.length} links into "${name}" ✓`,'success');
  closeModal('import-links-modal');
  if(STATE.activeBmTab!=='groups')switchBmTab('groups');
}

// ── NOTES ────────────────────────────────────────
function createNote(){
  const note={id:uid(),title:'Untitled Note',content:'',createdAt:Date.now(),updatedAt:Date.now()};
  STATE.notes.unshift(note);ls_save(KEYS.notes,STATE.notes);
  renderNotesList();openNote(note.id);updateStats();
}

function openNote(id){
  const note=STATE.notes.find(n=>n.id===id);if(!note)return;
  STATE.activeNote=id;
  document.querySelectorAll('.note-item').forEach(el=>el.classList.remove('active'));
  const item=document.querySelector(`[data-note-id="${id}"]`);if(item)item.classList.add('active');
  document.getElementById('note-editor').innerHTML=`
    <div class="note-editor-active">
      <input class="note-title-input" id="nt-title" value="${esc(note.title)}" placeholder="Note title…"/>
      <div class="note-toolbar">
        <button class="note-tool-btn" onclick="wrapTxt('**','**')"><b>B</b></button>
        <button class="note-tool-btn" onclick="wrapTxt('*','*')"><i>I</i></button>
        <button class="note-tool-btn" onclick="insertLine('- ')">• List</button>
        <button class="note-tool-btn" onclick="insertLine('> ')">❝</button>
        <button class="note-tool-btn" onclick="insertLine('## ')">H2</button>
        <button class="note-tool-btn" onclick="insertLine('[ ] ')">☐</button>
        <button class="note-tool-btn" onclick="copyNote()">Copy</button>
        <button class="note-tool-btn" onclick="deleteNote('${id}')" style="margin-left:auto;color:var(--red)">Delete</button>
      </div>
      <textarea class="note-content-input" id="nt-body" placeholder="Start writing…">${esc(note.content)}</textarea>
      <div class="note-footer"><span class="note-wordcount" id="nt-wc">0 words</span><span class="note-wordcount">Auto-saved</span></div>
    </div>`;
  const ti=document.getElementById('nt-title'),ci=document.getElementById('nt-body');
  updateWC(note.content);
  ti.addEventListener('input',()=>scheduleNoteSave(id,ti.value,ci.value));
  ci.addEventListener('input',()=>{updateWC(ci.value);scheduleNoteSave(id,ti.value,ci.value);});
  ci.addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();const s=ci.selectionStart,v=ci.value;ci.value=v.slice(0,s)+'  '+v.slice(s);ci.selectionStart=ci.selectionEnd=s+2;}});
}

function scheduleNoteSave(id,title,content){
  clearTimeout(STATE.noteAutoSave);
  STATE.noteAutoSave=setTimeout(()=>{
    const i=STATE.notes.findIndex(n=>n.id===id);
    if(i>=0){STATE.notes[i].title=title||'Untitled Note';STATE.notes[i].content=content;STATE.notes[i].updatedAt=Date.now();ls_save(KEYS.notes,STATE.notes);}
    const it=document.querySelector(`[data-note-id="${id}"] .note-item-title`);if(it)it.textContent=title||'Untitled Note';
    const ip=document.querySelector(`[data-note-id="${id}"] .note-item-preview`);if(ip)ip.textContent=content.slice(0,60).replace(/\n/g,' ');
  },500);
}

function deleteNote(id){
  if(!confirm('Delete this note?'))return;
  STATE.notes=STATE.notes.filter(n=>n.id!==id);STATE.activeNote=null;
  ls_save(KEYS.notes,STATE.notes);renderNotesList();updateStats();
  document.getElementById('note-editor').innerHTML='<div class="note-editor-placeholder"><span>← Select or create a note</span></div>';
  toast('Note deleted','info');
}

function renderNotesList(){
  const list=document.getElementById('notes-list'),empty=document.getElementById('notes-empty');
  const q=document.getElementById('notes-search').value.toLowerCase();
  let notes=STATE.notes;
  if(q)notes=notes.filter(n=>n.title.toLowerCase().includes(q)||n.content.toLowerCase().includes(q));
  if(notes.length===0){list.innerHTML='';empty.style.display='flex';return;}
  empty.style.display='none';
  list.innerHTML=notes.map(n=>`<div class="note-item${n.id===STATE.activeNote?' active':''}" data-note-id="${n.id}" onclick="openNote('${n.id}')">
    <div class="note-item-title">${esc(n.title)}</div>
    <div class="note-item-preview">${esc(n.content.slice(0,60).replace(/\n/g,' '))}</div>
    <div class="note-item-date">${fmtDate(n.updatedAt)}</div>
  </div>`).join('');
}

function updateWC(text){const wc=document.getElementById('nt-wc');if(!wc)return;const w=text.trim()?text.trim().split(/\s+/).length:0;wc.textContent=`${w} word${w!==1?'s':''}`;}
function wrapTxt(b,a){const ta=document.getElementById('nt-body');if(!ta)return;const s=ta.selectionStart,e=ta.selectionEnd,sel=ta.value.slice(s,e);ta.value=ta.value.slice(0,s)+b+sel+a+ta.value.slice(e);ta.selectionStart=s+b.length;ta.selectionEnd=e+b.length;ta.focus();ta.dispatchEvent(new Event('input'));}
function insertLine(p){const ta=document.getElementById('nt-body');if(!ta)return;const s=ta.selectionStart,ls=ta.value.lastIndexOf('\n',s-1)+1;ta.value=ta.value.slice(0,ls)+p+ta.value.slice(ls);ta.selectionStart=ta.selectionEnd=s+p.length;ta.focus();ta.dispatchEvent(new Event('input'));}
function copyNote(){const ta=document.getElementById('nt-body');if(!ta)return;navigator.clipboard.writeText(ta.value).then(()=>toast('Copied','success'));}

// ── CLOUD ─────────────────────────────────────────
function setupCloudTabs(){
  document.querySelectorAll('#panel-cloud .bm-tab').forEach(tab=>{
    tab.addEventListener('click',()=>{
      const t=tab.dataset.tab;
      STATE.activeCloudTab=t;
      document.querySelectorAll('#panel-cloud .bm-tab').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('#panel-cloud .bm-tab-content').forEach(c=>c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('bm-tab-'+t).classList.add('active');
      // show browse button only on gdrive tab when connected
      const browseBtn=document.getElementById('btn-cloud-browse');
      if(browseBtn)browseBtn.style.display=(t==='cloud-gdrive'&&localStorage.getItem('nx_gdrive_token'))?'block':'none';
    });
  });
}

function saveCloudFile(){
  const service=document.getElementById('cloud-service').value;
  const url=document.getElementById('cloud-url').value.trim();
  const name=document.getElementById('cloud-name').value.trim();
  const type=document.getElementById('cloud-type').value;
  const desc=document.getElementById('cloud-desc').value.trim();
  if(!url){toast('URL is required','error');return;}
  if(!name){toast('Name is required','error');return;}
  const icons={folder:'📁',doc:'📄',sheet:'📊',slide:'📑',image:'🖼',pdf:'📕',other:'📎'};
  STATE.cloudFiles.unshift({id:uid(),service,url,name,type,desc,icon:icons[type]||'📎',createdAt:Date.now()});
  ls_save(KEYS.cloud,STATE.cloudFiles);renderCloud();closeModal('cloud-modal');
  toast('Cloud file added ✓','success');
  ['cloud-url','cloud-name','cloud-desc'].forEach(id=>document.getElementById(id).value='');
}

function deleteCloudFile(id){
  if(!confirm('Remove this cloud file link?'))return;
  STATE.cloudFiles=STATE.cloudFiles.filter(f=>f.id!==id);
  ls_save(KEYS.cloud,STATE.cloudFiles);renderCloud();toast('Removed','info');
}

function renderCloud(){
  const grid=document.getElementById('cloud-grid'),empty=document.getElementById('cloud-empty');
  if(STATE.cloudFiles.length===0){grid.innerHTML='';grid.style.display='none';empty.style.display='flex';return;}
  grid.style.display='grid';empty.style.display='none';
  const sN={gdrive:'Google Drive',mega:'MEGA',dropbox:'Dropbox',onedrive:'OneDrive',other:'Cloud'};
  grid.innerHTML=STATE.cloudFiles.map(f=>`<div class="cloud-card">
    <div class="cloud-card-header"><span class="cloud-file-icon">${f.icon}</span>
      <div><div class="cloud-card-title">${esc(f.name)}</div><div class="cloud-card-service">${sN[f.service]||f.service}</div></div>
    </div>
    ${f.desc?`<p class="cloud-card-desc">${esc(f.desc)}</p>`:''}
    <div class="cloud-card-actions">
      <button class="card-action-btn open-btn" onclick="window.open('${esc(f.url)}','_blank')">Open ↗</button>
      <button class="card-action-btn del-btn" onclick="deleteCloudFile('${f.id}')">Remove</button>
    </div>
  </div>`).join('');
}

// ── GOOGLE DRIVE BROWSER ──────────────────────────
function connectGDrive(){
  const CLIENT_ID=localStorage.getItem('nx_gdrive_client_id')||'';
  if(!CLIENT_ID){
    const id=prompt('Enter your Google OAuth Client ID (from console.cloud.google.com):');
    if(!id)return;localStorage.setItem('nx_gdrive_client_id',id.trim());
  }
  const scopes='https://www.googleapis.com/auth/drive';
  const redirect=encodeURIComponent(window.location.origin+window.location.pathname);
  const url=`https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(localStorage.getItem('nx_gdrive_client_id'))}&redirect_uri=${redirect}&response_type=token&scope=${encodeURIComponent(scopes)}`;
  window.open(url,'_blank','width=500,height=600');
  const s=document.getElementById('gdrive-status');if(s)s.textContent='Popup opened — complete sign-in there';
}

function checkGDriveToken(){
  const hash=window.location.hash;
  if(hash.includes('access_token')){
    const params=new URLSearchParams(hash.slice(1));
    const token=params.get('access_token');
    if(token){
      localStorage.setItem('nx_gdrive_token',token);
      const s=document.getElementById('gdrive-status');if(s)s.textContent='✓ Connected';
      toast('Google Drive connected ✓','success');
      history.replaceState(null,'',window.location.pathname);
      showGDriveBrowser();
    }
  }
  if(localStorage.getItem('nx_gdrive_token')){
    const s=document.getElementById('gdrive-status');if(s)s.textContent='✓ Connected';
    showGDriveBrowser();
  }
}

function showGDriveBrowser(){
  document.getElementById('gdrive-connect-prompt').style.display='none';
  document.getElementById('gdrive-browser').style.display='flex';
  const browseBtn=document.getElementById('btn-cloud-browse');
  if(browseBtn)browseBtn.style.display='block';
  loadDriveFiles('root');
}

function openGDriveBrowser(){
  // Switch to GDrive tab
  const tab=document.querySelector('#panel-cloud .bm-tab[data-tab="cloud-gdrive"]');
  if(tab)tab.click();
}

function disconnectGDrive(){
  if(!confirm('Disconnect Google Drive?'))return;
  localStorage.removeItem('nx_gdrive_token');
  document.getElementById('gdrive-connect-prompt').style.display='flex';
  document.getElementById('gdrive-browser').style.display='none';
  const s=document.getElementById('gdrive-status');if(s)s.textContent='Not connected';
  toast('Disconnected','info');
}

async function loadDriveFiles(folderId='root',folderName='My Drive'){
  const token=localStorage.getItem('nx_gdrive_token');
  if(!token){toast('Not connected to Google Drive','error');return;}
  const grid=document.getElementById('drive-files-grid');
  grid.innerHTML='<div class="drive-loading">Loading files…</div>';
  updateBreadcrumb(folderId,folderName);
  try{
    const q=encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    const fields=encodeURIComponent('files(id,name,mimeType,size,modifiedTime,webViewLink,iconLink,thumbnailLink)');
    const res=await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&pageSize=100&orderBy=folder,name`,{
      headers:{Authorization:`Bearer ${token}`}
    });
    if(res.status===401){toast('Session expired. Reconnect Google Drive.','error');disconnectGDrive();return;}
    const data=await res.json();
    if(!data.files||data.files.length===0){grid.innerHTML='<div class="drive-loading">This folder is empty.</div>';return;}
    renderDriveFiles(data.files);
  }catch(err){
    grid.innerHTML=`<div class="drive-loading">Error loading files. Check your connection.</div>`;
  }
}

function renderDriveFiles(files){
  const grid=document.getElementById('drive-files-grid');
  grid.innerHTML=files.map(f=>{
    const isFolder=f.mimeType==='application/vnd.google-apps.folder';
    const icon=getDriveIcon(f.mimeType);
    const size=f.size?formatBytes(parseInt(f.size)):'—';
    const modified=f.modifiedTime?new Date(f.modifiedTime).toLocaleDateString('en-IN',{day:'numeric',month:'short'}):'';
    return `<div class="drive-file-card" onclick="${isFolder?`loadDriveFiles('${f.id}','${esc(f.name)}')`:`openDriveFile('${esc(f.webViewLink||'')}','${esc(f.id)}')`}">
      <div class="drive-file-icon">${icon}</div>
      <div class="drive-file-name" title="${esc(f.name)}">${esc(f.name)}</div>
      <div class="drive-file-meta">${size}${modified?' · '+modified:''}</div>
      <div class="drive-file-actions" onclick="event.stopPropagation()">
        ${!isFolder?`<button class="card-action-btn open-btn" onclick="window.open('${esc(f.webViewLink||'')}','_blank')" style="flex:1">Open ↗</button>`:''}
        <button class="card-action-btn" onclick="saveDriveFileAsLink('${f.id}','${esc(f.name)}','${esc(f.mimeType)}','${esc(f.webViewLink||'')}')" style="flex:1">+ Save</button>
        <button class="card-action-btn del-btn" onclick="deleteDriveFile('${f.id}','${esc(f.name)}')" style="flex:1">🗑</button>
      </div>
    </div>`;
  }).join('');
}

function updateBreadcrumb(folderId,folderName){
  const bc=document.getElementById('drive-breadcrumb');
  if(folderId==='root'){bc.innerHTML='<span class="crumb active">My Drive</span>';return;}
  bc.innerHTML=`<span class="crumb" onclick="loadDriveFiles('root')">My Drive</span><span class="crumb-sep">›</span><span class="crumb active">${esc(folderName)}</span>`;
}

async function deleteDriveFile(fileId,fileName){
  if(!confirm(`Delete "${fileName}" from Google Drive? This cannot be undone.`))return;
  const token=localStorage.getItem('nx_gdrive_token');if(!token)return;
  try{
    const res=await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`,{method:'DELETE',headers:{Authorization:`Bearer ${token}`}});
    if(res.status===204){toast(`"${fileName}" deleted from Drive`,'success');refreshDrive();}
    else{toast('Could not delete file','error');}
  }catch{toast('Error deleting file','error');}
}

function saveDriveFileAsLink(fileId,name,mimeType,webViewLink){
  if(!webViewLink){toast('No link available for this file','error');return;}
  const type=getDriveFileType(mimeType);
  const icons={folder:'📁',doc:'📄',sheet:'📊',slide:'📑',image:'🖼',pdf:'📕',other:'📎'};
  STATE.cloudFiles.unshift({id:uid(),service:'gdrive',url:webViewLink,name,type,desc:'',icon:icons[type]||'📎',createdAt:Date.now()});
  ls_save(KEYS.cloud,STATE.cloudFiles);renderCloud();
  toast(`"${name}" saved to links ✓`,'success');
}

function refreshDrive(){
  const bc=document.getElementById('drive-breadcrumb');
  const activeCrumb=bc.querySelector('.crumb.active');
  const text=activeCrumb?activeCrumb.textContent:'My Drive';
  // re-use current folder if not root
  loadDriveFiles(text==='My Drive'?'root':'root',text);
}

function getDriveIcon(mimeType){
  if(mimeType==='application/vnd.google-apps.folder')return'📁';
  if(mimeType.includes('document'))return'📄';
  if(mimeType.includes('spreadsheet'))return'📊';
  if(mimeType.includes('presentation'))return'📑';
  if(mimeType.includes('pdf'))return'📕';
  if(mimeType.includes('image'))return'🖼';
  if(mimeType.includes('video'))return'🎬';
  if(mimeType.includes('audio'))return'🎵';
  if(mimeType.includes('zip')||mimeType.includes('compressed'))return'🗜';
  return'📎';
}

function getDriveFileType(mimeType){
  if(mimeType.includes('folder'))return'folder';
  if(mimeType.includes('document'))return'doc';
  if(mimeType.includes('spreadsheet'))return'sheet';
  if(mimeType.includes('presentation'))return'slide';
  if(mimeType.includes('pdf'))return'pdf';
  if(mimeType.includes('image'))return'image';
  return'other';
}

function formatBytes(b){
  if(b<1024)return b+'B';
  if(b<1048576)return(b/1024).toFixed(1)+'KB';
  return(b/1048576).toFixed(1)+'MB';
}

async function uploadFileToDrive(file){
  const token=localStorage.getItem('nx_gdrive_token');if(!token){toast('Connect Google Drive first','error');return;}
  const meta=JSON.stringify({name:file.name});
  const form=new FormData();
  form.append('metadata',new Blob([meta],{type:'application/json'}));
  form.append('file',file);
  toast(`Uploading "${file.name}"…`,'info');
  try{
    const res=await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',{
      method:'POST',headers:{Authorization:`Bearer ${token}`},body:form
    });
    if(res.ok){toast(`"${file.name}" uploaded ✓`,'success');refreshDrive();}
    else{toast('Upload failed','error');}
  }catch{toast('Upload error','error');}
}

// ── TODOS ──────────────────────────────────────────
function setupTodoTabs(){
  document.querySelectorAll('#panel-todos .bm-tab').forEach(tab=>{
    tab.addEventListener('click',()=>{
      document.querySelectorAll('#panel-todos .bm-tab').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('#panel-todos .bm-tab-content').forEach(c=>c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('bm-tab-'+tab.dataset.tab).classList.add('active');
    });
  });
}

function openAddTodoListModal(){
  STATE.editIds.todoList=null;
  document.getElementById('todo-list-modal-title').textContent='New List';
  document.getElementById('todo-list-name').value='';
  document.getElementById('todo-list-icon').value='';
  setPickerColor('todo-list-color-picker',GROUP_COLORS[0]);
  openModal('todo-list-modal');
  setTimeout(()=>document.getElementById('todo-list-name').focus(),100);
}

function saveTodoList(){
  const name=document.getElementById('todo-list-name').value.trim();
  const icon=document.getElementById('todo-list-icon').value.trim()||'📋';
  const color=getPickerColor('todo-list-color-picker');
  if(!name){toast('List name required','error');return;}
  const list={id:uid(),name,icon,color,createdAt:Date.now()};
  STATE.todoLists.push(list);
  ls_save(KEYS.todoLists,STATE.todoLists);
  renderTodoLists();
  openTodoList(list.id);
  closeModal('todo-list-modal');
  toast('List created ✓','success');
}

function deleteTodoList(id){
  if(!confirm('Delete this list and all its items?'))return;
  STATE.todoLists=STATE.todoLists.filter(l=>l.id!==id);
  STATE.todoItems=STATE.todoItems.filter(i=>i.listId!==id);
  ls_save(KEYS.todoLists,STATE.todoLists);ls_save(KEYS.todoItems,STATE.todoItems);
  if(STATE.activeTodoList===id){
    STATE.activeTodoList=null;
    document.getElementById('todo-list-editor').innerHTML='<div class="note-editor-placeholder"><span>← Select or create a list</span></div>';
  }
  renderTodoLists();updateStats();toast('List deleted','info');
}

function renderTodoLists(){
  const sidebar=document.getElementById('todo-lists-sidebar');
  const empty=document.getElementById('todos-empty');
  if(STATE.todoLists.length===0){
    sidebar.innerHTML='';empty.style.display='none';
    document.getElementById('todo-list-editor').innerHTML='<div class="note-editor-placeholder"><span>← Select or create a list</span></div>';
    return;
  }
  empty.style.display='none';
  sidebar.innerHTML=STATE.todoLists.map(l=>{
    const count=STATE.todoItems.filter(i=>i.listId===l.id).length;
    const done=STATE.todoItems.filter(i=>i.listId===l.id&&i.done).length;
    return `<div class="todo-list-item${l.id===STATE.activeTodoList?' active':''}" onclick="openTodoList('${l.id}')">
      <span class="todo-list-icon" style="color:${l.color||'var(--accent)'}">${l.icon||'📋'}</span>
      <div class="todo-list-meta">
        <div class="todo-list-name">${esc(l.name)}</div>
        <div class="todo-list-count">${done}/${count} done</div>
      </div>
      <button class="card-action-btn del-btn" onclick="event.stopPropagation();deleteTodoList('${l.id}')" style="opacity:0.5;padding:3px 7px">✕</button>
    </div>`;
  }).join('');
}

function openTodoList(id){
  const list=STATE.todoLists.find(l=>l.id===id);if(!list)return;
  STATE.activeTodoList=id;
  document.querySelectorAll('.todo-list-item').forEach(el=>el.classList.remove('active'));
  const item=document.querySelector(`.todo-list-item[onclick*="${id}"]`);if(item)item.classList.add('active');
  renderTodoEditor(id);
}

function renderTodoEditor(listId){
  const list=STATE.todoLists.find(l=>l.id===listId);if(!list)return;
  const items=STATE.todoItems.filter(i=>i.listId===listId);
  const editor=document.getElementById('todo-list-editor');
  editor.innerHTML=`
    <div class="todo-editor-header">
      <span style="font-size:22px;color:${list.color||'var(--accent)'}">${list.icon||'📋'}</span>
      <div class="todo-editor-title">${esc(list.name)}</div>
    </div>
    <div class="todo-add-row">
      <input type="text" class="todo-add-input" id="todo-new-item" placeholder="Add a task… (Enter to save)"/>
      <button class="btn-primary" onclick="addTodoItem('${listId}')">Add</button>
    </div>
    <div class="todo-items" id="todo-items-${listId}">
      ${renderTodoItems(items)}
    </div>`;
  const inp=document.getElementById('todo-new-item');
  if(inp)inp.addEventListener('keydown',e=>{if(e.key==='Enter')addTodoItem(listId);});
}

function renderTodoItems(items){
  if(items.length===0)return`<div style="color:var(--text3);font-size:13px;padding:16px 0;text-align:center">No tasks yet. Add one above!</div>`;
  const pending=items.filter(i=>!i.done);
  const done=items.filter(i=>i.done);
  const renderItem=i=>`<div class="todo-item">
    <div class="todo-checkbox${i.done?' checked':''}" onclick="toggleTodoItem('${i.id}')">${i.done?'✓':''}</div>
    <span class="todo-text${i.done?' done':''}">${esc(i.text)}</span>
    <button class="todo-item-del" onclick="deleteTodoItem('${i.id}')">✕</button>
  </div>`;
  return pending.map(renderItem).join('')+
    (done.length?`<div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:10px 0 4px">Completed</div>`+done.map(renderItem).join(''):'');
}

function addTodoItem(listId){
  const inp=document.getElementById('todo-new-item');if(!inp)return;
  const text=inp.value.trim();if(!text)return;
  const item={id:uid(),listId,text,done:false,createdAt:Date.now()};
  STATE.todoItems.push(item);
  ls_save(KEYS.todoItems,STATE.todoItems);
  inp.value='';renderTodoEditor(listId);renderTodoLists();updateStats();
}

function toggleTodoItem(id){
  const i=STATE.todoItems.findIndex(t=>t.id===id);
  if(i>=0){STATE.todoItems[i].done=!STATE.todoItems[i].done;ls_save(KEYS.todoItems,STATE.todoItems);}
  if(STATE.activeTodoList)renderTodoEditor(STATE.activeTodoList);
  renderTodoLists();updateStats();
}

function deleteTodoItem(id){
  STATE.todoItems=STATE.todoItems.filter(t=>t.id!==id);
  ls_save(KEYS.todoItems,STATE.todoItems);
  if(STATE.activeTodoList)renderTodoEditor(STATE.activeTodoList);
  renderTodoLists();updateStats();
}

// ── TODO TEMPLATES ────────────────────────────────
function openTemplateModal(){
  const templates=[
    {name:'Daily Routine',icon:'🌅',color:'#38bdf8',desc:'Morning & evening habits',items:['Wake up at 6am','Exercise 30 min','Read for 20 min','Plan the day','Review journal','10 min meditation']},
    {name:'Weekly Goals',icon:'🎯',color:'#7c6af7',desc:'Weekly focus areas',items:['Review last week','Set 3 main goals','Schedule workouts','Clear inbox','Call a friend','Learn something new']},
    {name:'Work Tasks',icon:'💼',color:'#2ec49e',desc:'Standard work checklist',items:['Check emails','Stand-up meeting','Deep work block','Review PRs / docs','Update task board','End-of-day wrap-up']},
    {name:'Shopping List',icon:'🛒',color:'#f0b429',desc:'Grocery & essentials',items:['Vegetables','Fruits','Dairy','Bread','Snacks','Household items']},
    {name:'Reading List',icon:'📚',color:'#f06292',desc:'Books to read',items:['Find next book','Order / download','Set reading goal','Make highlights','Write summary','Share recommendation']},
    {name:'Fitness Tracker',icon:'💪',color:'#ff7043',desc:'Weekly workout plan',items:['Monday – Chest & Triceps','Tuesday – Back & Biceps','Wednesday – Legs','Thursday – Shoulders','Friday – Cardio','Weekend – Rest or walk']},
  ];
  document.getElementById('template-grid').innerHTML=templates.map((t,i)=>`
    <div class="template-card" onclick="applyTemplate(${i})">
      <div class="template-icon">${t.icon}</div>
      <div class="template-name">${t.name}</div>
      <div class="template-desc">${t.desc}</div>
    </div>`).join('');
  window._tplData=templates;
  openModal('todo-template-modal');
}

function applyTemplate(idx){
  const t=window._tplData[idx];
  const list={id:uid(),name:t.name,icon:t.icon,color:t.color,createdAt:Date.now()};
  STATE.todoLists.push(list);
  const items=t.items.map(text=>({id:uid(),listId:list.id,text,done:false,createdAt:Date.now()}));
  STATE.todoItems=STATE.todoItems.concat(items);
  ls_save(KEYS.todoLists,STATE.todoLists);ls_save(KEYS.todoItems,STATE.todoItems);
  renderTodoLists();openTodoList(list.id);updateStats();
  closeModal('todo-template-modal');
  toast(`"${t.name}" template applied ✓`,'success');
  // Switch to todos panel
  document.querySelector('.bm-tab[data-tab="todo-lists"]').click();
}

// ── HABITS ────────────────────────────────────────
function openAddHabitModal(){
  STATE.editIds.habit=null;
  document.getElementById('habit-modal-title').textContent='New Habit';
  ['habit-name','habit-icon'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('habit-freq').value='daily';
  setPickerColor('habit-color-picker',GROUP_COLORS[0]);
  openModal('habit-modal');
  setTimeout(()=>document.getElementById('habit-name').focus(),100);
}

function saveHabit(){
  const name=document.getElementById('habit-name').value.trim();
  const icon=document.getElementById('habit-icon').value.trim()||'🔥';
  const freq=document.getElementById('habit-freq').value;
  const color=getPickerColor('habit-color-picker');
  if(!name){toast('Habit name required','error');return;}
  STATE.habits.push({id:uid(),name,icon,freq,color,completions:{},createdAt:Date.now()});
  ls_save(KEYS.habits,STATE.habits);renderHabits();closeModal('habit-modal');toast('Habit added ✓','success');
}

function deleteHabit(id){
  if(!confirm('Delete this habit?'))return;
  STATE.habits=STATE.habits.filter(h=>h.id!==id);
  ls_save(KEYS.habits,STATE.habits);renderHabits();toast('Habit deleted','info');
}

function toggleHabitDay(habitId,dateStr){
  const h=STATE.habits.find(h=>h.id===habitId);if(!h)return;
  if(!h.completions)h.completions={};
  h.completions[dateStr]=!h.completions[dateStr];
  ls_save(KEYS.habits,STATE.habits);renderHabits();
}

function renderHabits(){
  const grid=document.getElementById('habits-grid'),empty=document.getElementById('habits-empty');
  if(STATE.habits.length===0){grid.innerHTML='';grid.style.display='none';empty.style.display='flex';return;}
  grid.style.display='grid';empty.style.display='none';
  const today=new Date();
  grid.innerHTML=STATE.habits.map(h=>{
    // Build last 7 days
    const days=[];
    for(let i=6;i>=0;i--){
      const d=new Date(today);d.setDate(d.getDate()-i);
      const str=d.toISOString().slice(0,10);
      const label=['S','M','T','W','T','F','S'][d.getDay()];
      const isDone=!!(h.completions&&h.completions[str]);
      const isToday=i===0;
      days.push({str,label,isDone,isToday});
    }
    // Streak
    let streak=0;
    for(let i=0;i<365;i++){
      const d=new Date(today);d.setDate(d.getDate()-i);
      const str=d.toISOString().slice(0,10);
      if(h.completions&&h.completions[str])streak++;else break;
    }
    return `<div class="habit-card">
      <div class="habit-card-header">
        <div class="habit-icon-badge" style="background:${h.color||'var(--accent)'}22;color:${h.color||'var(--accent)'}">${h.icon||'🔥'}</div>
        <div class="habit-info">
          <div class="habit-name">${esc(h.name)}</div>
          <div class="habit-freq">${h.freq}</div>
        </div>
        <div class="habit-streak" style="color:${h.color||'var(--accent)'}">🔥${streak}</div>
      </div>
      <div class="habit-week">
        ${days.map(d=>`<div class="habit-day${d.isDone?' done':''}${d.isToday?' today':''}" style="--hcolor:${h.color||'var(--accent)'}" onclick="toggleHabitDay('${h.id}','${d.str}')" title="${d.str}">${d.label}</div>`).join('')}
      </div>
      <div class="habit-actions">
        <button class="card-action-btn del-btn" onclick="deleteHabit('${h.id}')">Delete</button>
      </div>
    </div>`;
  }).join('');
}

// ── GOALS ─────────────────────────────────────────
function openAddGoalModal(){
  STATE.editIds.goal=null;
  document.getElementById('goal-modal-title').textContent='New Goal';
  ['goal-name','goal-target','goal-unit','goal-deadline'].forEach(id=>document.getElementById(id).value='');
  setPickerColor('goal-color-picker',GROUP_COLORS[2]);
  openModal('goal-modal');
  setTimeout(()=>document.getElementById('goal-name').focus(),100);
}

function saveGoal(){
  const name=document.getElementById('goal-name').value.trim();
  const target=parseFloat(document.getElementById('goal-target').value)||100;
  const unit=document.getElementById('goal-unit').value.trim()||'units';
  const deadline=document.getElementById('goal-deadline').value;
  const color=getPickerColor('goal-color-picker');
  if(!name){toast('Goal name required','error');return;}
  STATE.goals.push({id:uid(),name,target,unit,deadline,color,current:0,createdAt:Date.now()});
  ls_save(KEYS.goals,STATE.goals);renderGoals();closeModal('goal-modal');toast('Goal set ✓','success');
}

function updateGoalProgress(id){
  const inp=document.getElementById(`goal-inp-${id}`);if(!inp)return;
  const val=parseFloat(inp.value);if(isNaN(val))return;
  const i=STATE.goals.findIndex(g=>g.id===id);
  if(i>=0){STATE.goals[i].current=Math.min(STATE.goals[i].target,Math.max(0,val));ls_save(KEYS.goals,STATE.goals);renderGoals();toast('Progress updated ✓','success');}
}

function deleteGoal(id){
  if(!confirm('Delete this goal?'))return;
  STATE.goals=STATE.goals.filter(g=>g.id!==id);
  ls_save(KEYS.goals,STATE.goals);renderGoals();toast('Goal deleted','info');
}

function renderGoals(){
  const grid=document.getElementById('goals-grid'),empty=document.getElementById('goals-empty');
  if(STATE.goals.length===0){grid.innerHTML='';grid.style.display='none';empty.style.display='flex';return;}
  grid.style.display='grid';empty.style.display='none';
  grid.innerHTML=STATE.goals.map(g=>{
    const pct=Math.round((g.current/g.target)*100);
    const daysLeft=g.deadline?Math.ceil((new Date(g.deadline)-new Date())/(1000*60*60*24)):null;
    return `<div class="goal-card">
      <div class="goal-card-header">
        <span class="goal-icon">🎯</span>
        <div><div class="goal-name">${esc(g.name)}</div>
          <div class="goal-deadline">${g.deadline?`${daysLeft>0?daysLeft+' days left':'Deadline passed'} · ${g.deadline}`:''}</div>
        </div>
      </div>
      <div class="goal-progress-bar"><div class="goal-progress-fill" style="width:${pct}%;background:${g.color||'var(--accent)'}"></div></div>
      <div class="goal-progress-label"><span>${g.current} ${g.unit}</span><span>${pct}% · ${g.target} ${g.unit}</span></div>
      <div class="goal-update-row">
        <input type="number" class="goal-update-input" id="goal-inp-${g.id}" placeholder="Update progress" value="${g.current}"/>
        <button class="btn-primary btn-sm" onclick="updateGoalProgress('${g.id}')">Update</button>
      </div>
      <div class="goal-actions"><button class="card-action-btn del-btn" onclick="deleteGoal('${g.id}')">Delete</button></div>
    </div>`;
  }).join('');
}

// ── BOOKS ──────────────────────────────────────────
function openAddBookModal(){
  STATE.editIds.book=null;
  document.getElementById('book-modal-title').textContent='Add Book';
  ['book-title','book-author','book-pages','book-current','book-cover','book-notes','book-tags'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('book-status').value='toread';
  openModal('book-modal');
  setTimeout(()=>document.getElementById('book-title').focus(),100);
}

function openEditBookModal(id){
  const b=STATE.books.find(b=>b.id===id);if(!b)return;
  STATE.editIds.book=id;
  document.getElementById('book-modal-title').textContent='Edit Book';
  document.getElementById('book-title').value=b.title;
  document.getElementById('book-author').value=b.author||'';
  document.getElementById('book-pages').value=b.pages||'';
  document.getElementById('book-current').value=b.current||0;
  document.getElementById('book-cover').value=b.cover||'';
  document.getElementById('book-notes').value=b.notes||'';
  document.getElementById('book-tags').value=(b.tags||[]).join(', ');
  document.getElementById('book-status').value=b.status||'toread';
  openModal('book-modal');
}

function saveBook(){
  const title=document.getElementById('book-title').value.trim();
  if(!title){toast('Title is required','error');return;}
  const b={
    title,
    author:document.getElementById('book-author').value.trim(),
    pages:parseInt(document.getElementById('book-pages').value)||0,
    current:parseInt(document.getElementById('book-current').value)||0,
    cover:document.getElementById('book-cover').value.trim(),
    notes:document.getElementById('book-notes').value.trim(),
    tags:document.getElementById('book-tags').value.split(',').map(t=>t.trim()).filter(Boolean),
    status:document.getElementById('book-status').value,
  };
  if(STATE.editIds.book){
    const i=STATE.books.findIndex(x=>x.id===STATE.editIds.book);
    if(i>=0)STATE.books[i]={...STATE.books[i],...b,updatedAt:Date.now()};
    toast('Book updated ✓','success');
  }else{
    STATE.books.unshift({id:uid(),...b,createdAt:Date.now()});
    toast('Book added ✓','success');
  }
  ls_save(KEYS.books,STATE.books);renderBooks();closeModal('book-modal');
}

function updateBookPage(id){
  const inp=document.getElementById(`bp-${id}`);if(!inp)return;
  const val=parseInt(inp.value);if(isNaN(val))return;
  const i=STATE.books.findIndex(b=>b.id===id);
  if(i>=0){
    STATE.books[i].current=Math.max(0,Math.min(STATE.books[i].pages||9999,val));
    if(STATE.books[i].current>=STATE.books[i].pages&&STATE.books[i].pages>0)STATE.books[i].status='done';
    else if(STATE.books[i].current>0)STATE.books[i].status='reading';
    ls_save(KEYS.books,STATE.books);renderBooks();toast('Progress saved ✓','success');
  }
}

function deleteBook(id){
  if(!confirm('Delete this book?'))return;
  STATE.books=STATE.books.filter(b=>b.id!==id);
  ls_save(KEYS.books,STATE.books);renderBooks();toast('Deleted','info');
}

function renderBooks(){
  const grid=document.getElementById('books-grid'),empty=document.getElementById('books-empty');
  const q=document.getElementById('books-search').value.toLowerCase();
  const f=document.getElementById('books-filter').value;
  let books=STATE.books;
  if(q)books=books.filter(b=>b.title.toLowerCase().includes(q)||(b.author||'').toLowerCase().includes(q)||(b.tags||[]).some(t=>t.toLowerCase().includes(q)));
  if(f!=='all')books=books.filter(b=>b.status===f);
  if(books.length===0){grid.innerHTML='';grid.style.display='none';empty.style.display='flex';return;}
  grid.style.display='grid';empty.style.display='none';
  const statusLabels={reading:'📖 Reading',toread:'📌 To Read',done:'✅ Finished',paused:'⏸ Paused'};
  const statusClass={reading:'book-status-reading',toread:'book-status-toread',done:'book-status-done',paused:'book-status-paused'};
  grid.innerHTML=books.map(b=>{
    const pct=b.pages>0?Math.round((b.current/b.pages)*100):0;
    return `<div class="book-card">
      ${b.cover?`<img class="book-cover" src="${esc(b.cover)}" alt="${esc(b.title)}" onerror="this.style.display='none';this.nextSibling.style.display='flex'"/><div class="book-cover-placeholder" style="display:none">📖</div>`
        :`<div class="book-cover-placeholder">📖</div>`}
      <div class="book-info">
        <div class="book-title">${esc(b.title)}</div>
        ${b.author?`<div class="book-author">${esc(b.author)}</div>`:''}
        <span class="book-status-badge ${statusClass[b.status]||''}">${statusLabels[b.status]||b.status}</span>
        ${b.pages>0?`<div class="book-progress-bar"><div class="book-progress-fill" style="width:${pct}%"></div></div>
        <div class="book-progress-label">${b.current} / ${b.pages} pages · ${pct}%</div>`:''}
        ${b.pages>0?`<div class="goal-update-row" style="margin-top:4px">
          <input type="number" class="goal-update-input" id="bp-${b.id}" value="${b.current}" min="0" max="${b.pages}" placeholder="Current page"/>
          <button class="btn-primary btn-sm" onclick="updateBookPage('${b.id}')">Save</button>
        </div>`:''}
      </div>
      <div class="book-card-actions">
        <button class="card-action-btn" onclick="openEditBookModal('${b.id}')">Edit</button>
        <button class="card-action-btn del-btn" onclick="deleteBook('${b.id}')">Delete</button>
      </div>
    </div>`;
  }).join('');
}

// ── WHITEBOARD ────────────────────────────────────
let WB={canvas:null,ctx:null,drawing:false,tool:'pen',color:'#7c6af7',size:4,history:[],snapshot:null,sessionId:null};

function initWhiteboardLazy(){}

function initWhiteboard(){
  if(WB.canvas)return; // already init
  const canvas=document.getElementById('wb-canvas');
  if(!canvas)return;
  WB.canvas=canvas;
  WB.ctx=canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize',resizeCanvas);

  // Tool buttons
  document.querySelectorAll('.wb-tool').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.wb-tool').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      WB.tool=btn.dataset.tool;
      canvas.style.cursor=WB.tool==='eraser'?'cell':'crosshair';
    });
  });

  document.getElementById('wb-color').addEventListener('input',e=>WB.color=e.target.value);
  document.getElementById('wb-size').addEventListener('change',e=>WB.size=parseInt(e.target.value));

  // Mouse events
  canvas.addEventListener('mousedown',wbStart);
  canvas.addEventListener('mousemove',wbMove);
  canvas.addEventListener('mouseup',wbEnd);
  canvas.addEventListener('mouseleave',wbEnd);

  // Touch events
  canvas.addEventListener('touchstart',e=>{e.preventDefault();wbStart(e.touches[0]);},{passive:false});
  canvas.addEventListener('touchmove',e=>{e.preventDefault();wbMove(e.touches[0]);},{passive:false});
  canvas.addEventListener('touchend',e=>{e.preventDefault();wbEnd();},{passive:false});

  // Load session or start fresh
  newWbSession(false);
}

function resizeCanvas(){
  if(!WB.canvas)return;
  const container=WB.canvas.parentElement;
  const img=WB.ctx.getImageData(0,0,WB.canvas.width,WB.canvas.height);
  WB.canvas.width=container.clientWidth;
  WB.canvas.height=container.clientHeight;
  // Restore content
  WB.ctx.putImageData(img,0,0);
  WB.ctx.lineCap='round';
  WB.ctx.lineJoin='round';
}

function getCanvasPos(e){
  const r=WB.canvas.getBoundingClientRect();
  return{x:(e.clientX||e.pageX)-r.left,y:(e.clientY||e.pageY)-r.top};
}

function wbStart(e){
  WB.drawing=true;
  const{x,y}=getCanvasPos(e);
  WB.startX=x;WB.startY=y;
  WB.snapshot=WB.ctx.getImageData(0,0,WB.canvas.width,WB.canvas.height);
  if(WB.tool==='pen'||WB.tool==='highlighter'||WB.tool==='eraser'){
    WB.ctx.beginPath();WB.ctx.moveTo(x,y);
  }
}

function wbMove(e){
  if(!WB.drawing)return;
  const{x,y}=getCanvasPos(e);
  const ctx=WB.ctx;
  ctx.lineWidth=WB.size;
  ctx.lineCap='round';ctx.lineJoin='round';
  if(WB.tool==='eraser'){
    ctx.globalCompositeOperation='destination-out';
    ctx.strokeStyle='rgba(0,0,0,1)';
    ctx.lineWidth=WB.size*3;
    ctx.lineTo(x,y);ctx.stroke();
  }else if(WB.tool==='pen'){
    ctx.globalCompositeOperation='source-over';
    ctx.strokeStyle=WB.color;
    ctx.globalAlpha=1;
    ctx.lineTo(x,y);ctx.stroke();
  }else if(WB.tool==='highlighter'){
    ctx.globalCompositeOperation='source-over';
    ctx.strokeStyle=WB.color;
    ctx.globalAlpha=0.35;
    ctx.lineWidth=WB.size*4;
    ctx.lineTo(x,y);ctx.stroke();
  }else{
    // Shape tools: restore snapshot then draw shape
    ctx.putImageData(WB.snapshot,0,0);
    ctx.globalCompositeOperation='source-over';
    ctx.globalAlpha=1;
    ctx.strokeStyle=WB.color;
    ctx.lineWidth=WB.size;
    ctx.beginPath();
    if(WB.tool==='line'){ctx.moveTo(WB.startX,WB.startY);ctx.lineTo(x,y);ctx.stroke();}
    else if(WB.tool==='rect'){ctx.strokeRect(WB.startX,WB.startY,x-WB.startX,y-WB.startY);}
    else if(WB.tool==='circle'){
      const rx=(x-WB.startX)/2,ry=(y-WB.startY)/2;
      ctx.ellipse(WB.startX+rx,WB.startY+ry,Math.abs(rx),Math.abs(ry),0,0,2*Math.PI);
      ctx.stroke();
    }
  }
}

function wbEnd(){
  if(!WB.drawing)return;
  WB.drawing=false;
  WB.ctx.globalAlpha=1;
  WB.ctx.globalCompositeOperation='source-over';
  WB.history.push(WB.ctx.getImageData(0,0,WB.canvas.width,WB.canvas.height));
  if(WB.history.length>40)WB.history.shift();
}

function undoCanvas(){
  if(!WB.canvas||WB.history.length===0)return;
  WB.history.pop();
  if(WB.history.length>0)WB.ctx.putImageData(WB.history[WB.history.length-1],0,0);
  else WB.ctx.clearRect(0,0,WB.canvas.width,WB.canvas.height);
}

function clearCanvas(){
  if(!WB.canvas||!confirm('Clear the canvas?'))return;
  WB.ctx.clearRect(0,0,WB.canvas.width,WB.canvas.height);
  WB.history=[];
}

function saveWbSession(){
  if(!WB.canvas)return;
  const dataUrl=WB.canvas.toDataURL('image/png');
  const name=document.getElementById('wb-session-name').textContent;
  if(WB.sessionId){
    const i=STATE.wbSessions.findIndex(s=>s.id===WB.sessionId);
    if(i>=0){STATE.wbSessions[i].data=dataUrl;STATE.wbSessions[i].updatedAt=Date.now();}
  }else{
    WB.sessionId=uid();
    STATE.wbSessions.push({id:WB.sessionId,name,data:dataUrl,createdAt:Date.now(),updatedAt:Date.now()});
  }
  ls_save(KEYS.wbSessions,STATE.wbSessions);
  toast('Session saved ✓','success');
}

function newWbSession(clear=true){
  if(clear&&WB.canvas)WB.ctx.clearRect(0,0,WB.canvas.width,WB.canvas.height);
  WB.sessionId=null;WB.history=[];
  const name='Session '+new Date().toLocaleDateString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  document.getElementById('wb-session-name').textContent=name;
  closeModal('wb-sessions-modal');
}

function openWbSessions(){
  const list=document.getElementById('wb-sessions-list');
  if(STATE.wbSessions.length===0){list.innerHTML='<p style="color:var(--text3);text-align:center;padding:20px">No saved sessions yet.</p>';openModal('wb-sessions-modal');return;}
  list.innerHTML=STATE.wbSessions.slice().reverse().map(s=>`
    <div class="wb-session-item">
      <div>
        <div class="wb-session-name">${esc(s.name)}</div>
        <div class="wb-session-date">${fmtDate(s.updatedAt)}</div>
      </div>
      <button class="btn-outline btn-sm" onclick="loadWbSession('${s.id}')">Load</button>
      <button class="card-action-btn del-btn btn-sm" onclick="deleteWbSession('${s.id}')">Delete</button>
    </div>`).join('');
  openModal('wb-sessions-modal');
}

function loadWbSession(id){
  const s=STATE.wbSessions.find(s=>s.id===id);if(!s)return;
  if(!WB.canvas)initWhiteboard();
  WB.ctx.clearRect(0,0,WB.canvas.width,WB.canvas.height);
  const img=new Image();
  img.onload=()=>{WB.ctx.drawImage(img,0,0);WB.history=[WB.ctx.getImageData(0,0,WB.canvas.width,WB.canvas.height)];};
  img.src=s.data;
  WB.sessionId=id;
  document.getElementById('wb-session-name').textContent=s.name;
  closeModal('wb-sessions-modal');
  toast(`Loaded "${s.name}"`,'info');
}

function deleteWbSession(id){
  if(!confirm('Delete this session?'))return;
  STATE.wbSessions=STATE.wbSessions.filter(s=>s.id!==id);
  ls_save(KEYS.wbSessions,STATE.wbSessions);
  if(WB.sessionId===id)WB.sessionId=null;
  openWbSessions();toast('Session deleted','info');
}

function exportCanvas(){
  if(!WB.canvas)return;
  const a=document.createElement('a');
  a.download=`nexmark-whiteboard-${Date.now()}.png`;
  a.href=WB.canvas.toDataURL('image/png');
  a.click();
}

// ── SETTINGS / PREFS ─────────────────────────────
function applyPrefs(prefs){
  setTheme(prefs.theme||'dark',false);
  setAccent(prefs.accent||'purple',false);
}

function setTheme(theme,persist=true){
  document.documentElement.dataset.theme=theme;
  document.getElementById('theme-dark').classList.toggle('active',theme==='dark');
  document.getElementById('theme-light').classList.toggle('active',theme==='light');
  if(persist){const p=ls_obj(KEYS.prefs,{});p.theme=theme;ls_save(KEYS.prefs,p);}
}

function setAccent(accent,persist=true){
  document.documentElement.dataset.accent=accent==='purple'?'':accent;
  document.querySelectorAll('.swatch').forEach(s=>s.classList.toggle('active',s.dataset.accent===accent));
  if(persist){const p=ls_obj(KEYS.prefs,{});p.accent=accent;ls_save(KEYS.prefs,p);}
}

function setupColorSwatches(){
  const prefs=ls_obj(KEYS.prefs,{accent:'purple'});
  const accents=[
    {name:'purple',color:'#7c6af7'},{name:'emerald',color:'#2ec49e'},
    {name:'rose',color:'#f06292'},{name:'amber',color:'#f0b429'},{name:'sky',color:'#38bdf8'},
  ];
  document.getElementById('accent-swatches').innerHTML=accents.map(a=>`
    <div class="swatch${a.name===(prefs.accent||'purple')?' active':''}" style="background:${a.color}" data-accent="${a.name}" title="${a.name}" onclick="setAccent('${a.name}')"></div>`).join('');
}

// ── COLOR PICKERS ─────────────────────────────────
function setupColorPickers(){
  setupColorSwatches();
  ['group-color-picker','import-group-color-picker','todo-list-color-picker','habit-color-picker','goal-color-picker'].forEach(id=>{
    const el=document.getElementById(id);if(!el)return;
    el.innerHTML=GROUP_COLORS.map(c=>`<div class="gcolor-swatch" data-color="${c}" style="background:${c}" data-picker="${id}" onclick="selectSwatch(this,'${id}')"></div>`).join('');
    setPickerColor(id,GROUP_COLORS[0],false);
  });
}

function selectSwatch(el,pickerId){
  const picker=document.getElementById(pickerId);if(!picker)return;
  picker.querySelectorAll('.gcolor-swatch').forEach(s=>s.classList.remove('active'));
  el.classList.add('active');
  picker.dataset.selected=el.dataset.color;
}

function setPickerColor(pickerId,color,trigger=true){
  const picker=document.getElementById(pickerId);if(!picker)return;
  picker.querySelectorAll('.gcolor-swatch').forEach(s=>s.classList.toggle('active',s.dataset.color===color));
  picker.dataset.selected=color;
}

function getPickerColor(pickerId){
  const picker=document.getElementById(pickerId);
  return picker?picker.dataset.selected||GROUP_COLORS[0]:GROUP_COLORS[0];
}

// ── EXPORT / IMPORT ──────────────────────────────
function exportData(){
  const data={version:3,exported:new Date().toISOString(),bookmarks:STATE.bookmarks,notes:STATE.notes,cloudFiles:STATE.cloudFiles,groups:STATE.groups,todoLists:STATE.todoLists,todoItems:STATE.todoItems,habits:STATE.habits,goals:STATE.goals,books:STATE.books};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=`nexmark-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();
  URL.revokeObjectURL(url);toast('Export downloaded ✓','success');
}

function importData(event){
  const file=event.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const d=JSON.parse(e.target.result);
      if(d.bookmarks){STATE.bookmarks=d.bookmarks;ls_save(KEYS.bm,STATE.bookmarks);}
      if(d.notes){STATE.notes=d.notes;ls_save(KEYS.notes,STATE.notes);}
      if(d.cloudFiles){STATE.cloudFiles=d.cloudFiles;ls_save(KEYS.cloud,STATE.cloudFiles);}
      if(d.groups){STATE.groups=d.groups;ls_save(KEYS.groups,STATE.groups);}
      if(d.todoLists){STATE.todoLists=d.todoLists;ls_save(KEYS.todoLists,STATE.todoLists);}
      if(d.todoItems){STATE.todoItems=d.todoItems;ls_save(KEYS.todoItems,STATE.todoItems);}
      if(d.habits){STATE.habits=d.habits;ls_save(KEYS.habits,STATE.habits);}
      if(d.goals){STATE.goals=d.goals;ls_save(KEYS.goals,STATE.goals);}
      if(d.books){STATE.books=d.books;ls_save(KEYS.books,STATE.books);}
      renderBookmarks();renderGroups();renderTagsView();renderNotesList();renderCloud();
      renderTodoLists();renderHabits();renderGoals();renderBooks();updateStats();
      toast('Import successful ✓','success');
    }catch{toast('Invalid backup file','error');}
  };
  reader.readAsText(file);event.target.value='';
}

function clearAllData(){
  if(!confirm('Permanently delete ALL data?'))return;
  if(!confirm('Last chance — this cannot be undone.'))return;
  Object.values(KEYS).forEach(k=>localStorage.removeItem(k));
  ['bookmarks','notes','cloudFiles','groups','todoLists','todoItems','habits','goals','books','wbSessions'].forEach(k=>STATE[k]=[]);
  STATE.activeNote=null;STATE.activeTodoList=null;
  renderBookmarks();renderGroups();renderTagsView();renderNotesList();renderCloud();
  renderTodoLists();renderHabits();renderGoals();renderBooks();updateStats();
  document.getElementById('note-editor').innerHTML='<div class="note-editor-placeholder"><span>← Select or create a note</span></div>';
  document.getElementById('todo-list-editor').innerHTML='<div class="note-editor-placeholder"><span>← Select or create a list</span></div>';
  toast('All data cleared','info');
}

// ── COMING SOON ───────────────────────────────────
function showComingSoon(feature){
  document.getElementById('coming-soon-title').textContent=feature+' — Coming Soon';
  document.getElementById('coming-soon-desc').textContent=`${feature} is on the roadmap and will be available in a future release. Stay tuned!`;
  openModal('coming-soon-modal');
}

// ── UTILS ─────────────────────────────────────────
function openModal(id){document.getElementById(id).classList.add('open');}
function closeModal(id){document.getElementById(id).classList.remove('open');}
function esc(s=''){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function fmtDate(ts){if(!ts)return'';const d=new Date(ts),now=new Date(),diff=now-d;if(diff<60000)return'just now';if(diff<3600000)return`${Math.floor(diff/60000)}m ago`;if(diff<86400000)return`${Math.floor(diff/3600000)}h ago`;return d.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});}
function debounce(fn,d){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),d);};}
let _toastT;
function toast(msg,type='info'){const t=document.getElementById('toast');t.textContent=msg;t.className=`toast ${type} show`;clearTimeout(_toastT);_toastT=setTimeout(()=>t.classList.remove('show'),2800);}
function updateStats(){
  document.getElementById('stat-bm').textContent=STATE.bookmarks.length;
  document.getElementById('stat-notes').textContent=STATE.notes.length;
  const pendingTodos=STATE.todoItems.filter(i=>!i.done).length;
  document.getElementById('stat-todos').textContent=pendingTodos;
}

// ── BOOT ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded',init);
