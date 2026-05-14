/**
 * GNUCHANOS — pencere yöneticisi: başlıktan sürükle, köşeden boyutlandır, □ büyüt, × kapat.
 * Şema: .gchu-window > .gchu-window__titlebar (.gchu-window__drag, .gchu-window__max, .gchu-window__close) + .gchu-window__body > .gchu-window__frame.
 * Dış API: __gnuchanosSpawnAppWindow, __gnuchanosSpawnIframePlayWindow, __gnuchanosSyncWorkspace,
 *   __gnuchanosFrameRoot, __gnuchanosClearFrame, __gnuchanosAttachFrame
 */
(function gnuchanosWm() {
  const desktop = document.getElementById("gnuchanos-desktop");
  if (!desktop) return;

  /** Çalışma alanı: pencereler data-gchu-ws ile gruplanır; aktif olmayanlar gizlenir. */
  function getWsCount() {
    const c = Number(desktop.dataset.gchuWsCount);
    if (!Number.isFinite(c) || c < 1) return 4;
    return Math.min(12, Math.floor(c));
  }

  function getActiveWs() {
    const max = getWsCount();
    const a = Number(desktop.dataset.gchuActiveWs);
    if (!Number.isFinite(a) || a < 1) return 1;
    return Math.min(max, Math.floor(a));
  }

  function assignWindowWorkspace(win) {
    win.dataset.gchuWs = String(getActiveWs());
  }

  function applyWorkspaceVisibility() {
    const active = getActiveWs();
    let top = null;
    let topZ = -1;
    desktop.querySelectorAll(".gchu-window").forEach((win) => {
      const w = Number(win.dataset.gchuWs || 1);
      const show = w === active;
      win.classList.toggle("gchu-window--off-ws", !show);
      if (show) {
        const z = parseInt(String(win.style.zIndex || "0"), 10) || 0;
        if (z >= topZ) {
          topZ = z;
          top = win;
        }
      }
    });
    if (top) focusWin(top);
    else {
      desktop.querySelectorAll(".gchu-window").forEach((w) => w.classList.remove("gchu-window--focus"));
    }
  }

  window.__gnuchanosSyncWorkspace = function syncWorkspace(active, count) {
    const max = Math.max(1, Math.min(12, Number(count) || 4));
    const a = Math.max(1, Math.min(max, Number(active) || 1));
    desktop.dataset.gchuWsCount = String(max);
    desktop.dataset.gchuActiveWs = String(a);
    applyWorkspaceVisibility();
  };

  const MIN_W = 160;
  const MIN_H = 100;
  let zStack = 20;

  const APP_TITLES = {
    welcome: "Hoş geldiniz",
    pulse: "PulseAudio",
    music: "Music Player",
    wall: "Wallpaper Manager",
    editor: "Text Editor",
    calc: "Calculator",
    alarm: "Alarm",
    timer: "TIMER",
    library: "Game Library",
  };

  /** Pencere başlığı: i18n anahtarı (yoksa APP_TITLES) */
  const APP_TITLE_I18N_KEY = {
    welcome: "win_welcome",
    pulse: "mp_title",
    music: "mm_title",
    wall: "mw_title",
    editor: "me_title",
    calc: "mc_title",
    alarm: "ma_title",
    timer: "mt_title",
    library: "sh_library",
  };

  function resolvedAppWindowTitle(appId) {
    const k = APP_TITLE_I18N_KEY[appId];
    if (k && typeof window.__gnuchanosT === "function") {
      const s = window.__gnuchanosT(k);
      if (s) return s;
    }
    return APP_TITLES[appId] ?? "";
  }

  function resolvedDragHint() {
    if (typeof window.__gnuchanosT === "function") {
      const s = window.__gnuchanosT("wm_drag_title");
      if (s) return s;
    }
    return "Sürükleyin · çift tıklayınca büyüt / önceki boyut";
  }

  function winChromeStr(key, fb) {
    if (typeof window.__gnuchanosT === "function") {
      const s = window.__gnuchanosT(key);
      if (s != null && s !== "") return s;
    }
    return fb;
  }

  function refreshAppWindowTitles() {
    if (typeof window.__gnuchanosT === "function") {
      const T = window.__gnuchanosT;
      const hint = resolvedDragHint();
      desktop.querySelectorAll(".gchu-window[data-gchu-app-id]").forEach((win) => {
        const id = win.dataset.gchuAppId;
        if (!id) return;
        const drag = win.querySelector(".gchu-window__drag");
        if (!drag) return;
        if (id === "gameplay") {
          drag.title = hint;
          return;
        }
        const k = APP_TITLE_I18N_KEY[id];
        if (!k) return;
        drag.textContent = T(k);
        drag.title = hint;
      });
    }
    refreshWindowChrome();
  }

  window.__gnuchanosRefreshWinTitles = refreshAppWindowTitles;

  /** Başlangıç genişliği = masaüstü × oran, üst sınır ile (geniş ekranda dev pencere yok) */
  const APP_WIDTH_FRAC = {
    welcome: 0.44,
    pulse: 0.38,
    music: 0.52,
    wall: 0.72,
    editor: 0.48,
    calc: 0.34,
    alarm: 0.36,
    timer: 0.38,
    library: 0.88,
  };

  const APP_WIDTH_MAX = {
    welcome: 480,
    pulse: 340,
    music: 500,
    wall: 680,
    editor: 480,
    calc: 300,
    alarm: 360,
    timer: 380,
    library: 1400,
  };

  const LS_VOL = "gnuchanos_pulse_vol";
  const LS_EDITOR = "gnuchanos_editor";

  const WALL_STACK_SVG =
    "radial-gradient(120% 80% at 50% 100%, rgba(20, 8, 35, 0.88) 0%, transparent 55%)," +
    " radial-gradient(ellipse at 70% 30%, rgba(80, 40, 120, 0.4) 0%, transparent 50%)," +
    " linear-gradient(165deg, rgba(31, 10, 50, 0.55) 0%, rgba(18, 6, 28, 0.75) 45%, rgba(13, 4, 20, 0.85) 100%)," +
    ' url("./assets/wallpaper.svg")';

  const WALL_STACK_GRAD =
    "radial-gradient(120% 80% at 50% 100%, rgba(20, 8, 35, 0.88) 0%, transparent 55%)," +
    " radial-gradient(ellipse at 70% 30%, rgba(80, 40, 120, 0.4) 0%, transparent 50%)," +
    " linear-gradient(165deg, rgba(31, 10, 50, 0.55) 0%, rgba(18, 6, 28, 0.75) 45%, rgba(13, 4, 20, 0.85) 100%)";

  /** 30 hazır görünüm: varsayılan, SVG, gradient + türevler */
  function buildWallReadyPresets() {
    const list = [
      { id: "def", label: "Varsayılan", kind: "default" },
      { id: "forest", label: "Orman (SVG)", kind: "svg" },
      { id: "plain", label: "Sadece mor gradient", kind: "css", css: WALL_STACK_GRAD },
    ];
    for (let i = 0; i < 9; i++) {
      const hue = 215 + i * 13;
      const css =
        `radial-gradient(ellipse at ${18 + (i % 5) * 16}% ${25 + (i % 3) * 22}%, hsla(${hue},55%,32%,0.55) 0%, transparent 58%),` +
        `linear-gradient(${155 + i * 4}deg, hsl(${hue},42%,14%) 0%, hsl(${hue + 35},38%,8%) 100%)`;
      list.push({ id: `aur-${i}`, label: `Aurora ${i + 1}`, kind: "css", css });
    }
    for (let i = 0; i < 9; i++) {
      const tint = `hsla(${268 + i * 7}, 48%, 18%, ${0.38 + (i % 3) * 0.1})`;
      list.push({
        id: `for-${i}`,
        label: `Orman + sis ${i + 1}`,
        kind: "css",
        css: `linear-gradient(175deg, ${tint}, hsla(260,40%,12%,0.5) 55%, transparent), ${WALL_STACK_SVG}`,
      });
    }
    for (let i = 0; i < 6; i++) {
      list.push({
        id: `neb-${i}`,
        label: `Derin gök ${i + 1}`,
        kind: "css",
        css:
          `radial-gradient(circle at 50% 110%, hsl(${275 + i * 11},58%,24%,0.92) 0%, transparent 48%),` +
          `radial-gradient(circle at ${75 - i * 5}% ${15 + i * 5}%, hsl(${230 + i * 8},50%,32%,0.45) 0%, transparent 42%),` +
          WALL_STACK_GRAD,
      });
    }
    for (let i = 0; i < 3; i++) {
      list.push({
        id: `strip-${i}`,
        label: `Doku ${i + 1}`,
        kind: "css",
        css:
          `repeating-linear-gradient(${38 + i * 12}deg, hsla(270,35%,18%,0.55) 0 14px, hsla(255,28%,10%,0.65) 14px 28px),` +
          `linear-gradient(165deg, hsl(250,38%,12%) 0%, hsl(280,32%,8%) 100%)`,
      });
    }
    return list;
  }

  const WALL_READY_PRESETS = buildWallReadyPresets();

  function focusWin(win) {
    if (!win || win.classList.contains("gchu-window--off-ws")) return;
    zStack += 1;
    win.style.zIndex = String(zStack);
    desktop.querySelectorAll(".gchu-window").forEach((w) => {
      w.classList.toggle("gchu-window--focus", w === win);
    });
  }

  /** Aynı uygulama için tek pencere: yeniden açılınca mevcut örnek öne gelir (aktif CA'ya taşınır). */
  function bringAppWindowToFront(win) {
    if (!win || !desktop.contains(win)) return;
    assignWindowWorkspace(win);
    applyWorkspaceVisibility();
    focusWin(win);
  }

  desktop.addEventListener("mousedown", (e) => {
    const win = e.target.closest(".gchu-window");
    if (win && !e.target.closest(".gchu-window__resize")) focusWin(win);
  });

  function visibleWindows() {
    return [...desktop.querySelectorAll(".gchu-window")].filter((w) => !w.classList.contains("gchu-window--off-ws"));
  }

  function cycleWindowFocus(delta) {
    const wins = visibleWindows();
    if (wins.length < 2) return;
    wins.sort((a, b) => {
      const za = parseInt(String(a.style.zIndex || "0"), 10) || 0;
      const zb = parseInt(String(b.style.zIndex || "0"), 10) || 0;
      return za - zb;
    });
    let idx = wins.findIndex((w) => w.classList.contains("gchu-window--focus"));
    if (idx < 0) idx = wins.length - 1;
    const next = (idx + delta + wins.length) % wins.length;
    focusWin(wins[next]);
  }

  document.addEventListener(
    "keydown",
    (e) => {
      if (e.code !== "Tab" || !e.altKey || e.repeat || e.ctrlKey || e.metaKey) return;
      const launcher = document.getElementById("launcher");
      if (launcher && !launcher.classList.contains("is-hidden")) return;
      if (document.querySelector(".shell-modal:not(.is-hidden)")) return;
      const t = e.target;
      if (t instanceof HTMLElement) {
        if (t.isContentEditable && !t.closest(".gchu-window")) return;
        if (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) && !t.closest(".gchu-window")) return;
      }
      const wins = visibleWindows();
      if (wins.length < 2) return;
      e.preventDefault();
      e.stopPropagation();
      cycleWindowFocus(e.shiftKey ? -1 : 1);
    },
    true,
  );

  function initDrag(win, bar) {
    bar.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      if (win.classList.contains("gchu-window--max")) return;
      e.preventDefault();
      focusWin(win);
      const wr = win.getBoundingClientRect();
      const offX = e.clientX - wr.left;
      const offY = e.clientY - wr.top;

      function move(ev) {
        const dr = desktop.getBoundingClientRect();
        let x = ev.clientX - dr.left - offX;
        let y = ev.clientY - dr.top - offY;
        const maxX = dr.width - win.offsetWidth;
        const maxY = dr.height - win.offsetHeight;
        x = Math.max(0, Math.min(maxX, x));
        y = Math.max(0, Math.min(maxY, y));
        win.style.left = `${x}px`;
        win.style.top = `${y}px`;
      }

      function up() {
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", up);
      }

      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
    });

    bar.addEventListener("dblclick", (e) => {
      e.preventDefault();
      toggleMaximize(win);
    });
  }

  function initResize(win, handle) {
    handle.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      if (win.classList.contains("gchu-window--max")) return;
      e.preventDefault();
      e.stopPropagation();
      focusWin(win);
      const startX = e.clientX;
      const startY = e.clientY;
      const startW = win.offsetWidth;
      const startH = win.offsetHeight;
      const left = win.offsetLeft;

      function move(ev) {
        const dr = desktop.getBoundingClientRect();
        let w = startW + (ev.clientX - startX);
        let h = startH + (ev.clientY - startY);
        w = Math.max(MIN_W, w);
        h = Math.max(MIN_H, h);
        const maxW = dr.width - left;
        const top = win.offsetTop;
        const maxH = dr.height - top;
        win.style.width = `${Math.min(w, maxW)}px`;
        win.style.height = `${Math.min(h, maxH)}px`;
      }

      function up() {
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", up);
        applyWinMaxFromDesktop(win);
        win.classList.add("gchu-window--fixed-h");
      }

      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
    });
  }

  function attachWindowControls(win) {
    if (win.dataset.wmAttached === "1") return;
    win.dataset.wmAttached = "1";
    const dragEl = win.querySelector(".gchu-window__drag") || win.querySelector(".gchu-window__titlebar");
    const handle = win.querySelector(".gchu-window__resize");
    const closeBtn = win.querySelector(".gchu-window__close");
    if (dragEl) initDrag(win, dragEl);
    if (handle) initResize(win, handle);
    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (typeof win.__gchuCleanup === "function") {
          try {
            win.__gchuCleanup();
          } catch {
            /* ignore */
          }
        }
        win.remove();
        const visible = [...desktop.querySelectorAll(".gchu-window")].filter(
          (w) => !w.classList.contains("gchu-window--off-ws"),
        );
        const last = visible[visible.length - 1];
        if (last) focusWin(last);
      });
    }
    const maxBtn = win.querySelector(".gchu-window__max");
    if (maxBtn) {
      maxBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        focusWin(win);
        toggleMaximize(win);
      });
    }
    applyWindowChromeToWin(win);
  }

  function staggerPosition() {
    const dr = desktop.getBoundingClientRect();
    const active = getActiveWs();
    const n = [...desktop.querySelectorAll(".gchu-window")].filter((w) => {
      if (w.classList.contains("gchu-window--off-ws")) return false;
      return Number(w.dataset.gchuWs || 1) === active;
    }).length;
    const left = Math.min(20 + n * 24, Math.max(8, dr.width - MIN_W - 8));
    const top = Math.min(24 + n * 20, Math.max(8, dr.height - MIN_H - 8));
    return { left, top };
  }

  function applyWinMaxFromDesktop(win) {
    const dr = desktop.getBoundingClientRect();
    const winMax = Math.max(140, Math.floor(dr.height - 8));
    win.style.setProperty("--gchu-win-max", `${winMax}px`);
  }

  /** Music Player: masaüstüne göre dikey kart — ~%35 genişlik, ~%75 yükseklik, ortalı */
  const MUSIC_W_FRAC = 0.35;
  const MUSIC_H_FRAC = 0.75;

  function layoutMusicWindow(win) {
    const dr = desktop.getBoundingClientRect();
    const w = Math.max(MIN_W, Math.min(Math.round(dr.width * MUSIC_W_FRAC), dr.width - 6));
    const h = Math.max(MIN_H, Math.min(Math.round(dr.height * MUSIC_H_FRAC), dr.height - 8));
    win.style.width = `${w}px`;
    win.style.height = `${h}px`;
    win.style.left = `${Math.max(0, Math.round((dr.width - w) / 2))}px`;
    win.style.top = `${Math.max(0, Math.round((dr.height - h) / 2))}px`;
    applyWinMaxFromDesktop(win);
  }

  /** Alarm: ~%35 genişlik, ~%24 yükseklik, ortada (kompakt kart) */
  const ALARM_W_FRAC = 0.35;
  const ALARM_H_FRAC = 0.24;

  function layoutAlarmWindow(win) {
    const dr = desktop.getBoundingClientRect();
    const w = Math.max(MIN_W, Math.min(Math.round(dr.width * ALARM_W_FRAC), dr.width - 6));
    const h = Math.max(140, Math.min(Math.round(dr.height * ALARM_H_FRAC), dr.height - 8));
    win.style.width = `${w}px`;
    win.style.height = `${h}px`;
    win.style.left = `${Math.max(0, Math.round((dr.width - w) / 2))}px`;
    win.style.top = `${Math.max(0, Math.round((dr.height - h) / 2))}px`;
    applyWinMaxFromDesktop(win);
  }

  /** Game Library — geniş pencere (Steam hissi) */
  const LIB_W_FRAC = 0.88;
  const LIB_H_FRAC = 0.9;

  function layoutLibraryWindow(win) {
    const dr = desktop.getBoundingClientRect();
    const w = Math.max(520, Math.min(Math.round(dr.width * LIB_W_FRAC), dr.width - 6));
    const h = Math.max(380, Math.min(Math.round(dr.height * LIB_H_FRAC), dr.height - 8));
    win.style.width = `${w}px`;
    win.style.height = `${h}px`;
    win.style.left = `${Math.max(0, Math.round((dr.width - w) / 2))}px`;
    win.style.top = `${Math.max(0, Math.round((dr.height - h) / 2))}px`;
    applyWinMaxFromDesktop(win);
  }

  /** Oyun oynatma — ayrı pencere */
  const GAMEPLAY_W_FRAC = 0.72;
  const GAMEPLAY_H_FRAC = 0.78;

  function layoutGamePlayWindow(win) {
    const dr = desktop.getBoundingClientRect();
    const w = Math.max(320, Math.min(Math.round(dr.width * GAMEPLAY_W_FRAC), dr.width - 6));
    const h = Math.max(260, Math.min(Math.round(dr.height * GAMEPLAY_H_FRAC), dr.height - 8));
    win.style.width = `${w}px`;
    win.style.height = `${h}px`;
    win.style.left = `${Math.max(0, Math.round((dr.width - w) / 2))}px`;
    win.style.top = `${Math.max(0, Math.round((dr.height - h) / 2))}px`;
    applyWinMaxFromDesktop(win);
  }

  function spawnWidth(appId) {
    const dr = desktop.getBoundingClientRect();
    const frac = APP_WIDTH_FRAC[appId] ?? 0.4;
    const cap = APP_WIDTH_MAX[appId] ?? 440;
    const raw = Math.round(dr.width * frac);
    return Math.max(MIN_W, Math.min(raw, cap, Math.floor(dr.width) - 6));
  }

  const MAX_MARGIN = 6;

  function setMaxButtonState(btn, maximized) {
    if (!btn) return;
    btn.dataset.gchuMax = maximized ? "1" : "0";
    btn.textContent = maximized ? "⧉" : "□";
    const restore = winChromeStr("wm_win_restore", "Restore previous size");
    const fill = winChromeStr("wm_win_maximize", "Fill desktop");
    btn.title = maximized ? restore : fill;
    btn.setAttribute("aria-label", maximized ? restore : fill);
    btn.setAttribute("aria-pressed", maximized ? "true" : "false");
  }

  function syncMaxButton(win) {
    setMaxButtonState(win.querySelector(".gchu-window__max"), win.classList.contains("gchu-window--max"));
  }

  function applyWindowChromeToWin(win) {
    if (!win) return;
    syncMaxButton(win);
    const closeBtn = win.querySelector(".gchu-window__close");
    if (closeBtn) closeBtn.setAttribute("aria-label", winChromeStr("wm_close", "Close"));
    const res = win.querySelector(".gchu-window__resize");
    if (res) res.setAttribute("title", winChromeStr("wm_resize", "Resize"));
  }

  function refreshWindowChrome() {
    desktop.querySelectorAll(".gchu-window").forEach((w) => applyWindowChromeToWin(w));
  }

  function applyMaximizedGeometry(win) {
    const dr = desktop.getBoundingClientRect();
    const m = MAX_MARGIN;
    win.style.left = `${m}px`;
    win.style.top = `${m}px`;
    win.style.width = `${Math.max(MIN_W, Math.round(dr.width - m * 2))}px`;
    win.style.height = `${Math.max(MIN_H, Math.round(dr.height - m * 2))}px`;
    win.classList.add("gchu-window--fixed-h", "gchu-window--max");
    applyWinMaxFromDesktop(win);
  }

  function toggleMaximize(win) {
    if (!desktop.contains(win)) return;
    if (win.classList.contains("gchu-window--max")) {
      const r = win._gchuRestoreGeom;
      win.classList.remove("gchu-window--max");
      delete win._gchuRestoreGeom;
      if (win.dataset.gchuMusicLayout === "1") layoutMusicWindow(win);
      else if (win.dataset.gchuAlarmLayout === "1") layoutAlarmWindow(win);
      else if (win.dataset.gchuLibraryLayout === "1") layoutLibraryWindow(win);
      else if (win.dataset.gchuGameplayLayout === "1") layoutGamePlayWindow(win);
      else if (r) {
        win.style.left = r.left;
        win.style.top = r.top;
        win.style.width = r.width;
        if (r.height) win.style.height = r.height;
        else win.style.height = "";
        if (r.fixedH) win.classList.add("gchu-window--fixed-h");
        else win.classList.remove("gchu-window--fixed-h");
      } else {
        clampWinToDesktop(win);
      }
      applyWinMaxFromDesktop(win);
      syncMaxButton(win);
      return;
    }
    win._gchuRestoreGeom = {
      left: `${Math.round(win.offsetLeft)}px`,
      top: `${Math.round(win.offsetTop)}px`,
      width: `${Math.round(Math.max(MIN_W, win.offsetWidth))}px`,
      fixedH: win.classList.contains("gchu-window--fixed-h"),
    };
    const autoH =
      !win.classList.contains("gchu-window--fixed-h") &&
      (!win.style.height || win.style.height === "auto");
    win._gchuRestoreGeom.height = autoH ? null : `${Math.round(Math.max(MIN_H, win.offsetHeight))}px`;
    applyMaximizedGeometry(win);
    syncMaxButton(win);
  }

  function clampWinToDesktop(win) {
    if (win.classList.contains("gchu-window--max")) return;
    if (!desktop.contains(win)) return;
    const dr = desktop.getBoundingClientRect();
    let left = win.offsetLeft;
    let top = win.offsetTop;
    let w = Math.max(MIN_W, win.offsetWidth);
    let h = Math.max(MIN_H, win.offsetHeight);
    w = Math.min(w, dr.width);
    h = Math.min(h, dr.height);
    if (left + w > dr.width) left = Math.max(0, dr.width - w);
    if (top + h > dr.height) top = Math.max(0, dr.height - h);
    if (left < 0) left = 0;
    if (top < 0) top = 0;
    w = Math.min(w, dr.width - left);
    h = Math.min(h, dr.height - top);
    win.style.left = `${Math.round(left)}px`;
    win.style.top = `${Math.round(top)}px`;
    win.style.width = `${Math.round(Math.max(MIN_W, w))}px`;
    const hs = win.style.height;
    if (hs && hs !== "auto") {
      win.style.height = `${Math.round(Math.max(MIN_H, h))}px`;
    }
  }

  function ytEmbedFromLine(line) {
    const list = line.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    if (list) return `https://www.youtube.com/embed?listType=playlist&list=${list[1]}`;
    const m = line.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{6,})/);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
    return "";
  }

  function beepShort() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = 880;
      g.gain.value = 0.08;
      o.start();
      o.stop(ctx.currentTime + 0.25);
      setTimeout(() => ctx.close(), 400);
    } catch {
      /* ignore */
    }
  }

  /** İçerik kökü: .gchu-window__frame — ileride tam sayfa iframe buraya asılacak */
  function wireApp(appId, frameRoot, win) {
    const wp = () => document.querySelector(".wallpaper");

    if (appId === "welcome") {
      const loadMsg =
        typeof window.__gnuchanosT === "function"
          ? window.__gnuchanosT("wm_welcome_loading")
          : "Yükleniyor…";
      frameRoot.innerHTML =
        `<article class="gchu-welcome-body mono"><p class="shell-muted">${loadMsg}</p></article>`;
      const WELCOME_SRC = "./welcome-message.html";
      fetch(WELCOME_SRC, { cache: "no-store" })
        .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
        .then((txt) => {
          const doc = new DOMParser().parseFromString(txt, "text/html");
          const box = doc.getElementById("welcome-content");
          const inner = box ? box.innerHTML : doc.body.innerHTML;
          frameRoot.innerHTML = `<article class="gchu-welcome-body mono">${inner}</article>`;
        })
        .catch(() => {
          const errMsg =
            typeof window.__gnuchanosT === "function"
              ? window.__gnuchanosT("wm_welcome_err")
              : "welcome-message.html okunamadı.";
          frameRoot.innerHTML =
            `<article class="gchu-welcome-body mono"><p class="shell-muted">${errMsg}</p></article>`;
        });
      return;
    }

    if (appId === "pulse") {
      frameRoot.innerHTML =
        '<p class="shell-muted gchu-p-note"></p>' +
        '<label class="shell-field mono"><span class="gchu-p-vlab"></span> <span class="gchu-p-pct">100</span>%</label>' +
        '<input type="range" min="0" max="100" value="100" class="gchu-p-range" />';
      const range = frameRoot.querySelector(".gchu-p-range");
      const pct = frameRoot.querySelector(".gchu-p-pct");
      function pulseT(key, fb) {
        if (typeof window.__gnuchanosT === "function") {
          const s = window.__gnuchanosT(key);
          if (s != null && s !== "") return s;
        }
        return fb;
      }
      function applyPulseLocale() {
        const noteEl = frameRoot.querySelector(".gchu-p-note");
        if (noteEl) noteEl.textContent = pulseT("pulse_win_note", "Browser session: volume slider.");
        const vlab = frameRoot.querySelector(".gchu-p-vlab");
        if (vlab) vlab.textContent = pulseT("mp_vol", "Master volume");
      }
      applyPulseLocale();
      frameRoot._gchuPulseRefreshLocale = applyPulseLocale;
      const saved = localStorage.getItem(LS_VOL);
      if (saved != null && range && pct) {
        range.value = saved;
        pct.textContent = saved;
      }
      range?.addEventListener("input", () => {
        if (pct) pct.textContent = range.value;
        localStorage.setItem(LS_VOL, range.value);
      });
      return;
    }

    if (appId === "music") {
      frameRoot.innerHTML =
        typeof window.__gnuchanosMusicInnerHTML === "string"
          ? window.__gnuchanosMusicInnerHTML
          : `<div class="gchu-music-root"><p class="shell-muted mono">${
              typeof window.__gnuchanosT === "function"
                ? window.__gnuchanosT("music_load_err")
                : "Music UI could not be loaded."
            }</p></div>`;
      window.__gnuchanosMusicInitRoot?.(frameRoot);
      win.__gchuCleanup = () => {
        frameRoot._gchuMusicStop?.();
      };
      return;
    }

    if (appId === "library") {
      if (typeof window.__gnuchanosBuildGamesLibrary === "function") {
        window.__gnuchanosBuildGamesLibrary(frameRoot, win);
      } else {
        const miss =
          typeof window.__gnuchanosT === "function"
            ? window.__gnuchanosT("lib_js_missing")
            : "games-library.js did not load — Game Library is unavailable.";
        frameRoot.innerHTML = `<p class="shell-muted mono">${miss}</p>`;
      }
      win.__gchuCleanup = () => {
        frameRoot._gchuLibAbort?.();
      };
      return;
    }

    if (appId === "wall") {
      win.classList.add("gchu-window--wall");
      function W(key, fb) {
        if (typeof window.__gnuchanosT === "function") {
          const s = window.__gnuchanosT(key);
          if (s) return s;
        }
        return fb;
      }
      const ariaTabs = JSON.stringify(W("wall_win_tablist_aria", "Duvar kağıdı"));
      frameRoot.innerHTML =
        '<div class="gchu-wall mono">' +
        '<div class="gchu-tabs" role="tablist" aria-label=' +
        ariaTabs +
        ">" +
        '<button type="button" role="tab" class="gchu-tab gchu-tab--active" data-gchu-tab="ready" aria-selected="true">' +
        W("wall_win_tab_ready", "Hazır duvar kağıtları") +
        "</button>" +
        '<button type="button" role="tab" class="gchu-tab" data-gchu-tab="manual" aria-selected="false">' +
        W("wall_win_tab_manual", "Manuel ekle") +
        "</button>" +
        "</div>" +
        '<div class="gchu-tabpanels">' +
        '<div class="gchu-tabpanel" role="tabpanel" data-gchu-panel="ready">' +
        '<p class="shell-muted gchu-wall-hint">' +
        W("wall_win_ready_hint", "Listeden birine tıkla — kaydırarak tüm önayarları gör.") +
        "</p>" +
        '<ul class="gchu-wall-list"></ul>' +
        "</div>" +
        '<div class="gchu-tabpanel" role="tabpanel" data-gchu-panel="manual" hidden>' +
        "<p class=\"shell-muted\">" +
        W("wall_win_manual_hint", "Dosya veya görsel URL ile kendi duvar kağıdını ekle.") +
        "</p>" +
        '<label class="shell-field mono">' +
        W("mw_file_l", "Görsel dosyası") +
        "</label>" +
        '<div class="shell-file-wrap">' +
        '<div class="shell-file-trigger">' +
        '<input type="file" class="shell-file-input gchu-wall-file" accept="image/*" />' +
        '<span class="shell-btn shell-btn--ghost mono shell-file-fake">' +
        W("mw_file_btn", "Dosya seç…") +
        "</span>" +
        "</div>" +
        '<span class="shell-file-status mono gchu-wall-file-label" aria-live="polite">' +
        W("mw_file_st", "Henüz dosya seçilmedi") +
        "</span>" +
        "</div>" +
        '<label class="shell-field mono">' +
        W("mw_url_l", "Görsel URL") +
        "</label>" +
        '<input type="url" class="shell-input mono gchu-wall-url" placeholder="https://…" />' +
        '<p class="shell-muted mono gchu-wall-url-hint" aria-live="polite" hidden></p>' +
        '<div class="shell-row">' +
        '<button type="button" class="shell-btn mono gchu-wall-url-go">' +
        W("mw_apply", "URL uygula") +
        "</button>" +
        '<button type="button" class="shell-btn shell-btn--ghost mono gchu-wall-clear">' +
        W("mw_clear", "Özel temizle") +
        "</button>" +
        "</div>" +
        "</div>" +
        "</div>" +
        "</div>";

      let blobUrl = null;
      function revokeBlob() {
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
          blobUrl = null;
        }
      }
      win.__gchuCleanup = revokeBlob;

      const presetById = new Map(WALL_READY_PRESETS.map((p) => [p.id, p]));

      function applyReadyPreset(p) {
        const el = wp();
        if (!el || !p) return;
        revokeBlob();
        el.className = "wallpaper";
        if (p.kind === "default") el.style.backgroundImage = "";
        else if (p.kind === "svg") el.style.backgroundImage = WALL_STACK_SVG;
        else if (p.kind === "css") el.style.backgroundImage = p.css;
      }

      const ul = frameRoot.querySelector(".gchu-wall-list");
      WALL_READY_PRESETS.forEach((p, idx) => {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "gchu-wall-item mono";
        btn.dataset.wallReady = p.id;
        btn.textContent = `${idx + 1}. ${p.label}`;
        if (p.kind === "default") btn.classList.add("gchu-wall-item--bare");
        else if (p.kind === "svg") {
          btn.style.backgroundImage = WALL_STACK_SVG;
          btn.style.backgroundSize = "cover";
          btn.style.backgroundPosition = "center";
        } else if (p.kind === "css") {
          btn.style.backgroundImage = p.css;
          btn.style.backgroundSize = "cover";
          btn.style.backgroundPosition = "center";
        }
        btn.addEventListener("click", () => applyReadyPreset(presetById.get(p.id)));
        li.appendChild(btn);
        ul.appendChild(li);
      });

      const tabs = frameRoot.querySelectorAll(".gchu-tab");
      const panels = frameRoot.querySelectorAll("[data-gchu-panel]");
      function showTab(name) {
        tabs.forEach((t) => {
          const on = t.dataset.gchuTab === name;
          t.classList.toggle("gchu-tab--active", on);
          t.setAttribute("aria-selected", on ? "true" : "false");
        });
        panels.forEach((p) => {
          p.hidden = p.dataset.gchuPanel !== name;
        });
      }
      tabs.forEach((t) => {
        t.addEventListener("click", () => showTab(t.dataset.gchuTab));
      });

      const fileInput = frameRoot.querySelector(".gchu-wall-file");
      const fileStatus = frameRoot.querySelector(".gchu-wall-file-label");

      function refreshWallLocale() {
        const T = window.__gnuchanosT;
        if (typeof T !== "function") return;
        const tabsEl = frameRoot.querySelector(".gchu-tabs");
        if (tabsEl) tabsEl.setAttribute("aria-label", T("wall_win_tablist_aria"));
        const tr = frameRoot.querySelector('.gchu-tab[data-gchu-tab="ready"]');
        const tm = frameRoot.querySelector('.gchu-tab[data-gchu-tab="manual"]');
        if (tr) tr.textContent = T("wall_win_tab_ready");
        if (tm) tm.textContent = T("wall_win_tab_manual");
        const hint = frameRoot.querySelector(".gchu-wall-hint");
        if (hint) hint.textContent = T("wall_win_ready_hint");
        const manualPanel = frameRoot.querySelector('[data-gchu-panel="manual"]');
        if (manualPanel) {
          const mp = manualPanel.querySelector("p.shell-muted");
          if (mp) mp.textContent = T("wall_win_manual_hint");
          const labels = manualPanel.querySelectorAll("label.shell-field");
          if (labels[0]) labels[0].textContent = T("mw_file_l");
          if (labels[1]) labels[1].textContent = T("mw_url_l");
          const fake = manualPanel.querySelector(".shell-file-fake");
          if (fake) fake.textContent = T("mw_file_btn");
          const go = manualPanel.querySelector(".gchu-wall-url-go");
          if (go) go.textContent = T("mw_apply");
          const clr = manualPanel.querySelector(".gchu-wall-clear");
          if (clr) clr.textContent = T("mw_clear");
          const urlIn = manualPanel.querySelector(".gchu-wall-url");
          if (urlIn) urlIn.placeholder = T("mw_url_ph");
          const urlHint = manualPanel.querySelector(".gchu-wall-url-hint");
          if (urlHint?.dataset.gchuUrlErr === "1") urlHint.textContent = T("mw_url_https_err");
        }
        const fin = fileInput?.files?.[0];
        if (fileStatus && !fin) fileStatus.textContent = T("mw_file_st");
      }
      frameRoot._gchuWallRefreshLocale = refreshWallLocale;

      function noFileStatusText() {
        return typeof window.__gnuchanosT === "function"
          ? window.__gnuchanosT("mw_file_st")
          : "Henüz dosya seçilmedi";
      }
      function clearWallUrlHintEl() {
        const h = frameRoot.querySelector(".gchu-wall-url-hint");
        if (h) {
          h.hidden = true;
          h.textContent = "";
          delete h.dataset.gchuUrlErr;
        }
      }
      function showWallUrlHintEl() {
        const Tfn = typeof window.__gnuchanosT === "function" ? window.__gnuchanosT : null;
        const h = frameRoot.querySelector(".gchu-wall-url-hint");
        if (!h) return;
        h.hidden = false;
        h.textContent = Tfn
          ? Tfn("mw_url_https_err")
          : "Only https:// image URLs are accepted.";
        h.dataset.gchuUrlErr = "1";
      }

      frameRoot.querySelector(".gchu-wall-url")?.addEventListener("input", clearWallUrlHintEl);

      fileInput?.addEventListener("change", (e) => {
        const f = e.target.files?.[0];
        if (fileStatus) fileStatus.textContent = f ? f.name : noFileStatusText();
        const el = wp();
        if (!el || !f) return;
        revokeBlob();
        blobUrl = URL.createObjectURL(f);
        el.className = "wallpaper";
        el.style.backgroundImage = `${WALL_STACK_GRAD}, url("${blobUrl}")`;
      });
      frameRoot.querySelector(".gchu-wall-url-go")?.addEventListener("click", () => {
        const el = wp();
        const urlEl = frameRoot.querySelector(".gchu-wall-url");
        const u = urlEl?.value?.trim();
        if (!el) return;
        if (!u) {
          clearWallUrlHintEl();
          return;
        }
        if (!/^https:\/\//i.test(u)) {
          showWallUrlHintEl();
          return;
        }
        clearWallUrlHintEl();
        revokeBlob();
        el.className = "wallpaper";
        el.style.backgroundImage = `${WALL_STACK_GRAD}, url("${u}")`;
      });
      frameRoot.querySelector(".gchu-wall-clear")?.addEventListener("click", () => {
        applyReadyPreset(presetById.get("def"));
        if (fileInput) fileInput.value = "";
        const urlEl = frameRoot.querySelector(".gchu-wall-url");
        if (urlEl) urlEl.value = "";
        clearWallUrlHintEl();
        if (fileStatus) fileStatus.textContent = noFileStatusText();
      });
      return;
    }

    if (appId === "editor") {
      frameRoot.innerHTML =
        '<textarea class="shell-textarea shell-textarea--tall mono gchu-ed" rows="6"></textarea>' +
        '<div class="shell-row">' +
        '<button type="button" class="shell-btn mono gchu-ed-save"></button>' +
        '<span class="shell-muted mono gchu-ed-st"></span>' +
        "</div>";
      const ta = frameRoot.querySelector(".gchu-ed");
      const st = frameRoot.querySelector(".gchu-ed-st");
      function edT(key, fb) {
        if (typeof window.__gnuchanosT === "function") {
          const s = window.__gnuchanosT(key);
          if (s != null && s !== "") return s;
        }
        return fb;
      }
      function applyEditorLocale() {
        if (ta) ta.placeholder = edT("me_ph", "Notes…");
        const saveBtn = frameRoot.querySelector(".gchu-ed-save");
        if (saveBtn) saveBtn.textContent = edT("me_save", "Save");
      }
      applyEditorLocale();
      frameRoot._gchuEditorRefreshLocale = applyEditorLocale;
      const saved = localStorage.getItem(LS_EDITOR);
      if (saved && ta) ta.value = saved;
      frameRoot.querySelector(".gchu-ed-save")?.addEventListener("click", () => {
        if (ta) {
          localStorage.setItem(LS_EDITOR, ta.value);
          if (st) st.textContent = edT("me_saved", "Saved.");
        }
      });
      return;
    }

    if (appId === "calc") {
      frameRoot.innerHTML =
        '<input type="text" class="shell-input shell-input--calc mono gchu-c-disp" readonly value="" />' +
        '<div class="calc-grid mono gchu-c-grid"></div>';
      const grid = frameRoot.querySelector(".gchu-c-grid");
      const disp = frameRoot.querySelector(".gchu-c-disp");
      function calcStr(key, fb) {
        if (typeof window.__gnuchanosT === "function") {
          const s = window.__gnuchanosT(key, {});
          if (s != null && s !== "") return s;
        }
        return fb;
      }
      let expr = "";
      let showingEvalErr = false;
      const keys = ["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "0", ".", "+", "=", "C"];
      keys.forEach((k) => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = k;
        b.addEventListener("click", () => {
          if (k === "C") {
            expr = "";
            showingEvalErr = false;
          } else if (k === "=") {
            const clean = expr.replace(/\s/g, "");
            if (/^[0-9+\-*/.]+$/.test(clean) && clean.length <= 80) {
              try {
                expr = String(Function(`"use strict"; return (${clean})`)());
                showingEvalErr = false;
              } catch {
                expr = calcStr("mc_eval_err", "Err");
                showingEvalErr = true;
              }
            } else {
              expr = calcStr("mc_eval_err", "Err");
              showingEvalErr = true;
            }
          } else {
            if (showingEvalErr) {
              expr = k;
              showingEvalErr = false;
            } else {
              expr += k;
            }
          }
          if (disp) disp.value = expr;
        });
        grid.appendChild(b);
      });
      function refreshCalcLocale() {
        if (showingEvalErr && disp) disp.value = calcStr("mc_eval_err", "Err");
      }
      frameRoot._gchuCalcRefreshLocale = refreshCalcLocale;
      return;
    }

    if (appId === "alarm") {
      frameRoot.innerHTML =
        typeof window.__gnuchanosAlarmInnerHTML === "string"
          ? window.__gnuchanosAlarmInnerHTML
          : '<div class="gchu-alarm-root"><p class="shell-muted mono">' +
            (typeof window.__gnuchanosT === "function"
              ? window.__gnuchanosT("alarm_load_err")
              : "Alarm UI could not be loaded.") +
            "</p></div>";
      window.__gnuchanosAlarmInitRoot?.(frameRoot);
      win.__gchuCleanup = () => {
        frameRoot._gchuAlarmStop?.();
      };
      return;
    }

    if (appId === "timer") {
      frameRoot.innerHTML =
        '<p class="shell-muted gchu-t-hint"></p>' +
        '<p class="shell-display mono gchu-t-d">00:00.00</p>' +
        '<div class="shell-row">' +
        '<button type="button" class="shell-btn mono gchu-t-go"></button>' +
        '<button type="button" class="shell-btn shell-btn--ghost mono gchu-t-lap"></button>' +
        '<button type="button" class="shell-btn shell-btn--ghost mono gchu-t-reset"></button>' +
        "</div>" +
        '<ol class="shell-laps mono gchu-t-laps"></ol>';
      const dEl = frameRoot.querySelector(".gchu-t-d");
      const lapsEl = frameRoot.querySelector(".gchu-t-laps");
      function mtT(key, fb) {
        if (typeof window.__gnuchanosT === "function") {
          const s = window.__gnuchanosT(key);
          if (s != null && s !== "") return s;
        }
        return fb;
      }
      function applyTimerLocale() {
        const hint = frameRoot.querySelector(".gchu-t-hint");
        if (hint) hint.textContent = mtT("mt_note", "Stopwatch: lap log.");
        const goBtn = frameRoot.querySelector(".gchu-t-go");
        if (goBtn) goBtn.textContent = mtT("mt_go", "Start / Pause");
        const lapBtn = frameRoot.querySelector(".gchu-t-lap");
        if (lapBtn) lapBtn.textContent = mtT("mt_lap", "Lap");
        const resetBtn = frameRoot.querySelector(".gchu-t-reset");
        if (resetBtn) resetBtn.textContent = mtT("mt_reset", "Reset");
      }
      applyTimerLocale();
      frameRoot._gchuTimerRefreshLocale = applyTimerLocale;
      let running = false;
      let baseMs = 0;
      let startAt = 0;
      let raf = 0;

      function fmt(ms) {
        const t = Math.max(0, ms);
        const cs = Math.floor((t % 1000) / 10);
        const s = Math.floor(t / 1000) % 60;
        const m = Math.floor(t / 60000) % 60;
        const h = Math.floor(t / 3600000);
        const pad = (n, l) => String(n).padStart(l, "0");
        if (h > 0) return `${h}:${pad(m, 2)}:${pad(s, 2)}.${pad(cs, 2)}`;
        return `${pad(m, 2)}:${pad(s, 2)}.${pad(cs, 2)}`;
      }

      function nowElapsed() {
        if (!running) return baseMs;
        return baseMs + (performance.now() - startAt);
      }

      function loop() {
        if (dEl) dEl.textContent = fmt(nowElapsed());
        if (running) raf = requestAnimationFrame(loop);
      }

      function stopLoop() {
        cancelAnimationFrame(raf);
        raf = 0;
      }

      frameRoot.querySelector(".gchu-t-go")?.addEventListener("click", () => {
        if (!running) {
          running = true;
          startAt = performance.now();
          loop();
        } else {
          baseMs = nowElapsed();
          running = false;
          stopLoop();
          if (dEl) dEl.textContent = fmt(baseMs);
        }
      });
      frameRoot.querySelector(".gchu-t-lap")?.addEventListener("click", () => {
        const li = document.createElement("li");
        li.textContent = fmt(nowElapsed());
        lapsEl?.appendChild(li);
      });
      frameRoot.querySelector(".gchu-t-reset")?.addEventListener("click", () => {
        running = false;
        stopLoop();
        baseMs = 0;
        startAt = 0;
        if (dEl) dEl.textContent = fmt(0);
        if (lapsEl) lapsEl.innerHTML = "";
      });
      win.__gchuCleanup = stopLoop;
    }
  }

  window.__gnuchanosSpawnIframePlayWindow = function spawnIframePlayWindow(url, gameTitle) {
    if (!url || !desktop) return null;
    const safe = typeof url === "string" && /^https?:\/\//i.test(url.trim()) ? url.trim() : null;
    if (!safe) return null;

    const existingPlay = desktop.querySelector('.gchu-window[data-gchu-app-id="gameplay"]');
    if (existingPlay && desktop.contains(existingPlay)) {
      const frameRoot = existingPlay.querySelector("[data-gchu-frame]");
      const iframe = frameRoot?.querySelector(".gchu-gameplay-if");
      const drag = existingPlay.querySelector(".gchu-window__drag");
      const t = gameTitle != null ? String(gameTitle) : "";
      const gFallback =
        typeof window.__gnuchanosT === "function" ? window.__gnuchanosT("wm_game_fallback") : "Oyun";
      if (iframe) {
        iframe.src = safe;
        iframe.title = t ? t.slice(0, 80) : gFallback;
      }
      if (drag) {
        drag.textContent = t ? t.slice(0, 52) : gFallback;
        drag.title = resolvedDragHint();
      }
      bringAppWindowToFront(existingPlay);
      applyWinMaxFromDesktop(existingPlay);
      layoutGamePlayWindow(existingPlay);
      return existingPlay;
    }

    const win = document.createElement("div");
    win.className = "gchu-window glass gchu-window--fixed-h gchu-window--gameplay";
    win.dataset.gchuAppId = "gameplay";
    win.dataset.gchuGameplayLayout = "1";
    win.innerHTML =
      '<div class="gchu-window__titlebar mono">' +
      '<div class="gchu-window__drag"></div>' +
      '<button type="button" class="gchu-window__max" aria-pressed="false" aria-label="Fill desktop" title="Fill desktop">□</button>' +
      '<button type="button" class="gchu-window__close" aria-label="Close">×</button>' +
      "</div>" +
      '<div class="gchu-window__body mono">' +
      '<div class="gchu-window__frame" data-gchu-frame></div>' +
      "</div>" +
      '<div class="gchu-window__resize" aria-hidden="true" title="Resize"></div>';
    const drag = win.querySelector(".gchu-window__drag");
    const t = gameTitle != null ? String(gameTitle) : "";
    const gFallback =
      typeof window.__gnuchanosT === "function" ? window.__gnuchanosT("wm_game_fallback") : "Oyun";
    drag.textContent = t ? t.slice(0, 52) : gFallback;
    drag.title = resolvedDragHint();
    const frameRoot = win.querySelector("[data-gchu-frame]");
    if (!frameRoot) return null;
    applyWinMaxFromDesktop(win);
    layoutGamePlayWindow(win);
    frameRoot.innerHTML =
      '<div class="gchu-gameplay">' +
      '<div class="gchu-embed gchu-embed--gameplay"><iframe class="gchu-gameplay-if" title="" allowfullscreen allow="fullscreen; autoplay; encrypted-media; picture-in-picture; clipboard-write"></iframe></div>' +
      "</div>";
    const iframe = frameRoot.querySelector(".gchu-gameplay-if");
    iframe.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
    iframe.title = t ? t.slice(0, 80) : gFallback;
    iframe.src = safe;
    assignWindowWorkspace(win);
    desktop.appendChild(win);
    win.classList.add("gchu-window--spawn");
    const endSpawn = () => win.classList.remove("gchu-window--spawn");
    win.addEventListener("animationend", endSpawn, { once: true });
    window.setTimeout(endSpawn, 320);
    attachWindowControls(win);
    focusWin(win);
    applyWinMaxFromDesktop(win);
    return win;
  };

  window.__gnuchanosSpawnAppWindow = function spawnAppWindow(appId) {
    const title = APP_TITLES[appId];
    if (!title) return;

    const existing = desktop.querySelector(`[data-gchu-app-id="${appId}"]`);
    if (existing && desktop.contains(existing)) {
      bringAppWindowToFront(existing);
      return;
    }

    const win = document.createElement("div");
    win.dataset.gchuAppId = appId;
    win.className = "gchu-window glass";
    win.innerHTML =
      '<div class="gchu-window__titlebar mono">' +
      '<div class="gchu-window__drag"></div>' +
      '<button type="button" class="gchu-window__max" aria-pressed="false" aria-label="Fill desktop" title="Fill desktop">□</button>' +
      '<button type="button" class="gchu-window__close" aria-label="Close">×</button>' +
      "</div>" +
      '<div class="gchu-window__body mono">' +
      '<div class="gchu-window__frame" data-gchu-frame></div>' +
      "</div>" +
      '<div class="gchu-window__resize" aria-hidden="true" title="Resize"></div>';

    const drag = win.querySelector(".gchu-window__drag");
    drag.textContent = resolvedAppWindowTitle(appId);
    drag.title = resolvedDragHint();
    const frameRoot = win.querySelector("[data-gchu-frame]");
    if (!frameRoot) return;
    applyWinMaxFromDesktop(win);

    if (appId === "music") {
      win.dataset.gchuMusicLayout = "1";
      win.classList.add("gchu-window--music", "gchu-window--fixed-h");
      layoutMusicWindow(win);
    } else if (appId === "alarm") {
      win.dataset.gchuAlarmLayout = "1";
      win.classList.add("gchu-window--alarm", "gchu-window--fixed-h");
      layoutAlarmWindow(win);
    } else if (appId === "library") {
      win.dataset.gchuLibraryLayout = "1";
      win.classList.add("gchu-window--library", "gchu-window--fixed-h");
      layoutLibraryWindow(win);
    } else {
      const w = spawnWidth(appId);
      win.style.width = `${w}px`;
      win.style.height = "auto";
      const { left, top } = staggerPosition();
      win.style.left = `${left}px`;
      win.style.top = `${top}px`;
    }

    assignWindowWorkspace(win);
    desktop.appendChild(win);
    win.classList.add("gchu-window--spawn");
    const endSpawnApp = () => win.classList.remove("gchu-window--spawn");
    win.addEventListener("animationend", endSpawnApp, { once: true });
    window.setTimeout(endSpawnApp, 320);
    attachWindowControls(win);
    wireApp(appId, frameRoot, win);
    focusWin(win);
    if (appId === "music" || appId === "alarm" || appId === "library") applyWinMaxFromDesktop(win);
    else clampWinToDesktop(win);
  };

  let resizeDebounce = 0;
  const deskObserver = new ResizeObserver(() => {
    clearTimeout(resizeDebounce);
    resizeDebounce = setTimeout(() => {
      desktop.querySelectorAll(".gchu-window").forEach((win) => {
        applyWinMaxFromDesktop(win);
        if (win.classList.contains("gchu-window--max")) {
          applyMaximizedGeometry(win);
          return;
        }
        if (win.dataset.gchuMusicLayout === "1") layoutMusicWindow(win);
        else if (win.dataset.gchuAlarmLayout === "1") layoutAlarmWindow(win);
        else if (win.dataset.gchuLibraryLayout === "1") layoutLibraryWindow(win);
        else if (win.dataset.gchuGameplayLayout === "1") layoutGamePlayWindow(win);
        else clampWinToDesktop(win);
      });
    }, 40);
  });
  deskObserver.observe(desktop);

  desktop.querySelectorAll(".gchu-window").forEach((win) => {
    applyWinMaxFromDesktop(win);
    clampWinToDesktop(win);
    attachWindowControls(win);
  });
  desktop.querySelectorAll(".gchu-window__drag").forEach((el) => {
    el.title = "Sürükleyin · çift tıklayınca büyüt / önceki boyut";
  });
  const first = desktop.querySelector(".gchu-window:not(.gchu-window--off-ws)");
  if (first) focusWin(first);

  /** @param {HTMLElement} win .gchu-window */
  window.__gnuchanosFrameRoot = function gnuchanosFrameRoot(win) {
    return win?.querySelector?.("[data-gchu-frame], .gchu-window__frame") ?? null;
  };

  window.__gnuchanosClearFrame = function gnuchanosClearFrame(win) {
    const el = window.__gnuchanosFrameRoot(win);
    if (el) el.innerHTML = "";
    return el;
  };

  /**
   * Gelecek: tek iframe ile frame kökünü doldurur (sandbox varsayılanı dar).
   * @param {{ title?: string, sandbox?: string, allow?: string }} [opts]
   * @returns {HTMLIFrameElement | null}
   */
  window.__gnuchanosAttachFrame = function gnuchanosAttachFrame(win, src, opts) {
    const root = window.__gnuchanosClearFrame(win);
    if (!root || !src) return null;
    const iframe = document.createElement("iframe");
    iframe.className = "gchu-window__iframe";
    iframe.src = src;
    iframe.title = opts?.title ?? "Gömülü içerik";
    iframe.setAttribute("sandbox", opts?.sandbox ?? "allow-scripts allow-same-origin");
    if (opts?.allow) iframe.setAttribute("allow", opts.allow);
    root.appendChild(iframe);
    return iframe;
  };

  window.__gnuchanosSpawnAppWindow("welcome");
  refreshAppWindowTitles();
  if (!desktop.dataset.gchuActiveWs) desktop.dataset.gchuActiveWs = "1";
  if (!desktop.dataset.gchuWsCount) desktop.dataset.gchuWsCount = "4";
  applyWorkspaceVisibility();
})();
