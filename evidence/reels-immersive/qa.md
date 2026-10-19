# Reels immersive hands-on QA

2026-10-19. Independent Playwright MCP Chromium contexts only; user browser/session untouched. No DB writes, auth mutations, likes, orders, or fixture product changes.

## Observed behavior

- Mobile 390×844, touch-enabled Chromium: native CDP touchStart at (190,650), moves to y380. Before releasing: scrollTop 255.2, current slide top −255.2/bottom588.8; next slide top588.8 inside viewport844. This proves continuous native movement, not only ID replacement after touchEnd.
- Short drag returns to scrollTop0; long drag730→150 snaps844 (one slide); reverse160→740 returns0; fast730→150 snaps844. No double navigation observed.
- Desktop1280×900 actual mouse wheel delta720 snaps900 (one slide).
- Footer sheet opens over feed: dialog count2; first Escape closes sheet only (1), second exits feed (0); focus returns to Immersive view; body overflow restored to unset.
- Footer language selection switches html lang to ko without losing product index1. Exiting/reentering and refresh retain index1.
- Category Shoes renders one product+end; Dress renders empty state0/0 with no fake products; All restores collection.
- Product2 detail navigation releases body lock; browser back restores immersive index1.
- Nine native wheel advances reach end index9; restart eventually settles0 (long smooth travel takes longer than a single short swipe).
- Mobile and desktop document horizontal overflow false. Desktop fresh pageerror listener observed0.
- Visible current product image loads successfully (complete=true and naturalWidth>0).

## Review finding and final retest — PASS

Parent visual inspection found the mobile CTA overlapped by bottom navigation. Worker implemented measured navigation height and overlay offset. Independent final retest after server restart: EN and KO390×844 CTA top672/bottom716, nav top732/bottom844 (16px gap, no intersection). KO320×640 CTA top468/bottom512, nav top528/bottom640 (16px gap). No horizontal overflow. Refreshed screenshots were opened and visually inspected: full CTA visible.

Final held native-touch capture: scrollTop455.2, current slide top−455.2, next slide top388.8 within844 viewport. Screenshot visibly shows both current content leaving and next image entering before touchEnd. Escape then returns to grid, dialog count0 and body overflow unset.

## Boundaries and limitations

- Actual iPhone Safari/Android hardware and physical trackpad not available; Chromium mobile emulation is not Safari verification.
- Actual catalog currently has one photo per product; multi-photo horizontal behavior requires separate fixture/unit coverage, not fabricated live DB data. Native vertical touch tested on the actual image area.
- Forced failed-image network case and prolonged memory profiling not independently exercised in this browser pass; automated coverage must be reported separately.
- No authenticated favorite/cart write QA performed by design.
- End/Home keys are not claimed as supported; visible previous/next controls and native wheel/touch work.

## Screenshots

- `mobile-grid.png`: general grid.
- `mobile-immersive.png`: final EN immersive mobile, CTA above controls.
- `mobile-immersive-ko.png`: final KO immersive mobile, CTA above controls.
- `mobile-mid-drag.png`: held native touch, with measured geometry above.
- `desktop-immersive.png`: desktop feed.
- `mobile-end.png`: finite end panel.

## Cleanup

All three independent mobile/desktop contexts created for this pass closed. User contexts and development server were not owned or stopped by QA. Final disposition PASS for exercised Chromium scenarios, with hardware/multi-photo/forced-failure limitations explicitly above.

## 2026-10-19 restored real development DB / cold-cache release gate — PASS

This is the latest validation, after original Docker DB recovery. It is distinct from the earlier cached-data browser pass. Implementation owner supplied the cold-start evidence: DB-available build exit0/62 routes, zero DB revalidation errors; both exact fetch-cache paths preserved/renamed, neither active cache existed before fresh dev start; first `/for-you` GET200 then two new cache files; Prisma/DB errors0. Independent browser checks below used that restarted server (session86490), not the old server/cache. No environment, schema, seed, product, or account mutations by QA.

| Product ID | Expected direct DB AED | Immersive AED | General grid |
| --- | ---: | ---: | --- |
| 1 | 719 | 719 | match |
| 2 | 685 | 685 | match |
| 3 | 179 | 179 | match |
| 4 | 369 | 369 | match |
| 5 | 95 | 95 | match |
| 6 | 99 | 99 | match |
| 7 | 69 | 69 | match |
| 8 | 279 | 279 | match |
| 9 | 80 | 80 | match |

- Native touch while held: scroll455.2, current slide top−455.2, next slide top388.8; release settles index1. Real current+adjacent images loaded without eagerly mounting images in all nine cards (one-photo actual catalog).
- General/immersive switch, KO language via nested Footer, index1 retained, product2 detail round-trip restores index1; detail and exit body overflow unset.
- Shoes one product+end (2 slides); Dress empty0/0; All nine products; end index9 with restart button visible. Finite collection, no duplicated products.
- Mobile390×844 CTA bottom716 / nav top732, 16px non-overlap; no document horizontal overflow.
- Desktop1280×900 actual wheel720 snaps scroll900 at height900; image naturalWidth>0; CTA bottom824/nav840, 16px non-overlap.
- Fresh mobile and desktop pageerror+console-error listeners each observed0 during their instrumented native/locale/wheel checks.
- New screenshots: `real-db-mobile.png`, `real-db-mid-drag.png`, `real-db-desktop.png` (not intended as Git commit inputs).
- Both dedicated real-DB QA contexts closed; user browser and restarted development server kept running.

Release QA gate PASS for the listed real-DB Chromium scenarios. Existing hardware, multiple-photo live catalog, and forced-failure limitations above remain; no Safari claim is made.
