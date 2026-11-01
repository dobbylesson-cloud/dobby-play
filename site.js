/* Dobby Play 首頁：分頁探索列表＋13×13 像素編輯器。
   社群作品資料來自 library/index.json；本機作品存在 localStorage。 */

const COLORS = ['#F33D4B', '#4C9ADC', '#16BF26', '#F8DA02', '#F67927', '#DB22AD', '#6F4DA9', '#F2F2F2'];

const TYPES = {
  game: { label: '遊戲', title: '發現遊戲', sub: '所有人上傳的遊戲，點卡片就能玩。' },
  animation: { label: '動畫', title: '發現動畫', sub: '所有人上傳的動畫，也可以按「製作動畫」自己畫。' },
  background: { label: '遠景', title: '發現遠景', sub: '所有人上傳的遠景背景，也可以按「製作遠景」自己畫。' },
  character: { label: '角色', title: '發現角色', sub: '所有人上傳的角色，也可以按「製作角色」自己畫。' },
  board: { label: '畫板', title: '發現畫板', sub: '所有人上傳的畫板，也可以按「製作畫板」自己畫。' },
};

const LOCAL_KEY = 'dobby_site_local_items';
const CREATOR_KEY = 'dobby_site_creator';

let currentType = 'game';
let community = [];
let localItems = loadLocal();

let editorType = 'animation';
let pixels = new Array(169).fill(null);
let activeColor = 0;
let tool = 'brush';
let drawing = false;

const $ = (id) => document.getElementById(id);
const grid = $('grid');
const emptyState = $('emptyState');

init();

function init() {
  const creator = localStorage.getItem(CREATOR_KEY) || '';
  $('creatorChip').textContent = '創作者：' + (creator || '不詳');

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

  fetchLibrary().finally(() => render());
  bindEditor();
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

function loadLocal() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

function saveLocal() {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(localItems));
}

function render() {
  const meta = TYPES[currentType];
  $('sectionTitle').textContent = meta.title;
  $('sectionSub').textContent = meta.sub;

  grid.innerHTML = '';
  grid.appendChild(makeCard());

  const locals = localItems.filter((it) => it.type === currentType);
  const remote = community
    .filter((it) => it.type === currentType && !it.hidden)
    .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

  locals.forEach((it) => grid.appendChild(card(it, true)));
  remote.forEach((it) => grid.appendChild(card(it, false)));

  emptyState.hidden = locals.length + remote.length > 0;
}

function makeCard() {
  const el = document.createElement('div');
  el.className = 'make-card';
  el.innerHTML = '<div class="make-plus">＋</div><span></span>';
  const label = el.querySelector('span');
  if (currentType === 'game') {
    label.textContent = '在 App 內製作遊戲';
    el.addEventListener('click', () => toast('請在 App 內製作遊戲，長按遊戲圖示即可分享上傳。'));
  } else {
    label.textContent = '製作' + TYPES[currentType].label;
    el.addEventListener('click', () => openEditor(currentType));
  }
  return el;
}

function card(item, isLocal) {
  const el = document.createElement('article');
  el.className = 'card' + (isLocal ? ' is-local' : '');
  const metaText = item.rating ? '👍 ' + item.rating + '% 評分' : (item.meta || '本機草稿');
  el.innerHTML = `
    <div class="thumb"><img loading="lazy" alt=""></div>
    <div class="card-body">
      <h3 class="card-title"></h3>
      <p class="card-creator"></p>
      <p class="card-meta"><span class="meta-text"></span>${isLocal ? '<span class="badge">本機</span>' : ''}</p>
    </div>`;
  el.querySelector('img').src = item.thumb || item.file || '';
  el.querySelector('.card-title').textContent = item.title || '未命名';
  el.querySelector('.card-creator').textContent = '創作者：' + (item.creator || '不詳');
  el.querySelector('.meta-text').textContent = metaText;

  el.addEventListener('click', () => onCardClick(item, isLocal));
  return el;
}

