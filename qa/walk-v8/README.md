# v7 side poses integrated into runtime v8

Source: `reference/runtime/jelly-anthropomorphic-player-walk-v7.png`, supplied by the user. Left and right use its three original poses without redrawing. The passing pose is repeated in the fourth cell to fit the runtime sequence [1,2,3,0].

Front and back use the same source and packing as v6. The original v7 is preserved. Packing removes disconnected specks, aligns head crests, and checks transparent margins.

Output: `reference/runtime/jelly-anthropomorphic-player-walk-v8.png`, 1680x1600, four 420x400 cells per direction.

Rebuild: `powershell -NoProfile -ExecutionPolicy Bypass -File qa/walk-v8/build-atlas.ps1`.
