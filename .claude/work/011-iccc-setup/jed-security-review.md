# Security Review: Image-Colour-Contrast-Checker

Reviewer: Jed (security agent)
Date: 2026-05-23
Repository: timdixon82/Image-Colour-Contrast-Checker, branch main
Standards: OWASP Top 10 (2021 edition); UK General Data Protection Regulation (UK GDPR)

---

## Summary

Image-Colour-Contrast-Checker (ICCC) is a static browser application. It decodes images, runs OCR using PaddleOCR PP-OCRv4 through ONNX Runtime Web, measures WCAG contrast ratios, and produces a report. All of this computation runs entirely inside the user's browser. No image data, pixel data, or OCR result is transmitted to any server at any point. The privacy claim on the landing page and in `privacy.html` is accurate and verifiable from the source code.

The security surface of a client-side-only browser application is genuinely narrow. The chief risks in this class of application are cross-site scripting through unsafe DOM manipulation, supply-chain compromise through third-party scripts loaded without Subresource Integrity (SRI) checks, and misconfigured headers. ICCC has one confirmed medium finding (no Content Security Policy), one low finding (GoatCounter script loaded without an SRI hash), and a small informational note on the service-worker registration flow. No high-severity findings were identified.

---

## 1. OWASP Top 10 Mapping

### A01 Broken Access Control

Not applicable. There is no server, no user account system, and no shared data store. Each user's data stays in their own browser instance. There is no mechanism by which a user could access data belonging to another user.

The service worker at `public/sw.js` handles cache management for the model and runtime files. It is scoped to same-origin requests and applies cache-first logic only to paths matching `/models/` or `/ort/`. Cross-origin isolation headers (Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy) are injected on every response by the service worker, not stored in the cache. This is the correct approach: headers are applied fresh at serve time so they cannot be poisoned from stale cache entries.

Defence: adequate. The cache scope is narrow and correctly anchored to the application's own origin.

### A02 Cryptographic Failures

No cryptographic operations are performed by the application. The localStorage value stores only the theme preference (`td-theme`, set to `'light'` or `'dark'`). No user content, no credentials, and no session tokens are persisted anywhere. There is nothing to protect cryptographically.

Defence: not applicable.

### A03 Injection

ICCC constructs all DOM output using `document.createElement`, property assignment (`.textContent`), and manual DOM appending. It does not use `innerHTML` to render user-supplied data anywhere except in two controlled locations examined below.

The first location is `renderResultsHeader` in `src/ui/report-view.js`. The `disc.innerHTML` assignment at lines 23 to 28 inserts a hard-coded SVG icon and then the string `DISCLAIMER_TEXT` imported from `src/export/strings.js`. `DISCLAIMER_TEXT` is a compile-time constant, not user input. No injection is possible through this path.

The second location is `resultLine.innerHTML` in `renderImageCard` at line 132. This line inserts the verdict badge string (a compile-time constant from `verdictBadge()`) and the output of `escapeHtml(report.detail)`. The `escapeHtml` helper at lines 244 to 248 correctly escapes the five HTML special characters (`&`, `<`, `>`, `"`, `'`). The `report.detail` string is built entirely from internal data: colour hex values computed from pixel data, floating-point contrast ratios, and OCR text. OCR text comes from user-supplied images, not from a URL parameter or a form field, so the injection surface is constrained and the escaping is appropriate.

The `bgCell.innerHTML` and `fgCell.innerHTML` assignments at lines 172 and 175 insert `<code>` elements containing hex colour values. These hex values come from `rgbToHex` in `src/core/contrast.js`, which constructs them by formatting integers, not by passing through any external string. The values are always in the form `#RRGGBB` with six uppercase hexadecimal digits. No injection is possible.

The OCR adapter at `src/adapters/paddle-ocr.js` passes a blob URL to `ocr.detect(url)`. The blob URL is created by `URL.createObjectURL(blob)` in `main.js` line 139 and revoked immediately after use in the `finally` block at line 160. The blob URL is the browser-generated handle for an in-memory byte array. It is not a user-controlled string and cannot be manipulated to reach an unexpected server.

A search of all source files found no use of `eval`, dynamic script evaluation, unsafe DOM write APIs, or framework-level unsafe HTML insertion APIs.

Defence: good. The two `innerHTML` uses are guarded: one uses a compile-time constant; the other uses `escapeHtml` on user-influenced data. The hex-colour `innerHTML` uses are safe by construction.

### A04 Insecure Design

The privacy architecture is sound by design. Images are decoded client-side using `createImageBitmap`, drawn to a canvas, and passed to the OCR adapter as a blob URL. The blob URL is a local reference to in-memory data. It is never sent across the network. After analysis, it is revoked with `URL.revokeObjectURL` in a `finally` block, releasing the memory.

