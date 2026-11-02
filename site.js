/* Dobby Play 首頁：分頁探索列表。社群作品資料來自 library/index.json。 */

const TYPES = {
  game: { label: 'Play', title: '發現遊戲', sub: '所有人上傳的遊戲，點卡片就能玩。' },
  rooms: { label: '遊戲', title: '遊戲素材', sub: '下載房間與貼圖素材；管理員可在上方直接上傳。' },
  animation: { label: '動畫', title: '發現動畫', sub: '所有人上傳的動畫。' },
  background: { label: '遠景', title: '發現遠景', sub: '所有人上傳的遠景背景。' },
  character: { label: '角色', title: '發現角色', sub: '所有人上傳的角色。' },
  board: { label: '畫板', title: '發現畫板', sub: '所有人上傳的畫板。' },
};

const ROOMS_TYPES = ['room', 'texture', 'board'];
const GH_OWNER = 'dobbylesson-cloud';
const GH_REPO = 'dobby-play';
const GH_BRANCH = 'main';
const ADMIN_LOGIN = 'dobbylesson-cloud';

let currentType = 'game';
let community = [];

const $ = (id) => document.getElementById(id);
const grid = $('grid');
const emptyState = $('emptyState');

init();

function init() {
  // 舊版本的本機草稿已不再使用，清掉避免舊作品繼續顯示。
  try { localStorage.removeItem('dobby_site_local_items'); } catch (_) { /* ignore */ }

  try {
    if (localStorage.getItem('dobby_admin_token')) $('adminLink').hidden = false;
  } catch (_) { /* ignore */ }

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      currentType = tab.dataset.type;
      render();
    });
  });

  $('upToken').value = localStorage.getItem('dobby_admin_token') || '';
  $('upBtn').addEventListener('click', uploadAsset);

  fetchLibrary().finally(() => render());
}

async function fetchLibrary() {
  try {
    const res = await fetch('library/index.json?v=' + Date.now());
    if (!res.ok) return;
    const data = await res.json();
    community = Array.isArray(data.items) ? data.items : [];
  } catch (err) {
    console.warn('library/index.json 讀取失敗', err);
  }
}

function render() {
  const meta = TYPES[currentType];
  $('sectionTitle').textContent = meta.title;
  $('sectionSub').textContent = meta.sub;
  $('uploader').hidden = currentType !== 'rooms';

  grid.innerHTML = '';

  const remote = community
    .filter((it) => {
      if (it.hidden) return false;
      if (currentType === 'rooms') return ROOMS_TYPES.includes(it.type);
      return it.type === currentType;
    })
    .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

  remote.forEach((it) => grid.appendChild(card(it)));
  emptyState.hidden = remote.length > 0;
}

function card(item) {
  const el = document.createElement('article');
  el.className = 'card';
  const typeText = item.type === 'room' ? '房間' : (item.type === 'texture' ? '貼圖' : '');
  const metaText = item.rating ? '👍 ' + item.rating + '% 評分' : (item.meta || '');
  const showType = currentType === 'rooms' && typeText;
  const metaFull = item.rating ? metaText : [typeText, metaText].filter(Boolean).join('・');
  el.innerHTML = `
    <div class="thumb"><img loading="lazy" alt=""></div>
    <div class="card-body">
      <h3 class="card-title"></h3>
      <p class="card-creator"></p>
      <p class="card-meta"><span class="meta-text"></span>${showType ? '<span class="badge"></span>' : ''}</p>
    </div>`;
  el.querySelector('img').src = item.thumb || item.file || '';
  el.querySelector('.card-title').textContent = item.title || '未命名';
  el.querySelector('.card-creator').textContent = '創作者：' + (item.creator || '不詳');
  el.querySelector('.meta-text').textContent = metaFull;
  if (!metaFull) el.querySelector('.card-meta').hidden = true;
  if (showType) el.querySelector('.badge').textContent = typeText;

  el.addEventListener('click', () => onCardClick(item));
  return el;
}

function downloadFile(url, name) {
  const a = document.createElement('a');
  a.href = url;
  a.download = name || '';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function onCardClick(item) {
  if (currentType === 'rooms') {
    if (!item.file) {
      toast('這個素材沒有檔案。');
      return;
    }
    downloadFile(item.file, (item.title || '素材') + (item.file.endsWith('.png') ? '.png' : ''));
    return;
  }
  if (currentType !== 'game') {
    toast('這是其他人的作品，可在 App 內使用。');
    return;
  }
  if (!item.file) {
    toast('這個作品沒有遊戲資料。');
    return;
  }
  toast('載入遊戲中…');
  fetch(item.file)
    .then((res) => {
      if (!res.ok) throw new Error('讀取遊戲資料失敗');
      return res.text();
    })
    .then((payload) => {
      const p = payload.trim();
      if (!p) throw new Error('遊戲資料是空的');
      location.href = 'play.html#g=' + p;
    })
    .catch((err) => toast(err.message));
}

let toastTimer = null;
function toast(text) {
  const el = $('toast');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
}

/* --- 遊戲素材上傳（管理員 GitHub token） --- */

function setUploadMsg(text) {
  $('upMsg').textContent = text || '';
}

function ghHeaders(token) {
  return {
    Authorization: 'Bearer ' + token,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(new Error('讀取檔案失敗'));
    reader.readAsDataURL(file);
  });
}

