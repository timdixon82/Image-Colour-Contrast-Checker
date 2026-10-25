# Jed review: Dependabot alerts, work folder 021

Date: 2026-10-25. Source: `gh api repos/timdixon82/Image-Colour-Contrast-Checker/dependabot/alerts?state=open` (read only). Versions below come from the alert data, the installed tool trees and `npm view`.

## 1. Inventory (44 alerts)

Runtime in the shipped app: none. Root package.json runtime dependencies are @gutenye/ocr-browser, blob-stream, onnxruntime-web, pdfkit, pdfmake. No tooling package appears there. The one root alert (elliptic) is a dev dependency (vite-plugin-node-polyfills > node-stdlib-browser > crypto-browserify) and a grep of dist/ finds no elliptic.

Installed vs fixed (installed = current lock):

### .github/lint-tools/package-lock.json (CI lint only; 18 alerts)
| Package | Installed | Alerts (severity) | Fixed in | Parent |
|---|---|---|---|---|
| fast-uri | 3.1.4 | #30,39,41,44,46,64 high; #108,110 medium; #107,109 low (10) | 3.1.9 | html-validate > ajv |
| js-yaml | 4.3.0 | #34,58 high (2) | 4.3.2 | stylelint > cosmiconfig |
| postcss | 8.5.19 | #33 medium | 8.5.23 | stylelint |
| postcss-selector-parser | 7.1.4 | #89 medium | 7.1.6 | stylelint |
| source-map-js | 1.2.1 | #88 high | 1.2.2 | css-tree, postcss |

### .github/accessibility-tools/package-lock.json (CI accessibility only; 25 alerts)
| Package | Installed | Alerts (severity) | Fixed in | Parent |
|---|---|---|---|---|
| axios | 1.18.1 | #74,76,77,81 high; #79,82,84,102,103 medium (9) | 1.20.0 | chromedriver (axe cli), wait-on |
| ip-address | 10.2.0 | #29 high; #26,27,61,63,73 medium (6) | 10.7.1 covers all | socks (via proxy-agent, chromedriver) |
| adm-zip | 0.6.0 (override ^0.6.0) | #60,67 high; #72 medium (fixed 0.6.1); #51 medium (no fix) | 0.6.1 / none | chromedriver |
| extract-zip | 2.0.1 | #37,52 high | none (package unmaintained) | @puppeteer/browsers (Pa11y > puppeteer) |
| follow-redirects | 1.16.0 | #96,97 high | 1.16.1 | axios (wait-on) |
| joi | 18.2.1 | #85 medium; #49,50 low | 18.2.9 | wait-on |
| js-yaml | 4.3.0 | #32,57 high | 4.3.2 | cosmiconfig (puppeteer) |

### package-lock.json (root, dev only; 1 alert)
| elliptic | 6.6.1 | #1 low | none | vite-plugin-node-polyfills chain, build-time only, absent from dist |

Check: 18 + 25 + 1 = 44. Count of high = 22 (fast-uri 6, js-yaml 4, source-map-js 1, axios 4, ip-address 1, adm-zip 2, extract-zip 2, follow-redirects 2).

## 2. Exploitability in our context

Both workflows run only on pull_request, on GitHub-hosted runners, against our own built pages served on localhost (python http.server). Inputs are our own HTML/CSS and package metadata. No tool processes attacker-supplied URLs, YAML, ZIPs, or proxy config.

- fast-uri (host confusion, SSRF-style): used by ajv inside html-validate to resolve schema refs in its own config. No attacker URL reaches it. Not exploitable. Practical risk: none.
- js-yaml (CPU use in merge keys / !!omap): parses only our own config files. Not exploitable; at worst a CI slow-down (DoS is not a concern for our own CI).
- postcss, postcss-selector-parser, source-map-js (CPU, sourceMappingURL read): parse our own CSS. Not exploitable. A malicious contributor pull request could add hostile CSS, but fork pull requests run without secrets and a CPU stall is the worst case.
- axios, follow-redirects: wait-on polls http://localhost:8080 and chromedriver downloads from fixed vendor hosts. Prototype-pollution gadgets need attacker-controlled objects; redirect and header-leak issues need cross-origin redirects with credentials; we send none. Not exploitable.
- ip-address (SSRF classification): used by socks proxy agent; no proxy configured in CI. Not exploitable.
- adm-zip, extract-zip (symlink and path traversal, SUID, memory): they unpack the Chrome/ChromeDriver archives from vendor download hosts over HTTPS. Exploit needs a malicious archive, i.e. a compromised vendor host or supply-chain event. That is a real but remote risk; the fix is not available for extract-zip or adm-zip #51, so reduce exposure by moving off extract-zip (below).
- joi (prototype pollution via crafted messages/rename): wait-on uses a fixed internal schema. Not exploitable.
- elliptic (risky primitive): not in dist; build-time only; no patch exists.

