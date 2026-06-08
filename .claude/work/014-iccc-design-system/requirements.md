# Requirements — Image Colour Contrast Checker design system update
Work folder: `014-iccc-design-system`
Status: Draft for review
Audience: Sean (developer), Carol (tester)

---

## 1. Purpose

This tool audits images for WCAG contrast and accessibility issues. It should practise what it preaches. The Tim Dixon Design System v1.0 (May 2026) brings four proper themes, including two that clear every single checker the tool itself runs, a self-hosted variable font, and a cleaner CSS architecture that removes the workarounds we accumulated dealing with a two-theme world. This update is about consistency. One design system, used everywhere, including the PDF and Markdown exports.

---

## 2. Themes

The app must support all four themes. Every surface and component must render correctly in each one.

| Value | Name | Identity | Accessibility |
|---|---|---|---|
| `light` | Light | Vivid brand, light surfaces | WCAG 2.2 AAA; saturated accents at vestibular WARN (acceptable for large elements) |
| `dark` | Dark | Vivid brand, deep navy surfaces | WCAG 2.2 AAA; saturated accents at vestibular WARN |
| `muted-light` | Muted Light | Desaturated brand, light surfaces | Clears all five checkers: WCAG, APCA, Vestibular, Cognitive, CVD — all SAFE/PASS |
| `muted-dark` | Muted Dark | Desaturated brand, dark surfaces | Clears all five checkers — all SAFE/PASS |

### How themes are applied

**Setting the theme.** The active theme is set via the `data-theme` attribute on `<html>`. The value must be one of the four strings above.

**Bootstrap script.** `theme.js` from the design system handoff must be loaded as the first script in `<head>`, before any stylesheet. It sets `data-theme` synchronously so the correct palette is applied before the browser parses CSS. This eliminates flash of wrong theme.

```html
<script src="theme.js"></script>
```

**Default behaviour.** If no preference is saved, the script follows the OS colour scheme: `light` for `prefers-color-scheme: light`, `dark` for `prefers-color-scheme: dark`. With JavaScript disabled the `:root` defaults (Light theme) apply.

**Persistence.** The user's choice is saved to `localStorage` under the key `td-theme`. This key is unchanged from the current implementation.

**JavaScript API.** `theme.js` exposes `window.tdTheme` with four methods:

| Method | Behaviour |
|---|---|
| `tdTheme.set(name)` | Set and persist one of the four theme names |
| `tdTheme.get()` | Return the current theme name |
| `tdTheme.toggleMode()` | Flip light to dark (or dark to light) within the current family |
| `tdTheme.toggleFamily()` | Flip vivid to muted (or muted to vivid) within the current mode |

The theme picker UI must call `tdTheme.set(name)` when the user selects a theme.

**Scope.** Theme tokens use bare `[data-theme="…"]` attribute selectors, not `:root[data-theme="…"]`. This means a theme can be applied to any subtree — not just the document root — by setting `data-theme` on any element.

---

## 3. Token changes

The canonical token values are in `colors_and_type.css` from the design system handoff. Sean should replace the token declarations in `src/styles.css` with the values below.

Tokens defined only in `:root` (type scale, spacing scale, font stacks, `--hit`, `--radius`, `--shadow`) do not change across themes. Those are listed separately in section 3.3.

### 3.1 Per-theme colour tokens — complete reference

This is the full token set for all four theme scopes. Implement each theme as a `[data-theme="…"]` block.

**Notes on the table:**
- The Light and Dark columns also reflect the `:root` defaults (Light as fallback, Dark as the first defined theme scope).
- "—" means the token is not defined in that theme scope (it inherits from `:root` defaults or is not applicable).
- `--warn` and `--warn-bg` are **not** in the design system. See section 4.

