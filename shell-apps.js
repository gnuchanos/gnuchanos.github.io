(function gnuchanosShell() {
  const LS_MUSIC = "gnuchanos_music_urls";
  const LS_EDITOR = "gnuchanos_editor";
  const modalCalcState = { showingEvalErr: false };

  function i18nStr(key, vars, fb) {
    const v = vars && typeof vars === "object" && vars != null && !Array.isArray(vars) ? vars : {};
    if (typeof window.__gnuchanosT === "function") {
      const s = window.__gnuchanosT(key, v);
      if (s != null && s !== "") return s;
    }
    return fb != null ? String(fb) : key;
  }

  const MUSIC_PLAYER_HTML =
    '<div class="gchu-music-root">' +
    '<div class="gchu-m-stack">' +
    '<div class="gchu-m-chrome">' +
    '<div class="gchu-m-art-wrap">' +
    '<img class="gchu-m-art" alt="" width="160" height="160" decoding="async" />' +
    '<div class="gchu-m-art-fallback mono" aria-hidden="true">♪</div>' +
    "</div>" +
    '<div class="gchu-m-meta">' +
    '<div class="gchu-m-title mono">—</div>' +
    '<div class="gchu-m-artist mono">YouTube</div>' +
    "</div>" +
    '<div class="gchu-m-times mono"><span class="gchu-m-t-cur">0:00</span><span class="gchu-m-t-sep"> / </span><span class="gchu-m-t-tot">—:—</span></div>' +
    '<div class="gchu-m-scrub" aria-hidden="true"><div class="gchu-m-scrub-track"><div class="gchu-m-scrub-fill"></div></div></div>' +
    '<div class="gchu-m-transport">' +
    '<button type="button" class="shell-btn shell-btn--ghost mono gchu-m-shuf" aria-pressed="false" title="Karıştır">🔀</button>' +
    '<button type="button" class="shell-btn shell-btn--ghost mono gchu-m-prev" title="Önceki">«</button>' +
    '<button type="button" class="shell-btn mono gchu-m-pp" title="Duraklat / devam">⏸</button>' +
    '<button type="button" class="shell-btn shell-btn--ghost mono gchu-m-next" title="Sonraki">»</button>' +
    '<button type="button" class="shell-btn shell-btn--ghost mono gchu-m-rep" data-rep="0" title="Tekrar: kapalı">🔁</button>' +
    "</div>" +
    "</div>" +
    '<div class="gchu-embed"><iframe class="gchu-m-if" title="YouTube" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>' +
    "</div>" +
    '<p class="shell-muted mono gchu-m-hint">Kuyruk — satır başına bir YouTube linki (Text Editor’daki gibi altta kaydet).</p>' +
    '<textarea class="shell-textarea mono gchu-m-ta" rows="3" placeholder="https://www.youtube.com/watch?v=…"></textarea>' +
    '<div class="shell-row gchu-m-footer">' +
    '<button type="button" class="shell-btn mono gchu-m-play">Kaydet ve oynat</button>' +
    '<span class="shell-muted mono gchu-m-now"></span>' +
    "</div>" +
    "</div>";

  window.__gnuchanosMusicInnerHTML = MUSIC_PLAYER_HTML;

  function initMusicPlayerRoot(root) {
    if (!root || root.dataset.gchuMusicBound === "1") return;
    root.dataset.gchuMusicBound = "1";

    const ta = root.querySelector(".gchu-m-ta");
    const iframe = root.querySelector(".gchu-m-if");
    const now = root.querySelector(".gchu-m-now");
    const art = root.querySelector(".gchu-m-art");
    const artFb = root.querySelector(".gchu-m-art-fallback");
    const titleEl = root.querySelector(".gchu-m-title");
    const artistEl = root.querySelector(".gchu-m-artist");
    const tCur = root.querySelector(".gchu-m-t-cur");
    const tTot = root.querySelector(".gchu-m-t-tot");
    const scrubFill = root.querySelector(".gchu-m-scrub-fill");
    const embedWrap = root.querySelector(".gchu-embed");
    const ppBtn = root.querySelector(".gchu-m-pp");

    let lineIndex = 0;
    let repeatMode = 0;
    let shuffle = false;
    let fakeTimer = null;
    let uiPaused = false;
    let fakeElapsed = 0;
    const fakeDur = 215;

    function ytEmbedFromLine(line) {
      const list = line.match(/[?&]list=([a-zA-Z0-9_-]+)/);
      if (list) return `https://www.youtube.com/embed?listType=playlist&list=${list[1]}`;
      const m = line.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{6,})/);
      if (m) return `https://www.youtube.com/embed/${m[1]}`;
      return "";
    }

    function videoIdFromLine(line) {
      const m = (line || "").match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{6,})/);
      return m ? m[1] : "";
    }

    function isPlaylistLine(line) {
      return /[?&]list=([a-zA-Z0-9_-]+)/.test(line || "");
    }

    function lines() {
      return (ta?.value ?? "")
        .split(/\n/)
        .map((s) => s.trim())
        .filter(Boolean);
    }

    function formatTime(sec) {
      if (!isFinite(sec) || sec < 0) return "0:00";
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      return `${m}:${s.toString().padStart(2, "0")}`;
    }

    function setMetaForLine(line) {
      if (!titleEl || !artistEl) return;
      const vid = videoIdFromLine(line);
      if (isPlaylistLine(line)) {
        const lm = line.match(/[?&]list=([a-zA-Z0-9_-]+)/);
        titleEl.textContent = i18nStr("music_meta_playlist", {}, "Çalma listesi");
        artistEl.textContent = lm
          ? `${i18nStr("music_list_prefix", {}, "Liste")} · ${lm[1].slice(0, 14)}…`
          : i18nStr("music_artist_youtube", {}, "YouTube");
        if (art) {
          art.removeAttribute("src");
          art.style.display = "none";
        }
        if (artFb) {
          artFb.hidden = false;
          artFb.textContent = "▤";
        }
        return;
      }
      if (vid) {
        titleEl.textContent = i18nStr("music_meta_video", {}, "Video");
        artistEl.textContent = `v=${vid}`;
        if (art) {
          art.style.display = "";
          art.src = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
        }
        if (artFb) artFb.hidden = true;
      } else {
        titleEl.textContent = "—";
        artistEl.textContent = i18nStr("music_no_line", {}, "Geçerli satır yok");
        if (art) {
          art.removeAttribute("src");
          art.style.display = "none";
        }
        if (artFb) {
          artFb.hidden = false;
          artFb.textContent = "♪";
        }
      }
    }

    function stopFakeProgress() {
      if (fakeTimer) {
        clearInterval(fakeTimer);
        fakeTimer = null;
      }
    }

    function syncScrub() {
      const pct = fakeDur > 0 ? Math.min(100, (fakeElapsed / fakeDur) * 100) : 0;
      if (scrubFill) scrubFill.style.width = `${pct}%`;
      if (tCur) tCur.textContent = formatTime(fakeElapsed);
      if (tTot) tTot.textContent = iframe?.src ? formatTime(fakeDur) : "—:—";
    }

    function startFakeProgress(reset) {
      stopFakeProgress();
      if (reset) {
        fakeElapsed = 0;
        syncScrub();
      }
      if (uiPaused || !iframe?.src) return;
      fakeTimer = window.setInterval(() => {
        fakeElapsed = Math.min(fakeDur, fakeElapsed + 0.45);
        syncScrub();
        if (fakeElapsed >= fakeDur) stopFakeProgress();
      }, 450);
    }

    function setUiPaused(on) {
      uiPaused = on;
      embedWrap?.classList.toggle("gchu-embed--dim", on);
      if (ppBtn) ppBtn.textContent = on ? "▶" : "⏸";
      if (on) stopFakeProgress();
      else startFakeProgress(false);
    }

    function playLine(i) {
      const queue = lines();
      if (!queue.length) {
        if (now) now.textContent = i18nStr("music_queue_empty", {}, "Kuyruk boş.");
        stopFakeProgress();
        if (tTot) tTot.textContent = "—:—";
        return;
      }
      lineIndex = ((i % queue.length) + queue.length) % queue.length;
      const line = queue[lineIndex];
      const url = ytEmbedFromLine(line);
      setMetaForLine(line);
      uiPaused = false;
      embedWrap?.classList.remove("gchu-embed--dim");
      if (ppBtn) ppBtn.textContent = "⏸";
      if (iframe && url) {
        iframe.src = url;
        if (now)
          now.textContent = i18nStr("music_queue_pos", {
            cur: String(lineIndex + 1),
            total: String(queue.length),
          });
        startFakeProgress(true);
      } else if (now) {
        now.textContent = i18nStr("music_no_valid_yt", {}, "Geçerli YouTube linki yok.");
        stopFakeProgress();
        if (tTot) tTot.textContent = "—:—";
      }
    }

    function computeNext(fromIdx) {
      const queue = lines();
      if (!queue.length) return null;
      if (shuffle) {
        if (queue.length === 1) return 0;
        let j = fromIdx;
        let guard = 0;
        while (j === fromIdx && guard++ < 12) j = (Math.random() * queue.length) | 0;
        return j;
      }
      if (fromIdx >= queue.length - 1) {
        if (repeatMode === 2) return fromIdx;
        if (repeatMode === 1) return 0;
        return null;
      }
      return fromIdx + 1;
    }

    function computePrev(fromIdx) {
      const queue = lines();
      if (!queue.length) return null;
      if (shuffle) return computeNext(fromIdx);
      if (fromIdx <= 0) {
        if (repeatMode === 1) return queue.length - 1;
        if (repeatMode === 2) return 0;
        return null;
      }
      return fromIdx - 1;
    }

    const saved = localStorage.getItem(LS_MUSIC);
    if (saved && ta) ta.value = saved;

    root.querySelector(".gchu-m-play")?.addEventListener("click", () => {
      if (ta) localStorage.setItem(LS_MUSIC, ta.value);
      lineIndex = 0;
      playLine(0);
    });
    root.querySelector(".gchu-m-prev")?.addEventListener("click", () => {
      if (ta) localStorage.setItem(LS_MUSIC, ta.value);
      const p = computePrev(lineIndex);
      if (p == null) {
        if (now) now.textContent = i18nStr("music_no_prev", {}, "Önceki parça yok.");
        return;
      }
      playLine(p);
    });
    root.querySelector(".gchu-m-next")?.addEventListener("click", () => {
      if (ta) localStorage.setItem(LS_MUSIC, ta.value);
      const n = computeNext(lineIndex);
      if (n == null) {
        if (now) now.textContent = i18nStr("music_queue_done", {}, "Kuyruk bitti.");
        return;
      }
      playLine(n);
    });
    root.querySelector(".gchu-m-pp")?.addEventListener("click", () => {
      if (!iframe?.src) {
        if (now) now.textContent = i18nStr("music_load_queue_first", {}, "Önce kuyruk yükleyin.");
        return;
      }
      setUiPaused(!uiPaused);
    });
    root.querySelector(".gchu-m-shuf")?.addEventListener("click", (e) => {
      shuffle = !shuffle;
      const b = e.currentTarget;
      b.setAttribute("aria-pressed", shuffle ? "true" : "false");
      b.classList.toggle("gchu-m-active", shuffle);
    });
    root.querySelector(".gchu-m-rep")?.addEventListener("click", (e) => {
      repeatMode = (repeatMode + 1) % 3;
      const b = e.currentTarget;
      b.dataset.rep = String(repeatMode);
      b.title = repeatTitleAt(repeatMode);
      b.classList.toggle("gchu-m-active", repeatMode !== 0);
    });

    function repeatTitleAt(mode) {
      return i18nStr(`music_repeat_${mode}`, {}, ["Tekrar: kapalı", "Tekrar: tüm kuyruk", "Tekrar: tek parça"][mode]);
    }

    function applyMusicChrome() {
      const hintEl = root.querySelector(".gchu-m-hint");
      if (hintEl)
        hintEl.textContent = i18nStr(
          "music_hint",
          {},
          "Kuyruk — satır başına bir YouTube linki (Text Editor’daki gibi altta kaydet).",
        );
      if (iframe) iframe.setAttribute("title", i18nStr("music_iframe_title", {}, "YouTube"));
      if (ta) ta.placeholder = i18nStr("music_ta_placeholder", {}, "https://www.youtube.com/watch?v=…");
      const playBtn = root.querySelector(".gchu-m-play");
      if (playBtn) playBtn.textContent = i18nStr("music_play_btn", {}, "Kaydet ve oynat");
      root.querySelector(".gchu-m-shuf")?.setAttribute("title", i18nStr("music_shuffle_title", {}, "Karıştır"));
      root.querySelector(".gchu-m-prev")?.setAttribute("title", i18nStr("music_prev_title", {}, "Önceki"));
      root.querySelector(".gchu-m-pp")?.setAttribute("title", i18nStr("music_pp_title", {}, "Duraklat / devam"));
      root.querySelector(".gchu-m-next")?.setAttribute("title", i18nStr("music_next_title", {}, "Sonraki"));
      const rb = root.querySelector(".gchu-m-rep");
      if (rb) rb.title = repeatTitleAt(repeatMode);
    }

    function refreshMusicChrome() {
      applyMusicChrome();
      const queue = lines();
      if (queue.length && lineIndex >= 0 && lineIndex < queue.length) {
        setMetaForLine(queue[lineIndex]);
        if (iframe?.src && now) {
          now.textContent = i18nStr("music_queue_pos", {
            cur: String(lineIndex + 1),
            total: String(queue.length),
          });
        }
      }
      const rb = root.querySelector(".gchu-m-rep");
      if (rb) rb.title = repeatTitleAt(repeatMode);
    }

    applyMusicChrome();
    root._gchuMusicRefreshLocale = refreshMusicChrome;

    root._gchuMusicStop = () => {
      stopFakeProgress();
    };
  }

  window.__gnuchanosMusicInitRoot = initMusicPlayerRoot;

  const ALARM_INNER_HTML =
    '<div class="gchu-alarm-root">' +
    '<p class="shell-muted mono gchu-al-hint">Geri say\u0131m bitince k\u0131sa bip.</p>' +
    '<div class="gchu-al-dial" role="group" aria-label="S\u00FCre">' +
    '<div class="gchu-al-slot">' +
    '<button type="button" class="shell-btn shell-btn--ghost mono gchu-al-step" data-d="h" data-o="-1" title="Saat azalt">\u2212</button>' +
    '<div class="gchu-al-slot-mid">' +
    '<span class="gchu-al-lab mono">Saat</span>' +
    '<input type="number" class="shell-input mono gchu-al-h" min="0" max="23" value="0" inputmode="numeric" />' +
    "</div>" +
    '<button type="button" class="shell-btn shell-btn--ghost mono gchu-al-step" data-d="h" data-o="1" title="Saat art\u0131r">+</button>' +
    "</div>" +
    '<span class="gchu-al-sep mono" aria-hidden="true">:</span>' +
    '<div class="gchu-al-slot">' +
    '<button type="button" class="shell-btn shell-btn--ghost mono gchu-al-step" data-d="m" data-o="-1" title="Dakika azalt">\u2212</button>' +
    '<div class="gchu-al-slot-mid">' +
    '<span class="gchu-al-lab mono">Dk</span>' +
    '<input type="number" class="shell-input mono gchu-al-m" min="0" max="59" value="0" inputmode="numeric" />' +
    "</div>" +
    '<button type="button" class="shell-btn shell-btn--ghost mono gchu-al-step" data-d="m" data-o="1" title="Dakika art\u0131r">+</button>' +
    "</div>" +
    '<span class="gchu-al-sep mono" aria-hidden="true">:</span>' +
    '<div class="gchu-al-slot">' +
    '<button type="button" class="shell-btn shell-btn--ghost mono gchu-al-step" data-d="s" data-o="-1" title="Saniye azalt">\u2212</button>' +
    '<div class="gchu-al-slot-mid">' +
    '<span class="gchu-al-lab mono">Sn</span>' +
    '<input type="number" class="shell-input mono gchu-al-s" min="0" max="59" value="30" inputmode="numeric" />' +
    "</div>" +
    '<button type="button" class="shell-btn shell-btn--ghost mono gchu-al-step" data-d="s" data-o="1" title="Saniye art\u0131r">+</button>' +
    "</div>" +
    "</div>" +
    '<p class="shell-display mono gchu-al-r">\u2014</p>' +
    '<div class="shell-row gchu-al-actions">' +
    '<button type="button" class="shell-btn mono gchu-al-go">Ba\u015flat</button>' +
    '<button type="button" class="shell-btn shell-btn--ghost mono gchu-al-stop">Durdur</button>' +
    "</div>" +
    "</div>";

  window.__gnuchanosAlarmInnerHTML = ALARM_INNER_HTML;

  function initAlarmRoot(root) {
    if (!root || root.dataset.gchuAlarmBound === "1") return;
    root.dataset.gchuAlarmBound = "1";

    const hEl = root.querySelector(".gchu-al-h");
    const mEl = root.querySelector(".gchu-al-m");
    const sEl = root.querySelector(".gchu-al-s");
    const rEl = root.querySelector(".gchu-al-r");
    let timerId = null;
    let remain = 0;

    function clampField(el, min, max) {
      if (!el) return 0;
      let v = Number(el.value);
      if (!Number.isFinite(v)) v = 0;
      v = Math.max(min, Math.min(max, Math.floor(v)));
      el.value = String(v);
      return v;
    }

    function readTotalSec() {
      const h = clampField(hEl, 0, 23);
      const m = clampField(mEl, 0, 59);
      const s = clampField(sEl, 0, 59);
      return h * 3600 + m * 60 + s;
    }

    function bump(which, delta) {
      const el = which === "h" ? hEl : which === "m" ? mEl : sEl;
      const max = which === "h" ? 23 : 59;
      let v = Number(el?.value ?? 0);
      if (!Number.isFinite(v)) v = 0;
      v = Math.max(0, Math.min(max, Math.floor(v) + delta));
      if (el) el.value = String(v);
    }

    function showRemain() {
      if (!rEl) return;
      if (remain <= 0) {
        rEl.textContent = "\u2014";
        rEl.classList.remove("gchu-al-r--tick");
        return;
      }
      rEl.classList.add("gchu-al-r--tick");
      const h = Math.floor(remain / 3600);
      const m = Math.floor((remain % 3600) / 60);
      const s = remain % 60;
      const p = (n) => String(n).padStart(2, "0");
      if (h > 0) rEl.textContent = `${h}:${p(m)}:${p(s)}`;
      else rEl.textContent = `${m}:${p(s)}`;
    }

    function tick() {
      remain -= 1;
      if (remain <= 0) {
        if (timerId) clearInterval(timerId);
        timerId = null;
        remain = 0;
        showRemain();
        try {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          if (Ctx) {
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
          }
        } catch {
          /* ignore */
        }
        return;
      }
      showRemain();
    }

    root.querySelectorAll(".gchu-al-step").forEach((btn) => {
      btn.addEventListener("click", () => {
        const d = btn.getAttribute("data-d");
        const o = Number(btn.getAttribute("data-o"));
        if (d === "h" || d === "m" || d === "s") bump(d, o);
      });
    });

    [hEl, mEl, sEl].forEach((el) => {
      el?.addEventListener("change", () => {
        const max = el === hEl ? 23 : 59;
        clampField(el, 0, max);
      });
    });

    root.querySelector(".gchu-al-go")?.addEventListener("click", () => {
      if (timerId) clearInterval(timerId);
      timerId = null;
      remain = readTotalSec();
      if (remain <= 0) {
        showRemain();
        return;
      }
      showRemain();
      timerId = window.setInterval(tick, 1000);
    });
    root.querySelector(".gchu-al-stop")?.addEventListener("click", () => {
      if (timerId) clearInterval(timerId);
      timerId = null;
      remain = 0;
      showRemain();
    });

    function applyAlarmLabels() {
      const alHint = root.querySelector(".gchu-al-hint");
      if (alHint) alHint.textContent = i18nStr("alarm_hint", {}, "Geri sayım bitince kısa bip.");
      root.querySelector(".gchu-al-dial")?.setAttribute("aria-label", i18nStr("alarm_dial_aria", {}, "Süre"));
      const labs = root.querySelectorAll(".gchu-al-slot-mid .gchu-al-lab");
      if (labs[0]) labs[0].textContent = i18nStr("alarm_lab_h", {}, "Saat");
      if (labs[1]) labs[1].textContent = i18nStr("alarm_lab_m", {}, "Dk");
      if (labs[2]) labs[2].textContent = i18nStr("alarm_lab_s", {}, "Sn");
      const goBtn = root.querySelector(".gchu-al-go");
      if (goBtn) goBtn.textContent = i18nStr("alarm_go", {}, "Başlat");
      const stopBtn = root.querySelector(".gchu-al-stop");
      if (stopBtn) stopBtn.textContent = i18nStr("alarm_stop", {}, "Durdur");
      const stepFb = {
        h: { "-1": "Saat azalt", 1: "Saat artır" },
        m: { "-1": "Dakika azalt", 1: "Dakika artır" },
        s: { "-1": "Saniye azalt", 1: "Saniye artır" },
      };
      root.querySelectorAll(".gchu-al-step").forEach((btn) => {
        const d = btn.getAttribute("data-d");
        const o = String(btn.getAttribute("data-o") ?? "");
        if (d !== "h" && d !== "m" && d !== "s") return;
        const inc = o === "1" ? "inc" : "dec";
        const key = `alarm_step_${d}_${inc}`;
        const fb = stepFb[d]?.[o] ?? "";
        btn.setAttribute("title", i18nStr(key, {}, fb));
      });
    }

    applyAlarmLabels();
    root._gchuAlarmRefreshLocale = applyAlarmLabels;

    root._gchuAlarmStop = () => {
      if (timerId) clearInterval(timerId);
      timerId = null;
    };
  }

  window.__gnuchanosAlarmInitRoot = initAlarmRoot;

  const backdrop = document.getElementById("shell-backdrop");
  const modalIds = [
    "modal-pulse",
    "modal-music",
    "modal-wall",
    "modal-editor",
    "modal-calc",
    "modal-alarm",
    "modal-timer",
  ];

  function closeAll() {
    document.getElementById("modal-timer")?._gchuShellTimerStop?.();
    modalIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add("is-hidden");
        el.setAttribute("aria-hidden", "true");
      }
    });
    if (backdrop) {
      backdrop.classList.add("is-hidden");
      backdrop.setAttribute("aria-hidden", "true");
    }
  }

  function initShellModalTimer() {
    const modal = document.getElementById("modal-timer");
    const dEl = document.getElementById("timer-display");
    const lapsEl = document.getElementById("timer-laps");
    const goBtn = document.getElementById("timer-go");
    const lapBtn = document.getElementById("timer-lap");
    const resetBtn = document.getElementById("timer-reset");
    if (!modal || !dEl || !goBtn || !lapBtn || !resetBtn) return;

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
      dEl.textContent = fmt(nowElapsed());
      if (running) raf = requestAnimationFrame(loop);
    }

    function stopLoop() {
      cancelAnimationFrame(raf);
      raf = 0;
    }

    function shellTimerStop() {
      running = false;
      stopLoop();
    }

    modal._gchuShellTimerStop = shellTimerStop;

    goBtn.addEventListener("click", () => {
      if (!running) {
        running = true;
        startAt = performance.now();
        loop();
      } else {
        baseMs = nowElapsed();
        running = false;
        stopLoop();
        dEl.textContent = fmt(baseMs);
      }
    });
    lapBtn.addEventListener("click", () => {
      const li = document.createElement("li");
      li.textContent = fmt(nowElapsed());
      lapsEl?.appendChild(li);
    });
    resetBtn.addEventListener("click", () => {
      running = false;
      stopLoop();
      baseMs = 0;
      startAt = 0;
      dEl.textContent = fmt(0);
      if (lapsEl) lapsEl.innerHTML = "";
    });
  }

  initShellModalTimer();

  function openModal(elId) {
    const el = document.getElementById(elId);
    if (!el) return;
    closeAll();
    el.classList.remove("is-hidden");
    el.setAttribute("aria-hidden", "false");
    if (backdrop) {
      backdrop.classList.remove("is-hidden");
      backdrop.setAttribute("aria-hidden", "false");
    }
  }

  const appToModal = {
    pulse: "modal-pulse",
    music: "modal-music",
    wall: "modal-wall",
    editor: "modal-editor",
    calc: "modal-calc",
    alarm: "modal-alarm",
    timer: "modal-timer",
  };

  window.__gnuchanosOpenApp = function openApp(appId) {
    if (typeof window.__gnuchanosSpawnAppWindow === "function") {
      window.__gnuchanosSpawnAppWindow(appId);
      return;
    }
    const mid = appToModal[appId];
    if (mid) openModal(mid);
  };

  document.querySelectorAll("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => closeAll());
  });
  if (backdrop) backdrop.addEventListener("click", closeAll);

  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape") {
        const open = document.querySelector(".shell-modal:not(.is-hidden)");
        if (open) {
          e.preventDefault();
          e.stopPropagation();
          closeAll();
        }
        return;
      }
      if (!e.altKey || e.repeat || e.ctrlKey || e.metaKey) return;
      const t = e.target;
      if (
        t instanceof HTMLElement &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) &&
        e.code !== "Tab"
      )
        return;

      if (e.code === "KeyT" && e.shiftKey) {
        e.preventDefault();
        window.__gnuchanosOpenApp("timer");
        return;
      }
      if (e.shiftKey) return;

      const map = {
        KeyP: "pulse",
        KeyM: "music",
        KeyG: "library",
        KeyW: "wall",
        KeyT: "editor",
        KeyC: "calc",
        KeyA: "alarm",
      };
      const app = map[e.code];
      if (app) {
        e.preventDefault();
        window.__gnuchanosOpenApp(app);
      }
    },
    true,
  );

  const shortcutsList = document.getElementById("shortcuts-list");
  if (shortcutsList) {
    shortcutsList.addEventListener("click", (e) => {
      const row = e.target.closest("li[data-app]");
      if (!row) return;
      const id = row.getAttribute("data-app");
      if (id) window.__gnuchanosOpenApp(id);
    });
  }

  const volBtn = document.getElementById("vol-btn");
  if (volBtn) volBtn.addEventListener("click", () => window.__gnuchanosOpenApp("pulse"));

  const LS_VOL = "gnuchanos_pulse_vol";
  const pulseSlider = document.getElementById("pulse-slider");
  const pulsePct = document.getElementById("pulse-pct");
  if (pulseSlider && pulsePct) {
    const saved = localStorage.getItem(LS_VOL);
    if (saved != null) {
      pulseSlider.value = saved;
      pulsePct.textContent = saved;
    }
    pulseSlider.addEventListener("input", () => {
      pulsePct.textContent = pulseSlider.value;
      localStorage.setItem(LS_VOL, pulseSlider.value);
    });
  }

  const calcGrid = document.getElementById("calc-grid");
  const calcDisplay = document.getElementById("calc-display");
  if (calcGrid && calcDisplay) {
    let expr = "";
    const keys = ["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "0", ".", "+", "=", "C"];
    keys.forEach((k) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = k;
      b.addEventListener("click", () => {
        if (k === "C") {
          expr = "";
          modalCalcState.showingEvalErr = false;
        } else if (k === "=") {
          const clean = expr.replace(/\s/g, "");
          if (/^[0-9+\-*/.]+$/.test(clean) && clean.length <= 80) {
            try {
              expr = String(Function(`"use strict"; return (${clean})`)());
              modalCalcState.showingEvalErr = false;
            } catch {
              expr = i18nStr("mc_eval_err", {}, "Err");
              modalCalcState.showingEvalErr = true;
            }
          } else {
            expr = i18nStr("mc_eval_err", {}, "Err");
            modalCalcState.showingEvalErr = true;
          }
        } else if (modalCalcState.showingEvalErr) {
          expr = k;
          modalCalcState.showingEvalErr = false;
        } else {
          expr += k;
        }
        calcDisplay.value = expr;
      });
      calcGrid.appendChild(b);
    });
  }

  const editorBody = document.getElementById("editor-body");
  const editorSave = document.getElementById("editor-save");
  const editorStatus = document.getElementById("editor-status");
  if (editorBody && editorSave) {
    const savedEd = localStorage.getItem(LS_EDITOR);
    if (savedEd) editorBody.value = savedEd;
    editorSave.addEventListener("click", () => {
      localStorage.setItem(LS_EDITOR, editorBody.value);
      if (editorStatus) {
        editorStatus.textContent = i18nStr("me_saved", {}, "Saved.");
        editorStatus.dataset.gchuSavedFlash = "1";
      }
    });
    editorBody.addEventListener("input", () => {
      if (editorStatus?.dataset.gchuSavedFlash) delete editorStatus.dataset.gchuSavedFlash;
    });
  }

  function syncWallFileStatusIfEmpty() {
    const wf = document.getElementById("wall-file");
    const st = document.getElementById("wall-file-status");
    if (!st || !wf || wf.files?.[0]) return;
    st.textContent = i18nStr("mw_file_st", {}, "No file selected yet");
  }

  function initShellModalWall() {
    const modal = document.getElementById("modal-wall");
    const wallFile = document.getElementById("wall-file");
    const wallFileStatus = document.getElementById("wall-file-status");
    const wallUrl = document.getElementById("wall-url");
    const wallUrlHint = document.getElementById("wall-url-hint");
    const wallApply = document.getElementById("wall-apply-url");
    const wallClear = document.getElementById("wall-clear-custom");
    if (!modal || !wallFile) return;

    const WALL_STACK_SVG =
      "radial-gradient(120% 80% at 50% 100%, rgba(20, 8, 35, 0.88) 0%, transparent 55%)," +
      " radial-gradient(ellipse at 70% 30%, rgba(80, 40, 120, 0.4) 0%, transparent 50%)," +
      " linear-gradient(165deg, rgba(31, 10, 50, 0.55) 0%, rgba(18, 6, 28, 0.75) 45%, rgba(13, 4, 20, 0.85) 100%)," +
      ' url("./assets/wallpaper.svg")';
    const WALL_STACK_GRAD =
      "radial-gradient(120% 80% at 50% 100%, rgba(20, 8, 35, 0.88) 0%, transparent 55%)," +
      " radial-gradient(ellipse at 70% 30%, rgba(80, 40, 120, 0.4) 0%, transparent 50%)," +
      " linear-gradient(165deg, rgba(31, 10, 50, 0.55) 0%, rgba(18, 6, 28, 0.75) 45%, rgba(13, 4, 20, 0.85) 100%)";

    let wallBlobUrl = null;
    function clearWallUrlShellHint() {
      if (!wallUrlHint) return;
      wallUrlHint.hidden = true;
      wallUrlHint.textContent = "";
      delete wallUrlHint.dataset.gchuUrlErr;
    }
    function showWallUrlShellHint() {
      if (!wallUrlHint) return;
      wallUrlHint.hidden = false;
      wallUrlHint.textContent = i18nStr(
        "mw_url_https_err",
        {},
        "Only https:// image URLs are accepted.",
      );
      wallUrlHint.dataset.gchuUrlErr = "1";
    }
    function revokeWallBlob() {
      if (wallBlobUrl) {
        URL.revokeObjectURL(wallBlobUrl);
        wallBlobUrl = null;
      }
    }

    function wallpaperEl() {
      return document.querySelector(".wallpaper");
    }

    modal.querySelectorAll("[data-wall-preset]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-wall-preset");
        const el = wallpaperEl();
        if (!el) return;
        revokeWallBlob();
        el.className = "wallpaper";
        if (id === "default") el.style.backgroundImage = "";
        else if (id === "svg") el.style.backgroundImage = WALL_STACK_SVG;
        else if (id === "gradient") el.style.backgroundImage = WALL_STACK_GRAD;
      });
    });

    wallFile.addEventListener("change", () => {
      const f = wallFile.files?.[0];
      if (wallFileStatus) wallFileStatus.textContent = f ? f.name : i18nStr("mw_file_st", {}, "No file selected yet");
      const el = wallpaperEl();
      if (!el || !f) return;
      revokeWallBlob();
      wallBlobUrl = URL.createObjectURL(f);
      el.className = "wallpaper";
      el.style.backgroundImage = `${WALL_STACK_GRAD}, url("${wallBlobUrl}")`;
    });

    wallUrl?.addEventListener("input", clearWallUrlShellHint);

    wallApply?.addEventListener("click", () => {
      const u = wallUrl?.value?.trim();
      const el = wallpaperEl();
      if (!el) return;
      if (!u) {
        clearWallUrlShellHint();
        return;
      }
      if (!/^https:\/\//i.test(u)) {
        showWallUrlShellHint();
        return;
      }
      clearWallUrlShellHint();
      revokeWallBlob();
      el.className = "wallpaper";
      el.style.backgroundImage = `${WALL_STACK_GRAD}, url("${u}")`;
    });

    wallClear?.addEventListener("click", () => {
      revokeWallBlob();
      wallFile.value = "";
      if (wallUrl) wallUrl.value = "";
      clearWallUrlShellHint();
      syncWallFileStatusIfEmpty();
      const el = wallpaperEl();
      if (el) {
        el.className = "wallpaper";
        el.style.backgroundImage = "";
      }
    });
  }

  syncWallFileStatusIfEmpty();
  initShellModalWall();

  const musicMount = document.querySelector("#modal-music .gchu-music-mount");
  if (musicMount) {
    musicMount.innerHTML = MUSIC_PLAYER_HTML;
    initMusicPlayerRoot(musicMount);
  }

  const alarmMount = document.querySelector("#modal-alarm .gchu-alarm-mount");
  if (alarmMount) {
    alarmMount.innerHTML = ALARM_INNER_HTML;
    initAlarmRoot(alarmMount);
  }

  window.addEventListener("gnuchanos-locale", () => {
    syncWallFileStatusIfEmpty();
    const wuh = document.getElementById("wall-url-hint");
    if (wuh?.dataset.gchuUrlErr === "1") {
      wuh.textContent = i18nStr(
        "mw_url_https_err",
        {},
        "Only https:// image URLs are accepted.",
      );
    }
    if (modalCalcState.showingEvalErr) {
      const cd = document.getElementById("calc-display");
      if (cd) cd.value = i18nStr("mc_eval_err", {}, "Err");
    }
    if (editorStatus?.dataset.gchuSavedFlash === "1") {
      editorStatus.textContent = i18nStr("me_saved", {}, "Saved.");
    }
  });
})();
