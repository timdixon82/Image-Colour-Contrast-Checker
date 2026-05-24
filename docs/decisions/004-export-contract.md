# ADR 004: Single export contract, `AnalysedEntry[]`, with strings centralised in one file

Status: accepted (backfilled 2026-05-23).

## Context

ICCC exports a report as a Portable Document Format (PDF) file and as a Markdown file. Each export needs the same data (the analysed images, their colour pairs, the preview canvases) and the same user-facing copy (the disclaimer, the thresholds footer, the site Uniform Resource Locator). Without a contract, the two formats can drift apart in both data and wording.

## Decision

Both exporters (`src/export/pdf.js` and `src/export/markdown.js`) accept `AnalysedEntry[]` and nothing else from application internals. The `AnalysedEntry` type is defined in `src/core/schema.js` as a JSDoc `@typedef` only, with no runtime code. All user-facing strings shared between the exporters live in `src/export/strings.js` (`APP_NAME`, `SITE_URL`, `THRESHOLDS_FOOTER`, `DISCLAIMER_TEXT`). Neither exporter may import from `ui/`, `adapters/`, or `core/image.js`.

## Alternatives considered

- Pass the live Document Object Model (DOM) nodes to the exporters. Rejected: it ties exports to a particular renderer and forbids server-side or worker generation in the future.
- Inline strings in each exporter. Rejected: the two formats drift, and changes need to be made twice.

## Consequences

New export formats, for example HTML, CSV, or JSON, are a single new file under `src/export/`. The string source of truth is one file. The cost is that the renderer must populate `entry.previewDataUrl` and `entry.pairAssets` before the exporter runs; this is documented as a deliberate side effect in `src/ui/report-view.js`.
