# 光采花園 / Radiance Garden

The sixth mainline selection is a 60-second ordinary rescue stage using only DDM+1 for PIGMENTATION (黑色素) and SSW+1 for SALLOWNESS (皮膚蠟黃). It follows Sports in STAGE_ORDER. Stage data, routes, measured collision and tuning are in `src/game/GardenStage.js`.

The first visit in each app session shows a native modal before simulation starts. The jellyfish welcomes the player with both Q-version bottle icons, a 60-second reminder and device-specific touch/keyboard instructions; the primary button reads 準備好了，出發！. It traps focus, supports keyboard dismissal and remains paused through background suspension; its primary button becomes Continue during suspension. Replays reset to DDM without repeating the introduction. Existing tutorial and Boss items are restored on stage changes.

Garden dialogue displays only the resident's words in up to two full text lines, sized and clamped to the visible map. There is no extra requirement hint row. Help lines are 想處理黑色素沉澱，能幫我嗎？ / 想改善皮膚蠟黃，有辦法能幫我嗎？; DDM's departing line is 我快出發了，能先幫我處理黑色素嗎？. SSW names 皮膚蠟黃 in its initial request and 蠟黃 in its departing line. Photographer, café and shopper residents have role-specific openings/thanks; the approved help/departing lines remain shared. Failure is a departure for an appointment, and success is a thank-you followed by a garden activity.

Phases: 0–15s DDM, 15–30s SSW, 30–45s mixed with one active request, 45–60s mixed with at most two. The first request starts at 1.8s; successful dispatch cooldowns are 4.8 / 4.4 / 3.8 / 3.2s respectively. This provides more opportunities toward 3000 while retaining the shared 100-point base, speed bonuses and combo multipliers. Warning/tolerance windows and the 60-second duration stay unchanged. Deferred introductions retry, mixed phases cap same-condition streaks at two, and the shared route planner rejects impossible travel/deadline combinations. Dispatch continues until patrol end; unfinished requests at the end are not failures. Waiting represents a resident's schedule. New requests use concerned city expressions, explicit text and dot/sun icons without recoloring skin or using injury poses.

## Art

- Built-in ImageGen map source: `reference/generated-garden-map-v1.png` (1024×1536).
- WebP runtime: `reference/runtime/garden-map-v1.webp`.
- Prompt: `reference/art-layouts/garden-art-prompt-v1.json`.
- Registration: `reference/art-layouts/garden-art-registration-v1.json`.
- Supplied product photographs: `reference/runtime/DDM+1.webp` and `SSW+1.webp`; retained as original references.
- Built-in ImageGen Q-version icons: `reference/generated-ddm-chibi-v1.png` and `reference/generated-ssw-chibi-v1.png`. DDM retains the black bottle; SSW retains the white bottle, blue label and jellyfish motif. Both have transparent backgrounds and readable product names.
- Runtime icons: `reference/runtime/ddm-chibi-v1.webp` / `.png` and `ssw-chibi-v1.webp` / `.png` (256×384, transparent). Prompt and alpha/size registration: `reference/art-layouts/care-items-chibi-prompts-v1.json` and `care-items-chibi-registration-v1.json`.
- Reused NPC assets: `city-npcs-v1` and `city-condition-v2`, with procedural fallback.
- Rebuild WebP with `node qa/build-garden-art.mjs`; set `JELLY_SHARP_MODULE` when Sharp is not on the local module path.
- Package the generated item icons with `node qa/build-care-items.mjs` using the same Sharp module setting.

## Validation

```powershell
npm test
node qa/garden-simulation.mjs
node qa/garden-browser.mjs
node qa/home-browser.mjs
```

Browser QA uses the existing `JELLY_PLAYWRIGHT_MODULE` / `JELLY_BROWSER_CHANNEL` conventions and a temporary server on port 4195. It covers desktop 1280×900, portrait 390×844 / 375×667 / 320×568 and landscape 667×375; selection through actual keyboard/touch input, incorrect/correct use, modal/background pause, completion and failure statistics, replay, and item restoration in Park/City/Sports/both Boss encounters. Layout checks require 44px touch targets and no overlap between items, D-pad and Use. Screenshots are ignored; reports are retained here.

The 200-round simulation pays planned route travel plus one second for observation/switch/use, checks introductions, phase event caps and every NPC position. Scoring uses the same success-before-multiplier order as Game, resets combo on failure, and reports distributions separately for base speed (205) and evolved speed (256.25). Both speed groups must include a round reaching 3000, with zero scheduling failures. Correct item selection is assumed. It is an automated scheduling check, not a physical-phone or human difficulty assessment.
