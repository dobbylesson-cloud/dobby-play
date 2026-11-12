/* Pixel World 首頁：Play 與發現遊戲。社群作品資料來自 library/index.json。 */

const TYPES = {
  game: { label: 'tab.play', titleKey: 'index.game.title', subKey: 'index.game.sub' },
  rooms: { label: 'tab.game', titleKey: 'index.rooms.title', subKey: 'index.rooms.sub' },
  animation: { label: 'tab.animation', titleKey: 'index.animation.title', subKey: 'index.animation.sub' },
  background: { label: 'tab.background', titleKey: 'index.background.title', subKey: 'index.background.sub' },
  character: { label: 'tab.character', titleKey: 'index.character.title', subKey: 'index.character.sub' },
  board: { label: 'tab.board', titleKey: 'index.board.title', subKey: 'index.board.sub' },
};

const ROOMS_TYPES = ['remix'];

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

  // 語言切換時重繪標題、副標與卡片文字。
  document.addEventListener('langchange', render);

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
  $('sectionTitle').textContent = I18N.t(meta.titleKey);
  $('sectionSub').textContent = I18N.t(meta.subKey);

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

// 作品資料的 meta 是中文自由文字（例如「3 間房間」「13×13 像素」「由 App 上傳」），
// 英文模式下換成對應英文，認不得的字串原樣保留。
function localizeMeta(text) {
  if (!text) return '';
  if (I18N.getLang() !== 'en') return text;
  let m = text.match(/^(\d+)\s*間房間$/);
  if (m) return m[1] + ' rooms';
  m = text.match(/^(\d+)\s*個房間$/);
  if (m) return m[1] + ' rooms';
  m = text.match(/^(\d+)\s*[×x]\s*(\d+)\s*像素$/);
  if (m) return m[1] + '×' + m[2] + ' px';
  if (text === '由 App 上傳' || text === '由App上傳') return 'Uploaded via App';
  if (text === '由網頁上傳') return 'Uploaded via Web';
  return text;
}

function card(item) {
  const el = document.createElement('article');
  el.className = 'card';
  const metaText = item.rating
    ? '👍 ' + item.rating + I18N.t('rating.suffix')
    : localizeMeta(item.meta || '');
  el.innerHTML = `
    <div class="thumb"><img loading="lazy" alt=""></div>
    <div class="card-body">
      <h3 class="card-title"></h3>
      <p class="card-creator"></p>
      <p class="card-meta"><span class="meta-text"></span></p>
    </div>`;
  el.querySelector('img').src = item.thumb || item.file || '';
  el.querySelector('.card-title').textContent = item.title || I18N.t('untitled');
  el.querySelector('.card-creator').textContent = I18N.t('creator.prefix') + (item.creator || I18N.t('unknown'));
  el.querySelector('.meta-text').textContent = metaText;
  if (!metaText) el.querySelector('.card-meta').hidden = true;

  el.addEventListener('click', () => onCardClick(item));
  return el;
}

function onCardClick(item) {
  if (currentType === 'rooms') {
    return;
  }
  if (currentType !== 'game') {
    toast(I18N.t('toast.othersWork'));
    return;
  }
  if (!item.file) {
    toast(I18N.t('toast.noGameData'));
    return;
  }
  toast(I18N.t('toast.loading'));
  fetch(item.file, { cache: 'no-store' })
    .then((res) => {
      if (!res.ok) throw new Error(I18N.t('toast.readFail'));
      return res.arrayBuffer();
    })
    .then((buf) => {
      const bytes = new Uint8Array(buf);
      let payload = '';
      if (bytes.length > 1 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
        // 檔案直接存 gzip 位元組（App 上傳經 GitHub 解碼後就是這種格式）
        payload = bytesToBase64(bytes);
      } else {
        // 舊格式：檔案本身就是 base64 文字（可能是 base64url）
        payload = new TextDecoder('utf-8')
          .decode(bytes)
          .replace(/\s+/g, '')
          .replace(/-/g, '+')
          .replace(/_/g, '/');
        while (payload.length % 4 !== 0) payload += '=';
      }
      if (!payload) throw new Error(I18N.t('toast.emptyData'));
      location.href = 'play.html#g=' + payload;
    })
    .catch((err) => toast(err.message));
}

function bytesToBase64(bytes) {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

let toastTimer = null;
function toast(text) {
  const el = $('toast');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
}
