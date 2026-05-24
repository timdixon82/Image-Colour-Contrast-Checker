# Pattern: Cross-origin isolation service worker

This pattern solves a specific problem on GitHub Pages: delivering the `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` HTTP response headers that multi-threaded WebAssembly (WASM) requires, on a host that cannot send custom HTTP response headers.

This pattern is documented here in the ICCC project wiki because ICCC is its first use. Jacob flagged it as a cross-cutting candidate in his architecture review (`.claude/work/011-iccc-setup/jacob-architecture-review.md`, section 4). If the team adopts a second Browser AI Application project that needs multi-threaded WASM on GitHub Pages, Sonja should promote this to the global wiki at `docs/patterns/` in the team root.

## Problem

A page needs `crossOriginIsolated = true` so the browser exposes `SharedArrayBuffer` and the multi-threaded WASM backend can use it. `crossOriginIsolated` requires two HTTP response headers:

- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

GitHub Pages sends neither. There is no way to add custom response headers to a standard GitHub Pages deployment.

## Solution

Ship a service worker that intercepts every fetch request and re-emits the response with the two required headers added. Because the headers are added by the service worker at response time, not stored in the cache, they are always fresh.

## When to combine with model caching

A Browser AI Application on GitHub Pages that needs cross-origin isolation also typically needs to cache large model and runtime files in Cache Storage (iOS Safari evicts large files from the standard HTTP cache between visits). A single service worker can do both jobs in one scope. Only one service worker can control a given scope, so combining the two jobs in one file is the only safe design.

## ICCC implementation

`public/sw.js` combines the `coi-serviceworker` v0.1.7 technique (by Guido Zuidhof, MIT licence) for cross-origin isolation with cache-first Cache Storage caching for paths matching `/models/` and `/ort/`. The service worker is registered on every page load through a `<script src="sw.js">` tag in `index.html`. See ADR 008 for the full decision record.

## Standing risk

The cross-origin isolation half is derived from an upstream open-source project (`coi-serviceworker`) vendored inline. There is no version manifest or Subresource Integrity check for the vendored code. A future security advisory against `coi-serviceworker` must be tracked manually. The team's compensating control is a monthly housekeeping task to check the upstream for advisories.

## Alternative

Move the project to a host that can send the full HTTP header set (Cloudflare Pages, Netlify, a VPS). This removes the service worker requirement entirely and is the right call if the project has other reasons to move host. See ADR 008.
