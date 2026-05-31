# Image Colour Contrast Checker: Backfilled Requirements

Reverse-engineered from the repository source, `README.md`, `ARCHITECTURE.md`, `CLAUDE.md`, and `DESIGN_GUIDELINES.md`, as of 2026-05-23. These requirements describe the app as it stands today and form the baseline for future work.

## Contents

1. Product overview
2. Users
3. Core flows
   - 3.1 First visit: model download
   - 3.2 Image upload: drag-and-drop
   - 3.3 Image upload: file picker (keyboard-only)
   - 3.4 Batch processing and streaming results
   - 3.5 Export: PDF report
   - 3.6 Export: Markdown report
   - 3.7 Start another batch
   - 3.8 Privacy statement page
4. Functional requirements
   - 4.1 Model preloading and caching
   - 4.2 Image input
   - 4.3 Analysis pipeline
   - 4.4 Results display
   - 4.5 Export
   - 4.6 Theme
5. Non-functional requirements
   - 5.1 Accessibility
   - 5.2 Privacy
   - 5.3 Browser compatibility
   - 5.4 Performance and loading
   - 5.5 Resilience
   - 5.6 Compliance
6. Open questions for Tim

---

## 1. Product overview

Voice citation: Tim's voice described in `docs/writing-style.md`, "The voice in one line" and "Tone and register" sections. The paragraph below uses plain spoken first-person framing with a practical, generous register, assumes an intelligent reader who is new to the tool, and leads with the benefit.

Image Colour Contrast Checker is a browser-only tool that checks your images for WCAG 2.2 text-contrast problems. You drop in one or more screenshots, the tool uses AI to find the text regions, measures the contrast ratio for every foreground and background colour pair it finds, and tells you what passes and what fails at both AA and AAA levels. The whole thing runs in your browser. Nothing is uploaded. There is no server, no account, and no API key to set up.

---

## 2. Users

The tool has one user role.

**User:** anyone who needs to check whether the text in a screenshot or user-interface image meets the WCAG 2.2 contrast threshold. Typical use cases are:

- An accessibility auditor checking a client's design or web application.
- A designer verifying a mockup before handoff.
- A developer confirming a built interface before committing a fix.
- A product owner running a spot check on a feature under review.

Tim Dixon is severely sight-impaired and uses VoiceOver on macOS and JAWS on Windows. Tim is both the product owner and a representative user of this kind of tool. The tool targets WCAG 2.2 AAA for its own interface, which means it must be fully operable by screen reader and by keyboard alone. This requirement shapes every feature, not only the accessibility section.

---

## 3. Core flows

### 3.1 First visit: model download

This flow is partially visual. The preloader screen covers the page until the models are ready. The status message is announced via an `aria-live="polite"` region, so screen reader users hear progress updates without the visual progress bar.

1. User opens the tool at `image-colour-contrast-checker.timdixon.net`.
2. A preloader dialog (`role="dialog"`, `aria-modal="true"`) appears and covers the page. The main content is set to `inert` so keyboard and screen reader focus cannot reach it.
3. The app fetches the PaddleOCR Optical Character Recognition (OCR) model files and the ONNX Runtime Web WebAssembly (WASM) binaries. Total first-run download is around 28 MB.
4. The status region announces progress: "Downloading [filename] (N of M)".
5. When all files are downloaded, the status region announces "Ready." The preloader dismisses with a short fade (respecting reduced-motion preferences). The `inert` attribute is removed from main.
6. The OCR engine warms up in the background. The drop zone is now usable.

### 3.2 Image upload: drag-and-drop

This flow depends on pointer input. Keyboard users use the file picker flow (3.3) instead.

1. User drags one or more image files onto the drop zone or anywhere on the page.
2. The drop zone gains the `dropzone-active` CSS class, providing visual feedback.
3. On drop, the app filters to image files only (`image/*` MIME type or known image extension).
4. Processing begins. See flow 3.4.

