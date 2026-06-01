import { readFileSync } from 'fs';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  base: './',
  plugins: [
    // Polyfill Node.js built-ins required by PDFKit for browser use.
    // We only include the five modules PDFKit actually needs.
    nodePolyfills({ include: ['buffer', 'stream', 'zlib', 'util', 'process'] }),
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
    //   fix-non-utf8-deps plugin during build but excluded here so the pre-bundle
    //   step never touches it.
    // blob-stream: CJS module used by the PDFKit wrapper; exclude from pre-bundling
    //   so the fix-non-utf8-deps plugin does not trigger a re-scan via its include path.
    exclude: ['onnxruntime-web', 'js-clipper', 'blob-stream'],
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
