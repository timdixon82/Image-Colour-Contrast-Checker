# Sean return: feature-branch edits for ICCC (intake 011)

## Handoff envelope

Agent: Sean
Work folder: 011-iccc-setup
Branch: claude/vestibular-checker-extension-O5NPm
Date: 2026-05-23
Status: edits complete, build passes, BLOCKED on commit and push

Recommended next agent: Sonja (safety-hook gap — see blocker section below), then re-dispatch Sean to commit and push once the hook is fixed.

---

## Summary

All four edits are applied and verified. The production build passes. The commit and push are blocked by a gap in the safety-hook dictionary: the pattern for "commit to a branch" matches `git commit` but not `git -C <path> commit`, which is the required form when working outside the team root. Sonja needs to fix the hook before the branch can be pushed. No code change is needed on my part; the edits are sitting as uncommitted working-tree changes in the ICCC clone.

---

## Edits applied

### 1. Vestibular saturation thresholds: provenance comment in `src/core/perceptual.js`

A nine-line comment block was added to the module header, below the existing bullet list and above the `@module` tag. The block states:

- The 60 percent and 80 percent bands are the project's in-house heuristic.
- WCAG Success Criteria 2.3.1 and 2.3.3 address motion and flicker, not still-image saturation.
- The accessibility literature treats vestibular trigger thresholds qualitatively, not numerically.
- No peer-reviewed publication pins a specific HSL saturation cut-off.
- Reviewers should treat the bands as a starting heuristic and adjust them as evidence improves.

This is Jacob's most important pre-merge edit, applied verbatim in spirit. The wording is mine, based on Jacob's two recommended sentences in his review.

### 2. Vestibular saturation thresholds: provenance note in `index.html`

A third paragraph was added inside `<details id="check-info-vestibular">`. It reads:

"The 60% and 80% cut-offs are this project's in-house heuristic. The Web Content Accessibility Guidelines (WCAG) do not define a saturation threshold, and the wider accessibility literature treats vestibular trigger thresholds qualitatively rather than numerically. These bands are a team-set rule, not a WCAG requirement."

End-readers opening the glossary now see the same provenance the code records.

### 3. Cognitive cascade message softened in `src/core/perceptual.js`

The message returned when `maxSat >= 80` in `cognitiveResult` was changed from:

"High saturation can cause sensory overload."

to:

"High saturation can feel uncomfortable for sensitive viewers."

This is Jacob's edit 3, applied verbatim. The softer wording matches the heuristic framing: the band is a project rule, not a clinical finding.

### 4. HARSH bug fix in `src/core/analyse.js`

A `p.cognitive.status === 'HARSH'` condition was added to the WARN branch of `overallVerdict`. The full revised condition is:

```
if (p.apca.status === 'WARN' || p.vestibular.status === 'WARN' || p.cognitive.status === 'WARN' || p.cognitive.status === 'HARSH' || p.cvdRisk)
  return 'WARN';
```

A three-line comment above the condition explains the rationale: HARSH is not a FAIL but it is worth a review, so it raises the verdict to WARN here to match the warning severity assigned by `advancedStatus` in `checks.js`, keeping the top-level `overall` field consistent with the detail panel.

This fixes the inconsistency Jed flagged: previously a HARSH cognitive result left the `overall` field as PASS while the detail panel showed it as a warning-severity event.

### 5. Version bump

`package.json` version was bumped from `0.2.20` to `0.2.21`. `CLAUDE.md` in the ICCC repository was updated to record `0.2.21` as the current version. Both changes are required by the project's ADR 0005 manual-version-bump rule.

---

## Test suite

No test suite (`npm test`) exists in the repository. The `scripts` block in `package.json` contains only `dev`, `build`, `preview`, `postinstall`, `predev`, and `prebuild`. Jacob's review noted the absence and recommended adding a `vitest` suite for `core/perceptual.js` in the setup build. That is out of scope here.

---

## Build result

`npm run build` completed successfully after `npm install` (dependencies were not installed in the clone).

Output summary (Vite 5.4.21, production build):

- `dist/index.html`: 13.37 kB (gzip 4.67 kB)
- `dist/privacy.html`: 6.86 kB (gzip 2.61 kB)
- `dist/assets/main-*.js`: 42.83 kB (gzip 15.38 kB)
- All other assets built cleanly.
- Build time: 4.91 seconds.
- Warnings: three "can't be bundled without type=module" notices (count.js, sw.js) and three "Module externalized for browser compatibility" notices (opencv.js Node built-ins). All pre-existing and unrelated to this edit.

---

## Accessibility regression suite

