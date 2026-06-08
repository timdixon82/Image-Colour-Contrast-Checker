# Carol test spec — PDF/UA visual audit

> This spec supersedes all previous Carol test briefs for PDF/UA work. Carol must complete every item. An item may not be marked PASS without the specific evidence noted.

---

## Before you start

This spec requires pixel-level analysis of a rendered PDF. You must render the PDF with pdftoppm (not inspect the PDF source code). A code review does not satisfy any item in this spec.

**Scale reference:** at 150 dpi, 1 pt = 2.083 px. All measurements in this spec are in points (pt). Convert to pixels for pdftoppm output by multiplying by 2.083.

---

## Section 0 — Setup

### 0.1 Start the dev server

```
npm run dev
```

Confirm the server is running at `http://localhost:5173` (or the port shown in the terminal). Do not use the production build.

### 0.2 Prepare the test image

The test image must meet ALL of these criteria:

- Contains visible text (so OCR returns at least 2 words)
- Produces at least 3 distinct colour pairs after analysis
- At least 1 pair must FAIL WCAG AA
- At least 1 pair must PASS WCAG AA
- The image must be at least 400 px wide

Confirmed suitable image: `thank you image.jpg` (used in the reference PDF). This is the same image whose output is shown in the reference screenshots. Use it if available. If not, use any image that meets the criteria above and note which image you used in your report.

### 0.3 Run the analysis

1. Open `http://localhost:5173` in Chromium.
2. Drop the test image onto the drop zone (or click to pick file).
3. Wait until the progress badge for the image shows a green tick or "Done" — OCR and analysis are complete. Do not proceed until the badge is fully resolved.
4. Confirm the report section has rendered below the drop zone (at least one colour pair block is visible).

### 0.4 Download the PDF

1. Click the "Download PDF" button.
2. Confirm the file saves to disk. Note the filename (format: `contrast-audit-YYYY-MM-DD-HH-MM-SS.pdf`).
3. Confirm the file is not 0 bytes. A valid PDF will be at least 50 KB when a real image is included.

**Fail criterion for 0.4:** file is 0 bytes, download fails, or browser console shows an uncaught error in the PDF export path. Pre-existing console errors (CSP frame-ancestors, ONNX data: URI block, WebGPU unavailable, GoatCounter localhost) do not fail this item.

### 0.5 Render the PDF for analysis

```bash
pdftoppm -r 150 /path/to/contrast-audit-*.pdf /tmp/pdf-audit/page
```

This produces `/tmp/pdf-audit/page-1.ppm`, `/tmp/pdf-audit/page-2.ppm`, etc.

Convert to PNG for pixel analysis:

```bash
for f in /tmp/pdf-audit/*.ppm; do convert "$f" "${f%.ppm}.png"; done
```

Note the total page count. Record it in your report.

---

## Section 1 — Page 1: Header block

Analyse `/tmp/pdf-audit/page-1.png`.

### 1.1 Navy rectangle dimensions

- **What to look for:** A solid navy rectangle at the top of the page.
- **How to verify:** Sample pixels along the rectangle's top edge, left edge, right edge, and bottom edge. The rectangle starts at the left margin (x ≈ 40 pt from page left) and spans the full content width (515 pt).
- **Pass criterion:**
  - Colour: RGB(6, 21, 40) ± 3 per channel. Hex #061528.
  - Height: 88 pt (183 px at 150 dpi) ± 5 pt.
  - Left edge: at x = 40 pt (83 px) from page left.
  - Right edge: at x = 555 pt (1157 px) from page left.
- **Fail examples:** Rectangle is absent (white background where navy should be). Rectangle is present but text appears below it rather than inside it (was a real failure in v0.4.6 and earlier — H1 text was outside the block). Rectangle colour is wrong (e.g., black).

### 1.2 H1 title text — "Image Colour" (white) + "Contrast Checker" (orange)

- **What to look for:** Two-part H1 title rendered inside the navy block.
- **How to verify:**
  - Sample a pixel on the letter "I" of "Image" — must be white.
  - Sample a pixel on the letter "C" of "Contrast" — must be orange.
  - Measure the x coordinate of the leftmost text pixel.
