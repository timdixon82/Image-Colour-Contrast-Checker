# Tim Dixon — Design & Accessibility Guidelines

Copy this file into any new project. It contains every design decision, colour value,
CSS pattern, and accessibility rule used across Tim Dixon projects. Follow it exactly
and the output will be visually and functionally consistent.

---

## 1. Brand Palette

Three primary colours. Use nothing outside this set for structural UI elements.

| Name   | Hex       | Usage                                      |
|--------|-----------|--------------------------------------------|
| Navy   | `#061528` | Primary background, always-on header       |
| Orange | `#FF7C00` | Accent colour, CTAs, active states         |
| White  | `#ffffff` | Primary text on dark backgrounds           |
| Sky Blue | `#63D2FF` | Muted/secondary text in dark mode        |

### Contrast ratios on Navy (all AAA ≥ 7:1)

| Foreground | On Navy    | Ratio   |
|------------|------------|---------|
| White      | `#061528`  | 18.33:1 |
| Orange     | `#061528`  | 7.10:1  |
| Sky Blue   | `#061528`  | 10.64:1 |

---

## 2. CSS Custom Properties (Design Tokens)

Paste this entire block into your `:root`. Every component uses these tokens —
never hardcode colours in component rules.

```css
:root {
  /* ── Brand constants ── */
  --navy:   #061528;
  --orange: #FF7C00;
  --blue:   #63D2FF;

  /* ── Light mode (default) ── */
  --bg:           #f4f6f8;   /* Page background              */
  --bg-card:      #ffffff;   /* Card / surface background    */
  --fg:           #1a1a1a;   /* Body text      17.8:1 AAA    */
  --fg-muted:     #4b5563;   /* Secondary text  7.6:1 AAA    */
  --border:       #d1d5db;   /* Dividers, input borders      */
  --accent:       #061528;   /* Navy — primary interactive   */
  --accent-hover: #0a2445;   /* Darker navy on hover         */
  --accent-text:  #ffffff;   /* Text on accent button        */
  --accent-subtle: rgba(6, 21, 40, 0.08); /* Tinted badge bg */
  --pass:         #14532d;   /* Success text    9.1:1 AAA    */
  --pass-bg:      #dcfce7;   /* Success badge background     */
  --fail:         #7f1d1d;   /* Error text      10:1  AAA    */
  --fail-bg:      #fee2e2;   /* Error badge background       */
  --neutral:      #4b5563;   /* Neutral text    7.6:1 AAA    */
  --neutral-bg:   #f0f2f5;   /* Neutral badge / code bg      */
  --code-bg:      #f0f2f5;
  --shadow:       0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.05);
  --radius:       10px;
}

/* ── Dark mode — OS preference ── */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg:           #061528;
    --bg-card:      #0d2040;
    --fg:           #ffffff;
    --fg-muted:     #63D2FF;   /* Sky Blue 10.64:1 AAA */
    --border:       #1a3050;
    --accent:       #FF7C00;   /* Orange   7.10:1  AAA */
    --accent-hover: #ff8f1a;
    --accent-text:  #061528;   /* Navy on orange AAA   */
    --accent-subtle: rgba(255, 124, 0, 0.14);
    --code-bg:      #1a3050;
    --neutral-bg:   #1a3050;
    --pass:         #4ade80;   /* Bright green 8.8:1 AAA */
    --pass-bg:      rgba(21, 128, 61, 0.22);
    --fail:         #fca5a5;   /* Soft red     8.1:1 AAA */
    --fail-bg:      rgba(185, 28, 28, 0.22);
    --neutral:      #63D2FF;
  }
}

/* ── Dark mode — manual toggle ── */
:root[data-theme="dark"] {
  --bg:           #061528;
  --bg-card:      #0d2040;
  --fg:           #ffffff;
  --fg-muted:     #63D2FF;
  --border:       #1a3050;
  --accent:       #FF7C00;
  --accent-hover: #ff8f1a;
  --accent-text:  #061528;
  --accent-subtle: rgba(255, 124, 0, 0.14);
  --code-bg:      #1a3050;
  --neutral-bg:   #1a3050;
  --pass:         #4ade80;
  --pass-bg:      rgba(21, 128, 61, 0.22);
  --fail:         #fca5a5;
  --fail-bg:      rgba(185, 28, 28, 0.22);
  --neutral:      #63D2FF;
}
```

---

## 3. Light / Dark Mode Implementation

