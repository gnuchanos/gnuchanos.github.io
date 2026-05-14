const clockEl = document.getElementById("clock");
const shortcutsEl = document.getElementById("shortcuts-panel");
const statTemp = document.getElementById("stat-temp");
const statCpu = document.getElementById("stat-cpu");
const statRam = document.getElementById("stat-ram");
const statRamTotal = document.getElementById("stat-ram-total");
const statUp = document.getElementById("stat-up");
const statDown = document.getElementById("stat-down");
const barCenter = document.getElementById("bar-center");
const wsTitle = document.getElementById("ws-title");
const wsDots = document.getElementById("ws-dots");
const launcherEl = document.getElementById("launcher");
const launcherInput = document.getElementById("launcher-input");
const launcherList = document.getElementById("launcher-list");

/** Varsayılan panel + launcher (gnuchanos.json ile üzerine yazılır) */
const defaultGnuchanos = {
  version: 1,
  panel: {
    centerTitle: "| Gnu-Linux My Life |",
    workspace: { active: 1, count: 4, labelPrefix: "WorkStation" },
    stats: {
      temp: 20,
      tempMax: 100,
      cpuGhz: 1.0,
      cpuMaxGhz: 3.9,
      ramMb: 115.0,
      ramTotalMb: 6192,
      netUp: 3.0,
      netDown: 4.0,
    },
  },
  launcher: {
    items: [
      { id: "pulse", label: "PulseAudio", hint: "ALT+P" },
      { id: "music", label: "Music Player", hint: "ALT+M" },
      { id: "library", label: "Game Library", hint: "ALT+G" },
      { id: "wall", label: "Wallpaper Manager", hint: "ALT+W" },
      { id: "editor", label: "Text Editor", hint: "ALT+T" },
      { id: "calc", label: "Calculator", hint: "ALT+C" },
      { id: "alarm", label: "Alarm", hint: "ALT+A" },
      { id: "timer", label: "TIMER", hint: "ALT+SHIFT+T" },
    ],
  },
};

let gnuchanos =
  typeof structuredClone === "function"
    ? structuredClone(defaultGnuchanos)
    : JSON.parse(JSON.stringify(defaultGnuchanos));
let launcherSelected = 0;
let launcherOpen = false;

const LAUNCHER_I18N_MAP = {
  pulse: "sh_pulse",
  music: "sh_music",
  library: "sh_library",
  wall: "sh_wall",
  editor: "sh_editor",
  calc: "sh_calc",
  alarm: "sh_alarm",
  timer: "sh_timer",
};

function launcherItemDisplayLabel(item) {
  const key = LAUNCHER_I18N_MAP[item.id];
  if (key && typeof window.__gnuchanosT === "function") return window.__gnuchanosT(key);
  return item.label;
}

function formatClock(d) {
  const loc =
    typeof window.__gnuchanosClockLocale === "function" ? window.__gnuchanosClockLocale() : "tr-TR";
  const weekday = d.toLocaleDateString(loc, { weekday: "long" });
  const month = d.toLocaleDateString(loc, { month: "long" });
  const day = d.getDate();
  const year = d.getFullYear();
  const time = d.toLocaleTimeString(loc, { hour12: false });
  return `${weekday} ${day} ${month} ${year} | ${time}`;
}

function tickClock() {
  if (!clockEl) return;
  const now = new Date();
  clockEl.dateTime = now.toISOString();
  clockEl.textContent = formatClock(now);
}

function jitterAround(el, base, delta, decimals) {
  if (!el) return;
  const v = base + (Math.random() - 0.5) * delta;
  el.textContent = v.toFixed(decimals);
}

function tickStats() {
  const s = gnuchanos.panel.stats;
  jitterAround(statTemp, s.temp, 2, 1);
  jitterAround(statCpu, s.cpuGhz, 0.15, 1);
  jitterAround(statRam, s.ramMb, 8, 1);
  jitterAround(statUp, s.netUp, 0.8, 1);
  jitterAround(statDown, s.netDown, 1.2, 1);
}

function applyPanel() {
  const p = gnuchanos.panel;
  if (barCenter) barCenter.textContent = p.centerTitle;
  if (statRamTotal) statRamTotal.textContent = String(p.stats.ramTotalMb);
  applyWorkspace(p.workspace.active, p.workspace.count, p.workspace.labelPrefix);
}

function applyWorkspace(active, count, labelPrefix) {
  const max = Math.max(1, Math.min(12, Number(count) || 4));
  const a = Math.max(1, Math.min(max, Number(active) || 1));
  gnuchanos.panel.workspace = { active: a, count: max, labelPrefix };
  if (wsTitle) wsTitle.textContent = `${labelPrefix} ${a}`;
  if (!wsDots) return;
  wsDots.innerHTML = "";
  for (let i = 1; i <= max; i += 1) {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "ws-dot" + (i === a ? " ws-dot--on" : "");
    dot.setAttribute(
      "aria-label",
      typeof window.__gnuchanosT === "function"
        ? window.__gnuchanosT("ws_dot_aria", { n: String(i) })
        : `Workspace ${i}`,
    );
    dot.title = `${labelPrefix} ${i}`;
    dot.addEventListener("click", () => applyWorkspace(i, max, labelPrefix));
    wsDots.appendChild(dot);
  }
  if (typeof window.__gnuchanosSyncWorkspace === "function") {
    window.__gnuchanosSyncWorkspace(a, max);
  }
}

