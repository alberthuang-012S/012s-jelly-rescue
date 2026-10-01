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
- Focus a treatment card with Tab, then press Enter/Space to select it; focused Use supports Enter/Space once per press, including key-repeat suppression.
- Switching windows or hiding the page clears held movement/touch directions and pauses the round. Returning shows a Continue button; the timer and NPC events resume only after confirmation.
- Mobile portrait: full-screen vertical play with virtual D-pad, fixed item dock and large 使用 button
- Visual direction: bright pixel-town palette, deep navy outlines and enamel UI panels inspired by the sibling `012s-jelly-world` project
- Debug panel: click `DEBUG` or press `F2`

## Architecture

The core loop is split into focused modules:

- `Player`, `InputController`: movement, collision and desktop/mobile input
- `NPC`, `NPCStateMachine`: NORMAL → WARNING → HELP → CRITICAL → FAILED/RESCUED
- `EventDirector`: stage-aware event timing, conditions, simultaneous-event pressure and spawn cooldown
- `ScenarioDefinitions`, `NPCRoleDefinitions`: life-situation dialogue/reactions, condition mapping and data-driven role appearance/movement/probabilities
- `LifestyleStages`, `LifestyleRenderer`, `TravelPlanner`: stage data, procedural map fallbacks and collision-aware rescue scheduling
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
- NPC status bubbles are screen-size compensated for camera zoom, with readable dialogue and tolerance bars. All active lines retain the symptom, with short role-specific opening lines. Itch and soreness share the same palette, so players judge the dialogue rather than color. Bubbles follow their owner with the original viewport-edge handling; dynamic overlap avoidance, connector lines and vertical critical pulsing are removed to keep positions stable. Offscreen indicators use the original help/urgent labels and state-only colors. Dialogue renders above characters and foreground across all stages. The transient location-name stamp is intentionally omitted.
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
- **活力運動公園 / Jelly Sports Park**: 60 seconds; basketball court, running track, fitness/skate areas, grass, rest and water stations. Falls and sports soreness target 85% of events (NAP); outdoor/grass skin situations share the remaining 15%. Two simultaneous residents are allowed after 15 seconds and event cooldown tightens after 35 seconds.
- City roles: `youngWoman`, `shopper`, `cafeVisitor`, `photographerGirl`, `deliveryWorker`.
- Sports roles: `basketballPlayer`, `runner`, `skateboarder`, `fitnessGuy`, `sportsGirl`, `grassVisitor`. Role weights determine eligible stories; gender never determines the product. For example, `runner` can receive OUTDOOR_SKIN and `sportsGirl` can receive SPORT_SORE.

The original `NPC.startEvent(condition, ...)` API and Tutorial/Park/Mountain scheduling remain compatible. New stages use `startScenario(type, ...)`, resolving to a supported condition before entering the existing WARNING → HELP → CRITICAL → FAILED/RESCUED state machine. `visualState` reports EVENT_REACTION while a reaction timer runs inside WARNING. WARNING remains rescuable; reactions do not add a hidden penalty or change score/combo rules.

Completed injury pose sequences are used only for the supported role/scenario combinations. Other scenarios keep the normal character sprite and communicate through explicit symptom dialogue; generic rotation/squash, overlaid hand gestures and ✦/〰 reaction symbols are removed. Movement still slows or stops according to the existing event rules. Successful rescue, failure, clearing and replay stop/reset the reaction. New characters use dedicated transparent chibi sprite atlases with readable clothing and accessories (bags, camera, delivery pack, ball, board, weights); normal movement uses the existing bob animation.

Scenario stages select the condition family first, then an eligible weighted scenario and role. Temporarily unavailable families defer the event instead of silently changing its product. Stage `phases`, `scenarioPool` and `scenarioWeights` control timing and content; `NPC_ROLE_DEFS` holds movement, speed, appearance and scenario eligibility.

New-stage fairness uses a cached visibility graph around collision rectangles expanded by player radius. The planner counts actual detours and current player speed, tests both rescue orders against each resident's deadline, caps simultaneous events at two, and defers disconnected/impossible events. No new event is dispatched when its complete lifetime would extend past 60 seconds. This is conservative scheduling, not player autopilot. Park/Mountain retain their original distance-based guard and difficulty curve.