### How it works

Theme is stored on `<html data-theme="light|dark">`. An inline `<script>` in
`<head>` sets this **before CSS parses** so there is never a flash of the wrong
theme. User choice is persisted to `localStorage` under the key `td-theme`. If
no choice has been made the OS preference (`prefers-color-scheme`) is followed
automatically.

### Inline script — paste inside `<head>` before any `<link>` or `<style>`

```html
<script>
  (function () {
    var t = localStorage.getItem('td-theme');
    document.documentElement.dataset.theme =
      t === 'dark' || t === 'light' ? t
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }());
</script>
```

### Theme toggle button — HTML

```html
<button type="button" id="theme-toggle" class="theme-toggle" aria-label="Switch to dark mode">
  <!-- Sun = visible in dark mode, Moon = visible in light mode -->
  <svg class="icon-sun" ...><circle cx="12" cy="12" r="4"/><!-- sun paths --></svg>
  <svg class="icon-moon" ...><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
  <span class="theme-toggle-label" aria-hidden="true"></span>
</button>
```

### Theme toggle — CSS icon visibility

```css
.icon-sun  { display: none; }
.icon-moon { display: none; }
[data-theme="dark"]  .icon-sun  { display: block; }
[data-theme="light"] .icon-moon { display: block; }
```

### Theme toggle — JavaScript

```js
const STORAGE_KEY = 'td-theme';
const html        = document.documentElement;
const toggleBtn   = document.getElementById('theme-toggle');
const toggleLabel = toggleBtn.querySelector('.theme-toggle-label');

function syncToggle() {
  const isDark = html.dataset.theme === 'dark';
  toggleBtn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  toggleLabel.textContent = isDark ? 'Light' : 'Dark';
}

function setTheme(theme, persist) {
  html.dataset.theme = theme;
  if (persist) localStorage.setItem(STORAGE_KEY, theme);
  syncToggle();
}

syncToggle(); // align label with whatever the inline script set

toggleBtn.addEventListener('click', () => {
  setTheme(html.dataset.theme === 'dark' ? 'light' : 'dark', true);
});

// Follow OS changes only when the user has not made a manual choice
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (!localStorage.getItem(STORAGE_KEY)) setTheme(e.matches ? 'dark' : 'light', false);
});
```

---

## 4. Header

The header is **always navy** (`#061528`) regardless of the active theme. It never
inherits light/dark page tokens. An orange accent line runs along its bottom edge.

### HTML structure

```html
<header class="app-header">
  <div class="app-header-inner">
    <div class="app-header-text">
      <h1>Your App <span class="header-accent">Title Here</span></h1>
      <p class="tagline">Short description of what this app does.</p>
    </div>
    <!-- theme toggle button goes here -->
  </div>
</header>
```

### CSS

```css
.app-header {
  background: #061528;
  color: #ffffff;
  position: relative;
  overflow: hidden;
}

/* Orange accent line at base of header */
.app-header::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, #FF7C00, #ff8f1a 60%, transparent);
  pointer-events: none;
}

.app-header-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 1.5rem 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  position: relative;
}

.app-header-text { flex: 1; min-width: 0; }

.app-header h1 {
  color: #ffffff;        /* 18.33:1 on navy AAA */
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0 0 4px;
  letter-spacing: -0.3px;
}

.header-accent { color: #FF7C00; } /* 7.10:1 on navy AAA */

.app-header .tagline {
  color: #63D2FF;        /* 10.64:1 on navy AAA */
  margin: 0;
  font-size: 0.875rem;
}

/* Theme toggle lives in the header */
.theme-toggle {
  appearance: none;
  background: transparent;
  border: 2px solid rgba(255, 255, 255, 0.35);
  color: #ffffff;
  border-radius: 8px;
  padding: 8px 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  flex-shrink: 0;
  min-height: 44px; /* WCAG 2.5.8 touch target */
  min-width: 44px;
  transition: border-color 120ms, background 120ms;
}
.theme-toggle:hover {
  border-color: #63D2FF;
  background: rgba(99, 210, 255, 0.12);
}
.theme-toggle:focus-visible {
  outline: 3px solid #63D2FF;
  outline-offset: 3px;
}
.theme-toggle:active { transform: translateY(1px); }
```

---

## 5. Typography

```css
body {
  font: 15px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
        "Helvetica Neue", Arial, sans-serif;
}
```

