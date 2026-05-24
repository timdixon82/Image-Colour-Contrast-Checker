# ADR 002: Layered project structure with strict dependency direction

Status: accepted (backfilled 2026-05-23).

## Context

The application has five distinct concerns: pure WCAG and image-analysis logic, integration with an OCR engine, canvas drawing, downloadable report generation, and Document Object Model (DOM) rendering. Without a structure, these collapse into a single ball of code that is hard to test and hard to change any piece of.

## Decision

Split `src/` into five folders with strict dependency rules:

- `src/core/`: pure logic only. No DOM, no browser-only Application Programming Interfaces. Worker-safe. Never imports from `render/`, `ui/`, `export/`, or `adapters/`.
- `src/adapters/`: integration with one swappable OCR engine behind a fixed two-function interface (`getOcr()`, `runOcrOnUrl(url)`).
- `src/render/`: pure canvas drawing. No strings, no app state.
- `src/export/`: report generators that accept `AnalysedEntry[]` and produce downloadable files.
- `src/ui/`: app-specific DOM components.
- `src/main.js`: orchestration only, no business logic.

## Alternatives considered

- A flat module structure with no layering. Rejected: the analysis logic and the DOM code would entangle, and the OCR engine would be hard to swap.
- A user-interface framework (React, Svelte, Vue) with its own component model. Rejected: the user-interface state machine is small (landing, processing, results) and a framework would add bundle weight and complexity for no real gain. See ADR 006.

## Consequences

The layering makes the analysis logic testable in isolation, the OCR engine swappable in one file, and report-export formats addable in one file. The cost is that the team must hold the dependency rules in mind on every change; the `CLAUDE.md` in the repository names them explicitly to keep them visible.
