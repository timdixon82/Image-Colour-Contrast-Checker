# Session Handoff — 2026-06-01

## Tim-facing tasks open

No formal task substrate in this project yet. One open action item:

- [ ] PR #24 (`feat/pdf-ua-rewrite`) — browser PDF export is broken. Root cause
  of "Not a supported font format or standard PDF font." not yet resolved.
  **Do not merge until PDF export works end-to-end in a browser.**

---

## What happened this session

Tim did a live review of PR #24 (`feat/pdf-ua-rewrite`, v0.4.2) at
`http://localhost:5173/`. Three browser runtime errors were found and partially
fixed. The PR is **not ready to merge**.

### Error 1 — FIXED
**`js-clipper has no default export`**

`@gutenye/ocr-common` does `import clipper from 'js-clipper'` (default import),
but js-clipper is CJS (`module.exports = ClipperLib`). The `fix-non-utf8-deps`
Vite plugin now wraps the content with a CJS shim and `export default module.exports`.

### Error 2 — FIXED
**`__dirname is not defined`**

PDFKit's `initFonts()` defaults to loading Helvetica on document creation, which
hits `fs.readFileSync(__dirname + '/data/Helvetica.afm')`. In the browser,
`__dirname` is not defined. Two fixes applied:
- `font: null` passed to `new PDFDocument({...})` in `src/lib/pdf-ua/index.js`
  to suppress the Helvetica default entirely.
- `define: { __dirname: '', __filename: '' }` added to `vite.config.js` as
  belt-and-suspenders for any remaining pdfkit `__dirname` references.

### Error 3 — UNRESOLVED
**`PDF export failed: Not a supported font format or standard PDF font.`**

This is pdfkit's error from `PDFFontFactory.open` when `font == null`, which
means `src instanceof Uint8Array` AND `src instanceof ArrayBuffer` both returned
false. Three approaches tried in this session, all failing:

| Attempt | `loadFonts()` browser return | Result |
|---|---|---|
| 1 | `Buffer.from(arrayBuffer)` (original) | fail |
| 2 | `new Uint8Array(arrayBuffer)` | fail |
| 3 | raw `ArrayBuffer` from fetch | fail |

**Current state** (committed): `loadFonts()` returns raw `ArrayBuffer` objects.

---

## Root cause — IDENTIFIED by Carol's live smoke test

**PDFKit's `deepClone` destroys ArrayBuffer objects.**

`doc.table()` → `normalizeCell` → `deepMerge({}, ..., cell.font)` → `deepClone(ArrayBuffer)`.
`deepClone` sees `typeof arrayBuffer === 'object'`, creates `{}`, iterates
`for (const key in arrayBuffer)` — ArrayBuffer has no enumerable keys — returns `{}`.
`normalizeCell` then calls `doc.font({})`. `PDFFontFactory.open` gets `{}`, which is
neither string, Uint8Array nor ArrayBuffer → `font == null` → the error.

**The bug is invisible in Vitest** because the Node.js branch of `loadFonts()` returns
string file paths, and `deepClone('string')` returns the string unchanged.

## The fix — one change, seven sites

In `src/export/pdf.js`, replace every `font: { src: fonts.medium }` with
`font: { src: 'Medium' }`. The string `'Medium'` is the registered name set by
`createDocument` via `registerFont`. It resolves through `_registeredFonts` before
`deepClone` is involved. Strings survive `deepClone` intact.

Lines to change: **206, 207, 294, 295, 296, 297, 303** — all are `font: { src: fonts.medium }`.

No other changes needed. The ArrayBuffer font loading path itself is fine.

After Sean applies the fix, Carol must run a live browser smoke test (not just Vitest)
to confirm — the Vitest suite cannot catch this class of bug.

## What the next session must investigate

### Step 1 — Get a full stack trace

The single most important thing is to see WHERE pdfkit throws, not just the
message. Open the browser DevTools console before clicking PDF export. Look for:
- The full stack trace of the thrown error
- Any font fetch errors (`/fonts/Roboto-Regular.ttf`)
- Any warnings about "Module 'fs' has been externalized"

### Step 2 — Check font fetch response

In DevTools Network tab, filter for `Roboto`. When PDF export is clicked, do
requests to `/fonts/Roboto-Regular.ttf` and `/fonts/Roboto-Medium.ttf` appear?
What status codes do they return? What is the response Content-Type?

### Step 3 — Verify font: null actually suppressed Helvetica

The `font: null` fix should prevent `doc.font('Helvetica')` during init. If the
stack trace still shows `StandardFont` or `AFMFont` in the trace, the fix isn't
working and pdfkit is somehow still calling the Helvetica path.

### Step 4 — Try a minimal test

Add a temporary `console.log` to `loadFonts()` in `src/export/pdf.js`:
```js
console.log('fonts loaded:', typeof _fonts.regular, _fonts.regular?.constructor?.name, _fonts.regular?.byteLength);
```
This will confirm whether the ArrayBuffer arrived and how large it is.

### Step 5 — Alternative font approach to try

If the ArrayBuffer path still fails, try fetching the font and passing it as a
base64-decoded `Uint8Array` directly inlined — or try Vite's `?url` import:

```js
import robotoRegularUrl from '/fonts/Roboto-Regular.ttf?url';
// Then fetch(robotoRegularUrl).then(r => r.arrayBuffer())
```

### Step 6 — Check pdfkit's table font path

A secondary suspect: `doc.table()` in `pdf.js` passes `fonts.medium` directly
in cell objects as `{ font: { src: fonts.medium } }`. Inside pdfkit's
`normalizeCell`, `doc.font(arrayBuffer, undefined)` is called. This is a
different code path than registered-font lookup — verify it also works.

---

## File state at session end

| File | Change |
|---|---|
| `vite.config.js` | js-clipper ESM wrap; `define: {__dirname, __filename}`; blob-stream include |
| `src/lib/pdf-ua/index.js` | `font: null` in PDFDocument options |
| `src/export/pdf.js` | Browser branch returns raw `ArrayBuffer` (not Buffer/Uint8Array) |
| `.claude/work/013-iccc-pdf-ua/log.md` | Updated |
| `.claude/work/013-iccc-pdf-ua/carol-test-pass-pr24.md` | Carol's prior static test pass |

All changes committed to `feat/pdf-ua-rewrite` (commit `20d6039`).

## Carol re-test

Carol was dispatched for a live browser smoke test during this session (background
agent). Her results may appear in `.claude/work/013-iccc-pdf-ua/` — check for
any new file there at the start of the next session.

## PR #24 gate

All 7 CI checks pass. Carol's static review passed. But **browser runtime is
broken**. The merge gate must not be opened until PDF export works in a browser.
