# Carol test report: PR 77 (chore/tooling-security-refresh)

Verdict: PASS WITH NOTES.

## Results
- gh pr checks 77: all 7 pass (Pa11y and axe at WCAG 2.2 AAA, Playwright tests, build, dependency-review, lint, semgrep, trivy).
- Pa11y and axe job on PR 77: Pa11y "No issues found!", axe-core 4.11.4 "0 violations found!", run with --exit and tags wcag2a to wcag22aaa and --load-delay 1000. Compared with the same job on PR 78 (main's tooling) and PR chore/pa11y-10: identical results and the same axe-core version, no new or missing violations. Gate still strict: the workflow file is untouched by this PR and the --exit flag and AAA tags are present.
- No Accessibility workflow run exists on the main branch itself (the workflow runs on pull requests), so the comparison baseline is the other open PRs on main-based tooling.
- Dist unchanged: built PR branch and main (e66143e) with vite to separate output dirs; `diff -rq` reports them identical.
- Images added to any commit: none.

## Notes
- Described as lockfile-only, but .github/accessibility-tools/package.json also changed: the adm-zip override went from ^0.6.0 to ^0.6.1. Files changed: accessibility-tools package-lock.json and package.json, lint-tools package-lock.json. Low risk, but the description should say so.
- Large lockfile movement in accessibility-tools (for example puppeteer-core 25.9.1 to 26.6.5 and a Chromium-related 149 to 156 bump); CI exercised it successfully on one page (index.html) only.
- PR base is ef2fc2a, one commit behind main (e66143e, a work-folder commit only), so no conflict risk in the tooling files.

## PR 79 note (chore/pa11y-10, checked 2026-10-25)
- gh pr checks 79: all 7 pass (Pa11y and axe at WCAG 2.2 AAA, Playwright tests, build, dependency-review, lint, semgrep, trivy).
- Change: .github/accessibility-tools/package.json pa11y 9.1.1 to 10.0.0 plus lockfile.
- Pa11y and axe job output matches PR 77 and PR 78: Pa11y "No issues found!", axe-core "0 violations found!" on index.html with the same tags and 1000 ms load delay.
- Images added to any commit: none.
