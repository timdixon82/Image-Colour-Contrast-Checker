# Carol test review — 014-iccc-design-system
**PR:** feat/014-design-system-update  
**Reviewer:** Carol  
**Date:** 2026-06-08  
**Tool version under test:** 0.4.19

---

## Status

PASS — all blocking issues resolved. B3 and B4 confirmed passing after Sean's second re-work (2026-06-08). Ready for merge.

---

## Functional pass

### 1. Theme switching
PASS. Each of the four buttons switches `data-theme` on `<html>` correctly. `aria-pressed` state is updated synchronously on all four buttons after each click. Theme persists to `localStorage["td-theme"]`. Verified by JavaScript evaluation and visual inspection in all four themes.

### 2. OS preference fallback
PASS. The inline bootstrap IIFE reads `window.matchMedia('(prefers-color-scheme: dark)')` and falls back to `'light'` if no saved preference. Logic is present in both `index.html` and `privacy.html`. Cannot be fully exercised in headless playwright (no OS-level darkmode toggle available), but code path is correct.

### 3. No flash
PASS. The bootstrap script runs as an inline `<script>` at the very top of `<head>`, before any stylesheet link, in both `index.html` and `privacy.html`. This sets `data-theme` synchronously before any CSS parses, meeting the no-flash requirement.

### 4. Privacy page
PARTIAL PASS. Bootstrap and theme picker are present on `privacy.html` and function correctly — theme persists across pages, `aria-pressed` is set correctly on load. However `privacy.html` is missing the skip-to-content link (see blocking issue B6). Also: the privacy page copy at line 100 still says "your chosen colour theme (light or dark)" — this is outdated with four themes now available (see non-blocking note N2).

### 5. Font loading
PASS. `@font-face` declarations are present in `src/styles.css` for both `Roboto-VariableFont.ttf` (normal, weight range 100–900) and `Roboto-Italic-VariableFont.ttf` (italic). Both files are committed to `src/fonts/`. `scripts/copy-models.mjs` copies them to `public/fonts/` at build time. In the running dev server, `document.fonts` reports Roboto normal `loaded` and italic `unloaded` (lazy), which is correct. `font-display: swap` ensures a readable fallback during load.

### 6. Export buttons
PASS. `npm test` passes all 6 tests. PDF export continues to build compliant PDF/UA-1 documents. The muted-light palette change in `pdf.js` is cosmetic; no functional API changes were made. Markdown export untouched and confirmed by code inspection.

### 7. Preloader
PASS. The preloader renders correctly in all four themes (observed in light and dark themes via screenshot; muted themes use the same card/bg-card surface and behave identically). The preloader header uses `.preloader-header .tagline` which inherits `var(--fg-muted)` — this shares the same contrast issue noted in B2/B3 for muted-light, but the preloader is visible only during model download so it is captured by the blocking issue rather than a separate finding.

---

## Accessibility pass — WCAG 2.2 AAA

### 1. Colour contrast

**Computed contrast ratios — removed-overrides check (specific values requested in brief)**

| Pair | Foreground | Background | Ratio | Verdict |
|---|---|---|---|---|
| dark `--fg-muted` on `--bg-card` | `#9BBCD4` | `#0D2440` | 7.84:1 | AAA PASS |
| muted-dark `--fg-muted` on `--bg-card` | `#98C7D7` | `#1E3147` | 7.24:1 | AAA PASS |
| dark `--accent` on `--bg-card` | `#EB9C52` | `#0D2440` | 7.00:1 | AAA PASS (7.004 precise) |
| muted-dark `--accent` on `--bg-card` | `#E3C196` | `#1E3147` | 7.78:1 | AAA PASS |

Selectors patched by the removed overrides (`.glossary-item > p > a`, `.image-card h4`, `.external-checkers-list a`, `.row-toggle`) all use `var(--accent)` or `var(--fg)` on `--bg-card` surfaces. The calculated ratios above show all four meet ≥ 7:1 without the workaround block. Removed overrides check: PASS for bg-card surfaces.

**Computed contrast ratios — new tokens and surfaces (full audit)**

