# Jelly Rescue RPG

Phase 1 playable prototype for a top-down 2D rescue RPG. The project intentionally uses browser-native ES modules and a tiny Node static server, so no package installation is required.

## Run

```powershell
npm start
```

Open `http://localhost:4173`.

## Controls

- `WASD` / Arrow keys: move the jelly
- `1` / click PPA+1: select itch treatment
- `2` / click NAP+1: select soreness treatment
- `E` / `Space` / the mobile 使用 button: rescue when close to an NPC
- Mobile portrait: full-screen vertical play with virtual D-pad, fixed item dock and large 使用 button
- Visual direction: bright pixel-town palette, deep navy outlines and enamel UI panels inspired by the sibling `012s-jelly-world` project
- Debug panel: click `DEBUG` or press `F2`

## Architecture

The core loop is split into focused modules:

- `Player`, `InputController`: movement, collision and desktop/mobile input
- `NPC`, `NPCStateMachine`: NORMAL → WARNING → HELP → CRITICAL → FAILED/RESCUED
- `EventDirector`: stage-aware event timing, conditions, simultaneous-event pressure and spawn cooldown
- `ItemSystem`, `InteractionSystem`: fixed items and close-range rescue validation
- `StageManager`, `WorldRenderer`: stage data, camera-safe map rendering and scenery
- `ScoreManager`, `ComboManager`: rescue bonuses, response metrics and combo multipliers
- `HUD`, `ResultScreen`: HUD feedback, stage clear and game-over reporting
- `Game`: orchestration only; gameplay rules remain in the modules above

## Phase 1 status

- `Jelly Park`: complete portrait-friendly loop with a wide central route, open side loops, entrance, fountain, benches, picnic area, trees, flower beds and playground.
- `Jelly Mountain`: terraced alpine route with a trailhead, wide stepped paths, a central rest deck, two readable mid-route branches and a summit lookout.
- `reference/generated-mountain-open-portrait-hq.png` is the approved portrait mountain concept rendered as the in-game background, with a spacious central meadow and sparse edge obstacles.
- `reference/world-jelly-player-hq.png` is the polished four-frame player sprite sheet; `reference/generated-npcs-hiker-elder-child-hq.png` contains the updated hiker, elder and child sprites with transparent alpha.
- `reference/world-jelly-front-hq.png` is the high-resolution front-facing jelly used by the home hero.
- Park rendering remains code-native; mountain gameplay entities and HUD are composited over the generated map background.
- Portrait layout keeps a tall camera viewport and uses the `012s-jelly-world` front-facing jelly artwork for the home character reference.
- Map NPCs use the polished generated sprite sheet `reference/generated-npcs-hiker-elder-child-hq.png`: hiker, elder and child only; no robot or rescue-worker character.
- Debug tools include forced ITCH/SORENESS events, 3-second tolerance, clear events, infinite life, interaction-radius display and stage switching.

## Intentional scope limits

No shop, equipment, progression tree, gacha, combat or inventory system is included in this phase.