| Token | Light | Dark | Muted Light | Muted Dark |
|---|---|---|---|---|
| `--bg` | `#F4F6F8` | `#061528` | `#EDF0F3` | `#142536` |
| `--bg-card` | `#FFFFFF` | `#0D2440` | `#FFFFFF` | `#1E3147` |
| `--fg` | `#1A1A1A` | `#E2E7EC` | `#2B3138` | `#E2E7EC` |
| `--fg-muted` | `#46505E` | `#9BBCD4` | `#5A636D` | `#98C7D7` |
| `--border` | `#D1D5DB` | `#1C3A5C` | `#D2D8DE` | `#2C3F54` |
| `--accent` | `#0C3B64` | `#EB9C52` | `#234A73` | `#E3C196` |
| `--accent-hover` | `#0A3052` | `#ECBB83` | `#1B3A5C` | `#E8D3BA` |
| `--accent-text` | `#FFFFFF` | `#061528` | `#FFFFFF` | `#142536` |
| `--accent-subtle` | `rgba(12,59,100,0.08)` | `rgba(235,156,82,0.16)` | `rgba(35,74,115,0.08)` | `rgba(227,193,150,0.16)` |
| `--warm` | `#EB9C52` | `#52C7EB` | `#703D1F` | `#8EBDE1` |
| `--warm-hover` | `#E88E38` | `#6AC5E7` | `#5E331A` | `#A6CBE8` |
| `--warm-text` | `#1A1A1A` | `#061528` | `#FFFFFF` | `#142536` |
| `--pass` | `#15662F` | `#8FD3A2` | `#1E5631` | `#A7D9B5` |
| `--pass-bg` | `#D9F0E1` | `#10331F` | `#DDEEE2` | `#1C3528` |
| `--fail` | `#A12525` | `#F0A6A6` | `#8A2A2A` | `#E6A9A9` |
| `--fail-bg` | `#F6DEDE` | `#3A1A1A` | `#F0DCDC` | `#3A2020` |
| `--neutral` | `#46505E` | `#9FB6CC` | `#4A535D` | `#C2CCD6` |
| `--neutral-bg` | `#ECEEF1` | `#15314F` | `#E7EAED` | `#283A4E` |
| `--code-bg` | `#ECEEF1` | `#15314F` | `#E7EAED` | `#27384C` |
| `--sky` | — | `#52C7EB` | — | — |

### 3.2 Changes from the current `src/styles.css` — light and dark only

Muted Light and Muted Dark have no existing equivalent. All their values are new.

**Light theme (`:root` in old CSS vs `[data-theme="light"]` in new CSS):**

| Token | Old value | New value | Note |
|---|---|---|---|
| `--fg-muted` | `#454c58` | `#46505E` | Slightly adjusted |
| `--accent` | `#061528` | `#0C3B64` | Brand navy, lighter/more accessible; old navy moves to `--bg` in dark |
| `--accent-hover` | `#0a2445` | `#0A3052` | Adjusted to match new accent |
| `--accent-subtle` | `rgb(6 21 40 / 0.08)` | `rgba(12,59,100,0.08)` | Adjusted to match new accent base |
| `--pass` | `#14532d` | `#15662F` | Slightly lighter green |
| `--pass-bg` | `#dcfce7` | `#D9F0E1` | Slightly more muted green tint |
| `--fail` | `#7f1d1d` | `#A12525` | Adjusted red for AAA at 5.9:1 on new fail-bg |
| `--fail-bg` | `#fee2e2` | `#F6DEDE` | Adjusted background |
| `--neutral` | `#4b5563` | `#46505E` | Adjusted |
| `--neutral-bg` | `#f0f2f5` | `#ECEEF1` | Adjusted |
| `--code-bg` | `#f0f2f5` | `#ECEEF1` | Adjusted |
| `--warm` | _(not defined; raw `var(--orange)` used directly)_ | `#EB9C52` | New token replacing direct `--orange` usage |
| `--warm-hover` | _(not defined)_ | `#E88E38` | New |
| `--warm-text` | _(not defined)_ | `#1A1A1A` | New; dark text on the orange fill |

**Dark theme (`[data-theme="dark"]` in old CSS vs new CSS):**

