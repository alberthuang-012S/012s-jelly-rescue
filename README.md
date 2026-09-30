# Jelly Rescue RPG

A portrait-friendly top-down rescue RPG with Tutorial, Park, Mountain, City Plaza and Sports Park. The project uses browser-native ES modules and a tiny Node static server, so gameplay and unit tests require no package installation.

## Run

```powershell
npm start
```

Open `http://localhost:4173`.

## Controls

- `WASD` / Arrow keys: move the jelly
- `Q`: toggle between PPA+1 and NAP+1
- Click or tap an item card: select that treatment
- `E` / `Space` / the mobile 使用 button: rescue when close to an NPC
- Mobile portrait: full-screen vertical play with virtual D-pad, fixed item dock and large 使用 button
- Visual direction: bright pixel-town palette, deep navy outlines and enamel UI panels inspired by the sibling `012s-jelly-world` project
- Debug panel: click `DEBUG` or press `F2`

## Architecture

The core loop is split into focused modules:

- `Player`, `InputController`: movement, collision and desktop/mobile input
- `NPC`, `NPCStateMachine`: NORMAL → WARNING → HELP → CRITICAL → FAILED/RESCUED
- `EventDirector`: stage-aware event timing, conditions, simultaneous-event pressure and spawn cooldown
- `ScenarioDefinitions`, `NPCRoleDefinitions`: life-situation dialogue/reactions, condition mapping and data-driven role appearance/movement/probabilities
- `LifestyleStages`, `LifestyleRenderer`, `TravelPlanner`: new stage data, cached procedural scenery and collision-aware rescue scheduling
- `ItemSystem`, `InteractionSystem`: fixed items and close-range rescue validation
- `StageManager`, `WorldRenderer`: stage data, responsive camera rendering and scenery
- `ScoreManager`, `ComboManager`: rescue bonuses, response metrics and combo multipliers
- `HUD`, `ResultScreen`: HUD feedback, stage clear and game-over reporting
- `Game`: orchestration only; gameplay rules remain in the modules above

## Phase 1 status

- `Jelly Park`: complete portrait-friendly loop with a compact full-map view, wide central route, open side loops, generous grass areas, a small pond, fountain, picnic area and playground.
- `Jelly Mountain`: terraced alpine route with a trailhead, wide stepped paths, a central rest deck, two readable mid-route branches and a summit lookout.
- `reference/generated-mountain-open-portrait-hq.png` is the approved portrait mountain concept rendered as the in-game background, with a spacious central meadow and sparse edge obstacles.
- `reference/runtime/jelly-anthropomorphic-player-walk-v12.png` is the current evolved-player walking sheet (four directions × four phases). v3, v2 and the direction strip remain compatibility fallbacks. `reference/generated-npcs-hiker-elder-child-hq.png` contains the existing hiker, elder and child sprites with transparent alpha.
- `reference/jelly-anthropomorphic-home.png` is the current transparent home-hero artwork; the previous `world-jelly-*` jelly assets remain available as fallbacks.
- `reference/generated-park-open-portrait-hq.png` is the approved clean portrait park artwork, composited under gameplay entities and HUD.
- Park gameplay uses a 768×1152 logical world mapped to the 1024×1536 portrait artwork, so the full map reads larger on phones while keeping the collision geometry aligned.
- Camera strategy: portrait mobile uses a full-map fit; desktop and landscape use a clamped, smoothly-following RPG camera.
- The canvas backing buffer follows its CSS display box × devicePixelRatio (capped at 2.5), and HQ map/sprite images use high-quality smoothing.
- Loading is staged: the home screen does not fetch the mountain map; player/NPC assets load in parallel when a stage starts, and image responses are cached by the local server for faster reloads.
- Park and Mountain gameplay backgrounds keep their original 1024×1536 dimensions but load WebP first (PNG remains the compatibility fallback), reducing desktop stage-image transfer by roughly 84%.
- Runtime gameplay assets live under `reference/runtime/`: `jelly-player.webp`, `npc-sprites.webp`, `ppa-plus-one.webp`, `nap-plus-one.webp` and `jelly-home.webp`; the original PNGs remain as source/master or compatibility fallbacks.
- Starting a stage waits for the selected map, player, NPC, PPA+1 and NAP+1 assets to finish asynchronous decode before gameplay begins. A lightweight loading overlay prevents partially loaded entities from appearing.
- Add `?assetReport=1` on localhost to expose `window.__jellyAssetReport` and log asset format, byte size, download time, decode time, total time and cache-hit information.
- NPC status bubbles are screen-size compensated for camera zoom, with larger readable dialogue and tolerance bars; the transient location-name stamp is intentionally omitted.
- Touch controls use visual pressed states only; no mobile haptic or vibration API is used.
- Portrait layout keeps a tall camera viewport and uses the `012s-jelly-world` front-facing jelly artwork for the home character reference.
- Map NPCs use the polished generated sprite sheet `reference/generated-npcs-hiker-elder-child-hq.png`: hiker, elder and child only; no robot or rescue-worker character.
- Debug tools include forced ITCH/SORENESS events, 3-second tolerance, clear events, infinite life, interaction-radius display and stage switching.

