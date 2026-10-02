# Mobile layout: City / Sports / Gravity Overload

Run `node qa/mobile-layout-browser.mjs` with `JELLY_PLAYWRIGHT_MODULE` pointing to a local Playwright installation; the script starts its own server on port 4192 and uses headless Edge.

The compact layout applies only to these three stages. Portrait retains the entire map; the CSS reserves 64px above City/Sports, 122px above Gravity and 148px below all three, plus device safe areas. At 375×667, City/Sports map width grows from 274.7px to 303.3px; Gravity grows from 238px to 264.7px. The map never overlaps the top HUD or bottom touch controls. Landscape fills the phone viewport and uses a wider follow view, with additional headroom for Gravity King's tall silhouette. Desktop and the earlier stages retain their existing cameras.

Exit occupies a 44px target in the top row. Direction buttons are 44×44px; two 60×56px item cards sit above the 72px Use button on the right. Combo remains visible beside the score. Essential HUD/item text retains its readable sizes. Gravity wave/HP/hint rows stay above the portrait map; physical core collection keeps the D-pad and hides item/Use controls. Rotation clears held movement.

`browser-report.json` records checks for 320×568, 375×667, 390×844, 430×932, 667×375 and 844×390, native single/two-finger touch, notch/home safe areas, exit/resume and stage isolation. Screenshots in this folder are generated locally and ignored by Git. The ordinary input, scenario and Gravity browser QA also covers keyboard controls, dialogue, pause/failure/results and physical core pickup. Browser emulation does not replace physical phone playtesting.
