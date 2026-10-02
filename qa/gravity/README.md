# Gravity Overload implementation and QA

Work began on clean `main` at `7fd6035eb3a9cd4779936506680db72334fbee42`, with 64 passing tests. The encounter is `gravityOverload`, reachable through **重力痠痛危機 → 開始挑戰** on the home screen. The five rescue stages and the existing mosquito art, flight, core collection and results remain in place.

## Rules

- Sports Park collision with a dedicated cool-blue map variant, blue gravity devices and transparent illustrated creatures. Phone portrait fits the map with space for warnings/HUD and controls; desktop/landscape follows the player.
- NAP only; E/Space/使用 dispatches a pulse every 0.52 seconds. Small mobs have a 115-unit range; Boss targeting and crystal clearing in the Boss fight reach 165, leaving 85 units beyond the 80-unit combined player/Boss contact radius. It hits the closest eligible target once and clears visible crystals in range. Q cannot switch items. Rescue stages restore both items.
- Three hearts, 1.2-second damage invulnerability, untimed challenge. Obstacles shield both gravity enemies and the grounded Boss. Contact hurts even during core openings; stand within pulse range without overlapping the Boss.
- Wave 1: three stiff mobs. Wave 2: two stiff mobs and one stomper. Wave 3: one stiff, one stomper and one heavy. HP 2/2/3; kill points 100/150/200.
- Stiff mobs warn before a short push; stompers lock a circular ground attack; heavy mobs drop removable gravity crystals. Warnings never follow the player after placement. At most two danger zones coexist; occupied slots delay further attacks.
- Boss: 18 HP, closed core immune, each open-core hit removes 2 HP. Phase 1: single circular slam → 2.3-second opening. Phase 2 at 12 HP: summon two stiff mobs once, then double slam → 2.2-second opening. Phase 3 at 6 HP: faster approach, fan then circular slam → 2.5-second fatigue/opening. Boss attack warnings last 1.05 seconds.
- Victory immediately clears threats and plays a 5.5-second shrinking/weight-release/float-away sequence. Then the reachable **重力核心 / gravityCore** must be physically collected before the result opens. Pickup is safe/untimed and does not change clear time or scoring. It unlocks CORE 002; the mosquito's itch core remains a separate CORE 001 entry. Replay restarts Gravity Overload.
- NAP hits, Boss hits, damage and enemy count are independent of rescue records. Full score with all eleven mobs defeated and an undamaged Boss fight: 4250 (1300 enemies + 450 Boss hits + 1500 defeat + 500 clear + 500 Boss no-damage). Defeating the Boss before its summoned mobs earns fewer enemy points; remaining threats are removed.

## Validation

```powershell
npm test
node qa/gravity-simulation.mjs
$env:JELLY_PLAYWRIGHT_MODULE = 'C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
node qa/gravity-browser.mjs
node qa/boss-browser.mjs
node qa/boss-result-browser.mjs
node qa/scenarios-browser.mjs
```

`gravity.test.mjs` adds twelve behavioral tests. `simulation-report.json` records natural waves/phases and pickup, 32 actual NAP hits and all eleven enemies, with normal-speed movement and infinite life to isolate flow verification. It does not measure human difficulty. The browser script injects states only for visual/lifecycle coverage: keyboard, touch, item lock, warning/fan/crystal/core, pause, victory, physical touch pickup, persisted encyclopedia, Game Over, replay, Home, and switching back to mosquito/rescue. It covers 390×844 and 375×667 play, and results at those sizes plus 320×568, 667×375 and 1280×900. Screenshots are local and ignored by Git. Physical-phone input feel and human difficulty still need playtesting.

The existing rescue browser test's evolution selectors now specifically target `.evolution-dialog`; the prior generic `dialog` selector also matched the already-existing core encyclopedia.

## Art/gameplay v2 (2026-10-02)

Small mobs now use different silhouettes from the King and from one another: coral rectangular push-bot (`gravity-stiff-v2`), mint wide-booted stomp creature (`gravity-stomper-v2`), and lavender triangular crystal carrier (`gravity-heavy-v2`). Each keeps six poses and a fixed foot baseline. Runtime PNG/WebP atlases are 768×512 in `reference/runtime/`; PNG masters are `reference/generated-gravity-{stiff,stomper,heavy}-v2.png`. The map, King atlas and home portrait keep their v1 art.

The new cyan crystal/gyroscope collectible is `reference/runtime/gravity-core-v1.webp` with a PNG fallback (256×256); its master is `reference/generated-gravity-core-v1.png`. Built-in `image_gen` prompts are `reference/art-layouts/gravity-art-prompts-v2.json`, and measured pose bounds are `reference/art-layouts/gravity-art-registration-v2.json`. Repackage with `node qa/build-gravity-art.mjs --v2` using the bundled Sharp path in `JELLY_SHARP_MODULE`.

