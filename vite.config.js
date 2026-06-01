import { readFileSync } from 'fs';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  base: './',
  plugins: [
    // Polyfill Node.js built-ins required by PDFKit for browser use.
    // We only include the five modules PDFKit actually needs.
    // Restrict to JS/TS files so the inject plugin does not warn on CSS imports.
    nodePolyfills({
      include: ['buffer', 'stream', 'zlib', 'util', 'process'],
      overrides: { fs: false },
    }),
    {
      // js-clipper/clipper.js contains a Latin-1 byte (0xb9, superscript-1 in a
      // comment) that Rolldown (Vite 6+) rejects as non-UTF-8. Rollup 5 was
      // permissive; Rolldown is strict. Re-reading the file as latin1 maps each
      // byte to the matching Unicode code point, producing valid UTF-8 output.
      name: 'fix-non-utf8-deps',
      enforce: 'pre',
      load(id) {
        if (id.includes('js-clipper')) {
          return readFileSync(id, 'latin1');
        }
      }
    }
  ],
  optimizeDeps: {
    // onnxruntime-web: must not be pre-bundled (WASM / worker constraints).
    // js-clipper: contains a Latin-1 byte that Rolldown rejects; handled by the
    //   fix-non-utf8-deps plugin during build but excluded from pre-bundling so
    //   Rolldown never touches it during dep optimisation.
    exclude: ['onnxruntime-web', 'js-clipper'],
    // blob-stream is a CJS module; include it so Vite transforms it to ESM,
    // making the default import work in the browser.
    include: ['blob-stream'],
  },
  worker: {
    format: 'es'
  },
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        main: './index.html',
        privacy: './privacy.html'
      }
    }
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  }
});
