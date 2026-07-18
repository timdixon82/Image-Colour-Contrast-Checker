# Log: 016-iccc-template-sync-security

- 2026-07-18: Sonja ran `scripts/sync-from-template.sh` on Tim's confirmation. Template version 1.6.3 → 1.7.0. Changed: `.github/workflows/accessibility.yml`, `ci.yml`, `codeql.yml`, `deploy.yml`, `lint.yml`, `security.yml` (new: `playwright.yml`), `.claude/template-version`. PROJECT OVERLAY and docs wiki untouched. Parity self-test passed.
- 2026-07-18: Sonja checked GitHub security surfaces: 6 open Dependabot alerts (1 critical: vitest; 2 high: adm-zip, vite; 1 medium: vite/launch-editor; 2 low: esbuild, elliptic). No open code-scanning or secret-scanning alerts.
- 2026-07-18: Sonja checked Dependabot alerts across Tim's other repos for `adm-zip` specifically — open in at least 18 repos, traced to `chromedriver` inside the shared `.github/accessibility-tools` scaffold that ships from the team template. This is out of scope for a single-project session; flagged to Tim as a template-level fix.
- 2026-07-18: Work folder opened, brief readiness sections filled. Dispatching Sean to fix dependencies and review workflows; Jed to review security-sensitive changes (escalated per conformance check); Carol to test.
- 2026-07-18: Sean created branch `chore/template-sync-and-security` off main.
- 2026-07-18: Sean reviewed all seven synced workflow files (accessibility.yml, ci.yml, codeql.yml, deploy.yml, lint.yml, security.yml, playwright.yml) for YAML validity and stack fit. Confirmed valid YAML, no leftover placeholder tokens, and correct archetype branches for this repo (npm/Vite, public repo with dist/ build output — BUNDLED deploy job, CodeQL and dependency-review kept, Playwright scaffold correctly left commented out since no Playwright tests exist yet). No defects found; committed as-is (a8cf359).
- 2026-07-18: Sean ran `npm audit fix` (non-force) at repo root. Before: 1 critical (vitest), 2 high (adm-zip N/A here — root manifest, vite), 1 moderate (vite/launch-editor), 6 low = 11 total (npm audit metadata: critical 1, high 2, moderate 1, low 7). After: critical 0, high 0, moderate 0, low 6. Bumps: vite 8.0.14 → 8.1.5, vitest 3.2.4 → 3.2.7, esbuild 0.27.7 → 0.28.1 (transitive). Remaining 6 low findings all trace to `elliptic` via `vite-plugin-node-polyfills`; only fix path is `--force` (breaking downgrade of vite-plugin-node-polyfills), left as out of scope per brief. Bumped `package.json` to 0.4.22 (patch, maintenance/security). Committed (7cd0b5a).
- 2026-07-18: Sean fixed the adm-zip alert (GHSA-xcpc-8h2w-3j85, high) in `.github/accessibility-tools`. Added `"overrides": {"adm-zip": "^0.6.0"}` to `.github/accessibility-tools/package.json`, ran `npm install` there. Verified `npm ls adm-zip` shows `0.6.0 overridden` and `npm ls chromedriver` still resolves cleanly at 149.0.1; `npm audit` in that directory reports 0 vulnerabilities. Committed (33fc28b).
- 2026-07-18: Sean ran `npm run build` and `npm run test` at repo root — both passed (6 tests, 2 test files, no failures; build produced dist/ with only pre-existing warnings, no new ones).
- 2026-07-18: Sean pushed branch and opened PR (see PR URL below). Handing off to Jed for security review per the routing plan.
- [2026-07-18 14:13:32] subagent completed
- [2026-07-18 14:14:04] subagent completed
- [2026-07-18 14:14:36] subagent completed
- [2026-07-18 14:15:09] subagent completed
- [2026-07-18 14:15:41] subagent completed
- [2026-07-18 14:16:13] subagent completed