| Token | Old value | New value | Note |
|---|---|---|---|
| `--bg-card` | `#0d2040` | `#0D2440` | Minor adjustment |
| `--fg` | `#ffffff` | `#E2E7EC` | Off-white; reduces vestibular shimmer on navy background |
| `--fg-muted` | `#63D2FF` | `#9BBCD4` | Low-saturation blue-grey; old sky blue was too saturated for body text |
| `--border` | `#1a3050` | `#1C3A5C` | Slightly adjusted |
| `--accent` | `#FF7C00` | `#EB9C52` | New brand orange (less saturated, still AAA, vestibular WARN not FAIL) |
| `--accent-hover` | `#ff8f1a` | `#ECBB83` | Adjusted lighter hover |
| `--accent-subtle` | `rgb(255 124 0 / 0.14)` | `rgba(235,156,82,0.16)` | Adjusted to match new accent |
| `--warm` | _(not defined; raw `var(--blue)` used directly)_ | `#52C7EB` | New token; brand sky blue as second dark-mode accent |
| `--warm-hover` | _(not defined)_ | `#6AC5E7` | New |
| `--warm-text` | _(not defined)_ | `#061528` | New; navy text on sky fill |
| `--sky` | _(not defined)_ | `#52C7EB` | New; vivid brand sky reference |
| `--code-bg` | `#1a3050` | `#15314F` | Adjusted |
| `--neutral-bg` | `#1a3050` | `#15314F` | Adjusted |
| `--neutral` | `#63D2FF` | `#9FB6CC` | Low-saturation; old sky blue was too saturated |
| `--pass` | `#4ade80` | `#8FD3A2` | Desaturated green; clears AAA at 7.9:1 on pass-bg |
| `--pass-bg` | `#0d3328` | `#10331F` | Adjusted |
| `--fail` | `#fca5a5` | `#F0A6A6` | Adjusted soft red |
| `--fail-bg` | `#3a1f1f` | `#3A1A1A` | Adjusted |

### 3.3 Root-only tokens (not theme-scoped)

These live in `:root` only and do not change per theme. They are new to this CSS architecture.

**Font stacks:**

```css
--font-sans: "Roboto", -apple-system, BlinkMacSystemFont,
             "Segoe UI", "Helvetica Neue", Arial, sans-serif;
--font-mono: "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
```

The body font shorthand in the current CSS (`font: 15px/1.6 -apple-system, …`) must be replaced with separate `font-family`, `font-size`, and `line-height` declarations using tokens:

```css
body {
  font-family: var(--font-sans);
  font-size: var(--text-base);   /* 0.9375rem / 15px */
  line-height: var(--leading-body); /* 1.6 */
}
```

**Type scale:**

| Token | Value | Usage |
|---|---|---|
| `--text-xs` | `0.78rem` (~12.5px) | Small / meta |
| `--text-sm` | `0.85rem` (~13.6px) | Secondary |
| `--text-base` | `0.9375rem` (15px) | Body |
| `--text-lg` | `1.1rem` (17.6px) | H3 |
| `--text-xl` | `1.4rem` (22.4px) | H2 |
| `--text-2xl` | `1.9rem` (30.4px) | H1 |
| `--text-3xl` | `2.4rem` (38.4px) | Hero (rarely used) |

**Line-height:**

| Token | Value |
|---|---|
| `--leading-tight` | `1.3` |
| `--leading-body` | `1.6` |
| `--leading-long` | `1.65` |

**Font weight:**

| Token | Value | Roboto maps to |
|---|---|---|
| `--weight-regular` | `400` | Regular |
| `--weight-semi` | `500` | Medium |
| `--weight-bold` | `700` | Bold |
| `--weight-black` | `900` | Black |

**Tracking:**

| Token | Value | Usage |
|---|---|---|
| `--tracking-h1` | `-0.3px` | H1 letter spacing only |

**Spacing scale (4px grid):**

| Token | Value |
|---|---|
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `20px` |
| `--space-6` | `24px` |
| `--space-8` | `32px` |
| `--space-10` | `40px` |

**Other:**

| Token | Value |
|---|---|
| `--hit` | `44px` (WCAG 2.5.8 minimum touch target) |
| `--radius` | `10px` (unchanged) |
| `--shadow` | `0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.05)` (unchanged) |

