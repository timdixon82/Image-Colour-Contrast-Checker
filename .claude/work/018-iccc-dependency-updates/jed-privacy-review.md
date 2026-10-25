# Jed privacy review: PR 71 privacy.html (59b4600..1c75b46)

Verdict: APPROVE WITH CHANGES (two small wording fixes; no blocker).

## 1. Accuracy against the code

| Claim | Verified | Source |
|---|---|---|
| Two links per colour combination (WebAIM, VADChecker) | Yes | report-view.js lines 350-354 |
| Nothing sent unless clicked | Yes. Plain `<a href>`, no prefetch, no script request | report-view.js webaimLink, vestibularLink |
| Opens in a new window | Yes, `target="_blank"` | both links |
| No referring address | Yes, `rel="noopener noreferrer"` on both. This also overrides the page's `strict-origin-when-cross-origin` meta policy | both links |
| Link carries the two colour codes, text and background | Yes | see format note below |
| Example `?txt=ffffff&bg=122222` | Correct for VADChecker only (`vestibularCheckerUrl`, strings.js lines 54-60: lower-case, no hash) | strings.js |
| Destination receives IP address and usual browser details | Accurate and not overclaimed | general browser behaviour |
| Never receives image, OCR text or file name | Yes. URLs are built only from `fgHex` and `bgHex` | report-view.js, strings.js |
| PDF and Markdown carry the same links | Yes. Markdown lines 114-129, PDF lines 400-408, same URL formats | markdown.js, pdf.js |
| "makes by itself" and "sends by itself" corrections to Network requests and Third-party scripts | Accurate and consistent with the new section | privacy.html lines 106, 119 |
| GoatCounter wording | Unchanged in the diff. Still matches the CSP `connect-src` and the `count.js` tag | privacy.html lines 5-9, 91 |

## 2. Overclaim, misleading or missing

1. WebAIM address format is not shown and differs. The WebAIM link uses `?fcolor=<fg>&bcolor=<bg>` (hash stripped, case as stored), not `txt`/`bg`. The sentence "for example `?txt=...`" reads as if it applies to both links. Not wrong in substance (both carry exactly the two colours) but the example should be attributed to VADChecker, or both shown.
2. "Each colour combination ... has links to two other accessibility tools" is accurate. No change needed.
3. Exports: disclosed. One small addition is worth making: the PDF also prints the two colour codes as visible link text, and Markdown shows them in the link address. Not a privacy issue, so optional.
4. "Anyone who clicks them later sends the colour codes in the same way." Accurate. Note that referrer protection in exports depends on the viewer app (PDF reader or Markdown viewer), so "no referring address" is only asserted for the on-page links, which is how the text is written. Good; keep it that way.
5. Third-party operators: naming "Tas the Artist" for VADChecker is a factual attribution taken from the code comment in strings.js ("Tas's Vestibular Accessible Design Checker"). Confirm Tim is happy to name that person publicly on the page, since it is a name in published text. It is not personal data of the user, so no GDPR issue. WebAIM has no operator named; consistent enough, but you may prefer "WebAIM (Utah State University)" only if verified. Do not add it unverified.
6. No new controller or processor relationship is created (the user chooses to navigate; this tool does not transmit the data). The "own privacy practices, not controlled by this tool" paragraph is the right framing. No lawful-basis change needed.
7. Pre-existing, not in this PR: line 119 and surrounding text use em dashes (`—`). Leave unless you want a tidy-up commit.

## 3. Wording and style

UK English and plain language are good. No em dashes in the new text. "IP (Internet Protocol) address" is fine.

## Suggested changes

Change A (replace the second paragraph of "Links to other tools"):

> If you click, your browser opens that site in a new window. The link address contains the two colour codes for that combination, as text and background. For example, a VADChecker link ends <code>?txt=ffffff&amp;bg=122222</code> and a WebAIM link ends <code>?fcolor=ffffff&amp;bcolor=122222</code>. The site receives those two colour codes, plus what a browser normally sends, such as your IP (Internet Protocol) address and browser details. The links are set to open with no referring address, so the site is not told which page you came from. It never receives your image, the text found in your image, or the file name.

Change B (optional, third paragraph):

> The same links appear in downloaded PDF and Markdown reports. Those files show the colour codes in or beside the links. Anyone who clicks a link in a saved report later sends the colour codes in the same way, and whether a referring address is sent then depends on the program opening the report.

No code changes required. Confirm point 5 with Tim before merge.
