# VADChecker audit of every colour pair (release-fixes3, head 67c55fc)

Date: 2026-10-25. Tester: Carol. Nothing committed, merged or pushed. The worktree was not modified (built from a copy in the session scratchpad).

## Verdict

Not a clean pass against VADChecker. WCAG AAA 7:1 holds for every text pair we use, except three incidental misses listed in section 7. Against VADChecker:

- Muted Light: 15 of 15 text pairs SAFE on Vestibular Strain. No fails of any kind. Cognitive is SAFE or NEUTRAL only.
- Muted Dark: 17 of 17 SAFE on Vestibular Strain. Cognitive 16 SAFE, 1 NEUTRAL. Cleanest theme.
- Light: 4 of 15 WARN on Vestibular Strain (all on accent or warn fills). 3 are cognitive HARSH.
- Dark: 10 of 16 WARN on Vestibular Strain. The page backgrounds themselves are WARN. 3 are cognitive HARSH.
- Nothing reaches VADChecker's Vestibular "HIGH", and no used text pair fails its APCA check (Lc under 45).

Most of the Dark theme problem is fixable with two background token tweaks (section 4). Light needs three small tweaks plus a design decision on the navy button.

## 1. What VADChecker reports (learned from the live page)

Exact labels on https://vadchecker.com/tool/?txt=HEX&bg=HEX (no # in the URL):

- WCAG 2.2 Contrast Ratio, e.g. "11.51:1".
- WCAG AA: PASS or FAIL (4.5:1).
- WCAG AAA: PASS or FAIL (7:1).
- APCA Engine: "Lc nn". Under 45 is "Too hard to read." (FAIL). Over 105 is "Too bright. Might vibrate." (HIGH VIBRATION). Otherwise "Perfect for reading."
- Vestibular Strain: SAFE, WARN or HIGH, with "Saturation: nn%". It measures the BACKGROUND colour only (HSL saturation). 60% and over is WARN. 80% and over is HIGH.
- Cognitive Evaluation: SAFE, NEUTRAL or HARSH, with a sentence. HARSH if AA fails, or background saturation 80% or more, or Lc over 105, or (saturation over 65% and ratio over 10), or ratio over 18. NEUTRAL if saturation 60% or more, or Lc over 90, or ratio over 12. Otherwise SAFE.
- No flicker, red-flash or luminance-flash criterion exists on the tool.

I read the page's own inline script to get these thresholds. The verdict logic runs client-side in the browser, so there is no server round trip per pair.

## 2. How the pairs were collected and run

