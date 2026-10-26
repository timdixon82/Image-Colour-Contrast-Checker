# Carol re-test report: 020 swatch multi-region boxes (PR 75, commit fe314cb)

Verdict: **PASS WITH NOTES**

The two failures in my first report are gone. On all 162 fixture variants the branch now matches main, except one variant where the branch is better. It never creates a new two-backgrounds-no-text pair and never hides lower-contrast real text. On Tim's three images, 84 variants, the branch is better than or equal to main in every case. On the six new poster images and the new full screenshot, the branch is equal to main except for two small differences, and neither is a regression. Both builds still report a non-text pair for the "24.69% / 63.33 kWh" box at about 0.75 to 0.8 scale. That is not a regression and not in scope, but Tim should know (see Notes).

## Method

- Main: worktree `main-060` (0.6.0, e27d51e), unchanged. Branch: worktree `swatch-multi`, confirmed at fe314cb, rebuilt with `npm run build`.
- Both `dist` folders were served by a plain Node static server (not vite preview). Real Chrome driven from Playwright. `crossOriginIsolated` true, real PaddleOCR through `#file-input`. The pair is read from each report row (swatch background/foreground and the WCAG AA ratio).
- Scripts and raw results are in the scratchpad folder `/private/tmp/claude-501/-Users-timdixon-Code-Github-Image-Colour-Contrast-Checker/a3aa06bc-59ce-4f35-9ca0-069af5a6c215/scratchpad/`. Results: `res-mainRsweep2.json`, `res-branchRsweep2.json`, `res-mainRtimset.json`, `res-branchRtimset.json`, `res-mainRnewset.json`, `res-branchRnewset.json`. Comparisons: `cmpR.txt`, `cmp_timset.txt`, `cmp_newset.txt`.

## 1. 162-variant 019 sweep (offsets and 1x to 3x)

- 162 variants run on each build. 0 timeouts.
- 161 identical to main (including the 7 variants that report no text on both).
- 1 different, and it is an improvement: `btn2026_k2.5_c5-0`.
  - Main: `#828387` on `#2F3239`, 3.39. This is the grey chevron against the button, not text.
  - Branch: `#F0F0F1` on `#47494F`, 7.90. This is the real "2026 Lifet..." text.
- Compared with the first report (24 changed variants, 9 non-text and 4 hiding real text), all of those are now identical to main. The mwh762, mwh_kwh, batte154 and kwh_grid regressions are fixed.
- New two-backgrounds-no-text pairs: 0. Hidden lower-contrast text: 0.

## 2. Tim's cases (main versus branch)

I ran 84 variants: `tim-screenshot-3`, `tim-screenshot-4` and `tim-full-screenshot-5` (the work-folder images) at scales 0.6, 0.8, 1, 1.5, 2, 2.5 and 3, each with 4 crop offsets (0-0, 5-0, 0-3, 9-4). 0 timeouts.

- Branch identical to main: 79 of 84 variants. Different: 5, all of them improvements or neutral (below).
- `tim-screenshot-3` (button crop): all 28 identical. The pair is white text on the outline-tinted dark grey, ratio 6.55 to 8.58 (for example 1x: `#F1F0F0` on `#624045`, 7.89). The outline tints the background, but the pair is the same on both builds and is text.
- `tim-screenshot-4` (card crop): all 28 identical. It reports text pairs only (for example 1x `#684168` on `#858DF0`, 2.78, and 2x `#303666` on `#5450AC`, 1.69). The foreground is tinted by Tim's red outline, the same on both builds.
- `tim-full-screenshot-5`, 2026 button: the branch fixes two variants where main reports the chevron.

| variant | main | branch |
|---|---|---|
| k0.6 c0-0 | `#68696D` on `#2F3239`, 2.34 (chevron, not text) | `#D9D9DB` on `#4F5159`, 5.61 (real text) |
| k2.5 c0-0 | `#76777B` on `#2F3239`, 2.87 (chevron, not text) | `#E4E5E6` on `#51535B`, 6.08 (real text) |

