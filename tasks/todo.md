# Homepage Founder Preview Trust Card

## Plan

- [x] 1. Add a compact founder/story preview on the homepage near the final CTA, linking to `/founders`.
- [x] 2. Style the preview with the existing glass/gradient landing page language, keeping it smaller than a full section.
- [x] 3. Add mobile and desktop responsive rules so the card stays compact at 390px and balanced on desktop.
- [x] 4. Run `npm run build` and verify the homepage has no horizontal overflow.

---

# Premium Role Preview + Accountant Story

## Plan

- [x] 1. Add Accountant as a fifth role story with accurate manual fee/payment/receipt copy.
- [x] 2. Replace the Teacher mock with compact timetable, attendance, marks, assignment, and staff-only AI rows.
- [x] 3. Add a polished Accountant mock covering outstanding fees, recorded payments, proof upload, bulk fee creation, and receipt state.
- [x] 4. Audit Admin, Parent, and Student mocks so every role preview has meaningful visible content without empty panels.
- [x] 5. Tune desktop and mobile CSS so five tabs, compact mocks, and the role panel stay balanced without horizontal overflow.
- [x] 6. Run `npm run build` and verify responsive behavior at 390px, 1024px, 1280px, and 1440px.

---

# Targeted AI Desktop Layout Fix

## Plan

- [x] 1. Keep the desktop density system, but undo the accidental `aiSection` max-width behavior that left-locks the dark band.
- [x] 2. Center `.aiInner` and keep `.aiGrid` at two compact columns on desktop/tablet where space allows.
- [x] 3. Preserve `<768px` mobile AI stacking and verify build/overflow.

---

# Aggressive Desktop Density Follow-Up

## Plan

- [x] 1. Add final desktop-first density overrides at `>=1024px` so they win over earlier base and mobile pass styles.
- [x] 2. Reduce desktop hero scale: shorter padding, lower H1 max, smaller copy/buttons, narrower dashboard mock, compact ticker/dashboard rows.
- [x] 3. Tighten Core Platform and Role Preview: smaller max widths, card padding, preview/mock rows, tabs, icons, radii, and type.
- [x] 4. Tighten AI, story, onboarding, comparison, pricing, mid-page CTA, and final CTA so desktop feels closer to current 80% zoom.
- [x] 5. Add a light `768–1023px` bridge so tablet does not inherit oversized desktop proportions.
- [x] 6. Verify TypeScript/build and overflow at 390px, 768px, 1280px, and 1440px.

---

# Desktop Scale Reduction Pass

## Plan

- [x] 1. Add `@media (min-width: 1024px)` block: reduce hero padding, H1/body font sizes, dashboard wrap width, ticker height.
- [x] 2. Reduce section container padding (`section`, `aiSection`), section title/sub sizes, `sectionTitle` clamp.
- [x] 3. Reduce feature/role/story/compare/pricing card paddings and section-level top margins.
- [x] 4. Verify `npm run build` passes. No horizontal overflow at 390px / 768px / 1280px / 1440px.

---

# Desktop Balance + Role Mock Content Fix

## Plan

- [x] 1. Reduce base desktop CSS: featureCard padding, featureIcon margin-bottom, featurePreviewPanel padding, featurePreviewTitle size, featurePreviewStat padding/size, featurePreviewRow padding, featurePreviewRows gap/padding, featurePreviewScreenBar padding.
- [x] 2. Add `.teacherTaskRows` / `.teacherTaskRow` / `.teacherTaskLabel` / `.teacherTaskMeta` / `.teacherTaskRowAi` CSS classes plus `≤767px` compact mobile overrides.
- [x] 3. Extend `TeacherMock` in `LandingPage.tsx` with 3 compact task rows: Marks entry, Assignment review, AI report comments.
- [x] 4. Verify `npm run build` passes. No TS errors, no horizontal overflow at 390px / 768px / 1280px / 1440px.

---

