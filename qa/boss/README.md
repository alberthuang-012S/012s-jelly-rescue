# SPECIAL BOSS STAGE — implementation report

## Overall Status

**PASS — implementation, automated tests and emulated browser QA.** Physical-phone acceptance and subjective difficulty tuning are not claimed as verified.

## Starting State

- Branch: `main`
- Starting SHA: `61a4370477201c65894eeff727918c844aa9568b`
- Working tree: already dirty, with 12 modified files and 6 untracked files, primarily Sports runner injury artwork/animation. Preserved in place; exact initial inventory is in `starting-state.json`.

## Implemented

Independent home entry for 異星蚊災 / ALIEN MOSQUITO INVASION; PPA-only combat; three original procedural enemy types; Park collision/art reuse with a violet overlay; combat framing for desktop/portrait; waves, arrival, three Boss phases, core vulnerability, hearts/invulnerability, Game Over, Mini Boss/UFO victory, independent results and score. Existing `STAGE_ORDER` is unchanged. Boss controls in the existing debug panel are localhost-only.

## Special Stage Flow

| Step | Behavior |
| --- | --- |
| Wave 1 | 3 scouts; 1.1-second clear intermission |
| Wave 2 | 2 scouts + 1 charger; 1.1-second clear intermission |
| Wave 3 | 2 scouts + 1 charger + 1 bubble enemy; 1.4-second quiet intermission |
| Arrival | Protected 4.4-second warning, shadow, entry and 1.8-second title card |
| Boss Phase 1 | Chase, telegraph, fixed-direction dash, recover, open core |
| Boss Phase 2 | At 12 HP, summon 2 scouts once; double bubble, dash, recovery/open core |
| Boss Phase 3 | At 6 HP, +15% speed; dash, double bubble, second dash, fatigue/open core |
| Victory | Final hit stops threats immediately; 5.5-second energy/mini/UFO sequence; dedicated result |

## Controls

- Desktop: WASD/arrows move; E/Space releases PPA. Q cannot select NAP in this mode.
- Mobile: existing D-pad and 使用; PPA card remains accessible and NAP is hidden.
- Empty pulses are allowed. No aiming or second attack control. Returning to rescue restores PPA/NAP switching.
- Blur/hidden and exit confirmation pause gameplay. Continue resets the frame timestamp and clears held input.

## Architecture

| File | Responsibility |
| --- | --- |
| `src/game/BossConfig.js` | Central combat, enemy, wave and Boss tuning |
| `src/game/CombatNavigation.js` | Collision-safe movement, connected spawn validation and obstacle routing |
| `src/game/Enemy.js` | Independent small-enemy state machines |
| `src/game/EnemyDirector.js` | Waves, bounded population and summon queue |
| `src/game/BossMosquito.js` | Boss patterns, thresholds and vulnerability |
| `src/game/BossCombatSystem.js` | Pulses, projectiles, lives, combat clock and encounter transitions |
| `src/game/BossScoreManager.js` | Combat-only statistics and scoring |
| `src/game/BossRenderer.js` | Procedural character art, effects, cinematic rendering and combat camera |
| `src/game/BossStageUI.js` | Special entry, HUD and result presentation |
| `src/game/Game.js` | Small mode dispatch hooks, lifecycle and rendering orchestration |
| `src/game/StageManager.js` | Separate `SPECIAL_STAGE_DEFS`; preserves normal stage order |
| `src/game/ItemSystem.js` | Round-scoped PPA lock reset for normal stages |
| `src/game/HUD.js` | Optional special presentation hook |
| `index.html`, `src/styles.css` | Matching home card, HUD, results and responsive styling |
| `qa/boss.test.mjs`, `qa/boss-browser.mjs`, `qa/boss-simulation.mjs` | Unit/integration, browser and natural encounter-flow checks |

Existing Player, InputController, NPC gameplay, rescue ScoreManager and ResultScreen behavior remain unchanged by this feature. Original Park imagery is unchanged.

## Balance

- Enemy HP: Scout 2 / Charger 2 / Bubble 3. Boss HP: 18; vulnerable pulse damage: 2.
- PPA: 115-unit center range, 0.52-second cooldown, nearest unobstructed target once per pulse; nearby unobstructed bubbles are removed.
- Player: 3 lives, 1.2-second invulnerability after damage, flashing feedback.
- Charger: 0.75-second fixed-vector telegraph, 0.55-second dash, 1.3-second recovery.
- Boss: 0.95-second telegraph, 0.62-second dash, 0.45-second recovery; openings 2.3 / 2.0 / 2.3 seconds. Phase 3 telegraph becomes approximately 0.83 seconds.
- Bubbles: 78 units/second, 5-second lifetime, global cap 4; small bubble enemy fires every 2.8 seconds after its initial delay.
- Score: small enemies 100 / 150 / 200; Boss hits 50 each; defeat 1500; clear 500; no damage during Boss combat 500. Rescue metrics are isolated.

## Tests

- Baseline: **30/30 existing tests PASS** before implementation.
- Final unit/integration suite: **52/52 PASS** (30 existing + 22 new).
- Complete simulation: **PASS**, approximately 44 simulated seconds, all natural phases/windows, 12 defeated enemies, 9 Boss hits, 4,350 points. It uses normal-speed movement and infinite life; it does not validate human difficulty.
- `qa/boss-browser.mjs`: **PASS** in installed Edge at desktop 1280×900 and portrait 390×844 / 375×667. Covers entry, controls, Q lock, empty pulse, four enemies, UI geometry, pause snapshots, phases, victory, results, replay, Game Over and restoration of normal stages. Browser tests use controlled state setup for individual encounters.
- `qa/scenarios-browser.mjs`: **PASS** across all five existing stages and all three viewport sizes, no page errors.
- `qa/input-reliability-browser.mjs`: **PASS**, including key-repeat suppression, native button activation, blur/visibility, explicit resume and result scrolling.
- `git diff --check`: **PASS**; Git reports only the repository's existing LF/CRLF conversion notices.
- Browser report: `browser-report.json`. Local ignored screenshots include waves, core, phases, Mini Boss/UFO and results.

## Regression Check

| Area | Verified result |
| --- | --- |
| Tutorial | PASS: movement, PPA/NAP practice, final rescue, untimed completion |
| Park / Mountain | PASS: controls, rescue, results, replay/next, exit/pause, Game Over |
| City / Sports | PASS: scenarios, dialogue, simultaneous events and result flow |
| PNN+3 / Evolution | PASS: Mountain reward, consumption, permanent +25% speed, City continuation |
| Existing collision / NPC behavior | PASS: unchanged rescue tests and browser checks |
| Mobile | PASS for emulated 390×844 and 375×667 controls/layout/scroll; physical devices unverified |
| Rescue personal best / metrics | PASS in existing regression suite |

## Remaining Issues

Physical-phone feel and human difficulty acceptance have not been tested. No known incomplete gameplay flow remains in the automated/browser coverage above.

## Git

- Final HEAD: `61a4370477201c65894eeff727918c844aa9568b` (same as starting SHA).
- Feature changes remain uncommitted alongside preserved pre-existing changes.
- Push status: **not pushed**; no commit/push was requested.
