# Privacy note: report links to VADChecker and WebAIM

Target file: `privacy.html` (not edited by me). Checked against the `release-combined` copy.

## Findings that shape the wording

- The page does not mention WebAIM anywhere today.
- The WebAIM link carries data in the same way as the VADChecker link. Its address is `https://webaim.org/resources/contrastchecker/?fcolor=<text>&bcolor=<background>`, so it also sends the two colour codes when clicked (`src/ui/report-view.js`, `src/export/pdf.js`, `src/export/markdown.js`).
- The WebAIM link opens in a new window with `rel="noopener noreferrer"`, so no referring address is sent. I did not see a VADChecker link in `report-view.js` yet (only `strings.js` and its test), so the note makes no claim about referrer handling for it. If the VADChecker link also uses `noreferrer`, a sentence could be added later.
- Nothing is known here about how vadchecker.com or webaim.org handle data, so the note says so and goes no further.
- The page's existing sentence "The only request that leaves your device is the single anonymous page-view sent to GoatCounter" becomes inaccurate once links exist, so it needs adjusting.

## 1. HTML to insert

Place it between the "Third-party scripts" section and the "Open source" section. That means directly after this closing line:

```html
        </section>

        <section>
          <h3>Open source</h3>
```

Insert a new section immediately before `<section>` / `<h3>Open source</h3>`:

```html
        <section>
          <h3>Links to other tools</h3>
          <p>Each colour combination in the report has links to two other accessibility tools: the WebAIM Contrast Checker and VADChecker (at vadchecker.com, made by Tas the Artist). Nothing is sent unless you choose to click one.</p>
          <p>If you click, your browser opens that site in a new window. The link address contains the two colour codes for that combination, as text and background, for example <code>?txt=ffffff&amp;bg=122222</code>. The site receives those two colour codes, plus what a browser normally sends, such as the page address and your IP (Internet Protocol) address. It never receives your image, the text found in your image, or the file name.</p>
          <p>The same links appear in downloaded PDF and Markdown reports. Anyone who clicks them later sends the colour codes in the same way.</p>
          <p>Those sites have their own privacy practices. This tool does not control them. Please read their privacy information if you want to know how they handle data.</p>
        </section>
```

## 2. Existing sentences to adjust

Section "Third-party scripts". Replace the final sentence:

Old:
`The only request that leaves your device is the single anonymous page-view sent to GoatCounter, described above.`

New:
`The only request this tool sends by itself is the single anonymous page-view sent to GoatCounter, described above. Links to other tools send nothing unless you click them, as explained under "Links to other tools" below.`

Section "Network requests". Optional but recommended for consistency. Replace the start of the first paragraph:

Old:
`Aside from the GoatCounter analytics request described above, the only network requests this tool makes are`

New:
`Aside from the GoatCounter analytics request described above, the only network requests this tool makes by itself are`

No change needed to the intro, the tagline or the meta description: "nothing is uploaded" stays true.

## 3. Two-line summary

The report now links each colour combination to VADChecker and WebAIM, and clicking either sends only the two colour codes (plus normal browser details) to that site.
The privacy page now says so, says nothing is sent unless you click, and no longer claims GoatCounter is the only thing that can leave your device.