- **Pass criterion:**
  - "Image Colour" text colour: RGB(255, 255, 255) ± 5. White.
  - "Contrast Checker" text colour: RGB(255, 124, 0) ± 5. Orange #FF7C00.
  - Font size: approximately 18 pt (visible as large text — larger than tagline and body text).
  - Left padding: x of first text pixel minus x of navy block left edge = at least 10 pt (21 px). Reference measurement: 13.4 pt.
  - Both parts of the title are on the same line (same y coordinate ± 3 px).
  - Both parts are inside the navy block (y coordinate of text is greater than top of navy block and less than bottom of navy block).
- **Fail examples:** "Image Colour" renders in orange instead of white. "Contrast Checker" renders in white instead of orange. Title text appears below the navy block (was a real failure — text was rendered outside the block). Title text is absent entirely (was a real failure in v0.4.6 — empty BT/ET blocks).

### 1.3 Tagline text

- **What to look for:** A single line of small text below the H1 title, inside the navy block.
- **How to verify:**
  - Sample a pixel on the tagline text — must be sky blue.
  - Confirm y coordinate of tagline is greater than y of H1 bottom and less than y of navy block bottom.
  - Confirm x coordinate of tagline aligns with the H1 left edge (same left padding).
- **Pass criterion:**
  - Text content: "Drop in images for WCAG 2.2 AA / AAA compliance and advanced perceptual checks. Runs entirely in your browser — nothing is uploaded."
  - Colour: RGB(97, 210, 255) ± 10. Sky blue #63D2FF.
  - Inside the navy block: tagline's y coordinate (bottom of text) is less than (navy block top + 88 pt).
  - Left padding: same as H1 (at least 10 pt from block left edge).
  - Font size: smaller than H1 (approximately 8.75 pt — visibly smaller).
- **Fail examples:** Tagline text is absent. Tagline appears below the navy block. Tagline is white instead of sky blue. Tagline text overflows the page width.

---

## Section 2 — Page 1: Report metadata

### 2.1 "Audit Report" H2 heading

- **What to look for:** Bold heading immediately below the navy block.
- **How to verify:** Measure the background pixel at the heading's y position — must be white (not navy, not amber). Check the text is visibly heavier weight than the body text below it.
- **Pass criterion:**
  - Text: "Audit Report"
  - Background: RGB(255, 255, 255). White — not inside the navy block.
  - Font size: approximately 14 pt (visibly larger than body text).
  - Bold weight: pixel density is visibly heavier than the "Generated" lines below.
- **Fail examples:** Heading is absent. Heading appears inside the navy block.

### 2.2 Generated timestamp line

- **What to look for:** A line of grey text reading "Generated [timestamp]".
- **How to verify:** Sample a pixel from the timestamp text.
- **Pass criterion:**
  - Starts with "Generated ".
  - Colour: RGB(75, 85, 99) ± 5. Hex #4b5563. Grey — not black.
  - Font size: approximately 9 pt (smaller than heading, similar size to disclaimer text).
- **Fail examples:** Line is absent. Text is black instead of grey.

### 2.3 "Generated by Image Colour Contrast Checker" line with link

- **What to look for:** A line reading "Generated by " in grey, then "Image Colour Contrast Checker" in navy with an underline.
- **How to verify:**
  - Sample a pixel from "Generated by " — must be grey.
  - Sample a pixel from "Image Colour Contrast Checker" — must be navy.
  - Confirm an underline is visible under "Image Colour Contrast Checker" (a continuous horizontal run of navy pixels, 1–2 px tall, immediately below the text baseline).
  - In the PDF viewer: hover the cursor over "Image Colour Contrast Checker" — cursor must change to a pointer/hand.
  - Note the URL shown in the viewer status bar.
- **Pass criterion:**
  - "Generated by " colour: RGB(75, 85, 99). Grey.
  - "Image Colour Contrast Checker" colour: RGB(6, 21, 40). Navy #061528.
  - Underline: visible continuous horizontal run of navy pixels under the link text.
  - URL: `https://image-colour-contrast-checker.timdixon.net` (exact match).
  - Clicking navigates to that URL.
- **Fail examples:** Entire line is grey with no navy (link text not distinguished). Underline is absent. Clicking does nothing.

---

## Section 3 — Page 1: Disclaimer block

### 3.1 Amber background

