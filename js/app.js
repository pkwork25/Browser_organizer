/* =============================================
   NEXMARK — App Logic v2
   + Bookmark Groups (create, colour, assign, view)
   ============================================= */

const STATE = {
  bookmarks: [], notes: [], cloudFiles: [], groups: [],
  activeNote: null, noteAutoSaveTimer: null,
  editingBookmarkId: null, editingGroupId: null,
  activeBmTab: 'all', expandedGroups: new Set(),
};

const KEYS = { bm:'nx_bookmarks', notes:'nx_notes', cloud:'nx_cloud', prefs:'nx_prefs', groups:'nx_groups' };

function load(key)            { try { return JSON.parse(localStorage.getItem(key))||[]; } catch { return []; } }
function loadObj(key, def={}) { try { return JSON.parse(localStorage.getItem(key))||def; } catch { return def; } }
function save(key,val)        { try { localStorage.setItem(key,JSON.stringify(val)); } catch { showToast('Storage full!','error'); } }
function uid()                { return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }

function init() {
  STATE.bookmarks  = load(KEYS.bm);
  STATE.notes      = load(KEYS.notes);
  STATE.cloudFiles = load(KEYS.cloud);
  STATE.groups     = load(KEYS.groups);
  const prefs = loadObj(KEYS.prefs,{theme:'dark',accent:'purple'});
  applyPrefs(prefs);
  setupNav(); setupBmTabs();
  renderBookmarks(); renderNotesList(); renderCloud();
  setupColorSwatches(); setupGroupColorPicker(); updateStats();
  document.querySelectorAll('.modal-overlay').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('open');}));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.modal-overlay.open').forEach(m=>m.classList.remove('open'));});
  document.getElementById('bm-search').addEventListener('input',debounce(()=>{ STATE.activeBmTab==='all'?renderBookmarks():renderGroups(); },200));
  document.getElementById('bm-filter').addEventListener('change',renderBookmarks);
  document.getElementById('notes-search').addEventListener('input',debounce(renderNotesList,200));
  document.getElementById('btn-add-bm').addEventListener('click',openAddBookmarkModal);
  document.getElementById('btn-add-note').addEventListener('click',createNote);
  document.getElementById('btn-add-cloud').addEventListener('click',()=>openModal('cloud-modal'));
  document.getElementById('btn-add-group').addEventListener('click',openAddGroupModal);
}

function setupBmTabs() {
  document.querySelectorAll('.bm-tab').forEach(tab=>{
    tab.addEventListener('click',()=>{
      STATE.activeBmTab=tab.dataset.tab;
      document.querySelectorAll('.bm-tab').forEach(t=>t.classList.remove('active'));
      document.querySelectorAll('.bm-tab-content').forEach(c=>c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('bm-tab-'+STATE.activeBmTab).classList.add('active');
      document.getElementById('bm-tab-actions-groups').style.display=STATE.activeBmTab==='groups'?'flex':'none';
      STATE.activeBmTab==='groups'?renderGroups():renderBookmarks();
    });
  });
}

function setupNav() {
  document.querySelectorAll('.nav-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const panel=btn.dataset.panel;
      document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('panel-'+panel).classList.add('active');
    });
  });
}

// ── Bookmarks ──
function openAddBookmarkModal() {
  STATE.editingBookmarkId=null;
  document.getElementById('bm-modal-title').textContent='Add Bookmark';
  ['bm-url','bm-title','bm-desc','bm-tags','bm-favicon'].forEach(id=>document.getElementById(id).value='');
  populateGroupSelect();
  openModal('bm-modal');
  setTimeout(()=>document.getElementById('bm-url').focus(),100);
}

function openEditBookmarkModal(id) {
  const bm=STATE.bookmarks.find(b=>b.id===id); if(!bm)return;
  STATE.editingBookmarkId=id;
  document.getElementById('bm-modal-title').textContent='Edit Bookmark';
  document.getElementById('bm-url').value=bm.url;
  document.getElementById('bm-title').value=bm.title;
  document.getElementById('bm-desc').value=bm.desc;
  document.getElementById('bm-tags').value=bm.tags.join(', ');
  document.getElementById('bm-favicon').value=bm.favicon||'';
  populateGroupSelect(bm.groupId||'');
  openModal('bm-modal');
}

