# Spike: would Tesseract.js improve the project?

Date: 2026-11-24. Outcome: closed, no change.

Tesseract.js 7.0.0 was compared with the current PaddleOCR PP-OCRv4 engine on six project images, with Paddle run in real Chromium and Tesseract in Node. Paddle read the key values on the full screenshot and on small crops, where Tesseract gave junk or nothing. Both engines truncated some long labels. Tesseract is smaller to download (about 6 to 14 MB against about 30 to 44 MB for Paddle, mostly the ONNX runtime), and the models are cached after the first visit. Not measured: Paddle cold start, and Tesseract in the same browser. Verdict: keep Paddle. Revisit Tesseract only as an optional fallback if a real failure or a language request appears. Raw notes were in the session scratchpad.
