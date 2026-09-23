# Side walk v12

Runtime asset: `reference/runtime/jelly-anthropomorphic-player-walk-v12.png`.

Generated with built-in image_gen; no CLI fallback. Complete side sprites are extracted and aligned by crest, without the previous pasted-leg cut. Front/back rows remain from the existing source. Columns: near contact, near support/far passing, far contact, far support/near passing. Compact strides retained.

Validation: inspect opposite white/shaded leg positions in contact and passing poses, check original-size playback and enlarged four-frame strip. Seven movement/evolution tests pass; these tests verify behavior only, not artistic quality.

Rebuild: `powershell -ExecutionPolicy Bypass -File qa/walk-v12/build-atlas.ps1`.

## Edit 1

Use case: precise-object-edit. Edit this exact 4x4 transparent sprite sheet. Preserve all cells, all heads, poses, colors, costumes, layout, background transparency and leg orientations. ONLY repair the legs of TWO cells: row2 column3 and row3 column3. These two have badly pasted thin small legs and abrupt horizontal skin seam under skirt. Redraw these legs with same SHORT CHUBBY proportions, same large chunky blue boots, same soft painted outline and rendering as adjacent cells. Smoothly connect thighs under existing intact scalloped blue skirt. Crucially KEEP their existing reverse step: row2col3 has bright white near shin sloping DOWN-RIGHT to trailing shoe at RIGHT, shadowed far shin goes DOWN-LEFT to leading shoe at LEFT. Row3col3 mirror: bright near leg trails to LEFT while shadowed far leg leads RIGHT. DO NOT SWAP THIS LEG ORIENTATION. Preserve small step width. No detached fragments, no chopped skirt, no holes at hip. Do not alter ANY of the other fourteen cells. Same 4x4 dimensions, transparent background.

## Edit 2

Repair walk cycle in this sheet. Keep exact 4x4 sheet and character design. ONLY change side-walking rows 2 and 3. Their fourth frame is mistakenly a duplicate of second frame. Make fourth column the OPPOSITE PASSING POSE: white bright nearest leg is BENT AT KNEE, foot raised slightly OFF GROUND and tucked BEHIND the planted shaded far leg. The dark shaded far shoe stays planted DIRECTLY UNDER HIP. For LEFT facing row2, the bright lifted shoe is to the RIGHT of dark supporting shoe, tucked inward. For RIGHT facing row3, bright lifted shoe is to LEFT of dark supporting shoe. Keep little feet small steps, same chunky shoes. Third column must retain near bright leg trailing behind and dark far leg forward, as it currently does, but fix ugly unnaturally exposed thighs by extending scalloped blue skirt hem smoothly over hip joins matching columns1 and2. Keep same head/body registration, compact proportions, complete figures, transparent background, no text. Rows1 and4 untouched. The white near foot must be BEHIND dark foot in BOTH column3 AND column4, since column1 and2 have near foot forward. This is essential for anatomical alternating walk.

## Edit 3

Precise localized sprite repair. Keep every pixel/pose/layout of this 4x4 transparent spritesheet except lower legs in row2 column4 and row3 column4. These two passing poses have wrong leg shading. The supporting leg and planted shoe DIRECTLY UNDER BODY must be the FAR LEG: blue-gray shadow over its sock, thigh and shoe. The folded trailing lifted leg and shoe BEHIND BODY must be the NEAR LEG: BRIGHT WHITE sock and lit shoe top matching bright socks of column3. Change ONLY shading/occlusion identity so the bright near foot stays behind as it does in column3. Also lower the raised trailing heel slightly, leaving only half a shoe height off ground, not a high kick. Keep feet positions close together and same chunky shoes. Absolutely do not change any of other fourteen sprites. Keep transparency and dimensions. No other alterations.