The OCR pipeline uses ONNX Runtime Web with a WebAssembly (WASM) backend as the default, or WebGPU on supported non-Apple-mobile browsers. Both backends are local execution engines. The model files are pre-downloaded and cached by the service worker from the application's own origin (`image-colour-contrast-checker.timdixon.net` per `privacy.html`; `CLAUDE.md` gives the canonical GitHub Pages URL). No prompt or image data is sent to an external model provider.

The consent flow for the initial model download is handled by the preloader, which blocks interaction through the `inert` attribute on the `<main>` element until the models are ready. This is a good pattern: the user sees the download progress and the privacy notice before the tool becomes interactive.

Defence: good. Privacy by design is implemented at the architecture level, not bolted on.

### A05 Security Misconfiguration

No Content Security Policy (CSP) is present. This is the first medium-severity finding, described in detail in section 4 below.

The Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy headers needed for `SharedArrayBuffer` and multi-threaded WASM are delivered by the service worker, not by the HTTP server. This is an acceptable approach for GitHub Pages, which does not allow custom response headers. The Vite development server at `vite.config.js` lines 22 to 25 sets these headers directly for local development.

The `Referrer-Policy` is not explicitly set. Without it, the browser applies `strict-origin-when-cross-origin` in modern browsers, which sends the origin but not the full URL to cross-origin destinations. This is acceptable but an explicit declaration is a defence-in-depth measure.

No `Permissions-Policy` is set. Not a vulnerability; noted for completeness.

Defence: partial. The cross-origin isolation headers are in place. A CSP is the main gap.

### A06 Vulnerable and Outdated Components

All application dependencies are declared in `package.json` and resolved through `package-lock.json`. There are three runtime dependencies: `@gutenye/ocr-browser` at `^1.4.8`, `onnxruntime-web` at `^1.26.0`, and `pdfmake` at `^0.2.10`. There are two development dependencies: `@gutenye/ocr-models` at `^1.4.2` and `vite` at `^5.4.10`.

All dependencies use caret ranges, which permit patch and minor updates. This is a reasonable approach for a project with no back-end surface. The lock file pins exact versions at install time.

The GoatCounter analytics script is loaded from `gc.zgo.at/count.js` at runtime. It is not pinned to a version and has no SRI hash. This is the low-severity finding described in section 4 below.

No CDN-loaded runtime scripts other than GoatCounter are present. All application JavaScript is bundled by Vite and served from the same origin.

The ONNX Runtime Web binaries are copied from `node_modules/onnxruntime-web/dist` to `public/ort/` by the `scripts/copy-models.mjs` build script and served from the application's own origin. They are not fetched from a third-party CDN at runtime. This is a good pattern: the binaries are version-pinned at install time and served from the same origin, reducing the supply-chain surface.

Defence: good, with one gap (GoatCounter SRI hash).

### A07 Identification and Authentication Failures

Not applicable. There are no accounts, sessions, tokens, or authentication flows.

### A08 Software and Data Integrity Failures

Related to the A06 finding. The GoatCounter script is the one dependency loaded from an external source without an integrity hash. If `gc.zgo.at` served a compromised `count.js`, the browser would execute it. GoatCounter is a legitimate, widely used privacy-friendly analytics service. The risk is low in practice but the mitigation is simple.

The ONNX Runtime Web binaries and PaddleOCR model files are served from the application's own origin after being copied from `node_modules/` at build time. They are integrity-protected indirectly by the lock file. No SRI hash is generated for these files because they are served from the same origin and treated as first-party assets.

Defence: partial. GoatCounter is the gap; all other dependencies are either first-party assets or pinned through the lock file.

### A09 Security Logging and Monitoring Failures

Not applicable. This is a client-side static application. There is no server-side logging or monitoring. The application uses `console.error` in two places: in `warmOcr()` at `main.js` line 76, and in the service worker at `sw.js` line 107. Neither logs any user content or personally identifiable information.

### A10 Server-Side Request Forgery

Not applicable. There is no server.

---

## 2. GoatCounter Privacy Posture

### What is collected

The privacy statement at `privacy.html` (section "No accounts, and privacy-friendly analytics only") describes GoatCounter's data collection accurately. GoatCounter:

- Sets no cookies.
- Collects no personal data in the sense of individual profiles.
- Records aggregate, anonymous information: page visited, referring site, a rough browser and screen-size profile.
- Uses the visitor's IP address briefly to derive an approximate country and then discards it; the IP is never stored.

This description is consistent with GoatCounter's published data practices.