- `tim-full-screenshot-5`, 24.69% / 63.33 kWh card. At 1x, 1.5x, 2x, 2.5x and 3x the two builds are identical and report the real navy-on-indigo pair, 1.50 to 1.69. Examples: 1.5x `#32386E` on `#4E51B2` 1.63 and 2.5x `#343B73` on `#4E52B3` 1.58. The case-2 fix from the first round still holds. The two exceptions at 0.8x are in Notes.
- `tim-full-screenshot-5`, "Home Device Service Setting" nav row, 3 variants at 0.8x. Main reports 3.92 and 4.75 and the branch 5.03 to 5.05, a rise of 0.3 to 1.1. I sampled the real nav text in the original image: "Home" `#73C9C0` and the others `#ABACB0`, all on `#2E3138`, ratio 6.73 and 5.74. So the branch's value is closer to the truth and no real low-contrast text is hidden. Main's lower value was a boundary strip. I record this as a small difference, not a regression.

## 3. New local images (tim-image-5 to tim-image-11)

Run through the real app at 1x, 1x with a 5 px and 3 px crop, and scales 0.5, 0.75 and 1.5 (tim-image-5: 1, 1.5, 2, 0.75, crop). 35 files per build. The images were read from `/Users/timdixon/Code/local-test-images/image-colour-contrast-checker/` and scaled copies were written only to the scratchpad. Nothing was copied into any git repository or worktree.

Result: 33 of 35 identical on main and branch. 2 differ. No file reports non-text colours at 1x. The pairs below are the 1x values, identical on both builds; ratios are WCAG AA.

| image | pairs reported (fg on bg, ratio) | judgement |
|---|---|---|
| tim-image-5 (full app screenshot, same as tim-full-screenshot-5) | "24.69% 63.33 kWh" `#373B59` on `#4E52B3` 1.65; BATTE/762.03/64.17% `#3F3668` on `#8B56DD` 2.31; GRID `#A5AAF3` on `#5F67A6` 2.42; 1.05/800.39 `#304658` on `#598B8F` 2.57; others 3.22 to 7.25 | all real text on its own local background |
| tim-image-6 | "not all paths" `#F8FDFC` on `#63989C` 3.14; "rome" `#F5FCFC` on `#298690` 4.12; "lead to" `#7B6C6B` on `#F6F3F0` 4.52; "where you find intertek" `#EDC52A` on `#0F2534` 9.46; "you'll be amazed" `#F3F8FA` on `#0C2640` 14.35 | real text on photo or navy panel. "lead to" sits over the hand and rocks; the pair is a skin tone against white, so it is text on its local background but its ratio is only approximate. |
| tim-image-7 | "find intertek" `#F1C626` on `#83817F` 2.37; "the storm" `#6B8042` on `#D7C987` 2.63; "powering through" `#F6F8F9` on `#7A8A92` 3.35; "where you" `#F8FAF4` on `#6D6E61` 4.93; "you'll be amazed" `#FAF9EF` on `#69612B` 5.94 | real text (yellow on grey window and foliage) |
| tim-image-8 | "find intertek" `#E9C828` on `#65A7BF` 1.63; "you'll be amazed where you" `#ECFAFC` on `#5DABD9` 2.37; "have a handoff" `#F1C81A` on `#0E72C9` 3.05; "houston we problem" `#E8F5F8` on `#097CDF` 3.80 | real text on sky |
| tim-image-9 | "CTLE-00" `#868487` on `#D2D0D3` 2.42 (sticker); "Flow" `#838282` on `#292828` 3.84; "Evaluate enclosure / resistance against rain" `#152B41` on `#A2A3A1` 5.70; "and water spray conditions" 7.52; "Learn More" `#432E0C` on `#FAC60B` 8.04; "Oscillating Tube Test System" `#EAC123` on `#1A2B2D` 8.51 | real text. The sticker labels are real small text. |
| tim-image-10 | "Avoid common" `#FAFCFC` on `#687A79` 4.39; "OTC labeling" `#F6C717` on `#4E564F` 4.73; "Learn more" 6.43; "assuris pitfalls" 11.41; "Identify compliance gaps" 13.36; intertek/footer text 14.38 | real text |
| tim-image-11 | "inform / HVAC Practitioners Set" `#FDFDF9` on `#D8D0BE` 1.50; "ntertek / Faster to Market" `#4A4339` on `#CCC4B2` 5.62; "Learn More" `#0B262F` on `#26B2D1` 6.28; "The coolest thing in your toolkit" `#211E1B` on `#CDC4AF` 9.56 | real text. White heading on the beige wall at 1.50 is the correct worst pair. |

