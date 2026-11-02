/* Dobby Play 首頁：分頁探索列表。社群作品資料來自 library/index.json。 */

const TYPES = {
  game: { label: 'Play', title: '發現遊戲', sub: '所有人上傳的遊戲，點卡片就能玩。' },
  animation: { label: '動畫', title: '發現動畫', sub: '所有人上傳的動畫。' },
  background: { label: '遠景', title: '發現遠景', sub: '所有人上傳的遠景背景。' },
  character: { label: '角色', title: '發現角色', sub: '所有人上傳的角色。' },
  board: { label: '畫板', title: '發現畫板', sub: '所有人上傳的畫板。' },
};

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

  grid.innerHTML = '';

  const remote = community
    .filter((it) => it.type === currentType && !it.hidden)
    .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

  remote.forEach((it) => grid.appendChild(card(it)));
  emptyState.hidden = remote.length > 0;
}

function card(item) {
  const el = document.createElement('article');
  el.className = 'card';
  const metaText = item.rating ? '👍 ' + item.rating + '% 評分' : (item.meta || '');
  el.innerHTML = `
    <div class="thumb"><img loading="lazy" alt=""></div>
    <div class="card-body">
      <h3 class="card-title"></h3>
      <p class="card-creator"></p>
      <p class="card-meta"><span class="meta-text"></span></p>
    </div>`;
  el.querySelector('img').src = item.thumb || item.file || '';
  el.querySelector('.card-title').textContent = item.title || '未命名';
  el.querySelector('.card-creator').textContent = '創作者：' + (item.creator || '不詳');
  el.querySelector('.meta-text').textContent = metaText;
  if (!metaText) el.querySelector('.card-meta').hidden = true;

  el.addEventListener('click', () => onCardClick(item));
  return el;
}

function onCardClick(item) {
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
