# Privacy: Image Colour Contrast Checker

This page records the project's privacy posture for maintainers and the team. The user-facing privacy statement is at `privacy.html` in the repository root; that page is what visitors read. This wiki page captures the governance decisions, the analytics setup, and the data-protection analysis.

## Bottom line

ICCC processes no personal data. Images, OCR results, and contrast calculations never leave the user's device. The only outbound network request is an anonymous page-view ping to GoatCounter. No consent banner is required.

## What the application collects

### Image data

Nothing. Images are decoded client-side using `createImageBitmap`, processed entirely in the browser by ONNX Runtime Web and the PaddleOCR model, and never sent to any server. The pixel data, detected text, and contrast results are held in JavaScript memory and are cleared when the user leaves the page or starts a new batch.

### LocalStorage

One value: the colour theme preference (`td-theme`, set to `'light'` or `'dark'`). This is not personal data.

### Analytics

ICCC uses GoatCounter for page-view analytics. ICCC opts out of the team's shared analytics site (`timdixon82.goatcounter.com`) and uses its own dedicated counter.

Analytics site: `iccc.goatcounter.com`

The rationale for a per-project counter: the ICCC dashboard stays focused on ICCC visitor traffic and use, and is not mixed with data from other projects. The `iccc.goatcounter.com` account is linked to the `timdixon82` GoatCounter account. The same Data Processing Agreement (DPA) covers both; no separate DPA is needed. The DPA is held on the `timdixon82` account.

Tim Dixon is the data controller for the analytics relationship. GoatCounter is the data processor.

What GoatCounter records per page view:

- The page path.
- The document title.
- The referrer.
- A coarse browser and screen-size profile.
- An approximation of the visitor's country, derived briefly from the Internet Protocol (IP) address and then discarded. The IP address is not stored.

What GoatCounter does not collect:

- No cookies are set.
- No personal data in the sense of individual profiles is retained.
- No user content (images, OCR results, contrast figures, filenames) is sent.

### Whether a consent banner is required

No. GoatCounter does not use cookies or equivalent tracking mechanisms. The Privacy and Electronic Communications Regulations 2003 (PECR) apply to cookies and similar technologies; they do not require consent here. The transient IP handling is covered by the UK General Data Protection Regulation (UK GDPR) Article 6(1)(f) legitimate interests: Tim has a legitimate interest in understanding how the tool is used, and the processing is minimal, temporary, and does not affect user rights. This analysis is drawn from Jed's security review in `.claude/work/011-iccc-setup/jed-security-review.md`.

## Implementation note

The GoatCounter `count.js` script is self-hosted at `public/analytics/count.js` and served from the project's own origin. It is not loaded from `gc.zgo.at`. The Content Security Policy `script-src` does not allow-list `gc.zgo.at`; only `iccc.goatcounter.com` in `connect-src` is needed for the analytics ping. Update `public/analytics/count.js` on a quarterly cadence by fetching the upstream `https://gc.zgo.at/count.js` and committing any changed version. See ADR 009 for the full analytics decision record.

## References

- ADR 009 at `docs/decisions/009-goatcounter-analytics.md`: the full analytics decision.
- Global GoatCounter analytics pattern at `docs/patterns/goatcounter-analytics.md` (team root).
- Jed's ICCC security review at `.claude/work/011-iccc-setup/jed-security-review.md`, sections 2 and 3.
