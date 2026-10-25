# Jed security review: dependency PRs 69 and 70

Date: 2026-10-25. Reviewer: Jed.
Scope: PR 69 (`chore/dependency-updates`, head 50325a2) and PR 70 (`chore/onnxruntime-web-update`, head 6cc94a7), both compared with `origin/main` (3bde7b4).

Method: parsed the lockfiles on each branch against main (script, not eyeballing); ran `npm audit --package-lock-only` on main, PR 69 and PR 70 from copies kept outside the repo (no worktree or `node_modules` was created, so there is nothing to clean up); queried the npm registry for release dates, maintainers, install scripts and provenance; read `public/sw.js`, `vite.config.js`, `scripts/copy-models.mjs` and the `pdfmake`/`pdfkit` imports in `src/`.

## Verdicts

| PR | Verdict |
|---|---|
| 69 | Approve with conditions |
| 70 | Approve (with one process note) |

## PR 69: dev-tooling and library bumps

### 1. Lockfile diff
- Resolved hosts: every package resolves from `registry.npmjs.org`. No host or registry changes.
- Integrity: no package kept its version while changing its integrity hash or resolved URL.
- Install scripts: none new. Only `fsevents` and `protobufjs` have them, and both already did on main. No bumped or new package declares preinstall, install or postinstall.
- Registry check on the headline bumps: no install scripts on any of the new versions.
- New packages (5), all MIT, all from npm:
  - `fflate` 0.8.3, `png-js` 2.0.0 and a nested `pdfmake/node_modules/pdfkit` 0.20.2. These arrive because pdfmake 0.3.12 now requires `pdfkit ^0.20.2`. The maintainers of pdfkit and png-js are the same as before (pdfkit: `devongovett`, `diegomura`, `liborm85`, `blikblum`).
  - `@keyv/bigmap` and `@rolldown/binding-android-arm-eabi`. The first is a dev-only dependency of stylelint's cache chain; the second is an extra optional platform binary for rolldown, which already ships the other platform binaries.
- Removed packages: `json-buffer` and some nested `keyv`/`file-entry-cache`/`flat-cache` copies. These are the result of a dev-only dependency chain reshuffle (stylelint cache libraries moved from keyv 4 to keyv 5).
- Net: the lockfile change is consistent with the stated bumps. Nothing unexpected.

Points to be aware of (not blockers):
- The project now has two `pdfkit` copies on disk: root 0.19.1 (our direct dependency) and a nested 0.20.2 under pdfmake. This is not a shipped-bundle issue, because `pdfmake` is only used for its Roboto font files (`src/export/pdf.js`, `scripts/copy-models.mjs`); the code imports `pdfkit` directly through `src/lib/pdf-ua/`. It is worth knowing about so nobody later assumes the PDF engine is 0.20.2.
- Brief wording: the brief lists `vite` 8.1.4 and `eslint` 10.7.0 as current; the lockfile on main had vite 8.2.0 and eslint 10.8.0. Immaterial.
- Lockfile regenerated with npm 11: churn is large (about 1,400 diff lines) but I found no semantic surprises. Future PRs should say which npm version produced the lockfile.

### 2. Remaining audit advisories (11: 6 low, 2 moderate, 3 high)
Main reported 17; PR 69 reports 11, and the parsed result agrees with your numbers. Nothing new was introduced; the six removed items were `@vitest/mocker`, `vitest`, `vite`, `colord`, `postcss-selector-parser` and `source-map-js`.

Remaining high:

| Package | Path | In shipped bundle? | Fix in range? |
|---|---|---|---|
| `brace-expansion` 5.0.7 (advisory range up to 5.0.11) | eslint > minimatch | No, dev only (lint) | Yes, 5.0.12 is published |
| `fast-uri` 3.1.4 (range up to 3.1.8) | stylelint > table > ajv | No, dev only (lint) | Yes, 3.1.9 is published and ajv asks for `^3.0.1` |
| `js-yaml` 4.3.0 (range up to 4.3.1) | stylelint > cosmiconfig | No, dev only (lint) | Yes, 4.3.2 is published |

Remaining moderate:
- `pbkdf2` 3.1.6 and `qs` 6.15.2, both via `vite-plugin-node-polyfills` > `node-stdlib-browser`. Fixes exist in range (pbkdf2 3.1.7, qs 6.16.1 and 6.15.x).
- Reachability: `vite.config.js` limits the polyfill plugin to `buffer`, `stream`, `zlib`, `util`, `process`. `pbkdf2` comes in with the crypto polyfill and `qs` with the `url` polyfill, and neither is included. I did not run a production build to confirm; the config evidence is strong but a quick grep of `dist/` for `pbkdf2` would settle it.

Remaining low (6): `browserify-sign`, `create-ecdh`, `crypto-browserify`, `elliptic`, `node-stdlib-browser`, `vite-plugin-node-polyfills`. Same polyfill chain, same reasoning. npm offers no non-breaking fix for these.

Nature of the advisories: all five high/moderate items are denial-of-service (CPU or memory exhaustion) bugs in tools that process trusted local config files or run on a developer machine or CI. None is in code that handles uploaded images in the browser. No advisory is critical or exploitable by a site visitor.

Brief Definition of Done check: "no new high or critical issues" is met (5 high down to 3, none new).

### 3. Service worker
Not touched by PR 69.