There is one device at world center (384,576), replacing the three scattered decorative devices. It is decorative and does not add a collision wall. The Boss pulse reaches 165 units; health, contact damage, grounded cover and Boss phases retain their rules. Collection uses the existing reachable-drop/pause/pickup safeguards. `CoreCollectionStore` keeps storage version/key 1 and accepts each core only from its matching stage after actual pickup. CORE 001 progress survives the addition of CORE 002; the result shows the correct name/image and the encyclopedia displays both independent entries.

Validation: **80 unit tests passed**; natural-flow simulation passed through pickup; `gravity-browser.mjs` passed real D-pad pickup, deferred result, collection persistence and both encounter/rescue mode transitions; `gravity-art-browser.mjs` passed all v2 pose assets, one central device, registered glow, paused pixels, fallback and Sports isolation at three viewports; `core-collection-browser.mjs` passed existing mosquito touch/keyboard pickup, no early award, abandon/pause/reload/repeat and bounded encyclopedia at three viewports. Screenshots: `art-v2-preview.png`, `core-pickup-375.png`, `collection-375.png` (local/ignored).

## Original art v1 (2026-10-02)

Created with built-in `image_gen`. PNG masters are `reference/generated-gravity-{map,stiff,stomper,heavy,boss}-v1.png`. Runtime assets, relative to the repository:

| Asset | Runtime file | Layout |
| --- | --- | --- |
| Cool-blue gravity park | `reference/runtime/gravity-map-v1.webp` | 1024×1536; Sports roads and equipment positions preserved |
| Stiff mob | `reference/runtime/gravity-stiff-v1.webp` | 768×512; 3×2 poses |
| Stomper | `reference/runtime/gravity-stomper-v1.webp` | 768×512; 3×2 poses |
| Heavy crystal mob | `reference/runtime/gravity-heavy-v1.webp` | 768×512; 3×2 poses |
| Gravity King | `reference/runtime/gravity-boss-v1.webp` | 1152×1152; 3×3 poses |
| King portrait export | `reference/runtime/gravity-king-portrait-v1.webp` | 384×384; neutral pose |

All map/atlas files also have PNG fallbacks. Prompts: `reference/art-layouts/gravity-art-prompts-v1.json`. Source bounds, common per-atlas scales, foot baselines and vulnerable socket anchors: `reference/art-layouts/gravity-art-registration-v1.json`. Repackage with `qa/build-gravity-art.mjs` and `JELLY_SHARP_MODULE` pointing to the bundled Sharp module.

Small poses: idle, step, warning, push/slam/crystal drop, recoil, harmless seated defeat. The heavy mob's warning/drop pose follows its crystal timer/live zone without changing its AI. Defeated small mobs remain visible for 0.5 seconds after removal from gameplay, fading with simulation time. King poses: neutral, both mittens raised, first/second alternating windup, impact, core opportunity, fatigue, recoil, cheerful float-away. The second windup is mirrored at render time. King display width is 240 world units so the face/core remain readable in the desktop frame; neither collision radius nor camera changed. The home canvas uses the neutral atlas frame. Core glow is registered to each open/fatigue/recoil socket and appears only while `coreOpen` is true.

Validation: **78 unit tests passed**; natural-flow simulation passed (11 mobs, three Boss phases, score 4250); gravity lifecycle browser QA passed; art browser QA passed at 1280×900, 390×844 and 375×667; existing alien art regression passed. `art-browser-report.json` records live frame checks, paused canvas equality, socket glow, procedural fallback and Sports map isolation. Run:

```powershell
npm test
node qa/gravity-simulation.mjs
$env:JELLY_PLAYWRIGHT_MODULE = 'C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
node qa/gravity-art-browser.mjs
node qa/gravity-browser.mjs
node qa/alien-art-browser.mjs
```

Screenshot preview: `qa/gravity/art-v1-preview.png`; all QA screenshots remain local/ignored. Automated checks do not establish physical-phone feel or human difficulty.

## Original art design and fallback

The original procedural renderer remains available when image assets fail. Its design uses a friendly cream creature, padded mittens/boots, cool blue gravity backpack, suspended round weights and lavender crystals. Preserve world anchors, collision radii and the geometry in `GroundAttackSystem.js`. The core should glow only when `entity.coreOpen` is true. Visual time is `combat.visualTime`, so animation must freeze with pause.

Ground warnings and NAP pulses are live gameplay overlays, with positions locked at attack creation. Keep their outlines visible around/under artwork. The home preview is `#gravity-portrait`; victory uses the same creature at decreasing scale with bubble weights. Future map variants must preserve paths and obstacle coordinates.
