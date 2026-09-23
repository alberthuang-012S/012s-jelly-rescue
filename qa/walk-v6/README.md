# Compact side walk v6

Built-in image_gen edit. Final asset: `reference/runtime/jelly-anthropomorphic-player-walk-v6.png` (1680x1600; 4x4 cells). Short steps, low knees and near-ground shoes. Front/back retain the v5 sources and packing. Rebuild: `powershell -NoProfile -ExecutionPolicy Bypass -File qa/walk-v6/build-atlas.ps1`.

## Initial prompt

Use case: precise-object-edit. From the supplied jellyfish girl atlas make replacement SIDE WALK cycles only: output exactly FOUR columns and TWO rows on true transparent background. TOP row looks LEFT; BOTTOM row looks RIGHT. Preserve the exact character identity, face, hair, costume, shoes and rendering style of the supplied corresponding side views.
The user says the stride is too large and ugly. Change ONLY the leg poses to a gentle compact cute WALK, not a run, march, kick or skip. All knees stay under the skirt; legs hang mostly vertical beneath hips. Feet stay close together, horizontal shoe separation at widest stride only about ONE shoe length (about 30% of head width). Shoes almost touch ground; lifted heel only a tiny height. NO high knees, no straight forward kicking leg, no wide V stance. Head/torso stay aligned with same size in every cell.
4 frame cycle: 1 near leg a SMALL step forward, far leg SMALL step back; 2 feet pass close together beneath hip; 3 far leg SMALL step forward and near leg SMALL step back, reversing the overlap of knees; 4 opposite passing pose. Both left and right rows must show alternating legs but subtly. Keep the skirt hem low, mostly covering upper legs. The posture is relaxed strolling. Both shoes remain within width of skirt center, not beyond skirt edges.
Generous padding between all 8 sprites, no crop. No text, grid, shadows, specks, white marks above head, checkerboard or backdrop.

## Refinement prompt

Targeted edit: keep all heads bodies costumes and the compact small-step style exactly. Fix ONLY the legs in THIRD column of BOTH rows so the other leg leads, not the same leg as column1.
Top LEFT-facing row, column3: the bright foreground white stocking should lean slightly RIGHT beneath the skirt, placing its shoe at the RIGHT of the pair (rear foot). The darker background stocking should lean slightly LEFT, placing its shoe at the LEFT of the pair (forward foot). Both feet almost level and touching ground, shoe centers separated by only one shoe width. The bright foreground shin crosses OVER the darker shin, so the viewer sees this leg now behind.
Bottom RIGHT-facing row column3: bright foreground white stocking should lean slightly LEFT and its shoe is the LEFT/rear foot. Darker background stocking slightly RIGHT, its shoe is RIGHT/forward foot. Both feet almost level and grounded, close together, mild X crossing only.
Do NOT spread legs farther, do NOT lift knees, do NOT kick, no jumping. Small relaxed alternating steps. Preserve every other part of image exactly, 4 columns 2 rows, transparent background.