| Pair | Foreground | Background | Ratio | Verdict |
|---|---|---|---|---|
| light `.header-accent` | `#0C3B64` | `#FFFFFF` | 11.51:1 | AAA PASS |
| muted-light `.header-accent` | `#234A73` | `#FFFFFF` | 9.14:1 | AAA PASS |
| dark `.header-accent` (`--warm`) | `#52C7EB` | `#0D2440` | 7.98:1 | AAA PASS |
| **muted-dark `.header-accent` (`--warm`)** | **`#8EBDE1`** | **`#1E3147`** | **6.63:1** | **AAA FAIL** |
| light `.tagline` (`--fg-muted`) | `#46505E` | `#FFFFFF` | 8.17:1 | AAA PASS |
| **muted-light `.tagline` (`--fg-muted`)** | **`#5A636D`** | **`#FFFFFF`** | **6.10:1** | **AAA FAIL** |
| dark `.tagline` (`--fg-muted`) | `#9BBCD4` | `#0D2440` | 7.84:1 | AAA PASS |
| muted-dark `.tagline` (`--fg-muted`) | `#98C7D7` | `#1E3147` | 7.24:1 | AAA PASS |
| light `--warn` on `--warn-bg` | `#544012` | `#F6E8C8` | 8.16:1 | AAA PASS |
| dark `--warn` on `--warn-bg` | `#DDB84B` | `#3A2C0C` | 7.14:1 | AAA PASS |
| muted-light `--warn` on `--warn-bg` | `#4E3C18` | `#EDE6D2` | 8.50:1 | AAA PASS |
| muted-dark `--warn` on `--warn-bg` | `#DFC686` | `#332B12` | 8.40:1 | AAA PASS |
| light theme-btn active (`--accent-text` on `--accent`) | `#FFFFFF` | `#0C3B64` | 11.51:1 | AAA PASS |
| dark theme-btn active | `#061528` | `#EB9C52` | 8.21:1 | AAA PASS |
| muted-light theme-btn active | `#FFFFFF` | `#234A73` | 9.14:1 | AAA PASS |
| muted-dark theme-btn active | `#142536` | `#E3C196` | 9.15:1 | AAA PASS |
| light theme-btn idle (`--fg` on `--bg-card`) | `#1A1A1A` | `#FFFFFF` | 17.40:1 | AAA PASS |
| dark theme-btn idle | `#E2E7EC` | `#0D2440` | 12.56:1 | AAA PASS |
| muted-light theme-btn idle | `#2B3138` | `#FFFFFF` | 13.13:1 | AAA PASS |
| muted-dark theme-btn idle | `#E2E7EC` | `#1E3147` | 10.64:1 | AAA PASS |
| light `--fg-muted` on `--neutral-bg` (`.results-disclaimer`) | `#46505E` | `#ECEEF1` | 7.03:1 | AAA PASS |
| **muted-light `--fg-muted` on `--neutral-bg`** | **`#5A636D`** | **`#E7EAED`** | **5.05:1** | **AAA FAIL** |
| **dark `--fg-muted` on `--neutral-bg`** | **`#9BBCD4`** | **`#15314F`** | **6.65:1** | **AAA FAIL** |
| **muted-dark `--fg-muted` on `--neutral-bg`** | **`#98C7D7`** | **`#283A4E`** | **6.36:1** | **AAA FAIL** |

See blocking issues B1–B5 for the five failing pairs.

**Notice border** check: CSS applies `var(--accent)` border in light themes and `var(--warm)` border in dark themes. Verified by `getComputedStyle` in browser: dark theme border = `#52C7EB` = `--warm` (correct); muted-light border = `#234A73` = `--accent` (correct). PASS.

### 2. Focus ring
PASS. Global rule `:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; border-radius: 4px; }` confirmed present and correct. CLAUDE.md requires "3px `var(--accent)` outline, 3px offset." This matches. Component-specific overrides (glossary summary, skip link) are additive, not regressions.

### 3. Theme picker
PASS with one condition (covered by B6). The `.theme-picker` has `role="group"` and `aria-label="Colour theme"`. All four buttons carry `aria-pressed` (`"true"` / `"false"`), updated on every click. All buttons have `min-height: 44px` and rendered height of 44px. PASS for `index.html`. `privacy.html` theme picker also functions correctly.

### 4. Skip link
PARTIAL FAIL. `index.html` has the skip link correctly placed as the first child of `<body>` (WCAG 2.4.1). `privacy.html` has no skip link — the header renders as the first body element and keyboard users cannot bypass the navigation group. See blocking issue B6.

### 5. `prefers-reduced-motion`
PASS. Global rule `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }` is present at line 235. This blanket override covers all transitions including the theme-btn transition and header gradient animation.

