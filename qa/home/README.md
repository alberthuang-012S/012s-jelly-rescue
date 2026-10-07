# Centered mission lobby

Desktop keeps the mascot at the viewport's horizontal and vertical center. The compact brand header and core encyclopedia sit above the lobby. Patrol selection is on the left, Endless Rescue on the right, and all three Boss cards share the lower row. Equal side columns and a reserved mascot column prevent overlap; all five start entries and the encyclopedia fit at 1024×768 and 1366×768.

Patrol keeps six mission tabs (3×2), a map preview, a Chinese mission title and one start button. Arrow/Home/End navigation, one tab stop and Enter to start remain intact. Keyboard hints sit below the Boss cards. Endless uses the new Central Plaza artwork and shows the two main rules and personal best. With a saved run, Continue becomes the primary button and New Run stays secondary, retaining the existing replacement confirmation.

Phones show a centered mascot above compact stacked entries and horizontal Boss cards. First-time visitors see patrol/tutorial first. After entering a mission, `jellyRescue.home.visited.v1` records only the home ordering preference; returning visitors see Endless first. An existing endless save also selects returning order. Gameplay saves, scores, cores and rules retain their existing storage. If storage is unavailable, ordering works within the current page.

The top-right encyclopedia shows the existing collected count. Each Boss card shows its own collected/uncollected core state, including the existing session-only storage label. The collection dialog still restores focus to its trigger. Decorative backgrounds stay within the home bounds and returning home resets both scroll axes.

Styles live in `src/home.css`, scoped to home so game HUD layouts remain separate. Existing map, mascot and Boss art are reused.

Run `node qa/home-browser.mjs` with `JELLY_PLAYWRIGHT_MODULE` set to the local Playwright installation. It starts a server on 4193 and saves ignored PNGs plus `browser-report.json`. Coverage: 1440×900, 1280×900, 1366×768, 1024×768, 1920×1080, 768×1024, 320×640, 375×667, 390×844 and 667×375; centered mascot/no overlap, all three Boss cards, preview/tab navigation, core count/status, all three Boss entries, tutorial interaction, returning-phone order, primary resume, reload and new-run confirmation. `qa/endless-browser.mjs` covers the five-size continuous challenge flow.