function populateGroupSelect(selected='') {
  document.getElementById('bm-group').innerHTML=
    '<option value="">— No Group —</option>'+
    STATE.groups.map(g=>`<option value="${g.id}"${g.id===selected?' selected':''}>${escHtml(g.icon||'📁')} ${escHtml(g.name)}</option>`).join('');
}

function saveBookmark() {
  const url=document.getElementById('bm-url').value.trim();
  const title=document.getElementById('bm-title').value.trim();
  const desc=document.getElementById('bm-desc').value.trim();
  const tags=document.getElementById('bm-tags').value.split(',').map(t=>t.trim()).filter(Boolean);
  const favicon=document.getElementById('bm-favicon').value.trim();
  const groupId=document.getElementById('bm-group').value;
  if(!url){showToast('URL is required','error');return;}
  let parsedUrl; try{parsedUrl=new URL(url);}catch{showToast('Enter a valid URL','error');return;}
  const autoFavicon=favicon||`https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=64`;
  const autoTitle=title||parsedUrl.hostname.replace('www.','');
  if(STATE.editingBookmarkId){
    const idx=STATE.bookmarks.findIndex(b=>b.id===STATE.editingBookmarkId);
    if(idx>=0)STATE.bookmarks[idx]={...STATE.bookmarks[idx],url,title:autoTitle,desc,tags,favicon:autoFavicon,groupId,updatedAt:Date.now()};
    showToast('Bookmark updated ✓','success');
  } else {
    STATE.bookmarks.unshift({id:uid(),url,title:autoTitle,desc,tags,favicon:autoFavicon,groupId,createdAt:Date.now()});
    showToast('Bookmark saved ✓','success');
  }
  save(KEYS.bm,STATE.bookmarks); updateTagFilter(); renderBookmarks();
  if(STATE.activeBmTab==='groups')renderGroups();
  updateStats(); closeModal('bm-modal');
}

function deleteBookmark(id) {
  if(!confirm('Delete this bookmark?'))return;
  STATE.bookmarks=STATE.bookmarks.filter(b=>b.id!==id);
  save(KEYS.bm,STATE.bookmarks); updateTagFilter(); renderBookmarks();
  if(STATE.activeBmTab==='groups')renderGroups();
  updateStats(); showToast('Deleted','info');
}

function renderBookmarks() {
  if(STATE.activeBmTab!=='all')return;
  const query=document.getElementById('bm-search').value.toLowerCase();
  const filter=document.getElementById('bm-filter').value;
  const grid=document.getElementById('bm-grid'); const empty=document.getElementById('bm-empty');
  let bms=STATE.bookmarks;
  if(query)bms=bms.filter(b=>b.title.toLowerCase().includes(query)||b.url.toLowerCase().includes(query)||b.desc.toLowerCase().includes(query)||b.tags.some(t=>t.toLowerCase().includes(query)));
  if(filter!=='all')bms=bms.filter(b=>b.tags.includes(filter));
  if(bms.length===0){grid.innerHTML='';grid.style.display='none';empty.style.display='flex';return;}
  grid.style.display='grid'; empty.style.display='none';
  grid.innerHTML=bms.map(bm=>bookmarkCardHTML(bm,true)).join('');
  updateTagFilter();
}

function bookmarkCardHTML(bm,showGroupBadge=false){
  const domain=(()=>{try{return new URL(bm.url).hostname.replace('www.','');}catch{return bm.url;}})();
  const initial=(bm.title||domain).charAt(0).toUpperCase();
  const tags=bm.tags.slice(0,3).map(t=>`<span class="tag-pill" onclick="filterByTag('${escHtml(t)}')">#${escHtml(t)}</span>`).join('');
  const group=bm.groupId?STATE.groups.find(g=>g.id===bm.groupId):null;
  return `<div class="bm-card" id="bmc-${bm.id}">
    <div class="bm-card-header">
      <img class="bm-favicon" src="${escHtml(bm.favicon)}" alt="" onerror="this.style.display='none';this.nextSibling.style.display='flex'" loading="lazy" />
      <div class="bm-favicon-fallback" style="display:none">${initial}</div>
      <span class="bm-title" title="${escHtml(bm.title)}">${escHtml(bm.title)}</span>
      ${showGroupBadge&&group?`<span class="bm-group-badge" style="--gbg:${group.color||'var(--accent)'}20;--gcol:${group.color||'var(--accent)'}">${escHtml(group.icon||'📁')}</span>`:''}
    </div>
    ${bm.desc?`<p class="bm-desc">${escHtml(bm.desc)}</p>`:''}
    <div class="bm-url">${escHtml(domain)}</div>
    ${tags?`<div class="bm-tags">${tags}</div>`:''}
    <div class="bm-card-actions">
      <button class="card-action-btn open-btn" onclick="window.open('${escHtml(bm.url)}','_blank')">Open ↗</button>
      <button class="card-action-btn" onclick="openEditBookmarkModal('${bm.id}')">Edit</button>
      <button class="card-action-btn del-btn" onclick="deleteBookmark('${bm.id}')">Delete</button>
    </div>
  </div>`;
}