### 6. `lang="en-GB"`
PASS. Both `index.html` and `privacy.html` have `<html lang="en-GB">`.

### 7. Removed-overrides check (summary)
PASS for bg-card surfaces (see computed ratios table above). FAIL for neutral-bg surfaces in three themes (see B3–B5). The removal of the old AAA workaround block is safe for bg-card but has exposed three neutral-bg failures.

### 8. `--warn` on notice border
PASS. The CSS at lines 514–527 applies `border-left-color: var(--warm)` for dark and muted-dark themes, and the base style uses `var(--accent)` for light themes. The brief's note about checking whether it should be `--warm` or `--accent` in light is confirmed: light themes use `--accent` (correct per DS spec); dark themes use `--warm` (correct per DS spec).

---

## Visual pass

Screenshots taken in all four themes via Playwright against the running Vite dev server.

### 1. Header — all four themes
PASS (light, dark, muted-light). FAIL for muted-dark (see B1 — the header-accent contrast fails, though the header structure and gradient line are correct).

- Light: white card header, navy "Contrast Checker" wordmark, orange-to-navy gradient bottom line. Matches prototype.
- Dark: dark navy header, sky-blue "Contrast Checker" wordmark (`--warm: #52C7EB`), blue-to-orange gradient. Matches prototype.
- Muted Light: white card header, deeper navy wordmark (`--accent: #234A73`), burnt-orange-to-navy gradient. Matches prototype.
- Muted Dark: dark steel-blue header, light-blue "Contrast Checker" wordmark (`--warm: #8EBDE1`) — structurally correct but contrast fails AAA at 6.63:1 (B1).

### 2. Theme picker appearance and behaviour
PASS. Active button renders with `--accent` background and `--accent-text` foreground in all themes. Idle buttons use `--fg`/`--border` styling. Gradient bottom line uses correct `--warm`/`--accent` values per theme. Buttons are 44px tall throughout.

### 3. Notice/disclaimer border colour per theme
PASS. Visual inspection confirms: orange/warm border in light, sky/warm border in dark, navy/accent border in muted-light, steel-blue/warm border in muted-dark. All correct per DS spec.

### 4. Visual consistency with design system
PASS overall for structure, layout, and token application. The muted-light and muted-dark themes produce more understated palettes while maintaining visual consistency with the light and dark themes. The preloader renders correctly in the loading state with theme-adaptive card surface.

---

## Blocking issues

1. **B1 — AAA failure: muted-dark `.header-accent`**
   `--warm (#8EBDE1)` on `--bg-card (#1E3147)` = **6.63:1** (required ≥ 7:1).
   Location: `src/styles.css` line 192–197 (`--warm: #8EBDE1`) and lines 331–332 (`.header-accent` colour rule). Both `index.html` and `privacy.html` are affected. `--warm` must be darkened until the pair reaches ≥ 7:1 against `#1E3147`, or `--bg-card` must lighten. A value of approximately `#7AAED4` achieves 7.02:1.

2. **B2 — AAA failure: muted-light `.tagline` (`--fg-muted` on `--bg-card`)**
   `#5A636D` on `#FFFFFF` = **6.10:1** (required ≥ 7:1).
   Location: `src/styles.css` line 163 (`--fg-muted: #5A636D`). The `.app-header` and `.preloader-header` tagline, the `.disclaimer-notice` muted copy, and all other `var(--fg-muted)` text on `--bg-card` surfaces in muted-light are affected. `--fg-muted` must be darkened to at least approximately `#4E5662` (which gives ~7.02:1 on white) without breaking its other uses.

3. **B3 — AAA failure: muted-light `--fg-muted` on `--neutral-bg`**
   `#5A636D` on `#E7EAED` = **5.05:1** (required ≥ 7:1).
   Location: same `--fg-muted` token as B2, but now on `--neutral-bg: #E7EAED`. Affects `.results-disclaimer` background and any panel using `--neutral-bg` with muted copy. This failure is more severe than B2. Fixing B2 by darkening `--fg-muted` will bring this surface closer to AAA but the fix must be verified against both `--bg-card` and `--neutral-bg`.

