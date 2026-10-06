# 暗花浩劫 / PIGMENT TAKEOVER

Third optional Boss encounter: `pigmentBloom`, featuring **暗沉沉花后 / PIGMENT QUEEN**. Started from clean checkout `4d6d52cd683af6b4465deca0a3a3c6e0dd40fbd4` with 92 passing tests. The six rescue stages, mosquito flight/collection and Gravity artwork/collection remain intact.

## Accepted copy

- Home: 暗沉沉花后的黑色素失控擴散，讓居民的皮膚陷入暗沉危機！使用 DDM+1 清除墨晶，阻止暗花浩劫！
- Arrival: 不准天亮！我的花還沒開完呢！
- Defeat: 嗚……只是想讓大家看看我的花嘛……

No extra story modal or resident cutscene. The invading pigment mist/crystals are fictional encounter elements. The Queen keeps her purple appearance after being freed.

## Rules

- Garden map/collision with a live night tint, dark flowers and drifting wisps. Camera and movement remain shared. DDM+1 is locked; Q cannot switch items. E/Space/使用 pulses every 0.52 seconds, with 115-unit creature range and 165-unit crystal/Boss range. Three hearts, 1.2-second damage invulnerability, no time limit.
- A gold bracket marks the nearest actionable target in clear line of sight. Each pulse damages that one target and disperses nearby ink projectiles. A closed Queen cannot steal a crystal/creature hit. Contact hurts, including during core openings; keep a safe distance.
- Waves: three ink drops; two drops plus one roller; one drop/roller/planter. HP 2/2/3, kill points 100/150/200. Drops warn before a short hop; rollers lock their vector and recover at obstacles; planters grow crystals near reachable paths.
- Crystals have fixed 1.1-second warnings, then contact damage; they can be cleared before activation. Maximum three crystals and eight ink projectiles. Crystals are non-solid hazards and cannot seal a walking route. Regular crystals expire after eight seconds or disappear when their owner is defeated. Clearing leaves a brief petal ring.
- Queen: 18 HP, two HP per vulnerable hit. Phase 1 fires three slow beads, then creates one shield crystal. Phase 2 at 12 HP fires a narrow three-bead volley, then two shields. Phase 3 at 6 HP fires two four-bead fans with a central gap, then two shields. Every volley has a one-second locked warning; displayed rays and actual shots share the same angle offsets.
- Break all shield crystals to expose the core for 3 / 3 / 3.5 seconds. Shields persist until broken and never regrow in the same cycle; required placement retries if temporarily blocked. Shields spawn beside/below the Queen, outside her tall artwork, with visible connecting lines. While shielded, she periodically warns before another slow volley. Phase transitions clear old projectiles/crystals.
- Victory clears threats, sheds petals, shrinks the Queen and floats her away as the mist fades. After 5.5 seconds, **墨晶核心 / CORE 003** drops on reachable ground near her defeat point. Physical movement/pickup is required for the result and encyclopedia; idle, pause or abandonment never awards it. Clear time stops at the final hit.
- DDM hit count includes creatures, crystals and Boss hits; expanded results include crystals cleared. Crystals grant no score. Full clear: 1100 creature points + 450 Boss hits + 1500 defeat + 500 clear + 500 undamaged Boss fight = **4050**. Rescue scoring/personal bests are separate.
- Existing v1 collection storage preserves itch/gravity cores; repeat pigment pickup is idempotent. The new icon is `reference/runtime/pigment-core-v1.svg`. Catalog entry IDs and optional image format metadata support SVG while preserving WebP/PNG rewards for earlier encounters.

## Verification

```powershell
npm test
node qa/pigment-simulation.mjs
$env:JELLY_PLAYWRIGHT_MODULE = 'C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
node qa/pigment-browser.mjs
node qa/gravity-browser.mjs
node qa/core-collection-browser.mjs
node qa/garden-browser.mjs
node qa/home-browser.mjs
```

All **106 unit tests** passed (14 new). Three natural-flow simulations passed: actual pulses, shield breaks, phases and pickup, with normal-speed movement and infinite life from three different positions. Each reached 4050 points, nine defeated creatures, nine Boss hits and five shield breaks. Infinite life isolates flow/score; this is not a human difficulty assessment. Details: `simulation-report.json`.

