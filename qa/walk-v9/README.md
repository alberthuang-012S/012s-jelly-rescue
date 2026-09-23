# Alternating contact pose v9

Final atlas: `reference/runtime/jelly-anthropomorphic-player-walk-v9.png`.

Based on v8 (v7 side steps). Built-in image_gen supplied the opposite leg stance. The validated leg cutout is scaled to the original stride and foot baseline and composited into the third left-facing cell. The same leg cutout is mirrored into the third right-facing cell, retaining the existing right-facing head and costume. Other frames retain the original source. No new rendering algorithm is required; sequence stays [1,2,3,0].

Rebuild: `powershell -NoProfile -ExecutionPolicy Bypass -File qa/walk-v9/build-atlas.ps1`.

## Successful source prompt

undefined