## Scenario expansion

The rescue items are still exactly **PPA+1** and **NAP+1**. Scenario describes the visible story; Condition determines item correctness. `ItemSystem` does not know scenario names.

| Scenario | Condition | Item |
| --- | --- | --- |
| SKINCARE | ITCH | PPA+1 |
| OUTDOOR_SKIN | ITCH | PPA+1 |
| GRASS_SKIN | ITCH | PPA+1 |
| FALL | SORENESS | NAP+1 |
| SPORT_SORE | SORENESS | NAP+1 |
| LONG_WALK | SORENESS | NAP+1 |

- **城市生活廣場 / Jelly City Plaza**: 60 seconds; café terrace, flower/clothing shops, photo garden and broad pedestrian plaza. Its first 15 seconds randomly introduce SKINCARE/OUTDOOR_SKIN. Later phases add walking/work soreness and allow two simultaneous residents after 40 seconds. Whole-round PPA target is 65–70%; the introduction is intentionally PPA-only, so later phases use lower PPA weights.
- **活力運動公園 / Jelly Sports Park**: 60 seconds; basketball court, running track, fitness/skate areas, grass, rest and water stations. NAP target is about 70%, with outdoor/grass skin situations still available. Two simultaneous residents are allowed after 15 seconds and event cooldown tightens after 35 seconds.
- City roles: `youngWoman`, `shopper`, `cafeVisitor`, `photographerGirl`, `deliveryWorker`.
- Sports roles: `basketballPlayer`, `runner`, `skateboarder`, `fitnessGuy`, `sportsGirl`, `grassVisitor`. Role weights determine eligible stories; gender never determines the product. For example, `runner` can receive OUTDOOR_SKIN and `sportsGirl` can receive SPORT_SORE.

The original `NPC.startEvent(condition, ...)` API and Tutorial/Park/Mountain scheduling remain compatible. New stages use `startScenario(type, ...)`, resolving to a supported condition before entering the existing WARNING → HELP → CRITICAL → FAILED/RESCUED state machine. `visualState` reports EVENT_REACTION while a reaction timer runs inside WARNING. WARNING remains rescuable; reactions do not add a hidden penalty or change score/combo rules.

FALL briefly stumbles, tilts/squashes/downshifts and stops, then keeps a hand near the leg. SPORT_SORE/LONG_WALK slow down and pause with a gentle lean/leg cue. Skin scenarios pause with an arm gesture and soft ✦ cue; their critical bubble stays lavender. Successful rescue, failure, clearing and replay stop/reset the reaction. New characters use outlined procedural bodies and readable accessories (bags, camera, delivery pack, ball, board, weights), without adding generated portraits or new raster assets.