### 3.4 Tokens removed from `src/styles.css`

The following tokens exist in the current CSS and must be removed. They have no equivalent in the design system because they were raw brand values used directly, rather than semantic tokens.

| Token | Old value | Replacement |
|---|---|---|
| `--navy` | `#061528` | Use `var(--bg)` in dark theme, or `var(--accent-text)` in dark theme. No direct replacement needed; remove all `var(--navy)` usages. |
| `--orange` | `#FF7C00` | Use `var(--warm)` |
| `--blue` | `#63D2FF` | Use `var(--warm)` in dark themes, `var(--fg-muted)` where muted text was intended |

**Note on `--warn` and `--warn-bg`:** These are NOT removed — they are app-specific and must be redefined for all four themes. See section 4.

---

## 4. App-specific tokens — `--warn` and `--warn-bg`

The design system does not define `--warn` or `--warn-bg`. These are used by the app's WARN-level pill badges (vestibular and cognitive check results) and the result row left-border.

Sean must define them for all four themes in `src/styles.css`. The values are not prescribed here; they must be chosen to meet WCAG 2.2 AAA (7:1 contrast ratio for the text colour on its badge background) in every theme before the work is considered done.

**Existing values for reference (light and dark only):**

| Token | Old light | Old dark |
|---|---|---|
| `--warn` | `#663a00` | `#fcd34d` |
| `--warn-bg` | `#fef3c7` | `#3a2c0c` |

The old light contrast was 8.7:1 and the old dark was 9.4:1. The muted-light and muted-dark values need to be sourced fresh and verified with the tool itself before shipping.

**Acceptance criteria for this section:**
- [ ] `--warn` and `--warn-bg` are defined in `[data-theme="light"]`, `[data-theme="dark"]`, `[data-theme="muted-light"]`, and `[data-theme="muted-dark"]`.
- [ ] In every theme, the contrast ratio of `--warn` on `--warn-bg` is at or above 7:1 (WCAG 2.2 AAA).
- [ ] The WARN pill is visible and legible in all four themes.

---

## 5. Font

The design system uses Roboto as its primary typeface, served as a self-hosted variable font. This replaces the current system-font-stack-first approach (where Roboto was listed as a fallback, after `-apple-system`).

### What to do

1. Copy the two font files from the handoff into `public/fonts/`:
   - `public/fonts/Roboto-VariableFont.ttf`
   - `public/fonts/Roboto-Italic-VariableFont.ttf`

2. Add the following `@font-face` declarations at the top of `src/styles.css` (before any token or rule declarations). Adjust the URL path to match Vite's output structure if needed.

```css
@font-face {
  font-family: 'Roboto';
  src: url('/fonts/Roboto-VariableFont.ttf') format('truetype-variations'),
       url('/fonts/Roboto-VariableFont.ttf') format('truetype');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Roboto';
  src: url('/fonts/Roboto-Italic-VariableFont.ttf') format('truetype-variations'),
       url('/fonts/Roboto-Italic-VariableFont.ttf') format('truetype');
  font-weight: 100 900;
  font-style: italic;
  font-display: swap;
}
```

3. Update the `body` rule to use `var(--font-sans)` (see section 3.3).

4. The existing Roboto reference in `package.json` / pdfmake is for the PDF export only. The PDF currently uses the pdfmake-bundled Roboto for rendering. That path is unchanged by this work unless the PDF export is updated (see section 10).

### Acceptance criteria

- [ ] `public/fonts/Roboto-VariableFont.ttf` and `Roboto-Italic-VariableFont.ttf` are present and served correctly.
- [ ] Body text renders in Roboto on a fresh load (no flash to system font on repeated visits, because the font is served from the same origin as the app).
- [ ] `font-display: swap` is set so the text is readable immediately while the font loads.
- [ ] The variable font OFL licence file is copied alongside the fonts or noted in a `LICENCES` file.

---

## 6. Header

The header changes from a fixed always-navy surface to a theme-adaptive surface.

### Background

The header background changes from the hardcoded `#061528` to `var(--bg-card)`. In the Light and Muted Light themes this is white (`#FFFFFF`). In the Dark theme it is `#0D2440`. In the Muted Dark theme it is `#1E3147`.