4. **B4 — AAA failure: dark `--fg-muted` on `--neutral-bg`**
   `#9BBCD4` on `#15314F` = **6.65:1** (required ≥ 7:1).
   Location: `src/styles.css` line 136 (`--fg-muted: #9BBCD4`) and line 148 (`--neutral-bg: #15314F`). Affects `.results-disclaimer` in the dark theme. `--fg-muted` must be lightened or `--neutral-bg` must be darkened for this pair. Current dark-theme `--fg-muted` is 7.84:1 on `--bg-card`, so only the neutral-bg pairing fails.

5. **B5 — AAA failure: muted-dark `--fg-muted` on `--neutral-bg`**
   `#98C7D7` on `#283A4E` = **6.36:1** (required ≥ 7:1).
   Location: `src/styles.css` line 188 (`--fg-muted: #98C7D7`) and line 199 (`--neutral-bg: #283A4E`). Same pattern as B4. Current muted-dark `--fg-muted` is 7.24:1 on `--bg-card`, so only the neutral-bg pairing fails.

6. **B6 — Missing skip link on `privacy.html`**
   `privacy.html` has no `<a href="#app" class="skip-link">Skip to main content</a>` before the header. WCAG 2.4.1 (Bypass Blocks) requires a mechanism for keyboard users to skip repeated blocks. `index.html` includes this correctly. The skip link must be added as the first child of `<body>` on `privacy.html`.

---

## Non-blocking notes