function updateTagFilter() {
  const sel=document.getElementById('bm-filter'); const current=sel.value;
  const allTags=[...new Set(STATE.bookmarks.flatMap(b=>b.tags))].sort();
  sel.innerHTML='<option value="all">All Tags</option>'+allTags.map(t=>`<option value="${escHtml(t)}"${t===current?' selected':''}>#${escHtml(t)}</option>`).join('');
}

function filterByTag(tag) {
  document.getElementById('bm-filter').value=tag;
  if(STATE.activeBmTab!=='all')document.querySelector('.bm-tab[data-tab="all"]').click();
  renderBookmarks();
}

// ── Groups ──
const GROUP_COLORS=['#7c6af7','#2ec49e','#f06292','#f0b429','#38bdf8','#ff7043','#ab47bc','#26a69a'];

function setupGroupColorPicker() {
  const c=document.getElementById('group-color-picker');
  c.innerHTML=GROUP_COLORS.map(col=>`<div class="gcolor-swatch" data-color="${col}" style="background:${col}" onclick="selectGroupColor('${col}')"></div>`).join('');
  selectGroupColor(GROUP_COLORS[0],false);
}

function selectGroupColor(color,persist=true) {
  document.querySelectorAll('.gcolor-swatch').forEach(s=>s.classList.toggle('active',s.dataset.color===color));
  if(persist)document.getElementById('group-color-picker').dataset.selected=color;
  else document.getElementById('group-color-picker').dataset.selected=color;
}

function getSelectedGroupColor() {
  return document.getElementById('group-color-picker').dataset.selected||GROUP_COLORS[0];
}

function openAddGroupModal() {
  STATE.editingGroupId=null;
  document.getElementById('group-modal-title').textContent='New Group';
  ['group-name','group-icon','group-desc'].forEach(id=>document.getElementById(id).value='');
  selectGroupColor(GROUP_COLORS[0]);
  openModal('group-modal');
  setTimeout(()=>document.getElementById('group-name').focus(),100);
}

function openEditGroupModal(id) {
  const g=STATE.groups.find(g=>g.id===id); if(!g)return;
  STATE.editingGroupId=id;
  document.getElementById('group-modal-title').textContent='Edit Group';
  document.getElementById('group-name').value=g.name;
  document.getElementById('group-icon').value=g.icon||'';
  document.getElementById('group-desc').value=g.desc||'';
  selectGroupColor(g.color||GROUP_COLORS[0]);
  openModal('group-modal');
}

function saveGroup() {
  const name=document.getElementById('group-name').value.trim();
  const icon=document.getElementById('group-icon').value.trim()||'📁';
  const desc=document.getElementById('group-desc').value.trim();
  const color=getSelectedGroupColor();
  if(!name){showToast('Group name required','error');return;}
  if(STATE.editingGroupId){
    const idx=STATE.groups.findIndex(g=>g.id===STATE.editingGroupId);
    if(idx>=0)STATE.groups[idx]={...STATE.groups[idx],name,icon,desc,color,updatedAt:Date.now()};
    showToast('Group updated ✓','success');
  } else {
    STATE.groups.push({id:uid(),name,icon,desc,color,createdAt:Date.now()});
    showToast('Group created ✓','success');
  }
  save(KEYS.groups,STATE.groups); renderGroups(); closeModal('group-modal');
}