### 3.3 Image upload: file picker (keyboard-only)

This is the fully keyboard-accessible entry path.

1. User tabs to the drop zone element (it carries `tabindex="0"` and `role="button"`).
2. User presses Enter or Space to open the operating system file picker.
3. Alternatively, the user tabs to the "Choose files" button and presses Enter or Space.
4. The file picker opens. The user selects one or more image files.
5. Processing begins. See flow 3.4.

### 3.4 Batch processing and streaming results

This flow runs once images are selected, regardless of how they were submitted.

1. The app assigns each file an identifier and creates a queue row showing the filename and its current stage badge.
2. The processing section appears. The queue list carries `aria-live="polite"` so stage changes are announced.
3. For each file, the app runs four stages in order, updating the stage badge at each step:
   - Decoding: the image is decoded and downscaled to a long edge of 800 to 1400 pixels, without colour management, to keep pixel values aligned with the WCAG contrast formula.
   - OCR: the PaddleOCR PP-OCRv4 model finds text regions and returns bounding boxes with confidence scores.
   - Analysing: for each text region, the pipeline runs a k-means (k=2) colour split on per-pixel luminance across character-width vertical strips, identifies the text (minority) and background (majority) colour clusters, and calculates the WCAG contrast ratio for the worst strip. Results with similar foreground and background colours are merged into one row with the worst-case ratio.
   - Done: the image card appears in the results section.
4. Each image card appears as it finishes. The user does not wait for the whole batch.
5. A summary table above the cards lists every image with its filename, overall verdict (PASS, FAIL, or NO TEXT), and counts of passing and failing colour pairs.
6. An action bar at the bottom of the page offers "Download PDF report", "Download Markdown", and "Audit another batch".

### 3.5 Export: PDF report

1. User presses "Download PDF report". The button is disabled during the export to prevent double-clicks.
2. pdfmake is lazy-loaded on the first call. This keeps it out of the initial bundle.
3. A PDF is generated client-side and downloaded. The file is named `contrast-audit-YYYY-MM-DDTHH-MM-SS.pdf`.
4. The PDF contains: a header, the batch timestamp, a disclaimer that results are indicative and require manual verification, the WCAG threshold key, a summary table, and one page section per image with its preview thumbnail, colour pair table (background then foreground), per-pair swatch and failing-region clip, and per-pair AA and AAA pass or fail.
5. The button returns to its enabled state when the download completes or if an error occurs.

### 3.6 Export: Markdown report

1. User presses "Download Markdown".
2. A Markdown document is built client-side and downloaded. Images are embedded as base64 data URIs. The file is named `contrast-audit-YYYY-MM-DDTHH-MM-SS.md`.
3. The document is best viewed in Visual Studio Code, Obsidian, or Typora. GitHub renders the text but strips embedded images.

### 3.7 Start another batch

1. User presses "Audit another batch".
2. The app clears all results, queue rows, the summary table, and the action bar.
3. The landing section returns to view, ready for new images.

### 3.8 Privacy statement page

1. User follows the "Privacy" link in the footer.
2. `privacy.html` loads. It carries the same branded header, theme toggle, and footer as the main page.
3. The page sets out in plain language what data is and is not collected: no image data leaves the device; GoatCounter analytics logs only aggregate page-view counts with no cookies and no personal data; `localStorage` holds only the colour theme preference; the one-time model file download is served from the same origin.
4. A "Back to the tool" link returns the user to `index.html`.

---

## 4. Functional requirements

### 4.1 Model preloading and caching

**FR-01** As a user, I want the app to download and cache the OCR models on my first visit, so that subsequent visits are instant.

