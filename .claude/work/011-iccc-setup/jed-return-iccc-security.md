**Verdict**: pass

**Bottom line**: The security and privacy review of Image-Colour-Contrast-Checker is complete; two findings (one medium, one low) are ready for Sean to fix, and the GoatCounter Data Processing Agreement status has one open question for Tim.

**Blocking issues**:
None.

**Open questions**:
- Q-number unset: GoatCounter Data Processing Agreement status. Has the DPA been signed or acknowledged for the `iccc.goatcounter.com` account? This is a UK GDPR consideration even where the data is aggregate and anonymised.

**Recommended next agent**: Sonja, to consolidate the four backfill returns and scaffold the project wiki.

**Work estimate**: 1 interaction (this dispatch; follow-up for the feature branch is a separate dispatch).

---

# Jed Security Review Return: Image-Colour-Contrast-Checker (intake 011)

Date: 2026-05-23
Dispatch: `jed-return-iccc-security.md` (the parallel embedded-quotes hook fix returns as `jed-return-hook-fixes-and-allowlist.md`)

The full review is at `.claude/work/011-iccc-setup/jed-security-review.md`. This return summarises the key findings and routing decisions for Sonja.

## What was reviewed

Branch `main` of the ICCC repository, cloned at `Inputs/Image-Colour-Contrast-Checker/`. Sources read: `privacy.html`, `index.html`, `package.json`, `vite.config.js`, `scripts/copy-models.mjs`, `public/sw.js`, and all files under `src/` (adapters, core, export, render, ui, main.js, preloader.js). The GitHub Actions workflow at `.github/workflows/deploy.yml` was also read. The feature branch `claude/vestibular-checker-extension-O5NPm` was not reviewed in this dispatch.

## Headline findings

Two findings. No high-severity issues. The codebase is well-structured for a client-side-only application and the privacy claim is accurate.

### Finding 1: No Content Security Policy (medium severity)

OWASP A05. Neither `index.html` nor `privacy.html` has a Content Security Policy. The recommended policy is in the full review. The `connect-src` directive is the most important: it would limit unexpected outbound network calls. `'unsafe-inline'` is required in `script-src` due to the inline theme-detection script; this can be tightened later with a hash or nonce approach.

Sean is the right agent to implement this.

### Finding 2: GoatCounter script without Subresource Integrity hash (low severity)

OWASP A06 and A08. Both HTML files load `//gc.zgo.at/count.js` without a version pin or integrity hash. GoatCounter publishes versioned builds. Pinning and adding a hash resolves this.

Sean is the right agent to implement this.

## GoatCounter and D13 confirmation

D13 is confirmed correct: `iccc.goatcounter.com` is the counter URL in both HTML files, matching the decision record. No action needed.

A UK GDPR consent banner is not required. GoatCounter sets no cookies, stores no IP address, and collects only aggregate anonymised data. PECR does not apply. The lawful basis is Article 6(1)(f) legitimate interests. The privacy statement in `privacy.html` is accurate and sufficient.

One open question on GoatCounter: whether the Data Processing Agreement has been signed or acknowledged for the `iccc.goatcounter.com` account. Batched above for Sonja to allocate a Q-number.

## UK GDPR summary

No personal data is processed by the application. Images are decoded and analysed entirely in the browser. The only localStorage value is the theme preference. No server-side rights-fulfilment surface is needed.

## Feature branch note

The open feature branch `claude/vestibular-checker-extension-O5NPm` is recorded and will be reviewed in a separate follow-up dispatch. It is not checked out and not touched in this dispatch.

## Exceptions

None raised. Both findings are standard recommendations, not formal exceptions requiring Tim's approval.

## Cross-cutting flags for Sonja

Two items flagged for promotion to the global wiki at Sonja's discretion:

1. The vendored-binary pattern (copying ONNX Runtime WASM and model files from `node_modules/` into `public/` at build time, serving from same origin). Jacob also flagged this; this review supports the promotion.
2. The `escapeHtml` helper in `src/ui/report-view.js` as the reference implementation for inline HTML escaping in vanilla JavaScript projects. Worth adding to the coding-standards page.
