# Project Log: Image Colour Contrast Checker

This log is chronological and append-only. Each entry starts with a heading in the form `## [YYYY-MM-DD] <operation> | <subject>`.

## [2026-05-23] open | Project wiki scaffolded

Tad scaffolded the ICCC project wiki on branch `chore/project-setup` from `main`. Work folder 011 in the team root (`AgentTeam/.claude/work/011-iccc-setup/`) holds the supporting reviews: Tad's business-analysis requirements, Jacob's architecture review, Jed's security review, and the brief. The wiki is based on those reviews plus the existing repository documents (`ARCHITECTURE.md`, `CLAUDE.md`, `DESIGN_GUIDELINES.md`).

Files created in this session:

- `docs/decisions/001` through `003`: existing ADRs, staged from the untracked working tree.
- `docs/decisions/004` through `009`: six new ADRs written from Jacob's architecture review.
- `docs/index.md`: the project wiki index.
- `docs/log.md`: this file.
- `docs/glossary.md`: project terms.
- `docs/coding-standards.md`: project-specific standards and gaps.
- `docs/accessibility.md`: project accessibility posture.
- `docs/release-process.md`: branching, pull requests, and merge gate.
- `docs/privacy.md`: GoatCounter posture and data-protection analysis.
- `docs/exceptions/github-pages-headers.md`: standing-exception pointer.
- `docs/patterns/cross-origin-isolation-service-worker.md`: project-level pattern.
- `docs/stacks/browser-ai-application.md`: project-level stack note.
- `todo.md`: setup-build items for Sean.

## [2026-11-08] decision | npm tool folders moved to ci-tools

Moved `.github/lint-tools` and `.github/accessibility-tools` to `ci-tools/lint-tools` and `ci-tools/accessibility-tools`, because Dependabot cannot open npm update pull requests for folders under the root `.github` folder (error `dependency_file_not_supported`). The two npm entries in `.github/dependabot.yml` now point at the new folders, `lint.yml` and `accessibility.yml` were refreshed from the template, and `docs/accessibility.md` names the new path. Earlier work-folder notes under `.claude/work` keep the old path as history. The deploy workflow uses an allowlist, so `ci-tools` is not published.
