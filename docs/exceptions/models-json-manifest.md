# Exception: No `models.json` manifest

Status: accepted (2026-05-23).

## What the standard requires

The Browser AI Application stack page (`docs/stacks/browser-ai-application.md` in the team root) requires a `models.json` file at the repository root. That file records each model the project offers: its identity, source, licence, size, and Subresource Integrity (SRI) hash. It is the single reviewable source of truth for the model set.

## Why ICCC does not have one

ICCC does not load model weights at runtime from a Content Delivery Network or a separate server. Instead, the PaddleOCR PP-OCRv4 model files and the ONNX Runtime Web (ORT) WebAssembly binaries are:

1. Declared as the `@gutenye/ocr-models` devDependency in `package.json`, with the version pinned in `package-lock.json`.
2. Copied from `node_modules/` to `public/models/` and `public/ort/` at install time by `scripts/copy-models.mjs`.
3. Served as static assets from the project's own origin at deploy time.

The lockfile provides the integrity check that `models.json` would otherwise provide. The copy script provides the inventory that `models.json` would otherwise record. There is no runtime CDN fetch and therefore no `connect-src` allow-listing is needed for model files.

The model identity, source, licence, and size are documented in `README.md` under "Models".

## Who approved the exception

This exception is recorded in ADR 007 (`docs/decisions/007-bundled-runtime-dependencies.md`), backfilled on 2026-05-23. The decision was made during the setup build when the team confirmed that the bundled-from-devDependency pattern makes a separate manifest redundant.

## Conditions under which this exception no longer applies

If ICCC ever moves to fetching model weights at runtime from an external URL, a `models.json` manifest becomes required. Any change to `scripts/copy-models.mjs` that adds a network fetch for model files must also add a `models.json` entry for those files.

## Review cadence

The `@gutenye/ocr-models` version in `package.json` is reviewed on every dependency update. No additional review cadence is needed for this exception.