function deleteGroup(id) {
  if(!confirm("Delete this group? Bookmarks inside won't be deleted, just ungrouped."))return;
  STATE.groups=STATE.groups.filter(g=>g.id!==id);
  STATE.bookmarks=STATE.bookmarks.map(b=>b.groupId===id?{...b,groupId:''}:b);
  save(KEYS.groups,STATE.groups); save(KEYS.bm,STATE.bookmarks);
  renderGroups(); showToast('Group deleted','info');
}

function toggleGroupExpand(id) {
  STATE.expandedGroups.has(id)?STATE.expandedGroups.delete(id):STATE.expandedGroups.add(id);
  renderGroups();
}

function renderGroups() {
  const container=document.getElementById('groups-container');
  const empty=document.getElementById('groups-empty');
  if(STATE.groups.length===0){container.innerHTML='';container.style.display='none';empty.style.display='flex';return;}
  container.style.display='flex'; empty.style.display='none';
  const query=document.getElementById('bm-search').value.toLowerCase();
  container.innerHTML=STATE.groups.map(g=>{
    let members=STATE.bookmarks.filter(b=>b.groupId===g.id);
    if(query)members=members.filter(b=>b.title.toLowerCase().includes(query)||b.url.toLowerCase().includes(query));
    const isOpen=STATE.expandedGroups.has(g.id);
    const count=STATE.bookmarks.filter(b=>b.groupId===g.id).length;
    return `<div class="group-card" id="gc-${g.id}">
      <div class="group-card-header" onclick="toggleGroupExpand('${g.id}')" style="--gcolor:${g.color||'var(--accent)'}">
        <div class="group-header-left">
          <span class="group-chevron${isOpen?' open':''}">›</span>
          <span class="group-icon-badge" style="background:${g.color||'var(--accent)'}22;color:${g.color||'var(--accent)'}">${escHtml(g.icon||'📁')}</span>
          <div>
            <div class="group-name">${escHtml(g.name)}</div>
            ${g.desc?`<div class="group-desc-small">${escHtml(g.desc)}</div>`:''}
          </div>
        </div>
        <div class="group-header-right" onclick="event.stopPropagation()">
          <span class="group-count" style="background:${g.color||'var(--accent)'}22;color:${g.color||'var(--accent)'}">${count}</span>
          <button class="card-action-btn" onclick="openEditGroupModal('${g.id}')">Edit</button>
          <button class="card-action-btn del-btn" onclick="deleteGroup('${g.id}')">Delete</button>
        </div>
      </div>
      ${isOpen?`<div class="group-body">
        ${members.length===0
          ?'<div class="group-empty-msg">No bookmarks in this group yet. Add bookmarks and assign them here via Edit → Group.</div>'
          :`<div class="group-bm-grid">${members.map(bm=>bookmarkCardHTML(bm,false)).join('')}</div>`}
      </div>`:''}
    </div>`;
  }).join('');
}

// ── Notes ──
function createNote() {
  const note={id:uid(),title:'Untitled Note',content:'',createdAt:Date.now(),updatedAt:Date.now()};
  STATE.notes.unshift(note); save(KEYS.notes,STATE.notes);
  renderNotesList(); openNote(note.id); updateStats();
}

function openNote(id) {
  const note=STATE.notes.find(n=>n.id===id); if(!note)return;
  STATE.activeNote=id;
  document.querySelectorAll('.note-item').forEach(el=>el.classList.remove('active'));
  const item=document.querySelector(`[data-note-id="${id}"]`); if(item)item.classList.add('active');
  document.getElementById('note-editor').innerHTML=`
    <div class="note-editor-active">
      <input class="note-title-input" id="note-title-inp" value="${escHtml(note.title)}" placeholder="Note title…" />
      <div class="note-toolbar">
        <button class="note-tool-btn" onclick="wrapText('**','**')"><b>B</b></button>
        <button class="note-tool-btn" onclick="wrapText('*','*')"><i>I</i></button>
        <button class="note-tool-btn" onclick="insertAtLine('- ')">• List</button>
        <button class="note-tool-btn" onclick="insertAtLine('> ')">❝ Quote</button>
        <button class="note-tool-btn" onclick="insertAtLine('## ')">H2</button>
        <button class="note-tool-btn" onclick="insertAtLine('[ ] ')">☐ Todo</button>
        <button class="note-tool-btn" onclick="copyNoteContent()">Copy</button>
        <button class="note-tool-btn" onclick="deleteNote('${id}')" style="margin-left:auto;color:var(--red)">Delete</button>
      </div>
      <textarea class="note-content-input" id="note-content-inp" placeholder="Start writing…">${escHtml(note.content)}</textarea>
      <div class="note-footer"><span class="note-wordcount" id="note-wc">0 words</span><span class="note-wordcount">Auto-saved</span></div>
    </div>`;
  const ti=document.getElementById('note-title-inp');
  const ci=document.getElementById('note-content-inp');
  updateWordCount(note.content);
  ti.addEventListener('input',()=>scheduleNoteSave(id,ti.value,ci.value));
  ci.addEventListener('input',()=>{updateWordCount(ci.value);scheduleNoteSave(id,ti.value,ci.value);});
  ci.addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();const s=ci.selectionStart,v=ci.value;ci.value=v.slice(0,s)+'  '+v.slice(s);ci.selectionStart=ci.selectionEnd=s+2;}});
}

