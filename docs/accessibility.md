# Accessibility: Image Colour Contrast Checker

ICCC targets Web Content Accessibility Guidelines (WCAG) 2.2 at AAA conformance for its own interface. The team's full WCAG 2.2 AAA interpretation, the testing protocol, and the exception pattern are in the global wiki at `docs/accessibility.md` in the team root. This page records the project-specific accessibility posture, the known exceptions, and the current audit status.

## Conformance target

WCAG 2.2, Level AAA.

The target applies to both pages ICCC serves: `index.html` (the tool) and `privacy.html` (the privacy statement).

## Inherited standards

Read the global wiki at `docs/accessibility.md` (team root) for:

- The full WCAG 2.2 AAA criterion-by-criterion interpretation.
- The legal baseline (UK equality law, European Accessibility Act, ADA, Section 508).
- The testing protocol and screen-reader pairing requirements.
- The exception pattern and how to record exceptions.

## Project-specific posture

### Colour contrast

All body text colour pairs meet or exceed the 7:1 ratio required by WCAG 2.2 criterion 1.4.6 (Contrast, Enhanced). The verified pairs for both light mode and dark mode are documented in `DESIGN_GUIDELINES.md` at the repository root. Status indicator colours (pass, fail, warn) use solid-background pill styles in both themes so contrast is independent of the surface behind them.

### Keyboard operation

The tool is fully operable without a pointing device. The drop zone carries `tabindex="0"` and `role="button"` so it is reachable and activatable by keyboard. The file picker button, the theme toggle, and all action-bar buttons are reachable by Tab and activatable by Enter or Space.

### Screen reader operation

The preloader dialog uses `role="dialog"` and `aria-modal="true"`. The `<main>` element carries the `inert` attribute while the preloader is active, preventing screen reader focus from reaching the application content before it is ready. The preloader status region carries `aria-live="polite"` and `aria-atomic="true"` so progress updates are announced without interrupting the user. The processing queue carries `aria-live="polite"` so stage changes are announced as each file progresses.

### Reduced-motion

All animations and transitions check `@media (prefers-reduced-motion: reduce)`. Under that preference, animation durations are collapsed to 0.01 ms.

### Page language

Both HTML entry points carry `<html lang="en-GB">`.

### Skip link

A skip link reading "Skip to main content" is the first focusable element in `<body>` and links to `#app`, meeting WCAG 2.4.1 (Bypass Blocks).

## Known baseline audit status

Carol's baseline audit is held in `.claude/work/011-iccc-setup/` (file pending Carol's dispatch). Any findings from that audit are recorded in `docs/exceptions/` when they represent accepted gaps, or tracked in `todo.md` when they are setup-build items for Sean.

## Exceptions

Exceptions for this project are held in `docs/exceptions/`. At the time of project wiki scaffolding:

- `docs/exceptions/github-pages-headers.md` records the standing exception for the GitHub Pages security-header gap (CSP `frame-ancestors` and `Permissions-Policy` cannot be sent as HTTP headers on this host).

No WCAG 2.2 AAA exceptions have been formally accepted at this stage. Any Carol-raised findings that cannot be closed immediately will be added here with Tim's sign-off.
