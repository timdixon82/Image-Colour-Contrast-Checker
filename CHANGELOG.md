# Changelog

## [0.4.0](https://github.com/timdixon82/Image-Colour-Contrast-Checker/compare/v0.3.0...v0.4.0) (2026-05-31)


### Features

* **markdown:** embed colour swatch inline in &lt;summary&gt; for at-a-glance colour preview ([ad82789](https://github.com/timdixon82/Image-Colour-Contrast-Checker/commit/ad827892722e54e7cfdf53db4b99b3769190b522))
* **markdown:** expand all colour-pair details blocks by default ([3483ed0](https://github.com/timdixon82/Image-Colour-Contrast-Checker/commit/3483ed002d71c78c695da39f69aeeae7b649934d))
* **report:** rename Check column to External Checkers, add layout alignment ([9db4bf1](https://github.com/timdixon82/Image-Colour-Contrast-Checker/commit/9db4bf1e45cfff6f62c4d5b27c8a1f6bef68ac9d))
* **ui:** move 'What the checks mean' above drop zone, collapsed by default ([393c341](https://github.com/timdixon82/Image-Colour-Contrast-Checker/commit/393c3416b61545fbca02605d51ef094d0b4a76fc))


### Bug Fixes

* **export:** correct section order, blank page, and wording in PDF and Markdown ([c561744](https://github.com/timdixon82/Image-Colour-Contrast-Checker/commit/c561744c99522cda0943583d71154c9cc21fddd8))
* **markdown:** separate WCAG/Advanced summary lines; add markdownlint config ([256a1f9](https://github.com/timdixon82/Image-Colour-Contrast-Checker/commit/256a1f99bb6bae15a8bf1f2a8021800276ebc3c2))
* **markdown:** use pure HTML inside &lt;summary&gt; — markdown not parsed there ([892351d](https://github.com/timdixon82/Image-Colour-Contrast-Checker/commit/892351d1d2e9389f82013d59b2a2f07ec13ecb6e))
* **ui:** open ancestor &lt;details&gt; when navigating to a check via ⓘ link ([1f68fec](https://github.com/timdixon82/Image-Colour-Contrast-Checker/commit/1f68fec658831cb63e95b549f86d8eb5f2f0db3d))

## [0.3.0](https://github.com/timdixon82/Image-Colour-Contrast-Checker/compare/v0.2.12...v0.3.0) (2026-05-31)


### Features

* **copy:** reword tagline and meta description to name all six checks ([fcfc387](https://github.com/timdixon82/Image-Colour-Contrast-Checker/commit/fcfc387371b11f2b19df8d1f8ba3ae8f954cc88d))
* **footer:** remove "What the checks mean" link from the footer ([93e3e13](https://github.com/timdixon82/Image-Colour-Contrast-Checker/commit/93e3e139d31a798dfd4dbb7e7bf4f8de80c8aa96))
* **markdown:** bold-bracket pills, descriptive preview alt text, WebAIM arrow fix ([5445099](https://github.com/timdixon82/Image-Colour-Contrast-Checker/commit/5445099ac1f544ee6370de72e916d453cd002154))
* **pdf:** solid-fill pills, unbreakable blocks, CVD sizing, AAA colour fixes ([9249661](https://github.com/timdixon82/Image-Colour-Contrast-Checker/commit/9249661e36e75a292d45a02b143ec363c97bcd16))
* **report:** split contrast summary into WCAG and Advanced lines; add pair-check link ([d4da018](https://github.com/timdixon82/Image-Colour-Contrast-Checker/commit/d4da018e9df4ded1831195d5c8c55c6952fa4202))
* **strings:** add Tas the Artist checker strings and mirror across web, PDF, Markdown ([dc99c62](https://github.com/timdixon82/Image-Colour-Contrast-Checker/commit/dc99c629fbf78293077bbb52655e5efa3b60ffe2))
* **styles:** align report layout with page visual language ([b088ea8](https://github.com/timdixon82/Image-Colour-Contrast-Checker/commit/b088ea818484ff89bdfd77be80aa6006da7474ea))
* vestibular threshold provenance, softened cognitive message, HARSH fix ([d7817e9](https://github.com/timdixon82/Image-Colour-Contrast-Checker/commit/d7817e9165907d27a55d37eb5bcf7d4c3fe18a08))


### Bug Fixes

* **a11y:** dark-mode AAA contrast for six orange-on-card-bg selectors (findings 1-6) ([cea75ec](https://github.com/timdixon82/Image-Colour-Contrast-Checker/commit/cea75eca3373632c6f2ceb9e64070685ea8c992a))
* **a11y:** replace invalid canvas alt attribute with role=img and aria-label (finding 7) ([c4c9bd9](https://github.com/timdixon82/Image-Colour-Contrast-Checker/commit/c4c9bd9965fec09e0dd833328398d4eca1607451))
* **a11y:** set preloader-header tagline colour for AA in light mode (ACC-ICCC-004) ([c022dee](https://github.com/timdixon82/Image-Colour-Contrast-Checker/commit/c022deec0f972d811422074f7cc37cc2b171d7e9))
* **a11y:** split dark-mode override into two valid blocks (Carol NF-01) ([70d36a2](https://github.com/timdixon82/Image-Colour-Contrast-Checker/commit/70d36a21ad5d9d8ecf5d9dadf2b863e459b22223))
* **a11y:** WebAIM arrow narration, Markdown button tooltip, privacy link tab (findings 8-10) ([075ac78](https://github.com/timdixon82/Image-Colour-Contrast-Checker/commit/075ac786194876d083e682dce9c654f70e2c62f3))
* **build:** handle Latin-1 byte in js-clipper/clipper.js for Vite 8 / Rolldown ([79d9d82](https://github.com/timdixon82/Image-Colour-Contrast-Checker/commit/79d9d8225e2e885fd721b0b03a77901e675f18f1))
* **csp:** allow wasm-unsafe-eval and unsafe-eval for ONNX Runtime Web (Q67B) ([5db8941](https://github.com/timdixon82/Image-Colour-Contrast-Checker/commit/5db89414306efeaf873a23b929c38e1507e6a0bd))
* **css:** replace deprecated clip with clip-path in .sr-only pattern ([4d88a7b](https://github.com/timdixon82/Image-Colour-Contrast-Checker/commit/4d88a7b9e24402757b05113cc0b34c19e7e4fcb5))
* **merge:** restore globals ^17.6.0 after conflict resolution with main ([2a1e699](https://github.com/timdixon82/Image-Colour-Contrast-Checker/commit/2a1e699f3cabf4b0975cbadc05c0d4bf83bbbf7b))
* resolve post-merge linter errors (Stylelint duplicate selector, ESLint unused vars, vendored apca.js ignore) ([debf902](https://github.com/timdixon82/Image-Colour-Contrast-Checker/commit/debf9021e5121ebacb29bdff0622a3ac85e2a6c7))
* **security:** suppress false-positive Semgrep unsafe-formatstring finding in main.js ([c41958a](https://github.com/timdixon82/Image-Colour-Contrast-Checker/commit/c41958a367d4341bc4b1509f9d1b26735543e85f))
* **security:** suppress false-positive Semgrep unsafe-formatstring finding in main.js ([8f5a883](https://github.com/timdixon82/Image-Colour-Contrast-Checker/commit/8f5a88344029824bc0700f89c961a309513250b1))
