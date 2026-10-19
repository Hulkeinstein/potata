# Brand discovery card independent QA

2026-10-19. Playwright MCP Chromium, dedicated unauthenticated contexts; desktop1280×900 and mobile390×844 with native touch. No product/account/DB writes, like/order actions, or user-browser changes.

## First pass

- Real catalog sequence: product1–6 → brand:AMOU → product7–9 → end. Product sequence unchanged; grid still9 product links.
- AMOU card uses existing product3 Fur Hoodie AED179 and product5 Molly Pants AED95, exactly matching the two actual AMOU products. Two images. Search CTA `/search?q=AMOU`, correctly labelled Search by brand name / 브랜드 이름으로 검색.
- Brand → grid returns previous product6 into viewport (anchor top−69.2/bottom237.0); reenter, refresh, and search round-trip restore brand index6. Search navigation releases body lock.
- Native held drag on brand: top−455.2 and following product7 top388.8 inside844 viewport; release snaps product7 index7; reverse actual wheel returns brand index6.
- KO card CTA/hide bottom553.6 vs bottom nav top732: no overlap, no horizontal overflow. Footer nested dialog Escape2→1; outer exit cleans body overflow unset.
- Top category has no brand slide, Dress empty0/0; grid9 remains intact.
- Instrumented fresh desktop pageerror and console error listeners observed0.

## Finding and regression correction — PASS

Clicking Not interested removes AMOU but replaces that insertion slot with Nike (observed in both mobile and desktop). Active item correctly advances to product7, but cards remain10 instead of9. This differs from the agreed fixed-slot hide behavior (hidden brand slot should disappear rather than backfill another brand). Worker and parent notified; final disposition pending fix/retest.

Worker fixed slot assignment before dismissal filtering. Independent fresh mobile session retest: AMOU hide yields zero brand cards, product1–9+end only, active product7; refresh retains hidden brand and active product7. General grid9, body overflow unset, pageerror/console error0. No other brand silently replaces the hidden slot. Final disposition PASS for exercised scenarios.

## Evidence and limits

- `mobile-brand.png`, `desktop-brand.png`, `mobile-brand-drag.png` are screenshots, not commit inputs.
- Actual catalog tests one insertion slot with nine products; larger13-product/multiple-card boundaries require unit fixtures, not fabricated live products.
- Actual Safari/physical device not available; Chromium touch is not Safari verification.
- Only session-local hide is exercised; no account or persisted server preference mutations.

## Cleanup

All dedicated mobile and desktop contexts from this pass closed. An attempted broad cleanup was rejected before execution; ownership was then checked read-only and the exact sole desktop QA context was closed with viewport/URL/page-count guards. User contexts and server untouched. No source-code edits by QA.
