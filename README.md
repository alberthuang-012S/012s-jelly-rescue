# Jelly Rescue RPG

Phase 1 playable prototype for a top-down 2D rescue RPG. The project intentionally uses browser-native ES modules and a tiny Node static server, so no package installation is required.

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
- `ItemSystem`, `InteractionSystem`: fixed items and close-range rescue validation
- `StageManager`, `WorldRenderer`: stage data, responsive camera rendering and scenery
- `ScoreManager`, `ComboManager`: rescue bonuses, response metrics and combo multipliers
- `HUD`, `ResultScreen`: HUD feedback, stage clear and game-over reporting
- `Game`: orchestration only; gameplay rules remain in the modules above

## Phase 1 status

- `Jelly Park`: complete portrait-friendly loop with a compact full-map view, wide central route, open side loops, generous grass areas, a small pond, fountain, picnic area and playground.
- `Jelly Mountain`: terraced alpine route with a trailhead, wide stepped paths, a central rest deck, two readable mid-route branches and a summit lookout.
- `reference/generated-mountain-open-portrait-hq.png` is the approved portrait mountain concept rendered as the in-game background, with a spacious central meadow and sparse edge obstacles.
- `reference/jelly-anthropomorphic-player-walk.png` is the current 12-frame walking sprite sheet (four directions × three phases); `reference/jelly-anthropomorphic-player.png` remains the four-direction fallback. `reference/generated-npcs-hiker-elder-child-hq.png` contains the updated hiker, elder and child sprites with transparent alpha.
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

## Intentional scope limits

No shop, equipment, progression tree, gacha, combat or inventory system is included in this phase.