The two differences are:

- `tim-image-9_k1_c5-3` (cropped 5 px and 3 px): "Flow" main 4.69 (`#9A9691` on `#2D2D2C`), branch 4.92 (`#9B9890` on `#2B2B2A`). Small increase, same text and same local background. Not a regression.
- `tim-image-5_k0.75` (the full screenshot at 0.75x): the 24.69% card. Main reports `#48557A` on `#3A3D47`, 1.47. The branch reports `#7A7FD6` on `#3D415C`, 2.77. See Notes. Same "Home Device Service Setting" improvement as in section 2 (4.75 to 4.98).

Where either build reports non-text colours in these images: only at 0.75x for tim-image-5, on both builds. No other image or scale produced a pair I would call non-text.

## Notes (not blocking)

1. **Not fixed on either build: the 24.69% / 63.33 kWh box at about 0.75 to 0.8x.** At 0.8x on `tim-full-screenshot-5` (c0-0, c0-3, c5-0) and at 0.75x on `tim-image-5`, both main and branch report about 2.77 to 2.85 with `#7B7FD8` on `#3E415E`. By its colours that is the periwinkle card against the dark gap, not text. At that scale the real navy-on-indigo 1.6 pair is never reported. At 0.8x c9-4 main reports 1.50 (ribbon against gap, non-text) and the branch reports 2.88 (`#7B81DA` on `#3D405A`, also non-text). Both are non-text, and the branch's number is higher, so this is not "hiding lower-contrast text" that main found. It is not a regression in kind, but in the strict sense it is a variant where the branch's reported ratio is 1.4 higher than main. It is the same family as Tim's case 2 and applies only at sub-1x scale. It would be fixed by whichever change stops a card colour being paired with the gap in very wide boxes. I did not hold the verdict for it.
2. `kwh_grid` at 2x (first report, "not fixed on either build") is no longer different between the builds. I did not re-investigate the shared 1.73 result in this round, since the sweep matches main.
3. A grey chevron may need its own 3:1 non-text contrast under WCAG 1.4.11. Sean noted this already; it is a question for Tim, not a defect in this diff.

## 4. Function and accessibility

- `npm test` on the branch: 10 files, 177 tests passed (first report: 9 files, 167). Main has 159. The test count has gone up, not down.
- `npm run lint` (css, js, html): passes, exit 0.
- `npm run build`: passes (only the existing chunk-size warning).
- axe-core (wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, wcag2aaa and best-practice) on the branch, report page with a row expanded, all four themes: light, dark, muted-light and muted-dark each report **no violations**. The theme attribute was confirmed after each switch.
- The console shows the same CSP block on a `data:` WASM fetch, then the ort wasm fallback and a working OCR run. It also appears on main and is not in this diff.
- No UI change in the diff, so no new manual VoiceOver, JAWS or NVDA surface. No specialist dispatch recommended.
- No Tad or Simon draft, so the citation check does not apply.

## Images in commits or pull requests

None added. `gh pr view 75` lists these PNG files: `btn2026.png`, `btn2026_full.png`, `pct2469b.png` and `pct2469b_full.png` in `src/core/__fixtures__/`. They are the test fixtures I reviewed in the first round, cropped from Tim's work-folder screenshots. None of them matches any of the seven local `tim-image-*.png` files (checked by hash), and no `tim-image` file is in the PR diff. The report does not embed any image. The one mention in the repository is a line in `.claude/work/020-iccc-swatch-multi-region-boxes/log.md` on main, which records the local-only folder path; it adds no image. I wrote no image to the repository or either worktree, and I did not mention the local images in any GitHub text.

## Recommendation to Sonja

Ready to take to the merge gate. I recommend telling Tim about note 1 (0.75 to 0.8x scale) before merge, since it is the same kind of symptom as his case 2, but at a smaller screenshot scale, and it is identical on main. No rework needed from Sean for this PR.
