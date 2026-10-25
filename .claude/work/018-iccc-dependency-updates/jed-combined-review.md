# Jed: security review of combined release PR 71 (release/combined-update)

Date: 2026-10-25. Read-only review of the worktree. No install, no build, no commits.

## Verdict: APPROVE (one non-blocking advisory)

Nothing in the new work is a reason to hold the release. The advisory is about the privacy statement wording, not code.

## 1. Lockfile diff against main

- Every resolved URL is on registry.npmjs.org. No new or changed hosts, no git or tarball URLs.
- No package kept its version while its integrity or resolved URL changed.
- No new install scripts. Packages with install scripts are unchanged: fsevents and protobufjs.
- 69 versions changed, 7 added, 19 removed. Added ones are ordinary: fflate 0.8.3 (new pdfkit dependency), @jridgewell resolve-uri and trace-mapping, @keyv/bigmap, a rolldown Android binding (optional, platform-specific), and two magic-string copies under vitest. Removed ones include js-md5 (no longer a pdfkit dependency) and the old vitest 4 sub-packages.
- Sixth advisory-fix package: side-channel, 1.1.0 to 1.1.1 (published by ljharb, 2026-06-08). It is the transitive dependency of qs. The other five are brace-expansion 5.0.7 to 5.0.12, fast-uri 3.1.4 to 3.1.9, js-yaml 4.3.0 to 4.3.2, pbkdf2 3.1.6 to 3.1.7, qs 6.15.2 to 6.16.1.
- The lockfile integrity hashes for vitest, pdfkit and side-channel match what the registry reports.

## 2. Supply-chain posture of the two big bumps

- vitest 5.0.5: published 2026-10-15 (10 days ago) by the GitHub Actions publisher, with SLSA provenance attestation. Maintainers are the known Vitest team (Ari Perkkio, Anthony Fu, Hiroshi Ogawa, Evan You and one other). Dev dependency only, never shipped.
- pdfkit 0.20.2: published 2026-08-30 (8 weeks ago) by a long-standing maintainer (blikblum) in the usual maintainer group (Devon Govett, Diego Mura, Luiz, Libor). No provenance attestation, which is normal for this package and is a small weakness only. Its dependency list is smaller and moved to pure JS crypto (@noble, fflate, png-js 2.0.0 by the same maintainers). This is shipped code, so it is the more important of the two, but nothing looks unusual.

## 3. npm audit on the branch

- Result: 6 low, all the chain elliptic -> create-ecdh / browserify-sign -> crypto-browserify -> node-stdlib-browser -> vite-plugin-node-polyfills. No fix is available (elliptic latest is 6.6.1).
- Not reachable in the shipped bundle. vite.config.js is unchanged and restricts the polyfill plugin to buffer, stream, zlib, util and process, so crypto-browserify and elliptic are never pulled in. src has no crypto import. A grep of the existing dist output for "elliptic" finds nothing. That dist is from the main clone, not a fresh build of this branch, but the config is identical, so I treat it as sound. A fresh-build confirmation was not cheap without an install, so I did not do it. Suggest checking `dist` on the CI build if you want certainty.
- It also lives in the build tool chain only, and the app has no server or key handling.

## 4. Swatch detection (src/core/contrast.js)

- All loops are bounded by the strip's width and height. Images are resized to a 1400 px long edge (src/core/image.js), so the work per strip is capped.
- The erosion check costs about n x (2R+1)^2 per strip with R = height/18, at least 1. For text-height strips R is small, so this is modest. Memory is one Uint8Array of strip size plus the existing luminance array. No recursion, no unbounded growth, no division that can crash (a count of zero is prevented by the 2% minimum minority check before the spread step).
- Pure maths on pixel data, no DOM, no strings leave it. No security concern. The fallback ("never silence a real failure") is a good fail-safe design.

## 5. Per-pair URL builder (src/export/strings.js)

- vestibularCheckerUrl accepts only a six-digit hex colour (optional leading hash), using an end-anchored regex, and builds the query from the lowercased captured digits alone. Anything else returns the bare fixed URL. Host and path are constants, so no host or parameter injection, and no characters beyond 0-9, a-f can reach the link.
- That makes the output safe in the three places it is used: the HTML href (set as a property, not markup), the PDF link annotation, and the Markdown link target (no brackets, parentheses, spaces or quotes are possible). The Markdown link label is a constant.
- The anchor keeps rel noopener noreferrer and target _blank.
- Advisory (non-blocking, owner: Sean/Sonja): the link host moved from tastheartist.com to vadchecker.com and now carries the two colours in the query. When a user clicks it, those two hex values go to a third party. The privacy statement says "the only request that leaves your device" is the GoatCounter page view; that is still true for automatic requests, but a one-line note that the VADChecker link sends the two colours only when clicked would keep the statement accurate. Colours from an image are not personal data in themselves. The CSP is unaffected (a navigation, not a fetch).

## Other

- public/sw.js: only the cache name bump to v2, correct for the new runtime files.
- Grep found no secrets, new network calls or eval in the diffed source.

<!-- TASK -->
- [ ] Add a line to privacy.html that the VADChecker link sends the pair's two hex colours to vadchecker.com only when clicked `priority:low` `owner:sean` `from:jed-combined-review` `tag:security`
<!-- /TASK -->