City/Sports use dedicated 1024×1536 pixel illustration maps, matching the existing Park art style. WebP runtime maps and lossless transparent NPC atlases live in `reference/runtime/`; `reference/generated-city-*-v1.png` and `reference/generated-sports-*-v1.png` retain the PNG masters. Home previews use the same map assets. Gameplay waits for map and character decode before starting, and switches back to the original NPC atlas for Park/Mountain. Cached procedural maps and outlined bodies remain loading-failure fallbacks. Collision footprints are measured from the artwork; buildings, seating and fitness equipment are solid, while courts, grass, track, picnic blanket and skate surfaces stay walkable. Portrait camera padding reserves room for HUD and controls. Formal item labels show PPA+1/NAP+1 without internal condition/scenario codes.

Debug can force all six scenarios at a safe nearby position and lists role, scenario, resolved condition, required item, visual state and tolerance. Debug forcing intentionally bypasses normal scheduling/probability checks; it is disabled in Tutorial. Stage order is Tutorial → Park → Mountain → City → Sports. Personal-best records now support all four timed stages while preserving existing saved scores.

Stage-clear and game-over screens add PPA/NAP correct counts, average successful response time and rescue success rate. Success rate is rescued / (rescued + failed); unfinished events are excluded. Average time starts at event onset (including WARNING) and uses successful rescues only. With no samples, the display shows `—`. The existing Mountain PNN+3 reward, evolution modal and permanent +25% speed are preserved; PNN+3 is not a rescue item.

## Validation

```powershell
npm test
node qa/scenarios-simulation.mjs
```

`npm test` runs 29 Node tests covering scenario mapping, stage-aware Park/Mountain/City/Sports dialogue routing, stable owner-relative bubble placement/edge bounds/shared state palette, correct/wrong items, WARNING-to-HELP transitions, FALL injury-pose lifecycle, static concerned-expression selection/recovery/fallback (including generic Park/Mountain events for all nine roles), dialogue-only rendering, targeting, spawn/routes, obstacle detours, disconnected targets, deadline fairness, seeded weighting, Tutorial/Park/Mountain compatibility, result metrics, old/new personal-best records, evolution and walking.

`qa/dialogue-browser.mjs` checks 60 close-pair cases across Park/Mountain/City/Sports, central/four-edge positions and desktop/390px/375px viewports. It verifies stable owner-relative placement, stage-routed dialogue, state-only colors and viewport bounds, plus four original offscreen-indicator checks. Screenshots and the report are saved in `qa/scenarios/`.

The simulation runs 200 complete rounds per new stage, alternating normal/evolved speeds with a virtual rescuer that pays planned travel time. With the v1 art footprints and checked-in seed it emitted 1,992 City events (68.02% PPA) and 2,180 Sports events (83.99% NAP), with no NPC collision violations and simultaneous events observed in both stages. It is a scheduling stress test, not a human difficulty assessment.

Browser QA is optional and requires an available Playwright package and installed Edge (or a channel selected by `JELLY_BROWSER_CHANNEL`). It starts/stops its own server on port 4174; override with `JELLY_QA_PORT` if necessary.

`node qa/input-reliability-browser.mjs` uses the same Playwright module configuration to check single action dispatch, focused item activation, native buttons, blur/visibility suspension, cleared touch input, explicit resume, essential mobile font sizes and result-page scrolling at 390×844 and 375×667. Reports and screenshots are saved under `qa/scenarios/`. These are emulated-browser checks; physical-phone touch and lock-screen behavior still need device acceptance testing.

```powershell
# Omit this variable if Playwright is already installed in the project.
$env:JELLY_PLAYWRIGHT_MODULE = 'C:/path/to/node_modules/playwright'
node qa/scenarios-browser.mjs
```

The browser runner checks all five stages at desktop 1280×900, portrait 390×844 and small portrait 375×667: Tutorial completion, loading, keyboard/D-pad/item/use controls, correct/wrong feedback, forced scenarios, canvas bubble clipping, simultaneous events, result/replay/next-stage, pause/exit, game-over and Mountain evolution into City. It exposes the Game only in an intercepted QA response; production has no QA global. Reports are in `qa/scenarios/`; generated PNG screenshots are ignored by Git.

## Remaining art and tuning

