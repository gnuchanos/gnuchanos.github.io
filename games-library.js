/**
 * Oyun kütüphanesi — games.json (segments[].hits[]).
 * gnuchanos-wm.js içinden __gnuchanosBuildGamesLibrary(frameRoot, win) çağrılır.
 */
(function gamesLibrary() {
  const JSON_SRC = "./games.json";
  const LIST_CAP = 450;
  /** Solda aynı anda en fazla kaç satır (DOM / bellek için tavan) */
  const LIST_DOM_MAX = 4500;

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  function flattenGames(data) {
    const out = [];
    const segs = data?.segments;
    if (!Array.isArray(segs)) return out;
    for (const seg of segs) {
      const hits = seg?.hits;
      if (!Array.isArray(hits)) continue;
      for (const h of hits) {
        if (h && typeof h === "object") out.push({ ...h, segmentTitle: seg.title || "" });
      }
    }
    return out;
  }

  function playUrlFromGame(g) {
    const u = (g.gameURL || "").trim();
    if (u) {
      const s = safeHttpUrl(u);
      if (s) return s;
    }
    const m = (g.embed || "").match(/src=["']([^"']+)["']/i);
    if (m) return safeHttpUrl(m[1].trim());
    return "";
  }

  function thumbUrl(g) {
    const im = g.images;
    if (Array.isArray(im) && im[0]) return String(im[0]);
    return "";
  }

  function safeHttpUrl(u) {
    if (!u || typeof u !== "string") return "";
    const t = u.trim();
    return /^https?:\/\//i.test(t) ? t : "";
  }

  function filterGames(all, q) {
    const t = q.trim().toLowerCase();
    if (!t) return all;
    return all.filter(
      (g) =>
        String(g.title || "")
          .toLowerCase()
          .includes(t) ||
        String(g.slug || "")
          .toLowerCase()
          .includes(t),
    );
  }

  /** Soldaki liste ile aynı havuzdan (poolCap veya LIST_CAP) rastgele örnek — DOM'da mutlaka karşılığı var */
  function randomSampleGames(arr, maxCount, poolCap) {
    const cap = poolCap != null ? poolCap : LIST_CAP;
    const pool = arr.slice(0, Math.min(arr.length, cap));
    const k = Math.min(maxCount, pool.length);
    if (k <= 0) return [];
    const copy = pool.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = copy[i];
      copy[i] = copy[j];
      copy[j] = t;
    }
    return copy.slice(0, k);
  }

  window.__gnuchanosBuildGamesLibrary = function buildGamesLibrary(frameRoot, win) {
    if (!frameRoot) return;

    function L(key, vars, trFallback) {
      const v = vars && typeof vars === "object" && vars != null && !Array.isArray(vars) ? vars : {};
      if (typeof window.__gnuchanosT === "function") {
        const s = window.__gnuchanosT(key, v);
        if (s != null && s !== "") return s;
      }
      return trFallback != null ? String(trFallback) : key;
    }

    const ac = new AbortController();
    frameRoot._gchuLibAbort = () => ac.abort();

    frameRoot.innerHTML =
      '<div class="gchu-lib gchu-lib--loading mono">' +
      '<div class="gchu-lib-spinner" aria-hidden="true"></div>' +
      '<p class="shell-muted">' +
      escapeHtml(L("lib_loading", {}, "Kütüphane yükleniyor…")) +
      "</p></div>";

    fetch(JSON_SRC, { signal: ac.signal, cache: "default" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data) => {
        const allGames = flattenGames(data);
        frameRoot.innerHTML = "";
        const root = document.createElement("div");
        root.className = "gchu-lib";
        root.innerHTML =
          '<aside class="gchu-lib-sidebar">' +
          '<header class="gchu-lib-brand">' +
          '<span class="gchu-lib-brand-mark" aria-hidden="true"></span>' +
          '<div class="gchu-lib-brand-text">' +
          '<span class="gchu-lib-brand-title">' +
          escapeHtml(L("lib_brand_title", {}, "Oyun kütüphanesi")) +
          "</span>" +
          '<span class="gchu-lib-brand-sub shell-muted">games.json</span>' +
          "</div>" +
          "</header>" +
          '<input type="search" class="gchu-lib-search shell-input mono" autocomplete="off" spellcheck="false" />' +
          '<div class="gchu-lib-list-wrap">' +
          '<ul class="gchu-lib-list mono" role="listbox"></ul>' +
          "</div>" +
          '<p class="gchu-lib-count shell-muted"></p>' +
          '<button type="button" class="shell-btn shell-btn--ghost mono gchu-lib-load-more" hidden></button>' +
          "</aside>" +
          '<section class="gchu-lib-main">' +
          '<div class="gchu-lib-empty mono" hidden>' +
          '<p class="gchu-lib-empty-title">' +
          escapeHtml(L("lib_empty_title", {}, "Sonuç yok")) +
          "</p>" +
          '<p class="gchu-lib-empty-hint shell-muted">' +
          escapeHtml(L("lib_empty_hint", {}, "Aramayı değiştirin veya listeyi temizleyin.")) +
          "</p>" +
          "</div>" +
          '<div class="gchu-lib-hero-wrap">' +
          '<div class="gchu-lib-hero" aria-hidden="true"></div>' +
          '<div class="gchu-lib-hero-overlay">' +
          '<h2 class="gchu-lib-title"></h2>' +
          '<p class="gchu-lib-segment shell-muted"></p>' +
          "</div>" +
          "</div>" +
          '<div class="gchu-lib-toolbar">' +
          '<button type="button" class="gchu-lib-play">' +
          escapeHtml(L("lib_play", {}, "OYNA")) +
          "</button>" +
          '<div class="gchu-lib-stats"></div>' +
          '<div class="gchu-lib-toolbar-links">' +
          '<button type="button" class="shell-btn shell-btn--ghost mono gchu-lib-store">' +
          escapeHtml(L("lib_store", {}, "Mağaza")) +
          "</button>" +
          '<button type="button" class="shell-btn shell-btn--ghost mono gchu-lib-browser">' +
          escapeHtml(L("lib_browser", {}, "Tarayıcı")) +
          "</button>" +
          "</div>" +
          "</div>" +
          '<div class="gchu-lib-body">' +
          '<p class="gchu-lib-body-lab gchu-lib-desc-lab shell-muted">' +
          escapeHtml(L("lib_desc", {}, "Açıklama")) +
          "</p>" +
          '<div class="gchu-lib-desc mono"></div>' +
          '<div class="gchu-lib-browse-random" hidden>' +
          '<p class="gchu-lib-browse-random-lab shell-muted">' +
          escapeHtml(L("lib_browse_random_lab", {}, "Rastgele örnekler — tıklayınca solda seçilir")) +
          "</p>" +
          '<ul class="gchu-lib-random-list mono"></ul>' +
          "</div>" +
          '<div class="gchu-lib-genre-pills" hidden></div>' +
          '<p class="gchu-lib-body-lab gchu-lib-tags-lab shell-muted" hidden>' +
          escapeHtml(L("lib_tags", {}, "Etiketler")) +
          "</p>" +
          '<div class="gchu-lib-genres mono"></div>' +
          "</div>" +
          "</section>";
        frameRoot.appendChild(root);

        const searchEl = root.querySelector(".gchu-lib-search");
        const listEl = root.querySelector(".gchu-lib-list");
        const countEl = root.querySelector(".gchu-lib-count");
        const mainEl = root.querySelector(".gchu-lib-main");
        const emptyEl = root.querySelector(".gchu-lib-empty");
        const heroEl = root.querySelector(".gchu-lib-hero");
        const titleEl = root.querySelector(".gchu-lib-title");
        const segEl = root.querySelector(".gchu-lib-segment");
        const playBtn = root.querySelector(".gchu-lib-play");
        const statsEl = root.querySelector(".gchu-lib-stats");
        const descEl = root.querySelector(".gchu-lib-desc");
        const genresEl = root.querySelector(".gchu-lib-genres");
        const genrePillsEl = root.querySelector(".gchu-lib-genre-pills");
        const tagsLabEl = root.querySelector(".gchu-lib-tags-lab");
        const storeBtn = root.querySelector(".gchu-lib-store");
        const browserBtn = root.querySelector(".gchu-lib-browser");
        const descLabEl = root.querySelector(".gchu-lib-desc-lab");
        const browseRandomEl = root.querySelector(".gchu-lib-browse-random");
        const randomListEl = root.querySelector(".gchu-lib-random-list");
        const loadMoreBtn = root.querySelector(".gchu-lib-load-more");

        if (searchEl) searchEl.placeholder = L("lib_search_ph", {}, "Başlık veya slug ara…");
        if (listEl) listEl.setAttribute("aria-label", L("lib_list_aria", {}, "Oyun listesi"));

        let selected = null;
        let filterQ = "";
        let debounceT = 0;
        let listVisibleMax = LIST_CAP;

        function slugKey(g) {
          return String(g.slug || g.id || "");
        }

        function filteredAll() {
          return filterGames(allGames, filterQ);
        }

        function listSliceEnd(filteredLen) {
          const cap = Math.min(filteredLen, LIST_DOM_MAX);
          return Math.min(listVisibleMax, cap);
        }

        function filteredSlice() {
          const f = filteredAll();
          return f.slice(0, listSliceEnd(f.length));
        }

        function findLiForSlug(key) {
          const keyStr = String(key);
          for (const li of listEl.querySelectorAll(".gchu-lib-item")) {
            if (li.dataset.slug === keyStr) return li;
          }
          return null;
        }

        function sliceIndexOfSelected() {
          const slice = filteredSlice();
          if (!selected) return -1;
          const sk = slugKey(selected);
          return slice.findIndex((g) => slugKey(g) === sk);
        }

        function selectListItem(li, g) {
          emptyEl.hidden = true;
          mainEl.classList.remove("gchu-lib-main--empty");
          root.querySelectorAll(".gchu-lib-item").forEach((el) => {
            el.classList.remove("gchu-lib-item--active");
            el.setAttribute("aria-selected", "false");
          });
          li.classList.add("gchu-lib-item--active");
          li.setAttribute("aria-selected", "true");
          renderDetail(g);
          li.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }

        function segmentCounts(games) {
          const other = L("lib_other", {}, "Diğer");
          const m = new Map();
          for (const g of games) {
            const k = String(g.segmentTitle || other).trim() || other;
            m.set(k, (m.get(k) || 0) + 1);
          }
          return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14);
        }

        function topGenresSample(games, sampleCap, outCap) {
          const m = new Map();
          const n = Math.min(games.length, sampleCap);
          for (let i = 0; i < n; i++) {
            const arr = games[i].genres;
            if (!Array.isArray(arr)) continue;
            for (const x of arr) {
              const k = String(x).toLowerCase();
              m.set(k, (m.get(k) || 0) + 1);
            }
          }
          return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, outCap);
        }

        function renderBrowse() {
          const filtered = filterGames(allGames, filterQ);
          const sliceLen = filtered.length;
          const slicePreview = filtered.slice(0, listSliceEnd(filtered.length));
          selected = null;
          emptyEl.hidden = true;
          mainEl.classList.remove("gchu-lib-main--empty");
          mainEl.classList.add("gchu-lib-main--browse");
          root.querySelectorAll(".gchu-lib-item").forEach((el) => {
            el.classList.remove("gchu-lib-item--active");
            el.setAttribute("aria-selected", "false");
          });
          heroEl.style.backgroundImage = "";
          if (descLabEl) descLabEl.textContent = L("lib_summary", {}, "Özet");
          titleEl.textContent = L("lib_catalog", {}, "Katalog");
          if (filterQ.trim()) {
            segEl.textContent = L("lib_browse_search_line", {
              q: filterQ.trim(),
              len: String(sliceLen),
              m: String(slicePreview.length),
            });
          } else {
            segEl.textContent =
              sliceLen > slicePreview.length
                ? L("lib_browse_trunc", { len: String(sliceLen), m: String(slicePreview.length) })
                : L("lib_browse_pick", { len: String(sliceLen) });
          }
          const segs = segmentCounts(filtered);
          const segHtml = segs
            .map(
              ([name, c]) =>
                '<span class="gchu-lib-browse-chip">' +
                escapeHtml(name) +
                "<strong>" +
                c +
                "</strong></span>",
            )
            .join("");
          statsEl.innerHTML =
            '<p class="gchu-lib-browse-lead">' +
            escapeHtml(L("lib_seg_summary", {}, "Segment özeti")) +
            "</p>" +
            '<div class="gchu-lib-browse-grid">' +
            (segHtml || '<span class="gchu-lib-browse-chip">' + escapeHtml(L("lib_no_data", {}, "Veri yok")) + "</span>") +
            "</div>";
          descEl.innerHTML =
            "<p>" + escapeHtml(L("lib_browse_desc_p1", {}, "Oyun ayrıntıları ve oynatma için soldaki listeden bir başlığa tıklayın.")) + "</p>" +
            '<p class="shell-muted">' +
            escapeHtml(L("lib_browse_desc_p2", {}, "Arama kutusunda ↓ / ↑ ile listede gezinin; Enter ile oynatın.")) +
            "</p>";
          fillBrowseRandomPicks(filtered);
          genrePillsEl.hidden = false;
          const tops = topGenresSample(filtered, 600, 14);
          genrePillsEl.innerHTML = tops.length
            ? tops
                .map(
                  ([name, c]) =>
                    '<span class="gchu-lib-pill gchu-lib-pill--genre">' +
                    escapeHtml(name) +
                    ' <span class="shell-muted">(' +
                    c +
                    ")</span></span>",
                )
                .join("")
            : '<span class="gchu-lib-pill gchu-lib-pill--genre shell-muted">' +
              escapeHtml(L("lib_no_genre_summary", {}, "Tür özeti yok")) +
              "</span>";
          tagsLabEl.hidden = true;
          genresEl.innerHTML = "";
          playBtn.disabled = true;
          playBtn.removeAttribute("title");
        }

        function fillBrowseRandomPicks(filtered) {
          if (!browseRandomEl || !randomListEl) return;
          randomListEl.innerHTML = "";
          const picks = randomSampleGames(filtered, 28, listSliceEnd(filtered.length));
          if (picks.length === 0) {
            browseRandomEl.hidden = true;
            return;
          }
          browseRandomEl.hidden = false;
          const frag = document.createDocumentFragment();
          for (const g of picks) {
            const li = document.createElement("li");
            li.className = "gchu-lib-random-item";
            li.setAttribute("role", "button");
            li.tabIndex = 0;
            const thumb = safeHttpUrl(thumbUrl(g));
            if (thumb) {
              const img = document.createElement("img");
              img.className = "gchu-lib-random-thumb";
              img.alt = "";
              img.width = 36;
              img.height = 36;
              img.loading = "lazy";
              img.decoding = "async";
              img.src = thumb;
              li.appendChild(img);
            } else {
              const ph = document.createElement("span");
              ph.className = "gchu-lib-random-thumb gchu-lib-thumb--ph";
              ph.setAttribute("aria-hidden", "true");
              li.appendChild(ph);
            }
            const tit = document.createElement("span");
            tit.className = "gchu-lib-random-title";
            tit.textContent = g.title || slugKey(g);
            li.appendChild(tit);
            li.addEventListener("click", () => {
              const sideLi = findLiForSlug(slugKey(g));
              if (sideLi) selectListItem(sideLi, g);
            });
            li.addEventListener("keydown", (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                const sideLi = findLiForSlug(slugKey(g));
                if (sideLi) selectListItem(sideLi, g);
              }
            });
            frag.appendChild(li);
          }
          randomListEl.appendChild(frag);
        }

        function renderNoResultsMain() {
          selected = null;
          emptyEl.hidden = false;
          mainEl.classList.add("gchu-lib-main--empty");
          mainEl.classList.remove("gchu-lib-main--browse");
          titleEl.textContent = "—";
          if (descLabEl) descLabEl.textContent = L("lib_desc", {}, "Açıklama");
          segEl.textContent = "";
          heroEl.style.backgroundImage = "";
          descEl.innerHTML = "";
          genresEl.innerHTML = "";
          genrePillsEl.innerHTML = "";
          genrePillsEl.hidden = true;
          tagsLabEl.hidden = true;
          statsEl.innerHTML = "";
          playBtn.disabled = true;
          playBtn.removeAttribute("title");
          if (browseRandomEl) {
            browseRandomEl.hidden = true;
            if (randomListEl) randomListEl.innerHTML = "";
          }
        }

        function renderStats(g) {
          const langs = Array.isArray(g.supportedLanguages) ? g.supportedLanguages.join(", ") : "—";
          const mobile = Array.isArray(g.mobileReady) ? g.mobileReady.join(", ") : "—";
          statsEl.innerHTML =
            '<div class="gchu-lib-stat"><span class="gchu-lib-stat-k">' +
            escapeHtml(L("lib_stats_langs", {}, "Diller")) +
            '</span><span class="gchu-lib-stat-v">' +
            escapeHtml(langs) +
            "</span></div>" +
            '<div class="gchu-lib-stat"><span class="gchu-lib-stat-k">' +
            escapeHtml(L("lib_stats_platform", {}, "Platform")) +
            '</span><span class="gchu-lib-stat-v">' +
            escapeHtml(mobile) +
            "</span></div>";
        }

        function renderGenrePills(g) {
          const genres = Array.isArray(g.genres) ? g.genres : [];
          if (genres.length === 0) {
            genrePillsEl.innerHTML = "";
            genrePillsEl.hidden = true;
            return;
          }
          genrePillsEl.hidden = false;
          genrePillsEl.innerHTML = genres
            .slice(0, 12)
            .map(
              (x) =>
                '<span class="gchu-lib-pill gchu-lib-pill--genre">' + escapeHtml(String(x)) + "</span>",
            )
            .join("");
        }

        function renderDetail(g) {
          selected = g;
          mainEl.classList.remove("gchu-lib-main--browse");
          if (browseRandomEl) {
            browseRandomEl.hidden = true;
            if (randomListEl) randomListEl.innerHTML = "";
          }
          if (descLabEl) descLabEl.textContent = L("lib_desc", {}, "Açıklama");
          const bg = safeHttpUrl(thumbUrl(g));
          heroEl.style.backgroundImage = bg ? `url(${JSON.stringify(bg)})` : "";
          titleEl.textContent = g.title || "—";
          segEl.textContent = g.segmentTitle ? L("lib_list_prefix", { name: g.segmentTitle }) : "";
          const desc = (g.description || "").replace(/\s+/g, " ").trim();
          const noDesc = L("lib_no_desc", {}, "Açıklama yok.");
          descEl.innerHTML =
            "<p>" +
            escapeHtml(desc.length > 900 ? `${desc.slice(0, 900)}…` : desc || noDesc) +
            "</p>";
          if (g.howToPlayText) {
            descEl.innerHTML +=
              '<p class="gchu-lib-how"><strong>' +
              escapeHtml(L("lib_howto", {}, "Nasıl oynanır:")) +
              "</strong> " +
              escapeHtml(String(g.howToPlayText).slice(0, 500)) +
              (String(g.howToPlayText).length > 500 ? "…" : "") +
              "</p>";
          }
          const tags = Array.isArray(g.tags) ? g.tags.slice(0, 16) : [];
          tagsLabEl.hidden = tags.length === 0;
          genresEl.innerHTML = tags
            .map((t) => '<span class="gchu-lib-chip">' + escapeHtml(t) + "</span>")
            .join("");
          renderGenrePills(g);
          renderStats(g);
          const url = playUrlFromGame(g);
          playBtn.disabled = !url;
          playBtn.title = url ? L("lib_play_tip_ok", {}, "Ayrı pencerede oynat (Enter)") : L("lib_play_tip_no", {}, "Oynatma adresi yok");
        }

        function renderList() {
          const filtered = filteredAll();
          const slice = filtered.slice(0, listSliceEnd(filtered.length));
          emptyEl.hidden = slice.length > 0;
          mainEl.classList.toggle("gchu-lib-main--empty", slice.length === 0);
          listEl.innerHTML = "";
          const frag = document.createDocumentFragment();
          for (const g of slice) {
            const key = slugKey(g);
            const li = document.createElement("li");
            li.className = "gchu-lib-item";
            li.setAttribute("role", "option");
            li.setAttribute("aria-selected", "false");
            li.dataset.slug = key;
            li.tabIndex = -1;
            const thumb = safeHttpUrl(thumbUrl(g));
            if (thumb) {
              const img = document.createElement("img");
              img.className = "gchu-lib-thumb";
              img.alt = "";
              img.width = 40;
              img.height = 40;
              img.loading = "lazy";
              img.decoding = "async";
              img.src = thumb;
              li.appendChild(img);
            } else {
              const ph = document.createElement("span");
              ph.className = "gchu-lib-thumb gchu-lib-thumb--ph";
              ph.setAttribute("aria-hidden", "true");
              li.appendChild(ph);
            }
            const tit = document.createElement("span");
            tit.className = "gchu-lib-item-title";
            tit.textContent = g.title || key;
            li.appendChild(tit);
            li.addEventListener("click", () => selectListItem(li, g));
            li.addEventListener("dblclick", (ev) => {
              ev.preventDefault();
              selectListItem(li, g);
              const url = playUrlFromGame(g);
              if (url && typeof window.__gnuchanosSpawnIframePlayWindow === "function") {
                const gfb = L("wm_game_fallback", {}, "Oyun");
                window.__gnuchanosSpawnIframePlayWindow(url, g.title || gfb);
              }
            });
            frag.appendChild(li);
          }
          listEl.appendChild(frag);
          const extra = filtered.length - slice.length;
          countEl.textContent =
            filtered.length === 0
              ? L("lib_count_none", {}, "Eşleşme yok.")
              : extra > 0
                ? L("lib_count_trunc", { shown: String(slice.length), total: String(filtered.length) })
                : L("lib_count_all", { n: String(filtered.length) });
          if (slice.length === 0) {
            const emptyTitle = emptyEl.querySelector(".gchu-lib-empty-title");
            const emptyHint = emptyEl.querySelector(".gchu-lib-empty-hint");
            if (allGames.length === 0) {
              emptyTitle.textContent = L("lib_empty_cat_title", {}, "Katalog boş");
              emptyHint.textContent = L("lib_empty_cat_hint", {}, "Bu dosyada listelenecek oyun yok.");
            } else {
              emptyTitle.textContent = L("lib_no_match_title", {}, "Eşleşme yok");
              emptyHint.textContent = L("lib_no_match_hint", {}, "Başka bir arama deneyin veya kutuyu temizleyin.");
            }
          }
          if (loadMoreBtn) {
            const shown = slice.length;
            const ceiling = Math.min(filtered.length, LIST_DOM_MAX);
            const left = ceiling - shown;
            if (left > 0 && filtered.length > 0) {
              loadMoreBtn.hidden = false;
              const next = Math.min(LIST_CAP, left);
              loadMoreBtn.textContent = L(
                "lib_load_more",
                { next: String(next), left: String(left) },
                `+${next} (${left} kaldı)`,
              );
            } else {
              loadMoreBtn.hidden = true;
            }
          }
        }

        loadMoreBtn?.addEventListener("click", () => {
          const filtered = filteredAll();
          const ceiling = Math.min(filtered.length, LIST_DOM_MAX);
          if (ceiling <= listVisibleMax) return;
          listVisibleMax = Math.min(ceiling, listVisibleMax + LIST_CAP);
          renderList();
          const lastLi = listEl.querySelector(".gchu-lib-item:last-child");
          window.requestAnimationFrame(() => {
            lastLi?.scrollIntoView({ block: "nearest", behavior: "smooth" });
          });
        });

        searchEl?.addEventListener("keydown", (e) => {
          const slice = filteredSlice();
          if (slice.length === 0) return;
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            let idx = sliceIndexOfSelected();
            if (e.key === "ArrowDown") {
              idx = idx < 0 ? 0 : Math.min(slice.length - 1, idx + 1);
            } else {
              idx = idx <= 0 ? slice.length - 1 : idx - 1;
            }
            const g = slice[idx];
            const li = findLiForSlug(slugKey(g));
            if (li) selectListItem(li, g);
            return;
          }
          if (e.key === "Enter" && !e.shiftKey) {
            const url = selected && playUrlFromGame(selected);
            if (url) {
              e.preventDefault();
              playBtn.click();
            }
          }
        });

        searchEl?.addEventListener("input", () => {
          clearTimeout(debounceT);
          debounceT = window.setTimeout(() => {
            filterQ = searchEl.value || "";
            listVisibleMax = LIST_CAP;
            const prevSlug = selected ? slugKey(selected) : "";
            renderList();
            const slice = filteredSlice();
            if (slice.length === 0) {
              renderNoResultsMain();
              return;
            }
            if (prevSlug) {
              const still = slice.find((g) => slugKey(g) === prevSlug);
              if (still) {
                const li = findLiForSlug(prevSlug);
                if (li) {
                  selectListItem(li, still);
                  return;
                }
              }
            }
            renderBrowse();
          }, 100);
        });

        playBtn?.addEventListener("click", () => {
          if (!selected) return;
          const url = playUrlFromGame(selected);
          if (url && typeof window.__gnuchanosSpawnIframePlayWindow === "function") {
            const gfb = L("wm_game_fallback", {}, "Oyun");
            window.__gnuchanosSpawnIframePlayWindow(url, selected.title || gfb);
          }
        });

        storeBtn?.addEventListener("click", () => {
          if (!selected) return;
          const u = (selected.playgamaGameUrl || selected.gameURL || "").trim();
          if (u) window.open(u, "_blank", "noopener,noreferrer");
        });

        browserBtn?.addEventListener("click", () => {
          if (!selected) return;
          const u = playUrlFromGame(selected);
          if (u) window.open(u, "_blank", "noopener,noreferrer");
        });

        function applyLibStaticLabels() {
          const bt = root.querySelector(".gchu-lib-brand-title");
          if (bt) bt.textContent = L("lib_brand_title", {}, "Oyun kütüphanesi");
          if (searchEl) searchEl.placeholder = L("lib_search_ph", {}, "Başlık veya slug ara…");
          if (listEl) listEl.setAttribute("aria-label", L("lib_list_aria", {}, "Oyun listesi"));
          if (playBtn) playBtn.textContent = L("lib_play", {}, "OYNA");
          if (storeBtn) storeBtn.textContent = L("lib_store", {}, "Mağaza");
          if (browserBtn) browserBtn.textContent = L("lib_browser", {}, "Tarayıcı");
          const rlab = root.querySelector(".gchu-lib-browse-random-lab");
          if (rlab) rlab.textContent = L("lib_browse_random_lab", {}, "Rastgele örnekler — tıklayınca solda seçilir");
          if (tagsLabEl) tagsLabEl.textContent = L("lib_tags", {}, "Etiketler");
        }

        function refreshLibLocale() {
          applyLibStaticLabels();
          const slice = filteredSlice();
          renderList();
          if (slice.length === 0) {
            renderNoResultsMain();
            return;
          }
          const still = selected && slice.some((g) => slugKey(g) === slugKey(selected));
          if (still) {
            const li = findLiForSlug(slugKey(selected));
            if (li) selectListItem(li, selected);
            else renderBrowse();
          } else {
            renderBrowse();
          }
        }

        frameRoot._gchuLibRefreshLocale = refreshLibLocale;

        renderList();
        const slice0 = filteredSlice();
        if (slice0.length === 0) {
          renderNoResultsMain();
        } else {
          renderBrowse();
        }
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        const errT = L("lib_err_title", {}, "Yüklenemedi");
        const errH = L("lib_err_hint", {}, "games.json okunamadı veya bozuk.");
        frameRoot.innerHTML =
          '<div class="gchu-lib gchu-lib--loading gchu-lib--error mono">' +
          '<p class="gchu-lib-err-title">' +
          escapeHtml(errT) +
          "</p>" +
          '<p class="shell-muted">' +
          escapeHtml(errH) +
          "</p></div>";
      });
  };
})();
