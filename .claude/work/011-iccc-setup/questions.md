# Questions: 011-iccc-setup

Questions migrated from outputs/questions.md. Format mirrors the per-folder questions.md contract from tad-requirements.md (work folder 020).

For the global question format rules, see docs/decisions/005-question-format.md.

### Q39: ICCC GoatCounter tracker URL (Jed confirming)

- Status: answered
- Answered: 2026-05-25 -> see answers.md

### Q42 to Q47: Jacob's six architecture questions for ICCC

All six come from Jacob's ICCC architecture review, work folder 011. The headlines:

- **Q42**: Adopt ICCC's GoatCounter pattern as canonical for the team's wider analytics rollout? **Answered Q42A on 2026-05-23: yes, adopt as canonical.** Tim's instruction: "New goatcoubter implementation."
- **Q43**: Self-host GoatCounter `count.js` versus add a Subresource Integrity hash. **Answered Q43A on 2026-05-23: self-host the script.** Tim's instruction: "Self host code." The canonical pattern in `docs/patterns/goatcounter-analytics.md` (to be written) will self-host the script alongside each project's own tracker code (per D13).
- **Q44**: Per-project counters versus a single team-wide counter. Recommendation A — already covered by D13 (per-project, with each project storing its own tracker code). Treating as resolved.
- **Q45**: Write a `models.json` retrospectively for ICCC, or record a project-wiki exception. **Answered Q45A on 2026-05-23: write `models.json` retrospectively.** Overrides Jacob's recommendation B; queued for the ICCC setup build phase.
- **Q46**: Vendored `coi-serviceworker` upstream watch policy. Recommendation A (manual upstream-watch with documented cadence).
- **Q47**: Content Security Policy approach for the ICCC setup build. Recommendation B (permissive starter then tighten).

### Q48: GoatCounter Data Processing Agreement status

- Status: answered
- Asked: 2026-05-23 by Jed in his ICCC security review (work folder 011).
- Answered: 2026-05-25 -> see answers.md

GoatCounter publishes a Data Processing Agreement as part of its standard terms. UK GDPR requires a written processor-controller agreement when a data processor handles data on behalf of a controller, even when the data processed is aggregate and anonymised. Has the GoatCounter DPA been signed or acknowledged for the `iccc.goatcounter.com` account, and does the same agreement cover any new tracker codes the team adds for other projects?

My recommendation: please tell me which of A, B, or C is accurate so Jed can record the answer in the ICCC project wiki and the canonical pattern documentation.

Full options for each are in `.claude/work/011-iccc-setup/jacob-return.md` and were posted to Tim in chat.

