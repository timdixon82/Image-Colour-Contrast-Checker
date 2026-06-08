# Work folder 014 — ICCC Design System update

**Type:** Small feature (type 7)
**Opened:** 2026-06-08
**Status:** Closed — merged PR #30, v0.4.19 live
**Mockup mode:** A (static HTML prototype, committed to docs/design-system/mockups/)

## Summary

Update the Image Colour Contrast Checker app to the Tim Dixon Design System v1.0 (May 2026), which introduces four required themes and a refreshed brand palette. The design carries through to the PDF and Markdown report exports.

## Design system handoff

Location: `/Users/timdixon/Downloads/Tim_Dixon_Design_System_handoff/tim-dixon-design-system/project/`

Key files:
- `colors_and_type.css` — all four theme token scopes; canonical source of truth
- `theme.js` — four-theme bootstrap; sets `data-theme` on `<html>` synchronously
- `fonts/Roboto-VariableFont.ttf` and `Roboto-Italic-VariableFont.ttf` — self-hosted
- `preview/` — component previews in all four themes (header, buttons, cards, dropzone, notice, badges)
- `Four Themes.html` — live switcher demonstrating all four themes

## What changes

### Themes
- Replace 2-way toggle (light / dark) with 4-way picker: `light`, `dark`, `muted-light`, `muted-dark`
- Light and Dark keep vivid brand identity (vestibular WARN — acceptable, AAA-only large elements)
- Muted Light and Muted Dark are fully compliant across all five checkers (SAFE / PASS)
- Persistence key stays `td-theme` in localStorage; default follows OS colour scheme

### Colour tokens (all four themes)
New brand colours (replaces old hardcoded values):
- Brand navy accent: `#0C3B64` (was `#061528` for accent; `#061528` stays as dark --bg)
- Brand orange: `#EB9C52` (was `#FF7C00`)
- Brand sky: `#52C7EB` (was `#63D2FF`)
- Plus muted-light and muted-dark desaturated equivalents (see `colors_and_type.css`)

App-specific tokens — define in `styles.css` `[data-theme]` scopes (not component CSS). Tim-verified values, all AAA, checker-confirmed:

| Theme | `--warn` | `--warn-bg` | Saturation | Contrast |
|---|---|---|---|---|
| Light | `#544012` | `#F6E8C8` | WARN (65) | 8.2 / 9.9 / 9.1 AAA |
| Dark | `#DDB84B` | `#3A2C0C` | WARN (68) | 7.1 / 8.2 / 9.6 AAA |
| Muted Light | `#4E3C18` | `#EDE6D2` | SAFE (53) | 8.5 / 10.6 / 9.3 AAA |
| Muted Dark | `#DFC686` | `#332B12` | SAFE (58) | 7.9 / 7.9 / 9.3 AAA |

Note: Muted Dark `--warn` bumped from `#E8C97A` to `#DFC686` — original fell to 6.6:1 on `--bg-card`.

### Typography
- Roboto variable font self-hosted in `public/fonts/` (copy from handoff)
- Update `@font-face` declarations in `styles.css` (currently sourced from node_modules/pdfmake only for PDF)
- Font stack already includes Roboto as fallback; becomes primary

### Header
- Changes from always-navy (`#061528`) to theme-adaptive (`var(--bg-card)`)
- "Contrast Checker" wordmark: `var(--accent)` in light themes; `var(--warm)` in dark themes
- Accent bottom-line: `linear-gradient(90deg, var(--warm), var(--accent) 70%, transparent)` (replaces hardcoded `#FF7C00`)
- Tagline: `var(--fg-muted)` (theme-adaptive, not hardcoded `#63D2FF`)

### Notice / disclaimer components
- Light themes: `border-left: 4px solid var(--accent)`
- Dark themes: `border-left: 4px solid var(--warm)` (override per DS component spec)

### Theme picker UI
- Replace single sun/moon toggle button with a 4-option control
- Options: Light / Dark / Muted Light / Muted Dark
- Must be fully keyboard accessible with 44px touch targets

### CSS cleanup
- Remove `@media (prefers-color-scheme: dark)` blocks (now handled by `theme.js`)
- Remove old manual `[data-theme="dark"]` duplicate blocks
- Remove dark-mode AAA workaround overrides (new tokens solve these natively)
- Remove `--navy`, `--orange`, `--blue` raw colour variables (no longer used)

### Reports — PDF
- Update hardcoded brand colours in `src/export/pdf.js` to new palette
- Use Muted Light palette values for print (guaranteed all-pass, suitable for documents)

### Reports — Markdown
- No colour changes needed (plain text); verify any hardcoded hex values in `src/export/markdown.js`

## Out of scope

- Changes to OCR logic, WCAG/APCA/CVD analysis pipeline, or data types
- Changes to `src/core/`, `src/adapters/`, or `src/render/` modules
- New accessibility checks or report sections
- The privacy.html page visual redesign (it should pick up tokens automatically; any specific tweaks are out of scope unless failing tests flag them)
- Figma, screenshots, or any mockup mode other than A

## Risk and rollback

- **Risk:** The header change from always-navy to theme-adaptive is the most visible change. If Tim dislikes it after the prototype, the header can be reverted to always-navy using a `--header-bg` token override without touching other themes.
- **Risk:** The `--warn` / `--warn-bg` tokens are not in the design system. Values must be chosen to pass AAA in all four themes and checked before shipping.
- **Rollback:** Revert `src/styles.css` and `index.html`; restore the old `src/main.js` theme toggle handler. The old theme.js inline script can be restored from git. No database or model changes.

## Definition of done

- [ ] Roboto variable fonts served from `public/fonts/` (no flash; font-display: swap)
- [ ] `theme.js` (or equivalent inline script) sets `data-theme` synchronously before CSS parses
- [ ] All four themes render correctly: Light, Dark, Muted Light, Muted Dark
- [ ] Theme picker UI in the header is keyboard accessible, 44px touch targets, announces state to screen readers
- [ ] `--warn` / `--warn-bg` defined and AAA in all four themes
- [ ] Header is theme-adaptive per the design system spec
- [ ] Notice/disclaimer uses `--warm` border in dark themes
- [ ] Old hardcoded hex values (`#061528`, `#FF7C00`, `#63D2FF`) removed from `styles.css`
- [ ] PDF export uses updated brand colours
- [ ] Carol: functional pass (all existing features work), accessibility pass (WCAG 2.2 AAA in all four themes), visual pass (matches prototype)
- [ ] Version bumped in `package.json`

## Pre-approved GitHub actions

- [x] Create a branch
- [x] Commit to a branch
- [x] Push a branch (not main)
- [x] Open a pull request
- [x] Comment on a pull request or issue
- [x] Create an issue

## Log

| Date       | Event |
|------------|-------|
| 2026-06-08 | Brief created. Mockup mode A selected. Dispatching Tad + Simon in parallel. |