The `.app-header` rule currently sets `background: #061528` and `color: #fff` unconditionally. Both hardcoded values must be replaced:

```css
.app-header {
  background: var(--bg-card);
  color: var(--fg);
}
```

### Wordmark accent

The "Contrast Checker" span (`.header-accent`) is coloured with `var(--accent)` in light themes and `var(--warm)` in dark themes. This matches the design system's component spec exactly.

```css
.header-accent { color: var(--accent); }

[data-theme="dark"]       .header-accent,
[data-theme="muted-dark"] .header-accent { color: var(--warm); }
```

In the Light theme, `var(--accent)` is `#0C3B64` (deep navy). In the Dark theme, `var(--warm)` is `#52C7EB` (brand sky). In Muted Light, `var(--accent)` is `#234A73`. In Muted Dark, `var(--warm)` is `#8EBDE1`.

### H1 title colour

The title text (currently `color: #fff` hardcoded) must use `var(--fg)`:

```css
.app-header h1 { color: var(--fg); }
```

### Tagline

The tagline (`.tagline`) currently hardcodes `color: #63D2FF`. It must use `var(--fg-muted)`:

```css
.app-header .tagline { color: var(--fg-muted); }
```

### Bottom accent line

The `::after` pseudo-element accent line currently uses a hardcoded orange gradient. It must use theme tokens:

```css
.app-header::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--warm), var(--accent) 70%, transparent);
  pointer-events: none;
}
```

In the Light theme this produces a gradient from brand orange (`#EB9C52`) to deep navy (`#0C3B64`). In the Dark theme it runs from brand sky (`#52C7EB`) to brand orange (`#EB9C52`). In Muted Light it runs from chestnut (`#703D1F`) to slate-navy (`#234A73`). In Muted Dark it runs from cool blue (`#8EBDE1`) to warm sand (`#E3C196`).

### Preloader header

`.preloader-header` has the same hardcoded `background: #061528`. Apply the same fix:

```css
.preloader-header { background: var(--bg-card); }
```

### Focus ring on theme toggle

The `.theme-toggle:focus-visible` rule currently hardcodes `outline: 3px solid #63D2FF`. Replace with:

```css
.theme-toggle:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 3px;
}
```

### Acceptance criteria

- [ ] Header background is `var(--bg-card)` in all four themes.
- [ ] "Contrast Checker" wordmark accent uses `var(--accent)` in light themes and `var(--warm)` in dark themes.
- [ ] H1 title colour uses `var(--fg)`.
- [ ] Tagline uses `var(--fg-muted)`.
- [ ] Bottom accent line uses the `linear-gradient(90deg, var(--warm), var(--accent) 70%, transparent)` pattern.
- [ ] No hardcoded hex values remain in header-related CSS rules.
- [ ] AAA contrast maintained in all four themes for title, tagline, and wordmark accent (Carol to verify).

---

## 7. Theme picker UI

The current two-way sun/moon toggle (`<button class="theme-toggle">`) must be replaced with a four-option control that lets the user choose one of the four themes.

### Requirements

**REQ-UI-1.** The control must offer four named options: Light, Dark, Muted Light, Muted Dark. These are the display labels.

**REQ-UI-2.** The currently active theme must be visually indicated and communicated to assistive technology. Screen-reader users must be able to identify which theme is currently selected without interacting with the control.

**REQ-UI-3.** Every interactive element in the control must meet a minimum touch target of 44px by 44px (WCAG 2.5.8).

**REQ-UI-4.** The control must be fully keyboard operable. Users must be able to navigate to the control using Tab, and select a theme using standard keyboard patterns appropriate to the chosen HTML structure.

**REQ-UI-5.** Selecting a theme must call `window.tdTheme.set(name)` with the corresponding theme string (`'light'`, `'dark'`, `'muted-light'`, `'muted-dark'`).

**REQ-UI-6.** The control must fit in the header alongside the wordmark and tagline without pushing content off-screen at viewports down to 320px.

