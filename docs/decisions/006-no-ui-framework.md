# ADR 006: No user interface framework; plain DOM code throughout

Status: accepted (backfilled 2026-05-23).

## Context

ICCC's user interface has three states (landing, processing, results) and a small set of components: a drop zone, queue rows, a summary table, image cards, and an action bar. The team must decide whether to render with a framework (React, Svelte, Vue) or with plain Document Object Model (DOM) code.

## Decision

Render with plain DOM code. Use `document.createElement` and `appendChild` everywhere. Never use `innerHTML` for any user-derived value. Centralise rendering inside `src/ui/report-view.js`, `src/ui/dropzone.js`, and `src/ui/progress.js`. Wire interactions through `addEventListener` in `src/main.js`.

## Alternatives considered

- React, with or without a build step. Rejected: SWOT-Builder is the team's reference React-on-this-stack project; ICCC's user interface state machine is smaller and the framework's weight is not justified.
- Svelte. Rejected for the same reason: not enough complexity to justify a framework's compile model.
- Lit or another web-component library. Rejected: the team has no experience with it, and the user interface is small enough that plain DOM wins on simplicity.

## Consequences

The bundle is smaller, the load is faster, and the code is easy to read for anyone who knows the DOM. The strict avoidance of `innerHTML` for user-derived values removes a class of cross-site scripting (XSS) risk by construction. The cost is that any future move to a heavier user interface, for example a batch-comparison view, might need a framework, at which point this ADR would be revisited.