function scheduleNoteSave(id,title,content) {
  clearTimeout(STATE.noteAutoSaveTimer);
  STATE.noteAutoSaveTimer=setTimeout(()=>{
    const idx=STATE.notes.findIndex(n=>n.id===id);
    if(idx>=0){STATE.notes[idx].title=title||'Untitled Note';STATE.notes[idx].content=content;STATE.notes[idx].updatedAt=Date.now();save(KEYS.notes,STATE.notes);}
    const it=document.querySelector(`[data-note-id="${id}"] .note-item-title`); if(it)it.textContent=title||'Untitled Note';
    const ip=document.querySelector(`[data-note-id="${id}"] .note-item-preview`); if(ip)ip.textContent=content.slice(0,60).replace(/\n/g,' ');
  },500);
}

function deleteNote(id) {
  if(!confirm('Delete this note?'))return;
  STATE.notes=STATE.notes.filter(n=>n.id!==id); STATE.activeNote=null;
  save(KEYS.notes,STATE.notes); renderNotesList(); updateStats();
  document.getElementById('note-editor').innerHTML='<div class="note-editor-placeholder"><span>← Select or create a note</span></div>';
  showToast('Note deleted','info');
}

function renderNotesList() {
  const list=document.getElementById('notes-list'); const empty=document.getElementById('notes-empty');
  const query=document.getElementById('notes-search').value.toLowerCase();
  let notes=STATE.notes;
  if(query)notes=notes.filter(n=>n.title.toLowerCase().includes(query)||n.content.toLowerCase().includes(query));
  if(notes.length===0){list.innerHTML='';empty.style.display='flex';return;}
  empty.style.display='none';
  list.innerHTML=notes.map(n=>`<div class="note-item${n.id===STATE.activeNote?' active':''}" data-note-id="${n.id}" onclick="openNote('${n.id}')">
    <div class="note-item-title">${escHtml(n.title)}</div>
    <div class="note-item-preview">${escHtml(n.content.slice(0,60).replace(/\n/g,' '))}</div>
    <div class="note-item-date">${formatDate(n.updatedAt)}</div>
  </div>`).join('');
}

function updateWordCount(text) {
  const wc=document.getElementById('note-wc'); if(!wc)return;
  const words=text.trim()?text.trim().split(/\s+/).length:0;
  wc.textContent=`${words} word${words!==1?'s':''}`;
}

function wrapText(b,a) {
  const ta=document.getElementById('note-content-inp'); if(!ta)return;
  const s=ta.selectionStart,e=ta.selectionEnd,sel=ta.value.slice(s,e);
  ta.value=ta.value.slice(0,s)+b+sel+a+ta.value.slice(e);
  ta.selectionStart=s+b.length; ta.selectionEnd=e+b.length;
  ta.focus(); ta.dispatchEvent(new Event('input'));
}

function insertAtLine(prefix) {
  const ta=document.getElementById('note-content-inp'); if(!ta)return;
  const s=ta.selectionStart,ls=ta.value.lastIndexOf('\n',s-1)+1;
  ta.value=ta.value.slice(0,ls)+prefix+ta.value.slice(ls);
  ta.selectionStart=ta.selectionEnd=s+prefix.length;
  ta.focus(); ta.dispatchEvent(new Event('input'));
}