1. **N1 — PDF pill cells are AA-only, not AAA**
   `pdf.js` pill colours: fail badge (#8A2A2A on #F0DCDC) = 6.53:1; neutral badge (#4A535D on #E7EAED) = 6.47:1. These are rendered in a downloaded PDF document, not the interactive UI, and the brief's stated goal is "print-safe" (vestibular/cognitive all-pass). They are worth recording but do not gate the UI release.

2. **N2 — `privacy.html` localStorage description outdated**
   Line 100 says "your chosen colour theme (light or dark)." With four themes now active, this should read "your chosen colour theme (light, dark, muted light, or muted dark)." Copyedit fix only, no code logic change needed.

3. **N3 — `frame-ancestors` CSP in `<meta>` is silently ignored**
   Both `index.html` and `privacy.html` include `frame-ancestors 'none'` in a `<meta http-equiv="Content-Security-Policy">` element. Browsers only honour `frame-ancestors` when delivered in HTTP headers; the meta-tag form has no effect. The deploy headers (served via GitHub Pages) should carry this directive. Pre-existing issue, not introduced by this PR.

4. **N4 — dark `--accent` on `--bg-card` has zero margin above AAA**
   `#EB9C52` on `#0D2440` = 7.004:1. Passes AAA by less than 0.01. Any future darkening of `--bg-card` or lightening of `--accent` in the dark theme would fail. Worth flagging for awareness.

---

## Accessibility specialist recommendations

No dispatch recommended at this time. The blocking failures (B1–B5) are token-level contrast failures that can be corrected by Sean with the values indicated above. Once corrected, a re-run of this contrast audit will confirm. No new interactive component patterns have been introduced that would require specialist review.

---

## Re-test — 2026-06-08

Re-test scope: six items fixed by Sean (B1–B6). All other checks carried forward as PASS from the original report above.

### Workings

**B1 — muted-dark `.header-accent` now uses `var(--accent)`**

`src/styles.css` line 333: `[data-theme="muted-dark"] .header-accent { color: var(--accent); }` — present and separate from the dark rule (line 331).
`--accent` in `[data-theme="muted-dark"]` scope: `#E3C196` (line 190).
`--bg-card` in `[data-theme="muted-dark"]`: `#1E3147` (line 186).

`#E3C196` luminance:
- R=227: (0.8902+0.055)/1.055=0.8959; 0.8959^2.4=0.7684
- G=193: (0.7569+0.055)/1.055=0.7697; 0.7697^2.4=0.5334
- B=150: (0.5882+0.055)/1.055=0.6097; 0.6097^2.4=0.3053
- L = 0.2126×0.7684 + 0.7152×0.5334 + 0.0722×0.3053 = 0.1633+0.3814+0.02204 = **0.5667**

`#1E3147` luminance:
- R=30: (0.1176+0.055)/1.055=0.1636; 0.1636^2.4=0.01305
- G=49: (0.1922+0.055)/1.055=0.2344; 0.2344^2.4=0.03069
- B=71: (0.2784+0.055)/1.055=0.3161; 0.3161^2.4=0.06294
- L = 0.2126×0.01305 + 0.7152×0.03069 + 0.0722×0.06294 = 0.002774+0.02195+0.004544 = **0.02927**

Ratio: (0.5667+0.05)/(0.02927+0.05) = 0.6167/0.07927 = **7.78:1**

**B2 — muted-light `--fg-muted` changed to `#484F59`, on `--bg-card` `#FFFFFF`**

`src/styles.css` line 163: `--fg-muted: #484F59` — confirmed. Comment: "app override: DS #5A636D fails 7:1 on --neutral-bg (#E7EAED), 5.05:1".

`#484F59` luminance:
- R=72: (0.2824+0.055)/1.055=0.3198; 0.3198^2.4=0.06488
- G=79: (0.3098+0.055)/1.055=0.3458; 0.3458^2.4=0.07808
- B=89: (0.3490+0.055)/1.055=0.3830; 0.3830^2.4=0.09998
- L = 0.2126×0.06488 + 0.7152×0.07808 + 0.0722×0.09998 = 0.013793+0.055836+0.007219 = **0.076848**

`#FFFFFF` L = 1.0

Ratio: (1.0+0.05)/(0.076848+0.05) = 1.05/0.126848 = **8.27:1**

**B3 — muted-light `--fg-muted` `#484F59` on `--neutral-bg` `#E7EAED`**

`#E7EAED` luminance:
- R=231: (0.9059+0.055)/1.055=0.9108; 0.9108^2.4=0.7991
- G=234: (0.9176+0.055)/1.055=0.9219; 0.9219^2.4=0.8229
- B=237: (0.9294+0.055)/1.055=0.9331; 0.9331^2.4=0.8468
- L = 0.2126×0.7991 + 0.7152×0.8229 + 0.0722×0.8468 = 0.16989+0.58831+0.06114 = **0.81934**

Ratio: (0.81934+0.05)/(0.076848+0.05) = 0.86934/0.126848 = **6.85:1**

**B4 — dark `--fg-muted` changed to `#A0C0D7`**

`src/styles.css` line 137: `--fg-muted: #A0C0D7` — confirmed. Comment: "app override: DS #9BBCD4 fails 7:1 on --neutral-bg (#15314F), 6.65:1".

`#A0C0D7` luminance:
- R=160: (0.6275+0.055)/1.055=0.6469; 0.6469^2.4=0.35142
- G=192: (0.7529+0.055)/1.055=0.7658; 0.7658^2.4=0.52654
- B=215: (0.8431+0.055)/1.055=0.8515; 0.8515^2.4=0.68000
- L = 0.2126×0.35142 + 0.7152×0.52654 + 0.0722×0.68000 = 0.074712+0.376580+0.049096 = **0.500388**

`#15314F` luminance:
- R=21: (0.0824+0.055)/1.055=0.1302; 0.1302^2.4=0.007494
- G=49: (0.1922+0.055)/1.055=0.2343; 0.2343^2.4=0.030694
- B=79: (0.3098+0.055)/1.055=0.3458; 0.3458^2.4=0.07807
- L = 0.2126×0.007494 + 0.7152×0.030694 + 0.0722×0.07807 = 0.001593+0.021952+0.005637 = **0.029182**

Ratio on `#15314F`: (0.500388+0.05)/(0.029182+0.05) = 0.550388/0.079182 = **6.95:1**

`#0D2440` luminance (bg-card):
- R=13: (0.0510+0.055)/1.055=0.1005; 0.1005^2.4=0.003989
- G=36: (0.1412+0.055)/1.055=0.1859; 0.1859^2.4=0.017635
- B=64: (0.2510+0.055)/1.055=0.2900; 0.2900^2.4=0.051398
- L = 0.2126×0.003989 + 0.7152×0.017635 + 0.0722×0.051398 = 0.000848+0.012613+0.003711 = **0.017172**

Ratio on `#0D2440`: (0.500388+0.05)/(0.017172+0.05) = 0.550388/0.067172 = **8.19:1**

**B5 — muted-dark `--fg-muted` changed to `#AACFDE`**

`src/styles.css` line 188: `--fg-muted: #AACFDE` — confirmed. Comment: "app override: DS #98C7D7 fails 7:1 on --neutral-bg (#283A4E), 6.36:1".

`#AACFDE` luminance:
- R=170: (0.6667+0.055)/1.055=0.6840; 0.6840^2.4=0.40186
- G=207: (0.8118+0.055)/1.055=0.8217; 0.8217^2.4=0.62427
- B=222: (0.8706+0.055)/1.055=0.8773; 0.8773^2.4=0.73052
- L = 0.2126×0.40186 + 0.7152×0.62427 + 0.0722×0.73052 = 0.085435+0.446640+0.052743 = **0.584818**

`#283A4E` luminance:
- R=40: (0.1569+0.055)/1.055=0.2008; 0.2008^2.4=0.021285
- G=58: (0.2275+0.055)/1.055=0.2677; 0.2677^2.4=0.042244
- B=78: (0.3059+0.055)/1.055=0.3421; 0.3421^2.4=0.076315
- L = 0.2126×0.021285 + 0.7152×0.042244 + 0.0722×0.076315 = 0.004525+0.030211+0.005510 = **0.040246**

Ratio on `#283A4E`: (0.584818+0.05)/(0.040246+0.05) = 0.634818/0.090246 = **7.03:1**

Ratio on `#1E3147` (bg-card, L=0.02927): (0.584818+0.05)/(0.02927+0.05) = 0.634818/0.079270 = **8.01:1**

**B6 — skip link on `privacy.html`**

`privacy.html` line 62: `<a href="#app" class="skip-link">Skip to main content</a>` — first child of `<body>`. Confirmed.
`privacy.html` line 79: `<main id="app">` — target `id="app"` present. Confirmed.

### Re-test results table

| Issue | Fix verified | Computed ratio / check | Result |
|---|---|---|---|
| B1 — muted-dark `.header-accent` | `[data-theme="muted-dark"] .header-accent { color: var(--accent); }` present (line 333); `--accent: #E3C196` | `#E3C196` on `#1E3147` = **7.78:1** | PASS |
| B2 — muted-light `--fg-muted` on `--bg-card` | `--fg-muted: #484F59` (line 163) | `#484F59` on `#FFFFFF` = **8.27:1** | PASS |
| B3 — muted-light `--fg-muted` on `--neutral-bg` | `--fg-muted: #484F59` (line 163) | `#484F59` on `#E7EAED` = **6.85:1** | FAIL |
| B4 — dark `--fg-muted` on `--neutral-bg` | `--fg-muted: #A0C0D7` (line 137) | `#A0C0D7` on `#15314F` = **6.95:1** (on `--bg-card` `#0D2440` = 8.19:1) | FAIL (neutral-bg) |
| B5 — muted-dark `--fg-muted` on `--neutral-bg` | `--fg-muted: #AACFDE` (line 188) | `#AACFDE` on `#283A4E` = **7.03:1** (on `--bg-card` `#1E3147` = 8.01:1) | PASS |
| B6 — skip link on `privacy.html` | `<a href="#app" class="skip-link">Skip to main content</a>` first child of `<body>` (line 62); `<main id="app">` present (line 79) | Structural check | PASS |

### Re-test overall verdict

FAIL — B3 and B4 remain. B1, B2, B5, and B6 now pass.

**B3** (`#484F59` on `#E7EAED` = 6.85:1): Sean's bump from `#5A636D` to `#484F59` fixed the `--bg-card` failure (B2, now 8.27:1) but `--neutral-bg` (#E7EAED) is a lighter surface and the 6.85:1 ratio still falls short of the 7:1 AAA threshold. `--fg-muted` needs to be darkened further — approximately `#444B55` achieves ≥ 7:1 on both `#FFFFFF` and `#E7EAED`. Sean must verify both surfaces simultaneously.

**B4** (`#A0C0D7` on `#15314F` = 6.95:1): Sean's bump from `#9BBCD4` to `#A0C0D7` moved the ratio from 6.65:1 to 6.95:1, but it still falls 0.05 short of 7:1. `--fg-muted` needs a small additional lightening — approximately `#A2C2D9` or `#A3C3DA` should cross 7:1 on `#15314F` while maintaining the existing pass on `--bg-card`. Sean must verify both surfaces.

---

## Final re-test -- 2026-06-08

Re-test scope: B3 and B4 only. Sean changed `--fg-muted` in `[data-theme="muted-light"]` from `#484F59` to `#444B55`, and `--fg-muted` in `[data-theme="dark"]` from `#A0C0D7` to `#A3C3DA`. All other items carry their PASS verdicts from the re-test section above.

---

### B3 -- muted-light `--fg-muted` on `--neutral-bg` and `--bg-card`

**CSS confirmation**

`src/styles.css` line 163: `--fg-muted: #444B55` -- confirmed. Sean's comment reads: "app override: 7.30:1 on --neutral-bg (#E7EAED); 8.81:1 on --bg-card (#FFFFFF) -- both AAA".

**Luminance workings -- `#444B55`**

Hex components: R=0x44=68, G=0x4B=75, B=0x55=85.

- R=68: sRGB=68/255=0.26667; linearised=(0.26667+0.055)/1.055=0.30350; 0.30350^2.4=0.05727
- G=75: sRGB=75/255=0.29412; linearised=(0.29412+0.055)/1.055=0.33047; 0.33047^2.4=0.06699
- B=85: sRGB=85/255=0.33333; linearised=(0.33333+0.055)/1.055=0.36853; 0.36853^2.4=0.09084
- L(#444B55) = 0.2126x0.05727 + 0.7152x0.06699 + 0.0722x0.09084
             = 0.012175 + 0.047924 + 0.006559
             = 0.066658

**Luminance workings -- `#E7EAED`** (carried from previous re-test section, lines 225-230)

L(#E7EAED) = 0.81934

**Contrast: `#444B55` on `#E7EAED`**

(0.81934 + 0.05) / (0.066658 + 0.05) = 0.86934 / 0.116658 = **7.45:1** -- AAA PASS (>= 7:1)

**Luminance workings -- `#FFFFFF`**

L(#FFFFFF) = 1.0

**Contrast: `#444B55` on `#FFFFFF`**

(1.0 + 0.05) / (0.066658 + 0.05) = 1.05 / 0.116658 = **9.00:1** -- AAA PASS (>= 7:1)

**B3 verdict: PASS**

---

### B4 -- dark `--fg-muted` on `--neutral-bg` and `--bg-card`

**CSS confirmation**

`src/styles.css` line 137: `--fg-muted: #A3C3DA` -- confirmed. Sean's comment reads: "app override: 7.18:1 on --neutral-bg (#15314F); 8.47:1 on --bg-card (#0D2440) -- both AAA".

**Luminance workings -- `#A3C3DA`**

Hex components: R=0xA3=163, G=0xC3=195, B=0xDA=218.

- R=163: sRGB=163/255=0.63922; linearised=(0.63922+0.055)/1.055=0.65378; 0.65378^2.4=0.36656
- G=195: sRGB=195/255=0.76471; linearised=(0.76471+0.055)/1.055=0.77697; 0.77697^2.4=0.55603
- B=218: sRGB=218/255=0.85490; linearised=(0.85490+0.055)/1.055=0.86199; 0.86199^2.4=0.70720
- L(#A3C3DA) = 0.2126x0.36656 + 0.7152x0.55603 + 0.0722x0.70720
             = 0.077890 + 0.397671 + 0.051060
             = 0.526621

**Luminance workings -- `#15314F`** (carried from previous re-test section, lines 243-248)

L(#15314F) = 0.029182

**Contrast: `#A3C3DA` on `#15314F`**

(0.526621 + 0.05) / (0.029182 + 0.05) = 0.576621 / 0.079182 = **7.28:1** -- AAA PASS (>= 7:1)

**Luminance workings -- `#0D2440`** (carried from previous re-test section, lines 251-257)

L(#0D2440) = 0.017172

**Contrast: `#A3C3DA` on `#0D2440`**

(0.526621 + 0.05) / (0.017172 + 0.05) = 0.576621 / 0.067172 = **8.58:1** -- AAA PASS (>= 7:1)

**B4 verdict: PASS**

---

### Final re-test results

| Issue | CSS value confirmed | Surface | Ratio | Verdict |
|---|---|---|---|---|
| B3 -- muted-light `--fg-muted` on `--neutral-bg` | `#444B55` (line 163) | `#E7EAED` | **7.45:1** | PASS |
| B3 -- muted-light `--fg-muted` on `--bg-card` | `#444B55` (line 163) | `#FFFFFF` | **9.00:1** | PASS |
| B4 -- dark `--fg-muted` on `--neutral-bg` | `#A3C3DA` (line 137) | `#15314F` | **7.28:1** | PASS |
| B4 -- dark `--fg-muted` on `--bg-card` | `#A3C3DA` (line 137) | `#0D2440` | **8.58:1** | PASS |

All blocking issues now resolved. Overall status: **PASS**.