- Method A (DOM): production build of 67c55fc served by a static server, Tim's screenshot 2.png analysed, all 14 pair rows expanded and all glossary sections opened. In each of the four themes I walked every visible element, collecting computed text colour, effective background (alpha composited up the ancestor chain) and border colours. 926 samples per theme reduced to 15 to 17 unique pairs per theme.
- Method B (CSS and PDF): every text token in each theme crossed with every surface it could sit on (--bg, --bg-card, --neutral-bg, --code-bg), plus pill, button, hover, queue-stage, focus ring, border, stripe and header-line pairs from src/styles.css, brand colours, and PDF_TEXT_PAIRS and the pdf.js fills.
- Reconciled: 341 pair-uses, 160 unique hex pairs across all themes. Every DOM pair is also in the token set. DOM-only extras: none.
- Live run: all 160 unique pairs were entered into the live vadchecker.com tool in one tab (the tool's own JavaScript computed each result, no extra requests to the site). I then confirmed 5 pairs by loading the real URL form, one request every 2 to 3 seconds: 1A1A1A on FFFFFF, E2E7EC on 061528, FFFFFF on 0C3B64, EB9C52 on 0D2440, E2E7EC on 142536. All five matched the in-page results exactly. No errors or rate limiting seen.
- Cross-check: I rebuilt the tool's logic offline from its source and compared it to the live outputs. 160 of 160 pairs matched on ratio, AA, AAA, Lc, saturation, Vestibular and Cognitive. The counts below are therefore exact.

Scope definitions used in the counts:
- "Used" = text pairs seen in the rendered DOM plus the CSS-specific pairs (pills, buttons, hover, queue stage), excluding borders.
- "All tokens" = the full token-by-surface matrix, including combinations the UI does not use today.

## 3. Counts per theme (VADChecker's own wording)

Used text pairs:
- Light: 15 pairs. Vestibular Strain: 11 SAFE, 4 WARN, 0 HIGH. Cognitive: 6 SAFE, 6 NEUTRAL, 3 HARSH. APCA fail: 0.
- Dark: 16 pairs. Vestibular Strain: 6 SAFE, 10 WARN, 0 HIGH. Cognitive: 6 SAFE, 7 NEUTRAL, 3 HARSH. APCA fail: 0.
- Muted Light: 15 pairs. Vestibular Strain: 15 SAFE. Cognitive: 8 SAFE, 7 NEUTRAL, 0 HARSH. APCA fail: 0.
- Muted Dark: 17 pairs. Vestibular Strain: 17 SAFE. Cognitive: 16 SAFE, 1 NEUTRAL, 0 HARSH. APCA fail: 0.
- PDF (Muted Light palette, 15 pairs plus header fill): Vestibular Strain 15 SAFE. Cognitive 8 SAFE, 7 NEUTRAL. No HARSH, no APCA fail.

All-token matrix:
- Light: 31 pairs. Vestibular 27 SAFE, 4 WARN. Cognitive 12 SAFE, 13 NEUTRAL, 6 HARSH. 2 APCA fails (--warm orange used as text, which the UI does not do).
- Dark: 34 pairs. Vestibular 12 SAFE, 22 WARN. Cognitive 12 SAFE, 17 NEUTRAL, 5 HARSH.
- Muted Light: 34 pairs. Vestibular 34 SAFE. Cognitive 22 SAFE, 12 NEUTRAL.
- Muted Dark: 43 pairs. Vestibular 43 SAFE. Cognitive 42 SAFE, 1 NEUTRAL.

Borders and stripes (non-text, 1.2 to 1.6:1 by design) always read HARSH or failing APCA on VADChecker because it is a text checker. I excluded them from the verdict. Their saturation is not a concern. The Dark border pairs inherit the WARN from the dark backgrounds.

## 4. Pairs that are not a clean pass

### Light (4 Vestibular WARN, 3 Cognitive HARSH among used pairs)
- white on --accent navy, primary button and skip link: FFFFFF on 0C3B64, 11.51:1. Vestibular WARN (bg saturation 79%). Cognitive HARSH ("Color Vibration"). Group (a) or (b), see below.
- white on --accent-hover: FFFFFF on 0A3052, 13.48:1. WARN (78%), HARSH.
- --warn on --warn-bg, "Review" pill: 544012 on F6E8C8, 8.16:1. WARN (bg saturation 72%), cognitive NEUTRAL.
- --fg on --bg-card: 1A1A1A on FFFFFF, 17.40:1, Lc 109. Vestibular SAFE. Cognitive HARSH (Lc over 105, "Color Vibration"). Used for h1, labels, summary text.
- Cognitive NEUTRAL only (acceptable, not a fail): 1A1A1A on F4F6F8 (16.07:1, Lc 103), 1A1A1A on ECEEF1 (14.97:1), 46505E on FFFFFF (8.17:1, Lc 91), 0C3B64 on FFFFFF links (11.51:1, Lc 99), 0C3B64 on ECEEF1/F4F6F8, and the pass/fail/warn text on white (Lc 91 to 96).

### Dark (10 Vestibular WARN, 3 Cognitive HARSH among used pairs)
Every pair with --bg #061528 (saturation 74%) or --bg-card #0D2440 (66%) as background is Vestibular WARN. --neutral-bg #15314F is 58% so it is SAFE.
- --fg on --bg: E2E7EC on 061528, 14.73:1. WARN, HARSH ("Color Vibration": saturation over 65% and ratio over 10).
- --fg on --bg-card: E2E7EC on 0D2440, 12.56:1. WARN, HARSH.
- --fg-muted on --bg and --bg-card: A3C3DA on 061528 (9.93:1) and 0D2440 (8.47:1). WARN, NEUTRAL.
- --accent on --bg-card: EB9C52 on 0D2440, 7.00:1. WARN, NEUTRAL (also the focus ring and header underline).
- --warm (header wordmark) on --bg-card: 52C7EB on 0D2440, 7.98:1. WARN, NEUTRAL.
- --warn pill: DDB94D on 3A2C0C, 7.20:1. WARN (bg 66%), NEUTRAL.
- Orange button and skip link: 061528 on EB9C52, 8.21:1. WARN (bg 79%), NEUTRAL. Hover 061528 on ECBB83 (10.48:1) WARN and HARSH.
- Also in the matrix, not used as text today: --pass, --fail, --warn, --neutral, --accent-hover on --bg and --bg-card are all WARN.

### Muted Light and Muted Dark
- Only Cognitive NEUTRAL, driven by high contrast (Lc over 90), never by saturation: 2B3138 on FFFFFF (13.13:1), 444B55 on FFFFFF (8.81:1), 234A73 on FFFFFF (9.14:1), white on 234A73 button (9.14:1), E2E7EC on 142536 (12.52:1, the one Muted Dark NEUTRAL).
- No Vestibular WARN anywhere. Highest background saturation is 57% (#703D1F used only as an unused --warm fill) and 53% for the navy button.

### Brand colours (large elements and logo)
- Brand navy 0C3B64 on white: 11.51:1, Vestibular SAFE (white background), Cognitive NEUTRAL. Clean enough.
- Brand orange EB9C52 on dark card 0D2440: WARN (background saturation 66%), NEUTRAL. On 061528: WARN, NEUTRAL.
- Brand sky 52C7EB on 0D2440 and 061528: WARN, NEUTRAL.
- Orange or sky on white (2.23:1 and 1.96:1) fail APCA and HARSH, but the app never uses them on white (header wordmark switches to --accent navy in light themes). Not a finding.

### PDF
- No Vestibular WARN and no HARSH. The PDF uses the Muted Light palette so it is the safest output. Cognitive NEUTRAL only on high-contrast text (page text on white 13.13:1, muted 8.81:1, links and header band 9.14:1).

## 5. The three groups

### (a) Fail VADChecker but required for the design (already accepted)
- Light and Dark accent fills: navy #0C3B64 (saturation 79%) and orange #EB9C52 (79%) as button, skip link and focus-related fills. These are the brand colours and CLAUDE.md already accepts vestibular WARN on accents. White-on-navy reads HARSH only because the ratio is 11.51:1 and saturation is over 65%.
- Brand orange and sky as header wordmark and accents on the dark surfaces. They read WARN only because of the dark backgrounds, and that is fixed by item 1 in group (b).
- Light --accent text and links (0C3B64 on white): clean on VADChecker.

### (b) Fixable with a small token tweak (all keep 7:1 or better)
1. Dark `--bg` #061528 to #0A1525 and `--bg-card` #0D2440 to #11233E. Both are saturation 57% (SAFE). Checked against every Dark text token on bg, card and neutral-bg: nothing falls below its current ratio except tiny moves (accent on card goes 7.00 to 7.05, fg on bg 14.73 to 14.71, fg-muted on card 8.47 to 8.53). After the change, Dark used pairs on those surfaces read Vestibular SAFE and --fg is no longer HARSH (becomes NEUTRAL: Lc 91 to 94). Only the orange button fill (2 pairs: 061528 on EB9C52 and on ECBB83) stays WARN, which is group (a). Borders stay at the same 1.58 and 1.36:1. The change is a slight colour shift (red channel raised); Tim should eyeball it. Search was nearest colour within a small RGB distance, so the look stays navy.
2. Dark `--warn-bg` #3A2C0C to #3A2C10. Saturation 66% to 57%. --warn text on it 7.19:1 (was 7.20). Result SAFE/SAFE.
3. Light `--warn-bg` #F6E8C8 to #F0E8C8. Saturation 72% to 57%. --warn text 8.06:1 (was 8.16). Result SAFE/SAFE.
4. Light `--fg` #1A1A1A to #2A2A2A. 14.35:1 on white, Lc 104, so HARSH becomes NEUTRAL. Clears the same issue the app's own Cognitive check flags as WARN ("Extremely bright"). #262626 is not enough (Lc 106, still HARSH).
5. Light primary button and skip link fill: use #234A73 (the Muted Light accent, white on it 9.14:1, saturation 53%) with hover #1B3A5C (11.63:1, 55%). Both are Vestibular SAFE and Cognitive NEUTRAL. This needs a separate button-fill token because --accent also drives the link and wordmark text colour, and it moves the light button off pure brand navy. It is a design decision for Tim, not a pure token fix. If Tim keeps brand navy it stays in group (a).
6. Dark orange button fill: no brand-orange fix exists. The closest colour that is SAFE (saturation 57% or less) and still carries dark text at 7:1 or more is #D29C59 (7.53:1 with #0A1525). That drops the brand orange look, so I would leave it as group (a).

### (c) Fixing VADChecker would break WCAG AAA or something else
- AAA 7:1 and VADChecker's SAFE cognitive verdict only overlap in a narrow band: ratio 7 to 12 and Lc 90 or below. Most body text in the light and dark themes sits above that (Lc 91 to 109), so it reads NEUTRAL or HARSH. Lowering text to reach SAFE (for example --fg-muted #46505E to #4A5460: 7.70:1, Lc 89, SAFE) stays AAA, but shrinks contrast for low-vision users, which is the audience WCAG AAA is aimed at. NEUTRAL is "Acceptable", not a failure, so I recommend keeping current contrast.
- Dark --accent on --bg-card is at the edge: 7.00:1 today and 7.05:1 with the new card colour. Lightening the card any further, or choosing a lighter desaturated tint, drops the orange text under 7:1. Tweak 1 was chosen to avoid that.
- Dark --warn text and --fail text on the new surfaces are at 7.02 to 7.19 on --neutral-bg. No headroom to desaturate neutral-bg or pill backgrounds further without a text colour change.
- A saturation cap of 59% on background means no vivid navy or orange can be a fill, which collides with brand colours in the Light and Dark themes. That is a brand-versus-guideline decision, not a contrast one. The Muted themes already meet the guideline.

## 6. Compare with the app's own checks (src/core/perceptual.js)

Vestibular:
- Same thresholds (60 warn, 80 high) and same bands.
- The app takes the maximum saturation of text AND background. VADChecker looks at the background only.
- Across the 152 unique text pairs the two agree on 124 (82%). All 28 disagreements are the same direction: the app says WARN, VADChecker says SAFE, because the text colour is saturated (navy, orange, green, red, amber text) on a neutral background. There is no case where VADChecker is stricter than the app on this check.
- On used pairs: Light 5 differ, Dark 3 differ, Muted Light 0, Muted Dark 0.
- The app is the stricter tool. VADChecker's own page is the narrower one.

Cognitive:
- The app never says NEUTRAL; it has PASS, WARN, FAIL, HARSH. VADChecker has SAFE, NEUTRAL, HARSH and also flags ratio over 12 and Lc over 90 as NEUTRAL, which the app does not.
- Rough mapping (app PASS = SAFE, WARN = NEUTRAL, FAIL or HARSH = HARSH, using the simplified Lc VADChecker uses): agreement on used pairs is Light 7/15, Dark 6/16, Muted Light 8/15, Muted Dark 16/17. The app is the more lenient tool here (it says PASS where VADChecker says NEUTRAL) and the app sometimes says WARN where VADChecker says HARSH (Lc over 105, ratio over 10 with saturation).
- This is an approximation. The app uses vendored APCA, VADChecker uses a simplified APCA, so Lc can differ by a few points near the thresholds.

APCA: the app WARNs at Lc under 60 and FAILs under 45. VADChecker FAILs under 45 and warns only above 105. No used text pair fails either.

## 7. Incidental WCAG AAA misses found during the walk (not VADChecker issues)

These sit below 7:1 on the live site today and break the project's own AAA target:
- Dark: the ⓘ info icon (a.check-info, 13.6px bold) --accent #EB9C52 on --neutral-bg #15314F is 5.94:1. Also the "analysing" queue stage: orange text over the 16% orange tint on --bg-card is 5.35:1 (5.38:1 after the new card colour).
- Muted Dark: the ⓘ icon #E3C196 on --neutral-bg #283A4E is 6.83:1, and the "analysing" queue stage is 5.46:1.
- Suggested fix for the icon: a lighter accent for this one element, for example #F4B87E on #15314F in Dark (7.58:1) and #EDD3B0 on #283A4E in Muted Dark (8.06:1), or switch the icon to --fg-muted. The queue stage needs a different tint or text colour. These need Sean to confirm; I have not tested rendered fixes.

Light and Muted Light have no sub-7:1 text pairs. The PDF pairs are all 8.6:1 or better.

## 8. Recommendation

- Fix before release: nothing in VADChecker is a hard fail, so this is not a release blocker on its own. The incidental AAA misses in section 7 are real WCAG AAA gaps and should be raised with Sean.
- If Tim wants the app to meet VADChecker as well as AAA: make tweaks 1 to 4 (Dark bg and card, Dark and Light warn-bg, Light --fg). That clears every Dark Vestibular WARN except the orange button, and every HARSH except the navy button. Then decide on tweak 5 (Light button fill).
- The Muted themes already meet VADChecker's Vestibular guideline. Pointing sensitive users to them in the glossary text would be a cheap, accurate message.

## Method notes and limits

- Colours came from a rendered page with one analysed image. Elements that only appear in other states (error banner, model download bar, preloader, drop zone hover, queue rows while processing) were covered from CSS tokens, not by rendering them.
- :focus-visible outline colour is --accent against --bg, --bg-card and --neutral-bg. It is non-text, so VADChecker's verdict on it is informational only.
- Not tested: hover states in the rendered page, forced-colours mode, screen readers (out of scope for this audit).
