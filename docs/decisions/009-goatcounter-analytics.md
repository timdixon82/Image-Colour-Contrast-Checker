# ADR 009: GoatCounter analytics on a per-project counter, self-hosted script

Status: accepted; supply-chain work (self-hosting `count.js`) required in the setup build (backfilled 2026-05-23).

## Context

ICCC includes a single third-party analytics integration in production: a GoatCounter snippet at the foot of `index.html` and `privacy.html`. GoatCounter is an open-source, privacy-friendly analytics service that counts page views without setting cookies, without cross-site tracking, and without persisting the visitor's Internet Protocol (IP) address. The privacy statement at `privacy.html` describes this accurately. The team's wider analytics rollout across all projects uses ICCC as the model.

ICCC opts out of the team's default shared analytics site (`timdixon82.goatcounter.com`). ICCC uses its own dedicated counter at `iccc.goatcounter.com`. The rationale is that the ICCC dashboard stays focused on ICCC visitor traffic and is not mixed with data from other projects. The `iccc.goatcounter.com` account is linked to the `timdixon82` GoatCounter account, so the same Data Processing Agreement (DPA) covers both. No separate DPA is needed.

Tim's sign-off on the GoatCounter integration is recorded at Q56 (2026-05-23).

## Decision

Run a per-project GoatCounter counter at `iccc.goatcounter.com`. Self-host `count.js` from the application's own origin (in `assets/analytics/count.js` or equivalent), not loaded from `gc.zgo.at`. Update `count.js` on a quarterly cadence by checking the upstream `https://gc.zgo.at/count.js` and committing any changed version. The snippet in `index.html` and `privacy.html` uses the local path; no `crossorigin` or `integrity` attributes are needed for a same-origin script.

Describe the analytics clearly in the privacy statement: GoatCounter is named, the fields recorded are listed (page path, referrer, coarse browser and screen-size profile, approximate country derived briefly from the IP address), no cookies are set, the IP address is used transiently and not stored, and the DPA is on the `timdixon82` account which covers the linked `iccc.goatcounter.com` account.

## Alternatives considered

- No analytics. The Browser AI Application stack page records this as the default position; ICCC is a deliberate exception with Tim's explicit sign-off.
- Load `count.js` from `gc.zgo.at` with a Subresource Integrity hash. Considered; self-hosting is preferred because it eliminates the third-party script dependency entirely and requires no hash maintenance. This was confirmed as the team default in the global GoatCounter analytics pattern.
- Cloud analytics with cookies and personal data (Google Analytics, Plausible without privacy mode). Rejected: breaks the privacy-by-design posture of the application.

## Consequences

The team has a small, accurate, anonymous page-view count for ICCC. Self-hosting removes the runtime dependency on `gc.zgo.at` and the associated supply-chain risk. The cost is a quarterly manual check and commit when upstream `count.js` changes. The Content Security Policy (once added by Sean in the setup build) does not need to allow-list `gc.zgo.at` in `script-src`; it does need to allow-list `iccc.goatcounter.com` in `connect-src` for the analytics ping.

This ADR is the project-level instance of the global pattern at `docs/patterns/goatcounter-analytics.md`. The opt-out from the team default counter is the one point where ICCC diverges from the canonical pattern.
