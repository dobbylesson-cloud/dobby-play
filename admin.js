/* 管理後台：GitHub 白名單驗證 + 社群內容管理（先上架、後審核） */
(() => {
  "use strict";

  const GH = {
    owner: "dobbylesson-cloud",
    repo: "dobby-play",
    branch: "main",
    api: "https://api.github.com",
  };
  const INDEX_PATH = "library/index.json";
  const ADMIN_LOGIN = "dobbylesson-cloud";
  const TOKEN_KEY = "dobby_admin_token";

  const TYPES = {
    game: { label: "遊戲", title: "管理遊戲" },
    remix: { label: "遊戲", title: "管理遊戲" },
    animation: { label: "動畫", title: "管理動畫" },
    background: { label: "遠景", title: "管理遠景" },
    character: { label: "角色", title: "管理角色" },
    board: { label: "畫板", title: "管理畫板" },
  };

  class ApiError extends Error {
    constructor(message, status) {
      super(message);
      this.status = status || 0;
    }
  }

  const state = {
    token: "",
    account: "",
    doc: null,
    items: [],
    sha: "",
    type: "game",
    saving: false,
    editing: null,
  };

  const el = (id) => document.getElementById(id);

  const ui = {
    tabs: () => el("adminTabs"),
    loginSection: () => el("loginSection"),
    adminSection: () => el("adminSection"),
    tokenInput: () => el("tokenInput"),
    loginBtn: () => el("loginBtn"),
    loginMsg: () => el("loginMsg"),
    accountChip: () => el("accountChip"),
    logoutBtn: () => el("logoutBtn"),
    adminTitle: () => el("adminTitle"),
    adminSub: () => el("adminSub"),
    adminCount: () => el("adminCount"),
    adminList: () => el("adminList"),
    adminEmpty: () => el("adminEmpty"),
    refreshBtn: () => el("refreshBtn"),
    editMask: () => el("editMask"),
    editTitle: () => el("editTitle"),
    editCreator: () => el("editCreator"),
    editMsg: () => el("editMsg"),
    editSave: () => el("editSave"),
    editCancel: () => el("editCancel"),
    toast: () => el("toast"),
  };

  let toastTimer = 0;

  function toast(text, isError = false) {
    const node = ui.toast();
    node.textContent = text;
    node.classList.toggle("error", isError);
    node.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { node.hidden = true; }, isError ? 5200 : 2600);
  }

  function setMsg(node, text, kind) {
    node.textContent = text || "";
    node.classList.remove("error", "ok");
    if (kind) node.classList.add(kind);
  }

  function setBusy(busy) {
    ui.loginBtn().disabled = busy;
    ui.refreshBtn().disabled = busy;
    ui.editSave().disabled = busy;
    document.querySelectorAll(".mini").forEach((b) => { b.disabled = busy; });
  }

  function showLogin() {
    ui.loginSection().hidden = false;
    ui.adminSection().hidden = true;
    ui.tabs().hidden = true;
    ui.accountChip().hidden = true;
    ui.logoutBtn().hidden = true;
  }

  function showAdmin() {
    ui.loginSection().hidden = true;
    ui.adminSection().hidden = false;
    ui.tabs().hidden = false;
    ui.accountChip().hidden = false;
    ui.accountChip().textContent = "@" + state.account;
    ui.logoutBtn().hidden = false;
  }

  function showLoginError(e) {
    showLogin();
    setMsg(ui.loginMsg(), errorText(e), "error");
    if (e && (e.status === 401 || e.status === 403)) {
      clearToken();
    }
  }

  function clearToken() {
    state.token = "";
    state.account = "";
    try { localStorage.removeItem(TOKEN_KEY); } catch (_) { /* ignore */ }
  }

  function errorText(e) {
    if (!e) return "發生未知錯誤。";
    if (e.status === 401) return "Token 無效或已過期，請重新登入（或重新建立 token）。";
    if (e.status === 403) {
      return e.message && e.message.indexOf("管理權限") >= 0
        ? e.message
        : "沒有寫入權限，請確認 token 對此 repo 有 Contents: Read and write。";
    }
    if (e.status === 404) return "找不到資源：index.json 或檔案可能不存在。";
    if (e.status === 409) return "資料已被其他變更，請按「重新載入」後再試。";
    if (e.status === 422) return "GitHub 拒絕這次寫入，請確認 token 權限與 repo 狀態。";
    if (e.message === "Failed to fetch") return "網路連線失敗，請檢查網路後再試。";
    return e.message || "發生未知錯誤。";
  }

  async function api(path, options = {}, token = state.token) {
    const headers = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (token) headers.Authorization = "Bearer " + token;
    if (options.body) headers["Content-Type"] = "application/json";

    let res;
    try {
      res = await fetch(GH.api + path, { ...options, headers });
    } catch (_) {
      throw new ApiError("Failed to fetch", 0);
    }

    const text = await res.text();
    let data = null;
    if (text) {
      try { data = JSON.parse(text); } catch (_) { data = null; }
    }
    if (!res.ok) {
      const msg = (data && data.message) ? data.message : `HTTP ${res.status}`;
      throw new ApiError(msg, res.status);
    }
    return data || {};
  }

  function decodeBase64(b64) {
    const clean = String(b64 || "").replace(/\n/g, "");
    const bytes = Uint8Array.from(atob(clean), (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8").decode(bytes);
  }

  function encodeBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let bin = "";
    for (let i = 0; i < bytes.length; i += 1) {
      bin += String.fromCharCode(bytes[i]);
    }
    return btoa(bin);
  }

  function encodePath(path) {
    return String(path).split("/").map(encodeURIComponent).join("/");
  }

  function typeOf(item) {
    return item && item.type && TYPES[item.type] ? item.type : "";
  }

  async function loadIndex() {
    setBusy(true);
    try {
      const res = await api(`/repos/${GH.owner}/${GH.repo}/contents/${encodePath(INDEX_PATH)}?ref=${GH.branch}`);
      const parsed = JSON.parse(decodeBase64(res.content));
      state.doc = parsed && typeof parsed === "object" ? parsed : { items: [] };
      if (!Array.isArray(state.doc.items)) state.doc.items = [];
      state.items = state.doc.items;
      state.sha = res.sha;
      render();
      return true;
    } catch (e) {
      toast(errorText(e), true);
      if (e.status === 401) {
        clearToken();
        showLogin();
        setMsg(ui.loginMsg(), errorText(e), "error");
      }
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveIndex(message) {
    if (state.saving) return false;
    state.saving = true;
    setBusy(true);
    try {
      const body = {
        message: message || "admin: update library index",
        content: encodeBase64(JSON.stringify(state.doc, null, 2) + "\n"),
        branch: GH.branch,
      };
      if (state.sha) body.sha = state.sha;
      const res = await api(`/repos/${GH.owner}/${GH.repo}/contents/${encodePath(INDEX_PATH)}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      if (res.content && res.content.sha) state.sha = res.content.sha;
      return true;
    } catch (e) {
      toast(errorText(e), true);
      if (e.status === 401) {
        clearToken();
        showLogin();
        setMsg(ui.loginMsg(), errorText(e), "error");
      }
      return false;
    } finally {
      state.saving = false;
      setBusy(false);
    }
  }

  async function deleteRepoFile(path) {
    if (!path || !String(path).startsWith("library/")) return "skip";
    try {
      const meta = await api(`/repos/${GH.owner}/${GH.repo}/contents/${encodePath(path)}?ref=${GH.branch}`);
      await api(`/repos/${GH.owner}/${GH.repo}/contents/${encodePath(path)}`, {
        method: "DELETE",
        body: JSON.stringify({
          message: `admin: delete ${path}`,
          sha: meta.sha,
          branch: GH.branch,
        }),
      });
      return "ok";
    } catch (e) {
      if (e.status === 404) return "missing";
      return "fail";
    }
  }

  function imagePath(item) {
    const candidates = [item.thumb, item.file];
    for (const p of candidates) {
      if (typeof p === "string" && p.startsWith("library/") && /\.(png|jpe?g|webp|gif)$/i.test(p)) {
        return p;
      }
    }
    return "";
  }

  function formatDate(value) {
    if (!value) return "";
    let date;
    if (typeof value === "number") {
      date = new Date(value < 1e12 ? value * 1000 : value);
    } else {
      date = new Date(value);
    }
    if (isNaN(date.getTime())) return String(value);
    return date.toLocaleString("zh-TW", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
  }

  function render() {
    const type = state.type;
    const list = ui.adminList();
    list.textContent = "";

    const entries = state.items.filter(
      (it) => typeOf(it) === type || (type === "game" && typeOf(it) === "remix")
    );
    ui.adminTitle().textContent = TYPES[type].title;
    ui.adminSub().textContent = type === "game"
      ? "先上架、後審核：可下架或刪除不適合的遊戲。"
      : `先上架、後審核：管理社群上架的${TYPES[type].label}。`;

    const visible = entries.filter((it) => !it.hidden).length;
    ui.adminCount().textContent = `${entries.length} 件（上架 ${visible}）`;

    if (!entries.length) {
      ui.adminEmpty().hidden = false;
      return;
    }
    ui.adminEmpty().hidden = true;

    for (const item of entries) {
      list.appendChild(buildRow(item));
    }
  }

  function buildRow(item) {
    const row = document.createElement("article");
    row.className = "admin-row" + (item.hidden ? " is-hidden" : "");

    const thumbBox = document.createElement("div");
    thumbBox.className = "row-thumb";
    const src = imagePath(item);
    if (src) {
      const img = document.createElement("img");
      img.src = src;
      img.alt = "";
      img.loading = "lazy";
      thumbBox.appendChild(img);
    } else {
      thumbBox.classList.add("is-empty");
    }

    const main = document.createElement("div");
    main.className = "row-main";

    const title = document.createElement("h3");
    title.className = "row-title";
    const titleText = document.createElement("span");
    titleText.textContent = item.title || "未命名";
    title.appendChild(titleText);
    if (item.featured) {
      const tag = document.createElement("span");
      tag.className = "tag pin";
      tag.textContent = "置頂";
      title.appendChild(tag);
    }
    if (item.hidden) {
      const tag = document.createElement("span");
      tag.className = "tag off";
      tag.textContent = "已下架";
      title.appendChild(tag);
    }

    const meta = document.createElement("p");
    meta.className = "row-meta";
    const parts = ["創作者：" + (item.creator || "不詳")];
    if (item.meta) parts.push(item.meta);
    const date = formatDate(item.created_at);
    if (date) parts.push(date);
    if (item.file) parts.push(item.file);
    meta.textContent = parts.join(" · ");

    main.appendChild(title);
    main.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "row-actions";

    actions.appendChild(button("編輯", "primary", () => openEdit(item)));
    actions.appendChild(button("上移", "", () => moveItem(item, -1)));
    actions.appendChild(button("下移", "", () => moveItem(item, 1)));
    actions.appendChild(button(item.featured ? "取消置頂" : "置頂", "", () => toggleFeatured(item)));
    actions.appendChild(button(item.hidden ? "上架" : "下架", "", () => toggleHidden(item)));
    actions.appendChild(button("刪除", "danger", () => deleteItem(item)));

    row.appendChild(thumbBox);
    row.appendChild(main);
    row.appendChild(actions);
    return row;
  }

  function button(label, kind, onClick) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "mini" + (kind ? " " + kind : "");
    b.textContent = label;
    b.addEventListener("click", onClick);
    return b;
  }

  async function moveItem(item, delta) {
    const items = state.items;
    const index = items.indexOf(item);
    if (index < 0) return;
    let target = index + delta;
    while (target >= 0 && target < items.length && typeOf(items[target]) !== typeOf(item)) {
      target += delta;
    }
    if (target < 0 || target >= items.length) {
      toast("已經在" + (delta < 0 ? "最前面" : "最後面") + "了。");
      return;
    }
    const tmp = items[index];
    items[index] = items[target];
    items[target] = tmp;
    render();
    const ok = await saveIndex(`admin: reorder ${typeOf(item)}`);
    if (!ok) await loadIndex();
  }

  async function toggleFeatured(item) {
    item.featured = !item.featured;
    render();
    const ok = await saveIndex(`admin: ${item.featured ? "pin" : "unpin"} ${item.title || ""}`.trim());
    if (!ok) await loadIndex();
  }

  async function toggleHidden(item) {
    item.hidden = !item.hidden;
    render();
    const ok = await saveIndex(`admin: ${item.hidden ? "hide" : "show"} ${item.title || ""}`.trim());
    if (!ok) await loadIndex();
  }

  async function deleteItem(item) {
    const name = item.title || "未命名";
    if (!window.confirm(`確定要刪除「${name}」？\n這會從網站列表移除，並刪除 repo 內的檔案與縮圖，無法復原。`)) {
      return;
    }
    const index = state.items.indexOf(item);
    if (index < 0) return;
    const removed = state.items.splice(index, 1)[0];
    render();

    const ok = await saveIndex(`admin: delete ${typeOf(removed)} ${name}`);
    if (!ok) {
      state.items.splice(index, 0, removed);
      render();
      return;
    }

    const paths = Array.from(new Set([removed.thumb, removed.file].filter(
      (p) => typeof p === "string" && p.startsWith("library/")
    )));
    let failed = 0;
    for (const p of paths) {
      const shared = state.items.some((it) => it.thumb === p || it.file === p);
      if (shared) continue;
      const result = await deleteRepoFile(p);
      if (result === "fail") failed += 1;
    }
    toast(failed ? `已從列表刪除，但有 ${failed} 個檔案刪除失敗。` : `已刪除「${name}」。`, failed > 0);
  }

  function openEdit(item) {
    state.editing = item;
    ui.editTitle().value = item.title || "";
    ui.editCreator().value = item.creator || "";
    setMsg(ui.editMsg(), "");
    ui.editMask().hidden = false;
    setTimeout(() => ui.editTitle().focus(), 30);
  }

  function closeEdit() {
    state.editing = null;
    ui.editMask().hidden = true;
  }

  async function saveEdit() {
    const item = state.editing;
    if (!item) return;
    const title = ui.editTitle().value.trim();
    const creator = ui.editCreator().value.trim();
    if (!title) {
      setMsg(ui.editMsg(), "作品名稱不能空白。", "error");
      return;
    }
    const oldTitle = item.title || "";
    const oldCreator = item.creator || "";
    item.title = title;
    item.creator = creator || "不詳";
    setBusy(true);
    const ok = await saveIndex(`admin: rename ${typeOf(item)} ${oldTitle} -> ${title}`);
    setBusy(false);
    if (!ok) {
      item.title = oldTitle;
      item.creator = oldCreator;
      setMsg(ui.editMsg(), "儲存失敗，請稍後再試。", "error");
      return;
    }
    closeEdit();
    render();
    toast("已更新作品資訊。");
  }

  async function loginWithToken(raw, silent = false) {
    const token = String(raw || "").trim();
    if (!token) {
      setMsg(ui.loginMsg(), "請先貼上 GitHub token。", "error");
      return;
    }
    setBusy(true);
    if (!silent) setMsg(ui.loginMsg(), "驗證中…", "");
    try {
      const user = await api("/user", {}, token);
      const login = String(user.login || "");
      if (login.toLowerCase() !== ADMIN_LOGIN.toLowerCase()) {
        throw new ApiError(`此帳號 @${login} 沒有管理權限。`, 403);
      }
      state.token = token;
      state.account = login;
      try { localStorage.setItem(TOKEN_KEY, token); } catch (_) { /* ignore */ }
      showAdmin();
      setMsg(ui.loginMsg(), "");
      render();
      const loaded = await loadIndex();
      if (loaded) toast("已登入，載入最新資料。");
    } catch (e) {
      if (e.status === 401 || e.status === 403) clearToken();
      showLoginError(e);
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    clearToken();
    state.doc = null;
    state.items = [];
    state.sha = "";
    ui.tokenInput().value = "";
    setMsg(ui.loginMsg(), "已登出。", "ok");
    showLogin();
  }

  function switchType(type) {
    if (!TYPES[type]) return;
    state.type = type;
    document.querySelectorAll("#adminTabs .tab").forEach((tab) => {
      tab.classList.toggle("is-active", tab.dataset.type === type);
    });
    if (state.doc) render();
  }

  function bind() {
    document.querySelectorAll("#adminTabs .tab").forEach((tab) => {
      tab.addEventListener("click", () => switchType(tab.dataset.type));
    });
    ui.loginBtn().addEventListener("click", () => loginWithToken(ui.tokenInput().value));
    ui.tokenInput().addEventListener("keydown", (e) => {
      if (e.key === "Enter") loginWithToken(ui.tokenInput().value);
    });
    ui.logoutBtn().addEventListener("click", logout);
    ui.refreshBtn().addEventListener("click", async () => {
      const ok = await loadIndex();
      if (ok) toast("已重新載入。");
    });
    ui.editSave().addEventListener("click", saveEdit);
    ui.editCancel().addEventListener("click", closeEdit);
    ui.editMask().addEventListener("click", (e) => {
      if (e.target === ui.editMask()) closeEdit();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !ui.editMask().hidden) closeEdit();
    });
  }

  async function init() {
    bind();
    let saved = "";
    try { saved = localStorage.getItem(TOKEN_KEY) || ""; } catch (_) { /* ignore */ }
    if (saved) {
      state.token = saved;
      await loginWithToken(saved, true);
    } else {
      showLogin();
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
