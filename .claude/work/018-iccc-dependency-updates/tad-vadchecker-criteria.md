# VADChecker: what it checks, and how it compares with our Vestibular check

Retrieved: 25 October 2026.

## Bottom line

VADChecker does not publish its saturation limit, its verdict thresholds for the vestibular check, or its calculation. Its public pages give only qualitative guidance. The real logic runs in the browser, and I could not read that code with the tools available. So we cannot yet say for certain whether our colours meet its guidelines. We can say what it claims to check, and that our own check uses a different, openly documented rule that is also an in-house heuristic.

To get a definite answer, the team has two options: read the page's JavaScript in a browser (view source or developer tools on https://vadchecker.com/tool/), or run our palette through the live tool using the share-link format below and record the results.

## What is verified from VADChecker's own pages

Sources: the home page, https://vadchecker.com/ (the old address, https://tastheartist.com/vestibular-accessible-design-checker/, returns a 301 redirect to it), and the tool page, https://vadchecker.com/tool/. Both were read through a page-to-text fetch, so exact wording is as that fetch reported it.

### Stated purpose and method

- It audits colour palettes for visual triggers that can affect vestibular-sensitive and neurodivergent users. It calls itself "a tool, not a replacement for human oversight."
- It checks palettes against APCA and WCAG 2.2. It combines the WCAG 2.2 luminance ratio with APCA lightness contrast (Lc), and flags pairs that pass WCAG but may cause halation, vibration or vestibular strain.

### Criteria named on the home page (qualitative, no formulas)

- Avoid pure saturated colours, especially pure red or neon yellow next to dark text, which can cause optical vibration.
- Contrast ratios above 18:1 on high-luminance displays can cause glare and text halation.
- Text under 12px can cause eye strain and undermines standard contrast calculations.
- It "detects overly saturated hues" and high-frequency colour pairs that may flicker or strain. No saturation values are published.

### Sections shown on the tool page

- WCAG 2.2 contrast ratio, with AA at 4.5:1 (standard) and 3:1 (large or bold), and AAA at 7:1 (standard) and 4.5:1 (large or bold).
- APCA engine. The page warns the Lc value "may always read zero" without APCA knowledge. No APCA thresholds are listed.
- Vestibular Strain, displayed as a saturation percentage (for example "Saturation: 0%"). The page does not say how saturation is calculated (HSL, HSV, chroma or other), whether it measures text, background or both, or what limit applies.
- Cognitive Evaluation, with verdict labels SAFE, NEUTRAL and HARSH (labels from the home page).
- The 18:1 figure on the home page matches the "HARSH" idea but the page does not state that 18:1 is the HARSH trigger. That link is unverified.

### Verdict labels

- Confirmed: SAFE, NEUTRAL, HARSH for the cognitive comfort score.
- Not found: any label or band for the Vestibular Strain saturation figure. Unverified.

### Sources it cites

- Only APCA and WCAG 2.2 are named. A "Verify Pair on WebAIM Checker" button links out for contrast confirmation.
- It does not cite WCAG 2.3.1 (flashing), any vestibular research, or any published saturation method. It does not mention red flash, hue or flash-rate rules.

### URL query parameters

- Confirmed on the home page: audits can be shared with links such as `?txt=ffffff&bg=121212`, so `txt` is the text colour and `bg` the background, as six-digit hex without a leading hash. The home page example is the only evidence.
- No other parameters are documented. Whether three-digit hex, a leading `#`, or other keys work is unverified.
- Example for our brand navy on white: `https://vadchecker.com/tool/?txt=0C3B64&bg=FFFFFF`

### Is the logic documented?

- No. Neither page links to methodology documentation. The two blog posts listed at https://vadchecker.com/accessibility-blog/ (trauma-informed design; WCAG 3.1.1 Language of Page) do not cover the checker's calculations.
- The fetch tool strips scripts and showed no script URLs, so the logic must be read from client-side code. I did not do this. The only contact given is Developer@TasTheArtist.com, which is a route to ask the author directly.

### Other features (home page)

- Bulk extractor that pulls 3-digit and 6-digit hex codes from pasted HTML or CSS.
- Downloadable .txt report (contents not described).
- Respects `prefers-contrast: more`.
- Author states they "strive to conform" to WCAG 2.1/2.2 Level AA to AAA.

## How our Vestibular check works

Sources: `src/core/perceptual.js` (`vestibularResult`, with the private `hslSaturation`) and the "Vestibular" entry in `index.html` (id `check-info-vestibular`, line 117).

- It converts both the text and background colours to HSL saturation, as a whole percentage from 0 to 100. Greys score 0.
- It takes the higher of the two (`maxSat`).
- Verdicts: under 60 is SAFE, 60 to 79 is WARN, 80 or above is HIGH.
- Messages: "Low saturation, no shimmer risk"; "Moderately saturated, may shimmer for sensitive viewers"; "Very saturated, can shimmer and cause sensory overload."
- Our own text states the 60 and 80 cut-offs are an in-house heuristic. WCAG sets no saturation threshold, and no peer-reviewed publication pins an HSL saturation cut-off. The code comment also notes WCAG 2.3.1 and 2.3.3 address motion and flicker, not still-image saturation.
- Related: our Cognitive check separately fails at saturation 80 or above, warns when saturation is above 65 with contrast above 10:1, and gives HARSH above 18:1 contrast. That 18:1 figure echoes VADChecker's home-page 18:1 glare guidance, though I cannot confirm either side borrowed from the other.

## Plain comparison

| Point | VADChecker (as published) | Our app |
|---|---|---|
| Saturation measure | Shows a saturation percentage; method not stated | HSL saturation, both colours, higher one graded |
| Saturation limits | Not published | 60 (WARN) and 80 (HIGH), in-house |
| Vestibular verdict labels | None found | SAFE, WARN, HIGH |
| Cognitive labels | SAFE, NEUTRAL, HARSH | PASS, WARN, FAIL, HARSH |
| High contrast | Over 18:1 can cause glare | Over 18:1 gives HARSH |
| Small text | Under 12px flagged | Under 10px (OCR box height) fails Cognitive |
| Pure red or neon yellow | Named as a risk, no rule given | No hue rule; covered only by saturation |
| WCAG 2.3.1 / red flash | Not cited | Not applied (still images) |
| Documentation | Qualitative only | Open code and in-page explanation |

Both tools lean on saturation with no published research threshold. The main difference is that ours is transparent and deterministic, while VADChecker's numbers are unknown to us.

## Gaps and next steps

1. Unverified: VADChecker's saturation formula, limits, and vestibular labels. Needs a read of its client-side script or a reply from the author.
2. Unverified: whether it accepts more than `txt` and `bg`.
3. Practical test: run each of our theme text and background pairs through the share-link format and record what it reports. That gives an empirical answer without needing the source.
4. Our colours for context: the brand guidance says vivid orange and sky are in our WARN band and the muted themes sit below 60 per cent saturation, so under our own rule the muted themes should read SAFE. That is our rule, not VADChecker's.