### GoatCounter tracker URL

Both `index.html` (line 155) and `privacy.html` (line 156) load the analytics script with `data-goatcounter="https://iccc.goatcounter.com/count"`. The counter URL is `iccc.goatcounter.com`. Decision record D13 states: every project uses `timdixon82.goatcounter.com` except ICCC, which keeps its own counter. The URL in the code matches D13. No discrepancy.

### Whether a UK GDPR consent banner is needed

GoatCounter does not set cookies and does not collect data that would, on its own, constitute personal data under UK GDPR Article 4(1). The IP address is used transiently for geolocation and is not stored. The aggregate data GoatCounter retains (page, referrer, browser type, screen size, country) is not linked to an identified or identifiable individual.

The Privacy and Electronic Communications Regulations 2003 (PECR), which govern cookie consent in the United Kingdom, apply to cookies and similar tracking technologies. GoatCounter does not use cookies or equivalent tracking mechanisms. PECR consent is therefore not required.

The UK GDPR lawful basis for the residual processing (transient IP handling by GoatCounter for country derivation) is Article 6(1)(f) legitimate interests: Tim has a legitimate interest in understanding how the tool is used, and the processing is minimal, temporary, and does not affect user rights. No consent is required.

Conclusion: a consent banner is not required for the GoatCounter integration as currently implemented. The privacy statement is accurate and sufficient.

---

## 3. UK GDPR Considerations

### Personal data processed

No personal data is collected or processed by the application itself. The following verifications support this.

Images uploaded by the user are decoded in the browser using `createImageBitmap` and processed entirely in client-side WASM and JavaScript. The pixel data, OCR text, and contrast results never leave the browser. The application does not transmit images or results to any server.

The only value persisted to `localStorage` is the theme preference under the key `td-theme`, set to `'light'` or `'dark'`. This is not personal data.

The GoatCounter analytics data is described under section 2. It is aggregate and anonymised. GoatCounter acts as the data processor; Tim Dixon acts as the data controller for the analytics relationship. GoatCounter's published terms include a Data Processing Agreement for this relationship.

### Data-subject rights surface

Because no personal data is held server-side by the application, there is no data-subject rights surface to operate. Users can clear their `localStorage` at any time through the browser's developer tools or privacy settings.

### Summary

The application's privacy-by-design architecture means that UK GDPR obligations are essentially limited to the GoatCounter analytics relationship, which is handled adequately by GoatCounter's own privacy practices and published terms. No additional technical controls are required.

---

## 4. Findings and Recommendations

### Finding 1: No Content Security Policy (medium severity)

OWASP category: A05 Security Misconfiguration.

Neither `index.html` nor `privacy.html` has a Content Security Policy header or meta tag. Without a CSP, if a future change introduced an XSS vulnerability, the browser would place no restriction on what scripts could execute or what origins could be contacted. The `connect-src` directive is the most protective element for this application: it would block data exfiltration through unexpected network requests.

How to reproduce: Open the browser developer tools and inspect the response headers or the document head on any page load. No CSP is present.

Recommended fix: Add a `<meta http-equiv="Content-Security-Policy">` tag to the `<head>` of both `index.html` and `privacy.html`. An appropriate policy for ICCC:

```
default-src 'none';
script-src 'self' 'unsafe-inline' https://gc.zgo.at;
style-src 'self' 'unsafe-inline';
font-src 'self';
connect-src 'self' https://gc.zgo.at https://iccc.goatcounter.com;
img-src 'self' blob: data:;
worker-src 'self' blob:;
child-src blob:;
```

Notes on the directives:

- `script-src 'self'` covers the Vite-bundled application JavaScript.
- `'unsafe-inline'` is required by the inline theme-detection script in `<head>` and by the GoatCounter inline snippet. A future improvement would be to move the theme script to a hash-based or nonce-based approach to allow tightening this directive.
- `https://gc.zgo.at` is the GoatCounter script host.
- `connect-src` includes both `gc.zgo.at` (for the analytics ping) and `iccc.goatcounter.com` (the data endpoint). All model and runtime files are served from `'self'`, so no external connect is needed for them.
- `worker-src 'self' blob:` covers both the service worker and any WASM Web Workers created by ONNX Runtime Web.

### Finding 2: GoatCounter script loaded without Subresource Integrity hash (low severity)

OWASP category: A06 Vulnerable and Outdated Components; A08 Software and Data Integrity Failures.

Both HTML files load the GoatCounter script without `integrity` or `crossorigin` attributes. The script is loaded over an unversioned URL at `//gc.zgo.at/count.js`. If `gc.zgo.at` were compromised or served a different version of `count.js`, the browser would execute it without complaint.

