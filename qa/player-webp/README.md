# Player WebP optimization

The active evolved v12 walk sheet, evolved hero and emergency fallback image now load WebP first. PNG masters remain unchanged. WebP and PNG walk sources share the same explicit 420×400 cell manifest, four direction rows and four gait phases; ordinary unevolved player sources remain separate so adding a format cannot shift a slice boundary.

| Asset | PNG bytes | WebP bytes | Reduction |
| --- | ---: | ---: | ---: |
| Walk v12 | 2,910,931 | 609,518 | 79.1% |
| Evolved hero | 1,563,932 | 368,006 | 76.5% |
| Emergency player | 548,436 | 338,694 | 38.2% |

Walk and hero use high-quality lossy Q90, with `alphaQuality: 100` and `effort: 6`. Compared with the preceding lossless WebP attempt, their combined transfer drops from 3,099,572 to 977,524 bytes (68.5% further reduction). Trials at Q90/85/80 favored Q90 for detail retention. No resizing, palette reduction, cell removal or changes to animation geometry are involved. Every alpha channel and full source dimensions still match; visible colors are compressed and are not pixel-identical. The emergency fallback remains lossless to preserve the neutral-background flood-removal algorithm.

At actual display sizes (all sixteen 84×92 walk cells and the 200×200 hero), build QA compares PNG and WebP after compositing over dark/light backgrounds. Q90 walk mean RGB channel difference is about .53 on a 0–255 scale (PSNR about 46.3 dB); hero about 2.08–2.19 (34.9–35.6 dB). These numeric checks supplement visual comparison, rather than guarantee identical perception. `quality-comparison.png` puts the PNG and Q90 hero/poses side by side. `art-report.json` records dimensions, alpha equality, compression mode, byte sizes and display differences. This reduces transfer, not decoded bitmap dimensions/memory. Q90 URLs include `?webp-q90-v1` to bypass previously cached lossless WebP; manifest matching ignores the query and retains PNG fallback registration.

```powershell
$env:JELLY_SHARP_MODULE = 'C:/path/to/node_modules/sharp'
node qa/build-player-webp.mjs
$env:JELLY_PLAYWRIGHT_MODULE = 'C:/path/to/node_modules/playwright'
node qa/player-webp-browser.mjs
```

110 existing unit tests passed. Browser coverage passed four cases: desktop 1366×768 and emulated phone 390×844, each with normal WebP requests and with the new evolved WebP files forcibly aborted. A controlled capsule setup triggers the real evolution button/action; it verifies evolved speed, the correct atlas manifest, modal/results images, replay, actual keyboard movement/stopping in all four directions, and home portraits. Aborted requests successfully select PNG for the walk sheet and all evolved portraits. Existing player appearance, dimensions, stride, collision and scoring remain intact. Details: `browser-report.json`; local/ignored screenshots: `walk-{1366,390}-{webp,png-fallback}.png`.