Sports injury animation adds three poses each for `basketballPlayer`/`skateboarder` FALL and `runner`/`fitnessGuy` soreness scenarios, plus runner FALL (lose balance → land on one knee → sit holding the knee). Runner events now support FALL alongside soreness and outdoor skin events. Onset follows the existing reaction timer, then holds the final pose with subtle breathing. Rescue, failure and clearing immediately stop the animation. Collision, movement, item correctness and event deadlines retain their existing rules. The transparent 3×5 runtime atlas is `reference/runtime/sports-injury-v4.webp` (PNG fallback): v2 corrects the skateboard girl's extra leg; v3 refines soreness poses; v4 appends the runner fall row while preserving all twelve prior poses pixel-for-pixel. `qa/build-runner-fall.mjs` packages the built-in ImageGen source with a shared scale and foot baseline, after the existing injury build scripts. Source prompt and registration are saved in `reference/art-layouts/runner-fall-prompt-v1.json` and `runner-fall-registration-v1.json`. Registered alpha bounds generate `src/game/InjurySpriteLayout.js` so dialogue pointers follow actual pose height. Open `/qa/injury-preview.html` for replay/recovery controls; `qa/injury-browser.mjs` checks asset decode, all five sequences, recovery and replay.

All eleven City/Sports roles now use static concerned expressions during active dialogue-only scenarios, with the same accessories, scale and foot registration as their normal sprites. These are `reference/runtime/city-condition-v2.webp` and `sports-condition-v2.webp` (PNG fallbacks). Successful rescue restores the normal smiling sprite; unavailable expression assets safely fall back to the normal sprite. Ground shadows meet the lifestyle characters' feet, and the delivery worker's soreness dialogue refers to delivery work. The built-in ImageGen prompts and crop registration are retained in `reference/art-layouts/art-refinement-prompts-v3.json` and `art-refinement-manifest-v3.json`.

Park/Mountain (and their shared Tutorial sprites) use matching concerned versions of the original hiker/elder/child atlas during generic itch/soreness events: `reference/runtime/npc-condition-v2.webp` (PNG fallback). Original costumes, cane, glasses, backpacks and relative character sizes are preserved. `qa/build-legacy-expressions.mjs` packages this sheet against the existing sprite alpha bounds, generating `src/game/NPCSpriteLayout.js` to align shadows and dialogue with each character's actual feet/head. Prompt and registration are saved as `reference/art-layouts/legacy-expression-prompt-v2.json` and `legacy-expression-manifest-v2.json`. `qa/legacy-art-browser.mjs` checks Park/Mountain loading, both conditions, recovery and cached return. `qa/condition-art-audit.mjs` captures the 54 City/Sports states plus 60 Park/Mountain states (itch/soreness × WARNING/HELP/CRITICAL for every stage role).

City/Sports v1 scene artwork and all eleven character sprites are integrated. Source layout guides, built-in ImageGen prompts and runtime crop registration are saved under `reference/art-layouts/`. `qa/build-lifestyle-art.mjs` packages the PNG masters into WebP maps and normalized 3×2 character atlases (set `JELLY_SHARP_MODULE` to an available Sharp package). `qa/lifestyle-art-browser.mjs` checks decoded map/atlas selection, all eleven roles, portrait rendering, legacy-stage switching and cached return; it uses the same Playwright configuration as the browser runner. Dedicated directional walking and fall/exercise pose sheets remain future animation polish. Human playtesting on physical phones is still useful for subjective difficulty and art polish; browser mobile validation uses emulated viewports/pointer input.

## Intentional scope limits

No shop, equipment, progression tree, gacha or inventory system is included. Combat is isolated to the optional special stage below.

## Special stage: 異星蚊災 / Alien Mosquito Invasion

Choose **SPECIAL STAGE → 開始挑戰** on the home screen. This separate `alienMosquito` mode is not in `STAGE_ORDER`; Tutorial → Park → Mountain → City → Sports is unchanged. It uses a dedicated teal/violet night version of Park, preserving its road and obstacle footprints and shared collision. The combat camera frames the player and enemies, reserving space for the HUD and controls on portrait screens.

Art v1 uses `reference/runtime/alien-map-v1.webp`, `alien-enemies-v1.webp` (six wing frames for three species) and `alien-boss-v1.webp` (normal wing poses, charge, fatigue, dizzy and UFO). PNG fallbacks are included. King frames register the belly socket to one fixed point; the renderer adds the core glow only while vulnerable. Attack paths, HP dots, PPA pulses and slow bubble projectiles remain live gameplay overlays. Missing creature art uses the original procedural fallback. The home special card previews the King and night park. Built-in ImageGen prompts are in `reference/art-layouts/alien-art-prompts-v1.json`; `qa/build-alien-art.mjs` packages the sprites with transparent padding and recorded registration. `qa/alien-art-browser.mjs` verifies atlas frames in desktop/390px/375px combat, core/dizzy/UFO presentation, fallback and regular Park isolation.