How to reproduce: Inspect the GoatCounter script tag in either HTML file. No `integrity` attribute is present.

Recommended fix: GoatCounter publishes a versioned copy of `count.js`. Pin to a specific versioned URL, download it, generate a SHA-384 hash, and add the `integrity` and `crossorigin="anonymous"` attributes. The hash can be generated with the command `openssl dgst -sha384 -binary count.v1.1.js | openssl base64 -A`. Add the resulting `integrity="sha384-<computed-hash>"` and `crossorigin="anonymous"` attributes to the script tag in both HTML files. The CSP fix in Finding 1 is complementary: `connect-src` controls where data can be sent, while the SRI hash controls whether the script itself is authentic.

---

## 5. Open Feature Branch Note

The feature branch `claude/vestibular-checker-extension-O5NPm` has not been reviewed in this dispatch. It will be reviewed in a separate follow-up dispatch, as specified in the brief. The branch carries an AI-session naming convention and has no pull request; the brief notes this as an unfamiliar provenance and flags it as a potential security concern. The follow-up dispatch will cover the full diff of that branch against `main`.

No code from that branch has been included in this review.

---

## 6. Third-Party Resources

All application JavaScript is bundled by Vite and served from the application's own origin. The ONNX Runtime Web binaries and PaddleOCR model files are copied from `node_modules/` to `public/` at build time and served from the same origin. No external CDN is used for application code.

The only third-party runtime request is the GoatCounter analytics script from `gc.zgo.at`, which is the subject of Finding 2.

No external fonts or stylesheets are loaded from third-party origins. The self-hosting pattern is correct for privacy hygiene.

---

## 7. Untrusted Input Handling

The application's only sources of externally controlled input are image files selected or dropped by the user. Image files are decoded by the browser's built-in `createImageBitmap` API and never passed through the application's own parsing code as raw bytes. The decoded pixel data is processed by the pure-math functions in `src/core/contrast.js`, which perform arithmetic on integer values derived from pixel channels. No string parsing, no network request, and no DOM manipulation occurs on raw image data.

OCR text produced by PaddleOCR is the only user-influenced string that passes through the DOM rendering path. It is used in two ways:

1. As the `entry.filename` field (set from `file.name` at `main.js` line 103), rendered with `.textContent` in the queue row and card title. `.textContent` does not parse HTML. No cross-site scripting is possible.
2. As `p.examples` entries in the results table, rendered with `.textContent` at `report-view.js` line 198. Again, `.textContent` is safe.

The one `innerHTML` use that involves user-influenced data is `resultLine.innerHTML` at `report-view.js` line 132, which wraps `report.detail` in `escapeHtml()`. The `report.detail` string is constructed in `src/core/analyse.js` from contrast ratios and colour hex values, not from raw OCR text. The `escapeHtml` function covers all five HTML special characters. No injection is possible through this path.

The Markdown export in `src/export/markdown.js` interpolates OCR example words (`p.examples`) into a Markdown string. This string is written to a downloaded `.md` file and is never inserted into the DOM. No cross-site scripting risk arises from this.

---

## 8. Exceptions

No security exceptions are raised for this review. Finding 1 (absent CSP) and Finding 2 (GoatCounter without SRI) are recommendations for Sean to implement. Neither is a blocking concern that requires Tim's approval to accept as a formal exception.

---

## 9. Open Security Questions for Tim

The following questions are batched for Sonja to number and put to Tim.

- Q-number unset: GoatCounter Data Processing Agreement status. GoatCounter's published terms include a Data Processing Agreement. Has this been signed or acknowledged for the `iccc.goatcounter.com` account? This is a UK GDPR consideration when a data processor (GoatCounter) handles data on behalf of a data controller (Tim Dixon), even where the data is aggregate and anonymised.

---

## 10. Cross-Cutting Notes for Sonja

The following items may be worth promoting to the global wiki, subject to Sonja's decision.

1. The pattern of vendoring all binary assets (ONNX Runtime Web WASM and PaddleOCR model files) from `node_modules/` into `public/` at build time, serving them from the application's own origin, is a strong supply-chain hygiene pattern for Browser AI Application projects. This avoids runtime CDN fetches for large binary dependencies and keeps them under lock-file version control. Jacob has already flagged this as a candidate cross-cutting pattern; this review supports that flag.

2. The `escapeHtml` helper in `src/ui/report-view.js` is a clean, minimal five-character HTML escaper suitable for use in any project that constructs DOM content with `innerHTML`. It is worth noting in the global wiki's coding-standards page as the reference implementation for inline HTML escaping in vanilla JavaScript projects.

Both items are flagged for Sonja's promotion decision.
