# Project Wiki: Image Colour Contrast Checker

This is the project wiki for Image Colour Contrast Checker (ICCC), hosted at `https://image-colour-contrast-checker.timdixon.net`. The wiki covers decisions, standards, the privacy posture, and the project log. For the team's shared standards, see the global wiki in the `AgentTeam/docs/` folder at the team root.

ICCC is on the Browser AI Application stack (Vite, vanilla JavaScript, ONNX Runtime Web, PaddleOCR PP-OCRv4), hosted on GitHub Pages.

## Pages

### Core wiki pages

- [Project log](log.md): the chronological, append-only record of decisions, dispatches, and changes.
- [Glossary](glossary.md): project-specific terms (OCR, ONNX Runtime Web, contrast, vestibular, and more).
- [Coding standards](coding-standards.md): project-specific notes; inherits the global standards and the Browser AI Application stack.
- [Accessibility](accessibility.md): WCAG 2.2 AAA posture, known status, and any accepted exceptions.
- [Release process](release-process.md): branching, pull requests, versioning, and the merge gate.
- [Privacy](privacy.md): GoatCounter analytics posture and data-protection analysis.

### Decision records

- [ADR 001: Client-side-only browser application, no server](decisions/001-client-side-only-browser-application.md)
- [ADR 002: Layered project structure with strict dependency direction](decisions/002-layered-project-structure.md)
- [ADR 003: PaddleOCR PP-OCRv4 via `@gutenye/ocr-browser` and ONNX Runtime Web](decisions/003-paddleocr-onnx-runtime-web.md)
- [ADR 004: Single export contract, `AnalysedEntry[]`, with strings centralised in one file](decisions/004-export-contract.md)
- [ADR 005: Vite as build tool, two HTML entry points, no UI framework, manual versioning until release-please](decisions/005-vite-build-tool.md)
- [ADR 006: No user interface framework; plain DOM code throughout](decisions/006-no-ui-framework.md)
- [ADR 007: Bundled runtime dependencies with vendored model files copied at install time](decisions/007-bundled-runtime-dependencies.md)
- [ADR 008: Hand-written service worker for cross-origin isolation and persistent model caching](decisions/008-service-worker-cross-origin-isolation.md)
- [ADR 009: GoatCounter analytics on a per-project counter, self-hosted script](decisions/009-goatcounter-analytics.md)

### Exceptions

- [GitHub Pages security-header gap](exceptions/github-pages-headers.md): pointer to the global standing exception. ICCC is on GitHub Pages and meets all conditions of the standing exception approved on 2026-05-23.
- [CSP unsafe-eval for ONNX Runtime Web](exceptions/csp-unsafe-eval-for-ort.md): accepted-with-risk exception allowing `'wasm-unsafe-eval'` and `'unsafe-eval'` in `script-src`. Required by ORT Web's WASM bootstrap; risk is bounded because no remote scripts are loaded. Approved by Tim Dixon on 2026-05-23 (Q67B).

### Patterns

- [Cross-origin isolation service worker](patterns/cross-origin-isolation-service-worker.md): adding COOP and COEP headers on GitHub Pages via a service worker, combined with Cache Storage model caching.

### Stack notes

- [Browser AI Application (ICCC deviations)](stacks/browser-ai-application.md): points where ICCC differs from the global stack page, and confirmations of previously SWOT-specific sections.

## Cross-references to the global wiki

- [Global coding standards](../../docs/coding-standards.md) (team root).
- [Global accessibility](../../docs/accessibility.md) (team root).
- [Browser AI Application stack](../../docs/stacks/browser-ai-application.md) (team root).
- [GoatCounter analytics pattern](../../docs/patterns/goatcounter-analytics.md) (team root).
- [Standing GitHub Pages security-header exception](../../docs/exceptions/github-pages-security-headers.md) (team root).
- [Decision Record 011: Standing GitHub Pages exception](../../docs/decisions/011-standing-github-pages-security-header-exception.md) (team root).