Browser coverage passed for entry/short copy, DDM lock, map loading, keyboard/touch, real shield breaks, open core, fan, pause/exit, petal victory, real touch pickup, SVG reward, persistence, failure/replay/Home, and switching to old encounters/rescue. Play viewports: 390×844, 375×667, 320×568; results add desktop and landscape. Details: `browser-report.json`. Gravity, mosquito core collection, Garden rescue and home-layout browser regressions also passed. Screenshot PNGs are local/ignored. Physical-phone feel and human difficulty remain to be playtested.

## Art handoff

Final art v1 was generated with the built-in `image_gen` tool. Sources are `reference/generated-pigment-{queen,enemies,props,map}-v1.png`. Full prompts are saved in `reference/art-layouts/pigment-art-prompts-v1.json`; crop bounds, uniform pose scales and foot anchors are in `pigment-art-registration-v1.json`. Palette: charcoal/deep purple petals, pearl highlights, crescent diadem, mint leaves and silver-violet glow. Feet anchor at world position; the Queen's crown extends upward and shield placement remains outside her silhouette.

Queen atlas: 1152×768, six 384px cells for closed/idle, casting, shielding, exposed core/fatigue, recoil and tearful defeat (v2). Enemy atlas: 768×512, three species columns (droplet, round faceted roller, pale mint flowerpot) and idle/action rows. Simulation-driven sway, hop, roll, anticipation squash, hit flash and a .45-second harmless collapse/fade provide motion without changing combat geometry. The freed Queen retains her deep-purple appearance. Core artwork is shared by pickup, reward and encyclopedia; existing collection IDs and storage stay compatible.

The 1024×1536 dusk map edits Garden lighting/colors while retaining its paths, buildings and obstacle layout. It overlays the original Garden at full opacity during battle, fades throughout the 5.5-second victory and disappears during pickup, revealing daylight. It also backs the home challenge thumbnail. Procedural characters/crystals/core/tint remain the unloaded-art fallback. Warning rings/rays, projectiles, target brackets, pulses and vulnerability glow remain simulation overlays; all animation uses `combat.visualTime` so pause freezes it.

Build the runtime PNG/lossless WebP sprites and quality-94 WebP map with `node qa/build-pigment-art.mjs` (set `JELLY_SHARP_MODULE` if Sharp is outside the project). The builder checks genuine alpha, unclipped cells and common foot registration. `qa/pigment-art.test.mjs` checks state selection, species columns, anchors, fallback and victory map fading. Browser QA additionally verifies all six final assets load and the opaque Queen silhouette is centered/unclipped on home cards at desktop and 390/375/320px sizes.

Final art validation: **110 unit tests passed**; the updated Pigment browser suite passed desktop, 390×844, 375×667 and 320×568 play views, five result sizes, actual shield breaks, pickup, encyclopedia persistence, failure/replay and return to earlier encounters. Queen portrait center offsets stay within .5px and no opaque silhouette is clipped. Six runtime WebP assets total about 1.77 MB; PNG backups and generated source sheets remain local. Screenshots include `wave3-390.png`, `shield-390.png`, `core-open-390.png`, `victory-320.png`, `pickup-320.png` and `home-desktop.png`. These are browser emulations, not physical-phone acceptance.

Defeat revision v2 uses a sad pout, pooled tears and leaf hands clasped under the chin, matching the original defeat line. Built-in `image_gen` edit prompt: `reference/art-layouts/pigment-defeat-prompt-v2.json`; source: `reference/generated-pigment-queen-defeat-v2.png`; runtime: `reference/runtime/pigment-queen-v2.{webp,png}`. `node qa/build-pigment-defeat-art.mjs` replaces only cell 5, checks pixel-identical preservation of the other five cells and maintains the (192,346) foot anchor. The procedural fallback also shows tears and a downturned mouth. Petal escape, victory timing and pickup rules remain unchanged. `node qa/pigment-defeat-browser.mjs` passed at 1366×768, 390×844 and 320×568: a real final DDM hit selects cell 5 from v2, pause freezes animation and the core still waits for physical pickup. Report: `tearful-defeat-report.json`; screenshots: `tearful-defeat-{1366,390,320}.png`.