function toggleShortcuts() {
  if (!shortcutsEl) return;
  shortcutsEl.classList.toggle("is-hidden");
}

function setLauncherOpen(open) {
  launcherOpen = open;
  if (!launcherEl || !launcherInput) return;
  launcherEl.classList.toggle("is-hidden", !open);
  launcherEl.setAttribute("aria-hidden", open ? "false" : "true");
  if (open) {
    launcherSelected = 0;
    launcherInput.value = "";
    renderLauncherList();
    requestAnimationFrame(() => launcherInput.focus());
  }
}

function filteredLauncherItems() {
  const q = (launcherInput?.value ?? "").trim().toLowerCase();
  const items = gnuchanos.launcher.items;
  if (!q) return items;
  return items.filter((it) => {
    const disp = launcherItemDisplayLabel(it).toLowerCase();
    return (
      disp.includes(q) ||
      it.label.toLowerCase().includes(q) ||
      it.id.toLowerCase().includes(q)
    );
  });
}

function renderLauncherList() {
  if (!launcherList) return;
  const items = filteredLauncherItems();
  launcherList.innerHTML = "";
  items.forEach((it, idx) => {
    const li = document.createElement("li");
    li.setAttribute("role", "option");
    li.setAttribute("aria-selected", idx === launcherSelected ? "true" : "false");
    li.dataset.id = it.id;
    const left = document.createElement("span");
    left.textContent = launcherItemDisplayLabel(it);
    const hint = document.createElement("span");
    hint.className = "launcher__hint";
    hint.textContent = it.hint ?? "";
    li.appendChild(left);
    li.appendChild(hint);
    li.addEventListener("mousedown", (e) => {
      e.preventDefault();
      launcherSelected = idx;
      renderLauncherList();
    });
    launcherList.appendChild(li);
  });
}

async function loadGnuchanosJson() {
  try {
    const res = await fetch("./gnuchanos.json", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    if (data && typeof data === "object" && data.panel && data.launcher) {
      gnuchanos = {
        ...defaultGnuchanos,
        ...data,
        panel: { ...defaultGnuchanos.panel, ...data.panel },
        launcher: { ...defaultGnuchanos.launcher, ...data.launcher },
      };
      if (data.panel.stats) gnuchanos.panel.stats = { ...defaultGnuchanos.panel.stats, ...data.panel.stats };
      if (data.panel.workspace) gnuchanos.panel.workspace = { ...defaultGnuchanos.panel.workspace, ...data.panel.workspace };
      if (Array.isArray(data.launcher.items)) gnuchanos.launcher.items = data.launcher.items;
    }
  } catch {
    /* file:// veya ağ yok */
  }
  applyPanel();
}

tickClock();
tickStats();
setInterval(tickClock, 1000);
setInterval(tickStats, 4000);

window.addEventListener("keydown", (e) => {
  if (e.key === "`" || e.code === "Backquote") {
    e.preventDefault();
    toggleShortcuts();
    return;
  }

  const launcherFocused = launcherOpen && document.activeElement === launcherInput;

  if (e.code === "Space" && e.altKey) {
    e.preventDefault();
    setLauncherOpen(!launcherOpen);
    return;
  }

  if (launcherOpen) {
    if (e.key === "Escape") {
      e.preventDefault();
      setLauncherOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const n = filteredLauncherItems().length;
      if (n === 0) return;
      launcherSelected = Math.min(n - 1, launcherSelected + 1);
      renderLauncherList();
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      launcherSelected = Math.max(0, launcherSelected - 1);
      renderLauncherList();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const items = filteredLauncherItems();
      const pick = items[launcherSelected];
      if (pick && typeof window.__gnuchanosOpenApp === "function") {
        window.__gnuchanosOpenApp(pick.id === "term" ? "editor" : pick.id);
      }
      setLauncherOpen(false);
      return;
    }
  }

  const target = e.target;
  const inEditable =
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

  const shellModalOpen = document.querySelector(".shell-modal:not(.is-hidden)") != null;

  if (
    !launcherFocused &&
    !launcherOpen &&
    !shellModalOpen &&
    !inEditable &&
    e.altKey &&
    !e.ctrlKey &&
    !e.metaKey &&
    !e.shiftKey &&
    /^[1-9]$/.test(e.key)
  ) {
    e.preventDefault();
    const n = Number(e.key);
    const { count, labelPrefix } = gnuchanos.panel.workspace;
    if (n < 1 || n > count) return;
    applyWorkspace(n, count, labelPrefix);
  }
});

if (launcherInput) {
  launcherInput.addEventListener("input", () => {
    launcherSelected = 0;
    renderLauncherList();
  });
}

loadGnuchanosJson().then(() => {
  tickStats();
});

window.addEventListener("gnuchanos-locale", () => {
  const w = gnuchanos.panel.workspace;
  applyWorkspace(w.active, w.count, w.labelPrefix);
  tickClock();
  if (launcherOpen) renderLauncherList();
});

applyWorkspace(
  gnuchanos.panel.workspace.active,
  gnuchanos.panel.workspace.count,
  gnuchanos.panel.workspace.labelPrefix,
);