function onCardClick(item, isLocal) {
  if (currentType !== 'game') {
    toast(isLocal ? '本機作品：可在 App 內開啟使用。' : '這是其他人的作品，可在 App 內使用。');
    return;
  }
  if (isLocal || !item.file) {
    toast('本機草稿沒有遊戲資料，請在 App 內開啟。');
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

/* --- 編輯器 --- */

function bindEditor() {
  const canvas = $('pixelCanvas');

  canvas.addEventListener('pointerdown', (e) => {
    drawing = true;
    canvas.setPointerCapture(e.pointerId);
    paintAt(e);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (drawing) paintAt(e);
  });
  canvas.addEventListener('pointerup', () => { drawing = false; });
  canvas.addEventListener('pointercancel', () => { drawing = false; });

  $('editorCancel').addEventListener('click', closeEditor);
  $('editorSave').addEventListener('click', saveItem);
  $('toolBrush').addEventListener('click', () => setTool('brush'));
  $('toolEraser').addEventListener('click', () => setTool('eraser'));
  $('toolClear').addEventListener('click', () => {
    pixels = new Array(169).fill(null);
    drawCanvas();
  });

  buildPalette();
}

function buildPalette() {
  const box = $('palette');
  box.innerHTML = '';
  COLORS.forEach((hex, i) => {
    const sw = document.createElement('button');
    sw.className = 'swatch' + (i === activeColor ? ' is-active' : '');
    sw.style.background = hex;
    sw.title = hex;
    sw.addEventListener('click', () => {
      activeColor = i;
      setTool('brush');
      buildPalette();
    });
    box.appendChild(sw);
  });
}

function setTool(name) {
  tool = name;
  $('toolBrush').classList.toggle('is-active', name === 'brush');
  $('toolEraser').classList.toggle('is-active', name === 'eraser');
}

function openEditor(type) {
  editorType = type;
  pixels = new Array(169).fill(null);
  $('editorTitle').textContent = '製作' + TYPES[type].label;
  $('itemTitle').value = '';
  $('itemCreator').value = localStorage.getItem(CREATOR_KEY) || '';
  $('editorMask').hidden = false;
  setTool('brush');
  buildPalette();
  drawCanvas();
  setTimeout(() => $('itemTitle').focus(), 50);
}

function closeEditor() {
  $('editorMask').hidden = true;
}

function paintAt(e) {
  const canvas = $('pixelCanvas');
  const rect = canvas.getBoundingClientRect();
  const cell = rect.width / 13;
  const x = Math.floor((e.clientX - rect.left) / cell);
  const y = Math.floor((e.clientY - rect.top) / cell);
  if (x < 0 || x > 12 || y < 0 || y > 12) return;
  const idx = y * 13 + x;
  const value = tool === 'eraser' ? null : COLORS[activeColor];
  if (pixels[idx] === value) return;
  pixels[idx] = value;
  drawCanvas();
}

function drawCanvas() {
  const canvas = $('pixelCanvas');
  const ctx = canvas.getContext('2d');
  const size = canvas.width / 13;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < 13; y++) {
    for (let x = 0; x < 13; x++) {
      const v = pixels[y * 13 + x];
      if (v) {
        ctx.fillStyle = v;
        ctx.fillRect(x * size, y * size, size, size);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.10)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x * size + 0.5, y * size + 0.5, size - 1, size - 1);
    }
  }
}

function saveItem() {
  const title = $('itemTitle').value.trim();
  if (!title) {
    toast('請先輸入作品名稱');
    $('itemTitle').focus();
    return;
  }
  const creator = $('itemCreator').value.trim() || '不詳';
  localStorage.setItem(CREATOR_KEY, creator);
  $('creatorChip').textContent = '創作者：' + creator;

  const thumb = renderThumbDataUrl();
  localItems.unshift({
    id: 'local_' + Date.now(),
    type: editorType,
    title,
    creator,
    created_at: Date.now(),
    thumb,
    meta: '本機草稿',
    rating: null,
  });
  saveLocal();
  closeEditor();
  render();
  toast('已存到本機列表');
}

function renderThumbDataUrl() {
  const small = document.createElement('canvas');
  small.width = 13;
  small.height = 13;
  const ctx = small.getContext('2d');
  for (let i = 0; i < 169; i++) {
    const v = pixels[i];
    if (!v) continue;
    ctx.fillStyle = v;
    ctx.fillRect(i % 13, Math.floor(i / 13), 1, 1);
  }
  return small.toDataURL('image/png');
}

let toastTimer = null;
function toast(text) {
  const el = $('toast');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
}
