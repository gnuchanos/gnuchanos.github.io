# GNUCHANOS — Mimari özeti

Statik site **depo kökünde** (`index.html`, `styles.css`, `main.js`, `shell-apps.js`, `gnuchanos-wm.js`, `gnuchanos.json`, `assets/`). GitHub Pages için kaynak: **branch `main`, klasör `/` (root)** — `docs/` kullanılmıyor.

## Katmanlar

1. **`main.js`** — Saat, status satırı, `gnuchanos.json` ile panel/launcher listesi, **Alt+1…4** grup, **Alt+Space** launcher.
2. **`shell-apps.js`** — Modallar (Pulse, müzik, duvar kağıdı, editör, hesap, alarm, timer), `window.__gnuchanosOpenApp`, kısayol tıklamaları, hesap/müzik/ses parçaları.
3. **`gnuchanos-wm.js`** — `#gnuchanos-desktop` içinde **sürüklenebilir / yeniden boyutlandırılabilir** pencereler (`gchu-window`).
4. **`src/`** → `dist/` — TS çekirdek, IPC, WM simülasyonu; uzun vadede native compositor köprüsü.

## `gnuchanos.json`

Panel (`centerTitle`, `workspace`, `stats`) ve `launcher.items`. Güncellemek için: `npm run gnuchanos:state` (`scripts/gen-gnuchanos.mjs`).

## Yerel sunucu

- `python -m http.server` (kök dizinde) veya `npm run build && npm start` (`dist/web/serve.js` yalnızca izin verilen kök dosyalarını sunar).