- **What to look for:** A filled rectangle with amber/yellow background.
- **How to verify:** Sample a pixel inside the block (away from text and corners).
- **Pass criterion:**
  - Colour: RGB(254, 243, 199) ± 5. Hex #fef3c7.
  - Block is between the metadata section and the Summary heading.
- **Fail examples:** Block is absent (white background). Block is the wrong colour (e.g., grey or white).

### 3.2 Rounded corners

- **What to look for:** Rounded corners on the amber block (corner pixels are white, not amber).
- **How to verify:** Sample the pixel at the exact top-left corner of the amber block's bounding box. That pixel must be white, not amber — the curve means the corner is transparent.
- **Pass criterion:**
  - Top-left corner pixel (at the bounding box corner): RGB(255, 255, 255). White.
  - The amber colour only begins a few pixels in from the corner (the curve is visible).
  - Radius: approximately 4 pt (8 px at 150 dpi) — a small but visible rounding.
- **Fail examples:** Corner pixel is RGB(254, 243, 199) (amber all the way to the corner — no rounding). Corner is clipped at a right angle.

### 3.3 Inner left padding

- **What to look for:** Space between the block's left edge and the text inside it.
- **How to verify:** Find the x coordinate of the amber block's left edge, and the x coordinate of the first text pixel inside the block.
- **Pass criterion:**
  - Gap between block left edge and first text pixel: at least 10 pt (21 px). Reference: 12.5 pt.
- **Fail examples:** Text begins at x = 0 relative to block edge (no padding). Text is flush with block edge.

### 3.4 "Automated analysis only" in bold

- **What to look for:** The words "Automated analysis only" rendered in a noticeably heavier weight than the text that follows them.
- **How to verify:** Sample pixel density at letters in "Automated" vs letters in "Results are indicative". Bold text at 9 pt will have measurably more dark pixels per character.
- **Pass criterion:**
  - "Automated analysis only" is bold (Medium weight font).
  - The continuation text " — Results are indicative only — manual verification is required before citing for formal WCAG compliance." is regular weight.
  - Both are on the same visual line (or wrap together), but the weight difference is visible.
- **Fail examples:** Both parts render at the same weight (all regular). "Automated analysis only" is absent.

### 3.5 Full disclaimer text

- **What to look for:** The complete disclaimer text is present.
- **How to verify:** Read the text rendered in the amber block.
- **Pass criterion:**
  - Text reads: "Automated analysis only — Results are indicative only — manual verification is required before citing for formal WCAG compliance."
  - (Note: the leading sentence "This report is generated automatically to help speed up accessibility review." is intentionally omitted from the PDF — only the second sentence appears.)
- **Fail examples:** Text is truncated. Text is entirely absent.

---

## Section 4 — Page 1: Summary table

### 4.1 "Summary" heading

- **What to look for:** A heading reading "Summary" between the disclaimer block and the table.
- **Pass criterion:**
  - Text: "Summary"
  - Font size: approximately 14 pt. Bold.
  - Background: white.

### 4.2 Column header row

- **What to look for:** A grey header row at the top of the summary table.
- **How to verify:** Sample a pixel in the header row background (not in a cell text area).
- **Pass criterion:**
  - Header row background: RGB(243, 244, 246) ± 3. Hex #f3f4f6. Light grey.
  - "Image" header text: present, bold.
  - "Result" header text: present, bold.
  - Two-column layout: "Image" column takes approximately 415 pt of width; "Result" column takes approximately 100 pt.
- **Fail examples:** Header row background is white (no grey fill). Headers are absent.

### 4.3 Filename row

- **What to look for:** A data row containing the filename of the test image.
- **Pass criterion:**
  - The filename of the test image appears in the "Image" column.
  - Text is visible and not clipped.
- **Fail examples:** Filename is absent. Filename is truncated with no way to read the full name.

### 4.4 Result pill

- **What to look for:** A coloured pill in the "Result" column.
- **How to verify:** Sample the background pixel of the pill. The pill text must also be present.
- **Pass criterion (for a failing image):**
  - "FAIL" text is present.
  - Pill background: RGB(254, 226, 226) ± 5. Hex #fee2e2. Pink.
  - Pill text colour: RGB(127, 29, 29). Hex #7f1d1d. Dark red.
- **Pass criterion (for a passing image):**
  - "PASS" text is present.
  - Pill background: RGB(220, 252, 231) ± 5. Hex #dcfce7. Green.
  - Pill text colour: RGB(20, 83, 45). Hex #14532d. Dark green.