| Use            | Size       | Weight | Token          |
|----------------|------------|--------|----------------|
| Page H1        | 1.5rem     | 800    | `--fg`         |
| Section H2     | 1.1–1.4rem | 700    | `--fg`         |
| Card H3        | 1.1rem     | 600    | `--fg`         |
| Body text      | 15px       | 400    | `--fg`         |
| Secondary text | 0.875rem   | 400    | `--fg-muted`   |
| Small / meta   | 0.82–0.85rem | 400  | `--fg-muted`   |
| Code           | 0.85rem    | 400    | `--fg` on `--code-bg` |

Line height for body: `1.6`. For long descriptions: `1.65`.

---

## 6. Buttons

Three variants. All share a `min-height: 44px` for WCAG 2.5.8 touch targets.

```css
.button {
  appearance: none;
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--fg);
  padding: 10px 18px;
  border-radius: 8px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  transition: background 120ms, border-color 120ms, transform 120ms;
}
.button:hover        { border-color: var(--accent); }
.button:active       { transform: translateY(1px); }
.button:disabled     { opacity: 0.6; cursor: not-allowed; }

/* Primary — navy bg in light mode, orange in dark */
.button-primary      { background: var(--accent); color: var(--accent-text); border-color: var(--accent); }
.button-primary:hover{ background: var(--accent-hover); }

/* Ghost — no background */
.button-ghost        { background: transparent; }
```

---

## 7. Cards

```css
.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);   /* 10px */
  padding: 18px 20px;
  box-shadow: var(--shadow);
}

/* Coloured left-border variants for status */
.card-pass    { border-left: 4px solid var(--pass); }
.card-fail    { border-left: 4px solid var(--fail); }
.card-neutral { border-left: 4px solid var(--neutral); }
```

---

## 8. Status Badges / Pills

```css
.badge {
  font-size: 0.85rem;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--neutral-bg);
  color: var(--fg-muted);
}
.badge-pass    { background: var(--pass-bg);    color: var(--pass); }
.badge-fail    { background: var(--fail-bg);    color: var(--fail); }
.badge-active  { background: var(--accent-subtle); color: var(--accent); }
```

---

## 9. Tables

Always wrap tables in `.table-scroll` for horizontal scroll on narrow screens.
Always add `scope="col"` to `<th>` elements.

```html
<div class="table-scroll">
  <table>
    <thead>
      <tr>
        <th scope="col">Column A</th>
        <th scope="col">Column B</th>
      </tr>
    </thead>
    <tbody>…</tbody>
  </table>
</div>
```

```css
.table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }

table {
  width: 100%;
  border-collapse: collapse;
  background: var(--bg-card);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow);
}
th, td {
  text-align: left;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  font-size: 0.9rem;
  vertical-align: middle;
}
th {
  background: var(--neutral-bg);
  font-weight: 700;
}
tr:last-child td { border-bottom: none; }
```

---

## 10. Notice / Disclaimer Blocks

Use for warnings, disclaimers, or informational callouts. Orange left border
signals a caution; pair with an inline SVG icon.

```html
<div class="notice" role="note">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="2" stroke-linecap="round"
       stroke-linejoin="round" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
  <span><strong>Important.</strong> Your message here.</span>
</div>
```

```css
.notice {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-left: 4px solid var(--orange);
  border-radius: 8px;
  font-size: 0.85rem;
  color: var(--fg-muted);
  line-height: 1.5;
}
.notice svg { flex-shrink: 0; margin-top: 1px; }
```

---

## 11. Links

```css
a       { color: var(--accent); }
a:hover { color: var(--accent-hover); text-decoration: underline; }
```

---

## 12. WCAG 2.2 AAA — Compliance Checklist

Target level is **AAA** throughout. Do not downgrade to AA without explicit
sign-off. Every colour pair below has been verified.

### Colour contrast minimums

| Context                        | Requirement | Ratio needed |
|--------------------------------|-------------|--------------|
| Normal body text               | AAA 1.4.6   | ≥ 7:1        |
| Large text (≥18pt / 14pt bold) | AAA 1.4.6   | ≥ 4.5:1      |
| UI component borders           | AA  1.4.11  | ≥ 3:1 against adjacent |
| Focus indicator                | AA  2.4.11  | ≥ 3:1 against bg       |

### Verified pairs — light mode