**REQ-UI-7.** On narrow viewports, the control may collapse to an abbreviated form (such as showing theme icons or a shorter label), provided the accessible label is unabbreviated.

**REQ-UI-8.** The control must inherit its colours from the current theme tokens. No hardcoded hex values.

### Recommended HTML pattern

A `<fieldset>` with a visually hidden `<legend>` and four radio `<input>` elements is the most semantically correct pattern. The checked radio reflects the active theme. Selecting a different radio calls `tdTheme.set()`. This gives arrow-key navigation, correct `aria-checked` semantics, and native form behaviour at no extra cost.

Alternatively, four `<button>` elements in a `role="group"` container work. Each button gains `aria-pressed="true/false"` to indicate the active state.

The exact HTML is for Simon and Sean to agree in the mockup. The requirements above are the binding constraints.

### Acceptance criteria

- [ ] The old `.theme-toggle` sun/moon button is removed.
- [ ] The new control offers exactly four options: Light, Dark, Muted Light, Muted Dark.
- [ ] The active theme is communicated to screen readers (tested with VoiceOver on macOS and iOS).
- [ ] Tab key reaches the control; the theme can be changed using only a keyboard.
- [ ] Touch targets are 44px minimum.
- [ ] The control renders correctly at 320px, 375px, and 768px viewport widths.
- [ ] Selecting a theme persists the choice (reload confirms the saved theme is applied).

---

## 8. Notice and disclaimer components

The `.disclaimer-notice` and `.results-disclaimer` components both currently use `border-left: 4px solid var(--orange)` (a hardcoded reference to the removed `--orange` token).

The design system component spec defines:
- Light themes: `border-left` uses `var(--accent)`.
- Dark themes: `border-left` uses `var(--warm)`.

The icon colour follows the same rule: `var(--accent)` in light, `var(--warm)` in dark.

The required CSS:

```css
.disclaimer-notice,
.results-disclaimer {
  border-left: 4px solid var(--accent);
}

[data-theme="dark"] .disclaimer-notice,
[data-theme="dark"] .results-disclaimer,
[data-theme="muted-dark"] .disclaimer-notice,
[data-theme="muted-dark"] .results-disclaimer {
  border-left-color: var(--warm);
}
```

If an SVG icon is present inside the notice, apply the same colour rule:

```css
.disclaimer-notice svg,
.results-disclaimer svg {
  color: var(--accent);
}

[data-theme="dark"] .disclaimer-notice svg,
[data-theme="dark"] .results-disclaimer svg,
[data-theme="muted-dark"] .disclaimer-notice svg,
[data-theme="muted-dark"] .results-disclaimer svg {
  color: var(--warm);
}
```

### Acceptance criteria

- [ ] No `var(--orange)` reference in notice/disclaimer CSS.
- [ ] Border-left uses `var(--accent)` in Light and Muted Light.
- [ ] Border-left uses `var(--warm)` in Dark and Muted Dark.
- [ ] Icon colour matches border colour in all four themes.

---

## 9. CSS cleanup

The following must be removed from `src/styles.css` as part of this work. Each item is either replaced by the new token architecture or by `theme.js`.

### 9.1 Raw brand variable declarations

Remove from `:root`:

```css
--navy:   #061528;
--orange: #FF7C00;
--blue:   #63D2FF;
```

Everywhere these raw tokens are referenced via `var(--navy)`, `var(--orange)`, or `var(--blue)`, replace with the appropriate semantic token from section 3.

### 9.2 OS-level dark media query token block

Remove the entire block:

```css
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { … }
}
```

This is the old dark-mode token override. `theme.js` now sets `data-theme` synchronously before CSS parses, so the media query path is no longer needed. The `[data-theme="dark"]` scope in section 3 covers this entirely.

### 9.3 Manual dark theme `:root[data-theme]` selector syntax

The current manual dark override uses `:root[data-theme="dark"]`. This must be replaced by the bare `[data-theme="dark"]` selector pattern from the design system (so themes can be applied to subtrees).

### 9.4 Dark-mode AAA workaround override blocks