- **Pass criterion (for no-text image):**
  - "NO TEXT" text is present.
  - Pill background: RGB(240, 242, 245). Hex #f0f2f5. Neutral grey.
- **Fail examples:** Pill is absent (just plain text). Pill is the wrong colour (e.g., FAIL shown in green). Text label is wrong.

---

## Section 5 — Image section (first page for that image, or page 2 for single-image reports)

Check the page that begins each image's section.

### 5.1 Filename as H2 heading

- **What to look for:** The filename of the test image as a heading at or near the top of the page.
- **Pass criterion:**
  - Text matches the filename exactly (e.g., "thank you image.jpg").
  - Font size: approximately 14 pt. Bold.
  - Appears at the top of the page (within the first 100 pt of content area).
- **Fail examples:** Heading is absent. Heading shows wrong text.

### 5.2 Preview image renders

- **What to look for:** The test image rendered on the page.
- **How to verify:** The image occupies a large portion of the page. Sample pixels from the image area to confirm they are not all white (i.e., the image content has rendered, not a blank rectangle).
- **Pass criterion:**
  - Image is visible and contains image content (not blank white or all-black).
  - Image width: does not exceed PAGE_W = 515 pt (1073 px at 150 dpi). Measure the rightmost non-white pixel; it must be at x ≤ 40 + 515 = 555 pt (1157 px) from page left.
  - Image height: at least 100 pt (208 px) — the image is not collapsed to a thin strip.
- **Fail examples:** Image area is blank white. Image overflows the page right margin. Image is present but only 1–2 px tall (collapsed).

### 5.3 Result line — below the image, no overlap

This is a critical check. A past bug placed the Result line on top of the preview image.

- **What to look for:** A line reading "Result: [STATUS] — [detail text]" positioned BELOW the preview image, not overlapping it.
- **How to verify:**
  - Find the y coordinate of the preview image's bottom edge.
  - Find the y coordinate of the "Result:" text.
  - Confirm: y("Result:") > y(image bottom edge).
  - If the Result line is on a different page to the image, confirm it appears at the top of that page (y ≈ 50 pt from page top).
