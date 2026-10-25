# Brief: 018-iccc-dependency-updates

## Summary

Update outdated dependencies. Triage type: bug fix / chore. Current findings from `npm outdated`:

- Safe patch or minor: `@gutenye/ocr-browser` 1.4.8 to 1.4.9, `eslint` 10.7.0 to 10.13.0, `globals` 17.7.0 to 17.13.0, `pdfmake` 0.3.11 to 0.3.12, `stylelint` 17.14.0 to 17.16.0, `vite` 8.1.4 to 8.3.5, `vitest` 4.1.10 to 4.1.12.
- Needs care: `onnxruntime-web` 1.27.0 to 1.30.0 (OCR runtime; affects WASM files and the `MODEL_CACHE` name in `public/sw.js`).
- Major: `vitest` 5.0.5 and `pdfkit` 0.20.2 (latest). Not wanted by the declared ranges.

Preamble fields:

- Status: `active`
- Branch: `chore/dependency-updates`
- Mockup mode: not applicable
- Priority: 2
- Blockers: None

## Requirements

Update within declared ranges, run `npm audit`, lint, tests and build. For `onnxruntime-web`, check whether vendored runtime files or the service worker cache need a bump, and test OCR end to end in a browser.

## Routing plan

Sean updates on a branch. Jed reviews audit results and the runtime change. Carol tests OCR, report, PDF and Markdown export. Sonja reviews and takes it to Tim.

## Out of scope

- Major version upgrades unless Tim approves.
- `npm audit fix --force`.

## Risk and rollback

Risk: a toolchain or OCR runtime change breaks the build or text detection without CI noticing. Rollback: revert the merge commit; split `onnxruntime-web` into its own pull request so it can be reverted alone.

## Definition of done

- [ ] Agreed packages updated, lockfile committed
- [ ] `npm audit` shows no new high or critical issues
- [ ] Lint, tests, build and CI green
- [ ] Carol confirms OCR and exports still work
- [ ] Tim approves the merge

## Approved GitHub actions

- [x] Create a branch
- [x] Commit to a branch
- [x] Push a branch other than the main branch
- [x] Open a pull request
- [x] Comment on a pull request or an issue
- [x] Create an issue

## Not pre-approved

- Merging to the main branch. This always needs Tim's express approval at the time.
