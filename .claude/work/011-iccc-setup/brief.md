# Brief: 011-iccc-setup

## Summary

Adopt the Image-Colour-Contrast-Checker repository (`timdixon82/Image-Colour-Contrast-Checker`) as a team project, run the four-agent backfill, then review the open feature branch `claude/vestibular-checker-extension-O5NPm` and prepare it for a merge to `main`. The repository is Tim's priority HANDOFF item and already has its own GoatCounter analytics counter, which the team uses as the implementation model for the wider analytics rollout.

- Status: `active`
- Status note: merge gate prepared; Tim not merging at this time
- Branch: claude/vestibular-checker-extension-O5NPm (PR 7 open)
- Priority: 2
- Blockers: None. Sonja conformance check complete (sonja-conformance-check.md). Awaiting Tim's express merge approval.

The repository is cloned locally at `/Users/timdixon/Library/Mobile Documents/com~apple~CloudDocs/AgentTeam/Inputs/Image-Colour-Contrast-Checker/` (gitignored) so the backfill agents can read it.

## Requirements

No formal requirements exist yet. Tad reverse-engineers them from the codebase and the existing `ARCHITECTURE.md`, `CLAUDE.md`, and `DESIGN_GUIDELINES.md` files in the repository into the project wiki.

## Routing plan

1. Backfill (parallel where the parallel-dispatch rules in Sonja's CORE permit):
   - Tad: business-analysis review (`tad-requirements.md`).
   - Jacob: architecture review (`jacob-architecture-review.md`).
   - Jed: security and privacy review (`jed-security-review.md`).
   - Carol: baseline WCAG 2.2 AAA audit (`carol-baseline-audit.md`).
2. Sonja consolidates, scaffolds the project wiki on the existing feature branch or a new `chore/project-setup` branch, surfaces decisions to Tim.
3. Review the open feature branch `claude/vestibular-checker-extension-O5NPm`: Jacob and Jed in parallel; Carol re-tests; Sonja runs the conformance check.
4. Sonja prepares the merge gate; Sean opens any required pull requests; Sonja merges only on Tim's express approval.

## Out of scope

- The wider analytics rollout. The ICCC GoatCounter setup is studied here as the model, but applying GoatCounter to every project is a separate piece of work.
- Re-writing existing repository content. The team adopts what is there and adds the project wiki and any missing standards alongside.
- Any change to deny-listed actions or to the team safety hook. The hook continues to apply unchanged.

## Risk and rollback

Risk. The open feature branch has no pull request and an unfamiliar provenance (claude branch name suggests an earlier AI session). The team has not reviewed its diff against `main`. Merging without review would be a security risk.

Rollback. The backfill writes only to `.claude/work/011-iccc-setup/` and to `docs/` in the team root. Each review file is independent. A branch revert undoes the backfill commit. The open feature branch is not touched until step 3, after the reviews land and Tim approves the conformance check.

## Definition of done

- [ ] Tad's `tad-requirements.md` exists and covers what the project does, the user, the core flows, and the named requirements.
- [ ] Jacob's `jacob-architecture-review.md` exists and covers the stack, the build setup, the data flow, and the named architecture decisions.
- [ ] Jed's `jed-security-review.md` exists and covers the OWASP Top 10 mapping, the GoatCounter privacy posture, and any UK GDPR considerations.
- [ ] Carol's `carol-baseline-audit.md` exists and covers WCAG 2.2 AAA findings against the current `main` of the repository.
- [ ] The project wiki has been scaffolded in the ICCC repository.
- [ ] The team's `docs/projects.md` entry for Image-Colour-Contrast-Checker has been updated with the stack, hosting, project-wiki link, and current work folder.
- [ ] The open feature branch has been reviewed and a decision on its merge is recorded for Tim.
- [ ] Carol signs off the handoff envelope as `pass`.

## Approved GitHub actions

Per Tim's standing pre-approval of 2026-05-22 and his autonomous-execution window on 2026-05-23, git actions on all repositories may run without pausing. Merges to a main branch always need Tim's express approval given at the time. Publishing always needs Tim's express approval. The hard deny-list in `CLAUDE.md` always applies.

For this brief specifically:

- [x] Create a branch
- [x] Commit to a branch
- [x] Push a branch other than the main branch
- [x] Open a pull request
- [x] Comment on a pull request or an issue
- [x] Create an issue

## Notes

The repository is a Vite-based browser application that already carries `ARCHITECTURE.md`, `CLAUDE.md`, and `DESIGN_GUIDELINES.md`. Tad reads these first to avoid duplicating work that may already be documented.