Acceptance criteria:
- [ ] On first load, the app fetches the two PaddleOCR ONNX model files and the ONNX Runtime Web WASM binaries from the same origin as the app.
- [ ] A service worker intercepts model and runtime file requests and stores them in Cache Storage (`icc-model-cache-v*`), not in the HTTP cache.
- [ ] On repeat visits, model and runtime files are served from the cache without a network request.
- [ ] The preloader progress bar and percentage counter update as each file is fetched, using a streaming `fetch()` body reader. Where `Content-Length` is absent, the app falls back to approximate sizes.
- [ ] The preloader status message region carries `aria-live="polite"` and `aria-atomic="true"` so screen readers announce progress updates.
- [ ] When the download is complete, the status region announces "Ready." and the main content becomes interactive.
- [ ] The app selects the WebGPU WASM variant for Chrome and Edge on desktop (where `navigator.gpu` is available and the ONNX Runtime Web WebGPU backend works), and the standard multi-threaded WASM variant everywhere else, including iOS and iPadOS.
- [ ] The service worker also injects Cross-Origin-Opener-Policy (COOP) and Cross-Origin-Embedder-Policy (COEP) headers so that `crossOriginIsolated` is true and the multi-threaded WASM backend can use `SharedArrayBuffer`. This is harmless on hosts that already send those headers.

**FR-02** As a user, I want the OCR engine to warm up automatically after the models are downloaded, so that the first image I submit processes without a cold-start delay.

Acceptance criteria:
- [ ] After the preloader reports completion, the app calls `warmOcr()` immediately.
- [ ] `warmOcr()` is idempotent: calling it more than once has no effect.
- [ ] A "Loading PaddleOCR models" banner appears while the engine warms up, and disappears when warm-up is complete.
- [ ] If the engine fails to load, the banner shows an error message describing the failure.

---

### 4.2 Image input

**FR-03** As a user, I want to submit images by dragging them onto the page, so that I can upload a batch quickly without using a file picker.

Acceptance criteria:
- [ ] The drop zone accepts drag-and-drop from any part of the page, not only from the drop zone element itself.
- [ ] On drag-enter or drag-over, the drop zone gains the `dropzone-active` CSS class.
- [ ] On drag-leave, drag-end, or drop, the `dropzone-active` class is removed.
- [ ] The app filters the dropped files to image MIME types (`image/*`) and to files whose extension matches a known image format. Files that do not match either criterion are silently excluded.
- [ ] Multiple files may be dropped in one gesture.

**FR-04** As a user, I want to choose images using a file picker, so that I can use the tool without a pointing device.

Acceptance criteria:
- [ ] The "Choose files" button opens the operating system file picker when activated by keyboard (Enter or Space) or by pointing device.
- [ ] The drop zone element carries `tabindex="0"` and `role="button"` so it is reachable and activatable by keyboard.
- [ ] Pressing Enter or Space on the focused drop zone opens the file picker.
- [ ] The file input element carries `accept="image/*"` and `multiple` attributes.
- [ ] After the user dismisses the file picker, the file input value is cleared so the same file can be resubmitted if needed.
- [ ] PNG, JPEG, and WebP are the documented supported formats. Other image formats are accepted if the browser can decode them.

---

### 4.3 Analysis pipeline

**FR-05** As a user, I want each image to be decoded and normalised before analysis, so that the contrast results are consistent regardless of the image's original resolution or colour profile.

Acceptance criteria:
- [ ] Each image is decoded using `createImageBitmap()` with `colorSpaceConversion: 'none'` to prevent browser colour management from altering pixel values.
- [ ] The decoded image is drawn onto a canvas with an `srgb` colour space, then converted to `ImageData` for pixel-level analysis.
- [ ] The image is downscaled so the long edge is between 800 and 1400 pixels. Images smaller than 800 pixels on the long edge are not upscaled.
- [ ] The downscale is performed by drawing onto a bounded canvas without materialising a full-resolution pixel buffer, to prevent crashes on high-resolution images.

**FR-06** As a user, I want the app to find text regions in my images using AI, so that I do not have to mark up text areas manually.

