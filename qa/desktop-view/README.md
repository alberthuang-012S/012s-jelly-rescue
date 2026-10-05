# Desktop wide camera QA

Run `npm test` for camera centering, vertical boundaries, smooth follow and rescue-indicator bounds. These tests include every mainline and special stage; the existing mobile framing tests cover the portrait fit camera.

Optional browser validation:

```powershell
$env:JELLY_PLAYWRIGHT_MODULE = 'C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
node qa/desktop-view-browser.mjs
```

The script starts a temporary local server on port 4194 and closes it afterward. It uses the real production camera/CSS and exposes the Game instance only through an intercepted QA response. Fixtures freeze events for repeatable screenshots; real clicks exercise treatment selection, rescue and the exit dialog, and both Boss cores still require physical pickup.

Verified sizes: 961×521, 1024×768, 1366×768, 1440×900 and 1920×1080, across Tutorial, Park, Mountain, City, Sports and both Boss stages. Checks cover 55–58% visible world height, centered map, dialogue font size, side-rail bounds, text overflow, control overlap, offscreen help and desktop/phone resize transitions. Generated PNGs are ignored; `browser-report.json` records results.

Additional regression: `qa/mobile-layout-browser.mjs` covers six phone viewports, native touch, two-finger movement/use, emulated safe areas and rotation. `qa/scenarios-browser.mjs` covers tutorial progression and rescue flows. Browser emulation does not replace human difficulty/playability review.