function copyNoteContent() {
  const ta=document.getElementById('note-content-inp'); if(!ta)return;
  navigator.clipboard.writeText(ta.value).then(()=>showToast('Copied to clipboard','success'));
}

// ── Cloud ──
function saveCloudFile() {
  const service=document.getElementById('cloud-service').value;
  const url=document.getElementById('cloud-url').value.trim();
  const name=document.getElementById('cloud-name').value.trim();
  const type=document.getElementById('cloud-type').value;
  const desc=document.getElementById('cloud-desc').value.trim();
  if(!url){showToast('URL is required','error');return;}
  if(!name){showToast('Name is required','error');return;}
  const icons={folder:'📁',doc:'📄',sheet:'📊',slide:'📑',image:'🖼',pdf:'📕',other:'📎'};
  STATE.cloudFiles.unshift({id:uid(),service,url,name,type,desc,icon:icons[type]||'📎',createdAt:Date.now()});
  save(KEYS.cloud,STATE.cloudFiles); renderCloud(); closeModal('cloud-modal');
  showToast('Cloud file added ✓','success');
  ['cloud-url','cloud-name','cloud-desc'].forEach(id=>document.getElementById(id).value='');
}

function deleteCloudFile(id) {
  if(!confirm('Remove this cloud file link?'))return;
  STATE.cloudFiles=STATE.cloudFiles.filter(f=>f.id!==id);
  save(KEYS.cloud,STATE.cloudFiles); renderCloud(); showToast('Removed','info');
}

function renderCloud() {
  const grid=document.getElementById('cloud-grid'); const empty=document.getElementById('cloud-empty');
  if(STATE.cloudFiles.length===0){grid.innerHTML='';grid.style.display='none';empty.style.display='flex';return;}
  grid.style.display='grid'; empty.style.display='none';
  const sN={gdrive:'Google Drive',mega:'MEGA',dropbox:'Dropbox',onedrive:'OneDrive',other:'Cloud'};
  grid.innerHTML=STATE.cloudFiles.map(f=>`<div class="cloud-card">
    <div class="cloud-card-header">
      <span class="cloud-file-icon">${f.icon}</span>
      <div><div class="cloud-card-title">${escHtml(f.name)}</div><div class="cloud-card-service">${sN[f.service]||f.service}</div></div>
    </div>
    ${f.desc?`<p class="cloud-card-desc">${escHtml(f.desc)}</p>`:''}
    <div class="cloud-card-actions">
      <button class="card-action-btn open-btn" onclick="window.open('${escHtml(f.url)}','_blank')">Open ↗</button>
      <button class="card-action-btn del-btn" onclick="deleteCloudFile('${f.id}')">Remove</button>
    </div>
  </div>`).join('');
}

// ── Settings ──
function applyPrefs(prefs) { setTheme(prefs.theme||'dark',false); setAccent(prefs.accent||'purple',false); }

function setTheme(theme,persist=true) {
  document.documentElement.dataset.theme=theme;
  document.getElementById('theme-dark').classList.toggle('active',theme==='dark');
  document.getElementById('theme-light').classList.toggle('active',theme==='light');
  if(persist){const p=loadObj(KEYS.prefs,{});p.theme=theme;save(KEYS.prefs,p);}
}

function setAccent(accent,persist=true) {
  document.documentElement.dataset.accent=accent==='purple'?'':accent;
  document.querySelectorAll('.swatch').forEach(s=>s.classList.toggle('active',s.dataset.accent===accent));
  if(persist){const p=loadObj(KEYS.prefs,{});p.accent=accent;save(KEYS.prefs,p);}
}

function setupColorSwatches() {
  const prefs=loadObj(KEYS.prefs,{accent:'purple'});
  const accents=[{name:'purple',color:'#7c6af7'},{name:'emerald',color:'#2ec49e'},{name:'rose',color:'#f06292'},{name:'amber',color:'#f0b429'},{name:'sky',color:'#38bdf8'}];
  document.getElementById('accent-swatches').innerHTML=accents.map(a=>`<div class="swatch${a.name===(prefs.accent||'purple')?' active':''}" style="background:${a.color}" data-accent="${a.name}" title="${a.name}" onclick="setAccent('${a.name}')"></div>`).join('');
}