- **Pass criterion:**
  - "Result: " text is bold (Medium weight). Colour: RGB(0, 0, 0).
  - Status word (FAIL/PASS/NO TEXT) appears immediately after "Result: " on the same line. Colour matches pill colours in Section 4.4.
  - " — [detail text]" follows on the same line.
  - The entire Result line is either (a) below the image on the same page, with a clear gap between image bottom and text top, OR (b) at the top of the following page.
  - No part of the Result line overlaps the preview image (no text pixels appear within the image's bounding box).
- **Fail examples:** "Result:" text appears at the same y as the bottom portion of the image (overlap). Result line is absent. Status word colour is wrong.

---

## Section 6 — CVD simulation grid

### 6.1 "Colour-blindness simulation" heading

- **What to look for:** An H3 heading reading exactly "Colour-blindness simulation".
- **Pass criterion:**
  - Text: "Colour-blindness simulation"
  - Bold. Font size: approximately 12 pt.
  - Positioned at the left margin (x ≈ 40 pt from page left).
- **Fail examples:** Heading is absent. Text reads "Colour blindness simulation" (missing hyphen).

### 6.2 Exactly 4 CVD simulation images

- **What to look for:** Four rendered images showing colour-vision-deficiency simulations.
- **How to verify:** Count the distinct image regions on this section's pages.
- **Pass criterion:**
  - Exactly 4 images are present: Deuteranopia, Protanopia, Tritanopia, Achromatopsia (in that order).
  - Each image shows the test image rendered with a different CVD simulation (colours will differ from the original and from each other).
  - Each image is at least 100 px wide and 100 px tall (not collapsed).
- **Fail examples:** Fewer than 4 images appear. Images are blank white rectangles.

### 6.3 2-column grid layout — CRITICAL

This has failed before: images were rendered stacked vertically (1 column) instead of in a 2×2 grid.

- **What to look for:** Images arranged in 2 columns and 2 rows (2×2 grid), NOT 4 images stacked vertically.
- **How to verify:**
  - Find the x coordinate of the left edge of the first image (image 1, Deuteranopia).
  - Find the x coordinate of the left edge of the second image (image 2, Protanopia).
  - If these x coordinates are significantly different (≥ 200 px apart), the layout is 2-column. If they are the same (within ± 5 px), the layout is 1-column (fail).
  - Find the y coordinate of the top edge of image 1 and image 2 — they must be equal or very close (within ± 5 px, i.e., same row).
  - Find the y coordinate of image 3 (Tritanopia) — must be below image 1 (a new row).
  - Find the x coordinate of image 3 — must be the same as image 1 (left column).
  - Find the x coordinate of image 4 (Achromatopsia) — must be the same as image 2 (right column).
- **Pass criterion:**
  - Column 1 x (left edge): approximately 40 pt (83 px) from page left.
  - Column 2 x (left edge): approximately 305 pt (635 px) from page left (40 + 250 + 15 gap).
  - Images 1 and 2 share the same row (same y ± 5 px).
  - Images 3 and 4 share a second row below images 1 and 2.
  - Each image width: approximately 245 pt (511 px). Each image fits within its column without overflow.
- **Fail examples:** All 4 images are stacked vertically (x coordinates all equal ≈ 83 px). Images 2, 3, 4 are all in the right column.

### 6.4 Caption labels below each image

- **What to look for:** A caption below each CVD image in italics.
- **Pass criterion:**
  - Caption below image 1: "Deuteranopia — green-blind" (italic, grey text).
  - Caption below image 2: "Protanopia — red-blind" (italic, grey text).
  - Caption below image 3: "Tritanopia — blue-blind" (italic, grey text).
  - Caption below image 4: "Achromatopsia — total colour-blindness" (italic, grey text).
  - Each caption is positioned below its image, not above or beside it.
  - Text colour: approximately RGB(75, 85, 99). Grey #4b5563.
  - Font size: approximately 8 pt (small, clearly smaller than body text).
- **Fail examples:** Captions are absent. Caption text is wrong (e.g., key name instead of label). Captions are not in italic.

---

## Section 7 — Layout continuity after the CVD grid — CRITICAL

This has failed before: the x cursor was not reset after absolute-positioned grid elements, causing subsequent content to start at a mid-page position (≈ 305 pt) instead of the left margin.

### 7.1 "Contrast results" heading left-alignment

- **What to look for:** The "Contrast results" H3 heading that appears after the CVD grid.
- **How to verify:** Measure the x coordinate of the leftmost pixel of the "C" in "Contrast results".
- **Pass criterion:**
  - x coordinate: approximately 40 pt (83 px) from page left. The heading is at the LEFT margin.
  - Tolerance: ± 5 pt (10 px).
- **Fail examples:** "Contrast results" heading starts at x ≈ 305 pt (635 px) — midway across the page (indented to the right-column position of the CVD grid).

### 7.2 WCAG summary line and Advanced summary line left-alignment

- **What to look for:** Two italic lines immediately below "Contrast results".
- **How to verify:** Measure the x coordinate of the first character of each line.
- **Pass criterion:**
  - Both lines start at x ≈ 40 pt (83 px) from page left.
  - Line 1 begins with "WCAG contrast — ".
  - Line 2 begins with "Advanced checks — ".
  - Both lines are italic.
- **Fail examples:** Either line starts at a mid-page x position.

---

## Section 8 — Contrast results section

### 8.1 At least one per-pair block

- **What to look for:** One or more colour-pair result blocks below the summary lines.
- **Pass criterion:**
  - At least one per-pair block is present (visible badge strip, checks table).
  - The number of blocks matches the number of colour pairs in the report (verify against the web report on the same page for the same image).
- **Fail examples:** No per-pair blocks appear. Blocks are present but blank.

---

## Section 9 — Per-pair block (repeat for EVERY pair)

Repeat all items in this section for each colour pair block in the report.

### 9.1 Swatch strip (decorative)

- **What to look for:** A small coloured rectangle (swatch) at the top of the pair block showing the foreground and background colours.
- **Pass criterion:**
  - Width: approximately 48 pt (100 px). Height: approximately 14 pt (29 px).
  - The swatch contains at least two distinct colour regions (foreground and background of the pair).
  - Positioned at the left margin.
- **Fail examples:** Swatch is absent. Swatch is a solid single colour.

### 9.2 Badge strip

- **What to look for:** A line of text showing the AA status, AAA status, Advanced status, background hex, and foreground hex.
- **Pass criterion:**
  - "AA Pass" or "AA Fail" is present.
  - "AAA Pass" or "AAA Fail" is present.
  - "Advanced Pass", "Advanced Review", or "Advanced Fail" is present.
  - "Background #XXXXXX" where XXXXXX is a 6-character hex code.
  - "· Foreground #XXXXXX" where XXXXXX is a 6-character hex code.
  - All on one line (not wrapped to multiple lines for a single pair).
- **Fail examples:** Badge strip is absent. Hex codes are missing. Status words are wrong.

### 9.3 Examples (if present)

- **What to look for:** Quoted word strings in italic, appearing before the WebAIM link.
- **Pass criterion:**
  - If the pair has OCR word examples, they appear as quoted strings (e.g., `"THANK YOU!"`) in italic text.
  - Colour: RGB(55, 65, 81) ± 5. Hex #374151. Dark grey.
  - Font size: approximately 9 pt.
- **Fail examples:** Examples are present in the web report but absent from the PDF.

### 9.4 WebAIM link — underlined and clickable

- **What to look for:** The text "WebAIM" rendered as an underlined navy hyperlink.
- **How to verify:**
  - Confirm "WebAIM" text is visible.
  - Confirm an underline is visible under "WebAIM" (continuous horizontal run of dark pixels at the text baseline).
  - In the PDF viewer: hover over "WebAIM" — cursor must change to a pointer/hand.
  - Note the URL in the viewer status bar.
- **Pass criterion:**
  - Text: "WebAIM"
  - Colour: RGB(6, 21, 40). Navy #061528.
  - Underline: visible.
  - URL: starts with `https://webaim.org/resources/contrastchecker/` and includes `?fcolor=` and `&bcolor=` query parameters matching the pair's foreground and background hex codes (without the `#` prefix).
  - Clicking navigates to that URL.
- **Fail examples:** "WebAIM" is plain text with no underline and no link. Clicking does nothing. URL is missing the colour parameters.

### 9.5 Vestibular Checker link — underlined and clickable

- **What to look for:** A longer link text following WebAIM.
- **How to verify:**
  - Confirm the link text is visible.
  - Confirm underline is visible.
  - Hover in PDF viewer — cursor must change to pointer/hand.
  - Note the URL.
- **Pass criterion:**
  - Text: "Check and adjust colours with Tas the Artist: Vestibular Accessible Design Checker (opens in new window)"
  - Colour: RGB(6, 21, 40). Navy #061528.
  - Underline: visible.
  - URL: `https://tastheartist.com/vestibular-accessible-design-checker/` (exact match).
  - Clicking navigates to that URL.
- **Fail examples:** Link is absent or plain text. URL is wrong.

### 9.6 Per-pair checks table structure

- **What to look for:** A 4-column table with header row.
- **Pass criterion:**
  - 4 columns present: "Check", "Value", "Status", "What it means".
  - Column widths approximately: Check = 110 pt, Value = 80 pt, Status = 80 pt, What it means = 225 pt. Total = 495 pt ≈ PAGE_W.
  - Grey header row background: RGB(243, 244, 246). Hex #f3f4f6.
  - Header text "Check", "Value", "Status", "What it means" visible and bold.
  - Two group header rows inside the table: "WCAG compliance" and "Advanced checks", each spanning the full row width with a slightly darker grey background (RGB(229, 231, 235), hex #e5e7eb).
- **Fail examples:** Table is absent. Fewer than 4 columns. Header row background is white. Group headers are absent.

### 9.7 Check name links in "Check" column — underlined and clickable

- **What to look for:** Each check name ("WCAG AA", "WCAG AAA", "APCA", "CVD contrast", "Vestibular", "Cognitive") rendered as an underlined navy hyperlink in the Check column.
- **How to verify (for each of the 6 check rows):**
  - Confirm check name text is visible in navy.
  - Confirm underline is visible under the check name.
  - In the PDF viewer: hover over the check name — cursor must change to a pointer/hand.
  - Note the URL.
- **Pass criterion (for each check):**

  | Check name | Expected URL |
  |---|---|
  | WCAG AA | `https://image-colour-contrast-checker.timdixon.net/#check-info-wcag-aa` |
  | WCAG AAA | `https://image-colour-contrast-checker.timdixon.net/#check-info-wcag-aaa` |
  | APCA | `https://image-colour-contrast-checker.timdixon.net/#check-info-apca` |
  | CVD contrast | `https://image-colour-contrast-checker.timdixon.net/#check-info-cvd` |
  | Vestibular | `https://image-colour-contrast-checker.timdixon.net/#check-info-vestibular` |
  | Cognitive | `https://image-colour-contrast-checker.timdixon.net/#check-info-cognitive` |

  - Text colour: RGB(6, 21, 40). Navy.
  - Underline: visible continuous run under each check name.
  - Clicking each link navigates to the corresponding URL.
- **Fail examples:** Check names are plain black text with no underline and no link. URLs point to the wrong anchor.

### 9.8 Value column content

- **Pass criterion:**
  - WCAG AA row: contrast ratio in format "X.XX:1" (e.g., "1.03:1").
  - WCAG AAA row: same contrast ratio.
  - APCA row: "Lc " followed by a number (e.g., "Lc 0").
  - CVD contrast row: a dash ("—") or empty.
  - Vestibular row: "XX% saturation" (e.g., "0% saturation" or "47% saturation").
  - Cognitive row: a dash ("—") or empty.
- **Fail examples:** All value cells are empty. Values show wrong units.

### 9.9 Status column pills

- **What to look for:** Coloured pills in the Status column for each check row.
- **How to verify:** Sample the background pixel of each status pill.
- **Pass criterion (for each pill type):**
  - PASS or SAFE: background RGB(220, 252, 231). Green #dcfce7. Text RGB(20, 83, 45).
  - FAIL or HIGH: background RGB(254, 226, 226). Pink #fee2e2. Text RGB(127, 29, 29).
  - WARN: background RGB(254, 243, 199). Amber #fef3c7. Text RGB(102, 58, 0).
- **Fail examples:** Pills are absent (plain text). All pills the same colour regardless of status.

### 9.10 "What it means" column content in italic

- **What to look for:** Descriptive text in the fourth column, rendered in italic.
- **Pass criterion:**
  - WCAG AA row: "needs X:1 for this text size" (e.g., "needs 3:1 for this text size").
  - WCAG AAA row: "needs X:1 for this text size".
  - APCA row: a descriptive message (e.g., "Too low — hard to read at any size.").
  - CVD contrast row: ratios for the three dichromacy types (e.g., "Deuteranopia 1.03:1 · Protanopia 1.03:1 · Tritanopia 1.03:1").
  - Vestibular row: a descriptive message (e.g., "Low saturation — no shimmer risk.").
  - Cognitive row: a descriptive message (e.g., "Fails WCAG — contrast is insufficient for comfortable reading.").
  - All text in this column is italic.
- **Fail examples:** "What it means" content is absent. Text is upright (not italic).

### 9.11 "Where this combination appears" clip image (if present)

- **What to look for:** An optional section appearing after the checks table, showing where that colour combination appears in the source image.
- **Pass criterion:**
  - If a clip image asset exists for the pair, the text "Where this combination appears:" appears in italic grey above the clip image.
  - The clip image renders (not blank white).
  - Width: approximately 360 pt (750 px at 150 dpi).
- **Fail examples:** Clip image is blank white. "Where this combination appears:" text is absent but image is present (no label).

---

## Section 10 — Footer (last page)

### 10.1 THRESHOLDS_FOOTER text

- **What to look for:** Italic grey text at the bottom of the last page.
- **Pass criterion:**
  - Text: "Contrast thresholds — AA: 4.5:1 normal / 3:1 large text · AAA: 7:1 normal / 4.5:1 large text. Large text = ≥24 px OCR box height. Detected via PaddleOCR PP-OCRv4."
  - Colour: RGB(75, 85, 99). Grey #4b5563.
  - Italic.
  - Font size: approximately 9 pt.
- **Fail examples:** Footer text is absent. Text is truncated (missing "Detected via PaddleOCR PP-OCRv4."). Text is not italic.

### 10.2 "Generated by Image Colour Contrast Checker" link in footer

- **What to look for:** The same generated-by line as Section 2.3, repeated in the footer.
- **Pass criterion (same as 2.3):**
  - "Generated by " in grey.
  - "Image Colour Contrast Checker" in navy with underline.
  - URL: `https://image-colour-contrast-checker.timdixon.net` (exact match).
  - Clicking navigates to that URL.
- **Fail examples:** Footer link is absent. Link is present but not underlined. URL is wrong.

---

## Section 11 — Layout continuity check (ALL pages)

After every section that uses absolute-positioned elements (CVD grid images and swatch images), verify that the content immediately following starts at the left margin.

### 11.1 Check procedure

For each of the following transition points, measure the x coordinate of the first text pixel of the content that follows:

| Transition point | Content that follows | Expected x |
|---|---|---|
| After CVD grid | "Contrast results" H3 heading | ≈ 40 pt (83 px) |
| After CVD grid | WCAG summary line | ≈ 40 pt (83 px) |
| After CVD grid | Advanced summary line | ≈ 40 pt (83 px) |
| After each swatch image | Badge strip text | ≈ 40 pt (83 px) |

- **Pass criterion:** x coordinate of first text pixel ≤ 45 pt (94 px) from page left.
- **Fail criterion:** x coordinate of first text pixel ≥ 200 pt (417 px) — content has been displaced to the right column position.
- **Fail examples:** "Contrast results" heading starts at x ≈ 305 pt (mid-page). Badge strip starts indented.

---

## Section 12 — Link verification procedure (ALL links)

### 12.1 Complete link inventory

Verify every link in the document. The complete list of expected links is:

| Location | Visible text | Expected URL |
|---|---|---|
| Page 1 metadata | Image Colour Contrast Checker | `https://image-colour-contrast-checker.timdixon.net` |
| Per pair (each pair) | WebAIM | `https://webaim.org/resources/contrastchecker/?fcolor=XXXXXX&bcolor=YYYYYY` |
| Per pair (each pair) | Check and adjust colours with Tas the Artist: Vestibular Accessible Design Checker (opens in new window) | `https://tastheartist.com/vestibular-accessible-design-checker/` |
| Per pair — Check column (each pair) | WCAG AA | `https://image-colour-contrast-checker.timdixon.net/#check-info-wcag-aa` |
| Per pair — Check column (each pair) | WCAG AAA | `https://image-colour-contrast-checker.timdixon.net/#check-info-wcag-aaa` |
| Per pair — Check column (each pair) | APCA | `https://image-colour-contrast-checker.timdixon.net/#check-info-apca` |
| Per pair — Check column (each pair) | CVD contrast | `https://image-colour-contrast-checker.timdixon.net/#check-info-cvd` |
| Per pair — Check column (each pair) | Vestibular | `https://image-colour-contrast-checker.timdixon.net/#check-info-vestibular` |
| Per pair — Check column (each pair) | Cognitive | `https://image-colour-contrast-checker.timdixon.net/#check-info-cognitive` |
| Footer | Image Colour Contrast Checker | `https://image-colour-contrast-checker.timdixon.net` |

For a report with N colour pairs: there will be 1 + N + N + (6 × N) + 1 = 2 + 8N total links.

### 12.2 Verification steps for each link

For each link in the inventory:

1. In the PDF viewer, hover the cursor over the underlined link text. The cursor must change to a pointer/hand.
2. Read the URL shown in the viewer status bar (or right-click > Copy Link Address).
3. Confirm the URL matches the expected value in the table above. For WebAIM links, confirm the `fcolor` and `bcolor` parameters match the pair's hex codes (without `#`).
4. Click the link. Confirm it opens in the browser or the viewer confirms navigation.

- **Pass criterion for each link:** cursor changes, URL is correct, clicking navigates.
- **Fail criterion:** cursor does not change (no link). URL is wrong. Clicking does nothing.

---

## Reporting

Record your results using this format for each item:

```
[Section X.Y] — PASS / FAIL / NOT APPLICABLE
Evidence: [measurement or observation]
If FAIL: [exact description of what was seen vs what was expected]
```

Report a FAIL for any item where the evidence does not meet the pass criterion. Do not interpret or give the benefit of the doubt — if you cannot confirm the pass criterion with the specific evidence required, report it as FAIL.

A partial pass (some sub-items pass, some fail) is a FAIL for that item.

Do not report PASS for any item without the specific evidence noted. "Looks fine" is not evidence.