The suite script at `scripts/accessibility-regression.sh` was invoked with the `static-front-end` argument. The script started (S-03 header printed) then exited with code 2 due to a pre-existing Bash 3.2 compatibility bug.

The failure is on line 102 of the script: `printf '-------------------------------------------\n'`. On macOS, which ships Bash 3.2, some `printf` implementations treat a leading dash in the format string as a flag attempt. The script uses `set -euo pipefail`, so it exits immediately on the `printf` failure before any check runs.

This bug is in the team-root script, not in the ICCC code. My edits did not introduce it. The script presumably worked when written (it may have been tested on a system with a newer `printf` or a different `printf` implementation). The fix is to change `printf '---...\n'` to `printf '%s\n' '---...'` at each such line, or to use `echo` instead.

Because the script cannot complete, I have no automated pass or fail count to report for S-03 through S-11. Manual review of the build output indicates the changes are confined to JavaScript logic and two HTML additions (one glossary paragraph and a code comment). No ARIA roles, landmark structure, focus indicators, or form inputs were changed. The regression risk is low.

I am flagging the script bug to Sonja for a follow-up dispatch.

---

## Blocker: safety hook does not cover `git -C <path> commit`

### What happened

The brief for work folder 011 pre-approves "Commit to a branch" and "Push a branch other than the main branch". The safety hook at `.claude/hooks/pre-tool-use.sh` reads the current brief and grants those actions. However:

- The hook's dictionary entry for "commit to a branch" matches the regex `(^| )git commit( |$)`.
- CLAUDE.md requires using `git -C "/absolute/path" <subcommand>` for git operations.
- The command `git -C "/Users/.../Image-Colour-Contrast-Checker" commit -am "..."` does not contain the substring `git commit`; it contains `git -C "..." commit`.
- The pattern therefore does not match, and the hook falls through to the normal permission prompt, which denies the command.

The same mismatch affects `git -C <path> add` (no dictionary entry at all) and `git -C <path> push` (pat[2] matches `(^| )git push( |$)`, which also doesn't match the `-C` form).

The current work folder was also pointing to `004-clock-practice-setup` at the start of this session (`.claude/work/.current`). I updated it to `011-iccc-setup` before attempting the commit. The 004 brief also has "Commit to a branch" ticked, but the same pattern mismatch applies.

### What Sonja needs to do

Option 1 (recommended): Update `pat[1]` and `pat[2]` in the hook to also match the `git -C <path>` form. For example, change pat[1] from `'(^| )git commit( |$)'` to `'(^| )git( -C [^ ]+)? commit( |$)'` and pat[2] from `'(^| )git push( |$)'` to `'(^| )git( -C [^ ]+)? push( |$)'`. This is the correct long-term fix because CLAUDE.md requires the `-C` form and the hook should honour the brief's pre-approvals for both forms.

Option 2: Add explicit entries to the `settings.json` allowlist:
- `Bash(git -C * commit *)`
- `Bash(git -C * add *)`
- `Bash(git -C * push *)`

Either option unblocks Sean immediately.

### State of the ICCC clone

All four edits are present as unstaged working-tree changes in the ICCC clone at:

`/Users/timdixon/Library/Mobile Documents/com~apple~CloudDocs/AgentTeam/Inputs/Image-Colour-Contrast-Checker/`

Files changed:
- `CLAUDE.md` (version bump to 0.2.21)
- `index.html` (vestibular provenance paragraph added)
- `package-lock.json` (version bump artefact from npm install)
- `package.json` (version bump to 0.2.21)
- `src/core/analyse.js` (HARSH fix in overallVerdict)
- `src/core/perceptual.js` (provenance comment, softened message)

Once the hook is fixed, Sean can commit and push with a single `git -C <path> commit -am "..."` and `git -C <path> push origin claude/vestibular-checker-extension-O5NPm`.

---

## Commit SHA

Not yet available. The commit is blocked. SHA will be provided in Sean's follow-up return after the hook is fixed and the push lands.

---

## Tim's thanks

Tim's thanks for the dashboard rework (443 ms median) are noted with appreciation. The fix that got us there — replacing per-line `sed` and `printf` forks with Bash parameter expansion and merged `awk` passes — is a pattern worth carrying to the global wiki if a second Bash-rendered HTML script arrives. Flagged for Sonja.

---

## Hook dictionary gap: flag for Sonja

This is a cross-cutting finding. The hook's pre-approval patterns were written for the simple `git <subcommand>` form. CLAUDE.md requires `git -C <path> <subcommand>`. Both patterns need to be extended to match the `-C` form, or all future cross-repo dispatch work will hit the same blocker. Jed is the right agent to draft the fix, since the hook is in his domain (security governance). Sean flags it; Sonja routes it.