| Token / use        | Foreground  | Background  | Ratio   |
|--------------------|-------------|-------------|---------|
| Body text `--fg`   | `#1a1a1a`   | `#ffffff`   | 17.8:1  |
| Muted `--fg-muted` | `#4b5563`   | `#ffffff`   | 7.6:1   |
| Muted on bg        | `#4b5563`   | `#f4f6f8`   | 7.2:1   |
| Pass `--pass`      | `#14532d`   | `#ffffff`   | 9.1:1   |
| Pass on pass-bg    | `#14532d`   | `#dcfce7`   | 8.3:1   |
| Fail `--fail`      | `#7f1d1d`   | `#ffffff`   | 10.0:1  |
| Fail on fail-bg    | `#7f1d1d`   | `#fee2e2`   | 8.0:1   |
| Accent btn text    | `#ffffff`   | `#061528`   | 18.3:1  |

### Verified pairs — dark mode

| Token / use        | Foreground  | Background  | Ratio   |
|--------------------|-------------|-------------|---------|
| Body text `--fg`   | `#ffffff`   | `#061528`   | 18.3:1  |
| Muted `--fg-muted` | `#63D2FF`   | `#061528`   | 10.6:1  |
| Muted on card      | `#63D2FF`   | `#0d2040`   | 8.7:1   |
| Pass `--pass`      | `#4ade80`   | `#0d2040`   | 8.8:1   |
| Fail `--fail`      | `#fca5a5`   | `#0d2040`   | 8.1:1   |
| Accent btn text    | `#061528`   | `#FF7C00`   | 7.1:1   |
| Header title       | `#ffffff`   | `#061528`   | 18.3:1  |
| Header accent      | `#FF7C00`   | `#061528`   | 7.1:1   |
| Header tagline     | `#63D2FF`   | `#061528`   | 10.6:1  |

---

## 13. Keyboard-Only Navigation

Every interactive element must be fully operable with a keyboard alone.

### Skip link — paste as the first element inside `<body>`

```html
<a href="#main-content" class="skip-link">Skip to main content</a>
```

```css
.skip-link {
  position: absolute;
  top: -50px;
  left: 16px;
  background: var(--accent);
  color: var(--accent-text);
  padding: 10px 16px;
  border-radius: 0 0 8px 8px;
  font-weight: 700;
  z-index: 9999;
  text-decoration: none;
  transition: top 120ms;
}
.skip-link:focus { top: 0; }
```

### Global focus ring — WCAG 2.4.11 / 2.4.13

```css
:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 3px;
  border-radius: 4px;
}
```

The 3 px outline with 3 px offset creates a visible gap between the element
and the ring, making it clearly distinguishable without relying on colour alone.
The accent colour is `#061528` (navy) in light mode and `#FF7C00` (orange) in
dark mode — both meet 3:1 contrast against their respective page backgrounds.

### Minimum touch / click target size — WCAG 2.5.8

```css
/* Apply to every button, link, and form control */
.button, a, input, select, textarea {
  min-height: 44px;
  min-width: 44px;
}
```

### Keyboard interaction rules

| Element              | Expected keyboard behaviour                         |
|----------------------|-----------------------------------------------------|
| Buttons              | `Enter` or `Space` activates                        |
| Links                | `Enter` activates                                   |
| Custom interactive   | `role="button"` + `tabindex="0"` + `keydown` handler for `Enter`/`Space` |
| Modals / dialogs     | Focus trapped inside; `Escape` closes               |
| Dropzones            | `tabindex="0"` + `Enter`/`Space` opens file picker  |

---

## 14. Screen Reader Support

### `<html>` element

```html
<html lang="en-GB">
```

Use the correct BCP-47 language tag for the project locale.

### Landmark roles

Use semantic HTML. Every page must have:

```html
<header>…</header>
<main id="main-content">…</main>   <!-- target of the skip link -->
<footer>…</footer>
```

Add `role` only when the native element is not available (e.g. `role="note"`
on a `<div>` used as an informational notice).

### SVG icons

All decorative SVGs must be hidden from screen readers:

```html
<svg aria-hidden="true" focusable="false">…</svg>
```

If the SVG conveys meaning (e.g. a standalone icon button), use `aria-label` on
the button instead of the SVG.

### Dynamic content

Use `aria-live` on any region that updates without a page load:

```html
<!-- Polite: announces after the user finishes their current action -->
<p aria-live="polite" aria-atomic="true">Status message here</p>

<!-- Assertive: interrupts immediately — only for errors or critical alerts -->
<p role="alert">Something went wrong.</p>
```

