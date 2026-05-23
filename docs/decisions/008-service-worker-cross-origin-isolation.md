# ADR 008: Hand-written service worker for cross-origin isolation and persistent model caching

Status: accepted; the vendored upstream code carries a small standing risk (backfilled 2026-05-23).

## Context

Multi-threaded WebAssembly (WASM) requires `SharedArrayBuffer`, which a browser only exposes when the page is cross-origin isolated. A page is cross-origin isolated when it is served with two HyperText Transfer Protocol (HTTP) response headers: `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`. GitHub Pages cannot send custom HTTP response headers (see the standing exception at `docs/exceptions/github-pages-headers.md` and global decision record 011). Separately, iOS Safari evicts large files from its standard HTTP cache between visits, causing a 28 MB re-download every time the user returns.

## Decision

Ship a single hand-written service worker at `public/sw.js` that does two jobs in one scope:

1. Cross-origin isolation. This is the `coi-serviceworker` v0.1.7 technique (by Guido Zuidhof, MIT licence), kept behaviourally identical. The page-context half registers the worker on every load; the worker-context half intercepts every fetch and re-emits the response with `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` (or `credentialless` where appropriate).
2. Persistent caching, cache-first, for any request whose path matches `/models/` or `/ort/`, stored in Cache Storage under `icc-model-cache-v1`. The version suffix is bumped when the model or runtime files change so stale bytes are retired.

## Alternatives considered

- Move hosting to a platform that can send custom HTTP response headers (Cloudflare Pages, Netlify, a VPS). Rejected for now: the existing GitHub Pages deploy is working, and moving hosting is a separate decision.
- Use two service workers. Not possible: a single scope can have only one controlling service worker.
- Skip cross-origin isolation and live with single-threaded WASM. Rejected: multi-threaded WASM is roughly four times faster on the analysis pipeline.

## Consequences

Multi-threaded WASM works on GitHub Pages. The 28 MB of model and runtime files download once and then load instantly from Cache Storage. The cross-origin isolation half is vendored from an upstream project (`coi-serviceworker`) with no version manifest and no Subresource Integrity check, so a future advisory against `coi-serviceworker` must be tracked manually. The team will include a check of the `coi-serviceworker` upstream in monthly housekeeping. Bump `MODEL_CACHE` in `public/sw.js` whenever the model or runtime files change to retire the previous cache.
