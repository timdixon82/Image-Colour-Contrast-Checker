# Jed: runtime and service-worker review, PR 71 (1c75b46..4dae8c7)

Verdict: APPROVE WITH CONDITIONS. One small hardening condition (below). No security vulnerability found. Read-only review; nothing installed or run.

## 1. Template substitution (scripts/copy-models.mjs, runtime-version.mjs)
- Both substituted values come only from the `version` field of two installed `package.json` files (onnxruntime-web, @gutenye/ocr-models). No user input, environment variable or network value reaches the template.
- Semver strings cannot contain a quote, slash, backslash or `$`, so they cannot break out of the single-quoted JS strings, add a path segment, or trigger `$&` replacement patterns. The ORT folder name is also regex-escaped inside the worker.
- The script throws if any `__NAME__` placeholder is left over, so a half-filled worker is never written.
- The cleanup loop only deletes names it just listed inside `public/` that match `^ort(-.+)?$`, other than the current folder. No traversal is possible.
- Residual: someone who can alter files in node_modules can already run code at install time, so this adds no new trust boundary.

## 2. Cache rule (scripts/sw.template.js)
- Cache-first applies only when the request is a GET, the origin equals the worker's own origin, and the path contains `/models/` or `/ort-<version>/`. Cross-origin requests fall through to the default branch and are never stored.
- Only `status === 200` responses are stored. Opaque responses have status 0 and a same-origin-only filter keeps them out in any case. Partial (206) responses are not stored.
- Old caches are pruned on activate: every `icc-model-cache-*` key other than the current name is deleted. The old unversioned `/ort/` is no longer matched at all, so an older worker and the new page cannot cross-serve runtime bytes.
- Low note: the path test is unanchored, so any same-origin path containing `/models/` is cacheable. That is the same as before the PR and harmless on a static site.

## 3. COOP/COEP logic
I diffed the new template against the previous `public/sw.js`. The only changes are the header comment, the `MODEL_CACHE` and `ORT_DIR` constants, `CACHEABLE_PATH` built from `ORT_DIR`, and a comment on prune. The install, message, `withCoiHeaders`, default fetch branch and page-registration code is unchanged.

## 4. Generation in a fresh clone (public/sw.js is gitignored; only count.js, analytics/count.js and favicon.svg remain tracked in public/)
| Path | Generates sw.js before it is needed? |
|---|---|
| `npm ci` | Yes, via `postinstall`. No `.npmrc` and no `--ignore-scripts` anywhere in the workflows. |
| `npm run dev` | Yes, `predev`. |
| `npm run build` | Yes, `prebuild`. Vite copies `public/` into `dist/`. |
| deploy.yml | `npm ci`, then `npm run build`, then uploads `dist`. Yes. |
| ci.yml | `npm ci`, then build, then tests. Yes. |
| lint.yml | `npm ci` only (postinstall generates it); lint does not need it. |
| accessibility.yml | `npm ci`, `npm run build`, then serves `dist`. Yes. |
| playwright.yml | Placeholder echo only; serves and tests nothing. |
| `vite preview` | Serves an existing `dist/`; fine after a build. |

No workflow serves or tests the site without a build. `vite.config.js` also imports `runtimeInfo`, so a missing node_modules fails loudly ("run npm ci first") rather than quietly.

If sw.js were absent (for example someone runs `npx vite build` directly, skipping `prebuild`): `index.html` would request a missing `sw.js`. On GitHub Pages that is a 404, and in Vite dev it can return the HTML page, which is not valid script. Either way no worker registers, the page is not cross-origin isolated, SharedArrayBuffer and threaded WASM are unavailable, and OCR fails or degrades. The only trace is a console error. Previously this could not happen because sw.js was tracked.

Condition (small, not security-critical): add a guard so this cannot ship silently, for example a tiny Vite plugin (`closeBundle`) or a line in a CI step that fails if `dist/sw.js` is missing or still contains `__MODEL_CACHE__`/`__ORT_DIR__`. Optional and cheap: a unit test that runs the generator into a temp folder is not needed given the leftover-placeholder throw.

## 5. Supply chain
- The scripts use only `node:fs`, `node:path` and `node:url`, and read only local `node_modules/*/package.json` and the template file. No network calls, no `eval`, no `new Function`, no child processes. Dependencies are unchanged by d1901a3.

## 0c004a5 (src/core/contrast.js)
- New loop is one pass over `rw * rh` with a single `Uint8Array(rh)` plus a reduce over `rh`. Bounded, no recursion, no growth between calls. No findings.

## Other
- `__ORT_DIR__` is a build-time constant from `define`; eslint globals updated; preloader and adapter use the same value, so they stay in sync with the folder the worker caches. No injection surface (not user-controlled).
- No personal data in the diff.
