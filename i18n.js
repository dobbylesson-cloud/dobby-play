/* Pixel World 國際化：繁體中文（zh）/ English（en）切換。
 * 字串以 key 對應，支援 {var} 占位替換。選擇存在 localStorage。
 */
(function () {
  "use strict";

  var LANG_KEY = "dobby_lang";

  var dict = {
    /* ---- 共用 ---- */
    "brand.alt":        { zh: "Pixel World", en: "Pixel World" },
    "tab.play":         { zh: "Play",        en: "Play" },
    "tab.game":         { zh: "遊戲",        en: "Games" },
    "tab.animation":    { zh: "動畫",        en: "Animations" },
    "tab.background":   { zh: "遠景",        en: "Backgrounds" },
    "tab.character":    { zh: "角色",        en: "Characters" },
    "tab.board":        { zh: "畫板",        en: "Canvas" },
    "admin.link":       { zh: "管理",        en: "Admin" },
    "admin.logout":     { zh: "登出",        en: "Logout" },
    "untitled":         { zh: "未命名",      en: "Untitled" },
    "unknown":          { zh: "不詳",        en: "Unknown" },
    "creator.prefix":   { zh: "創作者：",    en: "Creator: " },
    "rating.suffix":    { zh: "% 評分",      en: "% rating" },

    /* ---- index.html ---- */
    "index.pageTitle":     { zh: "Pixel World — 探索大家的創作", en: "Pixel World — Explore Creations" },
    "index.game.title":    { zh: "Play遊戲",   en: "Play Games" },
    "index.game.sub":      { zh: "所有人上傳的遊戲，點卡片就能玩。", en: "Games uploaded by everyone. Click a card to play." },
    "index.rooms.title":   { zh: "發現遊戲",   en: "Discover Games" },
    "index.rooms.sub":     { zh: "所有人上傳的遊戲。", en: "Games uploaded by everyone." },
    "index.animation.title": { zh: "發現動畫", en: "Discover Animations" },
    "index.animation.sub":   { zh: "所有人上傳的動畫。", en: "Animations uploaded by everyone." },
    "index.background.title": { zh: "發現遠景", en: "Discover Backgrounds" },
    "index.background.sub":   { zh: "所有人上傳的遠景背景。", en: "Backgrounds uploaded by everyone." },
    "index.character.title":  { zh: "發現角色", en: "Discover Characters" },
    "index.character.sub":    { zh: "所有人上傳的角色。", en: "Characters uploaded by everyone." },
    "index.board.title":      { zh: "發現畫板", en: "Discover Canvas" },
    "index.board.sub":        { zh: "所有人上傳的畫板。", en: "Canvas works uploaded by everyone." },
    "index.empty":            { zh: "這裡還沒有作品。", en: "No works here yet." },
    "toast.othersWork": { zh: "這是其他人的作品，可在 App 內使用。", en: "This is someone else's work. Use it in the app." },
    "toast.noGameData": { zh: "這個作品沒有遊戲資料。", en: "This work has no game data." },
    "toast.loading":    { zh: "載入遊戲中…", en: "Loading game…" },
    "toast.readFail":   { zh: "讀取遊戲資料失敗", en: "Failed to read game data" },
    "toast.emptyData":  { zh: "遊戲資料是空的", en: "Game data is empty" },

    /* ---- admin.html ---- */
    "admin.pageTitle":  { zh: "管理後台 — Pixel World", en: "Admin — Pixel World" },
    "admin.login.title": { zh: "管理員登入", en: "Admin Login" },
    "admin.login.sub":   { zh: "管理社群已上架的遊戲、動畫、遠景、角色與畫板。只有白名單帳號可以修改。",
                           en: "Manage published games, animations, backgrounds, characters and canvas. Only whitelisted accounts can edit." },
    "admin.login.step1": { zh: "到 GitHub 建立 <strong>Fine-grained token</strong>，只授權此 repository 的 <strong>Contents: Read and write</strong>。",
                           en: "Create a <strong>Fine-grained token</strong> on GitHub, granting <strong>Contents: Read and write</strong> for this repository only." },
    "admin.login.step2": { zh: "把 token 貼到下面，按「驗證並登入」。系統會確認帳號是否為管理員。",
                           en: "Paste the token below and click Verify & Login. The system checks if the account is an admin." },
    "admin.login.step3": { zh: "Token 只存在這台瀏覽器，不會寫進網站或 repo；換電腦要重新貼一次。",
                           en: "The token is stored only in this browser, never written to the site or repo. Re-paste it on another computer." },
    "admin.login.tokenPlaceholder": { zh: "貼上 GitHub token", en: "Paste GitHub token" },
    "admin.login.btn":   { zh: "驗證並登入", en: "Verify & Login" },
    "admin.login.note":  { zh: "建立 token：<a href=\"https://github.com/settings/personal-access-tokens/new\" target=\"_blank\" rel=\"noopener\">GitHub → Settings → Developer settings → Fine-grained tokens</a>（Repository access 選 <code>dobbylesson-cloud/dobby-play</code>，Permissions 的 Contents 設為 Read and write）",
                           en: "Create token: <a href=\"https://github.com/settings/personal-access-tokens/new\" target=\"_blank\" rel=\"noopener\">GitHub → Settings → Developer settings → Fine-grained tokens</a> (Repository access: <code>dobbylesson-cloud/dobby-play</code>, Permissions → Contents: Read and write)" },
    "admin.play.title":  { zh: "管理 Play 遊戲", en: "Manage Play Games" },
    "admin.game.title":  { zh: "管理遊戲", en: "Manage Games" },
    "admin.animation.title":  { zh: "管理動畫", en: "Manage Animations" },
    "admin.background.title": { zh: "管理遠景", en: "Manage Backgrounds" },
    "admin.character.title":  { zh: "管理角色", en: "Manage Characters" },
    "admin.board.title":      { zh: "管理畫板", en: "Manage Canvas" },
    "admin.sub.game":    { zh: "先上架、後審核：可下架或刪除不適合的遊戲。", en: "Publish first, review later: unpublish or delete inappropriate games." },
    "admin.sub.other":   { zh: "先上架、後審核：管理社群上架的{label}。", en: "Publish first, review later: manage community-published {label}." },
    "admin.count":       { zh: "{total} 件（上架 {visible}）", en: "{total} items ({visible} published)" },
    "admin.empty":       { zh: "這個分類目前沒有社群作品。", en: "No community works in this category yet." },
    "admin.note":        { zh: "排序會直接改變網站上的顯示順序；「置頂」會排到該分類最前面；「下架」只是從網站列表隱藏，檔案仍保留；「刪除」會一併移除 repo 內的檔案與縮圖。",
                           en: "Reordering changes display order directly. \"Pin\" puts an item first. \"Unpublish\" only hides it from the site (files remain). \"Delete\" also removes files and thumbnails from the repo." },
    "edit.title":        { zh: "編輯作品資訊", en: "Edit Work Info" },
    "edit.cancel":       { zh: "取消", en: "Cancel" },
    "edit.save":         { zh: "儲存", en: "Save" },
    "edit.titleLabel":   { zh: "作品名稱", en: "Title" },
    "edit.titlePlaceholder": { zh: "作品名稱", en: "Title" },
    "edit.creatorLabel": { zh: "創作者", en: "Creator" },
    "edit.creatorPlaceholder": { zh: "創作者", en: "Creator" },
    "btn.reload":    { zh: "重新載入", en: "Reload" },
    "btn.edit":      { zh: "編輯", en: "Edit" },
    "btn.up":        { zh: "上移", en: "Up" },
    "btn.down":      { zh: "下移", en: "Down" },
    "btn.pin":       { zh: "置頂", en: "Pin" },
    "btn.unpin":     { zh: "取消置頂", en: "Unpin" },
    "btn.publish":   { zh: "上架", en: "Publish" },
    "btn.unpublish": { zh: "下架", en: "Unpublish" },
    "btn.delete":    { zh: "刪除", en: "Delete" },
    "tag.pin":       { zh: "置頂", en: "Pinned" },
    "tag.off":       { zh: "已下架", en: "Unpublished" },
    "toast.alreadyEnd": { zh: "已經在{pos}了。", en: "Already at the {pos}." },
    "pos.first":       { zh: "最前面", en: "top" },
    "pos.last":        { zh: "最後面", en: "bottom" },
    "toast.deleted":    { zh: "已刪除「{name}」。", en: "Deleted \"{name}\"." },
    "toast.deletePartial": { zh: "已從列表刪除，但有 {n} 個檔案刪除失敗。", en: "Removed from list, but {n} file(s) failed to delete." },
    "confirm.delete": { zh: "確定要刪除「{name}」？\n這會從網站列表移除，並刪除 repo 內的檔案與縮圖，無法復原。",
                        en: "Delete \"{name}\"?\nThis removes it from the site and deletes its files and thumbnails from the repo. Cannot be undone." },
    "edit.emptyTitle": { zh: "作品名稱不能空白。", en: "Title cannot be empty." },
    "edit.saveFail":   { zh: "儲存失敗，請稍後再試。", en: "Save failed. Please try again later." },
    "edit.saved":      { zh: "已更新作品資訊。", en: "Work info updated." },
    "login.emptyToken": { zh: "請先貼上 GitHub token。", en: "Please paste your GitHub token first." },
    "login.verifying":  { zh: "驗證中…", en: "Verifying…" },
    "login.noPerm":     { zh: "此帳號 @{login} 沒有管理權限。", en: "Account @{login} has no admin permission." },
    "login.loaded":     { zh: "已登入，載入最新資料。", en: "Logged in, loading latest data." },
    "login.loggedOut":  { zh: "已登出。", en: "Logged out." },
    "toast.reloaded":   { zh: "已重新載入。", en: "Reloaded." },
    "error.unknown":  { zh: "發生未知錯誤。", en: "An unknown error occurred." },
    "error.401":      { zh: "Token 無效或已過期，請重新登入（或重新建立 token）。", en: "Token is invalid or expired. Please log in again (or create a new token)." },
    "error.403":      { zh: "沒有寫入權限，請確認 token 對此 repo 有 Contents: Read and write。", en: "No write permission. Make sure the token has Contents: Read and write for this repo." },
    "error.404":      { zh: "找不到資源：index.json 或檔案可能不存在。", en: "Resource not found: index.json or the file may not exist." },
    "error.409":      { zh: "資料已被其他變更，請按「重新載入」後再試。", en: "Data was changed elsewhere. Click Reload and try again." },
    "error.422":      { zh: "GitHub 拒絕這次寫入，請確認 token 權限與 repo 狀態。", en: "GitHub rejected this write. Check token permissions and repo status." },
    "error.network":  { zh: "網路連線失敗，請檢查網路後再試。", en: "Network connection failed. Check your connection and try again." },
  };

  function getLang() {
    try {
      var saved = localStorage.getItem(LANG_KEY);
      if (saved === "en" || saved === "zh") return saved;
    } catch (_) { /* ignore */ }
    return "zh";
  }

  function setLang(lang) {
    if (lang !== "zh" && lang !== "en") lang = "zh";
    try { localStorage.setItem(LANG_KEY, lang); } catch (_) { /* ignore */ }
    apply();
    try {
      document.dispatchEvent(new CustomEvent("langchange", { detail: { lang: lang } }));
    } catch (_) { /* ignore old browsers */ }
  }

  function t(key, vars) {
    var entry = dict[key];
    var str = (entry && entry[getLang()]) || key;
    if (vars && typeof vars === "object") {
      Object.keys(vars).forEach(function (k) {
        str = str.replace(new RegExp("\\{" + k + "\\}", "g"), vars[k]);
      });
    }
    return str;
  }

  function apply() {
    var lang = getLang();
    var other = lang === "zh" ? "en" : "zh";
    document.documentElement.lang = lang === "zh" ? "zh-Hant" : "en";

    var docTitleKey = document.documentElement.getAttribute("data-i18n-title");
    if (docTitleKey) document.title = t(docTitleKey);

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      // 字典字串皆為靜態內容，部分含 <strong> 等標籤，故用 innerHTML。
      el.innerHTML = t(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
    });
    document.querySelectorAll("[data-lang-toggle]").forEach(function (btn) {
      btn.textContent = other === "zh" ? "中文" : "EN";
      btn.setAttribute("aria-label", other === "zh" ? "切換為中文" : "Switch to English");
    });
  }

  function toggle() {
    setLang(getLang() === "zh" ? "en" : "zh");
  }

  function bind() {
    document.querySelectorAll("[data-lang-toggle]").forEach(function (btn) {
      btn.addEventListener("click", toggle);
    });
  }

  window.I18N = { getLang: getLang, setLang: setLang, t: t, apply: apply, toggle: toggle };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { bind(); apply(); });
  } else {
    bind();
    apply();
  }
})();