### Buttons with icon + label

Always include visible text or `aria-label`:

```html
<!-- Visible text (preferred) -->
<button type="button">
  <svg aria-hidden="true" focusable="false">…</svg>
  Download PDF
</button>

<!-- Icon-only button — use aria-label -->
<button type="button" aria-label="Close dialog">
  <svg aria-hidden="true" focusable="false">…</svg>
</button>
```

### Tables

```html
<table>
  <thead>
    <tr>
      <th scope="col">Column heading</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Cell data</td>
    </tr>
  </tbody>
</table>
```

Always use `scope="col"` (or `scope="row"`) on `<th>` elements.

### `inert` for blocked regions

When a loading overlay blocks interaction, apply `inert` to the underlying
content. Remove it once the overlay is dismissed:

```html
<main id="main-content" inert>…</main>
```

```js
document.getElementById('main-content').removeAttribute('inert');
```

---

## 15. Responsive Design

### Breakpoints

| Breakpoint | Target                    |
|------------|---------------------------|
| `> 768px`  | Desktop — full layout     |
| `≤ 768px`  | Tablet — reduce table density |
| `≤ 640px`  | Mobile — single column, hidden non-critical columns |

### Base responsive rules

```css
/* Tablet */
@media (max-width: 768px) {
  table { font-size: 0.82rem; }
}

/* Mobile */
@media (max-width: 640px) {
  body { font-size: 14px; }
  .app-header h1 { font-size: 1.2rem; }
  /* Hide non-critical table columns */
  table th:nth-child(4), table td:nth-child(4),
  table th:nth-child(5), table td:nth-child(5) { display: none; }
}
```

### Fluid layout

```css
.page-content {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px 20px;
}
```

The `20px` horizontal padding ensures content never touches the screen edge.
The `1100px` max-width keeps line lengths readable on wide screens.

### Images

```css
img, canvas, video {
  display: block;
  max-width: 100%;
  height: auto;
}
```

### Tables — horizontal scroll wrapper

Never let a table break the viewport width. Always wrap in:

```html
<div class="table-scroll">
  <table>…</table>
</div>
```

```css
.table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
```

### Action bars — sticky bottom

```css
.action-bar {
  position: sticky;
  bottom: 0;
  background: var(--bg-card);
  border-top: 1px solid var(--border);
  padding: 12px 20px;
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;   /* wraps buttons to second line on narrow screens */
}
```

---

## 16. Motion

Respect the user's reduced-motion preference. Never animate anything structural
(layout, opacity reveals) without this guard:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

For loading overlays specifically:

```css
.overlay { transition: opacity 350ms ease; }
@media (prefers-reduced-motion: reduce) { .overlay { transition: none; } }
```

---

## 17. Meta Tags — Required in Every Project

```html
<html lang="en-GB">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <meta name="description" content="…" />
  <!-- Theme must be set before CSS loads — see Section 3 -->
  <script>/* inline theme script */</script>
  <link rel="stylesheet" href="styles.css" />
</head>
```

`color-scheme: light dark` tells the browser to apply its own default light/dark
adjustments to form elements, scrollbars, and system UI before your CSS loads.

---

## 18. Page HTML Template

```html
<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <meta name="description" content="Page description." />
  <title>Page Title — Tim Dixon</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <script>
    (function () {
      var t = localStorage.getItem('td-theme');
      document.documentElement.dataset.theme =
        t === 'dark' || t === 'light' ? t
        : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }());
  </script>
  <link rel="stylesheet" href="/styles.css" />
</head>
<body>

  <!-- 1. Skip link — must be first inside <body> -->
  <a href="#main-content" class="skip-link">Skip to main content</a>

  <!-- 2. Site header — always navy -->
  <header class="app-header">
    <div class="app-header-inner">
      <div class="app-header-text">
        <h1>App Name <span class="header-accent">Subtitle</span></h1>
        <p class="tagline">Short description.</p>
      </div>
      <button type="button" id="theme-toggle" class="theme-toggle" aria-label="Switch to dark mode">
        <svg class="icon-sun" width="20" height="20" aria-hidden="true" focusable="false"
             viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="4"/>
          <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
          <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
        </svg>
        <svg class="icon-moon" width="20" height="20" aria-hidden="true" focusable="false"
             viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
        <span class="theme-toggle-label" aria-hidden="true"></span>
      </button>
    </div>
  </header>

  <!-- 3. Main content -->
  <main id="main-content" class="page-content">
    <!-- page content -->
  </main>

  <!-- 4. Footer -->
  <footer class="app-footer">
    <!-- version · licence · © Tim Dixon (timdixon.net) -->
  </footer>

  <script type="module" src="/main.js"></script>
</body>
</html>
```