Scenario stages select the condition family first, then an eligible weighted scenario and role. Temporarily unavailable families defer the event instead of silently changing its product. Stage `phases`, `scenarioPool` and `scenarioWeights` control timing and content; `NPC_ROLE_DEFS` holds movement, speed, appearance and scenario eligibility.

New-stage fairness uses a cached visibility graph around collision rectangles expanded by player radius. The planner counts actual detours and current player speed, tests both rescue orders against each resident's deadline, caps simultaneous events at two, and defers disconnected/impossible events. No new event is dispatched when its complete lifetime would extend past 60 seconds. This is conservative scheduling, not player autopilot. Park/Mountain retain their original distance-based guard and difficulty curve.

Maps are cached Canvas scenery generated from the same landmark coordinates used for collision. Buildings, seating and equipment are solid; courts, grass and activity surfaces stay walkable. Home previews use the same generated map. Portrait camera padding reserves room for HUD and controls. Formal item labels show PPA+1/NAP+1 without internal condition/scenario codes.

Debug can force all six scenarios at a safe nearby position and lists role, scenario, resolved condition, required item, visual state and tolerance. Debug forcing intentionally bypasses normal scheduling/probability checks; it is disabled in Tutorial. Stage order is Tutorial → Park → Mountain → City → Sports. Personal-best records now support all four timed stages while preserving existing saved scores.

Stage-clear and game-over screens add PPA/NAP correct counts, average successful response time and rescue success rate. Success rate is rescued / (rescued + failed); unfinished events are excluded. Average time starts at event onset (including WARNING) and uses successful rescues only. With no samples, the display shows `—`. The existing Mountain PNN+3 reward, evolution modal and permanent +25% speed are preserved; PNN+3 is not a rescue item.

## Validation

```powershell
npm test
node qa/scenarios-simulation.mjs
```

`npm test` runs 17 Node tests covering scenario mapping, correct/wrong items, reaction lifecycle, targeting, spawn/routes, obstacle detours, disconnected targets, deadline fairness, seeded weighting, Tutorial/Park/Mountain compatibility, result metrics, old/new personal-best records, evolution and walking.

The simulation runs 200 complete rounds per new stage, alternating normal/evolved speeds with a virtual rescuer that pays planned travel time. With the checked-in seed it emitted 1,991 City events (68.01% PPA) and 2,200 Sports events (68.45% NAP), with no NPC collision violations and simultaneous events observed in both stages. It is a scheduling stress test, not a human difficulty assessment.

Browser QA is optional and requires an available Playwright package and installed Edge (or a channel selected by `JELLY_BROWSER_CHANNEL`). It starts/stops its own server on port 4174; override with `JELLY_QA_PORT` if necessary.

```powershell
# Omit this variable if Playwright is already installed in the project.
$env:JELLY_PLAYWRIGHT_MODULE = 'C:/path/to/node_modules/playwright'
node qa/scenarios-browser.mjs
```

The browser runner checks all five stages at desktop 1280×900, portrait 390×844 and small portrait 375×667: Tutorial completion, loading, keyboard/D-pad/item/use controls, correct/wrong feedback, forced scenarios, canvas bubble clipping, simultaneous events, result/replay/next-stage, pause/exit, game-over and Mountain evolution into City. It exposes the Game only in an intercepted QA response; production has no QA global. Reports are in `qa/scenarios/`; generated PNG screenshots are ignored by Git.

## Remaining art and tuning

City/Sports maps and characters are complete procedural placeholders suitable for gameplay verification. Bespoke sprite sheets, dedicated fall/exercise animations and final scene artwork can replace them later without changing item correctness or scenario definitions. Human playtesting on physical phones is still useful for subjective difficulty and art polish; browser mobile validation uses emulated viewports/pointer input.

## Intentional scope limits

No shop, equipment, progression tree, gacha, combat or inventory system is included in this phase.