Move with WASD/arrows or the existing mobile D-pad. Press E/Space/使用 for **PPA ENERGY PULSE**. There is no aiming or extra attack button. PPA is locked for this round and NAP is hidden; returning to a rescue stage restores normal item selection. Pulses reach 115 world units, have a 0.52-second cooldown, damage the nearest eligible target once, and clear nearby bubbles. Ground obstacles shield small enemies; the flying King's core can be reached over terrain within range. Empty pulses still give feedback.

- Wave 1: 3 scouts. Wave 2: 2 scouts + 1 charger. Wave 3: 2 scouts + 1 charger + 1 bubble enemy. Scouts/chargers have 2 HP; bubble enemies have 3 HP. At most four small enemies and four bubbles are active.
- After Wave 3, a protected warning/arrival/title sequence introduces **異星嗡嗡王 / MOSQUITO KING**, with 18 HP.
- Phase 1: chase → telegraph → dash → recover → 2.3-second core opening.
- Phase 2 at 12 HP: summon two scouts once, then double bubble → dash → recover → 2-second opening.
- Phase 3 at 6 HP: +15% movement/dash speed, dash → double bubble → second dash → 2.3-second fatigue/opening.
- Closed cores block PPA; each successful core hit removes 2 HP. Three hearts, 1.2-second damage invulnerability, and a dedicated Game Over complete the failure loop.
- King chase/dash ignore ground obstacles and stay within world bounds. All live King combat poses cause contact damage, including core openings; arrival and victory remain protected. Player and small-enemy ground collision remains intact.
- Victory clears threats immediately, shows a purple/white energy burst and a dizzy Mini Mosquito King escaping by UFO, then presents a dedicated result with time, enemies, damage, PPA hits, Boss hits and score. Replay and Home are the only result actions.

Scoring is independent of rescue statistics/personal best: scout 100, charger 150, bubble enemy 200, successful Boss hit 50, Boss defeat 1500, clear 500, and no damage **during the Boss fight** 500. PPA HITS counts successful enemy and Boss hits; BOSS HITS is its Boss-only subset. Clear time includes waves and arrival, stopping on the final hit before the victory animation.

Completing the full victory sequence collects **癢癢核心 / CORE 001** once. The result shows a first-collection/already-collected card; the home screen and result both open the core encyclopedia. Locked entries show a discovery hint, unlocked entries show the icon and description. `CoreCollectionStore` saves the collection independently under `jellyRescue.coreCollection.v1`; failed runs never award it, repeated clears do not duplicate it, and reload restores it. If storage is unavailable, session collection is labeled as such. The modal supports Close/Escape and restores focus. Built-in ImageGen icon source/prompt: `reference/generated-itch-core-v1.png` / `reference/art-layouts/itch-core-prompt-v1.json`; `qa/build-itch-core.mjs` packages the transparent `reference/runtime/itch-core-v1.webp` with PNG fallback. `qa/core-collection-browser.mjs` verifies contact HUD damage, clear unlock, three viewport sizes, persistence, replay and failure.

`BossConfig` centralizes tuning; `CombatNavigation` reuses the collision visibility graph; `Enemy`/`EnemyDirector` own small enemies and spawning; `BossMosquito` owns the Boss state machine; `BossCombatSystem` owns combat, waves and projectiles; `BossScoreManager` keeps statistics separate; `BossRenderer` owns procedural art/camera; `BossStageUI` owns HUD/results. `Game` only routes mode-specific updates, actions and rendering. The procedural characters can be replaced without changing collision or gameplay dimensions.

On localhost, the existing debug panel adds Wave 1/2/3, Spawn Boss, Phase 2/3, Core Open, HP -2 and Clear Enemies. Existing Infinite Life and radius controls work in combat. Boss debug controls are unavailable through the production UI. Blur/hidden, exit confirmation and Continue use the existing pause gates; combat uses simulation time only.

Validation:

```powershell
npm test                         # 30 existing + 22 special-stage tests
node qa/boss-simulation.mjs       # complete natural phase/wave flow with an automated mover
node qa/boss-browser.mjs          # requires the same Playwright setup as other QA scripts
node qa/scenarios-browser.mjs
node qa/input-reliability-browser.mjs
```

The simulation uses normal movement speed and infinite life to isolate flow/score verification; it is not a human difficulty assessment. Browser QA covers desktop, 390×844 and 375×667, controls, PPA lock, four-enemy readability, Boss HUD, pause, phases, victory, Game Over, replay and result scrolling. Results are saved under `qa/boss/`; screenshots remain local/ignored. Physical-phone feel and human difficulty acceptance remain to be playtested.