---

## 19. Copyright & Attribution

Every page must include a visible copyright notice and a link to [timdixon.net](https://timdixon.net).

### Placement

Add it to the page footer alongside the version number, licence link, and any
other footer links. Use the same `sep()` / `lnk()` pattern as the rest of the
footer so the layout stays consistent.

### HTML (static pages)

```html
<footer class="app-footer">
  <a href="https://timdixon.net" target="_blank" rel="noopener noreferrer">© Tim Dixon</a>
</footer>
```

### JS (dynamic footer — Vite / module projects)

```js
const sep = () => {
  const s = document.createElement('span');
  s.className = 'sep';
  s.setAttribute('aria-hidden', 'true');
  s.textContent = '·';
  return s;
};
const lnk = (href, text) =>
  Object.assign(document.createElement('a'), {
    href, target: '_blank', rel: 'noopener noreferrer', textContent: text
  });

footerEl.append(
  `v${version}`,
  sep(), lnk('/LICENSE', 'MIT Licence'),
  sep(), lnk('https://timdixon.net', '© Tim Dixon')
);
```

### CSS

The footer uses muted text so it does not compete with the main content,
but must still meet the AAA 7:1 contrast ratio against the page background:

```css
.app-footer {
  text-align: center;
  padding: 24px 20px;
  font-size: 0.8rem;
  color: var(--fg-muted);   /* 7.6:1 AAA in light mode, 8.7:1 in dark mode */
  border-top: 1px solid var(--border);
}

.app-footer a {
  color: inherit;
  text-decoration: underline;
}

.app-footer .sep {
  margin: 0 6px;
  opacity: 0.5;
  user-select: none;
}
```

### Rules

- Always link `© Tim Dixon` to `https://timdixon.net` with `target="_blank" rel="noopener noreferrer"`.
- Do not abbreviate or drop the copyright notice.
- Place the copyright as the last item in the footer link list.

---

## 20. Quick-Reference Checklist

Use this before shipping any page.

### Colour & contrast
- [ ] All body text ≥ 7:1 contrast ratio (WCAG AAA 1.4.6)
- [ ] All UI component boundaries ≥ 3:1 (WCAG 1.4.11)
- [ ] Pass/fail indicators verified in both light and dark mode
- [ ] No colour used as the sole means of conveying information

### Keyboard
- [ ] Skip-to-content link is the first focusable element
- [ ] All interactive elements reachable and operable by keyboard
- [ ] Focus order follows the visual reading order
- [ ] No keyboard traps (except intentional modal dialogs)
- [ ] All buttons have ≥ 44 × 44 px target area

### Screen readers
- [ ] `<html lang="…">` set correctly
- [ ] All `<th>` have `scope="col"` or `scope="row"`
- [ ] All tables wrapped in `.table-scroll` and have `<thead>`
- [ ] All decorative SVGs have `aria-hidden="true" focusable="false"`
- [ ] All dynamic regions have `aria-live="polite"` or `role="alert"`
- [ ] All icon-only buttons have `aria-label`
- [ ] Loading overlays use `inert` on the blocked content

### Theme
- [ ] Inline theme script is in `<head>` before any `<link>`
- [ ] Both `@media (prefers-color-scheme: dark)` and `[data-theme="dark"]` blocks defined
- [ ] Header is hardcoded navy — not using `--bg` or `--bg-card`
- [ ] Theme toggle `aria-label` updates when theme changes

### Responsive
- [ ] `max-width: 1100px` centred layout with `20px` horizontal padding
- [ ] All tables in `.table-scroll` wrapper
- [ ] Sticky action bars use `flex-wrap: wrap`
- [ ] Reduced motion respected with `@media (prefers-reduced-motion: reduce)`
- [ ] Images and canvases have `max-width: 100%; height: auto`

### Copyright
- [ ] Footer contains `© Tim Dixon` linked to `https://timdixon.net`
- [ ] Link uses `target="_blank" rel="noopener noreferrer"`
- [ ] Footer text colour meets AAA contrast ratio (≥ 7:1)