# Mobile Practicality Follow-Up Pass

## Plan

- [x] 1. Tighten `<768px` section rhythm, card padding, gaps, and inner card typography so dense sections scan faster.
- [x] 2. Shorten mobile product preview and role mock cards, especially teacher/role workspace rows and empty visual height.
- [x] 3. Make the sticky mobile CTA less intrusive while preserving safe-area support and 44px touch targets.
- [x] 4. Replace the mobile comparison spreadsheet feel with compact phone-first comparison cards while leaving desktop unchanged.
- [x] 5. Recheck mobile pricing density, horizontal overflow, TypeScript, and `npm run build`.

---

# Mobile-First Landing Refinement Pass

## Plan

- [x] 1. Tighten `<768px` hero scale: smaller spacing, slightly calmer dashboard visual, no empty-feeling first screen.
- [x] 2. Recompose feature section on mobile: selected preview first, compact feature cards below, tighter preview stats/rows.
- [x] 3. Recompose role-preview on mobile: mock preview first, compact copy/card rhythm, preserve role interactions.
- [x] 4. Rework pricing mobile from horizontal carousel to one card per row with tighter padding, rhythm, and tap states.
- [x] 5. Reduce comparison/story/product section density below 768px while preserving swipe compare behavior.
- [x] 6. Verify no horizontal overflow and run `npm run build`.

---

# Saturday Morning Marketing Polish Pack

## Plan

- [ ] 1. Add lightweight client motion hooks in `lib/motion.ts` with `prefers-reduced-motion` handling.
- [ ] 2. Improve `/demo` form submit UX: disabled fields/buttons, loading indicator, duplicate-submit guard.
- [ ] 3. Add mobile-only sticky CTA bar to the landing page using hero/footer visibility.
- [ ] 4. Verify `/` remains publicly reachable for logged-in users without auth/middleware changes.
- [ ] 5. Polish pricing hover/tap states and make “Most popular” pulse once on first visibility.
- [ ] 6. Run `npm run lint`, `npx tsc --noEmit`, inspect 390px behavior, and record `git diff --stat`.

---

# Hero Rebuild — Premium Landing Page

## Tasks

- [x] 1. Add `Instrument_Serif` Google Font import and apply variable to root div
- [x] 2. Add new CSS variables (`--emerald-base`, `--amber-accent`, `--serif`) to `.page`
- [x] 3. Redesign hero background: 3-stop emerald→dark→amber gradient, amber corner radial, emerald glow `::after` (desktop only)
- [x] 4. Add SVG grain overlay (`<feTurbulence>` inline) — fixed position, opacity 0.035
- [x] 5. Rewrite H1: new copy, `clamp(2.25rem,7vw,4.5rem)`, "we know." in `.serifItalic`
- [x] 6. Replace subhead `<p>` with new copy
- [x] 7. Remove old heroPreviewCards shell + state
- [x] 8. Build `HeroDashboardCard` inline component (roster stagger, fee counter RAF, AI typer)
- [x] 9. Wire animations: single `useEffect` on mount, cleanup on unmount
- [x] 10. Dashboard card CSS: glass card, staggered roster rows, blinking cursor, attendance dots
- [x] 11. Replace `.statsBar` with activity ticker: 3 items rotate every 4s
- [x] 12. Mobile CSS: disable glow, card fills width, ticker smaller text
- [x] 13. `prefers-reduced-motion` CSS
- [x] 14. Smoke test at 390px, 768px, 1280px
- [x] 15. `npm run build` — no TypeScript or build errors

---

## Session 1 Review

> Completed 2026-04-25. Build passes clean (53 pages, 0 TS errors).