Overall: no alert is exploitable by an outside party through our usage. Residual risk is general CI supply chain, which is better handled by pinned lockfiles, `npm ci`, least-privilege workflow tokens and SHA-pinned actions (already in place).

## 3. Fix route per group

| Group | Route | Major bump? |
|---|---|---|
| lint-tools: fast-uri, js-yaml, postcss, postcss-selector-parser, source-map-js | Transitive. Run `npm update fast-uri js-yaml postcss postcss-selector-parser source-map-js` in .github/lint-tools to refresh the lock within existing semver ranges (all fixed versions are patch/minor of the installed lines). If any is held back by a parent range, bump html-validate (11.5.6 to 11.17.0, same major) and stylelint (17.14.0 to 17.16.0, same major) which are the pinned tops. | No |
| accessibility-tools: axios, follow-redirects, joi, ip-address, adm-zip 0.6.1 | Transitive. `npm update` in .github/accessibility-tools. If chromedriver pins an old axios, bump @axe-core/cli 4.11.3 to 4.14.0 (minor; pulls chromedriver 152 and axios ^1.19). Keep or tighten the adm-zip override to `^0.6.1`; an override to `^0.6.1` forces the patched release regardless of parent. Do the same for ip-address (override `^10.7.1`) if socks holds it back. | No |
| accessibility-tools: js-yaml, extract-zip | Bump pa11y 9.1.1 to 10.0.0. Pa11y 10 depends on puppeteer ^25.9, which uses @puppeteer/browsers 3.2.1 (dependencies: yargs, modern-tar; no extract-zip) and lilconfig instead of cosmiconfig (no js-yaml). This removes both packages from the tree. | Yes, major. Needs Node 22.13+ or 24. Workflow uses `lts/*`, which should satisfy it; confirm. New Chrome revision may change findings. |
| adm-zip #51 (no fix) | Dismiss as "no fix available / tolerable risk" once the rest are merged, or leave open for the day a patch ships (Dependabot will auto-close it). Reason: archive comes from the vendor ChromeDriver host over HTTPS, runs on an ephemeral runner, no untrusted archive. | n/a |
| extract-zip (#37, #52) | Resolved by the Pa11y 10 bump. If Tim declines the bump, dismiss as "vulnerable code is not used / no fix" with the same reason as above. | n/a |
| root elliptic #1 (no fix) | Dismiss: dev-only, not in dist, no patch. Optional later: drop vite-plugin-node-polyfills if nothing needs the crypto polyfill (separate task, root app change, not in this scope). | n/a |

Not recommended: replacing Pa11y, axe, html-validate or stylelint. None of the alerts justifies it.

I did not change lockfiles or dismiss anything.

## 4. Batching and test plan

One pull request is safe for everything in section 3 except possibly the Pa11y major bump. Recommended split to limit blast radius:

- PR A (safe batch): both tooling lockfiles refreshed with same-major updates, override tweaks for adm-zip and ip-address, @axe-core/cli minor bump if needed. Only the two lockfiles and the two package.json files change.
- PR B (separate, small): pa11y 9.1.1 to 10.0.0. Merge only if Carol's run matches the current verdicts.
- Dismissals (adm-zip #51, elliptic #1, and extract-zip if PR B is declined): after A and B merge, Tim approves, then dismiss with the reasons above.

What Carol must test (on each pull request):
1. Lint workflow: green on the PR. Compare output with main for html-validate, stylelint (html and css rules unchanged; the newer minor versions can add rules, so check for new warnings); `npm ci` in .github/lint-tools succeeds from the new lock.
2. Accessibility workflow: `npm ci` in .github/accessibility-tools; Pa11y (WCAG2AAA) and axe (wcag2a/aa/aaa, wcag22aa/aaa, `--exit`, `--load-delay 1000`, chromedriver and chrome paths from env) both run and produce the same violation set as main. Confirm the flags still exist after the @axe-core/cli bump (`axe --help`), and for Pa11y 10 confirm the `--standard WCAG2AAA` flag and sandboxed Chrome launch in CI.
3. Negative check: temporarily confirm a known violation still fails the job (so a tool upgrade has not silently turned the gate into a pass).
4. Node version: confirm `lts/*` on the runner is 22.13+ for Pa11y 10.
5. After merge: re-pull the alert list and record the new count; expect about 3 residual (adm-zip #51, elliptic #1, plus extract-zip only if PR B is not merged).
6. Not required: Playwright and root unit tests, since no root file changes. Run the normal CI anyway.

## Findings summary
- No exploitable vulnerability for our use. Severity-in-context: low.
- Dependabot severities overstate risk because the tools process only our own inputs in ephemeral CI.
