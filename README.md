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
- Mobile landscape: virtual D-pad + large 使用 button
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

- `Jelly Park`: complete playable loop with entrance, fountain, paths, benches, picnic area, trees, flower beds and playground.
- `Jelly Mountain`: simplified playable route with trailhead, forest, rest platform, rock slope, fork-like trail routing and summit lookout.
- Debug tools include forced ITCH/SORENESS events, 3-second tolerance, clear events, infinite life, interaction-radius display and stage switching.

## Intentional scope limits

No shop, equipment, progression tree, gacha, combat or inventory system is included in this phase.