Acceptance criteria:
- [ ] Text detection and recognition use PaddleOCR PP-OCRv4 via `@gutenye/ocr-browser` and `onnxruntime-web`.
- [ ] The OCR adapter returns an array of `OcrWord` objects, each with `text`, `score` (confidence), and `bbox` (axis-aligned bounding box in the resized image's pixel space).
- [ ] Polygon detections from the OCR engine are converted to axis-aligned bounding boxes before being passed to the analysis pipeline.
- [ ] Low-confidence and too-small detections are filtered out before colour analysis.

**FR-07** As a user, I want the app to measure contrast accurately for text on gradient or mixed backgrounds, so that I catch problems that a simple average would miss.

Acceptance criteria:
- [ ] The app divides each bounding box into character-width vertical strips.
- [ ] For each strip, the app runs k-means (k=2) clustering on per-pixel luminance to separate the text (minority luminance cluster) and background (majority luminance cluster).
- [ ] The k-means initialisation uses the 25th and 75th luminance percentiles as starting centroids to avoid symmetric initialisation failure.
- [ ] The WCAG contrast ratio is calculated for each strip using the linearised sRGB formula from `src/core/contrast.js`.
- [ ] The strip with the lowest (worst) ratio is the result for that detection. This is the "worst strip" approach used by accessibility auditors.
- [ ] Detections whose foreground and background colours are within an Euclidean RGB distance of 25 are merged into one row, retaining the worst contrast ratio and up to six example words.
- [ ] The merged colour pairs are sorted from worst contrast to best.
- [ ] Each detection is classified as large text if its bounding box height in the resized image is 24 pixels or more.

**FR-08** As a user, I want each image to receive an overall verdict, so that I can see at a glance which images have problems.

Acceptance criteria:
- [ ] Each image receives one of three verdicts: PASS (all colour pairs meet the applicable threshold), FAIL (one or more pairs fail), or NO TEXT (the OCR found no text regions above the confidence and size thresholds).
- [ ] The applicable WCAG thresholds are: AA, 4.5:1 for normal text and 3:1 for large text; AAA, 7:1 for normal text and 4.5:1 for large text.
- [ ] Each colour pair carries both AA and AAA pass or fail flags.

---

### 4.4 Results display

**FR-09** As a user, I want to see results appear for each image as it finishes, so that I do not have to wait for the whole batch to complete before reading any results.

Acceptance criteria:
- [ ] Each image card appears in the results section as soon as that image finishes, not after the whole batch.
- [ ] The processing queue carries `aria-live="polite"` so screen reader users hear stage updates as each file progresses.
- [ ] If at least one image finishes successfully, the results section and the action bar appear.
- [ ] If all images fail (for example, due to a decoding error), the queue remains visible with the error messages and the drop zone stays available for a retry.

**FR-10** As a user, I want to see a summary table across all images, so that I can compare results at a glance.

Acceptance criteria:
- [ ] A summary table above the image cards lists each image by filename with its overall verdict and the counts of passing and failing colour pairs.
- [ ] The table is wrapped in a scroll container for narrow viewports.
- [ ] Each `<th>` element carries `scope="col"`.
- [ ] The summary updates as each image finishes, not only at the end of the batch.

**FR-11** As a user, I want to see detailed results for each image, including colour swatches, failing-region clips, and per-pair contrast ratios, so that I can understand exactly what failed and where.

Acceptance criteria:
- [ ] Each image card shows the image filename, the overall verdict, and a list of colour pairs.
- [ ] Each colour pair row shows: the background colour swatch, the foreground colour swatch, a clip of the failing region, the contrast ratio, and AA and AAA pass or fail badges.
- [ ] Column order is background then foreground, because the background is the reading context.
- [ ] Up to six example words are shown per colour pair.
- [ ] A full-image preview thumbnail is shown on each card.
- [ ] DOM nodes for user-derived content (filenames, detected text) are created with `document.createElement`, never with `innerHTML`, to prevent cross-site scripting.

---

### 4.5 Export

**FR-12** As a user, I want to export the batch results as a PDF, so that I can share the report with colleagues or include it in a formal audit.

Acceptance criteria:
- [ ] The "Download PDF report" button is available after at least one image has been successfully analysed.
- [ ] pdfmake is lazy-loaded on the first export call. It is not included in the initial page bundle.
- [ ] The PDF contains selectable text and embedded colour swatches and image clips.
- [ ] Each image occupies its own page section in the PDF.
- [ ] The PDF includes a disclaimer: "This report is generated automatically to help speed up accessibility review. Results are indicative only -- manual verification is required before citing for formal WCAG compliance."
- [ ] The PDF includes a thresholds key: AA 4.5:1 normal / 3:1 large text; AAA 7:1 normal / 4.5:1 large text; large text is defined as an OCR bounding box height of 24 pixels or more; text detected via PaddleOCR PP-OCRv4.
- [ ] The filename is `contrast-audit-YYYY-MM-DDTHH-MM-SS.pdf`.
- [ ] If PDF generation fails, an alert dialog shows the error message.

**FR-13** As a user, I want to export the batch results as a Markdown document, so that I can read the report in a note-taking application or include it in a documentation system.

Acceptance criteria:
- [ ] The "Download Markdown" button is available after at least one image has been successfully analysed.
- [ ] Images (previews, swatches, clips) are embedded as base64 data URIs so the file is self-contained.
- [ ] The filename is `contrast-audit-YYYY-MM-DDTHH-MM-SS.md`.
- [ ] The document includes the same disclaimer and thresholds key as the PDF.
- [ ] A note in the UI informs the user that GitHub strips embedded images from Markdown renders and that the file is best viewed in Visual Studio Code, Obsidian, or Typora.

**FR-14** The user-facing copy in exports must come from a single source.

This is a constraint, not a user story.

1. All user-facing text shared between the PDF and Markdown exports (`APP_NAME`, `SITE_URL`, `THRESHOLDS_FOOTER`, `DISCLAIMER_TEXT`) is defined once in `src/export/strings.js`.
2. Neither `pdf.js` nor `markdown.js` may hardcode any of these strings.
3. `report-view.js` must also import from `strings.js` for any copy it shares with the export modules.

---

### 4.6 Theme

**FR-15** As a user, I want to switch between light and dark colour modes, so that I can use the tool comfortably in any lighting condition.

Acceptance criteria:
- [ ] The header contains a theme toggle button. In light mode the button carries an `aria-label` of "Switch to dark mode". In dark mode it carries "Switch to light mode". The label updates immediately when the theme changes.
- [ ] The button shows a sun icon in dark mode (indicating a switch to light) and a moon icon in light mode (indicating a switch to dark).
- [ ] Pressing the button toggles `data-theme` on `<html>` between `"light"` and `"dark"` and saves the choice to `localStorage` under the key `td-theme`.
- [ ] On first visit with no saved preference, the OS `prefers-color-scheme` is applied.
- [ ] An inline `<script>` in `<head>` reads `td-theme` and sets `data-theme` before any stylesheet parses, preventing a flash of the wrong theme on load.
- [ ] The app header is always navy (`#061528`) regardless of the active theme.

---

## 5. Non-functional requirements

### 5.1 Accessibility

**NFR-01** The tool must meet WCAG 2.2 at AAA conformance throughout its own interface.

Acceptance criteria:
- [ ] All body text colour pairs meet the 7:1 contrast ratio required by WCAG 2.2 criterion 1.4.6 (Contrast, Enhanced). The verified pairs are documented in `DESIGN_GUIDELINES.md` section 12.
- [ ] All user interface component boundaries meet the 3:1 contrast ratio required by WCAG 2.2 criterion 1.4.11 (Non-text Contrast).
- [ ] A skip link reading "Skip to main content" is the first focusable element in `<body>` and links to `#app` (WCAG 2.4.1, Bypass Blocks).
- [ ] All interactive elements have a visible focus indicator: a 3-pixel solid outline with a 3-pixel offset. The focus colour is navy in light mode and orange in dark mode, both meeting the 3:1 threshold (WCAG 2.4.11, Focus Appearance).
- [ ] All buttons and interactive elements have a minimum touch target of 44 by 44 pixels (WCAG 2.5.8, Target Size).
- [ ] All `<th>` elements carry `scope="col"` or `scope="row"` (WCAG 1.3.1, Info and Relationships).
- [ ] All tables are wrapped in a `.table-scroll` container with `overflow-x: auto`.
- [ ] All decorative SVG icons carry `aria-hidden="true"` and `focusable="false"`.
- [ ] All `aria-live` regions on dynamic content (preloader status, processing queue) carry `aria-live="polite"` and `aria-atomic="true"`.
- [ ] The `<main>` element carries `inert` while the preloader modal is active and the attribute is removed once the preloader is dismissed.
- [ ] The page carries `<html lang="en-GB">`.
- [ ] Animations and transitions respect `@media (prefers-reduced-motion: reduce)`. Under this preference, all animation durations are collapsed to 0.01 ms.
- [ ] No colour is used as the sole means of conveying information (WCAG 1.4.1, Use of Colour). Pass and fail verdicts use text labels alongside colour badges.

**NFR-02** The tool must be fully operable without a pointing device.

Acceptance criteria:
- [ ] The drop zone is reachable by Tab and activatable by Enter or Space.
- [ ] The "Choose files" button is reachable by Tab and activatable by Enter or Space.
- [ ] The theme toggle button is reachable by Tab and activatable by Enter or Space.
- [ ] All footer links are reachable by Tab.
- [ ] The PDF download button, the Markdown download button, and the "Audit another batch" button in the action bar are reachable by Tab.
- [ ] No interactive element is reachable only by pointing device.

---

### 5.2 Privacy

**NFR-03** The tool must not transmit any image data, OCR output, or contrast results to any server.

Acceptance criteria:
- [ ] All image decoding, OCR, colour analysis, and report generation run inside the user's browser. No image data, pixel data, OCR text, or contrast result leaves the device at any point.
- [ ] The only network requests made by the tool are the one-time model file download from the same origin, and the GoatCounter analytics request.
- [ ] GoatCounter sets no cookies, collects no personal data, and does not track users across other websites. It records only aggregate, anonymous page-view information.
- [ ] The tool stores one value in `localStorage`: the colour theme preference (`td-theme`). No other data is stored.
- [ ] The privacy statement at `privacy.html` accurately describes all network requests, all storage usage, and the GoatCounter analytics configuration.

---

### 5.3 Browser compatibility

**NFR-04** The tool must work in all major evergreen browsers.

Acceptance criteria:
- [ ] The tool is fully functional in Chrome and Edge on desktop, using the WebGPU ONNX Runtime Web execution provider for OCR acceleration.
- [ ] The tool is fully functional in Safari on desktop and Firefox on desktop, using the multi-threaded WASM execution provider.
- [ ] The tool is fully functional in Chrome on Android, using the WASM execution provider.
- [ ] The tool is fully functional in Safari on iOS and iPadOS, using the WASM execution provider. The WebGPU execution provider is not used on iOS even though `navigator.gpu` may be present, because the ONNX Runtime Web WebGPU backend is not supported on iOS.
- [ ] The build target is ES2022.

---

### 5.4 Performance and loading

**NFR-05** The tool must keep the initial page load fast and defer large downloads.

Acceptance criteria:
- [ ] The OCR module (`adapters/paddle-ocr.js`) and the OCR stack (`@gutenye/ocr-browser`, `onnxruntime-web`) are loaded through a dynamic `import()` call and are not included in the initial page bundle.
- [ ] pdfmake is lazy-loaded on the first PDF export call. It is not loaded on initial page load.
- [ ] The PaddleOCR model files and ONNX Runtime Web WASM binaries are served as static assets from `public/models/` and `public/ort/`. These directories are populated by `scripts/copy-models.mjs`, which runs automatically as a `postinstall`, `predev`, and `prebuild` hook.
- [ ] `public/models/` and `public/ort/` are gitignored and are never committed to the repository.
- [ ] The service worker caches model and runtime files in Cache Storage so that repeat visits load them without a network request.

---

### 5.5 Resilience

**NFR-06** The tool must degrade gracefully when optional features fail.

Acceptance criteria:
- [ ] If a file cannot be decoded or processed, the queue row for that file shows a "failed" stage badge with the error message. Other files in the batch continue processing.
- [ ] If the OCR engine fails to load, the model banner shows an error message. The drop zone remains available for a retry once the error is understood.
- [ ] If PDF generation fails, an alert dialog shows the error message. The app remains usable for further exports.
- [ ] If the service worker is unavailable (for example, on a host with restrictive headers), the model files are fetched fresh on each visit. The app continues to function.

---

### 5.6 Compliance

**NFR-07** The tool must meet the team's compliance baseline.

This is a constraint, not a user story.

1. Accessibility: WCAG 2.2 at AAA conformance (see NFR-01 and NFR-02 above).
2. Data protection: the tool collects no personal data. GoatCounter analytics do not collect personal data (see NFR-03 above). UK GDPR compliance is inherent in the architecture.
3. Security: the tool has no server and no user-submitted data processing on a server, so the OWASP Top 10 server-side categories do not apply. The client-side categories that do apply are:
   - A03 Injection: DOM manipulation uses `document.createElement` with text content properties, never `innerHTML` for user-derived content (filenames, detected text). This prevents cross-site scripting through injected markup.
   - A08 Software and Data Integrity Failures: the build process copies model files from `node_modules` into `public/` via a lock-file-pinned `npm install`. All dependencies are pinned in `package-lock.json`.
4. Licensing: every runtime and build-time dependency uses a permissive licence (MIT, Apache-2.0, BSD-3-Clause, ISC, Boost-1.0). There are no copyleft (GPL, LGPL, AGPL) packages. Redistribution must retain the Apache-2.0 `NOTICE` files for PaddleOCR and OpenCV.

---

## 6. Open questions for Tim

The following questions could not be answered from the source files. They are batched for Sonja to put to Tim. Sonja assigns the Q-number from the continuous sequence (next free is Q37).

- Q-number unset -- Feature direction: the tool currently detects text using PaddleOCR PP-OCRv4, a Chinese-first OCR model. Roman-script detection is supported but secondary. Is there a requirement to evaluate or switch to a Roman-script-first OCR engine, or is the current engine satisfactory for Tim's use cases?

- Q-number unset -- Vestibular checker branch: the open feature branch `claude/vestibular-checker-extension-O5NPm` has an unknown diff against `main`. Its purpose is not documented in the source files Tad was given. Before Jacob and Jed review the branch, should Tim confirm in one sentence what the vestibular checker feature is intended to do, so the reviewers can assess it against its intended goal?

- Q-number unset -- GoatCounter counter name: the analytics script in `index.html` and `privacy.html` points to `https://iccc.goatcounter.com/count`. Is this the live counter Tim is using, and is it already set up in the GoatCounter dashboard? This matters for the brief's note that ICCC is the implementation model for the wider analytics rollout.

- Q-number unset -- Target WCAG level for results: the tool audits images at both WCAG 2.2 AA and AAA. The CLAUDE.md file states the tool targets AAA for its own interface. Is the expectation that the tool reports both AA and AAA results for audited images, as it does today, or should it allow users to choose a target level?

- Q-number unset -- Export formats: the tool currently exports PDF and Markdown. Is there a requirement for any additional export format, such as JSON (for programmatic consumption) or CSV (for spreadsheet import)?
