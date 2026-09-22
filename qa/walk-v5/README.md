# Walk v5 sprite repair

Generated with the built-in image_gen tool. Original assets are preserved.

Final atlas: `reference/runtime/jelly-anthropomorphic-player-walk-v5.png` (1680×1600; 4×4 cells of 420×400).

Rows: front, left, right, back. Runtime cycle: [1,2,3,0]. Left/right contain opposite contact poses and two passing poses. Front/back use three poses with a repeated passing pose.

Rebuild: `powershell -NoProfile -ExecutionPolicy Bypass -File qa/walk-v5/build-atlas.ps1`.
Packing identifies the 12 / 4 / 4 major connected sprite components, retains their antialiased edges, excludes disconnected specks, uses one scale per direction and registers the blue crest between frames. Every cell is checked for transparent padding. No generated source is referenced outside this workspace.

## Front/back repair prompt

Use case: precise-object-edit. Edit this existing game sprite atlas. Output a transparent PNG atlas with exactly 3 equal columns and 4 equal rows, same character identity, hair, face, blue jellyfish clothing and blue crest. No labels, lines, borders, ground shadows or backgrounds.
Rows remain DOWN/front, LEFT profile, RIGHT profile, UP/back. Keep same proportions and fully visible feet with generous transparent padding inside every cell.
Critical fix: in LEFT and RIGHT rows the current three frames incorrectly repeat the same leading leg. Draw a genuine alternating walk: column 1 near leg extended FORWARD and far leg BACK; column 2 neutral passing pose with feet under hips; column 3 near leg BACK and far leg FORWARD. The near leg is the visible leg closest to viewer. In column 3 the near shoe must be behind the hip, far shoe clearly ahead. Opposite legs must trade leading position, visibly different leg silhouettes. Keep torso/head stable in all cells. Arms counter-swing.
UP/back row: remove stray white rectangular spots or fragments above the blue crest. Draw a complete smooth clean rounded blue crest outline with only intentional internal highlights, nothing floating above head. Also remove all stray specks across atlas.
Preserve front and back appearance and original art style closely. Each direction frames aligned at same head center and foot ground baseline. Do not crop any head accessory or shoe. Actual alpha transparency, not painted checkerboard.

## Left cycle prompt

Create a precise replacement FOUR FRAME LEFT-FACING WALK CYCLE for this exact blue jellyfish girl. Preserve identity, costume, skirt, blue shoes, white socks, head and the art style. Output one horizontal row of FOUR evenly spaced full-body sprites on true transparent background. All look LEFT, heads held at identical position and scale inside each cell, generous margins, no captions or grid.
Frame 1: near leg straight ahead to LEFT, far leg trailing bent back to RIGHT. 
Frame 2: near leg planted vertically under hip, far knee lifted and moving ahead.
Frame 3: distinctly OPPOSITE pose: near leg trails stretched backward to RIGHT with near foot pointing down and heel raised; far knee is raised HIGH toward LEFT with far shin extending ahead to LEFT. White stocking of NEAR leg must clearly extend to the RIGHT behind the hip. This is the key frame. It must NOT have the same silhouette as frame 1. Lifted forward foot LEFT should be visibly HIGHER than the planted trailing near foot RIGHT.
Frame 4: far leg planted vertically, near leg bent behind and passing under body.
The leg poses MUST visibly change in every frame, with an obvious alternating leg cycle. Redraw legs completely. Frame3 MUST be an opposite stride, not a variation of frame1. Preserve identical torso and face in every frame, only legs and subtle counter-swing change. No checkerboard, text, stray pixels or white fragments above crest.

## Right cycle prompt

Create a FOUR FRAME RIGHT-FACING WALK CYCLE of the exact jellyfish girl in image1. Use image2 ONLY as reference for the successful alternating leg motion, but every sprite must face RIGHT and preserve image1's right-view costume details. Transparent PNG, one row of 4 equally spaced whole-body sprites, equal size, aligned heads and feet baseline, no captions, grid, checkerboard, shadows or floating flecks.
Frame1 near leg forward RIGHT, far leg bent trailing LEFT.
Frame2 near leg planted vertical, far knee lifted forward.
Frame3 opposite stride: near leg stretched backward LEFT with heel lifted, far leg raised forward RIGHT with bent knee. Far shoe on RIGHT clearly higher than near shoe on LEFT. Make legs exchange leading position, not the same pose repeated.
Frame4 far leg planted vertical, near leg bent behind passing under body.
Preserve same head torso face blue jellyfish costume and actual drawing style in all four frames. Do not crop anything. Generous transparent separation between cells. No white mark or fragment above crest.

