# Security Exception: `unsafe-eval` and `wasm-unsafe-eval` in Content Security Policy

Status: accepted with risk.

Approval: Tim Dixon, 2026-05-23, Q67B ("option b - both").

Sign-off: Sonja (orchestrator), acting on Tim's express approval, 2026-05-23.

## Directive change

The `script-src` directive in the Content Security Policy (CSP) meta tag in `index.html` and `privacy.html` has been widened from:

```
script-src 'self' 'unsafe-inline'
```

to:

```
script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' 'unsafe-eval'
```

All other directives are unchanged. The full CSP is:

```
default-src 'none';
script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
font-src 'self';
connect-src 'self' https://iccc.goatcounter.com;
img-src 'self' blob: data:;
worker-src 'self' blob:;
child-src blob:;
frame-ancestors 'none';
```

## Runtime reason

ONNX Runtime Web (ORT Web), used by the `@gutenye/ocr-browser` wrapper that runs PaddleOCR PP-OCRv4 in the browser, performs runtime JavaScript evaluation as part of its WebAssembly (WASM) bootstrap. This is not configurable by the caller. Without `'wasm-unsafe-eval'` and `'unsafe-eval'`, the browser blocks the ORT Web initialisation script, the OCR engine does not load, and the tool is broken. The requirement is documented upstream in the ONNX Runtime Web project; all browser-side WASM runtimes that use dynamic code generation are subject to the same constraint.

ADR 003 records the decision to use PaddleOCR PP-OCRv4 via `@gutenye/ocr-browser` and ORT Web. ADR 007 records the decision to bundle all runtime dependencies on the application's own origin. See also [ADR 003](../decisions/003-paddleocr-onnx-runtime-web.md) and [ADR 007](../decisions/007-bundled-runtime-dependencies.md).

## Threat-surface analysis

The two added tokens expand the surface available to script execution. The risk is bounded by the following constraints.

ICCC loads no remote scripts. All JavaScript libraries and the GoatCounter analytics snippet are vendored or self-hosted on the application's own origin. The `script-src` directive does not allow any external origin. Only scripts already on `self` can run.

The GoatCounter analytics script (`public/analytics/count.js`) is self-hosted from the same origin, as recorded in ADR 009. The only outbound network traffic the application generates is the GoatCounter analytics ping to `iccc.goatcounter.com`. This is explicitly allow-listed in the `connect-src` directive and nowhere else. There is no `script-src` allow for `iccc.goatcounter.com` or any other remote host.

There is no user-generated markup, no `innerHTML` write from external data, and no dynamic `script` element construction in the application code. The `eval`-style surface opened by `'unsafe-eval'` can only be reached by code already served from the application origin.

The `'wasm-unsafe-eval'` token is the narrower of the two: it permits WASM compilation paths only. The `'unsafe-eval'` token covers the remaining JS evaluation paths ORT Web uses. Both tokens are commonly required by browser-side WASM runtimes; they are explicitly acknowledged as a trade-off in the OWASP Content Security Policy Cheat Sheet.

The `frame-ancestors 'none'` directive prevents the application from being embedded in an iframe, removing the most common clickjacking vector that an `eval`-permissive CSP would otherwise amplify.

## Risk-acceptance rationale

The alternative to accepting these two tokens is one of:

1. Replace the OCR library with one that does not require runtime evaluation. No known browser-side OCR library of comparable accuracy (PaddleOCR PP-OCRv4 via ORT Web) avoids this requirement. An investigation to find an alternative is estimated at several weeks of work and carries a significant risk of capability regression.

2. Move the OCR to a server-side component. This contradicts ADR 001 (client-side-only browser application, no server) and the core privacy posture of ICCC. A server-side change would require a new architecture decision, infrastructure provisioning, and a complete privacy statement rewrite.

Given that ICCC loads no remote scripts, the `connect-src` allow-list is narrow, and the `eval`-able surface is confined to vendored code already on the application origin, the team judges that the residual attack vector is not material. The risk is accepted. This exception must be reviewed if the application ever loads remote scripts or widens `connect-src` beyond `https://iccc.goatcounter.com`.

## Cross-references

- [ADR 003: PaddleOCR PP-OCRv4 via `@gutenye/ocr-browser` and ONNX Runtime Web](../decisions/003-paddleocr-onnx-runtime-web.md): records the decision to use ORT Web.
- [ADR 007: Bundled runtime dependencies](../decisions/007-bundled-runtime-dependencies.md): records that all dependencies are self-hosted.
- [ADR 009: GoatCounter analytics on a per-project counter, self-hosted script](../decisions/009-goatcounter-analytics.md): records that the GoatCounter script is self-hosted and the `connect-src` allow-list is limited to `iccc.goatcounter.com`. The CSP consequences section of that ADR notes that `script-src` does not allow `gc.zgo.at`; this exception adds the two eval tokens to the same `script-src` directive.
- [GitHub Pages security-header gap](github-pages-headers.md): the standing exception covering the inability to set server-level CSP headers on GitHub Pages. The meta-tag CSP recorded here is the compensating control.