### 4. Supply chain
Release dates (today is 2026-10-25) and maintainer sets:
- Maintainer lists are unchanged between old and new for every direct bump I checked (pdfmake, pdfkit, vite, vitest, eslint, stylelint, globals, rolldown, `@gutenye/ocr-browser`, keyv, flat-cache).
- Several are very fresh: `vite` 8.3.5 and `rolldown` 1.2.15 (21 Oct, 4 days old), `eslint` 10.13.0 (16 Oct), `vitest` 4.1.12 (15 Oct), `pdfmake` 0.3.12 (17 Oct). A very recent release has had little time for the community to spot a compromised publish.
- Provenance attestations exist for pdfmake, vite, vitest, stylelint, rolldown and flat-cache. They are absent for eslint, globals, pdfkit, keyv and `@gutenye/ocr-browser`. Absence is normal for those packages and is not itself a finding.
- `@gutenye/ocr-browser` 1.4.9 is the first release since December 2024 (nine months). Same single maintainer. The jump is worth a short look at its release notes, though its install-script field is empty and it is the only package that ships into the browser in this PR.
- Caveat: I could verify the registry metadata, not the actual tarball contents of every package.

### Conditions for approval
1. Do not merge on the day of the newest releases if you want a settling period. Optional, but cheap: wait until `vite` 8.3.5 and `rolldown` 1.2.15 are at least a week old (about 28 Oct) before Tim merges. These are build tools that run with the repo's full access in CI and on developer machines.
2. Record the remaining 11 advisories as accepted dev-tooling debt, or clear the 3 high ones now with an in-range lockfile refresh (`npm update brace-expansion fast-uri js-yaml pbkdf2 qs`, no `--force`). All five fixes are published and in range, so this should drop the count to about 6 low. Sean can do this in the same PR or a follow-up; not a blocker.
3. Before merge, Carol's PDF export result should be re-confirmed on the PR 69 build specifically (pdfmake pulling a second pdfkit is the only structural change touching the PDF area).

## PR 70: onnxruntime-web 1.27.0 to 1.30.0 and cache bump

### 1. Lockfile diff
- Only `onnxruntime-web` and `onnxruntime-common` changed (both 1.27.0 to 1.30.0, versions kept in step). No packages added or removed, no host change, no install-script change.
- `package.json` range bumped to `^1.30.0`; `sw.js` changed by one line.

### 2. Audit
17 findings on both main and PR 70: no change, nothing new, nothing introduced by the runtime. onnxruntime-web has no advisories in the audit.

### 3. Service worker cache change
- `MODEL_CACHE` goes from `icc-model-cache-v1` to `icc-model-cache-v2`. This is the correct and necessary change: `public/ort/` is generated at install/build time from `node_modules` (`scripts/copy-models.mjs`, git-ignored), so the new WASM and `.mjs` files will have the same URLs as the old ones. Without the bump, existing visitors would keep getting the 1.27.0 WASM from the cache-first handler while the page code expects 1.30.0.
- The activate handler deletes any `icc-model-cache-*` key that is not the current one, so the old v1 cache (around 100 MB or more of WASM files) is cleaned up automatically.
- Poisoning assessment: the handler caches only same-origin GET requests whose path matches `/models/` or `/ort/`, and stores only HTTP 200 responses. A cross-origin attacker cannot insert entries. The risk that was always there (a bad response cached once is served until the version suffix changes) is unchanged by this PR, and the bump actually clears any such entry. COOP/COEP headers are applied on serve, not cached. No new risk.
- Process note: the cache version is a manual convention. Consider a follow-up that derives the cache name from the `onnxruntime-web` version (injected at build time) so this bump cannot be forgotten next time. Low priority.

### 4. Supply chain
- 1.30.0 published 2026-09-14 (41 days old). 1.27.0 was published 2026-06-19.
- Maintainers: two accounts were added since 1.27.0, `sanaahamel_microsoft` and `microsoft1es`, both with Microsoft addresses. 1.30.0 was published by `microsoft1es` (Microsoft's 1ES automated publishing account); 1.27.0 was published by `erscor_msft`. This looks like a normal move to a managed publishing pipeline in the same organisation. The repository field is still `Microsoft/onnxruntime`. I would not call it a concern, but it is the one maintainer change I found.
- No provenance attestation on 1.30.0 (nor on 1.27.0), so there is no regression. Registry signatures are present. No install scripts.
- Caveat: the 1.30.0 tarball contents (WASM binaries) were not independently inspected. WASM changes are large and opaque, so the trust basis is the publisher.

### Functional note for Sonja
The 3 WASM variants copied to `public/ort/` come from whatever 1.30.0 ships. Carol's end-to-end OCR test in a real browser is the right gate; I have no security objection beyond that.

### Verdict
Approve. No conditions; PR 70 can merge independently of PR 69, which matches the brief's rollback plan.

## Summary for Tim (plain language)
- Neither PR adds anything suspicious. All downloads come from the normal npm registry, no new install-time scripts run, and no package changed contents without changing version.
- PR 69 removes 6 of the 17 known weaknesses. The ones left are in lint and test tooling and in unused browser-polyfill code. None can be reached by someone using the website. All remaining high ones have fixes available inside the version ranges we already allow.
- PR 70 is the correct, safe way to ship the new OCR engine: the cache bump makes returning visitors download the new engine files and deletes the old copy.
- The only judgement call is timing: some PR 69 packages were published within the last week.

<!-- TASK -->
- [ ] Clear the in-range audit advisories (brace-expansion, fast-uri, js-yaml, pbkdf2, qs) with `npm update` on those packages, no `--force`, then re-run `npm audit` `priority:low` `owner:sean` `from:jed-018-dependency-updates` `tag:security`
<!-- /TASK -->

<!-- TASK -->
- [ ] Derive `MODEL_CACHE` in `public/sw.js` from the onnxruntime-web version at build time so the cache bump cannot be forgotten `priority:low` `owner:sean` `from:jed-018-dependency-updates` `tag:security`
<!-- /TASK -->