The CSS contains a large comment block at the bottom of the file labelled "Dark-mode AAA contrast overrides (Carol findings 1–6, 2026-05-23)". This block exists because the old dark-mode `--accent` (`#FF7C00`) failed AAA on the card background.

The new dark-mode token values solve this at the token level (the new `--accent` is `#EB9C52` which clears AAA on `#0D2440`). The workaround overrides are no longer needed and must be removed.

These are the two blocks to remove:

```css
/* OS-level dark preference path */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .glossary-item > p > a, …
}

/* Manual toggle dark path */
:root[data-theme="dark"] .glossary-item > p > a, …
```

**Important:** Before removing these blocks, Carol must confirm that contrast for the affected selectors passes AAA in the new Dark theme with the new token values. The selectors were: `.glossary-item > p > a`, `.image-card h4`, `.external-checkers-list a`, `.row-toggle`, `.queue-stage` (in-progress state), and `.check-group-row th`.

### 9.5 Hardcoded hex values in non-token CSS rules

Scan `src/styles.css` for remaining hardcoded hex values (`#061528`, `#FF7C00`, `#63D2FF`, `#fff`, `#ffffff`) outside of token declarations and replace with appropriate tokens. Known locations:

| Selector | Property | Old value | Replace with |
|---|---|---|---|
| `.app-header` | `background` | `#061528` | `var(--bg-card)` |
| `.app-header` | `color` | `#fff` | `var(--fg)` |
| `.app-header h1` | `color` | `#fff` | `var(--fg)` |
| `.header-accent` | `color` | `#FF7C00` | `var(--accent)` + dark override to `var(--warm)` (see section 6) |
| `.app-header .tagline` | `color` | `#63D2FF` | `var(--fg-muted)` |
| `.app-header::after` | `background` | `linear-gradient(90deg, #FF7C00, …)` | `linear-gradient(90deg, var(--warm), var(--accent) 70%, transparent)` |
| `.theme-toggle:hover` | `border-color` | `#63D2FF` | `var(--accent)` |
| `.theme-toggle:hover` | `background` | `rgb(99 210 255 / 0.12)` | `var(--accent-subtle)` |
| `.theme-toggle:focus-visible` | `outline-color` | `#63D2FF` | `var(--accent)` |
| `.skip-link:focus` | `outline-color` | `#FF7C00` | `var(--accent)` |
| `.preloader-header` | `background` | `#061528` | `var(--bg-card)` |

### Acceptance criteria

- [ ] No `var(--navy)`, `var(--orange)`, or `var(--blue)` references remain in `styles.css`.
- [ ] No `@media (prefers-color-scheme: dark)` blocks remain in `styles.css`.
- [ ] No `:root[data-theme]` selectors remain (all replaced by bare `[data-theme]`).
- [ ] The AAA workaround override blocks are removed (Carol confirmed AAA passes with new tokens first).
- [ ] No hardcoded hex values remain outside of `@font-face` src declarations and `:root` token definitions.

---

## 10. Reports

### 10.1 PDF export (`src/export/pdf.js`)

The PDF export currently contains hardcoded brand colour hex values for its layout (header bar colour, accent text, pass/fail pill colours). These must be updated to the Muted Light palette values.

Muted Light is the correct palette for print and PDF: it clears all five checkers and produces a document that is fully compliant with no vestibular or cognitive warnings.

**Target values for `pdf.js` colour references:**

| Purpose | Token equivalent | Hex value |
|---|---|---|
| Page background / surface | `--bg-card` (Muted Light) | `#FFFFFF` |
| Body text | `--fg` (Muted Light) | `#2B3138` |
| Secondary text | `--fg-muted` (Muted Light) | `#5A636D` |
| Accent / headings / links | `--accent` (Muted Light) | `#234A73` |
| Notice border / warm accent | `--warm` (Muted Light) | `#703D1F` |
| Pass text | `--pass` (Muted Light) | `#1E5631` |
| Pass background | `--pass-bg` (Muted Light) | `#DDEEE2` |
| Fail text | `--fail` (Muted Light) | `#8A2A2A` |
| Fail background | `--fail-bg` (Muted Light) | `#F0DCDC` |
| Neutral / section background | `--neutral-bg` (Muted Light) | `#E7EAED` |

