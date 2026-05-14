# GNUCHANOS — Yapılacaklar

Son güncelleme: 2026-05-14

## Tamamlanan

- [x] Kök statik site: mor tema, barlar, kısayollar, `gnuchanos.json`, sürüklenebilir pencereler (`gnuchanos-wm.js`)
- [x] `shell-apps.js` modallar + launcher entegrasyonu; `ALT+G` Game Library
- [x] `npm run gnuchanos:state` → `gnuchanos.json` üretimi
- [x] Hoş geldin penceresi: yalnızca ilk yüklemede; metin `welcome-message.html` → `#welcome-content`
- [x] Statik demo pencereler kaldırıldı (doc / log)
- [x] Music Player: masaüstü oranı (~%35×%75), ortalı; içerik `shell-apps.js` ile paylaşımlı
- [x] Alarm: ~%35×%24 ortalı kart; Saat : Dk : Sn kadranı + `shell-apps` paylaşımlı HTML
- [x] Game Library: `games.json` → sol liste / sağ detay; PLAY → ayrı iframe penceresi (`games-library.js` + `__gnuchanosSpawnIframePlayWindow`)
- [x] Çalışma alanları: `ALT+1`…`9` + üst nokta tıklaması; pencereler `data-gchu-ws` ile gruplanır, aktif olmayan masaüstünde gizlenir (`__gnuchanosSyncWorkspace`)

## Devam

- [ ] Büyük `games.json`: isteğe bağlı sayfalama / sanal liste (şu an liste üst sınırı + arama)
- [ ] GitHub Pages: `main` + **root** doğrula; `.nojekyll` gerekirse ekle
- [ ] TS `src/` ile web kökü arasında otomatik `gnuchanos.json` üretimi

## Notlar

- Yerel: depo kökünde `python -m http.server` veya `npm run build:start`.
- Oyun iframe’i üçüncü parti `X-Frame-Options` ile engellenebilir; **Tarayıcıda aç** yedek olarak kalmalı.
- Tema: yeni pencereler `--lavender`, `--glass-border`, `--purple-panel` ile uyumlu tutulmalı; tek renk paleti dışına çıkma.