function exportData() {
  const data={version:2,exported:new Date().toISOString(),bookmarks:STATE.bookmarks,notes:STATE.notes,cloudFiles:STATE.cloudFiles,groups:STATE.groups};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a');
  a.href=url; a.download=`nexmark-backup-${new Date().toISOString().slice(0,10)}.json`; a.click();
  URL.revokeObjectURL(url); showToast('Export downloaded ✓','success');
}

function importData(event) {
  const file=event.target.files[0]; if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const data=JSON.parse(e.target.result);
      if(data.bookmarks){STATE.bookmarks=data.bookmarks;save(KEYS.bm,STATE.bookmarks);}
      if(data.notes){STATE.notes=data.notes;save(KEYS.notes,STATE.notes);}
      if(data.cloudFiles){STATE.cloudFiles=data.cloudFiles;save(KEYS.cloud,STATE.cloudFiles);}
      if(data.groups){STATE.groups=data.groups;save(KEYS.groups,STATE.groups);}
      renderBookmarks();renderNotesList();renderCloud();renderGroups();updateStats();
      showToast('Import successful ✓','success');
    }catch{showToast('Invalid backup file','error');}
  };
  reader.readAsText(file); event.target.value='';
}

function clearAllData() {
  if(!confirm('Permanently delete all data?'))return;
  if(!confirm('Last chance — delete everything?'))return;
  [KEYS.bm,KEYS.notes,KEYS.cloud,KEYS.groups].forEach(k=>localStorage.removeItem(k));
  STATE.bookmarks=[];STATE.notes=[];STATE.cloudFiles=[];STATE.groups=[];STATE.activeNote=null;
  renderBookmarks();renderNotesList();renderCloud();renderGroups();updateStats();
  document.getElementById('note-editor').innerHTML='<div class="note-editor-placeholder"><span>← Select or create a note</span></div>';
  showToast('All data cleared','info');
}

function connectGDrive() {
  const CLIENT_ID=localStorage.getItem('nx_gdrive_client_id')||'';
  if(!CLIENT_ID){const id=prompt('Enter your Google OAuth Client ID:');if(!id)return;localStorage.setItem('nx_gdrive_client_id',id.trim());}
  const scopes='https://www.googleapis.com/auth/drive.readonly';
  const redirectUri=encodeURIComponent(window.location.origin+window.location.pathname);
  const oauthUrl=`https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(localStorage.getItem('nx_gdrive_client_id'))}&redirect_uri=${redirectUri}&response_type=token&scope=${encodeURIComponent(scopes)}`;
  window.open(oauthUrl,'_blank','width=500,height=600');
  document.getElementById('gdrive-status').textContent='Popup opened — complete sign-in there';
}

window.addEventListener('load',()=>{
  const hash=window.location.hash;
  if(hash.includes('access_token')){
    const params=new URLSearchParams(hash.slice(1)); const token=params.get('access_token');
    if(token){localStorage.setItem('nx_gdrive_token',token);const s=document.getElementById('gdrive-status');if(s)s.textContent='✓ Connected to Google Drive';showToast('Google Drive connected ✓','success');history.replaceState(null,'',window.location.pathname);}
  }
  if(localStorage.getItem('nx_gdrive_token')){const s=document.getElementById('gdrive-status');if(s)s.textContent='✓ Connected';}
});

// ── Utils ──
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function escHtml(str='') { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function formatDate(ts) {
  if(!ts)return ''; const d=new Date(ts),now=new Date(),diff=now-d;
  if(diff<60000)return 'just now'; if(diff<3600000)return `${Math.floor(diff/60000)}m ago`;
  if(diff<86400000)return `${Math.floor(diff/3600000)}h ago`;
  return d.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
}
function debounce(fn,delay){let timer;return(...args)=>{clearTimeout(timer);timer=setTimeout(()=>fn(...args),delay);};}
let toastTimer;
function showToast(msg,type='info'){const t=document.getElementById('toast');t.textContent=msg;t.className=`toast ${type} show`;clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2800);}
function updateStats(){document.getElementById('stat-bm').textContent=STATE.bookmarks.length;document.getElementById('stat-notes').textContent=STATE.notes.length;}

document.addEventListener('DOMContentLoaded',init);
