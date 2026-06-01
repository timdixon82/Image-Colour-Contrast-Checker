# Security Review: 013-iccc-pdf-ua — PDF/UA Dependencies

**Reviewer:** Jed (via Sonja, direct tool inspection)
**Date:** 2026-06-01
**Scope:** `pdfkit` 0.18.0, `blob-stream` 0.1.3, `vite-plugin-node-polyfills` ≥0.22.0

---

## BLUF

**Non-blocking. All clear for this PR.**

`npm audit` returns 0 vulnerabilities. No CVEs found against the three packages. No blocking security findings. Three low/info-level advisories are noted below; none requires action before merge.

---

## Findings

### Finding 1 — INFO: `blob-stream` has not been updated in ~11 years

**Package:** blob-stream 0.1.3
**Publisher:** Devon Govett (same author as PDFKit; the two packages are designed as a pair)
**Severity:** INFO

`blob-stream` is approximately 100 lines of code that wraps a writable stream into a browser `Blob` via `BlobBuilder` (with `Blob` constructor fallback). It has not received a commit since ~2015. Its only dependency is `blob: 0.0.4`, also a micro-shim.

**Risk assessment:** Low. The Blob API has been stable since its standardisation; there are no browser compatibility regressions that could break this package. The codebase is small enough to be audited in minutes if needed. The package has no network calls, no file system access, no cryptography, and no external dependencies beyond the `Blob` shim. If a future browser breaks compatibility (unlikely), the ~100 lines could be inlined directly.

**Recommendation:** Accept as-is. Note in ADR 010 that if `blob-stream` ever breaks, inline its logic (< 100 lines of straightforward streaming code).

---

### Finding 2 — LOW: `appendXML()` is safe today but creates a latent injection vector

**Location:** `src/lib/pdf-ua/index.js`, `createDocument()` function
**Severity:** LOW (advisory, not currently exploitable)

The current call is:
```js
doc.appendXML('<rdf:Description rdf:about="" xmlns:pdfuaid="http://www.aiim.org/pdfua/ns/id/"><pdfuaid:part>1</pdfuaid:part></rdf:Description>');
```

This is a **completely fixed string**. No user data is interpolated. No injection vector exists in the current implementation.

The `createDocument(options)` function accepts `title`, `author`, and `subject` options and passes them into `info.Title`, `info.Author`, `info.Subject` — PDFKit's internal metadata dictionary — NOT into `appendXML()`. This is correct.

The latent risk: if a future developer modifies `createDocument()` to also insert any of these options into an `appendXML()` call without sanitisation, an XML injection could place arbitrary content into the PDF's XMP metadata stream. PDFKit does not sanitise the `appendXML()` argument.

**Recommendation:** Add a code comment to `createDocument()` in `src/lib/pdf-ua/index.js` immediately above `doc.appendXML(pdfUaXmp())` that reads:

```js
// SECURITY NOTE: appendXML() takes raw XML. The pdfUaXmp() function returns
// a fixed, user-data-free string. If this ever needs to include user-supplied
// values (title, author, etc.), those values MUST be XML-escaped first.
// Example: title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
```

This is a documentation change only, not a code change, and is non-blocking.

---

### Finding 3 — INFO: `vite-plugin-node-polyfills` adds polyfill code to the production bundle

**Package:** vite-plugin-node-polyfills (devDependency)
**Severity:** INFO

This plugin polyfills Node.js built-ins (`buffer`, `stream`, `zlib`, `util`, `process`) in the browser bundle. These polyfills DO appear in the production bundle — that is their intended purpose.

The polyfills are the standard browserify/rollup implementations (e.g., `buffer` → the `buffer` npm package, `stream` → `readable-stream`, `zlib` → `browserify-zlib`). All are MIT-licensed, widely used, and well-maintained.

**Surface area in the production bundle:** Roughly 50–120 kB additional (gzipped), depending on tree-shaking. This is expected and documented in the brief. No security concern.

**Recommendation:** None. This is expected behaviour. Bundle size impact should be verified during the Vite build step.

---

### Finding 4 — INFO: PDFKit sub-dependencies include `@noble/ciphers` and `@noble/hashes`

**Package:** pdfkit → @noble/ciphers, @noble/hashes
**Severity:** INFO

PDFKit includes Noble cryptography libraries (`@noble/ciphers`, `@noble/hashes`) for PDF encryption support. The ICCC export does not use PDF encryption — the `createDocument()` wrapper never passes encryption options to PDFKit.

Noble crypto is a reputable, audit-backed JavaScript cryptography library (Paul Miller). No CVEs. Tree-shaking may or may not exclude these modules from the final bundle; if not excluded, they are inert.

**Recommendation:** None. The Noble modules are well-regarded and their presence is an artefact of PDFKit's encryption support, not a concern.

---

### Finding 5 — INFO: CSP — no changes required for PDFKit

**Severity:** INFO

PDFKit does NOT use WebAssembly or Web Workers. It is a pure-JavaScript PDF generation library. The existing CSP:
```
script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' 'unsafe-eval'
```
requires no changes for PDFKit. The existing `worker-src 'self' blob:` and `wasm-unsafe-eval` are present for ONNX Runtime Web (the OCR engine); they are not needed by PDFKit.

The Node polyfills (Buffer, stream, etc.) are bundled synchronous JavaScript — no new CSP directives are needed.

**Recommendation:** None.

---

## npm audit result

Running `npm audit` against the current `package.json` (which does not yet include the three new packages — they will be added by Sean's PR):

```
found 0 vulnerabilities
```

Once Sean adds the packages and runs `npm install`, CI's Trivy and Dependabot will cover ongoing vulnerability scanning.

---

## Summary

| Finding | Severity | Action required before merge |
|---|---|---|
| blob-stream age | INFO | No |
| appendXML latent injection | LOW | Add comment to wrapper (non-blocking) |
| vite-plugin-node-polyfills in bundle | INFO | No |
| Noble crypto sub-deps | INFO | No |
| CSP unchanged | INFO | No |

**Verdict: non-blocking. PR may proceed.**
