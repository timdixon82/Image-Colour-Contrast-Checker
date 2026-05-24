# ADR 001: Client-side-only browser application, no server

Status: accepted (backfilled 2026-05-23).

## Context

Image Colour Contrast Checker (ICCC) audits screenshots for WCAG colour-contrast problems. Screenshots commonly carry confidential interface designs, internal product names, and customer data. A core goal is privacy: the user's image must not leave their device. A second goal is that the tool needs no account and no setup.

## Decision

Build the whole application as static files (HyperText Markup Language, Cascading Style Sheets, JavaScript) that run entirely in the browser. Use no server, no database, and no server-side language. Run the Optical Character Recognition (OCR) pipeline on the device through ONNX Runtime Web. Hold all analysis state in JavaScript memory; persist only one preference (`td-theme`) to `localStorage`.

## Alternatives considered

- A client-server application with a backend OCR service. Rejected: a server that can see the user's screenshots breaks the privacy goal and adds hosting and operational cost.
- A desktop application (for example an Electron wrapper). Rejected: it needs installation, which the no-setup goal rules out, and it is far heavier to build and ship.

## Consequences

The privacy goal is met by construction: with no server there is nowhere for image data to go. Hosting is cheap and simple (see ADR 008). The cost is browser-side: the visitor's device runs the full machine-learning pipeline, which is fine on a modern desktop and acceptable on a phone but excludes very old devices. The privacy promise is load-bearing: no later change may send image bytes, OCR detections, or contrast results off the device without a new ADR superseding this one.