The `--warn` and `--warn-bg` values for Muted Light are app-specific (see section 4). Sean must define these before updating the PDF export.

**Acceptance criteria:**

- [ ] All old hardcoded hex values in `pdf.js` are replaced with the Muted Light values above.
- [ ] A generated PDF opens in a PDF viewer and displays correctly (no broken colour references).
- [ ] Pass, fail, and warn pills are visually distinct in the generated PDF.

### 10.2 Markdown export (`src/export/markdown.js`)

Markdown is plain text with embedded images. It does not contain HTML colour declarations. No colour changes are needed.

**Action required:** Scan `markdown.js` for any hardcoded hex values (e.g., in inline style strings or colour swatch data). If any are found, report them; they are likely a bug rather than intentional.

**Acceptance criteria:**

- [ ] `markdown.js` confirmed to contain no hardcoded hex values outside of image data.

---

## 11. Definition of done

Copied from `brief.md` and formatted as a checklist for Carol's test run.

### Development complete

- [ ] Roboto variable fonts served from `public/fonts/` (no flash; `font-display: swap`)
- [ ] `theme.js` sets `data-theme` synchronously before CSS parses
- [ ] All four themes render correctly: Light, Dark, Muted Light, Muted Dark
- [ ] Theme picker UI in the header is keyboard accessible, 44px touch targets, announces state to screen readers
- [ ] `--warn` and `--warn-bg` defined and AAA-passing in all four themes
- [ ] Header is theme-adaptive per section 6 of this document
- [ ] Notice/disclaimer uses `var(--warm)` border in dark themes
- [ ] Old hardcoded hex values (`#061528`, `#FF7C00`, `#63D2FF`) removed from `styles.css`
- [ ] PDF export uses updated Muted Light palette colours
- [ ] Version bumped in `package.json`

### Carol's sign-off

- [ ] All existing features work correctly in all four themes (functional pass)
- [ ] WCAG 2.2 AAA met in all four themes (accessibility pass)
- [ ] Dark-mode AAA workaround selectors confirmed safe to remove before removal
- [ ] Visual output matches the Simon prototype (visual pass)

---

## Appendix A — Brand archive tokens

These tokens are defined in `colors_and_type.css` at `:root` level and represent the single vivid brand identity reference. They are for use in logos, the wordmark, and large graphical elements only — never as text colour on a light background.

| Token | Value | Use |
|---|---|---|
| `--brand-navy` | `#0C3B64` | Brand navy reference |
| `--brand-orange` | `#EB9C52` | Brand orange reference |
| `--brand-sky` | `#52C7EB` | Brand sky reference |

These are static reference values, not theme tokens. Do not use them in place of `--accent`, `--warm`, or other semantic tokens.

---

## Appendix B — Files referenced

| File | Role |
|---|---|
| `/Users/timdixon/Downloads/Tim_Dixon_Design_System_handoff/tim-dixon-design-system/project/colors_and_type.css` | Canonical token source |
| `/Users/timdixon/Downloads/Tim_Dixon_Design_System_handoff/tim-dixon-design-system/project/theme.js` | Bootstrap script to copy into the project |
| `/Users/timdixon/Downloads/Tim_Dixon_Design_System_handoff/tim-dixon-design-system/project/fonts/Roboto-VariableFont.ttf` | Copy to `public/fonts/` |
| `/Users/timdixon/Downloads/Tim_Dixon_Design_System_handoff/tim-dixon-design-system/project/fonts/Roboto-Italic-VariableFont.ttf` | Copy to `public/fonts/` |
| `/Users/timdixon/Code/Github/Image-Colour-Contrast-Checker/src/styles.css` | File to update |
| `/Users/timdixon/Code/Github/Image-Colour-Contrast-Checker/src/export/pdf.js` | File to update (colours) |
| `/Users/timdixon/Code/Github/Image-Colour-Contrast-Checker/src/export/markdown.js` | File to scan (no changes expected) |