function b64ToText(b64) {
  const bin = atob((b64 || '').replace(/\s/g, ''));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}

function textToB64(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin);
}

async function putContent(token, path, contentB64, message) {
  const headers = ghHeaders(token);
  let sha = '';
  const headRes = await fetch('https://api.github.com/repos/' + GH_OWNER + '/' + GH_REPO + '/contents/' + path, { headers });
  if (headRes.ok) {
    const head = await headRes.json();
    sha = head.sha || '';
  }
  const body = { message, content: contentB64, branch: GH_BRANCH };
  if (sha) body.sha = sha;
  const res = await fetch('https://api.github.com/repos/' + GH_OWNER + '/' + GH_REPO + '/contents/' + path, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error('上傳檔案失敗（HTTP ' + res.status + '）' + (detail ? '：' + detail.slice(0, 60) : ''));
  }
}

async function prependIndex(token, entry) {
  const path = 'library/index.json';
  const headers = ghHeaders(token);
  let items = [];
  let sha = '';
  const res = await fetch('https://api.github.com/repos/' + GH_OWNER + '/' + GH_REPO + '/contents/' + path, { headers });
  if (res.ok) {
    const data = await res.json();
    sha = data.sha || '';
    try {
      const doc = JSON.parse(b64ToText(data.content));
      if (Array.isArray(doc.items)) items = doc.items;
    } catch (_) { /* ignore */ }
  }
  items.unshift(entry);
  const body = { message: 'upload ' + entry.title, content: textToB64(JSON.stringify({ items, version: 1 }, null, 2)), branch: GH_BRANCH };
  if (sha) body.sha = sha;
  const putRes = await fetch('https://api.github.com/repos/' + GH_OWNER + '/' + GH_REPO + '/contents/' + path, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!putRes.ok) {
    const detail = await putRes.text();
    throw new Error('更新列表失敗（HTTP ' + putRes.status + '）' + (detail ? '：' + detail.slice(0, 60) : ''));
  }
}

function slugify(text) {
  return (text || 'asset').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 16) || 'asset';
}

async function uploadAsset() {
  const token = $('upToken').value.trim();
  const file = $('upFile').files[0];
  const title = $('upTitle').value.trim();
  const creator = $('upCreator').value.trim() || '不詳';
  const type = $('upType').value;
  if (!token) { setUploadMsg('請先貼上管理員 GitHub token'); return; }
  if (!file) { setUploadMsg('請選擇要上傳的 PNG 檔案'); return; }
  if (!file.type.includes('png') && !file.name.toLowerCase().endsWith('.png')) {
    setUploadMsg('目前只支援 PNG 檔案');
    return;
  }
  if (!title) { setUploadMsg('請填寫素材名稱'); return; }

  $('upBtn').disabled = true;
  try {
    setUploadMsg('驗證 token…');
    const meRes = await fetch('https://api.github.com/user', { headers: ghHeaders(token) });
    if (!meRes.ok) throw new Error('token 無效或已過期');
    const me = await meRes.json();
    if (me.login !== ADMIN_LOGIN) throw new Error('只有管理員帳號可以上傳');

    const b64 = await fileToBase64(file);
    if (!b64) throw new Error('讀取檔案失敗');
    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const id = type + '_' + slugify(title) + '_' + Date.now();
    const path = (type === 'room' ? 'library/rooms/' : 'library/art/') + id + '.' + ext;

    setUploadMsg('上傳檔案…');
    await putContent(token, path, b64, 'upload ' + title);
    setUploadMsg('更新素材列表…');
    await prependIndex(token, {
      created_at: Math.floor(Date.now() / 1000),
      creator,
      file: path,
      id,
      meta: type === 'room' ? '房間' : '貼圖',
      thumb: path,
      title,
      type,
    });
    try { localStorage.setItem('dobby_admin_token', token); } catch (_) { /* ignore */ }
    setUploadMsg('已上傳：' + title);
    toast('上傳完成');
    await fetchLibrary();
    render();
  } catch (err) {
    setUploadMsg(err.message || '上傳失敗');
  } finally {
    $('upBtn').disabled = false;
  }
}