### What changed
- Hero background: deep emerald (#0a1f1a) → near-black → warm amber gradient with SVG grain noise overlay
- Typography: H1 now uses Instrument Serif (italic) for "we know." — paired with Sora sans-serif
- Product surface: old chip-tab preview shell replaced with a self-animating school dashboard card (roster + fee counter + AI typer)
- Stat strip: replaced with 3-item activity ticker cycling every 4s (CSS fade/slide)

### Tradeoffs
- **Ticker vs. static stats**: The ticker hides 2/3 of items at any time — atmospheric, not critical metrics
- **Inline SVG grain**: No extra HTTP request; negligible render cost
- **JS-driven animations**: Three concurrent useEffect timers; total payload <1 KB of new logic
- **Instrument Serif**: One additional Google Font subset (~12 KB gzip) for H1 only

---

# Role Preview + Comparison Grid Upgrade (Session 2)

## Tasks

- [x] 1. Build `AdminMock`, `TeacherMock`, `ParentMock`, `StudentMock` components (active prop, staggered 60ms reveal, mark-bar fill for Student)
- [x] 2. Add role auto-cycle state + IntersectionObserver; update role section JSX
- [x] 3. Add role content enter animation: `key={activeRole}` + CSS keyframe (200ms)
- [x] 4. Add progress bar under active tab (CSS fill 0→100% over 5s, resets on role change via React key)
- [x] 5. Wire per-role mock into `.rolePreview`; CSS: mobile tab scroll, mock UIs
- [x] 6. Replace `<table>` with CSS grid + `compareFeatures` data + CheckCircle2/Minus/Clock icons
- [x] 7. Compare mobile swipe layout (<768px): Uthaan sticky-left + competitor scroll-snap + fade swipe hint
- [x] 8. Compare row stagger (IntersectionObserver, 40ms nth-child) + column pulse + row hover
- [x] 9. `prefers-reduced-motion` overrides for all new animations
- [x] 10. `npm run build` — 0 type errors, 0 warnings

---

## Session 2 Review

> Completed 2026-04-25. Build passes clean (0 TS errors, 0 warnings).

### What changed
- **Role preview**: 4 animated per-role mock UIs replace the generic metrics/feed grid. Admin shows a fee defaulter list (3 rows, "12 outstanding" badge). Teacher shows a 5×3 attendance grid with colored dots. Parent shows a notification feed with colored indicator dots. Student shows 4 subject results with bars that fill in on activation.
- **Role auto-cycle**: Tabs cycle every 5s when section is in viewport. A thin progress bar fills under the active tab. Manual click or any pointer-down on the section cancels auto-play permanently for that visit.
- **Mobile tabs**: At ≤600px tabs switch from a full-width grid to a horizontally scrollable pill row with `scroll-snap-type: x mandatory`. No overflow hidden.
- **Comparison grid**: HTML `<table>` replaced with a CSS subgrid. `CheckCircle2` (green, tinted bg) for Yes, `Minus` (muted) for No, `Clock` (amber) for Planned/Partial. Uthaan column has highlight border + glow.
- **Compare mobile swipe**: At <768px the grid is hidden; a flex scroll container appears with Uthaan column sticky-left and each competitor as a `scroll-snap-align: start` card. A "swipe →" hint fades out after first scroll or tap.
- **Row stagger**: Compare rows fade+slide in with 40ms nth-child stagger on IntersectionObserver entry.

### Tradeoffs
- **`display: contents` vs subgrid**: Used CSS subgrid (`grid-template-columns: subgrid`) for row layout — requires Chrome 117+/Safari 16+. Appropriate for a 2026 product targeting modern browsers.
- **`key={activeRole}` remount**: Content panel remounts on every tab switch, causing mock `useEffect` to reset and re-animate. Cleaner than manual reset logic; minor cost is that React discards and recreates the DOM node.
- **Role auto-play cancelled on any pointer-down**: Simpler than a media-query JS check. Desktop users who click anywhere in the section also cancel auto-play, which is acceptable UX.
- **Sticky Uthaan column on mobile**: Uses `position: sticky; left: 0` which requires the overflow scroll parent to not have `overflow: hidden` — handled by using `overflow-x: auto` on the wrapper.
