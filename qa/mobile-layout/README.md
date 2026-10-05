# Mobile layout: City / Sports / Gravity Overload

Run `node qa/mobile-layout-browser.mjs` with `JELLY_PLAYWRIGHT_MODULE` pointing to a local Playwright installation; the script starts its own server on port 4192 and uses headless Edge.

City, Sports and Gravity now use Park's camera and controls. In portrait, all five stages have the same full-width 2:3 map rectangle, vertically centered; there is no extra top/bottom reservation on the three newer maps. At 375×667 the map is 375×562.5px with a 52.25px top offset, matching Park and Mountain. Landscape uses the existing frame and follow camera. `mobile-layout.test.mjs` protects this parity at multiple viewports and player positions.

The shared HUD, Exit, 52px directions, 56px item cards and 76px Use retain their first-stage positions. Only phones below 350px share a smaller 44px D-pad/item layout and 64px Use to avoid overlap; this also applies to Park and Mountain. Gravity keeps its NAP-only card and extra HP/hint rows beside Exit, without changing the map zoom. Physical core collection keeps the D-pad and hides item/Use controls. Rotation clears held movement.

`browser-report.json` compares all five stages at 320×568, 375×667, 390×844, 430×932, 667×375 and 844×390. It checks map/canvas/D-pad/Use/Exit parity, portrait item dock parity, text and control separation, native single/two-finger touch, device safe areas, rotation and exit/resume. Screenshots are generated locally and ignored by Git. Ordinary input, scenario and Gravity browser QA also covers keyboard controls, dialogue, pause/failure/results and physical core pickup. Browser emulation does not replace physical phone playtesting.
